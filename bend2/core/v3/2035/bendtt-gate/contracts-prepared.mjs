import assert from 'node:assert/strict';
import { sha256 } from '../../../../toolchain-patches/2035/selected-binding.mjs';
import { artifactLimitBytes, candidate, exactKeys, namespaceGuard, relativeInput,
  sourceFixture } from './contracts.mjs';

export const preparedSourceSchema = 'rift-bendtt-source-approval-2035/2';
const entry = 'bend2/core/v3/2035/PREPARED_CHECK.bend';
const producer = 'bend2/core/v3/2035/prepared-source.mjs';
const base = '<derived>/bend2/base.bend';
const names = ['oldids', 'oldkey', 'reject_all', 'wrong_successor', 'hide_all_moves',
  'omit_repetition_key', 'wrong_resignation', 'ignore_draw_agreement'];
const scope = 'Windows source/type/promise; no kernel/native/device/adoption approval';
const hashPattern = /^[0-9a-f]{64}$/;
const normalized = value => value.replaceAll('\\', '/');

function bound(entry, bytes, label) {
  exactKeys(entry, ['path', 'sha256'], label); relativeInput(entry.path);
  assert.ok(entry.path.startsWith('.artifacts/bend2/'), `${label} is outside ignored Bend2 evidence`);
  assert.match(entry.sha256, hashPattern);
  assert.ok(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= artifactLimitBytes);
  assert.equal(sha256(bytes), entry.sha256, `${label} bytes differ`);
  return JSON.parse(bytes.toString('utf8'));
}
function inventory(files, label) {
  assert.ok(Array.isArray(files) && files.length > 0, `${label} missing`);
  const map = new Map();
  for (const file of files) {
    exactKeys(file, ['path', 'sha256'], label);
    if (file.path !== base) relativeInput(file.path);
    assert.match(file.sha256, hashPattern); assert.ok(!map.has(file.path), `${label} duplicates a path`);
    map.set(file.path, file.sha256);
  }
  return map;
}
function stack(record) {
  assert.equal(record.parentResourceLimits?.stackSizeMb, 64);
  assert.equal(record.actualResourceLimits?.stackSizeMb, 64);
  assert.equal(record.fetches, 0); assert.equal(record.ok, true);
  assert.ok(Number.isSafeInteger(record.elapsedMs) && record.elapsedMs >= 0);
}
function closure(record, files) {
  assert.deepEqual(record.closure.files, files, 'combined source closure differs');
  assert.equal(record.closure.sha256, sha256(JSON.stringify(files)));
}

// The review and complete input hashes authenticate historical Windows execution.
// Current source capture independently rebuilds the inventory and frozen cone;
// executing Linux Safe/kernel runtime approval remains a separate boundary.
export function validatePreparedSourceApproval(approval, bytes) {
  exactKeys(approval, ['schema', 'receipt', 'native', 'review'], 'combined source approval');
  assert.equal(approval.schema, preparedSourceSchema);
  exactKeys(approval.native, ['terminal', 'settlement', 'supervisor', 'capture', 'start'], 'native source evidence');
  const receipt = bound(approval.receipt, bytes.receipt, 'combined receipt');
  const terminal = bound(approval.native.terminal, bytes.terminal, 'native terminal');
  const settlement = bound(approval.native.settlement, bytes.settlement, 'native settlement');
  const capture = bound(approval.native.capture, bytes.capture, 'native capture');
  const start = bound(approval.native.start, bytes.start, 'complete native input manifest');
  exactKeys(approval.native.supervisor, ['path', 'sha256'], 'native supervisor');
  relativeInput(approval.native.supervisor.path);
  assert.ok(approval.native.supervisor.path.startsWith('.artifacts/bend2/'));
  assert.ok(Buffer.isBuffer(bytes.supervisor)); assert.match(approval.native.supervisor.sha256, hashPattern);
  assert.equal(sha256(bytes.supervisor), approval.native.supervisor.sha256);
  assert.equal(receipt.schema, 'rift-prepared-aggregate-2035-source/2');
  assert.equal(receipt.passed, true); assert.equal(receipt.producerScope, 'source/type/promise');
  const before = receipt.before;
  assert.equal(before.schema, 'rift-prepared-proof-2035-binding/2');
  assert.equal(before.clean, true); assert.equal(before.sourceStatus, '');
  assert.deepEqual(receipt.after, before); assert.deepEqual(capture, before);
  assert.deepEqual(start.sourceBinding, before);
  assert.equal(receipt.sourceCommit, before.sourceCommit); assert.match(receipt.sourceCommit, /^[0-9a-f]{40}$/);
  assert.equal(receipt.sourceTree, before.sourceTree); assert.match(receipt.sourceTree, /^[0-9a-f]{40}$/);
  assert.equal(receipt.bindingSha256, sha256(JSON.stringify(before)));
  assert.equal(receipt.frozenSha256, before.frozenSha256);
  assert.deepEqual(receipt.preparedManifest, before.preparedManifest);
  assert.equal(before.preparedManifest.path, 'bend2/laws/semantic-prepared-v3.json');
  assert.equal(before.preparedManifest.sha256, '1c614f4df66e694a5395ee1b00cc23a1c59c7cf2ad99d6e4c36e3427d1939fa6');
  assert.equal(before.compiler.upstream, candidate.commit);
  const runtime = before.runtime;
  assert.equal(runtime.engine, 'Node'); assert.equal(runtime.nodeVersion, 'v24.12.0');
  assert.equal(runtime.platform, 'win32'); assert.equal(runtime.arch, 'x64');
  assert.equal(runtime.executableSha256, '2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8');
  assert.deepEqual(runtime.execArgv, []); assert.equal(runtime.nodeOptions, ''); assert.equal(runtime.bunAbsent, true);
  assert.deepEqual(runtime.workerConfiguration, { stackSizeMb: 64, execArgv: [] });
  const inputs = inventory(before.sourceFiles, 'complete source inventory'); assert.equal(inputs.size, 315);
  assert.equal(inputs.get(before.preparedManifest.path), before.preparedManifest.sha256);
  assert.ok(inputs.has(producer) && inputs.has(entry));
  assert.deepEqual(before.historicalV2, sourceFixture); assert.deepEqual(receipt.historicalV2.receipts, sourceFixture);
  assert.equal(receipt.historicalV2.executionReused, false);
  assert.deepEqual(receipt.historicalV2.inputDrift, []);
  assert.deepEqual(receipt.historicalV2.comparisons.map(item => item.name), names.slice(2));
  assert.equal(receipt.actualFreshWorkers, 9);
  const positive = receipt.aggregate; stack(positive);
  assert.equal(positive.name, 'aggregate'); assert.equal(positive.holes, 0);
  assert.equal(positive.namespaceGuard, namespaceGuard);
  assert.ok(Number.isSafeInteger(positive.definitions) && positive.definitions > 0);
  assert.ok(Number.isSafeInteger(positive.owned) && positive.owned > 0);
  const files = positive.closure.files, cone = inventory(files, 'combined cone'); assert.equal(cone.size, 62);
  assert.ok(cone.has(entry) && cone.has('bend2/core/v2/CHECK.bend')
    && cone.has('bend2/core/v3/prepared-match/CHECK.bend') && cone.has('bend2/core/v3/prepared-match/LAWS.bend'));
  assert.equal(cone.get(base), before.compiler.derivedFiles.find(file => file.path === 'base.bend').sha256);
  for (const [file, hash] of cone) if (file !== base) assert.equal(hash, before.frozenFiles[file]);
  closure(positive, files);
  const key = sha256(JSON.stringify({ entry,
    files: [...cone.keys()].filter(file => file !== base).sort().map(file => [file, before.frozenFiles[file]]),
    bindingSha256: receipt.bindingSha256 }));
  assert.equal(receipt.positiveKey, key); assert.equal(positive.positiveKey, key);
  assert.deepEqual(before.negativeControls.map(item => item.name), names);
  assert.deepEqual(receipt.negatives.map(item => item.name), names);
  for (const [index, record] of receipt.negatives.entries()) {
    const control = before.negativeControls[index]; stack(record);
    assert.equal(record.positiveKey, key); assert.equal(record.rejected, true);
    assert.deepEqual(record.control, control); assert.ok(cone.has(control.target));
    assert.match(control.mutatedSha256, hashPattern);
    assert.notEqual(control.mutatedSha256, cone.get(control.target));
    assert.equal(record.definitions, positive.definitions);
    if (index < 2) {
      assert.equal(control.family, 'prepared'); assert.equal(control.target, 'bend2/core/v3/prepared-match/Match.bend');
      assert.equal(control.law, index === 0 ? 'carried_canonical' : 'apply_exact');
      assert.deepEqual(record.bridge, { path: 'bend2/core/v3/prepared-match/LAWS.bend',
        namespace: 'core/v3/prepared-match/LAWS',
        definition: 'core/v3/prepared-match/LAWS:' + control.law });
      assert.equal(record.definition, record.bridge.definition);
      assert.equal(inputs.get(control.mutant), control.mutatedSha256);
    } else {
      assert.equal(control.family, 'v2');
      const historical = receipt.historicalV2.comparisons[index - 2];
      assert.equal(control.target, historical.target); assert.equal(control.mutatedSha256, historical.mutatedSha256);
      assert.equal(control.historicalProof, historical.proof);
    }
    assert.ok(typeof record.location === 'string' && record.location.length > 0);
    assert.match(record.rejectionSha256, hashPattern);
    assert.equal(typeof record.rendered, 'string');
    assert.match(record.rendered, /expected\s*:/i); assert.match(record.rendered, /observed\s*:/i);
    assert.equal(sha256(record.rendered), record.rejectionSha256);
    assert.equal(record.rejection, record.rendered.slice(0, 1600));
    assert.equal(/^Location:\s*(.+)$/m.exec(record.rendered)?.[1], record.location);
    closure(record, files.map(file => file.path === control.target ? { ...file, sha256: control.mutatedSha256 } : file));
  }
  assert.equal(terminal.module, 'prepared-source-2035'); assert.equal(terminal.passed, true); assert.equal(terminal.nativePassed, true);
  assert.equal(terminal.exitCode, 0); assert.equal(terminal.validationError, null);
  for (const field of ['samePopenExitObserved', 'checkedExitedHandleClosed', 'postBindingJobSelfOnly', 'checkedJobClosed']) {
    assert.equal(terminal[field], true); assert.equal(settlement[field], true);
  }
  assert.equal(settlement.exitCode, 0); assert.equal(settlement.beforeEqualsAfter, true);
  assert.equal(terminal.sourceBeforeAfterEqual, true); assert.deepEqual(terminal.before, terminal.after);
  assert.deepEqual(start.before, terminal.before);
  for (const field of ['timeout', 'signaling', 'retry']) assert.equal(terminal[field], false);
  assert.ok(terminal.samples.length > 0);
  for (const sample of terminal.samples) {
    assert.equal(sample.limitFlags, 0); assert.equal(sample.limitTerminatedProcesses, 0);
  }
  const nativeInputs = new Map(Object.entries(terminal.before).map(([file, hash]) => [normalized(file), hash]));
  assert.equal(nativeInputs.size, Object.keys(terminal.before).length, 'duplicate normalized native input');
  for (const hash of nativeInputs.values()) assert.match(hash, hashPattern);
  const roots = [...nativeInputs.keys()].filter(file => file.endsWith('/' + producer)); assert.equal(roots.length, 1);
  const origin = roots[0].slice(0, -producer.length);
  const expectedNativePaths = new Set([...inputs.keys()].map(file => origin + file));
  for (const [file, hash] of inputs) assert.equal(nativeInputs.get(origin + file), hash, `native fence omits ${file}`);
  for (const [group, prefix] of [['pristineFiles', '.artifacts/toolchains/bend-2.0.35-scout/bend2/'],
    ['derivedFiles', '.artifacts/bend2/toolchain-patches/derived-2035-source-loader/bend2/']]) {
    for (const file of before.compiler[group]) {
      relativeInput(file.path); assert.match(file.sha256, hashPattern);
      assert.equal(nativeInputs.get(origin + prefix + file.path), file.sha256, `native compiler fence omits ${file.path}`);
      expectedNativePaths.add(origin + prefix + file.path);
    }
  }
  assert.equal(nativeInputs.get(normalized(runtime.executable)), runtime.executableSha256);
  assert.equal(nativeInputs.get(origin + approval.native.supervisor.path), approval.native.supervisor.sha256);
  const runRoot = '.artifacts/bend2/2035-preview/stationary-motion-20261006/';
  const adapter = origin + '.artifacts/bend2/knight-anatomy-20261005/job_budget_v4_v1.py';
  const qualifier = origin + '.artifacts/bend2/knight-anatomy-20261005/job-qualifier-budget-v4-job-v3-run/terminal.json';
  assert.equal(nativeInputs.get(adapter), '02a0be733dec2f4bf24f66d4a8511e93ddb5e252ec68cb002db965c77501572c');
  assert.equal(nativeInputs.get(qualifier), 'b0638f369d03fd955b93ba5a13a242239e7dc47cc8c2023215fa104b4417da5d');
  assert.equal(start.qualificationReuse, nativeInputs.get(qualifier));
  // External runtime/helper and ownership hashes belong to the reviewed native
  // manifest. These are historical execution inputs, never current claims.
  for (const file of [normalized(runtime.executable), 'C:/Python314/python.exe',
    'C:/Users/Haile/.codex/tools/quiet_launch.py', adapter, qualifier,
    origin + approval.native.supervisor.path, origin + runRoot + 'capture-prepared-source-r1.mjs',
    origin + '.working', origin + 'bend2/.working', origin + '.artifacts/bend2/2035-preview/.working',
    origin + '.artifacts/bend2/2035-kernel-20261005/.working']) expectedNativePaths.add(file);
  assert.deepEqual([...nativeInputs.keys()].sort(), [...expectedNativePaths].sort(), 'complete native input fence differs');
  assert.equal(terminal.result.receiptSha256, approval.receipt.sha256);
  assert.equal(terminal.result.output + '/receipt.json', approval.receipt.path);
  assert.equal(terminal.result.freshWorkers, 9); assert.equal(terminal.result.historicalExecutionReuses, 0);
  exactKeys(approval.review, ['disposition', 'path', 'sha256'], 'combined source review');
  assert.equal(approval.review.disposition, 'accepted'); relativeInput(approval.review.path);
  assert.ok(Buffer.isBuffer(bytes.review)); assert.equal(sha256(bytes.review), approval.review.sha256);
  const review = bytes.review.toString('utf8').replaceAll('\r', '').split('\n');
  for (const line of ['Review disposition: accepted', `Combined receipt SHA256: ${approval.receipt.sha256}`,
    `Native terminal SHA256: ${approval.native.terminal.sha256}`, `Native settlement SHA256: ${approval.native.settlement.sha256}`,
    `Native input manifest SHA256: ${approval.native.start.sha256}`, `Native supervisor SHA256: ${approval.native.supervisor.sha256}`,
    `Native capture SHA256: ${approval.native.capture.sha256}`,
    `Source commit: ${receipt.sourceCommit}`, `Source tree: ${receipt.sourceTree}`, `Binding SHA256: ${receipt.bindingSha256}`,
    `Frozen manifest SHA256: ${receipt.frozenSha256}`, `Prepared manifest SHA256: ${before.preparedManifest.sha256}`,
    `Scope: ${scope}`]) assert.ok(review.includes(line), `combined review lacks ${line}`);
  return { receipt, terminal, settlement, capture, start };
}
