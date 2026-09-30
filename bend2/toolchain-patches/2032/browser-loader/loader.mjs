// Versioned cache-only Bun adapter. The caller must supply a four-member set
// already verified by the 2.0.32 cache-set gate; no Bend source is compiled
// or fetched from this plugin.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root, moduleSpecs } from '../../../tools/selected-modules.mjs';

const names = Object.keys(moduleSpecs).sort();
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const byEntry = new Map(Object.entries(moduleSpecs).map(([name, spec]) =>
  [path.resolve(root, spec.entry), name]));

export function createSelectedLoader2032(verified) {
  assert.deepEqual(Object.keys(verified?.modules ?? {}).sort(), names,
    '2.0.32 browser loader requires an exact four-member verified cache set');
  const contents = new Map();
  for (const name of names) {
    const member = verified.modules[name];
    assert.ok(Buffer.isBuffer(member?.bytes), `missing verified JS bytes: ${name}`);
    assert.ok(Buffer.isBuffer(member?.manifestBytes), `missing raw manifest bytes: ${name}`);
    assert.deepEqual(JSON.parse(member.manifestBytes.toString('utf8')), member.manifest,
      `parsed manifest differs from verified raw bytes: ${name}`);
    assert.deepEqual(member.manifest?.binding?.module,
      { name, entry: moduleSpecs[name].entry, exports: moduleSpecs[name].exports },
      `wrong selected cache identity: ${name}`);
    assert.equal(member.bytes.length, member.manifest?.output?.bytes,
      `verified selected cache length changed: ${name}`);
    assert.equal(sha(member.bytes), member.manifest.output.sha256,
      `verified selected cache bytes changed: ${name}`);
    const code = new TextDecoder('utf-8', { fatal: true }).decode(member.bytes);
    assert.deepEqual(Buffer.from(code, 'utf8'), member.bytes,
      `selected cache is not exact UTF-8: ${name}`);
    contents.set(name, code);
  }
  return {
    name: 'rift-bend-2032-selected-cache-only',
    setup(build) {
      build.onLoad({ filter: /\.bend$/ }, async ({ path: file }) => {
        const name = byEntry.get(path.resolve(file));
        assert.ok(name, `unexpected Bend module in 2.0.32 browser bundle: ${file}`);
        return { contents: contents.get(name), loader: 'js' };
      });
    },
  };
}
