import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GameAudio } from './audio';

class FakeParam {
  value = 0;
  setValueAtTime(value: number): void { this.value = value; }
  linearRampToValueAtTime(value: number): void { this.value = value; }
  cancelScheduledValues(): void {}
}

class FakeNode {
  readonly gain = new FakeParam();
  readonly frequency = new FakeParam();
  type = '';
  buffer: unknown = null;
  connect(): void {}
  disconnect(): void {}
  start(): void {}
  stop(): void {}
}

class FakeContext {
  static instances: FakeContext[] = [];
  currentTime = 0;
  sampleRate = 44_100;
  state: AudioContextState = 'suspended';
  readonly destination = new FakeNode();
  starts = 0;
  stops = 0;
  resumeCalls = 0;

  constructor() {
    FakeContext.instances.push(this);
  }

  createGain(): FakeNode { return new FakeNode(); }
  createOscillator(): FakeNode {
    const node = new FakeNode();
    node.start = () => { this.starts += 1; };
    node.stop = () => { this.stops += 1; };
    return node;
  }
  createBufferSource(): FakeNode {
    const node = new FakeNode();
    node.start = () => { this.starts += 1; };
    node.stop = () => { this.stops += 1; };
    return node;
  }
  createBiquadFilter(): FakeNode { return new FakeNode(); }
  createBuffer(_channels: number, length: number, _sampleRate: number): AudioBuffer {
    return { getChannelData: () => new Float32Array(length) } as unknown as AudioBuffer;
  }
  async resume(): Promise<void> {
    this.resumeCalls += 1;
    this.state = 'running';
  }
  async close(): Promise<void> {
    this.state = 'closed';
  }
}

const audioContextDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');

beforeEach(() => {
  FakeContext.instances = [];
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, writable: true, value: FakeContext });
});

afterEach(() => {
  if (audioContextDescriptor) Object.defineProperty(globalThis, 'AudioContext', audioContextDescriptor);
  else Reflect.deleteProperty(globalThis, 'AudioContext');
});

describe('GameAudio', () => {
  it('does not construct an audio context while muted', async () => {
    const audio = new GameAudio();
    audio.setEnabled(false);
    await audio.unlock();
    expect(FakeContext.instances).toHaveLength(0);

    audio.setEnabled(true);
    await audio.unlock();
    expect(FakeContext.instances).toHaveLength(1);
    audio.dispose();
  });

  it('retries resume for an existing suspended context after a prior unlock', async () => {
    const audio = new GameAudio();
    await audio.unlock();
    const context = FakeContext.instances[0];
    expect(context.resumeCalls).toBe(1);

    context.state = 'suspended';
    await audio.unlock();
    expect(context.resumeCalls).toBe(2);
    expect(context.state).toBe('running');
    audio.dispose();
  });

  it('does not queue cues while the context is suspended', async () => {
    const audio = new GameAudio();
    await audio.unlock();
    const context = FakeContext.instances[0];
    context.state = 'suspended';
    audio.play('move');
    expect(context.starts).toBe(0);

    context.state = 'running';
    audio.play('move');
    const starts = context.starts;
    expect(starts).toBeGreaterThan(0);
    audio.setEnabled(false);
    audio.play('capture');
    expect(context.starts).toBe(starts);
    audio.dispose();
  });

  it('keeps a denied resume retryable', async () => {
    const audio = new GameAudio();
    await audio.unlock();
    const context = FakeContext.instances[0];
    const resume = context.resume.bind(context);
    let denied = true;
    context.resume = async () => {
      context.resumeCalls += 1;
      if (denied) {
        denied = false;
        throw new Error('gesture denied');
      }
      await resume();
    };
    context.state = 'suspended';
    await audio.unlock();
    expect(context.state).toBe('suspended');
    await audio.unlock();
    expect(context.state).toBe('running');
    audio.dispose();
  });
});
