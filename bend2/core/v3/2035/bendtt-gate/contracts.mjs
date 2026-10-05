import assert from 'node:assert/strict';
import { sha256 } from '../../../../toolchain-patches/2035/selected-binding.mjs';
export { assertOwnedGroupSuccess, successLine } from '../../2032/bendtt-gate/contracts.mjs';

export const candidate = Object.freeze({ commit: '79df8d9c40722ee9507a1e253f283b51025f9d6c',
  tree: '0545e537656df3931dbc32e5d0611305ab9b6f6a' });
export const leanSource = Object.freeze({ ...candidate, path: 'bend2/bendtt.lean',
  gitBlob: '536080934799f258fb17cf9259f1a77dcbc8866e',
  sha256: 'e15042434e73aab07ab05cea4b77b5619082c00a6d4924ea2d4a2cdec05facce' });
export const safeSource = Object.freeze({ ...candidate, path: 'bend2/safe.ts',
  gitBlob: '3d4bc68eadd54b0164d7c2e9c8b7031b6c05d71f',
  sha256: '54cb3a534ab7cc9ee313bf6383b3948ccdcac022469b3020e00745bbfe6f7e04' });
export const safeWorkerFlags = Object.freeze(['--experimental-transform-types']);
export const sourceScope = 'source/type/promise';
export const namespaceGuard = 'successor 2.0.35 compiler-owned guard via empty-root js_lib; no definition emission';
export const artifactLimitBytes = 64 * 1024 ** 2;
export const sourceFixture = Object.freeze({
  schema: 'rift-bendtt-source-approval-2035/1',
  aggregate: { path: '.artifacts/bend2/2035-proof-20261005/aggregate-E2EnCN/receipt.json',
    sha256: 'b62243c115e5eab8a97f62d6e3f8abdb79542cbae89cfc1285e3c8fed1ecca91' },
  mutations: { path: '.artifacts/bend2/2035-proof-20261005/mutations-C7DCKL/receipt.json',
    sha256: '661d60f5a8b817bef6e28c5ee558d6aabdf9dfab582a5b83e23c88481a60381f' },
  handoff: { path: '.artifacts/bend2/2035-proof-20261005/node-final-source-handoff.json',
    sha256: 'd723f586723e0d1c00ab6b42fd3ee8a646d15562603a81f5db17df248df1085e' },
  review: { disposition: 'accepted', path: '.artifacts/bend2/2035-preview/independent-2035-source-review-20261005.md',
    sha256: '6fd51b4218788ef2b4dec1e647169536981d414528ae4728dbf0330803fa461b' },
});

export function exactKeys(value, keys, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} is missing`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} fields differ`);
}
export function relativeInput(value) {
  assert.equal(typeof value, 'string');
  assert.ok(value && !value.includes('\\') && !value.includes(':') && !value.startsWith('/')
    && value.split('/').every(part => part && part !== '.' && part !== '..'), 'input must be repository relative');
  return value;
}
function boundBytes(entry, bytes, label) {
  exactKeys(entry, ['path', 'sha256'], label);
  relativeInput(entry.path);
  assert.match(entry.sha256, /^[0-9a-f]{64}$/);
  assert.ok(Buffer.isBuffer(bytes));
  assert.equal(sha256(bytes), entry.sha256, `${label} SHA-256 differs`);
  return JSON.parse(bytes.toString('utf8'));
}
function stackReadbacks(record) {
  assert.equal(record.parentResourceLimits?.stackSizeMb, 64);
  assert.equal(record.actualResourceLimits?.stackSizeMb, 64);
  assert.equal(record.fetches, 0);
}

// Historical Windows absolute paths are provenance only. Comparison across
// hosts uses the complete relative file inventories and loaded closure.
export function validateSourceApproval(approval, bytes) {
  exactKeys(approval, ['schema', 'aggregate', 'mutations', 'handoff', 'review'], '2035 source approval');
  assert.equal(approval.schema, 'rift-bendtt-source-approval-2035/1');
  const aggregate = boundBytes(approval.aggregate, bytes.aggregate, 'aggregate');
  const mutations = boundBytes(approval.mutations, bytes.mutations, 'mutations');
  const handoff = boundBytes(approval.handoff, bytes.handoff, 'handoff');
  exactKeys(approval.review, ['disposition', 'path', 'sha256'], 'source review');
  relativeInput(approval.review.path);
  assert.equal(approval.review.disposition, 'accepted');
  assert.equal(sha256(bytes.review), approval.review.sha256, 'source review SHA-256 differs');
  const review = bytes.review.toString('utf8').replaceAll('\r', '').split('\n');
  for (const line of ['Review disposition: accepted',
    `Aggregate receipt SHA256: ${approval.aggregate.sha256}`, `Mutation receipt SHA256: ${approval.mutations.sha256}`,
    `Final handoff SHA256: ${approval.handoff.sha256}`, `Source commit: ${aggregate.sourceCommit}`,
    `Source tree: ${aggregate.sourceTree}`, `Binding SHA256: ${aggregate.bindingSha256}`,
    `Frozen manifest SHA256: ${aggregate.frozenSha256}`,
    'Scope: Windows source/type/promise; no kernel/native/device/adoption approval']) assert.ok(review.includes(line), `review lacks ${line}`);
  assert.equal(aggregate.schema, 'rift-v2-aggregate-2035-source/1');
  assert.equal(mutations.schema, 'rift-v2-mutations-2035-source/1');
  assert.equal(handoff.schema, 'rift-v2-proof-2035-final-source-handoff/1');
  for (const record of [aggregate, mutations, handoff]) {
    assert.equal(record.passed, true);
    assert.equal(record.producerScope, sourceScope);
    assert.equal(record.sourceCommit, aggregate.sourceCommit);
    assert.equal(record.sourceTree, aggregate.sourceTree);
    assert.equal(record.bindingSha256, aggregate.bindingSha256);
    assert.equal(record.frozenSha256, aggregate.frozenSha256);
    assert.equal(record.namespaceGuard, record === mutations ? 'Comp.js_lib(empty-root full-book view, true)' : namespaceGuard);
  }
  assert.equal(aggregate.ok, true);
  assert.equal(aggregate.holes, 0);
  stackReadbacks(aggregate);
  assert.deepEqual(aggregate.before, aggregate.after);
  assert.deepEqual(mutations.before, aggregate.before);
  assert.deepEqual(mutations.after, aggregate.before);
  assert.equal(sha256(JSON.stringify(aggregate.before)), aggregate.bindingSha256);
  assert.equal(aggregate.before.clean, true);
  assert.equal(aggregate.before.sourceStatus, '');
  assert.equal(aggregate.before.sourceCommit, aggregate.sourceCommit);
  assert.equal(aggregate.before.sourceTree, aggregate.sourceTree);
  assert.equal(aggregate.before.frozenSha256, aggregate.frozenSha256);
  assert.equal(aggregate.before.expectedLoadedPaths.length, 57);
  assert.equal(aggregate.closure.files.length, 57);
  assert.equal(sha256(JSON.stringify(aggregate.closure.files)), aggregate.closure.sha256);
  assert.equal(handoff.aggregate.sha256, approval.aggregate.sha256);
  assert.equal(handoff.mutations.sha256, approval.mutations.sha256);
  assert.deepEqual(handoff.actualWorkers, { aggregate: 1, mutationPositives: 4, mutationNegatives: 6, positiveReuses: 2, total: 11 });
  assert.equal(handoff.sourceBindingsEqual, true);
  assert.equal(handoff.cleanBeforeAfter, true);
  assert.deepEqual(handoff.runtime, aggregate.before.runtime);
  const runtime = aggregate.before.runtime;
  assert.equal(runtime.engine, 'Node'); assert.equal(runtime.nodeVersion, 'v24.12.0');
  assert.equal(runtime.platform, 'win32'); assert.equal(runtime.arch, 'x64');
  assert.equal(runtime.executableSha256, '2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8');
  assert.deepEqual(runtime.execArgv, []); assert.equal(runtime.nodeOptions, ''); assert.equal(runtime.bunAbsent, true);
  assert.deepEqual(runtime.workerConfiguration, { stackSizeMb: 64, execArgv: [] });
  assert.deepEqual(mutations.results.map(item => item.name), ['reject_all', 'wrong_successor', 'hide_all_moves',
    'omit_repetition_key', 'wrong_resignation', 'ignore_draw_agreement']);
  assert.equal(mutations.selectedPassed, false);
  const positiveRecords = new Map();
  for (const item of mutations.results) {
    const positive = item.positive.record ?? item.positive;
    assert.equal(positive.ok, true); assert.equal(positive.holes, 0);
    assert.equal(positive.namespaceGuard, namespaceGuard); stackReadbacks(positive);
    if (item.positive.reusedFrom) {
      assert.deepEqual(positiveRecords.get(item.positive.reusedFrom), positive);
      assert.equal(item.positive.positiveKey, positive.positiveKey);
    } else positiveRecords.set(item.name, positive);
    const negative = item.negative;
    assert.equal(negative.ok, true); assert.equal(negative.rejected, true); stackReadbacks(negative);
    assert.match(negative.rejection, /expected\s*:/i); assert.match(negative.rejection, /observed\s*:/i);
    assert.ok(typeof negative.location === 'string' && negative.location.length > 0);
    // The unchanged producer hashes the full error, then retains at most1600
    // rendered characters. A long mismatch can place Location past that cut.
    if (negative.rejection.includes('Location: ')) assert.ok(negative.rejection.includes(`Location: ${negative.location}`));
    else assert.equal(negative.rejection.length, 1600);
    assert.match(negative.rejectionSha256, /^[0-9a-f]{64}$/);
  }
  assert.equal(positiveRecords.size, 4);
  return { aggregate, mutations, handoff };
}

export function validateSafeOutput(oos, output) {
  assert.deepEqual(oos, [], 'Safe elaboration is out of scope');
  assert.ok(Buffer.isBuffer(output) && output.length > 0 && output.length <= artifactLimitBytes, 'BendTT output is empty or oversized');
  return { bytes: output.length, sha256: sha256(output) };
}
export function assertSerializedUnchanged(expected, actual) {
  assert.deepEqual(actual, expected, 'serialized BendTT bytes or file identity changed');
}

export function assertSafeRuntime(runtime, expected, worker = false) {
  exactKeys(expected, ['engine', 'version', 'platform', 'arch', 'executableSha256', 'parentExecArgv', 'workerExecArgv', 'nodeOptions', 'stackSizeMb'], 'Safe runtime approval');
  assert.equal(expected.engine, 'Node'); assert.equal(expected.arch, 'x64');
  assert.ok((expected.platform === 'win32' && expected.version === 'v24.12.0')
    || (expected.platform === 'linux' && expected.version === 'v22.23.1'), 'unreviewed Safe Node version');
  assert.match(expected.executableSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(expected.parentExecArgv, []); assert.deepEqual(expected.workerExecArgv, safeWorkerFlags);
  assert.equal(expected.nodeOptions, ''); assert.equal(expected.stackSizeMb, 64);
  assert.equal(runtime.version, expected.version); assert.equal(runtime.platform, expected.platform);
  assert.equal(runtime.arch, expected.arch); assert.equal(runtime.executableSha256, expected.executableSha256);
  assert.deepEqual(runtime.execArgv, worker ? safeWorkerFlags : []);
  assert.equal(runtime.nodeOptions, ''); assert.equal(runtime.bunAbsent, true);
}

export function validateLinuxRuntimeApproval(approval, reviewBytes) {
  exactKeys(approval, ['schema', 'runtime', 'review'], 'Linux runtime approval');
  assert.equal(approval.schema, 'rift-safe-linux-runtime-2035/1');
  assert.equal(approval.runtime.platform, 'linux');
  exactKeys(approval.review, ['disposition', 'path', 'sha256'], 'Linux runtime review');
  relativeInput(approval.review.path); assert.equal(approval.review.disposition, 'accepted');
  assert.equal(sha256(reviewBytes), approval.review.sha256);
  const lines = reviewBytes.toString('utf8').replaceAll('\r', '').split('\n');
  for (const line of ['Review disposition: accepted', 'Safe import probe disposition: passed',
    `Linux Node exact version: ${approval.runtime.version}`,
    `Linux Node executable SHA256: ${approval.runtime.executableSha256}`,
    `Safe Worker execArgv: ${JSON.stringify(safeWorkerFlags)}`, 'Parent execArgv: []', 'NODE_OPTIONS: empty',
    'Actual Safe Worker stackSizeMb: 64', `Safe source SHA256: ${safeSource.sha256}`,
    'Safe import probe fetches: 0', 'Safe import probe observed Worker exit: true']) assert.ok(lines.includes(line), `Linux runtime review lacks ${line}`);
  return approval.runtime;
}

export function validateKernelApproval(approval, bytes, reviewBytes) {
  exactKeys(approval, ['schema', 'path', 'sha256', 'source', 'safeSource', 'lean', 'leanc', 'build', 'review'], '2035 kernel approval');
  assert.equal(approval.schema, 'rift-bendtt-kernel-approval-2035/1');
  assert.equal(sha256(bytes), approval.sha256, 'prebuilt kernel SHA-256 differs');
  assert.deepEqual(approval.source, leanSource); assert.deepEqual(approval.safeSource, safeSource);
  for (const tool of [approval.lean, approval.leanc]) {
    exactKeys(tool, ['path', 'version', 'sha256'], 'Lean build tool');
    assert.ok(typeof tool.path === 'string' && tool.path.startsWith('/') && !tool.path.includes('/../'));
    assert.ok(typeof tool.version === 'string' && tool.version && !/[\r\n]/.test(tool.version));
    assert.match(tool.sha256, /^[0-9a-f]{64}$/);
  }
  assert.match(approval.lean.version, /^Lean \(version 4\.34\.0(?:, [^)]+)?\)$/);
  exactKeys(approval.build, ['leanCommand', 'leancCommand', 'leanStackSizeKb'], 'Lean build');
  assert.deepEqual(approval.build.leanCommand, [approval.lean.path, '-c', 'bendtt.c', 'bendtt.lean']);
  assert.deepEqual(approval.build.leancCommand, [approval.leanc.path, '-O3', '-DNDEBUG', 'bendtt.c', '-o', 'bendtt']);
  assert.equal(approval.build.leanStackSizeKb, '4194304');
  exactKeys(approval.review, ['disposition', 'path', 'sha256'], 'kernel review');
  relativeInput(approval.review.path); assert.equal(approval.review.disposition, 'accepted');
  assert.equal(sha256(reviewBytes), approval.review.sha256);
  const lines = reviewBytes.toString('utf8').replaceAll('\r', '').split('\n');
  const needed = ['Review disposition: accepted', `BendTT kernel SHA256: ${approval.sha256}`,
    `BendTT source Git blob: ${leanSource.gitBlob}`, `BendTT source commit: ${candidate.commit}`,
    `BendTT source tree: ${candidate.tree}`, `BendTT source SHA256: ${leanSource.sha256}`,
    `BendTT safe.ts Git blob: ${safeSource.gitBlob}`, `BendTT safe.ts SHA256: ${safeSource.sha256}`,
    `Lean exact version: ${approval.lean.version}`, `Lean executable SHA256: ${approval.lean.sha256}`,
    `leanc exact version: ${approval.leanc.version}`, `leanc executable SHA256: ${approval.leanc.sha256}`,
    `Lean build command: ${JSON.stringify(approval.build.leanCommand)}`,
    `leanc build command: ${JSON.stringify(approval.build.leancCommand)}`];
  for (const line of needed) assert.ok(lines.includes(line), `kernel review lacks ${line}`);
  return approval;
}
