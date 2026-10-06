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
let cameraOrbiting = false;
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
let preparedAtlas = false, renderedAtlas = false;
let spriteAtlasMaskId: number | null = null;
let preparedAtlasMaskId: number | null = null, renderedAtlasMaskId: number | null = null;
const MAX_ATLAS_MASKS = 8;
let atlasMaskOffer = 0, atlasMaskPressure = false;
const atlasMasks = new Map<number, {
  frame: any; pieces: any; retired: boolean; firstOffer: number; lastOffer: number;
}>();

function pruneAtlasMasks(): void {
  for (const [id, mask] of atlasMasks) {
    if (mask.retired && id !== spriteAtlasMaskId && id !== preparedAtlasMaskId &&
        id !== renderedAtlasMaskId) atlasMasks.delete(id);
  }
}
let spritePlateTheme: number | null = null;
let spriteHelper: Worker | null = null, spriteHello = false, spriteGeneration = 0, spriteTaskId = 0;
let spritePending: { id: number; generation: number; frame: any; theme: number;
  revision: number; at: number; epoch: number; quietWindowMs: number } | null = null;
// A rapid sequence of settled camera commands otherwise starts an expensive
// helper render for an intermediate view before the next input arrives.
const CAMERA_QUIET_MS = 450;
let spriteQueued: { frame: any; theme: number; revision: number } | null = null;
let spriteReleased: { frame: any; theme: number; revision: number } | null = null;
let spriteTimer: ReturnType<typeof setTimeout> | null = null;
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

function clearSpriteQueue(): void {
  if (spriteTimer !== null) clearTimeout(spriteTimer);
  spriteTimer = null;
  spriteQueued = null;
}

function disposeSprite(): void {
  spriteGeneration++;
  spritePending = null;
  spriteReleased = null;
  clearSpriteQueue();
  spriteHello = false;
  spriteLayer = spriteFrame = null;
  spriteAtlasMaskId = preparedAtlasMaskId = renderedAtlasMaskId = null;
  atlasMasks.clear();
  atlasMaskPressure = false;
  preparedAtlas = renderedAtlas = false;
  spriteTheme = null;
  spritePlateTheme = null;
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
      if (!current || (current.render.boardSize !== 512 && current.render.boardSize !== 1024) ||
          cameraOrbiting || current.render.motion ||
          current.snapshot.moving || current.render.theme !== pending.theme ||
          current.presentation.revision !== pending.revision ||
          !scene.sprite_same_placement(pending.frame, current.snapshot.frame)) {
        if (current) scheduleSprite(current);
        return;
      }
      if (message.pickData?.$ !== 'Pieces')
        throw new Error('Bend atlas image has no current pose alpha data');
      pruneAtlasMasks();
      // Defer detail rather than evict masks used by an outstanding presentation.
      if (atlasMasks.size >= MAX_ATLAS_MASKS) { atlasMaskPressure = true; return; }
      if (!Number.isSafeInteger(pending.id) || pending.id < 1 || atlasMasks.has(pending.id))
        throw new Error('Invalid or reused atlas mask identity');
      atlasMasks.set(pending.id, { frame: pending.frame, pieces: message.pickData,
        retired: false, firstOffer: 0, lastOffer: 0 });
      atlasMaskPressure = false;
      spriteAtlasMaskId = pending.id;
      spriteLayer = message.image;
      spriteFrame = pending.frame;
      spriteTheme = pending.theme;
      const received = performance.now();
      const epoch = performance.timeOrigin + received;
      spriteMetrics = { ...message.metrics,
        // These spans include structured cloning/scheduling and the serialized
        // receiver callback respectively; neither is a pure transfer metric.
        dispatchToStartMs: message.metrics.startedEpochMs - pending.epoch,
        sendToAcceptanceMs: epoch - message.metrics.sendEpochMs,
        quietWindowMs: pending.quietWindowMs,
        roundTripMs: received - pending.at };
      const refined = api.refine(session);
      if (refined.presentation.revision !== pending.revision ||
          !scene.sprite_same_placement(pending.frame, refined.snapshot.frame))
        throw new Error('Bend sprite refinement changed the current position');
      await emit(refined, 0, lastHostId, 'refinement');
      latestPacket = refined;
    }).catch(error => spriteFault(String(error)));
  });
}

function startSpriteJob(frame: any, theme: number, revision: number,
  quietWindowMs = 0): void {
  const at = performance.now();
  if (spriteTaskId >= Number.MAX_SAFE_INTEGER) {
    spriteFault('Atlas mask identity exhausted');
    return;
  }
  const pending = { id: ++spriteTaskId, generation: ++spriteGeneration,
    frame, theme, revision, at, epoch: performance.timeOrigin + at, quietWindowMs };
  spritePending = pending;
  // The main Bend worker already decoded this exact theme plate for its first
  // playable frame. Clone it only on a helper/theme transition; the helper
  // keeps its independent request/decode fallback for superseded jobs.
  const selected = theme === 0 ? plates?.astral : plates?.stone;
  const usablePlate = plates?.$ === 'ObservatoryPlates' && selected?.$ === 'Ready' &&
    selected.depth === 9 && ['Pix', 'Qua'].includes(selected.pixels?.$);
  const sharedPlate = spritePlateTheme === theme || !usablePlate ? undefined : plates;
  spriteHelper!.postMessage({ kind: 'job', protocol: 1, source: __BEND_SPRITE_SOURCE__,
    needPickData: true,
    id: pending.id, generation: pending.generation, theme, frame,
    ...(sharedPlate ? { plates: sharedPlate } : {}) });
  if (sharedPlate) spritePlateTheme = theme;
}

function scheduleSprite(packet: any, cameraReleased = false): void {
  const frame = packet.snapshot.frame, theme = packet.render.theme;
  if (cameraReleased) {
    spriteReleased = { frame, theme, revision: packet.presentation.revision };
  } else if (spriteReleased && (spriteReleased.theme !== theme ||
      spriteReleased.revision !== packet.presentation.revision ||
      !scene.sprite_same_placement(spriteReleased.frame, frame))) {
    spriteReleased = null;
  }
  const released = spriteReleased !== null;
  if ((packet.render.boardSize !== 512 && packet.render.boardSize !== 1024) ||
      cameraOrbiting || packet.render.motion || packet.snapshot.moving) {
    spriteReleased = null;
    clearSpriteQueue();
    return;
  }
  if (spriteLayer && spriteTheme === theme && spriteFrame &&
      scene.sprite_same_placement(spriteFrame, frame)) {
    spriteReleased = null;
    clearSpriteQueue();
    return;
  }
  ensureSpriteHelper();
  if (!spriteHello) return;
  if (spritePending && spritePending.theme === theme &&
      spritePending.revision === packet.presentation.revision &&
      scene.sprite_same_placement(spritePending.frame, frame)) {
    spriteReleased = null;
    return;
  }
  if (!released && spriteQueued && spriteQueued.theme === theme &&
      spriteQueued.revision === packet.presentation.revision &&
      scene.sprite_same_placement(spriteQueued.frame, frame)) return;
  clearSpriteQueue();
  if (!released && spriteLayer && spriteFrame && spriteTheme === theme && packet.render.ground &&
      scene.sprite_camera_only_change(spriteFrame, frame)) {
    spriteQueued = { frame, theme, revision: packet.presentation.revision };
    spriteTimer = setTimeout(() => {
      const queued = spriteQueued, current = latestPacket;
      clearSpriteQueue();
      if (!queued || !current || cameraOrbiting || current.render.motion || current.snapshot.moving ||
          current.render.theme !== queued.theme ||
          current.presentation.revision !== queued.revision ||
          !scene.sprite_same_placement(queued.frame, current.snapshot.frame)) return;
      startSpriteJob(queued.frame, queued.theme, queued.revision, CAMERA_QUIET_MS);
    }, CAMERA_QUIET_MS);
    return;
  }
  spriteReleased = null;
  startSpriteJob(frame, theme, packet.presentation.revision);
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
  const spriteSettled = !request.motion && !packet.snapshot.moving &&
    spriteLayer && spriteFrame && spriteTheme === request.theme &&
    scene.sprite_same_placement(spriteFrame, frame);
  if (request.prepared || (spriteSettled && !prepared)) {
    preparedAtlas = Boolean(spriteSettled);
    preparedAtlasMaskId = preparedAtlas ? spriteAtlasMaskId : null;
    prepared = timed('prepared', () =>
    spriteSettled ? (boardSize === 512
      ? scene.fast_sprite_feedback_static512(frame, spriteLayer)
      : scene.nearest2(9n, scene.fast_sprite_feedback_static512(frame, spriteLayer)))
      : scene[`fast_prepare${suffix}`](frame, ground));
  }
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
  // Motion keeps depth-8 Bend pixels from the 256px preview. The aligned
  // 512px/1024px board slots interpret that tree at depth 9/10, giving exact
  // nearest-2/nearest-4 pixels (the multi-layout finite test checks both).
  const board = timed('pointer', () => request.motion
    ? scene.fast_camera256_for_512(frame, motionUnderlay)
    : scene[`fast_pointer${suffix}`](frame, prepared));
  renderedAtlas = !request.motion && preparedAtlas;
  renderedAtlasMaskId = renderedAtlas ? preparedAtlasMaskId : null;
  pruneAtlasMasks();
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
  let maskOffer: number | null = null;
  if (renderedAtlas) {
    const mask = renderedAtlasMaskId === null ? undefined : atlasMasks.get(renderedAtlasMaskId);
    if (!mask || !scene.sprite_has_view(mask.frame, packet.presentation.view))
      throw new Error('Rendered atlas presentation has no matching pose alpha data');
    if (atlasMaskOffer >= Number.MAX_SAFE_INTEGER)
      throw new Error('Atlas presentation identity exhausted');
    maskOffer = ++atlasMaskOffer;
    if (!mask.firstOffer) mask.firstOffer = maskOffer;
    mask.lastOffer = maskOffer;
    mask.retired = false;
  }
  self.postMessage({ kind, id, image, bitmap, width: packet.width, height: packet.height,
    renderTheme: packet.render.theme,
    atlasPick: renderedAtlas, atlasMaskId: renderedAtlas ? renderedAtlasMaskId : null, atlasMaskOffer: maskOffer,
    controls: values(packet.controls), presentation: packet.presentation, summary: packet.summary,
    effects, after: packet.after, renderMs: elapsed, portMs: performance.now() - portStart, pixelMs, audioMs,
    treeMs, traversalMs, sceneTimes, spriteMetrics,
    pixelStats: { ...pixelPort.lastStats } }, { transfer: transfers });
}
async function handleMessage(request: any): Promise<void> {
  const start = performance.now();
  try {
    if (request.kind === 'retire-atlas-masks') {
      if (Object.keys(request).length !== 2 || !Array.isArray(request.masks) ||
          !request.masks.length || request.masks.length > MAX_ATLAS_MASKS ||
          new Set(request.masks.map((item: any) => item?.id)).size !== request.masks.length ||
          request.masks.some((item: any) => !Number.isSafeInteger(item?.id) || item.id < 1 ||
            !Number.isSafeInteger(item?.offer) || item.offer < 1 || !atlasMasks.has(item.id) ||
            item.offer < atlasMasks.get(item.id)!.firstOffer ||
            item.offer > atlasMasks.get(item.id)!.lastOffer || Object.keys(item).length !== 2))
        throw new Error('Invalid atlas mask retirement');
      const before = atlasMasks.size;
      for (const item of request.masks) {
        const mask = atlasMasks.get(item.id)!;
        if (item.offer === mask.lastOffer) mask.retired = true;
      }
      pruneAtlasMasks();
      if (atlasMasks.size < before && atlasMaskPressure && latestPacket) {
        atlasMaskPressure = false;
        scheduleSprite(latestPacket);
      }
      return;
    }
    if (request.kind === 'dispose') {
      disposeBot();
      disposeSprite();
      self.postMessage({ kind: 'disposed', id: request.id });
      return;
    }
    if (botFatal) throw new Error(`Bend bot worker failed: ${botFatal}`);
    let packet: any;
    let cameraReleased = false;
    if (request.kind === 'boot') {
      disposeBot();
      disposeSprite();
      bitmapSurface = new BitmapSurface(request.imageBitmap === true);
      packet = api.boot_reads(request.saved.text, request.prefs.text, request.saved.ok, request.prefs.ok, request.width, request.height);
    } else {
      if (request.presentation?.atlasPick === true) {
        const id = request.presentation.atlasMaskId;
        const mask = Number.isSafeInteger(id) ? atlasMasks.get(id) : undefined;
        const offer = request.presentation.atlasMaskOffer;
        if (!mask || !Number.isSafeInteger(offer) || offer < 1 || offer < mask.firstOffer || offer > mask.lastOffer ||
            !scene.sprite_has_view(mask.frame, request.presentation.view))
          throw new Error('Displayed atlas frame lost its matching pose alpha data');
        const dispatched = api.dispatch_at_web_atlas_meta(list(request.events), request.presentation, mask.pieces, session);
        packet = dispatched.packet;
        cameraReleased = dispatched.cameraReleased === true;
      } else {
        const dispatched = api.dispatch_at_web_meta(list(request.events), request.presentation, session);
        packet = dispatched.packet;
        cameraReleased = dispatched.cameraReleased === true;
      }
    }
    packet = applyReadyBot(packet);
    const orbiting = api.orbiting(packet.session) === true;
    cameraOrbiting = orbiting;
    observeBotJob(api.bot_job(packet.session));
    await emit(packet, performance.now() - start, request.id);
    latestPacket = packet;
    lastHostId = request.id;
    scheduleSprite(packet, cameraReleased);
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
