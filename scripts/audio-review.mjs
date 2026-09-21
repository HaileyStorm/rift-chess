import { build } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('.artifacts/audio', `review-${Date.now()}`);
await fs.mkdir(root, { recursive: true });
// Expose the internal synthesizer only in this in-memory review bundle.
const bundle = await build({ configFile: false, plugins: [{ name: 'review-synth', transform(code, id) { if (id.replaceAll('\\', '/').endsWith('/src/audio.ts')) return code + '\nexport { scheduleEvent };'; } }], build: { write: false, minify: false, lib: { entry: path.resolve('src/audio.ts'), formats: ['es'], fileName: 'review-audio' } } });
const code = (Array.isArray(bundle) ? bundle[0] : bundle).output.find(item => item.type === 'chunk').code;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async source => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    const { scheduleEvent, GameAudio } = await import(url); URL.revokeObjectURL(url);
    const cues = ['select', 'move', 'capture', 'shift', 'promote', 'check'];
    const context = new OfflineAudioContext(1, 8 * 22050, 22050);
    const master = context.createGain(); master.gain.value = .23; master.connect(context.destination);
    cues.forEach((cue, index) => scheduleEvent(context, master, cue, .25 + index * 1.2));
    const rendered = await context.startRendering(), samples = rendered.getChannelData(0);
    const windows = cues.map((cue, index) => {
      const slice = samples.slice(Math.floor((.25 + index * 1.2) * 22050), Math.floor((1.4 + index * 1.2) * 22050));
      return { cue, peak: Math.max(...slice.map(Math.abs)), rms: Math.sqrt(slice.reduce((sum, sample) => sum + sample * sample, 0) / slice.length) };
    });
    const audio = new GameAudio(); audio.setEnabled(false); await audio.unlock(); audio.dispose();
    return { samples: Array.from(samples), windows };
  }, code);
  for (const entry of result.windows) { assert.ok(entry.peak > .001 && entry.peak < .98, entry.cue + ' silent or clipping'); assert.ok(entry.rms > .0001); }
  const bytes = Buffer.alloc(44 + result.samples.length * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(22050, 24); bytes.writeUInt32LE(44100, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(bytes.length - 44, 40);
  result.samples.forEach((sample, index) => bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2));
  await fs.writeFile(path.join(root, 'cues.wav'), bytes);
  await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify({ status: 'pass', source: 'current src/audio.ts, real Chromium OfflineAudioContext', cues: result.windows, note: 'Select, move, capture, shift, promote, check; 1.2 seconds apart. Waveform checks do not establish subjective audio quality.' }, null, 2));
  console.log(JSON.stringify({ root, cues: result.windows }));
} finally { await browser.close(); }
