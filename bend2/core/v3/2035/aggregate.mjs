import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { binding2035, root, derived, checkPath, sourceCone, loadedClosure, loadProof,
  positiveVerdict, stages, scope, sha256, withEvidenceRun, boundedAttempt, finishReceipt, memory } from './binding.mjs';

process.env.BEND_NO_TELEMETRY = '1';
if (!isMainThread) {
  const progress = new Int32Array(workerData.progress);
  const mark = stage => Atomics.store(progress, 0, stages.indexOf(stage));
  let Bend, fetches = 0;
  globalThis.fetch = async () => { fetches++; throw Error('network denied in source CHECK Worker'); };
  try {
    mark('binding');
    const before = binding2035();
    assert.deepEqual(before, workerData.expectedBinding);
    Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
    mark('load');
    const { book, seen, preloaded } = await loadProof(Bend, checkPath, root);
    mark('closure');
    const closure = loadedClosure(seen, root, sourceCone(checkPath, before), before);
    mark('typecheck');
    const verdict = await positiveVerdict(Bend, book, mark);
    assert.equal(fetches, 0);
    mark('post-binding');
    assert.deepEqual(binding2035(), before);
    mark('result');
    parentPort.postMessage({ schema: 'rift-v2-aggregate-2035-source/1', ok: true,
      producerScope: 'source/type/promise', ...verdict, closure, preloaded, fetches, memory: memory(), scope });
  } catch (error) {
    parentPort.postMessage({ ok: false, stage: stages[Atomics.load(progress, 0)],
      error: String(error?.$ === 'Err' && Bend ? Bend.err_show(error) : error?.message ?? error).slice(0, 1800) });
  } finally { parentPort.close(); }
} else {
  assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--preflight-only'),
    'usage: node bend2/tools/bend.mjs --run bend2/core/v3/2035/aggregate.mjs [--preflight-only]');
  const preflight = process.argv[2] === '--preflight-only';
  const before = binding2035({ requireClean: !preflight });
  if (preflight) {
    assert.deepEqual(binding2035({ requireClean: false }), before);
    console.log(JSON.stringify({ schema: 'rift-v2-aggregate-2035-preflight/1', ok: true,
      binding: before, bindingSha256: sha256(JSON.stringify(before)),
      expectedLoadedFiles: before.expectedLoadedPaths.length,
      scope: 'read-only exact current source/compiler binding; no compiler import or CHECK execution' }));
  } else {
    await withEvidenceRun('aggregate', before, async directory => {
      const result = await boundedAttempt(fileURLToPath(import.meta.url), {}, before, directory, 'CHECK', 900_000);
      assert.equal(result.schema, 'rift-v2-aggregate-2035-source/1');
      const receipt = { schema: result.schema, passed: true, ...result,
        sourceCommit: before.sourceCommit, sourceTree: before.sourceTree, frozenSha256: before.frozenSha256 };
      console.log(JSON.stringify(finishReceipt(directory, receipt, before)));
    });
  }
}
