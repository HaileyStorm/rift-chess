import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { approvedReceipt } from './approved-receipt.mjs';
import { assertApprovedReceipt, assertReceiptMatchesCacheSet,
  cacheModuleNames, parseBundleArguments, validateReceiptShape } from './receipt.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

const source = { commit: '1'.repeat(40), tree: '2'.repeat(40) };
const receipt = {
  schema: 'rift-bend-2032-browser-loader-v2-cache-receipt/1',
  cacheSchema: 'rift-bend-selected-cache/2032-2',
  cacheSource: { ...source },
  manifests: Object.fromEntries(cacheModuleNames.map((name, index) => [name, {
    manifestPath: `.artifacts/bend2/2032-preview/fixture-${name}/${name}.manifest.json`,
    manifestSha256: String(index + 3).repeat(64),
    outputBytes: index + 1,
    outputSha256: String(index + 4).repeat(64),
    sourceCommit: source.commit,
    sourceTree: source.tree,
  }])) ,
};

const validArgs = [
  '--receipt', 'bend2/toolchain-patches/2032/browser-loader-v2/receipts/independent.json',
  '--receipt-sha256', 'a'.repeat(64),
  ...cacheModuleNames.flatMap((name) => [`--${name}`,
    `.artifacts/bend2/2032-preview/${name}/${name}.manifest.json`]),
];

assert.doesNotThrow(() => parseBundleArguments(validArgs));
assert.doesNotThrow(() => validateReceiptShape(receipt));
const receiptPath = 'bend2/toolchain-patches/2032/browser-loader-v2/receipts/synthetic.json';
const receiptSha = 'a'.repeat(64);
const syntheticApproval = { path: receiptPath, sha256: receiptSha, cacheSource: source };
if (approvedReceipt === null) {
  assert.throws(() => assertApprovedReceipt(approvedReceipt, receiptPath, receiptSha, receipt),
    /no independently reviewed/);
} else {
  const raw = fs.readFileSync(path.join(repoRoot, approvedReceipt.path));
  assert.equal(sha(raw), approvedReceipt.sha256,
    'approved receipt raw bytes differ from the independently reviewed pin');
  const approvedShape = validateReceiptShape(JSON.parse(raw.toString('utf8')));
  assert.doesNotThrow(() => assertApprovedReceipt(approvedReceipt,
    approvedReceipt.path, approvedReceipt.sha256, approvedShape));
  const matchingShape = structuredClone(receipt);
  matchingShape.cacheSource = approvedReceipt.cacheSource;
  for (const entry of Object.values(matchingShape.manifests)) {
    entry.sourceCommit = approvedReceipt.cacheSource.commit;
    entry.sourceTree = approvedReceipt.cacheSource.tree;
  }
  assert.doesNotThrow(() => assertApprovedReceipt(approvedReceipt,
    approvedReceipt.path, approvedReceipt.sha256, matchingShape),
  'a future approved pin must remain internally valid');
}
assert.doesNotThrow(() => assertApprovedReceipt(syntheticApproval, receiptPath, receiptSha, receipt));
assert.throws(() => assertApprovedReceipt(syntheticApproval, 'different.json', receiptSha, receipt),
  /path differs/);
assert.throws(() => assertApprovedReceipt(syntheticApproval, receiptPath, 'b'.repeat(64), receipt),
  /SHA-256 differs/);
assert.throws(() => assertApprovedReceipt({ ...syntheticApproval,
  cacheSource: { ...source, tree: '3'.repeat(40) } }, receiptPath, receiptSha, receipt),
  /source differs/);
assert.throws(() => parseBundleArguments([]), /pass --receipt/);
assert.throws(() => parseBundleArguments(validArgs.filter((_, index) => index !== 1)), /pass --receipt/);
assert.throws(() => parseBundleArguments([
  ...validArgs.slice(0, 2), '--receipt', 'another.json', ...validArgs.slice(2),
]), /pass --receipt/);

const malformedSchema = structuredClone(receipt);
malformedSchema.schema = 'rift-bend-selected-cache/2032-1';
assert.throws(() => validateReceiptShape(malformedSchema), /unsupported 2.0.32/);
const malformedHash = structuredClone(receipt);
malformedHash.manifests.menu.manifestSha256 = 'not-a-sha256';
assert.throws(() => validateReceiptShape(malformedHash), /raw manifest SHA-256 is invalid/);
const malformedBytes = structuredClone(receipt);
malformedBytes.manifests.scene.outputBytes = 0;
assert.throws(() => validateReceiptShape(malformedBytes), /outputBytes is invalid/);

const duplicatePath = structuredClone(receipt);
duplicatePath.manifests.scene.manifestPath = duplicatePath.manifests.chrome.manifestPath;
assert.throws(() => validateReceiptShape(duplicatePath), /duplicate manifest path binding/);

const mixedCommit = structuredClone(receipt);
mixedCommit.manifests.controller.sourceCommit = '3'.repeat(40);
assert.throws(() => validateReceiptShape(mixedCommit), /source commit mixes cache bindings/);
const mixedTree = structuredClone(receipt);
mixedTree.manifests.scene.sourceTree = '4'.repeat(40);
assert.throws(() => validateReceiptShape(mixedTree), /source tree mixes cache bindings/);

// Pure in-memory contract test only: no cache manifests/files or compiler are loaded.
const bound = structuredClone(receipt);
const verified = { commonBinding: { sourceCommit: source.commit, sourceTree: source.tree }, modules: {} };
const manifestPaths = {};
for (const name of cacheModuleNames) {
  const entry = bound.manifests[name];
  const manifestBytes = Buffer.from(`synthetic ${name} manifest`);
  const outputBytes = Buffer.from(`synthetic ${name} output`);
  entry.manifestSha256 = sha(manifestBytes);
  entry.outputBytes = outputBytes.length;
  entry.outputSha256 = sha(outputBytes);
  manifestPaths[name] = path.resolve(repoRoot, entry.manifestPath);
  verified.modules[name] = { manifestBytes, bytes: outputBytes,
    manifest: { output: { bytes: outputBytes.length, sha256: entry.outputSha256 },
      binding: { sourceCommit: source.commit, sourceTree: source.tree } } };
}
const matches = (candidate = bound, members = verified, paths = manifestPaths) =>
  assertReceiptMatchesCacheSet(candidate, members, paths, repoRoot);
assert.doesNotThrow(() => matches(), 'synthetic in-memory shape is internally consistent');
const wrongManifest = structuredClone(bound);
wrongManifest.manifests.menu.manifestSha256 = '0'.repeat(64);
assert.throws(() => matches(wrongManifest), /raw manifest bytes differ/);
const wrongOutput = structuredClone(bound);
wrongOutput.manifests.scene.outputSha256 = '0'.repeat(64);
assert.throws(() => matches(wrongOutput), /output bytes differ/);
assert.throws(() => matches(bound, verified, { ...manifestPaths,
  chrome: path.join(repoRoot, '.artifacts/bend2/2032-preview/other/chrome.manifest.json') }),
  /explicit manifest path differs/);
const wrongSource = structuredClone(bound);
wrongSource.cacheSource.commit = '5'.repeat(40);
wrongSource.manifests = Object.fromEntries(cacheModuleNames.map(name => [name, {
  ...wrongSource.manifests[name], sourceCommit: wrongSource.cacheSource.commit }]));
assert.throws(() => matches(wrongSource), /verified cache source commit differs/);

console.log(JSON.stringify({ schema: 'rift-bend-browser-loader-v2-input-test/1', passed: true,
  accepted: 'synthetic in-memory receipt matching only; no cache-set verifier invoked',
  rejected: ['missing-receipt-input', 'malformed-receipt-schema', 'malformed-hash',
    'invalid-output-size', 'duplicate-manifest-path', 'mixed-source-commit', 'mixed-source-tree',
    'unarmed-or-mismatched-review-pin', 'raw-manifest', 'output', 'explicit-path', 'verified-source'],
  scope: 'pure input contract only; no cache bytes, Bun build, browser render or static package' }));
