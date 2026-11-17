import { afterEach, describe, expect, it, vi } from 'vitest';
import { batchConcurrency, largeFileThresholdBytes } from '../deviceLimits';

const MB = 1024 * 1024;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('largeFileThresholdBytes', () => {
  it('uses 200 MB on touch devices', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(pointer: coarse)' }));
    expect(largeFileThresholdBytes()).toBe(200 * MB);
  });

  it('uses 500 MB on desktop pointers', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(largeFileThresholdBytes()).toBe(500 * MB);
  });

  it('falls back to the desktop limit when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(largeFileThresholdBytes()).toBe(500 * MB);
  });
});

describe('batchConcurrency', () => {
  const desktop = () => vi.stubGlobal('matchMedia', () => ({ matches: false }));

  it('is 1 on touch devices', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(pointer: coarse)' }));
    expect(batchConcurrency([10 * MB], 8)).toBe(1);
  });

  it('is capped at 2 on desktop and follows half the cores', () => {
    desktop();
    expect(batchConcurrency([10 * MB, 20 * MB], 16)).toBe(2);
    expect(batchConcurrency([10 * MB, 20 * MB], 4)).toBe(2);
    expect(batchConcurrency([10 * MB, 20 * MB], 2)).toBe(1);
  });

  it('is 1 when any file is over 250 MB or the machine has a single core', () => {
    desktop();
    expect(batchConcurrency([10 * MB, 300 * MB], 16)).toBe(1);
    expect(batchConcurrency([10 * MB], 1)).toBe(1);
  });
});
