// Diagnostic only: separate settled board rail and per-tile work at 512.
// Local Bun timings are not browser, native, or GPU acceptance evidence.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import BoardScene from '../graphics/v2game/BoardScene.bend';
import Camera from '../graphics/Camera.bend';
import Model from '../core/Model.bend';
import Pixel from '../lib/graphics/pixels/Pixel.bend';
import { list, raster } from '../lib/graphics/v2/tests/review/helpers.ts';
import controller from '../../.artifacts/bend2/v2-preview/selected-js/controller.js';
import selectedScene from '../../.artifacts/bend2/v2-preview/selected-js/scene.js';
import { root, assertCache } from '../tools/selected-modules.mjs';

const controllerBinding = assertCache('controller').manifest.output.sha256;
const sceneBinding = assertCache('scene').manifest.output.sha256;

const asset = JSON.parse(fs.readFileSync(path.join(root, 'bend2/assets/MANIFEST.json'), 'utf8'))
  .assets['observatory-astral'];
const bytes = fs.readFileSync(path.join(root, 'bend2/assets', asset.runtime));
assert.equal(bytes.length, asset.runtimeBytes);
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.runtimeSha256);
const plates = BoardScene.load_plates(list([{ $: 'AssetResponse', id: { $: 'Astral' },
  bytes: list([...bytes]), ok: true }]));
const plateAt = performance.now(), plateText = JSON.stringify(plates.astral);
const plateStringifyMs = performance.now() - plateAt;
const plateJsonSha256 = crypto.createHash('sha256').update(plateText).digest('hex');
const size = 512, depth = 9n, theme = 0;
const underlay = BoardScene.underlay512_asset(theme, plates);
const position = Model.start({ $: 'True' });
const frame = { $: 'Frame', position, previous: position, selected: 64, hovered: 64,
  targets: list([]), tile: 64, tileTargets: list([]), lastAction: 21760,
  progress: 16, theme, view: Camera.default_view(), shifts: list([]), check: 64 };
const boot = controller.boot_reads('', '', true, true, 1024, 640);
assert.equal(BoardScene.sprite_same_ground(frame, boot.snapshot.frame), true,
  'Prepared initial ground key differs from the real Bend browser boot');
const context = BoardScene.context_for(depth, size, frame);
const basis = Camera.basis(frame.view), order = Camera.depth_order(basis);
const coordinates = [[0, 0], [256, 274], [400, 400], [511, 511]];
const sample = image => coordinates.map(([x, y]) => Pixel.sample_xy(depth, x, y, image));
const runs = [];
for (let i = 0; i < 3; i++) {
  const t0 = performance.now();
  const rail = BoardScene.board_rail(depth, size, basis, theme, underlay);
  const t1 = performance.now();
  const tiled = BoardScene.ground_tiles(order, context, rail);
  const t2 = performance.now();
  const whole = BoardScene.ground_prepared(context, underlay);
  const t3 = performance.now();
  assert.deepEqual(sample(tiled), sample(whole));
  runs.push({ railMs: t1 - t0, tilesMs: t2 - t1, wholeMs: t3 - t2 });
}
const phases = { cornersMs: 0, shadowMs: 0, wallsMs: 0, topsMs: 0, rimsMs: 0 };
let staged = BoardScene.board_rail(depth, size, basis, theme, underlay), tiles = 0;
for (let rest = order; rest.$ === 'Con'; rest = rest.tail) {
  const square = rest.head;
  if (!Model.present(position.holes, square)) continue;
  const t0 = performance.now();
  const corners = BoardScene.square_corners(size, basis,
    Model.file_of(square), Model.rank_of(square));
  const style = BoardScene.surface(square, theme);
  const drop = BoardScene.extrusion(size, basis);
  const t1 = performance.now();
  const shadowed = BoardScene.tile_shadow(depth, size, corners, drop, style, staged);
  const t2 = performance.now();
  const walled = BoardScene.cutout_walls(square, depth, size, position.holes,
    theme, corners, basis, shadowed);
  const t3 = performance.now();
  const topped = BoardScene['tile.with_corners'](depth, size, corners, style, walled);
  const t4 = performance.now();
  staged = BoardScene.cutout_rim(square, depth, size, position.holes, theme, corners, topped);
  const t5 = performance.now();
  phases.cornersMs += t1 - t0;
  phases.shadowMs += t2 - t1;
  phases.wallsMs += t3 - t2;
  phases.topsMs += t4 - t3;
  phases.rimsMs += t5 - t4;
  tiles++;
}
const prepared = BoardScene.ground_prepared(context, underlay);
const selectedGround = selectedScene.settled_ground512(boot.snapshot.frame,
  selectedScene.underlay512_asset(theme, plates));
assert.deepEqual(raster(selectedGround, size), raster(prepared, size),
  'Selected production scene differs from the source-bound prepared ground');
const fastAt = performance.now();
const fast = BoardScene.fast_ground512(frame, BoardScene.board_rail(depth, size, basis, theme, underlay));
const fastMs = performance.now() - fastAt;
const preparedPixels = raster(prepared, size), fastPixels = raster(fast, size);
assert.deepEqual(raster(staged, size), preparedPixels,
  'Manual ground phases changed at least one of the 262,144 pixels');
let fastChanged = 0;
for (let i = 0; i < preparedPixels.length; i++)
  if (preparedPixels[i] !== fastPixels[i]) fastChanged++;
const encodedAt = performance.now(), encoded = JSON.stringify(prepared);
const encodedMs = performance.now() - encodedAt;
const parsedAt = performance.now(), parsed = JSON.parse(encoded);
const parsedMs = performance.now() - parsedAt;
assert.deepEqual(raster(parsed, size), raster(prepared, size),
  'Serialized prepared ground changed at least one of the 262,144 pixels');
function nodes(image: any): number {
  return image.$ === 'Pix' ? 1 : 1 + nodes(image.tl) + nodes(image.tr) + nodes(image.bl) + nodes(image.br);
}
console.log(JSON.stringify({ ok: true, assetSha256: asset.runtimeSha256,
  selected: { controllerSha256: controllerBinding, sceneSha256: sceneBinding },
  decodedPlate: { jsonBytes: Buffer.byteLength(plateText), stringifyMs: plateStringifyMs,
    jsonSha256: plateJsonSha256 },
  view: frame.view, holes: position.holes, size, tiles, runs, phases,
  fast: { ms: fastMs, changedPixels: fastChanged, totalPixels: size * size },
  groundPixelsSha256: crypto.createHash('sha256').update(Buffer.from(preparedPixels.buffer)).digest('hex'),
  prepared: { nodes: nodes(prepared), jsonBytes: Buffer.byteLength(encoded),
    gzipBytes: zlib.gzipSync(encoded, { level: 9 }).length, encodedMs, parsedMs },
  scope: 'Local Bun phase diagnostic on source-bound 512px asset and initial board topology' }));
