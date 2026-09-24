// Source-bound controller integration: a real accepted input emits Bend PCM.
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertCache, cacheDir } from '../tools/selected-modules.mjs';

assertCache('controller');
const api = (await import(pathToFileURL(path.join(cacheDir, 'controller.js')).href)).default;
const list = values => values.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
const array = value => {
  const result = [];
  while (value.$ === 'Con') { result.push(value.head); value = value.tail; }
  assert.equal(value.$, 'Nil');
  return result;
};
let packet = api.boot_reads('', '', true, true, 1024, 768);
const before = packet.presentation.revision;
packet = api.dispatch_at(list([{ $: 'SquareInput', square: 12, expected: before }]),
  packet.presentation, packet.session);
assert.equal(packet.snapshot.frame.selected, 12, 'White pawn is selected');
packet = api.dispatch_at(list([{ $: 'SquareInput', square: 28, expected: before }]),
  packet.presentation, packet.session);
assert.equal(packet.presentation.revision, before, 'destination stages the move before its animation tick');
packet = api.dispatch_at(list([{ $: 'Tick', ms: 240 }]),
  packet.presentation, packet.session);
assert.equal(packet.presentation.revision, before + 1, 'e2-e4 is accepted');
const sounds = array(packet.effects).filter(effect => effect.$ === 'Sound');
assert.equal(sounds.length, 1, 'an accepted move emits one Bend sound');
const notes = array(sounds[0].notes);
assert.deepEqual(notes.map(note => note.frequency), [392, Math.fround(587.33)]);
const started = performance.now();
const pcm = array(api.audio_samples(sounds[0].notes, 24000));
const sampleMs = performance.now() - started;
assert.ok(pcm.length > 2000 && pcm.length < 24000);
assert.equal(pcm[0], 0);
assert.equal(pcm.at(-1), 0);
assert.ok(pcm.every(sample => Number.isFinite(sample) && Math.abs(sample) <= 1));
console.log(JSON.stringify({ ok: true, acceptedMove: 'e2-e4', notes: notes.length,
  samples: pcm.length, firstRenderMs: Math.round(sampleMs * 100) / 100 }));
