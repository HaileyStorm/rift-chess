// Current2035 cached-JS default ground; caller supplies independently verified selected records.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, readSource, sha256, candidateCommit } from './selected-binding.mjs';

const artifactRoot = path.join(root, '.artifacts/bend2');
const sourcePath = fileURLToPath(import.meta.url);
const tags = Object.freeze({ frame: 'graphics/Scene.Frame', pos: 'core/Model.Pos', view: 'graphics/Camera.View',
  response: 'graphics/v2game/Assets.AssetResponse', request: 'graphics/v2game/Assets.AssetRequest',
  astral: 'graphics/v2game/Assets.Astral', plates: 'graphics/v2game/Assets.ObservatoryPlates', ready: 'graphics/v2game/Assets.Ready' });
const maxPlateBytes = 786437;
const maxReadyJsonBytes = 16 * 1024 * 1024;
const maxGroundBytes = 8 * 1024 * 1024;
const maxImageNodes = 349525;

function assertCandidateOutput(directory) {
  const resolved = path.resolve(directory);
  assert.ok(resolved.startsWith(artifactRoot + path.sep), 'Ground output escaped Bend artifacts');
  assert.equal(fs.realpathSync(resolved), resolved, 'Ground output is redirected');
  const stat = fs.lstatSync(resolved);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), 'Ground output must be an existing plain directory');
  return resolved;
}

async function selectedModule(name, record) {
  assert.ok(record && (Buffer.isBuffer(record.bytes) || record.bytes instanceof Uint8Array));
  const manifestPath = path.resolve(root, record.manifestPath);
  const raw = readSource(manifestPath);
  assert.equal(sha256(raw), record.manifestSha256, 'Selected manifest bytes changed');
  const manifest = JSON.parse(raw);
  assert.deepEqual(manifest, record.manifest, 'Selected record differs from its manifest');
  assert.equal(manifest.schema, 'rift-bend-selected-cache/2035-1');
  assert.equal(manifest.binding.upstream, candidateCommit);
  assert.equal(manifest.binding.module.name, name);
  assert.equal(sha256(JSON.stringify(manifest.binding)), manifest.bindingSha256);
  assert.equal(manifest.networkCalls, 0);
  assert.equal(manifest.output.file, name + '.js');
  const bytes = Buffer.from(record.bytes), actual = readSource(path.join(path.dirname(manifestPath), manifest.output.file));
  assert.deepEqual(bytes, actual, 'Selected supplied module bytes changed');
  assert.equal(bytes.length, manifest.output.bytes);
  assert.equal(sha256(bytes), manifest.output.sha256);
  const source = bytes.toString('utf8');
  assert.ok(!/^\s*(?:import\b|export\b[^;\n]*\bfrom\s*['"])/m.test(source)
    && !/\bimport\s*\(/.test(source), 'Selected JS must be self-contained');
  const api = (await import('data:text/javascript;base64,' + bytes.toString('base64'))).default;
  return { api, binding: { manifestPath: path.relative(root, manifestPath).split(path.sep).join('/'),
    manifestSha256: record.manifestSha256, outputSha256: manifest.output.sha256, bindingSha256: manifest.bindingSha256,
    sourceFilesSha256: sha256(JSON.stringify(manifest.binding.sourceFiles)), runtime: manifest.binding.runtime,
    module: manifest.binding.module, upstream: manifest.binding.upstream, canonicalPin: manifest.binding.canonicalPin } };
}

function resolveAsset(rootDirectory, relative) {
  assert.equal(typeof relative, 'string');
  assert.ok(relative.length > 0 && !path.isAbsolute(relative) && !relative.includes('\\') &&
    !relative.split('/').some(part => part === '' || part === '.' || part === '..'),
  'Astral asset path must be a normalized workspace-relative path');
  const resolved = path.resolve(rootDirectory, ...relative.split('/'));
  const prefix = `${path.resolve(rootDirectory)}${path.sep}`;
  assert.ok(resolved.startsWith(prefix), 'Astral asset path escaped its source root');
  assert.equal(fs.realpathSync(resolved), resolved, 'Astral source asset is redirected');
  return resolved;
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
  assert.equal(frame?.$, tags.frame, 'Selected controller returned no Bend Frame');
  assert.equal(frame.theme, 0, 'Prepared ground only supports the initial astral theme');
  assert.deepEqual(frame.view, { $: tags.view, yaw: 345, pitch: 67, zoom: 115 },
    'Selected controller default camera differs from the approved initial view');
  assert.equal(frame.position?.$, tags.pos, 'Default frame has no Bend chess position');
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

function verifyPersistedPixels(original, persisted) {
  const pixels = new Uint32Array(512 * 512);
  const pending = [{ image: original, x: 0, y: 0, size: 512 }];
  while (pending.length) {
    const { image, x, y, size } = pending.pop();
    if (image.$ === 'Pix') {
      for (let row = y; row < y + size; row++) pixels.fill(image.color, row * 512 + x, row * 512 + x + size);
    } else {
      const half = size / 2;
      pending.push({ image: image.tl, x, y, size: half }, { image: image.tr, x: x + half, y, size: half },
        { image: image.bl, x, y: y + half, size: half }, { image: image.br, x: x + half, y: y + half, size: half });
    }
  }
  // Independently sample the reparsed tree at each pixel, rather than repeating leaf filling.
  const bytes = Buffer.alloc(pixels.length * 4);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    let node = persisted, localX = x, localY = y, size = 512;
    while (node.$ === 'Qua') {
      size /= 2;
      const right = localX >= size, bottom = localY >= size;
      node = bottom ? (right ? node.br : node.bl) : (right ? node.tr : node.tl);
      if (right) localX -= size;
      if (bottom) localY -= size;
    }
    const index = y * 512 + x;
    assert.equal(node.color, pixels[index], `Persisted ground changed pixel ${x},${y}`);
    bytes.writeUInt32LE(node.color, index * 4);
  }
  return { pixels: pixels.length, encoding: 'row-major-u32le', sha256: sha256(bytes), equal: true };
}

function validateAstralSource() {
  const manifestPath = path.join(root, 'bend2/assets/MANIFEST.json');
  const manifestBytes = readSource(manifestPath);
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
  const source = readSource(sourcePath);
  const runtime = readSource(runtimePath);
  assert.equal(sha256(source), asset.sourceSha256, 'Astral source image differs from its manifest');
  assert.equal(runtime.length, asset.runtimeBytes, 'Astral RGA byte count differs from its manifest');
  assert.equal(sha256(runtime), asset.runtimeSha256, 'Astral RGA differs from its manifest');
  assert.deepEqual([...runtime.subarray(0, 5)], [82, 71, 65, 49, 9],
    'Astral RGA header is not RGA1 depth 9');
  return { asset, runtime, manifestSha256: sha256(manifestBytes) };
}

export async function emitDefaultGround2035(outDirectory, records) {
  const out = assertCandidateOutput(outDirectory);
  const [sceneModule, controllerModule] = await Promise.all([selectedModule('scene', records.scene), selectedModule('controller', records.controller)]);
  const scene = sceneModule.api, controller = controllerModule.api;
  assert.deepEqual(sceneModule.binding.runtime, controllerModule.binding.runtime);
  for (const name of ['boot_reads']) assert.equal(typeof controller[name], 'function',
    `Selected controller omitted ${name}`);
  for (const name of ['asset_ids', 'load_plates', 'underlay512_asset', 'settled_ground512', 'sprite_same_ground'])
    assert.equal(typeof scene[name], 'function', `Selected scene omitted ${name}`);

  const boot = controller.boot_reads('', '', true, true, 1024, 640);
  const frame = boot?.snapshot?.frame;
  assertDefaultFrame(frame);
  assertGroundKey(scene, frame);

  const { asset, runtime, manifestSha256 } = validateAstralSource();
  const requests = scene.asset_ids(0);
  assert.equal(requests?.$, 'Con'); assert.equal(requests.tail?.$, 'Nil');
  const request = requests.head;
  assert.equal(request?.$, tags.request); assert.deepEqual(request.id, { $: tags.astral });
  assert.equal(request.path, 'assets/observatory-astral.rga'); assert.equal(request.max_bytes, maxPlateBytes + 1);
  const plates = scene.load_plates(list([{ $: tags.response, id: request.id, bytes: list(runtime), ok: true }]));
  assert.equal(plates?.$ , tags.plates, 'Bend rejected the validated astral response');
  assert.equal(plates.astral?.$, tags.ready, 'Bend failed to decode the astral RGA into Ready');
  assert.equal(plates.astral.depth, 9, 'Bend decoded an unexpected astral plate depth');
  assert.ok(['Pix', 'Qua'].includes(plates.astral.pixels?.$), 'Bend decoded no astral Image');
  assertImage(plates.astral.pixels);
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
  const assetsDirectory = path.join(out, 'assets');
  if (!fs.existsSync(assetsDirectory)) fs.mkdirSync(assetsDirectory);
  assert.equal(fs.realpathSync(assetsDirectory), assetsDirectory);
  const assetsStat = fs.lstatSync(assetsDirectory);
  assert.ok(assetsStat.isDirectory() && !assetsStat.isSymbolicLink(),
    'Prepared ground assets path must be a plain directory');
  const assetPath = path.join(out, assetName);
  const metadataPath = path.join(out, metadataName);
  fs.writeFileSync(assetPath, groundBytes, { flag: 'wx' });
  const persistedBytes = readSource(assetPath);
  assert.equal(sha256(persistedBytes), groundSha256, 'Written prepared ground asset changed bytes');
  const persisted = JSON.parse(persistedBytes);
  assert.equal(assertImage(persisted), groundNodes);
  const pixelOracle = verifyPersistedPixels(ground, persisted);
  const metadata = {
    schema: 'rift-bend-prepared-ground/2035-1',
    upstream: candidateCommit,
    emitter: { path: path.relative(root, sourcePath).split(path.sep).join('/'), sha256: sha256(readSource(sourcePath)) },
    mode: 'source-bound-default-ground',
    selected: { scene: sceneModule.binding, controller: controllerModule.binding },
    browserBoundary: { path: 'bend2/toolchain-patches/2035/browser-tag-boundary.mjs',
      sha256: sha256(readSource(path.join(root, 'bend2/toolchain-patches/2035/browser-tag-boundary.mjs'))),
      representation: 'qualified-project-tags-bare-Base', tags },
    assetManifestSha256: manifestSha256,
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
      pixelOracle,
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

  fs.writeFileSync(metadataPath, metadataBytes, { flag: 'wx' });
  assert.equal(sha256(readSource(assetPath)), groundSha256,
    'Written prepared ground asset changed bytes');
  assert.equal(sha256(readSource(metadataPath)), sha256(metadataBytes),
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

