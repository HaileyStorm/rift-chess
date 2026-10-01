// Linux-only, isolated 2.0.32 NativeV2 C/ELF/package candidate. Never changes a source checkout.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import {
  DEFAULT_CANDIDATE_PROFILE_ID, CLANG_TIMEOUT_MS, EMIT_TIMEOUT_MS,
  MEMORY_FLOOR_BYTES, MEMORY_PEAK_KIB, MEMORY_PEAK_REVISION,
  NATIVE_PATCHED_SHA256, ROOT, WORKER_STACK_SIZE_MB, assertAssetRows,
  assertCandidateProfileBinding, assertExactInputBindings, assertLinuxNode,
  assertRealDirectory, assertRegularFile,
  assertRunDirectory, clangCompileArguments, collectRuntimeAssets, createRunDirectory,
  elfIdentity, isolatedEnvironment,
  makePackageDirectory, parseClangVersion, readBuildInputs,
  readJson, requireMemoryAdmission, resolveCandidateProfile, runOwnedProcess, sha256, sha256File,
  sampleMemoryAdmission, snapshotCandidate, snapshotRoot, snapshotToolchains,
  writeExclusive, writeJsonExclusive,
} from './common.mjs';

const SCRIPT = fileURLToPath(import.meta.url);
const HERE = path.dirname(SCRIPT);
const COMMON = path.join(HERE, 'common.mjs');
const EMIT_WORKER = path.join(HERE, 'emit-worker.mjs');
const EMIT_WORKER_TIMEOUT_MS = EMIT_TIMEOUT_MS - 20_000;
const EMIT_WORKER_TERMINATE_GRACE_MS = 10_000;
const PROBE_C = `#define _GNU_SOURCE 1
#include <X11/Xlib.h>
#include <alsa/asoundlib.h>
int main(int argc, char **argv) {
  if (argc == 2147483647) {
    (void)XOpenDisplay(argv[0]);
    snd_pcm_t *pcm = 0;
    return snd_pcm_open(&pcm, "default", SND_PCM_STREAM_PLAYBACK, 0);
  }
  return 0;
}
`;

function scriptHashes() {
  for (const file of [SCRIPT, COMMON, EMIT_WORKER]) assertRegularFile(file);
  return { build: sha256File(SCRIPT), common: sha256File(COMMON), worker: sha256File(EMIT_WORKER) };
}

export function emissionWorkerOptions(data) {
  assert.ok(data && typeof data === 'object');
  assert.equal(data.workerStackSizeMb, WORKER_STACK_SIZE_MB);
  return { workerData: data, resourceLimits: { stackSizeMb: WORKER_STACK_SIZE_MB }, execArgv: [] };
}

export function assertEmissionWorkerSuccess(result, sourceReceipt, profileId = DEFAULT_CANDIDATE_PROFILE_ID) {
  const expectedProfile = resolveCandidateProfile(profileId);
  assert.equal(result?.schema, 'rift-native-v2-2032-linux-cpu-worker/1');
  assert.equal(result.ok, true);
  assert.deepEqual(result.candidateProfile, expectedProfile);
  assert.deepEqual(sourceReceipt?.candidateProfile, expectedProfile);
  assert.equal(result.worker?.stackSizeMb, WORKER_STACK_SIZE_MB, 'emission Worker stackSizeMb must be 64 MiB');
  assert.ok(Number.isInteger(result.worker.threadId) && result.worker.threadId > 0);
  assert.equal(result.worker.exitObserved, true, 'emission Worker exitObserved must be true');
  assert.equal(result.worker.exitCode, 0, 'emission Worker did not exit successfully');
  assert.equal(sourceReceipt?.worker?.stackSizeMb, WORKER_STACK_SIZE_MB,
    'source receipt does not bind the 64-MiB Worker stack');
  assert.equal(sourceReceipt.worker.threadId, result.worker.threadId,
    'source receipt Worker identity differs from the supervisor');
  assert.equal(result.immediatelyBeforeCEmission?.phase, 'immediately-before-c-emission');
  return true;
}

class EmissionWorkerError extends Error {
  constructor(message, { timedOut = false, workerMayBeLive = false,
    secondMemoryAdmission = null, worker = null } = {}) {
    super(message); this.name = 'EmissionWorkerError'; this.timedOut = timedOut;
    this.workerMayBeLive = workerMayBeLive; this.secondMemoryAdmission = secondMemoryAdmission;
    this.worker = worker;
  }
}

function superviseEmissionWorker(data) {
  return new Promise((resolve, reject) => {
    let worker;
    try { worker = new Worker(new URL('./emit-worker.mjs', import.meta.url), emissionWorkerOptions(data)); }
    catch (error) { reject(new EmissionWorkerError(`could not create 64-MiB emission Worker: ${error?.message ?? error}`)); return; }
    const initialThreadId = worker.threadId;
    let timeoutHandle;
    let terminateGraceHandle;
    let timedOut = false;
    let exitObserved = false;
    let exitCode;
    let workerError = null;
    let protocolError = null;
    let workerFailure = null;
    let workerResult = null;
    let secondMemoryAdmission = null;
    let settled = false;
    const workerInfo = () => ({ threadId: initialThreadId, stackSizeMb: WORKER_STACK_SIZE_MB,
      exitObserved, exitCode });
    const done = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      clearTimeout(terminateGraceHandle);
      callback(value);
    };
    worker.on('message', (message) => {
      if (!message || typeof message !== 'object') {
        protocolError = new Error('emission Worker sent a non-object message'); return;
      }
      if (message.type === 'memory-admission') {
        if (message.phase !== 'immediately-before-c-emission-memory-admission'
          || message.sample?.phase !== 'immediately-before-c-emission') {
          protocolError = new Error('emission Worker sent an invalid memory-admission checkpoint');
        } else secondMemoryAdmission = message.sample;
      } else if (message.type === 'failure') {
        workerFailure = message;
        secondMemoryAdmission = message.secondMemoryAdmission ?? secondMemoryAdmission;
      } else if (message.type === 'result') {
        if (workerResult !== null) protocolError = new Error('emission Worker sent duplicate result messages');
        else workerResult = message.result;
      } else protocolError = new Error(`emission Worker sent unknown message type: ${String(message.type)}`);
    });
    worker.once('error', (error) => { workerError = error; });
    worker.once('exit', (code) => {
      exitObserved = true; exitCode = code;
      if (timedOut) {
        done(reject, new EmissionWorkerError(`64-MiB source/emission Worker timed out after ${EMIT_WORKER_TIMEOUT_MS} ms; exit observed`,
          { timedOut: true, secondMemoryAdmission, worker: workerInfo() }));
      } else if (workerError) {
        done(reject, new EmissionWorkerError(`64-MiB source/emission Worker errored: ${workerError.stack ?? workerError.message}`,
          { secondMemoryAdmission, worker: workerInfo() }));
      } else if (protocolError) {
        done(reject, new EmissionWorkerError(protocolError.message,
          { secondMemoryAdmission, worker: workerInfo() }));
      } else if (workerFailure) {
        done(reject, new EmissionWorkerError(workerFailure.error ?? '64-MiB source/emission Worker failed',
          { secondMemoryAdmission, worker: workerInfo() }));
      } else if (code !== 0 || workerResult === null) {
        done(reject, new EmissionWorkerError(`64-MiB source/emission Worker exited without success (code ${code})`,
          { secondMemoryAdmission, worker: workerInfo() }));
      } else {
        done(resolve, { ...workerResult, worker: workerInfo() });
      }
    });
    timeoutHandle = setTimeout(() => {
      if (settled) return;
      timedOut = true;
      let termination;
      try { termination = worker.terminate(); }
      catch (error) {
        done(reject, new EmissionWorkerError(`Worker termination request failed: ${error?.message ?? error}`,
          { timedOut: true, workerMayBeLive: true, secondMemoryAdmission, worker: workerInfo() }));
        worker.unref();
        return;
      }
      terminateGraceHandle = setTimeout(() => {
        if (settled || exitObserved) return;
        worker.unref();
        done(reject, new EmissionWorkerError('64-MiB Worker did not report termination within 10 seconds; thread state is ambiguous',
          { timedOut: true, workerMayBeLive: true, secondMemoryAdmission, worker: workerInfo() }));
      }, EMIT_WORKER_TERMINATE_GRACE_MS);
      Promise.resolve(termination).then(() => {
        if (settled) return;
        if (exitObserved) return;
        done(reject, new EmissionWorkerError('64-MiB Worker termination completed; exit event was not yet observed',
          { timedOut: true, workerMayBeLive: false, secondMemoryAdmission, worker: workerInfo() }));
      }, (error) => {
        if (settled) return;
        worker.unref();
        done(reject, new EmissionWorkerError(`Worker termination could not be confirmed: ${error?.message ?? error}`,
          { timedOut: true, workerMayBeLive: true, secondMemoryAdmission, worker: workerInfo() }));
      });
    }, EMIT_WORKER_TIMEOUT_MS);
  });
}

export function parseBuildArguments(args) {
  assert.ok(Array.isArray(args));
  if (args[0] === '--child') {
    assert.ok(args.length === 6 || args.length === 7,
      'internal usage: --child <run-dir> <dev> <ino> <candidate> <plan-sha256> [profile-id]');
    const runDirectory = path.resolve(args[1]);
    assert.match(args[2], /^\d+$/); assert.match(args[3], /^\d+$/);
    assert.ok(path.isAbsolute(args[4])); assert.match(args[5], /^[0-9a-f]{64}$/);
    const profileId = args[6] ?? DEFAULT_CANDIDATE_PROFILE_ID;
    resolveCandidateProfile(profileId);
    return { child: true, runDirectory, identity: { dev: args[2], ino: args[3] },
      candidate: args[4], planSha256: args[5], profileId };
  }
  assert.ok((args.length === 2 || args.length === 4) && args[0] === '--candidate'
    && (args.length === 2 || args[2] === '--profile'),
  'usage: node build.mjs --candidate <absolute-event-patched-checkout> [--profile <closed-profile-id>]');
  assert.ok(path.isAbsolute(args[1]), '--candidate must be an absolute path');
  const profileId = args[3] ?? DEFAULT_CANDIDATE_PROFILE_ID;
  resolveCandidateProfile(profileId);
  return { child: false, candidate: args[1], profileId };
}

function assertCleanCurrentCheckout() {
  assert.deepEqual(snapshotRoot().status, '');
}

function writeFailure(runDirectory, identity, phase, error, plan = null, secondMemoryAdmission = null,
  profileId = DEFAULT_CANDIDATE_PROFILE_ID) {
  try {
    assertRunDirectory(runDirectory, identity);
    const file = path.join(runDirectory, 'failure.json');
    if (fs.existsSync(file)) return;
    const candidateProfile = plan?.candidateProfile ?? resolveCandidateProfile(profileId);
    const profile = assertCandidateProfileBinding(candidateProfile);
    writeJsonExclusive(file, {
      schema: 'rift-native-v2-2032-linux-cpu-failure/1', ok: false,
      phase, error: String(error?.message ?? error).slice(0, 2400),
      workerMayBeLive: Boolean(error?.workerMayBeLive), timedOut: Boolean(error?.timedOut),
      candidateProfile, candidateCommit: profile.sourceCommit, candidateTree: profile.sourceTree,
      planSha256: plan?.planSha256 ?? null,
      initialMemoryAdmission: plan?.initialMemoryAdmission ?? null,
      secondMemoryAdmission: secondMemoryAdmission ?? plan?.secondMemoryAdmission ?? null,
      runDirectory,
    });
  } catch { /* preserve the original failure; never replace existing evidence */ }
}

function makePlan(candidate, initialAdmission, profileId = DEFAULT_CANDIDATE_PROFILE_ID) {
  const hashes = scriptHashes();
  const inputs = readBuildInputs(candidate, hashes, profileId);
  return {
    schema: 'rift-native-v2-2032-linux-cpu-plan/1',
    evidenceClass: 'source-bound-Linux-build-plan-not-emission',
    createdAt: new Date().toISOString(),
    root: inputs.root,
    candidateProfile: inputs.candidateProfile,
    candidate: inputs.candidate,
    toolchains: inputs.toolchains,
    packageInputs: inputs.assets,
    patchSha256: inputs.patchSha256,
    eolHelperSha256: inputs.eolHelperSha256,
    localScriptHashes: hashes,
    initialMemoryAdmission: initialAdmission,
  };
}

async function chooseClang(requested, runDirectory, env) {
  const names = requested ? [requested] : ['clang', ...Array.from({ length: 17 }, (_, i) => `clang-${30 - i}`)];
  const reports = [];
  for (const name of names) {
    let executable = path.isAbsolute(name) ? name : undefined;
    if (!executable && !name.includes('/') && !name.includes('\\')) {
      for (const directory of (env.PATH ?? '').split(path.delimiter).filter(Boolean)) {
        const candidate = path.resolve(directory, name);
        try { fs.accessSync(candidate, fs.constants.X_OK); executable = candidate; break; }
        catch { /* try the next PATH entry */ }
      }
    }
    if (!executable) { reports.push(`${name}: unavailable`); continue; }
    let resolved;
    try { resolved = fs.realpathSync(executable); assertRegularFile(resolved, { executable: true }); }
    catch { reports.push(`${name}: not a real executable`); continue; }
    const query = await runOwnedProcess(resolved, ['--version'], { cwd: runDirectory, env,
      timeoutMs: 15_000, maxOutputBytes: 128_000, label: 'Clang version query' }).catch((error) => {
      if (error?.workerMayBeLive) throw error;
      reports.push(`${name}: ${String(error?.message ?? error).slice(0, 300)}`); return null;
    });
    if (!query) continue;
    const output = Buffer.concat([query.stdout, query.stderr]).toString('utf8');
    try {
      const version = parseClangVersion(output);
      return { name, path: resolved, version, sha256: sha256File(resolved),
        versionOutput: output.trim().split(/\r?\n/)[0] };
    } catch (error) { reports.push(`${name}: ${String(error?.message ?? error)}`); }
  }
  throw new Error(`installed Clang 14+ is required; no installation is attempted (${reports.join('; ')})`);
}

async function runClang(executable, args, { cwd, env, logPath, label, timeoutMs }) {
  let result;
  try {
    result = await runOwnedProcess(executable, args, { cwd, env, timeoutMs,
      maxOutputBytes: 2 * 1024 * 1024, label });
  } catch (error) {
    if (error?.result && !fs.existsSync(logPath)) {
      try { writeExclusive(logPath, Buffer.concat([error.result.stdout, error.result.stderr])); } catch { }
    }
    throw error;
  }
  writeExclusive(logPath, Buffer.concat([result.stdout, result.stderr]));
  return { command: [executable, ...args], pid: result.pid, exitCode: result.status,
    signal: result.signal, durationMs: result.durationMs, log: path.relative(path.dirname(logPath), logPath),
    logSha256: sha256File(logPath) };
}

function writeLauncher(file) {
  const script = `#!/bin/sh
set -eu
package_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
data_dir=$(printenv RIFT_CHESS_DATA_DIR 2>/dev/null || true)
if [ -z "$data_dir" ]; then data_dir="$package_dir/data"; fi
case "$data_dir" in /*) ;; *) data_dir="$package_dir/$data_dir" ;; esac
mkdir -p "$data_dir"
if [ ! -d "$data_dir" ]; then
  printf '%s\\n' "NativeV2 data path is not a directory: $data_dir" >&2
  exit 2
fi
export RIFT_CHESS_DATA_DIR="$data_dir"
export BEND_NO_TELEMETRY=1
cd "$package_dir"
exec "$package_dir/bin/rift-chess-native-v2" --gpu off "$@"
`;
  return writeExclusive(file, Buffer.from(script, 'utf8'), 0o755);
}

async function runChild({ runDirectory, identity, candidate, planSha256,
  profileId = DEFAULT_CANDIDATE_PROFILE_ID }) {
  assertLinuxNode({ child: true });
  const selectedProfile = resolveCandidateProfile(profileId);
  assertRunDirectory(runDirectory, identity);
  const home = path.join(runDirectory, 'home'); const tmp = path.join(runDirectory, 'tmp');
  assertRealDirectory(home); assertRealDirectory(tmp);
  const planPath = path.join(runDirectory, 'plan.json');
  assertRegularFile(planPath);
  assert.equal(sha256File(planPath), planSha256, 'persisted plan checksum changed');
  const plan = readJson(planPath);
  assert.equal(plan.schema, 'rift-native-v2-2032-linux-cpu-plan/1');
  assert.deepEqual(snapshotRoot(), plan.root, 'root checkout changed after plan creation');
  assert.deepEqual(plan.candidateProfile, selectedProfile);
  assertCandidateProfileBinding(plan.candidateProfile, plan.candidate);
  assert.deepEqual(snapshotCandidate(candidate, profileId), plan.candidate, 'candidate changed after plan creation');
  assert.deepEqual(snapshotToolchains(), plan.toolchains, 'compiler stack changed after plan creation');
  assert.deepEqual(collectRuntimeAssets(), plan.packageInputs, 'package assets changed after plan creation');
  assert.equal(plan.candidate.commit, selectedProfile.sourceCommit);
  assert.equal(plan.candidate.tree, selectedProfile.sourceTree);
  assert.equal(plan.candidate.sourceSha256['bend2/NativeV2.bend'], NATIVE_PATCHED_SHA256);
  assert.equal(plan.initialMemoryAdmission.phase, 'initial-preflight');
  requireMemoryAdmission(plan.initialMemoryAdmission);
  assert.deepEqual(scriptHashes(), plan.localScriptHashes, 'harness sources differ from preflight');
  let secondMemoryAdmission = null;
  try {
    const result = await superviseEmissionWorker({
      schema: 'rift-native-v2-2032-linux-emission-worker/1',
      runDirectory, identity, candidate, planSha256,
      candidateProfile: plan.candidateProfile,
      localScriptHashes: plan.localScriptHashes,
      workerStackSizeMb: WORKER_STACK_SIZE_MB,
    });
    secondMemoryAdmission = result.immediatelyBeforeCEmission;
    requireMemoryAdmission(secondMemoryAdmission);
    const sourceReceiptPath = path.join(runDirectory, 'source-check.json');
    assertRegularFile(sourceReceiptPath);
    assert.equal(sha256File(sourceReceiptPath), result.sourceReceiptSha256);
    const sourceReceipt = readJson(sourceReceiptPath);
    assert.equal(sourceReceipt.schema, 'rift-native-v2-2032-linux-source-check/1');
    assert.equal(sourceReceipt.ok, true);
    assertEmissionWorkerSuccess(result, sourceReceipt, profileId);
    const memoryAdmissionPath = path.join(runDirectory, 'emission-memory-admission.json');
    assertRegularFile(memoryAdmissionPath);
    assert.deepEqual(readJson(memoryAdmissionPath), secondMemoryAdmission,
      'durable second memory sample differs from Worker result');
    const cPath = path.join(runDirectory, 'NativeV2.c');
    assertRegularFile(cPath);
    assert.equal(fs.statSync(cPath).size, result.cBytes);
    assert.equal(sha256File(cPath), result.cSha256);
    assert.equal(fs.readFileSync(cPath).includes(0x0d), false);
    const inputSnapshot = { candidateProfile: plan.candidateProfile,
      candidate: plan.candidate, toolchains: plan.toolchains,
      assets: plan.packageInputs, root: plan.root, patchSha256: plan.patchSha256,
      eolHelperSha256: plan.eolHelperSha256, localScriptHashes: plan.localScriptHashes };
    assertExactInputBindings(inputSnapshot, candidate, scriptHashes());
    const workerSuccess = { ...result, planSha256, workerStackSizeMb: WORKER_STACK_SIZE_MB };
    writeJsonExclusive(path.join(runDirectory, 'worker-success.json'), workerSuccess);
    process.stdout.write(`${JSON.stringify(workerSuccess)}\n`);
  } catch (error) {
    secondMemoryAdmission = error?.secondMemoryAdmission ?? secondMemoryAdmission;
    try {
      writeJsonExclusive(path.join(runDirectory, 'worker-failure.json'), {
        schema: 'rift-native-v2-2032-linux-cpu-worker-failure/1', ok: false,
        candidateProfile: plan.candidateProfile,
        phase: error?.timedOut ? 'emission-worker-timeout' : 'source-check-or-c-emission',
        error: String(error?.message ?? error).slice(0, 2400),
        timedOut: Boolean(error?.timedOut), workerMayBeLive: Boolean(error?.workerMayBeLive),
        secondMemoryAdmission, worker: error?.worker ?? null,
        workerStackSizeMb: WORKER_STACK_SIZE_MB, planSha256, runDirectory,
      });
    } catch { }
    throw error;
  }
}

async function runParent(candidate, profileId = DEFAULT_CANDIDATE_PROFILE_ID) {
  assertLinuxNode();
  const selectedProfile = resolveCandidateProfile(profileId);
  assertCleanCurrentCheckout();
  const { directory: runDirectory, identity } = createRunDirectory();
  fs.mkdirSync(path.join(runDirectory, 'home'), { mode: 0o700 });
  fs.mkdirSync(path.join(runDirectory, 'tmp'), { mode: 0o700 });
  let plan = null;
  let phase = 'initial-memory-admission';
  try {
    const firstSample = sampleMemoryAdmission('initial-preflight');
    plan = { candidateProfile: selectedProfile, initialMemoryAdmission: firstSample };
    requireMemoryAdmission(firstSample);
    plan = makePlan(candidate, firstSample, profileId);
    const planPath = path.join(runDirectory, 'plan.json');
    writeJsonExclusive(planPath, plan);
    const planSha256 = sha256File(planPath);
    const env = isolatedEnvironment(runDirectory);
    const logDirectory = path.join(runDirectory, 'logs');
    fs.mkdirSync(logDirectory, { mode: 0o700 }); assertRealDirectory(logDirectory);
    phase = 'clang-x11-alsa-preflight';
    const clang = await chooseClang(null, runDirectory, env);
    const probeSource = path.join(runDirectory, 'x11-alsa-probe.c');
    writeExclusive(probeSource, Buffer.from(PROBE_C, 'utf8'));
    const probe = await runClang(clang.path,
      ['-std=c11', '-O0', '-x', 'c', probeSource, '-lpthread', '-lm', '-lX11', '-lasound', '-o', '/dev/null'],
      { cwd: runDirectory, env, logPath: path.join(logDirectory, 'clang-probe.log'),
        label: 'X11/ALSA headers and link probe', timeoutMs: 30_000 });
    assert.equal(sha256File(probeSource), sha256(Buffer.from(PROBE_C, 'utf8')));
    assert.equal(sha256File(clang.path), clang.sha256, 'Clang executable changed after dependency probe');
    const args = [SCRIPT, '--child', runDirectory, identity.dev, identity.ino, candidate,
      planSha256, profileId];
    phase = 'source-check-and-c-emission';
    let result;
    try {
      result = await runOwnedProcess(process.execPath, args, { cwd: ROOT,
        env: isolatedEnvironment(runDirectory), timeoutMs: EMIT_TIMEOUT_MS,
        maxOutputBytes: 2 * 1024 * 1024, label: 'NativeV2 2.0.32 source/C worker' });
    } catch (error) {
      const childResult = error?.result;
      let workerFailure = null;
      try { workerFailure = readJson(path.join(runDirectory, 'worker-failure.json')); } catch { }
      let durableMemoryAdmission = null;
      try { durableMemoryAdmission = readJson(path.join(runDirectory, 'emission-memory-admission.json')); } catch { }
      const secondMemoryAdmission = workerFailure?.secondMemoryAdmission ?? durableMemoryAdmission;
      if (childResult) {
        try { writeExclusive(path.join(runDirectory, 'worker.stdout.txt'), childResult.stdout); } catch { }
        try { writeExclusive(path.join(runDirectory, 'worker.stderr.txt'), childResult.stderr); } catch { }
      }
      try {
        writeJsonExclusive(path.join(runDirectory, 'process-failure.json'), {
          schema: 'rift-native-v2-2032-linux-cpu-process-failure/1', ok: false,
          candidateProfile: plan.candidateProfile,
          planSha256, error: String(error?.message ?? error).slice(0, 2400),
          timedOut: Boolean(error?.timedOut), workerMayBeLive: Boolean(error?.workerMayBeLive),
          secondMemoryAdmission,
          child: childResult ? { pid: childResult.pid, status: childResult.status,
            signal: childResult.signal, durationMs: childResult.durationMs,
            outputBytes: childResult.outputBytes } : null,
        });
      } catch { }
      writeFailure(runDirectory, identity, 'supervised-worker', error, {
        candidateProfile: plan.candidateProfile, planSha256,
        initialMemoryAdmission: plan.initialMemoryAdmission,
      }, secondMemoryAdmission, profileId);
      throw error;
    }
    assertRunDirectory(runDirectory, identity);
    writeExclusive(path.join(runDirectory, 'worker.stdout.txt'), result.stdout);
    writeExclusive(path.join(runDirectory, 'worker.stderr.txt'), result.stderr);
    const workerResult = JSON.parse(result.stdout.toString('utf8'));
    assert.equal(workerResult.ok, true);
    assert.equal(workerResult.planSha256, planSha256);
    const persistedWorker = readJson(path.join(runDirectory, 'worker-success.json'));
    assert.deepEqual(persistedWorker, workerResult, 'worker stdout differs from retained worker receipt');
    const sourceReceiptPath = path.join(runDirectory, 'source-check.json');
    assertRegularFile(sourceReceiptPath);
    assert.equal(sha256File(sourceReceiptPath), workerResult.sourceReceiptSha256);
    const sourceReceipt = readJson(sourceReceiptPath);
    assert.equal(sourceReceipt.schema, 'rift-native-v2-2032-linux-source-check/1');
    assert.equal(sourceReceipt.ok, true);
    assert.deepEqual(workerResult.candidateProfile, plan.candidateProfile);
    assertEmissionWorkerSuccess(workerResult, sourceReceipt, profileId);
    const cPath = path.join(runDirectory, 'NativeV2.c');
    assertRegularFile(cPath);
    assert.equal(fs.statSync(cPath).size, workerResult.cBytes);
    assert.equal(sha256File(cPath), workerResult.cSha256);
    assert.equal(workerResult.immediatelyBeforeCEmission.phase, 'immediately-before-c-emission');
    requireMemoryAdmission(workerResult.immediatelyBeforeCEmission);
    const inputSnapshot = {
      candidateProfile: plan.candidateProfile,
      candidate: plan.candidate, toolchains: plan.toolchains, assets: plan.packageInputs,
      root: plan.root, patchSha256: plan.patchSha256, eolHelperSha256: plan.eolHelperSha256,
      localScriptHashes: plan.localScriptHashes,
    };
    const currentScripts = scriptHashes();
    assertExactInputBindings(inputSnapshot, candidate, currentScripts);

    assert.equal(sha256File(clang.path), clang.sha256, 'Clang changed during C emission');

    phase = 'package-input-staging';
    const packageDirectory = makePackageDirectory(runDirectory, 'package');
    const binDirectory = makePackageDirectory(runDirectory, 'package/bin');
    const stagedAssets = {};
    assertAssetRows(plan.packageInputs.rows);
    for (const row of plan.packageInputs.rows) {
      const source = path.join(ROOT, ...row.sourcePath.split('/'));
      assertRegularFile(source);
      const bytes = fs.readFileSync(source);
      assert.equal(bytes.length, row.bytes); assert.equal(sha256(bytes), row.sha256);
      const target = path.join(packageDirectory, ...row.packagePath.split('/'));
      const relativeParent = path.relative(runDirectory, path.dirname(target)).split(path.sep).join('/');
      makePackageDirectory(runDirectory, relativeParent);
      const staged = writeExclusive(target, bytes);
      assert.deepEqual(staged, { bytes: row.bytes, sha256: row.sha256 });
      stagedAssets[row.packagePath] = { bytes: staged.bytes, sha256: staged.sha256,
        sourcePath: row.sourcePath, manifest: row.manifest, kind: row.kind };
    }
    assert.deepEqual(collectRuntimeAssets(), plan.packageInputs, 'asset source changed during staging');
    const runtimeManifest = {
      schema: 'rift-native-v2-2032-linux-runtime-assets/1',
      sourceManifests: plan.packageInputs.manifests,
      files: Object.fromEntries(Object.entries(stagedAssets).filter(([name]) => name.startsWith('assets/'))),
    };
    writeJsonExclusive(path.join(packageDirectory, 'runtime-assets.json'), runtimeManifest);
    const launcher = writeLauncher(path.join(packageDirectory, 'run-native-v2.sh'));
    assert.ok((fs.statSync(path.join(packageDirectory, 'run-native-v2.sh')).mode & 0o111) !== 0);

    phase = 'clang-link';
    const binary = path.join(binDirectory, 'rift-chess-native-v2');
    assert.equal(fs.existsSync(binary), false, 'refuse to overwrite an ELF artifact');
    const linkArgs = clangCompileArguments(cPath, binary);
    const link = await runClang(clang.path, linkArgs, { cwd: runDirectory, env,
      logPath: path.join(logDirectory, 'clang-link.log'), label: 'CPU x86-64 NativeV2 ELF link',
      timeoutMs: CLANG_TIMEOUT_MS });
    assert.equal(sha256File(clang.path), clang.sha256, 'Clang executable changed during link');
    assertRegularFile(binary, { executable: true });
    const header = Buffer.alloc(20); const fd = fs.openSync(binary, 'r');
    try { assert.equal(fs.readSync(fd, header, 0, 20, 0), 20); } finally { fs.closeSync(fd); }
    const elf = elfIdentity(header);
    const binaryArtifact = { bytes: fs.statSync(binary).size, sha256: sha256File(binary), elf };
    assert.ok(binaryArtifact.bytes > 0);

    phase = 'final-input-and-package-verification';
    assertExactInputBindings(inputSnapshot, candidate, scriptHashes());
    assert.equal(sha256File(cPath), workerResult.cSha256);
    for (const [packagePath, expected] of Object.entries(stagedAssets)) {
      const file = path.join(packageDirectory, ...packagePath.split('/'));
      assertRegularFile(file); assert.equal(fs.statSync(file).size, expected.bytes);
      assert.equal(sha256File(file), expected.sha256);
    }
    const runtimeManifestPath = path.join(packageDirectory, 'runtime-assets.json');
    const packageReceipt = {
      schema: 'rift-native-v2-2032-linux-cpu-package/1', ok: true,
      evidenceClass: 'source-bound-Linux-C-emission-and-ELF-link',
      completedAt: new Date().toISOString(), root: plan.root,
      candidateProfile: plan.candidateProfile, candidate: plan.candidate,
      compiler: plan.toolchains,
      memoryAdmission: { policy: { floorBytes: MEMORY_FLOOR_BYTES, floorGiB: 88,
        observedPeakKiB: MEMORY_PEAK_KIB, observedPeakSourceRevision: MEMORY_PEAK_REVISION,
        marginMultiple: 1.25, historicalOnly: true }, initial: plan.initialMemoryAdmission,
        immediatelyBeforeCEmission: workerResult.immediatelyBeforeCEmission },
      source: sourceReceipt,
      clang: { ...clang, dependencyProbe: probe, link },
      emittedC: { file: '../NativeV2.c', bytes: workerResult.cBytes,
        sha256: workerResult.cSha256, newlineMode: 'LF' },
      binary: { path: 'bin/rift-chess-native-v2', ...binaryArtifact },
      runtimeAssets: { sourceManifests: plan.packageInputs.manifests, files: stagedAssets,
        runtimeManifest: { path: 'runtime-assets.json', bytes: fs.statSync(runtimeManifestPath).size,
          sha256: sha256File(runtimeManifestPath) } },
      launcher: { path: 'run-native-v2.sh', ...launcher },
      acceptanceLimits: [
        'The event-patched source was loaded and book_valid completed; frozen Laws were not run or modified.',
        'C emission and Clang linking were performed locally on Linux; no GUI, input, PCM/audio, restart, or GPU test ran.',
        'Asset files were hash-checked and staged; this is not a complete application/runtime acceptance test.',
        'The canonical 2.0.27 pin and pristine 2.0.32 scout were verified unchanged; no pin amendment or release is implied.',
      ],
    };
    writeJsonExclusive(path.join(packageDirectory, 'receipt.json'), packageReceipt);
    const packageReceiptSha256 = sha256File(path.join(packageDirectory, 'receipt.json'));
    writeJsonExclusive(path.join(runDirectory, 'process-success.json'), {
      schema: 'rift-native-v2-2032-linux-cpu-process/1', ok: true,
      candidateProfile: plan.candidateProfile,
      runDirectory, planSha256, worker: { pid: result.pid, status: result.status,
        signal: result.signal, durationMs: result.durationMs },
      packageReceiptSha256, clang: { path: clang.path, sha256: clang.sha256, version: clang.version,
        probeLog: probe.log, linkLog: link.log },
    });
    process.stdout.write(`${JSON.stringify({ ok: true, runDirectory,
      package: path.join(packageDirectory, 'receipt.json'),
      cBytes: workerResult.cBytes, cSha256: workerResult.cSha256,
      elfBytes: binaryArtifact.bytes, elfSha256: binaryArtifact.sha256,
      packageReceiptSha256,
      next: 'separate GUI, input, PCM, persistence/restart and Linux-owner review gates' })}\n`);
  } catch (error) {
    writeFailure(runDirectory, identity, phase, error, plan, null, profileId);
    process.stderr.write(`NativeV2 Linux build failed; partial run retained at ${runDirectory}: ${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

async function main() {
  const parsed = parseBuildArguments(process.argv.slice(2));
  if (parsed.child) {
    await runChild(parsed);
    return;
  }
  await runParent(parsed.candidate, parsed.profileId);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(SCRIPT)) {
  main().catch((error) => {
    process.stderr.write(`${String(error?.stack ?? error).slice(0, 4000)}\n`);
    process.exitCode = 1;
  });
}

export { runChild, runParent };
