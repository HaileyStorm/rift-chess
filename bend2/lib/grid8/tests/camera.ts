import Dome from '../examples/Dome.bend';
import Fast from '../SpatialFast.bend';
import Upscale from '../../graphics/v2/Upscale.bend';

const size = Number(process.argv[2] ?? 1024);
const previewOutput = process.argv[3] === 'preview';
if (![512, 1024, 2048, 4096].includes(size)) throw new Error('Bad tier');
if (previewOutput && size !== 512) throw new Error('Preview upsample starts at 512');
const depth = BigInt(Math.log2(size)), k = size / 1024;
const outputScale = previewOutput ? 2 : 1, outputSize = size * outputScale;
const startBase = performance.now();
const base = Dome.fast_base(depth, size);
const baseMs = performance.now() - startBase;
const overlay = size === 512 && !previewOutput ? null :
  Dome.fast_hud(BigInt(Math.log2(outputSize)), outputSize);
const hudBuildMs = performance.now() - startBase - baseMs;
const boardTimes: number[] = [], tokenTimes: number[] = [], overlayTimes: number[] = [],
  copy: number[] = [], total: number[] = [];
const rgba = Buffer.allocUnsafe(outputSize * outputSize * 4);
type Image = { $: 'Pix'; color: number } | { $: 'Qua'; tl: Image; tr: Image; bl: Image; br: Image };
const dirty = { left: 180*k*outputScale, top: 210*k*outputScale,
  right: 880*k*outputScale, bottom: 800*k*outputScale };
function copyDirty(image: Image, x: number, y: number, span: number): void {
  if (x >= dirty.right || x + span <= dirty.left || y >= dirty.bottom || y + span <= dirty.top) return;
  if (image.$ === 'Qua') {
    const half = span / 2;
    copyDirty(image.tl, x, y, half); copyDirty(image.tr, x + half, y, half);
    copyDirty(image.bl, x, y + half, half); copyDirty(image.br, x + half, y + half, half);
    return;
  }
  const color = image.color;
  const left = Math.max(x, dirty.left), right = Math.min(x + span, dirty.right);
  const top = Math.max(y, dirty.top), bottom = Math.min(y + span, dirty.bottom);
  for (let row = top; row < bottom; row++) {
    let offset = (row * outputSize + left) * 4;
    for (let col = left; col < right; col++, offset += 4) {
      rgba[offset] = (color >>> 16) & 255;
      rgba[offset + 1] = (color >>> 8) & 255;
      rgba[offset + 2] = color & 255;
      rgba[offset + 3] = 255;
    }
  }
}
let last: any;
for (let n = 0; n < 50; n++) {
  const drift = (n % 9) - 4;
  const a = { $: 'Affine', origin_x: (220 + drift * 2) * k, origin_y: (330 + drift) * k,
    file_x: (64 + drift * .9) * k, file_y: (-12 + drift * .5) * k,
    rank_x: (12 - drift * .7) * k, rank_y: (50 + drift * .8) * k };
  const t = performance.now();
  const board = Fast.draw(depth, size, a, Dome.mask(), Dome.palette(), base);
  const midBoard = performance.now();
  last = Dome.fast_tokens(depth, size, a, board);
  const mid = performance.now();
  const display = previewOutput ? Upscale.twice({ $: 'Frame', depth, size, pixels: last }) :
    { $: 'Frame', depth, size, pixels: last };
  const composed = overlay ? Dome.overlay(BigInt(Math.log2(outputSize)), outputSize,
    overlay, display.pixels) : display.pixels;
  const beforeCopy = performance.now();
  copyDirty(composed as Image, 0, 0, display.size);
  const end = performance.now();
  boardTimes.push(midBoard - t); tokenTimes.push(mid - midBoard);
  overlayTimes.push(beforeCopy - mid); copy.push(end - beforeCopy); total.push(end - t);
}
for (const values of [boardTimes, tokenTimes, overlayTimes, copy, total]) values.sort((a, b) => a - b);
const metrics = (values: number[]) => ({ median: +values[25].toFixed(2),
  p90: +values[45].toFixed(2), p95: +values[47].toFixed(2), max: +values[49].toFixed(2) });
console.log(JSON.stringify({ size, outputSize, previewOutput, hudComposed: overlay !== null,
  baseMs: +baseMs.toFixed(2),
  hudBuildMs: +hudBuildMs.toFixed(2), frames: total.length,
  boardMs: metrics(boardTimes), tokensMs: metrics(tokenTimes),
  overlayMs: metrics(overlayTimes), dirtyCopyMs: metrics(copy), totalMs: metrics(total),
  dirtyPixels: (dirty.right - dirty.left) * (dirty.bottom - dirty.top),
  root: last.$, scope: 'Retained world + 64 top cells + 13 preview tokens + optional Bend keyed HUD overlay + serial dirty RGBA copy; no Chrome transport/rules' }));
