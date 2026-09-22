export type AudioEvent = 'piececlick' | 'move' | 'capture' | 'shift' | 'win';

const EVENT_SHAPES: Record<AudioEvent, { notes: number[]; duration: number; wave: OscillatorType }> = {
  piececlick: { notes: [430], duration: 0.055, wave: 'sine' },
  move: { notes: [330, 495], duration: 0.14, wave: 'triangle' },
  capture: { notes: [260, 190], duration: 0.2, wave: 'sawtooth' },
  shift: { notes: [190, 285, 380], duration: 0.24, wave: 'sine' },
  win: { notes: [330, 415, 554, 660], duration: 0.52, wave: 'triangle' },
};

export class RiftAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private volume = 0.28;
  private readonly active = new Set<OscillatorNode>();

  isEnabled(): boolean { return this.enabled; }
  getVolume(): number { return this.volume; }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.master) this.master.gain.setTargetAtTime(enabled ? this.volume : 0, this.context!.currentTime, 0.015);
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0.28));
    if (this.master && this.enabled) this.master.gain.setTargetAtTime(this.volume, this.context!.currentTime, 0.015);
  }

  async unlock(): Promise<void> {
    if (!this.enabled) return;
    if (!this.context) {
      const Ctx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.context = new Ctx();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
  }

  play(event: AudioEvent): void {
    if (!this.enabled || !this.context || !this.master || this.context.state !== 'running') return;
    const shape = EVENT_SHAPES[event];
    const now = this.context.currentTime;
    const spacing = shape.duration / Math.max(1, shape.notes.length);
    shape.notes.forEach((frequency, index) => {
      const start = now + index * spacing;
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      oscillator.type = shape.wave;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(event === 'piececlick' ? 0.08 : 0.13, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + shape.duration);
      oscillator.connect(gain).connect(this.master!);
      oscillator.addEventListener('ended', () => { this.active.delete(oscillator); oscillator.disconnect(); gain.disconnect(); }, { once: true });
      this.active.add(oscillator);
      oscillator.start(start);
      oscillator.stop(start + shape.duration + 0.02);
    });
  }

  stop(): void {
    for (const oscillator of this.active) {
      try { oscillator.stop(); } catch { /* already ended */ }
    }
    this.active.clear();
  }

  dispose(): void {
    this.stop();
    if (this.context) void this.context.close();
    this.master = null;
    this.context = null;
  }
}
