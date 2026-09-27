// Narrow diagnostic shared by pinned and candidate JS loaders. No source edit
// or law change is inferred from this finite pixel comparison.
import Ring from '../../lib/graphics/v2/Ring.bend';

type Image = { $: 'Pix'; color: number } | { $: 'Qua'; tl: Image; tr: Image; bl: Image; br: Image };
const tagPrefix = process.env.BEND_DIAGNOSTIC_COORD_PREFIX || '';
const coord = (n: number) => n < 0
  ? { $: `${tagPrefix}Neg`, magnitude: -n }
  : { $: `${tagPrefix}Pos`, value: n };
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
function quarterDisk(x: number, y: number, radius: number): number {
  let count = 0;
  for (const dy of [.25, .75]) for (const dx of [.25, .75])
    count += Number((x+dx+2)**2 + (y+dy-4)**2 <= radius**2);
  return count;
}
function blend(alpha: number): number {
  let result = 0;
  for (const shift of [16, 8, 0]) {
    const src = (0x77DBE6 >>> shift) & 255, dst = (0x102B48 >>> shift) & 255;
    result |= Math.floor((src*alpha + dst*(255-alpha) + 127) / 255) << shift;
  }
  return result >>> 0;
}
for (const depth of [3, 5]) {
  const size = 2**depth;
  const image = Ring.draw(BigInt(depth), size, coord(-2), coord(4),
    2, 6, 0x77DBE6, 117, { $: 'Pix', color: 0x102B48 }) as Image;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const actual = sample(image, size, x, y);
    const expected = blend(Math.floor(117 * (quarterDisk(x,y,6)-quarterDisk(x,y,2))/4));
    if (actual !== expected) {
      console.log(JSON.stringify({ ok: false, tagPrefix, depth, x, y, actual, expected,
        quarters: [quarterDisk(x,y,6), quarterDisk(x,y,2)] }));
      process.exitCode = 1;
      break;
    }
  }
  if (process.exitCode) break;
}
if (!process.exitCode) console.log(JSON.stringify({ ok: true, tagPrefix, cases: 1088 }));
