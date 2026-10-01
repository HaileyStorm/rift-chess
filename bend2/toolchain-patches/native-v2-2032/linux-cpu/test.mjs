// Deterministic contract tests only: no C emission, native process, or output directory.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CANDIDATE_COMMIT, CANDIDATE_PROFILES, CANDIDATE_TREE, CANONICAL_COMMIT,
  CURRENT_VISUAL_CANDIDATE_PROFILE_ID, DEFAULT_CANDIDATE_PROFILE_ID,
  EXPECTED_PACKAGE_PATHS, LEGACY_CANDIDATE_PROFILE_ID,
  MEMORY_FLOOR_BYTES, NATIVE_PATCHED_SHA256, PATCH_SHA256, SCOUT_COMMIT, WORKER_STACK_SIZE_MB,
  assertAssetRows, assertCandidateProfileBinding,
  cgroupHeadroomFromRows, clangCompileArguments, elfIdentity,
  linuxMemorySnapshot, memoryAdmission, parseCgroupV2Path, parseClangVersion,
  parseMemAvailable, requireMemoryAdmission, resolveCandidateProfile, sampleMemoryAdmission, sha256,
} from './common.mjs';
import { assertEmissionWorkerSuccess, emissionWorkerOptions, parseBuildArguments } from './build.mjs';

assert.equal(CANDIDATE_COMMIT, '216567d9cdc927cf0b4e00632a80260f9901f4fa');
assert.equal(CANDIDATE_TREE, '4fa21705820578137a6c2cb7dfaa41b413c23567');
assert.equal(SCOUT_COMMIT, '573002f01ec6c52416d44489543f69a9625facf8');
assert.equal(CANONICAL_COMMIT, 'd37909174ebd664338ae3194799a9e0899dedd51');
assert.equal(NATIVE_PATCHED_SHA256, '9fe46e219123e3f59958de98c6f9b65fc618cca85ca0325740dffc30e8aef292');
assert.equal(PATCH_SHA256, '28ec36660b3d78c2373b5ff0591385e7a6cc39e6fd33cb9a2a1732d0a01ad2fa');
assert.equal(WORKER_STACK_SIZE_MB, 64);
assert.equal(DEFAULT_CANDIDATE_PROFILE_ID, LEGACY_CANDIDATE_PROFILE_ID);
assert.deepEqual(resolveCandidateProfile(LEGACY_CANDIDATE_PROFILE_ID), {
  id: 'legacy-216567d9', sourceCommit: CANDIDATE_COMMIT,
  sourceTree: CANDIDATE_TREE, trackedBendFiles: 284,
});
assert.deepEqual(resolveCandidateProfile(CURRENT_VISUAL_CANDIDATE_PROFILE_ID), {
  id: 'current-visual-45d7041e',
  sourceCommit: '45d7041ea1e11db48017db96b886b24b60d501d3',
  sourceTree: '5fe960b1ccbedf97c2460c4b7c2a63a124a3ce24', trackedBendFiles: 303,
});
assert.ok(Object.isFrozen(CANDIDATE_PROFILES));
for (const profileId of [LEGACY_CANDIDATE_PROFILE_ID, CURRENT_VISUAL_CANDIDATE_PROFILE_ID]) {
  const profile = resolveCandidateProfile(profileId);
  assert.match(profile.sourceCommit, /^[0-9a-f]{40}$/, 'profile must pin a full Git commit');
  assert.match(profile.sourceTree, /^[0-9a-f]{40}$/, 'profile must pin a full Git tree');
  assert.equal(assertCandidateProfileBinding(profile).id, profileId);
  assert.equal(assertCandidateProfileBinding(profile, { commit: profile.sourceCommit,
    tree: profile.sourceTree, trackedBendFiles: profile.trackedBendFiles }).id, profileId);
  assert.throws(() => assertCandidateProfileBinding({ ...profile, sourceCommit: '0'.repeat(40) }), /differs from the closed registry/);
  assert.throws(() => assertCandidateProfileBinding(profile, { commit: '0'.repeat(40),
    tree: profile.sourceTree, trackedBendFiles: profile.trackedBendFiles }), /candidate commit differs/);
  assert.throws(() => assertCandidateProfileBinding(profile, { commit: profile.sourceCommit,
    tree: '0'.repeat(40), trackedBendFiles: profile.trackedBendFiles }), /candidate tree differs/);
  assert.throws(() => assertCandidateProfileBinding(profile, { commit: profile.sourceCommit,
    tree: profile.sourceTree, trackedBendFiles: profile.trackedBendFiles + 1 }), /source count differs/);
}
assert.throws(() => resolveCandidateProfile('caller-supplied-hash'), /closed registry/);

assert.deepEqual(parseBuildArguments(['--candidate', path.resolve('fixture-candidate')]), {
  child: false, candidate: path.resolve('fixture-candidate'), profileId: DEFAULT_CANDIDATE_PROFILE_ID,
});
assert.deepEqual(parseBuildArguments(['--candidate', path.resolve('fixture-candidate'), '--profile',
  CURRENT_VISUAL_CANDIDATE_PROFILE_ID]), {
  child: false, candidate: path.resolve('fixture-candidate'), profileId: CURRENT_VISUAL_CANDIDATE_PROFILE_ID,
});
assert.throws(() => parseBuildArguments(['--candidate', path.resolve('fixture-candidate'), '--profile', 'arbitrary']),
  /closed registry/);
assert.throws(() => parseBuildArguments([]), /usage:/);
assert.throws(() => parseBuildArguments(['--candidate', 'relative-path']), /absolute path/);
assert.throws(() => parseBuildArguments(['--candidate', '/abs', '--overwrite']), /usage:/);
assert.deepEqual(parseBuildArguments(['--child', '/run/run-abc', '1', '2', '/candidate', 'a'.repeat(64)]), {
  child: true, runDirectory: path.resolve('/run/run-abc'), identity: { dev: '1', ino: '2' },
  candidate: '/candidate', planSha256: 'a'.repeat(64), profileId: DEFAULT_CANDIDATE_PROFILE_ID,
});
assert.deepEqual(parseBuildArguments(['--child', '/run/run-abc', '1', '2', '/candidate', 'a'.repeat(64),
  CURRENT_VISUAL_CANDIDATE_PROFILE_ID]), {
  child: true, runDirectory: path.resolve('/run/run-abc'), identity: { dev: '1', ino: '2' },
  candidate: '/candidate', planSha256: 'a'.repeat(64), profileId: CURRENT_VISUAL_CANDIDATE_PROFILE_ID,
});
assert.throws(() => parseBuildArguments(['--child', '/run/run-abc', '1', '2', '/candidate', 'bad']), /64/);

assert.equal(parseMemAvailable('MemTotal: 1024 kB\nMemAvailable: 901234 kB\n'), 901234 * 1024);
assert.throws(() => parseMemAvailable('MemAvailable: 1 kB\nMemAvailable: 2 kB\n'), /exactly one/);
assert.throws(() => parseMemAvailable('MemAvailable: 12 MB\n'), /malformed/);
assert.deepEqual(parseCgroupV2Path('4:cpu:/x\n0::/user.slice/user-1000.slice/session.scope\n'),
  ['user.slice', 'user-1000.slice', 'session.scope']);
assert.throws(() => parseCgroupV2Path('0::/../../etc\n'), /unsafe/);
assert.throws(() => parseCgroupV2Path('1:memory:/v1\n'), /exactly one/);
assert.deepEqual(cgroupHeadroomFromRows([
  { path: '/', limit: 200, current: 80 },
  { path: '/user', limit: 140, current: 70 },
  { path: '/user/job', limit: 'max' },
]), {
  visibleAncestorHeadroomBytes: 70,
  ancestors: [
    { path: '/', state: 'finite', memoryMaxBytes: 200, memoryCurrentBytes: 80, headroomBytes: 120 },
    { path: '/user', state: 'finite', memoryMaxBytes: 140, memoryCurrentBytes: 70, headroomBytes: 70 },
    { path: '/user/job', state: 'unlimited' },
  ],
});
assert.equal(cgroupHeadroomFromRows([{ path: '/', limit: 'max' }]).visibleAncestorHeadroomBytes, null);
const admitted = memoryAdmission('initial-preflight', {
  availableBytes: MEMORY_FLOOR_BYTES,
  hostMemAvailableBytes: MEMORY_FLOOR_BYTES,
  cgroupV2: { visibleAncestorHeadroomBytes: MEMORY_FLOOR_BYTES },
  limitingSource: 'test',
}, '2026-01-01T00:00:00.000Z');
assert.equal(admitted.admitted, true);
assert.doesNotThrow(() => requireMemoryAdmission(admitted));
assert.throws(() => requireMemoryAdmission({ ...admitted, availableBytes: MEMORY_FLOOR_BYTES - 1,
  admitted: false }), /requires 88 GiB/);
assert.throws(() => memoryAdmission('other-phase', { availableBytes: 1 }), /phase/);
const unreadableSample = sampleMemoryAdmission('immediately-before-c-emission',
  () => { throw new Error('synthetic missing cgroup ancestor memory.max'); }, '2026-01-02T03:04:05.000Z');
assert.deepEqual(unreadableSample, {
  phase: 'immediately-before-c-emission', sampledAtUtc: '2026-01-02T03:04:05.000Z',
  floorBytes: MEMORY_FLOOR_BYTES, availableBytes: null, admitted: false,
  error: { kind: 'unreadable-memory-accounting', message: 'synthetic missing cgroup ancestor memory.max' },
});
assert.throws(() => requireMemoryAdmission(unreadableSample), /unknown GiB/);

const emissionData = { schema: 'rift-native-v2-2032-linux-emission-worker/1', workerStackSizeMb: 64 };
assert.deepEqual(emissionWorkerOptions(emissionData), {
  workerData: emissionData, resourceLimits: { stackSizeMb: 64 }, execArgv: [],
});
const workerAdmission = memoryAdmission('immediately-before-c-emission', {
  availableBytes: MEMORY_FLOOR_BYTES, hostMemAvailableBytes: MEMORY_FLOOR_BYTES,
  cgroupV2: { visibleAncestorHeadroomBytes: MEMORY_FLOOR_BYTES }, limitingSource: 'fixture',
}, '2026-01-01T00:00:00.000Z');
const successfulThreadResult = {
  schema: 'rift-native-v2-2032-linux-cpu-worker/1', ok: true,
  candidateProfile: resolveCandidateProfile(),
  worker: { threadId: 7, stackSizeMb: 64, exitObserved: true, exitCode: 0 },
  immediatelyBeforeCEmission: workerAdmission,
};
const successfulThreadSourceReceipt = {
  candidateProfile: resolveCandidateProfile(), worker: { threadId: 7, stackSizeMb: 64 },
};
assert.equal(assertEmissionWorkerSuccess(successfulThreadResult, successfulThreadSourceReceipt), true);
const currentVisualThreadResult = { ...successfulThreadResult,
  candidateProfile: resolveCandidateProfile(CURRENT_VISUAL_CANDIDATE_PROFILE_ID) };
const currentVisualSourceReceipt = { ...successfulThreadSourceReceipt,
  candidateProfile: resolveCandidateProfile(CURRENT_VISUAL_CANDIDATE_PROFILE_ID) };
assert.equal(assertEmissionWorkerSuccess(currentVisualThreadResult, currentVisualSourceReceipt,
  CURRENT_VISUAL_CANDIDATE_PROFILE_ID), true);
assert.throws(() => assertEmissionWorkerSuccess(currentVisualThreadResult, currentVisualSourceReceipt), /deep-equal/);
assert.throws(() => assertEmissionWorkerSuccess(successfulThreadResult, currentVisualSourceReceipt,
  CURRENT_VISUAL_CANDIDATE_PROFILE_ID), /deep-equal/);
assert.throws(() => assertEmissionWorkerSuccess({ ...successfulThreadResult,
  worker: { ...successfulThreadResult.worker, exitObserved: false } }, successfulThreadSourceReceipt), /exitObserved/);
assert.throws(() => assertEmissionWorkerSuccess({ ...successfulThreadResult,
  worker: { ...successfulThreadResult.worker, stackSizeMb: 32 } }, successfulThreadSourceReceipt), /stackSizeMb/);

function makeMemoryFixture(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const directories = [root]; const files = [];
  const mkdir = (relative) => {
    let current = root;
    for (const part of relative.split('/').filter(Boolean)) {
      current = path.join(current, part);
      if (!fs.existsSync(current)) { fs.mkdirSync(current); directories.push(current); }
      const stat = fs.lstatSync(current);
      assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
    }
    return current;
  };
  const write = (relative, text) => {
    const parts = relative.split('/'); parts.pop();
    const parent = parts.join('/'); if (parent) mkdir(parent);
    const file = path.join(root, ...relative.split('/'));
    fs.writeFileSync(file, text, { flag: 'wx' }); files.push(file);
    return file;
  };
  const cleanup = () => {
    for (const file of files.reverse()) {
      const stat = fs.lstatSync(file); assert.ok(stat.isFile() && !stat.isSymbolicLink()); fs.unlinkSync(file);
    }
    for (const directory of directories.reverse()) {
      const stat = fs.lstatSync(directory); assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
      assert.deepEqual(fs.readdirSync(directory), []); fs.rmdirSync(directory);
    }
  };
  return { root, mkdir, write, cleanup };
}

const memoryFixture = makeMemoryFixture('rift-native-v2-memory-');
try {
  memoryFixture.write('proc/meminfo', 'MemTotal: 120000000 kB\nMemAvailable: 104857600 kB\n');
  memoryFixture.write('proc/self/cgroup', '0::/parent/job\n');
  memoryFixture.write('cgroup/cgroup.controllers', 'memory cpu\n');
  memoryFixture.write('cgroup/parent/memory.max', '100000000000\n');
  memoryFixture.write('cgroup/parent/memory.current', '30000000000\n');
  memoryFixture.write('cgroup/parent/job/memory.max', '200000000000\n');
  memoryFixture.write('cgroup/parent/job/memory.current', '50000000000\n');
  const bounded = linuxMemorySnapshot({ procRoot: path.join(memoryFixture.root, 'proc'),
    cgroupRoot: path.join(memoryFixture.root, 'cgroup') });
  assert.equal(bounded.hostMemAvailableBytes, 100 * 1024 ** 3);
  assert.equal(bounded.cgroupV2.visibleAncestorHeadroomBytes, 70_000_000_000,
    'finite parent cgroup is the limiting visible ancestor');
  assert.equal(bounded.availableBytes, 70_000_000_000);
  memoryFixture.cleanup();
} catch (error) {
  process.stderr.write(`Retained memory-accounting fixture after failure: ${memoryFixture.root}\n`);
  throw error;
}

const missingAncestorFixture = makeMemoryFixture('rift-native-v2-memory-missing-');
try {
  missingAncestorFixture.write('proc/meminfo', 'MemTotal: 120000000 kB\nMemAvailable: 104857600 kB\n');
  missingAncestorFixture.write('proc/self/cgroup', '0::/parent/job\n');
  missingAncestorFixture.write('cgroup/cgroup.controllers', 'memory cpu\n');
  missingAncestorFixture.write('cgroup/parent/job/memory.max', 'max\n');
  const failedSample = sampleMemoryAdmission('immediately-before-c-emission', () =>
    linuxMemorySnapshot({ procRoot: path.join(missingAncestorFixture.root, 'proc'),
      cgroupRoot: path.join(missingAncestorFixture.root, 'cgroup') }), '2026-01-02T03:04:05.000Z');
  assert.equal(failedSample.phase, 'immediately-before-c-emission');
  assert.equal(failedSample.sampledAtUtc, '2026-01-02T03:04:05.000Z');
  assert.equal(failedSample.admitted, false);
  assert.equal(failedSample.availableBytes, null);
  assert.equal(failedSample.error.kind, 'unreadable-memory-accounting');
  assert.match(failedSample.error.message, /memory\.max/);
  missingAncestorFixture.cleanup();
} catch (error) {
  process.stderr.write(`Retained missing-ancestor fixture after failure: ${missingAncestorFixture.root}\n`);
  throw error;
}

assert.equal(parseClangVersion('clang version 18.1.8 (https://github.com/llvm/llvm-project.git)\n'), 18);
assert.throws(() => parseClangVersion('Apple clang version 15.0.0'), /identify upstream Clang/);
assert.throws(() => parseClangVersion('clang version 13.0.1'), /14 or newer/);
assert.deepEqual(clangCompileArguments('/run/NativeV2.c', '/run/bin/native'), [
  '-std=c11', '-O3', '/run/NativeV2.c', '-lpthread', '-lm', '-lX11', '-lasound', '-o', '/run/bin/native',
]);

const elf = Buffer.alloc(20);
elf.set([0x7f, 0x45, 0x4c, 0x46]); elf[4] = 2; elf[5] = 1; elf.writeUInt16LE(62, 18);
assert.deepEqual(elfIdentity(elf), { class: 2, dataEncoding: 1, machine: 62 });
assert.throws(() => elfIdentity(Buffer.alloc(20)), /not an ELF/);
const wrongMachine = Buffer.from(elf); wrongMachine.writeUInt16LE(183, 18);
assert.throws(() => elfIdentity(wrongMachine), /x86-64/);
assert.throws(() => elfIdentity(Buffer.from([...elf.subarray(0, 19)])), /not an ELF/);

const rows = EXPECTED_PACKAGE_PATHS.map((packagePath, index) => ({
  sourcePath: `fixtures/input-${index}.bin`, packagePath, manifest: 'fixture.json',
  kind: packagePath.startsWith('assets/') ? 'runtime' : 'license', bytes: 1,
  sha256: sha256(Buffer.from([index])),
}));
assert.equal(assertAssetRows(rows), rows);
assert.throws(() => assertAssetRows([...rows, rows[0]]), /deep-equal|duplicate/);
assert.throws(() => assertAssetRows(rows.map((row, index) => index === 0
  ? { ...row, sourcePath: '../outside' } : row)), /unsafe|deep-equal/);

process.stdout.write('native-v2-2032 Linux CPU deterministic contract tests passed; no emission/build performed\n');
