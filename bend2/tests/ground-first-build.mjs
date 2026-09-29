// Packaging gate for the source-bound initial ground in a Bend preview build.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import controller from '../../.artifacts/bend2/v2-preview/selected-js/controller.js';
import { root, assertCache } from '../tools/selected-modules.mjs';

const directory = path.resolve(process.env.BEND_GROUND_BUILD_DIR ||
  path.join(root, '.artifacts/bend2/v2-preview/dist'));
assert.ok(directory.startsWith(path.join(root, '.artifacts/bend2/v2-preview') + path.sep));
const stat = fs.lstatSync(directory);
assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), 'Expected v2-preview dist directory');
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const build = JSON.parse(fs.readFileSync(path.join(directory, 'build.json'), 'utf8'));
assert.equal(build.v2Preview, true);
assert.ok(build.preparedGround, 'Prepared ground build metadata is missing');

const metadataBytes = fs.readFileSync(path.join(directory, build.preparedGround.metadata));
assert.equal(sha256(metadataBytes), build.preparedGround.metadataSha256);
assert.equal(build.files[build.preparedGround.metadata], build.preparedGround.metadataSha256);
const metadata = JSON.parse(metadataBytes.toString('utf8'));
assert.equal(metadata.schema, 'rift-bend-prepared-ground/1');
assert.equal(metadata.mode, 'source-bound-default-ground');
assert.equal(metadata.ground.path, `./${build.preparedGround.asset}`);
assert.equal(metadata.ground.sha256, build.preparedGround.assetSha256);
assert.equal(metadata.ground.bytes, build.preparedGround.assetBytes);
assert.equal(build.files[build.preparedGround.asset], build.preparedGround.assetSha256);
assert.ok(metadata.ground.bytes > 0 && metadata.ground.bytes <= 8 * 1024 * 1024);
const helperName = Object.keys(build.files).find(name => name.startsWith('sprite-helper-') && name.endsWith('.js'));
assert.ok(helperName, 'Trial build has no dedicated sprite helper bundle');
const helperCode = fs.readFileSync(path.join(directory, helperName), 'utf8');
for (const [name, value] of Object.entries({
  groundPath: metadata.ground.path,
  groundSha: metadata.ground.sha256,
  plateSha: metadata.plate.decodedReadyJsonSha256,
  frameJson: metadata.frameJson,
})) assert.ok(helperCode.includes(value), `Helper bundle omitted prepared-ground macro value ${name}`);

for (const [name, expected] of Object.entries(build.files))
  assert.equal(sha256(fs.readFileSync(path.join(directory, name))), expected,
    `Packaged file digest mismatch: ${name}`);

const groundBytes = fs.readFileSync(path.join(directory, build.preparedGround.asset));
assert.equal(groundBytes.length, metadata.ground.bytes);
assert.equal(sha256(groundBytes), metadata.ground.sha256);
const image = JSON.parse(groundBytes.toString('utf8'));
const pending = [{ image, depth: metadata.ground.depth }];
let nodes = 0;
while (pending.length) {
  const { image: current, depth } = pending.pop();
  nodes++;
  assert.ok(nodes <= 349525, 'Prepared Image exceeded the full depth-9 tree bound');
  if (current?.$ === 'Pix') {
    assert.ok(Number.isInteger(current.color) && current.color >= 0 && current.color <= 0xffffffff);
    continue;
  }
  assert.equal(current?.$, 'Qua');
  assert.ok(depth > 0, 'Prepared Image exceeds its declared depth');
  for (const key of ['tl', 'tr', 'bl', 'br']) pending.push({ image: current[key], depth: depth - 1 });
}
assert.equal(nodes, metadata.ground.imageNodes);

const scene = assertCache('scene').manifest, selectedController = assertCache('controller').manifest;
const bindingDigest = value => sha256(Buffer.from(JSON.stringify(value), 'utf8'));
assert.equal(metadata.selected.sceneOutputSha256, scene.output.sha256);
assert.equal(metadata.selected.sceneBindingSha256, bindingDigest(scene.binding));
assert.equal(metadata.selected.controllerOutputSha256, selectedController.output.sha256);
assert.equal(metadata.selected.controllerBindingSha256, bindingDigest(selectedController.binding));

const runtimeAsset = JSON.parse(fs.readFileSync(path.join(root, 'bend2/assets/MANIFEST.json'), 'utf8'))
  .assets['observatory-astral'];
const runtimeBytes = fs.readFileSync(path.join(root, 'bend2/assets', runtimeAsset.runtime));
assert.equal(sha256(runtimeBytes), runtimeAsset.runtimeSha256);
assert.equal(metadata.plate.rawPlateSha256, runtimeAsset.runtimeSha256);
assert.equal(metadata.plate.rawPlateBytes, runtimeBytes.length);
assert.match(metadata.plate.decodedReadyJsonSha256, /^[0-9a-f]{64}$/);

const reviveBigInt = (_key, value) => {
  if (value && typeof value === 'object' && Object.keys(value).length === 1 &&
      typeof value.__bend_bigint__ === 'string' && /^-?(0|[1-9][0-9]*)$/.test(value.__bend_bigint__))
    return BigInt(value.__bend_bigint__);
  return value;
};
assert.equal(sha256(Buffer.from(metadata.frameJson, 'utf8')), metadata.frameJsonSha256);
const preparedFrame = JSON.parse(metadata.frameJson, reviveBigInt);
const bootFrame = controller.boot_reads('', '', true, true, 1024, 640).snapshot.frame;
assert.deepEqual(preparedFrame, bootFrame, 'Tagged metadata frame differs from current source-bound default boot');
assert.equal(metadata.groundKey.predicate, 'Bend.sprite_same_ground');
assert.equal(metadata.groundKey.matchedSelectedControllerBootFixture, true);
assert.deepEqual(metadata.groundKey.view, bootFrame.view);
assert.equal(metadata.groundKey.theme, bootFrame.theme);
assert.equal(metadata.groundKey.holes, bootFrame.position.holes);

const filesBeforeServiceWorker = Object.fromEntries(Object.entries(build.files)
  .filter(([name]) => name !== 'sw.js'));
assert.equal(build.version, sha256(Buffer.from(JSON.stringify(filesBeforeServiceWorker), 'utf8')).slice(0, 20),
  'Build version does not bind the generated ground and metadata files');
const serviceWorker = fs.readFileSync(path.join(directory, 'sw.js'), 'utf8');
const assetsMatch = /const ASSETS = (\[[^;]*\]);/.exec(serviceWorker);
assert.ok(assetsMatch, 'Service worker precache list was not built');
const precache = JSON.parse(assetsMatch[1]);
assert.ok(precache.includes(`./${build.preparedGround.asset}`), 'Ground asset is absent from precache');
assert.ok(precache.includes(`./${build.preparedGround.metadata}`), 'Ground metadata is absent from precache');
assert.equal(precache.filter(item => item === `./${build.preparedGround.asset}`).length, 1);
console.log(JSON.stringify({ ok: true, draft: build.draft, version: build.version,
  out: path.relative(root, directory).replaceAll('\\', '/'), ground: build.preparedGround,
  helper: helperName, metadataBytes: metadataBytes.length, imageNodes: nodes,
  scope: 'Local source-bound preview packaging; separate from hosted/browser acceptance' }));
