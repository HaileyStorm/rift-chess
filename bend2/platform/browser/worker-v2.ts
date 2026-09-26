// Generic executor for Bend-authored RenderPlan requests. Independently
// compiled Bend books own rules, menu, picking, cache policy and pixels.
// @ts-ignore Compiled by the pinned Bend loader.
import Controller from '../../ApplicationControl.bend';
// @ts-ignore A separate Bend pixel book.
import BoardScene from '../../graphics/v2game/BoardScene.bend';
// @ts-ignore A separate Bend native-resolution menu/raster book.
import MenuAA from '../../ui/v2/MenuAA.bend';
import { PixelPort, extentForOutput } from './image-port';
import { BitmapSurface } from './bitmap-surface';
import { loadAssetRequests, loadFontPack } from './asset-port';
declare const __BEND_SPRITE_HELPER__: string;
declare const __BEND_SPRITE_SOURCE__: string;
const api = Controller as Record<string, (...args: any[]) => any>;
const scene = BoardScene as Record<string, (...args: any[]) => any>;
const menu = MenuAA as Record<string, (...args: any[]) => any>;
let session: unknown;
type BotWork = { kind: 'pending' } | { kind: 'ready'; id: number }
  | { kind: 'unavailable'; message: string } | { kind: 'failed'; message: string };
const botWork = new Map<number, BotWork>();
let botSession: any = null;
let botInit: Promise<any> | null = null;
let botUnavailable: string | null = null;
let botFatal: string | null = null;
let botGeneration = 0;
let botRevision: number | null = null;
let messageQueue: Promise<void> = Promise.resolve();
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
let underlay: any, motionUnderlay: any, ground: any, prepared: any, chrome: any, retained: any;
let fonts: any, fontLoad: Promise<void> | null = null;
let menuBase: any, menuControls: any, menuBaseData: any, menuBasePlan: any;
let menuStaticData: any, menuStaticPlan: any;
let plates: any, assetKey = '';
let spriteLayer: any, spriteFrame: any, spriteTheme: number | null = null;
let spriteHelper: Worker | null = null, spriteHello = false, spriteGeneration = 0, spriteTaskId = 0;
let spritePending: { id: number; generation: number; frame: any; theme: number;
  revision: number; at: number } | null = null;
let latestPacket: any, lastHostId = 0;
let spriteMetrics: any = null;
let sceneTimes = { underlay: 0, motionUnderlay: 0, ground: 0, sprite: 0,
  prepared: 0, shell: 0, chrome: 0, pointer: 0, compose: 0 };

async function ensureBotSession(): Promise<any> {
  if (botSession) return botSession;
  if (botInit) return botInit;
  if (botUnavailable) throw new Error(botUnavailable);
  const generation = botGeneration;
  botInit = (async () => {
    let candidate: any;
    try {
      const entry = new URL('./worker-libs/bot/index.mjs', import.meta.url);
      const library = await import(entry.href);
      candidate = library.createSession({ workers: 2, transport: 'clone' });
      await candidate.warmup();
      if (generation !== botGeneration) {
        candidate.close();
        throw new Error('Bend bot worker setup was superseded by a newer position');
      }
      botSession = candidate;
      return candidate;
    } catch (error) {
      try { candidate?.close(); } catch { /* failed initialization already owns no live session */ }
      if (generation === botGeneration) botUnavailable = String(error);
      throw error;
    }
  })();
  return botInit;
}

function invalidateBotWork(resetCapability: boolean): void {
  const pending = [...botWork.values()].some((work) => work.kind === 'pending');
  botGeneration++;
  botRevision = null;
  botWork.clear();
  if (pending || resetCapability) {
    const current = botSession;
    botSession = null;
    botInit = null;
    try { current?.close(); } catch { /* stale work is already unusable */ }
  }
  if (resetCapability) {
    botUnavailable = null;
    botFatal = null;
  }
}

function observeBotJob(job: any): void {
  if (!job?.eligible) {
    if (botRevision !== null) invalidateBotWork(false);
    return;
  }
  if (botRevision === job.revision) return;
  if (botRevision !== null) invalidateBotWork(false);
  botRevision = job.revision;
}

function scheduleBot(job: any): void {
  if (!job?.eligible || botUnavailable || botFatal || botWork.has(job.revision)) return;
  const generation = botGeneration;
  botWork.set(job.revision, { kind: 'pending' });
  void ensureBotSession().then((workerSession) =>
    workerSession.call('choose', [job.position, job.ids])).then((id: number) => {
      if (generation !== botGeneration) return;
      botWork.set(job.revision, { kind: 'ready', id });
    }, (error: unknown) => {
      if (generation !== botGeneration) return;
      if (!botSession) {
        const message = botUnavailable ?? String(error);
        botUnavailable = message;
        botWork.set(job.revision, { kind: 'unavailable', message });
        return;
      }
      const message = String(error);
      botFatal = message;
      botWork.set(job.revision, { kind: 'failed', message });
      for (const [revision, work] of botWork) {
        if (work.kind === 'pending') botWork.set(revision, { kind: 'failed', message });
      }
      const failedSession = botSession;
      botSession = null;
      botInit = null;
      botGeneration++;
      try { failedSession.close(); } catch { /* a failed session is no longer reusable */ }
    });
}

function applyReadyBot(packet: any): any {
  const job = api.bot_job(packet.session);
  if (!job.eligible || !job.canApply) return packet;
  const work = botWork.get(job.revision);
  if (work?.kind === 'failed') throw new Error(`Bend bot worker failed: ${work.message}`);
  if (work?.kind === 'ready') {
    botWork.delete(job.revision);
    const next = api.bot_apply_at(job.revision, work.id, packet.session);
    if (next.presentation.revision === job.revision)
      throw new Error('Bend rejected the bot worker choice for a ready revision');
    return next;
  }
  if (work?.kind === 'unavailable' || botUnavailable) {
    botWork.delete(job.revision);
    const next = api.bot_fallback_at(job.revision, packet.session);
    if (next.presentation.revision === job.revision)
      throw new Error('Bend serial bot fallback rejected a ready revision');
    return next;
  }
  return packet;
}

function disposeBot(): void {
  invalidateBotWork(true);
}

function spriteFault(message: string): void {
  self.postMessage({ kind: 'fault', id: lastHostId, message: `Bend sprite worker: ${message}` });
}

function disposeSprite(): void {
  spriteGeneration++;
  spritePending = null;
  spriteHello = false;
  spriteLayer = spriteFrame = null;
  spriteTheme = null;
  spriteMetrics = null;
  spriteHelper?.terminate();
  spriteHelper = null;
}

function ensureSpriteHelper(): void {
  if (spriteHelper) return;
  const helper = new Worker(new URL(__BEND_SPRITE_HELPER__, import.meta.url), { type: 'module' });
  spriteHelper = helper;
  helper.addEventListener('error', event => spriteFault(event.message));
  helper.addEventListener('message', event => {
    const message = event.data;
    if (message?.protocol !== 1 || message.source !== __BEND_SPRITE_SOURCE__) {
      spriteFault('source/protocol binding mismatch'); return;
    }
    if (message.kind === 'hello') {
      spriteHello = true;
      if (latestPacket) scheduleSprite(latestPacket);
      return;
    }
    if (message.kind === 'stale') return;
    const pending = spritePending;
    if (!pending || message.id !== pending.id || message.generation !== pending.generation ||
        message.theme !== pending.theme) return;
    spritePending = null;
    if (message.kind === 'error') { spriteFault(String(message.message)); return; }
    if (message.kind !== 'result' || !['Pix', 'Qua'].includes(message.image?.$)) {
      spriteFault('invalid image result'); return;
    }
    messageQueue = messageQueue.then(async () => {
      const current = latestPacket;
      if (!current || current.render.boardSize !== 512 || current.render.motion ||
          current.snapshot.moving || current.render.theme !== pending.theme ||
          current.presentation.revision !== pending.revision ||
          !scene.sprite_same_placement(pending.frame, current.snapshot.frame)) {
        if (current) scheduleSprite(current);
        return;
      }
      spriteLayer = message.image;
      spriteFrame = pending.frame;
      spriteTheme = pending.theme;
      spriteMetrics = { ...message.metrics, roundTripMs: performance.now() - pending.at };
      const refined = api.refine(session);
      if (refined.presentation.revision !== pending.revision ||
          !scene.sprite_same_placement(pending.frame, refined.snapshot.frame))
        throw new Error('Bend sprite refinement changed the current position');
      await emit(refined, 0, lastHostId, 'refinement');
      latestPacket = refined;
    }).catch(error => spriteFault(String(error)));
  });
}

function scheduleSprite(packet: any): void {
  if (packet.render.boardSize !== 512 || packet.render.motion || packet.snapshot.moving) return;
  const frame = packet.snapshot.frame, theme = packet.render.theme;
  if (spriteLayer && spriteTheme === theme && spriteFrame &&
      scene.sprite_same_placement(spriteFrame, frame)) return;
  ensureSpriteHelper();
  if (!spriteHello) return;
  if (spritePending && spritePending.theme === theme &&
      spritePending.revision === packet.presentation.revision &&
      scene.sprite_same_placement(spritePending.frame, frame)) return;
  const pending = { id: ++spriteTaskId, generation: ++spriteGeneration,
    frame, theme, revision: packet.presentation.revision, at: performance.now() };
  spritePending = pending;
  spriteHelper!.postMessage({ kind: 'job', protocol: 1, source: __BEND_SPRITE_SOURCE__,
    id: pending.id, generation: pending.generation, theme, frame });
}

function render(packet: any): any {
  const request = packet.render;
  if (!packet.dirty) {
    if (request.frame || !retained) throw new Error('Invalid retained Bend frame request');
    return retained;
  }
  const boardSize = request.boardSize;
  if (boardSize !== 512 && boardSize !== 1024) throw new Error('Unsupported Bend board tier');
  const suffix = String(boardSize);
  const frame = packet.snapshot.frame;
  const timed = (key: keyof typeof sceneTimes, fn: () => any) => {
    const at = performance.now(); const result = fn(); sceneTimes[key] = performance.now() - at; return result;
  };
  sceneTimes = { underlay: 0, motionUnderlay: 0, ground: 0, sprite: 0,
    prepared: 0, shell: 0, chrome: 0, pointer: 0, compose: 0 };
  if (request.background) {
    underlay = timed('underlay', () => scene[`underlay${suffix}_asset`](request.theme, plates));
    motionUnderlay = timed('motionUnderlay', () => scene.underlay128_asset(request.theme, plates));
  }
  if (!underlay || !motionUnderlay) throw new Error('Missing Bend underlay');
  if (request.ground) ground = timed('ground', () => scene[`fast_ground${suffix}`](frame, underlay));
  if (!ground) throw new Error('Missing Bend ground');
  const spriteSettled = boardSize === 512 && !request.motion && !packet.snapshot.moving &&
    spriteLayer && spriteFrame && spriteTheme === request.theme &&
    scene.sprite_same_placement(spriteFrame, frame);
  if (request.prepared || (spriteSettled && !prepared)) prepared = timed('prepared', () =>
    spriteSettled ? scene.fast_sprite_feedback_static512(frame, spriteLayer)
      : scene[`fast_prepare${suffix}`](frame, ground));
  if (!prepared) throw new Error('Missing Bend prepared scene');
  const data = packet.chromeData, plan = packet.plan;
  const playing = menu.play(data);
  if (playing) {
    if (request.shell || !menuBase || !menuBaseData ||
        !menu.same_base(menuBaseData, menuBasePlan, data, plan)) {
      menuBase = timed('shell', () => menu.base_chrome(request.depth, request.size,
        data, plan, fonts));
      menuBaseData = data; menuBasePlan = plan;
      menuControls = null; chrome = null;
    }
    if (!menuControls || !menuStaticData ||
        !menu.same_static(menuStaticData, menuStaticPlan, data, plan)) {
      menuControls = timed('chrome', () => menu.controls_chrome(request.depth,
        request.size, data, plan, fonts, menuBase));
      menuStaticData = data; menuStaticPlan = plan;
      chrome = null;
    }
    if (request.chrome || !chrome) chrome = timed('chrome', () =>
      menu.dynamic_chrome(request.depth, request.size, data, plan, fonts,
        menuControls));
  }
  if (!request.frame) throw new Error('Missing Bend frame request');
  // A depth-9 Bend preview is a 512 board at standard tier. At enhanced tier
  // Canvas.embed_at interprets that same immutable tree at depth 10, giving
  // exact nearest-2 pixels (the independent four-view finite test checks it).
  const board = timed('pointer', () => request.motion
    ? scene.fast_camera512(frame, motionUnderlay)
    : scene[`fast_pointer${suffix}`](frame, prepared));
  retained = timed('compose', () => playing
    ? menu.compose(request.depth, plan, board, chrome)
    : menu.render(request.depth, request.size, data, plan, fonts, board));
  return retained;
}
async function ensurePlate(packet: any): Promise<void> {
  if (!packet.render.background && plates) return;
  const requests = values(scene.asset_ids(packet.render.theme));
  const key = requests.map(request => `${request.path}:${request.max_bytes}`).join('|');
  if (plates && key === assetKey) return;
  const responses = await loadAssetRequests(requests);
  plates = scene.load_plates(list(responses));
  assetKey = key;
}
async function ensureFont(): Promise<void> {
  if (fonts) return;
  if (!fontLoad) fontLoad = (async () => {
    const response = await loadFontPack(menu.font_path(), menu.font_byte_cap());
    if (!response.ok) throw new Error('Bend font asset unavailable');
    const decoded = menu.load_font(response.bytes, response.used);
    if (decoded?.$ !== 'Some') throw new Error('Bend rejected its source-bound font pack');
    fonts = decoded.value;
  })();
  await fontLoad;
}
async function emit(packet: any, elapsed: number, id: number,
  kind: 'frame' | 'refinement' = 'frame'): Promise<void> {
  const portStart = performance.now();
  session = packet.session;
  await Promise.all([ensurePlate(packet), ensureFont()]);
  const transfers: Transferable[] = [];
  const pixelStart = performance.now();
  const frame = render(packet);
  const treeMs = performance.now() - pixelStart;
  const pixels: ArrayBuffer | null = packet.dirty
    ? pixelPort.render(frame, packet.width, packet.height, extentForOutput(packet.width, packet.height)) : null;
  const traversalMs = performance.now() - pixelStart - treeMs;
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
  self.postMessage({ kind, id, image, bitmap, width: packet.width, height: packet.height,
    controls: values(packet.controls), presentation: packet.presentation, summary: packet.summary,
    effects, after: packet.after, renderMs: elapsed, portMs: performance.now() - portStart, pixelMs, audioMs,
    treeMs, traversalMs, sceneTimes, spriteMetrics,
    pixelStats: { ...pixelPort.lastStats } }, { transfer: transfers });
}
async function handleMessage(request: any): Promise<void> {
  const start = performance.now();
  try {
    if (request.kind === 'dispose') {
      disposeBot();
      disposeSprite();
      self.postMessage({ kind: 'disposed', id: request.id });
      return;
    }
    if (botFatal) throw new Error(`Bend bot worker failed: ${botFatal}`);
    let packet: any;
    if (request.kind === 'boot') {
      disposeBot();
      disposeSprite();
      bitmapSurface = new BitmapSurface(request.imageBitmap === true);
      packet = api.boot_reads(request.saved.text, request.prefs.text, request.saved.ok, request.prefs.ok, request.width, request.height);
    } else {
      packet = api.dispatch_at_web(list(request.events), request.presentation, session);
    }
    packet = applyReadyBot(packet);
    observeBotJob(api.bot_job(packet.session));
    await emit(packet, performance.now() - start, request.id);
    latestPacket = packet;
    lastHostId = request.id;
    scheduleSprite(packet);
    scheduleBot(api.bot_job(packet.session));
  } catch (error) {
    self.postMessage({ kind: 'fault', id: request.id, message: String(error) });
  }
}

// Browser callers normally wait for one frame before sending the next event,
// but serialize here too: asset awaits and async render work must not let an
// older request overwrite a newer Bend session or retained image cache.
self.addEventListener('message', event => {
  const request = event.data;
  messageQueue = messageQueue.then(() => handleMessage(request));
});
self.postMessage({ kind: 'ready', keys: [api.storage_key(0), api.storage_key(1), api.storage_key(2)], maxFileBytes: api.max_file_bytes() });
