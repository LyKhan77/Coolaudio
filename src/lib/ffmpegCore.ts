import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let coreUrls: Promise<{ coreURL: string; wasmURL: string }> | null = null;

// The 31 MB core is turned into blob URLs once and shared by every ffmpeg instance on the page.
function getCoreUrls() {
  coreUrls ??= Promise.all([
    toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
    toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
  ])
    .then(([coreURL, wasmURL]) => ({ coreURL, wasmURL }))
    .catch((err) => {
      coreUrls = null;
      throw err;
    });
  return coreUrls;
}

/** Create a new ffmpeg.wasm instance with the core loaded. Each instance has its own memory. */
export async function createFfmpeg(): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load(await getCoreUrls());
  return ffmpeg;
}
