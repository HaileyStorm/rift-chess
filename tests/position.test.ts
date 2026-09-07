import { describe, expect, it } from 'vitest';
import type { Position } from '../src/engine/types';
import {
  applyGeneratedAction, initialPosition, inCheck, isAttacked, legalActions, macroIndex, squareIndex, validatePosition,
} from '../src/engine/position';

function sparse(pieces: Record<string, number>, holes: number[], side: 1 | -1 = 1, castling = 0): Position {
  const board = Array<number>(64).fill(0);
  for (const [name, piece] of Object.entries(pieces)) board[squareIndex(name)] = piece;
  return { board, holes: holes.reduce((mask, macro) => mask | (1 << macro), 0), side, castling, ep_target: -1, ep_pawn: -1, halfmove: 0, fullmove: 1 };
}

describe('Rift Chess position rules', () => {
  it('uses the fixed opening action IDs and terrain-aware opening moves', () => {
    const actions = legalActions(initialPosition('B'));
    expect(actions.map((action) => action.id)).toEqual([
      400, 2025, 2035, 2640, 2680, 2965, 3005, 3940, 3980, 4265, 4305, 4590, 4630, 4915, 4955, 20825, 20985, 21165, 21325,
    ]);
    expect(legalActions(initialPosition('C')).find((action) => action.id === 3980)).toBeUndefined();
  });

  it('blocks rays at holes and rejects a pinned en-passant capture', () => {
    const ray = sparse({ h1: 6, a8: -6, a1: 4 }, [4, 8]);
    expect(isAttacked(ray, squareIndex('a8'), 1)).toBe(false);
    const pinned = sparse({ e1: 6, h8: -6, e8: -4, e5: 1, d5: -1 }, [4, 7]);
    pinned.ep_target = squareIndex('d6');
    pinned.ep_pawn = squareIndex('d5');
    expect(legalActions(pinned).some((action) => action.en_passant)).toBe(false);
    expect(inCheck(pinned, 1)).toBe(false);
  });

  it('moves a loaded tile atomically, consuming rook rights without mutating its input', () => {
    const position = sparse({ e1: 6, e8: -6, h1: 4 }, [7, 10], 1, 1);
    const action = legalActions(position).find((candidate) => candidate.type === 'shift' && candidate.from === 'D1' && candidate.to === 'D2');
    expect(action).toBeDefined();
    const next = applyGeneratedAction(position, action!);
    expect(next.board[squareIndex('h3')]).toBe(4);
    expect(next.castling & 1).toBe(0);
    expect(position.board[squareIndex('h1')]).toBe(4);
    expect(position.holes).toBe((1 << 7) | (1 << 10));
  });

  it('expands every ordinary and immediate Shift promotion choice', () => {
    const ordinary = sparse({ a1: 6, h8: -6, c7: 1 }, [4, 8]);
    expect(legalActions(ordinary)
      .filter((action) => action.type === 'move' && action.from === 'c7' && action.to === 'c8')
      .map((action) => action.promotion)).toEqual(['Q', 'R', 'B', 'N']);
    const position = sparse({ a1: 6, h8: -6, c6: 1 }, [macroIndex('B4'), macroIndex('D2')]);
    const promotions = legalActions(position)
      .filter((action) => action.type === 'shift' && action.from === 'B3' && action.to === 'B4')
      .map((action) => action.promotion);
    expect(promotions).toEqual(['Q', 'R', 'B', 'N']);
  });

  it('strictly validates import positions while allowing only the public two-hole form', () => {
    expect(() => validatePosition(initialPosition())).not.toThrow();
    const malformed = initialPosition();
    malformed.holes = 1 << 5;
    expect(() => validatePosition(malformed)).toThrow(/exactly two/);
  });
});
