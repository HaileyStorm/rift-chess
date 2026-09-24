// Compile and exercise Bend's pure automatic-detail policy with finite inputs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as Bend from '../../.artifacts/toolchains/bend/bend2/bend.ts';
import * as Comp from '../../.artifacts/toolchains/bend/bend2/comp.ts';
import { resolveBaseForeignImports } from '../tools/loader-v2.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, '.artifacts/bend2/quality-policy');
const outFile = path.join(outDir, 'quality.js');
const source = path.join(root, 'bend2/ui/v2/Quality.bend').replaceAll('\\', '/');
const roots = ['choose', 'current', 'decision_changed', 'initial_state'];
fs.mkdirSync(outDir, { recursive: true });

const book = Bend.book_nil();
await Bend.book_load(book, source, '', new Map<string, string | null>());
resolveBaseForeignImports(book);
Bend.book_valid(book);
assert.equal(book.hols + book.open, 0, 'Quality has no holes or TODOs');
for (const name of roots) {
  const def = book.tlds[name];
  assert.ok(def && def.$ === 'Def' && def.v !== null && def.b !== true &&
    def.x === 0 && def.i === undefined && Comp.io_base(book, def.T) === null,
  `${name} is a filled pure Bend definition`);
}
fs.writeFileSync(outFile, Comp.js_lib(book, roots, roots), 'utf8');

const api = (await import(pathToFileURL(outFile).href)).default as Record<string, any>;
const probe = (changes: Record<string, unknown> = {}) => ({
  $: 'Probe', portrait: false, physicalEdge: 1920, timingValid: true,
  sampleCount: 8, measuredScale: 1, mainP90Us: 1000, workerP90Us: 1500,
  ...changes,
});
const run = (state: unknown, changes: Record<string, unknown>) => api.choose(state, probe(changes));
const initial = api.initial_state();

let displayed = api.current(initial, false);
assert.deepEqual(displayed.next, initial, 'ordinary rendering preserves policy state');
assert.deepEqual([displayed.scale, displayed.width, displayed.height,
  displayed.quality, displayed.responsiveness],
[1, 1024, 640, 'Standard detail', 'Measuring responsiveness']);
assert.equal(api.decision_changed(initial, displayed.next), false);

let result = run(initial, { timingValid: false, sampleCount: 0 });
assert.equal(result.scale, 1, 'unknown startup timings stay at standard detail');
assert.equal(result.responsiveness, 'Measuring responsiveness');
assert.deepEqual(result.next, { $: 'State', scale: 1, fastWindows: 0, slowWindows: 0 });

result = run(initial, { sampleCount: 7 });
assert.equal(result.scale, 1, 'an incomplete timing window cannot promote detail');
assert.equal(result.responsiveness, 'Measuring responsiveness');

for (const physicalEdge of [0, 1024, 1279]) {
  result = run(initial, { physicalEdge });
  assert.equal(result.scale, 1, `physical edge ${physicalEdge} cannot promote detail`);
  assert.equal(result.responsiveness, physicalEdge === 0
    ? 'Waiting for viewport measurement' : 'Viewport limits extra detail');
}

let state = initial;
for (let i = 1; i <= 2; i++) {
  result = run(state, { physicalEdge: 1280 });
  assert.equal(result.scale, 1, `fast window ${i} holds standard detail`);
  state = result.next;
}
result = run(state, { physicalEdge: 1280 });
assert.equal(result.scale, 2, 'third consecutive fast, measured window promotes detail');
assert.deepEqual([result.width, result.height, result.boardSize, result.depth, result.boardDepth],
  [2048, 1280, 1024, 11n, 10n]);
assert.equal(result.quality, 'Enhanced detail');
assert.equal(result.responsiveness, 'Responsive');
state = result.next;
displayed = api.current(state, true);
assert.deepEqual(displayed.next, state, 'current profile preserves tier counters');
assert.deepEqual([displayed.scale, displayed.width, displayed.height,
  displayed.quality, displayed.responsiveness],
[2, 1024, 2048, 'Enhanced detail', 'Responsive']);
assert.equal(api.decision_changed(initial, state), true);
assert.equal(api.decision_changed(state, displayed.next), false);

let boundaryState = initial;
for (let i = 0; i < 3; i++) {
  result = run(boundaryState, { mainP90Us: 2000, workerP90Us: 2500 });
  boundaryState = result.next;
}
assert.equal(result.scale, 2, 'inclusive scale1 projected budget boundary promotes');

result = run(state, { portrait: true, measuredScale: 2,
  mainP90Us: 3000, workerP90Us: 9000 });
assert.equal(result.scale, 2, 'portrait output retains scale2 within measured budget');
assert.deepEqual([result.width, result.height, result.boardSize, result.depth, result.boardDepth],
  [1024, 2048, 1024, 11n, 10n]);

result = run(state, { measuredScale: 2, mainP90Us: 2000, workerP90Us: 10000 });
assert.equal(result.scale, 2, 'inclusive scale2 timing budget boundary is accepted');

result = run(state, { measuredScale: 1 });
assert.equal(result.scale, 1, 'stale scale1 data cannot retain a scale2 state');
assert.equal(result.responsiveness, 'Measuring responsiveness');

result = run(state, { timingValid: false, sampleCount: 64 });
assert.equal(result.scale, 1, 'unknown timing immediately drops a previous high tier');
assert.equal(result.next.fastWindows, 0);
assert.equal(result.next.slowWindows, 0);

result = run(state, { measuredScale: 99 });
assert.equal(result.scale, 1, 'an unknown measurement tier is treated as unknown timing');
assert.equal(result.responsiveness, 'Measuring responsiveness');

for (const bad of [
  { measuredScale: 1, mainP90Us: 4001, workerP90Us: 1000 },
  { measuredScale: 1, mainP90Us: 1000, workerP90Us: 2501 },
  { measuredScale: 1, mainP90Us: 3000, workerP90Us: 2500 },
  { measuredScale: 2, mainP90Us: 4001, workerP90Us: 1000 },
  { measuredScale: 2, mainP90Us: 1000, workerP90Us: 10001 },
  { measuredScale: 2, mainP90Us: 4000, workerP90Us: 10000 },
]) {
  result = run(initial, bad);
  assert.equal(result.scale, 1, `slow/excessive timing does not promote: ${JSON.stringify(bad)}`);
}

result = run(state, { measuredScale: 2, mainP90Us: 5000, workerP90Us: 9000 });
assert.equal(result.scale, 2, 'one elevated window does not flap a high tier');
assert.equal(result.responsiveness, 'Elevated render time');
displayed = api.current(result.next, false);
assert.equal(displayed.responsiveness, 'Elevated render time');
assert.deepEqual(displayed.next, result.next);
result = run(result.next, { measuredScale: 2, mainP90Us: 5000, workerP90Us: 9000 });
assert.equal(result.scale, 1, 'two consecutive slow windows reduce detail');
assert.equal(result.responsiveness, 'Detail reduced to protect responsiveness');

// Cross a finite grid of state/probe boundaries and enforce the no-runaway
// invariant: no scale2 decision can be made with unknown or over-budget data.
let cases = 0;
for (const physicalEdge of [0, 1279, 1280, 1920]) {
  for (const timingValid of [false, true]) {
    for (const sampleCount of [0, 7, 8, 32]) {
      for (const measuredScale of [0, 1, 2, 99]) {
        for (const mainP90Us of [0, 4000, 4001, 8000]) {
          for (const workerP90Us of [0, 2500, 2501, 10000, 10001]) {
            for (const previousScale of [0, 1, 2, 3]) {
              const previous = { $: 'State', scale: previousScale,
                fastWindows: 0, slowWindows: 0 };
              const p = probe({ physicalEdge, timingValid, sampleCount,
                measuredScale, mainP90Us, workerP90Us });
              const d = api.choose(previous, p);
              if (!timingValid || sampleCount < 8 || physicalEdge < 1280)
                assert.equal(d.scale, 1, 'unknown/inadequate conditions force scale1');
              assert.ok(d.scale === 1 || d.scale === 2);
              if (d.scale === 2) {
                assert.ok(physicalEdge >= 1280);
                assert.ok(timingValid && sampleCount >= 8);
                assert.equal(measuredScale, previousScale === 2 ? 2 : 1,
                  'scale2 requires measurements matching the prior tier');
                assert.ok(d.responsiveness === 'Responsive'
                  || d.responsiveness === 'Elevated render time');
              }
              cases++;
            }
          }
        }
      }
    }
  }
}

console.log(`Bend automatic-detail policy passed: startup, bounds, hysteresis, `
  + `desktop/portrait profiles, and ${cases.toLocaleString()} finite state/probe cases`);
