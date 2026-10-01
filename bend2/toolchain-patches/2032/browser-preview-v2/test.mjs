import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { approvedBundle } from './approved-bundle.mjs';
import { assertApprovedBundle, bundleSchema, bundleScope, bundleSourceFiles,
  parseArguments, validateBundleManifest, verifyRevisionBinding } from './pack-static.mjs';
import { approvedReceipt } from '../browser-loader-v2/approved-receipt.mjs';
import { assertApprovedReceipt, assertReceiptMatchesCacheSet, cacheModuleNames,
  parseBundleArguments, validateReceiptShape } from '../browser-loader-v2/receipt.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const cacheSource = { commit: '1'.repeat(40), tree: '2'.repeat(40) };
const fakeSha = value => value.toString(16).padStart(2, '0').repeat(32);
const receiptPath = 'bend2/toolchain-patches/2032/browser-loader-v2/receipts/synthetic.json';
const receiptBytes = Buffer.from('synthetic receipt bytes');
const receiptSha256 = sha256(receiptBytes);
const receipt = {
  schema: 'rift-bend-2032-browser-loader-v2-cache-receipt/1',
  cacheSchema: 'rift-bend-selected-cache/2032-2',
  cacheSource: { ...cacheSource },
  manifests: Object.fromEntries(cacheModuleNames.map((name, index) => [name, {
    manifestPath: `.artifacts/bend2/2032-preview/synthetic-${name}/${name}.manifest.json`,
    manifestSha256: fakeSha(index + 3),
    outputBytes: 40 + index,
    outputSha256: fakeSha(index + 7),
    sourceCommit: cacheSource.commit,
    sourceTree: cacheSource.tree,
  }])),
};

assert.doesNotThrow(() => validateReceiptShape(receipt));
const malformedReceipt = structuredClone(receipt);
malformedReceipt.cacheSchema = 'rift-bend-selected-cache/2032-1';
assert.throws(() => validateReceiptShape(malformedReceipt), /not for the 2032-2 cache verifier/);
const invalidReceiptBytes = structuredClone(receipt);
invalidReceiptBytes.manifests.scene.outputBytes = 0;
assert.throws(() => validateReceiptShape(invalidReceiptBytes), /outputBytes is invalid/);
if (approvedReceipt === null) {
  assert.throws(() => assertApprovedReceipt(approvedReceipt, receiptPath, receiptSha256, receipt),
    /no independently reviewed 2032-2 receipt pin is armed/);
} else {
  const matching = structuredClone(receipt);
  matching.cacheSource = approvedReceipt.cacheSource;
  for (const member of Object.values(matching.manifests)) {
    member.sourceCommit = approvedReceipt.cacheSource.commit;
    member.sourceTree = approvedReceipt.cacheSource.tree;
  }
  assert.doesNotThrow(() => assertApprovedReceipt(approvedReceipt,
    approvedReceipt.path, approvedReceipt.sha256, matching));
}
const receiptApproval = { path: receiptPath, sha256: receiptSha256, cacheSource };
assert.doesNotThrow(() => assertApprovedReceipt(receiptApproval, receiptPath, receiptSha256, receipt));
assert.throws(() => assertApprovedReceipt(receiptApproval, 'different.json', receiptSha256, receipt),
  /receipt path differs/);
assert.throws(() => assertApprovedReceipt(receiptApproval, receiptPath, 'a'.repeat(64), receipt),
  /receipt SHA-256 differs/);
assert.throws(() => assertApprovedReceipt({ ...receiptApproval,
  cacheSource: { ...cacheSource, tree: '3'.repeat(40) } }, receiptPath, receiptSha256, receipt),
  /receipt cache source differs/);

const validReceiptArgs = ['--receipt', receiptPath, '--receipt-sha256', receiptSha256,
  ...cacheModuleNames.flatMap(name => [`--${name}`, receipt.manifests[name].manifestPath])];
assert.deepEqual(parseBundleArguments(validReceiptArgs).manifestArgs,
  Object.fromEntries(cacheModuleNames.map(name => [name, receipt.manifests[name].manifestPath])));
assert.throws(() => parseBundleArguments([]), /pass --receipt/);

const verified = { commonBinding: { sourceCommit: cacheSource.commit, sourceTree: cacheSource.tree }, modules: {} };
const manifestPaths = {};
for (const name of cacheModuleNames) {
  const member = receipt.manifests[name];
  const manifestBytes = Buffer.from(`synthetic ${name} manifest`);
  const outputBytes = Buffer.from(`synthetic ${name} output`);
  member.manifestSha256 = sha256(manifestBytes);
  member.outputBytes = outputBytes.length;
  member.outputSha256 = sha256(outputBytes);
  manifestPaths[name] = path.resolve(root, member.manifestPath);
  verified.modules[name] = { manifestBytes, bytes: outputBytes,
    manifest: { output: { bytes: outputBytes.length, sha256: member.outputSha256 },
      binding: { sourceCommit: cacheSource.commit, sourceTree: cacheSource.tree } } };
}
validateReceiptShape(receipt);
assert.doesNotThrow(() => assertReceiptMatchesCacheSet(receipt, verified, manifestPaths, root));
const wrongManifest = structuredClone(receipt);
wrongManifest.manifests.menu.manifestSha256 = '0'.repeat(64);
assert.throws(() => assertReceiptMatchesCacheSet(wrongManifest, verified, manifestPaths, root),
  /raw manifest bytes differ/);
const wrongOutputReceipt = structuredClone(receipt);
wrongOutputReceipt.manifests.scene.outputSha256 = '0'.repeat(64);
assert.throws(() => assertReceiptMatchesCacheSet(wrongOutputReceipt, verified, manifestPaths, root),
  /output bytes differ/);
const wrongOutputBytes = { ...verified, modules: { ...verified.modules,
  scene: { ...verified.modules.scene, bytes: Buffer.from('tampered output') } } };
assert.throws(() => assertReceiptMatchesCacheSet(receipt, wrongOutputBytes, manifestPaths, root),
  /output byte count differs|output bytes differ/);
const wrongPath = { ...manifestPaths,
  chrome: path.join(root, '.artifacts/bend2/2032-preview/other/chrome.manifest.json') };
assert.throws(() => assertReceiptMatchesCacheSet(receipt, verified, wrongPath, root),
  /explicit manifest path differs/);
const wrongSource = structuredClone(receipt);
wrongSource.cacheSource.commit = '5'.repeat(40);
for (const name of cacheModuleNames) wrongSource.manifests[name].sourceCommit = wrongSource.cacheSource.commit;
assert.throws(() => assertReceiptMatchesCacheSet(wrongSource, verified, manifestPaths, root),
  /verified cache source commit differs/);

const helperBytes = Buffer.from('synthetic sprite helper');
const helperSha = sha256(helperBytes);
const helperFile = `sprite-helper-${helperSha.slice(0, 12)}.js`;
const workerBytes = Buffer.from(`import './${helperFile}'; synthetic worker`);
const workerSha = sha256(workerBytes);
const workerFile = `worker-${workerSha.slice(0, 12)}.js`;
const outputs = new Map([[helperFile, helperBytes], [workerFile, workerBytes]]);
const sourcePathSet = [...new Set([...bundleSourceFiles, receiptPath])].sort();
const sources = new Map(sourcePathSet.map(file => [file, Buffer.from(`synthetic source ${file}`)]));
const bunRuntime = { version: '1.4.2', executable: '.artifacts/toolchains/runtime/bun.exe',
  sha256: 'd'.repeat(64) };
const manifestPath = '.artifacts/bend2/2032-browser-probe-v2/worker-synthetic/worker-v2.manifest.json';
const manifest = {
  schema: bundleSchema,
  sourceRevision: '9'.repeat(40),
  sourceTree: '8'.repeat(40),
  cacheSourceCommit: cacheSource.commit,
  cacheSourceTree: cacheSource.tree,
  cacheSchema: 'rift-bend-selected-cache/2032-2',
  independentReceipt: { path: receiptPath, sha256: receiptSha256 },
  bunRuntime,
  cacheManifests: Object.fromEntries(cacheModuleNames.map(name => {
    const member = receipt.manifests[name];
    return [name, { path: member.manifestPath, manifestSha256: member.manifestSha256,
      outputBytes: member.outputBytes, outputSha256: member.outputSha256,
      sourceCommit: member.sourceCommit, sourceTree: member.sourceTree }];
  })),
  outputs: [
    { file: helperFile, bytes: helperBytes.length, sha256: helperSha },
    { file: workerFile, bytes: workerBytes.length, sha256: workerSha },
  ],
  sourceFiles: sourcePathSet.map(file => ({ file, sha256: sha256(sources.get(file)) })),
  networkCalls: 0,
  scope: bundleScope,
};

const encodeManifest = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const runBundleCheck = (value = manifest, options = {}) => {
  const bytes = encodeManifest(value);
  const pin = options.approval ?? { path: manifestPath, sha256: sha256(bytes),
    sourceRevision: value.sourceRevision, sourceTree: value.sourceTree,
    cacheSource: { commit: value.cacheSourceCommit, tree: value.cacheSourceTree } };
  return validateBundleManifest({ manifestBytes: bytes, manifestPath: options.manifestPath ?? manifestPath,
    suppliedSha256: options.suppliedSha256 ?? sha256(bytes), approval: pin,
    receipt: options.receipt ?? receipt, receiptPath: options.receiptPath ?? receiptPath,
    receiptSha256: options.receiptSha256 ?? receiptSha256, bunRuntime,
    readOutput: file => options.readOutput ? options.readOutput(file) : outputs.get(file),
    readSource: file => options.readSource ? options.readSource(file) : sources.get(file) });
};

if (approvedBundle === null) {
  assert.throws(() => assertApprovedBundle(approvedBundle, manifestPath, 'e'.repeat(64), manifest),
    /no independently reviewed 2.0.32-2 static bundle pin is armed/);
} else {
  const matching = structuredClone(manifest);
  matching.sourceRevision = approvedBundle.sourceRevision;
  matching.sourceTree = approvedBundle.sourceTree;
  matching.cacheSourceCommit = approvedBundle.cacheSource.commit;
  matching.cacheSourceTree = approvedBundle.cacheSource.tree;
  assert.doesNotThrow(() => assertApprovedBundle(approvedBundle,
    approvedBundle.path, approvedBundle.sha256, matching));
}
assert.deepEqual(parseArguments(['--manifest', manifestPath, '--sha256', 'e'.repeat(64)]),
  { manifest: manifestPath, sha256: 'e'.repeat(64) });
assert.throws(() => parseArguments(['--manifest', manifestPath]), /pass exactly/);
assert.throws(() => parseArguments(['--manifest', manifestPath, '--sha256', 'bad']), /lowercase SHA-256/);
const validBundle = runBundleCheck();
assert.equal(validBundle.outputs.worker.file, workerFile);
assert.equal(validBundle.manifestSha256, sha256(encodeManifest(manifest)));

const malformedSchema = structuredClone(manifest);
malformedSchema.schema = 'rift-bend-2032-worker-bundle-probe/1';
assert.throws(() => runBundleCheck(malformedSchema), /unsupported 2.0.32-2 Worker bundle schema/);
assert.throws(() => runBundleCheck(manifest, { manifestPath:
  '.artifacts/bend2/2032-browser-probe-v2/worker-other/worker-v2.manifest.json' }),
  /bundle manifest path differs/);
assert.throws(() => runBundleCheck(manifest, { approval: { path: manifestPath,
  sha256: sha256(encodeManifest(manifest)), sourceRevision: '7'.repeat(40),
  sourceTree: manifest.sourceTree, cacheSource } }), /bundle source revision differs/);
assert.throws(() => runBundleCheck(manifest, { suppliedSha256: 'a'.repeat(64) }),
  /raw bytes differ from the independently supplied SHA-256/);
assert.throws(() => runBundleCheck(manifest, { receiptPath: `${receiptPath}.other` }),
  /bundle receipt path\/hash differs/);
const mixedCache = structuredClone(receipt);
mixedCache.manifests.menu.manifestPath = '.artifacts/bend2/2032-preview/other/menu.manifest.json';
assert.throws(() => runBundleCheck(manifest, { receipt: mixedCache }),
  /bundle cache manifest pins differ/);
assert.throws(() => runBundleCheck(manifest, { readOutput: file =>
  file === workerFile ? Buffer.from('changed worker') : outputs.get(file) }), /output byte count differs|output bytes differ/);
assert.throws(() => runBundleCheck(manifest, { readSource: file =>
  file === bundleSourceFiles[0] ? Buffer.from('changed source') : sources.get(file) }), /source bytes differ/);
const malformedOutput = structuredClone(manifest);
malformedOutput.outputs[0].file = '../sprite-helper.js';
assert.throws(() => runBundleCheck(malformedOutput), /invalid sprite-helper output path/);
const malformedOutputHash = structuredClone(manifest);
malformedOutputHash.outputs[0].sha256 = 'f'.repeat(64);
assert.throws(() => runBundleCheck(malformedOutputHash), /content name differs from its hash/);
const malformedSourcePath = structuredClone(manifest);
malformedSourcePath.sourceFiles[0].file = 'bend2/unbound-source.mjs';
assert.throws(() => runBundleCheck(malformedSourcePath), /bundle source file set or ordering differs/);
const extraField = { ...structuredClone(manifest), unreviewed: true };
assert.throws(() => runBundleCheck(extraField), /v2 bundle manifest has missing or unexpected fields/);

const identity = { sourceRevision: manifest.sourceRevision, sourceTree: manifest.sourceTree,
  cacheSourceCommit: manifest.cacheSourceCommit };
assert.doesNotThrow(() => verifyRevisionBinding(identity, { packerRevision: '7'.repeat(40),
  packerTree: '6'.repeat(40), commitTree: () => identity.sourceTree,
  isAncestor: () => true, browserTreeEqual: () => true }));
assert.throws(() => verifyRevisionBinding(identity, { packerRevision: '7'.repeat(40),
  packerTree: '6'.repeat(40), commitTree: () => '5'.repeat(40),
  isAncestor: () => true, browserTreeEqual: () => true }), /source tree does not match/);
assert.throws(() => verifyRevisionBinding(identity, { packerRevision: '7'.repeat(40),
  packerTree: '6'.repeat(40), commitTree: () => identity.sourceTree,
  isAncestor: (ancestor, descendant) => ancestor === identity.cacheSourceCommit,
  browserTreeEqual: () => true }), /not an ancestor/);
assert.throws(() => verifyRevisionBinding(identity, { packerRevision: '7'.repeat(40),
  packerTree: '6'.repeat(40), commitTree: () => identity.sourceTree,
  isAncestor: () => false, browserTreeEqual: () => true }), /cache source revision is not an ancestor/);
assert.throws(() => verifyRevisionBinding(identity, { packerRevision: '7'.repeat(40),
  packerTree: '6'.repeat(40), commitTree: () => identity.sourceTree,
  isAncestor: () => true, browserTreeEqual: () => false }), /browser source tree changed/);

const swTemplate = fs.readFileSync(path.join(root,
  'bend2/toolchain-patches/2032/browser-preview-v2/sw-v2.template.js'), 'utf8');
assert.equal((swTemplate.match(/__BEND_BUILD__/g) ?? []).length, 1);
assert.equal((swTemplate.match(/__BEND_ASSETS__/g) ?? []).length, 1);
const swSource = swTemplate.replace('__BEND_BUILD__', 'fixture-build')
  .replace('__BEND_ASSETS__', '["./index.html"]');
async function exerciseServiceWorker(scope, existing) {
  const listeners = {};
  const opened = [];
  const deleted = [];
  const self = { registration: { scope }, location: { href: scope + 'sw.js' },
    addEventListener: (name, handler) => { listeners[name] = handler; },
    skipWaiting: async () => {}, clients: { claim: async () => {} } };
  const caches = { keys: async () => existing,
    open: async name => { opened.push(name); return { addAll: async () => {} }; },
    delete: async name => { deleted.push(name); return true; } };
  vm.runInNewContext(swSource, { self, caches, URL, encodeURIComponent,
    Request: class { constructor(url) { this.url = url; } } }, { timeout: 1000 });
  for (const name of ['install', 'activate']) {
    let pending;
    listeners[name]({ waitUntil: promise => { pending = Promise.resolve(promise); } });
    await pending;
  }
  return { opened, deleted };
}
const firstScope = 'http://127.0.0.1:45678/first/';
const secondScope = 'http://127.0.0.1:45678/second/';
const nestedScope = firstScope + '-nested/';
const firstPrefix = `rift-bend-v2-${encodeURIComponent(firstScope)}|`;
const secondPrefix = `rift-bend-v2-${encodeURIComponent(secondScope)}|`;
const nestedPrefix = `rift-bend-v2-${encodeURIComponent(nestedScope)}|`;
const existingCaches = [firstPrefix + 'old-build', secondPrefix + 'old-build',
  nestedPrefix + 'old-build',
  'rift-bend-v1-historical'];
const firstSw = await exerciseServiceWorker(firstScope, existingCaches);
const secondSw = await exerciseServiceWorker(secondScope, existingCaches);
const nestedSw = await exerciseServiceWorker(nestedScope, existingCaches);
assert.deepEqual(firstSw.opened, [firstPrefix + 'fixture-build']);
assert.deepEqual(secondSw.opened, [secondPrefix + 'fixture-build']);
assert.deepEqual(nestedSw.opened, [nestedPrefix + 'fixture-build']);
assert.deepEqual(firstSw.deleted, [firstPrefix + 'old-build']);
assert.deepEqual(secondSw.deleted, [secondPrefix + 'old-build']);
assert.deepEqual(nestedSw.deleted, [nestedPrefix + 'old-build']);

console.log(JSON.stringify({ schema: 'rift-bend-browser-preview-v2-pure-test/1', passed: true,
  accepted: ['synthetic receipt-to-cache bindings', 'synthetic 2.0.32-2 bundle contract',
    'synthetic source, output and revision bindings', 'scope-isolated service-worker cache activation'],
  rejected: ['unarmed and mismatched pins', 'receipt path/hash/cache/source mismatch',
    'manifest path/hash/schema mismatch', 'cache-manifest mismatch', 'output path/hash/bytes mismatch',
    'source path/hash mismatch', 'source ancestry/tree mismatch'],
  realCacheOrPackaging: false }));
