// Bounded 2.0.32 aggregate source/promise diagnostic for the *frozen* v2
// CHECK.bend. This does not invoke BendTT, the mutation suite, or pin adoption.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { verifyV2, requiredProofs } from '../../../tools/freeze-v2.mjs';
import { proofVerdict } from '../proof-authority.mjs';
import { bindCompilerEol, bindCompilerBaseEol } from
  '../../../toolchain-patches/2032/preview/compiler-eol.mjs';
import { settleWorker } from '../../../toolchain-patches/2032/preview/lifecycle.mjs';
import { admittedMemorySnapshot, assertExactLoadedClosure, assertProofNodeRuntime,
  expectedCheckClosure, probeProofNodeImports, runLeasedWorker } from './aggregate-safety.mjs';

process.env.BEND_NO_TELEMETRY = '1';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const self = fileURLToPath(import.meta.url);
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const scout = path.join(root, '.artifacts/toolchains/bend-2.0.32-scout');
const canonical = path.join(root, '.artifacts/toolchains/bend');
const folder = path.join(root, 'bend2/core/v2');
const release = '573002f01ec6c52416d44489543f69a9625facf8';
const canonicalPin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const workerHeapMiB = 8192;
const workerStackMiB = 64;
const workerTimeoutMs = 900_000;
const minimumFreeBytes = 12 * 1024 ** 3;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fileHash = (file) => sha(fs.readFileSync(file));
const git = (directory, ...args) => execFileSync('git', ['-C', directory, ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).replace(/\r\n/g, '\n').trimEnd();
const patchSpecs = [
  ['bend2/toolchain-patches/001-arity/rebase-2032/0001-arity-diagnostics.patch',
    '98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db'],
  ['bend2/toolchain-patches/002-layout/rebase-2032/0002-after-001-2.0.32.patch',
    '2ed566176148cc1e064d2dae4c806c7912d557e38570ecfa5f47ddd0d78d395d'],
  ['bend2/toolchain-patches/005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch',
    '99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4'],
  ['bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/0004-parser-plan-after-005-2.0.32.patch',
    'bfdd64270c7714376c64a0306a58892d8a872d96f9d4bace0be091bf894fdb13'],
];
const expectedImports = [...new Set([...requiredProofs,
  ...fs.readdirSync(folder).filter((name) => name === 'LAWS.bend' || name.endsWith('Laws.bend'))])].sort();
const checkPath = path.join(folder, 'CHECK.bend');
const actualImports = [...fs.readFileSync(checkPath, 'utf8')
  .matchAll(/^import \.\/([^ ]+) as /gm)].map((match) => match[1]).sort();
assert.deepEqual(actualImports, expectedImports,
  'frozen CHECK entry differs from the exact declarations/witness/API set');
const stages = ['module-init', 'binding', 'load', 'typecheck', 'closure',
  'namespace-guard', 'promise-screen', 'post-binding', 'result'];

function binding() {
  const frozen = verifyV2();
  const sourceCommit = git(root, 'rev-parse', 'HEAD');
  const sourceTree = git(root, 'show', '-s', '--format=%T', 'HEAD');
  assert.equal(git(root, 'status', '--porcelain', '--untracked-files=all'), '',
    'aggregate source checkout must be clean');
  assert.equal(git(derived, 'rev-parse', 'HEAD'), release);
  assert.equal(git(derived, 'status', '--porcelain', '--untracked-files=all'),
    ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts');
  assert.equal(git(scout, 'rev-parse', 'HEAD'), release);
  assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
  assert.equal(git(canonical, 'rev-parse', 'HEAD'), canonicalPin);
  assert.equal(git(canonical, 'status', '--porcelain', '--untracked-files=all'), '');
  const compilerEol = bindCompilerEol((relative) =>
    fs.readFileSync(path.join(derived, relative)));
  const compilerBase = bindCompilerBaseEol(
    fs.readFileSync(path.join(derived, 'bend2/base.bend')), compilerEol.eol);
  const binderSha256 = fileHash(path.join(root,
    'bend2/toolchain-patches/2032/preview/compiler-eol.mjs'));
  assert.equal(binderSha256,
    'cb1cbb64e07e32c30cb9199424ec84e87cfcc516427c035a51fa6f7a84eacc27');
  assert.equal(fileHash(path.join(root, 'bend2/core/v3/proof-authority.mjs')),
    '3737c455d542f2dc7ff1799bfc579969c42739814411a8494189eb1b56a74013');
  assert.equal(fileHash(path.join(root, 'bend2/toolchain-patches/2032/preview/lifecycle.mjs')),
    '91d8b5c325a48602d0d6860624ab0abf9d5428d374a12d85988cb866a732fbc8');
  assertProofNodeRuntime();
  const patches = patchSpecs.map(([relative, expected]) => {
    const actual = fileHash(path.join(root, relative));
    assert.equal(actual, expected, `patch stack changed: ${relative}`);
    return { path: relative, sha256: actual };
  });
  return { frozenSha256: frozen.sha256, frozenFiles: frozen.manifest.files,
    sourceCommit, sourceTree, compilerEol, compilerBase, binderSha256, patches,
    expectedLoadedPaths: expectedCheckClosure(root, checkPath, frozen.manifest.files,
      path.join(derived, 'bend2/base.bend')),
    scriptSha256: fileHash(self), safetySha256: fileHash(path.join(root,
      'bend2/core/v3/2032/aggregate-safety.mjs')),
    runtime: { nodeVersion: process.version,
      nodeExeSha256: fileHash(process.execPath), platform: process.platform,
      arch: process.arch } };
}

function loadedClosure(seen, before) {
  const derivedBase = fs.realpathSync(path.join(derived, 'bend2/base.bend'));
  assertExactLoadedClosure(before.expectedLoadedPaths, seen.keys());
  return [...seen.keys()].map((file) => {
    const real = fs.realpathSync(file);
    assert.equal(real, file, `loaded source path is not canonical: ${file}`);
    if (real === derivedBase)
      return { path: '<derived>/bend2/base.bend', sha256: fileHash(real) };
    const relative = path.relative(root, real).replaceAll('\\', '/');
    assert.ok(relative && !relative.startsWith('../') && !path.isAbsolute(relative),
      `loaded source escaped repository: ${relative}`);
    const actual = fileHash(real);
    assert.equal(actual, before.frozenFiles[relative], `unbound CHECK source: ${relative}`);
    return { path: relative, sha256: actual };
  }).sort((a, b) => a.path.localeCompare(b.path));
}

if (!isMainThread) {
  const progress = new Int32Array(workerData.progress);
  const timingsMs = {};
  let stage = 'module-init';
  let started = performance.now();
  const mark = (next) => {
    timingsMs[stage] = Math.round(performance.now() - started);
    stage = next;
    started = performance.now();
    Atomics.store(progress, 0, stages.indexOf(next));
  };
  let Bend;
  try {
    mark('binding');
    const before = binding();
    let fetches = 0;
    globalThis.fetch = async () => { fetches++; throw Error('network denied in aggregate'); };
    Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
    const book = Bend.book_nil();
    const seen = new Map();
    mark('load');
    await Bend.book_load(book, checkPath.replaceAll('\\', '/'), '', seen);
    mark('typecheck');
    Bend.book_valid(book);
    assert.equal(book.hols, 0, 'aggregate CHECK has unfilled laws or TODOs');
    assert.equal(Object.hasOwn(book, 'open'), false,
      '2.0.32 Book hole shape drifted');
    mark('closure');
    const closure = loadedClosure(seen, before);
    assert.equal(closure.find((file) => file.path === 'bend2/core/v2/CHECK.bend')?.sha256,
      before.frozenFiles['bend2/core/v2/CHECK.bend']);
    assert.equal(closure.find((file) => file.path === '<derived>/bend2/base.bend')?.sha256,
      before.compilerBase.sha256);
    mark('namespace-guard');
    const Comp = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')).href);
    const originalOrder = book.order;
    const view = { ...book, order: [] };
    assert.strictEqual(view.tlds, book.tlds);
    assert.strictEqual(view.ctrs, book.ctrs);
    assert.equal(view.order.length, 0);
    // 2.0.32 file_book invokes its private book_owned on the *full* tlds/ctrs
    // before traversing roots. An empty export set avoids compiling any def.
    const fixedRuntime = Comp.js_lib(view, true);
    assert.ok(typeof fixedRuntime === 'string' && fixedRuntime.length > 0);
    assert.strictEqual(book.order, originalOrder);
    assert.equal(view.order.length, 0);
    mark('promise-screen');
    const verdict = proofVerdict(Bend, { ...book, open: 0 });
    assert.equal(fetches, 0);
    mark('post-binding');
    assert.deepEqual(binding(), before, 'source/compiler binding changed during CHECK');
    mark('result');
    parentPort.postMessage({ schema: 'rift-v2-aggregate-2032-source/1', ok: true,
      bindingSha256: sha(JSON.stringify({ before, closure })),
      frozenSha256: before.frozenSha256, compilerEol: before.compilerEol.eol,
      loadedFiles: closure.length, definitions: book.order.length, owned: verdict.own.length,
      holes: book.hols, fetches, timingsMs,
      namespaceGuard: 'successor 2.0.32 compiler-owned guard via empty-root js_lib; no definition emission',
      scope: 'aggregate frozen CHECK source/type/promise screen only; includes the 2.0.32 compiler-owned namespace guard; no BendTT kernel, mutation, conformance, native, browser, GPU or pin acceptance' });
  } catch (error) {
    const detail = error?.$ === 'Err' && Bend ? Bend.err_show(error)
      : error?.message ?? String(error);
    parentPort.postMessage({ ok: false, error: `${stage}: ${String(detail).slice(0, 1600)}` });
  }
} else {
  assert.ok(process.argv.length === 2 ||
    (process.argv.length === 3 && process.argv[2] === '--preflight-only'),
  'usage: aggregate.mjs [--preflight-only]');
  const before = binding();
  const runtimeProbe = await probeProofNodeImports(derived);
  assert.deepEqual(binding(), before,
    'source/compiler binding changed during proof runtime probe');
  if (process.argv[2] === '--preflight-only') {
    console.log(JSON.stringify({ schema: 'rift-v2-aggregate-2032-preflight/1', ok: true,
      sourceCommit: before.sourceCommit, sourceTree: before.sourceTree,
      frozenSha256: before.frozenSha256, compilerEol: before.compilerEol,
      compilerBase: before.compilerBase, patches: before.patches,
      scriptSha256: before.scriptSha256, safetySha256: before.safetySha256,
      expectedLoadedFiles: before.expectedLoadedPaths.length, runtime: before.runtime,
      runtimeProbe,
      scope: 'read-only aggregate CHECK binding; no Worker, proof or pin verdict' }));
    process.exit(0);
  }
  const memoryBefore = admittedMemorySnapshot({ hostFree: os.freemem() });
  const freeBefore = memoryBefore.availableBytes;
  assert.ok(freeBefore >= minimumFreeBytes,
    `stop before aggregate Worker: effective free RAM ${freeBefore} B below ${minimumFreeBytes} B`);
  const outputParent = path.join(root, '.artifacts/bend2');
  assert.equal(fs.realpathSync(outputParent), outputParent,
    'proof lock parent must be a canonical local directory');
  const outputRoot = path.join(outputParent, '2032-proof-aggregate');
  execFileSync('git', ['check-ignore', '--quiet', path.relative(root, outputRoot)], { cwd: root });
  if (!fs.existsSync(outputRoot)) fs.mkdirSync(outputRoot);
  const outputStat = fs.lstatSync(outputRoot);
  assert.ok(outputStat.isDirectory() && !outputStat.isSymbolicLink(),
    'proof lock root must be a real directory');
  const lockPath = path.join(outputRoot, 'aggregate.lock');
  const progress = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
  const started = Date.now();
  let result, admittedMemory;
  try { result = await runLeasedWorker(lockPath, JSON.stringify({
    schema: 'rift-v2-aggregate-2032-lease/1', sourceCommit: before.sourceCommit,
    parentPid: process.pid, startedAt: new Date().toISOString(),
    workerMayBeLive: true }) + '\n', async () => {
    admittedMemory = admittedMemorySnapshot({ hostFree: os.freemem() });
    const admittedFree = admittedMemory.availableBytes;
    assert.ok(admittedFree >= minimumFreeBytes,
      `stop before Worker: effective free RAM ${admittedFree} B below ${minimumFreeBytes} B`);
    const worker = new Worker(new URL(import.meta.url), { type: 'module',
      workerData: { progress: progress.buffer },
      resourceLimits: { stackSizeMb: workerStackMiB,
        maxOldGenerationSizeMb: workerHeapMiB } });
    try { return await settleWorker(worker, { timeoutMs: workerTimeoutMs }); }
    catch (error) {
      throw new Error(`aggregate CHECK stopped after ${Date.now() - started}ms at `
        + `${stages[Atomics.load(progress, 0)]}: ${error?.message ?? String(error)}`,
      { cause: error });
    }
  }); }
  catch (error) {
    if (error?.lockPreserved) console.error(JSON.stringify({ workerMayBeLive: true,
      lockPreserved: path.relative(root, error.lockPreserved).replaceAll('\\', '/'),
      reason: error.message }));
    throw error;
  }
  assert.equal(result.ok, true, result.error ?? 'aggregate Worker rejected');
  assert.deepEqual(binding(), before);
  console.log(JSON.stringify({ schema: 'rift-v2-aggregate-2032-source/1',
    passed: true, ...result, sourceCommit: before.sourceCommit,
    sourceTree: before.sourceTree, frozenSha256: before.frozenSha256,
    compilerEol: before.compilerEol, compilerBase: before.compilerBase,
    binderSha256: before.binderSha256,
    patches: before.patches, scriptSha256: before.scriptSha256,
    safetySha256: before.safetySha256,
    expectedLoadedFiles: before.expectedLoadedPaths.length,
    runtime: before.runtime, runtimeProbe,
    workerHeapMiB, workerStackMiB, workerTimeoutMs,
    freeBefore, memoryBefore, admittedMemory, scope: result.scope }));
}
