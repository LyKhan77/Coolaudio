import { useCallback, useEffect, useRef, useState } from 'react';
import type { FFmpeg } from '@ffmpeg/ffmpeg';
import { zipSync } from 'fflate';
import { MAX_BATCH_FILES, runPool, uniqueFilenames } from '../lib/batchQueue';
import { batchConcurrency } from '../lib/deviceLimits';
import { DEFAULT_ANIMATED_SEC, titleFromFilename } from '../lib/ffmpegArgs';
import { createFfmpeg } from '../lib/ffmpegCore';
import { friendlyProcessingError, isMemoryError } from '../lib/processingErrors';
import { readMediaDuration } from '../lib/readMediaDuration';
import { runMediaJob } from '../lib/runMediaJob';
import type {
  AnimatedImageOptions,
  BatchItem,
  BitrateOption,
  Id3Metadata,
  ToolMode,
} from '../types/converter';

export { MAX_BATCH_FILES };

export interface BatchParams {
  toolMode: ToolMode;
  bitrate: BitrateOption;
  /** Title is replaced per file by the file name; artist and album are shared. */
  metadata: Id3Metadata;
  targetSizeMB?: number;
  animated?: AnimatedImageOptions;
}

const NEEDS_DURATION: ToolMode[] = ['compress-mp4', 'video-to-gif'];

export function useBatchProcessor() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);

  // The ref is the source of truth so async workers never read stale state.
  const itemsRef = useRef<BatchItem[]>([]);
  const instancesRef = useRef<Array<FFmpeg | null>>([]);
  const cancelRef = useRef(false);
  const counterRef = useRef(0);

  const commit = useCallback((next: BatchItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const patch = useCallback(
    (id: string, changes: Partial<BatchItem>) => {
      commit(itemsRef.current.map((item) => (item.id === id ? { ...item, ...changes } : item)));
    },
    [commit],
  );

  const releaseInstances = useCallback(() => {
    instancesRef.current.forEach((instance) => instance?.terminate());
    instancesRef.current = [];
  }, []);

  const revokeResult = (item: BatchItem) => {
    if (item.result) URL.revokeObjectURL(item.result.url);
  };

  useEffect(
    () => () => {
      cancelRef.current = true;
      releaseInstances();
      itemsRef.current.forEach(revokeResult);
    },
    [releaseInstances],
  );

  const addFiles = useCallback(
    async (files: File[], mediaKind: 'video' | 'audio') => {
      const room = Math.max(0, MAX_BATCH_FILES - itemsRef.current.length);
      const accepted = files.slice(0, room);

      const created: BatchItem[] = accepted.map((file) => {
        counterRef.current += 1;
        return {
          id: `batch-${counterRef.current}`,
          file,
          durationSec: 0,
          status: 'queued',
          progress: 0,
        };
      });
      commit([...itemsRef.current, ...created]);

      // Durations are only needed for progress, Compress and GIF; read them one at a time.
      for (const item of created) {
        const durationSec = await readMediaDuration(item.file, mediaKind);
        if (itemsRef.current.some((existing) => existing.id === item.id)) {
          patch(item.id, { durationSec });
        }
      }

      return { added: accepted.length, skipped: files.length - accepted.length };
    },
    [commit, patch],
  );

  const removeItem = useCallback(
    (id: string) => {
      const target = itemsRef.current.find((item) => item.id === id);
      if (!target || target.status === 'running') return;
      revokeResult(target);
      commit(itemsRef.current.filter((item) => item.id !== id));
    },
    [commit],
  );

  const clear = useCallback(() => {
    cancelRef.current = true;
    releaseInstances();
    itemsRef.current.forEach(revokeResult);
    commit([]);
  }, [commit, releaseInstances]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    releaseInstances();
  }, [releaseInstances]);

  const start = useCallback(
    async (params: BatchParams) => {
      const pending = itemsRef.current.filter(
        (item) => item.status === 'queued' || item.status === 'error',
      );
      if (pending.length === 0) return;

      cancelRef.current = false;
      setRunning(true);
      commit(
        itemsRef.current.map((item) =>
          pending.some((p) => p.id === item.id)
            ? { ...item, status: 'queued', progress: 0, error: undefined }
            : item,
        ),
      );

      const needsDuration = NEEDS_DURATION.includes(params.toolMode);

      const runItem = async (id: string, worker: number) => {
        const item = itemsRef.current.find((candidate) => candidate.id === id);
        if (!item) return;

        if (needsDuration && item.durationSec <= 0) {
          patch(id, { status: 'error', error: 'Could not read the length of this file.' });
          return;
        }

        patch(id, { status: 'running', progress: 2 });
        try {
          let ffmpeg = instancesRef.current[worker];
          if (!ffmpeg) {
            ffmpeg = await createFfmpeg();
            instancesRef.current[worker] = ffmpeg;
          }

          const total = item.durationSec;
          const end = params.toolMode === 'video-to-gif' ? Math.min(total, DEFAULT_ANIMATED_SEC) : total;

          const output = await runMediaJob({
            ffmpeg,
            toolMode: params.toolMode,
            file: item.file,
            totalDurationSec: total,
            bitrate: params.bitrate,
            videoCutMode: 'copy',
            trim: { startSec: 0, endSec: end },
            metadata: { ...params.metadata, title: titleFromFilename(item.file.name) },
            targetSizeMB: params.targetSizeMB,
            animated: params.animated,
            onProgress: (progress) => patch(id, { progress }),
            onStageChange: (stageLabel) => patch(id, { stageLabel }),
          });

          const url = URL.createObjectURL(output.blob);
          patch(id, {
            status: 'done',
            progress: 100,
            stageLabel: undefined,
            result: { ...output, url, sizeBytes: output.blob.size },
          });
        } catch (err) {
          if (cancelRef.current) {
            patch(id, { status: 'queued', progress: 0, stageLabel: undefined, error: undefined });
            return;
          }
          if (isMemoryError(err)) {
            instancesRef.current[worker]?.terminate();
            instancesRef.current[worker] = null;
          }
          patch(id, { status: 'error', stageLabel: undefined, error: friendlyProcessingError(err) });
        }
      };

      await runPool({
        items: pending.map((item) => item.id),
        concurrency: batchConcurrency(pending.map((item) => item.file.size)),
        shouldStop: () => cancelRef.current,
        run: runItem,
      });

      // Free the wasm heaps; the next batch starts fresh instances (the core download is cached).
      releaseInstances();
      setRunning(false);
    },
    [commit, patch, releaseInstances],
  );

  const downloadZip = useCallback(() => {
    const done = itemsRef.current.filter((item) => item.result);
    if (done.length === 0) return Promise.resolve();

    return (async () => {
      const names = uniqueFilenames(done.map((item) => item.result!.filename));
      const files: Record<string, Uint8Array> = {};
      for (const [index, item] of done.entries()) {
        files[names[index]] = new Uint8Array(await item.result!.blob.arrayBuffer());
      }
      // Outputs are already compressed, so store without deflating.
      const zipped = zipSync(files, { level: 0 });
      const url = URL.createObjectURL(new Blob([zipped as BlobPart], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'coolaudio-batch.zip';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    })();
  }, []);

  return { items, running, addFiles, removeItem, clear, start, cancel, downloadZip };
}
