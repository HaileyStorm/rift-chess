import assert from 'node:assert/strict';
// @ts-ignore The pinned Bend loader compiles this source-only audio module.
import Audio from '../lib/audio/Synthesis.bend';

const api = Audio as Record<string, (...args: any[]) => any>;
const array = (list: any): number[] => {
  const result: number[] = [];
  while (list.$ === 'Con') { result.push(list.head); list = list.tail; }
  assert.equal(list.$, 'Nil');
  return result;
};
const list = (values: any[]) => values.reduceRight((tail, head) =>
  ({ $: 'Con', head, tail }), { $: 'Nil' });
const note = (wave: number, delay = 0, gain = 0.4) =>
  ({ $: 'Tone', frequency: 1000, duration: 100, wave, gain, delay });

assert.equal(api.edge_gain(0, 800), 0);
assert.equal(api.edge_gain(50, 800), 1);
assert.equal(api.edge_gain(799, 800), 0);
assert.ok(api.edge_gain(700, 800) > 0 && api.edge_gain(700, 800) < 1);

for (const wave of [0, 1, 2, 3]) {
  const samples = array(api.samples(list([note(wave)]), 8000));
  assert.equal(samples.length, 800);
  assert.equal(samples[0], 0, 'attack begins at silence');
  assert.equal(samples.at(-1), 0, 'release reaches silence');
  assert.ok(samples.some(sample => Math.abs(sample) > 0.1));
  assert.ok(samples.every(sample => Number.isFinite(sample) && Math.abs(sample) <= 0.401));
}
const delayed = array(api.samples(list([note(0, 30)]), 8000));
assert.equal(delayed.length, 1040);
assert.ok(delayed.slice(0, 240).every(sample => sample === 0), 'delay stays silent');
assert.ok(delayed.slice(240).some(sample => sample !== 0));
const mixed = array(api.samples(list([note(1, 0, 0.9), note(1, 0, 0.9)]), 8000));
assert.ok(mixed.every(sample => Number.isFinite(sample) && Math.abs(sample) <= 1));
console.log(JSON.stringify({ ok: true, waveforms: 4, sampleComparisons: 4 * 800 + 1040 + 800,
  coverage: 'attack/release silence, delayed voice, all four waves, finite amplitude and mix clipping' }));
