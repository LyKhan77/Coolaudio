const MB = 1024 * 1024;

// shortcut: touch pointer is a proxy for "phone/tablet"; replace with measured limits after real-device tests.
const MOBILE_LARGE_FILE_BYTES = 200 * MB;
const DESKTOP_LARGE_FILE_BYTES = 500 * MB;
const BATCH_PARALLEL_MAX_FILE_BYTES = 250 * MB;
const DESKTOP_MAX_PARALLEL = 2;

function isTouchDevice(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  );
}

/** File size above which we warn that browser memory may run out (about 3-4x the file is held in memory). */
export function largeFileThresholdBytes(): number {
  return isTouchDevice() ? MOBILE_LARGE_FILE_BYTES : DESKTOP_LARGE_FILE_BYTES;
}

/**
 * How many files to process at once. Each worker has its own ffmpeg.wasm instance and its own copy of
 * the input in memory, so phones and big files run one at a time.
 */
export function batchConcurrency(
  fileSizes: number[],
  hardwareConcurrency: number | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.hardwareConcurrency,
): number {
  if (isTouchDevice()) return 1;
  if (fileSizes.some((size) => size > BATCH_PARALLEL_MAX_FILE_BYTES)) return 1;
  const byCores = Math.floor((hardwareConcurrency ?? 0) / 2);
  return Math.max(1, Math.min(DESKTOP_MAX_PARALLEL, byCores));
}
