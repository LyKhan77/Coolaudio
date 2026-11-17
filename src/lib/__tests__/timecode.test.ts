import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  formatTimecode,
  parseFfmpegLogTime,
  parseTimecode,
} from '../timecode';

describe('timecode utilities', () => {
  it('formats seconds into MM:SS and HH:MM:SS', () => {
    expect(formatTimecode(0)).toBe('00:00');
    expect(formatTimecode(65)).toBe('01:05');
    expect(formatTimecode(3661)).toBe('01:01:01');
    expect(formatTimecode(12.4, true)).toBe('00:12.4');
    expect(formatTimecode(-5)).toBe('00:00');
  });

  it('parses MM:SS and HH:MM:SS strings', () => {
    expect(parseTimecode('00:00')).toBe(0);
    expect(parseTimecode('01:30')).toBe(90);
    expect(parseTimecode('01:02:03.5')).toBe(3723.5);
    expect(parseTimecode('00:75')).toBeNull();
    expect(parseTimecode('invalid')).toBeNull();
  });

  it('extracts elapsed time from ffmpeg stderr log lines', () => {
    const line = 'size=     512kB time=00:01:23.45 bitrate= 192.0kbits/s speed=4.2x';
    expect(parseFfmpegLogTime(line)).toBeCloseTo(83.45, 2);
    expect(parseFfmpegLogTime('frame=  10 fps=0.0')).toBeNull();
  });

  it('formats byte counts cleanly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.00 MB');
  });
});
