import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = resolve(rootDir, 'node_modules/@ffmpeg/core/dist/esm');
const destDir = resolve(rootDir, 'public/ffmpeg');

if (!existsSync(srcDir)) {
  console.warn('[copy-ffmpeg] @ffmpeg/core/dist/esm not found yet, skipping.');
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });

for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  const from = resolve(srcDir, file);
  const to = resolve(destDir, file);
  if (existsSync(from)) {
    cpSync(from, to);
  } else {
    throw new Error(`[copy-ffmpeg] Missing expected file: ${from}`);
  }
}

console.log('[copy-ffmpeg] Copied ffmpeg-core.js and ffmpeg-core.wasm to public/ffmpeg');
