// Scope-qualified so two versioned previews on one origin cannot evict each
// other's cached files. A dedicated origin is still needed to avoid replacing
// another service worker registered for the same scope.
// The literal pipe cannot appear in encodeURIComponent(scope), unlike a
// hyphen; parent and nested scope names therefore cannot prefix-collide.
const SCOPE_CACHE_PREFIX = 'rift-bend-v2-' + encodeURIComponent(self.registration.scope) + '|';
const CACHE = SCOPE_CACHE_PREFIX + '__BEND_BUILD__';
const ASSETS = __BEND_ASSETS__;
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(ASSETS.map(file => new Request(new URL(file, self.location.href), { cache: 'reload' })));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith(SCOPE_CACHE_PREFIX) && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (event.request.mode === 'navigate') {
      try { return await fetch(event.request); }
      catch { return await cache.match(new URL('./index.html', self.location.href)) || Response.error(); }
    }
    return await cache.match(event.request) || fetch(event.request);
  })());
});
