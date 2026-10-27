// Fixed, one-use Linux CPU C/ELF/package producer. Never invokes the produced ELF.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, resourceLimits } from 'node:worker_threads';
import { config, at, capture, git, loadHelpers, memoryAdmission, containmentSnapshot, read, realDirectory,
  write, writeJson, FLAGS, OUTPUT, bindNativeTools, syncDirectory } from './binding.mjs';

const TIMEOUT = 600_000;
const PROBE = `#define _GNU_SOURCE 1
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
const jsonProcess = r => ({ ...r, stdout: r.stdout?.toString('utf8'), stderr: r.stderr?.toString('utf8') });
function environment(run) {
  return { PATH: '/usr/bin:/bin', HOME: path.join(run, 'home'), TMPDIR: path.join(run, 'tmp'),
    TMP: path.join(run, 'tmp'), TEMP: path.join(run, 'tmp'), LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8',
    BEND_NO_TELEMETRY: '1', NODE_OPTIONS: '', BUN_OPTIONS: '',
    HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', ALL_PROXY: 'http://127.0.0.1:9',
    http_proxy: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', all_proxy: 'http://127.0.0.1:9',
    NO_PROXY: '', no_proxy: '' };
}
function directory(parent, name) {
  realDirectory(parent); const file = path.join(parent, name);
  fs.mkdirSync(file, { mode: 0o700 }); syncDirectory(parent); realDirectory(file); return file;
}
function packageDirectory(run, relative) {
  let current = run;
  for (const part of relative.split('/')) {
    const next = path.join(current, part);
    if (!fs.existsSync(next)) directory(current, part);
    realDirectory(next); current = next;
  }
  return current;
}
async function emissionWorker(h, before, run, runIdentity, containmentIdentity) {
  const worker = new Worker(new URL('./worker.mjs', import.meta.url), { execArgv: [...FLAGS],
    resourceLimits: { stackSizeMb: 64, maxOldGenerationSizeMb: 65536 }, stdout: true, stderr: true,
    workerData: { expected: before, run, runIdentity, containmentIdentity, nativeTools: before.nativeTools.reference } });
  const configured = { ...worker.resourceLimits }, logs = { stdout: [], stderr: [] }, sizes = { stdout: 0, stderr: 0 };
  let failure;
  for (const name of ['stdout', 'stderr']) worker[name].on('data', data => {
    const bytes = Buffer.from(data), room = Math.max(0, 65_536 - sizes[name]);
    sizes[name] += bytes.length; if (room) logs[name].push(bytes.subarray(0, room));
  });
  worker.on('message', value => { if (value?.ok === false) failure = value; });
  let result, primary;
  try { result = await h.lifecycle.settleWorker(worker, { timeoutMs: TIMEOUT, terminateGraceMs: 10_000 }); }
  catch (error) { primary = error; }
  const captured = {};
  try {
    for (const name of ['stdout', 'stderr']) captured[name] = write(path.join(run, `worker.${name}`), Buffer.concat(logs[name]));
  } catch (error) { primary ??= error; }
  if (primary) { primary.workerFailure = failure; primary.workerLogs = { captured, sizes }; throw primary; }
  assert.equal(configured.stackSizeMb, 64); assert.equal(result.actualResourceLimits.stackSizeMb, 64);
  assert.equal(configured.maxOldGenerationSizeMb, 65536); assert.equal(result.actualResourceLimits.maxOldGenerationSizeMb, 65536);
  assert.deepEqual(result.workerExecArgv, FLAGS); assert.equal(result.fetches, 0);
  assert.ok(sizes.stdout <= 65_536 && sizes.stderr <= 65_536, 'Worker logs exceeded retained bound');
  return { ...result, configuredResourceLimits: configured, observedExit: true, exitCode: 0, logs: captured };
}
function retainRawProcess(run, name, result) {
  const rawStreams = {};
  for (const stream of ['stdout', 'stderr']) {
    assert.ok(Buffer.isBuffer(result[stream]), `original ${name} ${stream} is not a Buffer`);
    rawStreams[stream] = write(path.join(run, `${name}.${stream}`), result[stream]);
  }
  return { ...result, rawStreams };
}
async function clang(h, b, run, name, args) {
  assert.equal(read(b.clang.path).identity.sha256, b.clang.sha256);
  let result;
  try { result = await h.supervisor.runOwnedGroup(b.clang.path, args, { cwd: run, env: environment(run),
    timeoutMs: TIMEOUT, maxOutputBytes: 2 * 1024 ** 2, label: `current99 native CPU ${name}` }); }
  catch (error) {
    if (error.partialResult) {
      try {
        error.partialResult = retainRawProcess(run, name, error.partialResult);
        writeJson(path.join(run, `${name}.process-failure.json`), jsonProcess(error.partialResult));
      }
      catch (writeError) { error.receiptWriteError = String(writeError); }
    }
    throw error;
  }
  result = retainRawProcess(run, name, result);
  writeJson(path.join(run, `${name}.process.json`), jsonProcess(result));
  assert.equal(result.status, 0); assert.equal(result.signal, null);
  assert.equal(result.groupQuiescent, true); assert.equal(result.groupStateKnown, true);
  assert.equal(result.outputLimitExceeded, false); assert.equal(result.timedOut, false);
  assert.equal(read(b.clang.path).identity.sha256, b.clang.sha256); return result;
}
function launcher() {
  return `#!/bin/sh
set -eu
package_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
data_dir=$(printenv RIFT_CHESS_DATA_DIR 2>/dev/null || true)
if [ -z "$data_dir" ]; then data_dir="$package_dir/data"; fi
case "$data_dir" in /*) ;; *) data_dir="$package_dir/$data_dir" ;; esac
mkdir -p "$data_dir"
export RIFT_CHESS_DATA_DIR="$data_dir"
export BEND_NO_TELEMETRY=1
cd "$package_dir"
exec "$package_dir/bin/rift-chess-native-v2" --gpu off "$@"
`;
}
export async function buildNativeCpu() {
  assert.equal(arguments.length, 0, 'fixed production binding only');
  const b = config(); assert.deepEqual(process.execArgv, []); assert.deepEqual(resourceLimits, {});
  const before = capture(), h = await loadHelpers();
  const assets = h.assets.collectRuntimeAssets();
  for (const [name, digest] of Object.entries(assets.inputSha256)) {
    assert.equal(b.repositoryInputs[name], digest, `asset input is not fixed: ${name}`);
  }
  const output = at(b.root, OUTPUT);
  git(b, 'check-ignore', '--quiet', OUTPUT);
  if (!fs.existsSync(output)) directory(path.dirname(output), path.basename(output));
  realDirectory(output);
  assert.equal(fs.existsSync(path.join(output, `${b.runName}.intent.json`)), false, 'STOP: one-use build intent already exists');
  assert.equal(fs.existsSync(path.join(output, b.runName)), false, 'STOP: fixed build output already exists');
  const lockPath = path.join(output, 'active-native-cpu.lock');
  let lease, run, stage = 'lease', firstMemory, finalContainment, worker, link, probe, version;
  let emissionAttempted = false, clangLinkAttempted = false, lockPreserved = false;
  try {
    lease = h.lifecycle.acquireOwnedLock(lockPath, JSON.stringify({ schema: 'rift-current99-native-cpu-lease/1',
      ownerTask: b.ownerTask, bindingSha256: before.bindingSha256, runName: b.runName,
      startedAt: new Date().toISOString(), workerMayBeLive: true }));
    stage = 'permanent-intent';
    writeJson(path.join(output, `${b.runName}.intent.json`), { schema: 'rift-current99-native-cpu-intent/1',
      ownerTask: b.ownerTask, bindingSha256: before.bindingSha256, runName: b.runName,
      pid: process.pid, startedAt: new Date().toISOString(), policy: 'one-use; no reset/retry' });
    stage = 'exclusive-run'; run = directory(output, b.runName);
    directory(run, 'home'); directory(run, 'tmp');
    const stat = fs.lstatSync(run, { bigint: true }), runIdentity = { dev: String(stat.dev), ino: String(stat.ino) };
    writeJson(path.join(run, 'before.json'), before);
    stage = 'initial-memory-admission'; firstMemory = memoryAdmission(h.aggregate, 'before-application-load');
    writeJson(path.join(run, 'initial-memory.json'), firstMemory);
    const linker = { ...b, clang: before.clang };
    stage = 'clang-version'; version = await clang(h, linker, run, 'clang-version', ['--version']);
    // Original byte streams are already durably saved; reject invalid UTF-8 in
    // the version protocol rather than parsing replacement-character text.
    const clangMajor = h.assets.parseClangVersion(new TextDecoder('utf-8', { fatal: true })
      .decode(Buffer.concat([version.stdout, version.stderr])));
    stage = 'x11-alsa-headers-link';
    const probeFile = path.join(run, 'x11-alsa-probe.c'); write(probeFile, PROBE);
    probe = await clang(h, linker, run, 'x11-alsa-probe', ['-std=c11', '-O0', '-x', 'c', probeFile,
      '-lpthread', '-lm', '-lX11', '-lasound', '-o', path.join(run, 'x11-alsa-probe')]);
    assert.equal(read(probeFile).bytes.toString('utf8'), PROBE);
    stage = 'application-load-and-c-emission'; emissionAttempted = true;
    worker = await emissionWorker(h, before, run, runIdentity, firstMemory.leaf.identity);
    writeJson(path.join(run, 'worker-success.json'), worker);
    assert.deepEqual(capture(), before); assert.deepEqual(h.assets.collectRuntimeAssets(), assets);
    const cPath = path.join(run, 'NativeV2.c'); assert.deepEqual(read(cPath).identity, worker.emitted);
    stage = 'stage-package-assets'; const pkg = directory(run, 'package'); directory(pkg, 'bin');
    const staged = {};
    for (const row of h.assets.assertAssetRows(assets.rows)) {
      const source = read(at(b.root, row.sourcePath));
      assert.equal(source.identity.sha256, row.sha256); assert.equal(source.identity.bytes, row.bytes);
      packageDirectory(pkg, path.posix.dirname(row.packagePath));
      staged[row.packagePath] = write(at(pkg, row.packagePath), source.bytes);
    }
    writeJson(path.join(pkg, 'runtime-assets.json'), { schema: 'rift-current99-native-runtime-assets/1',
      manifests: assets.manifests, files: staged });
    const shell = write(path.join(pkg, 'run-native-v2.sh'), launcher(), 0o755);
    stage = 'clang-link'; clangLinkAttempted = true;
    const binaryPath = path.join(pkg, 'bin/rift-chess-native-v2');
    assert.equal(fs.existsSync(binaryPath), false);
    link = await clang(h, linker, run, 'clang-link', h.assets.clangCompileArguments(cPath, binaryPath));
    const binaryFd = fs.openSync(binaryPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(binaryFd); } finally { fs.closeSync(binaryFd); }
    const binary = read(binaryPath);
    assert.ok(binary.identity.mode & 0o111); const elf = h.assets.elfIdentity(binary.bytes.subarray(0, 20));
    stage = 'final-source-and-package-recheck'; assert.deepEqual(capture(), before);
    assert.deepEqual(h.assets.collectRuntimeAssets(), assets); assert.deepEqual(read(cPath).identity, worker.emitted);
    for (const [name, identity] of Object.entries(staged)) assert.deepEqual(read(at(pkg, name)).identity, identity);
    assert.deepEqual(read(path.join(pkg, 'run-native-v2.sh')).identity, shell);
    stage = 'final-containment-snapshot';
    finalContainment = containmentSnapshot(h.aggregate, 'final-before-receipt-and-lock-release', firstMemory.leaf.identity);
    const receipt = { schema: 'rift-current99-native-cpu-package/1', passed: true,
      before, after: before, emissionAttempted, clangLinkAttempted,
      memoryAdmissions: [firstMemory, worker.admission], containment: finalContainment, worker,
      clang: { major: clangMajor, version: jsonProcess(version), dependencyProbe: jsonProcess(probe), link: jsonProcess(link) },
      binary: { ...binary.identity, elf }, sourceC: worker.emitted, assets: { original: assets, staged }, launcher: shell,
      parent: { pid: process.pid, resourceLimits: { ...resourceLimits }, execArgv: [...process.execArgv] },
      scope: 'one actual current99 event-overlay application load/book_valid/C emission, CPU ELF link and asset staging; no ELF invocation, GUI/input/PCM/restart/GPU/performance/formal-proof/pin-adoption claim' };
    const receiptPath = path.join(pkg, 'receipt.json');
    h.lifecycle.finalizeOwnedManifest(path.join(pkg, 'receipt.pending'), receiptPath,
      Buffer.from(JSON.stringify(receipt, null, 2) + '\n'), { beforeCommit: () => { assert.deepEqual(capture(), before); } });
    syncDirectory(pkg);
    stage = 'release-owned-lock'; h.lifecycle.releaseOwnedLock(lease); lease = null;
    return { passed: true, receiptPath, receipt: read(receiptPath).identity };
  } catch (error) {
    if (lease) { lease.preserve = true;
      try { h.lifecycle.closeOwnedLock(lease); lockPreserved = true; } catch (closeError) { error.lockCloseError = String(closeError); } }
    let failureContainment;
    try { failureContainment = containmentSnapshot(h.aggregate, 'failure-observation', firstMemory?.leaf.identity ?? null); }
    catch (snapshotError) { failureContainment = snapshotError.memoryAdmission ?? { error: String(snapshotError) }; }
    const failure = { schema: 'rift-current99-native-cpu-failure/1', passed: false, stage, before,
      emissionAttempted, clangLinkAttempted, lockPreserved, workerMayBeLive: error.workerMayBeLive === true,
      memoryAdmissions: [firstMemory, worker?.admission, error.memoryAdmission].filter(Boolean),
      containment: finalContainment ?? failureContainment,
      worker: worker ?? null, workerFailure: error.workerFailure ?? null, workerLogs: error.workerLogs ?? null,
      partialProcess: error.partialResult ? jsonProcess(error.partialResult) : null,
      reason: String(error.message ?? error), stack: String(error.stack ?? error).slice(0, 8000),
      lockCloseError: error.lockCloseError ?? null, receiptWriteError: error.receiptWriteError ?? null,
      scope: 'failed/incomplete one-use build; preserve intent, lock and partial bytes; no reset/retry' };
    const file = path.join(run ?? output, run ? 'failure.json' : `${b.runName}.early-failure.json`);
    try { writeJson(file, failure); error.failureReceipt = file; }
    catch (writeError) { error.receiptWriteError = String(writeError); }
    error.lockPreserved = lockPreserved; throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  Promise.resolve().then(() => {
    assert.equal(process.argv.length, 6, 'usage: node <fixed armed producer>/run.mjs --native-tools <json> --native-tools-sha256 <sha256>');
    assert.equal(process.argv[2], '--native-tools'); assert.equal(process.argv[4], '--native-tools-sha256');
    bindNativeTools({ path: process.argv[3], sha256: process.argv[5] }); return buildNativeCpu();
  }).then(value => console.log(JSON.stringify(value))).catch(error => {
    console.error(JSON.stringify({ passed: false, reason: String(error.message ?? error),
      failureReceipt: error.failureReceipt ?? null, lockPreserved: error.lockPreserved === true,
      workerMayBeLive: error.workerMayBeLive === true, receiptWriteError: error.receiptWriteError ?? null }));
    process.exitCode = 1;
  });
}
