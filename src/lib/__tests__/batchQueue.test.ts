import { describe, expect, it } from 'vitest';
import { runPool, uniqueFilenames } from '../batchQueue';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('runPool', () => {
  it('runs every item exactly once and never exceeds the concurrency limit', async () => {
    const seen: number[] = [];
    let active = 0;
    let maxActive = 0;

    await runPool({
      items: [1, 2, 3, 4, 5, 6],
      concurrency: 2,
      run: async (item) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await tick();
        seen.push(item);
        active -= 1;
      },
    });

    expect(seen.sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(maxActive).toBe(2);
  });

  it('gives each running job a worker index below the concurrency', async () => {
    const workers = new Set<number>();
    await runPool({
      items: [1, 2, 3, 4],
      concurrency: 2,
      run: async (_item, worker) => {
        workers.add(worker);
        await tick();
      },
    });
    expect([...workers].sort()).toEqual([0, 1]);
  });

  it('uses fewer workers than the limit when there are fewer items', async () => {
    const workers = new Set<number>();
    await runPool({
      items: ['a'],
      concurrency: 3,
      run: async (_item, worker) => {
        workers.add(worker);
      },
    });
    expect([...workers]).toEqual([0]);
  });

  it('keeps going when one job throws', async () => {
    const done: number[] = [];
    await runPool({
      items: [1, 2, 3],
      concurrency: 1,
      run: async (item) => {
        if (item === 2) throw new Error('boom');
        done.push(item);
      },
    });
    expect(done).toEqual([1, 3]);
  });

  it('stops starting new jobs once shouldStop returns true', async () => {
    const started: number[] = [];
    let stop = false;
    await runPool({
      items: [1, 2, 3, 4],
      concurrency: 1,
      shouldStop: () => stop,
      run: async (item) => {
        started.push(item);
        if (item === 2) stop = true;
      },
    });
    expect(started).toEqual([1, 2]);
  });
});

describe('uniqueFilenames', () => {
  it('keeps unique names and numbers duplicates, ignoring case', () => {
    expect(uniqueFilenames(['a.mp3', 'a.mp3', 'A.mp3', 'b.mp3'])).toEqual([
      'a.mp3',
      'a (2).mp3',
      'A (3).mp3',
      'b.mp3',
    ]);
  });

  it('does not collide with a name that already looks numbered', () => {
    expect(uniqueFilenames(['a.mp3', 'a (2).mp3', 'a.mp3'])).toEqual([
      'a.mp3',
      'a (2).mp3',
      'a (3).mp3',
    ]);
  });

  it('handles names without an extension', () => {
    expect(uniqueFilenames(['clip', 'clip'])).toEqual(['clip', 'clip (2)']);
  });
});
