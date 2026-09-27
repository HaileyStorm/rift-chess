/**
 * Candidate-only adapter for the independently emitted Bend 2.0.28 browser
 * books. Keep this file out of the production host until the toolchain pin is
 * reviewed. These are exact source-path tags, not suffix-based rewrites.
 */

export type AbiRecord = Record<string, unknown> & { $: string };
export type AssetBook = 'plates' | 'pieces';

const INPUT_TAGS: Readonly<Record<string, string>> = Object.freeze({
  PointerDown: 'ui/Types.PointerDown',
  PointerMove: 'ui/Types.PointerMove',
  PointerUp: 'ui/Types.PointerUp',
  Wheel: 'ui/Types.Wheel',
  KeyInput: 'ui/Types.KeyInput',
  Activate: 'ui/Types.Activate',
  Tick: 'ui/Types.Tick',
  Resize: 'ui/Types.Resize',
  QualityProbe: 'ui/Types.QualityProbe',
  FileText: 'ui/Types.FileText',
  PortError: 'ui/Types.PortError',
});

const EFFECT_TAGS: Readonly<Record<string, string>> = Object.freeze({
  'ui/Types.Store': 'Store',
  'ui/Types.Download': 'Download',
  'ui/Types.PickFile': 'PickFile',
  'ui/Types.Sound': 'Sound',
  'ui/Types.OpenUrl': 'OpenUrl',
  'ui/Types.Exit': 'Exit',
});

const BOARD_FRAME_TAGS: Readonly<Record<string, string>> = Object.freeze({
  'graphics/Scene.Frame': '../Scene.Frame',
  'core/Model.Pos': '../../core/Model.Pos',
  'graphics/Camera.View': '../Camera.View',
});

const BOT_POSITION_TAGS: Readonly<Record<string, string>> = Object.freeze({
  'core/Model.Pos': '../../core/Model.Pos',
});

const MENU_PLAN_TAGS: Readonly<Record<string, string>> = Object.freeze({
  'ui/v2/ChromePlan.Plan': 'ChromePlan.Plan',
  'ui/v2/ChromePlan.Rect': 'ChromePlan.Rect',
  'ui/v2/ChromePlan.Control': 'ChromePlan.Control',
});

const BASE_TAGS = new Set([
  // Base.List, Base.Image, and Base.Maybe are transported as immutable trees.
  'Con', 'Nil', 'Pix', 'Qua', 'None', 'Some',
  // Other Base constructors that can appear in these source-owned payloads.
  'True', 'False', 'Zero', 'Succ',
]);

const ASSET_ID_TAGS = new Set(['Assets.Astral', 'Assets.Stone']);
const MAX_GRAPH_NODES = 10_000;
const MAX_GRAPH_DEPTH = 128;
const UNSAFE_KEYS = new Set(['prototype', ...Object.getOwnPropertyNames(Object.prototype)]);
const CHROME_DATA_FIELDS = new Set([
  '$', 'theme', 'menu', 'status', 'mode', 'selection', 'context', 'history', 'page', 'soundOn',
]);

function assertSafeKeys(value: object, context: string): void {
  for (const key of Object.keys(value)) {
    if (UNSAFE_KEYS.has(key)) throw new TypeError(`${context}: forbidden field ${key}`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor))
      throw new TypeError(`${context}: accessor field ${key}`);
  }
}

function record(value: unknown, context: string): AbiRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError(`${context}: expected a constructor record`);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null)
    throw new TypeError(`${context}: expected a plain constructor record`);
  assertSafeKeys(value, context);
  const descriptor = Object.getOwnPropertyDescriptor(value, '$');
  if (!descriptor || !('value' in descriptor))
    throw new TypeError(`${context}: missing own data constructor tag`);
  const tag = descriptor.value;
  if (typeof tag !== 'string') throw new TypeError(`${context}: missing string constructor tag`);
  return value as AbiRecord;
}

function mappedTag(tags: Readonly<Record<string, string>>, source: string,
  context: string): string | undefined {
  if (!Object.hasOwn(tags, source)) return undefined;
  const target = tags[source];
  if (typeof target !== 'string') throw new TypeError(`${context}: invalid target tag for ${source}`);
  return target;
}

function requireU32(value: unknown, context: string): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 0xffff_ffff)
    throw new TypeError(`${context}: expected U32`);
}

/** Map a single host-authored Input after PresentedInputQueue has coalesced it. */
export function toControllerInput(value: unknown): AbiRecord {
  const input = record(value, 'host Input');
  const tag = mappedTag(INPUT_TAGS, input.$, 'host Input');
  if (!tag) throw new TypeError(`host Input: unsupported constructor ${input.$}`);
  return { ...input, $: tag };
}

/** Preserve the queue's presentation boundary and adapt only its final events. */
export function toControllerBatch<T extends { $: string }>(batch: {
  presentation: unknown;
  events: T[];
}): { presentation: unknown; events: AbiRecord[] } {
  if (batch === null || typeof batch !== 'object' || !Array.isArray(batch.events))
    throw new TypeError('host batch: expected an events array');
  return { presentation: batch.presentation, events: batch.events.map(toControllerInput) };
}

/** Normalize the Controller's six Effect constructors for the host port. */
export function toHostEffect(value: unknown): AbiRecord {
  const effect = record(value, 'Controller Effect');
  const tag = mappedTag(EFFECT_TAGS, effect.$, 'Controller Effect');
  if (!tag) throw new TypeError(`Controller Effect: unsupported constructor ${effect.$}`);
  return { ...effect, $: tag };
}

function retagGraph(value: unknown, tags: Readonly<Record<string, string>>,
  identityTags: ReadonlySet<string>, context: string,
  state = { stack: new WeakSet<object>(), nodes: 0 }, depth = 0): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (depth > MAX_GRAPH_DEPTH) throw new TypeError(`${context}: ABI graph depth limit exceeded`);
  if (++state.nodes > MAX_GRAPH_NODES)
    throw new TypeError(`${context}: ABI graph node limit exceeded`);
  if (state.stack.has(value)) throw new TypeError(`${context}: cyclic ABI graph`);
  state.stack.add(value);
  try {
    if (Array.isArray(value))
      return value.map((item) => retagGraph(item, tags, identityTags, context, state, depth + 1));

    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null)
      throw new TypeError(`${context}: non-plain ABI value`);

    const tagDescriptor = Object.getOwnPropertyDescriptor(value, '$');
    if (tagDescriptor && !('value' in tagDescriptor))
      throw new TypeError(`${context}: accessor constructor tag`);
    const sourceTag = tagDescriptor?.value;
    if (sourceTag !== undefined && typeof sourceTag !== 'string')
      throw new TypeError(`${context}: non-string constructor tag`);
    let targetTag: string | undefined;
    if (typeof sourceTag === 'string') {
      targetTag = mappedTag(tags, sourceTag, context);
      if (targetTag === undefined && BASE_TAGS.has(sourceTag)) targetTag = sourceTag;
      if (targetTag === undefined && identityTags.has(sourceTag)) targetTag = sourceTag;
      if (targetTag === undefined)
        throw new TypeError(`${context}: unsupported constructor ${sourceTag}`);
    }

    assertSafeKeys(value, context);
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !('value' in descriptor))
        throw new TypeError(`${context}: accessor field ${key}`);
      result[key] = key === '$' && targetTag !== undefined
        ? targetTag
        : retagGraph(descriptor.value, tags,
          identityTags, context, state, depth + 1);
    }
    return result;
  } finally {
    state.stack.delete(value);
  }
}

/** Re-tag a Controller Frame graph for BoardScene's separately compiled book. */
export function frameForBoardScene(frame: unknown): unknown {
  const source = record(frame, 'Controller Frame');
  if (source.$ !== 'graphics/Scene.Frame')
    throw new TypeError(`Controller Frame: expected graphics/Scene.Frame, got ${source.$}`);
  return retagGraph(source, BOARD_FRAME_TAGS, new Set(), 'BoardScene Frame');
}

/** Adapt bare asset-port replies to one exact BoardScene resource book. */
export function responsesForBoardScene(responses: unknown[], book: AssetBook): unknown[] {
  if (!Array.isArray(responses)) throw new TypeError('AssetResponse batch: expected an array');
  if (book !== 'plates' && book !== 'pieces')
    throw new TypeError(`AssetResponse batch: unsupported BoardScene book ${String(book)}`);
  const target = book === 'plates' ? 'Assets.AssetResponse' : 'PieceAssets.AssetResponse';
  return responses.map((value) => {
    const response = record(value, 'host AssetResponse');
    if (response.$ !== 'AssetResponse')
      throw new TypeError(`host AssetResponse: expected AssetResponse, got ${response.$}`);
    const allowedFields = new Set(['$', 'id', 'bytes', 'ok']);
    for (const key of Object.keys(response))
      if (!allowedFields.has(key)) throw new TypeError(`host AssetResponse: unsupported field ${key}`);
    if (typeof response.ok !== 'boolean') throw new TypeError('host AssetResponse: ok must be boolean');
    const bytes = record(response.bytes, 'host AssetResponse bytes');
    if (bytes.$ !== 'Con' && bytes.$ !== 'Nil')
      throw new TypeError('host AssetResponse bytes: expected a Base.List root');
    if (book === 'plates') {
      const id = record(response.id, 'plate AssetResponse id');
      if (!ASSET_ID_TAGS.has(id.$))
        throw new TypeError(`plate AssetResponse id: unsupported constructor ${id.$}`);
    } else if (typeof response.id !== 'number' || !Number.isInteger(response.id) ||
        response.id < 0 || response.id > 0xffff_ffff) {
      throw new TypeError('piece AssetResponse id: expected a U32 number');
    }
    // `bytes` is an opaque Base.List from asset-port. A 1 MiB response can
    // contain 786,437 nodes; never recurse through or clone it at this seam.
    return { ...response, $: target };
  });
}

/** Re-tag Controller chrome payloads for MenuAA's independently emitted book. */
export function chromeForMenuAA(data: unknown, plan: unknown): {
  data: unknown;
  plan: unknown;
} {
  const sourceData = record(data, 'Controller ChromeData');
  const sourcePlan = record(plan, 'Controller ChromePlan');
  if (sourceData.$ !== 'ui/v2/ChromeData.Presentation')
    throw new TypeError(`Controller ChromeData: unexpected constructor ${sourceData.$}`);
  if (sourcePlan.$ !== 'ui/v2/ChromePlan.Plan')
    throw new TypeError(`Controller ChromePlan: unexpected constructor ${sourcePlan.$}`);
  for (const key of Object.keys(sourceData))
    if (!CHROME_DATA_FIELDS.has(key)) throw new TypeError(`Controller ChromeData: unexpected field ${key}`);
  if (Object.keys(sourceData).length !== CHROME_DATA_FIELDS.size ||
      [...CHROME_DATA_FIELDS].some(key => !Object.hasOwn(sourceData, key)))
    throw new TypeError('Controller ChromeData: expected the exact Presentation schema');
  requireU32(sourceData.theme, 'Controller ChromeData.theme');
  requireU32(sourceData.menu, 'Controller ChromeData.menu');
  requireU32(sourceData.page, 'Controller ChromeData.page');
  for (const key of ['status', 'mode', 'selection', 'context'])
    if (typeof sourceData[key] !== 'string')
      throw new TypeError(`Controller ChromeData.${key}: expected String`);
  if (typeof sourceData.soundOn !== 'boolean')
    throw new TypeError('Controller ChromeData.soundOn: expected Bool');
  const history = record(sourceData.history, 'Controller ChromeData.history');
  if (history.$ !== 'Con' && history.$ !== 'Nil')
    throw new TypeError('Controller ChromeData.history: expected Base.List root');
  // Controller owns this potentially long history list. MenuAA's compared and
  // painted fields do not depend on it; preserve the trusted list by identity.
  const menuData = {
    $: 'ChromeData.Presentation', theme: sourceData.theme, menu: sourceData.menu,
    status: sourceData.status, mode: sourceData.mode, selection: sourceData.selection,
    context: sourceData.context, history: sourceData.history, page: sourceData.page,
    soundOn: sourceData.soundOn,
  };
  return {
    data: menuData,
    plan: retagGraph(sourcePlan, MENU_PLAN_TAGS, new Set(), 'MenuAA ChromePlan'),
  };
}

/** Re-tag the Controller's bot Position for BotAdapter's separately built book. */
export function positionForBotAdapter(position: unknown): unknown {
  const source = record(position, 'Controller bot Position');
  if (source.$ !== 'core/Model.Pos')
    throw new TypeError(`Controller bot Position: unexpected constructor ${source.$}`);
  return retagGraph(source, BOT_POSITION_TAGS, new Set(), 'BotAdapter Position');
}

/** Exact host Input allowlist, exported for source-bound probes and diagnostics. */
export const hostInputTags = INPUT_TAGS;
