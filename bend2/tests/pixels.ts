import { performance } from 'node:perf_hooks';
import Pixel from '../graphics/Pixel.bend';

type BendImage = Record<string, any>;
type BendRect = Record<string, number | string>;

const pix = (color: number): BendImage => ({ $: 'Pix', color });
const qua = (tl: BendImage, tr: BendImage, bl: BendImage, br: BendImage): BendImage =>
  ({ $: 'Qua', tl, tr, bl, br });
const rect = (left: number, top: number, right: number, bottom: number): BendRect =>
  ({ $: 'Rect', left, top, right, bottom });
const nw = { $: 'NorthWest' };
const ne = { $: 'NorthEast' };
const sw = { $: 'SouthWest' };
const se = { $: 'SouthEast' };
const list = (...values: unknown[]): unknown => values.reduceRight(
  (tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });

let checks = 0;
function equal(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  checks += 1;
}

function same(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) throw new Error(`${label}: object identity was not preserved`);
  checks += 1;
}

const tree = qua(pix(11), qua(pix(22), pix(23), pix(24), pix(25)), pix(33), pix(44));
equal(Pixel.sample_path(list(ne, nw), tree), 22, 'path NE/NW');
equal(Pixel.sample_path(list(se), tree), 44, 'path SE');
equal(Pixel.sample_path(list(), tree), 0, 'short Qua path');
equal(Pixel.sample_path(list(nw, sw), pix(7)), 7, 'uniform path');

const four = qua(pix(1), pix(2), pix(3), pix(4));
equal(Pixel.sample_xy(1n, 0, 0, four), 1, 'xy NW');
equal(Pixel.sample_xy(1n, 1, 0, four), 2, 'xy NE');
equal(Pixel.sample_xy(1n, 0, 1, four), 3, 'xy SW');
equal(Pixel.sample_xy(1n, 1, 1, four), 4, 'xy SE');

same(Pixel.fill_rect(rect(512, 0, 600, 512), 9, four), four, 'outside right reuses root');
same(Pixel.fill_rect(rect(7, 7, 7, 100), 9, four), four, 'empty width reuses root');

const filled = Pixel.fill_rect(rect(0, 0, 512, 512), 99, four);
equal(filled.$, 'Pix', 'full fill node');
equal(filled.color, 99, 'full fill color');

const one = Pixel.fill_rect(rect(0, 0, 1, 1), 88, Pixel.solid(5));
equal(Pixel.sample_xy(9n, 0, 0, one), 88, 'single pixel hit');
equal(Pixel.sample_xy(9n, 1, 0, one), 5, 'single pixel east miss');
equal(Pixel.sample_xy(9n, 0, 1, one), 5, 'single pixel south miss');
equal(Pixel.sample_xy(9n, 511, 511, one), 5, 'single pixel far miss');

const edge = Pixel.fill_rect(rect(256, 256, 512, 512), 77, Pixel.solid(6));
equal(Pixel.sample_xy(9n, 255, 255, edge), 6, 'quadrant edge NW');
equal(Pixel.sample_xy(9n, 256, 256, edge), 77, 'quadrant edge SE');

const mixed = Pixel.fill_rect(rect(256, 0, 512, 256), 66, four);
equal(Pixel.sample_xy(9n, 100, 100, mixed), 1, 'pre-split untouched NW');
equal(Pixel.sample_xy(9n, 300, 100, mixed), 66, 'pre-split filled NE');
equal(Pixel.sample_xy(9n, 300, 300, mixed), 4, 'pre-split untouched SE');

let benchmarkImage: BendImage = Pixel.solid(0);
const benchmarkStart = performance.now();
for (let index = 0; index < 100; index += 1) {
  const x = (index % 10) * 8;
  const y = Math.floor(index / 10) * 8;
  benchmarkImage = Pixel.fill_rect(rect(x, y, x + 8, y + 8), index + 1, benchmarkImage);
}
const benchmarkElapsedMs = performance.now() - benchmarkStart;
let benchmarkSamples = 0;
for (let index = 0; index < 100; index += 1) {
  const x = (index % 10) * 8 + 4;
  const y = Math.floor(index / 10) * 8 + 4;
  const expected = index + 1;
  const actual = Pixel.sample_xy(9n, x, y, benchmarkImage);
  if (actual !== expected) {
    throw new Error(`benchmark sample ${index}: expected ${expected}, got ${String(actual)}`);
  }
  benchmarkSamples += 1;
}
if (checks !== 21) throw new Error(`expected 21 boundary checks, got ${checks}`);
if (benchmarkSamples !== 100) throw new Error(`expected 100 benchmark samples, got ${benchmarkSamples}`);

console.log(JSON.stringify({
  ok: true,
  checks,
  benchmark: {
    rectangles: 100,
    samples: benchmarkSamples,
    elapsedMs: Number(benchmarkElapsedMs.toFixed(3)),
  },
}));
