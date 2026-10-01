import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { approvedStaticBuild } from './approved-static-build.mjs';
import {
  assertExactServedBuild, attemptFirstFrame, liveArtifactRoot, resolvePinnedBuildPath,
  staticBuildScope, staticBuildSchema, staticPackerPath, staticPreviewRoot,
  validateDedicatedOrigin, validateLiveRunName, validatePackagePath,
  validateStaticBuild, validateStaticBuildPath, validateStaticBuildPin,
} from './contract.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const root = path.resolve(process.cwd());
const staticRun = 'run-2026-10-01T03-27-52.699Z-35187-01234567-89ab-cdef-0123-456789abcdef';
const liveRun = 'run-2026-09-30T20-15-00-12345-0123456789abcdef0123456789abcdef';
const pinPath = `${staticPreviewRoot}/${staticRun}/build.json`;
const build = {
  schema: staticBuildSchema,
  version: '1234567890abcdef1234',
  bundleSourceRevision: 'a'.repeat(40),
  bundleSourceTree: 'b'.repeat(40),
  packerRevision: 'c'.repeat(40),
  packerTree: 'd'.repeat(40),
  cacheSchema: 'rift-bend-selected-cache/2032-2',
  bundle: {
    schema: 'rift-bend-2032-worker-bundle-probe-v2/1',
    sourceRevision: 'a'.repeat(40),
    sourceTree: 'b'.repeat(40),
  },
  packer: { version: '2032-2', file: staticPackerPath, sha256: 'e'.repeat(64) },
  networkCalls: 0,
  acceptance: { target: 'hotseat first-render smoke only', preparedGround: false,
    botWorkerLibrary: false, offline: false, rendered: false, fullBrowserAcceptance: false },
  scope: staticBuildScope,
  files: { 'index.html': 'f'.repeat(64), 'main-0123456789ab.js': '0'.repeat(64),
    'sw.js': '1'.repeat(64) },
};
const bytes = Buffer.from(`${JSON.stringify(build, null, 2)}\n`);
const pin = {
  path: pinPath,
  rawSha256: hash(bytes),
  version: build.version,
  bundleSourceRevision: build.bundleSourceRevision,
  bundleSourceTree: build.bundleSourceTree,
  packerRevision: build.packerRevision,
  packerTree: build.packerTree,
  scope: build.scope,
};

assert.equal(validateStaticBuildPin(pin), pin);
assert.equal(validateStaticBuild(bytes, pin).schema, staticBuildSchema);
if (approvedStaticBuild === null)
  assert.throws(() => validateStaticBuildPin(approvedStaticBuild), /no separately reviewed pin/);
else assert.equal(validateStaticBuildPin(approvedStaticBuild), approvedStaticBuild,
  'future reviewed static build pin must remain structurally valid');
const expectedBuildPath = path.join(root, ...pinPath.split('/'));
assert.equal(resolvePinnedBuildPath(root, pin), expectedBuildPath);
assert.equal(resolvePinnedBuildPath(root, pin, expectedBuildPath), expectedBuildPath);
assertExactServedBuild(bytes, Buffer.from(bytes));
const firstFrameStages = [];
const navFailure = new Error('navigation failed');
await assert.rejects(() => attemptFirstFrame(async () => { throw navFailure; },
  async () => firstFrameStages.push('settled'),
  async error => firstFrameStages.push(`diagnosed: ${error.message}`)),
error => error === navFailure);
assert.deepEqual(firstFrameStages, ['diagnosed: navigation failed']);
const settleFailure = new Error('first frame failed');
await assert.rejects(() => attemptFirstFrame(async () => firstFrameStages.push('navigated'),
  async () => { throw settleFailure; },
  async error => firstFrameStages.push(`diagnosed: ${error.message}`)),
error => error === settleFailure);
assert.deepEqual(firstFrameStages.slice(-2), ['navigated', 'diagnosed: first frame failed']);
await assert.doesNotReject(() => attemptFirstFrame(async () => {}, async () => {},
  async () => assert.fail('success must not write a first-frame failure')));
assert.equal(validateDedicatedOrigin('http://127.0.0.1:4186/').href,
  'http://127.0.0.1:4186/');
assert.equal(validateStaticBuildPath(pinPath), pinPath);
assert.equal(validateLiveRunName(liveRun), liveRun);
assert.equal(validateLiveRunName('run-2026-10-01T03-27-52-699Z-35187-01234567-89ab-cdef-0123-456789abcdef'),
  'run-2026-10-01T03-27-52-699Z-35187-01234567-89ab-cdef-0123-456789abcdef');
assert.equal(validatePackagePath('assets/theme.bin'), 'assets/theme.bin');

assert.throws(() => validateStaticBuildPin(null), /no separately reviewed pin/);
assert.throws(() => validateStaticBuildPath('.artifacts/bend2/2032-static-preview-v1/run-x/build.json'),
  /2032-2 preview root/);
assert.throws(() => validateStaticBuildPath(`${staticPreviewRoot}/../escape/build.json`),
  /2032-2 preview root/);
assert.throws(() => validateStaticBuildPath(`${staticPreviewRoot}/${staticRun}/manifest.json`),
  /2032-2 preview root/);
assert.throws(() => validateStaticBuildPath(`${staticPreviewRoot}\\${staticRun}\\build.json`),
  /2032-2 preview root/);
assert.throws(() => resolvePinnedBuildPath(root, pin, path.join(root, 'other', 'build.json')),
  /differs from the separately reviewed static build pin/);
assert.throws(() => resolvePinnedBuildPath(root, pin, 'relative/build.json'), /must be absolute/);

const wrongSchema = { ...build, schema: 'rift-bend-browser-static-preview/2032-1' };
const wrongSchemaBytes = Buffer.from(JSON.stringify(wrongSchema));
assert.throws(() => validateStaticBuild(wrongSchemaBytes,
  { ...pin, rawSha256: hash(wrongSchemaBytes) }), /unsupported static browser build schema/);
assert.throws(() => validateStaticBuild(bytes, { ...pin, rawSha256: '0'.repeat(64) }),
  /raw bytes differ/);
for (const [field, value, message] of [
  ['version', '0'.repeat(20), /version differs/],
  ['bundleSourceRevision', '0'.repeat(40), /source commit differs/],
  ['bundleSourceTree', '0'.repeat(40), /source tree differs/],
  ['packerRevision', '0'.repeat(40), /packer commit differs/],
  ['packerTree', '0'.repeat(40), /packer tree differs/],
]) {
  assert.throws(() => validateStaticBuild(bytes, { ...pin, [field]: value }), message);
}
const wrongScope = { ...build, scope: 'caller supplied scope' };
const wrongScopeBytes = Buffer.from(JSON.stringify(wrongScope));
assert.throws(() => validateStaticBuild(wrongScopeBytes,
  { ...pin, rawSha256: hash(wrongScopeBytes) }), /scope differs from its reviewed pin/);
const wrongPacker = { ...build, packer: { ...build.packer, file: 'bend2/tools/build.ts' } };
const wrongPackerBytes = Buffer.from(JSON.stringify(wrongPacker));
assert.throws(() => validateStaticBuild(wrongPackerBytes,
  { ...pin, rawSha256: hash(wrongPackerBytes) }), /was not emitted by browser-preview-v2/);
const unsafeFiles = { ...build, files: Object.fromEntries([
  ...Object.entries(build.files), ['../escape.js', '2'.repeat(64)],
].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) };
const unsafeFilesBytes = Buffer.from(JSON.stringify(unsafeFiles));
assert.throws(() => validateStaticBuild(unsafeFilesBytes,
  { ...pin, rawSha256: hash(unsafeFilesBytes) }), /unsafe/);
const invalidFileHash = { ...build, files: { ...build.files, 'index.html': 'not-a-hash' } };
const invalidFileHashBytes = Buffer.from(JSON.stringify(invalidFileHash));
assert.throws(() => validateStaticBuild(invalidFileHashBytes,
  { ...pin, rawSha256: hash(invalidFileHashBytes) }), /invalid package file SHA-256/);

assert.throws(() => assertExactServedBuild(bytes, Buffer.from(`${bytes} `)), /differs from the exact locally pinned/);
for (const unsafe of ['../escape', '/absolute.js', 'assets\\file.js', './index.html', 'a//b.js'])
  assert.throws(() => validatePackagePath(unsafe), /unsafe|relative|forward slashes|canonical/);
for (const url of ['http://localhost:4186/', 'http://127.0.0.1/',
  'http://127.0.0.1:4184/', 'http://127.0.0.1:4185/',
  'http://127.0.0.1:4186/path', 'http://127.0.0.1:4186/?x=1',
  'https://127.0.0.1:4186/'])
  assert.throws(() => validateDedicatedOrigin(url));
for (const name of ['../run-x', 'run-./escape', 'run-name/child', 'profile'])
  assert.throws(() => validateLiveRunName(name));

console.log(JSON.stringify({ schema: 'rift-bend-browser-v2-live-2032-pure-test/1',
  passed: true, liveBrowserLaunched: false }));
