import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_VISUAL_PIN as pin, CURRENT_VISUAL_PATHS as paths } from './pins.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../..');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const expect = {
  sourceCommit: '45d7041ea1e11db48017db96b886b24b60d501d3',
  sourceTree: '5fe960b1ccbedf97c2460c4b7c2a63a124a3ce24',
  trackedBendFiles: 303,
  graphics: {
    'bend2/graphics/Picking.bend': 'a20fea0bc4b60459359c664053c64daf4fbe67b7adf5652f212fce491a7e2025',
    'bend2/graphics/Scene.bend': '7d0ce609c97ffae8b0662de2ec58d85120a9605c151c7becd5c91a60fa5cbc65',
    'bend2/graphics/v2game/BoardScene.bend': 'ea30ede087177b553f4a73d7c57a98d0bfdb904339424575801852526a642678',
  },
  nativeOriginalSha256: '29fc92d043aff032de13ceafad63ef4f101c72b08f93b7199c3ce40bd333cf6d',
  nativePostimageSha256: '9fe46e219123e3f59958de98c6f9b65fc618cca85ca0325740dffc30e8aef292',
  eventPatchSha256: '28ec36660b3d78c2373b5ff0591385e7a6cc39e6fd33cb9a2a1732d0a01ad2fa',
  scoutCommit: '573002f01ec6c52416d44489543f69a9625facf8',
  canonicalCommit: 'd37909174ebd664338ae3194799a9e0899dedd51',
  nodeVersion: 'v22.23.1',
  nodeExecutableSha256: '93956de2e59480474a7b46571da1651180b1a050cdf32641ebec4ce6e478e068',
  workerSha256: '78bce0b31c5ba622dc7968e7ba94827c2f630c0307dfa3f50b730efc221a1427',
  compilerEolSha256: 'cb1cbb64e07e32c30cb9199424ec84e87cfcc516427c035a51fa6f7a84eacc27',
};
assert.deepEqual(pin, expect, 'versioned current-visual source pins changed');
assert.deepEqual(paths, {
  patch: 'bend2/toolchain-patches/native-v2-2032/events/0001-native-v2-events.patch',
  worker: 'bend2/toolchain-patches/native-v2-2032/events/source-check-worker.mjs',
  compilerEol: 'bend2/toolchain-patches/2032/preview/compiler-eol.mjs',
  scout: '.artifacts/toolchains/bend-2.0.32-scout',
  derived: '.artifacts/bend2/toolchain-patches/derived-2032',
  canonical: '.artifacts/toolchains/bend',
}, 'source gate path bindings changed');
assert.equal(fs.realpathSync(root), root, 'current-visual gate root is not canonical');
assert.equal(path.resolve(git('rev-parse', '--show-toplevel')), root,
  'relative current-visual root is incorrect');
for (const relative of [paths.patch, paths.worker, paths.compilerEol]) {
  const file = path.join(root, relative);
  assert.ok(fs.statSync(file).isFile(), `missing source gate dependency: ${relative}`);
}
assert.equal(sha(path.join(root, paths.patch)), pin.eventPatchSha256);
assert.equal(sha(path.join(root, paths.worker)), pin.workerSha256);
assert.equal(sha(path.join(root, paths.compilerEol)), pin.compilerEolSha256);
const gateSource = fs.readFileSync(path.join(here, 'source-check.mjs'), 'utf8');
const requiredBindings = [
  "path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')",
  "'../source-check-worker.mjs'",
  "'../../../2032/preview/compiler-eol.mjs'",
  "'--reverse', '--check', patch",
  "'status', '--porcelain', '--untracked-files=all'",
  'loadSourceInBoundedWorker',
  'assert.equal(fetches, 0',
];
for (const required of requiredBindings)
  assert.ok(gateSource.includes(required), `source gate lost path/lifecycle check: ${required}`);

const workerTests = path.join(here, '..', 'source-check.test.mjs');
const workerOutput = execFileSync(process.execPath, [workerTests], {
  cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 2 * 1024 * 1024,
  env: { ...process.env, BEND_NO_TELEMETRY: '1' },
});
const workerResult = JSON.parse(workerOutput.trim());
assert.equal(workerResult.schema, 'rift-native-v2-2032-source-worker-tests/1');
assert.equal(workerResult.passed, true);
assert.deepEqual(workerResult.checks, [
  'source worker loads and validates in an isolated bounded thread',
  'source worker starts under a parent heap flag with explicit limits and a clean environment',
  'invalid timeout terminates only after lifecycle observation is attached',
  'source load failure is reported only after worker exit',
  'book_valid failure is reported by the worker',
  'worker fetches are denied and surfaced',
  'abnormal exit without a result is observed',
  'success message followed by nonzero exit is rejected',
  'duplicate result messages are rejected',
  'rejected timeout termination stays unobserved until a real exit event',
  'rejected error-path termination stays unobserved until a real exit event',
  'hung worker is terminated at its owned timeout',
]);
console.log(JSON.stringify({ schema: 'rift-native-v2-2032-current-visual-source-check-tests/1',
  passed: true, sourceCommit: pin.sourceCommit, sourceTree: pin.sourceTree,
  trackedBendFiles: pin.trackedBendFiles, pinnedGraphics: Object.keys(pin.graphics).length,
  workerLifecycleChecks: workerResult.checks.length }));
