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
const CANDIDATE_COUNT = 16;
const SLIDE_COUNT = 48;

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

function validateInputs(targetHoles: number, seed: number): void {
  if (!Number.isInteger(targetHoles) || targetHoles < 0 || targetHoles > 0xffff || bitCount(targetHoles) !== 2) {
    throw new Error('targetHoles must be a 16-bit mask with exactly two holes');
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('seed must be a uint32');
}

function scramble(board: Array<number | null>, random: () => number): AssemblySlide[] {
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
    const options = withoutUndo.length === 0 ? candidates : withoutUndo;
    const selected = options[Math.floor(random() / 0x1_0000_0000 * options.length)];
    board[selected.from] = null;
    board[selected.to] = selected.tile;
    forward.push(selected);
  }
  return forward;
}

function mixingScore(board: readonly (number | null)[]): readonly [number, number] {
  let displaced = 0, distance = 0;
  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    const tile = board[slot];
    if (tile === null) continue;
    const delta = Math.abs(slot % 4 - tile % 4) + Math.abs(Math.floor(slot / 4) - Math.floor(tile / 4));
    if (delta !== 0) displaced += 1;
    distance += delta;
  }
  return [displaced, distance];
}

/** Creates a shuffled tile board and the slides that restore its target arrangement. */
export function planAssembly(targetHoles: number, seed: number): AssemblyPlan {
  validateInputs(targetHoles, seed);
  const solved: Array<number | null> = Array.from({ length: SLOT_COUNT }, (_, slot) => (
    (targetHoles & (1 << slot)) !== 0 ? null : slot
  ));
  const random = xorshift32(seed);
  let board = solved;
  let forward: AssemblySlide[] = [];
  let score: readonly [number, number] = [-1, -1];
  for (let candidate = 0; candidate < CANDIDATE_COUNT; candidate += 1) {
    const next = [...solved], steps = scramble(next, random), nextScore = mixingScore(next);
    if (nextScore[0] > score[0] || nextScore[0] === score[0] && nextScore[1] > score[1]) {
      board = next; forward = steps; score = nextScore;
    }
  }

  return {
    targetHoles,
    placements: board.flatMap((tile, slot) => tile === null ? [] : [{ tile, slot }]),
    solveSteps: forward.reverse().map(({ tile, from, to }) => ({ tile, from: to, to: from })),
  };
}
