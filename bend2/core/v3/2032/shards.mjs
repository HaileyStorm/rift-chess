// Diagnostic source/promise shards of the frozen v2 proof cone on Bend 2.0.32.
// A green run is not the aggregate CHECK or a BendTT kernel verdict.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { verifyV2, requiredProofs } from '../../../tools/freeze-v2.mjs';
import { proofVerdict, proofNegativeControls } from '../proof-authority.mjs';
import { settleWorker } from '../../../toolchain-patches/2032/preview/lifecycle.mjs';
import { bindCompilerEol, bindCompilerBaseEol } from '../../../toolchain-patches/2032/preview/compiler-eol.mjs';

process.env.BEND_NO_TELEMETRY = '1';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const self = fileURLToPath(import.meta.url);
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const scout = path.join(root, '.artifacts/toolchains/bend-2.0.32-scout');
const canonical = path.join(root, '.artifacts/toolchains/bend');
const v2 = path.join(root, 'bend2/core/v2');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fileHash = (file) => sha(fs.readFileSync(file));
const git = (directory, ...args) => execFileSync('git', ['-C', directory, ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).replace(/\r\n/g, '\n').trimEnd();
function binding() {
  const frozen = verifyV2();
  assert.equal(git(derived, 'rev-parse', 'HEAD'), '573002f01ec6c52416d44489543f69a9625facf8');
  assert.equal(git(derived, 'status', '--porcelain', '--untracked-files=all'),
    ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts');
  assert.equal(git(scout, 'rev-parse', 'HEAD'), '573002f01ec6c52416d44489543f69a9625facf8');
  assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
  assert.equal(git(canonical, 'rev-parse', 'HEAD'), 'd37909174ebd664338ae3194799a9e0899dedd51');
  assert.equal(git(canonical, 'status', '--porcelain', '--untracked-files=all'), '');
  const compilerEol = bindCompilerEol((relative) =>
    fs.readFileSync(path.join(derived, relative)));
  const compilerBase = bindCompilerBaseEol(
    fs.readFileSync(path.join(derived, 'bend2/base.bend')), compilerEol.eol);
  assert.equal(fileHash(path.join(root, 'bend2/core/v3/proof-authority.mjs')),
    '3737c455d542f2dc7ff1799bfc579969c42739814411a8494189eb1b56a74013');
  assert.equal(fileHash(path.join(root, 'bend2/toolchain-patches/2032/preview/lifecycle.mjs')),
    '91d8b5c325a48602d0d6860624ab0abf9d5428d374a12d85988cb866a732fbc8');
  const eolBinderSha256 = fileHash(path.join(root,
    'bend2/toolchain-patches/2032/preview/compiler-eol.mjs'));
  assert.equal(eolBinderSha256,
    'cb1cbb64e07e32c30cb9199424ec84e87cfcc516427c035a51fa6f7a84eacc27',
    'reviewed exact-EOL binder changed');
  return { frozenSha256: frozen.sha256, frozenFiles: frozen.manifest.files,
    compilerEol, compilerBase, eolBinderSha256,
    scriptSha256: fileHash(self), runtime: {
      nodeVersion: process.version, nodeExeSha256: fileHash(process.execPath),
      platform: process.platform, arch: process.arch,
    } };
}
const proofs = requiredProofs.filter((name) => name === 'PROOF.bend' || name.endsWith('Proof.bend'));
const checkImports = [...fs.readFileSync(path.join(v2, 'CHECK.bend'), 'utf8')
  .matchAll(/^import \.\/([A-Za-z]+Proof\.bend|PROOF\.bend) as /gm)]
  .map((match) => match[1]).sort();
assert.deepEqual(proofs, checkImports, 'frozen CHECK proof imports changed');
const stages = ['module-init', 'binding', 'load', 'typecheck', 'promise-screen',
  'negative-controls', 'closure', 'post-binding', 'result'];
if (!isMainThread) {
  const name = workerData?.entry;
  assert.ok(proofs.includes(name));
  const progress = new Int32Array(workerData.progress);
  const timingsMs = {};
  let currentStage = 'module-init';
  let started = performance.now();
  const mark = (next) => {
    timingsMs[currentStage] = Math.round(performance.now() - started);
    currentStage = next;
    started = performance.now();
    Atomics.store(progress, 0, stages.indexOf(next));
  };
  mark('binding');
  const before = binding();
  const source = path.join(v2, name);
  assert.equal(fileHash(source), before.frozenFiles[`bend2/core/v2/${name}`]);
  let fetches = 0;
  globalThis.fetch = async () => { fetches++; throw Error('network denied in proof shard'); };
  const Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
  const book = Bend.book_nil();
  const seen = new Map();
  try {
    mark('load');
    await Bend.book_load(book, source, '', seen);
    mark('typecheck');
    Bend.book_valid(book);
    assert.equal(book.hols, 0);
    assert.equal(Object.hasOwn(book, 'open'), false);
    const view = { ...book, open: 0 };
    mark('promise-screen');
    const verdict = proofVerdict(Bend, view);
    // These algorithmic mutations test the checker once, on a small frozen
    // representative; each shard still receives its own full promise screen.
    let controls = null;
    if (name === 'ArithmeticProof.bend') {
      mark('negative-controls');
      controls = proofNegativeControls(Bend, view);
      assert.equal(controls.todo, true);
      assert.equal(controls.reachableUnsafe, true);
      assert.equal(controls.reachableForeign, true);
    }
    assert.equal(fetches, 0);
    mark('closure');
    const closure = [...seen.keys()].map((file) => {
      const real = fs.realpathSync(file);
      assert.equal(real, file);
      const base = fs.realpathSync(path.join(derived, 'bend2/base.bend'));
      if (real === base) return ['<derived>/bend2/base.bend', fileHash(real)];
      const relative = path.relative(root, real).replaceAll('\\', '/');
      assert.ok(!relative.startsWith('../') && !path.isAbsolute(relative));
      assert.equal(fileHash(real), before.frozenFiles[relative], `unbound source: ${relative}`);
      return [relative, fileHash(real)];
    }).sort(([a], [b]) => a.localeCompare(b));
    mark('post-binding');
    const after = binding();
    assert.deepEqual(after, before);
    assert.equal(fileHash(source), before.frozenFiles[`bend2/core/v2/${name}`]);
    mark('result');
    parentPort.postMessage({ schema: 'rift-v2-proof-shard-2032/1', ok: true,
      entry: name, frozenSha256: before.frozenSha256,
      bindingSha256: sha(JSON.stringify({ before, closure })),
      loadedFiles: seen.size, definitions: book.order.length, owned: verdict.own.length,
      holes: book.hols, fetches, controls, timingsMs,
      scope: 'source type/promise shard only; not aggregate CHECK, BendTT, mutation, native, browser, GPU or pin acceptance' });
  } catch (error) {
    const diagnostic = error?.$ === 'Err' ? Bend.err_show(error)
      : error?.message ?? String(error);
    parentPort.postMessage({ ok: false,
      error: `${currentStage}: ${String(diagnostic).slice(0, 1400)}` });
  }
} else {
  const only = process.argv[2] === '--only' ? process.argv[3] : undefined;
  const raisedHeap = only && process.argv[4] === '--heap-mib' && process.argv[5] === '1024';
  const extendedTimeout = raisedHeap && process.argv[6] === '--timeout-ms'
    && process.argv[7] === '240000';
  assert.ok(process.argv.length === 2 ||
    (only && proofs.includes(only) && (process.argv.length === 4 ||
      (process.argv.length === 6 && raisedHeap) ||
      (process.argv.length === 8 && extendedTimeout))),
  'run all shards or --only <frozen proof> [--heap-mib 1024 [--timeout-ms 240000]]');
  const before = binding();
  const results = [];
  for (const name of only ? [only] : proofs) {
    // Four default-bound typecheck timeouts preceded successful 1-GiB runs;
    // heap and time changed together, so this does not isolate memory need.
    // Canonical and Ordering passed close to 240s and Ordering also timed out
    // there, so retain a bounded
    // 360s margin only for those two; the Range pair passed below 240s.
    const policy = ['CanonicalProof.bend', 'OrderingProof.bend'].includes(name)
      ? { heapMiB: 1024, timeoutMs: 360_000 }
      : ['RangeBridgeProof.bend', 'RangeCompositionProof.bend'].includes(name)
        ? { heapMiB: 1024, timeoutMs: 240_000 }
        : name === 'PROOF.bend'
          ? { heapMiB: 512, timeoutMs: 240_000 }
        : { heapMiB: 512, timeoutMs: 120_000 };
    const heapMiB = raisedHeap ? 1024 : policy.heapMiB;
    const timeoutMs = extendedTimeout ? 240_000 : policy.timeoutMs;
    const progress = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
    const started = Date.now();
    const worker = new Worker(new URL(import.meta.url), { type: 'module',
      workerData: { entry: name, progress: progress.buffer },
      resourceLimits: { stackSizeMb: 64, maxOldGenerationSizeMb: heapMiB },
    });
    let result;
    try {
      result = await settleWorker(worker, { timeoutMs });
    } catch (error) {
      throw new Error(`proof shard ${name} failed after ${Date.now() - started}ms `
        + `at ${stages[Atomics.load(progress, 0)]}: ${error?.message ?? String(error)}`,
      { cause: error });
    }
    assert.equal(result.ok, true);
    assert.equal(result.entry, name);
    assert.equal(result.frozenSha256, before.frozenSha256);
    results.push({ ...result, heapMiB, timeoutMs });
    console.log(JSON.stringify({ entry: name, definitions: result.definitions,
      loadedFiles: result.loadedFiles, heapMiB, timeoutMs, timingsMs: result.timingsMs,
      bindingSha256: result.bindingSha256 }));
  }
  assert.deepEqual(binding(), before);
  console.log(JSON.stringify({ schema: 'rift-v2-proof-shards-2032/1',
    allShardsSourcePassed: !only, selectedShardSourcePassed: Boolean(only),
    frozenSha256: before.frozenSha256, scriptSha256: before.scriptSha256,
    compilerEol: before.compilerEol, compilerBase: before.compilerBase,
    eolBinderSha256: before.eolBinderSha256,
    workerStackMiB: 64, runtime: before.runtime,
    entries: results.map(({ entry, loadedFiles, definitions, owned, bindingSha256,
      heapMiB, timeoutMs }) => ({ entry, loadedFiles, definitions, owned,
        heapMiB, timeoutMs, bindingSha256 })),
    scope: 'individual frozen proof source/promise shards only; not aggregate CHECK, BendTT, mutations, native, browser, GPU or pin acceptance' }));
}
