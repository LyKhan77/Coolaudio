import { useCallback, useEffect, useRef, useState } from 'react';

export interface UsePwaUpdateOptions {
  enabled?: boolean;
  reload?: () => void;
}

export interface PwaUpdateState {
  updateAvailable: boolean;
  applyUpdate: () => void;
  dismissUpdate: () => void;
}

/** Register the service worker in production and expose controls for waiting updates. */
export function usePwaUpdate(options?: UsePwaUpdateOptions): PwaUpdateState {
  const enabled = options?.enabled ?? import.meta.env.PROD;
  const reload = options?.reload ?? (() => window.location.reload());

  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const refreshingRef = useRef(false);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const sw = navigator.serviceWorker;
    let cancelled = false;
    let registration: ServiceWorkerRegistration | null = null;
    const trackedWorkers = new Map<ServiceWorker, () => void>();

    const trackInstalling = (worker: ServiceWorker | null, reg: ServiceWorkerRegistration) => {
      if (!worker || trackedWorkers.has(worker)) return;
      const onStateChange = () => {
        if (cancelled) return;
        if (worker.state === 'installed' && sw.controller) {
          setWaitingWorker(reg.waiting ?? worker);
          setDismissed(false);
        }
      };
      trackedWorkers.set(worker, onStateChange);
      worker.addEventListener('statechange', onStateChange);
    };

    const onUpdateFound = () => {
      if (registration) {
        trackInstalling(registration.installing, registration);
      }
    };

    const onControllerChange = () => {
      if (refreshingRef.current) {
        refreshingRef.current = false;
        reloadRef.current();
      }
    };

    sw.addEventListener('controllerchange', onControllerChange);

    sw.register('/sw.js')
      .then((reg) => {
        if (cancelled) return;
        registration = reg;

        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setDismissed(false);
        }
        if (reg.installing) {
          trackInstalling(reg.installing, reg);
        }
        reg.addEventListener('updatefound', onUpdateFound);
      })
      .catch(() => {
        // SW registration failure (e.g. restricted private mode) stays silent; app still works online.
      });

    return () => {
      cancelled = true;
      sw.removeEventListener('controllerchange', onControllerChange);
      if (registration) {
        registration.removeEventListener('updatefound', onUpdateFound);
      }
      for (const [worker, handler] of trackedWorkers) {
        worker.removeEventListener('statechange', handler);
      }
      trackedWorkers.clear();
    };
  }, [enabled]);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) return;
    refreshingRef.current = true;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }, [waitingWorker]);

  const dismissUpdate = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    updateAvailable: Boolean(waitingWorker) && !dismissed,
    applyUpdate,
    dismissUpdate,
  };
}
