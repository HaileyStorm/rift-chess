import assert from 'node:assert/strict';
import Color from '../../graphics/v2/Color.bend';
import Layer from '../../graphics/v2/Layer.bend';
import Gradient from '../../graphics/v2/Gradient.bend';
import Board from '../Board.bend';
import Shapes from '../../graphics/v2/Shapes.bend';
import Rounded from '../../graphics/v2/Rounded.bend';
import Detail from '../../graphics/v2/Detail.bend';
import Ring from '../../graphics/v2/Ring.bend';
import TileSurface from '../TileSurface.bend';
import Facet from '../../graphics/v2/Facet.bend';
import Alpha from '../../graphics/v2/Alpha.bend';
import Quad from '../../graphics/Quad.bend';
import SpatialBoard from '../SpatialBoard.bend';
import RaisedFacet from '../../graphics/v2/RaisedFacet.bend';
import Texture from '../../graphics/v2/Texture.bend';
import Stamp from '../../graphics/v2/Stamp.bend';
import Upscale from '../../graphics/v2/Upscale.bend';

type Image = { $: 'Pix'; color: number } | { $: 'Qua'; tl: Image; tr: Image; bl: Image; br: Image };
const pix = (color: number): Image => ({ $: 'Pix', color });
const qua = (tl: Image, tr: Image, bl: Image, br: Image): Image => ({ $: 'Qua', tl, tr, bl, br });
const pos = (value: number) => ({ $: 'Pos', value });
const neg = (magnitude: number) => ({ $: 'Neg', magnitude });
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
function refBlend(src: number, dst: number, opacity: number): number {
  const a = Math.min(opacity, 255);
  let result = 0;
  for (const shift of [16, 8, 0]) {
    const s = (src >>> shift) & 255, d = (dst >>> shift) & 255;
    result |= Math.floor((s * a + d * (255 - a) + 127) / 255) << shift;
  }
  return result >>> 0;
}
function quarterDisk(x: number, y: number, cx: number, cy: number, radius: number): number {
  let count = 0;
  for (const oy of [.25, .75]) for (const ox of [.25, .75])
    count += Number((x + ox - cx) ** 2 + (y + oy - cy) ** 2 <= radius ** 2);
  return count;
}
function quarterRounded(x: number, y: number, l: number, t: number, r: number, b: number, rad: number): number {
  let count = 0;
  for (const oy of [.25, .75]) for (const ox of [.25, .75]) {
    const px = x + ox, py = y + oy;
    if (px < l || px >= r || py < t || py >= b) continue;
    const dx = Math.max(l + rad - px, 0, px - (r - rad));
    const dy = Math.max(t + rad - py, 0, py - (b - rad));
    count += Number(dx * dx + dy * dy <= rad * rad);
  }
  return count;
}
let checks = 0;
function equal(actual: unknown, expected: unknown, label: string) {
  assert.equal(actual, expected, label); checks++;
}
for (const src of [0, 0xFFFFFF, 0x6732C8, 0x102A38])
  for (const dst of [0, 0xFFFFFF, 0x005D80, 0xB1A08E])
    for (const a of [0, 1, 64, 127, 128, 254, 255, 256])
      equal(Color.over(src, dst, a), refBlend(src, dst, a), `color ${src}/${dst}/${a}`);

const source = qua(pix(0x102030), pix(0xED7080), pix(0x3403AD), pix(0xF0C020));
const dest = qua(pix(0xFDF8E6), pix(0x04101E), pix(0xACDADA), pix(0x212941));
for (const a of [0, 1, 91, 128, 254, 255]) {
  const result = Layer.over(1n, source, a, dest) as Image;
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++)
    equal(sample(result, 2, x, y), refBlend(sample(source, 2, x, y), sample(dest, 2, x, y), a), `layer ${a}/${x}/${y}`);
}
equal(Layer.over(1n, source, 0, dest), dest, 'transparent layer retains exact destination tree');
equal(Layer.over(1n, source, 255, dest), source, 'opaque layer retains exact source tree');
equal(Alpha.apply(1n, pix(0), 0xC030F0, dest), dest, 'zero mask retains exact destination tree');
equal(Alpha.apply(1n, pix(255), 0xC030F0, dest).color, 0xC030F0, 'opaque mask uniform overlay');
const alphaMask = qua(pix(0), pix(85), pix(170), pix(255));
const alphaImage = Alpha.apply(1n, alphaMask, 0xE020F0, pix(0x102030)) as Image;
for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++)
  equal(sample(alphaImage, 2, x, y), refBlend(0xE020F0, 0x102030, sample(alphaMask, 2, x, y)), `alpha mask ${x}/${y}`);

const qpoint = (x: number, y: number) => ({ $: 'Point', x, y });
const facet = Quad.make(qpoint(20, 20), qpoint(40, 20), qpoint(40, 40), qpoint(20, 40));
const faceted = Facet.draw(6n, 64, facet, 0xC4B18D, 255, pix(0x101823)) as Image;
equal(sample(faceted, 64, 30, 30), 0xC4B18D, 'projected face solid interior');
equal(sample(faceted, 64, 19, 30), 0x101823, 'projected face exterior preserved');
function convexQuarterCount(vertices: readonly (readonly [number, number])[], x: number, y: number): number {
  const centerX = vertices.reduce((sum, point) => sum + point[0], 0) / 4;
  const centerY = vertices.reduce((sum, point) => sum + point[1], 0) / 4;
  let count = 0;
  for (const dy of [0.25, 0.75]) for (const dx of [0.25, 0.75]) {
    const inside = vertices.every(([ax, ay], i) => {
      const [bx, by] = vertices[(i + 1) % 4];
      const orient = (bx - ax) * (centerY - ay) - (by - ay) * (centerX - ax);
      const side = (bx - ax) * (y + dy - ay) - (by - ay) * (x + dx - ax);
      return orient >= 0 ? side >= 0 : side <= 0;
    });
    count += Number(inside);
  }
  return count;
}
const fractionalFaces: readonly (readonly (readonly [number, number])[])[] = [
  [[0.5, 10.2], [0.8, 10.2], [0.8, 20.2], [0.5, 20.2]],
  [[7.5, 0.6], [7.8, 0.6], [7.8, 31.4], [7.5, 31.4]],
  [[-2.3, 1.7], [15.8, 0.2], [16.7, 3.9], [-1.4, 5.4]],
  [[10.4, 6.4], [12.9, 6.9], [11.7, 27.2], [9.2, 26.7]],
  [[28.2, 17.5], [34.1, 18.3], [33.3, 19.1], [27.4, 18.3]],
  [[22.5, 10.1], [20.2, 15.7], [17.7, 14.7], [20.0, 9.1]],
];
for (const [faceIndex, points] of fractionalFaces.entries()) {
  const [a, b, c, d] = points.map(([x, y]) => qpoint(x, y));
  const color = 0xC6B8E4, background = 0x142A42, opacity = 213;
  const result = Facet.draw(5n, 32, Quad.make(a, b, c, d), color, opacity, pix(background)) as Image;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const count = convexQuarterCount(points, x, y);
    equal(sample(result, 32, x, y), refBlend(color, background, Math.floor(opacity * count / 4)),
      `fractional face ${faceIndex}/${x}/${y}`);
  }
}
equal(convexQuarterCount(fractionalFaces[0], 0, 12), 2,
  'thin face intersects x=0 only at its right quarter samples');
const projection = { $: 'Projection', origin_x: 10, origin_y: 20, file_dx: 12,
  file_up: 1, rank_dx: 2, rank_down: 10, thickness: 3 };
const spatialPalette = { $: 'Palette', light_top: 0xB4D0DA, dark_top: 0x304455,
  light_side: 0x758B9C, dark_side: 0x13293A,
  edge: 0xEDF2D5, shadow: 0x09121D, glint: 0xD0F3F6 };
const lower = pix(0x2D1741);
equal(SpatialBoard.draw(7n, 128, projection, { $: 'Mask', low: 0, high: 0 },
  spatialPalette, lower), lower, 'empty spatial mask exact tree identity');
const onePlatform = SpatialBoard.draw(7n, 128, projection, { $: 'Mask', low: 1, high: 0 },
  spatialPalette, lower) as Image;
equal(sample(onePlatform, 128, 16, 24), spatialPalette.light_top, 'projected top interior');
equal(sample(onePlatform, 128, 29, 23), lower.color, 'absent projected cell reveals lower scene');
equal(sample(onePlatform, 128, 80, 80), lower.color, 'spatial exterior preserved');
const stageLight = { $: 'Light', ink: 0xBFEACA, strength: 150, file: 0, rank: 0 };
for (const origin of [0, 4, 7, 20]) for (const strength of [0, 117, 300])
  for (let rank = 0; rank < 8; rank++) for (let file = 0; file < 8; file++) {
    const input = { $: 'Surface', top: 0x304B62, side: 0x182B3A,
      edge: 0xBFA76C, shadow: 0x06101A, glint: 0x75D5D8 };
    const tinted = SpatialBoard.illuminate(input,
      { $: 'Light', ink: 0xBFEACA, strength, file: origin, rank: origin },
      file, rank);
    const distance = Math.abs(file - Math.min(origin, 7)) + Math.abs(rank - Math.min(origin, 7));
    const alpha = Math.floor(Math.min(strength, 255) * (15 - distance) / 15);
    equal(tinted.top, refBlend(0xBFEACA, input.top, alpha), `directional top ${origin}/${strength}/${file}/${rank}`);
    equal(tinted.side, refBlend(0xBFEACA, input.side, Math.floor(alpha / 3)), `directional side ${origin}/${strength}/${file}/${rank}`);
    equal(tinted.edge, input.edge, 'directional edge retains material');
  }
const oneLit = SpatialBoard.draw_lit(7n, 128, projection,
  { $: 'Mask', low: 1, high: 0 }, spatialPalette, stageLight, lower) as Image;
equal(sample(oneLit, 128, 16, 24), refBlend(stageLight.ink, spatialPalette.light_top, 150),
  'one flat-color directional light tints a projected top without more faces');
equal(SpatialBoard.draw_lit(7n, 128, projection, { $: 'Mask', low: 0, high: 0 },
  spatialPalette, stageLight, lower), lower, 'lit empty spatial field exact input identity');
const unlit = SpatialBoard.draw_lit(7n, 128, projection,
  { $: 'Mask', low: 1, high: 0 }, spatialPalette,
  { $: 'Light', ink: 0xFFFFFF, strength: 0, file: 7, rank: 7 }, lower) as Image;
for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++)
  equal(sample(unlit, 128, x, y), sample(onePlatform, 128, x, y),
    `zero-strength lit field matches plain projection ${x}/${y}`);
const style = { $: 'Surface', top: 0xC6DCE2, side: 0x394D60,
  edge: 0xFFF4D6, shadow: 0x0B1826, glint: 0x92E6E8 };
const rotated = [qpoint(60, 20), qpoint(80, 40), qpoint(60, 60), qpoint(40, 40)];
equal(RaisedFacet.draw_cell(false, 7n, 128, ...rotated, -3, 7, style, lower), lower,
  'absent arbitrary projected cell exact identity');
const rotatedCell = RaisedFacet.draw_cell(true, 7n, 128, ...rotated, -3, 7, style, lower) as Image;
equal(sample(rotatedCell, 128, 60, 40), style.top, 'rotated top interior');
equal(sample(rotatedCell, 128, 25, 40), lower.color, 'rotated exterior');
const reverse = [qpoint(60, 20), qpoint(40, 40), qpoint(60, 60), qpoint(80, 40)];
const reverseCell = RaisedFacet.draw_cell(true, 7n, 128, ...reverse, 3, 7, style, lower) as Image;
equal(sample(reverseCell, 128, 60, 40), style.top, 'reverse winding face interior');
const behind = RaisedFacet.draw_cell(true, 7n, 128,
  qpoint(10, 10), qpoint(30, 10), qpoint(30, 30), qpoint(10, 30), 0, 5,
  { ...style, top: 0x1C4865 }, lower) as Image;
const inFront = RaisedFacet.draw_cell(true, 7n, 128,
  qpoint(20, 20), qpoint(40, 20), qpoint(40, 40), qpoint(20, 40), 0, 5,
  style, behind) as Image;
equal(sample(inFront, 128, 25, 25), style.top, 'later facet wins projected overlap');
function refHash(x: number, y: number, seed: number): number {
  let a = ((Math.imul(x, 374761393) + Math.imul(y, 668265263)) ^ seed) >>> 0;
  const b = Math.imul(a ^ (a >>> 13), 1274126177) >>> 0;
  return (b ^ (b >>> 16)) >>> 0;
}
const grain = { $: 'Grain', base: 0x13334B, ink: 0x93D7DF, strength: 127, seed: 481 };
for (const [levels, make] of [[4, Texture.coarse], [5, Texture.detailed]] as const) {
  const size = 128, cell = size / 2 ** levels;
  const texture = make(size, grain) as Image;
  for (let tileY = 0; tileY < 2 ** levels; tileY++) for (let tileX = 0; tileX < 2 ** levels; tileX++) {
    const alpha = Math.floor(((refHash(tileX, tileY, grain.seed) & 255) * grain.strength) / 255);
    equal(sample(texture, size, tileX * cell, tileY * cell), refBlend(grain.ink, grain.base, alpha),
      `balanced texture ${levels}/${tileX}/${tileY}`);
  }
}
const sprite = qua(pix(0), pix(0xE7BB72), pix(0x75D5D8), pix(0));
const stampBase = qua(pix(0x101820), pix(0x172938), pix(0x293747), pix(0x3B4D5D));
for (const [left, top] of [[-2, 1], [0, 0], [1, 3], [5, 6], [9, -2]]) {
  const coord = (n: number) => n < 0 ? neg(-n) : pos(n);
  const stamped = Stamp.draw(3n, 8, 2n, 4, coord(left), coord(top), sprite, 0, stampBase) as Image;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const old = sample(stampBase, 8, x, y);
    const localX = x - left, localY = y - top;
    const src = localX >= 0 && localX < 4 && localY >= 0 && localY < 4 ? sample(sprite, 4, localX, localY) : 0;
    equal(sample(stamped, 8, x, y), src || old, `stamp ${left}/${top}/${x}/${y}`);
  }
}
equal(Stamp.draw(3n, 8, 2n, 4, pos(2), pos(3), pix(0), 0, stampBase),
  stampBase, 'uniform transparent stamp retains exact destination tree');
const layered = Stamp.draw(3n, 8, 2n, 4, pos(1), pos(1), pix(0xABCDEF), 0,
  Stamp.draw(3n, 8, 2n, 4, pos(0), pos(0), sprite, 0, stampBase)) as Image;
equal(sample(layered, 8, 1, 1), 0xABCDEF, 'later opaque stamp wins overlap');

for (const depth of [3, 5]) {
  const size = 2 ** depth;
  for (const [cx, cy, radius, opacity] of [[-3, 5, 9, 255], [size - 2, size + 3, 7, 107], [Math.floor(size / 2), Math.floor(size / 2), 5, 202], [4, 4, 0, 255]]) {
    const base = pix(0x132A47);
    const image = Shapes.disk(BigInt(depth), size, cx < 0 ? neg(-cx) : pos(cx), cy < 0 ? neg(-cy) : pos(cy), radius, 0xE8BD73, opacity, base) as Image;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const count = radius === 0 ? 0 : quarterDisk(x, y, cx, cy, radius);
      const expected = refBlend(0xE8BD73, 0x132A47, Math.floor(opacity * count / 4));
      equal(sample(image, size, x, y), expected, `disk ${depth}/${cx}/${cy}/${radius}/${x}/${y}`);
    }
  }
  for (const [l, t, r, b, rad, opacity] of [[-3, 2, size - 2, size - 1, 5, 255], [3, -4, size + 5, size + 3, 2, 97], [1, 1, 6, 6, 0, 193]]) {
    const coord = (n: number) => n < 0 ? neg(-n) : pos(n);
    const image = Rounded.draw(BigInt(depth), size, coord(l), coord(t), coord(r), coord(b), rad, 0xAB65DF, opacity, pix(0x203B4D)) as Image;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const count = rad <= Math.floor(Math.min(r - l, b - t) / 2) ? quarterRounded(x, y, l, t, r, b, rad) : 0;
      equal(sample(image, size, x, y), refBlend(0xAB65DF, 0x203B4D, Math.floor(opacity * count / 4)), `round ${depth}/${l}/${t}/${x}/${y}`);
    }
  }
  for (const [cx, cy, inner, outer, opacity] of [[-2, 4, 2, 6, 255], [size + 2, size - 1, 1, 8, 117], [4, 4, 4, 4, 200]]) {
    const coord = (n: number) => n < 0 ? neg(-n) : pos(n);
    const base = pix(0x102B48);
    const image = Ring.draw(BigInt(depth), size, coord(cx), coord(cy), inner, outer,
      0x77DBE6, opacity, base) as Image;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const count = inner >= outer ? 0 : quarterDisk(x, y, cx, cy, outer) - quarterDisk(x, y, cx, cy, inner);
      equal(sample(image, size, x, y), refBlend(0x77DBE6, 0x102B48, Math.floor(opacity * count / 4)), `ring ${depth}/${cx}/${cy}/${inner}/${outer}/${x}/${y}`);
    }
    if (inner >= outer) equal(image, base, 'inverted ring preserves exact tree');
  }
}
for (const depth of [6, 8]) {
  const size = 2 ** depth, band = size / 16;
  const image = Gradient.vertical(BigInt(depth), size, band, size / 8, size * 7 / 8, 0x051429, 0xEAC1A0) as Image;
  for (let y = 0; y < size; y++) for (const x of [0, size / 3 | 0, size - 1]) {
    const yy = Math.floor(y / band) * band;
    const t = yy <= size / 8 ? 0 : yy >= size * 7 / 8 ? 255 : Math.floor((yy - size / 8) * 255 / (size * 3 / 4));
    equal(sample(image, size, x, y), refBlend(0xEAC1A0, 0x051429, t), `gradient ${size}/${x}/${y}`);
  }
  const board = Board.make(BigInt(depth), size, 12, 87) as Image;
  for (let y = 0; y < size; y += Math.max(1, size / 64)) for (let x = 0; x < size; x += Math.max(1, size / 64))
    equal(sample(board, size, x, y), ((x / (size / 8) | 0) + (y / (size / 8) | 0)) % 2 === 0 ? 12 : 87, `board ${size}/${x}/${y}`);
  const mask = { $: 'Mask', low: (0xFFFFFFFF ^ (1 << 2) ^ (1 << 17)) >>> 0,
    high: (0xFFFFFFFF ^ (1 << 4) ^ (1 << 20)) >>> 0 };
  const under = pix(0xABCDEF);
  equal(Board.paint_masked(BigInt(depth), size, { $: 'Mask', low: 0, high: 0 }, 12, 87, under), under, 'empty board mask retains exact input tree');
  const sparse = Board.paint_masked(BigInt(depth), size, mask, 12, 87, under) as Image;
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const id = row * 8 + col;
    equal(sample(sparse, size, col * size / 8, row * size / 8), [2, 17, 36, 52].includes(id) ? under.color : ((col + row) % 2 ? 87 : 12), `void ${size}/${col}/${row}`);
  }
  const palette = { $: 'Palette', light_top: 0x426476, light_bottom: 0x223E50,
    dark_top: 0x1D3A4C, dark_bottom: 0x102B3A, rim: 0x85A7AD,
    shadow: 0x081521, void_top: 0x0E1732, void_bottom: 0x030815,
    void_glow: 0x4EC7D4, grain: 72, seed: 491 };
  const materials = TileSurface.tiles(BigInt(depth - 3), size / 8, palette);
  const field = TileSurface.make(BigInt(depth), size, mask, palette) as Image;
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const id = row * 8 + col;
    const source = [2, 17, 36, 52].includes(id) ? materials.absent : ((col + row) % 2 ? materials.dark : materials.light);
    for (const dy of [0, Math.floor(size / 16), size / 8 - 1])
      for (const dx of [0, Math.floor(size / 16), size / 8 - 1])
        equal(sample(field, size, col * size / 8 + dx, row * size / 8 + dy),
          sample(source, size / 8, dx, dy), `tile material ${size}/${col}/${row}/${dx}/${dy}`);
  }
}
const known = (memory_mib: number) => ({ $: 'Known', memory_mib });
const probed = (max_successful_edge: number) => ({ $: 'Probed', max_successful_edge });
equal(Detail.choose(700, 6000, known(128), 4096, true, 2400, true, 5800, false, 0).$, 'Economy', 'physical 1k demand stays economy');
equal(Detail.choose(1800, 6000, probed(2048), 4096, true, 3200, false, 0, false, 0).$, 'Balanced', 'measured 2k settle and allocation probe');
equal(Detail.choose(3500, 6000, probed(4096), 4096, true, 3200, false, 7000, true, 5400).$, 'Ultra', 'measured complete GPU-assisted 4k settle');
equal(Detail.choose(3500, 6000, { $: 'Unknown' }, 4096, true, 3200, true, 5400, true, 5400).$, 'Economy', 'unknown capacity stays conservative');
equal(Detail.choose(3500, 6000, known(1024), 4096, true, 7000, true, 7000, false, 0).$, 'Economy', 'slow measured settle does not upgrade');
equal(Detail.interactive({ $: 'Balanced' }, 100, true, 113, false, 0).$, 'Economy', 'slow 2k drag falls back to 1k');
equal(Detail.interactive({ $: 'Ultra' }, 100, true, 78, false, 0).$, 'Balanced', '4k settle can use measured 2k drag');
equal(Detail.interactive({ $: 'Ultra' }, 100, true, 78, true, 64).$, 'Ultra', 'measured 4k drag can stay ultra');
equal(Detail.size({ $: 'Preview' }), 512, 'Bend preview tier is 512 logical pixels');
equal(Detail.interactive_with_preview({ $: 'Balanced' }, 100,
  true, 66, true, 119, true, 134, false, 0).$, 'Preview', 'laggy 1k/2k drag selects measured 512 preview');
equal(Detail.interactive_with_preview({ $: 'Balanced' }, 100,
  false, 0, true, 119, true, 134, false, 0).$, 'Economy', 'unmeasured preview does not silently promote');
const miniature = qua(pix(0x121C30), pix(0x4D6981), pix(0xE7BC72), pix(0xD3EFF0));
for (const [enlarge, factor] of [[Upscale.twice, 2], [Upscale.four, 4]] as const) {
  const expanded = enlarge({ $: 'Frame', depth: 1n, size: 2, pixels: miniature });
  equal(expanded.size, 2 * factor, `nearest frame extent ${factor}`);
  equal(expanded.depth, BigInt(1 + Math.log2(factor)), `nearest frame depth ${factor}`);
  equal(expanded.pixels, miniature, `nearest expansion reuses immutable tree ${factor}`);
  for (let y = 0; y < expanded.size; y++) for (let x = 0; x < expanded.size; x++)
    equal(sample(expanded.pixels, expanded.size, x, y),
      sample(miniature, 2, Math.floor(x / factor), Math.floor(y / factor)),
      `nearest ${factor}/${x}/${y}`);
}
console.log(JSON.stringify({ ok: true, checks, scope: 'Independent finite integer reference and tree sampling; not formal proof/native GPU performance' }));
