import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { requiredMutations } from '../../../tools/freeze-v2.mjs';
import { typeMismatchEvidence } from '../2032/mutation-verdict.mjs';
import { binding2035, root, derived, readSource, sourceCone, loadedClosure, loadProof,
  positiveVerdict, stages, scope, sha256, withEvidenceRun, boundedAttempt, finishReceipt, memory, workerResourceReadback } from './binding.mjs';

process.env.BEND_NO_TELEMETRY = '1';
export const cases = [
  { name: 'reject_all', proof: 'PROOF.bend', target: 'RuleKernel.bend',
    from: 'case True{}: Accepted{id, proposed(p, id)}', to: 'case True{}: Rejected{p}' },
  { name: 'wrong_successor', proof: 'PROOF.bend', target: 'RuleKernel.bend',
    from: 'case True{}: Accepted{id, proposed(p, id)}', to: 'case True{}: Accepted{id, M.start(True{})}' },
  { name: 'hide_all_moves', proof: 'CanonicalProof.bend', target: 'RuleKernel.bend',
    from: 'legal_tree(5n, p, 0, 21760)', to: '[]' },
  { name: 'omit_repetition_key', proof: 'MatchControlProof.bend', target: 'MatchKernel.bend',
    from: 'append_position(states, next), append_key(keys, key)', to: 'append_position(states, next), keys' },
  { name: 'wrong_resignation', proof: 'MatchControlProof.bend', target: 'MatchKernel.bend',
    from: 'policy, Types.NoOffer{}, Types.WhiteResigned{}', to: 'policy, Types.NoOffer{}, Types.BlackResigned{}' },
  { name: 'ignore_draw_agreement', proof: 'AdjudicationProof.bend', target: 'MatchKernel.bend',
    from: 'Some{Types.Agreed{}}', to: 'None{}' },
];
assert.deepEqual(cases.map(spec => spec.name), requiredMutations);

export function mutationCone(spec, before) {
  const expected = sourceCone(path.join(root, 'bend2/core/v2', spec.proof), before);
  const target = `bend2/core/v2/${spec.target}`;
  assert.ok(expected.includes(target), 'mutation target is outside the actual proof cone');
  const original = readSource(path.join(root, target));
  assert.equal(sha256(original), before.frozenFiles[target]);
  const text = original.toString('utf8');
  assert.equal(text.split(spec.from).length, 2, `mutation anchor must be unique: ${spec.name}`);
  const mutated = Buffer.from(text.replace(spec.from, spec.to));
  // Reuse a positive only for the same entry and the exact same complete source
  // cone under the same compiler/runtime binding, never for a related shard.
  const positiveKey = sha256(JSON.stringify({ proof: spec.proof,
    files: expected.map(file => [file, before.frozenFiles[file]]), binding: sha256(JSON.stringify(before)) }));
  return { expected, target, mutated, mutatedSha256: sha256(mutated), positiveKey };
}

if (!isMainThread) {
  const { caseName, variant, directory, cone, progress } = workerData;
  const spec = cases.find(item => item.name === caseName);
  const mark = stage => Atomics.store(new Int32Array(progress), 0, stages.indexOf(stage));
  let Bend, fetches = 0;
  globalThis.fetch = async () => { fetches++; throw Error('network denied in mutation Worker'); };
  try {
    assert.ok(spec && ['positive', 'negative'].includes(variant));
    mark('binding');
    const actualResourceLimits = workerResourceReadback();
    const before = binding2035();
    assert.deepEqual(before, workerData.expectedBinding);
    const current = mutationCone(spec, before);
    assert.deepEqual(cone, { expected: current.expected, target: current.target,
      mutatedSha256: current.mutatedSha256, positiveKey: current.positiveKey });
    Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
    mark('load');
    const { book, seen, preloaded } = await loadProof(Bend, path.join(directory, 'bend2/core/v2', spec.proof), directory);
    mark('closure');
    const closure = loadedClosure(seen, directory, cone.expected, before,
      variant === 'negative' ? { [cone.target]: cone.mutatedSha256 } : {});
    mark('typecheck');
    let verdict;
    if (variant === 'negative') {
      let mismatch;
      try { Bend.book_valid(book, 0); }
      catch (error) { mismatch = typeMismatchEvidence(error, item => Bend.err_show(item)); }
      assert.ok(mismatch, 'semantic mutation passed source typechecking');
      verdict = { ...mismatch, rejected: true, definitions: book.order.length };
    } else verdict = await positiveVerdict(Bend, book, mark);
    assert.equal(fetches, 0);
    mark('post-binding');
    assert.deepEqual(binding2035(), before);
    mark('result');
    parentPort.postMessage({ ok: true, caseName, variant, ...verdict, closure, preloaded,
      positiveKey: cone.positiveKey, fetches, memory: memory(), actualResourceLimits, scope });
  } catch (error) {
    parentPort.postMessage({ ok: false, caseName, variant, stage: stages[Atomics.load(new Int32Array(progress), 0)],
      error: String(error?.$ === 'Err' && Bend ? Bend.err_show(error) : error?.message ?? error).slice(0, 1800),
      failureStack: error?.$ === 'Err' ? undefined : String(error?.stack ?? error).slice(0, 6000) });
  } finally { parentPort.close(); }
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const preflight = process.argv.length === 3 && process.argv[2] === '--preflight-only';
  const only = process.argv.length === 4 && process.argv[2] === '--only' ? cases.find(spec => spec.name === process.argv[3]) : null;
  assert.ok(process.argv.length === 2 || preflight || only, 'usage: mutations.mjs [--preflight-only | --only <frozen-case>]');
  const before = binding2035({ requireClean: !preflight });
  const cones = Object.fromEntries(cases.map(spec => [spec.name, mutationCone(spec, before)]));
  if (preflight) {
    assert.deepEqual(binding2035({ requireClean: false }), before);
    console.log(JSON.stringify({ schema: 'rift-v2-mutations-2035-preflight/1', ok: true,
      binding: before, bindingSha256: sha256(JSON.stringify(before)),
      cases: cases.map(spec => ({ ...spec, ...cones[spec.name], mutated: undefined })),
      scope: 'read-only six unchanged semantic anchors/cones/current source binding; no compiler import or mutation execution' }));
  } else await withEvidenceRun('mutations', before, async runDirectory => {
    const results = [], positives = new Map();
    for (const spec of only ? [only] : cases) {
      const cone = cones[spec.name], directory = path.join(runDirectory, spec.name);
      fs.mkdirSync(directory);
      for (const file of cone.expected) {
        const destination = path.join(directory, file);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        const bytes = readSource(path.join(root, file));
        assert.equal(sha256(bytes), before.frozenFiles[file]);
        fs.writeFileSync(destination, bytes, { flag: 'wx' });
        assert.deepEqual(readSource(destination), bytes);
      }
      const data = { caseName: spec.name, directory, cone: { expected: cone.expected, target: cone.target,
        mutatedSha256: cone.mutatedSha256, positiveKey: cone.positiveKey } };
      const timeoutMs = spec.proof === 'CanonicalProof.bend' ? 360_000 : spec.proof === 'PROOF.bend' ? 240_000 : 120_000;
      let positive;
      const previous = positives.get(cone.positiveKey);
      if (previous) {
        for (const file of cone.expected) assert.equal(sha256(readSource(path.join(directory, file))), before.frozenFiles[file]);
        assert.equal(sha256(readSource(previous.file)), previous.sha256, 'reused positive record changed');
        positive = { ok: true, variant: 'positive', caseName: spec.name,
          reusedFrom: previous.caseName, positiveKey: cone.positiveKey,
          sourceRecordPath: path.relative(runDirectory, previous.file).split(path.sep).join('/'),
          sourceRecordSha256: previous.sha256, record: previous.record };
        fs.writeFileSync(path.join(directory, 'positive-reuse.json'), JSON.stringify(positive, null, 2) + '\n', { flag: 'wx' });
      } else {
        positive = await boundedAttempt(fileURLToPath(import.meta.url), { ...data, variant: 'positive' }, before, directory, 'positive', timeoutMs);
        assert.equal(positive.caseName, spec.name);
        assert.equal(positive.variant, 'positive');
        positives.set(cone.positiveKey, { caseName: spec.name, record: positive,
          file: path.join(directory, 'positive.json'),
          sha256: sha256(readSource(path.join(directory, 'positive.json'))) });
      }
      const target = path.join(directory, cone.target);
      assert.equal(fs.realpathSync(target), target);
      assert.ok(fs.lstatSync(target).isFile() && !fs.lstatSync(target).isSymbolicLink());
      assert.equal(sha256(readSource(target)), before.frozenFiles[cone.target]);
      fs.writeFileSync(target, cone.mutated);
      assert.equal(sha256(readSource(target)), cone.mutatedSha256);
      const negative = await boundedAttempt(fileURLToPath(import.meta.url), { ...data, variant: 'negative' }, before, directory, 'negative', timeoutMs);
      assert.equal(negative.caseName, spec.name);
      assert.equal(negative.variant, 'negative');
      assert.equal(negative.rejected, true);
      results.push({ name: spec.name, proof: spec.proof, target: cone.target,
        mutatedSha256: cone.mutatedSha256, positiveKey: cone.positiveKey, positive, negative });
      console.log(JSON.stringify({ case: spec.name, positive: true, rejected: true, positiveReused: !!previous }));
    }
    const receipt = { schema: 'rift-v2-mutations-2035-source/1', producerScope: 'source/type/promise',
      namespaceGuard: before.namespaceGuard,
      passed: results.length === cases.length, selectedPassed: results.length === 1,
      sourceCommit: before.sourceCommit, sourceTree: before.sourceTree, frozenSha256: before.frozenSha256, results };
    console.log(JSON.stringify(finishReceipt(runDirectory, receipt, before)));
  });
}
