import assert from 'node:assert/strict';
import Layout from '../ui/Layout.bend';

const nil = {$: 'Nil'};
const list = (xs: any[]) => xs.reduceRight((tail, head) => ({$: 'Con', head, tail}), nil);
const array = (xs: any): any[] => {
  const out: any[] = [];
  while (xs.$ === 'Con') { out.push(xs.head); xs = xs.tail; }
  return out;
};

const position = {$: 'Pos', board: list(Array(64).fill(0)), holes: 0, side: true, rights: 0,
  ep: 64, epPawn: 64, quiet: 0n, full: 1n};
const view = {$: 'View', yaw: 0, pitch: 65, zoom: 100};
const preferences = {$: 'Preferences', mode: 0, layout: true, policy: 0, theme: 0,
  sound: true, volume: 80, view};
const meta = {$: 'Meta', revision: 0, turn: true, inCheck: false, outcome: 0,
  offer: 0, canUndo: false, botPaused: false, recovery: false};
const panels = (menu: number) => ({$: 'Panels', menu, page: 0, notice: '', draftMode: 0,
  draftLayout: true, draftPolicy: 0});

// Twenty-seven distinct destination groups from a selected queen square.
const selected = 27;
const legalIds = Array.from({length: 27}, (_, to) => 5 * (64 * selected + to));
const frame = {
  $: 'Frame', position, previous: position, selected, hovered: 64, targets: list([]),
  tile: 16, tileTargets: list([]), lastAction: 21760, progress: 16, theme: 0, view,
};
const snapshot = (mobile: boolean, menu: number) => ({
  $: 'Snapshot', frame, preferences, meta, panels: panels(menu), legal: list(legalIds),
  history: list([]), mobile, focus: 64, moving: false, checking: false,
});

function boundsWithin(controls: any[], mobile: boolean): void {
  const width = Layout.width(mobile), height = Layout.height(mobile);
  for (const control of controls) {
    const r = control.bounds;
    assert.ok(r.x + r.width <= width, `control ${control.id} exceeds width`);
    assert.ok(r.y + r.height <= height, `control ${control.id} exceeds height`);
  }
}

for (const mobile of [true, false]) {
  const main = array(Layout.controls(snapshot(mobile, 0)));
  boundsWithin(main, mobile);
  assert.ok(main.some((control) => control.id === 47), `overflow MOVES control missing (${mobile})`);
  assert.ok(!main.some((control) => control.id >= 1000), `overflow destinations leaked (${mobile})`);

  const legal = array(Layout.controls(snapshot(mobile, 7)));
  boundsWithin(legal, mobile);
  const groups = legal.filter((control) => control.id >= 1000).map((control) => control.id - 1000);
  assert.deepEqual(groups.sort((a, b) => a - b), legalIds.slice().sort((a, b) => a - b),
    `menu 7 dropped a legal destination (${mobile})`);
  assert.ok(legal.some((control) => control.id === 28), `menu 7 close missing (${mobile})`);
}

console.log('ui-layout: bounded overflow MOVES route and complete menu 7 destination groups passed');
