import type {
  AnimatedImageOptions,
  BitrateOption,
  Id3Metadata,
  ToolMode,
  TrimRange,
  VideoCutMode,
} from '../types/converter';
import type { ToolConfig } from './toolConfig';

export interface BuildExecArgsOptions {
  toolMode: ToolMode;
  inputName: string;
  outputName: string;
  bitrate: BitrateOption;
  videoCutMode?: VideoCutMode;
  trim?: TrimRange;
  totalDurationSec?: number;
  metadata?: Partial<Id3Metadata>;
  targetSizeMB?: number;
  sourceSizeBytes?: number;
  animated?: AnimatedImageOptions;
}

const TRIM_EPSILON_SEC = 0.05;

/** GIF/WebP size explodes with length; the UI defaults to 15 s and blocks above this. */
export const MAX_ANIMATED_SEC = 30;
export const DEFAULT_ANIMATED_SEC = 15;

// Decimal MB (1e6 bytes) stays under the limit whether a platform means MB or MiB.
const KBIT_PER_MB = 8000;
const SIZE_SAFETY_FACTOR = 0.95;
const DEFAULT_AUDIO_KBPS = 128;
const LOW_AUDIO_KBPS = 64;
const MAX_AUDIO_BUDGET_SHARE = 0.3;
const MIN_VIDEO_KBPS = 100;

export interface TargetBitrates {
  videoKbps: number;
  audioKbps: number;
  feasible: boolean;
}

/**
 * Split a target file size into video and audio bitrates for a given duration.
 * Single-pass encoding only approximates the result; the 5% margin absorbs container overhead.
 */
export function computeTargetBitrates({
  targetMB,
  durationSec,
  sourceKbps,
}: {
  targetMB: number;
  durationSec: number;
  /** Overall bitrate of the source; video is never given more than the source had. */
  sourceKbps?: number;
}): TargetBitrates {
  if (!(targetMB > 0) || !(durationSec > 0) || !Number.isFinite(targetMB + durationSec)) {
    return { videoKbps: 0, audioKbps: DEFAULT_AUDIO_KBPS, feasible: false };
  }

  const budgetKbit = targetMB * KBIT_PER_MB * SIZE_SAFETY_FACTOR;
  const audioKbps =
    DEFAULT_AUDIO_KBPS * durationSec > budgetKbit * MAX_AUDIO_BUDGET_SHARE
      ? LOW_AUDIO_KBPS
      : DEFAULT_AUDIO_KBPS;
  const budgetVideoKbps = Math.max(0, Math.floor(budgetKbit / durationSec - audioKbps));
  const videoKbps =
    sourceKbps && sourceKbps > 0
      ? Math.min(budgetVideoKbps, Math.max(MIN_VIDEO_KBPS, Math.floor(sourceKbps - audioKbps)))
      : budgetVideoKbps;

  // Feasibility follows the size budget, not the source cap.
  return { videoKbps, audioKbps, feasible: budgetVideoKbps >= MIN_VIDEO_KBPS };
}

/** Overall source bitrate in kbps, or undefined when size or duration is unknown. */
export function estimateSourceKbps(sizeBytes: number, durationSec: number): number | undefined {
  return sizeBytes > 0 && durationSec > 0 ? (sizeBytes * 8) / 1000 / durationSec : undefined;
}

function getEffectiveTrim(
  trim?: TrimRange,
  totalDurationSec?: number,
): { startSec: number; durationSec: number } | null {
  if (!trim) return null;

  const start = Math.max(0, trim.startSec);
  const end = Math.max(start, trim.endSec);
  const duration = end - start;

  const isTrimmedStart = start > TRIM_EPSILON_SEC;
  const isTrimmedEnd =
    totalDurationSec !== undefined &&
    totalDurationSec > 0 &&
    end < totalDurationSec - TRIM_EPSILON_SEC;

  if ((isTrimmedStart || isTrimmedEnd) && duration > 0) {
    return { startSec: start, durationSec: duration };
  }

  return null;
}

export interface AnimatedGifPassOptions {
  inputName: string;
  paletteName?: string;
  outputName?: string;
  trim?: TrimRange;
  totalDurationSec?: number;
  animated?: AnimatedImageOptions;
}

function prepareAnimatedArgs({
  trim,
  totalDurationSec,
  animated,
}: Pick<AnimatedGifPassOptions, 'trim' | 'totalDurationSec' | 'animated'>) {
  if (!animated) {
    throw new Error('Animated image options are required.');
  }
  const activeTrim = getEffectiveTrim(trim, totalDurationSec);
  if ((activeTrim?.durationSec ?? totalDurationSec ?? 0) > MAX_ANIMATED_SEC) {
    throw new Error(`Clip is too long. Trim it to ${MAX_ANIMATED_SEC} seconds or less.`);
  }
  return { animated, activeTrim };
}

function animatedScale(widthPx: number, flags: 'fast_bilinear' | 'lanczos') {
  return `scale='min(${widthPx},iw)':-2:flags=${flags}`;
}

/**
 * Pass 1 for 2-pass GIF: fast-seek, skip audio, and build a 256-color palette image.
 * Using fast_bilinear here trims ~30% off palettegen time in single-threaded wasm.
 */
export function buildGifPaletteArgs({
  inputName,
  paletteName = 'palette.png',
  trim,
  totalDurationSec,
  animated,
}: AnimatedGifPassOptions): string[] {
  const { animated: opts, activeTrim } = prepareAnimatedArgs({ trim, totalDurationSec, animated });
  const args: string[] = [];
  if (activeTrim) {
    args.push('-ss', activeTrim.startSec.toFixed(2));
  }
  args.push('-i', inputName);
  if (activeTrim) {
    args.push('-t', activeTrim.durationSec.toFixed(2));
  }
  args.push(
    '-an',
    '-vf',
    `fps=${opts.fps},${animatedScale(opts.widthPx, 'fast_bilinear')},palettegen`,
    '-update', '1',
    '-frames:v', '1',
    '-y', paletteName,
  );
  return args;
}

/**
 * Pass 2 for 2-pass GIF: encode frames directly against the generated palette without buffering the whole clip.
 */
export function buildGifFromPaletteArgs({
  inputName,
  paletteName = 'palette.png',
  outputName = 'output.gif',
  trim,
  totalDurationSec,
  animated,
}: AnimatedGifPassOptions): string[] {
  const { animated: opts, activeTrim } = prepareAnimatedArgs({ trim, totalDurationSec, animated });
  const args: string[] = [];
  if (activeTrim) {
    args.push('-ss', activeTrim.startSec.toFixed(2));
  }
  args.push('-i', inputName, '-i', paletteName);
  if (activeTrim) {
    args.push('-t', activeTrim.durationSec.toFixed(2));
  }
  args.push(
    '-an',
    '-filter_complex',
    `[0:v]fps=${opts.fps},${animatedScale(opts.widthPx, 'lanczos')}[x];[x][1:v]paletteuse`,
    '-loop', '0',
    '-y', outputName,
  );
  return args;
}

/**
 * Build safe FFmpeg argument array across all supported converter and trimmer modes.
 */
export function buildExecArgs(options: BuildExecArgsOptions): string[] {
  const {
    toolMode,
    inputName,
    outputName,
    bitrate,
    videoCutMode = 'copy',
    trim,
    totalDurationSec,
    metadata,
    targetSizeMB,
    sourceSizeBytes,
    animated,
  } = options;

  const activeTrim = getEffectiveTrim(trim, totalDurationSec);

  if (toolMode === 'video-to-gif') {
    const { animated: opts } = prepareAnimatedArgs({ trim, totalDurationSec, animated });
    const scale = animatedScale(opts.widthPx, 'lanczos');
    const args: string[] = [];
    if (activeTrim) {
      args.push('-ss', activeTrim.startSec.toFixed(2));
    }
    args.push('-i', inputName);
    if (activeTrim) {
      args.push('-t', activeTrim.durationSec.toFixed(2));
    }
    args.push('-an');

    if (opts.format === 'gif') {
      args.push(
        '-vf',
        `fps=${opts.fps},${scale},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
        '-loop', '0',
      );
    } else {
      args.push(
        '-vf', `fps=${opts.fps},${scale}`,
        '-c:v', 'libwebp',
        '-lossless', '0',
        '-q:v', '70',
        '-loop', '0',
      );
    }
    args.push('-y', outputName);
    return args;
  }

  if (toolMode === 'compress-mp4') {
    if (targetSizeMB === undefined) {
      throw new Error('A target size is required to compress video.');
    }
    const { videoKbps, audioKbps, feasible } = computeTargetBitrates({
      targetMB: targetSizeMB,
      durationSec: activeTrim?.durationSec ?? totalDurationSec ?? 0,
      sourceKbps: estimateSourceKbps(sourceSizeBytes ?? 0, totalDurationSec ?? 0),
    });
    if (!feasible) {
      throw new Error('Target size is too small for this video length.');
    }

    const args: string[] = ['-i', inputName];
    if (activeTrim) {
      args.push('-ss', activeTrim.startSec.toFixed(2), '-t', activeTrim.durationSec.toFixed(2));
    }
    args.push(
      '-c:v', 'libx264',
      // ultrafast is about 2x faster than veryfast in single-threaded wasm at similar output size.
      '-preset', 'ultrafast',
      '-b:v', `${videoKbps}k`,
      '-maxrate', `${videoKbps}k`,
      '-bufsize', `${videoKbps * 2}k`,
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', `${audioKbps}k`,
      '-movflags', '+faststart',
      '-y', outputName,
    );
    return args;
  }

  if (toolMode === 'trim-mp4') {
    if (videoCutMode === 'copy') {
      const args: string[] = [];
      if (activeTrim) {
        args.push('-ss', activeTrim.startSec.toFixed(2));
      }
      args.push('-i', inputName);
      if (activeTrim) {
        args.push('-t', activeTrim.durationSec.toFixed(2));
      }
      args.push('-c', 'copy', '-movflags', '+faststart', '-y', outputName);
      return args;
    }

    const args: string[] = ['-i', inputName];
    if (activeTrim) {
      args.push('-ss', activeTrim.startSec.toFixed(2), '-t', activeTrim.durationSec.toFixed(2));
    }
    args.push(
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      '-y',
      outputName,
    );
    return args;
  }

  // mp4-to-mp3, trim-mp3, and audio-to-mp3 share the libmp3lame pipeline
  const args: string[] = ['-i', inputName];

  if (activeTrim) {
    args.push('-ss', activeTrim.startSec.toFixed(2), '-t', activeTrim.durationSec.toFixed(2));
  }

  args.push('-vn', '-c:a', 'libmp3lame', '-b:a', `${bitrate}k`, '-id3v2_version', '3');

  if (metadata) {
    const entries: Array<[keyof Id3Metadata, string | undefined]> = [
      ['title', metadata.title],
      ['artist', metadata.artist],
      ['album', metadata.album],
    ];

    for (const [key, value] of entries) {
      const cleaned = value?.trim();
      if (cleaned) {
        args.push('-metadata', `${key}=${cleaned}`);
      }
    }
  }

  args.push('-y', outputName);
  return args;
}

/**
 * Derive a default title from a media filename by stripping its extension.
 */
export function titleFromFilename(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '').trim();
}

/**
 * Sanitize and build the final downloadable filename for the target extension.
 */
export function buildOutputFilename(
  originalName: string,
  extension: 'mp3' | 'mp4' | 'gif' | 'webp',
  title?: string,
  suffix?: string,
): string {
  const baseFromFile = titleFromFilename(originalName);
  const candidate = title?.trim() || (suffix ? `${baseFromFile}${suffix}` : baseFromFile) || 'output';
  const sanitized = candidate
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanBase = sanitized || 'output';
  const targetExt = `.${extension}`;
  return cleanBase.toLowerCase().endsWith(targetExt) ? cleanBase : `${cleanBase}${targetExt}`;
}

/**
 * Validate whether a File is supported for the active tool configuration.
 */
export function isSupportedFileForTool(
  file: Pick<File, 'name' | 'type'>,
  tool: Pick<ToolConfig, 'extensions' | 'mimeTypes'>,
): boolean {
  const lowerName = file.name.toLowerCase();
  if (tool.extensions.some((ext) => lowerName.endsWith(ext))) {
    return true;
  }
  return tool.mimeTypes.includes(file.type);
}
