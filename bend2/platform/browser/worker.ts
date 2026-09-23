// Generic Bend window adapter: no chess, UI, hit-testing, or persistence policy.
// @ts-ignore Compiled by the pinned Bend loader.
import Application from '../../Application.bend';
import { PixelPort } from './image-port';
const api = Application as Record<string, (...args: any[]) => any>;
let session: unknown;
const list = (values: unknown[]) => values.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' } as any);
function values(value: any): any[] {
  const result = [];
  while (value?.$ === 'Con') { result.push(value.head); value = value.tail; }
  return result;
}
const pixelPort = new PixelPort();
function emit(packet: any, elapsed: number, id: number): void {
  const portStart = performance.now();
  session = packet.session;
  const transfers: Transferable[] = [];
  const image = packet.dirty ? pixelPort.render(packet.image, packet.width, packet.height) : null;
  if (image) transfers.push(image);
  const effects = values(packet.effects).map(effect => {
    if (effect.$ !== 'Sound') return effect;
    const rate = 24000;
    const samples = Float32Array.from(values(api.audio_samples(effect.notes, rate)));
    transfers.push(samples.buffer);
    return { $: 'Sound', samples: samples.buffer, rate };
  });
  self.postMessage({ kind: 'frame', id, image, width: packet.width, height: packet.height,
    controls: values(packet.controls), presentation: packet.presentation, summary: packet.summary,
    effects, after: packet.after, renderMs: elapsed, portMs: performance.now() - portStart }, { transfer: transfers });
}
self.addEventListener('message', event => {
  const request = event.data;
  const start = performance.now();
  try {
    const packet = request.kind === 'boot'
      ? api.boot_reads(request.saved.text, request.prefs.text, request.saved.ok, request.prefs.ok, request.width, request.height)
      : api.dispatch_at(list(request.events), request.presentation, session);
    emit(packet, performance.now() - start, request.id);
  } catch (error) {
    self.postMessage({ kind: 'fault', id: request.id, message: String(error) });
  }
});
self.postMessage({ kind: 'ready', keys: [api.storage_key(0), api.storage_key(1), api.storage_key(2)], maxFileBytes: api.max_file_bytes() });
