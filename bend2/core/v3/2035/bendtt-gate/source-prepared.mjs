import assert from 'node:assert/strict';
import path from 'node:path';
import { root, derived, readSource, sha256, selectedBinding2035 }
  from '../../../../toolchain-patches/2035/selected-binding.mjs';
import { verifyV2 } from '../../../../tools/freeze-v2.mjs';
import { lawManifests, loadAmendments } from '../../../../tools/amendments.mjs';
import { verifyPrepared } from '../../prepared-match/verify.mjs';
import { expectedCheckClosure } from '../../2032/aggregate-safety.mjs';
import { sourceFixture, relativeInput } from './contracts.mjs';

export const preparedCheckPath = path.join(root, 'bend2/core/v3/2035/PREPARED_CHECK.bend');
const manifestPath = 'bend2/laws/semantic-prepared-v3.json';
const absolute = file => path.join(root, ...relativeInput(file).split('/'));
const hash = file => sha256(readSource(absolute(file)));
const json = file => JSON.parse(readSource(absolute(file)));

// This is a pure, host-neutral capture. It neither imports the executing source
// producer nor treats its Windows proof runtime as a Linux Safe runtime approval.
// The independently rebuilt complete inventory must match the reviewed receipt.
export function capturePreparedInputs(receipt) {
  const frozen = verifyV2();
  const compiler = selectedBinding2035('scene', true);
  const manifest = json(manifestPath); verifyPrepared(manifest);
  const controller = selectedBinding2035('controller');
  const paths = new Set(compiler.sourceFiles.map(file => file.path));
  for (const file of [...Object.keys(frozen.manifest.files), ...Object.keys(frozen.manifest.evidence),
    ...lawManifests, 'bend2/tools/amendments.mjs', 'bend2/tools/amend.mjs',
    'bend2/core/v3/proof-authority.mjs', 'bend2/core/v3/2032/aggregate-safety.mjs',
    'bend2/core/v3/2032/mutation-verdict.mjs',
    ...['binding.mjs', 'aggregate.mjs', 'mutations.mjs', 'README.md'].map(name => `bend2/core/v3/2035/${name}`)]) paths.add(file);
  for (const file of lawManifests) {
    const value = json(file);
    for (const input of [...Object.keys(value.files ?? {}), ...Object.keys(value.evidence ?? {})]) paths.add(input);
  }
  for (const { file, value } of loadAmendments()) {
    paths.add(file);
    for (const key of ['tools', 'evidence', 'records', 'preserved', 'substitutions'])
      for (const input of Object.keys(value[key] ?? {})) paths.add(input);
  }
  for (const file of [manifestPath, ...Object.keys(manifest.files), ...Object.keys(manifest.evidence),
    ...['inputs', 'proofInputs', 'emissionInputs'].flatMap(group => Object.keys(manifest.compiler[group])),
    'bend2/core/v3/2035/PREPARED_CHECK.bend', 'bend2/core/v3/2035/prepared-source.mjs',
    'bend2/core/v3/2035/bendtt-gate/contracts.mjs',
    ...Object.values(sourceFixture).filter(value => value?.path).map(value => value.path),
    ...controller.sourceFiles.map(file => file.path)]) paths.add(file);
  assert.equal(hash(sourceFixture.handoff.path), sourceFixture.handoff.sha256);
  const handoff = json(sourceFixture.handoff.path);
  for (const item of handoff.mutations.cases)
    for (const variant of ['positive', 'negative']) paths.add(item[variant + 'Path']);
  const negativeControls = ['oldids', 'oldkey'].map(name => ({ name, family: 'prepared',
    law: name === 'oldids' ? 'carried_canonical' : 'apply_exact',
    target: 'bend2/core/v3/prepared-match/Match.bend',
    mutant: `bend2/docs/evidence/prepared-match-20261007/${name}-mutant.bend`,
    mutatedSha256: hash(`bend2/docs/evidence/prepared-match-20261007/${name}-mutant.bend`) }))
    .concat(handoff.mutations.cases.map(item => ({ name: item.name, family: 'v2',
      historicalProof: item.proof, target: item.target, mutatedSha256: item.mutatedSha256 })));
  assert.equal(negativeControls.length, 8);
  assert.equal(new Set(negativeControls.map(item => item.name)).size, 8);
  assert.deepEqual(negativeControls, receipt.before.negativeControls, 'independent current mutation controls differ');
  const sourceFiles = [...paths].sort().map(file => ({ path: file, sha256: hash(file) }));
  assert.deepEqual(sourceFiles, receipt.before.sourceFiles, 'complete current source/evidence inventory differs');
  assert.deepEqual(compiler, receipt.before.compiler, 'current compiler/helper inventories differ');
  assert.deepEqual(controller, receipt.before.controller, 'actual current controller binding differs');
  assert.equal(frozen.sha256, receipt.frozenSha256);
  assert.deepEqual(frozen.manifest.files, receipt.before.v2FrozenFiles);
  const preparedManifest = { path: manifestPath, sha256: hash(manifestPath), parent: manifest.parent };
  assert.deepEqual(preparedManifest, receipt.preparedManifest);
  const entry = 'bend2/core/v3/2035/PREPARED_CHECK.bend';
  const frozenFiles = { ...frozen.manifest.files, ...manifest.files, [entry]: hash(entry) };
  assert.deepEqual(frozenFiles, receipt.before.frozenFiles);
  const base = path.join(derived, 'bend2/base.bend');
  const expectedLoadedPaths = expectedCheckClosure(root, preparedCheckPath, frozenFiles, base);
  const closure = expectedLoadedPaths.map(file => ({
    path: file === base ? '<derived>/bend2/base.bend' : path.relative(root, file).split(path.sep).join('/'),
    sha256: sha256(readSource(file)),
  })).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(closure, receipt.aggregate.closure.files, 'current full combined relative closure differs');
  return { compiler, controller, sourceFiles, frozenSha256: frozen.sha256,
    frozenFiles, preparedManifest, expectedLoadedPaths, closure, negativeControls };
}
