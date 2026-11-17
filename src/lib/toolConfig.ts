import type { ToolMode } from '../types/converter';

export interface ToolConfig {
  id: ToolMode;
  label: string;
  subtitle: string;
  mediaKind: 'video' | 'audio';
  outputKind: 'audio' | 'video' | 'image';
  accept: string;
  extensions: string[];
  mimeTypes: string[];
  dropPrompt: string;
  formatsHint: string;
  invalidFileMessage: string;
  actionLabel: string;
  processingLabel: string;
  downloadLabel: string;
  /** For `video-to-gif` these are the GIF defaults; the hook overrides them for WebP. */
  outputExtension: 'mp3' | 'mp4' | 'gif' | 'webp';
  outputMime: 'audio/mpeg' | 'video/mp4' | 'image/gif' | 'image/webp';
  supportsEncodingOptions: boolean;
  supportsVideoCutMode: boolean;
  supportsTargetSize?: boolean;
  supportsAnimatedOptions?: boolean;
  /** Several files can be converted in one batch with shared settings. */
  supportsBatch?: boolean;
}

export const TOOL_LIST: ToolConfig[] = [
  {
    id: 'mp4-to-mp3',
    supportsBatch: true,
    label: 'MP4 → MP3',
    subtitle: 'Extract audio from MP4 videos with trim, bitrate, and ID3 tags.',
    mediaKind: 'video',
    outputKind: 'audio',
    accept: '.mp4,.m4v,.mov,video/mp4,video/quicktime',
    extensions: ['.mp4', '.m4v', '.mov'],
    mimeTypes: ['video/mp4', 'video/quicktime'],
    dropPrompt: 'Drop an MP4 file here, or click to browse',
    formatsHint: 'SUPPORTS .MP4 · .M4V · .MOV — PROCESSED LOCALLY IN BROWSER',
    invalidFileMessage: 'Unsupported format. Please select an MP4, M4V, or MOV video file.',
    actionLabel: 'Convert to MP3',
    processingLabel: 'Extracting & encoding MP3...',
    downloadLabel: 'Download MP3',
    outputExtension: 'mp3',
    outputMime: 'audio/mpeg',
    supportsEncodingOptions: true,
    supportsVideoCutMode: false,
  },
  {
    id: 'trim-mp4',
    label: 'Trim MP4',
    subtitle: 'Cut MP4 video clips locally with instant stream-copy or frame-accurate mode.',
    mediaKind: 'video',
    outputKind: 'video',
    accept: '.mp4,.m4v,.mov,video/mp4,video/quicktime',
    extensions: ['.mp4', '.m4v', '.mov'],
    mimeTypes: ['video/mp4', 'video/quicktime'],
    dropPrompt: 'Drop an MP4 video to trim, or click to browse',
    formatsHint: 'SUPPORTS .MP4 · .M4V · .MOV — OUTPUTS .MP4',
    invalidFileMessage: 'Unsupported format. Please select an MP4, M4V, or MOV video file.',
    actionLabel: 'Trim MP4',
    processingLabel: 'Trimming MP4 video...',
    downloadLabel: 'Download MP4',
    outputExtension: 'mp4',
    outputMime: 'video/mp4',
    supportsEncodingOptions: false,
    supportsVideoCutMode: true,
  },
  {
    id: 'compress-mp4',
    supportsBatch: true,
    label: 'Compress MP4',
    subtitle: 'Shrink a video to a target size in MB, for chat apps and upload limits.',
    mediaKind: 'video',
    outputKind: 'video',
    accept: '.mp4,.m4v,.mov,video/mp4,video/quicktime',
    extensions: ['.mp4', '.m4v', '.mov'],
    mimeTypes: ['video/mp4', 'video/quicktime'],
    dropPrompt: 'Drop an MP4 video to compress, or click to browse',
    formatsHint: 'SUPPORTS .MP4 · .M4V · .MOV — OUTPUTS .MP4 NEAR YOUR TARGET SIZE',
    invalidFileMessage: 'Unsupported format. Please select an MP4, M4V, or MOV video file.',
    actionLabel: 'Compress MP4',
    processingLabel: 'Compressing MP4 video...',
    downloadLabel: 'Download MP4',
    outputExtension: 'mp4',
    outputMime: 'video/mp4',
    supportsEncodingOptions: false,
    supportsVideoCutMode: false,
    supportsTargetSize: true,
  },
  {
    id: 'video-to-gif',
    supportsBatch: true,
    label: 'Video → GIF',
    subtitle: 'Turn a short video clip into an animated GIF or WebP, right in your browser.',
    mediaKind: 'video',
    outputKind: 'image',
    accept: '.mp4,.m4v,.mov,video/mp4,video/quicktime',
    extensions: ['.mp4', '.m4v', '.mov'],
    mimeTypes: ['video/mp4', 'video/quicktime'],
    dropPrompt: 'Drop a video to turn into a GIF, or click to browse',
    formatsHint: 'SUPPORTS .MP4 · .M4V · .MOV — OUTPUTS .GIF OR .WEBP (MAX 30 SECONDS)',
    invalidFileMessage: 'Unsupported format. Please select an MP4, M4V, or MOV video file.',
    actionLabel: 'Create Animation',
    processingLabel: 'Rendering animation...',
    downloadLabel: 'Download Animation',
    outputExtension: 'gif',
    outputMime: 'image/gif',
    supportsEncodingOptions: false,
    supportsVideoCutMode: false,
    supportsAnimatedOptions: true,
  },
  {
    id: 'trim-mp3',
    label: 'Trim MP3',
    subtitle: 'Cut MP3 audio segments with preview, bitrate control, and ID3v2.3 tags.',
    mediaKind: 'audio',
    outputKind: 'audio',
    accept: '.mp3,audio/mpeg',
    extensions: ['.mp3'],
    mimeTypes: ['audio/mpeg', 'audio/mp3'],
    dropPrompt: 'Drop an MP3 file to trim, or click to browse',
    formatsHint: 'SUPPORTS .MP3 — OUTPUTS .MP3 WITH ID3V2.3 TAGS',
    invalidFileMessage: 'Unsupported format. Please select an MP3 audio file.',
    actionLabel: 'Trim MP3',
    processingLabel: 'Trimming & encoding MP3...',
    downloadLabel: 'Download MP3',
    outputExtension: 'mp3',
    outputMime: 'audio/mpeg',
    supportsEncodingOptions: true,
    supportsVideoCutMode: false,
  },
  {
    id: 'audio-to-mp3',
    supportsBatch: true,
    label: 'Audio → MP3',
    subtitle: 'Convert WAV, M4A, OGG, FLAC, or AAC audio files into MP3.',
    mediaKind: 'audio',
    outputKind: 'audio',
    accept: '.wav,.m4a,.aac,.ogg,.opus,.flac,.webm,audio/*',
    extensions: ['.wav', '.m4a', '.aac', '.ogg', '.opus', '.flac', '.webm'],
    mimeTypes: [
      'audio/wav',
      'audio/x-wav',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac',
      'audio/ogg',
      'audio/opus',
      'audio/flac',
      'audio/webm',
    ],
    dropPrompt: 'Drop an audio file here, or click to browse',
    formatsHint: 'SUPPORTS .WAV · .M4A · .OGG · .FLAC · .AAC · .OPUS · .WEBM',
    invalidFileMessage:
      'Unsupported format. Please select a WAV, M4A, AAC, OGG, OPUS, FLAC, or WEBM audio file.',
    actionLabel: 'Convert to MP3',
    processingLabel: 'Converting audio to MP3...',
    downloadLabel: 'Download MP3',
    outputExtension: 'mp3',
    outputMime: 'audio/mpeg',
    supportsEncodingOptions: true,
    supportsVideoCutMode: false,
  },
];

export const TOOL_CONFIGS: Record<ToolMode, ToolConfig> = Object.fromEntries(
  TOOL_LIST.map((tool) => [tool.id, tool]),
) as Record<ToolMode, ToolConfig>;
