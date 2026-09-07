import type { Action, DrawPolicy, GameRecord, Observation, Outcome, Side } from './engine/types';
import { ACTION_ENCODING, ACTION_SPACE_SIZE, Game, RULES_VERSION } from './match/game';
import { suggest, type Suggestion, type SuggestOptions } from './bot/search';

export const API_VERSION = 'rift-api/1';

export interface LegalActionsResponse {
  game_id: string;
  revision: number;
  actions: Action[];
  /** Dense rift-action/1 mask, indexable from 0 through 21759. */
  mask: number[];
}

export interface ApiRequest {
  id?: string | number | null;
  version?: typeof API_VERSION;
  command: string;
  game_id?: string;
  revision?: number;
  actor?: Side;
  action_id?: number;
  layout?: 'B' | 'C';
  draw_policy?: DrawPolicy;
  record?: unknown;
  depth?: number;
  max_nodes?: number;
  seed?: number;
}

export type ApiResponse =
  | { id: string | number | null; version: typeof API_VERSION; ok: true; result: unknown }
  | { id: string | number | null; version: typeof API_VERSION; ok: false; error: { code: 'invalid_request'; message: string } };

function requestId(value: unknown): string | number | null {
  if (value === undefined || value === null || typeof value === 'string' || (typeof value === 'number' && Number.isSafeInteger(value))) return value ?? null;
  throw new Error('request id must be a string, integer or null');
}

function assertActor(actor: unknown): asserts actor is Side {
  if (actor !== 1 && actor !== -1) throw new Error('actor must be +1 or -1');
}

/** In-process versioned command boundary. It contains no socket, port, or network behavior. */
export class HeadlessApi {
  game: Game;

  constructor(layout: 'B' | 'C' = 'B', drawPolicy: DrawPolicy = 'prompt') {
    this.game = new Game(layout, drawPolicy);
  }

  reset(layout: 'B' | 'C' = 'B', drawPolicy: DrawPolicy = 'prompt'): Observation {
    this.game = new Game(layout, drawPolicy);
    return this.game.observe();
  }

  observe(): Observation { return this.game.observe(); }

  legalActions(): LegalActionsResponse {
    const actions = this.game.legalActions();
    const mask = Array<number>(ACTION_SPACE_SIZE).fill(0);
    for (const action of actions) mask[action.id] = 1;
    return { game_id: this.game.game_id, revision: this.game.revision, actions, mask };
  }

  step(actionId: unknown, actor: unknown, revision: unknown, gameId: unknown): Observation & { last_action: Action } {
    assertActor(actor);
    if (actor !== this.game.state.side) throw new Error('actor is not the side to move');
    return this.game.step(actionId, revision as number, gameId as string);
  }

  result(): Outcome | null { return this.game.outcome(); }

  exportRecord(): GameRecord { return this.game.exportRecord(); }

  load(record: unknown): Observation {
    this.game = Game.fromRecord(record);
    return this.game.observe();
  }

  suggest(options: SuggestOptions = {}): Suggestion { return suggest(this.game, options); }

  private requireIdentity(request: ApiRequest): void {
    if (typeof request.game_id !== 'string' || !Number.isSafeInteger(request.revision)) {
      throw new Error('mutating commands require game_id and revision');
    }
    if (request.game_id !== this.game.game_id) throw new Error('stale game_id');
    if (request.revision !== this.game.revision) throw new Error('stale revision');
  }

  dispatch(input: unknown): ApiResponse {
    let id: string | number | null = null;
    try {
      if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new Error('request must be an object');
      const request = input as ApiRequest;
      id = requestId(request.id);
      if (request.version !== undefined && request.version !== API_VERSION) throw new Error('unsupported API version');
      if (typeof request.command !== 'string') throw new Error('request must contain a string command');
      let result: unknown;
      switch (request.command) {
        case 'new':
          result = this.reset(request.layout ?? 'B', request.draw_policy ?? 'prompt');
          break;
        case 'reset':
          this.requireIdentity(request);
          result = this.reset(request.layout ?? 'B', request.draw_policy ?? 'prompt');
          break;
        case 'observe': result = this.observe(); break;
        case 'legal': result = this.legalActions(); break;
        case 'result': result = this.result(); break;
        case 'export': result = this.exportRecord(); break;
        case 'step':
          this.requireIdentity(request);
          result = this.step(request.action_id, request.actor, request.revision, request.game_id);
          break;
        case 'undo':
          this.requireIdentity(request);
          assertActor(request.actor);
          result = this.game.undo(request.revision, request.game_id);
          break;
        case 'offer_draw':
          this.requireIdentity(request);
          result = this.game.offerDraw(request.actor, request.revision, request.game_id);
          break;
        case 'accept_draw':
          this.requireIdentity(request);
          result = this.game.acceptDraw(request.actor, request.revision, request.game_id);
          break;
        case 'decline_draw':
          this.requireIdentity(request);
          result = this.game.declineDraw(request.actor, request.revision, request.game_id);
          break;
        case 'resign':
          this.requireIdentity(request);
          result = this.game.resign(request.actor, request.revision, request.game_id);
          break;
        case 'load':
          this.requireIdentity(request);
          result = this.load(request.record);
          break;
        case 'suggest':
          this.requireIdentity(request);
          result = this.suggest({ depth: request.depth, max_nodes: request.max_nodes, seed: request.seed });
          break;
        default: throw new Error('unknown command');
      }
      return { id, version: API_VERSION, ok: true, result };
    } catch (error) {
      return { id, version: API_VERSION, ok: false, error: { code: 'invalid_request', message: error instanceof Error ? error.message : 'invalid request' } };
    }
  }
}

/** Small convenience function for process adapters and tests. */
export function dispatch(api: HeadlessApi, request: unknown): ApiResponse {
  return api.dispatch(request);
}

export { ACTION_ENCODING, RULES_VERSION };
