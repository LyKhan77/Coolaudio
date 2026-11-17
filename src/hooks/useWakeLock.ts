import { useEffect } from 'react';

/** Keep the screen awake while `active`; phones otherwise sleep and stall long WebAssembly jobs. */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (lock && !lock.released) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (cancelled) {
          await next.release().catch(() => {});
          return;
        }
        lock = next;
      } catch {
        // Denied (e.g. low battery); processing still works, the screen just may sleep.
      }
    };

    // The browser drops the lock when the tab is hidden, so take it again on return.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void lock?.release().catch(() => {});
      lock = null;
    };
  }, [active]);
}
