import assert from 'node:assert/strict';

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
