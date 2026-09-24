import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import Dome from '../examples/Dome.bend';
import Fast from '../SpatialFast.bend';
import Upscale from '../../graphics/v2/Upscale.bend';

// Visual regression for a shared free-camera affine. The base is deliberately
// free of the board-specific fixed plinth; only the observatory and deep well
// stay cached while the projected board and markers rotate around its center.
const size = Number(process.argv[2] ?? 1024);
const previewOutput = process.argv[3] === 'preview';
if (![512, 1024, 2048].includes(size)) throw new Error('Use a 512/1024/2048 tier');
if (previewOutput && size !== 512) throw new Error('Preview enlargement starts at 512');
const depth = BigInt(Math.log2(size)), k = size / 1024;
const outputSize = previewOutput ? 1024 : size;
const root = path.resolve('.artifacts/bend2/graphics-v2');
const base = Dome.fast_base(depth, size);
const foreground = Dome.fast_hud(BigInt(Math.log2(outputSize)), outputSize);
const mask = Dome.mask();
const palette = Dome.palette();
type Image = { $: 'Pix'; color: number } | { $: 'Qua'; tl: Image; tr: Image; bl: Image; br: Image };
function sample(image: Image, x: number, y: number, span = size): number {
  while (image.$ === 'Qua') {
    span /= 2;
    const right = x >= span, down = y >= span;
    image = down ? right ? image.br : image.bl : right ? image.tr : image.tl;
    if (right) x -= span;
    if (down) y -= span;
  }
  return image.color;
}
function copy(image: Image, rgba: Buffer, x: number, y: number, span: number): void {
  if (image.$ === 'Qua') {
    const half = span / 2;
    copy(image.tl, rgba, x, y, half); copy(image.tr, rgba, x + half, y, half);
    copy(image.bl, rgba, x, y + half, half); copy(image.br, rgba, x + half, y + half, half);
    return;
  }
  const color = image.color;
  for (let row = y; row < y + span; row++) {
    let offset = (row * outputSize + x) * 4;
    for (let col = 0; col < span; col++, offset += 4) {
      rgba[offset] = (color >>> 16) & 255;
      rgba[offset + 1] = (color >>> 8) & 255;
      rgba[offset + 2] = color & 255;
      rgba[offset + 3] = 255;
    }
  }
}
const table = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xEDB88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes: Buffer): number {
  let value = 0xFFFFFFFF;
  for (const byte of bytes) value = table[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xFFFFFFFF) >>> 0;
}
function chunk(name: string, bytes: Buffer): Buffer {
  const kind = Buffer.from(name), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  crc.writeUInt32BE(crc32(Buffer.concat([kind, bytes])));
  return Buffer.concat([length, kind, bytes, crc]);
}
function png(rgba: Buffer): Buffer {
  const raw = Buffer.allocUnsafe((outputSize * 4 + 1) * outputSize);
  for (let y = 0; y < outputSize; y++) {
    const start = y * (outputSize * 4 + 1);
    raw[start] = 0;
    rgba.copy(raw, start + 1, y * outputSize * 4, (y + 1) * outputSize * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(outputSize, 0); ihdr.writeUInt32BE(outputSize, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from('89504E470D0A1A0A', 'hex'),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0))]);
}
const angles: { name: string; file_x: number; file_y: number;
  rank_x: number; rank_y: number; move_y?: number }[] = [
  { name: 'tilted', file_x: 64, file_y: -12, rank_x: 12, rank_y: 50 },
  { name: 'left', file_x: 45, file_y: -43, rank_x: 45, rank_y: 43 },
  { name: 'overhead', file_x: 64, file_y: 0, rank_x: 0, rank_y: 64 },
  { name: 'right', file_x: 60, file_y: 20, rank_x: -20, rank_y: 60 },
  { name: 'translated-up', file_x: 45, file_y: -43, rank_x: 45, rank_y: 43, move_y: -125 },
  { name: 'translated-down', file_x: 45, file_y: -43, rank_x: 45, rank_y: 43, move_y: 135 },
];
const output: { angle: string; path: string; boardMs: number; piecesMs: number; copyMs: number; voidsChecked: number }[] = [];
const overlapCounts = { header: 0, leftCard: 0, rightCard: 0, footer: 0 };
const regions = {
  header: [180, 25, 810, 155], leftCard: [25, 286, 189, 528],
  rightCard: [847, 286, 999, 528], footer: [34, 824, 990, 945],
} as const;
fs.mkdirSync(root, { recursive: true });
for (const v of angles) {
  const affine = { $: 'Affine', origin_x: (521 - 4 * (v.file_x + v.rank_x)) * k,
    origin_y: (483 + (v.move_y ?? 0) - 4 * (v.file_y + v.rank_y)) * k,
    file_x: v.file_x * k, file_y: v.file_y * k,
    rank_x: v.rank_x * k, rank_y: v.rank_y * k };
  const t0 = performance.now();
  const board = Fast.draw(depth, size, affine, mask, palette, base) as Image;
  const t1 = performance.now();
  let voidsChecked = 0;
  for (let id = 0; id < 64; id++) {
    const present = ((id < 32 ? mask.low : mask.high) >>> (id % 32)) & 1;
    if (present) continue;
    const file = id % 8 + .5, rank = Math.floor(id / 8) + .5;
    const x = Math.floor(affine.origin_x + file * affine.file_x + rank * affine.rank_x);
    const y = Math.floor(affine.origin_y + file * affine.file_y + rank * affine.rank_y);
    if (x >= 0 && x < size && y >= 0 && y < size) {
      assert.equal(sample(board, x, y), sample(base as Image, x, y), `void ${v.name}/${id}`);
      voidsChecked++;
    }
  }
  const image = Dome.fast_tokens(depth, size, affine, board) as Image;
  const t2 = performance.now();
  const frame = previewOutput ? Upscale.twice({ $: 'Frame', depth, size, pixels: image }) :
    { $: 'Frame', depth, size, pixels: image };
  const composited = Dome.overlay(BigInt(Math.log2(outputSize)), outputSize,
    foreground, frame.pixels) as Image;
  const rgba = Buffer.allocUnsafe(frame.size * frame.size * 4);
  copy(composited, rgba, 0, 0, frame.size);
  const t3 = performance.now();
  const file = .5, rank = .5;
  const tokenX = Math.floor(affine.origin_x + file * affine.file_x + rank * affine.rank_x);
  const tokenY = Math.floor(affine.origin_y + file * affine.file_y + rank * affine.rank_y);
  assert.equal(sample(image, tokenX, tokenY), 14263654, `first piece centered ${v.name}`);
  for (const [region, [left, top, right, bottom]] of Object.entries(regions)) {
    for (let y = Math.floor(top * outputSize / 1024); y < Math.ceil(bottom * outputSize / 1024); y += 3)
      for (let x = Math.floor(left * outputSize / 1024); x < Math.ceil(right * outputSize / 1024); x += 3) {
        const ui = sample(foreground as Image, x, y, outputSize);
        const moved = sample(frame.pixels as Image, x, y, outputSize);
        const stationary = sample(base as Image, x, y, outputSize);
        if (ui !== 0 && moved !== stationary) {
          assert.equal(sample(composited, x, y, outputSize), ui,
            `retained HUD wins ${v.name}/${region}/${x}/${y}`);
          overlapCounts[region as keyof typeof overlapCounts]++;
        }
      }
  }
  if (v.move_y !== undefined) {
    for (const [top, bottom, label] of [[0, 156, 'header'], [824, 1024, 'footer']] as const)
      for (let y = Math.floor(top * outputSize / 1024); y < Math.ceil(bottom * outputSize / 1024); y += 4)
        for (let x = 0; x < outputSize; x += 4) {
          const ui = sample(foreground as Image, x, y, outputSize);
          assert.notEqual(ui, 0, `opaque ${label} plane ${v.name}/${x}/${y}`);
          assert.equal(sample(composited, x, y, outputSize), ui,
            `entire ${label} remains legible ${v.name}/${x}/${y}`);
        }
  }
  const fileName = path.join(root, `camera-${v.name}-${size}${previewOutput ? '-up1024' : ''}.png`);
  fs.writeFileSync(fileName, png(rgba));
  output.push({ angle: v.name, path: fileName, boardMs: +(t1-t0).toFixed(2),
    piecesMs: +(t2-t1).toFixed(2), copyMs: +(t3-t2).toFixed(2), voidsChecked });
}
for (const [region, count] of Object.entries(overlapCounts))
  assert.ok(count > 0, `camera sequence exercises board under ${region}`);
console.log(JSON.stringify({ ok: true, size, outputSize, previewOutput, overlapCounts, output,
  scope: 'Bend SpatialFast camera examples with generic serial PNG transport; no browser input-to-paint claim' }));
