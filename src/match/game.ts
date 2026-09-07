import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import {
  applyGeneratedAction, clonePosition, inCheck, initialPosition, legalActions as generateLegalActions, validatePosition,
} from '../engine/position';
import type { Action, DrawPolicy, GameRecord, Observation, Outcome, Position, Side } from '../engine/types';

export const RULES_VERSION = 'rift-chess/1.0';
export const RECORD_VERSION = 'rift-record/1';
export const ACTION_ENCODING = 'rift-action/1';
export const ACTION_SPACE_SIZE = 21_760;

const POSITION_KEYS = ['board', 'holes', 'side', 'castling', 'ep_target', 'ep_pawn', 'halfmove', 'fullmove'] as const;
const RECORD_KEYS = ['schema', 'rules_version', 'action_encoding', 'draw_policy', 'initial', 'actions', 'draw_offer', 'override', 'final_position_hash'] as const;
const DRAW_POLICIES: readonly DrawPolicy[] = ['prompt', 'auto100', 'off'];

function ownExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function integer(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function asSide(value: unknown): Side {
  if (value !== 1 && value !== -1) throw new Error('actor must be +1 or -1');
  return value;
}

function asDrawPolicy(value: unknown): DrawPolicy {
  if (!DRAW_POLICIES.includes(value as DrawPolicy)) throw new Error('draw_policy must be prompt, auto100, or off');
  return value as DrawPolicy;
}

function newGameId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID().replaceAll('-', '');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function cloneOutcome(outcome: Outcome): Outcome {
  return { result: outcome.result, reason: outcome.reason, winner: outcome.winner };
}

function sameOutcome(left: Outcome, right: Outcome): boolean {
  return left.result === right.result && left.reason === right.reason && left.winner === right.winner;
}

function actionHasLegalEnPassant(actions: readonly Action[]): boolean {
  return actions.some((action) => action.type === 'move' && action.en_passant === true);
}

/** Canonical JSON identity used for repetition and the SHA-256 diagnostic hash. */
export function repetitionKey(position: Position, actions: readonly Action[] = generateLegalActions(position)): string {
  const effectiveEp = position.ep_target >= 0 && actionHasLegalEnPassant(actions)
    ? [position.ep_target, position.ep_pawn]
    : [-1, -1];
  return JSON.stringify([RULES_VERSION, position.board, position.holes, position.side, position.castling, ...effectiveEp]);
}

export function positionHash(position: Position, actions?: readonly Action[]): string {
  return bytesToHex(sha256(new TextEncoder().encode(repetitionKey(position, actions))));
}

function isBareKings(position: Position): boolean {
  return position.board.every((piece) => piece === 0 || Math.abs(piece) === 6);
}

/** Board-only adjudication. Repetition history remains caller-owned. */
export function boardOutcome(
  position: Position, repetitions: ReadonlyMap<string, number>, drawPolicy: DrawPolicy,
  actions: readonly Action[] = generateLegalActions(position),
): Outcome | null {
  if (actions.length === 0) {
    if (inCheck(position, position.side)) {
      const winner = (position.side === 1 ? -1 : 1) as Side;
      return { result: winner === 1 ? 'white_win' : 'black_win', reason: 'checkmate', winner };
    }
    return { result: 'draw', reason: 'stalemate', winner: 0 };
  }
  if (isBareKings(position)) return { result: 'draw', reason: 'bare_kings', winner: 0 };
  if ((repetitions.get(repetitionKey(position, actions)) ?? 0) >= 3) return { result: 'draw', reason: 'threefold', winner: 0 };
  if (drawPolicy === 'auto100' && position.halfmove >= 100) return { result: 'draw', reason: 'progress100', winner: 0 };
  return null;
}

function copyPosition(position: Position): Position {
  return clonePosition(position);
}

function normalizePosition(input: unknown): Position {
  if (!ownExactKeys(input, POSITION_KEYS)) throw new Error('invalid position schema');
  validatePosition(input);
  return copyPosition(input);
}

function parseOutcome(input: unknown): Outcome | null {
  if (input === null) return null;
  if (!ownExactKeys(input, ['result', 'reason', 'winner'])) throw new Error('invalid terminal override');
  const result = input.result;
  const reason = input.reason;
  const winner = input.winner;
  if ((result !== 'draw' && result !== 'white_win' && result !== 'black_win') || typeof reason !== 'string' || !integer(winner)) {
    throw new Error('invalid terminal override');
  }
  const outcome: Outcome = { result, reason, winner: winner as Side | 0 };
  const allowed: Outcome[] = [
    { result: 'draw', reason: 'agreement', winner: 0 },
    { result: 'white_win', reason: 'resignation', winner: 1 },
    { result: 'black_win', reason: 'resignation', winner: -1 },
  ];
  if (!allowed.some((candidate) => sameOutcome(candidate, outcome))) throw new Error('invalid terminal override');
  return outcome;
}

export class Game {
  state: Position;
  initial: Position;
  states: Position[];
  actions: number[];
  /** Readable metadata parallel to `actions`; IDs remain the canonical replay history. */
  actionMetadata: Action[];
  repetitions: Map<string, number>;
  game_id: string;
  revision: number;
  draw_offer: Side | null;
  override: Outcome | null;
  draw_policy: DrawPolicy;

  private cachedState: Position | null = null;
  private cachedActions: Action[] = [];

  constructor(layout: 'B' | 'C' = 'B', drawPolicy: DrawPolicy = 'prompt', state?: Position) {
    if (layout !== 'B' && layout !== 'C') throw new Error('layout must be B or C');
    this.draw_policy = asDrawPolicy(drawPolicy);
    this.state = state === undefined ? initialPosition(layout) : normalizePosition(state);
    validatePosition(this.state);
    this.initial = copyPosition(this.state);
    this.states = [copyPosition(this.state)];
    this.actions = [];
    this.actionMetadata = [];
    this.repetitions = new Map([[repetitionKey(this.state), 1]]);
    this.game_id = newGameId();
    this.revision = 0;
    this.draw_offer = null;
    this.override = null;
  }

  private generatedActions(): Action[] {
    if (this.cachedState !== this.state) {
      this.cachedState = this.state;
      this.cachedActions = generateLegalActions(this.state);
    }
    return this.cachedActions;
  }

  private guard(expectedRevision?: number, gameId?: string, allowTerminal = false): void {
    if (gameId !== undefined && (typeof gameId !== 'string' || gameId !== this.game_id)) throw new Error('stale game_id');
    if (expectedRevision !== undefined && (!integer(expectedRevision) || expectedRevision !== this.revision)) throw new Error('stale revision');
    if (!allowTerminal && this.outcome() !== null) throw new Error('the game is already over');
  }

  outcome(): Outcome | null {
    return this.override ? cloneOutcome(this.override) : boardOutcome(this.state, this.repetitions, this.draw_policy, this.generatedActions());
  }

  positionHash(): string {
    return positionHash(this.state, this.generatedActions());
  }

  legalActions(): Action[] {
    return this.outcome() === null ? this.generatedActions().map((action) => ({ ...action })) : [];
  }

  observe(): Observation {
    const actions = this.generatedActions();
    const outcome = this.override ? cloneOutcome(this.override) : boardOutcome(this.state, this.repetitions, this.draw_policy, actions);
    return {
      rules_version: RULES_VERSION,
      action_encoding: ACTION_ENCODING,
      game_id: this.game_id,
      revision: this.revision,
      position: copyPosition(this.state),
      position_hash: positionHash(this.state, actions),
      outcome,
      in_check: inCheck(this.state, this.state.side),
      draw_policy: this.draw_policy,
      draw_offer: this.draw_offer,
      draw_prompt_available: this.draw_policy === 'prompt' && this.state.halfmove >= 100 && outcome === null,
      repetition_count: this.repetitions.get(repetitionKey(this.state, actions)) ?? 0,
      legal_action_count: outcome === null ? actions.length : 0,
    };
  }

  step(identifier: unknown, expectedRevision?: number, gameId?: string): Observation & { last_action: Action } {
    this.guard(expectedRevision, gameId);
    if (!integer(identifier)) throw new Error('action_id must be an integer');
    const action = this.generatedActions().find((candidate) => candidate.id === identifier);
    if (!action) throw new Error('illegal action_id for this position');
    const next = applyGeneratedAction(this.state, action);
    validatePosition(next);
    this.state = next;
    this.states.push(copyPosition(next));
    this.actions.push(identifier);
    this.actionMetadata.push({ ...action });
    const key = repetitionKey(next);
    this.repetitions.set(key, (this.repetitions.get(key) ?? 0) + 1);
    this.draw_offer = null;
    this.revision += 1;
    return { ...this.observe(), last_action: { ...action } };
  }

  undo(expectedRevision?: number, gameId?: string): Observation {
    this.guard(expectedRevision, gameId, true);
    if (this.actions.length === 0) throw new Error('no board action to undo');
    const currentKey = repetitionKey(this.state);
    const count = this.repetitions.get(currentKey) ?? 0;
    if (count <= 1) this.repetitions.delete(currentKey); else this.repetitions.set(currentKey, count - 1);
    this.states.pop();
    this.actions.pop();
    this.actionMetadata.pop();
    this.state = copyPosition(this.states[this.states.length - 1]);
    this.draw_offer = null;
    this.override = null;
    this.revision += 1;
    return this.observe();
  }

  offerDraw(actor: unknown, expectedRevision?: number, gameId?: string): Observation {
    this.guard(expectedRevision, gameId);
    const side = asSide(actor);
    if (this.draw_offer !== null) throw new Error('a draw offer is already pending');
    this.draw_offer = side;
    this.revision += 1;
    return this.observe();
  }

  acceptDraw(actor: unknown, expectedRevision?: number, gameId?: string): Observation {
    this.guard(expectedRevision, gameId);
    const side = asSide(actor);
    if (this.draw_offer !== -side) throw new Error('only the other player may accept a pending offer');
    this.override = { result: 'draw', reason: 'agreement', winner: 0 };
    this.draw_offer = null;
    this.revision += 1;
    return this.observe();
  }

  declineDraw(actor: unknown, expectedRevision?: number, gameId?: string): Observation {
    this.guard(expectedRevision, gameId);
    const side = asSide(actor);
    if (this.draw_offer !== -side) throw new Error('no opponent offer is available to decline');
    this.draw_offer = null;
    this.revision += 1;
    return this.observe();
  }

  resign(actor: unknown, expectedRevision?: number, gameId?: string): Observation {
    this.guard(expectedRevision, gameId);
    const side = asSide(actor);
    this.override = side === 1
      ? { result: 'black_win', reason: 'resignation', winner: -1 }
      : { result: 'white_win', reason: 'resignation', winner: 1 };
    this.draw_offer = null;
    this.revision += 1;
    return this.observe();
  }

  exportRecord(): GameRecord {
    return {
      schema: RECORD_VERSION,
      rules_version: RULES_VERSION,
      action_encoding: ACTION_ENCODING,
      draw_policy: this.draw_policy,
      initial: copyPosition(this.initial),
      actions: [...this.actions],
      draw_offer: this.draw_offer,
      override: this.override ? cloneOutcome(this.override) : null,
      final_position_hash: positionHash(this.state),
    };
  }

  static fromRecord(input: unknown): Game {
    if (!ownExactKeys(input, RECORD_KEYS)) throw new Error('invalid record schema');
    if (input.schema !== RECORD_VERSION || input.rules_version !== RULES_VERSION || input.action_encoding !== ACTION_ENCODING) {
      throw new Error('unsupported record/rules/action version');
    }
    const actions = input.actions;
    if (!Array.isArray(actions) || actions.length > 20_000 || actions.some((identifier) => !integer(identifier))) {
      throw new Error('invalid or oversized action history');
    }
    if (typeof input.final_position_hash !== 'string' || !/^[0-9a-f]{64}$/.test(input.final_position_hash)) {
      throw new Error('invalid final position hash');
    }
    const game = new Game('B', asDrawPolicy(input.draw_policy), normalizePosition(input.initial));
    for (const identifier of actions) game.step(identifier);
    if (positionHash(game.state) !== input.final_position_hash) throw new Error('record hash mismatch');
    const override = parseOutcome(input.override);
    if (override) {
      if (game.outcome() !== null) throw new Error('invalid terminal override for position');
      game.override = override;
    }
    if (input.draw_offer !== null) {
      const offer = asSide(input.draw_offer);
      if (game.outcome() !== null) throw new Error('invalid pending draw offer');
      game.draw_offer = offer;
    }
    return game;
  }
}
