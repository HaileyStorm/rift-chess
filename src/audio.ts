// Original procedural WebAudio sound design for Rift Chess; it uses no external assets.

export type GameAudioEvent =
  | 'select'
  | 'move'
  | 'capture'
  | 'shift'
  | 'promote'
  | 'check';

type AudioContextConstructor = new () => AudioContext;

interface Voice {
  readonly sources: AudioScheduledSourceNode[];
  readonly endTime: number;
}

interface ToneSpec {
  readonly frequency: number;
  readonly endFrequency?: number;
  readonly duration: number;
  readonly peak: number;
  readonly attack: number;
  readonly release: number;
  readonly wave: OscillatorType;
  readonly offset?: number;
}

interface NoiseSpec {
  readonly duration: number;
  readonly peak: number;
  readonly attack: number;
  readonly release: number;
  readonly filter: BiquadFilterType;
  readonly lowFrequency: number;
  readonly highFrequency: number;
  readonly offset?: number;
}

interface ScheduledGraph {
  readonly sources: AudioScheduledSourceNode[];
  readonly endTime: number;
}

const MASTER_GAIN = 0.23;
const MAX_POLYPHONY = 8;
const NOISE_SECONDS = 0.7;
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function audioContextConstructor(): AudioContextConstructor | null {
  const scope = globalThis as typeof globalThis & {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

function nowOf(context: BaseAudioContext): number {
  const time = context.currentTime;
  return Number.isFinite(time) ? time : 0;
}

function cancel(param: AudioParam, time: number): void {
  try {
    param.cancelScheduledValues(time);
  } catch {
    // A partial or denied audio implementation should remain silent.
  }
}

function setValue(param: AudioParam, value: number, time: number): void {
  try {
    param.setValueAtTime(value, time);
  } catch {
    try {
      param.value = value;
    } catch {
      // Some test doubles expose neither scheduling nor a writable value.
    }
  }
}

function ramp(param: AudioParam, value: number, time: number): void {
  try {
    param.linearRampToValueAtTime(value, time);
  } catch {
    setValue(param, value, time);
  }
}

function envelope(param: AudioParam, start: number, attack: number, release: number, peak: number): number {
  const attackEnd = start + Math.max(0.001, attack);
  const end = attackEnd + Math.max(0.012, release);
  cancel(param, start);
  setValue(param, 0, start);
  ramp(param, peak, attackEnd);
  ramp(param, 0, end);
  return end;
}

function safeConnect(source: AudioNode, destination: AudioNode): void {
  try {
    source.connect(destination);
  } catch {
    // Browser/device audio is optional and must never break a match.
  }
}

function safeStart(source: AudioScheduledSourceNode, start: number, end: number): void {
  try {
    source.start(start);
    source.stop(Math.max(end, start + 0.01));
  } catch {
    // A context can close between scheduling and a visibility/import transition.
  }
}

function noiseBuffer(context: BaseAudioContext): AudioBuffer | null {
  const existing = noiseBuffers.get(context);
  if (existing) return existing;
  try {
    const sampleRate = Math.max(8_000, context.sampleRate || 44_100);
    const buffer = context.createBuffer(1, Math.ceil(sampleRate * NOISE_SECONDS), sampleRate);
    const channel = buffer.getChannelData(0);
    let state = 0x9e3779b9;
    for (let index = 0; index < channel.length; index += 1) {
      state = Math.imul(state ^ (state >>> 16), 0x21f0aaad);
      state = Math.imul(state ^ (state >>> 15), 0x735a2d97);
      channel[index] = ((state ^ (state >>> 15)) / 0x80000000) * 0.72;
    }
    noiseBuffers.set(context, buffer);
    return buffer;
  } catch {
    return null;
  }
}

function tone(context: BaseAudioContext, output: AudioNode, time: number, spec: ToneSpec): ScheduledGraph {
  const start = time + (spec.offset ?? 0);
  const end = start + spec.duration;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = spec.wave;
  setValue(oscillator.frequency, spec.frequency, start);
  if (spec.endFrequency !== undefined) ramp(oscillator.frequency, spec.endFrequency, end);
  envelope(gain.gain, start, spec.attack, spec.release, spec.peak);
  safeConnect(oscillator, gain);
  safeConnect(gain, output);
  safeStart(oscillator, start, end + 0.015);
  return { sources: [oscillator], endTime: end };
}

function noise(context: BaseAudioContext, output: AudioNode, time: number, spec: NoiseSpec): ScheduledGraph {
  const start = time + (spec.offset ?? 0);
  const end = start + spec.duration;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = noiseBuffer(context);
  filter.type = spec.filter;
  setValue(filter.frequency, spec.lowFrequency, start);
  ramp(filter.frequency, spec.highFrequency, end);
  envelope(gain.gain, start, spec.attack, spec.release, spec.peak);
  safeConnect(source, filter);
  safeConnect(filter, gain);
  safeConnect(gain, output);
  safeStart(source, start, end + 0.015);
  return { sources: [source], endTime: end };
}

function scheduleEvent(context: BaseAudioContext, output: AudioNode, event: GameAudioEvent, time: number): ScheduledGraph {
  const parts: ScheduledGraph[] = [];
  switch (event) {
    case 'select':
      parts.push(
        tone(context, output, time, { frequency: 235, endFrequency: 175, duration: 0.15, peak: 0.27, attack: 0.004, release: 0.14, wave: 'triangle' }),
        tone(context, output, time, { frequency: 470, endFrequency: 350, duration: 0.08, peak: 0.1, attack: 0.003, release: 0.075, wave: 'sine', offset: 0.008 }),
        noise(context, output, time, { duration: 0.07, peak: 0.17, attack: 0.002, release: 0.068, filter: 'highpass', lowFrequency: 1_700, highFrequency: 2_600 }),
      );
      break;
    case 'move':
      parts.push(
        tone(context, output, time, { frequency: 118, endFrequency: 78, duration: 0.28, peak: 0.28, attack: 0.005, release: 0.27, wave: 'triangle' }),
        tone(context, output, time, { frequency: 285, endFrequency: 205, duration: 0.2, peak: 0.11, attack: 0.004, release: 0.19, wave: 'sine', offset: 0.008 }),
        noise(context, output, time, { duration: 0.25, peak: 0.24, attack: 0.003, release: 0.24, filter: 'lowpass', lowFrequency: 800, highFrequency: 1_250 }),
      );
      break;
    case 'capture':
      parts.push(
        tone(context, output, time, { frequency: 76, endFrequency: 45, duration: 0.36, peak: 0.31, attack: 0.004, release: 0.35, wave: 'sine' }),
        tone(context, output, time, { frequency: 440, endFrequency: 250, duration: 0.3, peak: 0.16, attack: 0.003, release: 0.29, wave: 'square', offset: 0.004 }),
        noise(context, output, time, { duration: 0.34, peak: 0.3, attack: 0.002, release: 0.33, filter: 'lowpass', lowFrequency: 430, highFrequency: 1_050 }),
      );
      break;
    case 'shift':
      parts.push(
        tone(context, output, time, { frequency: 92, endFrequency: 128, duration: 0.5, peak: 0.2, attack: 0.008, release: 0.48, wave: 'sawtooth' }),
        noise(context, output, time, { duration: 0.5, peak: 0.2, attack: 0.01, release: 0.49, filter: 'bandpass', lowFrequency: 460, highFrequency: 2_100 }),
        noise(context, output, time, { duration: 0.11, peak: 0.12, attack: 0.004, release: 0.1, filter: 'highpass', lowFrequency: 1_900, highFrequency: 3_700, offset: 0.39 }),
      );
      break;
    case 'promote':
      parts.push(
        tone(context, output, time, { frequency: 523.25, duration: 0.45, peak: 0.2, attack: 0.012, release: 0.43, wave: 'sine' }),
        tone(context, output, time, { frequency: 659.25, duration: 0.48, peak: 0.16, attack: 0.012, release: 0.46, wave: 'sine', offset: 0.09 }),
        tone(context, output, time, { frequency: 783.99, duration: 0.6, peak: 0.14, attack: 0.014, release: 0.58, wave: 'sine', offset: 0.18 }),
      );
      break;
    case 'check':
      parts.push(
        tone(context, output, time, { frequency: 660, endFrequency: 585, duration: 0.22, peak: 0.2, attack: 0.008, release: 0.21, wave: 'triangle' }),
        tone(context, output, time, { frequency: 440, endFrequency: 390, duration: 0.27, peak: 0.18, attack: 0.008, release: 0.26, wave: 'triangle', offset: 0.16 }),
        noise(context, output, time, { duration: 0.08, peak: 0.08, attack: 0.002, release: 0.078, filter: 'highpass', lowFrequency: 2_500, highFrequency: 3_100 }),
      );
      break;
  }
  return {
    sources: parts.flatMap((part) => part.sources),
    endTime: parts.reduce((latest, part) => Math.max(latest, part.endTime), time),
  };
}

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private voices = new Set<Voice>();
  private unlockPromise: Promise<void> | null = null;
  private unavailable = false;
  private disposed = false;
  private enabledState = true;

  get enabled(): boolean {
    return this.enabledState;
  }

  set enabled(value: boolean) {
    this.setEnabled(value);
  }

  /** Call this from a trusted pointer or keyboard handler; no context is made before then. */
  unlock(): Promise<void> {
    if (this.disposed || !this.enabledState || this.unavailable) return Promise.resolve();
    if (this.unlockPromise) return this.unlockPromise;
    this.unlockPromise = this.initialize().finally(() => {
      this.unlockPromise = null;
    });
    return this.unlockPromise;
  }

  setEnabled(value: boolean): void {
    this.enabledState = value;
    if (!value) this.stop();
    const master = this.master;
    const context = this.context;
    if (!master || !context) return;
    const time = nowOf(context);
    cancel(master.gain, time);
    setValue(master.gain, value ? MASTER_GAIN : 0, time);
  }

  play(event: GameAudioEvent): void {
    if (!this.enabledState || this.disposed) return;
    const context = this.context;
    const master = this.master;
    if (!context || !master || context.state !== 'running') return;
    const time = nowOf(context);
    this.cleanup(time);
    try {
      const graph = scheduleEvent(context, master, event, time);
      while (this.voices.size >= MAX_POLYPHONY) this.stopOldest(time);
      this.voices.add({ sources: graph.sources, endTime: graph.endTime });
    } catch {
      // Audio is an enhancement; a failed node must never fail a move or import.
    }
  }

  stop(): void {
    const context = this.context;
    const time = context ? nowOf(context) : 0;
    for (const voice of this.voices) {
      for (const source of voice.sources) {
        try {
          source.stop(time);
        } catch {
          // Sources may already have ended or the context may be closed.
        }
      }
    }
    this.voices.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    const context = this.context;
    this.context = null;
    const master = this.master;
    this.master = null;
    try {
      master?.disconnect();
    } catch {
      // Disconnect is best effort during page teardown.
    }
    if (context) {
      try {
        void Promise.resolve(context.close()).catch(() => undefined);
      } catch {
        // Closing is best effort when a browser tears down the audio device.
      }
    }
  }

  private async initialize(): Promise<void> {
    if (this.disposed || !this.enabledState || this.unavailable) return;
    const context = this.context;
    if (context) {
      if (context.state !== 'running') await this.resume(context);
      return;
    }
    const Constructor = audioContextConstructor();
    if (!Constructor) {
      this.unavailable = true;
      return;
    }
    let created: AudioContext | null = null;
    try {
      created = new Constructor();
      const master = created.createGain();
      setValue(master.gain, this.enabledState ? MASTER_GAIN : 0, nowOf(created));
      master.connect(created.destination);
      this.context = created;
      this.master = master;
      await this.resume(created);
    } catch {
      this.unavailable = true;
      this.context = null;
      this.master = null;
      if (created) {
        try {
          void Promise.resolve(created.close()).catch(() => undefined);
        } catch {
          // Closing is best effort after a partial graph setup.
        }
      }
    }
  }

  private async resume(context: AudioContext): Promise<void> {
    if (context.state === 'running') return;
    if (context.state === 'closed') {
      this.unavailable = true;
      return;
    }
    try {
      if (typeof context.resume === 'function') await context.resume();
    } catch {
      // A denied resume remains retryable on the next trusted gesture.
    }
  }

  private cleanup(time: number): void {
    for (const voice of this.voices) {
      if (voice.endTime <= time) this.voices.delete(voice);
    }
  }

  private stopOldest(time: number): void {
    let oldest: Voice | undefined;
    for (const voice of this.voices) {
      if (!oldest || voice.endTime < oldest.endTime) oldest = voice;
    }
    if (!oldest) return;
    for (const source of oldest.sources) {
      try {
        source.stop(time);
      } catch {
        // The source may already be finished.
      }
    }
    this.voices.delete(oldest);
  }
}

export default GameAudio;
