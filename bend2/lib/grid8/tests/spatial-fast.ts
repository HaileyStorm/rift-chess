import assert from 'node:assert/strict';
import Fast from '../SpatialFast.bend';

type Image = { $: 'Pix'; color: number } | { $: 'Qua'; tl: Image; tr: Image; bl: Image; br: Image };
const pix = (color: number): Image => ({ $: 'Pix', color });
function sample(image: Image, size: number, x: number, y: number): number {
  while (image.$ === 'Qua') {
    size /= 2;
    const right = x >= size, down = y >= size;
    image = down ? right ? image.br : image.bl : right ? image.tr : image.tl;
    if (right) x -= size;
    if (down) y -= size;
  }
  return image.color;
}
const palette = { $: 'Palette', light_top: 0xB6CBD5, dark_top: 0x30495A,
  light_side: 0x607687, dark_side: 0x172A3A, edge: 0xDDE9D7,
  shadow: 0x08151F, glint: 0x82DDE3 };
const mask = { $: 'Mask', low: (0xFFFFFFFF ^ (1 << 5) ^ (1 << 27)) >>> 0,
  high: (0xFFFFFFFF ^ (1 << 4) ^ (1 << 22)) >>> 0 };
const base = pix(0x121A2D);
let checks = 0;
for (const size of [64, 128]) {
  const k = size / 64, depth = BigInt(Math.log2(size));
  for (const a of [
    { origin_x: 8*k, origin_y: 12*k, file_x: 6*k, file_y: -1*k, rank_x: 1*k, rank_y: 5*k },
    { origin_x: 30*k, origin_y: 8*k, file_x: 4*k, file_y: 2*k, rank_x: -2*k, rank_y: 5*k },
    { origin_x: 50*k, origin_y: 10*k, file_x: -5*k, file_y: 1*k, rank_x: 1*k, rank_y: 5*k },
    { origin_x: 48.37*k, origin_y: 9.61*k, file_x: -4.81*k, file_y: 1.43*k, rank_x: 1.13*k, rank_y: 5.19*k },
    { origin_x: -8.17*k, origin_y: 34.71*k, file_x: 5.63*k, file_y: -2.21*k, rank_x: 1.37*k, rank_y: -4.89*k },
  ]) {
    const affine = { $: 'Affine', ...a };
    const image = Fast.draw(depth, size, affine, mask, palette, base) as Image;
    const det = a.file_x * a.rank_y - a.file_y * a.rank_x;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const dx = x + .5 - a.origin_x, dy = y + .5 - a.origin_y;
      const f = (dx * a.rank_y - dy * a.rank_x) / det;
      const r = (dy * a.file_x - dx * a.file_y) / det;
      let expected = base.color;
      if (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const file = Math.floor(f), rank = Math.floor(r), id = rank * 8 + file;
        const word = id < 32 ? mask.low : mask.high;
        if ((word >>> (id % 32)) & 1) expected = ((file + rank) % 2) ? palette.dark_top : palette.light_top;
      }
      assert.equal(sample(image, size, x, y), expected, `fast ${size}/${JSON.stringify(a)}/${x}/${y}`);
      checks++;
    }
  }
}
// The real game can rotate and translate by fractions, including reflected
// bases and offscreen cells. Compare pixels near every projected internal line
// and all four canvas edges at both full interaction resolutions. The oracle
// solves the inverse independently in JS double precision with ideal half-open
// cells. Samples within 1e-5 board units of an integer line are explicitly
// precision-ambiguous under the Bend F32 lowering; only those may use either
// adjacent cell. All other samples must match the unbiased oracle exactly.
function scalarColor(file: number, rank: number): number {
  if (file < 0 || file >= 8 || rank < 0 || rank >= 8) return base.color;
  const f = Math.floor(file), r = Math.floor(rank), id = r * 8 + f;
  const word = id < 32 ? mask.low : mask.high;
  return ((word >>> (id % 32)) & 1) ? ((f + r) % 2 ? palette.dark_top : palette.light_top) : base.color;
}
const tieBand = 0.00001;
let precisionAmbiguous = 0;
for (const size of [1024, 2048]) {
  const k = size / 1024;
  for (const a of [
    { origin_x: 220.37*k, origin_y: 330.61*k, file_x: 64.13*k, file_y: -12.27*k, rank_x: 12.19*k, rank_y: 50.31*k },
    { origin_x: 161.29*k, origin_y: 483.41*k, file_x: 45.13*k, file_y: -43.21*k, rank_x: 45.37*k, rank_y: 43.09*k },
    { origin_x: 855.71*k, origin_y: 175.39*k, file_x: -64.21*k, file_y: 13.27*k, rank_x: -12.11*k, rank_y: 49.83*k },
    { origin_x: -80.31*k, origin_y: 500.17*k, file_x: 72.27*k, file_y: 8.13*k, rank_x: 11.91*k, rank_y: -55.23*k },
  ]) {
    const image = Fast.draw(BigInt(Math.log2(size)), size, { $: 'Affine', ...a }, mask, palette, base) as Image;
    const det = a.file_x * a.rank_y - a.file_y * a.rank_x;
    const points = new Set<string>();
    const add = (x: number, y: number) => {
      if (x >= 0 && x < size && y >= 0 && y < size) points.add(`${x},${y}`);
    };
    for (let cell = 0; cell <= 8; cell++) for (let offset = 0; offset <= 8; offset += .5) {
      for (const [file, rank] of [[cell, offset], [offset, cell]]) {
        const x = Math.floor(a.origin_x + file * a.file_x + rank * a.rank_x);
        const y = Math.floor(a.origin_y + file * a.file_y + rank * a.rank_y);
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) add(x + dx, y + dy);
      }
    }
    for (let edge = 0; edge < size; edge += Math.max(1, Math.floor(size / 127))) {
      for (const x of [0, 1, size - 2, size - 1]) add(x, edge);
      for (const y of [0, 1, size - 2, size - 1]) add(edge, y);
    }
    for (const key of points) {
      const [x, y] = key.split(',').map(Number);
      const dx = x + .5 - a.origin_x, dy = y + .5 - a.origin_y;
      const file = (dx * a.rank_y - dy * a.rank_x) / det;
      const rank = (dy * a.file_x - dx * a.file_y) / det;
      const ambiguousFile = Math.abs(file - Math.round(file)) <= tieBand;
      const ambiguousRank = Math.abs(rank - Math.round(rank)) <= tieBand;
      const actual = sample(image, size, x, y);
      if (ambiguousFile || ambiguousRank) {
        const files = ambiguousFile ? [file - 2*tieBand, file + 2*tieBand] : [file];
        const ranks = ambiguousRank ? [rank - 2*tieBand, rank + 2*tieBand] : [rank];
        const allowed = files.flatMap(f => ranks.map(r => scalarColor(f, r)));
        assert.ok(allowed.includes(actual), `ambiguous F32 edge ${size}/${JSON.stringify(a)}/${x}/${y}`);
        precisionAmbiguous++;
      } else {
        assert.equal(actual, scalarColor(file, rank), `fractional fast ${size}/${JSON.stringify(a)}/${x}/${y}`);
      }
      checks++;
    }
  }
}
for (const size of [1024, 2048]) {
  const k = size / 1024, x = 500*k, y = 400*k;
  for (const direction of [-1, 1]) {
    const file = 5 + direction * 0.00004;
    const a = { $: 'Affine', origin_x: x + .5 - file * 64*k,
      origin_y: y + .5 - .5 * 64*k,
      file_x: 64*k, file_y: 0, rank_x: 0, rank_y: 64*k };
    const image = Fast.draw(BigInt(Math.log2(size)), size, a, mask, palette, base) as Image;
    assert.equal(sample(image, size, x, y), scalarColor(file, .5),
      `file boundary beyond tie band ${size}/${direction}`);
    checks++;
  }
}
const affine = { $: 'Affine', origin_x: 10, origin_y: 10, file_x: 5, file_y: 1, rank_x: -1, rank_y: 5 };
assert.equal(Fast.draw(6n, 64, affine, { $: 'Mask', low: 0, high: 0 }, palette, base), base);
checks++;
console.log(JSON.stringify({ ok: true, checks, precisionAmbiguous, tieBand,
  scope: 'Independent unbiased finite affine reference; only F32 near-tie band accepts either adjacent cell; native/browser evidence separate' }));
