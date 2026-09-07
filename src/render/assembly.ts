export interface TilePlacement {
  tile: number;
  slot: number;
}

export interface AssemblySlide {
  tile: number;
  from: number;
  to: number;
}

export interface AssemblyPlan {
  targetHoles: number;
  placements: readonly TilePlacement[];
  solveSteps: readonly AssemblySlide[];
}

const SLOT_COUNT = 16;
const SLIDE_COUNT = 24;

function xorshift32(seed: number): () => number {
  let state = seed === 0 ? 0x9e3779b9 : seed;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}

function bitCount(mask: number): number {
  let count = 0;
  while (mask !== 0) {
    count += mask & 1;
    mask >>>= 1;
  }
  return count;
}

function adjacentSlots(slot: number): number[] {
  const slots: number[] = [];
  if (slot % 4 !== 0) slots.push(slot - 1);
  if (slot % 4 !== 3) slots.push(slot + 1);
  if (slot >= 4) slots.push(slot - 4);
  if (slot < 12) slots.push(slot + 4);
  return slots;
}

function isSolved(board: readonly (number | null)[], targetHoles: number): boolean {
  return board.every((tile, slot) => ((targetHoles & (1 << slot)) !== 0 ? tile === null : tile === slot));
}

function validateInputs(targetHoles: number, seed: number): void {
  if (!Number.isInteger(targetHoles) || targetHoles < 0 || targetHoles > 0xffff || bitCount(targetHoles) !== 2) {
    throw new Error('targetHoles must be a 16-bit mask with exactly two holes');
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('seed must be a uint32');
}

/** Creates a shuffled tile board and the slides that restore its target arrangement. */
export function planAssembly(targetHoles: number, seed: number): AssemblyPlan {
  validateInputs(targetHoles, seed);
  const board: Array<number | null> = Array.from({ length: SLOT_COUNT }, (_, slot) => (
    (targetHoles & (1 << slot)) !== 0 ? null : slot
  ));
  const random = xorshift32(seed);
  const forward: AssemblySlide[] = [];

  for (let move = 0; move < SLIDE_COUNT; move += 1) {
    const candidates: AssemblySlide[] = [];
    for (let to = 0; to < SLOT_COUNT; to += 1) {
      if (board[to] !== null) continue;
      for (const from of adjacentSlots(to)) {
        const tile = board[from];
        if (tile !== null) candidates.push({ tile, from, to });
      }
    }
    const previous = forward.at(-1);
    const withoutUndo = previous === undefined ? candidates : candidates.filter((candidate) => !(
      candidate.tile === previous.tile && candidate.from === previous.to && candidate.to === previous.from
    ));
    const movable = withoutUndo.length === 0 ? candidates : withoutUndo;
    const choices = move === SLIDE_COUNT - 1
      ? movable.filter((candidate) => {
        board[candidate.from] = null;
        board[candidate.to] = candidate.tile;
        const solvesBoard = isSolved(board, targetHoles);
        board[candidate.from] = candidate.tile;
        board[candidate.to] = null;
        return !solvesBoard;
      })
      : movable;
    const options = choices.length === 0 ? movable : choices;
    const selected = options[Math.floor(random() / 0x1_0000_0000 * options.length)];
    board[selected.from] = null;
    board[selected.to] = selected.tile;
    forward.push(selected);
  }

  return {
    targetHoles,
    placements: board.flatMap((tile, slot) => tile === null ? [] : [{ tile, slot }]),
    solveSteps: forward.reverse().map(({ tile, from, to }) => ({ tile, from: to, to: from })),
  };
}
