import { describe, expect, it } from 'vitest';
import { friendlyProcessingError, isMemoryError, MEMORY_ERROR_MESSAGE } from '../processingErrors';

describe('processingErrors', () => {
  it('detects wasm and allocation memory failures', () => {
    expect(isMemoryError(new Error('memory access out of bounds'))).toBe(true);
    expect(isMemoryError(new RangeError('Array buffer allocation failed'))).toBe(true);
    expect(isMemoryError(new Error('Aborted(OOM). Build with -sASSERTIONS'))).toBe(true);
    expect(isMemoryError(new Error('Cannot enlarge memory arrays'))).toBe(true);
  });

  it('does not treat unrelated errors as memory errors', () => {
    expect(isMemoryError(new Error('No compatible audio or video stream found'))).toBe(false);
    expect(isMemoryError('something else')).toBe(false);
    expect(isMemoryError(undefined)).toBe(false);
  });

  it('maps memory errors to a clear message and keeps other messages', () => {
    expect(friendlyProcessingError(new Error('memory access out of bounds'))).toBe(MEMORY_ERROR_MESSAGE);
    expect(friendlyProcessingError(new Error('Target size is too small'))).toBe('Target size is too small');
    expect(friendlyProcessingError(42)).toBe('Unexpected error during media processing.');
  });
});
