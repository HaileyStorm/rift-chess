import assert from 'node:assert/strict';
import Native from '../NativeV2.bend';

const journal = (valid, present, sequence, text, error = 0) =>
  ({ $: 'Journal', valid, present, sequence, text, error });
const slots = (primary, secondary) => ({ $: 'Slots', primary, secondary });
const paths = ({
  $: 'NativePaths', save: 'save.json', preferences: 'prefs.json',
  recovery: 'recovery.json', import_record: 'import.json', export_record: 'record.json',
});
const record = (sequence, payload, complete = true) => {
  const body = Native.frame_body(
    `RIFT-NATIVE-BEGIN ${sequence}\n`, Native.escape_store(payload),
    `\nRIFT-NATIVE-END ${sequence}\n`,
  );
  return complete ? body : body.slice(0, body.lastIndexOf('RIFT-NATIVE-END'));
};

const payload = 'unicode ☃\nbackslash \\ and marker RIFT-NATIVE-END 7';
const escaped = Native.escape_store(payload);
assert.equal(Native.unescape_store(escaped), payload, 'payload escaping roundtrips');
assert.equal(Native.journal_parse(record(7, payload)).sequence, 7, 'complete frame keeps its sequence');
assert.equal(Native.Journal_text(Native.journal_parse(record(7, payload))), payload,
  'complete frame restores the exact payload');

for (const marker of ['RIFT-NATIVE-BEGIN 99', 'RIFT-NATIVE-END 99']) {
  const parsed = Native.journal_parse(record(8, marker));
  assert.equal(Native.Journal_text(parsed), marker, 'payload markers stay payload data');
}

const prior = Native.journal_parse(record(4, 'known good snapshot'));
const afterInterruptedWrite = Native.journal_parse(
  `${record(4, 'known good snapshot')}${record(5, 'interrupted write', false)}`,
);
assert.equal(afterInterruptedWrite.valid, true, 'truncated inactive write leaves a valid snapshot');
assert.equal(afterInterruptedWrite.sequence, 4, 'reader chooses the last complete sequence');
assert.equal(Native.Journal_text(afterInterruptedWrite), 'known good snapshot',
  'truncated write cannot replace prior contents');
assert.equal(prior.valid, true, 'control snapshot is complete');

const missing = Native.read_journal_value({ $: 'Read', text: '', ok: true, code: 2 });
assert.equal(missing.present, false, 'ENOENT remains distinct from an empty file');
const emptyFile = Native.read_journal_value({ $: 'Read', text: '', ok: true, code: 0 });
assert.equal(emptyFile.present, true, 'an existing empty file is retained as damage');
assert.equal(Native.latest_read(slots(missing, missing)).ok, true,
  'two missing slots are a clean first launch');
assert.equal(Native.latest_read(slots(emptyFile, missing)).code, 9002,
  'an empty damaged file fails closed into recovery');
const damagedFile = Native.read_journal_value({
  $: 'Read', text: 'rejected raw bytes', ok: true, code: 0,
});
assert.equal(Native.latest_read(slots(damagedFile, missing)).text, 'rejected raw bytes',
  'malformed bytes remain available to the recovery path');
const readFailure = Native.read_journal_value({ $: 'Read', text: '', ok: false, code: 73 });
assert.equal(Native.latest_read(slots(readFailure, missing)).code, 73,
  'non-missing filesystem errors remain visible');

const saved = journal(true, true, 12, Native.escape_store('good save'));
const damagedBackup = journal(false, true, 0, 'truncated frame', 9002);
const recovered = Native.latest_read(slots(saved, damagedBackup));
assert.equal(recovered.text, 'good save', 'a complete alternate slot wins over damage');
assert.equal(recovered.ok, true, 'format damage is repairable when an alternate is complete');
assert.equal(Native.slots_error(slots(saved, damagedBackup)), 0,
  'repairable frame damage does not block a new inactive snapshot');
assert.equal(Native.slots_error(slots(saved, readFailure)), 73,
  'filesystem read errors block writes instead of risking the active snapshot');

const repairTarget = Native.store_target(0, slots(saved, damagedBackup), paths);
assert.equal(repairTarget.path, 'save.json.b', 'repair writes only the inactive slot');
assert.equal(repairTarget.sequence, 13, 'repair increments the valid sequence');
const rotated = Native.store_target(0,
  slots(saved, journal(true, true, 13, Native.escape_store('new save'))), paths);
assert.equal(rotated.path, 'save.json', 'the next snapshot rotates to the older slot');
assert.equal(rotated.sequence, 14, 'alternating snapshots keep increasing sequence numbers');
const recoveryTarget = Native.store_target(2, slots(missing, missing), paths);
assert.equal(recoveryTarget.path, 'recovery.json', 'recovery records use their own journal pair');
assert.equal(recoveryTarget.sequence, 1, 'the first recovery record starts at sequence one');

console.log('native-v2-journal: complete-marker recovery, missing/empty distinction, payload fidelity, and alternating targets passed');
