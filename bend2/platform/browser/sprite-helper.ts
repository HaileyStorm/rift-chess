// Dedicated, content-bound static module worker for the retained 512px chess
// sprite scene. Bend owns the frame, asset requests, decoding and pixels. This
// file owns only browser-worker scheduling, bounded generic asset transport,
// and stale-result suppression.
// @ts-ignore Compiled by the pinned Bend loader.
import BoardScene from '../../graphics/v2game/BoardScene.bend';
import { loadAssetRequests } from './asset-port';

declare const __BEND_SPRITE_SOURCE__: string;

const PROTOCOL = 1;
const SOURCE = typeof __BEND_SPRITE_SOURCE__ === 'string'
  ? __BEND_SPRITE_SOURCE__ : 'unbound-development-build';
const scene = BoardScene as Record<string, (...args: any[]) => any>;
const list = (items: any[]) => items.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' } as any);

function values(value: any): any[] {
  const result = [];
  while (value?.$ === 'Con') { result.push(value.head); value = value.tail; }
  if (value?.$ !== 'Nil') throw new Error('Bend returned a malformed asset request list');
  return result;
}

type SpriteJob = {
  kind: 'job'; protocol: number; id: number; generation: number;
  source: string; theme: number; frame: any;
};

type Timings = {
  fetchMs: number; decodeMs: number; underlayMs: number;
  groundMs: number; spritesMs: number; workerMs: number;
};

type Scope = {
  location?: { href?: string };
  addEventListener(type: 'message', listener: (event: { data: any }) => void): void;
  postMessage(message: any): void;
};

type RuntimeOptions = {
  scene?: Record<string, (...args: any[]) => any>;
  loadAssets?: (requests: any[]) => Promise<any[]>;
  now?: () => number;
  source?: string;
};

/** Install the worker protocol. The injected seams are used by the bounded
 * Node-worker test; production supplies only its real worker global. */
export function installSpriteHelper(scope: Scope, options: RuntimeOptions = {}): void {
  const board = options.scene ?? scene;
  const fetchAssets = options.loadAssets ?? loadAssetRequests;
  const now = options.now ?? (() => performance.now());
  const source = options.source ?? SOURCE;

  let generation = -1;
  let generationIds = new Set<number>();
  let queue: Promise<void> = Promise.resolve();
  let plates: any = null, plateTheme: number | null = null, underlay: any = null;
  let pieces: any = null;

  scope.postMessage({ kind: 'hello', protocol: PROTOCOL, source });

  function validEnvelope(request: any): request is SpriteJob {
    return request?.kind === 'job' && request.protocol === PROTOCOL &&
      Number.isSafeInteger(request.id) && request.id >= 0 &&
      Number.isSafeInteger(request.generation) && request.generation >= 0 &&
      typeof request.source === 'string' &&
      (request.theme === 0 || request.theme === 1) &&
      request.frame?.$ === 'Frame' && request.frame.theme === request.theme;
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

  async function ensureAssets(theme: number, metrics: Timings): Promise<void> {
    const missingPlates = plateTheme !== theme || !plates || !underlay;
    const missingPieces = !pieces;
    if (!missingPlates && !missingPieces) return;

    const plateRequests = missingPlates ? values(board.asset_ids(theme)) : [];
    const spriteRequests = missingPieces ? values(board.sprite_asset_ids()) : [];
    const fetchStart = now();
    const [plateResponses, spriteResponses] = await Promise.all([
      missingPlates ? fetchAssets(plateRequests) : Promise.resolve([]),
      missingPieces ? fetchAssets(spriteRequests) : Promise.resolve([]),
    ]);
    metrics.fetchMs = now() - fetchStart;

    const decodeStart = now();
    let nextPlates = plates, nextUnderlay = underlay, nextPieces = pieces;
    if (missingPlates) {
      if (plateRequests.length !== 1 || plateResponses.length !== 1 ||
          plateResponses.some((entry: any) => entry?.ok !== true))
        throw new Error('Bend observatory asset request did not return its exact source');
      nextPlates = board.load_plates(list(plateResponses));
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
    metrics.decodeMs = now() - decodeStart;

    // Do not publish partial state: an interrupted or malformed asset load
    // leaves the last complete theme and sprite set intact.
    if (missingPlates) {
      plates = nextPlates;
      underlay = nextUnderlay;
      plateTheme = theme;
    }
    if (missingPieces) pieces = nextPieces;
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
      groundMs: 0, spritesMs: 0, workerMs: 0 };
    try {
      await ensureAssets(request.theme, metrics);
      if (request.generation !== generation) { stale(request); return; }

      if (!underlay || plateTheme !== request.theme) {
        const at = now();
        underlay = board.underlay512_asset(request.theme, plates);
        metrics.underlayMs = now() - at;
      }
      const groundAt = now();
      const ground = board.settled_ground512(request.frame, underlay);
      metrics.groundMs = now() - groundAt;
      const spriteAt = now();
      const image = board.fast_sprite_pieces512(request.frame, pieces, ground);
      metrics.spritesMs = now() - spriteAt;
      metrics.workerMs = now() - started;

      // The caller measures its synchronous postMessage cost and end-to-end
      // round-trip. This post sends exactly one immutable Bend Image; sending
      // the ground separately would double quadtree clone traffic.
      scope.postMessage({ kind: 'result', protocol: PROTOCOL,
        id: request.id, generation: request.generation, source,
        theme: request.theme, image, metrics });
    } catch (cause) {
      error(request, cause instanceof Error ? cause.message : String(cause));
    }
  }

  scope.addEventListener('message', event => {
    const request = event.data;
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
