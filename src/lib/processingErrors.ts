export const MEMORY_ERROR_MESSAGE =
  'Not enough memory to process this file on this device. Try a smaller file, trim it first, or use a desktop browser.';

const MEMORY_PATTERN =
  /out of memory|\boom\b|memory access out of bounds|allocation failed|invalid array length|cannot enlarge memory/i;

/** True for the wasm / allocation failures that mean the file did not fit in browser memory. */
export function isMemoryError(err: unknown): boolean {
  return err instanceof Error && MEMORY_PATTERN.test(err.message);
}

export function friendlyProcessingError(err: unknown): string {
  if (isMemoryError(err)) return MEMORY_ERROR_MESSAGE;
  return err instanceof Error ? err.message : 'Unexpected error during media processing.';
}
