// Dedicated, content-bound static module worker for the retained 512px chess
// sprite scene. Bend owns the frame, asset requests, decoding and pixels. This
// file owns only browser-worker scheduling, bounded generic asset transport,
// and stale-result suppression.
// @ts-ignore Compiled by the pinned Bend loader.
import BoardScene from '../../graphics/v2game/BoardScene.bend';
import { boundedBytes, loadAssetRequests } from './asset-port';
import { encodePose, transferPose, encodeGround, type PackedPose, type PackedGround } from './pose-port';

declare const __BEND_SPRITE_SOURCE__: string;
declare const __BEND_PREPARED_GROUND_PATH__: string;
declare const __BEND_PREPARED_GROUND_SHA__: string;
declare const __BEND_PREPARED_PLATE_SHA__: string;
declare const __BEND_PREPARED_FRAME_JSON__: string;

const PROTOCOL = 1;
const SOURCE = typeof __BEND_SPRITE_SOURCE__ === 'string'
  ? __BEND_SPRITE_SOURCE__ : 'unbound-development-build';
const PREPARED_PATH = typeof __BEND_PREPARED_GROUND_PATH__ === 'string'
  ? __BEND_PREPARED_GROUND_PATH__ : '';
const PREPARED_SHA = typeof __BEND_PREPARED_GROUND_SHA__ === 'string'
  ? __BEND_PREPARED_GROUND_SHA__ : '';
const PREPARED_PLATE_SHA = typeof __BEND_PREPARED_PLATE_SHA__ === 'string'
  ? __BEND_PREPARED_PLATE_SHA__ : '';
const PREPARED_FRAME_JSON = typeof __BEND_PREPARED_FRAME_JSON__ === 'string'
  ? __BEND_PREPARED_FRAME_JSON__ : '';
const scene = BoardScene as Record<string, (...args: any[]) => any>;
const list = (items: any[]) => items.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' } as any);

async function digest(bytes: Uint8Array): Promise<string> {
  if (!(bytes.buffer instanceof ArrayBuffer)) throw new Error('Asset digest needs an ArrayBuffer');
  const input = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const output = await crypto.subtle.digest('SHA-256', input);
  return [...new Uint8Array(output)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function restoreFrame(value: any): any {
  if (!value || typeof value !== 'object') return value;
  if (!Array.isArray(value) && Object.keys(value).length === 1 &&
      typeof value.__bend_bigint__ === 'string' && /^-?(0|[1-9][0-9]*)$/.test(value.__bend_bigint__))
    return BigInt(value.__bend_bigint__);
  for (const key of Object.keys(value)) value[key] = restoreFrame(value[key]);
  return value;
}

function configuredFrame(): any | null {
  if (!PREPARED_FRAME_JSON) return null;
  try { return restoreFrame(JSON.parse(PREPARED_FRAME_JSON)); }
  catch { return null; }
}

async function loadPreparedGround(scope: Scope): Promise<any | null> {
  if (!/^\.\/assets\/ground-initial-[0-9a-f]{12}\.json$/.test(PREPARED_PATH) ||
      !/^[0-9a-f]{64}$/.test(PREPARED_SHA) || !scope.location?.href) return null;
  try {
    const url = new URL(PREPARED_PATH, scope.location.href);
    if (url.origin !== new URL(scope.location.href).origin) return null;
    const response = await fetch(url);
    if (!response.ok || response.redirected || response.url !== url.href) return null;
    const bytes = await boundedBytes(response, 8_000_000);
    if (await digest(bytes) !== PREPARED_SHA) return null;
    const image = JSON.parse(new TextDecoder().decode(bytes));
    return image?.$ === 'Pix' || image?.$ === 'Qua' ? image : null;
  } catch { return null; }
}

async function digestPlate(ready: any): Promise<string> {
  return digest(new TextEncoder().encode(JSON.stringify(ready)));
}

function values(value: any): any[] {
  const result = [];
  while (value?.$ === 'Con') { result.push(value.head); value = value.tail; }
  if (value?.$ !== 'Nil') throw new Error('Bend returned a malformed asset request list');
  return result;
}

type SpriteJob = {
  kind: 'job'; protocol: number; id: number; generation: number;
  source: string; theme: number; frame: any; plates?: any;
  needPickData?: boolean;
  needPose?: boolean; needGround?: boolean;
  knownGroundId?: number;
};

type Timings = {
  fetchMs: number; decodeMs: number; underlayMs: number;
  groundMs: number; groundCacheHit: number; preparedGroundHit: number;
  spritesMs: number; pickDataMs: number; workerMs: number;
  startedEpochMs: number; sendEpochMs: number;
};

type Scope = {
  location?: { href?: string };
  addEventListener(type: 'message', listener: (event: { data: any }) => void): void;
  postMessage(message: any, transfer?: Transferable[]): void;
};

type RuntimeOptions = {
  scene?: Record<string, (...args: any[]) => any>;
  loadAssets?: (requests: any[]) => Promise<any[]>;
  now?: () => number;
  source?: string;
  loadPrepared?: () => Promise<any | null>;
  hashPlate?: (ready: any) => Promise<string>;
  preparedFrame?: any;
  preparedPlateSha256?: string;
};

/** Install the worker protocol. The injected seams are used by the bounded
 * Node-worker test; production supplies only its real worker global. */
export function installSpriteHelper(scope: Scope, options: RuntimeOptions = {}): void {
  const board = options.scene ?? scene;
  const fetchAssets = options.loadAssets ?? loadAssetRequests;
  const now = options.now ?? (() => performance.now());
  const source = options.source ?? SOURCE;
  const preparedFrame = options.preparedFrame ?? configuredFrame();
  const preparedPlateSha256 = options.preparedPlateSha256 ?? PREPARED_PLATE_SHA;
  const preparedEnabled = Boolean(preparedFrame && /^[0-9a-f]{64}$/.test(preparedPlateSha256) &&
    (options.loadPrepared || PREPARED_PATH));
  const hashPlate = options.hashPlate ?? digestPlate;

  let generation = -1;
  let generationIds = new Set<number>();
  let queue: Promise<void> = Promise.resolve();
  let plates: any = null, plateTheme: number | null = null, underlay: any = null;
  let sharedPlate: { theme: number; value: any } | null = null;
  let pieces: any = null;
  let posedPieces: any = null, poseFrame: any = null;
  let encodedPose: PackedPose | null = null;
  let settledGround: any = null, groundFrame: any = null;
  let encodedGround: PackedGround | null = null;
  let groundId = 0;
  let preparedLoad: Promise<any | null> | null = null;
  // Bend plates are immutable. A newly supplied/decoded plate has a new
  // identity, while orbiting away and back may reuse this same Ready object.
  const plateHashes = new WeakMap<object, Promise<string | null>>();
  const prepared = () => preparedLoad ??= (options.loadPrepared
    ? options.loadPrepared() : loadPreparedGround(scope)).catch(() => null);

  function readyPlate(theme: number, value: any): any | null {
    const ready = theme === 0 ? value?.astral : value?.stone;
    if (!ready || ready.$ !== 'Ready' || ready.depth !== 9 ||
        !['Pix', 'Qua'].includes(ready.pixels?.$)) return null;
    return ready;
  }

  function readyDigest(ready: object): Promise<string | null> {
    let result = plateHashes.get(ready);
    if (!result) {
      result = hashPlate(ready).catch(() => null);
      plateHashes.set(ready, result);
    }
    return result;
  }

  scope.postMessage({ kind: 'hello', protocol: PROTOCOL, source });

  function validEnvelope(request: any): request is SpriteJob {
    return request?.kind === 'job' && request.protocol === PROTOCOL &&
      Number.isSafeInteger(request.id) && request.id >= 0 &&
      Number.isSafeInteger(request.generation) && request.generation >= 0 &&
      typeof request.source === 'string' &&
      (request.theme === 0 || request.theme === 1) &&
      request.frame?.$ === 'Frame' && request.frame.theme === request.theme &&
      (request.plates === undefined ||
        (request.plates?.$ === 'ObservatoryPlates' &&
          (request.theme === 0 ? request.plates.astral : request.plates.stone)?.$ === 'Ready' &&
          (request.theme === 0 ? request.plates.astral : request.plates.stone)?.depth === 9 &&
          ['Pix', 'Qua'].includes((request.theme === 0 ? request.plates.astral : request.plates.stone)?.pixels?.$)));
  }

  function error(request: any, message: string): void {
    scope.postMessage({ kind: 'error', protocol: PROTOCOL,
      id: Number.isSafeInteger(request?.id) ? request.id : null,
      generation: Number.isSafeInteger(request?.generation) ? request.generation : null,
      source, theme: request?.theme ?? null, message });
  }

  function stale(request: SpriteJob): void {
    scope.postMessage({ kind: 'stale', protocol: PROTOCOL,
      id: request.id, generation: request.generation, source });
  }

  async function ensureAssets(theme: number, metrics: Timings, supplied?: any): Promise<void> {
    // A newly supplied same-theme plate is a new immutable input, not a
    // license to reuse the old underlay or its derived settled ground.
    const missingPlates = plateTheme !== theme || !plates || !underlay ||
      (supplied !== undefined && supplied !== plates);
    const missingPieces = !pieces;
    if (!missingPlates && !missingPieces) return;

    const plateRequests = missingPlates && !supplied ? values(board.asset_ids(theme)) : [];
    const spriteRequests = missingPieces ? values(board.sprite_asset_ids()) : [];
    const fetchStart = now();
    const [plateResponses, spriteResponses] = await Promise.all([
      plateRequests.length ? fetchAssets(plateRequests) : Promise.resolve([]),
      missingPieces ? fetchAssets(spriteRequests) : Promise.resolve([]),
    ]);
    metrics.fetchMs = plateRequests.length || spriteRequests.length ? now() - fetchStart : 0;

    const decodeStart = now();
    let nextPlates = plates, nextUnderlay = underlay, nextPieces = pieces;
    if (missingPlates) {
      if (supplied) nextPlates = supplied;
      else {
        if (plateRequests.length !== 1 || plateResponses.length !== 1 ||
            plateResponses.some((entry: any) => entry?.ok !== true))
          throw new Error('Bend observatory asset request did not return its exact source');
        nextPlates = board.load_plates(list(plateResponses));
      }
      nextUnderlay = null;
    }
    if (missingPieces) {
      if (spriteRequests.length !== 3 || spriteResponses.length !== 3 ||
          spriteResponses.some((entry: any) => entry?.ok !== true))
        throw new Error('Bend chess sprite requests did not return all three source pages');
      const decoded = board.load_sprite_pages(list(spriteResponses));
      if (decoded?.$ !== 'Some') throw new Error('Bend rejected its source-bound chess sprite pages');
      nextPieces = decoded.value;
    }
    metrics.decodeMs = missingPieces || (missingPlates && !supplied) ? now() - decodeStart : 0;

    // Do not publish partial state: an interrupted or malformed asset load
    // leaves the last complete theme and sprite set intact.
    if (missingPlates) {
      plates = nextPlates;
      underlay = nextUnderlay;
      plateTheme = theme;
      settledGround = null;
      groundFrame = null;
      encodedGround = null;
    }
    if (missingPieces) {
      pieces = nextPieces;
      posedPieces = null;
      poseFrame = null;
      encodedPose = null;
    }
  }

  async function run(request: SpriteJob): Promise<void> {
    const started = now();
    if (!validEnvelope(request)) {
      error(request, 'Invalid sprite helper job envelope or frame/theme mismatch');
      return;
    }
    if (request.source !== source) {
      error(request, 'Sprite helper source binding mismatch');
      return;
    }
    if (request.generation < generation) { stale(request); return; }
    if (request.generation > generation) {
      generation = request.generation;
      generationIds = new Set<number>();
    }
    if (generationIds.has(request.id)) {
      error(request, 'Duplicate sprite helper job id in generation');
      return;
    }
    generationIds.add(request.id);

    const metrics: Timings = { fetchMs: 0, decodeMs: 0, underlayMs: 0,
      groundMs: 0, groundCacheHit: 0, preparedGroundHit: 0, spritesMs: 0, pickDataMs: 0, workerMs: 0,
      startedEpochMs: performance.timeOrigin + started, sendEpochMs: 0 };
    try {
      const eligible = preparedEnabled && board.sprite_same_ground(preparedFrame, request.frame);
      const supplied = request.plates ?? (sharedPlate?.theme === request.theme
        ? sharedPlate.value : undefined);
      const knownReady = eligible && readyPlate(request.theme,
        supplied ?? (plateTheme === request.theme ? plates : null));
      // Hash a supplied immutable plate alongside sprite-page loading, but do
      // not fetch the large prepared ground until its decoded pixels match.
      const knownDigest = knownReady ? readyDigest(knownReady) : null;
      await ensureAssets(request.theme, metrics,
        supplied);
      if (request.generation !== generation) { stale(request); return; }

      if (!underlay || plateTheme !== request.theme) {
        const at = now();
        underlay = board.underlay512_asset(request.theme, plates);
        metrics.underlayMs = now() - at;
        settledGround = null;
        groundFrame = null;
        encodedGround = null;
      }
      if (settledGround && groundFrame && board.sprite_same_ground(groundFrame, request.frame)) {
        metrics.groundCacheHit = 1;
      } else {
        const groundAt = now();
        const currentReady = eligible && readyPlate(request.theme, plates);
        const actualDigest = currentReady && (currentReady === knownReady && knownDigest
          ? await knownDigest : await readyDigest(currentReady));
        const exact = actualDigest === preparedPlateSha256 && Boolean(currentReady);
        if (request.generation !== generation) { stale(request); return; }
        const candidate = exact ? await prepared() : null;
        if (request.generation !== generation) {
          // A superseding view must not retain a resolved, large prepared tree
          // through the loader promise while it builds its own ground.
          if (candidate) preparedLoad = null;
          stale(request);
          return;
        }
        if (groundId >= Number.MAX_SAFE_INTEGER) throw new Error('Sprite ground identity exhausted');
        settledGround = candidate ?? board.settled_ground512(request.frame, underlay);
        groundId++;
        metrics.preparedGroundHit = candidate ? 1 : 0;
        // The retained settledGround owns this image. Drop the loader promise
        // so a later orbit/Shift can release it instead of holding two large
        // ground trees. Returning to the default may fetch/parse it again.
        if (candidate) preparedLoad = null;
        groundFrame = request.frame;
        encodedGround = null;
        metrics.groundMs = now() - groundAt;
      }
      const spriteAt = now();
      if (!posedPieces || !poseFrame || !board.sprite_same_view(poseFrame, request.frame)) {
        const nextPose = board.sprite_pose_pieces(request.frame, pieces);
        const nextEncoded = encodePose(nextPose);
        posedPieces = nextPose;
        encodedPose = nextEncoded;
        poseFrame = request.frame;
      }
      const image = board.fast_sprite_pieces512(request.frame, posedPieces, settledGround);
      metrics.spritesMs = now() - spriteAt;

      // Every image carries its own pose masks; discarded replies cannot retain
      // alpha from a camera that differs from the displayed knight.
      const pickAt = now();
      const pickData = board.sprite_pick_data(posedPieces);
      metrics.pickDataMs = now() - pickAt;
      if (!encodedPose) throw new Error('Missing complete Bend sprite pose');
      const pose = request.needPose === false ? null : transferPose(encodedPose);
      const sendGround = request.needGround !== false || request.knownGroundId !== groundId;
      if (sendGround && !encodedGround) encodedGround = encodeGround(settledGround);
      const ground = !sendGround ? null :
        { ...encodedGround!, tokens: encodedGround!.tokens.slice() };
      const transfers: Transferable[] = [];
      if (pose) transfers.push(pose.tokens.buffer);
      if (ground) transfers.push(ground.tokens.buffer);
      metrics.workerMs = now() - started;
      metrics.sendEpochMs = performance.timeOrigin + now();
      scope.postMessage({ kind: 'result', protocol: PROTOCOL,
        id: request.id, generation: request.generation, source,
        theme: request.theme, image, pickData, pose, ground, groundId, metrics }, transfers);
    } catch (cause) {
      error(request, cause instanceof Error ? cause.message : String(cause));
    }
  }

  scope.addEventListener('message', event => {
    const request = event.data;
    // A late job must not replace the plate retained by a newer generation.
    if (request?.protocol === PROTOCOL && request.source === source &&
        Number.isSafeInteger(request.generation) && request.generation >= 0 &&
        request.generation < generation) { stale(request); return; }
    // Receive the validated immutable Bend plate before an earlier async
    // sprite-page fetch can be superseded. Retain at most one theme.
    if (validEnvelope(request) && request.source === source && request.plates)
      sharedPlate = { theme: request.theme, value: request.plates };
    // Advance the generation at receipt time, including while an older job is
    // awaiting asset IO. A synchronous Bend call cannot be interrupted, so the
    // main worker must also discard replies whose generation is no longer live.
    if (validEnvelope(request) && request.source === source && request.generation > generation) {
      generation = request.generation;
      generationIds = new Set<number>();
    }
    queue = queue.then(() => run(request)).catch(cause => {
      error(request, cause instanceof Error ? cause.message : String(cause));
    });
  });
}

// Bundlers emit this file as its own hashed ESM entrypoint. `self` exists in a
// DedicatedWorkerGlobalScope, but not while a Node test imports the module.
const workerScope = typeof self === 'undefined' ? null : self as unknown as Scope;
if (workerScope && typeof workerScope.addEventListener === 'function' &&
    typeof workerScope.postMessage === 'function' && workerScope.location?.href)
  installSpriteHelper(workerScope);
