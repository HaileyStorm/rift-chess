import { describe, expect, it } from 'vitest';
import { AutoQuality, type DetailLevel } from './auto-quality';

function windowSamples(controller: AutoQuality, start: number, level: DetailLevel, ms: number, eligible = true) {
  let next: DetailLevel | null = null;
  for (let i = 0; i < 180; i++) next = controller.sample(start + i * ms, ms, 5, level, eligible) ?? next;
  return next;
}
describe('automatic graphics detail', () => {
  it('steps down under sustained load and does not oscillate back up', () => {
    const auto = new AutoQuality(); auto.reset(0);
    expect(windowSamples(auto, 3000, 'balanced', 35)).toBe('low');
    expect(windowSamples(auto, 15000, 'low', 16)).toBeNull();
    expect(windowSamples(auto, 20000, 'low', 16)).toBeNull();
    const stalled = new AutoQuality(); stalled.reset(0);
    expect(windowSamples(stalled, 3000, 'balanced', 300)).toBe('low');
  });
  it('requires two stable windows before raising detail', () => {
    const auto = new AutoQuality(); auto.reset(0);
    expect(windowSamples(auto, 3000, 'balanced', 16)).toBeNull();
    expect(windowSamples(auto, 6000, 'balanced', 16)).toBe('high');
  });
  it('ignores busy/background frames and warmup rather than lowering quality', () => {
    const auto = new AutoQuality(); auto.reset(0);
    expect(windowSamples(auto, 0, 'balanced', 35, false)).toBeNull();
    expect(auto.sample(6400, 35, 5, 'balanced', true)).toBeNull();
    expect(windowSamples(auto, 10000, 'balanced', 16)).toBeNull();
  });
});
