// Finite exact-pixel witness for interpreting a depth-8 motion tree at the
// existing depth-9 board slot. A compact tree may replace nearest2 only if
// every tested source pixel and its actual aligned chrome embed match.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import scene from '../../.artifacts/bend2/v2-preview/selected-js/scene.js';
import control from '../../.artifacts/bend2/v2-preview/selected-js/controller.js';
import menu from '../../.artifacts/bend2/v2-preview/selected-js/menu.js';
import { assertCache } from '../tools/selected-modules.mjs';
import { PixelPort } from '../platform/browser/image-port.ts';

for (const name of ['scene', 'controller', 'menu']) assertCache(name);
const nil = { $: 'Nil' };
const underlays = [0, 1].map(theme => {
  const raw = fs.readFileSync(`bend2/assets/runtime/observatory-${theme ? 'stone' : 'astral'}.rga`);
  let bytes = nil;
  for (let i = raw.length - 1; i >= 0; i--) bytes = { $: 'Con', head: raw[i], tail: bytes };
  const plates = scene.load_plates({ $: 'Con', head: { $: 'AssetResponse',
    id: { $: theme ? 'Stone' : 'Astral' }, bytes, ok: true }, tail: nil });
  return scene.underlay128_asset(theme, plates);
});
const packet = control.boot_reads('', '', true, true, 1024, 640);
let enhanced = packet;
const probe = { $: 'QualityProbe', portrait: false, physicalEdge: 1920,
  timingValid: true, sampleCount: 8, measuredScale: 1,
  mainP90Us: 1000, workerP90Us: 1500 };
for (let i = 0; i < 3; i++) enhanced = control.dispatch_at_web(
  { $: 'Con', head: probe, tail: nil }, enhanced.presentation, enhanced.session);
const portrait = control.boot_reads('', '', true, true, 512, 1024);
assert.equal(enhanced.plan.boardDepth, 10n);
assert.equal(portrait.plan.board.x, 0);
const layouts = [
  { name: 'desktop', packet, width: 1024, height: 640 },
  { name: 'enhanced', packet: enhanced, width: 2048, height: 1280 },
  { name: 'portrait', packet: portrait, width: 512, height: 1024 },
];
const views = [
  { $: 'View', yaw: 345, pitch: 67, zoom: 115 },
  { $: 'View', yaw: 0, pitch: 65, zoom: 115 },
  { $: 'View', yaw: 0, pitch: 35, zoom: 130 },
  { $: 'View', yaw: 75, pitch: 90, zoom: 75 },
  { $: 'View', yaw: 180, pitch: 55, zoom: 100 },
];
let compared = 0;
const aggregate = crypto.createHash('sha256');
function nodes(node) {
  return node.$ === 'Pix' ? 1 : 1 + nodes(node.tl) + nodes(node.tr) + nodes(node.bl) + nodes(node.br);
}
const pixels = (image, width, height) =>
  Buffer.from(new PixelPort().render(image, width, height, Math.max(width, height)));
const counts = [];
for (const layout of layouts) for (const view of views) for (let theme = 0; theme < 2; theme++) {
  const frame = { ...layout.packet.snapshot.frame, view, theme,
    selected: 6, hovered: 6, progress: 8, lastAction: 3980 };
  const expanded = scene.fast_camera512(frame, underlays[theme]);
  const source = scene.fast_camera256_for_512(frame, underlays[theme]);
  const chrome = { $: 'Pix', color: 0x142535 };
  const before = pixels(menu.compose(layout.packet.render.depth, layout.packet.plan,
    expanded, chrome), layout.width, layout.height);
  const after = pixels(menu.compose(layout.packet.render.depth, layout.packet.plan,
    source, chrome), layout.width, layout.height);
  assert.ok(before.equals(after), `depth-8 source misinterpreted at ${layout.name}/yaw ${view.yaw}/theme ${theme}`);
  aggregate.update(after);
  compared += before.length;
  counts.push({ layout: layout.name, yaw: view.yaw, theme,
    compactNodes: nodes(source), expandedNodes: nodes(expanded) });
}
assert.ok(counts.every(row => row.compactNodes < row.expandedNodes));
const timing = { compact: [], expanded: [] };
const ports = { compact: new PixelPort(), expanded: new PixelPort() };
for (let round = 0; round < 9; round++) for (const view of views) {
  const frame = { ...packet.snapshot.frame, view };
  for (const mode of round % 2 ? ['expanded', 'compact'] : ['compact', 'expanded']) {
    const started = performance.now();
    const board = mode === 'compact'
      ? scene.fast_camera256_for_512(frame, underlays[0]) : scene.fast_camera512(frame, underlays[0]);
    const built = performance.now();
    const composed = menu.compose(10n, packet.plan, board, { $: 'Pix', color: 0x142535 });
    const pixels = ports[mode].render(composed, 1024, 640, 1024);
    const ended = performance.now();
    assert.equal(pixels.byteLength, 1024 * 640 * 4);
    if (round >= 2) timing[mode].push({ treeMs: built - started, fullMs: ended - started });
  }
}
function stats(rows, key) {
  const sorted = rows.map(row => row[key]).sort((a, b) => a - b);
  return { medianMs: +sorted[Math.floor(sorted.length / 2)].toFixed(2),
    p90Ms: +sorted[Math.ceil(sorted.length * 0.9) - 1].toFixed(2) };
}
console.log(JSON.stringify({ ok: true, views: views.length, layouts: layouts.length, themes: 2, counts,
  comparedBytes: compared, aggregateSha256: aggregate.digest('hex'),
  timing: Object.fromEntries(Object.entries(timing).map(([mode, rows]) =>
    [mode, { samples: rows.length, tree: stats(rows, 'treeMs'), full: stats(rows, 'fullMs') }])),
  scope: 'Finite selected-JS exact pixels and interleaved same-process timing; not a proof or browser/native frame budget' }));
