import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requiredMutations, verifyV2 } from '../../../tools/freeze-v2.mjs';
import { admittedMemorySnapshot, runLeasedWorker } from './aggregate-safety.mjs';
import { typeMismatchEvidence } from './mutation-verdict.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const script = path.join(root, 'bend2/core/v3/2032/mutations.mjs');
const outputRoot = path.join(root, '.artifacts/bend2/2032-mutations');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bendError = { $: 'Err' };
const validMismatch = 'Error:\n- expected : Accepted{}\n- observed : Rejected{}\nLocation: AcceptanceLaws.exact';
const detail = typeMismatchEvidence(bendError, () => validMismatch);
assert.equal(detail.location, 'AcceptanceLaws.exact');
assert.equal(detail.rejectionSha256, sha(validMismatch));
assert.throws(() => typeMismatchEvidence(new Error('parse failed'), () => validMismatch),
  /outside Bend typechecking/);
for (const diagnostic of ['Error: parse failed',
  'expected : X\nLocation: Law', 'observed : Y\nLocation: Law',
  'expected : X\nobserved : Y']) {
  assert.throws(() => typeMismatchEvidence(bendError, () => diagnostic),
    /did not report|lacked a source location/);
}
const initCgroupNamespaceInode = 0xEFFFFFFB;
const cgroup2SuperMagic = 0x63677270;
const memoryFiles = new Map([
  ['/proc/self/cgroup', '0::/parent/job\n'],
  ['/proc/self/mountinfo', '36 24 0:33 / /sys/fs/cgroup rw - cgroup2 cgroup rw\n'],
  ['/sys/fs/cgroup/cgroup.controllers', 'memory cpu\n'],
  ['/sys/fs/cgroup/parent/memory.max', '12000\n'],
  ['/sys/fs/cgroup/parent/memory.current', '7000\n'],
  ['/sys/fs/cgroup/parent/job/memory.max', 'max\n'],
  ['/sys/fs/cgroup/parent/job/memory.current', '3000\n'],
]);
const readMemoryFile = file => {
  if (memoryFiles.has(file)) return memoryFiles.get(file);
  const error = Error(`missing synthetic cgroup file: ${file}`);
  error.code = 'ENOENT';
  throw error;
};
const linuxMemory = admittedMemorySnapshot({ platform: 'linux', hostFree: 9_000,
  stat: file => { assert.equal(file, '/proc/self/ns/cgroup');
    return { ino: initCgroupNamespaceInode }; },
  statfs: file => { assert.equal(file, '/sys/fs/cgroup'); return { type: cgroup2SuperMagic }; },
  read: readMemoryFile });
assert.equal(linuxMemory.availableBytes, 5_000,
  'mutation admission includes finite parent headroom and host free memory');
assert.equal(linuxMemory.cgroupNamespaceInode, initCgroupNamespaceInode);
assert.equal(linuxMemory.ancestryMode, 'init-cgroup-namespace-visible-v2-full-ancestry');
assert.throws(() => admittedMemorySnapshot({ platform: 'linux', hostFree: 9_000,
  stat: () => ({ ino: initCgroupNamespaceInode - 1 }),
  statfs: () => ({ type: cgroup2SuperMagic }), read: readMemoryFile }),
  /requires the init cgroup namespace/);
assert.equal(admittedMemorySnapshot({ platform: 'win32', hostFree: 9_000,
  stat: () => { throw Error('Windows admission must not stat a Linux namespace'); },
  statfs: () => { throw Error('Windows admission must not stat the cgroup filesystem'); } }).availableBytes,
  9_000);
const leaseFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'rift-mutation-lease-'));
const leasePath = path.join(leaseFixture, 'worker.lock');
try {
  const uncertain = new Error('no exit observed');
  uncertain.workerMayBeLive = true;
  const wrapped = new Error('case/negative stopped', { cause: uncertain });
  await assert.rejects(runLeasedWorker(leasePath, 'owned', async () => { throw wrapped; }),
    error => error.lockPreserved === leasePath);
  assert.equal(fs.readFileSync(leasePath, 'utf8'), 'owned');
  await assert.rejects(runLeasedWorker(leasePath, 'second', async () => 1),
    error => error.code === 'EEXIST');
} finally {
  if (fs.existsSync(leasePath)) fs.unlinkSync(leasePath);
  fs.rmdirSync(leaseFixture);
}
const invoke = (...args) => spawnSync(process.execPath, [script, ...args], {
  cwd: root, encoding: 'utf8', timeout: 90_000, maxBuffer: 2_000_000,
  env: { ...process.env, BEND_NO_TELEMETRY: '1' },
});
for (const args of [['--wrong'], ['--only', 'not-a-frozen-case']]) {
  const result = invoke(...args);
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /usage: mutations\.mjs/);
  assert.equal(result.stdout, '');
}
const outputExisted = fs.existsSync(outputRoot);
const preflight = invoke('--preflight-only');
assert.equal(preflight.error, undefined);
assert.equal(preflight.status, 0, preflight.stderr);
assert.equal(preflight.stderr, '');
assert.equal(fs.existsSync(outputRoot), outputExisted, 'preflight created an output directory');
const receipt = JSON.parse(preflight.stdout);
assert.equal(receipt.schema, 'rift-v2-mutations-2032-preflight/1');
assert.equal(receipt.ok, true);
assert.equal(receipt.sourceCommit, execFileSync('git', ['rev-parse', 'HEAD'],
  { cwd: root, encoding: 'utf8' }).trim());
assert.equal(receipt.frozenSha256, verifyV2().sha256);
assert.equal(receipt.scriptSha256, sha(fs.readFileSync(script)));
assert.equal(receipt.safetySha256, sha(fs.readFileSync(path.join(root,
  'bend2/core/v3/2032/aggregate-safety.mjs'))));
assert.equal(receipt.verdictSha256, sha(fs.readFileSync(path.join(root,
  'bend2/core/v3/2032/mutation-verdict.mjs'))));
assert.deepEqual(receipt.cases.map(c => c.name), requiredMutations);
assert.equal(receipt.cases.length, 6);
assert.ok(receipt.cases.every(c => c.target.startsWith('bend2/core/v2/') &&
  c.loadedFiles > 1 && /^[a-f0-9]{64}$/.test(c.mutatedSha256)));
assert.equal(receipt.patchHashes.length, 4);
assert.equal(receipt.runtime.executableSha256, sha(fs.readFileSync(process.execPath)));
assert.equal(receipt.runtimeProbe.emptyRootNamespaceGuard, true);
assert.equal(receipt.runtimeProbe.ownedNameRejected, true);
assert.equal(receipt.runtimeProbe.foreignConstructorRejected, true);
assert.equal(receipt.runtimeProbe.fetches, 0);
assert.deepEqual(receipt.runtimeProbe.tsImports, ['bend.ts', 'comp.ts']);
assert.match(receipt.scope, /no mutation Worker or BendTT/);
console.log(JSON.stringify({ schema: 'rift-v2-mutations-2032-preflight-test/1',
  passed: true, sourceCommit: receipt.sourceCommit,
  frozenSha256: receipt.frozenSha256, cases: receipt.cases.map(c => c.name),
  controls: ['specific-type-mismatch', 'load-error-not-a-rejection',
    'missing-mismatch-not-a-rejection', 'wrapped-uncertain-exit-lease',
    'exclusive-admission', 'init-cgroup-namespace-admission',
    'finite-parent-headroom', 'non-init-namespace-rejection',
    'windows-host-free-path-preserved', 'invalid-options', 'frozen-six-case-cones',
    'ts-import-probe', 'read-only-preflight'],
  scope: 'source/compiler/anchor binding only; mutation Workers and BendTT not run' }));
