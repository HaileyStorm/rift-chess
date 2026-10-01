// Linux-only frozen-v2 CHECK --verdict candidate for the derived 2.0.32 tree.
// A successful source/type screen is not a BendTT verdict; this entrypoint
// requires separately reviewed aggregate and kernel approvals before launch.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { admittedMemorySnapshot } from '../aggregate-safety.mjs';
import { acquireOwnedLock, closeOwnedLock, finalizeOwnedManifest,
  releaseOwnedLock } from '../../../../toolchain-patches/2032/preview/lifecycle.mjs';
import { captureBinding, validateBunPath } from './binding.mjs';
import { approvedAggregateReceipt, approvedBendttKernel } from './approvals.mjs';
import { assertOwnedGroupSuccess, successLine } from './contracts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../');
const MEMORY_FLOOR_BYTES = 32 * 1024 ** 3;
const VERDICT_TIMEOUT_MS = 1_800_000;
const VERSION_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const LOOPBACK_PROXY = 'http://127.0.0.1:9';

function assertMemory(snapshot, phase) {
  assert.ok(snapshot && Number.isSafeInteger(snapshot.availableBytes)
    && snapshot.availableBytes >= 0, `${phase}: memory snapshot is malformed`);
  assert.equal(snapshot.mode, 'linux-init-cgroup-full-ancestry-admitted',
    `${phase}: Linux full-ancestry admission mode is required`);
  assert.equal(snapshot.ancestryMode, 'init-cgroup-namespace-visible-v2-full-ancestry',
    `${phase}: init cgroup namespace/full ancestry proof is required`);
  assert.ok(snapshot.availableBytes >= MEMORY_FLOOR_BYTES,
    `${phase}: admitted memory ${snapshot.availableBytes} B is below ${MEMORY_FLOOR_BYTES} B`);
  return snapshot;
}

function assertBunVersion(result) {
  assert.ok(result && result.stdout?.toString('utf8').replace(/\r?\n$/, '') === '1.4.2',
    'Bun version process did not print exactly 1.4.2');
  assert.equal(result.stderr?.length, 0, 'Bun version process wrote stderr');
  assert.equal(result.status, 0, 'Bun version process failed');
  assert.equal(result.signal, null, 'Bun version process ended by signal');
  assert.equal(result.groupQuiescent, true, 'Bun version process group did not quiesce');
  assert.equal(result.groupStateKnown, true, 'Bun version process-group liveness is unknown');
  assert.equal(result.timedOut, false, 'Bun version process timed out');
  assert.equal(result.outputLimitExceeded, false, 'Bun version output was truncated');
  assert.equal(result.terminationReason, null, 'Bun version process ended unexpectedly');
  assert.ok(Number.isSafeInteger(result.pid) && result.pid > 0,
    'Bun version process identity is unavailable');
  assert.ok(result.processIdentity?.pid === result.pid
    && result.processIdentity.pgid === result.pid
    && result.processIdentity.session === result.pid
    && /^\d+$/.test(result.processIdentity.startTimeTicks ?? ''),
  'Bun version process group is not exactly owned');
  assert.equal(result.stdoutBytesSeen, result.stdout.length, 'Bun version stdout was truncated');
  assert.equal(result.stderrBytesSeen, 0, 'Bun version stderr byte count is inconsistent');
  assert.deepEqual(result.signalsSent, [], 'Bun version process required a termination signal');
  assert.equal(result.retryCount, 0, 'Bun version process was retried');
  return result;
}

function versionSummary(result) {
  return { stdout: result.stdout.toString('utf8'), stderr: result.stderr.toString('utf8'),
    status: result.status, signal: result.signal, pid: result.pid,
    durationMs: result.durationMs, groupQuiescent: result.groupQuiescent,
    groupStateKnown: result.groupStateKnown, processIdentity: result.processIdentity };
}

function processSummary(result) {
  return { stdout: result.stdout.toString('utf8'), stderr: result.stderr.toString('utf8'),
    stdoutBytesSeen: result.stdoutBytesSeen, stderrBytesSeen: result.stderrBytesSeen,
    status: result.status, signal: result.signal, pid: result.pid,
    durationMs: result.durationMs, groupQuiescent: result.groupQuiescent,
    groupStateKnown: result.groupStateKnown, processIdentity: result.processIdentity,
    timedOut: result.timedOut, outputLimitExceeded: result.outputLimitExceeded,
    terminationReason: result.terminationReason, signalsSent: result.signalsSent,
    retryCount: result.retryCount };
}

function runEnvironment(run, binding) {
  return {
    BEND_NO_TELEMETRY: '1',
    BENDTT: binding.kernel.path,
    HOME: run.home,
    TMPDIR: run.tmp,
    TMP: run.tmp,
    TEMP: run.tmp,
    XDG_CACHE_HOME: path.join(run.home, '.cache'),
    XDG_CONFIG_HOME: path.join(run.home, '.config'),
    XDG_DATA_HOME: path.join(run.home, '.local/share'),
    BUN_OPTIONS: '',
    BUN_CONFIG: '',
    NODE_OPTIONS: '',
    LEAN_PATH: '',
    LEAN_SRC_PATH: '',
    HTTP_PROXY: LOOPBACK_PROXY,
    HTTPS_PROXY: LOOPBACK_PROXY,
    ALL_PROXY: LOOPBACK_PROXY,
    http_proxy: LOOPBACK_PROXY,
    https_proxy: LOOPBACK_PROXY,
    all_proxy: LOOPBACK_PROXY,
    NO_PROXY: '',
    no_proxy: '',
  };
}

function createRunDirectory(root, runId = `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`) {
  assert.match(runId, /^[A-Za-z0-9._-]{8,120}$/, 'run identity is malformed');
  const artifactParent = path.join(root, '.artifacts', 'bend2');
  assert.equal(fs.realpathSync(artifactParent), artifactParent,
    'ignored Bend2 artifact parent must be canonical');
  const runs = path.join(artifactParent, '2032-bendtt-verdict');
  try { fs.mkdirSync(runs, { mode: 0o700 }); }
  catch (error) { if (error?.code !== 'EEXIST') throw error; }
  const runStat = fs.lstatSync(runs);
  assert.ok(runStat.isDirectory() && !runStat.isSymbolicLink(),
    'BendTT run root must be a real directory');
  assert.equal(fs.realpathSync(runs), runs, 'BendTT run root is not canonical');
  const ignored = path.relative(root, runs).replaceAll('\\', '/');
  execFileSync('git', ['check-ignore', '--quiet', ignored], { cwd: root, stdio: 'ignore' });
  const directory = path.join(runs, runId);
  fs.mkdirSync(directory, { mode: 0o700 }); // exclusive; a collision is a hard stop
  assert.equal(fs.realpathSync(directory), directory, 'BendTT run directory is not canonical');
  const home = path.join(directory, 'home');
  const tmp = path.join(directory, 'tmp');
  fs.mkdirSync(home, { mode: 0o700 });
  fs.mkdirSync(tmp, { mode: 0o700 });
  for (const child of ['.cache', '.config', '.local', '.local/share'])
    fs.mkdirSync(path.join(home, child), { mode: 0o700 });
  return { id: runId, directory, home, tmp,
    // One fixed lease serializes the memory-heavy host-wide gate across unique
    // per-run output directories. It is removed only after observed success.
    lock: path.join(runs, 'active-verdict.lock'),
    receipt: path.join(directory, 'receipt.json'),
    failure: path.join(directory, 'failure.partial.json') };
}

function writePartial(file, payload) {
  const bytes = Buffer.from(JSON.stringify(payload, null, 2) + '\n', 'utf8');
  const fd = fs.openSync(file, 'wx', 0o600);
  try {
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.writeSync(fd, bytes, offset, bytes.length - offset, offset);
      if (!Number.isInteger(count) || count <= 0) throw new Error('partial receipt write made no progress');
      offset += count;
    }
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
}

function summarizeError(error) {
  return { name: error?.name ?? 'Error', message: error?.message ?? String(error),
    code: error?.code ?? null, workerMayBeLive: error?.workerMayBeLive === true,
    partialResult: error?.partialResult ? processSummary(error.partialResult) : null };
}

export function productionDependencies(root = ROOT) {
  const bunPath = validateBunPath(process.env.BUN_BIN);
  let ownedGroup;
  const getOwnedGroup = async () => {
    if (!ownedGroup) ownedGroup = (await import('../bendtt-supervisor.mjs')).runOwnedGroup;
    assert.equal(typeof ownedGroup, 'function', 'process owner has no runOwnedGroup API');
    return ownedGroup;
  };
  return {
    platform: process.platform,
    root,
    captureBinding: (approvals) => captureBinding({ root, ...approvals, bunPath }),
    createRun: (runId) => createRunDirectory(root, runId),
    memorySnapshot: () => admittedMemorySnapshot({ hostFree: os.freemem() }),
    runGroup: async (...args) => (await getOwnedGroup())(...args),
    acquireLock: (file, payload) => acquireOwnedLock(file, payload),
    releaseLock: (lease) => releaseOwnedLock(lease),
    preserveLock: (lease) => {
      if (!lease || lease.closed) return;
      lease.preserve = true;
      closeOwnedLock(lease);
    },
    writeFinal: (run, receipt, verifyBeforeCommit) => {
      const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + '\n', 'utf8');
      return finalizeOwnedManifest(path.join(run.directory, 'receipt.tmp'), run.receipt,
        bytes, { verifyTemp: verifyBeforeCommit });
    },
    writeFailure: (run, payload) => writePartial(run.failure, payload),
    isolatedEnv: runEnvironment,
    cwd: path.join(root, '.artifacts', 'bend2', 'toolchain-patches', 'derived-2032', 'bend2'),
    bunPath,
    now: () => new Date().toISOString(),
  };
}

// `approvals` and `dependencies` are explicit injection seams for deterministic
// tests only. The CLI below imports its immutable module pins and accepts no
// path/hash arguments or environment override for either approval.
export async function executeCandidate({ approvals = {
  aggregate: approvedAggregateReceipt, kernel: approvedBendttKernel,
}, dependencies, runId } = {}) {
  assert.ok(approvals?.aggregate && approvals?.kernel,
    'stop: independent full-CHECK and prebuilt-kernel approvals are both null or incomplete');
  const deps = dependencies ?? productionDependencies();
  assert.equal(deps.platform, 'linux', 'this candidate runs only on Linux');
  const before = deps.captureBinding({ aggregateApproval: approvals.aggregate,
    kernelApproval: approvals.kernel });
  const run = deps.createRun(runId);
  let lease;
  let stage = 'first-memory-admission';
  let firstMemory;
  let secondMemory;
  let versionResult;
  let verdictResult;
  let leasePreserved = false;
  try {
    lease = deps.acquireLock(run.lock, JSON.stringify({
      schema: 'rift-bendtt-gate-lease/1', sourceCommit: before.sourceCommit,
      startedAt: deps.now(), workerMayBeLive: true,
    }) + '\n');
    firstMemory = assertMemory(deps.memorySnapshot(), 'first pre-launch memory admission');
    const env = deps.isolatedEnv(run, before);
    stage = 'bun-runtime-version';
    versionResult = await deps.runGroup(before.bun.path, ['--version'], {
      cwd: deps.cwd, env, timeoutMs: VERSION_TIMEOUT_MS,
      maxOutputBytes: 1024, label: 'Bun 1.4.2 runtime identity',
    });
    assertBunVersion(versionResult);
    stage = 'source-rebind-before-verdict';
    assert.deepEqual(deps.captureBinding({ aggregateApproval: approvals.aggregate,
      kernelApproval: approvals.kernel }), before,
    'source, frozen closure, approvals, derived compiler, or executable bytes changed before --verdict');

    const verdictArgs = [path.join(deps.cwd, 'main.ts'), before.checkPath, '--verdict'];
    const verdictOptions = { cwd: deps.cwd, env, timeoutMs: VERDICT_TIMEOUT_MS,
      maxOutputBytes: MAX_OUTPUT_BYTES, label: 'Bend 2.0.32 frozen CHECK --verdict' };
    stage = 'second-memory-admission';
    secondMemory = assertMemory(deps.memorySnapshot(), 'second pre-launch memory admission');
    stage = 'frozen-check-verdict';
    verdictResult = await deps.runGroup(before.bun.path, verdictArgs, verdictOptions);
    assertOwnedGroupSuccess(verdictResult, successLine, 'frozen CHECK --verdict');
    assert.deepEqual(deps.captureBinding({ aggregateApproval: approvals.aggregate,
      kernelApproval: approvals.kernel }), before,
    'source, frozen closure, approvals, derived compiler, or executable bytes changed during --verdict');

    stage = 'final-receipt';
    const receipt = {
      schema: 'rift-bend-v2-bendtt-verdict-2032/1',
      passed: true,
      createdAt: deps.now(),
      runId: run.id,
      source: { commit: before.sourceCommit, tree: before.sourceTree,
        aggregateReceiptCommit: before.aggregate.sourceCommit,
        aggregateReceiptTree: before.aggregate.sourceTree,
        frozenV2Sha256: before.frozenSha256,
        frozenManifestFiles: before.frozenFiles,
        checkedEntry: 'bend2/core/v2/CHECK.bend',
        loadedSources: before.expectedLoadedSources },
      aggregateApproval: before.aggregate,
      sourceLineage: before.lineage,
      lease: { path: run.lock, policy: 'fixed exclusive host-local lease',
        acquiredBeforeMemoryAdmission: true, heldThroughFinalReceiptCommit: true,
        releaseAfterReceiptCommit: true },
      toolchain: { compiler: 'Bend 2.0.32 derived', compilerEol: before.compilerEol,
        compilerBase: before.compilerBase, compilerEolBinderSha256: before.compilerEolBinderSha256,
        lifecycleSha256: before.lifecycleSha256,
        processSupervisorSha256: before.processSupervisorSha256,
        patches: before.patches, canonicalPinCommit: 'd37909174ebd664338ae3194799a9e0899dedd51',
        scoutCommit: '573002f01ec6c52416d44489543f69a9625facf8',
        scoutTree: '0ecfc84c5f19bbae2c0c10735129749adf7d49e8' },
      kernel: before.kernel,
      runtime: { bun: before.bun, versionCheck: versionSummary(versionResult),
        node: before.node },
      memoryAdmissions: [firstMemory, secondMemory].map((sample, index) => ({
        phase: index === 0 ? 'before-runtime-check' : 'immediately-before-verdict',
        ...sample })),
      command: { executable: before.bun.path,
        args: [path.join(deps.cwd, 'main.ts'), before.checkPath, '--verdict'],
        cwd: deps.cwd, environment: { BEND_NO_TELEMETRY: '1',
          BENDTT: before.kernel.path, HOME: run.home, TMPDIR: run.tmp,
          HTTP_PROXY: LOOPBACK_PROXY, HTTPS_PROXY: LOOPBACK_PROXY, ALL_PROXY: LOOPBACK_PROXY },
        timeoutMs: VERDICT_TIMEOUT_MS },
      process: processSummary(verdictResult),
      result: { status: 0, stdout: successLine, stderr: '',
        groupQuiescent: true, groupStateKnown: true },
      networkBoundary: before.networkBoundary,
      scope: 'full frozen v2 CHECK.bend under derived 2.0.32 --verdict with approved BendTT; this does not prove six mutations, conformance, native, browser, GPU, pin adoption or owner visual acceptance',
    };
    deps.writeFinal(run, receipt, (bytes) => {
      assert.deepEqual(JSON.parse(bytes.toString('utf8')), receipt,
        'final receipt bytes differ from the source-rebound verdict');
      assert.deepEqual(deps.captureBinding({ aggregateApproval: approvals.aggregate,
        kernelApproval: approvals.kernel }), before,
      'source or approved inputs changed before receipt commit');
    });
    stage = 'lease-release';
    deps.releaseLock(lease);
    lease = null;
    return { receipt, path: run.receipt };
  } catch (error) {
    const failure = { schema: 'rift-bend-v2-bendtt-verdict-failure-2032/1',
      passed: false, stage, runId: run.id, createdAt: deps.now(),
      sourceCommit: before.sourceCommit, aggregateReceipt: before.aggregate,
      workerMayBeLive: error?.workerMayBeLive === true,
      process: error?.partialResult ? processSummary(error.partialResult)
        : verdictResult ? processSummary(verdictResult)
        : versionResult ? versionSummary(versionResult) : null,
      error: summarizeError(error),
      lock: { path: run.lock, acquiredByThisAttempt: Boolean(lease),
        occupiedByOtherAttempt: !lease && error?.code === 'EEXIST', preserved: false },
      scope: 'failed/incomplete attempt; not a BendTT success receipt; preserve partial files and do not retry until process/host state is reviewed' };
    if (lease) {
      try { deps.preserveLock(lease); leasePreserved = true; }
      catch (lockError) { error.lockPreservationError = lockError; }
    }
    failure.lock.preserved = leasePreserved;
    try { deps.writeFailure(run, failure); }
    catch (writeError) { error.partialWriteError = writeError; }
    error.failureReceipt = run.failure;
    error.lockPreserved = leasePreserved;
    throw error;
  }
}

async function main(args) {
  if (args.length !== 0) throw new Error('usage: node bend2/core/v3/2032/bendtt-gate/run.mjs');
  if (process.platform !== 'linux') throw new Error('Linux-only BendTT process-group gate');
  process.env.BEND_NO_TELEMETRY = '1';
  const result = await executeCandidate();
  process.stdout.write(JSON.stringify({ schema: result.receipt.schema,
    passed: result.receipt.passed, receiptPath: result.path,
    sourceCommit: result.receipt.source.commit,
    frozenV2Sha256: result.receipt.source.frozenV2Sha256,
    kernelSha256: result.receipt.kernel.actualSha256,
    process: result.receipt.process }) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(JSON.stringify({ schema: 'rift-bend-v2-bendtt-verdict-2032/error',
      passed: false, message: error?.message ?? String(error),
      failureReceipt: error?.failureReceipt ?? null,
      lockPreserved: error?.lockPreserved === true,
      workerMayBeLive: error?.workerMayBeLive === true,
      partialResult: error?.partialResult ? processSummary(error.partialResult) : null }) + '\n');
    process.exitCode = 1;
  });
}
