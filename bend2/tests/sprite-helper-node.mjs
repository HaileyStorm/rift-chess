import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';
import { root, cacheDir, assertCache } from '../tools/selected-modules.mjs';

const token = assertCache('scene').manifest.output.sha256;
const helperSourcePath = path.join(root, 'bend2/platform/browser/sprite-helper.ts');
const assetSourcePath = path.join(root, 'bend2/platform/browser/asset-port.ts');
const generatedRoot = fs.mkdtempSync(path.join(root, '.artifacts/bend2/v2-preview/sprite-helper-node-'));
const helperPath = path.join(generatedRoot, 'sprite-helper.mjs');
const assetPath = path.join(generatedRoot, 'asset-port.mjs');
const scenePath = path.join(cacheDir, 'scene.js');

function transpile(source, fileName) {
  return stripTypeScriptTypes(source, { mode: 'strip', sourceUrl: fileName });
}

let helperSource = fs.readFileSync(helperSourcePath, 'utf8');
helperSource = helperSource.replace("declare const __BEND_SPRITE_SOURCE__: string;",
  `const __BEND_SPRITE_SOURCE__ = ${JSON.stringify(token)};`);
helperSource = helperSource.replace("import BoardScene from '../../graphics/v2game/BoardScene.bend';",
  `import BoardScene from ${JSON.stringify(pathToFileURL(scenePath).href)};`);
helperSource = helperSource.replace("import { loadAssetRequests } from './asset-port';",
  `import { loadAssetRequests } from ${JSON.stringify(pathToFileURL(assetPath).href)};`);
assert.ok(!helperSource.includes("'../../graphics/v2game/BoardScene.bend'"),
  'test harness must resolve BoardScene through its currently source-bound selected module');
fs.writeFileSync(assetPath, transpile(fs.readFileSync(assetSourcePath, 'utf8'), assetSourcePath));
fs.writeFileSync(helperPath, transpile(helperSource, helperSourcePath));

const bootstrap = `
const { parentPort, workerData } = require('node:worker_threads');
(async () => {
  const module = await import(require('node:url').pathToFileURL(workerData.entry).href);
  const state = { calls: [], fetchGroups: [], delayNextFetch: false };
  const list = items => items.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
  const values = value => { const out = []; while (value?.$ === 'Con') { out.push(value.head); value = value.tail; } return out; };
  const scene = {
    asset_ids(theme) { return list([{ id: theme, path: theme === 0 ? 'assets/observatory-astral.rga' : 'assets/observatory-stone.rga', max_bytes: 32 }]); },
    sprite_asset_ids() { return list([0, 1, 2].map(id => ({ id, path: 'assets/pieces-fast-' + id + '.rga', max_bytes: 32 }))); },
    load_plates(responses) { const item = values(responses)[0]; state.calls.push('decode-plate-' + item.id); return { theme: item.id }; },
    load_sprite_pages(responses) { state.calls.push('decode-sprites'); return { $: 'Some', value: { prepared: true } }; },
    underlay512_asset(theme, plates) { state.calls.push('underlay-' + theme); return { theme, platesTheme: plates.theme }; },
    settled_ground512(frame, underlay) { state.calls.push('ground-' + frame.marker); return { theme: underlay.theme, marker: frame.marker }; },
    fast_sprite_pieces512(frame, pieces, ground) { state.calls.push('sprites-' + frame.marker); return { $: 'Pix', color: frame.theme + 1 }; },
  };
  const scope = {
    location: { href: 'http://localhost/worker.mjs' },
    addEventListener(_type, listener) { parentPort.on('message', data => listener({ data })); },
    postMessage(message) { parentPort.postMessage({ ...message, testState: { calls: [...state.calls], fetchGroups: [...state.fetchGroups] } }); },
  };
  const loadAssets = async requests => {
    const entries = [...requests];
    state.fetchGroups.push(entries.map(item => item.path));
    if (state.delayNextFetch) { state.delayNextFetch = false; await new Promise(resolve => setTimeout(resolve, 40)); }
    return entries.map(item => ({ $: 'AssetResponse', id: item.id, bytes: list([0]), ok: true }));
  };
  let time = 0;
  module.installSpriteHelper(scope, { scene, loadAssets, now: () => ++time, source: workerData.source });
  parentPort.on('message', data => {
    if (data.kind === 'test-delay-fetch') state.delayNextFetch = true;
  });
})().catch(error => parentPort.postMessage({ kind: 'test-crash', message: String(error) }));
`;

function waitFor(worker, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Timed out waiting for sprite helper response')), timeoutMs);
    const onMessage = message => {
      if (predicate(message)) finish(null, message);
      else if (message.kind === 'test-crash') finish(new Error(message.message));
    };
    const onError = error => finish(error);
    function finish(error, value) {
      clearTimeout(timer);
      worker.off('message', onMessage);
      worker.off('error', onError);
      if (error) reject(error); else resolve(value);
    }
    worker.on('message', onMessage);
    worker.on('error', onError);
  });
}

test('static sprite helper validates source/theme and retains Bend assets across real worker messages', async t => {
  assert.match(token, /^[0-9a-f]{64}$/);
  const worker = new Worker(bootstrap, { eval: true, workerData: { entry: helperPath, source: token } });
  t.after(() => worker.terminate());
  const hello = await waitFor(worker, message => message.kind === 'hello');
  assert.deepEqual({ protocol: hello.protocol, source: hello.source }, { protocol: 1, source: token });

  worker.postMessage({ kind: 'job', protocol: 1, id: 1, generation: 1,
    source: 'f'.repeat(64), theme: 0, frame: { $: 'Frame', theme: 0, marker: 'wrong-source' } });
  const wrongSource = await waitFor(worker, message => message.kind === 'error' && message.id === 1);
  assert.match(wrongSource.message, /source binding mismatch/);

  worker.postMessage({ kind: 'job', protocol: 1, id: 2, generation: 1,
    source: token, theme: 1, frame: { $: 'Frame', theme: 0, marker: 'mismatch' } });
  const wrongTheme = await waitFor(worker, message => message.kind === 'error' && message.id === 2);
  assert.match(wrongTheme.message, /frame\/theme mismatch/);

  worker.postMessage({ kind: 'job', protocol: 1, id: 3, generation: 1,
    source: token, theme: 0, frame: { $: 'Frame', theme: 0, marker: 'first' } });
  const first = await waitFor(worker, message => message.kind === 'result' && message.id === 3);
  assert.deepEqual(first.image, { $: 'Pix', color: 1 }, 'the immutable Bend Image crosses a real worker structured-clone boundary');
  assert.deepEqual(first.testState.calls.slice(-3), ['underlay-0', 'ground-first', 'sprites-first'],
    'Bend underlay, ground, then sprite composition run in order');
  assert.equal(first.testState.fetchGroups.length, 2, 'first theme and sprite assets load in parallel groups');
  assert.ok(Object.values(first.metrics).every(Number.isFinite));
  assert.equal(first.source, token);

  worker.postMessage({ kind: 'job', protocol: 1, id: 4, generation: 1,
    source: token, theme: 0, frame: { $: 'Frame', theme: 0, marker: 'cached' } });
  const cached = await waitFor(worker, message => message.kind === 'result' && message.id === 4);
  assert.equal(cached.testState.fetchGroups.length, 2, 'same-theme plate, prepared sprites and underlay are retained');
  assert.equal(cached.metrics.fetchMs, 0);
  assert.equal(cached.metrics.decodeMs, 0);

  worker.postMessage({ kind: 'job', protocol: 1, id: 4, generation: 1,
    source: token, theme: 0, frame: { $: 'Frame', theme: 0, marker: 'cached-2' } });
  const duplicate = await waitFor(worker, message => message.kind === 'error' && message.id === 4);
  assert.match(duplicate.message, /Duplicate/);

  worker.postMessage({ kind: 'test-delay-fetch' });
  worker.postMessage({ kind: 'job', protocol: 1, id: 6, generation: 2,
    source: token, theme: 1, frame: { $: 'Frame', theme: 1, marker: 'superseded' } });
  worker.postMessage({ kind: 'job', protocol: 1, id: 7, generation: 3,
    source: token, theme: 0, frame: { $: 'Frame', theme: 0, marker: 'newest' } });
  const stale = await waitFor(worker, message => message.kind === 'stale' && message.id === 6);
  assert.equal(stale.generation, 2);
  const newest = await waitFor(worker, message => message.kind === 'result' && message.id === 7);
  assert.deepEqual(newest.image, { $: 'Pix', color: 1 });
  assert.equal(newest.testState.fetchGroups.length, 4,
    'a superseded theme can fill its asset cache; the newest theme is then restored and painted');
});
