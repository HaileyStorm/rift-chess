import { applyGeneratedAction, legalActions } from '../engine/position';
import type { Action, Position, Side } from '../engine/types';
import { boardOutcome, Game, repetitionKey } from '../match/game';

export interface Suggestion {
  game_id: string;
  revision: number;
  position_hash: string;
  action: Action;
  completed_depth: number;
  nodes: number;
  score: number | null;
  elapsed_ms: number;
  budget_exhausted: boolean;
}

export interface SuggestOptions {
  depth?: number;
  max_nodes?: number;
  seed?: number;
}

class SearchBudgetExceeded extends Error {}

const MATERIAL: Readonly<Record<number, number>> = { 1: 100, 2: 320, 3: 330, 4: 500, 5: 900, 6: 0 };
const KNIGHT_PST = [
  -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 5, 5, 0, -20, -40,
  -30, 5, 10, 15, 15, 10, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30,
  -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 10, 15, 15, 10, 0, -30,
  -40, -20, 0, 0, 0, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50,
];
const PAWN_PST = [
  0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, -20, -20, 10, 10, 5,
  5, -5, -10, 0, 0, -10, -5, 5, 0, 0, 0, 20, 20, 0, 0, 0,
  5, 5, 10, 25, 25, 10, 5, 5, 10, 10, 20, 30, 30, 20, 10, 10,
  50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0,
];

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function shuffle<T>(items: T[], random: () => number): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [items[index], items[target]] = [items[target], items[index]];
  }
}

function pieceSquare(type: number, square: number, side: Side): number {
  const oriented = side === 1 ? square : (7 - Math.floor(square / 8)) * 8 + (square % 8);
  if (type === 1) return PAWN_PST[oriented];
  if (type === 2) return KNIGHT_PST[oriented];
  if (type === 3) return Math.abs((oriented & 7) - 3.5) + Math.abs((oriented >> 3) - 3.5) < 5 ? 8 : 0;
  if (type === 4) return (oriented >> 3) === 6 ? 8 : 0;
  if (type === 5) return Math.abs((oriented & 7) - 3.5) + Math.abs((oriented >> 3) - 3.5) < 4 ? 5 : 0;
  return 0;
}

function typeOf(piece: number): number {
  const type = Math.abs(piece);
  return type === 7 ? 1 : type;
}

function staticEvaluation(position: Position, perspective: Side): number {
  let score = 0;
  for (let square = 0; square < 64; square += 1) {
    const piece = position.board[square];
    if (piece === 0) continue;
    const side = (piece > 0 ? 1 : -1) as Side;
    const type = typeOf(piece);
    score += side * ((MATERIAL[type] ?? 0) + pieceSquare(type, square, side));
  }
  // Mobility is intentionally modest: every Shift is a full tactical action, not quiet filler.
  const mobility = legalActions(position).length;
  score += position.side * mobility * 2;
  return score * perspective;
}

function orderScore(position: Position, action: Action): number {
  let score = action.type === 'shift' ? 12 : 0;
  if (action.promotion) score += MATERIAL[{ Q: 5, R: 4, B: 3, N: 2 }[action.promotion]] ?? 0;
  if (action.type === 'move') {
    const destination = action.to.charCodeAt(0) - 97 + (Number(action.to[1]) - 1) * 8;
    const source = action.from.charCodeAt(0) - 97 + (Number(action.from[1]) - 1) * 8;
    const moving = typeOf(position.board[source]);
    const captured = action.en_passant ? 1 : typeOf(position.board[destination]);
    score += captured * 32 - moving;
    if (action.castle) score += 16;
  }
  return score;
}

function requireOptions(options: SuggestOptions): Required<SuggestOptions> {
  const depth = options.depth ?? 2;
  const maxNodes = options.max_nodes ?? 10_000;
  const seed = options.seed ?? 0;
  if (!Number.isSafeInteger(depth) || depth < 1 || depth > 3) throw new Error('depth must be 1..3');
  if (!Number.isSafeInteger(maxNodes) || maxNodes < 1 || maxNodes > 1_000_000) throw new Error('max_nodes must be 1..1000000');
  if (!Number.isSafeInteger(seed)) throw new Error('seed must be an integer');
  return { depth, max_nodes: maxNodes, seed };
}

/** Full-width, bounded local alpha-beta. It never performs UI or network work. */
export function suggest(game: Game, options: SuggestOptions = {}): Suggestion {
  const { depth, max_nodes: maxNodes, seed } = requireOptions(options);
  const roots = game.legalActions();
  if (roots.length === 0) throw new Error('no action is available in a terminal game');
  const started = performance.now();
  const random = seededRandom(seed);
  shuffle(roots, random);
  roots.sort((left, right) => orderScore(game.state, right) - orderScore(game.state, left));
  const repetitions = new Map(game.repetitions);
  let nodes = 0;
  let chosen = roots[0];
  let value: number | null = null;
  let completedDepth = 0;

  const search = (position: Position, remaining: number, alphaStart: number, beta: number, ply: number): number => {
    if (nodes >= maxNodes) throw new SearchBudgetExceeded();
    nodes += 1;
    const actions = legalActions(position);
    const outcome = boardOutcome(position, repetitions, game.draw_policy, actions);
    if (outcome) return outcome.winner === 0 ? 0 : (100_000 - ply) * outcome.winner * position.side;
    if (remaining === 0) return staticEvaluation(position, position.side);
    actions.sort((left, right) => orderScore(position, right) - orderScore(position, left));
    let best = -Infinity;
    let alpha = alphaStart;
    for (const action of actions) {
      const next = applyGeneratedAction(position, action);
      const key = repetitionKey(next);
      repetitions.set(key, (repetitions.get(key) ?? 0) + 1);
      let score: number;
      try {
        score = -search(next, remaining - 1, -beta, -alpha, ply + 1);
      } finally {
        const count = repetitions.get(key) ?? 0;
        if (count <= 1) repetitions.delete(key); else repetitions.set(key, count - 1);
      }
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return best;
  };

  for (let iteration = 1; iteration <= depth; iteration += 1) {
    let iterationBest = -Infinity;
    let iterationAction = roots[0];
    let alpha = -Infinity;
    try {
      for (const action of roots) {
        const next = applyGeneratedAction(game.state, action);
        const key = repetitionKey(next);
        repetitions.set(key, (repetitions.get(key) ?? 0) + 1);
        let score: number;
        try {
          score = -search(next, iteration - 1, -Infinity, -alpha, 1);
        } finally {
          const count = repetitions.get(key) ?? 0;
          if (count <= 1) repetitions.delete(key); else repetitions.set(key, count - 1);
        }
        if (score > iterationBest) {
          iterationBest = score;
          iterationAction = action;
        }
        if (score > alpha) alpha = score;
      }
    } catch (error) {
      if (!(error instanceof SearchBudgetExceeded)) throw error;
      break;
    }
    chosen = iterationAction;
    value = iterationBest;
    completedDepth = iteration;
    roots.splice(roots.indexOf(chosen), 1);
    roots.unshift(chosen);
  }

  return {
    game_id: game.game_id,
    revision: game.revision,
    position_hash: game.observe().position_hash,
    action: { ...chosen },
    completed_depth: completedDepth,
    nodes,
    score: value,
    elapsed_ms: Math.round((performance.now() - started) * 1_000) / 1_000,
    budget_exhausted: completedDepth < depth,
  };
}
