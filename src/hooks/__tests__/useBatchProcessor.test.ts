import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const terminateSpies: Array<ReturnType<typeof vi.fn>> = [];
const pendingRejects: Array<(err: Error) => void> = [];

vi.mock('../../lib/ffmpegCore', () => ({
  createFfmpeg: vi.fn(async () => {
    const terminate = vi.fn(() =>
      pendingRejects.splice(0).forEach((reject) => reject(new Error('called FFmpeg.terminate()'))),
    );
    terminateSpies.push(terminate);
    return { terminate };
  }),
}));

vi.mock('../../lib/runMediaJob', () => ({ runMediaJob: vi.fn() }));
vi.mock('../../lib/readMediaDuration', () => ({ readMediaDuration: vi.fn(async () => 60) }));

import { readMediaDuration } from '../../lib/readMediaDuration';
import { runMediaJob } from '../../lib/runMediaJob';
import { MAX_BATCH_FILES, useBatchProcessor } from '../useBatchProcessor';

const runMock = vi.mocked(runMediaJob);
const durationMock = vi.mocked(readMediaDuration);

const params = {
  toolMode: 'audio-to-mp3' as const,
  bitrate: 192 as const,
  metadata: { title: 'ignored', artist: 'Me', album: '' },
};

const mp3 = (name: string) => new File(['x'], name, { type: 'audio/wav' });

function okOutput(name: string) {
  return {
    kind: 'audio' as const,
    blob: new Blob(['out']),
    filename: name.replace(/\.\w+$/, '.mp3'),
    durationSec: 60,
    specLabel: 'MP3 · 192 kbps',
  };
}

beforeEach(() => {
  terminateSpies.length = 0;
  pendingRejects.length = 0;
  runMock.mockReset();
  durationMock.mockReset();
  durationMock.mockResolvedValue(60);
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
});

describe('useBatchProcessor', () => {
  it('caps the batch size and reports skipped files', async () => {
    const { result } = renderHook(() => useBatchProcessor());
    const files = Array.from({ length: MAX_BATCH_FILES + 3 }, (_, i) => mp3(`f${i}.wav`));

    let outcome = { added: 0, skipped: 0 };
    await act(async () => {
      outcome = await result.current.addFiles(files, 'audio');
    });

    expect(outcome).toEqual({ added: MAX_BATCH_FILES, skipped: 3 });
    expect(result.current.items).toHaveLength(MAX_BATCH_FILES);
    expect(result.current.items.every((item) => item.durationSec === 60)).toBe(true);
  });

  it('processes every file, isolates a failure, and uses each file name as the title', async () => {
    runMock.mockImplementation(async ({ file }) => {
      if (file.name === 'bad.wav') throw new Error('boom');
      return okOutput(file.name);
    });
    const { result } = renderHook(() => useBatchProcessor());
    await act(async () => {
      await result.current.addFiles([mp3('a.wav'), mp3('bad.wav'), mp3('c.wav')], 'audio');
    });

    await act(async () => {
      await result.current.start(params);
    });

    const byName = Object.fromEntries(result.current.items.map((i) => [i.file.name, i]));
    expect(byName['a.wav'].status).toBe('done');
    expect(byName['a.wav'].result?.filename).toBe('a.mp3');
    expect(byName['bad.wav'].status).toBe('error');
    expect(byName['bad.wav'].error).toBe('boom');
    expect(byName['c.wav'].status).toBe('done');
    expect(result.current.running).toBe(false);
    expect(runMock.mock.calls.map((c) => c[0].metadata.title).sort()).toEqual(['a', 'bad', 'c']);
    expect(runMock.mock.calls[0][0].metadata.artist).toBe('Me');
    // instances are released after the batch to free wasm memory
    expect(terminateSpies.length).toBeGreaterThan(0);
    expect(terminateSpies.every((spy) => spy.mock.calls.length === 1)).toBe(true);
  });

  it('limits animated output to the default window per file', async () => {
    runMock.mockResolvedValue(okOutput('clip.mp4'));
    const { result } = renderHook(() => useBatchProcessor());
    await act(async () => {
      await result.current.addFiles([mp3('clip.mp4')], 'video');
    });
    await act(async () => {
      await result.current.start({
        ...params,
        toolMode: 'video-to-gif',
        animated: { format: 'gif', fps: 12, widthPx: 480 },
      });
    });

    expect(runMock.mock.calls[0][0].trim).toEqual({ startSec: 0, endSec: 15 });
    expect(runMock.mock.calls[0][0].totalDurationSec).toBe(60);
  });

  it('fails a compress item cleanly when its duration cannot be read', async () => {
    durationMock.mockResolvedValue(0);
    const { result } = renderHook(() => useBatchProcessor());
    await act(async () => {
      await result.current.addFiles([mp3('odd.mov')], 'video');
    });
    await act(async () => {
      await result.current.start({ ...params, toolMode: 'compress-mp4', targetSizeMB: 8 });
    });

    expect(runMock).not.toHaveBeenCalled();
    expect(result.current.items[0].status).toBe('error');
    expect(result.current.items[0].error).toMatch(/length/i);
  });

  it('cancels running work, returns items to the queue, and releases instances', async () => {
    runMock.mockImplementation(
      () => new Promise((_, reject) => void pendingRejects.push(reject)) as never,
    );
    const { result } = renderHook(() => useBatchProcessor());
    await act(async () => {
      await result.current.addFiles([mp3('a.wav'), mp3('b.wav')], 'audio');
    });

    let startPromise: Promise<void> = Promise.resolve();
    act(() => {
      startPromise = result.current.start(params);
    });
    await waitFor(() => expect(runMock).toHaveBeenCalled());

    await act(async () => {
      result.current.cancel();
      await startPromise;
    });

    expect(result.current.running).toBe(false);
    expect(result.current.items.map((i) => i.status)).toEqual(['queued', 'queued']);
    expect(result.current.items.every((i) => i.progress === 0)).toBe(true);
  });

  it('removes an item and revokes its result URL', async () => {
    runMock.mockResolvedValue(okOutput('a.wav'));
    const { result } = renderHook(() => useBatchProcessor());
    await act(async () => {
      await result.current.addFiles([mp3('a.wav')], 'audio');
    });
    await act(async () => {
      await result.current.start(params);
    });

    act(() => result.current.removeItem(result.current.items[0].id));

    expect(result.current.items).toHaveLength(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});
