// Fixed production entry; the actual native owner reviews its live reservation
// and existing pause/STOP/uncertainty state before launch. No CLI overrides.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Worker, resourceLimits } from 'node:worker_threads';
import { config, absolute, captureBinding, captureBindingSync, loadHelpers, outputIdentity, sha256 } from './binding.mjs';

function memoryAdmission(h) {
  const snapshot = h.aggregate.admittedMemorySnapshot({ hostFree: os.freemem() });
  assert.equal(snapshot.mode, 'linux-init-cgroup-full-ancestry-admitted');
  assert.equal(snapshot.ancestryMode, 'init-cgroup-namespace-visible-v2-full-ancestry');
  assert.ok(Number.isSafeInteger(snapshot.availableBytes) && snapshot.availableBytes >= 12 * 1024 ** 3,
    'STOP: full cgroup-ancestry admission requires at least 12 GiB available');
  return snapshot;
}
function createRun() {
  const b = config(), root = absolute(b.outputDirectory);
  assert.equal(fs.realpathSync(path.dirname(root)), path.dirname(root));
  execFileSync('git', ['-C', b.root, 'check-ignore', '--quiet', b.outputDirectory],
    { windowsHide: true, timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'] });
  // This is precisely the existing kernel output root and its one canonical lock.
  // A new source copy/output name cannot bypass an old active-kernel.lock.
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  assert.equal(fs.realpathSync(root), root);
  const stat = fs.lstatSync(root); assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  const directory = fs.mkdtempSync(path.join(root, 'kernel-ordering-transport-'));
  const home = path.join(directory, 'home'), tmp = path.join(directory, 'tmp');
  fs.mkdirSync(home, { mode: 0o700 }); fs.mkdirSync(tmp, { mode: 0o700 });
  return { directory, home, tmp, lock: path.join(root, 'active-kernel.lock'),
    output: path.join(directory, 'CHECK.bendtt'), receipt: path.join(directory, 'receipt.json') };
}
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
async function safeWorker(h, data) {
  const worker = new Worker(new URL('./worker.mjs', import.meta.url), { workerData: data,
    execArgv: [...h.contracts.safeWorkerFlags], resourceLimits: { stackSizeMb: 64 }, stdout: true, stderr: true });
  const configured = { ...worker.resourceLimits };
  const logs = { stdout: { bytes: 0, text: '', truncated: false }, stderr: { bytes: 0, text: '', truncated: false } };
  let failure;
  // Attach stream/settlement handlers before any assertion can fail. The existing
  // settlement primitive owns closure/termination; no outer retry or signaling.
  for (const name of ['stdout', 'stderr']) worker[name].on('data', data => {
    const buffer = Buffer.from(data), log = logs[name], room = Math.max(0, 65_536 - log.bytes);
    log.bytes += buffer.length; log.text += buffer.subarray(0, room).toString('utf8'); log.truncated = log.bytes > 65_536;
  });
  worker.on('message', message => { if (message?.ok === false) failure = message; });
  try {
    const result = await h.lifecycle.settleWorker(worker, { timeoutMs: 900_000, terminateGraceMs: 10_000 });
    assert.equal(configured.stackSizeMb, 64); assert.equal(result.actualResourceLimits.stackSizeMb, 64);
    assert.deepEqual(result.workerExecArgv, h.contracts.safeWorkerFlags); assert.equal(result.fetches, 0);
    for (const log of Object.values(logs)) assert.equal(log.truncated, false);
    return { ...result, configuredWorkerResourceLimits: configured, parentResourceLimits: { ...resourceLimits },
      parentExecArgv: [...process.execArgv], logs, observedExit: true };
  } catch (error) { error.workerFailure = failure; error.workerLogs = logs; error.configuredWorkerResourceLimits = configured; throw error; }
}
function kernelEnv(run, before) {
  return { BEND_NO_TELEMETRY: '1', HOME: run.home, TMPDIR: run.tmp, TMP: run.tmp, TEMP: run.tmp,
    NODE_OPTIONS: '', BUN_OPTIONS: '', LEAN_PATH: '', LEAN_SRC_PATH: '',
    LEAN_STACK_SIZE_KB: before.kernel.build.leanStackSizeKb,
    HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', ALL_PROXY: 'http://127.0.0.1:9',
    http_proxy: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', all_proxy: 'http://127.0.0.1:9', NO_PROXY: '', no_proxy: '' };
}
export async function executeCurrent99() {
  let kernelAttempted = false, h, before, run;
  try {
    assert.equal(arguments.length, 0, 'no dependency/approval injection in production');
    config(); h = await loadHelpers(); before = await captureBinding();
    assert.deepEqual(process.execArgv, []); assert.deepEqual(resourceLimits, {});
    run = createRun();
  } catch (error) { error.kernelAttempted = false; throw error; }
  let lease, worker, kernel, firstMemory, secondMemory, stage = 'lease', preserved = false;
  try {
    lease = h.lifecycle.acquireOwnedLock(run.lock, JSON.stringify({ schema: 'rift-bendtt-gate-2035-lease/1',
      ownerTask: config().ownerTask, bindingSha256: sha256(JSON.stringify(before)),
      workerMayBeLive: true, startedAt: new Date().toISOString() }));
    write(path.join(run.directory, 'before.json'), before);
    stage = 'first-memory-admission'; firstMemory = memoryAdmission(h);
    stage = 'safe-worker'; worker = await safeWorker(h, { mode: 'safe-emit', expected: before, output: run.output });
    write(path.join(run.directory, 'safe-worker.json'), worker);
    assert.equal(worker.mode, 'safe-emit'); assert.deepEqual(worker.emitted.oos, []); assert.equal(worker.observedExit, true);
    stage = 'serialized-source-rebind'; assert.deepEqual(await captureBinding(), before);
    const serialized = worker.emitted.file;
    h.contracts.assertSerializedUnchanged(serialized, outputIdentity(run.output));
    const args = [run.output], options = { cwd: run.directory, env: kernelEnv(run, before),
      timeoutMs: 1_800_000, maxOutputBytes: 4 * 1024 ** 2, label: 'BendTT2035 ordering-transport full62 CHECK serialization' };
    stage = 'second-memory-admission'; secondMemory = memoryAdmission(h);
    stage = 'kernel'; kernelAttempted = true;
    kernel = await h.supervisor.runOwnedGroup(before.kernel.path, args, options);
    h.contracts.assertOwnedGroupSuccess(kernel, h.contracts.successLine, 'BendTT2035 current99');
    stage = 'post-binding'; h.contracts.assertSerializedUnchanged(serialized, outputIdentity(run.output));
    assert.deepEqual(await captureBinding(), before);
    const receipt = { schema: 'rift-bendtt-verdict-2035/1', passed: true,
      producerScope: 'full combined CHECK with original frozen Laws and linked ordering witness Safe serialization and approved prebuilt BendTT kernel verdict',
      kernelAttempted,
      before, after: before, sourceBindingSha256: sha256(JSON.stringify(before)), worker, serialized,
      memoryAdmissions: [firstMemory, secondMemory],
      command: { executable: before.kernel.path, args, cwd: run.directory, timeoutMs: options.timeoutMs },
      process: { ...kernel, stdout: kernel.stdout.toString('utf8'), stderr: kernel.stderr.toString('utf8') },
      scope: 'exact Linux current99 original frozen Laws plus linked ordering-transport witness full62 CHECK only; original Windows evidence stays historical and does not validate the new witness; no pin adoption/native application/device/GPU/performance claim' };
    stage = 'receipt';
    h.lifecycle.finalizeOwnedManifest(path.join(run.directory, 'receipt.pending'), run.receipt,
      Buffer.from(JSON.stringify(receipt, null, 2) + '\n'), { beforeCommit: () => {
        assert.deepEqual(captureBindingSync(), before);
        h.contracts.assertSerializedUnchanged(serialized, outputIdentity(run.output));
      } });
    stage = 'lease-release'; h.lifecycle.releaseOwnedLock(lease); lease = null;
    return { receipt, path: run.receipt };
  } catch (error) {
    error.kernelAttempted = kernelAttempted;
    if (lease) try { lease.preserve = true; h.lifecycle.closeOwnedLock(lease); preserved = true; }
    catch (preservationError) { error.lockPreservationError = String(preservationError); }
    const failure = { schema: 'rift-bendtt-failure-2035/1', passed: false, stage,
      kernelAttempted,
      workerMayBeLive: error.workerMayBeLive === true, leasePreserved: preserved, source: before, worker,
      memoryAdmissions: [firstMemory, secondMemory].filter(Boolean),
      kernel: kernel ? { ...kernel, stdout: kernel.stdout?.toString('utf8'), stderr: kernel.stderr?.toString('utf8') } : null,
      reason: String(error.message ?? error).slice(0, 1800), failureStack: String(error.workerFailure?.failureStack ?? error.stack ?? error).slice(0, 6000),
      workerFailure: error.workerFailure, workerLogs: error.workerLogs, configuredWorkerResourceLimits: error.configuredWorkerResourceLimits,
      partialProcess: error.partialResult ?? null, lockPreservationError: error.lockPreservationError,
      scope: 'failed/incomplete attempt; preserve lease and bytes; no automatic resend, reset, rollback or retry' };
    try { write(path.join(run.directory, 'failure.partial.json'), failure); }
    catch (writeError) { error.receiptWriteError = String(writeError); }
    error.failureReceipt = path.join(run.directory, 'failure.partial.json'); error.lockPreserved = preserved; throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 2, 'usage: node <fixed ordering-transport consumer>/run.mjs');
  executeCurrent99().then(result => console.log(JSON.stringify({ passed: true, receiptPath: result.path })))
    .catch(error => { console.error(JSON.stringify({ passed: false, reason: error.message,
      failureReceipt: error.failureReceipt ?? null, lockPreserved: error.lockPreserved === true,
      workerMayBeLive: error.workerMayBeLive === true, kernelAttempted: error.kernelAttempted === true })); process.exitCode = 1; });
}
