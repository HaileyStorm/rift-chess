import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const helperSourcePath = path.join(root, 'bend2/platform/browser/sprite-helper.ts');
const token = createHash('sha256').update(fs.readFileSync(helperSourcePath)).digest('hex');
const assetSourcePath = path.join(root, 'bend2/platform/browser/asset-port.ts');
const generatedRoot = fs.mkdtempSync(path.join(root, '.artifacts/bend2/v2-preview/sprite-helper-node-'));
const helperPath = path.join(generatedRoot, 'sprite-helper.mjs');
const assetPath = path.join(generatedRoot, 'asset-port.mjs');

function transpile(source, fileName) {
  return stripTypeScriptTypes(source, { mode: 'strip', sourceUrl: fileName });
}

let helperSource = fs.readFileSync(helperSourcePath, 'utf8');
helperSource = helperSource.replace("declare const __BEND_SPRITE_SOURCE__: string;",
  `const __BEND_SPRITE_SOURCE__ = ${JSON.stringify(token)};`);
for (const name of ['GROUND_PATH', 'GROUND_SHA', 'PLATE_SHA', 'FRAME_JSON'])
  helperSource = helperSource.replace(`declare const __BEND_PREPARED_${name}__: string;`,
    `const __BEND_PREPARED_${name}__ = '';`);
helperSource = helperSource.replace("import BoardScene from '../../graphics/v2game/BoardScene.bend';",
  'const BoardScene = {};');
helperSource = helperSource.replace("import { boundedBytes, loadAssetRequests } from './asset-port';",
  `import { boundedBytes, loadAssetRequests } from ${JSON.stringify(pathToFileURL(assetPath).href)};`);
assert.ok(!helperSource.includes("'../../graphics/v2game/BoardScene.bend'"),
  'the protocol test injects its synthetic scene and must not require emitted game caches');
fs.writeFileSync(assetPath, transpile(fs.readFileSync(assetSourcePath, 'utf8'), assetSourcePath));
fs.writeFileSync(helperPath, transpile(helperSource, helperSourcePath));

const bootstrap = `
const { parentPort, workerData } = require('node:worker_threads');
(async () => {
  const module = await import(require('node:url').pathToFileURL(workerData.entry).href);
  const state = { calls: [], fetchGroups: [], delayNextFetch: false,
    delayNextPrepared: false, lastGround: null };
  const list = items => items.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
  const values = value => { const out = []; while (value?.$ === 'Con') { out.push(value.head); value = value.tail; } return out; };
  const scene = {
    asset_ids(theme) { return list([{ id: theme, path: theme === 0 ? 'assets/observatory-astral.rga' : 'assets/observatory-stone.rga', max_bytes: 32 }]); },
    sprite_asset_ids() { return list([0, 1, 2].map(id => ({ id, path: 'assets/pieces-fast-' + id + '.rga', max_bytes: 32 }))); },
    load_plates(responses) { const item = values(responses)[0]; state.calls.push('decode-plate-' + item.id); return { theme: item.id }; },
    load_sprite_pages(responses) { state.calls.push('decode-sprites'); return { $: 'Some', value: { prepared: true } }; },
    sprite_same_view(a, b) { return JSON.stringify(a.view ?? null) === JSON.stringify(b.view ?? null); },
    sprite_pose_pieces(frame, pieces) { return { ...pieces, pose: frame.view?.yaw ?? 0 }; },
    sprite_pick_data(pieces) { state.calls.push('pick-data'); return { $: 'Pieces', mask: pieces.prepared, pose: pieces.pose }; },
    underlay512_asset(theme, plates) { state.calls.push('underlay-' + theme); return {
      theme, platePixel: plates?.astral?.pixels?.color ?? plates?.stone?.pixels?.color ?? -1 }; },
    settled_ground512(frame, underlay) { state.calls.push('ground-' + frame.marker); return {
      theme: underlay.theme, marker: frame.marker, platePixel: underlay.platePixel }; },
    sprite_same_ground(a, b) { return a.theme === b.theme && a.groundKey === b.groundKey; },
    fast_sprite_pieces512(frame, pieces, ground) { state.calls.push('sprites-' + frame.marker);
      state.lastGround = ground; return { $: 'Pix', color: frame.theme + 1 }; },
  };
  const scope = {
    location: { href: 'http://localhost/worker.mjs' },
    addEventListener(_type, listener) { parentPort.on('message', data => listener({ data })); },
    postMessage(message) { parentPort.postMessage({ ...message, testState: {
      calls: [...state.calls], fetchGroups: [...state.fetchGroups], lastGround: state.lastGround } }); },
  };
  const loadAssets = async requests => {
    const entries = [...requests];
    state.fetchGroups.push(entries.map(item => item.path));
    if (state.delayNextFetch) { state.delayNextFetch = false; await new Promise(resolve => setTimeout(resolve, 40)); }
    return entries.map(item => ({ $: 'AssetResponse', id: item.id, bytes: list([0]), ok: true }));
  };
  let time = 0;
  const prepared = workerData.prepared ? {
    preparedFrame: { theme: 0, groundKey: 'court' },
    preparedPlateSha256: 'a'.repeat(64),
    loadPrepared: async () => {
      state.calls.push('load-prepared');
      parentPort.postMessage({ kind: 'test-prepared-started' });
      if (state.delayNextPrepared) {
        state.delayNextPrepared = false;
        await new Promise(resolve => setTimeout(resolve, 40));
      }
      return { theme: 0, marker: 'baked', platePixel: 7 };
    },
    hashPlate: async ready => {
      state.calls.push('hash-plate-' + ready.pixels.color);
      if (ready.pixels.color === 10) throw new Error('unavailable digest');
      return ready.pixels.color === 7 ? 'a'.repeat(64) : 'b'.repeat(64);
    },
  } : {};
  module.installSpriteHelper(scope, { scene, loadAssets, now: () => ++time,
    source: workerData.source, ...prepared });
  parentPort.on('message', data => {
    if (data.kind === 'test-delay-fetch') state.delayNextFetch = true;
    if (data.kind === 'test-delay-prepared') state.delayNextPrepared = true;
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
    source: token, theme: 0, needPickData: true,
    frame: { $: 'Frame', theme: 0, marker: 'first', groundKey: 'court' } });
  const first = await waitFor(worker, message => message.kind === 'result' && message.id === 3);
  assert.deepEqual(first.image, { $: 'Pix', color: 1 }, 'the immutable Bend Image crosses a real worker structured-clone boundary');
  assert.deepEqual(first.pickData, { $: 'Pieces', mask: true, pose: 0 });
  assert.deepEqual(first.testState.calls.slice(-4), ['underlay-0', 'ground-first', 'sprites-first', 'pick-data'],
    'Bend underlay, ground, then sprite composition run in order');
  assert.equal(first.testState.fetchGroups.length, 2, 'first theme and sprite assets load in parallel groups');
  assert.ok(Object.values(first.metrics).every(Number.isFinite));
  assert.equal(first.metrics.groundCacheHit, 0);
  assert.equal(first.source, token);

  worker.postMessage({ kind: 'job', protocol: 1, id: 4, generation: 1,
    source: token, theme: 0, frame: { $: 'Frame', theme: 0, marker: 'cached', groundKey: 'court' } });
  const cached = await waitFor(worker, message => message.kind === 'result' && message.id === 4);
  assert.deepEqual(cached.pickData, first.pickData, 'each same-view image carries matching pose alpha data');
  assert.equal(cached.testState.fetchGroups.length, 2, 'same-theme plate, prepared sprites and underlay are retained');
  assert.equal(cached.metrics.fetchMs, 0);
  assert.equal(cached.metrics.decodeMs, 0);
  assert.equal(cached.metrics.groundCacheHit, 1);
  assert.equal(cached.metrics.groundMs, 0);
  assert.ok(!cached.testState.calls.includes('ground-cached'),
    'same-theme, same-view/topology occupancy changes reuse the immutable ground');

  worker.postMessage({ kind: 'job', protocol: 1, id: 5, generation: 1,
    source: token, theme: 0, needPickData: true,
    frame: { $: 'Frame', theme: 0, marker: 'new-holes', groundKey: 'rift', view: { yaw: 45 } } });
  const changedGround = await waitFor(worker, message => message.kind === 'result' && message.id === 5);
  assert.deepEqual(changedGround.pickData, { $: 'Pieces', mask: true, pose: 45 },
    'changed-view images carry their new pose mask while retaining the loaded sprite assets');
  assert.equal(changedGround.metrics.groundCacheHit, 0);
  assert.ok(changedGround.testState.calls.includes('ground-new-holes'),
    'a changed view or hole topology rebuilds ground');

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

  const supplied = { $: 'ObservatoryPlates', astral: { $: 'Missing' },
    stone: { $: 'Ready', depth: 9, pixels: { $: 'Pix', color: 7 } } };
  worker.postMessage({ kind: 'job', protocol: 1, id: 8, generation: 4,
    source: token, theme: 1, frame: { $: 'Frame', theme: 1, marker: 'shared' }, plates: supplied });
  const shared = await waitFor(worker, message => message.kind === 'result' && message.id === 8);
  assert.deepEqual(shared.image, { $: 'Pix', color: 2 });
  assert.equal(shared.testState.fetchGroups.length, 4,
    'a Bend-decoded plate from the main worker avoids a second theme fetch/decode');
  assert.equal(shared.metrics.fetchMs, 0);
  assert.equal(shared.metrics.decodeMs, 0);
  assert.equal(shared.testState.lastGround.platePixel, 7);

  worker.postMessage({ kind: 'job', protocol: 1, id: 9, generation: 5,
    source: token, theme: 0, frame: { $: 'Frame', theme: 0, marker: 'wrong-shared' }, plates: supplied });
  const wrongShared = await waitFor(worker, message => message.kind === 'error' && message.id === 9);
  assert.match(wrongShared.message, /Invalid sprite helper job envelope/);

  const newerPlate = { $: 'ObservatoryPlates', astral: { $: 'Missing' },
    stone: { $: 'Ready', depth: 9, pixels: { $: 'Pix', color: 8 } } };
  worker.postMessage({ kind: 'job', protocol: 1, id: 10, generation: 6,
    source: token, theme: 1, frame: { $: 'Frame', theme: 1, marker: 'new-plate' }, plates: newerPlate });
  const replaced = await waitFor(worker, message => message.kind === 'result' && message.id === 10);
  assert.equal(replaced.metrics.groundCacheHit, 0,
    'new same-theme plate invalidates the settled ground');
  assert.equal(replaced.testState.lastGround.platePixel, 8,
    'the new plate reaches the actual sprite-composition input');
});

test('a superseded first job retains its Bend plate without refetching it', async t => {
  const worker = new Worker(bootstrap, { eval: true, workerData: { entry: helperPath, source: token } });
  t.after(() => worker.terminate());
  await waitFor(worker, message => message.kind === 'hello');
  const supplied = { $: 'ObservatoryPlates', astral: { $: 'Ready', depth: 9,
    pixels: { $: 'Pix', color: 9 } }, stone: { $: 'Missing' } };
  worker.postMessage({ kind: 'test-delay-fetch' });
  worker.postMessage({ kind: 'job', protocol: 1, id: 10, generation: 1,
    source: token, theme: 0, frame: { $: 'Frame', theme: 0, marker: 'superseded' }, plates: supplied });
  worker.postMessage({ kind: 'job', protocol: 1, id: 11, generation: 2,
    source: token, theme: 0, frame: { $: 'Frame', theme: 0, marker: 'newest' } });
  await waitFor(worker, message => message.kind === 'stale' && message.id === 10);
  const newest = await waitFor(worker, message => message.kind === 'result' && message.id === 11);
  assert.deepEqual(newest.image, { $: 'Pix', color: 1 });
  assert.ok(newest.testState.fetchGroups.every(paths => paths.every(path => path.startsWith('assets/pieces-fast-'))),
    'neither the canceled nor the replacement job refetches the supplied plate');
  assert.equal(Number.isFinite(newest.metrics.decodeMs), true,
    'the canceled job may already have populated the immutable sprite-page cache');
  const olderPlate = { ...supplied, astral: { $: 'Ready', depth: 9, pixels: { $: 'Pix', color: 77 } } };
  worker.postMessage({ kind: 'job', protocol: 1, id: 12, generation: 1,
    source: token, theme: 0, frame: { $: 'Frame', theme: 0, marker: 'late-old' }, plates: olderPlate });
  await waitFor(worker, message => message.kind === 'stale' && message.id === 12);
  worker.postMessage({ kind: 'job', protocol: 1, id: 13, generation: 2,
    source: token, theme: 0, frame: { $: 'Frame', theme: 0, marker: 'retained' } });
  const retained = await waitFor(worker, message => message.kind === 'result' && message.id === 13);
  assert.equal(retained.testState.lastGround.platePixel, 9,
    'an older generation cannot replace the retained plate used by a newer job');
});

test('prepared ground requires Bend ground key and exact decoded plate, with stale fallback', async t => {
  const worker = new Worker(bootstrap, { eval: true,
    workerData: { entry: helperPath, source: token, prepared: true } });
  t.after(() => worker.terminate());
  await waitFor(worker, message => message.kind === 'hello');
  const plate = color => ({ $: 'ObservatoryPlates', astral: { $: 'Ready', depth: 9,
    pixels: { $: 'Pix', color } }, stone: { $: 'Missing' } });
  const job = (id, generation, marker, groundKey, plates) => ({
    kind: 'job', protocol: 1, id, generation, source: token, theme: 0,
    frame: { $: 'Frame', theme: 0, marker, groundKey }, ...(plates ? { plates } : {}) });

  worker.postMessage(job(1, 1, 'initial', 'court', plate(7)));
  const initial = await waitFor(worker, message => message.kind === 'result' && message.id === 1);
  assert.equal(initial.metrics.preparedGroundHit, 1);
  assert.equal(initial.metrics.groundCacheHit, 0);
  assert.equal(initial.testState.lastGround.marker, 'baked');
  assert.ok(!initial.testState.calls.includes('ground-initial'));

  worker.postMessage(job(2, 1, 'occupancy-only', 'court'));
  const cached = await waitFor(worker, message => message.kind === 'result' && message.id === 2);
  assert.equal(cached.metrics.groundCacheHit, 1);
  assert.equal(cached.metrics.preparedGroundHit, 0);

  worker.postMessage(job(3, 2, 'new-holes', 'rift'));
  const changed = await waitFor(worker, message => message.kind === 'result' && message.id === 3);
  assert.equal(changed.metrics.preparedGroundHit, 0);
  assert.equal(changed.testState.lastGround.marker, 'new-holes');

  worker.postMessage(job(4, 3, 'different-plate', 'court', plate(8)));
  const different = await waitFor(worker, message => message.kind === 'result' && message.id === 4);
  assert.equal(different.metrics.preparedGroundHit, 0);
  assert.equal(different.testState.lastGround.platePixel, 8);
  assert.ok(different.testState.calls.includes('ground-different-plate'));

  worker.postMessage(job(10, 4, 'digest-failed', 'court', plate(10)));
  const unverified = await waitFor(worker, message => message.kind === 'result' && message.id === 10);
  assert.equal(unverified.metrics.preparedGroundHit, 0);
  assert.equal(unverified.testState.lastGround.platePixel, 10);

  worker.postMessage(job(5, 4, 'restored-source', 'court', plate(7)));
  const restored = await waitFor(worker, message => message.kind === 'result' && message.id === 5);
  assert.equal(restored.metrics.preparedGroundHit, 1);
  assert.equal(restored.testState.lastGround.marker, 'baked');

  const stone = { $: 'ObservatoryPlates', astral: { $: 'Missing' },
    stone: { $: 'Ready', depth: 9, pixels: { $: 'Pix', color: 7 } } };
  worker.postMessage({ kind: 'job', protocol: 1, id: 8, generation: 5,
    source: token, theme: 1, frame: { $: 'Frame', theme: 1,
      marker: 'new-theme', groundKey: 'court' }, plates: stone });
  const changedTheme = await waitFor(worker, message => message.kind === 'result' && message.id === 8);
  assert.equal(changedTheme.metrics.preparedGroundHit, 0);
  assert.equal(changedTheme.testState.lastGround.marker, 'new-theme');

  const fresh = new Worker(bootstrap, { eval: true,
    workerData: { entry: helperPath, source: token, prepared: true } });
  t.after(() => fresh.terminate());
  await waitFor(fresh, message => message.kind === 'hello');
  fresh.postMessage({ kind: 'test-delay-prepared' });
  fresh.postMessage(job(6, 1, 'superseded', 'court', plate(7)));
  await waitFor(fresh, message => message.kind === 'test-prepared-started');
  fresh.postMessage(job(7, 2, 'current', 'court', plate(7)));
  const stale = await waitFor(fresh, message => message.kind === 'stale' && message.id === 6);
  assert.equal(stale.generation, 1);
  const current = await waitFor(fresh, message => message.kind === 'result' && message.id === 7);
  assert.equal(current.metrics.preparedGroundHit, 1);
  assert.equal(current.testState.lastGround.marker, 'baked');
  assert.ok(!current.testState.calls.includes('sprites-superseded'));
  assert.equal(current.testState.calls.filter(call => call === 'load-prepared').length, 2,
    'a prepared tree loaded by the stale job is released before the replacement retries');

  const missing = new Worker(bootstrap, { eval: true,
    workerData: { entry: helperPath, source: token, prepared: true } });
  t.after(() => missing.terminate());
  await waitFor(missing, message => message.kind === 'hello');
  missing.postMessage(job(9, 1, 'missing-ready', 'court'));
  const fallback = await waitFor(missing, message => message.kind === 'result' && message.id === 9);
  assert.equal(fallback.metrics.preparedGroundHit, 0);
  assert.equal(fallback.testState.lastGround.marker, 'missing-ready');

  const wrongFirst = new Worker(bootstrap, { eval: true,
    workerData: { entry: helperPath, source: token, prepared: true } });
  t.after(() => wrongFirst.terminate());
  await waitFor(wrongFirst, message => message.kind === 'hello');
  wrongFirst.postMessage(job(11, 1, 'wrong-first', 'court', plate(8)));
  const wrong = await waitFor(wrongFirst, message => message.kind === 'result' && message.id === 11);
  assert.equal(wrong.metrics.preparedGroundHit, 0);
  assert.ok(!wrong.testState.calls.includes('load-prepared'),
    'a valid but different initial plate must not fetch and discard the large prepared asset');
  wrongFirst.postMessage(job(12, 2, 'right-second', 'court', plate(7)));
  const right = await waitFor(wrongFirst, message => message.kind === 'result' && message.id === 12);
  assert.equal(right.metrics.preparedGroundHit, 1);
  wrongFirst.postMessage(job(13, 3, 'orbited-away', 'rift'));
  await waitFor(wrongFirst, message => message.kind === 'result' && message.id === 13);
  wrongFirst.postMessage(job(14, 4, 'returned-default', 'court'));
  const returned = await waitFor(wrongFirst, message => message.kind === 'result' && message.id === 14);
  assert.equal(returned.metrics.preparedGroundHit, 1);
  assert.equal(returned.testState.calls.filter(call => call === 'hash-plate-7').length, 1,
    'the same immutable Ready is not rehashed after an orbit return');
});
