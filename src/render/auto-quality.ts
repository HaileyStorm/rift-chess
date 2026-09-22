export type DetailLevel = 'low' | 'balanced' | 'high';
const levels: DetailLevel[] = ['low', 'balanced', 'high'];

/** Samples only settled foreground frames. A failed upgrade is not retried this session. */
export class AutoQuality {
  private samples: number[] = [];
  private cpu: number[] = [];
  private ceiling = 2;
  private fastWindows = 0;
  private settleUntil = 0;
  reset(now: number): void {
    this.ceiling = 2; this.fastWindows = 0; this.settle(now);
  }
  settle(now: number): void {
    this.samples.length = 0; this.cpu.length = 0; this.fastWindows = 0; this.settleUntil = now + 2500;
  }
  sample(now: number, frameMs: number, cpuMs: number, current: DetailLevel, eligible: boolean): DetailLevel | null {
    if (!eligible) { this.settle(now); return null; }
    if (now < this.settleUntil || frameMs <= 0 || !Number.isFinite(frameMs + cpuMs)) return null;
    this.samples.push(Math.min(frameMs, 250)); this.cpu.push(cpuMs);
    if (this.samples.length < 180) return null;
    this.samples.sort((a, b) => a - b); this.cpu.sort((a, b) => a - b);
    const frame = this.samples[135]!, cpu = this.cpu[135]!;
    this.samples.length = 0; this.cpu.length = 0;
    const index = levels.indexOf(current);
    if (frame > 28 && index > 0) {
      this.ceiling = index - 1; this.fastWindows = 0; this.settle(now);
      return levels[index - 1]!;
    }
    this.fastWindows = frame < 19 && cpu < 10 ? this.fastWindows + 1 : 0;
    if (this.fastWindows >= 2 && index < this.ceiling) {
      this.fastWindows = 0; this.settle(now); return levels[index + 1]!;
    }
    return null;
  }
}
