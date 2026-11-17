export const MAX_BATCH_FILES = 20;

interface PoolOptions<T> {
  items: T[];
  concurrency: number;
  /** Handles one item. Report failures through your own state; a throw is swallowed so the pool continues. */
  run: (item: T, workerIndex: number) => Promise<void>;
  /** Checked before each item starts; running items are not interrupted. */
  shouldStop?: () => boolean;
}

/** Run items through a fixed number of workers. Resolves when every worker has finished. */
export async function runPool<T>({
  items,
  concurrency,
  run,
  shouldStop,
}: PoolOptions<T>): Promise<void> {
  let next = 0;

  const worker = async (workerIndex: number) => {
    while (next < items.length && !shouldStop?.()) {
      const item = items[next];
      next += 1;
      try {
        await run(item, workerIndex);
      } catch {
        // The caller records per-item failures inside run; one bad item must not stop the rest.
      }
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, (_, index) => worker(index)));
}

/** Make output filenames unique (case-insensitive) by adding " (2)", " (3)" before the extension. */
export function uniqueFilenames(names: string[]): string[] {
  const used = new Set<string>();

  return names.map((name) => {
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';

    let candidate = name;
    let counter = 2;
    while (used.has(candidate.toLowerCase())) {
      candidate = `${base} (${counter})${ext}`;
      counter += 1;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}
