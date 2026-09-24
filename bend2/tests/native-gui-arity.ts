import assert from 'node:assert/strict';
import P from './program';

const list = (xs: any[]) => xs.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
const array = (xs: any) => {
  const out: any[] = [];
  while (xs.$ === 'Con') { out.push(xs.head); xs = xs.tail; }
  return out;
};

function commandState(): any {
  const state = P.start('', '', 1024, 768).state;
  const board = Array(64).fill(0);
  board[0] = 6;  // White king
  board[63] = 14; // Black king
  board[8] = 4;  // White rook on a2
  board[16] = 9; // Black pawn on a3
  const position = {
    ...P.pos(state), board: list(board), side: true,
    rights: 0, ep: 64, epPawn: 64, quiet: 0n, full: 1n,
  };
  return P.refreshed(state, {
    ...P.game(state), initial: position, state: position,
    actions: list([]), states: list([position]), keys: list([]),
  });
}

function moveSound(id: number, target: number, captured: boolean): number {
  const state = commandState();
  const position = P.pos(state);
  const board = array(position.board);
  assert.equal(board[target] !== 0, captured, 'reference old-board capture predicate');
  const legal = array(P.legal(state));
  assert.ok(legal.includes(id), `fixture action ${id} must be legal`);

  const update = P.request_move(state, id);
  assert.equal(P.snapshot(update.state).meta.revision, 1);
  const sounds = array(update.effects).filter((effect: any) => effect.$ === 'Sound');
  assert.equal(sounds.length, 1, 'an enabled ordinary move emits exactly one sound effect');
  const notes = array(sounds[0].notes);
  assert.equal(notes.length, captured ? 3 : 2);
  return notes[0].frequency;
}

// Both are kernel-accepted positions without check or terminal override.
// The UI derives capture from the pre-move board, then chooses its Bend cue.
assert.equal(moveSound(8 * 320 + 16 * 5, 16, true), Math.fround(174.61));
assert.equal(moveSound(8 * 320 + 9 * 5, 9, false), 392);

console.log('native-gui-arity: accepted capture and quiet move choose distinct Bend cues');
