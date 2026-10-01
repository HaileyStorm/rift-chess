// Deterministic contract and orchestration tests. They use synthetic approved
// values and a fake owned-process API; no Lean, BendTT, Bun or Linux host runs.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { approvedAggregateReceipt, approvedBendttKernel } from './approvals.mjs';
import { captureBinding } from './binding.mjs';
import { aggregateApprovalSchema, expectedBendttSafeSource, expectedBendttSource, kernelApprovalSchema,
  successLine, assertOwnedGroupSuccess, validateAggregateApproval,
  validateKernelApproval } from './contracts.mjs';
import { executeCandidate } from './run.mjs';

process.env.BEND_NO_TELEMETRY = '1';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceCommit = '1'.repeat(40);
const sourceTree = '2'.repeat(40);
const frozenSha256 = '3'.repeat(64);
const aggregateScriptSha256 = '4'.repeat(64);
const aggregateSafetySha256 = '5'.repeat(64);
const compilerEolBinderSha256 = '6'.repeat(64);
const driveRoot = path.parse(process.cwd()).root;
const fakeRoot = path.join(driveRoot, 'Rift');
const derivedCwd = path.join(fakeRoot, 'derived', 'bend2');
const bunPath = path.join(driveRoot, 'fake-bun');
const kernelPath = path.join(driveRoot, 'fake-bendtt');
const checkPath = path.join(fakeRoot, 'bend2', 'core', 'v2', 'CHECK.bend');
const mainPath = path.join(derivedCwd, 'main.ts');
const patches = [
  { path: 'one.patch', sha256: '7'.repeat(64) },
  { path: 'two.patch', sha256: '8'.repeat(64) },
];
const compilerEol = { eol: 'lf', files: [{ path: 'bend2/bend.ts', sha256: '9'.repeat(64) }] };
const compilerBase = { path: 'bend2/base.bend', sha256: 'a'.repeat(64), normalizedSha256: 'b'.repeat(64) };
const aggregateRuntime = { nodeVersion: 'v22.23.1', nodeExeSha256: 'c'.repeat(64),
  platform: 'linux', arch: 'x64' };

assert.equal(approvedAggregateReceipt, null, 'aggregate approval must remain unarmed by default');
assert.equal(approvedBendttKernel, null, 'kernel approval must remain unarmed by default');

const aggregateReceipt = {
  schema: 'rift-v2-aggregate-2032-source/1', passed: true, ok: true,
  sourceCommit, sourceTree, frozenSha256, holes: 0, fetches: 0,
  expectedLoadedFiles: 7, loadedFiles: 7,
  runtime: aggregateRuntime,
  scope: 'aggregate frozen CHECK source/type/promise screen only; no BendTT kernel',
  compilerEol, compilerBase, binderSha256: compilerEolBinderSha256,
  scriptSha256: aggregateScriptSha256, safetySha256: aggregateSafetySha256, patches,
};
const aggregateBytes = Buffer.from(JSON.stringify(aggregateReceipt) + '\n');
const aggregateReview = Buffer.from([
  'Review disposition: accepted',
  `Aggregate receipt SHA256: ${sha(aggregateBytes)}`,
  `Aggregate source commit: ${sourceCommit}`,
  `Aggregate source tree: ${sourceTree}`,
].join('\n') + '\n');
const aggregateApproval = {
  schema: aggregateApprovalSchema,
  path: path.join(fakeRoot, '.artifacts', 'bend2', 'aggregate.json'),
  sha256: sha(aggregateBytes), sourceCommit, sourceTree, frozenSha256,
  holes: 0, fetches: 0,
  review: { disposition: 'accepted',
    path: path.join(fakeRoot, '.artifacts', 'bend2', 'aggregate-review.md'),
    sha256: sha(aggregateReview) },
};
const aggregateExpected = { frozenSha256, loadedFiles: 7, aggregateScriptSha256,
  aggregateSafetySha256, compilerEolBinderSha256, compilerEol, compilerBase,
  patches, aggregateRuntime };
assert.equal(validateAggregateApproval(aggregateApproval, aggregateBytes,
  aggregateReview, aggregateExpected).passed, true);
assert.throws(() => validateAggregateApproval({ ...aggregateApproval,
  sha256: 'd'.repeat(64) }, aggregateBytes, aggregateReview, aggregateExpected), /SHA-256 differs/);
assert.throws(() => validateAggregateApproval(aggregateApproval,
  Buffer.from(aggregateBytes.toString().replace('"holes":0', '"holes":1')),
  aggregateReview, aggregateExpected), /SHA-256 differs/);
const pendingReview = Buffer.from(aggregateReview.toString().replace(
  'Review disposition: accepted', 'Review disposition: pending'));
assert.throws(() => validateAggregateApproval({ ...aggregateApproval,
  review: { ...aggregateApproval.review, sha256: sha(pendingReview) } }, aggregateBytes,
pendingReview, aggregateExpected), /accepted disposition/);

const fakeKernelBytes = Buffer.from('synthetic-not-an-executable');
const leanPath = path.join(path.parse(process.cwd()).root, 'lean-4.34.0');
const leancPath = path.join(path.parse(process.cwd()).root, 'leanc-18.1');
const leanInfo = { path: leanPath,
  version: 'Lean (version 4.34.0, x86_64-unknown-linux-gnu, commit synthetic)',
  sha256: 'e'.repeat(64) };
const leancInfo = { path: leancPath, version: 'clang version 18.1.3 (synthetic)',
  sha256: 'f'.repeat(64) };
const kernelBuild = { leanCommand: [leanPath, '-c', 'bendtt.c', 'bendtt.lean'],
  leancCommand: [leancPath, '-O3', '-DNDEBUG', 'bendtt.c', '-o', 'bendtt'],
  leanStackSizeKb: '4194304' };
const kernelReview = Buffer.from([
  'Review disposition: accepted',
  `BendTT kernel SHA256: ${sha(fakeKernelBytes)}`,
  `BendTT source Git blob: ${expectedBendttSource.gitBlob}`,
  `BendTT source commit: ${expectedBendttSource.commit}`,
  `BendTT source tree: ${expectedBendttSource.tree}`,
  `BendTT source SHA256: ${expectedBendttSource.sha256}`,
  `BendTT safe.ts Git blob: ${expectedBendttSafeSource.gitBlob}`,
  `BendTT safe.ts SHA256: ${expectedBendttSafeSource.sha256}`,
  `Lean exact version: ${leanInfo.version}`,
  `Lean executable SHA256: ${leanInfo.sha256}`,
  `leanc exact version: ${leancInfo.version}`,
  `leanc executable SHA256: ${leancInfo.sha256}`,
  `Lean build command: ${JSON.stringify(kernelBuild.leanCommand)}`,
  `leanc build command: ${JSON.stringify(kernelBuild.leancCommand)}`,
].join('\n') + '\n');
const kernelApproval = {
  schema: kernelApprovalSchema,
  path: kernelPath, sha256: sha(fakeKernelBytes),
  source: expectedBendttSource,
  lean: leanInfo,
  leanc: leancInfo,
  build: kernelBuild,
  review: { disposition: 'accepted',
    path: path.join(fakeRoot, '.artifacts', 'bend2', 'kernel-review.md'),
    sha256: sha(kernelReview) },
};
assert.equal(validateKernelApproval(kernelApproval, fakeKernelBytes, kernelReview,
  expectedBendttSource).sha256, sha(fakeKernelBytes));
assert.throws(() => validateKernelApproval({ ...kernelApproval,
  source: { ...expectedBendttSource, gitBlob: '0'.repeat(40) } }, fakeKernelBytes,
  kernelReview, expectedBendttSource), /exact scout bendtt\.lean Git blob/);
assert.throws(() => validateKernelApproval({ ...kernelApproval,
  lean: { ...kernelApproval.lean, version: 'Lean (version 4.33.0)' } },
fakeKernelBytes, kernelReview, expectedBendttSource), /Lean 4\.34\.0/);
assert.throws(() => validateKernelApproval({ ...kernelApproval,
  build: { ...kernelApproval.build, leancCommand: [leancPath, 'wrong'] } },
fakeKernelBytes, kernelReview, expectedBendttSource), /native link command differs/);
const malformedSafeReview = Buffer.from(kernelReview.toString().replace(
  'BendTT safe.ts Git blob:', 'BendTT safeXts Git blob:'));
assert.throws(() => validateKernelApproval({ ...kernelApproval,
  review: { ...kernelApproval.review, sha256: sha(malformedSafeReview) } },
fakeKernelBytes, malformedSafeReview, expectedBendttSource),
/does not bind the derived verdict implementation/);

const fakeBinding = {
  sourceCommit, sourceTree, frozenSha256, frozenFiles: 108,
  checkPath,
  expectedLoadedPaths: [],
  expectedLoadedSources: [{ path: 'bend2/core/v2/CHECK.bend', sha256: '1'.repeat(64) }],
  aggregate: { path: aggregateApproval.path, sha256: aggregateApproval.sha256,
    sourceCommit, sourceTree, holes: 0, fetches: 0 },
  lineage: { sourceCommit, sourceTree, aggregateSourceCommit: sourceCommit,
    aggregateSourceTree: sourceTree, criticalFiles: 100, laterChanges: [] },
  compilerEol, compilerBase, compilerEolBinderSha256,
  lifecycleSha256: '8'.repeat(64), processSupervisorSha256: '9'.repeat(64),
  patches,
  kernel: { path: kernelPath, actualSha256: kernelApproval.sha256,
    source: expectedBendttSource, sourceSha256: expectedBendttSource.sha256,
    lean: kernelApproval.lean, leanc: kernelApproval.leanc,
    build: kernelApproval.build },
  bun: { path: bunPath, sha256: '2'.repeat(64), size: 42, mode: 0o755, dev: '1', ino: '2' },
  node: { version: 'v22.23.1', executable: '/node', sha256: '3'.repeat(64),
    platform: 'linux', arch: 'x64' },
  networkBoundary: { telemetry: 'BEND_NO_TELEMETRY=1',
    imports: 'frozen local cone', proxies: 'loopback sink' },
};
function ownedResult(stdout, overrides = {}) {
  const bytes = Buffer.from(stdout);
  return { stdout: bytes, stderr: Buffer.alloc(0), stdoutBytesSeen: bytes.length,
    stderrBytesSeen: 0, status: 0, signal: null, pid: 4321, durationMs: 12,
    groupQuiescent: true, groupStateKnown: true, timedOut: false,
    outputLimitExceeded: false, terminationReason: null, signalsSent: [], retryCount: 0,
    processIdentity: { pid: 4321, pgid: 4321, session: 4321, startTimeTicks: '12345' },
    ...overrides };
}

assert.equal(assertOwnedGroupSuccess(ownedResult(successLine), successLine,
  'positive').status, 0);
for (const [label, result] of [
  ['wrong line', ownedResult('All proofs check\n')],
  ['second line', ownedResult(`${successLine}extra\n`)],
  ['stderr', ownedResult(successLine, { stderr: Buffer.from('warning\n') })],
  ['nonzero', ownedResult(successLine, { status: 1 })],
  ['signal', ownedResult(successLine, { signal: 'SIGTERM' })],
  ['live child', ownedResult(successLine, { groupQuiescent: false })],
  ['unknown child state', ownedResult(successLine, { groupStateKnown: false })],
  ['truncated stdout', ownedResult(successLine, { stdoutBytesSeen: 500 })],
]) assert.throws(() => assertOwnedGroupSuccess(result, successLine, label));

const admitted = () => ({ availableBytes: 40 * 1024 ** 3,
  mode: 'linux-init-cgroup-full-ancestry-admitted',
  ancestryMode: 'init-cgroup-namespace-visible-v2-full-ancestry',
  cgroupNamespaceInode: 0xEFFFFFFB, cgroupFilesystemType: 0x63677270,
  cgroupPath: '/run/test', mountRoot: '/', visibleLimits: [] });
function fakeDependencies({ verdict = ownedResult(successLine), memory = [admitted(), admitted()],
  version = ownedResult('1.4.2\n'), throwOnVerdict = null,
  lockManager = { held: false, owner: null }, holdVerdict = false } = {}) {
  let memoryIndex = 0;
  let groupIndex = 0;
  const calls = [];
  let signalVerdictEntered;
  const verdictEntered = new Promise((resolve) => { signalVerdictEntered = resolve; });
  let finishVerdict;
  const blockedVerdict = new Promise((resolve) => { finishVerdict = resolve; });
  const state = { runCreated: false, lease: false, preserved: false, released: false,
    final: null, failure: null, captures: 0, memoryCalls: 0, calls, events: [], run: null };
  const deps = {
    platform: 'linux', root: fakeRoot, cwd: derivedCwd,
    captureBinding: (approvals) => {
      assert.equal(approvals.aggregateApproval, aggregateApproval);
      assert.equal(approvals.kernelApproval, kernelApproval);
      state.events.push('capture');
      state.captures++;
      return structuredClone(fakeBinding);
    },
    createRun: (id) => { state.runCreated = true; state.events.push('create-run');
      const directory = path.join(fakeRoot, '.artifacts', 'run', id ?? 'fixed-run-id-01');
      state.run = { id: id ?? 'fixed-run-id-01', directory,
        home: path.join(directory, 'home'), tmp: path.join(directory, 'tmp'),
        lock: path.join(fakeRoot, '.artifacts', 'bend2', '2032-bendtt-verdict', 'active-verdict.lock'),
        receipt: path.join(directory, 'receipt.json'),
        failure: path.join(directory, 'failure.partial.json') };
      return state.run; },
    memorySnapshot: () => { state.events.push(`memory-${++state.memoryCalls}`); return memory[memoryIndex++]; },
    runGroup: async (executable, args, options) => {
      calls.push({ executable, args, options });
      if (groupIndex++ === 0) {
        state.events.push('group-version');
        assert.deepEqual(args, ['--version']);
        assert.equal(options.env.BENDTT, kernelPath);
        assert.equal(options.env.BEND_NO_TELEMETRY, '1');
        assert.equal(options.env.HOME, state.run.home);
        assert.equal(options.env.TMPDIR, state.run.tmp);
        assert.equal(options.timeoutMs, 30_000);
        return version;
      }
      state.events.push('group-verdict');
      signalVerdictEntered();
      assert.deepEqual(args, [mainPath, checkPath, '--verdict']);
      assert.equal(options.timeoutMs, 1_800_000);
      assert.equal(options.maxOutputBytes, 4 * 1024 * 1024);
      if (throwOnVerdict) throw throwOnVerdict;
      if (holdVerdict) return blockedVerdict;
      return verdict;
    },
    acquireLock: (file, payload) => {
      state.events.push('acquire-lock');
      if (lockManager.held) { const error = Error('exclusive lease already exists'); error.code = 'EEXIST'; throw error; }
      lockManager.held = true; lockManager.owner = state; state.lease = true;
      return { file, payload, closed: false };
    },
    releaseLock: (lease) => { assert.ok(state.final); assert.equal(lockManager.owner, state);
      lease.closed = true; state.released = true; lockManager.held = false; lockManager.owner = null; },
    preserveLock: (lease) => { assert.equal(lockManager.owner, state);
      lease.closed = true; state.preserved = true; },
    writeFinal: (run, receipt, verify) => {
      state.final = receipt;
      verify(Buffer.from(JSON.stringify(receipt)));
    },
    writeFailure: (_run, failure) => { state.failure = failure; },
    isolatedEnv: (run, binding) => ({ BENDTT: binding.kernel.path,
      BEND_NO_TELEMETRY: '1', HOME: run.home, TMPDIR: run.tmp,
      HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9',
      ALL_PROXY: 'http://127.0.0.1:9' }),
    now: () => '2026-10-01T00:00:00.000Z',
  };
  return { deps, state, verdictEntered, finishVerdict, lockManager };
}

const noApprovalFake = fakeDependencies();
await assert.rejects(executeCandidate({ dependencies: noApprovalFake.deps }),
  /approvals are both null or incomplete/);
assert.equal(noApprovalFake.state.runCreated, false);
assert.equal(noApprovalFake.state.calls.length, 0);
assert.equal(noApprovalFake.state.captures, 0);

const successFake = fakeDependencies();
const completed = await executeCandidate({
  approvals: { aggregate: aggregateApproval, kernel: kernelApproval },
  dependencies: successFake.deps, runId: 'approved-fake-run-01',
});
assert.equal(completed.receipt.passed, true);
assert.equal(completed.receipt.result.stdout, successLine);
assert.equal(successFake.state.memoryCalls, 2,
  'two full-ancestry memory admissions must precede the verdict launch');
assert.equal(successFake.state.calls.length, 2,
  'only Bun --version and the official derived main.ts CHECK --verdict may launch');
assert.equal(successFake.state.final.command.args[0], mainPath);
assert.equal(successFake.state.final.command.args[1], checkPath);
assert.equal(successFake.state.final.command.args[2], '--verdict');
assert.equal(successFake.state.final.lease.policy, 'fixed exclusive host-local lease');
assert.equal(successFake.state.final.lease.acquiredBeforeMemoryAdmission, true);
assert.equal(successFake.state.final.lease.heldThroughFinalReceiptCommit, true);
assert.equal(successFake.state.released, true);
assert.equal(successFake.state.preserved, false);
assert.equal(successFake.state.captures, 4,
  'bind before execution, before verdict, after verdict, and before final receipt');
assert.ok(successFake.state.events.indexOf('acquire-lock') < successFake.state.events.indexOf('memory-1'),
  'fixed host-wide lease must be acquired before memory admission');
assert.ok(successFake.state.events.indexOf('capture', successFake.state.events.indexOf('group-version'))
  < successFake.state.events.indexOf('memory-2'), 'source rebind must precede the last memory sample');
assert.equal(successFake.state.events[successFake.state.events.indexOf('group-verdict') - 1], 'memory-2',
  'second memory admission must be the last operation before the verdict process group starts');

const sharedLease = { held: false, owner: null };
const firstConcurrent = fakeDependencies({ lockManager: sharedLease, holdVerdict: true });
const firstAttempt = executeCandidate({ approvals: { aggregate: aggregateApproval,
  kernel: kernelApproval }, dependencies: firstConcurrent.deps, runId: 'exclusive-first-01' });
await firstConcurrent.verdictEntered;
assert.equal(sharedLease.held, true, 'first candidate retains the fixed host-wide lease while checking');
const competing = fakeDependencies({ lockManager: sharedLease });
await assert.rejects(executeCandidate({ approvals: { aggregate: aggregateApproval,
  kernel: kernelApproval }, dependencies: competing.deps, runId: 'exclusive-second-01' }),
  (error) => error.code === 'EEXIST');
assert.notEqual(firstConcurrent.state.run.directory, competing.state.run.directory,
  'concurrent attempts must have separate no-overwrite output directories');
assert.equal(firstConcurrent.state.run.lock, competing.state.run.lock,
  'all concurrent attempts must contend on the same fixed host-local lease');
assert.equal(competing.state.memoryCalls, 0, 'competing invocation must stop before memory admission');
assert.equal(competing.state.calls.length, 0, 'competing invocation must not spawn any process');
assert.equal(competing.state.failure.lock.occupiedByOtherAttempt, true);
assert.equal(sharedLease.owner, firstConcurrent.state, 'competing invocation does not alter lease ownership');
firstConcurrent.finishVerdict(ownedResult(successLine));
const firstCompleted = await firstAttempt;
assert.equal(firstCompleted.receipt.passed, true);
assert.equal(sharedLease.held, false, 'fixed lease releases only after observed successful quiescence');

const lowMemory = fakeDependencies({ memory: [admitted(), { ...admitted(), availableBytes: 31 * 1024 ** 3 }] });
await assert.rejects(executeCandidate({ approvals: { aggregate: aggregateApproval,
  kernel: kernelApproval }, dependencies: lowMemory.deps }), /below 34359738368 B/);
assert.equal(lowMemory.state.calls.length, 1, 'low second sample must stop before CHECK launch');
assert.equal(lowMemory.state.memoryCalls, 2);
assert.equal(lowMemory.state.preserved, true, 'failed lease is retained');
assert.equal(lowMemory.state.failure.stage, 'second-memory-admission');
assert.equal(lowMemory.state.final, null);

const uncertain = new Error('owned process did not quiesce');
uncertain.workerMayBeLive = true;
uncertain.partialResult = ownedResult('', { status: null, groupQuiescent: false,
  groupStateKnown: false, terminationReason: 'timeout' });
const uncertainFake = fakeDependencies({ throwOnVerdict: uncertain });
await assert.rejects(executeCandidate({ approvals: { aggregate: aggregateApproval,
  kernel: kernelApproval }, dependencies: uncertainFake.deps }), /did not quiesce/);
assert.equal(uncertainFake.state.preserved, true);
assert.equal(uncertainFake.state.failure.workerMayBeLive, true);
assert.equal(uncertainFake.state.failure.error.partialResult.groupQuiescent, false);
assert.equal(uncertainFake.state.final, null);

const mismatchFake = fakeDependencies({ verdict: ownedResult('ALL PROOFS CHECK\r\n') });
await assert.rejects(executeCandidate({ approvals: { aggregate: aggregateApproval,
  kernel: kernelApproval }, dependencies: mismatchFake.deps }), /stdout differs/);
assert.equal(mismatchFake.state.preserved, true);
assert.equal(mismatchFake.state.final, null);

// Keep an explicit proof that preflight helpers remain source-only; this call
// is intentionally not made here because the current checkout and host are
// Windows and the live Linux binding requires an exact clean Linux checkout.
assert.equal(typeof captureBinding, 'function');
console.log(JSON.stringify({ schema: 'rift-bendtt-gate-2032-tests/1', passed: true,
  controls: ['null approvals fail before source/process work', 'aggregate raw receipt/review pins',
    'kernel SHA/LF Git-blob source/safe.ts/Lean 4.34/build command pins',
    'exact owned-group success line',
    'empty stderr/status/group quiescence', 'two 32-GiB full-ancestry samples before CHECK',
    'one fixed lease blocks a competing invocation before admission/spawn',
    'unique ignored run directories serialize on the same fixed lease',
    'second memory sample follows rebind and directly precedes verdict spawn',
    'exact official main.ts CHECK --verdict invocation', 'source rebind before/after/final receipt',
    'failed attempt partial plus retained lease', 'uncertain child process preserves lease',
    'no actual Bun/Lean/BendTT/host invocation'],
  scope: 'synthetic injected approval/process/memory tests only; no live verifier evidence' }));
