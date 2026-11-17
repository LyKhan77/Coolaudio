export type ToolMode =
  | 'mp4-to-mp3'
  | 'trim-mp4'
  | 'compress-mp4'
  | 'video-to-gif'
  | 'trim-mp3'
  | 'audio-to-mp3';

export type AnimatedFormat = 'gif' | 'webp';

export interface AnimatedImageOptions {
  format: AnimatedFormat;
  fps: 10 | 12 | 15;
  widthPx: 320 | 480 | 640;
}

export type VideoCutMode = 'copy' | 'accurate';

export type BitrateOption = 128 | 192 | 320;

export interface Id3Metadata {
  title: string;
  artist: string;
  album: string;
}

export interface TrimRange {
  startSec: number;
  endSec: number;
}

export type ConversionStatus =
  | 'idle'
  | 'loading-core'
  | 'converting'
  | 'done'
  | 'error';

export interface MediaSourceFile {
  file: File;
  objectUrl: string;
  durationSec: number;
}

export interface MediaResult {
  kind: 'audio' | 'video' | 'image';
  url: string;
  blob: Blob;
  filename: string;
  sizeBytes: number;
  durationSec: number;
  specLabel: string;
}

export type BatchItemStatus = 'queued' | 'running' | 'done' | 'error';

export interface BatchItem {
  id: string;
  file: File;
  /** 0 until the duration has been read (or when the browser cannot read it). */
  durationSec: number;
  status: BatchItemStatus;
  progress: number;
  stageLabel?: string;
  error?: string;
  result?: MediaResult;
}
