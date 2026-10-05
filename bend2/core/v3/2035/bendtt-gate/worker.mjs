import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parentPort, workerData, resourceLimits, isMainThread } from 'node:worker_threads';
import { loadProof, loadedClosure, positiveVerdict } from '../binding.mjs';
import { captureSource, captureRuntime, captureBinding, root, derived, checkPath } from './binding.mjs';
import { emitExclusive } from './output.mjs';

assert.equal(isMainThread, false, 'use the reviewed dedicated parent runner');
process.env.BEND_NO_TELEMETRY = '1';
let stage = 'binding', fetches = 0, Bend;
globalThis.fetch = async () => { fetches++; throw Error('network denied in Safe Worker'); };
try {
  assert.equal(resourceLimits.stackSizeMb, 64);
  const runtime = captureRuntime(workerData.runtime, true);
  const before = captureSource(workerData.source);
  assert.deepEqual(before, workerData.expectedSource);
  stage = 'compiler-import';
  Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
  const Comp = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')).href);
  const Safe = await import(pathToFileURL(path.join(derived, 'bend2/safe.ts')).href);
  for (const [module, name] of [[Bend, 'book_nil'], [Bend, 'book_valid'], [Comp, 'js_lib'], [Safe, 'safe_emit']])
    assert.equal(typeof module[name], 'function', `missing imported API ${name}`);
  let result;
  if (workerData.mode === 'import-probe') {
    result = { mode: 'import-probe', imported: ['bend.ts', 'comp.ts', 'safe.ts'],
      scope: 'compiler-free import/API shape only; no book_load/book_valid/js_lib/safe_emit/kernel' };
  } else {
    assert.equal(workerData.mode, 'safe-emit');
    const actual = captureBinding(workerData.approvals, { worker: true });
    assert.deepEqual(actual.source, before);
    assert.deepEqual(actual.kernel, workerData.expectedKernel);
    stage = 'full-frozen-load';
    const { book, seen } = await loadProof(Bend, checkPath, root);
    const closure = loadedClosure(seen, root, before.closure.filter(file => !file.path.startsWith('<derived>'))
      .map(file => file.path), before);
    assert.deepEqual(closure.files, before.closure);
    stage = 'full-frozen-check';
    const verdict = await positiveVerdict(Bend, book, value => { stage = value; });
    stage = 'safe-elaboration';
    const emitted = emitExclusive(Safe, book, workerData.output);
    result = { mode: 'safe-emit', verdict, closure, emitted,
      scope: 'source/type/promise plus Safe serialization with empty OOS; not a kernel verdict' };
  }
  stage = 'post-binding';
  assert.equal(fetches, 0);
  assert.deepEqual(captureSource(workerData.source), before);
  assert.deepEqual(captureRuntime(workerData.runtime, true), runtime);
  parentPort.postMessage({ ok: true, ...result, runtime, fetches,
    actualResourceLimits: { ...resourceLimits }, observedWorkerExitRequired: true });
} catch (error) {
  parentPort.postMessage({ ok: false, stage, fetches,
    error: String(error?.$ === 'Err' && Bend ? Bend.err_show(error) : error?.message ?? error).slice(0, 1800),
    failureStack: error?.$ === 'Err' ? undefined : String(error?.stack ?? error).slice(0, 6000) });
} finally { parentPort.close(); }
