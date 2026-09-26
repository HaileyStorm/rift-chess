// Finite policy gate for the separately compiled Bend controller. Browser IO
// executes these flags; it must never invent its own game cache invalidation.
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertCache, cacheDir } from '../tools/selected-modules.mjs';

assertCache('controller');
const api = (await import(pathToFileURL(path.join(cacheDir, 'controller.js')).href)).default;
const list = (values) => values.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
const flags = (p) => Object.fromEntries(['background', 'ground', 'prepared', 'chrome', 'frame']
  .map((key) => [key, p.render[key]]));

let p = api.boot_reads('', '', true, true, 1024, 768);
assert.equal(p.dirty, true);
assert.deepEqual(flags(p), { background: true, ground: true, prepared: true,
  chrome: true, frame: true });
assert.equal(p.width, 1024);
assert.equal(p.height, 640);
assert.equal(p.render.boardSize, 512);
assert.equal(p.presentation.revision, 0);

p = api.dispatch_at(list([{ $: 'PresentedMove', x: 100, y: 170, square: 12 }]),
  p.presentation, p.session);
assert.equal(p.snapshot.frame.hovered, 12);
assert.deepEqual(flags(p), { background: false, ground: false, prepared: false,
  chrome: false, frame: true }, 'hover preserves static Bend layers');

p = api.dispatch_at(list([{ $: 'SquareInput', square: 12, expected: 0 }]),
  p.presentation, p.session);
assert.equal(p.snapshot.frame.selected, 12);
assert.deepEqual(flags(p), { background: false, ground: false, prepared: true,
  chrome: true, frame: true }, 'selection rebuilds cues and chrome');

p = api.dispatch_at(list([{ $: 'Wheel', x: 200, y: 200, delta: -80 }]),
  p.presentation, p.session);
assert.deepEqual(flags(p), { background: false, ground: true, prepared: true,
  chrome: false, frame: true }, 'camera invalidates the projected board');

p = api.dispatch_at(list([{ $: 'Tick', ms: 16 }]), p.presentation, p.session);
assert.equal(p.dirty, false);
assert.deepEqual(flags(p), { background: false, ground: false, prepared: false,
  chrome: false, frame: false });
const refinement = api.refine(p.session);
assert.equal(refinement.presentation.revision, p.presentation.revision);
assert.equal(refinement.snapshot.frame.selected, p.snapshot.frame.selected);
assert.equal(refinement.effects.$, 'Nil');
assert.equal(refinement.after, 0);
assert.deepEqual(flags(refinement), { background: false, ground: false, prepared: true,
  chrome: true, frame: true }, 'late sprite refinement repaints without a game transition');
const fastProbe = { $: 'QualityProbe', portrait: false, physicalEdge: 1920,
  timingValid: true, sampleCount: 8, measuredScale: 1, mainP90Us: 1000, workerP90Us: 1500 };
for (let i = 0; i < 2; i++) {
  p = api.dispatch_at(list([fastProbe]), p.presentation, p.session);
  assert.equal(p.dirty, false, 'a single fast window does not change the image tier');
}
p = api.dispatch_at(list([fastProbe]), p.presentation, p.session);
assert.equal(p.dirty, true);
assert.deepEqual([p.width, p.height, p.render.boardSize, p.render.size,
  p.render.depth, p.render.boardDepth], [2048, 1280, 1024, 2048, 11n, 10n]);
assert.deepEqual(flags(p), { background: true, ground: true, prepared: true,
  chrome: true, frame: true }, 'tier promotion rebuilds every scale-bound layer');
p = api.dispatch_at(list([fastProbe]), p.presentation, p.session);
assert.equal(p.width, 1024, 'stale old-tier telemetry immediately returns to standard');
assert.equal(p.render.boardSize, 512);
console.log('Bend controller cache/detail policy: boot, hover, selection, camera, inert tick, '
  + 'measured promotion, full invalidation, stale-tier fallback passed');
