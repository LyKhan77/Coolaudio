import { useCallback, useEffect, useRef, useState } from 'react';
import type { FFmpeg } from '@ffmpeg/ffmpeg';
import { createFfmpeg } from '../lib/ffmpegCore';
import { friendlyProcessingError, isMemoryError } from '../lib/processingErrors';
import { runMediaJob } from '../lib/runMediaJob';
import type {
  AnimatedImageOptions,
  BitrateOption,
  ConversionStatus,
  Id3Metadata,
  MediaResult,
  ToolMode,
  TrimRange,
  VideoCutMode,
} from '../types/converter';

interface ProcessMediaParams {
  toolMode: ToolMode;
  file: File;
  totalDurationSec: number;
  bitrate: BitrateOption;
  videoCutMode: VideoCutMode;
  trim: TrimRange;
  metadata: Id3Metadata;
  targetSizeMB?: number;
  animated?: AnimatedImageOptions;
}

export function useMediaProcessor() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [coreReady, setCoreReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MediaResult | null>(null);

  const revokeResultUrl = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeResultUrl();
    };
  }, [revokeResultUrl]);

  const ensureCoreLoaded = useCallback(async (): Promise<FFmpeg> => {
    if (!ffmpegRef.current) {
      setStatus('loading-core');
      setStageLabel('Loading FFmpeg WebAssembly core...');
      setProgress(0);
      ffmpegRef.current = await createFfmpeg();
      setCoreReady(true);
    }
    return ffmpegRef.current;
  }, []);

  const clearResult = useCallback(() => {
    revokeResultUrl();
    setResult(null);
    setProgress(0);
    setStageLabel('');
    setError(null);
    setStatus('idle');
  }, [revokeResultUrl]);

  const processMedia = useCallback(
    async ({ toolMode, ...params }: ProcessMediaParams) => {
      setError(null);
      revokeResultUrl();
      setResult(null);

      let ffmpeg: FFmpeg;
      try {
        ffmpeg = await ensureCoreLoaded();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load FFmpeg WebAssembly engine.';
        setStatus('error');
        setError(message);
        return;
      }

      setStatus('converting');
      setStageLabel('Reading file into memory…');
      setProgress(2);

      try {
        const output = await runMediaJob({
          ...params,
          toolMode,
          ffmpeg,
          onProgress: (percent) => setProgress((prev) => Math.max(prev, percent)),
          onStageChange: setStageLabel,
        });

        const url = URL.createObjectURL(output.blob);
        resultUrlRef.current = url;

        setProgress(100);
        setStageLabel('Processing complete');
        setResult({ ...output, url, sizeBytes: output.blob.size });
        setStatus('done');
      } catch (err) {
        if (isMemoryError(err)) {
          // The wasm heap is unusable after running out of memory; start from a fresh instance next time.
          ffmpeg.terminate();
          ffmpegRef.current = null;
          setCoreReady(false);
        }
        setStatus('error');
        setError(friendlyProcessingError(err));
      }
    },
    [ensureCoreLoaded, revokeResultUrl],
  );

  return {
    status,
    coreReady,
    progress,
    stageLabel,
    error,
    result,
    processMedia,
    clearResult,
  };
}
