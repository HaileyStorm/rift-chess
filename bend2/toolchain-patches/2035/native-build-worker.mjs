import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isMainThread, parentPort, workerData, resourceLimits, threadId } from 'node:worker_threads';
import { emitNativeC2035 } from './emit-native.mjs';
import { verify, write, writeJson, directoryIdentity, memorySnapshot, FLAGS, LIMITS } from './native-resources.mjs';

assert.equal(isMainThread, false, 'native emission requires a dedicated Worker');
let Bend, admission, stage = 'worker-admission', fetches = 0;
globalThis.fetch = async () => { fetches++; throw Error('native emission network denied'); };
try {
  assert.deepEqual(process.execArgv, FLAGS);
  const limits = { stackSizeMb: resourceLimits.stackSizeMb, maxOldGenerationSizeMb: resourceLimits.maxOldGenerationSizeMb };
  assert.deepEqual(limits, LIMITS);
  assert.deepEqual(directoryIdentity(workerData.run), workerData.runIdentity);
  verify(workerData.fences);
  const aggregate = await import(pathToFileURL(workerData.aggregate).href);
  stage = 'compiler-import';
  Bend = await import(pathToFileURL(path.join(workerData.compiler, 'bend.ts')).href);
  const Comp = await import(pathToFileURL(path.join(workerData.compiler, 'comp.ts')).href);
  assert.equal(Bend.BASE_BEND, path.join(workerData.compiler, 'base.bend'));
  let seen;
  const frontend = { ...Bend, async book_load(book, file, namespace, loaded) {
    seen = loaded; return Bend.book_load(book, file, namespace, loaded);
  } };
  stage = 'load-validate-emit';
  const emitted = await emitNativeC2035({ Bend: frontend, Comp: { compile_book(book) {
    assert.deepEqual([...seen.keys()].sort(), workerData.expectedLoaded);
    stage = 'immediately-before-c-emission'; verify(workerData.fences);
    admission = memorySnapshot(aggregate, workerData.unit, stage, workerData.leaf);
    writeJson(path.join(workerData.run, 'emission-memory.json'), admission);
    stage = 'c-emission'; return Comp.compile_book(book);
  } }, entry: workerData.entry, projectBendRoot: workerData.projectBendRoot });
  assert.deepEqual(emitted.loaded.map(row => row.path).sort(), workerData.expectedLoaded);
  assert.equal(fetches, 0); verify(workerData.fences);
  assert.deepEqual(directoryIdentity(workerData.run), workerData.runIdentity);
  const output = write(path.join(workerData.run, 'NativeV2.c'), emitted.source);
  const result = { ok: true, emitted: output, validation: emitted.validation,
    loaded: emitted.loaded, preloaded: emitted.preloaded, admission, fetches, limits,
    actualResourceLimits: { ...resourceLimits }, execArgv: [...process.execArgv], threadId };
  writeJson(path.join(workerData.run, 'emission.json'), result);
  parentPort.postMessage(result);
} catch (error) {
  const failure = { ok: false, stage, fetches, admission: admission ?? error.memoryAdmission ?? null,
    error: String(error?.$ === 'Err' && Bend ? Bend.err_show(error) : error.message ?? error).slice(0, 8000),
    actualResourceLimits: { ...resourceLimits }, execArgv: [...process.execArgv], threadId };
  try { writeJson(path.join(workerData.run, 'worker-failure.json'), failure); }
  catch (e) { failure.receiptWriteError = String(e); }
  parentPort.postMessage(failure);
} finally { parentPort.close(); }

