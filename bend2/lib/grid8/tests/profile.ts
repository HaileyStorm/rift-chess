import Scene from '../examples/Showcase.bend';
import StoneCourt from '../examples/StoneCourt.bend';
import Dome from '../examples/Dome.bend';

const size = Number(process.argv[2] ?? 1024), depth = BigInt(Math.log2(size));
const theme = process.argv[3] ?? 'astral';
if (![1024, 2048, 4096].includes(size)) throw new Error('Bad tier');
if (!['astral', 'stone', 'dome'].includes(theme)) throw new Error('Bad scene');
if (theme === 'dome') {
  const t = performance.now();
  let image = Dome.sky(depth, size);
  const measures: Record<string, number> = { sky: performance.now() - t };
  for (const name of ['architecture', 'board', 'pieces', 'telescope', 'hud'] as const) {
    const start = performance.now();
    image = Dome[name](depth, size, image);
    measures[name] = performance.now() - start;
  }
  console.log(JSON.stringify({ theme, size, totalMs: performance.now() - t, measures }));
  process.exit(0);
}
const scene = theme === 'stone' ? StoneCourt : Scene;
const t = performance.now();
let image = theme === 'stone' ? StoneCourt.ambient(depth, size) : Scene.background(depth, size);
const measures: Record<string, number> = { background: performance.now() - t };
if (theme === 'stone') {
  const start = performance.now();
  image = StoneCourt.colonnade(depth, size, image);
  measures.colonnade = performance.now() - start;
} else {
  const start = performance.now();
  image = Scene.observatory(depth, size, image);
  measures.observatory = performance.now() - start;
}
for (const name of ['heading', 'left_rail', 'right_rail', 'board', 'footer'] as const) {
  const start = performance.now();
  image = scene[name](depth, size, image);
  measures[name] = performance.now() - start;
}
console.log(JSON.stringify({ theme, size, totalMs: performance.now() - t, measures }));
