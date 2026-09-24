import assert from 'node:assert/strict';
import P from './program.ts';

type Command = Record<string, any>;
type State = Record<string, any>;

const refreshFields = (s: State) => ({
  game: P.game(s),
  pos: P.pos(s),
  legal: P.legal(s),
  meta: P.meta(s),
});

function command(tag: string, state: State, fields: Record<string, unknown> = {}): Command {
  return { $: tag, expected: BigInt(P.snapshot(state).meta.revision), ...fields };
}

function assertRefresh(base: State, c: Command, cached: boolean, context: string): State {
  const update = P.command(base, c);
  const actual = update.state as State;
  const revision = P.snapshot(actual).meta.revision;
  assert.equal(revision, P.snapshot(base).meta.revision + 1, `${context}: accepted command advances one revision`);

  // The accepted Match comes only from the normal Kernel.command path. Compare
  // both refresh implementations against that same kernel result, then ensure
  // the user-visible command path selected the intended refresh policy.
  const accepted = P.game(actual);
  const full = P.refreshed(base, accepted);
  const samePosition = P.refreshed_same_position(base, accepted);
  if (cached) {
    assert.deepEqual(samePosition, full, `${context}: cache refresh equals the full refresh`);
    assert.deepEqual(refreshFields(actual), refreshFields(samePosition), `${context}: command used the cached refresh`);
  } else {
    assert.deepEqual(refreshFields(actual), refreshFields(full), `${context}: command kept the full refresh`);
    assert.notDeepEqual(refreshFields(actual), refreshFields(samePosition), `${context}: changing-position command must not use the old cache`);
  }
  return actual;
}

const white = (P.start('', '', 1024, 800) as { state: State }).state;
assert.equal(P.snapshot(white).meta.turn, true, 'initial turn is White');

// A real accepted move supplies a valid Black-to-move state and also checks
// that Move stays on the full-refresh path.
const afterMove = assertRefresh(white, command('MoveCommand', white, { action: 2025 }), false, 'move');
const black = P.set_elapsed(afterMove, 240) as State;
assert.equal(P.snapshot(black).meta.turn, false, 'accepted move changes turn to Black');

let transitions = 1;
for (const [turn, base] of [[true, white], [false, black]] as const) {
  for (const offerer of [true, false]) {
    const label = `${turn ? 'white' : 'black'} turn, ${offerer ? 'White' : 'Black'} offer`;
    const offered = assertRefresh(base, command('OfferCommand', base, { side: offerer }), true, label);
    transitions++;

    const accept = assertRefresh(offered,
      command('AcceptCommand', offered, { side: !offerer }), true, `${label}, accepted by opponent`);
    assert.equal(P.snapshot(accept).meta.outcome, 7, `${label}: agreement becomes terminal`);
    transitions++;

    const decline = assertRefresh(offered,
      command('DeclineCommand', offered, { side: !offerer }), true, `${label}, declined by opponent`);
    assert.equal(P.snapshot(decline).meta.offer, 0, `${label}: decline clears the offer`);
    assert.equal(P.snapshot(decline).meta.outcome, 0, `${label}: decline leaves the match live`);
    transitions++;
  }

  for (const resigningSide of [true, false]) {
    const resigned = assertRefresh(base,
      command('ResignCommand', base, { side: resigningSide }), true,
      `${turn ? 'white' : 'black'} turn, ${resigningSide ? 'White' : 'Black'} resignation`);
    assert.equal(P.snapshot(resigned).meta.outcome, resigningSide ? 8 : 9,
      'resignation recomputes the accepted forced outcome');
    assert.deepEqual(P.legal(resigned), { $: 'Nil' }, 'terminal refresh clears cached legal IDs');
    transitions++;
  }
}

// Undo changes the position and must also take the full-refresh path.
const afterUndo = assertRefresh(black, command('UndoCommand', black), false, 'undo');
assert.equal(P.snapshot(afterUndo).meta.turn, true, 'undo restores White to move');
transitions++;

// Fixed input, bounded warmup, alternating measurement order, and medians make
// this a repeatable warm-JavaScript refresh comparison rather than a cold
// compiler or browser benchmark.
const benchBase = white;
const benchOffer = P.command(benchBase, command('OfferCommand', benchBase, { side: true })).state as State;
const benchMatch = P.game(benchOffer);
const methods = [
  ['full', () => P.refreshed(benchBase, benchMatch)],
  ['cached', () => P.refreshed_same_position(benchBase, benchMatch)],
] as const;
for (let i = 0; i < 4; i++) {
  const full = methods[0][1]();
  const cached = methods[1][1]();
  assert.deepEqual(cached, full, 'warmup refreshes remain equivalent');
}
const samples: Record<'full' | 'cached', number[]> = { full: [], cached: [] };
for (let i = 0; i < 11; i++) {
  const order = i % 2 === 0 ? methods : [methods[1], methods[0]] as const;
  for (const [name, run] of order) {
    const start = performance.now();
    const value = run();
    samples[name].push(performance.now() - start);
    assert.ok(value !== undefined);
  }
}
const median = (values: number[]) => values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)];
const fullMedianMs = median(samples.full);
const cachedMedianMs = median(samples.cached);
const result = {
  ok: true,
  transitions,
  cases: 'Offer/Accept/Decline/Resign for both turn sides and both offered/actor sides; Move and Undo full-refresh controls',
  benchmark: {
    target: 'warm compiled Bend JavaScript; refresh only; deterministic input and alternating order',
    warmupsPerPath: 4,
    samplesPerPath: samples.full.length,
    fullMedianMs,
    cachedMedianMs,
    speedup: cachedMedianMs === 0 ? null : fullMedianMs / cachedMedianMs,
  },
};
console.log(JSON.stringify(result, null, 2));
