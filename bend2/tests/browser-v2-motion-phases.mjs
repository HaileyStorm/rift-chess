// Diagnostic only: time the generated Bend motion stages without editing its
// source or mistaking scene construction for PixelPort traversal.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import scene from '../../.artifacts/bend2/v2-preview/selected-js/scene.js';
import control from '../../.artifacts/bend2/v2-preview/selected-js/controller.js';
import { assertCache } from '../tools/selected-modules.mjs';
import { PixelPort } from '../platform/browser/image-port.ts';

for (const name of ['scene', 'controller']) assertCache(name);
const path = '.artifacts/bend2/v2-preview/selected-js/scene.js';
const source = fs.readFileSync(path, 'utf8');
const pattern = /function \$fast_camera256_for_512\$\(_frame_0, _underlay128_0\) \{[\s\S]*?\n\}/g;
const matches = [...source.matchAll(pattern)];
assert.equal(matches.length, 1, 'Unexpected generated motion function');
let functionSource = matches[0][0];
const stages = [
  ['ground', 'const _small_ground_0 = run_loop($fast_ground$(7n, 128, _underlay128_0, _frame_0));'],
  ['expand', 'const _ground_0 = run_loop($nearest2$(7n, _small_ground_0));'],
  ['context', 'const _context_0 = run_loop($context_for$(8n, 256, _frame_0));'],
  ['camera', 'const _camera_0 = run_loop($$$$Camera$basis$(run_loop($$$$Scene$frame_view$(_frame_0))));'],
  ['pieces', 'const _pieces_0 = run_loop($camera_piece_layers$(run_loop($$$$Camera$depth_order$(_camera_0)), _context_0, _ground_0));'],
];
functionSource = functionSource.replace('{\n', '{\n  const __row = {}; let __at = performance.now();\n');
for (const [name, line] of stages) {
  assert.equal(functionSource.split(line).length, 2, `Generated ${name} stage changed`);
  functionSource = functionSource.replace(line, () =>
    `${line}\n  __row.${name} = performance.now() - __at; __at = performance.now();`);
}
const tail = 'return run_jump($fast_camera_feedback$, [_context_0, _pieces_0]);';
assert.equal(functionSource.split(tail).length, 2, 'Generated feedback stage changed');
functionSource = functionSource.replace(tail, () =>
  `const __out = run_loop($fast_camera_feedback$(_context_0, _pieces_0));
  __row.feedback = performance.now() - __at;
  globalThis.__orbitPhaseRows.push(__row);
  return __out;`);
globalThis.__orbitPhaseRows = [];
const modified = source.replace(matches[0][0], () => functionSource);
let instrumented;
try {
  instrumented = (await import(`data:text/javascript;base64,${Buffer.from(modified).toString('base64')}`)).default;
} catch (error) {
  throw new Error(`Instrumented scene failed to load: ${error.message}`);
}

const nil = { $: 'Nil' };
const raw = fs.readFileSync('bend2/assets/runtime/observatory-astral.rga');
let bytes = nil;
for (let i = raw.length - 1; i >= 0; i--) bytes = { $: 'Con', head: raw[i], tail: bytes };
const plates = scene.load_plates({ $: 'Con', head: { $: 'AssetResponse',
  id: { $: 'Astral' }, bytes, ok: true }, tail: nil });
const underlay = scene.underlay128_asset(0, plates);
const packet = control.boot_reads('', '', true, true, 1024, 640);
const views = [
  { $: 'View', yaw: 345, pitch: 67, zoom: 115 },
  { $: 'View', yaw: 0, pitch: 65, zoom: 115 },
  { $: 'View', yaw: 75, pitch: 55, zoom: 100 },
  { $: 'View', yaw: 180, pitch: 65, zoom: 115 },
];
const pixelSha256 = [];
function renderMeasured(frame) {
  try { return instrumented.fast_camera256_for_512(frame, underlay); }
  catch (error) { throw new Error(`Instrumented scene failed: ${error.message}`); }
}
for (const view of views) {
  const frame = { ...packet.snapshot.frame, view };
  const original = new PixelPort().render(scene.fast_camera256_for_512(frame, underlay), 256, 256, 256);
  const measured = new PixelPort().render(renderMeasured(frame), 256, 256, 256);
  assert.deepEqual(Buffer.from(measured), Buffer.from(original), `Instrumented motion changed pixels at yaw ${view.yaw}`);
  pixelSha256.push({ yaw: view.yaw, pitch: view.pitch,
    sha256: crypto.createHash('sha256').update(Buffer.from(measured)).digest('hex') });
}
globalThis.__orbitPhaseRows.length = 0;
for (let round = 0; round < 9; round++) for (const view of views) {
  renderMeasured({ ...packet.snapshot.frame, view });
}
const rows = globalThis.__orbitPhaseRows.slice(8);
const stats = name => {
  const sorted = rows.map(row => row[name]).sort((a, b) => a - b);
  return { medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(2),
    p90Ms: +sorted[Math.ceil(sorted.length * 0.9) - 1].toFixed(2) };
};
console.log(JSON.stringify({ ok: true, samples: rows.length, exactViews: views.length, pixelSha256,
  stages: Object.fromEntries([...stages.map(([name]) => name), 'feedback'].map(name => [name, stats(name)])),
  scope: 'instrumented selected-JS scene only; not browser/device latency or a native verdict' }));
