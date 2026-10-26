import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';
import { isMainThread, parentPort, workerData, resourceLimits } from 'node:worker_threads';
import { config, absolute, authenticate, captureBinding, loadHelpers, closureFiles,
  readFile, outputIdentity } from './binding.mjs';

assert.equal(isMainThread, false, 'dedicated ordering-transport parent required');
let stage = 'binding', fetches = 0, Bend;
globalThis.fetch = async () => { fetches++; throw Error('network denied in current99 Safe Worker'); };
try {
  assert.equal(workerData.mode, 'safe-emit'); assert.equal(resourceLimits.stackSizeMb, 64);
  const b = config(), h = await loadHelpers();
  const before = await captureBinding(true);
  // Parent/Worker runtime argv legitimately differ; all source/kernel identities must match.
  assert.deepEqual(before.source, workerData.expected.source);
  assert.deepEqual(before.kernel, workerData.expected.kernel);
  const { execArgv: workerArgv, ...workerRuntime } = before.runtime;
  const { execArgv: parentArgv, ...parentRuntime } = workerData.expected.runtime;
  assert.deepEqual(parentArgv, []); assert.deepEqual(workerArgv, h.contracts.safeWorkerFlags);
  assert.deepEqual(workerRuntime, parentRuntime);
  stage = 'current99-compiler-import';
  const compiler = b.compilerRoot, base = path.join(compiler, 'base.bend');
  authenticate();
  assert.equal(readFile(path.join(compiler, 'safe.ts')).identity.sha256, h.contracts.safeSource.sha256);
  Bend = await import(pathToFileURL(path.join(compiler, 'bend.ts')).href);
  const Comp = await import(pathToFileURL(path.join(compiler, 'comp.ts')).href);
  const Safe = await import(pathToFileURL(path.join(compiler, 'safe.ts')).href);
  for (const [module, api] of [[Bend, 'book_nil'], [Bend, 'book_valid'], [Comp, 'js_lib'], [Safe, 'safe_emit']])
    assert.equal(typeof module[api], 'function', `missing imported API ${api}`);
  assert.equal(Bend.BASE_BEND, base, 'compiler Base path escaped fixed current99 root');
  stage = 'full-ordering-transport-load';
  const entry = absolute(b.entry), book = Bend.book_nil();
  const { seen } = await h.preload.loadWithStableImports(Bend, book, entry, absolute('bend2'));
  assert.equal(seen.get(entry), '');
  h.aggregate.assertExactLoadedClosure([...seen.keys()], before.source.expectedPaths);
  const closure = closureFiles([...seen.keys()]); assert.deepEqual(closure, before.source.closure);
  stage = 'full-ordering-transport-check';
  Bend.book_valid(book, 0); assert.equal(book.hols, 0); assert.equal(Object.hasOwn(book, 'open'), false);
  stage = 'current99-namespace-guard';
  const originalOrder = book.order, view = { ...book, order: [] };
  assert.strictEqual(view.tlds, book.tlds); assert.strictEqual(view.ctrs, book.ctrs);
  const code = Comp.js_lib(view, true);
  assert.ok(typeof code === 'string' && code.length > 0);
  assert.strictEqual(book.order, originalOrder); assert.equal(view.order.length, 0);
  stage = 'promise-screen'; const verdict = h.proof.proofVerdict(Bend, { ...book, open: 0 });
  stage = 'safe-elaboration';
  const out = workerData.output;
  assert.equal(path.basename(out), 'CHECK.bendtt');
  assert.equal(path.dirname(path.dirname(out)), absolute(b.outputDirectory));
  assert.equal(fs.realpathSync(path.dirname(out)), path.dirname(out));
  assert.equal(fs.existsSync(out), false);
  const originalWrite = fs.writeFileSync; let writes = 0, oos;
  fs.writeFileSync = (file, data, options) => {
    assert.equal(file, out); assert.equal(++writes, 1); assert.equal(options, undefined);
    const bytes = Buffer.from(data);
    assert.ok(bytes.length > 0 && bytes.length <= h.contracts.artifactLimitBytes);
    originalWrite(out, bytes, { flag: 'wx', mode: 0o600 });
  };
  syncBuiltinESMExports();
  try { oos = Safe.safe_emit(book, out); }
  finally { fs.writeFileSync = originalWrite; syncBuiltinESMExports(); }
  assert.equal(writes, 1);
  const emitted = { ...h.contracts.validateSafeOutput(oos, readFile(out).bytes), file: outputIdentity(out), oos };
  stage = 'post-binding'; assert.equal(fetches, 0);
  assert.deepEqual(await captureBinding(true), before);
  parentPort.postMessage({ ok: true, mode: 'safe-emit', verdict,
    definitions: book.order.length, holes: book.hols, owned: verdict.own.length, closure, emitted,
    namespaceGuard: 'Current99 Comp.js_lib(empty-root full-book view, true)',
    runtime: before.runtime, fetches, actualResourceLimits: { ...resourceLimits },
    workerExecArgv: [...process.execArgv], observedWorkerExitRequired: true,
    scope: 'actual Linux current99 original frozen Laws plus linked ordering-transport witness full62 source/type/promise/namespace and exclusive Safe serialization; historical Windows evidence does not validate this new witness; kernel verdict belongs to parent' });
} catch (error) {
  parentPort.postMessage({ ok: false, stage, fetches, actualResourceLimits: { ...resourceLimits },
    error: String(error?.$ === 'Err' && Bend ? Bend.err_show(error) : error?.message ?? error).slice(0, 3000),
    failureStack: error?.$ === 'Err' ? undefined : String(error?.stack ?? error).slice(0, 6000) });
} finally { parentPort.close(); }
