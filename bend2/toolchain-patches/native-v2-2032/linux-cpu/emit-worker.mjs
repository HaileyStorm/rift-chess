// The source check and compiler run on a dedicated Node Worker with a 64-MiB native stack.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMainThread, parentPort, threadId, workerData } from 'node:worker_threads';
import {
  CANDIDATE_COMMIT, CANDIDATE_TREE, ROOT, WORKER_STACK_SIZE_MB,
  assertExactInputBindings, assertLinuxNode, assertRegularFile, assertRunDirectory,
  collectRuntimeAssets, linuxMemorySnapshot,
  readJson, requireMemoryAdmission, sampleMemoryAdmission, sha256File,
  snapshotCandidate, snapshotRoot, snapshotToolchains, writeExclusive, writeJsonExclusive,
} from './common.mjs';

assert.equal(isMainThread, false, 'emit-worker.mjs may only run as a Node Worker');

const SCRIPT = fileURLToPath(import.meta.url);
const HERE = path.dirname(SCRIPT);
const BUILD = path.join(HERE, 'build.mjs');
const COMMON = path.join(HERE, 'common.mjs');

function scriptHashes() {
  for (const file of [SCRIPT, BUILD, COMMON]) assertRegularFile(file);
  return { build: sha256File(BUILD), common: sha256File(COMMON), worker: sha256File(SCRIPT) };
}

function sourceClosure(candidate, derived, seen, sources) {
  const base = path.join(derived, 'bend2/base.bend');
  assertRegularFile(base);
  const closure = [];
  for (const file of seen.keys()) {
    const real = fs.realpathSync(file);
    assert.equal(real, file, `loaded source identity changed: ${file}`);
    assertRegularFile(real);
    if (real === base) {
      closure.push(['<derived>/bend2/base.bend', sha256File(base)]);
      continue;
    }
    const relative = path.relative(candidate, real);
    assert.ok(relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
      `Bend import escaped isolated candidate: ${real}`);
    const key = relative.split(path.sep).join('/');
    assert.equal(sources[key], sha256File(real), `loaded Bend import is not source-bound: ${key}`);
    closure.push([key, sources[key]]);
  }
  closure.sort(([a], [b]) => a.localeCompare(b));
  assert.equal(closure.length, seen.size);
  assert.equal(new Set(closure.map(([relative]) => relative)).size, closure.length);
  assert.equal(closure.filter(([relative]) => relative === '<derived>/bend2/base.bend').length, 1);
  return closure;
}

function inputSnapshot(plan) {
  return { candidate: plan.candidate, toolchains: plan.toolchains, assets: plan.packageInputs,
    root: plan.root, patchSha256: plan.patchSha256, eolHelperSha256: plan.eolHelperSha256,
    localScriptHashes: plan.localScriptHashes };
}

async function emit() {
  const data = workerData;
  assert.equal(data?.schema, 'rift-native-v2-2032-linux-emission-worker/1');
  assert.equal(data.workerStackSizeMb, WORKER_STACK_SIZE_MB);
  assertLinuxNode({ child: true });
  assertRunDirectory(data.runDirectory, data.identity);
  assert.equal(path.resolve(data.candidate), data.candidate);
  const planPath = path.join(data.runDirectory, 'plan.json');
  assertRegularFile(planPath);
  assert.equal(sha256File(planPath), data.planSha256, 'persisted build plan checksum changed');
  const plan = readJson(planPath);
  assert.equal(plan.schema, 'rift-native-v2-2032-linux-cpu-plan/1');
  assert.deepEqual(plan.localScriptHashes, data.localScriptHashes);
  assert.deepEqual(scriptHashes(), plan.localScriptHashes, 'emission worker files changed');
  assert.deepEqual(snapshotRoot(), plan.root, 'source root changed before Worker start');
  assert.deepEqual(snapshotCandidate(data.candidate), plan.candidate, 'candidate changed before Worker start');
  assert.deepEqual(snapshotToolchains(), plan.toolchains, 'compiler stack changed before Worker start');
  assert.deepEqual(collectRuntimeAssets(), plan.packageInputs, 'package assets changed before Worker start');
  assert.equal(plan.candidate.commit, CANDIDATE_COMMIT);
  assert.equal(plan.candidate.tree, CANDIDATE_TREE);
  assert.equal(plan.initialMemoryAdmission.phase, 'initial-preflight');
  requireMemoryAdmission(plan.initialMemoryAdmission);

  let phase = 'source-check';
  let secondMemoryAdmission = null;
  let fetches = 0;
  try {
    globalThis.fetch = async () => {
      fetches++;
      throw new Error('network is prohibited during local source/emission');
    };
    const derived = path.join(ROOT, '.artifacts/bend2/toolchain-patches/derived-2032');
    const Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
    const book = Bend.book_nil(); const seen = new Map();
    try {
      await Bend.book_load(book, path.join(data.candidate, 'bend2/NativeV2.bend'), '', seen);
      Bend.book_valid(book);
    } catch (error) {
      throw new Error((error?.$ === 'Err' ? Bend.err_show(error) : error?.message ?? String(error)).slice(0, 2400));
    }
    assert.equal(book.hols, 0, 'NativeV2 contains holes');
    assert.equal(book.tlds.main?.$, 'Def', 'NativeV2 main was not loaded');
    const closure = sourceClosure(data.candidate, derived, seen, plan.candidate.sourceSha256);
    assert.equal(fetches, 0);
    const sourceReceipt = {
      schema: 'rift-native-v2-2032-linux-source-check/1', ok: true,
      evidenceClass: 'isolated-event-candidate-load-and-book-valid',
      candidate: { commit: plan.candidate.commit, tree: plan.candidate.tree,
        entrySha256: plan.candidate.sourceSha256['bend2/NativeV2.bend'],
        trackedBendFiles: plan.candidate.trackedBendFiles },
      compiler: plan.toolchains.derived.compiler,
      compilerBase: plan.toolchains.derived.base,
      loadedFiles: seen.size, definitions: book.order.length, holes: book.hols,
      networkFetches: fetches, closure: Object.fromEntries(closure),
      worker: { threadId, stackSizeMb: WORKER_STACK_SIZE_MB },
      scope: 'source load/type check only; no C emission, ELF or runtime claim',
    };
    writeJsonExclusive(path.join(data.runDirectory, 'source-check.json'), sourceReceipt);

    phase = 'compiler-load-and-input-recheck';
    const Comp = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')).href);
    const beforeEmission = inputSnapshot(plan);
    assertExactInputBindings(beforeEmission, data.candidate, scriptHashes());

    phase = 'immediately-before-c-emission-memory-admission';
    secondMemoryAdmission = sampleMemoryAdmission('immediately-before-c-emission', linuxMemorySnapshot);
    writeJsonExclusive(path.join(data.runDirectory, 'emission-memory-admission.json'), secondMemoryAdmission);
    parentPort.postMessage({ type: 'memory-admission', phase, sample: secondMemoryAdmission });
    requireMemoryAdmission(secondMemoryAdmission);

    phase = 'c-emission';
    const cText = Comp.compile_book(book);
    assert.equal(typeof cText, 'string');
    const cBytes = Buffer.from(cText, 'utf8');
    assert.ok(cBytes.length > 0, 'compiler emitted empty C');
    assert.equal(cBytes.includes(0x0d), false, 'Linux C emission contains CR bytes');
    assert.ok(cText.includes('#include <X11/'), 'emitted NativeV2 C has no X11 effect includes');
    assert.ok(cText.includes('#include <alsa/'), 'emitted NativeV2 C has no ALSA effect includes');
    assert.equal(fetches, 0);
    assertExactInputBindings(beforeEmission, data.candidate, scriptHashes());
    const cPath = path.join(data.runDirectory, 'NativeV2.c');
    const emittedC = { file: 'NativeV2.c', ...writeExclusive(cPath, cBytes), newlineMode: 'LF',
      includesX11: true, includesAlsa: true };
    return {
      schema: 'rift-native-v2-2032-linux-cpu-worker/1', ok: true,
      cSha256: emittedC.sha256, cBytes: emittedC.bytes,
      sourceReceiptSha256: sha256File(path.join(data.runDirectory, 'source-check.json')),
      sourceClosure: sourceReceipt.loadedFiles, networkFetches: fetches,
      immediatelyBeforeCEmission: secondMemoryAdmission,
      worker: { threadId, stackSizeMb: WORKER_STACK_SIZE_MB },
    };
  } catch (error) {
    try {
      writeJsonExclusive(path.join(data.runDirectory, 'worker-thread-failure.json'), {
        schema: 'rift-native-v2-2032-linux-emission-thread-failure/1', ok: false,
        phase, error: String(error?.message ?? error).slice(0, 2400),
        secondMemoryAdmission,
        worker: { threadId, stackSizeMb: WORKER_STACK_SIZE_MB },
      });
    } catch { }
    parentPort.postMessage({ type: 'failure', phase,
      error: String(error?.stack ?? error?.message ?? error).slice(0, 4000),
      secondMemoryAdmission, worker: { threadId, stackSizeMb: WORKER_STACK_SIZE_MB } });
    return null;
  }
}

const result = await emit();
if (result) parentPort.postMessage({ type: 'result', result });
