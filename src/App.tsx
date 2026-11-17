import { useCallback, useEffect, useRef, useState } from 'react';
import { BatchQueue } from './components/BatchQueue';
import { BeatGridStrip } from './components/BeatGridStrip';
import { ConversionAction } from './components/ConversionAction';
import { DropZone } from './components/DropZone';
import { EncodingOptions } from './components/EncodingOptions';
import { Header } from './components/Header';
import { HeroWaveformBanner } from './components/HeroWaveformBanner';
import { LandingSections } from './components/LandingSections';
import { MediaResultPlayer } from './components/MediaResultPlayer';
import { SourcePreviewTrim } from './components/SourcePreviewTrim';
import { ToolSwitcher } from './components/ToolSwitcher';
import { UpdateBanner } from './components/UpdateBanner';
import { VideoTrimOptions } from './components/VideoTrimOptions';
import { useBatchProcessor } from './hooks/useBatchProcessor';
import { useMediaProcessor } from './hooks/useMediaProcessor';
import { usePwaUpdate } from './hooks/usePwaUpdate';
import { useWakeLock } from './hooks/useWakeLock';
import { AnimatedImageOptionsPanel } from './components/AnimatedImageOptionsPanel';
import { TargetSizeOptions } from './components/TargetSizeOptions';
import { MAX_BATCH_FILES } from './lib/batchQueue';
import {
  computeTargetBitrates,
  DEFAULT_ANIMATED_SEC,
  isSupportedFileForTool,
  MAX_ANIMATED_SEC,
  titleFromFilename,
} from './lib/ffmpegArgs';
import { TOOL_CONFIGS } from './lib/toolConfig';
import type {
  AnimatedImageOptions,
  BitrateOption,
  Id3Metadata,
  MediaSourceFile,
  ToolMode,
  TrimRange,
  VideoCutMode,
} from './types/converter';

export function App() {
  const [toolMode, setToolMode] = useState<ToolMode>('mp4-to-mp3');
  const [source, setSource] = useState<MediaSourceFile | null>(null);
  const [bitrate, setBitrate] = useState<BitrateOption>(192);
  const [videoCutMode, setVideoCutMode] = useState<VideoCutMode>('copy');
  const [targetSizeMB, setTargetSizeMB] = useState(8);
  const [animated, setAnimated] = useState<AnimatedImageOptions>({
    format: 'gif',
    fps: 12,
    widthPx: 480,
  });
  const [trim, setTrim] = useState<TrimRange>({ startSec: 0, endSec: 0 });
  const [metadata, setMetadata] = useState<Id3Metadata>({
    title: '',
    artist: '',
    album: '',
  });

  const { status, progress, stageLabel, error, result, processMedia, clearResult } =
    useMediaProcessor();
  const {
    items: batchItems,
    running: batchRunning,
    addFiles,
    removeItem,
    clear: clearBatch,
    start: startBatch,
    cancel: cancelBatch,
    downloadZip,
  } = useBatchProcessor();
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  const activeTool = TOOL_CONFIGS[toolMode];
  const sourceUrlRef = useRef<string | null>(null);

  const revokeSourceUrl = useCallback(() => {
    if (sourceUrlRef.current) {
      URL.revokeObjectURL(sourceUrlRef.current);
      sourceUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeSourceUrl();
    };
  }, [revokeSourceUrl]);

  const handleFileSelected = useCallback(
    (file: File) => {
      revokeSourceUrl();
      clearResult();

      const objectUrl = URL.createObjectURL(file);
      sourceUrlRef.current = objectUrl;
      setSource({ file, objectUrl, durationSec: 0 });
      setTrim({ startSec: 0, endSec: 0 });
      setMetadata({
        title: titleFromFilename(file.name),
        artist: '',
        album: '',
      });
    },
    [revokeSourceUrl, clearResult],
  );

  const handleDurationDetected = useCallback(
    (durationSec: number) => {
      // Animated images get a short default window so the output stays small.
      const defaultEnd =
        toolMode === 'video-to-gif' ? Math.min(durationSec, DEFAULT_ANIMATED_SEC) : durationSec;
      setSource((prev) => (prev ? { ...prev, durationSec } : prev));
      setTrim((prev) => (prev.endSec === 0 ? { startSec: 0, endSec: defaultEnd } : prev));
    },
    [toolMode],
  );

  const handleClear = useCallback(() => {
    revokeSourceUrl();
    setSource(null);
    setTrim({ startSec: 0, endSec: 0 });
    setMetadata({ title: '', artist: '', album: '' });
    clearResult();
  }, [revokeSourceUrl, clearResult]);

  const handleClearBatch = useCallback(() => {
    clearBatch();
    setBatchNotice(null);
  }, [clearBatch]);

  const handleToolModeChange = useCallback(
    (nextMode: ToolMode) => {
      if (nextMode === toolMode) return;
      handleClear();
      handleClearBatch();
      setToolMode(nextMode);
    },
    [toolMode, handleClear, handleClearBatch],
  );

  // Adds files to the batch (also used to start one) and reports files that were skipped.
  const handleAddBatchFiles = useCallback(
    async (files: File[], alreadySkipped = 0) => {
      const supported = files.filter((file) => isSupportedFileForTool(file, activeTool));
      const unsupported = files.length - supported.length + alreadySkipped;
      const { skipped } = await addFiles(supported, activeTool.mediaKind);

      const notes: string[] = [];
      if (unsupported > 0) {
        notes.push(`${unsupported} unsupported file${unsupported === 1 ? '' : 's'} skipped.`);
      }
      if (skipped > 0) {
        notes.push(`Batch limit is ${MAX_BATCH_FILES} files; ${skipped} not added.`);
      }
      setBatchNotice(notes.length > 0 ? notes.join(' ') : null);
    },
    [activeTool, addFiles],
  );

  const handleFilesSelected = useCallback(
    (files: File[], skippedUnsupported: number) => {
      handleClear();
      void handleAddBatchFiles(files, skippedUnsupported);
    },
    [handleClear, handleAddBatchFiles],
  );

  const inBatch = batchItems.length > 0;
  const batchProgress =
    batchItems.length === 0
      ? 0
      : Math.round(
          batchItems.reduce(
            (sum, item) => sum + (item.status === 'done' ? 100 : item.status === 'running' ? item.progress : 0),
            0,
          ) / batchItems.length,
        );
  const batchLongestSec = Math.max(0, ...batchItems.map((item) => item.durationSec));

  const isBusy = status === 'loading-core' || status === 'converting' || batchRunning;
  useWakeLock(isBusy);
  const { updateAvailable, applyUpdate, dismissUpdate } = usePwaUpdate();
  const isTrimValid = !source || source.durationSec === 0 || trim.endSec - trim.startSec >= 0.5;
  const encodedDurationSec =
    source && source.durationSec > 0 ? Math.max(0, trim.endSec - trim.startSec) : 0;
  const isTargetValid =
    !activeTool.supportsTargetSize ||
    computeTargetBitrates({ targetMB: targetSizeMB, durationSec: encodedDurationSec }).feasible;
  const isAnimatedValid = !activeTool.supportsAnimatedOptions || encodedDurationSec <= MAX_ANIMATED_SEC;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Header
          subtitle={activeTool.subtitle}
          status={batchRunning ? 'converting' : status}
          progress={batchRunning ? batchProgress : progress}
        />

        <UpdateBanner
          updateAvailable={updateAvailable}
          busy={isBusy}
          onUpdate={applyUpdate}
          onDismiss={dismissUpdate}
        />

        <BeatGridStrip isProcessing={isBusy} />

        <HeroWaveformBanner isProcessing={isBusy} />

        <main className="space-y-6">
          <ToolSwitcher activeMode={toolMode} disabled={isBusy} onChange={handleToolModeChange} />

          {inBatch && (
            <>
              {activeTool.supportsEncodingOptions && (
                <EncodingOptions
                  bitrate={bitrate}
                  metadata={metadata}
                  disabled={isBusy}
                  hideTitle
                  onBitrateChange={setBitrate}
                  onMetadataChange={setMetadata}
                />
              )}

              {activeTool.supportsTargetSize && (
                <TargetSizeOptions
                  targetSizeMB={targetSizeMB}
                  durationSec={batchLongestSec}
                  sourceDurationSec={0}
                  sourceSizeBytes={0}
                  disabled={isBusy}
                  onChange={setTargetSizeMB}
                />
              )}

              {activeTool.supportsAnimatedOptions && (
                <AnimatedImageOptionsPanel
                  options={animated}
                  durationSec={0}
                  disabled={isBusy}
                  onChange={setAnimated}
                />
              )}

              <BatchQueue
                tool={activeTool}
                items={batchItems}
                running={batchRunning}
                notice={batchNotice}
                onAddFiles={(files) => void handleAddBatchFiles(files)}
                onRemove={removeItem}
                onStart={() =>
                  void startBatch({
                    toolMode,
                    bitrate,
                    metadata,
                    targetSizeMB,
                    animated,
                  })
                }
                onCancel={cancelBatch}
                onClear={handleClearBatch}
                onDownloadZip={() => void downloadZip()}
              />
            </>
          )}

          {!inBatch && (
            <DropZone
              tool={activeTool}
              source={source}
              disabled={isBusy}
              onFileSelected={handleFileSelected}
              onFilesSelected={handleFilesSelected}
              onClear={handleClear}
            />
          )}

          {!inBatch && source && (
            <>
              <SourcePreviewTrim
                mediaKind={activeTool.mediaKind}
                objectUrl={source.objectUrl}
                durationSec={source.durationSec}
                trim={trim}
                disabled={isBusy}
                onDurationDetected={handleDurationDetected}
                onTrimChange={setTrim}
              />

              {activeTool.supportsEncodingOptions && (
                <EncodingOptions
                  bitrate={bitrate}
                  metadata={metadata}
                  disabled={isBusy}
                  onBitrateChange={setBitrate}
                  onMetadataChange={setMetadata}
                />
              )}

              {activeTool.supportsVideoCutMode && (
                <VideoTrimOptions
                  cutMode={videoCutMode}
                  disabled={isBusy}
                  onChange={setVideoCutMode}
                />
              )}

              {activeTool.supportsTargetSize && (
                <TargetSizeOptions
                  targetSizeMB={targetSizeMB}
                  durationSec={encodedDurationSec}
                  sourceDurationSec={source.durationSec}
                  sourceSizeBytes={source.file.size}
                  disabled={isBusy}
                  onChange={setTargetSizeMB}
                />
              )}

              {activeTool.supportsAnimatedOptions && (
                <AnimatedImageOptionsPanel
                  options={animated}
                  durationSec={encodedDurationSec}
                  disabled={isBusy}
                  onChange={setAnimated}
                />
              )}

              <ConversionAction
                actionLabel={activeTool.actionLabel}
                status={status}
                progress={progress}
                stageLabel={stageLabel}
                disabled={!isTrimValid || !isTargetValid || !isAnimatedValid}
                onConvert={() =>
                  processMedia({
                    toolMode,
                    file: source.file,
                    totalDurationSec: source.durationSec,
                    bitrate,
                    videoCutMode,
                    trim,
                    metadata,
                    targetSizeMB,
                    animated,
                  })
                }
              />
            </>
          )}

          {error && (
            <div
              role="alert"
              className="border-2 border-[var(--ink)] p-4 text-sm font-bold"
              style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)' }}
            >
              {error}
            </div>
          )}

          {result && (
            <MediaResultPlayer
              result={result}
              downloadLabel={activeTool.downloadLabel}
              onReset={handleClear}
            />
          )}
        </main>

        <LandingSections />

        <footer className="pt-5 border-t-2 border-[var(--ink)] flex flex-wrap items-center justify-between gap-3 font-mono-tabular text-xs text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <img
              src="/lee-anime.png"
              alt="Lee Khan"
              className="w-5 h-5 object-cover object-top border border-[var(--ink)]"
            />
            <span>
              COOLAUDIO · CREATED BY <strong>LEE KHAN</strong>
            </span>
          </div>
          <span>FFMPEG.WASM · 100% LOCAL ON-DEVICE PROCESSING</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
