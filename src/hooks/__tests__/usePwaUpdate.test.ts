import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePwaUpdate } from '../usePwaUpdate';

class FakeServiceWorker extends EventTarget {
  state: ServiceWorkerState;
  postMessage = vi.fn();

  constructor(state: ServiceWorkerState) {
    super();
    this.state = state;
  }

  setState(next: ServiceWorkerState) {
    this.state = next;
    this.dispatchEvent(new Event('statechange'));
  }
}

class FakeRegistration extends EventTarget {
  waiting: ServiceWorker | null = null;
  installing: ServiceWorker | null = null;
}

class FakeServiceWorkerContainer extends EventTarget {
  controller: ServiceWorker | null = null;
  register = vi.fn();
}

function installServiceWorkerContainer(container: FakeServiceWorkerContainer | undefined) {
  if (container === undefined) {
    Reflect.deleteProperty(navigator, 'serviceWorker');
    return;
  }
  Object.defineProperty(navigator, 'serviceWorker', {
    value: container,
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, 'serviceWorker');
  vi.restoreAllMocks();
});

describe('usePwaUpdate', () => {
  it('does nothing when disabled or when serviceWorker is unsupported', () => {
    const container = new FakeServiceWorkerContainer();
    installServiceWorkerContainer(container);

    const { result: disabledResult } = renderHook(() => usePwaUpdate({ enabled: false }));
    expect(container.register).not.toHaveBeenCalled();
    expect(disabledResult.current.updateAvailable).toBe(false);

    installServiceWorkerContainer(undefined);
    const { result: unsupportedResult } = renderHook(() => usePwaUpdate({ enabled: true }));
    expect(unsupportedResult.current.updateAvailable).toBe(false);
  });

  it('exposes updateAvailable when a waiting worker is already present', async () => {
    const container = new FakeServiceWorkerContainer();
    const registration = new FakeRegistration();
    const waiting = new FakeServiceWorker('installed');
    registration.waiting = waiting as unknown as ServiceWorker;
    container.register.mockResolvedValue(registration);
    installServiceWorkerContainer(container);

    const { result } = renderHook(() => usePwaUpdate({ enabled: true }));

    await waitFor(() => expect(container.register).toHaveBeenCalledWith('/sw.js'));
    await waitFor(() => expect(result.current.updateAvailable).toBe(true));
  });

  it('ignores initial install when there is no existing controller, and prompts on subsequent updates', async () => {
    const container = new FakeServiceWorkerContainer();
    const registration = new FakeRegistration();
    container.register.mockResolvedValue(registration);
    installServiceWorkerContainer(container);

    const { result } = renderHook(() => usePwaUpdate({ enabled: true }));
    await waitFor(() => expect(container.register).toHaveBeenCalled());

    const firstWorker = new FakeServiceWorker('installing');
    registration.installing = firstWorker as unknown as ServiceWorker;
    act(() => {
      registration.dispatchEvent(new Event('updatefound'));
      firstWorker.setState('installed');
    });
    expect(result.current.updateAvailable).toBe(false);

    container.controller = firstWorker as unknown as ServiceWorker;
    const nextWorker = new FakeServiceWorker('installing');
    registration.installing = nextWorker as unknown as ServiceWorker;
    registration.waiting = nextWorker as unknown as ServiceWorker;

    act(() => {
      registration.dispatchEvent(new Event('updatefound'));
      nextWorker.setState('installed');
    });

    expect(result.current.updateAvailable).toBe(true);
  });

  it('posts SKIP_WAITING on applyUpdate and reloads on controllerchange', async () => {
    const container = new FakeServiceWorkerContainer();
    const registration = new FakeRegistration();
    const waiting = new FakeServiceWorker('installed');
    registration.waiting = waiting as unknown as ServiceWorker;
    container.register.mockResolvedValue(registration);
    installServiceWorkerContainer(container);

    const reload = vi.fn();
    const { result } = renderHook(() => usePwaUpdate({ enabled: true, reload }));
    await waitFor(() => expect(result.current.updateAvailable).toBe(true));

    // Unrelated controllerchange (e.g. first claim) should not reload before user confirms.
    act(() => {
      container.dispatchEvent(new Event('controllerchange'));
    });
    expect(reload).not.toHaveBeenCalled();

    act(() => {
      result.current.applyUpdate();
    });
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });

    act(() => {
      container.dispatchEvent(new Event('controllerchange'));
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('hides updateAvailable when dismissed', async () => {
    const container = new FakeServiceWorkerContainer();
    const registration = new FakeRegistration();
    registration.waiting = new FakeServiceWorker('installed') as unknown as ServiceWorker;
    container.register.mockResolvedValue(registration);
    installServiceWorkerContainer(container);

    const { result } = renderHook(() => usePwaUpdate({ enabled: true }));
    await waitFor(() => expect(result.current.updateAvailable).toBe(true));

    act(() => {
      result.current.dismissUpdate();
    });
    expect(result.current.updateAvailable).toBe(false);
  });
});
