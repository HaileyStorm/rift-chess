// One actual application load/typecheck and C emission on the same main book.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isMainThread, parentPort, workerData, resourceLimits, threadId } from 'node:worker_threads';
import { config, at, capture, expectedLoadedPaths, loadHelpers, memoryAdmission, realDirectory,
  read, write, writeJson, FLAGS, bindNativeTools } from './binding.mjs';

assert.equal(isMainThread, false, 'dedicated producer Worker required');
let stage = 'binding', fetches = 0, Bend, admission;
globalThis.fetch = async () => { fetches++; throw Error('network denied in native CPU producer'); };
try {
  bindNativeTools(workerData.nativeTools);
  const b = config(), h = await loadHelpers();
  assert.equal(resourceLimits.stackSizeMb, 64); assert.equal(resourceLimits.maxOldGenerationSizeMb, 65536);
  assert.deepEqual(process.execArgv, FLAGS);
  const before = capture(true); assert.deepEqual(before, workerData.expected);
  assert.equal(workerData.run, at(b.root, `${b.outputDirectory}/${b.runName}`));
  realDirectory(workerData.run);
  const stat = fs.lstatSync(workerData.run, { bigint: true });
  assert.deepEqual({ dev: String(stat.dev), ino: String(stat.ino) }, workerData.runIdentity);
  stage = 'compiler-import';
  Bend = await import(pathToFileURL(path.join(b.compilerRoot, 'bend.ts')).href);
  const Comp = await import(pathToFileURL(path.join(b.compilerRoot, 'comp.ts')).href);
  assert.equal(Bend.BASE_BEND, path.join(b.compilerRoot, 'base.bend'));
  assert.equal(typeof Comp.compile_book, 'function');
  stage = 'application-load';
  const book = Bend.book_nil(), entry = at(b.candidateRoot, 'bend2/NativeV2.bend');
  const loaded = await h.preload.loadWithStableImports(Bend, book, entry, at(b.candidateRoot, 'bend2'));
  assert.equal(loaded.seen.get(entry), '');
  assert.deepEqual([...loaded.seen.keys()].sort(), expectedLoadedPaths());
  stage = 'application-book-valid';
  Bend.book_valid(book, 0); assert.equal(book.hols, 0);
  assert.equal(book.tlds.main?.$, 'Def'); assert.equal(fetches, 0);
  const source = { schema: 'rift-current99-native-source/1', passed: true,
    entry: 'bend2/NativeV2.bend', definitions: book.order.length, holes: book.hols,
    loaded: [...loaded.seen].sort(([a], [c]) => a < c ? -1 : a > c ? 1 : 0)
      .map(([file, namespace]) => ({ file, namespace, ...read(file).identity })),
    preloaded: loaded.preloaded, worker: { threadId, actualResourceLimits: { ...resourceLimits } },
    scope: 'actual current application load and book_valid within the same C build; no formal proof or runtime acceptance' };
  writeJson(path.join(workerData.run, 'source.json'), source);
  stage = 'pre-emission-input-recheck'; assert.deepEqual(capture(true), before);
  stage = 'immediately-before-c-emission-memory';
  admission = memoryAdmission(h.aggregate, 'immediately-before-c-emission', workerData.containmentIdentity);
  writeJson(path.join(workerData.run, 'emission-memory.json'), admission);
  stage = 'application-c-emission';
  // compile_book calls file_book on actual main/runtime roots; file_book enforces
  // compiler-owned names and constructor/foreign-name collisions. No synthetic
  // empty selected-library emission is run, and no proof verdict is claimed.
  const text = Comp.compile_book(book);
  assert.equal(typeof text, 'string'); assert.ok(text.length > 0);
  assert.equal(fetches, 0); assert.deepEqual(capture(true), before);
  const emitted = write(path.join(workerData.run, 'NativeV2.c'), text);
  writeJson(path.join(workerData.run, 'emission.json'), { emitted, admission, fetches,
    sourceReceipt: read(path.join(workerData.run, 'source.json')).identity });
  parentPort.postMessage({ ok: true, emitted, source, admission, fetches,
    actualResourceLimits: { ...resourceLimits }, workerExecArgv: [...process.execArgv], threadId });
} catch (error) {
  const failure = { ok: false, stage, fetches, admission: admission ?? error.memoryAdmission ?? null,
    actualResourceLimits: { ...resourceLimits }, workerExecArgv: [...process.execArgv], threadId,
    error: String(error?.$ === 'Err' && Bend ? Bend.err_show(error) : error?.message ?? error).slice(0, 6000),
    stack: error?.$ === 'Err' ? null : String(error.stack ?? error).slice(0, 8000) };
  try { writeJson(path.join(workerData.run, 'worker-failure.json'), failure); }
  catch (writeError) { failure.receiptWriteError = String(writeError); }
  parentPort.postMessage(failure);
} finally { parentPort.close(); }
