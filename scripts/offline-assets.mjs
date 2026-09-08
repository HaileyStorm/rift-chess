import assert from 'node:assert/strict';

export async function waitForServiceWorker(page, { phase, version, timeout = 60_000 }) {
  if (!['active', 'installed', 'controlled'].includes(phase)) throw new Error(`Unsupported service-worker phase: ${phase}`);
  if (phase !== 'active' && (typeof version !== 'string' || !version)) throw new Error('Installed/controlled service-worker checks require an exact version.');
  if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('Service-worker timeout must be finite and positive.');
  const deadline = Date.now() + timeout;
  let snapshot = null;
  while (Date.now() <= deadline) {
    snapshot = await page.evaluate(async ({ phase, version }) => {
      const registration = await navigator.serviceWorker.getRegistration();
      const caches = (await globalThis.caches.keys()).filter(name => name.startsWith('rift-chess-static-'));
      const active = registration?.active;
      const requestedCachePresent = caches.includes(`rift-chess-static-${version}`);
      const exactCache = !version || (caches.length === 1 && caches[0] === `rift-chess-static-${version}`);
      const state = {
        scope: registration?.scope ?? null,
        active: active ? { state: active.state, scriptURL: active.scriptURL } : null,
        waiting: registration?.waiting ? { state: registration.waiting.state, scriptURL: registration.waiting.scriptURL } : null,
        installing: registration?.installing ? { state: registration.installing.state, scriptURL: registration.installing.scriptURL } : null,
        controller: navigator.serviceWorker.controller?.scriptURL ?? null,
        controllerMatchesActive: Boolean(active && navigator.serviceWorker.controller === active),
        caches,
      };
      const activeReady = state.active?.state === 'activated';
      const installed = ((state.waiting?.state === 'installed' || state.installing?.state === 'installed') && requestedCachePresent) || (activeReady && exactCache);
      const controlled = activeReady && !state.waiting && !state.installing && state.controllerMatchesActive && exactCache;
      return { state, ready: phase === 'active' ? activeReady : phase === 'installed' ? installed : controlled };
    }, { phase, version });
    if (snapshot.ready) return snapshot.state;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for service-worker ${phase}: ${JSON.stringify(snapshot?.state)}`);
}

// precache.json is install-time metadata, deliberately absent from the offline cache.
export async function cachedBuild(page, manifest, requireController = false) {
  const result = await page.evaluate(async ({ manifest, requireController }) => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.active || registration.active.state !== 'activated') throw new Error('Offline worker is not active.');
    if (requireController && !navigator.serviceWorker.controller) throw new Error('Offline page is not controlled.');
    const name = `rift-chess-static-${manifest.version}`;
    if (!(await caches.keys()).includes(name)) throw new Error('Expected offline build cache is absent.');
    const cache = await caches.open(name);
    const wanted = manifest.assets.map(asset => new URL(asset, registration.scope).href).sort();
    const keys = (await cache.keys()).map(request => request.url).sort();
    if (JSON.stringify(keys) !== JSON.stringify(wanted)) throw new Error('Offline asset membership differs from the bound manifest.');
    const files = [];
    for (const url of wanted) {
      const response = await cache.match(url);
      if (!response?.ok) throw new Error('Cached asset is unavailable.');
      const bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      files.push({ url, bytes: bytes.byteLength, sha256: [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('') });
    }
    return { version: manifest.version, cache: name, files };
  }, { manifest, requireController });
  assert.equal(result.files.length, manifest.assets.length);
  return result;
}
