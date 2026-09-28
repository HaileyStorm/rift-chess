// Exact alpha support on the twelve source sprites and arbitrary masks.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Bounds from '../../graphics/v2game/SpriteBounds.bend';
import Sprites from '../../graphics/v2game/PieceSprites.bend';
import { root } from '../../tools/selected-modules.mjs';

const sha = (bytes: Uint8Array | string) => crypto.createHash('sha256').update(bytes).digest('hex');
const source = path.join(root, 'bend2/assets/source/pieces');
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8'));
assert.equal(manifest.tiers.interactive.depth, 7);
const list = (items: any[]) => items.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
const pages = manifest.tiers.interactive.pages.map((record: any, id: number) => {
  const bytes = fs.readFileSync(path.join(source, record.path));
  assert.equal(bytes.length, record.bytes);
  assert.equal(sha(bytes), record.sha256);
  const decoded = Sprites.decode_page(list([...bytes]), 7);
  assert.equal(decoded.$, 'Some');
  return { bytes, decoded: decoded.value };
});
const prepared = Sprites.prepare(...pages.map(({ decoded }: any) => decoded));

function rawBounds(bytes: Buffer, slot: number): number[] {
  let left = 64, top = 64, right = 0, bottom = 0;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const sx = (slot % 2) * 64 + x, sy = Math.floor(slot / 2) * 64 + y;
    if (!bytes[5 + 4 * (sy * 128 + sx) + 3]) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
  }
  return [left, top, right, bottom];
}
const names = ['ivory_pawn', 'ivory_knight', 'ivory_bishop', 'ivory_rook', 'ivory_queen', 'ivory_king',
  'navy_pawn', 'navy_knight', 'navy_bishop', 'navy_rook', 'navy_queen', 'navy_king'];
const began = performance.now(), boxes = [];
for (let id = 0; id < names.length; id++) {
  const actual = Bounds.bounds(prepared[names[id]]);
  const box = [actual.left, actual.top, actual.right, actual.bottom];
  assert.deepEqual(box, rawBounds(pages[Math.floor(id / 4)].bytes, id % 4), `sprite ${id}`);
  boxes.push(box);
}
const boundsMs = performance.now() - began;
const pix = color => ({ $: 'Pix', color });
const texture = (depth, size, mask) => ({ $: 'Texture', depth, size, colors: pix(0), mask });
const edges = [
  [texture(1n, 2, pix(0xff0000)), [0, 0, 2, 2]],
  [texture(1n, 2, pix(0)), [0, 0, 0, 0]],
  [texture(1n, 2, { $: 'Qua', tl: pix(0), tr: pix(0), bl: pix(0), br: pix(0xff0000) }), [1, 1, 2, 2]],
  [texture(0n, 1, { $: 'Qua', tl: pix(0), tr: pix(0), bl: pix(0), br: pix(0) }), [0, 0, 1, 1]],
] as const;
for (const [input, expected] of edges) {
  const box = Bounds.bounds(input);
  assert.deepEqual([box.left, box.top, box.right, box.bottom], expected);
}
console.log(JSON.stringify({ ok: true,
  boundsSourceSha256: sha(fs.readFileSync(path.join(root, 'bend2/graphics/v2game/SpriteBounds.bend'))),
  sprites: boxes.length, boundsMs, boxes, arbitraryMasks: edges.length }));
