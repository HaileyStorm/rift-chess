// Platform IO only. Bend decides when, what, and why to save, load, or sound.
export class Ports {
  private audio: AudioContext | null = null;
  constructor(private keys: string[], private deliver: (event: unknown) => void, private maxFileBytes: number) {}
  unlock(): void {
    this.audio ??= new AudioContext();
    if (this.audio.state === 'suspended') void this.audio.resume();
  }
  read(slot: number): { text: string; ok: boolean } {
    try { return { text: localStorage.getItem(this.keys[slot]) ?? '', ok: true }; }
    catch { return { text: '', ok: false }; }
  }
  async execute(effect: any): Promise<void> {
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
          const input = document.createElement('input'); input.type = 'file';
          input.addEventListener('change', async () => {
            try {
              const file = input.files?.[0];
              if (file && file.size > this.maxFileBytes) { this.deliver({ $: 'PortError', kind: 9001 }); return; }
              if (file) this.deliver({ $: 'FileText', text: await file.text() });
            } catch { this.deliver({ $: 'PortError', kind: 2 }); }
          }, { once: true });
          input.click(); return;
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
