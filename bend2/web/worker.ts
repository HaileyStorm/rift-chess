// @ts-ignore Bend's pinned loader owns this module boundary during bundling.
import App from '../App.bend';
import type {
  BendImage, BrowserCommand, FrameValue, ObservationView, PositionValue, ViewValue, WorkerRequest, WorkerResponsePayload,
} from './types';
import {
  bendBool, field, isRecord, linkedList, listValues, normalizeOffer, normalizeOutcome, positionHoles,
  defaultView, normalizeView, positionRevision, tag, u32,
} from './types';

type ApiFunction = (...args: any[]) => any;
type Api = Record<string, ApiFunction>;

const api = App as unknown as Api;
let activeEpoch = 0;
function reply(message: WorkerResponsePayload): void {
  self.postMessage({ ...message, epoch: activeEpoch });
}

function apiCall(name: string, ...args: unknown[]): unknown {
  const fn = api[name];
  if (typeof fn !== 'function') throw new Error(`Bend facade is missing ${name}().`);
  return fn(...args);
}

function commandForBend(command: BrowserCommand): Record<string, unknown> {
  const expected = BigInt(command.expected);
  switch (command.$) {
    case 'MoveCommand': return { $: 'MoveCommand', expected, action: command.action ?? 21_760 };
    case 'UndoCommand': return { $: 'UndoCommand', expected };
    case 'OfferCommand': return { $: 'OfferCommand', expected, side: command.side ?? true };
    case 'AcceptCommand': return { $: 'AcceptCommand', expected, side: command.side ?? true };
    case 'DeclineCommand': return { $: 'DeclineCommand', expected, side: command.side ?? true };
    case 'ResignCommand': return { $: 'ResignCommand', expected, side: command.side ?? true };
  }
}

function observationOf(value: unknown): ObservationView {
  const source = isRecord(value) ? value : {};
  const position = field(source, 'position') as PositionValue;
  if (!isRecord(position)) throw new Error('Bend observe() returned no position.');
  const legal = field(source, 'legal');
  if (legal === undefined) throw new Error('Bend observe() returned no legal action list.');
  const legalIds = listValues(legal, 21_760).map(value => u32(value)).filter(value => value < 21_760);
  return {
    position,
    revision: positionRevision(field(source, 'revision')),
    legalIds,
    outcome: normalizeOutcome(field(source, 'outcome')),
    offerSide: normalizeOffer(field(source, 'offer')),
    inCheck: bendBool(field(source, 'inCheck')),
    canUndo: bendBool(field(source, 'canUndo')),
  };
}

function stepResult(value: unknown): { accepted: boolean; match: unknown } {
  const name = tag(value);
  if (name === 'Accepted') {
    const next = field(value, 'next');
    if (next === undefined) throw new Error('Accepted command result has no next match.');
    return { accepted: true, match: next };
  }
  if (name === 'Rejected') {
    const old = field(value, 'old');
    if (old === undefined) throw new Error('Rejected command result has no old match.');
    return { accepted: false, match: old };
  }
  throw new Error(`Bend command() returned ${name ?? 'an untagged value'}, expected Accepted/Rejected.`);
}

function frameFor(position: PositionValue, previous: PositionValue, selected: number, hovered: number,
  targets: number[], tile: number, tileTargets: number[], lastAction: number, progress: number, theme: 0 | 1,
  view: ViewValue): FrameValue {
  return {
    $: 'Frame', position, previous, selected, hovered,
    targets: linkedList(targets), tile, tileTargets: linkedList(tileTargets), lastAction, progress, theme, view,
  };
}

let match: unknown = null;
let observation: ObservationView | null = null;
let previous: PositionValue | null = null;
let selected = 64;
let hovered = 64;
let tile = 16;
let tileTargets: number[] = [];
let targets: number[] = [];
let lastAction = 21_760;
let progress = 16;
let theme: 0 | 1 = 0;
let view: ViewValue = defaultView();
let latestHoverVersion = 0;
let latestRenderVersion = 0;
const backgroundCache = new Map<number, BendImage>();
const groundCache = new Map<string, BendImage>();

function currentFrame(): FrameValue {
  if (!observation || !previous) throw new Error('Bend match is not initialized.');
  return frameFor(observation.position, previous, selected, hovered, targets, tile, tileTargets, lastAction, progress, theme, view);
}

function resetView(nextPosition: PositionValue, oldPosition: PositionValue | null, action: number): void {
  previous = oldPosition ?? nextPosition;
  selected = 64;
  hovered = 64;
  tile = 16;
  tileTargets = [];
  targets = [];
  lastAction = action;
  progress = action < 21_760 ? 0 : 16;
}

function compose(frame: FrameValue): BendImage {
  const backgroundKey = frame.theme;
  let background = backgroundCache.get(backgroundKey);
  if (!background) {
    background = apiCall('background', frame.theme) as BendImage;
    backgroundCache.set(backgroundKey, background);
  }
  const holes = positionHoles(frame.position);
  const groundKey = `${frame.theme}:${holes}:${frame.view.yaw}:${frame.view.pitch}:${frame.view.zoom}`;
  let ground = groundCache.get(groundKey);
  if (!ground) {
    ground = apiCall('ground_base', background, frame.position, frame.theme, frame.view) as BendImage;
    groundCache.set(groundKey, ground);
    if (groundCache.size > 32) groundCache.delete(groundCache.keys().next().value as string);
  }
  const animatedGround = frame.lastAction >= 20_480 && frame.progress < 16
    ? apiCall('ground_on', background, frame) as BendImage
    : ground;
  const feedback = apiCall('feedback_on', animatedGround, frame) as BendImage;
  return apiCall('pieces_on', feedback, frame) as BendImage;
}

function sendState(id: number, accepted: boolean, command?: BrowserCommand): void {
  if (!observation) throw new Error('No Bend observation available.');
  reply({ kind: 'state', id, accepted, command, observation, frame: currentFrame() });
}

function render(id: number, version: number, frame = currentFrame()): void {
  if (version < latestRenderVersion) return;
  latestRenderVersion = version;
  view = normalizeView(frame.view, view);
  frame = { ...frame, view };
  const started = performance.now();
  const image = compose(frame);
  if (version !== latestRenderVersion) return;
  reply({ kind: 'image', id, version, image, renderMs: performance.now() - started });
}

function applyCommand(id: number, command: BrowserCommand): void {
  if (!match || !observation) throw new Error('Bend match is not initialized.');
  const oldPosition = observation.position;
  const result = stepResult(apiCall('command', match, commandForBend(command)));
  const nextObservation = observationOf(apiCall('observe', result.match));
  if (result.accepted) match = result.match;
  observation = nextObservation;
  if (result.accepted) {
    const action = command.$ === 'MoveCommand' ? command.action ?? 21_760 : 21_760;
    resetView(observation.position, oldPosition, action);
  }
  sendState(id, result.accepted, command);
}

function start(layout: boolean, policy: 0 | 1 | 2, id: number): void {
  const candidate = apiCall('new_match', layout, policy);
  const nextObservation = observationOf(apiCall('observe', candidate));
  match = candidate;
  observation = nextObservation;
  resetView(observation.position, null, 21_760);
  backgroundCache.clear();
  groundCache.clear();
  sendState(id, true);
}

function replay(layout: boolean, policy: 0 | 1 | 2, commands: BrowserCommand[], id: number): void {
  let candidate = apiCall('new_match', layout, policy);
  for (const command of commands) {
    const result = stepResult(apiCall('command', candidate, commandForBend(command)));
    if (!result.accepted) throw new Error(`Saved command at revision ${command.expected} was rejected.`);
    candidate = result.match;
  }
  const nextObservation = observationOf(apiCall('observe', candidate));
  match = candidate;
  observation = nextObservation;
  resetView(observation.position, null, 21_760);
  backgroundCache.clear();
  groundCache.clear();
  sendState(id, true);
}

function pick(id: number, x: number, y: number, version: number, requestedView: ViewValue): void {
  if (version < latestHoverVersion || !observation) return;
  latestHoverVersion = version;
  const pickView = normalizeView(requestedView, view);
  const square = u32(apiCall('pick', observation.position, Math.max(0, Math.min(511, Math.floor(x))), Math.max(0, Math.min(511, Math.floor(y))), pickView), 64);
  reply({ kind: 'picked', id, version, square });
}

function handle(request: WorkerRequest): void {
  if (request.kind === 'new' || request.kind === 'replay') {
    if (request.epoch < activeEpoch) return;
    activeEpoch = request.epoch;
  } else if (request.epoch !== activeEpoch) return;
  try {
    switch (request.kind) {
      case 'new':
        theme = request.theme;
        view = normalizeView(request.view, view);
        start(request.layout, request.policy, request.id);
        return;
      case 'replay':
        theme = request.theme;
        view = normalizeView(request.view, view);
        replay(request.layout, request.policy, request.commands, request.id);
        return;
      case 'command':
        applyCommand(request.id, request.command);
        return;
      case 'bot': {
        if (!match || !observation) throw new Error('Bend match is not initialized.');
        const action = u32(apiCall('bot', match), 21_760);
        if (action >= 21_760) { sendState(request.id, false); return; }
        applyCommand(request.id, { $: 'MoveCommand', expected: observation.revision, action });
        return;
      }
      case 'pick':
        pick(request.id, request.x, request.y, request.version, request.view);
        return;
      case 'render':
        render(request.id, request.version, request.frame);
        return;
    }
  } catch (error) {
    reply({ kind: 'error', id: request.id, message: error instanceof Error ? error.message : String(error) });
  }
}

self.addEventListener('message', event => handle(event.data as WorkerRequest));
