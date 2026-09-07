const CACHE_PREFIX = 'rift-chess-static-';
// Embedded at build time: a restarted worker must never fetch metadata to work offline.
const CACHE_VERSION = '__RIFT_CACHE_VERSION__';
const ACTIVE_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}`;

function isInScope(requestUrl) {
  return requestUrl.href.startsWith(self.registration.scope);
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch('./precache.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Offline manifest unavailable');
    const value = await response.json();
    if (value.version !== CACHE_VERSION || !Array.isArray(value.assets)) throw new Error('Offline manifest version mismatch');
    const urls = value.assets.map(asset => {
      if (typeof asset !== 'string') throw new Error('Invalid offline asset');
      const url = new URL(asset, self.registration.scope);
      if (url.origin !== self.location.origin || !isInScope(url)) throw new Error('Foreign offline asset');
      return url.toString();
    });
    await (await caches.open(ACTIVE_CACHE)).addAll(urls);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await Promise.all(
      (await caches.keys())
        .filter((name) => name.startsWith(CACHE_PREFIX) && name !== ACTIVE_CACHE)
        .map((name) => caches.delete(name)),
    );
  })());
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin || !isInScope(requestUrl)) return;

  event.respondWith((async () => {
    const cache = await caches.open(ACTIVE_CACHE);
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;

    if (event.request.mode === 'navigate') {
      const fallback = await cache.match(new URL('./index.html', self.registration.scope).toString());
      if (fallback) return fallback;
    }
    return fetch(event.request);
  })());
});
