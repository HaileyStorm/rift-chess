// Build-time, source-bound initial 512px board ground for the Bend preview.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import controller from '../../.artifacts/bend2/v2-preview/selected-js/controller.js';
import scene from '../../.artifacts/bend2/v2-preview/selected-js/scene.js';
import { root, assertCache } from './selected-modules.mjs';

const previewRoot = path.resolve(root, '.artifacts/bend2/v2-preview');
const maxPlateBytes = 786437;
const maxReadyJsonBytes = 16 * 1024 * 1024;
const maxGroundBytes = 8 * 1024 * 1024;
const maxImageNodes = 349525;

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function assertCandidateOutput(directory) {
  const resolved = path.resolve(directory);
  assert.equal(path.dirname(resolved), previewRoot,
    'Prepared ground output must be a direct child of the preview workspace');
  assert.match(path.basename(resolved), /^\.dist-candidate-[0-9]+-[0-9a-f-]+$/,
    'Prepared ground output must be the unique candidate build directory');
  const parent = fs.lstatSync(previewRoot);
  assert.ok(parent.isDirectory() && !parent.isSymbolicLink(),
    'Preview workspace must be a plain directory');
  const stat = fs.lstatSync(resolved, { throwIfNoEntry: false });
  if (stat) assert.ok(stat.isDirectory() && !stat.isSymbolicLink(),
    'Prepared ground output must be a plain directory');
  return resolved;
}

function resolveAsset(rootDirectory, relative) {
  assert.equal(typeof relative, 'string');
  assert.ok(relative.length > 0 && !path.isAbsolute(relative) && !relative.includes('\\') &&
    !relative.split('/').some(part => part === '' || part === '.' || part === '..'),
  'Astral asset path must be a normalized workspace-relative path');
  const resolved = path.resolve(rootDirectory, ...relative.split('/'));
  const prefix = `${path.resolve(rootDirectory)}${path.sep}`;
  assert.ok(resolved.startsWith(prefix), 'Astral asset path escaped its source root');
  const real = fs.realpathSync(resolved);
  assert.ok(real.startsWith(prefix), 'Astral asset resolves outside its source root');
  return real;
}

function list(values) {
  let tail = { $: 'Nil' };
  for (let index = values.length - 1; index >= 0; index--)
    tail = { $: 'Con', head: values[index], tail };
  return tail;
}

function taggedBigInt(_key, value) {
  return typeof value === 'bigint' ? { __bend_bigint__: value.toString(10) } : value;
}

function assertDefaultFrame(frame) {
  assert.equal(frame?.$, 'Frame', 'Selected controller returned no Bend Frame');
  assert.equal(frame.theme, 0, 'Prepared ground only supports the initial astral theme');
  assert.deepEqual(frame.view, { $: 'View', yaw: 345, pitch: 67, zoom: 115 },
    'Selected controller default camera differs from the approved initial view');
  assert.equal(frame.position?.$, 'Pos', 'Default frame has no Bend chess position');
  assert.equal(frame.position.holes, 544, 'Default frame rift topology changed');
  assert.equal(frame.selected, 64, 'Default frame selection changed');
  assert.equal(frame.hovered, 64, 'Default frame hover changed');
  assert.equal(frame.position.side, true, 'Default frame side to move changed');
  assert.equal(frame.position.rights, 15, 'Default frame castling rights changed');
  assert.equal(frame.position.ep, 64, 'Default frame en-passant target changed');
  assert.equal(frame.position.epPawn, 64, 'Default frame en-passant pawn changed');
  assert.equal(frame.position.quiet, 0n, 'Default frame quiet counter changed');
  assert.equal(frame.position.full, 1n, 'Default frame move counter changed');
}

function assertImage(image) {
  const pending = [{ image, depth: 9 }];
  let nodes = 0;
  while (pending.length) {
    const item = pending.pop();
    const current = item.image;
    nodes++;
    assert.ok(nodes <= maxImageNodes, 'Prepared ground exceeds the bounded quadtree node count');
    if (current?.$ === 'Pix') {
      assert.ok(Number.isInteger(current.color) && current.color >= 0 && current.color <= 0xffffffff,
        'Prepared ground contains an invalid pixel');
      continue;
    }
    assert.equal(current?.$, 'Qua', 'Prepared ground contains an invalid Image constructor');
    assert.ok(item.depth > 0, 'Prepared ground quadtree exceeds depth 9');
    for (const key of ['tl', 'tr', 'bl', 'br'])
      pending.push({ image: current[key], depth: item.depth - 1 });
  }
  return nodes;
}

function assertGroundKey(sceneApi, frame) {
  assert.equal(typeof sceneApi.sprite_same_ground, 'function',
    'Selected scene has no Bend ground-cache key predicate');
  assert.equal(sceneApi.sprite_same_ground(frame, frame), true,
    'Selected scene rejects the initial frame as its own ground key');
  const sameGroundDifferentOccupancy = { ...frame,
    position: { ...frame.position, board: { $: 'Nil' } },
    selected: 0, hovered: 0, tile: 0, progress: 0 };
  assert.equal(sceneApi.sprite_same_ground(frame, sameGroundDifferentOccupancy), true,
    'Bend default ground key unexpectedly depends on piece occupancy or pointer state');
  assert.equal(sceneApi.sprite_same_ground(frame, { ...frame, theme: 1 }), false,
    'Bend default ground key omitted theme');
  assert.equal(sceneApi.sprite_same_ground(frame, { ...frame,
    view: { ...frame.view, yaw: (frame.view.yaw + 1) % 360 } }), false,
  'Bend default ground key omitted camera view');
  assert.equal(sceneApi.sprite_same_ground(frame, { ...frame,
    position: { ...frame.position, holes: frame.position.holes ^ 1 } }), false,
  'Bend default ground key omitted rift topology');
}

function validateAstralSource() {
  const manifestPath = path.join(root, 'bend2/assets/MANIFEST.json');
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert.equal(manifest.schema, 'rift-bend-art-assets/1', 'Unknown Bend artwork manifest');
  assert.deepEqual(Object.keys(manifest.assets).sort(), ['observatory-astral', 'observatory-stone'],
    'Unexpected Bend observatory asset set');
  const asset = manifest.assets['observatory-astral'];
  assert.equal(asset.source, 'source/observatory-astral.png');
  assert.equal(asset.runtime, 'runtime/observatory-astral.rga');
  assert.equal(asset.depth, 9);
  assert.equal(asset.runtimeBytes, maxPlateBytes);
  const sourcePath = resolveAsset(path.join(root, 'bend2/assets'), asset.source);
  const runtimePath = resolveAsset(path.join(root, 'bend2/assets'), asset.runtime);
  const source = fs.readFileSync(sourcePath);
  const runtime = fs.readFileSync(runtimePath);
  assert.equal(sha256(source), asset.sourceSha256, 'Astral source image differs from its manifest');
  assert.equal(runtime.length, asset.runtimeBytes, 'Astral RGA byte count differs from its manifest');
  assert.equal(sha256(runtime), asset.runtimeSha256, 'Astral RGA differs from its manifest');
  assert.deepEqual([...runtime.subarray(0, 5)], [82, 71, 65, 49, 9],
    'Astral RGA header is not RGA1 depth 9');
  return { asset, runtime };
}

export function emitDefaultGround(outDirectory) {
  const out = assertCandidateOutput(outDirectory);
  const controllerCache = assertCache('controller');
  const sceneCache = assertCache('scene');
  for (const name of ['boot_reads']) assert.equal(typeof controller[name], 'function',
    `Selected controller omitted ${name}`);
  for (const name of ['load_plates', 'underlay512_asset', 'settled_ground512', 'sprite_same_ground'])
    assert.equal(typeof scene[name], 'function', `Selected scene omitted ${name}`);

  const boot = controller.boot_reads('', '', true, true, 1024, 640);
  const frame = boot?.snapshot?.frame;
  assertDefaultFrame(frame);
  assertGroundKey(scene, frame);

  const { asset, runtime } = validateAstralSource();
  const plates = scene.load_plates(list([{ $: 'AssetResponse', id: { $: 'Astral' },
    bytes: list(runtime), ok: true }]));
  assert.equal(plates?.$ , 'ObservatoryPlates', 'Bend rejected the validated astral response');
  assert.equal(plates.astral?.$, 'Ready', 'Bend failed to decode the astral RGA into Ready');
  assert.equal(plates.astral.depth, 9, 'Bend decoded an unexpected astral plate depth');
  assert.ok(['Pix', 'Qua'].includes(plates.astral.pixels?.$), 'Bend decoded no astral Image');
  const readyJson = JSON.stringify(plates.astral);
  const readyBytes = Buffer.from(readyJson, 'utf8');
  assert.ok(readyBytes.length > 0 && readyBytes.length <= maxReadyJsonBytes,
    'Decoded astral Ready JSON is outside the bounded size');
  const readyJsonSha256 = sha256(readyBytes);

  const ground = scene.settled_ground512(frame, scene.underlay512_asset(0, plates));
  const groundNodes = assertImage(ground);
  const groundJson = JSON.stringify(ground);
  const groundBytes = Buffer.from(groundJson, 'utf8');
  assert.ok(groundBytes.length > 0 && groundBytes.length <= maxGroundBytes,
    'Default ground JSON exceeds its bounded size limit');
  const groundSha256 = sha256(groundBytes);
  const assetName = `assets/ground-initial-${groundSha256.slice(0, 12)}.json`;
  const metadataName = `assets/ground-initial-${groundSha256.slice(0, 12)}.meta.json`;
  const frameJson = JSON.stringify(frame, taggedBigInt);
  const frameJsonBytes = Buffer.byteLength(frameJson, 'utf8');
  assert.ok(frameJsonBytes > 0 && frameJsonBytes <= 64 * 1024,
    'Serialized initial frame exceeds its bounded size');
  const bindingSha256 = value => sha256(Buffer.from(JSON.stringify(value), 'utf8'));
  const metadata = {
    schema: 'rift-bend-prepared-ground/1',
    mode: 'source-bound-default-ground',
    selected: {
      sceneOutputSha256: sceneCache.manifest.output.sha256,
      sceneBindingSha256: bindingSha256(sceneCache.manifest.binding),
      controllerOutputSha256: controllerCache.manifest.output.sha256,
      controllerBindingSha256: bindingSha256(controllerCache.manifest.binding),
    },
    plate: {
      id: 'observatory-astral',
      sourceSha256: asset.sourceSha256,
      rawPlateSha256: asset.runtimeSha256,
      rawPlateBytes: runtime.length,
      decodedReadyJsonSha256: readyJsonSha256,
      decodedReadyJsonBytes: readyBytes.length,
    },
    ground: {
      path: `./${assetName}`,
      sha256: groundSha256,
      bytes: groundBytes.length,
      imageNodes: groundNodes,
      depth: 9,
      size: 512,
    },
    groundKey: {
      predicate: 'Bend.sprite_same_ground',
      theme: frame.theme,
      view: frame.view,
      holes: frame.position.holes,
      matchedSelectedControllerBootFixture: true,
    },
    frameJson,
    frameJsonSha256: sha256(Buffer.from(frameJson, 'utf8')),
  };
  const metadataText = JSON.stringify(metadata, null, 2) + '\n';
  const metadataBytes = Buffer.from(metadataText, 'utf8');
  assert.ok(metadataBytes.length <= 64 * 1024, 'Prepared ground metadata exceeds its bounded size');

  const assetsDirectory = path.join(out, 'assets');
  fs.mkdirSync(assetsDirectory, { recursive: true });
  const assetsStat = fs.lstatSync(assetsDirectory);
  assert.ok(assetsStat.isDirectory() && !assetsStat.isSymbolicLink(),
    'Prepared ground assets path must be a plain directory');
  const assetPath = path.join(out, assetName);
  const metadataPath = path.join(out, metadataName);
  fs.writeFileSync(assetPath, groundBytes, { flag: 'wx' });
  fs.writeFileSync(metadataPath, metadataBytes, { flag: 'wx' });
  assert.equal(sha256(fs.readFileSync(assetPath)), groundSha256,
    'Written prepared ground asset changed bytes');
  assert.equal(sha256(fs.readFileSync(metadataPath)), sha256(metadataBytes),
    'Written prepared ground metadata changed bytes');

  return {
    assetPath: `./${assetName}`,
    assetFile: assetName,
    assetSha256: groundSha256,
    assetBytes: groundBytes.length,
    plateSha256: readyJsonSha256,
    metadataFile: metadataName,
    metadataSha256: sha256(metadataBytes),
    frameJson,
  };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv[2], 'Pass the v2-preview candidate output directory');
  console.log(JSON.stringify(emitDefaultGround(process.argv[2])));
}
