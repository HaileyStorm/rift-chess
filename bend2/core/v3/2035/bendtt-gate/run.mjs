import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { execFileSync } from 'node:child_process';
import { acquireOwnedLock, closeOwnedLock, releaseOwnedLock, finalizeOwnedManifest,
  settleWorker } from '../../../../toolchain-patches/2032/preview/lifecycle.mjs';
import { admittedMemorySnapshot } from '../../2032/aggregate-safety.mjs';
import { runOwnedGroup } from '../../2032/bendtt-supervisor.mjs';
import { root, outputRoot, captureBinding, sha256 } from './binding.mjs';
import { outputIdentity } from './output.mjs';
import { approvedSource, approvedKernel, approvedLinuxRuntime } from './approvals.mjs';
import { safeWorkerFlags, assertSerializedUnchanged, assertOwnedGroupSuccess, successLine } from './contracts.mjs';

export function assertMemoryAdmission(snapshot) {
  assert.equal(snapshot?.mode, 'linux-init-cgroup-full-ancestry-admitted');
  assert.equal(snapshot.ancestryMode, 'init-cgroup-namespace-visible-v2-full-ancestry');
  assert.ok(Number.isSafeInteger(snapshot.availableBytes) && snapshot.availableBytes >= 12 * 1024 ** 3,
    'STOP: Linux admission is below 12 GiB or unavailable');
  return snapshot;
}
export function createRun(kind) {
  assert.match(kind, /^[a-z-]+$/);
  assert.equal(fs.realpathSync(path.dirname(outputRoot)), path.dirname(outputRoot));
  execFileSync('git', ['-C', root, 'check-ignore', '--quiet', path.relative(root, outputRoot)],
    { windowsHide: true, timeout: 30_000, stdio: 'ignore' });
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  assert.equal(fs.realpathSync(outputRoot), outputRoot);
  assert.ok(fs.lstatSync(outputRoot).isDirectory() && !fs.lstatSync(outputRoot).isSymbolicLink());
  const directory = fs.mkdtempSync(path.join(outputRoot, `${kind}-`));
  const home = path.join(directory, 'home'), tmp = path.join(directory, 'tmp');
  fs.mkdirSync(home, { mode: 0o700 }); fs.mkdirSync(tmp, { mode: 0o700 });
  return { directory, home, tmp, lock: path.join(outputRoot, 'active-kernel.lock'),
    output: path.join(directory, 'CHECK.bendtt'), receipt: path.join(directory, 'receipt.json') };
}
export function writeJson(file, record) {
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}

export async function safeWorker(data, timeoutMs) {
  const started = Date.now();
  const memoryBefore = { rssBytes: process.memoryUsage().rss, freeBytes: os.freemem() };
  const worker = new Worker(new URL('./worker.mjs', import.meta.url), {
    workerData: data, execArgv: [...safeWorkerFlags], resourceLimits: { stackSizeMb: 64 },
    stdout: true, stderr: true,
  });
  const parentResourceLimits = { ...worker.resourceLimits };
  const logs = { stdout: { bytes: 0, text: '' }, stderr: { bytes: 0, text: '' } };
  for (const name of ['stdout', 'stderr']) worker[name].on('data', chunk => {
    logs[name].bytes += chunk.length;
    if (logs[name].bytes <= 64 * 1024) logs[name].text += chunk.toString('utf8');
  });
  let failure;
  worker.on('message', value => { if (value?.ok === false) failure = value; });
  try {
    const result = await settleWorker(worker, { timeoutMs, terminateGraceMs: 10_000 });
    assert.equal(parentResourceLimits.stackSizeMb, 64);
    assert.equal(result.actualResourceLimits.stackSizeMb, 64);
    assert.ok(logs.stdout.bytes <= 64 * 1024 && logs.stderr.bytes <= 64 * 1024, 'Worker diagnostic output exceeded bound');
    assert.equal(result.fetches, 0);
    return { ...result, parentResourceLimits, logs, memoryBefore,
      memoryAfter: { rssBytes: process.memoryUsage().rss, freeBytes: os.freemem() }, elapsedMs: Date.now() - started,
      timeoutMs, observedExit: true };
  } catch (error) {
    error.workerFailure = failure;
    error.workerLogs = logs;
    error.parentResourceLimits = parentResourceLimits;
    throw error;
  }
}

function kernelEnv(run, before) {
  return { BEND_NO_TELEMETRY: '1', HOME: run.home, TMPDIR: run.tmp, TMP: run.tmp, TEMP: run.tmp,
    NODE_OPTIONS: '', BUN_OPTIONS: '', LEAN_PATH: '', LEAN_SRC_PATH: '',
    LEAN_STACK_SIZE_KB: before.kernel.build.leanStackSizeKb,
    HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', ALL_PROXY: 'http://127.0.0.1:9',
    http_proxy: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', all_proxy: 'http://127.0.0.1:9',
    NO_PROXY: '', no_proxy: '' };
}
export function productionDependencies(approvals) {
  return { platform: process.platform, capture: () => captureBinding(approvals), createRun: () => createRun('kernel'),
    memory: () => admittedMemorySnapshot({ hostFree: os.freemem() }),
    worker: safeWorker, group: runOwnedGroup, output: outputIdentity,
    acquire: acquireOwnedLock, release: releaseOwnedLock,
    preserve: lease => { lease.preserve = true; closeOwnedLock(lease); },
    write: writeJson,
    final: (run, record, verify) => finalizeOwnedManifest(path.join(run.directory, 'receipt.pending'), run.receipt,
      Buffer.from(JSON.stringify(record, null, 2) + '\n'), { beforeCommit: verify }),
  };
}

// Injection is for deterministic contracts only; the CLI has no approval or
// executable options, and production imports the three committed pins.
export async function executeCandidate({ approvals = { source: approvedSource, kernel: approvedKernel,
  runtime: approvedLinuxRuntime }, dependencies } = {}) {
  assert.ok(approvals.source && approvals.kernel && approvals.runtime,
    'stop: source, prebuilt kernel and Linux runtime approvals are null or incomplete');
  const deps = dependencies ?? productionDependencies(approvals);
  assert.equal(deps.platform, 'linux', 'kernel invocation is Linux-only');
  const before = deps.capture();
  const run = deps.createRun();
  let lease, worker, kernel, firstMemory, secondMemory, stage = 'lease', preserved = false;
  try {
    lease = deps.acquire(run.lock, JSON.stringify({ schema: 'rift-bendtt-gate-2035-lease/1',
      ownerTask: process.env.CODEX_THREAD_ID ?? null, bindingSha256: sha256(JSON.stringify(before)),
      workerMayBeLive: true, startedAt: new Date().toISOString() }));
    deps.write(path.join(run.directory, 'before.json'), before);
    stage = 'first-memory-admission'; firstMemory = assertMemoryAdmission(deps.memory());
    stage = 'safe-worker';
    worker = await deps.worker({ mode: 'safe-emit', source: approvals.source, runtime: approvals.runtime.runtime,
      approvals, expectedSource: before.source, expectedKernel: before.kernel, output: run.output }, 900_000);
    deps.write(path.join(run.directory, 'safe-worker.json'), worker);
    assert.equal(worker.mode, 'safe-emit');
    assert.deepEqual(worker.emitted.oos, []);
    assert.equal(worker.observedExit, true);
    stage = 'serialized-source-rebind';
    assert.deepEqual(deps.capture(), before, 'source/runtime/kernel binding changed before kernel');
    const serialized = worker.emitted.file;
    assertSerializedUnchanged(serialized, deps.output(run.output));
    const args = [run.output];
    const options = { cwd: run.directory, env: kernelEnv(run, before), timeoutMs: 1_800_000,
      maxOutputBytes: 4 * 1024 ** 2, label: 'BendTT2035 exact full frozen CHECK serialization' };
    stage = 'second-memory-admission'; secondMemory = assertMemoryAdmission(deps.memory());
    stage = 'kernel';
    kernel = await deps.group(before.kernel.path, args, options);
    assertOwnedGroupSuccess(kernel, successLine, 'BendTT2035');
    stage = 'post-binding';
    assertSerializedUnchanged(serialized, deps.output(run.output));
    assert.deepEqual(deps.capture(), before, 'source/runtime/kernel binding changed during kernel');
    const receipt = { schema: 'rift-bendtt-verdict-2035/1', passed: true,
      producerScope: 'full frozen CHECK Safe serialization and approved prebuilt BendTT kernel verdict',
      before, after: before, sourceBindingSha256: sha256(JSON.stringify(before)),
      worker, serialized, memoryAdmissions: [firstMemory, secondMemory],
      command: { executable: before.kernel.path, args, timeoutMs: options.timeoutMs, cwd: run.directory },
      process: { ...kernel, stdout: kernel.stdout.toString('utf8'), stderr: kernel.stderr.toString('utf8') },
      scope: 'exact Linux source/runtime/kernel full frozen CHECK only; no mutations, conformance, native/browser/GPU or pin adoption' };
    stage = 'receipt';
    deps.final(run, receipt, () => {
      assert.deepEqual(deps.capture(), before);
      assertSerializedUnchanged(serialized, deps.output(run.output));
    });
    stage = 'lease-release'; deps.release(lease); lease = null;
    return { receipt, path: run.receipt };
  } catch (error) {
    if (lease) {
      try { deps.preserve(lease); preserved = true; }
      catch (preservationError) { error.lockPreservationError = String(preservationError); }
    }
    const failure = { schema: 'rift-bendtt-failure-2035/1', passed: false, stage,
      workerMayBeLive: error.workerMayBeLive === true, leasePreserved: preserved, source: before,
      worker, kernel: kernel ? { ...kernel, stdout: kernel.stdout?.toString('utf8'), stderr: kernel.stderr?.toString('utf8') } : null,
      reason: String(error?.message ?? error).slice(0, 1800),
      failureStack: String(error.workerFailure?.failureStack ?? error.stack ?? error).slice(0, 6000),
      workerFailure: error.workerFailure, workerLogs: error.workerLogs,
      lockPreservationError: error.lockPreservationError,
      partialProcess: error.partialResult ?? null,
      scope: 'failed/incomplete attempt; preserve lease and all bytes; no automatic resend or retry' };
    try { deps.write(path.join(run.directory, 'failure.partial.json'), failure); }
    catch (writeError) { error.receiptWriteError = String(writeError); }
    error.failureReceipt = path.join(run.directory, 'failure.partial.json');
    error.lockPreserved = preserved;
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 2, 'usage: node bend2/core/v3/2035/bendtt-gate/run.mjs');
  process.env.BEND_NO_TELEMETRY = '1';
  executeCandidate().then(result => console.log(JSON.stringify({ passed: true, receiptPath: result.path })))
    .catch(error => { console.error(JSON.stringify({ passed: false, reason: error.message,
      failureReceipt: error.failureReceipt ?? null, lockPreserved: error.lockPreserved === true,
      workerMayBeLive: error.workerMayBeLive === true })); process.exitCode = 1; });
}
