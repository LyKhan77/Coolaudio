import { describe, expect, it } from 'vitest';
import {
  buildExecArgs,
  buildGifFromPaletteArgs,
  buildGifPaletteArgs,
  buildOutputFilename,
  computeTargetBitrates,
  estimateSourceKbps,
  isSupportedFileForTool,
  MAX_ANIMATED_SEC,
  titleFromFilename,
} from '../ffmpegArgs';
import { TOOL_CONFIGS } from '../toolConfig';

describe('computeTargetBitrates', () => {
  it('splits an 8 MB budget over 60 s into video and 128 kbps audio', () => {
    // 8 MB x 8000 kbit x 0.95 = 60800 kbit; 60800 / 60 = 1013 kbps; minus 128 audio
    expect(computeTargetBitrates({ targetMB: 8, durationSec: 60 })).toEqual({
      videoKbps: 885,
      audioKbps: 128,
      feasible: true,
    });
  });

  it('drops audio to 64 kbps when it would eat over 30% of the budget', () => {
    expect(computeTargetBitrates({ targetMB: 4, durationSec: 120 })).toEqual({
      videoKbps: 189,
      audioKbps: 64,
      feasible: true,
    });
  });

  it('flags targets that leave under 100 kbps of video as infeasible', () => {
    expect(computeTargetBitrates({ targetMB: 1, durationSec: 600 }).feasible).toBe(false);
    expect(computeTargetBitrates({ targetMB: 2, durationSec: 120 }).feasible).toBe(false);
  });

  it('caps video bitrate at the source bitrate so the output does not grow', () => {
    // budget alone would give 2912 kbps; a 341 kbps source leaves 213 kbps for video
    expect(computeTargetBitrates({ targetMB: 8, durationSec: 20, sourceKbps: 341 })).toEqual({
      videoKbps: 213,
      audioKbps: 128,
      feasible: true,
    });
    // never below the 100 kbps floor, even for a very low bitrate source
    expect(computeTargetBitrates({ targetMB: 8, durationSec: 20, sourceKbps: 150 }).videoKbps).toBe(100);
  });

  it('estimates source bitrate from file size and duration', () => {
    expect(estimateSourceKbps(853738, 20)).toBeCloseTo(341.5, 1);
    expect(estimateSourceKbps(0, 20)).toBeUndefined();
    expect(estimateSourceKbps(1000, 0)).toBeUndefined();
  });

  it('is infeasible for non-positive or non-finite inputs', () => {
    expect(computeTargetBitrates({ targetMB: 0, durationSec: 60 }).feasible).toBe(false);
    expect(computeTargetBitrates({ targetMB: 8, durationSec: 0 }).feasible).toBe(false);
    expect(computeTargetBitrates({ targetMB: Number.NaN, durationSec: 60 }).feasible).toBe(false);
  });
});

describe('compress-mp4 args', () => {
  const base = {
    toolMode: 'compress-mp4' as const,
    inputName: 'input.mp4',
    outputName: 'output.mp4',
    bitrate: 192 as const,
  };

  it('builds a single-pass capped-bitrate H.264 encode using full duration', () => {
    expect(
      buildExecArgs({ ...base, targetSizeMB: 8, totalDurationSec: 60, trim: { startSec: 0, endSec: 60 } }),
    ).toEqual([
      '-i', 'input.mp4',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-b:v', '885k',
      '-maxrate', '885k',
      '-bufsize', '1770k',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y', 'output.mp4',
    ]);
  });

  it('caps video bitrate using the source file size over the full duration', () => {
    const args = buildExecArgs({
      ...base,
      targetSizeMB: 8,
      totalDurationSec: 20,
      sourceSizeBytes: 853738,
    });
    expect(args).toContain('213k');
    expect(args).toContain('426k');
  });

  it('budgets against the trimmed duration and adds trim flags', () => {
    const args = buildExecArgs({
      ...base,
      targetSizeMB: 8,
      totalDurationSec: 120,
      trim: { startSec: 10, endSec: 70 },
    });
    expect(args.slice(0, 6)).toEqual(['-i', 'input.mp4', '-ss', '10.00', '-t', '60.00']);
    expect(args).toContain('885k');
  });

  it('throws when the target size is missing or infeasible', () => {
    expect(() => buildExecArgs({ ...base, totalDurationSec: 60 })).toThrow(/target size/i);
    expect(() => buildExecArgs({ ...base, targetSizeMB: 1, totalDurationSec: 600 })).toThrow(
      /too small/i,
    );
  });
});

describe('video-to-gif args', () => {
  const base = {
    toolMode: 'video-to-gif' as const,
    inputName: 'input.mp4',
    outputName: 'output.gif',
    bitrate: 192 as const,
    totalDurationSec: 10,
  };
  const scale = "scale='min(480,iw)':-2:flags=lanczos";

  it('builds a two-stage palette GIF filter', () => {
    expect(buildExecArgs({ ...base, animated: { format: 'gif', fps: 12, widthPx: 480 } })).toEqual([
      '-i', 'input.mp4',
      '-an',
      '-vf', `fps=12,${scale},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
      '-loop', '0',
      '-y', 'output.gif',
    ]);
  });

  it('builds separate 2-pass GIF palette and encode args with fast input seek', () => {
    const opts = {
      inputName: 'input.mp4',
      trim: { startSec: 2, endSec: 7 },
      totalDurationSec: 10,
      animated: { format: 'gif' as const, fps: 12 as const, widthPx: 480 as const },
    };

    expect(buildGifPaletteArgs(opts)).toEqual([
      '-ss', '2.00',
      '-i', 'input.mp4',
      '-t', '5.00',
      '-an',
      '-vf', "fps=12,scale='min(480,iw)':-2:flags=fast_bilinear,palettegen",
      '-update', '1',
      '-frames:v', '1',
      '-y', 'palette.png',
    ]);

    expect(buildGifFromPaletteArgs(opts)).toEqual([
      '-ss', '2.00',
      '-i', 'input.mp4',
      '-i', 'palette.png',
      '-t', '5.00',
      '-an',
      '-filter_complex', `[0:v]fps=12,${scale}[x];[x][1:v]paletteuse`,
      '-loop', '0',
      '-y', 'output.gif',
    ]);
  });

  it('builds animated WebP args with fast seek trim flags', () => {
    expect(
      buildExecArgs({
        ...base,
        outputName: 'output.webp',
        trim: { startSec: 2, endSec: 7 },
        animated: { format: 'webp', fps: 10, widthPx: 480 },
      }),
    ).toEqual([
      '-ss', '2.00',
      '-i', 'input.mp4',
      '-t', '5.00',
      '-an',
      '-vf', `fps=10,${scale}`,
      '-c:v', 'libwebp',
      '-lossless', '0',
      '-q:v', '70',
      '-loop', '0',
      '-y', 'output.webp',
    ]);
  });

  it('throws when options are missing or the clip is over the max length', () => {
    expect(() => buildExecArgs(base)).toThrow(/options/i);
    expect(() =>
      buildExecArgs({
        ...base,
        totalDurationSec: MAX_ANIMATED_SEC + 1,
        animated: { format: 'gif', fps: 12, widthPx: 480 },
      }),
    ).toThrow(/too long/i);
  });
});

describe('ffmpegArgs utilities', () => {
  it('builds MP4 -> MP3 args without trim when full duration is selected', () => {
    const args = buildExecArgs({
      toolMode: 'mp4-to-mp3',
      inputName: 'input.mp4',
      outputName: 'output.mp3',
      bitrate: 192,
      trim: { startSec: 0, endSec: 60 },
      totalDurationSec: 60,
    });

    expect(args).toEqual([
      '-i',
      'input.mp4',
      '-vn',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '192k',
      '-id3v2_version',
      '3',
      '-y',
      'output.mp3',
    ]);
  });

  it('includes trim flags and non-empty ID3v2.3 metadata for trim-mp3 and audio-to-mp3', () => {
    const args = buildExecArgs({
      toolMode: 'trim-mp3',
      inputName: 'input.mp3',
      outputName: 'output.mp3',
      bitrate: 320,
      trim: { startSec: 5.5, endSec: 20.5 },
      totalDurationSec: 60,
      metadata: {
        title: '  Midnight Track ',
        artist: 'Studio Unit',
        album: '   ',
      },
    });

    expect(args).toEqual([
      '-i',
      'input.mp3',
      '-ss',
      '5.50',
      '-t',
      '15.00',
      '-vn',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '320k',
      '-id3v2_version',
      '3',
      '-metadata',
      'title=Midnight Track',
      '-metadata',
      'artist=Studio Unit',
      '-y',
      'output.mp3',
    ]);
  });

  it('builds Trim MP4 fast copy and frame-accurate args', () => {
    const copyArgs = buildExecArgs({
      toolMode: 'trim-mp4',
      inputName: 'input.mp4',
      outputName: 'output.mp4',
      bitrate: 192,
      videoCutMode: 'copy',
      trim: { startSec: 2, endSec: 8 },
      totalDurationSec: 20,
    });

    expect(copyArgs).toEqual([
      '-ss',
      '2.00',
      '-i',
      'input.mp4',
      '-t',
      '6.00',
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      '-y',
      'output.mp4',
    ]);

    const accurateArgs = buildExecArgs({
      toolMode: 'trim-mp4',
      inputName: 'input.mp4',
      outputName: 'output.mp4',
      bitrate: 192,
      videoCutMode: 'accurate',
      trim: { startSec: 2, endSec: 8 },
      totalDurationSec: 20,
    });

    expect(accurateArgs).toEqual([
      '-i',
      'input.mp4',
      '-ss',
      '2.00',
      '-t',
      '6.00',
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
      'output.mp4',
    ]);
  });

  it('derives clean titles and sanitized output filenames', () => {
    expect(titleFromFilename('my.demo.clip.mp4')).toBe('my.demo.clip');
    expect(buildOutputFilename('video.mp4', 'mp3', 'Track: One/Two?')).toBe('Track- One-Two-.mp3');
    expect(buildOutputFilename('video.mp4', 'mp4', undefined, '-trimmed')).toBe('video-trimmed.mp4');
    expect(buildOutputFilename('video.mp4', 'mp3', 'Already.mp3')).toBe('Already.mp3');
  });

  it('validates supported files per tool configuration', () => {
    expect(
      isSupportedFileForTool({ name: 'clip.mp4', type: 'video/mp4' }, TOOL_CONFIGS['mp4-to-mp3']),
    ).toBe(true);
    expect(
      isSupportedFileForTool({ name: 'song.mp3', type: 'audio/mpeg' }, TOOL_CONFIGS['trim-mp3']),
    ).toBe(true);
    expect(
      isSupportedFileForTool({ name: 'clip.mp4', type: 'video/mp4' }, TOOL_CONFIGS['trim-mp3']),
    ).toBe(false);
    expect(
      isSupportedFileForTool({ name: 'voice.wav', type: 'audio/wav' }, TOOL_CONFIGS['audio-to-mp3']),
    ).toBe(true);
    expect(
      isSupportedFileForTool({ name: 'notes.txt', type: 'text/plain' }, TOOL_CONFIGS['audio-to-mp3']),
    ).toBe(false);
  });
});
