import assert from 'node:assert/strict';
import Color from '../Color.bend';
import Layer from '../Layer.bend';
import Shapes from '../Shapes.bend';
import Rounded from '../Rounded.bend';
import Ring from '../Ring.bend';
import Facet from '../Facet.bend';
import Quad from '../../Quad.bend';
import RaisedFacet from '../RaisedFacet.bend';
import Stamp from '../Stamp.bend';
import Upscale from '../Upscale.bend';
import Detail from '../Detail.bend';

type Image = { $: 'Pix'; color: number } | { $: 'Qua'; tl: Image; tr: Image; bl: Image; br: Image };
const pix = (color: number): Image => ({ $: 'Pix', color });
const qua = (tl: Image, tr: Image, bl: Image, br: Image): Image => ({ $: 'Qua', tl, tr, bl, br });
const coord = (n: number) => n < 0 ? { $: 'Neg', magnitude: -n } : { $: 'Pos', value: n };
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
function blend(src: number, dst: number, opacity: number): number {
  const a = Math.min(opacity, 255);
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const s = (src >>> shift) & 255, d = (dst >>> shift) & 255;
    out |= Math.floor((s*a + d*(255-a) + 127) / 255) << shift;
  }
  return out >>> 0;
}
function quarterDisk(x: number, y: number, cx: number, cy: number, radius: number) {
  let count = 0;
  for (const dy of [.25, .75]) for (const dx of [.25, .75])
    count += Number((x+dx-cx)**2 + (y+dy-cy)**2 <= radius**2);
  return count;
}
let checks = 0;
function equal(actual: unknown, expected: unknown, label: string) {
  assert.equal(actual, expected, label); checks++;
}
for (const src of [0, 0xFFFFFF, 0x6732C8, 0x102A38])
  for (const dst of [0, 0xFFFFFF, 0x005D80, 0xB1A08E])
    for (const alpha of [0, 1, 64, 127, 128, 254, 255, 256])
      equal(Color.over(src, dst, alpha), blend(src, dst, alpha), 'packed RGB blend');

const source = qua(pix(0x102030), pix(0xED7080), pix(0x3403AD), pix(0xF0C020));
const dest = qua(pix(0xFDF8E6), pix(0x04101E), pix(0xACDADA), pix(0x212941));
for (const alpha of [0, 1, 91, 128, 254, 255]) {
  const result = Layer.over(1n, source, alpha, dest) as Image;
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++)
    equal(sample(result, 2, x, y), blend(sample(source, 2, x, y),
      sample(dest, 2, x, y), alpha), 'independent child blend');
}
equal(Layer.over(1n, source, 0, dest), dest, 'transparent exact tree');
equal(Layer.over(1n, source, 255, dest), source, 'opaque exact tree');

for (const depth of [3, 5]) {
  const size = 2**depth;
  for (const [cx, cy, radius, opacity] of [[-3, 5, 9, 255],
    [size-2, size+3, 7, 107], [size/2, size/2, 5, 202], [4, 4, 0, 255]]) {
    const image = Shapes.disk(BigInt(depth), size, coord(cx), coord(cy),
      radius, 0xE8BD73, opacity, pix(0x132A47)) as Image;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
      equal(sample(image, size, x, y), blend(0xE8BD73, 0x132A47,
        Math.floor(opacity * (radius ? quarterDisk(x,y,cx,cy,radius) : 0) / 4)),
        'offscreen disk quarter coverage');
  }
  const ring = Ring.draw(BigInt(depth), size, coord(-2), coord(4),
    2, 6, 0x77DBE6, 117, pix(0x102B48)) as Image;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++)
    equal(sample(ring, size, x, y), blend(0x77DBE6, 0x102B48,
      Math.floor(117 * (quarterDisk(x,y,-2,4,6)-quarterDisk(x,y,-2,4,2))/4)),
      'clipped annulus quarter coverage');
  const roundedBase = pix(0x132A47);
  equal(Rounded.draw(BigInt(depth), size, coord(10), coord(2),
    coord(2), coord(8), 2, 0xAA55FF, 255, roundedBase), roundedBase,
    'reversed rounded bounds exact tree');
}

const qpoint = (x: number, y: number) => ({ $: 'Point', x, y });
const thin = Quad.make(qpoint(.5,10.2), qpoint(.8,10.2),
  qpoint(.8,20.2), qpoint(.5,20.2));
const thinImage = Facet.draw(5n, 32, thin, 0xC6B8E4, 213, pix(0x142A42)) as Image;
equal(sample(thinImage, 32, 0, 12), blend(0xC6B8E4, 0x142A42,
  Math.floor(213*2/4)), 'thin fractional face must not be culled');
equal(sample(thinImage, 32, 1, 12), 0x142A42, 'adjacent face exterior');
const arbitrary = [qpoint(60,20),qpoint(80,40),qpoint(60,60),qpoint(40,40)];
const style = { $: 'Surface', top: 0xC6DCE2, side: 0x394D60,
  edge: 0xFFF4D6, shadow: 0x0B1826, glint: 0x92E6E8 };
equal(RaisedFacet.draw_cell(false, 7n, 128, ...arbitrary, -3, 7,
  style, dest), dest, 'arbitrary-corner absent face exact identity');
const raised = RaisedFacet.draw_cell(true, 7n, 128, ...arbitrary,
  -3, 7, style, pix(0x2D1741)) as Image;
equal(sample(raised, 128, 60, 40), style.top, 'arbitrary-corner top interior');

const sprite = qua(pix(0), pix(0xE7BB72), pix(0x75D5D8), pix(0));
const base = pix(0x19334B);
for (const [left, top] of [[-2,1],[0,0],[5,6],[9,-2]]) {
  const stamped = Stamp.draw(3n,8,2n,4,coord(left),coord(top),sprite,0,base) as Image;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const sx = x-left, sy = y-top;
    const ink = sx>=0 && sx<4 && sy>=0 && sy<4 ? sample(sprite,4,sx,sy) : 0;
    equal(sample(stamped,8,x,y),ink || base.color,'signed transparent stamp');
  }
}
const expanded = Upscale.twice({ $: 'Frame', depth: 1n, size: 2, pixels: source });
equal(expanded.pixels, source, 'nearest enlargement reuses exact Image');
for (let y=0;y<4;y++) for (let x=0;x<4;x++)
  equal(sample(expanded.pixels,4,x,y), sample(source,2,x>>1,y>>1),
    'nearest frame sampling');
equal(Detail.interactive_with_preview({ $: 'Balanced' },100,
  true,66,true,119,true,134,false,0).$, 'Preview', 'measured preview chosen');
console.log(JSON.stringify({ ok:true, checks,
  scope:'Independent finite core graphics reference; native/GPU/browser evidence separate' }));
