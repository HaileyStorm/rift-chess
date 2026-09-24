import assert from 'node:assert/strict';
import { PresentedInputQueue } from '../platform/browser/input-queue.ts';
import { RollingP90, makeBrowserProfile, type BrowserCapabilities } from '../platform/browser/telemetry.ts';

const queue = new PresentedInputQueue<any>();
const shown = Object.freeze({ frame: 1 });
const next = Object.freeze({ frame: 2 });
const move = (x: number) => ({ $: 'PointerMove', x, y: 7 });
const events = [
  move(1), move(2),
  { $: 'PointerDown', x: 2, y: 7, button: 0 },
  move(3), move(4),
  { $: 'Wheel', x: 4, y: 7, delta: 1 },
  { $: 'KeyInput', code: 65, down: true },
  { $: 'KeyInput', code: 65, down: false },
  { $: 'PointerUp', x: 4, y: 7, button: 0 },
].map(input => { queue.enqueue(input, shown); return input; });
queue.enqueue(move(5), next);
queue.enqueue(move(6), next);
assert.equal(queue.length, 8);
const first = queue.takeBatch()!;
assert.equal(first.presentation, shown);
assert.deepEqual(first.events, [
  events[1], events[2], events[4], events[5], events[6], events[7], events[8],
]);
const second = queue.takeBatch()!;
assert.equal(second.presentation, next);
assert.deepEqual(second.events, [move(6)]);
assert.equal(queue.takeBatch(), undefined);

const p90 = new RollingP90(5);
assert.equal(p90.value, null);
for (const value of [100, 1, 2, 3, 4, 5]) p90.add(value);
assert.equal(p90.count, 5);
assert.equal(p90.value, 5); // Retained window is [5,1,2,3,4].
p90.add(Number.NaN);
p90.add(-1);
assert.equal(p90.value, 5);

const capabilities: BrowserCapabilities = {
  schema: 'rift-bend-browser-profile/2', devicePixelRatio: 2, physicalEdge: 1280, viewportPhysicalEdge: 3000,
  maxTextureEdge: 8192, memoryMib: null, cpu2048P90Ms: null, cpu4096P90Ms: null,
  gpuMeasured: false, gpuP90Ms: null, imageBitmapTransfer: true,
};
assert.deepEqual(makeBrowserProfile(capabilities, 12, 3, 4, 2,
  { bendCompute: 30, workerPreparation: 30, workerReply: 30, hostPresentation: 28 }), {
  ...capabilities, imageBitmapActive: false,
  samples: { bendCompute: 30, workerPreparation: 30, workerReply: 30, hostPresentation: 28 },
  bendComputeP90Ms: 12, workerPreparationP90Ms: 3, workerReplyP90Ms: 4, hostPresentationP90Ms: 2,
});
console.log(JSON.stringify({ ok: true, checks: [
  'Only adjacent pointer moves on the same shown frame coalesce',
  'Down, up, wheel and keyboard order is preserved',
  'Presentation batches never cross snapshot identity',
  'Rolling p90 rejects invalid samples and caps its window',
  'Unavailable memory and unmeasured CPU/GPU performance remain unknown',
] }));
