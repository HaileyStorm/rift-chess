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
// rebinds the complete inputs already reconciled by that parent.
const { cases, mutationCone } = isMainThread ? await import('./mutations.mjs') : {};
export const checkPath = path.join(root, 'bend2/core/v3/2035/PREPARED_CHECK.bend');
export const outputRoot = path.join(root, '.artifacts/bend2/2035-preview/stationary-motion-20261006/prepared-source-2035');
export const scope = 'Current v2 plus prepared-v3 source/type/promise, two candidate prepared negatives and exact historical six-v2-mutation reuse; no Safe/kernel/native/device/adoption acceptance';
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
  return { ...before, schema: 'rift-prepared-proof-2035-binding/1',
    frozenFiles: proofFiles, v2FrozenFiles: before.frozenFiles,
    preparedManifest: { path: manifestPath, sha256: hash(manifestPath), parent: manifest.parent },
    controller, sourceFiles: [...paths].sort().map(file => ({ path: file, sha256: hash(file) })),
    expectedLoadedPaths: expectedCheckClosure(root, checkPath, proofFiles, base),
    historicalV2: sourceFixture };
}

// Bind the exact inputs that executed, rather than equating old/current whole
// checkout bindings. Graphics/UI changes do not change a frozen proof cone.
export function reconcileV2(before) {
  const historical = validateSourceApproval(sourceFixture, rawHistorical());
  const old = historical.aggregate.before;
  assert.deepEqual(old.runtime, before.runtime, 'historical mutation runtime differs');
  const compilerInputs = ({ sourceFiles: _sources, ...compiler }) => compiler;
  assert.deepEqual(compilerInputs(old.compiler), compilerInputs(before.compiler), 'historical compiler/loader inputs differ');
  assert.deepEqual(old.frozenFiles, before.v2FrozenFiles, 'historical v2 freeze differs');
  // Retain the full historical 228-input fence, including incidental diagnostic
  // inputs. Any changed byte defeats reuse rather than pruning the old claim.
  for (const input of old.sourceFiles)
    assert.equal(hash(input.path), input.sha256, `historical mutation input changed: ${input.path}`);
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
    assert.equal(recorded.positiveKey, original.positiveKey);
    const expectedFiles = current.expected.map(file => ({ path: file, sha256: before.frozenFiles[file] }))
      .concat({ path: '<derived>/bend2/base.bend', sha256: before.compiler.derivedFiles.find(file => file.path === 'base.bend').sha256 })
      .sort((a, b) => a.path.localeCompare(b.path));
    assert.deepEqual((recorded.positive.record ?? recorded.positive).closure.files, expectedFiles);
    assert.deepEqual(recorded.negative.closure.files, expectedFiles.map(file => file.path === current.target
      ? { ...file, sha256: current.mutatedSha256 } : file));
    return { name: spec.name, proof: spec.proof, target: current.target,
      coneSHA256: sha256(JSON.stringify(expectedFiles)), mutatedSha256: current.mutatedSha256,
      historicalPositiveKey: original.positiveKey, currentPositiveKey: current.positiveKey };
  });
  return { reused: true, freshWorkers: 0, historicalSourceCommit: historical.aggregate.sourceCommit,
    receipts: sourceFixture, comparisons,
    scope: 'Six historical actual v2 negatives/four positives/two reuses, unchanged complete cones/compiler/runtime/helpers; old outer mutation closure remains inferred, not a fresh execution' };
}

const negativeSpecs = ['oldids', 'oldkey'].map(name => ({ name,
  law: name === 'oldids' ? 'carried_canonical' : 'apply_exact',
  mutant: `bend2/docs/evidence/prepared-match-20261007/${name}-mutant.bend` }));

if (!isMainThread) {
  let Bend, stage = 'binding', fetches = 0;
  globalThis.fetch = async () => { fetches++; throw Error('network denied in prepared source Worker'); };
  try {
    const actualResourceLimits = workerResourceReadback();
    const before = preparedBinding(); assert.deepEqual(before, workerData.before);
    const negative = negativeSpecs.find(spec => spec.name === workerData.name);
    const entry = negative ? path.join(workerData.directory, rel(checkPath)) : checkPath;
    const directory = negative ? workerData.directory : root;
    const expected = sourceCone(checkPath, before);
    const substitution = negative ? { [preparedRoot + 'Match.bend']: hash(negative.mutant) } : {};
    stage = 'load'; Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
    const { book, seen, preloaded } = await loadProof(Bend, entry, directory);
    const closure = loadedClosure(seen, directory, expected, before, substitution);
    stage = 'typecheck'; let verdict;
    if (negative) {
      let mismatch;
      try { Bend.book_valid(book, 0); }
      catch (error) { mismatch = typeMismatchEvidence(error, item => Bend.err_show(item)); }
      assert.ok(mismatch, 'prepared mutation was accepted');
      assert.ok(mismatch.location.includes('LAWS.' + negative.law), 'prepared mutation rejected outside its bridge declaration');
      verdict = { rejected: true, law: negative.law, ...mismatch, definitions: book.order.length };
    } else verdict = await positiveVerdict(Bend, book, value => { stage = value; });
    assert.equal(fetches, 0); stage = 'post-binding'; assert.deepEqual(preparedBinding(), before);
    parentPort.postMessage({ ok: true, name: workerData.name, ...verdict, closure, preloaded,
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
  const historicalV2 = reconcileV2(before);
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
          worker = new Worker(fileURLToPath(import.meta.url), { workerData: { name, directory: copiedDirectory, before },
            resourceLimits: { stackSizeMb: 64 }, execArgv: [] });
          const parentResourceLimits = { ...worker.resourceLimits };
          const capture = message => { if (message?.ok === false) workerFailure = message; };
          worker.on('message', capture);
          try { result = await settleWorker(worker, { timeoutMs: name === 'aggregate' ? 900_000 : 120_000, terminateGraceMs: 10_000 }); }
          finally { worker.off('message', capture); }
          assert.equal(parentResourceLimits.stackSizeMb, 64); assert.equal(result.actualResourceLimits.stackSizeMb, 64);
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
      for (const spec of negativeSpecs) {
        const copied = path.join(directory, spec.name); fs.mkdirSync(copied);
        // The negative has the same combined entry and full cone as the fresh
        // positive; only the designated prepared Match bytes differ.
        for (const file of sourceCone(checkPath, before)) {
          const destination = path.join(copied, file); fs.mkdirSync(path.dirname(destination), { recursive: true });
          const bytes = readSource(path.join(root, file)); assert.equal(sha256(bytes), before.frozenFiles[file]);
          fs.writeFileSync(destination, bytes, { flag: 'wx' });
        }
        // Frozen mutant evidence is copied only into this fresh owned cone.
        fs.writeFileSync(path.join(copied, preparedRoot + 'Match.bend'), readSource(path.join(root, spec.mutant)));
        negatives.push(await attempt(spec.name, copied));
      }
      const after = preparedBinding(); assert.deepEqual(after, before);
      const receipt = { schema: 'rift-prepared-aggregate-2035-source/1', passed: true, producerScope: 'source/type/promise',
        sourceCommit: before.sourceCommit, sourceTree: before.sourceTree, bindingSha256: sha256(JSON.stringify(before)),
        frozenSha256: before.frozenSha256, preparedManifest: before.preparedManifest,
        aggregate, negatives, historicalV2, before, after, actualFreshWorkers: 3, scope };
      const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + '\n');
      finalizeOwnedManifest(path.join(directory, 'receipt.pending'), path.join(directory, 'receipt.json'), bytes,
        { beforeCommit: () => assert.deepEqual(preparedBinding(), before) });
      assert.deepEqual(readSource(path.join(directory, 'receipt.json')), bytes);
      console.log(JSON.stringify({ passed: true, output: rel(directory), receiptSha256: sha256(bytes),
        freshWorkers: 3, historicalMutationWorkers: 0, scope }));
    });
  }
}
