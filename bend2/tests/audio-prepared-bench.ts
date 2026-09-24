// Repeatable warm-JS comparison of the retained reference loop and prepared
// voice loop. This is diagnostic evidence, not a native or browser benchmark.
import assert from 'node:assert/strict';
// @ts-ignore Pinned Bend loader compiles the pure library.
import Audio from '../lib/audio/Synthesis.bend';
const api = Audio as Record<string, (...args: any[]) => any>;
const list = (items: any[]) => items.reduceRight((tail, head) =>
  ({ $: 'Con', head, tail }), { $: 'Nil' });
const consume = (value: any) => {
  let count = 0, checksum = 0;
  while (value.$ === 'Con') { count++; checksum += value.head; value = value.tail; }
  assert.equal(value.$, 'Nil');
  return { count, checksum };
};
const notes = [
  { $: 'Tone', frequency: 174.61, duration: 170, wave: 1, gain: 0.2, delay: 0 },
  { $: 'Tone', frequency: 261.63, duration: 82, wave: 0, gain: 0.08, delay: 0 },
  { $: 'Tone', frequency: 523.25, duration: 105, wave: 0, gain: 0.06, delay: 48 },
];
const rate = 24000, count = 170 * rate / 1000;
const old = () => consume(api.samples_go(BigInt(count), 0, rate, list(notes), list([])));
const prepared = () => consume(api.samples(list(notes), rate));
assert.deepEqual(prepared(), old());
for (let i = 0; i < 4; i++) { old(); prepared(); }
const times = { reference: [] as number[], prepared: [] as number[] };
for (let i = 0; i < 11; i++) {
  const paths = i % 2 ? [['prepared', prepared], ['reference', old]] as const
    : [['reference', old], ['prepared', prepared]] as const;
  for (const [name, run] of paths) {
    const start = performance.now();
    assert.equal(run().count, count);
    times[name].push(performance.now() - start);
  }
}
const median = (xs: number[]) => xs.sort((a, b) => a - b)[5];
console.log(JSON.stringify({ sampleCount: count, voiceCount: notes.length,
  referenceMedianMs: median(times.reference), preparedMedianMs: median(times.prepared) }));
