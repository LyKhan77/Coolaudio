import { describe, expect, it } from 'vitest';

const fsSpecifier = 'node:fs';
const pathSpecifier = 'node:path';
const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function readRepoFile(relativePath: string, encoding?: 'utf8') {
  const [{ readFileSync }, { resolve }] = await Promise.all([
    import(/* @vite-ignore */ fsSpecifier),
    import(/* @vite-ignore */ pathSpecifier),
  ]);
  const target = resolve(relativePath);
  return encoding ? (readFileSync(target, encoding) as string) : readFileSync(target);
}

async function readPublicFile(filename: string, encoding?: 'utf8') {
  return readRepoFile(`public/${filename}`, encoding);
}

async function readPngDimensions(filename: string) {
  const raw = (await readPublicFile(filename)) as ArrayLike<number>;
  const bytes = new Uint8Array(raw);
  expect(bytes.subarray(0, 8)).toEqual(PNG_MAGIC);
  const ihdrTag = String.fromCharCode(...bytes.subarray(12, 16));
  expect(ihdrTag).toBe('IHDR');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

describe('PWA public assets', () => {
  it('provides a valid web app manifest with standalone display and 192/512 icons', async () => {
    const raw = (await readPublicFile('manifest.webmanifest', 'utf8')) as string;
    const manifest = JSON.parse(raw) as {
      name: string;
      short_name: string;
      display: string;
      icons: Array<{ src: string; sizes: string; type: string }>;
    };

    expect(manifest.short_name).toBe('Coolaudio');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }),
        expect.objectContaining({ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }),
      ]),
    );
  });

  it('has valid 192x192 and 512x512 PNG icons', async () => {
    expect(await readPngDimensions('icon-192.png')).toEqual({
      width: 192,
      height: 192,
    });
    expect(await readPngDimensions('icon-512.png')).toEqual({
      width: 512,
      height: 512,
    });
  });

  it('configures public/sw.js with isolated FFmpeg core cache and SKIP_WAITING handler', async () => {
    const sw = (await readPublicFile('sw.js', 'utf8')) as string;
    expect(sw).toContain("const CORE_CACHE = 'coolaudio-ffmpeg-v0.12.6'");
    expect(sw).toContain("'/ffmpeg/ffmpeg-core.wasm'");
    expect(sw).toContain("'/ffmpeg/ffmpeg-core.js'");
    expect(sw).toContain("type === 'SKIP_WAITING'");
    expect(sw).toContain('/* __PRECACHE_ASSETS__ */');
  });

  it('configures vercel.json with dist output, no-cache sw.js, and long immutable wasm cache', async () => {
    const raw = (await readRepoFile('vercel.json', 'utf8')) as string;
    const config = JSON.parse(raw) as {
      outputDirectory: string;
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };

    expect(config.outputDirectory).toBe('dist');
    const swRule = config.headers.find((h) => h.source === '/sw.js');
    expect(swRule?.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'Cache-Control', value: expect.stringContaining('no-cache') }),
      ]),
    );

    const wasmRule = config.headers.find((h) => h.source.includes('.wasm'));
    expect(wasmRule?.headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'Content-Type', value: 'application/wasm' }),
        expect.objectContaining({ key: 'Cache-Control', value: expect.stringContaining('immutable') }),
      ]),
    );
  });
});
