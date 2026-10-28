// Generic executor for Bend-authored RenderPlan requests. Independently
// compiled Bend books own rules, menu, picking, cache policy and pixels.
// @ts-ignore Compiled by the pinned Bend loader.
import Controller from '../../ApplicationControl.bend';
// @ts-ignore A separate Bend pixel book.
import BoardScene from '../../graphics/v2game/BoardScene.bend';
// @ts-ignore A separate Bend native-resolution menu/raster book.
import MenuAA from '../../ui/v2/MenuAA.bend';
import { PixelPort, extentForOutput, replaceRetainedBackground } from './image-port';
import { BitmapSurface } from './bitmap-surface';
import { loadAssetRequests, loadFontPack } from './asset-port';
import { decodePose, decodeGround } from './pose-port';
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
let underlay: any, motionUnderlay: any, motionBackdrop: any, motionBackdrop512: any;
let ground: any, prepared: any, chrome: any, retained: any;
let spritePrepared: { frame: any; layer: any; boardSize: number; image: any } | null = null;
let sceneReuse = { staticFeedback: false, menuBackground: false };
let assetTimes = { plateTransport: 0, plateDecode: 0, fontTransport: 0, fontDecode: 0 };
let menuBackground: { depth: any; size: number; data: any; plan: any;
  fonts: any; board: any; base: any; image: any } | null = null;
// Bend requests invalidate these caches even when the current artwork/orbit
// path does not consume them. Preserve that work until the cache is needed.
let groundInvalidated = true, preparedInvalidated = true;
let fonts: any, fontLoad: Promise<void> | null = null;
let menuBase: any, menuControls: any, menuBaseData: any, menuBasePlan: any;
let menuStaticData: any, menuStaticPlan: any;
let plates: any, assetKey = '';
let spriteLayer: any, spriteFrame: any, spriteTheme: number | null = null;
// One current color pose, separate from the historical presentation alpha masks.
let spritePose: { pieces: any; frame: any; theme: number; supports?: any } | null = null;
let spriteGround: { image: any; frame: any; theme: number; id: number } | null = null;
let spriteMotion: { frame: any; old: any; pieces: any; clip: any } | null = null;
// Preview ownership never replaces the helper's settled pose/ground/layer.
let spritePreview: { frame: any; pieces: any; supports: any; theme: number; maskId: number;
  artwork: { frame: any; image: any; backdrop: any } | null } | null = null;
let preparedAtlas = false, renderedAtlas = false;
let spriteAtlasMaskId: number | null = null;
let preparedAtlasMaskId: number | null = null, renderedAtlasMaskId: number | null = null;
const MAX_ATLAS_MASKS = 8;
let atlasMaskOffer = 0, atlasMaskPressure = false;
const atlasMasks = new Map<number, {
  frame: any; pieces: any; raster: 256 | 512; filter: 'linear' | 'nearest'; retired: boolean; firstOffer: number; lastOffer: number;
}>();

function pruneAtlasMasks(): void {
  for (const [id, mask] of atlasMasks) {
    if (mask.retired && id !== spriteAtlasMaskId && id !== preparedAtlasMaskId &&
        id !== renderedAtlasMaskId && id !== spritePreview?.maskId) atlasMasks.delete(id);
  }
}
let spritePlateTheme: number | null = null;
let spriteHelper: Worker | null = null, spriteHello = false, spriteGeneration = 0, spriteTaskId = 0;
let spritePending: { id: number; generation: number; frame: any; theme: number;
  revision: number; at: number; epoch: number; quietWindowMs: number; heldEpoch: number | null } | null = null;
// A rapid sequence of settled camera commands otherwise starts an expensive
// helper render for an intermediate view before the next input arrives.
const CAMERA_QUIET_MS = 450;
const HELD_CAMERA_QUIET_MS = 200;
let cameraInputEpoch = 0, spriteHeldEpoch: number | null = null;
let spriteQueued: { frame: any; theme: number; revision: number; heldEpoch: number | null;
  readyAt: number; quietWindowMs: number } | null = null;
let spriteReleased: { frame: any; theme: number; revision: number } | null = null;
let spriteTimer: ReturnType<typeof setTimeout> | null = null;
let latestPacket: any, lastHostId = 0;
let spriteMetrics: any = null;
let sceneTimes = { underlay: 0, motionUnderlay: 0, ground: 0, sprite: 0,
  previewSupport: 0, previewGround: 0, previewSprites: 0, previewPaint: 0,
  prepared: 0, shell: 0, chrome: 0, pointer: 0, compose: 0 };

async function ensureBotSession(): Promise<any> {
  if (botSession) return botSession;
  if (botInit) return botInit;
  if (botUnavailable) throw new Error(botUnavailable);
  const generation = botGeneration;
  botInit = (async () => {
    let library: any;
    try {
      const entry = new URL('./worker-libs/bot/index.mjs', import.meta.url);
      library = await import(entry.href);
    } catch (error) {
      if (generation === botGeneration) botUnavailable = String(error);
      throw error;
    }
    let candidate: any;
    try {
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
      if (generation === botGeneration) {
        // Only genuine Worker unavailability permits a serial startup fallback.
        // The scheduler's fatal protocol/build errors must reach the host fault.
        if ((error as any)?.code === 'workers_unavailable') botUnavailable = String(error);
        else botFatal = String(error);
      }
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
      if (botUnavailable) {
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
      try { failedSession?.close(); } catch { /* a failed session is no longer reusable */ }
    });
}

// A diagnostic accompanies only the frame that applies a completed bot choice.
// It records the actual route; it never authorizes or changes a Bend transition.
type BotExecution = { route: 'worker' | 'serial-fallback'; generation: number;
  fromRevision: number; toRevision: number; choiceId: number | null };

function applyReadyBot(packet: any): { packet: any; execution?: BotExecution } {
  const job = api.bot_job(packet.session);
  if (!job.eligible || !job.canApply) return { packet };
  const work = botWork.get(job.revision);
  if (work?.kind === 'failed') throw new Error(`Bend bot worker failed: ${work.message}`);
  if (work?.kind === 'ready') {
    botWork.delete(job.revision);
    const next = api.bot_apply_at(job.revision, work.id, packet.session);
    if (next.presentation.revision === job.revision)
      throw new Error('Bend rejected the bot worker choice for a ready revision');
    return { packet: next, execution: { route: 'worker', generation: botGeneration,
      fromRevision: job.revision, toRevision: next.presentation.revision, choiceId: work.id } };
  }
  if (work?.kind === 'unavailable' || botUnavailable) {
    botWork.delete(job.revision);
    const next = api.bot_fallback_at(job.revision, packet.session);
    if (next.presentation.revision === job.revision)
      throw new Error('Bend serial bot fallback rejected a ready revision');
    return { packet: next, execution: { route: 'serial-fallback', generation: botGeneration,
      fromRevision: job.revision, toRevision: next.presentation.revision, choiceId: null } };
  }
  return { packet };
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
  cameraInputEpoch = 0;
  spriteHeldEpoch = null;
  clearSpriteQueue();
  spriteHello = false;
  spriteLayer = spriteFrame = null;
  spritePose = spriteGround = spriteMotion = null;
  spritePreview = null;
  spritePrepared = null;
  menuBackground = null;
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
  helper.addEventListener('error', event => {
    if (helper === spriteHelper) spriteFault(event.message);
  });
  helper.addEventListener('message', event => {
    if (helper !== spriteHelper) return;
    const message = event.data;
    if (message?.protocol !== 2 || message.source !== __BEND_SPRITE_SOURCE__) {
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
    if (message.kind === 'error') { spritePending = null; spriteFault(String(message.message)); return; }
    if (message.kind !== 'result' || message.image?.protocol !== 1) {
      spritePending = null;
      spriteFault('invalid image result'); return;
    }
    messageQueue = messageQueue.then(async () => {
      // A boot/dispose or newer job may run between receipt and acceptance.
      // Frame equality alone cannot bind helper-local ground identities.
      if (helper !== spriteHelper || spritePending !== pending || pending.generation !== spriteGeneration) return;
      spritePending = null;
      const current = latestPacket;
      if (!current || (current.render.boardSize !== 512 && current.render.boardSize !== 1024) ||
          ((cameraOrbiting || current.render.motion) && !(cameraOrbiting &&
            pending.heldEpoch !== null && pending.heldEpoch === cameraInputEpoch)) ||
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
      // Decode only a reply accepted by the source/generation/current-frame
      // guards above. No await can let an older view replace this pose.
      // This helper loads fixed atlas pages once for its lifetime. A new
      // accepted camera frame needs fresh placement/masks, not new textures.
      const pose = message.pose ? { pieces: decodePose(message.pose),
        frame: pending.frame, theme: pending.theme } : spritePose?.theme === pending.theme
        ? { ...spritePose, frame: pending.frame } : null;
      const settled = message.ground ? { image: decodeGround(message.ground),
        frame: pending.frame, theme: pending.theme, id: message.groundId } : spriteGround;
      if (!pose || pose.theme !== pending.theme || !scene.sprite_same_view(pose.frame, pending.frame) ||
          !settled || settled.theme !== pending.theme ||
          !Number.isSafeInteger(message.groundId) || message.groundId < 1 ||
          settled.id !== message.groundId || !scene.sprite_same_ground(settled.frame, pending.frame))
        throw new Error('Sprite refinement lacks its exact compatible pose or ground');
      const imageUnpackAt = performance.now();
      const layer = decodeGround(message.image);
      const imageUnpackMs = performance.now() - imageUnpackAt;
      atlasMasks.set(pending.id, { frame: pending.frame, pieces: message.pickData,
        raster: 512, filter: 'linear', retired: false, firstOffer: 0, lastOffer: 0 });
      atlasMaskPressure = false;
      spriteAtlasMaskId = pending.id;
      spriteLayer = layer;
      spriteFrame = pending.frame;
      spriteTheme = pending.theme;
      spritePose = pose;
      spriteGround = settled;
      spriteMotion = null;
      spriteHeldEpoch = cameraOrbiting ? pending.heldEpoch : null;
      clearSpriteQueue();
      const received = performance.now();
      const epoch = performance.timeOrigin + received;
      spriteMetrics = { ...message.metrics, imageUnpackMs,
        poseReused: !message.pose, poseTransportBytes: message.pose?.tokens.byteLength ?? 0,
        // These spans include structured cloning/scheduling and the serialized
        // receiver callback respectively; neither is a pure transfer metric.
        dispatchToStartMs: message.metrics.startedEpochMs - pending.epoch,
        sendToAcceptanceMs: epoch - message.metrics.sendEpochMs,
        quietWindowMs: pending.quietWindowMs,
        roundTripMs: received - pending.at };
      await emitSpriteRefinement(pending.frame, pending.revision);
    }).catch(error => spriteFault(String(error)));
  });
}

async function emitSpriteRefinement(frame: any, revision: number): Promise<void> {
  const refined = api.refine(session);
  if (refined.presentation.revision !== revision ||
      !scene.sprite_same_placement(frame, refined.snapshot.frame))
    throw new Error('Bend sprite refinement changed the current position');
  await emit(refined, 0, lastHostId, 'refinement');
  latestPacket = refined;
}

function startSpriteJob(frame: any, theme: number, revision: number,
  quietWindowMs = 0, heldEpoch: number | null = null): void {
  if (spritePending) throw new Error('Sprite helper already has an in-flight job');
  const at = performance.now();
  if (spriteTaskId >= Number.MAX_SAFE_INTEGER) {
    spriteFault('Atlas mask identity exhausted');
    return;
  }
  const pending = { id: ++spriteTaskId, generation: ++spriteGeneration,
    frame, theme, revision, at, epoch: performance.timeOrigin + at, quietWindowMs, heldEpoch };
  spritePending = pending;
  // The main Bend worker already decoded this exact theme plate for its first
  // playable frame. Clone it only on a helper/theme transition; the helper
  // keeps its independent request/decode fallback for superseded jobs.
  const selected = theme === 0 ? plates?.astral : plates?.stone;
  const usablePlate = plates?.$ === 'ObservatoryPlates' && selected?.$ === 'Ready' &&
    selected.depth === 9 && ['Pix', 'Qua'].includes(selected.pixels?.$);
  const sharedPlate = spritePlateTheme === theme || !usablePlate ? undefined : plates;
  spriteHelper!.postMessage({ kind: 'job', protocol: 2, source: __BEND_SPRITE_SOURCE__,
    needPickData: true,
    needPose: !spritePose || spritePose.theme !== theme,
    needGround: !spriteGround || spriteGround.theme !== theme || !scene.sprite_same_ground(spriteGround.frame, frame),
    knownGroundId: spriteGround?.id,
    id: pending.id, generation: pending.generation, theme, frame,
    ...(sharedPlate ? { plates: sharedPlate } : {}) });
  if (sharedPlate) spritePlateTheme = theme;
}

function armSpriteQueue(): void {
  if (!spriteQueued || spriteTimer !== null) return;
  spriteTimer = setTimeout(() => {
    spriteTimer = null;
    messageQueue = messageQueue.then(flushSpriteQueue).catch(error => spriteFault(String(error)));
  }, Math.max(0, spriteQueued.readyAt - performance.now()));
}

async function flushSpriteQueue(): Promise<void> {
  const queued = spriteQueued, current = latestPacket;
  if (!queued || !current) return;
  const held = queued.heldEpoch !== null;
  if ((current.render.boardSize !== 512 && current.render.boardSize !== 1024) || current.snapshot.moving ||
      (held ? !cameraOrbiting || queued.heldEpoch !== cameraInputEpoch
        : cameraOrbiting || current.render.motion) ||
      current.render.theme !== queued.theme || current.presentation.revision !== queued.revision ||
      !scene.sprite_same_placement(queued.frame, current.snapshot.frame)) {
    clearSpriteQueue();
    return;
  }
  if (performance.now() < queued.readyAt) { armSpriteQueue(); return; }
  // A synchronous helper render cannot be cancelled. Keep just this latest
  // desired view until the original job replies; never fill its message queue.
  if (spritePending) return;
  clearSpriteQueue();
  if (spriteLayer && spriteFrame && spriteTheme === queued.theme &&
      scene.sprite_same_placement(spriteFrame, queued.frame)) {
    if (held) {
      spriteHeldEpoch = queued.heldEpoch;
      await emitSpriteRefinement(queued.frame, queued.revision);
    }
    return;
  }
  startSpriteJob(queued.frame, queued.theme, queued.revision, queued.quietWindowMs, queued.heldEpoch);
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
      packet.snapshot.moving || (!cameraOrbiting && packet.render.motion)) {
    spriteReleased = null;
    clearSpriteQueue();
    return;
  }
  const heldEpoch = cameraOrbiting ? cameraInputEpoch : null;
  if (spriteLayer && spriteTheme === theme && spriteFrame &&
      scene.sprite_same_placement(spriteFrame, frame) &&
      (heldEpoch === null || spriteHeldEpoch === heldEpoch)) {
    spriteReleased = null;
    clearSpriteQueue();
    return;
  }
  ensureSpriteHelper();
  if (!spriteHello) return;
  if (spritePending && spritePending.theme === theme &&
      spritePending.revision === packet.presentation.revision &&
      scene.sprite_same_placement(spritePending.frame, frame) &&
      (heldEpoch === null || spritePending.heldEpoch === heldEpoch)) {
    spriteReleased = null;
    clearSpriteQueue();
    return;
  }
  if (!released && spriteQueued && spriteQueued.theme === theme && spriteQueued.heldEpoch === heldEpoch &&
      spriteQueued.revision === packet.presentation.revision &&
      scene.sprite_same_placement(spriteQueued.frame, frame)) { armSpriteQueue(); return; }
  clearSpriteQueue();
  const quietWindowMs = heldEpoch !== null ? HELD_CAMERA_QUIET_MS :
    !released && spriteLayer && spriteFrame && spriteTheme === theme && packet.render.ground &&
      scene.sprite_camera_only_change(spriteFrame, frame) ? CAMERA_QUIET_MS : 0;
  spriteQueued = { frame, theme, revision: packet.presentation.revision, heldEpoch,
    readyAt: performance.now() + quietWindowMs, quietWindowMs };
  spriteReleased = null;
  armSpriteQueue();
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
    previewSupport: 0, previewGround: 0, previewSprites: 0, previewPaint: 0,
    prepared: 0, shell: 0, chrome: 0, pointer: 0, compose: 0 };
  sceneReuse = { staticFeedback: false, menuBackground: false };
  if (request.background) {
    underlay = timed('underlay', () => scene[`underlay${suffix}_asset`](request.theme, plates));
    [motionUnderlay, motionBackdrop, motionBackdrop512] = timed('motionUnderlay', () => [
      scene.underlay128_asset(request.theme, plates), scene.underlay256_asset(request.theme, plates),
      boardSize === 512 ? underlay : scene.underlay512_asset(request.theme, plates)]);
  }
  if (!underlay || !motionUnderlay || !motionBackdrop || !motionBackdrop512) throw new Error('Missing Bend underlay');
  if (request.background || request.ground) {
    groundInvalidated = true;
    preparedInvalidated = true;
  }
  if (request.prepared) preparedInvalidated = true;
  const spriteTransition = !cameraOrbiting && spriteLayer && spriteFrame &&
    spriteTheme === request.theme && spritePose && spritePose.theme === request.theme &&
    scene.sprite_same_view(spritePose.frame, frame) &&
    spriteGround && spriteGround.theme === request.theme &&
    scene.sprite_same_ground(spriteGround.frame, frame) &&
    scene.sprite_motion_matches(frame, spriteFrame);
  // RenderPlan.motion marks an orbit drag; piece animation is in Snapshot.
  const spriteMoving = !request.motion && packet.snapshot.moving && spriteTransition;
  const spriteCompleted = !request.motion && !packet.snapshot.moving && spriteTransition &&
    scene.sprite_motion_complete(frame);
  const motionOccupancy = () => {
    if (!spriteMotion || spriteMotion.old !== spriteLayer ||
        spriteMotion.pieces !== spritePose!.pieces ||
        !scene.sprite_motion_transition_equal(spriteMotion.frame, frame)) {
      spriteMotion = { frame, old: spriteLayer, pieces: spritePose!.pieces,
        clip: scene.sprite_motion_dirty512(frame, spritePose!.pieces) };
    }
    return scene.fast_sprite_motion512(frame, spritePose!.pieces,
      spriteMotion.clip, spriteMotion.old, spriteGround!.image);
  };
  if (spriteCompleted) {
    spriteLayer = timed('sprite', motionOccupancy);
    spriteFrame = frame;
    spriteMotion = null;
    // Alpha textures describe this same view, independently of occupancy.
    // Reuse their existing mask identity and outstanding presentation offers.
  } else if (!spriteMoving) spriteMotion = null;
  const spriteSettled = !request.motion && !packet.snapshot.moving &&
    spriteLayer && spriteFrame && spriteTheme === request.theme &&
    scene.sprite_same_placement(spriteFrame, frame);
  const spriteHeld = cameraOrbiting && spriteHeldEpoch !== null && spriteHeldEpoch === cameraInputEpoch &&
    !packet.snapshot.moving && spriteLayer && spriteFrame && spriteAtlasMaskId !== null &&
    spriteTheme === request.theme && scene.sprite_same_placement(spriteFrame, frame);
  let preview: typeof spritePreview = null;
  // Retain artwork through release while the settled helper is still pending.
  // Before this theme's authored textures arrive, keep the existing proxy path.
  if (!spriteMoving && !spriteSettled && !spriteHeld && spritePose && spritePose.theme === request.theme) {
    if (spritePreview && spritePreview.theme === request.theme && scene.sprite_same_view(spritePreview.frame, frame)) {
      preview = spritePreview;
    } else {
      pruneAtlasMasks();
      if (atlasMasks.size < MAX_ATLAS_MASKS) {
        if (spriteTaskId >= Number.MAX_SAFE_INTEGER) throw new Error('Atlas mask identity exhausted');
        const pieces = spritePose.pieces;
        const maskId = ++spriteTaskId;
        atlasMasks.set(maskId, { frame, pieces: scene.sprite_pick_data(pieces),
          raster: 512, filter: 'nearest', retired: false, firstOffer: 0, lastOffer: 0 });
        // Support bounds depend only on this exact immutable pose's textures.
        // Keep them through orbit views; a decoded replacement drops the cache.
        const supports = spritePose.supports ??= timed('previewSupport', () => scene.sprite_supports(pieces));
        preview = spritePreview = { frame, pieces, supports, theme: request.theme, maskId, artwork: null };
      }
    }
  } else spritePreview = null;
  // Orbit preserves Bend's original cache keys. Never rebuild a deferred cache
  // at an intermediate orbit view and clear the invalidation for that old key.
  if (!request.motion && !spriteMoving && !preview) {
    if (!spriteSettled && (groundInvalidated || !ground)) {
      ground = timed('ground', () => scene[`fast_ground${suffix}`](frame, underlay));
      groundInvalidated = false;
      preparedInvalidated = true;
    }
    if (!spriteSettled && !ground) throw new Error('Missing Bend ground');
    if (preparedInvalidated || spriteCompleted || !prepared) {
      preparedAtlas = Boolean(spriteSettled);
      preparedAtlasMaskId = preparedAtlas ? spriteAtlasMaskId : null;
      prepared = timed('prepared', () => {
        if (!spriteSettled) {
          spritePrepared = null;
          return scene[`fast_prepare${suffix}`](frame, ground);
        }
        if (spritePrepared && spritePrepared.layer === spriteLayer && spritePrepared.boardSize === boardSize &&
            scene.sprite_same_static_feedback(spritePrepared.frame, frame)) {
          sceneReuse.staticFeedback = true;
          return spritePrepared.image;
        }
        const feedback = scene.fast_sprite_feedback_static512(frame, spriteLayer);
        const image = boardSize === 512 ? feedback : scene.nearest2(9n, feedback);
        spritePrepared = { frame, layer: spriteLayer, boardSize, image };
        return image;
      });
      preparedInvalidated = false;
    }
    if (!prepared) throw new Error('Missing Bend prepared scene');
  }
  const data = packet.chromeData, plan = packet.plan;
  const playing = menu.play(data);
  if (request.shell || !menuBase || !menuBaseData ||
      !menu.same_base(menuBaseData, menuBasePlan, data, plan)) {
    menuBase = timed('shell', () => menu.base_chrome(request.depth, request.size,
      data, plan, fonts));
    menuBaseData = data; menuBasePlan = plan;
    menuControls = null; chrome = null;
  }
  if (playing) {
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
  // Piece motion retains depth-9 artwork. Camera previews keep authored pieces
  // at depth nine with nearest sampling and matching raster/filter alpha masks.
  const board = timed('pointer', () => {
    if (spriteHeld) return scene.fast_sprite_camera_feedback512(frame, spriteLayer);
    if (spriteMoving) {
      // The exact same-view ground is independent of occupancy and pointer
      // feedback. Interpret this 512px image at the board's existing tier.
      const occupancy = timed('sprite', motionOccupancy);
      const artwork = scene.fast_feedback_on_pieces512(frame, occupancy);
      return boardSize === 512 ? artwork : scene.nearest2(9n, artwork);
    }
    if (preview) {
      if (!preview.artwork || preview.artwork.backdrop !== motionBackdrop512 ||
          !scene.sprite_preview_same_artwork(preview.artwork.frame, frame)) {
        const image = timed('previewPaint', () => {
          // Preserve the detailed plate only where the fast Bend painter kept
          // its base; board geometry still uses the responsive 256px raster.
          const backdrop = timed('previewGround', () =>
            replaceRetainedBackground(
              scene.fast_sprite_camera_ground256(frame, motionBackdrop),
              motionBackdrop, motionBackdrop512));
          return timed('previewSprites', () =>
            scene.fast_sprite_camera_layer512_nearest(frame, preview!.pieces, preview!.supports, backdrop));
        });
        preview.artwork = { frame, image, backdrop: motionBackdrop512 };
      }
      return scene.fast_sprite_camera_feedback512(frame, preview.artwork.image);
    }
    return request.motion ? replaceRetainedBackground(
      scene.fast_camera256_for_512(frame, motionUnderlay), motionUnderlay, motionBackdrop)
      : scene[`fast_pointer${suffix}`](frame, prepared);
  });
  renderedAtlas = Boolean(preview) || Boolean(spriteHeld) || (!request.motion && (spriteMoving
    ? spriteAtlasMaskId !== null : !packet.snapshot.moving && preparedAtlas));
  renderedAtlasMaskId = renderedAtlas
    ? (preview ? preview.maskId : spriteHeld || spriteMoving ? spriteAtlasMaskId : preparedAtlasMaskId) : null;
  pruneAtlasMasks();
  retained = timed('compose', () => {
    // A closed menu may reuse its one background on reopening. Drop it as
    // soon as any retained image or rendering resource changes.
    if (menuBackground && (menuBackground.depth !== request.depth || menuBackground.size !== request.size ||
        menuBackground.fonts !== fonts || menuBackground.board !== board || menuBackground.base !== menuBase))
      menuBackground = null;
    if (playing) {
      return menu.compose(request.depth, plan, board, chrome);
    }
    if (!menuBackground || !menu.same_background(menuBackground.data, menuBackground.plan, data, plan)) {
      menuBackground = { depth: request.depth, size: request.size, data, plan,
        fonts, board, base: menuBase,
        image: menu.background_chrome(request.depth, request.size, data, plan, fonts, board, menuBase) };
    }
    else sceneReuse.menuBackground = true;
    return menu.foreground_chrome(request.depth, request.size, data, plan, fonts, menuBackground.image);
  });
  return retained;
}
async function ensurePlate(packet: any): Promise<void> {
  if (!packet.render.background && plates) return;
  const requests = values(scene.asset_ids(packet.render.theme));
  const key = requests.map(request => `${request.path}:${request.max_bytes}`).join('|');
  if (plates && key === assetKey) return;
  const transportStart = performance.now();
  const responses = await loadAssetRequests(requests);
  assetTimes.plateTransport = performance.now() - transportStart;
  const decodeStart = performance.now();
  plates = scene.load_plates(list(responses));
  assetTimes.plateDecode = performance.now() - decodeStart;
  assetKey = key;
}
async function ensureFont(): Promise<void> {
  if (fonts) return;
  if (!fontLoad) fontLoad = (async () => {
    const transportStart = performance.now();
    const response = await loadFontPack(menu.font_path(), menu.font_byte_cap());
    assetTimes.fontTransport = performance.now() - transportStart;
    if (!response.ok) throw new Error('Bend font asset unavailable');
    const decodeStart = performance.now();
    const decoded = menu.load_font(response.bytes, response.used);
    assetTimes.fontDecode = performance.now() - decodeStart;
    if (decoded?.$ !== 'Some') throw new Error('Bend rejected its source-bound font pack');
    fonts = decoded.value;
  })();
  await fontLoad;
}
async function emit(packet: any, elapsed: number, id: number,
  kind: 'frame' | 'refinement' = 'frame', botExecution: BotExecution | null = null): Promise<void> {
  const portStart = performance.now();
  session = packet.session;
  assetTimes = { plateTransport: 0, plateDecode: 0, fontTransport: 0, fontDecode: 0 };
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
    treeMs, traversalMs, sceneTimes, sceneReuse, assetTimes, spriteMetrics, botExecution,
    pixelStats: { ...pixelPort.lastStats } }, { transfer: transfers });
}
async function handleMessage(request: any): Promise<void> {
  const start = performance.now();
  const wasOrbiting = cameraOrbiting;
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
    if (botFatal && request.kind !== 'boot') throw new Error(`Bend bot worker failed: ${botFatal}`);
    let packet: any;
    let cameraReleased = false;
    if (request.kind === 'boot') {
      disposeBot();
      disposeSprite();
      ground = prepared = null;
      menuBackground = null;
      groundInvalidated = preparedInvalidated = true;
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
        const dispatch = mask.filter === 'nearest'
          ? api.dispatch_at_web_atlas_nearest_preview_meta
          : mask.raster === 256 ? api.dispatch_at_web_atlas_preview_meta : api.dispatch_at_web_atlas_meta;
        const dispatched = dispatch(list(request.events), request.presentation, mask.pieces, session);
        packet = dispatched.packet;
        cameraReleased = dispatched.cameraReleased === true;
      } else {
        const dispatched = api.dispatch_at_web_meta(list(request.events), request.presentation, session);
        packet = dispatched.packet;
        cameraReleased = dispatched.cameraReleased === true;
      }
    }
    const appliedBot = applyReadyBot(packet);
    packet = appliedBot.packet;
    const orbiting = api.orbiting(packet.session) === true;
    if ((wasOrbiting || orbiting) && request.kind === 'events' && request.events.some((input: any) =>
      ['PointerDown', 'PointerMove', 'PointerUp', 'Wheel', 'KeyInput'].includes(String(input?.$).split(/[/.]/).pop()!))) {
      if (cameraInputEpoch >= Number.MAX_SAFE_INTEGER) throw new Error('Camera input identity exhausted');
      cameraInputEpoch++;
      spriteHeldEpoch = null;
      clearSpriteQueue();
    }
    cameraOrbiting = orbiting;
    observeBotJob(api.bot_job(packet.session));
    await emit(packet, performance.now() - start, request.id, 'frame', appliedBot.execution);
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
  const request = (event as MessageEvent).data;
  messageQueue = messageQueue.then(() => handleMessage(request));
});
self.postMessage({ kind: 'ready', keys: [api.storage_key(0), api.storage_key(1), api.storage_key(2)], maxFileBytes: api.max_file_bytes() });
