// Current candidate source screen. Frozen declarations/witnesses and original
// producers remain immutable; historical mutation execution is never retagged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { binding2035, root, derived, readSource, sha256, base, sourceCone,
  loadedClosure, loadProof, positiveVerdict, workerResourceReadback } from './binding.mjs';
import { sourceFixture, validateSourceApproval } from './bendtt-gate/contracts.mjs';
import { verifyPrepared } from '../prepared-match/verify.mjs';
import { selectedBinding2035 } from '../../../toolchain-patches/2035/selected-binding.mjs';
import { expectedCheckClosure, runLeasedWorker } from '../2032/aggregate-safety.mjs';
import { typeMismatchEvidence } from '../2032/mutation-verdict.mjs';
import { settleWorker, finalizeOwnedManifest } from '../../../toolchain-patches/2032/preview/lifecycle.mjs';

process.env.BEND_NO_TELEMETRY = '1';
// The historical mutation producer executes whenever imported in a Worker.
// Only the parent imports its metadata/functions; each new Worker independently
// rebinds the complete inputs already bound by that parent.
const { cases, mutationCone } = isMainThread ? await import('./mutations.mjs') : {};
export const checkPath = path.join(root, 'bend2/core/v3/2035/PREPARED_CHECK.bend');
export const outputRoot = path.join(root, '.artifacts/bend2/2035-preview/stationary-motion-20261006/prepared-source-2035');
export const scope = 'Current combined v2/prepared-v3 source/type/promise and eight fresh combined-book semantic negatives; historical records are provenance only; no Safe/kernel/native/device/adoption acceptance';
const here = 'bend2/core/v3/2035/';
const manifestPath = 'bend2/laws/semantic-prepared-v3.json';
const preparedRoot = 'bend2/core/v3/prepared-match/';
const rel = file => path.relative(root, file).split(path.sep).join('/');
const hash = file => sha256(readSource(path.join(root, file)));
const readJson = file => JSON.parse(readSource(path.join(root, file)));
const rawHistorical = () => Object.fromEntries(['aggregate', 'mutations', 'handoff', 'review']
  .map(key => [key, readSource(path.join(root, sourceFixture[key].path))]));

export function preparedBinding({ requireClean = true } = {}) {
  const before = binding2035({ requireClean });
  const manifest = readJson(manifestPath);
  verifyPrepared(manifest); // Accepted27 creation evidence stays separately scoped.
  const controller = selectedBinding2035('controller');
  const proofFiles = { ...before.frozenFiles, ...manifest.files,
    [here + 'PREPARED_CHECK.bend']: hash(here + 'PREPARED_CHECK.bend') };
  const paths = new Set(before.sourceFiles.map(file => file.path));
  for (const file of [manifestPath, ...Object.keys(manifest.files), ...Object.keys(manifest.evidence),
    ...['inputs', 'proofInputs', 'emissionInputs'].flatMap(group => Object.keys(manifest.compiler[group])),
    here + 'PREPARED_CHECK.bend', here + 'prepared-source.mjs', here + 'bendtt-gate/contracts.mjs',
    ...Object.values(sourceFixture).filter(value => value?.path).map(value => value.path),
    ...controller.sourceFiles.map(file => file.path)]) paths.add(file);
  const handoff = readJson(sourceFixture.handoff.path);
  assert.equal(hash(sourceFixture.handoff.path), sourceFixture.handoff.sha256);
  for (const item of handoff.mutations.cases)
    for (const variant of ['positive', 'negative']) paths.add(item[variant + 'Path']);
  const negativeControls = ['oldids', 'oldkey'].map(name => ({ name, family: 'prepared',
    law: name === 'oldids' ? 'carried_canonical' : 'apply_exact', target: preparedRoot + 'Match.bend',
    mutant: `bend2/docs/evidence/prepared-match-20261007/${name}-mutant.bend`,
    mutatedSha256: hash(`bend2/docs/evidence/prepared-match-20261007/${name}-mutant.bend`) }))
    .concat(handoff.mutations.cases.map(item => ({ name: item.name, family: 'v2',
      historicalProof: item.proof, target: item.target, mutatedSha256: item.mutatedSha256 })));
  assert.equal(negativeControls.length, 8);
  assert.equal(new Set(negativeControls.map(item => item.name)).size, 8);
  for (const item of negativeControls) assert.ok(Object.hasOwn(proofFiles, item.target));
  return { ...before, schema: 'rift-prepared-proof-2035-binding/2',
    frozenFiles: proofFiles, v2FrozenFiles: before.frozenFiles,
    preparedManifest: { path: manifestPath, sha256: hash(manifestPath), parent: manifest.parent },
    controller, sourceFiles: [...paths].sort().map(file => ({ path: file, sha256: hash(file) })),
    expectedLoadedPaths: expectedCheckClosure(root, checkPath, proofFiles, base),
    historicalV2: sourceFixture, negativeControls };
}

// Historical receipts remain immutable provenance. All eight current negatives
// execute afresh on the same combined book as the new positive control; the
// original full-input reuse fence and any observed drift remain explicit.
export function historicalV2Provenance(before) {
  const historical = validateSourceApproval(sourceFixture, rawHistorical());
  const old = historical.aggregate.before;
  assert.deepEqual(old.runtime, before.runtime, 'historical mutation runtime differs');
  const compilerInputs = ({ sourceFiles: _sources, ...compiler }) => compiler;
  assert.deepEqual(compilerInputs(old.compiler), compilerInputs(before.compiler), 'historical compiler/loader inputs differ');
  assert.deepEqual(old.frozenFiles, before.v2FrozenFiles, 'historical v2 freeze differs');
  const inputDrift = old.sourceFiles.flatMap(input => {
    const currentSha256 = hash(input.path);
    return currentSha256 === input.sha256 ? [] : [{ path: input.path,
      historicalSha256: input.sha256, currentSha256 }];
  });
  const comparisons = cases.map(spec => {
    const current = mutationCone(spec, before), original = mutationCone(spec, old);
    assert.deepEqual(current.expected, original.expected);
    assert.deepEqual(current.mutated, original.mutated);
    const recorded = historical.mutations.results.find(item => item.name === spec.name);
    const reference = historical.handoff.mutations.cases.find(item => item.name === spec.name);
    assert.ok(reference, 'historical raw mutation reference is absent');
    for (const variant of ['positive', 'negative']) {
      const file = reference[variant + 'Path'];
      assert.equal(hash(file), reference[variant + 'Sha256'], 'historical raw mutation record differs');
      assert.deepEqual(readJson(file), recorded[variant], 'historical embedded/raw mutation records differ');
    }
    assert.equal(recorded.target, current.target); assert.equal(recorded.proof, spec.proof);
    assert.equal(recorded.mutatedSha256, current.mutatedSha256);
    const control = before.negativeControls.find(item => item.name === spec.name);
    assert.equal(control.family, 'v2'); assert.equal(control.target, current.target);
    assert.equal(control.mutatedSha256, current.mutatedSha256);
    assert.equal(recorded.positiveKey, original.positiveKey);
    const expectedFiles = current.expected.map(file => ({ path: file, sha256: before.frozenFiles[file] }))
      .concat({ path: '<derived>/bend2/base.bend', sha256: before.compiler.derivedFiles.find(file => file.path === 'base.bend').sha256 })
      .sort((a, b) => a.path.localeCompare(b.path));
    assert.deepEqual((recorded.positive.record ?? recorded.positive).closure.files, expectedFiles);
    assert.deepEqual(recorded.negative.closure.files, expectedFiles.map(file => file.path === current.target
      ? { ...file, sha256: current.mutatedSha256 } : file));
    return { name: spec.name, proof: spec.proof, target: current.target,
      coneSHA256: sha256(JSON.stringify(expectedFiles)), mutatedSha256: current.mutatedSha256,
      historicalPositiveKey: original.positiveKey };
  });
  return { executionReused: false, historicalSourceCommit: historical.aggregate.sourceCommit,
    receipts: sourceFixture, comparisons, inputDrift,
    scope: 'Historical six-v2 mutation provenance only; no current execution reuse. Old outer mutation closure remains inferred; all current negatives execute in the combined book.' };
}

const combinedPositiveKey = before => sha256(JSON.stringify({ entry: rel(checkPath),
  files: sourceCone(checkPath, before).map(file => [file, before.frozenFiles[file]]),
  bindingSha256: sha256(JSON.stringify(before)) }));

if (!isMainThread) {
  let Bend, stage = 'binding', fetches = 0;
  globalThis.fetch = async () => { fetches++; throw Error('network denied in prepared source Worker'); };
  try {
    const actualResourceLimits = workerResourceReadback();
    const before = preparedBinding(); assert.deepEqual(before, workerData.before);
    const negative = before.negativeControls.find(spec => spec.name === workerData.name);
    assert.ok(negative || workerData.name === 'aggregate', 'unknown Worker name');
    const positiveKey = combinedPositiveKey(before); assert.equal(positiveKey, workerData.positiveKey);
    const entry = negative ? path.join(workerData.directory, rel(checkPath)) : checkPath;
    const directory = negative ? workerData.directory : root;
    const expected = sourceCone(checkPath, before);
    const substitution = negative ? { [negative.target]: negative.mutatedSha256 } : {};
    stage = 'load'; Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
    const { book, seen, preloaded } = await loadProof(Bend, entry, directory);
    const closure = loadedClosure(seen, directory, expected, before, substitution);
    stage = 'typecheck'; let verdict;
    if (negative) {
      let mismatch;
      try { Bend.book_valid(book, 0); }
      catch (error) { mismatch = typeMismatchEvidence(error, item => Bend.err_show(item)); }
      assert.ok(mismatch, 'prepared mutation was accepted');
      if (negative.family === 'prepared')
        assert.ok(mismatch.location.includes('LAWS.' + negative.law), 'prepared mutation rejected outside its bridge declaration');
      verdict = { rejected: true, control: negative, ...mismatch, definitions: book.order.length };
    } else verdict = await positiveVerdict(Bend, book, value => { stage = value; });
    assert.equal(fetches, 0); stage = 'post-binding'; assert.deepEqual(preparedBinding(), before);
    parentPort.postMessage({ ok: true, name: workerData.name, positiveKey, ...verdict, closure, preloaded,
      actualResourceLimits, fetches, scope });
  } catch (error) {
    parentPort.postMessage({ ok: false, stage, fetches,
      error: String(error?.$ === 'Err' && Bend ? Bend.err_show(error) : error?.message ?? error).slice(0, 1800),
      failureStack: error?.$ === 'Err' ? undefined : String(error?.stack ?? error).slice(0, 6000) });
  } finally { parentPort.close(); }
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--preflight-only'));
  const preflight = process.argv[2] === '--preflight-only';
  const before = preparedBinding({ requireClean: !preflight });
  const historicalV2 = historicalV2Provenance(before);
  const positiveKey = combinedPositiveKey(before);
  if (preflight) {
    assert.deepEqual(preparedBinding({ requireClean: false }), before);
    console.log(JSON.stringify({ ok: true, binding: before, bindingSha256: sha256(JSON.stringify(before)),
      historicalV2, expectedLoadedFiles: before.expectedLoadedPaths.length,
      scope: 'Compiler-free current binding and historical input reconciliation; no fresh proof execution' }));
  } else {
    assert.equal(fs.realpathSync(path.dirname(outputRoot)), path.dirname(outputRoot));
    fs.mkdirSync(outputRoot, { recursive: true }); assert.equal(fs.realpathSync(outputRoot), outputRoot);
    await runLeasedWorker(path.join(outputRoot, 'source.lock'), JSON.stringify({
      ownerTask: process.env.CODEX_THREAD_ID ?? null, bindingSha256: sha256(JSON.stringify(before)), workerMayBeLive: true,
    }), async () => {
      const directory = fs.mkdtempSync(path.join(outputRoot, 'combined-'));
      fs.writeFileSync(path.join(directory, 'before.json'), JSON.stringify(before, null, 2) + '\n', { flag: 'wx' });
      async function attempt(name, copiedDirectory = undefined) {
        const started = Date.now(); let result, worker, workerFailure;
        try {
          worker = new Worker(fileURLToPath(import.meta.url), { workerData: { name, directory: copiedDirectory, before, positiveKey },
            resourceLimits: { stackSizeMb: 64 }, execArgv: [] });
          const parentResourceLimits = { ...worker.resourceLimits };
          const capture = message => { if (message?.ok === false) workerFailure = message; };
          worker.on('message', capture);
          try { result = await settleWorker(worker, { timeoutMs: name === 'aggregate' ? 900_000 : 120_000, terminateGraceMs: 10_000 }); }
          finally { worker.off('message', capture); }
          assert.equal(parentResourceLimits.stackSizeMb, 64); assert.equal(result.actualResourceLimits.stackSizeMb, 64);
          assert.equal(result.name, name); assert.equal(result.positiveKey, positiveKey);
          assert.deepEqual(preparedBinding(), before);
          const record = { ...result, parentResourceLimits, elapsedMs: Date.now() - started };
          fs.writeFileSync(path.join(directory, name + '.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
          return record;
        } catch (error) {
          try {
            fs.writeFileSync(path.join(directory, name + '.failure.json'), JSON.stringify({ result, workerFailure,
              reason: String(error?.stack ?? error).slice(0, 6000), timedOut: !!error?.timedOut,
              workerMayBeLive: !!error?.workerMayBeLive, elapsedMs: Date.now() - started }, null, 2) + '\n', { flag: 'wx' });
          } catch (writeError) { error.failureWriteError = String(writeError); }
          throw error;
        }
      }
      const aggregate = await attempt('aggregate');
      const negatives = [];
      for (const spec of before.negativeControls) {
        const copied = path.join(directory, spec.name); fs.mkdirSync(copied);
        // The negative has the same combined entry and full cone as the fresh
        // positive; only the designated target bytes differ.
        for (const file of sourceCone(checkPath, before)) {
          const destination = path.join(copied, file); fs.mkdirSync(path.dirname(destination), { recursive: true });
          const bytes = readSource(path.join(root, file)); assert.equal(sha256(bytes), before.frozenFiles[file]);
          fs.writeFileSync(destination, bytes, { flag: 'wx' });
        }
        const mutated = spec.family === 'prepared' ? readSource(path.join(root, spec.mutant))
          : mutationCone(cases.find(item => item.name === spec.name), before).mutated;
        assert.equal(sha256(mutated), spec.mutatedSha256);
        fs.writeFileSync(path.join(copied, spec.target), mutated);
        assert.equal(sha256(readSource(path.join(copied, spec.target))), spec.mutatedSha256);
        negatives.push(await attempt(spec.name, copied));
      }
      assert.deepEqual(negatives.map(item => item.name), before.negativeControls.map(item => item.name));
      assert.ok(negatives.every(item => item.rejected && item.positiveKey === aggregate.positiveKey));
      const after = preparedBinding(); assert.deepEqual(after, before);
      const receipt = { schema: 'rift-prepared-aggregate-2035-source/2', passed: true, producerScope: 'source/type/promise',
        sourceCommit: before.sourceCommit, sourceTree: before.sourceTree, bindingSha256: sha256(JSON.stringify(before)),
        frozenSha256: before.frozenSha256, preparedManifest: before.preparedManifest,
        aggregate, negatives, historicalV2, before, after, actualFreshWorkers: 9, positiveKey, scope };
      const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + '\n');
      finalizeOwnedManifest(path.join(directory, 'receipt.pending'), path.join(directory, 'receipt.json'), bytes,
        { beforeCommit: () => assert.deepEqual(preparedBinding(), before) });
      assert.deepEqual(readSource(path.join(directory, 'receipt.json')), bytes);
      console.log(JSON.stringify({ passed: true, output: rel(directory), receiptSha256: sha256(bytes),
        freshWorkers: 9, historicalExecutionReuses: 0, scope }));
    });
  }
}
