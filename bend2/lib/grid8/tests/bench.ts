import Astral from '../examples/Showcase.bend';
import Stone from '../examples/StoneCourt.bend';
import Dome from '../examples/Dome.bend';

const size = Number(process.argv[2] ?? 1024);
const theme = process.argv[3] ?? 'astral';
if (![1024, 2048, 4096].includes(size) || !['astral', 'stone', 'dome'].includes(theme))
  throw new Error('Use a supported size and astral/stone/dome');
const depth = BigInt(Math.log2(size));
const build = theme === 'stone' ? Stone.screen : theme === 'dome' ? Dome.screen : Astral.screen;
const durations: number[] = [];
let root: unknown;
for (let i = 0; i < 7; i++) {
  const start = performance.now();
  root = build(depth, size);
  durations.push(performance.now() - start);
}
const warm = durations.slice(2).sort((a, b) => a - b);
console.log(JSON.stringify({ theme, size, coldMs: +durations[0].toFixed(2),
  secondMs: +durations[1].toFixed(2), warmMedianMs: +warm[2].toFixed(2),
  warmP80Ms: +warm[4].toFixed(2), warmSamples: warm.length,
  root: (root as any).$, scope: 'Pure Bend Image construction in Bun, no blit/browser' }));
