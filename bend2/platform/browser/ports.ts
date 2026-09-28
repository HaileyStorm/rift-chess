// Platform IO only. Bend decides when, what, and why to save, load, or sound.
export type PreparedPickFile = {
  input: HTMLInputElement;
  state: 'pending' | 'confirmed' | 'discarded';
  changed: boolean;
  consumed: boolean;
  generation: number;
};

export class Ports {
  private audio: AudioContext | null = null;
  private pickerGeneration = 0;
  constructor(private keys: string[], private deliver: (event: unknown) => void, private maxFileBytes: number) {}
  unlock(): void {
    this.audio ??= new AudioContext();
    if (this.audio.state === 'suspended') void this.audio.resume();
  }
  read(slot: number): { text: string; ok: boolean } {
    try { return { text: localStorage.getItem(this.keys[slot]) ?? '', ok: true }; }
    catch { return { text: '', ok: false }; }
  }
  preparePickFile(): PreparedPickFile | undefined {
    const input = document.createElement('input'); input.type = 'file';
    const prepared: PreparedPickFile = { input, state: 'pending', changed: false,
      consumed: false, generation: ++this.pickerGeneration };
    input.addEventListener('change', () => {
      prepared.changed = true;
      if (prepared.state === 'confirmed') void this.readPickedFile(prepared);
    }, { once: true });
    try { input.click(); }
    catch { prepared.state = 'discarded'; return undefined; }
    return prepared;
  }
  discardPickFile(prepared: PreparedPickFile): void {
    if (prepared.state === 'pending') prepared.state = 'discarded';
  }
  cancelPickFiles(): void { this.pickerGeneration++; }
  private async readPickedFile(prepared: PreparedPickFile): Promise<void> {
    if (prepared.state !== 'confirmed' || !prepared.changed || prepared.consumed ||
      prepared.generation !== this.pickerGeneration) return;
    prepared.consumed = true;
    try {
      const file = prepared.input.files?.[0];
      if (file && file.size > this.maxFileBytes) { this.deliver({ $: 'PortError', kind: 9001 }); return; }
      if (file) {
        const text = await file.text();
        if (prepared.generation === this.pickerGeneration) this.deliver({ $: 'FileText', text });
      }
    } catch {
      if (prepared.generation === this.pickerGeneration) this.deliver({ $: 'PortError', kind: 2 });
    }
  }
  async execute(effect: any, prepared?: PreparedPickFile): Promise<void> {
    try {
      switch (effect.$) {
        case 'Store': localStorage.setItem(this.keys[effect.slot], effect.text); return;
        case 'Download': {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(new Blob([effect.text], { type: 'text/plain;charset=utf-8' }));
          link.download = effect.name; link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 1000); return;
        }
        case 'PickFile': {
          if (!prepared) { this.deliver({ $: 'PortError', kind: 2 }); return; }
          prepared.state = 'confirmed';
          void this.readPickedFile(prepared);
          return;
        }
        case 'Sound': {
          if (!this.audio || this.audio.state !== 'running') return;
          const pcm = new Float32Array(effect.samples);
          const buffer = this.audio.createBuffer(1, pcm.length, effect.rate);
          buffer.copyToChannel(pcm, 0);
          const source = this.audio.createBufferSource(); source.buffer = buffer;
          source.connect(this.audio.destination); source.onended = () => source.disconnect(); source.start(); return;
        }
        case 'OpenUrl': {
          const url = new URL(effect.url);
          if (url.protocol === 'https:' || url.protocol === 'http:') window.open(url.href, '_blank', 'noopener,noreferrer');
          return;
        }
        case 'Exit': window.close(); return;
      }
    } catch { this.deliver({ $: 'PortError', kind: 1 }); }
  }
}
