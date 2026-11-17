const APP_CACHE = 'coolaudio-shell-dev';
// Keep the 31 MB FFmpeg core in its own cache so app-shell updates do not evict it.
const CORE_CACHE = 'coolaudio-ffmpeg-v0.12.6';
const FONT_CACHE = 'coolaudio-fonts-v1';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/lee-anime.png',
  /* __PRECACHE_ASSETS__ */
];

const CORE_ASSETS = ['/ffmpeg/ffmpeg-core.js', '/ffmpeg/ffmpeg-core.wasm'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const appCache = await caches.open(APP_CACHE);
      await appCache.addAll(SHELL_ASSETS);

      // Warm the 31 MB FFmpeg core non-fatally so tight mobile/iOS quotas never block install.
      try {
        const coreCache = await caches.open(CORE_CACHE);
        for (const url of CORE_ASSETS) {
          const hit = await coreCache.match(url, { ignoreVary: true });
          if (!hit) {
            await coreCache.add(url);
          }
        }
      } catch {
        // Core files will still be cached on first conversion via fetch handler.
      }
    })(),
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([APP_CACHE, CORE_CACHE, FONT_CACHE]);
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function cacheFirst(request, cacheName, allowOpaque = false) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;

  const response = await fetch(request);
  if ((response.ok && response.status === 200) || (allowOpaque && response.type === 'opaque')) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put('/index.html', response.clone());
    }
    return response;
  } catch {
    return (
      (await cache.match('/index.html', { ignoreVary: true })) ||
      (await cache.match('/', { ignoreVary: true })) ||
      Response.error()
    );
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (
    url.origin === self.location.origin &&
    (url.pathname === '/ffmpeg/ffmpeg-core.js' || url.pathname === '/ffmpeg/ffmpeg-core.wasm')
  ) {
    event.respondWith(cacheFirst(request, CORE_CACHE));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONT_CACHE, true));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, APP_CACHE));
  }
});
