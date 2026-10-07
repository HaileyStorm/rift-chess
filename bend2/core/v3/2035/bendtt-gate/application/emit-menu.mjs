// Isolated candidate-only menu emission. Shared frozen selection stays unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { selectedModule } from '../../../../../toolchain-patches/004-web-workers/rebase-2032/selected-module.mjs';
import { loadWithStableImports } from '../../../../../toolchain-patches/2032/tag-identity/preload-root.mjs';
import { acquireOwnedLock, closeOwnedLock, releaseOwnedLock, finalizeOwnedManifest,
  settleWorker } from '../../../../../toolchain-patches/2032/preview/lifecycle.mjs';
import { assertLocalBunRuntime } from '../../../../../toolchain-patches/2032/browser-loader/runtime.mjs';
import { derived, previewRoot } from '../../../../../toolchain-patches/2035/selected-binding.mjs';
import { root, readSource, sha256, menuApplicationBinding2035 } from './menu-binding.mjs';
process.env.BEND_NO_TELEMETRY = '1';
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw Error('candidate menu emitter denies network'); };
const memory = () => ({ rssBytes: process.memoryUsage().rss, freeBytes: os.freemem() });

function ioBase2035(bend, book, type) {
  const io = book.tlds.IO;
  if (io?.$ !== 'Def' || !io.b) return null;
  const tlds = Object.assign(Object.create(book.tlds), { IO: { ...io, v: null } });
  const [head, args] = bend.term_unapply(bend.term_wnf({ ...book, tlds }, type));
  return head.$ === 'Ref' && head.k === 'IO' ? args : null;
}

export function emitSelectedLibrary2035(bend, compiler, book, roots) {
  assert.equal(book.hols, 0, 'selected source has unfilled declarations');
  assert.ok(Array.isArray(roots) && roots.length > 0 && roots.every(name =>
    typeof name === 'string' && name.length > 0 && !name.includes(':')),
  'candidate selected exports must be explicit bare names');
  const order = book.order;
  const tlds = book.tlds;
  const definitions = roots.map(name => book.tlds[name]);
  const code = selectedModule(bend, { ...compiler,
    io_base: (sourceBook, type) => ioBase2035(bend, sourceBook, type),
  }, book, roots);
  assert.equal(book.order, order, 'selected emission changed source order identity');
  assert.equal(book.tlds, tlds, 'selected emission changed source declaration identity');
  assert.deepEqual(roots.map(name => book.tlds[name]), definitions);
  return code;
}

function authenticateHelpers() {
  const original = readSource(path.join(root, 'bend2/toolchain-patches/2035/emit-selected.mjs'));
  const own = readSource(fileURLToPath(import.meta.url));
  const marker = Buffer.from('function ioBase2035(');
  const start = original.indexOf(marker), end = original.indexOf(Buffer.from('\nasync function workerMain()'), start);
  const ownStart = own.indexOf(marker), ownEnd = own.indexOf(Buffer.from('\nfunction authenticateHelpers()'), ownStart);
  assert.ok(start >= 0 && end > start && ownStart >= 0 && ownEnd > ownStart);
  assert.deepEqual(own.subarray(ownStart, ownEnd), original.subarray(start, end),
    'application helper source bytes differ from the authenticated predecessor');
}
async function workerMain() {
  authenticateHelpers();
  const { binding, outputPath } = workerData;
  assert.deepEqual(menuApplicationBinding2035(), binding, 'worker menu inputs differ');
  const bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
  const compiler = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')).href);
  const start = performance.now(), beforeLoad = memory();
  const book = bend.book_nil();
  const identity = await loadWithStableImports(bend, book, path.join(root, binding.module.entry), path.join(root, 'bend2'));
  bend.book_valid(book, 0); assert.equal(book.hols, 0);
  const actual = [...identity.seen.keys()].map(file => ({ path: path.relative(root, file).split(path.sep).join('/'), sha256: sha256(readSource(file)) }))
    .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  assert.deepEqual(actual, binding.sourceFiles.filter(file => file.path.endsWith('.bend')), 'actual menu closure differs');
  assert.equal(identity.seen.get(fs.realpathSync(path.join(root, binding.module.entry))), '');
  assert.deepEqual(menuApplicationBinding2035(), binding, 'menu inputs changed during checking');
  const checkedMs = Math.round(performance.now() - start), afterCheck = memory(), emitAt = performance.now();
  const bytes = Buffer.from(emitSelectedLibrary2035(bend, compiler, book, binding.module.exports));
  const exported = (await import(`data:text/javascript;base64,${bytes.toString('base64')}`)).default;
  assert.deepEqual(Object.keys(exported), binding.module.exports);
  assert.deepEqual(menuApplicationBinding2035(), binding, 'menu inputs changed during emission');
  assert.equal(networkCalls, 0);
  fs.writeFileSync(outputPath, bytes, { flag: 'wx' });
  return { ok: true, output: { bytes: bytes.length, sha256: sha256(bytes) }, exports: Object.keys(exported),
    tagIdentity: { policy: binding.tagIdentity, rootNamespace: '', preloaded: identity.preloaded, loadedBendFiles: actual.length, commonTags: {} },
    timing: { checkedMs, emitMs: Math.round(performance.now() - emitAt) }, memory: { beforeLoad, afterCheck, afterEmit: memory() }, networkCalls };
}
async function main() {
  assert.equal(process.argv.length, 2, 'no alternate exports, outputs or approvals are accepted');
  assert.ok(typeof Bun !== 'undefined', 'use the repository-local Bend wrapper'); authenticateHelpers();
  const executable = assertLocalBunRuntime(root, path.join(root, '.artifacts/toolchains/runtime'), process.execPath);
  const sourceBinding = menuApplicationBinding2035(); assert.equal(Bun.version, sourceBinding.bunVersion);
  const runtime = { version: Bun.version, executable: path.relative(root, executable).split(path.sep).join('/'), sha256: sha256(readSource(executable)) };
  const binding = { ...sourceBinding, runtime }, bindingSha256 = sha256(JSON.stringify(binding));
  const directory = path.join(previewRoot, 'stationary-motion-20261006');
  assert.equal(fs.realpathSync(directory), directory);
  const lease = acquireOwnedLock(path.join(previewRoot, 'selected-emitter.lock'), JSON.stringify({ schema: 'rift-bend-2035-emission-lease/1',
    module: 'menu-application', bindingSha256, workerMayBeLive: true, ownerTask: process.env.CODEX_THREAD_ID ?? null }));
  let runDir;
  try {
    runDir = fs.mkdtempSync(path.join(directory, 'menu-app-'));
    const outputPath = path.join(runDir, 'menu.js');
    const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { binding: sourceBinding, outputPath } });
    const result = await settleWorker(worker, { timeoutMs: 300_000, terminateGraceMs: 10_000 });
    assert.deepEqual(menuApplicationBinding2035(), sourceBinding);
    assert.equal(sha256(readSource(executable)), runtime.sha256); assert.equal(networkCalls + result.networkCalls, 0);
    const bytes = readSource(outputPath); assert.equal(bytes.length, result.output.bytes); assert.equal(sha256(bytes), result.output.sha256);
    const manifest = { schema: 'rift-bend-selected-cache/2035-1', bindingSha256, binding, module: binding.module,
      tagIdentity: result.tagIdentity, output: { file: 'menu.js', ...result.output }, timing: result.timing,
      memory: result.memory, networkCalls: 0, evidence: 'Fresh candidate-only menu check/emission; frozen shared registry unchanged; no proof/browser/native/adoption acceptance' };
    const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n'), manifestPath = path.join(runDir, 'menu.manifest.json');
    finalizeOwnedManifest(path.join(runDir, 'manifest.pending'), manifestPath, manifestBytes, {
      verifyTemp: value => assert.deepEqual(JSON.parse(value), manifest), beforeCommit: () => {
        assert.deepEqual(menuApplicationBinding2035(), sourceBinding); assert.deepEqual(readSource(outputPath), bytes);
      },
    });
    assert.deepEqual(readSource(manifestPath), manifestBytes);
    console.log(JSON.stringify({ ok: true, module: 'menu-application', bindingSha256,
      manifest: path.relative(root, manifestPath), manifestSha256: sha256(manifestBytes), ...result }));
  } catch (error) {
    if (error?.workerMayBeLive) lease.preserve = true;
    console.error(JSON.stringify({ ok: false, runDir, workerMayBeLive: !!error?.workerMayBeLive, error: String(error).slice(0, 1800) })); throw error;
  } finally { if (lease.preserve) closeOwnedLock(lease); else releaseOwnedLock(lease); }
}
if (!isMainThread) {
  workerMain().then(result => { parentPort.postMessage(result); parentPort.close(); }, error => {
    parentPort.postMessage({ ok: false, error: String(error).slice(0, 1800), networkCalls }); parentPort.close();
  });
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
