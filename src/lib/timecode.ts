/**
 * Format seconds into MM:SS or HH:MM:SS.
 */
export function formatTimecode(totalSeconds: number, includeTenths = false): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return includeTenths ? '00:00.0' : '00:00';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const wholeSecs = Math.floor(secs);
  const tenths = Math.floor((secs - wholeSecs) * 10);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(wholeSecs).padStart(2, '0');
  const base = hours > 0 ? `${String(hours).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;

  return includeTenths ? `${base}.${tenths}` : base;
}

/**
 * Parse MM:SS(.d) or HH:MM:SS(.d) into seconds. Returns null if invalid.
 */
export function parseTimecode(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(':');
  if (parts.length < 2 || parts.length > 3) return null;

  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;

  if (parts.length === 2) {
    const [mins, secs] = nums;
    if (secs >= 60) return null;
    return mins * 60 + secs;
  }

  const [hours, mins, secs] = nums;
  if (mins >= 60 || secs >= 60) return null;
  return hours * 3600 + mins * 60 + secs;
}

/**
 * Extract elapsed encoding time in seconds from an FFmpeg stderr log line.
 */
export function parseFfmpegLogTime(logLine: string): number | null {
  const match = logLine.match(/time=(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return null;
  }

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format byte count into human-readable MB/KB.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
