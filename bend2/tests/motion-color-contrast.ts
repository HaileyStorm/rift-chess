// Finite color sentinel for the compact orbit glyphs. This checks only the
// direct Bend shape over representative court/rift colors, not human legibility.
import assert from 'node:assert/strict';
import PieceArt from '../graphics/v2game/PieceArt.bend';
import { pix, sample, type Image } from '../lib/graphics/v2/tests/review/helpers.ts';

const depth = 8n, size = 256, x = 128, floor = 166;
const navy = 0x0b1720, brass = 0xc39d67, white = 0xece0c5;
const backgrounds = [
  ['dark-rift', 0x091724],
  ['cool-dark-tile', 0x31596e],
  ['warm-dark-tile', 0x485b4e],
  ['light-tile', 0xa8b8aa],
] as const;

function colors(image: Image): Map<number, number> {
  const found = new Map<number, number>();
  for (let y = floor - 38; y <= floor + 5; y++)
    for (let xx = x - 20; xx <= x + 20; xx++) {
      const color = sample(image, size, xx, y);
      found.set(color, (found.get(color) ?? 0) + 1);
    }
  return found;
}

const results = [];
for (const [name, background] of backgrounds) for (let kind = 1; kind <= 6; kind++) {
  const black = colors(PieceArt.camera_draw_min(depth, size, x, floor,
    kind + 8, pix(background)));
  assert.ok((black.get(navy) ?? 0) > 0, `${name}: Black kind ${kind} lost its dark contour`);
  assert.ok((black.get(brass) ?? 0) > 0, `${name}: Black kind ${kind} lost its brass edge`);
  const light = colors(PieceArt.camera_draw_min(depth, size, x, floor,
    kind, pix(background)));
  assert.ok((light.get(white) ?? 0) > 0, `${name}: White kind ${kind} lost its original body`);
  assert.equal(light.get(brass) ?? 0, 0,
    `${name}: White kind ${kind} acquired the Black-only brass edge`);
  results.push({ background: name, kind, navy: black.get(navy), brass: black.get(brass),
    white: light.get(white) });
}
console.log(JSON.stringify({ ok: true, cases: results.length,
  minBrassPixels: Math.min(...results.map(row => row.brass ?? 0)),
  scope: 'Finite direct Bend orbit-glyph colors over representative backgrounds; no browser, visual or native acceptance' }));
