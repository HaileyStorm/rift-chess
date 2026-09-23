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
const preferences = (showMoves = true) => ({$: 'Preferences', mode: 0, layout: true, policy: 0, theme: 0,
  sound: true, volume: 80, view, showMoves, showShifts: true});
const meta = {$: 'Meta', revision: 0, turn: true, inCheck: false, outcome: 0,
  offer: 0, canUndo: false, botPaused: false, recovery: false};
const panels = (menu: number, page = 0) => ({$: 'Panels', menu, page, notice: '', draftMode: 0,
  draftLayout: true, draftPolicy: 0});

// Twenty-seven distinct destination groups from a selected queen square.
const selected = 27;
const legalIds = Array.from({length: 27}, (_, to) => 5 * (64 * selected + to));
const frame = {
  $: 'Frame', position, previous: position, selected, hovered: 64, targets: list([]),
  tile: 16, tileTargets: list([]), lastAction: 21760, progress: 16, theme: 0, view,
  shifts: list([]), check: 64,
};
const snapshot = (mobile: boolean, menu: number, showMoves = true, legal = legalIds, history: string[] = [], page = 0) => ({
  $: 'Snapshot', frame, preferences: preferences(showMoves), meta, panels: panels(menu, page), legal: list(legal),
  history: list(history), mobile, focus: 64, moving: false, checking: false, staged: false,
});
const enabled = (controls: any[], id: number) => controls.find((control) => control.id === id)?.enabled;

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

  // Rules §10: destination overlays are optional; with them off the pane lists none.
  const plain = array(Layout.controls(snapshot(mobile, 0, false)));
  assert.ok(!plain.some((control) => control.id >= 1000 || control.id === 47), `destinations shown with TARGETS off (${mobile})`);
  assert.equal(enabled(plain, 5), false, `SHIFT enabled for a piece whose tile cannot Shift (${mobile})`);
  // The queen's tile (macro 5) has one legal Shift into macro 4.
  const shiftable = array(Layout.controls(snapshot(mobile, 0, false, [...legalIds, 20480 + 5 * (16 * 5 + 4)])));
  assert.equal(enabled(shiftable, 5), true, `SHIFT disabled for a tile with a legal Shift (${mobile})`);
  assert.ok(shiftable.some((control) => control.id === 1000 + 20480 + 5 * (16 * 5 + 4)) === false,
    `a piece selection must not list its tile's Shift (${mobile})`);

  const settings = array(Layout.controls(snapshot(mobile, 2)));
  boundsWithin(settings, mobile);
  assert.ok([53, 54].every((id) => enabled(settings, id)), `TARGETS/SHIFTS toggles missing (${mobile})`);

  const history = Array.from({length: 23}, (_, i) => `entry ${i}`);
  const first = array(Layout.controls(snapshot(mobile, 10, true, legalIds, history, 0)));
  assert.deepEqual(first.filter((control) => control.id >= 28).map((control) => control.id), [28, 45, 46]);
  assert.equal(enabled(first, 45), false, `PREV enabled on the first history page (${mobile})`);
  assert.equal(enabled(first, 46), true, `NEXT disabled with later history (${mobile})`);
  const last = array(Layout.controls(snapshot(mobile, 10, true, legalIds, history, 2)));
  assert.equal(enabled(last, 45), true);
  assert.equal(enabled(last, 46), false, `NEXT enabled on the last history page (${mobile})`);
}

assert.equal(Layout.tile_name(0), 'A1');
assert.equal(Layout.tile_name(6), 'C2');
assert.equal(Layout.tile_name(15), 'D4');

console.log('ui-layout: bounded overflow MOVES route, complete menu 7 destination groups, overlay-gated destinations, SHIFT gating, settings toggles, history paging and tile names passed');
