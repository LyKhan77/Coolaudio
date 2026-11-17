import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const cryptoSpecifier = 'node:crypto';
const fsSpecifier = 'node:fs';
const pathSpecifier = 'node:path';

function pwaServiceWorkerPlugin(): Plugin {
  return {
    name: 'pwa-service-worker',
    async writeBundle(options, bundle) {
      const [{ createHash }, { existsSync, readFileSync, writeFileSync }, { resolve }] =
        await Promise.all([
          import(/* @vite-ignore */ cryptoSpecifier),
          import(/* @vite-ignore */ fsSpecifier),
          import(/* @vite-ignore */ pathSpecifier),
        ]);

      const outDir = options.dir ? resolve(options.dir) : resolve('dist');
      const swPath = resolve(outDir, 'sw.js');
      if (!existsSync(swPath)) return;

      const assets = Object.keys(bundle)
        .filter((fileName) => fileName.startsWith('assets/') && !fileName.includes('CreatorVoxel-'))
        .map((fileName) => `/${fileName}`)
        .sort();

      const hash = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 8);
      const serializedAssets = assets.map((asset) => `'${asset}'`).join(', ');

      const original = readFileSync(swPath, 'utf8') as string;
      const updated = original
        .replace("'coolaudio-shell-dev'", `'coolaudio-shell-${hash}'`)
        .replace('/* __PRECACHE_ASSETS__ */', serializedAssets);

      writeFileSync(swPath, updated, 'utf8');
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), pwaServiceWorkerPlugin()],
  server: {
    host: true,
    port: 5155,
  },
  preview: {
    host: true,
    port: 5155,
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
});
