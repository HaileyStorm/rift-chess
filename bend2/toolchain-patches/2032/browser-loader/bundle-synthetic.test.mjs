// Real Bun browser bundler with synthetic selected JS only. This tests loader
// wiring, not any full 2.0.32 cache or rendered game behavior.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root, moduleSpecs } from '../../../tools/selected-modules.mjs';
import { createSelectedLoader2032 } from './loader.mjs';

process.env.BEND_NO_TELEMETRY = '1';
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw Error('unexpected network access'); };
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const modules = Object.fromEntries(Object.entries(moduleSpecs).map(([name, spec]) => {
  const bytes = Buffer.from(`export default {${spec.exports.map((entry) =>
    `${JSON.stringify(entry)}:()=>null`).join(',')}};`);
  const manifest = { binding: { module: { name, entry: spec.entry, exports: spec.exports } },
    output: { bytes: bytes.length, sha256: sha(bytes) } };
  return [name, { bytes, manifest, manifestBytes: Buffer.from(JSON.stringify(manifest)) }];
}));
const helper = await Bun.build({
  entrypoints: [path.join(root, 'bend2/platform/browser/sprite-helper.ts')],
  target: 'browser', format: 'esm', splitting: false,
  plugins: [createSelectedLoader2032({ modules })],
  define: {
    __BEND_SPRITE_SOURCE__: JSON.stringify('synthetic-no-cache'),
    __BEND_PREPARED_GROUND_PATH__: JSON.stringify(''),
    __BEND_PREPARED_GROUND_SHA__: JSON.stringify(''),
    __BEND_PREPARED_PLATE_SHA__: JSON.stringify(''),
    __BEND_PREPARED_FRAME_JSON__: JSON.stringify(''),
  },
});
assert.equal(helper.success, true, helper.logs.map(String).join('\n'));
assert.equal(helper.outputs.length, 1);
const result = await Bun.build({
  entrypoints: [path.join(root, 'bend2/platform/browser/worker-v2.ts')],
  target: 'browser', format: 'esm', splitting: false,
  plugins: [createSelectedLoader2032({ modules })],
  define: {
    __BEND_SPRITE_HELPER__: JSON.stringify('./synthetic-only.js'),
    __BEND_SPRITE_SOURCE__: JSON.stringify('synthetic-no-cache'),
  },
});
assert.equal(result.success, true, result.logs.map(String).join('\n'));
assert.equal(result.outputs.filter((file) => file.path.endsWith('.js')).length, 1);
assert.equal(networkCalls, 0);
console.log(JSON.stringify({ schema: 'rift-bend-2032-worker-bundle-synthetic/1',
  passed: true, outputs: [...helper.outputs, ...result.outputs].map((file) => ({
    name: path.basename(file.path), bytes: file.size })), networkCalls,
  scope: 'real Bun build of worker-v2 with synthetic selected JS; no emitted caches, rendered browser, or 2.0.32 app acceptance' }));
