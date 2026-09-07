import { describe, expect, it } from 'vitest';
import { HeadlessApi } from '../src/api';
import { suggest } from '../src/bot/search';
import { handleSearchRequest } from '../src/bot/worker';
import { Game, positionHash, repetitionKey } from '../src/match/game';
import type { Position } from '../src/engine/types';

function quietPosition(halfmove = 0): Position {
  const board = Array<number>(64).fill(0);
  board[0] = 6;
  board[1] = 4;
  board[63] = -6;
  return { board, holes: (1 << 5) | (1 << 9), side: 1, castling: 0, ep_target: -1, ep_pawn: -1, halfmove, fullmove: 1 };
}

describe('match controller', () => {
  it('publishes stable metadata and replays complete ID history', () => {
    const game = new Game('B');
    const shift = game.legalActions().find((action) => action.id === 20_825);
    expect(shift).toEqual({ id: 20_825, type: 'shift', from: 'A2', to: 'B2', promotion: null });
    game.step(shift!.id, 0, game.game_id);
    expect(game.actions).toEqual([20_825]);
    expect(game.actionMetadata).toEqual([shift]);
    const record = game.exportRecord();
    const replay = Game.fromRecord(record);
    expect(replay.game_id).not.toBe(game.game_id);
    expect(replay.actions).toEqual(game.actions);
    expect(replay.positionHash()).toBe(positionHash(game.state));
    expect(replay.repetitions).toEqual(game.repetitions);
  });

  it('refuses stale identity or revision without changing the match', () => {
    const game = new Game('B');
    const action = game.legalActions()[0];
    expect(() => game.step(action.id, 1, game.game_id)).toThrow('stale revision');
    expect(() => game.step(action.id, 0, 'other-game')).toThrow('stale game_id');
    expect(game.revision).toBe(0);
    expect(game.actions).toEqual([]);
  });

  it('enforces terminal draw, agreement, and resignation controls', () => {
    const automatic = new Game('B', 'auto100', quietPosition(100));
    expect(automatic.outcome()).toEqual({ result: 'draw', reason: 'progress100', winner: 0 });
    const threefold = new Game('B', 'off', quietPosition());
    threefold.repetitions.set(repetitionKey(threefold.state), 3);
    expect(threefold.outcome()).toEqual({ result: 'draw', reason: 'threefold', winner: 0 });
    const agreement = new Game('B');
    const action = agreement.legalActions()[0];
    agreement.offerDraw(1);
    agreement.acceptDraw(-1);
    expect(agreement.outcome()).toEqual({ result: 'draw', reason: 'agreement', winner: 0 });
    expect(() => agreement.step(action.id)).toThrow('already over');
    const resignation = new Game('B');
    resignation.resign(1);
    expect(resignation.outcome()).toEqual({ result: 'black_win', reason: 'resignation', winner: -1 });
  });

  it('exposes a checked dense legal-action mask through the headless API', () => {
    const api = new HeadlessApi('B');
    const legal = api.legalActions();
    expect(legal.mask).toHaveLength(21_760);
    expect(legal.mask[20_825]).toBe(1);
    const stale = api.dispatch({ command: 'step', game_id: legal.game_id, revision: legal.revision + 1, actor: 1, action_id: 20_825 });
    expect(stale.ok).toBe(false);
  });

  it('returns a legal, identity-bound offline worker suggestion', () => {
    const game = new Game('B');
    const local = suggest(game, { depth: 1, max_nodes: 100, seed: 7 });
    expect(game.legalActions().some((action) => action.id === local.action.id)).toBe(true);
    const reply = handleSearchRequest({
      type: 'suggest', record: game.exportRecord(), game_id: 'caller-snapshot', revision: 41, depth: 1, max_nodes: 100, seed: 7,
    });
    expect(reply).toMatchObject({ type: 'suggestion', game_id: 'caller-snapshot', revision: 41 });
    if (reply.type === 'suggestion') expect(game.legalActions().some((action) => action.id === reply.action.id)).toBe(true);
    expect(handleSearchRequest(null)).toEqual({ type: 'error', game_id: '', revision: -1, error: 'invalid search request' });
  });

  it('rejects corrupt records transactionally, preserving an existing loaded match', () => {
    const source = new Game('B');
    const record = source.exportRecord();
    const missingHash = structuredClone(record) as unknown as Record<string, unknown>;
    delete missingHash.final_position_hash;
    const invalidPosition = structuredClone(record);
    invalidPosition.initial.board[4] = 0;
    const cases: readonly [string, unknown][] = [
      ['extra key', { ...record, unexpected: true }],
      ['missing key', missingHash],
      ['invalid initial position', invalidPosition],
      ['illegal replay action', { ...record, actions: [0] }],
      ['hash mismatch', { ...record, final_position_hash: '0'.repeat(64) }],
      ['invalid override', { ...record, override: { result: 'draw', reason: 'agreement', winner: 1 } }],
      ['invalid pending offer', { ...record, draw_offer: 0 }],
    ];
    const api = new HeadlessApi('C');
    const before = api.observe();
    for (const [name, corrupt] of cases) {
      expect(() => api.load(corrupt), name).toThrow();
      expect(api.observe(), name).toEqual(before);
    }
  });

  it('rebuilds an empty Shift cycle through save/load and adjudicates the third occurrence', () => {
    const game = new Game('B', 'off');
    const forward = game.legalActions().find((action) => action.id === 20_825)!;
    game.step(forward.id);
    const reverse = game.legalActions().find((action) => action.type === 'shift' && action.from === 'B2' && action.to === 'A2')!;
    game.step(reverse.id);
    expect(game.repetitions.get(repetitionKey(game.state))).toBe(2);
    const restored = Game.fromRecord(game.exportRecord());
    expect(restored.repetitions.get(repetitionKey(restored.state))).toBe(2);
    restored.step(restored.legalActions().find((action) => action.id === 20_825)!.id);
    restored.step(restored.legalActions().find((action) => action.id === reverse.id)!.id);
    expect(restored.outcome()).toEqual({ result: 'draw', reason: 'threefold', winner: 0 });
  });

  it('returns an immutable legal fallback when the search budget stops before depth one', () => {
    const game = new Game('B');
    const before = game.observe();
    const result = suggest(game, { depth: 3, max_nodes: 1, seed: 11 });
    expect(game.legalActions().some((action) => action.id === result.action.id)).toBe(true);
    expect(result.completed_depth).toBe(0);
    expect(result.budget_exhausted).toBe(true);
    expect(game.observe()).toEqual(before);
    game.resign(1);
    expect(() => suggest(game, { depth: 1, max_nodes: 1 })).toThrow('no action is available in a terminal game');
  });
});
