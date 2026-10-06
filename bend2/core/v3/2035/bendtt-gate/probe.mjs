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
export const linuxProbeRuntime = Object.freeze({ engine: 'Node', version: 'v24.6.0', platform: 'linux', arch: 'x64',
  executableSha256: 'e943ee9282bef08233665cb71cc57a9f5794bbe70a4822b38e60e394c15979e2',
  parentExecArgv: [], workerExecArgv: [...safeWorkerFlags], nodeOptions: '', stackSizeMb: 64 });
export const linuxRuntimeProbePacket = Object.freeze({ ...runtimeProbePacket,
  command: ['/home/hailey/.nvm/versions/node/v24.6.0/bin/node', 'bend2/core/v3/2035/bendtt-gate/probe.mjs', '--import-only'],
  runtime: linuxProbeRuntime, workerTimeoutMs: 240_000, quietOuterTimeoutMs: 900_000,
  output: `${runtimeProbePacket.output}; separate observed parent exit0 and checked settlement before accepted review`,
  resourcePolicy: '64MiB actual stack readbacks; memory observations only; kernel full-ancestry/two12GiB admission unchanged',
});

export function importProbePacketForPlatform(platform = process.platform) {
  assert.ok(platform === 'win32' || platform === 'linux', 'unsupported Safe import probe platform');
  return platform === 'win32' ? runtimeProbePacket : linuxRuntimeProbePacket;
}

export async function executeImportProbe() {
  process.env.BEND_NO_TELEMETRY = '1';
  const packet = importProbePacketForPlatform();
  assert.equal(path.resolve(process.execPath), path.resolve(packet.command[0]), 'Safe import probe executable path differs');
  const before = captureSource(sourceFixture), runtime = captureRuntime(packet.runtime);
  const run = createRun('import-probe');
  const lease = acquireOwnedLock(run.lock, JSON.stringify({ schema: 'rift-safe-import-probe-2035-lease/1',
    ownerTask: process.env.CODEX_THREAD_ID ?? null, sourceBindingSha256: sha256(JSON.stringify(before)), workerMayBeLive: true }));
  try {
    writeJson(path.join(run.directory, 'before.json'), { source: before, runtime });
    const result = await safeWorker({ mode: 'import-probe', source: sourceFixture,
      runtime: packet.runtime, expectedSource: before }, packet.workerTimeoutMs);
    assert.equal(result.mode, 'import-probe');
    assert.deepEqual(captureSource(sourceFixture), before);
    assert.deepEqual(captureRuntime(packet.runtime), runtime);
    const receipt = { schema: 'rift-safe-import-probe-2035/1', passed: true, result,
      before, after: before, runtime, sourceBindingSha256: sha256(JSON.stringify(before)),
      scope: packet.permittedCalls };
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
  if (args.length === 0) console.log(JSON.stringify(importProbePacketForPlatform(), null, 2));
  else {
    assert.deepEqual(args, ['--import-only'], 'usage: node probe.mjs [--import-only]');
    executeImportProbe().then(result => console.log(JSON.stringify(result)))
      .catch(error => { console.error(JSON.stringify({ passed: false, reason: error.message,
        workerMayBeLive: error.workerMayBeLive === true })); process.exitCode = 1; });
  }
}
