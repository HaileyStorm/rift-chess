import assert from 'node:assert/strict';
import { loadAssetRequests } from '../platform/browser/asset-port';

// Exercise the generic browser boundary using the actual Bend field spelling.
// Theme choice and decoding remain on the Bend side of this boundary.
(globalThis as any).self = { location: { origin: 'https://game.example',
  href: 'https://game.example/preview/worker-abcd.js' } };
const calls: string[] = [];
(globalThis as any).fetch = async (url: URL) => {
  calls.push(url.href);
  const response = new Response(new Uint8Array([82, 71, 65, 49]), {
    status: 200, headers: { 'content-length': '4' },
  });
  Object.defineProperty(response, 'url', { value: url.href });
  return response;
};
const id = { $: 'Astral' };
const [good] = await loadAssetRequests([{ $: 'AssetRequest', id,
  path: 'assets/observatory-astral.rga', max_bytes: 4 }]);
assert.equal(good.$, 'AssetResponse');
assert.deepEqual(good.id, id);
assert.equal(good.ok, true);
const bytes: number[] = [];
for (let node = good.bytes; node.$ === 'Con'; node = node.tail) bytes.push(node.head);
assert.deepEqual(bytes, [82, 71, 65, 49]);
assert.equal(calls.length, 1);
assert.equal(calls[0], 'https://game.example/preview/assets/observatory-astral.rga');
const [sprite] = await loadAssetRequests([{ $: 'AssetRequest', id: 0,
  path: 'assets/pieces-fast-0.rga', max_bytes: 65541 }]);
assert.equal(sprite.ok, true);
assert.equal(sprite.id, 0);
assert.equal(calls[1], 'https://game.example/preview/assets/pieces-fast-0.rga');

for (const request of [
  { path: '../private.rga', max_bytes: 4 },
  { path: 'assets/observatory-astral.rga', max_bytes: 0 },
  { path: 'assets/observatory-astral.rga', max_bytes: 1_048_577 },
]) {
  const [bad] = await loadAssetRequests([{ $: 'AssetRequest', id, ...request }]);
  assert.equal(bad.ok, false);
  assert.equal(bad.bytes.$, 'Nil');
}
assert.equal(calls.length, 2);
const [short] = await loadAssetRequests([{ $: 'AssetRequest', id,
  path: 'assets/observatory-astral.rga', max_bytes: 3 }]);
assert.equal(short.ok, false);
assert.equal(short.bytes.$, 'Nil');
(globalThis as any).fetch = async (url: URL) => {
  const redirect = new Response(new Uint8Array([82]), { status: 200 });
  Object.defineProperty(redirect, 'url', { value: url.href });
  Object.defineProperty(redirect, 'redirected', { value: true });
  return redirect;
};
const [redirect] = await loadAssetRequests([{ $: 'AssetRequest', id,
  path: 'assets/observatory-astral.rga', max_bytes: 4 }]);
assert.equal(redirect.ok, false);
(globalThis as any).fetch = async () => { throw new Error('offline'); };
const [offline] = await loadAssetRequests([{ $: 'AssetRequest', id,
  path: 'assets/observatory-astral.rga', max_bytes: 4 }]);
assert.equal(offline.ok, false);
assert.equal(offline.bytes.$, 'Nil');
console.log(JSON.stringify({ ok: true, cases: 8,
  coverage: 'Bend field spelling, same-origin plate and sprite URLs, exact bytes, byte/path caps, redirect and offline fallback' }));
