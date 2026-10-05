// Narrow selected emission; no full application/scene book or shared cache write.
// Run via: node bend2/tools/bend.mjs --run bend2/tests/piece-sprites/atlas-picking.ts
// Optional browser witness JSON: RIFT_ATLAS_PICK_WITNESSES=<explicit output path>.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as Bend from '../../../.artifacts/toolchains/bend/bend2/bend.ts';
import * as Comp from '../../../.artifacts/toolchains/bend/bend2/comp.ts';
import { resolveBaseForeignImports } from '../../tools/loader-v2.ts';
import { root } from '../../tools/selected-modules.mjs';

const book = Bend.book_nil(), seen = new Map<string, string | null>();
const file = (relative: string) => path.join(root, relative).replaceAll('\\', '/');
const witnessOutput = process.env.RIFT_ATLAS_PICK_WITNESSES;
await Bend.book_load(book, file('bend2/graphics/v2game/AtlasPicking.bend'), '', seen);
await Bend.book_load(book, file('bend2/graphics/v2game/AtlasPickData.bend'), './AtlasPickData', seen);
if (witnessOutput) await Bend.book_load(book, file('bend2/graphics/Picking.bend'), '../Picking', seen);
const sha = (bytes: Uint8Array | string) => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceHashes = witnessOutput ? [...new Set([...seen.keys(), file('bend2/tests/piece-sprites/atlas-picking.ts'),
  file('bend2/TOOLCHAIN.json'), file('bend2/tools/loader-v2.ts'), file('bend2/tools/bend.mjs'),
  file('.artifacts/toolchains/bend/bend2/bend.ts'), file('.artifacts/toolchains/bend/bend2/comp.ts')])]
  .map(source => ({ path: path.relative(root, source).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(source)) })) : [];
resolveBaseForeignImports(book);
Bend.book_valid(book);
assert.equal(book.hols + book.open, 0);
function name(relative: string, symbol: string): string {
  const namespace = seen.get(fs.realpathSync(file(relative)));
  assert.equal(typeof namespace, 'string');
  return namespace ? `${namespace}.${symbol}` : symbol;
}
const roots = ['pick', 'piece_hit', 'geometry_hit',
  name('bend2/graphics/v2game/SpritePlacement.bend', 'square_matrix'),
  name('bend2/graphics/v2game/AtlasPickData.bend', 'from_pieces'),
  ...['decode_page', 'prepare', 'draw_axis_aligned'].map(symbol =>
    name('bend2/graphics/v2game/PieceSprites.bend', symbol)),
  ...['depth_order', 'square_at'].map(symbol => name('bend2/graphics/Camera.bend', symbol)),
  name('bend2/lib/graphics/v2/RgbaSample.bend', 'uv'),
  ...['prepare', 'draw'].map(symbol => name('bend2/lib/graphics/v2/RgbaAffine.bend', symbol))];
const witnessRoots = witnessOutput ? [...['basis', 'default_view', 'center_x', 'center_y'].map(symbol =>
  name('bend2/graphics/Camera.bend', symbol)), ...['start', 'present'].map(symbol =>
  name('bend2/core/Model.bend', symbol)), name('bend2/graphics/Picking.bend', 'pick')] : [];
roots.push(...witnessRoots);
const emitted = Comp.js_lib(book, roots, roots);
const api = (await import(`data:text/javascript;base64,${Buffer.from(emitted).toString('base64')}`)).default;
const [pick, pieceHit, geometryHit, matrix, alphaOnly, decode, prepare, draw, depthOrder, floor, uv,
  prepareGeometry, drawGeometry] =
  roots.map(symbol => api[symbol]);
assert.ok(roots.every(symbol => typeof api[symbol] === 'function'));

const list = (xs: any[]) => xs.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
const unlist = (xs: any) => { const out: number[] = []; for (; xs.$ === 'Con'; xs = xs.tail) out.push(xs.head); return out; };
const pix = (color: number) => ({ $: 'Pix', color });
const fields = ['ivory_pawn', 'ivory_knight', 'ivory_bishop', 'ivory_rook', 'ivory_queen', 'ivory_king',
  'navy_pawn', 'navy_knight', 'navy_bishop', 'navy_rook', 'navy_queen', 'navy_king'];
const source = path.join(root, 'bend2/assets/source/pieces');
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8'));
const pages = manifest.tiers.interactive.pages.map((record: any) => {
  const bytes = fs.readFileSync(path.join(source, record.path));
  assert.equal(bytes.length, record.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), record.sha256);
  const decoded = decode(list([...bytes]), 7);
  assert.equal(decoded.$, 'Some');
  return decoded.value;
});
const actual = prepare(...pages), alpha = alphaOnly(actual);
assert.equal(alpha.$, 'Pieces', 'alpha pack uses the runtime Pieces constructor');
let samplerChecks = 0;
for (const field of fields) {
  assert.deepEqual(alpha[field].colors, pix(0));
  assert.deepEqual([alpha[field].depth, alpha[field].size, alpha[field].mask],
    [actual[field].depth, actual[field].size, actual[field].mask]);
  for (const [u, v] of [[0, 0], [1, 1], [.499, .751], [.021, .973], [.901, .087]]) {
    assert.equal(uv({ $: 'Linear' }, actual[field], u, v).alpha,
      uv({ $: 'Linear' }, alpha[field], u, v).alpha);
    samplerChecks++;
  }
}

function position(entries: [number, number][], holes = 0): any {
  const cells = Array(64).fill(0);
  for (const [square, code] of entries) cells[square] = code;
  return { $: 'Pos', board: list(cells), holes, side: true, rights: 0,
    ep: 64, epPawn: 64, quiet: 0n, full: 1n };
}
function pixels(image: any, size = 512): Uint32Array {
  const out = new Uint32Array(size * size);
  function visit(node: any, x: number, y: number, span: number): void {
    if (node.$ === 'Pix') {
      for (let row = y; row < y + span; row++) out.fill(node.color, row * size + x, row * size + x + span);
    } else {
      assert.equal(node.$, 'Qua');
      const h = span / 2;
      visit(node.tl, x, y, h); visit(node.tr, x + h, y, h);
      visit(node.bl, x, y + h, h); visit(node.br, x + h, y + h, h);
    }
  }
  visit(image, 0, 0, size);
  return out;
}
// White against black makes every positive painted opacity independently visible.
const support = { ...actual };
for (const field of fields) support[field] = { ...actual[field], colors: pix(0xffffff) };
const screen = { $: 'Box', left: 0, top: 0, right: 512, bottom: 512 };
const basis = { $: 'Basis', cosYaw: 1, sinYaw: 0, sinPitch: .30, cosPitch: .954,
  scale: 42.3, cx: 256, cy: 274 };
function rendered(square: number, code: number, camera = basis): Uint32Array {
  const side = { $: code < 8 ? 'Ivory' : 'Navy' };
  const kind = { $: ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'][(code - 1) % 8] ?? 'Pawn' };
  return pixels(draw(9n, 512, support, side, kind, matrix(512, camera, square), 255, screen, pix(0)));
}
let renderedChecks = 0, transparentControls = 0, feetControls = 0;
for (let id = 0; id < 12; id++) {
  const square = 27, code = id < 6 ? id + 1 : id + 3;
  const raster = rendered(square, code), m = matrix(512, basis, square);
  let transparent: number[] | undefined, feet: number[] | undefined;
  const samples: number[][] = [];
  for (let y = Math.max(0, Math.floor(m.ty) - 1); y <= Math.ceil(m.ty + m.d); y++) {
    for (let x = Math.max(0, Math.floor(m.tx) - 1); x <= Math.ceil(m.tx + m.a); x++) {
      const painted = raster[y * 512 + x] !== 0;
      const hit = pieceHit(true, square, code, basis, alpha, x, y);
      assert.equal(hit, painted, `rendered source sprite ${id} disagreed at ${x},${y}`);
      if (painted && samples.length < 3) samples.push([x, y]);
      if (painted && y >= m.ty + m.d - 8 && floor(x, y, basis) !== square) feet = [x, y];
      if (!painted && !hit && floor(x, y, basis) !== square) transparent = [x, y];
      renderedChecks++;
    }
  }
  const pos = position([[square, code]]);
  for (const [x, y] of samples) assert.equal(pick(pos, x, y, basis, alpha), square);
  assert.ok(samples.length, `real sprite ${id} painted pixels`);
  assert.ok(transparent, `real sprite ${id} transparent control`);
  assert.equal(pick(pos, ...transparent!, basis, alpha), floor(...transparent!, basis));
  transparentControls++;
  if (feet) {
    assert.equal(pick(pos, ...feet, basis, alpha), square);
    feetControls++;
  }
}
assert.ok(feetControls, 'authored feet below their floor projection remain selectable');

const squares = [27, 35], codes = [5, 13];
const rasters = squares.map((square, index) => rendered(square, codes[index]));
let overlap: number[] | undefined;
for (let y = 0; y < 512 && !overlap; y++) for (let x = 0; x < 512 && !overlap; x++) {
  if (rasters.every(raster => raster[y * 512 + x] !== 0)) overlap = [x, y];
}
assert.ok(overlap, 'low-pitch actual sprites overlap');
const order = unlist(depthOrder(basis)).filter(square => squares.includes(square));
const entries = squares.map((square, index) => [square, codes[index]] as [number, number]);
assert.equal(pick(position(entries), ...overlap!, basis, alpha), order.at(-1));
const hidden = order.at(-1)!;
const hole = 1 << (Math.floor(hidden / 16) * 4 + Math.floor((hidden % 8) / 2));
const remaining = order.filter(square => !(hole & (1 << (Math.floor(square / 16) * 4 + Math.floor((square % 8) / 2)))));
assert.equal(pick(position(entries, hole), ...overlap!, basis, alpha),
  remaining.at(-1) ?? floor(...overlap!, basis));
const empty = position([]);
assert.equal(pick(empty, ...overlap!, basis, alpha), floor(...overlap!, basis));
assert.equal(pick(empty, 512, 512, basis, alpha), 64);

const faint = { $: 'Texture', depth: 2n, size: 4, colors: pix(0xffffff),
  mask: { $: 'Qua', tl: pix(0x010000), tr: pix(0), bl: pix(0x800000), br: pix(0xff0000) } };
const geometry = prepareGeometry({ $: 'Matrix', a: 4.1, b: 0, c: 0, d: 4.1, tx: .6, ty: .6 });
const faintRaster = pixels(drawGeometry(4n, 16, geometry, faint, { $: 'Linear' }, 255,
  { $: 'Box', left: 0, top: 0, right: 16, bottom: 16 }, pix(0)), 16);
for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
  assert.equal(geometryHit(geometry, faint, x, y), faintRaster[y * 16 + x] !== 0);
}
assert.equal(faintRaster[0], 0, 'alpha one at quarter coverage rounds to no painted pixel');
assert.notEqual(faintRaster[17], 0, 'alpha one at full coverage paints a faint pixel');
if (witnessOutput) {
  const [cameraBasis, defaultView, centerX, centerY, start, present, legacyPick] = witnessRoots.map(symbol => api[symbol]);
  const frontView = { ...defaultView(), yaw: 0, pitch: 65 };
  const frontBasis = cameraBasis(frontView), initial = start(false);
  const cells = unlist(initial.board);
  const layers = unlist(depthOrder(frontBasis)).filter(square => cells[square] !== 0 && present(initial.holes, square))
    .map(square => ({ square, raster: rendered(square, cells[square], frontBasis) }));
  const profiles: any[] = [{ id: 'initial-front-layout-c', position: initial, view: frontView, basis: frontBasis,
    setup: 'Initial layout C, default zoom, then FRONT. Existing Model.start(false) and Camera.basis values.' }];
  const witnesses: any[] = [];
  const availability: any[] = [];
  const used = new Set<string>();
  function record(profile: any, x: number, y: number, painted: any[], reason: string, extra: any = {}): void {
    const floorSquare = floor(x, y, profile.basis);
    const paintedSquares = painted.filter(layer => layer.raster[y * 512 + x] !== 0).map(layer => layer.square);
    const expectedSquare = paintedSquares.at(-1) ?? floorSquare;
    assert.equal(pick(profile.position, x, y, profile.basis, alpha), expectedSquare);
    const legacySquare = legacyPick(profile.position, x, y, profile.basis);
    witnesses.push({ profile: profile.id, x, y, expectedSquare, floorSquare, paintedSquares,
      reason, legacySquare, legacyDisagrees: legacySquare !== expectedSquare,
      paintedSupport: painted.filter(layer => paintedSquares.includes(layer.square))
        .map(layer => ({ square: layer.square, whiteOnBlackPixel: layer.raster[y * 512 + x] })), ...extra });
    used.add(`${profile.id}:${x},${y}`);
  }
  function solid(layer: any, x: number, y: number): boolean {
    for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
      if (xx < 0 || xx >= 512 || yy < 0 || yy >= 512 || (layer.raster[yy * 512 + xx] & 255) < 48) return false;
    }
    return true;
  }
  for (const region of ['top', 'side', 'feet']) {
    let found = 0;
    let paintedCandidates = 0;
    const envelopes: any[] = [];
    for (const layer of layers.filter(layer => cells[layer.square] < 8)) {
      const m = matrix(512, frontBasis, layer.square);
      const cx = centerX(layer.square, frontBasis), cy = centerY(layer.square, frontBasis);
      const legacy = { left: cx - 12, top: cy - 32, right: cx + 12, bottom: cy + 4 };
      let candidate: number[] | undefined;
      let bestScore = -1, left = 512, top = 512, right = 0, bottom = 0;
      for (let y = Math.max(0, Math.floor(m.ty)); y < Math.min(512, Math.ceil(m.ty + m.d)); y++) {
        for (let x = Math.max(0, Math.floor(m.tx)); x < Math.min(512, Math.ceil(m.tx + m.a)); x++) {
          const intensity = layer.raster[y * 512 + x] & 255;
          if (intensity === 0) continue;
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
          const outside = region === 'top' ? y < legacy.top : region === 'side'
            ? x < legacy.left || x >= legacy.right : y >= legacy.bottom;
          const frontmost = layers.filter(other => other.raster[y * 512 + x] !== 0).at(-1)?.square;
          if (!outside || frontmost !== layer.square) continue;
          paintedCandidates++;
          const score = (floor(x, y, frontBasis) !== layer.square ? 10000 : 0) + intensity * 16 + Number(solid(layer, x, y));
          if (score > bestScore && !used.has(`${profiles[0].id}:${x},${y}`)) {
            candidate = [x, y]; bestScore = score;
          }
        }
      }
      envelopes.push({ square: layer.square, renderedSupport: { left, top, right, bottom }, legacyFootprint: legacy });
      if (candidate && found < 2) {
        record(profiles[0], candidate[0], candidate[1], layers, `painted-white-${region}-outside-legacy-footprint`,
          { square: layer.square, code: cells[layer.square], legacyFootprint: legacy,
            whiteSupportIntensity: layer.raster[candidate[1] * 512 + candidate[0]] & 255,
            solidNeighborhoodRadius: solid(layer, candidate[0], candidate[1]) ? 1 : 0 });
        found++;
      }
    }
    availability.push({ profile: profiles[0].id, region, witnesses: found, paintedCandidates,
      status: found ? 'available' : 'unavailable',
      reason: found ? 'Measured positive painted support beyond the exact legacy rectangle'
        : 'No frontmost white painted pixel beyond this legacy rectangle boundary at this exact camera/position', envelopes });
  }
  let transparentCount = 0;
  for (const layer of layers.filter(layer => cells[layer.square] < 8)) {
    if (transparentCount >= 2) break;
    const m = matrix(512, frontBasis, layer.square);
    let candidate: number[] | undefined;
    for (let y = Math.max(1, Math.ceil(m.ty + 1)); y < Math.min(511, Math.floor(m.ty + m.d - 1)) && !candidate; y++) {
      for (let x = Math.max(1, Math.ceil(m.tx + 1)); x < Math.min(511, Math.floor(m.tx + m.a - 1)) && !candidate; x++) {
        if (floor(x, y, frontBasis) === layer.square || used.has(`${profiles[0].id}:${x},${y}`)) continue;
        let clear = true;
        for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) {
          if (layers.some(other => other.raster[yy * 512 + xx] !== 0)) clear = false;
        }
        if (clear) candidate = [x, y];
      }
    }
    if (candidate) {
      record(profiles[0], candidate[0], candidate[1], layers, 'transparent-in-white-quad-falls-through-to-other-floor',
        { transparentSquare: layer.square, clearNeighborhoodRadius: 1 });
      transparentCount++;
    }
  }
  availability.push({ profile: profiles[0].id, region: 'transparent-to-different-floor', witnesses: transparentCount,
    status: transparentCount ? 'available' : 'unavailable',
    reason: transparentCount ? 'Clear rendered neighborhoods inside white quads with another floor square'
      : 'No qualifying clear rendered neighborhood inside a white quad with another floor square' });
  const overlapLayers = order.map(square => ({ square, raster: rasters[squares.indexOf(square)] }));
  for (const [id, pos] of [['overlap-lowpitch', position(entries)], ['hole-lowpitch', position(entries, hole)]] as const) {
    const profile = { id, position: pos, basis,
      setup: 'Synthetic diagnostic position; browser import/installation is not established by this packet.' };
    profiles.push(profile);
    let candidate: number[] | undefined;
    for (let y = 1; y < 511 && !candidate; y++) for (let x = 1; x < 511 && !candidate; x++) {
      if (overlapLayers.every(layer => solid(layer, x, y)) && !witnesses.some(w => w.x === x && w.y === y)) candidate = [x, y];
    }
    availability.push({ profile: id, region: id, witnesses: candidate ? 1 : 0, status: candidate ? 'available' : 'unavailable',
      reason: candidate ? 'Both independently rendered source sprites have solid support here'
        : 'No unused solid overlap neighborhood found in this synthetic profile' });
    if (candidate) record(profile, candidate[0], candidate[1], overlapLayers.filter(layer => present(pos.holes, layer.square)),
        id === 'overlap-lowpitch' ? 'last-painted-occupied-piece-wins-overlap' : 'hole-removes-otherwise-frontmost-overlapping-piece',
        { overlappingSquaresBeforeHoles: order, excludedByHole: order.filter(square => !present(pos.holes, square)) });
  }
  for (const entry of sourceHashes) assert.equal(sha(fs.readFileSync(file(entry.path))), entry.sha256, `changed source ${entry.path}`);
  const packet = { schema: 'rift-atlas-pick-browser-witnesses/1', coordinateSpace: 'canonical settled 512x512 board pixels',
    positionNatEncoding: 'Pos.quiet/full are decimal strings; board retains its Con/Nil shape',
    evidence: 'Expected values use independently rendered real-source support, painter depth order and Camera floor. AtlasPicking verifies each expected value; browser acceptance is pending.',
    sourceHashes, assets: { manifestSha256: sha(fs.readFileSync(path.join(source, 'manifest.json'))),
      pages: manifest.tiers.interactive.pages }, profiles, availability, witnesses };
  const output = path.resolve(witnessOutput);
  assert.ok(!fs.existsSync(output), 'Witness output already exists; choose a fresh artifact path');
  fs.writeFileSync(output, JSON.stringify(packet, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({ ok: true, samplerChecks, renderedChecks,
  transparentControls, feetControls, overlapAndHoleControls: 2, faintBoundaryPixels: 256,
  scope: 'Selected pinned Bend JS; real source alpha, exact painted-pixel support, transparent/feet/overlap/hole/floor controls. No browser/native claim.' }));
