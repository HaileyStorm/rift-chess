import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { approvedBundle } from './approved-bundle.mjs';
import { assertApprovedBundle, bundleSchema, bundleScope, bundleSourceFiles,
  parseArguments, validateBundleManifest, verifyRevisionBinding } from './pack-static.mjs';
import { cacheModuleNames } from '../browser-loader-v2/receipt.mjs';
import { packageAssets, readPlainFile, writeNewFile } from '../browser-preview/pack-static.mjs';

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

// Receipt validation belongs to browser-loader-v2/test.mjs. This suite
// keeps the fixture only to exercise the packer/receipt integration boundary.
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
assert.throws(() => runBundleCheck(manifest, { readOutput: file =>
  file === workerFile ? Buffer.alloc(workerBytes.length) : outputs.get(file) }), /worker output bytes differ/);
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

function assetFixture(repositoryRoot) {
  const put = (relative, bytes) => {
    const target = path.join(repositoryRoot, ...relative.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
    return bytes;
  };
  const artAssets = {};
  for (const id of ['observatory-astral', 'observatory-stone']) {
    const source = put(`bend2/assets/source/${id}.png`, Buffer.from(`source ${id}`));
    const runtime = put(`bend2/assets/runtime/${id}.rga`, Buffer.alloc(786437, id.endsWith('astral') ? 1 : 2));
    artAssets[id] = { source: `source/${id}.png`, sourceSha256: sha256(source), sourceSize: [1254, 1254],
      runtime: `runtime/${id}.rga`, runtimeSha256: sha256(runtime), runtimeBytes: runtime.length,
      depth: 9, derivedBy: 'synthetic source-bound fixture' };
  }
  put('bend2/assets/MANIFEST.json', Buffer.from(JSON.stringify({ schema: 'rift-bend-art-assets/1', assets: artAssets })));
  put('bend2/assets/LICENSES.md', Buffer.from('synthetic art license list\n'));

  const fontSource = put('bend2/assets/source/fonts/dm-sans-pinned.ttf', Buffer.from('synthetic font source'));
  const fontRuntime = put('bend2/assets/runtime/rift-observatory-font.rga', Buffer.alloc(151343, 3));
  const ofl = Buffer.from('synthetic OFL license\n');
  put('bend2/assets/source/fonts/OFL.txt', ofl);
  put('bend2/lib/graphics/v2/OFL.txt', ofl);
  put('bend2/ui/v2/fonts/packed-manifest.json', Buffer.from(JSON.stringify({
    schema: 'rift-observatory-font-pack/1', output: 'bend2/assets/runtime/rift-observatory-font.rga',
    source: 'bend2/assets/source/fonts/dm-sans-pinned.ttf', bytes: fontRuntime.length,
    coverage_bits: 8, records: 242, source_sha256: sha256(fontSource), output_sha256: sha256(fontRuntime),
  })));

  const pieceSource = put('bend2/assets/source/chess-piece-atlas.png', Buffer.from('synthetic piece atlas'));
  const pages = [];
  for (let index = 0; index < 3; index++) {
    const bytes = put(`bend2/assets/runtime/pieces/pieces-fast-${index}.rga`, Buffer.alloc(65541, index + 4));
    pages.push({ path: `../../runtime/pieces/pieces-fast-${index}.rga`, bytes: bytes.length, sha256: sha256(bytes) });
  }
  put('bend2/assets/source/pieces/manifest.json', Buffer.from(JSON.stringify({
    format: 'rift-chess-piece-art-source-v1', source: { path: '../chess-piece-atlas.png', sha256: sha256(pieceSource) },
    tiers: { interactive: { depth: 7, totalBytes: 196623, deploymentIntegrated: true, pages } },
  })));
  const output = path.join(repositoryRoot, '.artifacts/bend2/2032-static-preview-v2/run-assets');
  fs.mkdirSync(output, { recursive: true });
  return { repositoryRoot, output };
}

const tempParent = fs.realpathSync.native(os.tmpdir());
const temp = fs.mkdtempSync(path.join(tempParent, 'rift-bend-static-preview-v2-test-'));
let outputSymlinkControl = 'not-run';
try {
  const assets = assetFixture(path.join(temp, 'assets'));
  const assetFiles = {};
  const provenance = packageAssets(assets.repositoryRoot, assets.output, assetFiles);
  assert.deepEqual(Object.keys(assetFiles).sort(), ['assets/LICENSES.md',
    'assets/observatory-astral.rga', 'assets/observatory-stone.rga',
    'assets/pieces-fast-0.rga', 'assets/pieces-fast-1.rga', 'assets/pieces-fast-2.rga',
    'assets/rift-observatory-font.rga']);
  for (const [file, digest] of Object.entries(assetFiles)) {
    assert.equal(sha256(fs.readFileSync(path.join(assets.output, file))), digest);
  }
  assert.equal(assetFiles['assets/observatory-astral.rga'], provenance['observatory-astral'].runtimeSha256);
  assert.equal(assetFiles['assets/rift-observatory-font.rga'], provenance.font.runtimeSha256);
  assert.equal(assetFiles['assets/LICENSES.md'], provenance.licensesSha256);
  assert.deepEqual(provenance.pieces.pages.map(page => [page.file, page.sha256]),
    [0, 1, 2].map(index => [`assets/pieces-fast-${index}.rga`, assetFiles[`assets/pieces-fast-${index}.rga`]]));

  const newFile = writeNewFile(temp, temp, 'no-overwrite/fixture.rga', Buffer.from([1, 2, 3]));
  assert.throws(() => writeNewFile(temp, temp, 'no-overwrite/fixture.rga', Buffer.from([4, 5, 6])),
    /already exists|EEXIST/);
  assert.deepEqual(fs.readFileSync(newFile), Buffer.from([1, 2, 3]));

  for (const [name, bytes, pattern] of [
    ['runtime-size', Buffer.from('tampered RGA'), /observatory-astral runtime byte count differs/],
    ['runtime-digest', Buffer.alloc(786437, 9), /observatory-astral runtime bytes differ/],
  ]) {
    const damaged = assetFixture(path.join(temp, name));
    fs.writeFileSync(path.join(damaged.repositoryRoot, 'bend2/assets/runtime/observatory-astral.rga'), bytes);
    assert.throws(() => packageAssets(damaged.repositoryRoot, damaged.output, {}), pattern);
  }

  const bundleRoot = path.join(temp, 'bundle');
  fs.mkdirSync(bundleRoot);
  fs.writeFileSync(path.join(bundleRoot, helperFile), helperBytes);
  const outside = path.join(temp, 'outside-worker.js');
  fs.writeFileSync(outside, workerBytes);
  try {
    fs.symlinkSync(outside, path.join(bundleRoot, workerFile), 'file');
    outputSymlinkControl = 'created';
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error?.code)) throw error;
    outputSymlinkControl = 'skipped-os-denied';
    console.log('skip - OS denied actual output-file symlink fixture');
  }
  if (outputSymlinkControl === 'created') {
    assert.throws(() => runBundleCheck(manifest, { readOutput: file =>
      readPlainFile(bundleRoot, path.join(bundleRoot, file), `Worker bundle ${file}`) }),
    /reparse point|regular file/);
    outputSymlinkControl = 'rejected';
  }
} finally {
  const exact = fs.realpathSync.native(temp);
  assert.equal(path.dirname(exact), tempParent, 'refuse to remove fixture outside its temporary parent');
  assert.match(path.basename(exact), /^rift-bend-static-preview-v2-test-[^\\/]+$/);
  const stat = fs.lstatSync(temp);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), 'refuse to remove replaced fixture root');
  fs.rmSync(temp, { recursive: true, force: false });
}

console.log(JSON.stringify({ schema: 'rift-bend-browser-preview-v2-pure-test/1', passed: true,
  accepted: ['synthetic 2.0.32-2 bundle contract',
    'synthetic source, output and revision bindings', 'scope-isolated service-worker cache activation'],
  rejected: ['unarmed and mismatched pins', 'receipt path/hash/cache/source mismatch',
    'manifest path/hash/schema mismatch', 'cache-manifest mismatch', 'output path/hash/bytes mismatch',
    'source path/hash mismatch', 'source ancestry/tree mismatch'],
  syntheticAssetPackaging: true, outputSymlinkControl,
  realCacheOrPackaging: false }));
