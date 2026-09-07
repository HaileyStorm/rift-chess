import { describe, expect, it } from 'vitest';
import { planAssembly, type AssemblyPlan } from '../src/render/assembly';

const LAYOUTS = {
  B: (1 << 5) | (1 << 9),
  C: (1 << 6) | (1 << 10),
} as const;

function adjacent(a: number, b: number): boolean {
  return Math.abs(a % 4 - b % 4) + Math.abs(Math.floor(a / 4) - Math.floor(b / 4)) === 1;
}

function replay(plan: AssemblyPlan): Array<number | null> {
  const slots: Array<number | null> = Array(16).fill(null);
  for (const { tile, slot } of plan.placements) {
    expect(slots[slot], `placement slot ${slot}`).toBeNull();
    slots[slot] = tile;
  }

  let previous: AssemblyPlan['solveSteps'][number] | undefined;
  for (const { tile, from, to } of plan.solveSteps) {
    expect(slots[from], `tile ${tile} source`).toBe(tile);
    expect(slots[to], `tile ${tile} destination`).toBeNull();
    expect(adjacent(from, to), `tile ${tile} slide`).toBe(true);
    slots[from] = null;
    slots[to] = tile;
    expect(slots.filter((tileAtSlot) => tileAtSlot === null)).toHaveLength(2);
    expect(new Set(slots.filter((tileAtSlot) => tileAtSlot !== null)).size).toBe(14);
    if (previous !== undefined) expect({ tile, from, to }).not.toEqual({ tile: previous.tile, from: previous.to, to: previous.from });
    previous = { tile, from, to };
  }
  return slots;
}

describe('assembly planning', () => {
  it.each(Object.entries(LAYOUTS))('restores layout %s from shuffled plans across seeds', (_, holes) => {
    for (let seed = 0; seed < 128; seed += 1) {
      const plan = planAssembly(holes, seed);
      expect(plan.solveSteps).toHaveLength(24);
      expect(plan.placements.map(({ tile }) => tile).sort((a, b) => a - b))
        .toEqual(Array.from({ length: 16 }, (_, tile) => tile).filter((tile) => (holes & (1 << tile)) === 0));
      expect(new Set(plan.placements.map(({ slot }) => slot)).size).toBe(14);

      const finalSlots = replay(plan);
      for (let slot = 0; slot < 16; slot += 1) {
        expect(finalSlots[slot], `seed ${seed}, slot ${slot}`).toBe((holes & (1 << slot)) !== 0 ? null : slot);
      }
    }
  });

  it('is deterministic, including a zero seed', () => {
    expect(planAssembly(LAYOUTS.B, 0)).toEqual(planAssembly(LAYOUTS.B, 0));
    expect(planAssembly(LAYOUTS.C, 0xdecafbad)).toEqual(planAssembly(LAYOUTS.C, 0xdecafbad));
  });

  it.each(Object.entries(LAYOUTS))('never returns the solved board as layout %s start', (_, holes) => {
    for (let seed = 0; seed < 128; seed += 1) {
      expect(planAssembly(holes, seed).placements.some(({ tile, slot }) => tile !== slot), `seed ${seed}`).toBe(true);
    }
  });

  it('rejects masks without exactly two 16-bit holes and non-uint32 seeds', () => {
    for (const holes of [-1, 0, 1 << 16, (1 << 1) | (1 << 2) | (1 << 3), 1.5]) {
      expect(() => planAssembly(holes, 1)).toThrow();
    }
    for (const seed of [-1, 1.5, 0x1_0000_0000]) expect(() => planAssembly(LAYOUTS.B, seed)).toThrow();
  });
});
