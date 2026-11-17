import { describe, expect, it, vi } from 'vitest';
import { runMediaJob, type JobFfmpeg } from '../runMediaJob';

interface FakeOptions {
  exit?: number;
  logs?: string[];
  progress?: number[];
  output?: Uint8Array;
  onExec?: (args: string[], emitLog: (message: string) => void) => Promise<number> | number;
}

function fakeFfmpeg({
  exit = 0,
  logs = [],
  progress = [],
  output = new Uint8Array([1, 2, 3]),
  onExec,
}: FakeOptions = {}) {
  const logListeners = new Set<(e: { message: string }) => void>();
  const progressListeners = new Set<(e: { progress: number }) => void>();

  const ffmpeg = {
    on: vi.fn((event: string, cb: never) => {
      (event === 'log' ? logListeners : progressListeners).add(cb);
    }),
    off: vi.fn((event: string, cb: never) => {
      (event === 'log' ? logListeners : progressListeners).delete(cb);
    }),
    writeFile: vi.fn().mockResolvedValue(true),
    exec: vi.fn(async (args: string[]) => {
      const emitLog = (message: string) => logListeners.forEach((cb) => cb({ message }));
      if (onExec) {
        return await onExec(args, emitLog);
      }
      logs.forEach(emitLog);
      progress.forEach((ratio) => progressListeners.forEach((cb) => cb({ progress: ratio })));
      return exit;
    }),
    readFile: vi.fn().mockResolvedValue(output),
    deleteFile: vi.fn().mockResolvedValue(true),
  };
  return { ffmpeg: ffmpeg as unknown as JobFfmpeg, mock: ffmpeg, logListeners, progressListeners };
}

const baseParams = {
  toolMode: 'mp4-to-mp3' as const,
  file: new File(['abc'], 'song.mp4', { type: 'video/mp4' }),
  totalDurationSec: 10,
  bitrate: 192 as const,
  videoCutMode: 'copy' as const,
  trim: { startSec: 0, endSec: 10 },
  metadata: { title: 'Song', artist: '', album: '' },
};

describe('runMediaJob', () => {
  it('returns the output blob and labels, with monotonic progress that ignores bogus ratios', async () => {
    const { ffmpeg, logListeners, progressListeners } = fakeFfmpeg({
      logs: ['frame=1 time=00:00:05.00 bitrate=1kbits/s'],
      // 3e10 is the garbage ratio ffmpeg.wasm emits at the start of later runs; 0.2 is lower than 50%
      progress: [33212728556, 0.2],
    });
    const onProgress = vi.fn();
    const onStageChange = vi.fn();

    const out = await runMediaJob({ ...baseParams, ffmpeg, onProgress, onStageChange });

    expect(out.blob.type).toBe('audio/mpeg');
    expect(out.blob.size).toBe(3);
    expect(out.filename).toBe('Song.mp3');
    expect(out.specLabel).toBe('MP3 · 192 kbps');
    expect(out.kind).toBe('audio');
    expect(out.durationSec).toBe(10);
    // 2/4/6 reading/staging, 6 + 0.5 * 92 = 52 during exec, 99 finalizing
    expect(onProgress.mock.calls.map((c) => c[0])).toEqual([2, 4, 6, 52, 99]);
    expect(onStageChange.mock.calls.map((c) => c[0])).toEqual([
      'Reading file into memory…',
      'Extracting & encoding MP3...',
      'Finalizing output file…',
    ]);
    expect(logListeners.size).toBe(0);
    expect(progressListeners.size).toBe(0);
  });

  it('runs GIF as two passes with stage labels and cleans up palette.png', async () => {
    let pass = 0;
    const { ffmpeg, mock } = fakeFfmpeg({
      onExec: (_args, emitLog) => {
        pass += 1;
        if (pass === 2) {
          emitLog('frame=12 time=00:00:05.00 bitrate=1kbits/s');
        }
        return 0;
      },
    });
    const stages: string[] = [];
    const percents: number[] = [];

    const out = await runMediaJob({
      ...baseParams,
      toolMode: 'video-to-gif',
      animated: { format: 'gif', fps: 12, widthPx: 480 },
      ffmpeg,
      onProgress: (p) => percents.push(p),
      onStageChange: (s) => stages.push(s),
    });

    expect(out.blob.type).toBe('image/gif');
    expect(out.filename).toBe('song.gif');
    expect(mock.exec).toHaveBeenCalledTimes(2);
    expect(mock.deleteFile).toHaveBeenCalledWith('palette.png');
    expect(stages).toEqual([
      'Reading file into memory…',
      'Step 1/2 · Building GIF color palette…',
      'Step 2/2 · Encoding GIF frames…',
      'Finalizing output file…',
    ]);
    // Pass 1 reaches 45%, pass 2 midpoint (5s / 10s) reaches 45 + 0.5 * 53 = 72%, finalizing reaches 99%
    expect(percents).toEqual([2, 4, 6, 45, 72, 99]);
  });

  it('advances heartbeat progress smoothly while a pass emits no time logs yet', async () => {
    vi.useFakeTimers();
    try {
      let resolveFirstPass!: (code: number) => void;
      let calls = 0;
      const { ffmpeg } = fakeFfmpeg({
        onExec: () => {
          calls += 1;
          if (calls === 1) {
            return new Promise<number>((resolve) => {
              resolveFirstPass = resolve;
            });
          }
          return 0;
        },
      });
      const percents: number[] = [];

      const jobPromise = runMediaJob({
        ...baseParams,
        toolMode: 'video-to-gif',
        animated: { format: 'gif', fps: 12, widthPx: 480 },
        ffmpeg,
        onProgress: (p) => percents.push(p),
      });

      await vi.advanceTimersByTimeAsync(5000);
      expect(percents.some((p) => p > 6 && p < 45)).toBe(true);

      resolveFirstPass(0);
      await jobPromise;
      expect(percents[percents.length - 1]).toBe(99);
    } finally {
      vi.useRealTimers();
    }
  });

  it('writes the input, cleans up both files, and names the output by tool', async () => {
    const { ffmpeg, mock } = fakeFfmpeg();
    const out = await runMediaJob({
      ...baseParams,
      toolMode: 'compress-mp4',
      targetSizeMB: 8,
      ffmpeg,
      onProgress: () => {},
    });

    expect(mock.writeFile).toHaveBeenCalledWith('input.mp4', expect.any(Uint8Array));
    expect(mock.deleteFile).toHaveBeenCalledWith('input.mp4');
    expect(mock.deleteFile).toHaveBeenCalledWith('output.mp4');
    expect(out.filename).toBe('song-compressed.mp4');
    expect(out.specLabel).toBe('MP4 · Target 8 MB');
  });

  it('produces a WebP result when requested for video-to-gif', async () => {
    const { ffmpeg } = fakeFfmpeg();
    const out = await runMediaJob({
      ...baseParams,
      toolMode: 'video-to-gif',
      animated: { format: 'webp', fps: 12, widthPx: 480 },
      ffmpeg,
      onProgress: () => {},
    });

    expect(out.blob.type).toBe('image/webp');
    expect(out.filename).toBe('song.webp');
    expect(out.kind).toBe('image');
  });

  it('maps a missing stream to a clear error and still cleans up', async () => {
    const { ffmpeg, mock, logListeners } = fakeFfmpeg({
      exit: 1,
      logs: ['Output file #0 does not contain any stream'],
    });

    await expect(runMediaJob({ ...baseParams, ffmpeg, onProgress: () => {} })).rejects.toThrow(
      'No compatible audio or video stream found in this file.',
    );
    expect(mock.deleteFile).toHaveBeenCalledTimes(2);
    expect(logListeners.size).toBe(0);
  });

  it('rejects an empty output file', async () => {
    const { ffmpeg } = fakeFfmpeg({ output: new Uint8Array(0) });
    await expect(runMediaJob({ ...baseParams, ffmpeg, onProgress: () => {} })).rejects.toThrow(
      'Generated output file was empty.',
    );
  });
});
