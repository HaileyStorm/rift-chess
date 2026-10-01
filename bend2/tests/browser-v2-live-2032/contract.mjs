import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const staticBuildSchema = 'rift-bend-browser-static-preview/2032-2';
export const staticPackerPath = 'bend2/toolchain-patches/2032/browser-preview-v2/pack-static.mjs';
export const staticPreviewRoot = '.artifacts/bend2/2032-static-preview-v2';
export const liveArtifactRoot = '.artifacts/bend2/2032-browser-live-v2';
export const staticBuildScope = 'ignored local 2.0.32-2 static preview; independently pinned cache and Worker bundle; not published or release-ready';

const sha256Pattern = /^[a-f0-9]{64}$/;
const gitObjectPattern = /^[a-f0-9]{40}$/;
const buildVersionPattern = /^[a-f0-9]{20}$/;
const staticBuildPathPattern = /^\.artifacts\/bend2\/2032-static-preview-v2\/run-[A-Za-z0-9][A-Za-z0-9._-]{0,140}\/build\.json$/;
const packagePathPattern = /^[A-Za-z0-9._/-]+$/;
const pinKeys = ['path', 'rawSha256', 'version', 'bundleSourceRevision', 'bundleSourceTree',
  'packerRevision', 'packerTree', 'scope'];

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function validateStaticBuildPath(value) {
  assert.equal(typeof value, 'string', 'static build path must be a string');
  assert.match(value, staticBuildPathPattern,
    'static build path must name one run under the 2032-2 preview root');
  assert.equal(value.split('/').length, 5, 'static build path is not canonical');
  return value;
}

export function validateStaticBuildPin(pin) {
  assert.ok(pin && typeof pin === 'object' && !Array.isArray(pin),
    'static browser build has no separately reviewed pin');
  assert.deepEqual(Object.keys(pin).sort(order), [...pinKeys].sort(order),
    'static browser build pin fields differ');
  validateStaticBuildPath(pin.path);
  assert.match(pin.rawSha256, sha256Pattern, 'static build pin needs the raw build.json SHA-256');
  assert.match(pin.version, buildVersionPattern, 'static build pin version is invalid');
  for (const key of ['bundleSourceRevision', 'bundleSourceTree', 'packerRevision', 'packerTree'])
    assert.match(pin[key], gitObjectPattern, `static build pin ${key} is invalid`);
  assert.equal(pin.scope, staticBuildScope, 'static build pin scope differs');
  return pin;
}

export function resolvePinnedBuildPath(repoRoot, pin, candidate = null) {
  validateStaticBuildPin(pin);
  assert.ok(path.isAbsolute(repoRoot), 'repository root must be absolute');
  const root = path.resolve(repoRoot);
  const expected = path.resolve(root, ...pin.path.split('/'));
  const actual = candidate === null ? expected : candidate;
  assert.ok(path.isAbsolute(actual), 'local build.json path must be absolute');
  assert.equal(path.resolve(actual), expected,
    'local build.json path differs from the separately reviewed static build pin');
  return expected;
}

export function validatePackagePath(value) {
  assert.equal(typeof value, 'string', 'package file path must be a string');
  assert.match(value, packagePathPattern, 'unsafe package file path');
  assert.ok(!value.startsWith('/'), 'package file path must be relative');
  assert.ok(!value.includes('\\'), 'package file path must use forward slashes');
  assert.equal(path.posix.normalize(value), value, 'package file path is not canonical');
  assert.ok(value.split('/').every(part => part && part !== '.' && part !== '..'),
    'package file path contains an unsafe segment');
  return value;
}

export function validateStaticBuild(bytes, pin) {
  validateStaticBuildPin(pin);
  assert.ok(Buffer.isBuffer(bytes) || bytes instanceof Uint8Array,
    'local build.json bytes are required');
  const raw = Buffer.from(bytes);
  assert.equal(sha256(raw), pin.rawSha256, 'local build.json raw bytes differ from the reviewed pin');

  let build;
  try { build = JSON.parse(raw.toString('utf8')); }
  catch (error) { assert.fail(`local build.json is not valid JSON: ${error.message}`); }
  assert.ok(build && typeof build === 'object' && !Array.isArray(build),
    'local build.json must be an object');
  assert.equal(build.schema, staticBuildSchema, 'unsupported static browser build schema');
  assert.equal(build.version, pin.version, 'static build version differs from its reviewed pin');
  assert.equal(build.bundleSourceRevision, pin.bundleSourceRevision,
    'static build source commit differs from its reviewed pin');
  assert.equal(build.bundleSourceTree, pin.bundleSourceTree,
    'static build source tree differs from its reviewed pin');
  assert.equal(build.packerRevision, pin.packerRevision,
    'static build packer commit differs from its reviewed pin');
  assert.equal(build.packerTree, pin.packerTree,
    'static build packer tree differs from its reviewed pin');
  assert.equal(build.scope, pin.scope, 'static build scope differs from its reviewed pin');
  assert.equal(build.cacheSchema, 'rift-bend-selected-cache/2032-2');
  assert.equal(build.bundle?.schema, 'rift-bend-2032-worker-bundle-probe-v2/1');
  assert.equal(build.bundle?.sourceRevision, pin.bundleSourceRevision);
  assert.equal(build.bundle?.sourceTree, pin.bundleSourceTree);
  assert.equal(build.packer?.version, '2032-2');
  assert.equal(build.packer?.file, staticPackerPath,
    'static build was not emitted by browser-preview-v2/pack-static.mjs');
  assert.match(build.packer?.sha256 ?? '', sha256Pattern, 'static packer source SHA-256 is invalid');
  assert.equal(build.networkCalls, 0, 'static packer reports unexpected network access');
  assert.equal(build.acceptance?.target, 'hotseat first-render smoke only');
  assert.equal(build.acceptance?.preparedGround, false);
  assert.equal(build.acceptance?.botWorkerLibrary, false);
  assert.equal(build.acceptance?.offline, false);
  assert.equal(build.acceptance?.rendered, false);
  assert.equal(build.acceptance?.fullBrowserAcceptance, false);

  assert.ok(build.files && typeof build.files === 'object' && !Array.isArray(build.files),
    'static build files must be a hash map');
  const names = Object.keys(build.files);
  assert.ok(names.length > 0, 'static build has no package files');
  assert.deepEqual(names, [...names].sort(order), 'static build file hashes are not sorted');
  assert.ok(names.includes('index.html') && names.includes('sw.js'),
    'static build is missing its page or service worker');
  for (const [name, digest] of Object.entries(build.files)) {
    validatePackagePath(name);
    assert.match(digest, sha256Pattern, `invalid package file SHA-256: ${name}`);
  }
  return build;
}

export function assertExactServedBuild(localBytes, servedBytes) {
  assert.deepEqual(Buffer.from(servedBytes), Buffer.from(localBytes),
    'served build.json differs from the exact locally pinned bytes');
}

export async function attemptFirstFrame(navigate, settle, diagnose) {
  try { await navigate(); await settle(); }
  catch (error) {
    try { await diagnose(error); }
    catch (diagnosticError) {
      console.error(`first-frame diagnostic failed: ${String(diagnosticError).slice(0, 500)}`);
    }
    throw error;
  }
}

export function validateDedicatedOrigin(value) {
  assert.equal(typeof value, 'string', 'dedicated browser origin must be a string');
  let address;
  try { address = new URL(value); }
  catch { assert.fail('dedicated browser origin is not a URL'); }
  assert.equal(address.protocol, 'http:', 'browser smoke origin must use plain loopback HTTP');
  assert.equal(address.hostname, '127.0.0.1', 'browser smoke origin must use 127.0.0.1');
  assert.ok(address.port, 'browser smoke origin must use a dedicated explicit port');
  assert.ok(Number(address.port) > 0, 'browser smoke origin port must not be zero');
  assert.ok(!['4184', '4185'].includes(address.port),
    'browser smoke origin must not reuse an existing test origin');
  assert.ok(!address.username && !address.password && address.pathname === '/' &&
    !address.search && !address.hash, 'browser smoke origin must be an isolated origin root');
  assert.equal(value, address.href, 'browser smoke origin must be canonical');
  return address;
}

export function validateLiveRunName(value) {
  assert.equal(typeof value, 'string', 'browser artifact run name must be a string');
  assert.match(value, /^run-[A-Za-z0-9][A-Za-z0-9_-]{0,140}$/,
    'browser artifacts must use a fresh run directory name');
  return value;
}
