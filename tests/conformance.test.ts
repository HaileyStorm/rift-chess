import { describe, expect, it } from 'vitest';
import conformanceJson from '../fixtures/conformance.json';
import gamesJson from '../research/fresh/games.json';
import { applyGeneratedAction, initialPosition, legalActions } from '../src/engine/position';
import { Game, positionHash } from '../src/match/game';
import type { Action, GameRecord, Outcome, Position } from '../src/engine/types';

type Child = {
  action: Action;
  position: Position;
  hash: string;
  outcome: Outcome | null;
};

type Fixture = {
  name: string;
  record: GameRecord;
  position_hash: string;
  legal_action_ids: number[];
  children: Child[];
};

type SavedGame = {
  plies: number;
  outcome: Outcome | null;
  truncated: boolean;
  record: GameRecord;
};

const fixtures = (conformanceJson as { fixtures: Fixture[] }).fixtures;
const savedGames = gamesJson as SavedGame[];

function orthodoxPerft(position: Position, depth: number): number {
  if (depth === 0) return 1;
  return legalActions(position).reduce(
    (nodes, action) => nodes + orthodoxPerft(applyGeneratedAction(position, action), depth - 1),
    0,
  );
}

describe('reference conformance', () => {
  it('matches every fixture legal action and complete successor state', () => {
    expect(fixtures).toHaveLength(14);
    let successors = 0;

    for (const fixture of fixtures) {
      const game = Game.fromRecord(fixture.record);
      expect(positionHash(game.state), fixture.name).toBe(fixture.position_hash);

      const legalById = new Map(game.legalActions().map((action) => [action.id, action]));
      expect([...legalById.keys()].sort((a, b) => a - b), fixture.name).toEqual(fixture.legal_action_ids);
      expect(fixture.children.map((child) => child.action.id).sort((a, b) => a - b), fixture.name)
        .toEqual(fixture.legal_action_ids);

      for (const child of fixture.children) {
        const action = legalById.get(child.action.id);
        expect(action, `${fixture.name} action ${child.action.id}`).toEqual(child.action);

        const successor = Game.fromRecord(fixture.record);
        successor.step(child.action.id);
        expect(successor.state, `${fixture.name} successor ${child.action.id} position`).toEqual(child.position);
        expect(positionHash(successor.state), `${fixture.name} successor ${child.action.id} hash`).toBe(child.hash);
        expect(successor.outcome(), `${fixture.name} successor ${child.action.id} outcome`).toEqual(child.outcome);
        successors += 1;
      }
    }

    expect(successors).toBe(223);
  }, 120_000);

  it('replays every saved history with its declared terminal status', () => {
    expect(savedGames).toHaveLength(120);
    let plies = 0;

    for (const saved of savedGames) {
      expect(saved.record.actions).toHaveLength(saved.plies);
      const game = Game.fromRecord(saved.record);
      expect(positionHash(game.state)).toBe(saved.record.final_position_hash);
      expect(game.outcome()).toEqual(saved.outcome);
      expect(game.outcome() === null).toBe(saved.truncated);
      plies += saved.plies;
    }

    expect(plies).toBe(14_290);
  }, 120_000);

  it('retains orthodox opening perft through depth three', () => {
    const initial = initialPosition('B');
    initial.holes = 0;
    expect([1, 2, 3].map((depth) => orthodoxPerft(initial, depth))).toEqual([20, 400, 8902]);
  }, 120_000);
});
