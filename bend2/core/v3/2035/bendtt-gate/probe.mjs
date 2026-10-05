import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, captureSource, captureRuntime, sha256 } from './binding.mjs';
import { sourceFixture, safeWorkerFlags } from './contracts.mjs';
import { createRun, safeWorker, writeJson } from './run.mjs';
import { acquireOwnedLock, releaseOwnedLock, closeOwnedLock } from '../../../../toolchain-patches/2032/preview/lifecycle.mjs';

export const windowsProbeRuntime = Object.freeze({ engine: 'Node', version: 'v24.12.0', platform: 'win32', arch: 'x64',
  executableSha256: '2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8',
  parentExecArgv: [], workerExecArgv: [...safeWorkerFlags], nodeOptions: '', stackSizeMb: 64 });
export const runtimeProbePacket = Object.freeze({
  schema: 'rift-bendtt-2035-safe-import-probe-packet/1', readyForReview: true, executed: false,
  command: ['C:/Program Files/nodejs/node.exe', 'bend2/core/v3/2035/bendtt-gate/probe.mjs', '--import-only'],
  cwd: 'repository root', runtime: windowsProbeRuntime, sourceEvidence: sourceFixture,
  workerTimeoutMs: 60_000, exitGraceMs: 10_000, quietOuterTimeoutMs: 120_000,
  imports: ['bend.ts', 'comp.ts', 'safe.ts'], requiredAPIs: ['book_nil', 'book_valid', 'js_lib', 'safe_emit'],
  permittedCalls: 'dynamic imports and typeof API only; no compiler book construction/load/check/emit or kernel invocation',
  network: 'fetch replaced with counting denial; expected zero',
  output: 'fresh ignored import-probe directory; wx evidence; source binding before/after; observed Worker exit',
  resourcePolicy: '64MiB actual stack readbacks; free RAM observed with no Windows admission floor; Vivaldi stays open',
  authority: 'prepared only; root must independently review source and authorize this distinct probe before invocation',
});

export async function executeImportProbe() {
  process.env.BEND_NO_TELEMETRY = '1';
  assert.equal(process.platform, 'win32', 'this prepared probe binds the Windows source host only');
  const before = captureSource(sourceFixture), runtime = captureRuntime(windowsProbeRuntime);
  const run = createRun('import-probe');
  const lease = acquireOwnedLock(run.lock, JSON.stringify({ schema: 'rift-safe-import-probe-2035-lease/1',
    ownerTask: process.env.CODEX_THREAD_ID ?? null, sourceBindingSha256: sha256(JSON.stringify(before)), workerMayBeLive: true }));
  try {
    writeJson(path.join(run.directory, 'before.json'), { source: before, runtime });
    const result = await safeWorker({ mode: 'import-probe', source: sourceFixture,
      runtime: windowsProbeRuntime, expectedSource: before }, runtimeProbePacket.workerTimeoutMs);
    assert.equal(result.mode, 'import-probe');
    assert.deepEqual(captureSource(sourceFixture), before);
    assert.deepEqual(captureRuntime(windowsProbeRuntime), runtime);
    const receipt = { schema: 'rift-safe-import-probe-2035/1', passed: true, result,
      before, after: before, runtime, sourceBindingSha256: sha256(JSON.stringify(before)),
      scope: runtimeProbePacket.permittedCalls };
    writeJson(run.receipt, receipt);
    releaseOwnedLock(lease);
    return { receiptPath: path.relative(root, run.receipt).split(path.sep).join('/'),
      passed: true, scope: receipt.scope };
  } catch (error) {
    lease.preserve = true; closeOwnedLock(lease);
    writeJson(path.join(run.directory, 'failure.partial.json'), { passed: false,
      reason: String(error?.message ?? error).slice(0, 1800), failureStack: String(error?.stack ?? error).slice(0, 6000),
      workerFailure: error.workerFailure, workerMayBeLive: error.workerMayBeLive === true,
      workerLogs: error.workerLogs, leasePreserved: true, before, runtime });
    throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length === 0) console.log(JSON.stringify(runtimeProbePacket, null, 2));
  else {
    assert.deepEqual(args, ['--import-only'], 'usage: node probe.mjs [--import-only]');
    executeImportProbe().then(result => console.log(JSON.stringify(result)))
      .catch(error => { console.error(JSON.stringify({ passed: false, reason: error.message,
        workerMayBeLive: error.workerMayBeLive === true })); process.exitCode = 1; });
  }
}
