import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyV2 } from '../../../tools/freeze-v2.mjs';
import { admittedMemorySnapshot, assertExactLoadedClosure, assertProofNodeRuntime,
  visibleMemorySnapshot, expectedCheckClosure, runLeasedWorker } from './aggregate-safety.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
process.env.BEND_NO_TELEMETRY = '1';
const script = path.join(root, 'bend2/core/v3/2032/aggregate.mjs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assertProofNodeRuntime({ version: 'v22.23.1', platform: 'linux',
  execArgv: [], nodeOptions: '' });
assertProofNodeRuntime({ version: 'v24.12.0', platform: 'win32',
  execArgv: [], nodeOptions: '' });
assert.throws(() => assertProofNodeRuntime({ version: 'v22.23.1', platform: 'win32',
  execArgv: [], nodeOptions: '' }), /unreviewed proof Node runtime/);
assert.throws(() => assertProofNodeRuntime({ version: 'v24.12.0', platform: 'linux',
  execArgv: [], nodeOptions: '' }), /unreviewed proof Node runtime/);
assert.throws(() => assertProofNodeRuntime({ version: 'v24.12.0', platform: 'darwin',
  execArgv: [], nodeOptions: '' }), /unreviewed proof Node runtime/);
assert.throws(() => assertProofNodeRuntime({ version: 'v24.12.0', platform: 'win32',
  execArgv: ['--import=unreviewed'], nodeOptions: '' }), /inherited Node flags/);
const frozen = verifyV2();
const expected = expectedCheckClosure(root, path.join(root, 'bend2/core/v2/CHECK.bend'),
  frozen.manifest.files, path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032/bend2/base.bend'));
assert.ok(expected.length > 38, 'expected transitive closure and Base');
assertExactLoadedClosure(expected, new Set(expected));
assert.throws(() => assertExactLoadedClosure(expected, expected.filter((name) =>
  !name.endsWith('CanonicalLaws.bend'))), /complete frozen CHECK import cone/);
assert.throws(() => assertExactLoadedClosure(expected, [...expected, 'extra.bend']),
  /complete frozen CHECK import cone/);
const compilerDir = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032/bend2');
const Bend = await import(pathToFileURL(path.join(compilerDir, 'bend.ts')).href);
const Comp = await import(pathToFileURL(path.join(compilerDir, 'comp.ts')).href);
const empty = Bend.book_nil();
assert.ok(Comp.js_lib({ ...empty, order: [] }, true).length > 0);
const ownedCollision = Bend.book_nil();
ownedCollision.tlds.IO = { b: false };
assert.throws(() => Comp.js_lib({ ...ownedCollision, order: [] }, true),
  /name the compiler encodes itself/);
const foreignCollision = Bend.book_nil();
foreignCollision.tlds.X = { $: 'Def', i: [], b: false };
foreignCollision.ctrs.X = {};
assert.throws(() => Comp.js_lib({ ...foreignCollision, order: [] }, true),
  /names both a constructor and a foreign def/);
const cgroupFiles = {
  '/proc/self/cgroup': '0::/user.slice/app.slice/test.scope\n',
  '/proc/self/mountinfo': '36 24 0:33 / /sys/fs/cgroup rw - cgroup2 cgroup rw\n',
  '/sys/fs/cgroup/cgroup.controllers': 'cpu io memory\n',
  '/sys/fs/cgroup/user.slice/memory.max': 'max\n',
  '/sys/fs/cgroup/user.slice/memory.current': '10000\n',
  '/sys/fs/cgroup/user.slice/app.slice/memory.max': 'max\n',
  '/sys/fs/cgroup/user.slice/app.slice/memory.current': '8000\n',
  '/sys/fs/cgroup/user.slice/app.slice/test.scope/memory.max': '30000\n',
  '/sys/fs/cgroup/user.slice/app.slice/test.scope/memory.current': '25000\n',
};
const memoryRead = (overrides = {}) => file => {
  const bytes = { ...cgroupFiles, ...overrides }[file];
  if (bytes !== undefined) return bytes;
  const error = new Error(`missing controller: ${file}`);
  error.code = 'ENOENT';
  throw error;
};
const INIT_CGROUP_NAMESPACE_INODE = 0xEFFFFFFB;
const CGROUP2_SUPER_MAGIC = 0x63677270;
const memoryStat = (ino = INIT_CGROUP_NAMESPACE_INODE) => file => {
  assert.equal(file, '/proc/self/ns/cgroup');
  return { ino };
};
const memoryStatfs = (type = CGROUP2_SUPER_MAGIC) => file => {
  assert.equal(file, '/sys/fs/cgroup');
  return { type };
};
const linuxMemoryOptions = (overrides = {}, ino = INIT_CGROUP_NAMESPACE_INODE) => ({
  platform: 'linux', hostFree: 40_000, read: memoryRead(overrides),
  stat: memoryStat(ino), statfs: memoryStatfs(),
});
const finite = visibleMemorySnapshot({ platform: 'linux', hostFree: 40_000,
  read: memoryRead(), stat: memoryStat(), statfs: memoryStatfs() });
assert.equal(finite.visibleUpperBoundBytes, 5_000);
assert.equal(finite.mode, 'namespace-visible-v2-finite');
assert.deepEqual(finite.visibleLimits[0], { path: '/', max: 'absent-root', current: null });
assert.equal(finite.cgroupNamespaceInode, INIT_CGROUP_NAMESPACE_INODE);
assert.equal(finite.cgroupFilesystemType, CGROUP2_SUPER_MAGIC);
assert.equal(finite.ancestryMode, 'init-cgroup-namespace-visible-v2-full-ancestry');
const admittedFinite = admittedMemorySnapshot(linuxMemoryOptions());
assert.equal(admittedFinite.availableBytes, 5_000);
assert.equal(admittedFinite.mode, 'linux-init-cgroup-full-ancestry-admitted');
assert.equal(admittedMemorySnapshot({ ...linuxMemoryOptions(), hostFree: 2_000 }).availableBytes,
  2_000, 'host free memory remains an upper bound on cgroup headroom');
const unlimited = visibleMemorySnapshot({ platform: 'linux', hostFree: 40_000,
  read: memoryRead({ '/sys/fs/cgroup/user.slice/app.slice/test.scope/memory.max': 'max\n' }),
  stat: memoryStat(), statfs: memoryStatfs() });
assert.equal(unlimited.visibleUpperBoundBytes, 40_000);
assert.equal(unlimited.mode, 'namespace-visible-v2-unlimited');
assert.equal(unlimited.visibleLimits.length, 4);
assert.equal(admittedMemorySnapshot(linuxMemoryOptions({
  '/sys/fs/cgroup/user.slice/app.slice/test.scope/memory.max': 'max\n' })).availableBytes, 40_000);
const parentLimited = visibleMemorySnapshot({ platform: 'linux', hostFree: 40_000,
  read: memoryRead({ '/sys/fs/cgroup/user.slice/memory.max': '10000\n',
    '/sys/fs/cgroup/user.slice/memory.current': '6000\n',
    '/sys/fs/cgroup/user.slice/app.slice/test.scope/memory.max': 'max\n' }),
  stat: memoryStat(), statfs: memoryStatfs() });
assert.equal(parentLimited.visibleUpperBoundBytes, 4_000);
assert.equal(parentLimited.mode, 'namespace-visible-v2-finite');
assert.equal(admittedMemorySnapshot(linuxMemoryOptions({
  '/sys/fs/cgroup/user.slice/memory.max': '10000\n',
  '/sys/fs/cgroup/user.slice/memory.current': '6000\n',
  '/sys/fs/cgroup/user.slice/app.slice/test.scope/memory.max': 'max\n' })).availableBytes, 4_000);
assert.equal(admittedMemorySnapshot({ platform: 'win32', hostFree: 40_000,
  stat: () => { throw Error('Windows admission must not inspect cgroup namespace'); },
  statfs: () => { throw Error('Windows admission must not inspect cgroup filesystem'); } }).availableBytes,
40_000);
assert.equal(admittedMemorySnapshot({ platform: 'win32', hostFree: 40_000 }).mode,
  'windows-host-free-admitted');
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({ '/proc/self/mountinfo':
    '36 24 0:33 /user.slice /sys/fs/cgroup rw - cgroup2 cgroup rw\n' })),
  /hides possible ancestor caps/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/sys/fs/cgroup/user.slice/memory.max': undefined })),
  /missing controller/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/sys/fs/cgroup/user.slice/app.slice/test.scope/memory.max': 'invalid' })),
  /malformed cgroup-v2 memory.max/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/sys/fs/cgroup/user.slice/app.slice/test.scope/memory.current': 'not-numeric\n' })),
  /malformed cgroup-v2 memory.current/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/sys/fs/cgroup/user.slice/app.slice/memory.current': undefined })),
  /missing controller/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/cgroup': '3:memory:/user.slice\n' })),
  /one cgroup-v2 process path/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/cgroup': '0::/user.slice\n0::/user.slice/app.slice\n' })),
  /one cgroup-v2 process path/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/cgroup': '0::/user.slice/../app.slice\n' })),
  /cgroup-v2 process path must be canonical/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/mountinfo': '36 24 0:33 / /sys/fs/cgroup rw - cgroup2 cgroup rw\n'
    + '41 24 0:38 / /other/cgroup rw - cgroup2 cgroup rw\n' })),
  /one cgroup-v2 mount required/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/mountinfo': cgroupFiles['/proc/self/mountinfo']
    + '42 36 0:39 / /sys/fs/cgroup/user.slice rw - tmpfs tmpfs rw\n' })),
  /cgroup ancestry path is shadowed by nested mount/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/mountinfo': cgroupFiles['/proc/self/mountinfo']
    + '42 36 0:39 / /sys/fs/cgroup rw - overlay overlay rw\n' })),
  /another filesystem mount shadows the canonical cgroup-v2 root/);
assert.equal(admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/mountinfo': cgroupFiles['/proc/self/mountinfo']
    + '42 36 0:39 / /sys/fs/cgroup/user.slice-sibling rw - tmpfs tmpfs rw\n'
    + '43 36 0:40 / /sys/fs/cgroup/unrelated rw - overlay overlay rw\n' })).availableBytes,
  5_000, 'sibling-prefix and unrelated mounts do not shadow the checked ancestry');
const nsfsPseudoRoot = 'mnt:[4026533050]';
const unrelatedNsfsMount = `42 36 0:39 ${nsfsPseudoRoot} /run/snapd/ns/docker.mnt rw - nsfs nsfs rw\n`;
assert.equal(admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/mountinfo': cgroupFiles['/proc/self/mountinfo'] + unrelatedNsfsMount })).availableBytes,
5_000, 'unrelated nsfs pseudo-roots are allowed while their mountpoints remain checked');
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/mountinfo': cgroupFiles['/proc/self/mountinfo']
    + `42 36 0:39 ${nsfsPseudoRoot} /run/snapd/../snapd/ns/docker.mnt rw - nsfs nsfs rw\n` })),
  /mountinfo path must be absolute and canonical/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/mountinfo': cgroupFiles['/proc/self/mountinfo']
    + `42 36 0:39 ${nsfsPseudoRoot} /sys/fs/cgroup rw - nsfs nsfs rw\n` })),
  /another filesystem mount shadows the canonical cgroup-v2 root/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/mountinfo': cgroupFiles['/proc/self/mountinfo']
    + `42 36 0:39 ${nsfsPseudoRoot} /sys/fs/cgroup/user.slice/app.slice rw - nsfs nsfs rw\n` })),
  /cgroup ancestry path is shadowed by nested mount/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/mountinfo': '36 24 0:33 mnt:[4026533050] /sys/fs/cgroup rw - cgroup2 cgroup rw\n' })),
  /mountinfo path must be absolute and canonical/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/mountinfo': cgroupFiles['/proc/self/mountinfo']
    + '42 36 0:39 / /sys/fs/cgroup/user.slice/app.slice/test.scope/memory.max rw - tmpfs tmpfs rw\n' })),
  /cgroup ancestry path is shadowed by nested mount/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/mountinfo': '' })), /one cgroup-v2 mount required/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/proc/self/mountinfo': 'not-a-mountinfo-entry\n' })), /malformed mountinfo entry/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/sys/fs/cgroup/cgroup.controllers': 'cpu io\n' })),
  /root memory.max is absent without cgroup-v2 memory controller proof/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/sys/fs/cgroup/cgroup.controllers': undefined })), /missing controller/);
assert.throws(() => admittedMemorySnapshot(linuxMemoryOptions({
  '/sys/fs/cgroup/cgroup.controllers': 'memory memory\n' })),
  /malformed cgroup-v2 root controller list/);
let nonInitReads = 0;
assert.throws(() => admittedMemorySnapshot({ ...linuxMemoryOptions(),
  stat: memoryStat(INIT_CGROUP_NAMESPACE_INODE - 1),
  read: file => { nonInitReads++; return memoryRead()(file); } }),
  /requires the init cgroup namespace/);
assert.equal(nonInitReads, 0, 'non-init namespace is rejected before inspecting the visible hierarchy');
assert.throws(() => admittedMemorySnapshot({ ...linuxMemoryOptions(),
  stat: () => { const error = Error('namespace stat unavailable'); error.code = 'EACCES'; throw error; } }),
  /namespace stat unavailable/);
assert.throws(() => admittedMemorySnapshot({ ...linuxMemoryOptions(),
  statfs: memoryStatfs(0x01021994) }),
  /not backed by the cgroup-v2 filesystem/);
assert.throws(() => admittedMemorySnapshot({ ...linuxMemoryOptions(),
  statfs: () => { const error = Error('cgroup statfs unavailable'); error.code = 'EIO'; throw error; } }),
  /cgroup statfs unavailable/);
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'rift-aggregate-lease-'));
const fixtureLock = path.join(fixture, 'worker.lock');
try {
  assert.equal(await runLeasedWorker(fixtureLock, 'owned', async () => 42), 42);
  assert.equal(fs.existsSync(fixtureLock), false);
  await assert.rejects(runLeasedWorker(fixtureLock, 'owned', async () => {
    const error = new Error('uncertain exit');
    error.workerMayBeLive = true;
    throw error;
  }), (error) => error.lockPreserved === fixtureLock);
  assert.equal(fs.readFileSync(fixtureLock, 'utf8'), 'owned');
  await assert.rejects(runLeasedWorker(fixtureLock, 'second', async () => 99),
    (error) => error.code === 'EEXIST');
} finally {
  if (fs.existsSync(fixtureLock)) fs.unlinkSync(fixtureLock);
  fs.rmdirSync(fixture);
}
const invoke = (...args) => spawnSync(process.execPath, [script, ...args], {
  cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 2_000_000,
  env: { ...process.env, BEND_NO_TELEMETRY: '1' },
});
const invalid = invoke('--wrong');
assert.equal(invalid.error, undefined);
assert.notEqual(invalid.status, 0);
assert.match(invalid.stderr, /usage: aggregate\.mjs \[--preflight-only\]/);
assert.equal(invalid.stdout, '');
const preflight = invoke('--preflight-only');
assert.equal(preflight.error, undefined);
assert.equal(preflight.status, 0, preflight.stderr);
assert.equal(preflight.stderr, '');
const receipt = JSON.parse(preflight.stdout);
assert.equal(receipt.schema, 'rift-v2-aggregate-2032-preflight/1');
assert.equal(receipt.ok, true);
assert.equal(receipt.sourceCommit, execFileSync('git', ['rev-parse', 'HEAD'],
  { cwd: root, encoding: 'utf8' }).trim());
assert.equal(receipt.scriptSha256, sha(fs.readFileSync(script)));
assert.equal(receipt.runtime.nodeExeSha256, sha(fs.readFileSync(process.execPath)));
assert.equal(receipt.patches.length, 4);
assert.equal(receipt.safetySha256, sha(fs.readFileSync(path.join(root,
  'bend2/core/v3/2032/aggregate-safety.mjs'))));
assert.equal(receipt.expectedLoadedFiles, expected.length);
assert.equal(receipt.runtimeProbe.emptyRootNamespaceGuard, true);
assert.equal(receipt.runtimeProbe.ownedNameRejected, true);
assert.equal(receipt.runtimeProbe.foreignConstructorRejected, true);
assert.equal(receipt.runtimeProbe.fetches, 0);
assert.deepEqual(receipt.runtimeProbe.tsImports, ['bend.ts', 'comp.ts']);
assert.ok(['lf', 'crlf'].includes(receipt.compilerEol.eol));
assert.equal(receipt.compilerBase.normalizedSha256,
  '485705690d8927389bd156f18e42653176a5e139afe363a7e9bc217eb6f5e716');
assert.match(receipt.scope, /no Worker, proof or pin verdict/);
console.log(JSON.stringify({ schema: 'rift-v2-aggregate-2032-preflight-test/1',
  passed: true, sourceCommit: receipt.sourceCommit,
  frozenSha256: receipt.frozenSha256, compilerEol: receipt.compilerEol.eol,
  scriptSha256: receipt.scriptSha256, controls: ['complete-closure',
    'omitted-law', 'unexpected-source', 'init-cgroup-namespace',
    'canonical-path-and-single-mount', 'nested-mount-shadow-rejection',
    'same-mountpoint-overmount-rejection', 'malformed-mountinfo-rejection',
    'cgroup2-superblock-magic', 'wrong-or-unavailable-statfs-rejection',
    'sibling-and-unrelated-mount-allowance', 'nsfs-pseudo-root-mount-allowance',
    'nsfs-pseudo-root-noncanonical-mountpoint-rejection',
    'nsfs-pseudo-root-overmount-rejection', 'nsfs-pseudo-root-nested-shadow-rejection',
    'malformed-cgroup2-root-rejection', 'root-memory-controller-proof',
    'nonroot-memory-max-current', 'finite-parent-limit', 'host-free-upper-bound',
    'windows-host-free-path-preserved', 'lease-uncertain-exit',
    'exclusive-admission', 'successor-owned-name', 'foreign-constructor-collision',
    'node22-qualification', 'ts-import-probe', 'invalid-cli',
    'exact-read-only-preflight'],
  scope: 'source/patch/runtime binding only; aggregate Worker and BendTT not run' }));
