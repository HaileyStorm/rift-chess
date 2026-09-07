import { Game } from '../match/game';
import { suggest, type Suggestion } from './search';

export interface SearchRequest {
  type: 'suggest';
  record: unknown;
  game_id: string;
  revision: number;
  depth?: number;
  max_nodes?: number;
  seed?: number;
}

export interface SearchError {
  type: 'error';
  game_id: string;
  revision: number;
  error: string;
}

export interface SearchSuccess extends Suggestion {
  type: 'suggestion';
}

export type SearchResponse = SearchSuccess | SearchError;

function validIdentity(request: Partial<SearchRequest>): request is SearchRequest {
  return typeof request.game_id === 'string' && Number.isSafeInteger(request.revision);
}

/** Synchronous worker entry point; callers own cancellation by discarding stale identities. */
export function handleSearchRequest(input: unknown): SearchResponse {
  const request: Partial<SearchRequest> = typeof input === 'object' && input !== null && !Array.isArray(input)
    ? input as Partial<SearchRequest>
    : {};
  const gameId = validIdentity(request) ? request.game_id : '';
  const revision = validIdentity(request) ? request.revision : -1;
  try {
    if (typeof input !== 'object' || input === null || Array.isArray(input)
      || request.type !== 'suggest' || !validIdentity(request)) {
      throw new Error('invalid search request');
    }
    const game = Game.fromRecord(request.record);
    const result = suggest(game, { depth: request.depth, max_nodes: request.max_nodes, seed: request.seed });
    // Records deliberately create a new local session; bind the reply to the caller snapshot instead.
    return { ...result, type: 'suggestion', game_id: request.game_id, revision: request.revision };
  } catch (error) {
    return { type: 'error', game_id: gameId, revision, error: error instanceof Error ? error.message : 'search failed' };
  }
}

const workerScope = globalThis as typeof globalThis & {
  postMessage?: (message: SearchResponse) => void;
  addEventListener?: (type: 'message', listener: (event: MessageEvent<unknown>) => void) => void;
  document?: unknown;
};

if (typeof workerScope.document === 'undefined' && typeof workerScope.postMessage === 'function' && typeof workerScope.addEventListener === 'function') {
  workerScope.addEventListener('message', (event) => workerScope.postMessage?.(handleSearchRequest(event.data)));
}
