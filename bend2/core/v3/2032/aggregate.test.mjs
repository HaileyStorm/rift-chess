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
  '/sys/fs/cgroup/user.slice/memory.max': 'max\n',
  '/sys/fs/cgroup/user.slice/app.slice/memory.max': 'max\n',
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
const finite = visibleMemorySnapshot({ platform: 'linux', hostFree: 40_000,
  read: memoryRead() });
assert.equal(finite.visibleUpperBoundBytes, 5_000);
assert.equal(finite.mode, 'namespace-visible-v2-finite');
assert.throws(() => admittedMemorySnapshot({ platform: 'linux', hostFree: 40_000,
  read: memoryRead() }), /independently verified global cgroup ancestry/);
const unlimited = visibleMemorySnapshot({ platform: 'linux', hostFree: 40_000,
  read: memoryRead({ '/sys/fs/cgroup/user.slice/app.slice/test.scope/memory.max': 'max\n' }) });
assert.equal(unlimited.visibleUpperBoundBytes, 40_000);
assert.equal(unlimited.mode, 'namespace-visible-v2-unlimited');
assert.equal(unlimited.visibleLimits.length, 4);
assert.throws(() => admittedMemorySnapshot({ platform: 'linux', hostFree: 40_000,
  read: memoryRead({ '/sys/fs/cgroup/user.slice/app.slice/test.scope/memory.max': 'max\n' }) }),
  /independently verified global cgroup ancestry/);
const parentLimited = visibleMemorySnapshot({ platform: 'linux', hostFree: 40_000,
  read: memoryRead({ '/sys/fs/cgroup/user.slice/memory.max': '10000\n',
    '/sys/fs/cgroup/user.slice/memory.current': '6000\n',
    '/sys/fs/cgroup/user.slice/app.slice/test.scope/memory.max': 'max\n' }) });
assert.equal(parentLimited.visibleUpperBoundBytes, 4_000);
assert.equal(parentLimited.mode, 'namespace-visible-v2-finite');
assert.equal(admittedMemorySnapshot({ platform: 'win32', hostFree: 40_000 }).availableBytes, 40_000);
assert.throws(() => admittedMemorySnapshot({ platform: 'linux', hostFree: 40_000,
  read: memoryRead({ '/proc/self/mountinfo':
    '36 24 0:33 /user.slice /sys/fs/cgroup rw - cgroup2 cgroup rw\n' }) }),
  /hides possible ancestor caps/);
assert.throws(() => admittedMemorySnapshot({ platform: 'linux', hostFree: 40_000,
  read: memoryRead({ '/sys/fs/cgroup/user.slice/memory.max': undefined }) }),
  /missing controller/);
assert.throws(() => admittedMemorySnapshot({ platform: 'linux', hostFree: 40_000,
  read: memoryRead({ '/sys/fs/cgroup/user.slice/app.slice/test.scope/memory.max': 'invalid' }) }),
  /malformed cgroup-v2 memory.max/);
assert.throws(() => admittedMemorySnapshot({ platform: 'linux', hostFree: 40_000,
  read: memoryRead({ '/proc/self/cgroup': '3:memory:/user.slice\n' }) }),
  /one cgroup-v2 process path/);
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
    'omitted-law', 'unexpected-source', 'cgroup-limit', 'lease-uncertain-exit',
    'exclusive-admission', 'successor-owned-name', 'foreign-constructor-collision',
    'node22-qualification', 'ts-import-probe', 'invalid-cli',
    'exact-read-only-preflight'],
  scope: 'source/patch/runtime binding only; aggregate Worker and BendTT not run' }));
