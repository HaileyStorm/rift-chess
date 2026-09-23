import assert from 'node:assert/strict';
import { PixelPort, type Image } from '../platform/browser/image-port';
const pix = (color: number): Image => Object.freeze({ $: 'Pix', color });
const qua = (tl: Image, tr: Image, bl: Image, br: Image): Image => Object.freeze({ $: 'Qua', tl, tr, bl, br });
// Independent original full-frame transport oracle: no identity comparisons,
// retained state or scalar-leaf optimization.
function reference(image: Image, width: number, height: number, extent: number): Uint8Array {
  const bytes = new Uint8Array(width * height * 4);
  const paint = (node: Image, x: number, y: number, size: number): void => {
    if (x >= width || y >= height) return;
    if (node.$ === 'Pix') {
      for (let row = y; row < Math.min(height, y + size); row++) {
        for (let column = x; column < Math.min(width, x + size); column++) {
          const offset = (row * width + column) * 4;
          bytes[offset] = node.color >>> 16 & 255;
          bytes[offset + 1] = node.color >>> 8 & 255;
          bytes[offset + 2] = node.color & 255;
          bytes[offset + 3] = 255;
        }
      }
    } else {
      const half = size / 2;
      paint(node.tl, x, y, half); paint(node.tr, x + half, y, half);
      paint(node.bl, x, y + half, half); paint(node.br, x + half, y + half, half);
    }
  };
  paint(image, 0, 0, extent);
  return bytes;
}
const port = new PixelPort();
let frames = 0, comparedBytes = 0;
function check(image: Image, width: number, height: number, extent: number): ArrayBuffer {
  const output = port.render(image, width, height, extent);
  const expected = reference(image, width, height, extent);
  assert.deepEqual(new Uint8Array(output), expected);
  frames++; comparedBytes += expected.length;
  return output;
}
const a = pix(0x123456), b = pix(0xabcdef), black = pix(0), white = pix(0xffffff);
const tree = qua(qua(a, b, white, black), a, b, qua(black, white, b, a));
for (const [width, height, extent] of [[8, 8, 8], [7, 5, 8], [3, 9, 8], [8, 8, 16], [8, 8, 8], [0, 0, 8]]) {
  check(a, width, height, extent);
  check(tree, width, height, extent);
  check(tree, width, height, extent); // Identical reference.
  check(qua(tree.$ === 'Qua' ? tree.tl : tree, white, b, black), width, height, extent);
  check(pix(0x123456), width, height, extent); // Qua -> Pix and equal-color new Pix.
  check(a, width, height, extent);
}
// Output mutation and actual transfer must never affect the CPU cache.
const first = check(tree, 8, 8, 8);
new Uint8Array(first).fill(0);
const second = check(tree, 8, 8, 8);
assert.notEqual(first, second);
const transferred = structuredClone(second, { transfer: [second] });
assert.equal(second.byteLength, 0);
assert.deepEqual(new Uint8Array(transferred), reference(tree, 8, 8, 8));
check(tree, 8, 8, 8);
// A partial paint followed by an invalid node must invalidate cached identity.
check(a, 8, 8, 8);
const invalid = Object.freeze({ $: 'Qua', tl: white, tr: Object.freeze({ $: 'Invalid' }), bl: b, br: b }) as unknown as Image;
assert.throws(() => port.render(invalid, 8, 8, 8), /Invalid Bend image tree/);
check(a, 8, 8, 8);
// Dense, deterministic nonuniform trees and every pixel over a long sequence.
function dense(depth: number, seed: number): Image {
  if (!depth) return pix(Math.imul(seed, 0x9e3779b1) >>> 8);
  return qua(dense(depth - 1, seed * 4), dense(depth - 1, seed * 4 + 1), dense(depth - 1, seed * 4 + 2), dense(depth - 1, seed * 4 + 3));
}
let previous = dense(4, 1);
for (let i = 0; i < 24; i++) {
  const next = qua(previous, dense(4, i + 2), a, b);
  check(next, 31, 29, 32);
  previous = next.$ === 'Qua' ? next.tr : next;
}
console.log(JSON.stringify({ ok: true, frames, comparedBytes,
  coverage: 'Immutable shared subtrees, equal colors, Pix/Qua replacements, clipping, width/height/extent resets, output mutation, actual ArrayBuffer transfer and partial-error recovery' }));
