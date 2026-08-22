const SHELL_CACHE = 'chess-analyzer-shell-v1';
const ENGINE_CACHE = 'chess-analyzer-engine-v1';
const SHELL = ['./', './manifest.webmanifest', './icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isEngine = url.pathname.includes('/stockfish/');
  const cacheName = isEngine ? ENGINE_CACHE : SHELL_CACHE;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response.ok) return response;
        const clone = response.clone();
        caches.open(cacheName).then((cache) => cache.put(event.request, clone)).catch(() => undefined);
        return response;
      });
    }),
  );
});
