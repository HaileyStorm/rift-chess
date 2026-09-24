import assert from 'node:assert/strict';
// @ts-ignore Pinned Bend loader compiles the game-specific cue policy.
import Cues from '../ui/SoundCues.bend';
// @ts-ignore Pinned Bend loader compiles the generic PCM synthesis library.
import Audio from '../lib/audio/Synthesis.bend';

const cues = Cues as Record<string, (...args: any[]) => any>;
const audio = Audio as Record<string, (...args: any[]) => any>;
const yes = true, no = false;
function array(value: any): any[] {
  const result = [];
  while (value.$ === 'Con') { result.push(value.head); value = value.tail; }
  assert.equal(value.$, 'Nil');
  return result;
}
const list = (items: any[]) => items.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
const cases = [
  ['move', no, no, no, no],
  ['capture', no, no, no, yes],
  ['shift', no, no, yes, no],
  ['check', no, yes, no, no],
  ['terminal', yes, no, no, no],
] as const;
const signatures = new Set<string>();
for (const [name, terminal, check, shift, capture] of cases) {
  const notes = array(cues.notes(terminal, check, shift, capture, 28));
  assert.ok(notes.length >= 2 && notes.length <= 3, `${name} remains a short cue`);
  const signature = JSON.stringify(notes.map(({ frequency, duration, wave, delay }) =>
    [frequency, duration, wave, delay]));
  assert.ok(!signatures.has(signature), `${name} is distinguishable by structure`);
  signatures.add(signature);
  const pcm = array(audio.samples(list(notes.map(({ $: _, ...fields }) => ({ $: 'Tone', ...fields }))), 24000));
  assert.ok(pcm.length > 0 && pcm.length <= 24000, `${name} is bounded`);
  assert.equal(pcm[0], 0, `${name} starts at silence`);
  assert.equal(pcm.at(-1), 0, `${name} ends at silence`);
  assert.ok(pcm.every(s => Number.isFinite(s) && Math.abs(s) <= 1), `${name} has finite PCM`);
  assert.ok(pcm.some(s => Math.abs(s) > 0.03), `${name} is audible at default level`);
  const muted = array(cues.notes(terminal, check, shift, capture, 0));
  assert.ok(muted.every(n => n.gain === 0), `${name} respects mute volume`);
}
assert.deepEqual(array(cues.notes(yes, yes, yes, yes, 28)),
  array(cues.notes(yes, no, no, no, 28)), 'terminal cue takes precedence');
assert.deepEqual(array(cues.notes(no, yes, yes, yes, 28)),
  array(cues.notes(no, yes, no, no, 28)), 'check cue takes precedence');
assert.deepEqual(array(cues.notes(no, no, yes, yes, 28)),
  array(cues.notes(no, no, yes, no, 28)), 'Shift cue takes precedence');
assert.deepEqual(array(cues.notes(no, no, no, no, 200)),
  array(cues.notes(no, no, no, no, 100)), 'volume is capped before mixing');
console.log('Bend game sound cues: five distinct bounded, finite PCM cues, mute, capped level and priority passed');
