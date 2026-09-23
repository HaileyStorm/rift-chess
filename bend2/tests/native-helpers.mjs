import assert from 'node:assert/strict';
import Native from '../Native.bend';

const list = (xs) => xs.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
const listArray = (xs) => {
  const out = [];
  for (let cursor = xs; cursor.$ !== 'Nil'; cursor = cursor.tail) out.push(cursor.head);
  return out;
};
const journal = (valid, present, sequence, text, error = 0) =>
  ({ $: 'Journal', valid, present, sequence, text, error });
const slots = (primary, secondary) => ({ $: 'Slots', primary, secondary });
const record = (sequence, payload, complete = true) => {
  const body = `RIFT-NATIVE-BEGIN ${sequence}\n~${Native.escape_store(payload)}\n`;
  return complete ? `${body}RIFT-NATIVE-END ${sequence}\n` : body;
};

const cycle = 'A\n\\RIFT-NATIVE-BEGIN 77 ☃';
const payload = cycle.repeat(Math.ceil(100000 / cycle.length));
const escaped = Native.escape_store(payload);
assert.equal(Native.unescape_store(escaped), payload, '100k escaped payload roundtrips');
assert.ok(escaped.length > payload.length, 'newline/backslash escaping expands the payload');
assert.ok(escaped.includes('RIFT-NATIVE-BEGIN 77'), 'marker literal remains payload data');
assert.equal(Native.frame_body('RIFT-NATIVE-BEGIN 1\n', escaped, '\nRIFT-NATIVE-END 1\n'),
  `RIFT-NATIVE-BEGIN 1\n~${escaped}\nRIFT-NATIVE-END 1\n`,
  'framing large payloads stays tail-safe');

const goodPayload = 'unicode ☃\nbackslash \\ and marker RIFT-NATIVE-END 7';
const parsed = Native.journal_parse(record(7, goodPayload));
assert.equal(parsed.valid, true, 'complete snapshot is valid');
assert.equal(parsed.sequence, 7, 'snapshot sequence is retained');
assert.equal(Native.Journal_text(parsed), goodPayload, 'snapshot payload roundtrips');

for (const markerPayload of ['RIFT-NATIVE-BEGIN 99', 'RIFT-NATIVE-END 99']) {
  const marker = Native.journal_parse(record(8, markerPayload));
  assert.equal(marker.valid, true, `standalone ${markerPayload} remains payload data`);
  assert.equal(Native.Journal_text(marker), markerPayload, 'standalone marker payload roundtrips');
}

const priorPayload = 'prior good snapshot';
const prior = Native.journal_parse(record(4, priorPayload));
const partial = Native.journal_parse(`${record(4, priorPayload)}${record(5, 'partial trailing write', false)}`);
assert.equal(partial.valid, true, 'partial trailing frame does not erase a prior valid frame');
assert.equal(partial.sequence, 4, 'partial trailing frame loses to the prior sequence');
assert.equal(Native.Journal_text(partial), priorPayload, 'prior payload is retained exactly');
assert.equal(prior.valid, true, 'prior parser fixture is valid');

const missing = Native.latest_read(slots(journal(false, false, 0, ''), journal(false, false, 0, '')));
assert.equal(missing.text, '', 'both missing slots are a clean first launch');
assert.equal(listArray(missing.errors).length, 0, 'missing slots do not create a PortError');

const corrupt = Native.latest_read(slots(journal(false, true, 0, 'broken primary'), journal(false, true, 0, 'broken secondary')));
assert.equal(corrupt.text, 'broken primary', 'corrupt text is retained for recovery');
assert.equal(listArray(corrupt.errors)[0].kind, 9002, 'both corrupt slots fail closed');

const emptyCorruptJournal = Native.read_journal_value({ $: 'Read', text: '', errors: list([]) });
assert.equal(emptyCorruptJournal.present, true, 'an existing empty file is not treated as ENOENT');
const emptyCorrupt = Native.latest_read(slots(emptyCorruptJournal, journal(false, false, 0, '')));
assert.equal(emptyCorrupt.text, '', 'empty corrupt text remains empty for recovery UI');
assert.equal(listArray(emptyCorrupt.errors)[0].kind, 9002, 'empty corrupt file forces recovery');

const ioError = Native.latest_read(slots(journal(false, true, 0, '', 73), journal(false, false, 0, '')));
assert.equal(listArray(ioError.errors)[0].kind, 73, 'non-missing read errors fail closed');

const goodSlot = Native.latest_read(slots(
  journal(true, true, 12, Native.escape_store('good save')),
  journal(false, true, 0, '', 74),
));
assert.equal(Native.unescape_store(goodSlot.text), 'good save', 'prior valid slot remains readable');
assert.equal(listArray(goodSlot.errors)[0].kind, 74, 'error in the inactive slot is still surfaced');

const damagedInactive = Native.latest_read(slots(
  journal(true, true, 12, Native.escape_store('good save')),
  journal(false, true, 0, 'partial frame', 9002),
));
assert.equal(damagedInactive.text, 'good save', 'format damage in inactive slot does not hide good state');
assert.equal(listArray(damagedInactive.errors).length, 0, 'format damage is repairable when a valid slot exists');
const repairTarget = Native.store_target(0, slots(
  journal(true, true, 12, Native.escape_store('good save')),
  journal(false, true, 0, 'partial frame', 9002),
));
assert.equal(repairTarget.path, 'save.json.b', 'repair writes the inactive slot');
assert.equal(repairTarget.sequence, 13, 'repair advances the host sequence');
const rotatedTarget = Native.store_target(0, slots(
  journal(true, true, 12, Native.escape_store('good save')),
  journal(true, true, 13, Native.escape_store('new save')),
));
assert.equal(rotatedTarget.path, 'save.json', 'next write rotates back to the old slot');
assert.equal(rotatedTarget.sequence, 14, 'rotated snapshots keep a monotonic sequence');

const modifierBatch = Native.events(list([
  { $: 'Key', code: 65595, down: true },
  { $: 'Key', code: 65, down: true },
  { $: 'Key', code: 65595, down: false },
]), 0, 0);
const modifierInputs = listArray(modifierBatch.inputs);
assert.equal(modifierInputs[1].ctrl, true, 'Ctrl modifier reaches key input');
assert.equal(modifierInputs[2].ctrl, false, 'Ctrl release clears tracked state');

const overlapBatch = Native.events(list([
  { $: 'Key', code: 65595, down: true },
  { $: 'Key', code: 65591, down: true },
  { $: 'Key', code: 65595, down: false },
  { $: 'Key', code: 65, down: true },
  { $: 'Key', code: 65591, down: false },
]), 0, 0);
const overlapInputs = listArray(overlapBatch.inputs);
assert.equal(overlapInputs[3].ctrl, true, 'Super remains held after Ctrl release');

const altOverlap = Native.events(list([
  { $: 'Key', code: 65594, down: true },
  { $: 'Key', code: 65597, down: true },
  { $: 'Key', code: 65594, down: false },
  { $: 'Key', code: 65, down: true },
]), 0, 0);
assert.equal(listArray(altOverlap.inputs)[3].alt, true, 'second Alt remains held after first release');

const savedReadError = Native.boot_loaded(
  { $: 'Read', text: '', errors: list([{ $: 'PortError', kind: 74 }]) },
  { $: 'Read', text: '', errors: list([]) },
);
assert.equal(listArray(savedReadError.errors)[0].kind, 9003, 'saved read errors enter blocked recovery');
const savedCorrupt = Native.boot_loaded(
  { $: 'Read', text: '', errors: list([{ $: 'PortError', kind: 9002 }]) },
  { $: 'Read', text: '', errors: list([]) },
);
assert.equal(listArray(savedCorrupt.errors)[0].kind, 9002, 'corrupt saved records retain the recovery code');
const prefsError = Native.boot_loaded(
  { $: 'Read', text: 'good save', errors: list([]) },
  { $: 'Read', text: '', errors: list([{ $: 'PortError', kind: 74 }]) },
);
assert.equal(listArray(prefsError.errors)[0].kind, 9004, 'preference errors fall back without discarding the save');

const mono = list(Array.from({ length: 3000 }, () => 0));
const split = Native.split_mono(2048n, mono, list([]));
assert.equal(listArray(split.block).length, 4096, 'audio chunk is 2048 interleaved stereo frames');
assert.equal(listArray(split.rest).length, 952, 'audio tail retains unconsumed mono frames');
assert.ok(listArray(split.block).length <= 8192, 'audio write stays below the pinned sample cap');
assert.equal(Native.audio_capacity(0), 2048, 'empty ring permits one bounded audio chunk');
assert.equal(Native.audio_capacity(3000), 1096, 'queued ring capacity is respected');
assert.equal(Native.audio_capacity(4096), 0, 'full ring defers audio without dropping it');

console.log('native-helpers: framing, corrupt/missing/error slots, 100k escape roundtrip, and stereo chunk capacity passed');
