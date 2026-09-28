// Full-pixel differential for the original generic draw and the game-only
// mask-derived axis-aligned path. Generated JS still uses pinned Bend code.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Sprites from '../../graphics/v2game/PieceSprites.bend';
import { root } from '../../tools/selected-modules.mjs';

const list = (items: any[]) => items.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
const pix = (color: number) => ({ $: 'Pix', color });
const qua = (tl: any, tr: any, bl: any, br: any) => ({ $: 'Qua', tl, tr, bl, br });
const hash = (bytes: Buffer) => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'bend2/assets/source/pieces/manifest.json'), 'utf8'));
const pages = manifest.tiers.interactive.pages.map((record: any) => {
  const bytes = fs.readFileSync(path.join(root, 'bend2/assets/source/pieces', record.path));
  assert.equal(bytes.length, record.bytes);
  assert.equal(hash(bytes), record.sha256);
  const result = Sprites.decode_page(list([...bytes]), 7);
  assert.equal(result.$, 'Some');
  return result.value;
});
const actual = Sprites.prepare(...pages);
const page = (mask: any) => ({ $: 'Page', depth: 2n, size: 4, colors: pix(0xbda071), mask });
const opaque = Sprites.prepare(page(pix(0xff0000)), page(pix(0xff0000)), page(pix(0xff0000)));
const clear = Sprites.prepare(page(pix(0)), page(pix(0)), page(pix(0)));
const corner = Sprites.prepare(page(qua(pix(0), pix(0), pix(0), pix(0xff0000))),
  page(qua(pix(0xff0000), pix(0), pix(0), pix(0))), page(pix(0)));
// An inconsistent public Texture is still accepted by the generic renderer;
// the bounded path must fall back rather than infer unsafe bounds from size.
const deepCorner = qua(qua(qua(pix(0xff0000), pix(0), pix(0), pix(0)),
  pix(0), pix(0), pix(0)), pix(0), pix(0), pix(0));
const mismatch = { ...opaque, ivory_pawn: { $: 'Texture', depth: 3n,
  size: 2, colors: pix(0xffffff), mask: deepCorner } };
const variedBackground = qua(pix(0x17375a), pix(0x8a391d),
  pix(0x5c642d), pix(0x376f79));
const sides = [{ $: 'Ivory' }, { $: 'Navy' }];
const kinds = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King'].map($ => ({ $ }));

function pixels(image: any, size: number): Buffer {
  const out = new Uint32Array(size * size);
  function visit(node: any, x: number, y: number, span: number): void {
    if (node.$ === 'Pix') {
      for (let row = y; row < y + span; row++) out.fill(node.color, row * size + x, row * size + x + span);
      return;
    }
    assert.equal(node.$, 'Qua');
    const half = span / 2;
    visit(node.tl, x, y, half); visit(node.tr, x + half, y, half);
    visit(node.bl, x, y + half, half); visit(node.br, x + half, y + half, half);
  }
  visit(image, 0, 0, size);
  return Buffer.from(out.buffer);
}
const matrix = (a: number, d: number, tx: number, ty: number, b = 0, c = 0) =>
  ({ $: 'Matrix', a, b, c, d, tx, ty });
const screen = (size: number) => ({ $: 'Box', left: 0, top: 0, right: size, bottom: size });

let checks = 0, oldMs = 0, boundedMs = 0;
function pair(label: string, pieces: any, side: any, kind: any, m: any, opacity: number,
  size = 128, background: any = pix(0x304050),
  clip: any = screen(size)): void {
  const t0 = performance.now();
  const before = Sprites.draw(BigInt(Math.log2(size)), size, pieces, side, kind, m, opacity,
    clip, background);
  const t1 = performance.now();
  const after = Sprites.draw_axis_aligned(BigInt(Math.log2(size)), size, pieces, side, kind, m,
    opacity, clip, background);
  const t2 = performance.now();
  const a = pixels(before, size), b = pixels(after, size);
  assert.deepEqual(b, a, `${label}: mask-derived clip changed output`);
  oldMs += t1 - t0; boundedMs += t2 - t1; checks++;
}

for (let id = 0; id < 12; id++) {
  const side = sides[Math.floor(id / 6)], kind = kinds[id % 6];
  pair(`real-${id}`, actual, side, kind, matrix(55.3, 50.7, 34.27, 44.61), 255);
  pair(`real-subpixel-${id}`, actual, side, kind, matrix(42.6, 39.2, 65.91, 71.37), 129);
}
for (const [name, pieces] of [['opaque', opaque], ['clear', clear], ['corner', corner]] as const) {
  pair(`${name}-positive`, pieces, sides[0], kinds[0], matrix(58.5, 51.25, 22.33, 41.77), 255);
  pair(`${name}-edge`, pieces, sides[1], kinds[4], matrix(17.2, 33.7, -8.4, 105.1), 147);
  pair(`${name}-rotated-fallback`, pieces, sides[0], kinds[2], matrix(42.1, 39.9, 37.6, 50.2, 8.3, -6.1), 255);
  pair(`${name}-negative-fallback`, pieces, sides[1], kinds[5], matrix(-30.5, 41.2, 80.7, 35.3), 255);
}
for (let id = 0; id < 12; id++) {
  const side = sides[Math.floor(id / 6)], kind = kinds[id % 6];
  pair(`real-varied-background-${id}`, actual, side, kind,
    matrix(44.3, 34.7, -13.81, 103.17), 189, 128, variedBackground);
  pair(`real-downscale-${id}`, actual, side, kind,
    matrix(13.4, 9.9, 54.3, 46.1), 241, 64, variedBackground);
}
pair('corner-subpixel-border', corner, sides[0], kinds[0],
  matrix(19.7, 23.1, 105.9, -5.3), 217, 128, variedBackground);
pair('corner-small-clip', corner, sides[1], kinds[0],
  matrix(84.3, 70.1, 21.8, 30.7), 255, 128, variedBackground,
  { $: 'Box', left: 63, top: 58, right: 90, bottom: 75 });
pair('empty-clip', actual, sides[0], kinds[0],
  matrix(40.3, 42.9, 30.1, 27.9), 255, 128, variedBackground,
  { $: 'Box', left: 70, top: 60, right: 70, bottom: 75 });
pair('zero-opacity', actual, sides[0], kinds[0],
  matrix(40.3, 42.9, 30.1, 27.9), 0, 128, variedBackground);
pair('singular-fallback', actual, sides[0], kinds[0],
  matrix(0, 42.9, 30.1, 27.9), 255, 128, variedBackground);
pair('mismatched-metadata-fallback', mismatch, sides[0], kinds[0],
  matrix(30.3, 39.9, 20.1, 27.9), 255, 128, variedBackground);
console.log(JSON.stringify({ ok: true, checks, originalMs: oldMs, boundedMs,
  scope: 'Full-pixel 64/128px differential on source-bound real and arbitrary synthetic masks; local Bun timing is diagnostic only' }));
