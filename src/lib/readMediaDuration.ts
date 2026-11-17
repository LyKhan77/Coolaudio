/**
 * Read a media file's duration from its metadata. Resolves 0 when the browser cannot read it
 * (for example HEVC .mov files on some browsers) or after a timeout.
 */
export function readMediaDuration(
  file: File,
  kind: 'video' | 'audio',
  timeoutMs = 8000,
): Promise<number> {
  return new Promise((resolve) => {
    const element = document.createElement(kind);
    const url = URL.createObjectURL(file);
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (duration: number) => {
      clearTimeout(timer);
      element.removeAttribute('src');
      element.load();
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) && duration > 0 ? duration : 0);
    };

    timer = setTimeout(() => finish(0), timeoutMs);
    element.preload = 'metadata';
    element.onloadedmetadata = () => finish(element.duration);
    element.onerror = () => finish(0);
    element.src = url;
  });
}
