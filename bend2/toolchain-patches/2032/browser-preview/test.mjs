import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertPinnedCacheSet, bundleSchema, bundleScope, bundleSourceFiles, packageAssets,
  verifyRevisionBinding, verifyWorkerBundle, writeNewFile } from './pack-static.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const tempParent = fs.realpathSync.native(os.tmpdir());
const temp = fs.mkdtempSync(path.join(tempParent, 'rift-bend-static-preview-test-'));
let assertions = 0;
let fixtureNumber = 0;

function throws(fn, pattern) {
  assert.throws(fn, pattern);
  assertions++;
}

function fixture() {
  const repositoryRoot = temp;
  const bundleDirectory = path.join(repositoryRoot, `.artifacts/bend2/2032-browser-probe/run-fixture-${++fixtureNumber}`);
  fs.mkdirSync(bundleDirectory, { recursive: true });
  const sourceFiles = bundleSourceFiles.map(file => {
    const bytes = Buffer.from(`fixture source: ${file}\n`);
    const target = path.join(repositoryRoot, ...file.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
    return { file, sha256: sha(bytes) };
  });
  const helperBytes = Buffer.from('export const fixtureHelper = true;\n');
  const helperFile = `sprite-helper-${sha(helperBytes).slice(0, 12)}.js`;
  const workerBytes = Buffer.from(`import './${helperFile}';\nexport const fixtureWorker = true;\n`);
  const workerFile = `worker-${sha(workerBytes).slice(0, 12)}.js`;
  fs.writeFileSync(path.join(bundleDirectory, helperFile), helperBytes);
  fs.writeFileSync(path.join(bundleDirectory, workerFile), workerBytes);

  const cacheManifests = Object.fromEntries(['menu', 'controller', 'scene', 'chrome'].map((name, index) => [name, {
    path: `.artifacts/bend2/2032-preview/${name}/fixture/${name}.manifest.json`,
    sha256: String(index + 1).repeat(64),
    outputSha256: String(index + 5).repeat(64),
  }]));
  const bunRuntime = { version: '1.4.2', executable: '.artifacts/toolchains/runtime/bun.exe', sha256: 'a'.repeat(64) };
  const manifest = {
    schema: bundleSchema,
    sourceRevision: '1'.repeat(40),
    sourceTree: '2'.repeat(40),
    cacheSourceCommit: '3'.repeat(40),
    compilerEol: 'lf',
    bunRuntime,
    cacheManifests,
    outputs: [
      { file: helperFile, bytes: helperBytes.length, sha256: sha(helperBytes) },
      { file: workerFile, bytes: workerBytes.length, sha256: sha(workerBytes) },
    ],
    sourceFiles,
    networkCalls: 0,
    scope: bundleScope,
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  const manifestPath = path.join(bundleDirectory, 'worker.manifest.json');
  fs.writeFileSync(manifestPath, manifestBytes);
  const expected = {
    sourceRevision: manifest.sourceRevision,
    sourceTree: manifest.sourceTree,
    cacheSourceCommit: manifest.cacheSourceCommit,
    bunRuntime,
    cacheManifests,
  };
  return { repositoryRoot, bundleDirectory, manifestPath, manifestBytes, manifest, expected,
    helperFile, workerFile, helperBytes, workerBytes };
}

function verify(item, overrides = {}) {
  return verifyWorkerBundle({ manifestPath: item.manifestPath,
    expectedManifestSha256: overrides.expectedManifestSha256 ?? sha(item.manifestBytes),
    repositoryRoot: item.repositoryRoot, expected: overrides.expected ?? item.expected });
}

function assetFixture() {
  const repositoryRoot = path.join(temp, `assets-${++fixtureNumber}`);
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
    artAssets[id] = { source: `source/${id}.png`, sourceSha256: sha(source), sourceSize: [1254, 1254],
      runtime: `runtime/${id}.rga`, runtimeSha256: sha(runtime), runtimeBytes: runtime.length,
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
    coverage_bits: 8, records: 242, source_sha256: sha(fontSource), output_sha256: sha(fontRuntime),
  })));

  const pieceSource = put('bend2/assets/source/chess-piece-atlas.png', Buffer.from('synthetic piece atlas'));
  const pages = [];
  for (let index = 0; index < 3; index++) {
    const bytes = put(`bend2/assets/runtime/pieces/pieces-fast-${index}.rga`, Buffer.alloc(65541, index + 4));
    pages.push({ path: `../../runtime/pieces/pieces-fast-${index}.rga`, bytes: bytes.length, sha256: sha(bytes) });
  }
  put('bend2/assets/source/pieces/manifest.json', Buffer.from(JSON.stringify({
    format: 'rift-chess-piece-art-source-v1', source: { path: '../chess-piece-atlas.png', sha256: sha(pieceSource) },
    tiers: { interactive: { depth: 7, totalBytes: 196623, deploymentIntegrated: true, pages } },
  })));
  const output = path.join(repositoryRoot, '.artifacts/bend2/2032-static-preview/run-assets');
  fs.mkdirSync(output, { recursive: true });
  return { repositoryRoot, output };
}

try {
  const cacheNames = ['menu', 'controller', 'scene', 'chrome'];
  const cacheReceipt = Object.fromEntries(cacheNames.map(name => {
    const manifestBytes = Buffer.from(`{"module":"${name}"}\n`);
    const output = Buffer.from(`selected cache ${name}\n`);
    return [name, { manifestBytes, output }];
  }));
  const expectedCacheReceipt = Object.fromEntries(cacheNames.map(name => [name, {
    manifestSha256: sha(cacheReceipt[name].manifestBytes),
    outputSha256: sha(cacheReceipt[name].output),
    bytes: cacheReceipt[name].output.length,
  }]));
  const cacheSet = { modules: Object.fromEntries(cacheNames.map(name => [name, {
    manifestBytes: cacheReceipt[name].manifestBytes,
    bytes: cacheReceipt[name].output,
  }])) };
  assertPinnedCacheSet(cacheSet, expectedCacheReceipt);
  assertions++;
  const sameMeaningDifferentBytes = Buffer.from(`{ "module" : "menu" }\n`);
  cacheSet.modules.menu.manifestBytes = sameMeaningDifferentBytes;
  throws(() => assertPinnedCacheSet(cacheSet, expectedCacheReceipt), /raw Linux cache manifest differs/);

  const good = fixture();
  const result = verify(good);
  assert.equal(result.manifestSha256, sha(good.manifestBytes));
  assert.deepEqual(result.outputs.worker.bytes, good.workerBytes);
  assert.deepEqual(result.outputs['sprite-helper'].bytes, good.helperBytes);
  assertions += 3;

  throws(() => verify(good, { expectedManifestSha256: 'f'.repeat(64) }), /raw bytes differ/);

  const badRevision = fixture();
  badRevision.manifest.sourceRevision = 'bad';
  const badRevisionBytes = Buffer.from(JSON.stringify(badRevision.manifest, null, 2) + '\n');
  fs.writeFileSync(badRevision.manifestPath, badRevisionBytes);
  throws(() => verify(badRevision, { expectedManifestSha256: sha(badRevisionBytes) }), /invalid sourceRevision/);

  const badCacheBinding = fixture();
  badCacheBinding.manifest.cacheSourceCommit = '9'.repeat(40);
  const badCacheBytes = Buffer.from(JSON.stringify(badCacheBinding.manifest, null, 2) + '\n');
  fs.writeFileSync(badCacheBinding.manifestPath, badCacheBytes);
  throws(() => verify(badCacheBinding, { expectedManifestSha256: sha(badCacheBytes) }), /cache source revision differs/);

  const revisionPair = verifyRevisionBinding(good.manifest, {
    packerRevision: '4'.repeat(40), packerTree: '5'.repeat(40),
    commitTree: revision => revision === good.manifest.sourceRevision ? good.manifest.sourceTree : '',
    isAncestor: () => true, browserTreeEqual: () => true,
  });
  assert.equal(revisionPair.bundleSourceRevision, good.manifest.sourceRevision);
  assertions++;
  throws(() => verifyRevisionBinding(good.manifest, {
    packerRevision: '4'.repeat(40), packerTree: '5'.repeat(40),
    commitTree: () => '9'.repeat(40), isAncestor: () => true, browserTreeEqual: () => true,
  }), /does not match its Git commit/);
  throws(() => verifyRevisionBinding(good.manifest, {
    packerRevision: '4'.repeat(40), packerTree: '5'.repeat(40),
    commitTree: () => good.manifest.sourceTree, isAncestor: () => false, browserTreeEqual: () => true,
  }), /not an ancestor/);
  throws(() => verifyRevisionBinding(good.manifest, {
    packerRevision: '4'.repeat(40), packerTree: '5'.repeat(40),
    commitTree: () => good.manifest.sourceTree, isAncestor: () => true, browserTreeEqual: () => false,
  }), /browser source closure changed/);

  const outputTamper = fixture();
  fs.writeFileSync(path.join(outputTamper.bundleDirectory, outputTamper.workerFile), 'tampered worker');
  throws(() => verify(outputTamper), /worker output byte (count|bytes) differ/);

  const sourceTamper = fixture();
  fs.appendFileSync(path.join(sourceTamper.repositoryRoot, ...bundleSourceFiles[0].split('/')), 'tampered source');
  throws(() => verify(sourceTamper), /bundle source bytes differ/);

  const pathTamper = fixture();
  pathTamper.manifest.outputs[1].file = '../escape.js';
  const badPathBytes = Buffer.from(JSON.stringify(pathTamper.manifest, null, 2) + '\n');
  fs.writeFileSync(pathTamper.manifestPath, badPathBytes);
  throws(() => verify(pathTamper, { expectedManifestSha256: sha(badPathBytes) }), /invalid worker output path/);

  const symlinkFixture = fixture();
  const outsideFile = path.join(symlinkFixture.repositoryRoot, 'outside.js');
  fs.writeFileSync(outsideFile, symlinkFixture.workerBytes);
  const workerPath = path.join(symlinkFixture.bundleDirectory, symlinkFixture.workerFile);
  fs.unlinkSync(workerPath);
  let symlinkMade = false;
  try { fs.symlinkSync(outsideFile, workerPath, 'file'); symlinkMade = true; }
  catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error?.code)) throw error;
  }
  if (symlinkMade) throws(() => verify(symlinkFixture), /reparse point|regular file/);
  else console.log('Symlink negative control skipped: this host does not permit file symlink creation.');

  const outputRoot = path.join(good.repositoryRoot, '.artifacts/bend2/2032-static-preview/run-test');
  fs.mkdirSync(outputRoot, { recursive: true });
  writeNewFile(good.repositoryRoot, outputRoot, 'assets/fixture.rga', Buffer.from([1, 2, 3]));
  throws(() => writeNewFile(good.repositoryRoot, outputRoot, 'assets/fixture.rga', Buffer.from([4, 5, 6])), /already exists|EEXIST/);

  const assets = assetFixture();
  const assetFiles = {};
  const assetProvenance = packageAssets(assets.repositoryRoot, assets.output, assetFiles);
  assert.equal(Object.keys(assetFiles).length, 7);
  assert.equal(assetFiles['assets/observatory-astral.rga'], assetProvenance['observatory-astral'].runtimeSha256);
  assert.equal(assetFiles['assets/rift-observatory-font.rga'], assetProvenance.font.runtimeSha256);
  assert.equal(assetProvenance.pieces.pages.length, 3);
  assertions += 4;

  const damagedAssets = assetFixture();
  fs.writeFileSync(path.join(damagedAssets.repositoryRoot, 'bend2/assets/runtime/observatory-astral.rga'), 'tampered RGA');
  throws(() => packageAssets(damagedAssets.repositoryRoot, damagedAssets.output, {}), /observatory-astral runtime byte count differs/);

  console.log(`static-preview synthetic tests passed (${assertions} assertions)`);
} finally {
  const exact = fs.realpathSync.native(temp);
  assert.equal(path.dirname(exact), tempParent, 'refuse to remove fixture outside its temporary parent');
  assert.match(path.basename(exact), /^rift-bend-static-preview-test-[^\\/]+$/);
  const stat = fs.lstatSync(temp);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), 'refuse to remove replaced fixture root');
  fs.rmSync(temp, { recursive: true, force: false });
}
