import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { selectedModule } from './selected-module.mjs';

process.env.BEND_NO_TELEMETRY = '1';
let networkCalls = 0;
globalThis.fetch = async () => {
  networkCalls++;
  throw new Error('unexpected network access');
};

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const compilerRoot = path.join(repo, '.artifacts/bend2/toolchain-patches/derived-2032');
const scoutRoot = path.join(repo, '.artifacts/toolchains/bend-2.0.32-scout');
const canonicalRoot = path.join(repo, '.artifacts/toolchains/bend');
const compilerBend = await import(pathToFileURL(path.join(compilerRoot, 'bend2/bend.ts')));
const compiler = await import(pathToFileURL(path.join(compilerRoot, 'bend2/comp.ts')));
const release = '573002f01ec6c52416d44489543f69a9625facf8';
const canonicalPin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const fixture = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/selected-root.bend');
const foreignJs = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/foreign.js');
const helper = path.join(path.dirname(fileURLToPath(import.meta.url)), 'selected-module.mjs');
const fixtureBytes = fs.readFileSync(fixture);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const expectedSource = {
  'bend2/bend.ts': '2c3953bb4fcb12aa97d4ce8cd041ef0ce8324c724fd0adc9b0352fff4c0f5c09',
  'bend2/comp.ts': '0108bf3a080d1cfbb987a5d95fb5b1e7acae91da85efb419eed7e06dd75334a7',
  'bend2/main.ts': 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
};
const expectedFixtureSha256 = 'dac7bc132314f909bc25af27ade1b0f7a680a62bc39d8e4cea5aa4978f4a2415';
const expectedHelperSha256 = '1508c2620714fd0f96b531400510f1cf997671ec1a0dbc074a35484c24fc84c7';
const expectedForeignSha256 = '04b46b1e921bfb13737ca3d8473dc03d3046a7ae8905875be72d1206b3d2af20';

async function git(dir, ...args) {
  const proc = Bun.spawn(['git', '-C', dir, ...args], { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited,
  ]);
  assert.equal(code, 0, stderr);
  return stdout.replace(/\r\n/g, '\n').trimEnd();
}

assert.equal(await git(scoutRoot, 'rev-parse', 'HEAD'), release);
assert.equal(await git(scoutRoot, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(await git(canonicalRoot, 'rev-parse', 'HEAD'), canonicalPin);
assert.equal(await git(canonicalRoot, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(await git(compilerRoot, 'rev-parse', 'HEAD'), release,
  'worker slice must run on the pristine 2.0.32 derived worktree');
assert.equal(await git(compilerRoot, 'status', '--porcelain', '--untracked-files=all'),
  ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts',
  'the phase-one test must run on exactly the 001+002+005 source stack');
for (const [file, expected] of Object.entries(expectedSource)) {
  assert.equal(sha256(fs.readFileSync(path.join(compilerRoot, file))), expected,
    `${file} changed from exact 001+002+005 preimage`);
}
assert.equal(sha256(fixtureBytes), expectedFixtureSha256, 'worker fixture bytes changed');
assert.equal(sha256(fs.readFileSync(helper)), expectedHelperSha256, 'selected-root helper bytes changed');
assert.equal(sha256(fs.readFileSync(foreignJs)), expectedForeignSha256, 'foreign fixture bytes changed');

const book = compilerBend.book_nil();
try {
  await compilerBend.book_load(book, fixture.replaceAll('\\', '/'), '', new Map());
  compilerBend.book_valid(book);
} catch (error) {
  const message = error?.$ === 'Err' ? compilerBend.err_show(error)
    : error?.message ?? String(error);
  console.error('fixture source failed to load/check:', message);
  process.exitCode = 1;
  process.exit();
}
assert.equal(book.hols, 0);

const beforeOrder = book.order.slice();
const syncBytes = compiler.js_lib(book, false);
const syncSha256 = sha256(Buffer.from(syncBytes));
const expectedSyncSha256 = 'efe64dca089a1922152144681e772e75c59807be07dc0ff892d2b3349a11a874';
assert.equal(syncSha256, expectedSyncSha256,
  'ordinary synchronous JS emission changed from the pre-worker baseline');
const single = selectedModule(compilerBend, compiler, book, ['worker_root']);
assert.deepEqual(book.order, beforeOrder, 'selected emission mutated the checked book');
const dual = selectedModule(compilerBend, compiler, book, ['secondary_root', 'worker_root']);
assert.equal(dual, selectedModule(compilerBend, compiler, book, ['secondary_root', 'worker_root']),
  'selected-module output must be deterministic');
const syncAfterSelection = compiler.js_lib(book, false);
assert.deepEqual(Buffer.from(syncAfterSelection), Buffer.from(syncBytes),
  'selected-module calls changed ordinary synchronous output bytes');
assert.equal(sha256(Buffer.from(syncAfterSelection)), expectedSyncSha256,
  'ordinary synchronous bytes drifted after selected-module calls');

function withDefinition(book, name, update) {
  const tlds = Object.assign(Object.create(null), book.tlds);
  tlds[name] = { ...tlds[name], ...update };
  return { ...book, tlds };
}
for (const [label, update, reason] of [
  ['unsafe', { u: true }, /unsafe_reachable/],
  ['foreign', { i: ['synthetic-host'] }, /foreign_reachable/],
  ['unfilled', { v: null }, /unfilled_reachable/],
]) {
  const mutated = withDefinition(book, 'add_two', update);
  assert.throws(() => selectedModule(compilerBend, compiler, mutated, ['worker_root']), reason,
    `reachable ${label} dependency was accepted`);
}

for (const roots of [[], ['worker_root', 'worker_root'], ['absent_root'],
  ['IO.print'], ['io_root'], ['template_root'], ['foreign_root']]) {
  assert.throws(() => selectedModule(compilerBend, compiler, book, roots), /worker export root|explicit|unique/,
    `unsupported worker root selection was accepted: ${JSON.stringify(roots)}`);
}

const tempRoot = fs.realpathSync(os.tmpdir());
const scratch = fs.mkdtempSync(path.join(tempRoot, 'bend2-worker-2032-'));
try {
  const selectedFile = path.join(scratch, 'selected.mjs');
  const workerFile = path.join(scratch, 'probe.mjs');
  fs.writeFileSync(selectedFile, single, { flag: 'wx' });
  fs.writeFileSync(workerFile, [
    'import { parentPort, workerData } from "node:worker_threads";',
    'const module = await import(workerData.moduleUrl);',
    'parentPort.postMessage(module.default[workerData.root](workerData.value));',
    'parentPort.close();',
    '',
  ].join('\n'), { flag: 'wx' });

  const loaded = await import(pathToFileURL(selectedFile).href);
  assert.deepEqual(Object.keys(loaded.default), ['worker_root'],
    'emitted module exports must equal the explicit root set');
  assert.equal(loaded.default.worker_root(40), 42);
  assert.equal(Object.hasOwn(loaded.default, 'hidden_root'), false,
    'unselected hostable definitions must not be exported');

  const orderedFile = path.join(scratch, 'ordered.mjs');
  fs.writeFileSync(orderedFile, dual, { flag: 'wx' });
  const ordered = await import(pathToFileURL(orderedFile).href);
  assert.deepEqual(Object.keys(ordered.default), ['secondary_root', 'worker_root'],
    'requested export order must be stable');

  const result = await new Promise((resolve, reject) => {
    const worker = new Worker(workerFile, { workerData: {
      moduleUrl: pathToFileURL(selectedFile).href, root: 'worker_root', value: 40,
    } });
    worker.once('message', resolve);
    worker.once('error', reject);
    worker.once('exit', (code) => { if (code !== 0) reject(new Error(`worker exited ${code}`)); });
  });
  assert.equal(result, 42, 'isolated worker execution differed from direct execution');
  assert.equal(networkCalls, 0, 'source check or selected emission attempted network access');

  console.log(JSON.stringify({
    schema: 'rift-bend-worker-selected-root-2032/1', passed: true,
    upstream: release,
    fixtureSha256: sha256(fixtureBytes),
    helperSha256: sha256(fs.readFileSync(helper)),
    ordinarySyncSha256: syncSha256,
    singleRoots: ['worker_root'],
    orderedRoots: ['secondary_root', 'worker_root'],
    workerResult: result,
    rejectedRoots: ['empty', 'duplicate', 'unknown', 'base/foreign', 'IO', 'template', 'foreign'],
    rejectedDependencies: ['unsafe_reachable', 'foreign_reachable', 'unfilled_reachable'],
    networkCalls,
    scope: 'selected-root compatibility and isolated Node worker-thread fixture only; not the Web Worker compiler backend, browser gate, 107 worker tests, 647-case matrix, native, GPU, frozen proofs or pin amendment',
  }));
} finally {
  const exact = fs.realpathSync(scratch);
  assert.equal(path.dirname(exact), tempRoot, 'temporary cleanup escaped OS temp');
  assert.match(path.basename(exact), /^bend2-worker-2032-[^\\/]+$/);
  fs.rmSync(exact, { recursive: true, force: true });
}
