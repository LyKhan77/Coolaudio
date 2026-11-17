import type { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import {
  buildExecArgs,
  buildGifFromPaletteArgs,
  buildGifPaletteArgs,
  buildOutputFilename,
} from './ffmpegArgs';
import { parseFfmpegLogTime } from './timecode';
import { TOOL_CONFIGS } from './toolConfig';
import type {
  AnimatedImageOptions,
  BitrateOption,
  Id3Metadata,
  MediaResult,
  ToolMode,
  TrimRange,
  VideoCutMode,
} from '../types/converter';

export type JobFfmpeg = Pick<
  FFmpeg,
  'on' | 'off' | 'writeFile' | 'exec' | 'readFile' | 'deleteFile'
>;

export interface RunMediaJobParams {
  ffmpeg: JobFfmpeg;
  toolMode: ToolMode;
  file: File;
  totalDurationSec: number;
  bitrate: BitrateOption;
  videoCutMode: VideoCutMode;
  trim: TrimRange;
  metadata: Id3Metadata;
  targetSizeMB?: number;
  animated?: AnimatedImageOptions;
  /** Called with a percentage from 2 to 99 that only ever increases. */
  onProgress: (percent: number) => void;
  /** Called as the job moves between reading, encoding passes, and finalizing. */
  onStageChange?: (stage: string) => void;
}

export interface MediaJobOutput {
  kind: MediaResult['kind'];
  blob: Blob;
  filename: string;
  durationSec: number;
  specLabel: string;
}

/**
 * Run one file through ffmpeg on the given instance and return the output.
 * Throws on failure (callers map errors and decide whether to discard the instance).
 */
export async function runMediaJob({
  ffmpeg,
  toolMode,
  file,
  totalDurationSec,
  bitrate,
  videoCutMode,
  trim,
  metadata,
  targetSizeMB,
  animated,
  onProgress,
  onStageChange,
}: RunMediaJobParams): Promise<MediaJobOutput> {
  const tool = TOOL_CONFIGS[toolMode];
  const hasDuration = trim.endSec - trim.startSec > 0;
  const targetDurationSec = Math.max(0.1, trim.endSec - trim.startSec);
  const logs: string[] = [];

  let current = 0;
  const report = (percent: number) => {
    const next = Math.min(99, Math.max(2, Math.round(percent)));
    if (next > current) {
      current = next;
      onProgress(next);
    }
  };

  const execPhase = async (
    args: string[],
    minPct: number,
    maxPct: number,
    heartbeatCapPct: number,
    heartbeatTauSec: number,
  ) => {
    let sawRealProgress = false;
    const span = maxPct - minPct;
    const mapRatio = (ratio: number) => {
      const clamped = Math.min(1, Math.max(0, ratio));
      report(minPct + clamped * span);
    };

    const startedAt = Date.now();
    let timerId: ReturnType<typeof setInterval> | null = null;
    const stopHeartbeat = () => {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    if (heartbeatCapPct > minPct) {
      timerId = setInterval(() => {
        if (sawRealProgress) {
          stopHeartbeat();
          return;
        }
        const elapsedSec = (Date.now() - startedAt) / 1000;
        const fraction = 1 - Math.exp(-elapsedSec / heartbeatTauSec);
        report(minPct + (heartbeatCapPct - minPct) * fraction);
      }, 1000);
    }

    const handleLog = ({ message }: { message: string }) => {
      logs.push(message);
      const logTime = parseFfmpegLogTime(message);
      if (logTime !== null && logTime >= 0 && hasDuration) {
        sawRealProgress = true;
        stopHeartbeat();
        mapRatio(logTime / targetDurationSec);
      }
    };

    const handleProgress = ({ progress: ratio }: { progress: number }) => {
      // ffmpeg.wasm emits garbage ratios (e.g. 3e10) at the start of every run after the first.
      if (Number.isFinite(ratio) && ratio > 0 && ratio <= 1) {
        sawRealProgress = true;
        stopHeartbeat();
        mapRatio(ratio);
      }
    };

    ffmpeg.on('log', handleLog);
    ffmpeg.on('progress', handleProgress);
    try {
      const exitCode = await ffmpeg.exec(args);
      if (exitCode !== 0) {
        const joinedLogs = logs.join('\n');
        if (
          joinedLogs.includes('does not contain any stream') ||
          joinedLogs.includes('matches no streams')
        ) {
          throw new Error('No compatible audio or video stream found in this file.');
        }
        throw new Error('Processing failed while running FFmpeg. Please try another file.');
      }
    } finally {
      stopHeartbeat();
      ffmpeg.off('log', handleLog);
      ffmpeg.off('progress', handleProgress);
    }
  };

  const ext =
    file.name.split('.').pop()?.toLowerCase() || (tool.mediaKind === 'video' ? 'mp4' : 'mp3');
  const inputName = `input.${ext}`;
  const isTwoPassGif = toolMode === 'video-to-gif' && animated?.format === 'gif';
  const paletteName = 'palette.png';
  const isWebp = toolMode === 'video-to-gif' && animated?.format === 'webp';
  const outputExtension = isWebp ? 'webp' : tool.outputExtension;
  const outputMime = isWebp ? 'image/webp' : tool.outputMime;
  const outputName = `output.${outputExtension}`;

  try {
    onStageChange?.('Reading file into memory…');
    report(2);
    const inputBytes = await fetchFile(file);
    report(4);
    await ffmpeg.writeFile(inputName, inputBytes);
    report(6);

    if (isTwoPassGif) {
      const paletteArgs = buildGifPaletteArgs({
        inputName,
        paletteName,
        trim,
        totalDurationSec,
        animated,
      });
      const gifArgs = buildGifFromPaletteArgs({
        inputName,
        paletteName,
        outputName,
        trim,
        totalDurationSec,
        animated,
      });

      onStageChange?.('Step 1/2 · Building GIF color palette…');
      await execPhase(paletteArgs, 6, 45, 40, 25);
      report(45);

      onStageChange?.('Step 2/2 · Encoding GIF frames…');
      await execPhase(gifArgs, 45, 98, 48, 6);
    } else {
      const args = buildExecArgs({
        toolMode,
        inputName,
        outputName,
        bitrate,
        videoCutMode,
        trim,
        totalDurationSec,
        metadata,
        targetSizeMB,
        sourceSizeBytes: file.size,
        animated,
      });

      onStageChange?.(tool.processingLabel);
      await execPhase(args, 6, 98, 16, 12);
    }

    onStageChange?.('Finalizing output file…');
    report(99);
    const fileData = await ffmpeg.readFile(outputName);
    if (typeof fileData === 'string' || fileData.byteLength === 0) {
      throw new Error('Generated output file was empty.');
    }

    const blob = new Blob([new Uint8Array(fileData)], { type: outputMime });

    const filename =
      toolMode === 'video-to-gif'
        ? buildOutputFilename(file.name, isWebp ? 'webp' : 'gif')
        : toolMode === 'compress-mp4'
          ? buildOutputFilename(file.name, 'mp4', undefined, '-compressed')
          : toolMode === 'trim-mp4'
            ? buildOutputFilename(file.name, 'mp4', undefined, '-trimmed')
            : buildOutputFilename(
                file.name,
                'mp3',
                metadata.title,
                toolMode === 'trim-mp3' ? '-trimmed' : undefined,
              );

    const specLabel =
      toolMode === 'video-to-gif' && animated
        ? `${animated.format.toUpperCase()} · ${animated.fps} fps · ${animated.widthPx}px`
        : toolMode === 'compress-mp4'
          ? `MP4 · Target ${targetSizeMB} MB`
          : toolMode === 'trim-mp4'
            ? `MP4 · ${videoCutMode === 'copy' ? 'Stream Copy' : 'Frame Accurate'}`
            : `MP3 · ${bitrate} kbps`;

    return {
      kind: tool.outputKind,
      blob,
      filename,
      durationSec: targetDurationSec,
      specLabel,
    };
  } finally {
    await ffmpeg.deleteFile(inputName).catch(() => {});
    if (isTwoPassGif) {
      await ffmpeg.deleteFile(paletteName).catch(() => {});
    }
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
