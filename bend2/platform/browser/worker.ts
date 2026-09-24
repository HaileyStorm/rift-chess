// Generic Bend window adapter: no chess, UI, hit-testing, or persistence policy.
// @ts-ignore Compiled by the pinned Bend loader.
import Application from '../../Application.bend';
import { PixelPort } from './image-port';
import { BitmapSurface } from './bitmap-surface';
const api = Application as Record<string, (...args: any[]) => any>;
let session: unknown;
const list = (values: unknown[]) => values.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' } as any);
function values(value: any): any[] {
  const result = [];
  while (value?.$ === 'Con') { result.push(value.head); value = value.tail; }
  return result;
}
const pixelPort = new PixelPort();
// Raw transfer is the measured default. The optional ImageBitmap surface is
// enabled only by an explicit host profile promotion at boot.
let bitmapSurface = new BitmapSurface(false);
function emit(packet: any, elapsed: number, id: number): void {
  const portStart = performance.now();
  session = packet.session;
  const transfers: Transferable[] = [];
  const pixelStart = performance.now();
  const pixels: ArrayBuffer | null = packet.dirty ? pixelPort.render(packet.image, packet.width, packet.height) : null;
  const bitmap = pixels ? bitmapSurface.convert(pixels, packet.width, packet.height) : null;
  const pixelMs = performance.now() - pixelStart;
  if (!bitmap && pixels) transfers.push(pixels);
  if (bitmap) transfers.push(bitmap);
  // Preserve the historical truthy image marker for browser scenario hooks.
  // On the opted-in path it aliases `bitmap`, so the transfer list still has a
  // single transferable and never duplicates raw pixel bytes.
  const image: ArrayBuffer | ImageBitmap | null = bitmap ?? pixels;
  const audioStart = performance.now();
  const effects = values(packet.effects).map(effect => {
    if (effect.$ !== 'Sound') return effect;
    const rate = 24000;
    const samples = Float32Array.from(values(api.audio_samples(effect.notes, rate)));
    transfers.push(samples.buffer);
    return { $: 'Sound', samples: samples.buffer, rate };
  });
  const audioMs = performance.now() - audioStart;
  self.postMessage({ kind: 'frame', id, image, bitmap, width: packet.width, height: packet.height,
    controls: values(packet.controls), presentation: packet.presentation, summary: packet.summary,
    effects, after: packet.after, renderMs: elapsed, portMs: performance.now() - portStart, pixelMs, audioMs }, { transfer: transfers });
}
self.addEventListener('message', event => {
  const request = event.data;
  const start = performance.now();
  try {
    let packet: any;
    if (request.kind === 'boot') {
      bitmapSurface = new BitmapSurface(request.imageBitmap === true);
      packet = api.boot_reads(request.saved.text, request.prefs.text, request.saved.ok, request.prefs.ok, request.width, request.height);
    } else {
      packet = api.dispatch_at(list(request.events), request.presentation, session);
    }
    emit(packet, performance.now() - start, request.id);
  } catch (error) {
    self.postMessage({ kind: 'fault', id: request.id, message: String(error) });
  }
});
self.postMessage({ kind: 'ready', keys: [api.storage_key(0), api.storage_key(1), api.storage_key(2)], maxFileBytes: api.max_file_bytes() });
