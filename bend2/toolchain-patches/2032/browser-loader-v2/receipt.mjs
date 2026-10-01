import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { moduleSpecs } from '../../../tools/selected-modules.mjs';

export const cacheModuleNames = Object.freeze(Object.keys(moduleSpecs).sort());

const receiptSchema = 'rift-bend-2032-browser-loader-v2-cache-receipt/1';
const cacheSchema = 'rift-bend-selected-cache/2032-2';
const sha256Pattern = /^[0-9a-f]{64}$/;
const gitObjectPattern = /^[0-9a-f]{40}$/;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function exactKeys(value, expected, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value),
    `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(),
    `${label} has missing or unexpected fields`);
}

function validateSource(source, label) {
  exactKeys(source, ['commit', 'tree'], label);
  assert.match(source.commit, gitObjectPattern, `${label}.commit is invalid`);
  assert.match(source.tree, gitObjectPattern, `${label}.tree is invalid`);
}

export function parseBundleArguments(args) {
  const recognized = new Set(['--receipt', '--receipt-sha256',
    ...cacheModuleNames.map((name) => `--${name}`)]);
  assert.equal(args.length, recognized.size * 2,
    'pass --receipt, --receipt-sha256, and exactly one manifest path for each selected module');
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    assert.ok(recognized.has(option), `unknown option: ${option}`);
    assert.ok(!values.has(option), `duplicate option: ${option}`);
    const value = args[index + 1];
    assert.ok(typeof value === 'string' && value.length > 0, `missing value for ${option}`);
    values.set(option, value);
  }
  assert.deepEqual([...values.keys()].sort(), [...recognized].sort(),
    'receipt and all four explicit manifest paths are required');
  const receiptSha256 = values.get('--receipt-sha256');
  assert.match(receiptSha256, sha256Pattern,
    '--receipt-sha256 must be an independently supplied lowercase SHA-256');
  return {
    receiptPath: values.get('--receipt'),
    receiptSha256,
    manifestArgs: Object.fromEntries(cacheModuleNames.map((name) =>
      [name, values.get(`--${name}`)])),
  };
}

export function validateReceiptShape(receipt) {
  exactKeys(receipt, ['schema', 'cacheSchema', 'cacheSource', 'manifests'], 'receipt');
  assert.equal(receipt.schema, receiptSchema, 'unsupported 2.0.32 cache receipt schema');
  assert.equal(receipt.cacheSchema, cacheSchema, 'receipt is not for the 2032-2 cache verifier');
  validateSource(receipt.cacheSource, 'receipt.cacheSource');
  exactKeys(receipt.manifests, cacheModuleNames, 'receipt.manifests');

  const paths = new Set();
  for (const name of cacheModuleNames) {
    const entry = receipt.manifests[name];
    exactKeys(entry, ['manifestPath', 'manifestSha256', 'outputBytes', 'outputSha256',
      'sourceCommit', 'sourceTree'], `receipt.manifests.${name}`);
    assert.ok(typeof entry.manifestPath === 'string' && entry.manifestPath.length > 0,
      `${name} manifestPath must be nonempty`);
    assert.ok(!entry.manifestPath.includes('\\'), `${name} manifestPath must use POSIX separators`);
    assert.equal(path.posix.normalize(entry.manifestPath), entry.manifestPath,
      `${name} manifestPath is not canonical`);
    assert.ok(entry.manifestPath.startsWith('.artifacts/bend2/2032-preview/'),
      `${name} manifestPath must be inside the explicit 2.0.32 preview root`);
    assert.ok(!paths.has(entry.manifestPath), `duplicate manifest path binding: ${entry.manifestPath}`);
    paths.add(entry.manifestPath);
    assert.equal(path.posix.basename(entry.manifestPath), `${name}.manifest.json`,
      `${name} manifestPath has the wrong member name`);
    assert.match(entry.manifestSha256, sha256Pattern, `${name} raw manifest SHA-256 is invalid`);
    assert.ok(Number.isSafeInteger(entry.outputBytes) && entry.outputBytes > 0,
      `${name} outputBytes is invalid`);
    assert.match(entry.outputSha256, sha256Pattern, `${name} output SHA-256 is invalid`);
    assert.match(entry.sourceCommit, gitObjectPattern, `${name} source commit is invalid`);
    assert.match(entry.sourceTree, gitObjectPattern, `${name} source tree is invalid`);
    assert.equal(entry.sourceCommit, receipt.cacheSource.commit,
      `${name} receipt source commit mixes cache bindings`);
    assert.equal(entry.sourceTree, receipt.cacheSource.tree,
      `${name} receipt source tree mixes cache bindings`);
  }
  return receipt;
}

export function assertApprovedReceipt(approval, relativePath, rawSha256, receipt) {
  assert.ok(approval !== null && approval !== undefined,
    'no independently reviewed 2032-2 receipt pin is armed');
  exactKeys(approval, ['path', 'sha256', 'cacheSource'], 'reviewed receipt pin');
  assert.equal(approval.path, relativePath, 'receipt path differs from reviewed pin');
  assert.equal(approval.sha256, rawSha256, 'receipt SHA-256 differs from reviewed pin');
  validateSource(approval.cacheSource, 'reviewed receipt cacheSource');
  assert.deepEqual(validateReceiptShape(receipt).cacheSource, approval.cacheSource,
    'receipt cache source differs from reviewed pin');
  return approval;
}

export function assertReceiptMatchesCacheSet(receiptInput, verified, manifestPaths, repoRoot) {
  const receipt = validateReceiptShape(receiptInput);
  const names = cacheModuleNames;
  assert.deepEqual(Object.keys(verified?.modules ?? {}).sort(), names,
    'verified cache set does not contain exactly four selected modules');
  assert.deepEqual(Object.keys(manifestPaths ?? {}).sort(), names,
    'explicit cache paths do not contain exactly four selected modules');
  assert.equal(verified.commonBinding?.sourceCommit, receipt.cacheSource.commit,
    'verified cache source commit differs from independent receipt');
  assert.equal(verified.commonBinding?.sourceTree, receipt.cacheSource.tree,
    'verified cache source tree differs from independent receipt');

  const boundPaths = new Set();
  for (const name of names) {
    const expected = receipt.manifests[name];
    const suppliedPath = path.resolve(manifestPaths[name]);
    const suppliedRelative = path.relative(repoRoot, suppliedPath).split(path.sep).join('/');
    assert.equal(suppliedRelative, expected.manifestPath,
      `${name} explicit manifest path differs from independent receipt`);
    assert.ok(!boundPaths.has(suppliedRelative), `duplicate explicit manifest path: ${suppliedRelative}`);
    boundPaths.add(suppliedRelative);

    const member = verified.modules[name];
    assert.ok(Buffer.isBuffer(member?.manifestBytes), `${name} raw manifest bytes are missing`);
    assert.ok(Buffer.isBuffer(member?.bytes), `${name} verified output bytes are missing`);
    assert.equal(sha256(member.manifestBytes), expected.manifestSha256,
      `${name} raw manifest bytes differ from independent receipt`);
    assert.equal(member.bytes.length, expected.outputBytes,
      `${name} output byte count differs from independent receipt`);
    assert.equal(sha256(member.bytes), expected.outputSha256,
      `${name} output bytes differ from independent receipt`);
    assert.equal(member.manifest?.output?.bytes, expected.outputBytes,
      `${name} verifier manifest byte count differs from independent receipt`);
    assert.equal(member.manifest?.output?.sha256, expected.outputSha256,
      `${name} verifier manifest output hash differs from independent receipt`);
    assert.equal(member.manifest?.binding?.sourceCommit, expected.sourceCommit,
      `${name} verifier source commit differs from independent receipt`);
    assert.equal(member.manifest?.binding?.sourceTree, expected.sourceTree,
      `${name} verifier source tree differs from independent receipt`);
  }
  return receipt;
}
