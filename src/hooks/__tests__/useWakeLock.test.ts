import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWakeLock } from '../useWakeLock';

function installWakeLock(request: () => Promise<unknown>) {
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock');
});

describe('useWakeLock', () => {
  it('requests a screen lock while active and releases it when inactive', async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValue({ release, released: false });
    installWakeLock(request);

    const { rerender } = renderHook(({ active }) => useWakeLock(active), {
      initialProps: { active: false },
    });
    expect(request).not.toHaveBeenCalled();

    rerender({ active: true });
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'));

    rerender({ active: false });
    await waitFor(() => expect(release).toHaveBeenCalled());
  });

  it('releases the lock on unmount', async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    installWakeLock(vi.fn().mockResolvedValue({ release, released: false }));

    const { unmount } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(navigator.wakeLock.request).toHaveBeenCalled());
    await Promise.resolve();
    unmount();
    await waitFor(() => expect(release).toHaveBeenCalled());
  });

  it('does nothing when unsupported or when the request is rejected', async () => {
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();

    const request = vi.fn().mockRejectedValue(new Error('NotAllowedError'));
    installWakeLock(request);
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
    await waitFor(() => expect(request).toHaveBeenCalled());
  });
});
