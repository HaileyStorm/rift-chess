// Warm compiled-JavaScript CPU timings for the application's hot paths under the
// pinned Bun. Same deterministic states before and after a change; this is not
// a browser presentation benchmark and not a native parallel benchmark.
import fs from 'node:fs';
import path from 'node:path';
import A from '../Application.bend';
import P from '../ui/Program.bend';
import V from '../ui/View.bend';
import S from '../graphics/Scene.bend';
import C from '../ui/Codec.bend';

const nil = { $: 'Nil' };
const list = (xs: any[]) => xs.reduceRight((tail, head) => ({ $: 'Con', head, tail }), nil);
const array = (xs: any) => { const out: any[] = []; while (xs?.$ === 'Con') { out.push(xs.head); xs = xs.tail; } return out; };

function measure(run: () => unknown, samples: number, warm = 3) {
  for (let i = 0; i < warm; i++) run();
  const times: number[] = [];
  for (let i = 0; i < samples; i++) { const t = performance.now(); run(); times.push(performance.now() - t); }
  times.sort((a, b) => a - b);
  const at = (q: number) => +times[Math.min(times.length - 1, Math.floor(times.length * q))].toFixed(2);
  return { median: at(0.5), p95: at(0.95), samples };
}

// Square centre under the default camera (yaw 0, pitch 65, zoom 100), desktop board at y 128.
const centre = (square: number, lift = 16) => ({
  x: Math.round(256 + 45 * (square % 8 - 3.5)),
  y: Math.round(128 + 274 + 45 * Math.sin(65 * Math.PI / 180) * (3.5 - Math.floor(square / 8)) - lift) });
const down = (square: number) => ({ $: 'PointerDown', ...centre(square), button: 0, alt: false });

const boot = A.boot('', '', 1024, 768);
const start = boot.session;
const selected = A.dispatch(list([down(6)]), start).session;          // g1 knight selected
const orbiting = A.dispatch(list([{ $: 'PointerDown', x: 250, y: 400, button: 2, alt: false }]), start).session;
const state = P.start('', '', 1024, 768).state;
const selectedState = selected.program;
const snap = P.snapshot(selectedState);
const background = S.background();
const board = S.render_on(false, background, snap.frame);
const chrome = V.chrome(snap);
const notes = list([{ $: 'Note', frequency: 440, duration: 90, wave: 0, gain: 0.15, delay: 0 },
  { $: 'Note', frequency: 660, duration: 110, wave: 0, gain: 0.09, delay: 65 }]);
const fixtures = JSON.parse(fs.readFileSync('bend2/tests/fixtures/playtest-records.json', 'utf8'));
const long = fixtures.progress100;
const recordText = JSON.stringify({ schema: 'rift-bend-record/1', layout: long.layout, policy: long.policy,
  commands: long.actions.map((action: number, expected: number) => ({ $: 'MoveCommand', expected, action })) });
const decoded = C.decode(recordText);
if (decoded.$ !== 'Some') throw new Error('fixture record does not decode');
const sampleCount = array(A.audio_samples(notes, 24000)).length;
let orbitStep = 0;

const cases: Record<string, [() => unknown, number]> = {
  boot: [() => A.boot('', '', 1024, 768), 8],
  hoverFrame: [() => A.dispatch(list([{ $: 'PointerMove', ...centre(12) }]), start), 20],
  selectFrame: [() => A.dispatch(list([down(6)]), start), 20],
  deselectFrame: [() => A.dispatch(list([down(6)]), selected), 20],
  orbitFrame: [() => A.dispatch(list([{ $: 'PointerMove', x: 260 + (orbitStep++ % 40) * 3, y: 404 }]), orbiting), 30],
  menuFrame: [() => A.dispatch(list([{ $: 'Activate', id: 1 }]), start), 20],
  chrome: [() => V.chrome(snap), 20],
  boardSettled: [() => S.render_on(false, background, snap.frame), 20],
  boardMotion: [() => S.render_on(true, background, snap.frame), 20],
  compose: [() => V.compose(snap, board, chrome), 20],
  sound: [() => array(A.audio_samples(notes, 24000)), 20],
  recordEncode: [() => C.encode(decoded.value), 20],
  recordDecode: [() => C.decode(recordText), 10],
  commit: [() => P.request_move(state, 3980), 5],
};

const only = (process.env.PROFILE_ONLY || '').split(',').filter(Boolean);
const receipt: any = { at: new Date().toISOString(), run: process.env.PROFILE_RUN || 'adhoc', runtime: `Bun ${Bun.version}`,
  scope: 'Warm compiled Bend JavaScript, CPU only; same deterministic states per case', soundSamples: sampleCount,
  recordCommands: long.actions.length, cases: {} };
for (const [name, [run, samples]] of Object.entries(cases)) {
  if (only.length && !only.includes(name)) continue;
  receipt.cases[name] = measure(run, samples);
  console.log(name.padEnd(14), JSON.stringify(receipt.cases[name]));
}
const out = path.resolve('.artifacts/bend2/profile', `${receipt.run}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(receipt, null, 2));
console.log(out);
