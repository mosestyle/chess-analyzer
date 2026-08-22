const SHELL_CACHE = 'chess-analyzer-shell-v4';
const ENGINE_CACHE = 'chess-analyzer-engine-v1';
const SHELL = ['./', './manifest.webmanifest', './icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith('chess-analyzer-shell-') && name !== SHELL_CACHE)
          .map((name) => caches.delete(name)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isEngine = url.pathname.includes('/stockfish/');

  // Engine files are large and version-pinned. Cache-first avoids repeatedly
  // downloading the Full NNUE network after the first successful load.
  if (isEngine) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
        if (!response.ok) return response;
        const clone = response.clone();
        caches.open(ENGINE_CACHE).then((cache) => cache.put(event.request, clone)).catch(() => undefined);
        return response;
      })),
    );
    return;
  }

  // For navigations, prefer the network so a new GitHub deployment appears
  // immediately instead of being hidden behind an old cached index.html.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('./', clone)).catch(() => undefined);
          }
          return response;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  // Vite's built assets are content-hashed, so cache-first is safe here.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (!response.ok) return response;
      const clone = response.clone();
      caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone)).catch(() => undefined);
      return response;
    })),
  );
});
