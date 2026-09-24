import Scene from '../examples/Showcase.bend';
import StoneCourt from '../examples/StoneCourt.bend';
import Dome from '../examples/Dome.bend';
import Ring from '../../graphics/v2/Ring.bend';

const size = Number(process.argv[2] ?? 1024), depth = BigInt(Math.log2(size));
const theme = process.argv[3] ?? 'astral';
if (![1024, 2048, 4096].includes(size)) throw new Error('Bad tier');
if (!['astral', 'stone', 'dome'].includes(theme)) throw new Error('Bad scene');
const scale = size / 1024;
const base = (theme === 'stone' ? StoneCourt.screen : theme === 'dome' ? Dome.screen : Scene.screen)(depth, size);
const samples: number[] = [];
let last: unknown = base;
for (let n = 0; n < 40; n++) {
  const file = n % 8, rank = (n / 8 | 0) % 8;
  const x = (theme === 'dome' ? 258 + 64 * file + 12 * rank : 288 + 64 * file) * scale;
  const y = (theme === 'dome' ? 349 + 50 * rank - 12 * file : 288 + 64 * rank) * scale;
  const t = performance.now();
  const hover = Ring.draw(depth, size, { $: 'Pos', value: x },
    { $: 'Pos', value: y }, 25 * scale, 28 * scale, 0x63DEE6, 190, base);
  const selection = Ring.draw(depth, size,
    { $: 'Pos', value: x }, { $: 'Pos', value: y },
    31 * scale, 34 * scale, 0xF4D3A7, 195, hover);
  samples.push(performance.now() - t);
  last = selection;
}
samples.sort((a, b) => a - b);
console.log(JSON.stringify({ theme, size, samples: samples.length, medianMs: +samples[20].toFixed(3),
  p95Ms: +samples[38].toFixed(3), maxMs: +samples[39].toFixed(3),
  finalRoot: (last as any).$, scope: 'Pure cached-base two-ring hover+selection delta; no browser transfer or state transition' }));
