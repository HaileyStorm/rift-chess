import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root, moduleSpecs } from '../../../tools/selected-modules.mjs';
import { createSelectedLoader2032 } from './loader.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
function member(name, spec, bytes = Buffer.from(`export default {${spec.exports.map((entry) =>
  `${JSON.stringify(entry)}:()=>${JSON.stringify(name)}`).join(',')}};`)) {
  const manifest = { binding: { module: { name, entry: spec.entry, exports: spec.exports } },
    output: { bytes: bytes.length, sha256: sha(bytes) } };
  return { bytes, manifest, manifestBytes: Buffer.from(JSON.stringify(manifest)) };
}
const fresh = () => Object.fromEntries(Object.entries(moduleSpecs).map(([name, spec]) =>
  [name, member(name, spec)]));
const modules = fresh();
const expected = Object.fromEntries(Object.entries(modules).map(([name, member]) =>
  [name, member.bytes.toString('utf8')]));
let onLoad;
const plugin = createSelectedLoader2032({ modules });
modules.menu.bytes.fill(0);
plugin.setup({ onLoad(options, callback) {
  assert.equal(String(options.filter), String(/\.bend$/));
  onLoad = callback;
} });
assert.equal(typeof onLoad, 'function');
for (const [name, spec] of Object.entries(moduleSpecs)) {
  const result = await onLoad({ path: path.resolve(root, spec.entry) });
  assert.equal(result.loader, 'js');
  assert.equal(result.contents, expected[name]);
}
await assert.rejects(onLoad({ path: path.join(root, 'bend2/core/v2/CHECK.bend') }),
  /unexpected Bend module/);
assert.throws(() => createSelectedLoader2032({ modules: { ...fresh(), chrome: undefined } }),
  /missing verified JS bytes/);
assert.throws(() => createSelectedLoader2032({ modules: { ...fresh(), extra: member('menu', moduleSpecs.menu) } }),
  /exact four-member/);
const order = fresh();
order.menu.manifest.binding.module.exports = [...order.menu.manifest.binding.module.exports].reverse();
order.menu.manifestBytes = Buffer.from(JSON.stringify(order.menu.manifest));
assert.throws(() => createSelectedLoader2032({ modules: order }),
  /wrong selected cache identity/);
const edited = fresh();
edited.menu.bytes[0] ^= 1;
assert.throws(() => createSelectedLoader2032({ modules: edited }),
  /verified selected cache bytes changed/);
const invalid = fresh();
invalid.menu = member('menu', moduleSpecs.menu, Buffer.from([0xff, 0xfe]));
assert.throws(() => createSelectedLoader2032({ modules: invalid }),
  /encoded data was not valid|UTF-8/i);
const reserialized = fresh();
reserialized.menu.manifest.output.bytes++;
assert.throws(() => createSelectedLoader2032({ modules: reserialized }),
  /parsed manifest differs/);
console.log(JSON.stringify({ schema: 'rift-bend-2032-cache-loader-test/1', passed: true,
  accepted: Object.keys(modules), snapshotIsolated: true,
  rejected: ['unknown-import', 'missing-bytes', 'extra-member', 'wrong-export-order',
    'post-verification-byte-mutation', 'invalid-utf8', 'parsed-manifest-mutation'],
  scope: 'pure loader wiring only; synthetic bytes, no emitted cache, browser or Bend run' }));
