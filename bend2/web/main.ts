import { blitImage, createRgbaBuffer, IMAGE_SIZE } from './blit';
import { RiftAudio } from './audio';
import type { BendRecordFile, BrowserCommand, FrameValue, ObservationView, StoredCommand, ViewValue, WorkerRequestPayload, WorkerResponse } from './types';
import { defaultView, exactCommand, isRecord, linkedList, normalizeView, positionBoard, positionHoles, positionSide } from './types';

type PlayMode = 'hotseat' | 'bot';
type Layout = 'B' | 'C';
type Policy = 0 | 1 | 2;
type Animation = { token: number; frame: FrameValue; progress: number; step: number; requestVersion: number; capture: boolean; sounded: boolean } | null;
type CameraRender = { id: number; version: number };
type CameraDrag = { pointerId: number; startX: number; startY: number; view: ViewValue };

const SAVE_KEY = 'rift-bend-lab/save-v1';
const BACKUP_PREFIX = `${SAVE_KEY}:backup:`;
const PREFERENCES_KEY = 'rift-bend-lab/preferences-v1';
const app = document.querySelector<HTMLElement>('#app') ?? document.body;

app.innerHTML = `
  <header class="nav">
    <a class="wordmark" href="#table" aria-label="Rift Chess Bend2 experiment home"><span>RIFT</span> CHESS <small>BEND2 LAB</small></a>
    <div class="nav-state"><span id="mode-label">LOCAL HOTSEAT</span><strong id="turn-label">Preparing the table…</strong></div>
    <div class="nav-actions"><button id="new-game" class="button gold">New match</button><button id="undo" class="button">Undo</button><button id="menu" class="button ghost" aria-expanded="false">Menu</button></div>
  </header>
  <main class="layout" id="table">
    <section class="board-card" aria-label="Rift Chess Bend2 board">
      <div class="board-heading"><div><p class="eyebrow">ASTRAL STUDY · LOCAL EXPERIMENT</p><h1>Chess on moving ground.</h1></div><span class="badge">Bend2 experiment</span></div>
      <div class="board-wrap"><canvas id="board" width="512" height="512" tabindex="0" role="application" aria-label="Rift Chess board. Arrow keys move focus, Enter selects, Escape clears. Right-drag or Alt-drag orbits the view."></canvas><div id="busy" class="busy" hidden><span class="spinner"></span><span id="busy-label">Preparing the table…</span></div></div>
      <section class="camera-controls" aria-label="Board camera controls">
        <div class="camera-buttons" role="group" aria-label="Camera presets">
          <button id="camera-front" type="button" class="button">Front</button><button id="camera-overhead" type="button" class="button">Overhead</button><button id="camera-left" type="button" class="button" aria-label="Rotate camera left">↺ <span>Left</span></button><button id="camera-right" type="button" class="button" aria-label="Rotate camera right">↻ <span>Right</span></button><button id="camera-reset" type="button" class="button ghost">Reset</button>
        </div>
        <div class="camera-sliders">
          <label class="camera-slider" for="camera-yaw"><span>Rotation <output id="camera-yaw-value">0°</output></span><input id="camera-yaw" type="range" min="0" max="359" step="1" value="0" /></label>
          <label class="camera-slider" for="camera-pitch"><span>Tilt <output id="camera-pitch-value">65°</output></span><input id="camera-pitch" type="range" min="35" max="90" step="1" value="65" /></label>
          <label class="camera-slider" for="camera-zoom"><span>Zoom <output id="camera-zoom-value">100%</output></span><input id="camera-zoom" type="range" min="75" max="115" step="1" value="100" /></label>
        </div>
        <p id="camera-help" class="camera-help">Click or drag the board to engage it. Right-drag, or hold Alt, to orbit; scroll to zoom.</p>
      </section>
      <div class="board-foot"><span id="selection" aria-live="polite">Choose a piece to begin.</span><span id="coordinates">—</span></div>
    </section>
    <aside class="sidebar" aria-label="Match details and controls">
      <section class="panel status-panel"><p class="eyebrow">CURRENT POSITION</p><h2 id="status-title">White to move</h2><p id="status-detail">Select a piece, then a lit destination.</p><div class="status-grid"><span>Legal actions <b id="legal-count">0</b></span><span>Move <b id="revision">1</b></span><span>Layout <b id="layout-label">B-rift</b></span><span>Quiet draw <b id="policy-label">Prompt at 100</b></span></div><div id="toast" class="toast" role="status" aria-live="polite"></div></section>
      <section class="panel controls-panel"><div class="panel-title"><p class="eyebrow">YOUR NEXT MOVE</p><button id="clear" class="text-button">Clear</button></div><p id="selection-help" class="selection-help">Choose a piece or an empty platform.</p><div id="destinations" class="destinations" aria-label="Legal destinations"></div><button id="shift-piece" class="button wide-button" hidden>Shift its platform</button><div class="control-row"><button id="offer" class="button">Offer draw</button><button id="resign" class="button danger">Resign</button></div><div id="draw-actions" class="draw-actions" hidden><span id="draw-copy"></span><button id="accept">Accept</button><button id="decline">Decline</button></div></section>
      <section class="panel history-panel"><div class="panel-title"><p class="eyebrow">MATCH LEDGER</p><span id="record-count">0 actions</span></div><ol id="history" class="history"><li class="empty">Accepted commands appear here.</li></ol></section>
      <section class="panel settings-panel"><div class="panel-title"><p class="eyebrow">TABLE LIGHT</p><span id="theme-label">Astral</span></div><div class="theme-row"><button data-theme="0" class="theme-chip active" aria-label="Astral theme">Astral</button><button data-theme="1" class="theme-chip" aria-label="Warm theme">Warm</button></div><label class="volume-label" for="volume">Sound <span id="volume-value">28%</span></label><div class="volume-row"><input id="volume" type="range" min="0" max="100" value="28" /><button id="sound" class="button" aria-pressed="true">Sound on</button></div><div class="save-row"><button id="export" class="button">Export record</button><label class="button file-button">Import record<input id="import" type="file" accept="application/json,.json" /></label></div></section>
      <section id="recovery-panel" class="panel recovery-panel" hidden><p id="recovery-copy"></p><button id="download-recovery" class="button">Download recovery copy</button><p>Start a new match or import a valid record to continue.</p></section>
      <p class="source-note">An independent Bend2 edition. <a href="https://haileystorm.github.io/rift-chess/" target="_blank" rel="noreferrer">Play the 3D edition →</a></p>
    </aside>
  </main>
  <footer><span>Offline first · local rules and renderer</span><span>Use arrows + Enter · U to undo</span></footer>
  <dialog id="new-dialog" class="dialog"><form id="new-form"><div class="dialog-head"><div><p class="eyebrow">NEW MATCH</p><h2>Set the table.</h2></div><button type="button" class="close" data-close="new-dialog" aria-label="Close">×</button></div><fieldset><legend>Players</legend><label><input type="radio" name="play" value="hotseat" checked /> Local hotseat</label><label><input type="radio" name="play" value="bot" /> Play White vs local bot</label><label class="bot-black-option"><input type="radio" name="play" value="bot-black" /> Play Black vs local bot</label></fieldset><fieldset><legend>Opening layout</legend><label><input type="radio" name="layout" value="B" checked /> B-rift</label><label><input type="radio" name="layout" value="C" /> C-rift</label></fieldset><fieldset><legend>Quiet-action policy</legend><label><input type="radio" name="policy" value="0" checked /> Prompt at 100</label><label><input type="radio" name="policy" value="1" /> Automatic draw at 100</label><label><input type="radio" name="policy" value="2" /> No quiet reminder</label></fieldset><button type="submit" class="button gold wide-button">Start match</button></form></dialog>
  <dialog id="promotion-dialog" class="dialog"><form id="promotion-form"><p class="eyebrow">PROMOTION</p><h2>Choose the new piece.</h2><div class="promotion-grid"><button type="button" data-promotion="1">Queen</button><button type="button" data-promotion="2">Rook</button><button type="button" data-promotion="3">Bishop</button><button type="button" data-promotion="4">Knight</button></div><button type="button" class="text-button" data-close="promotion-dialog">Cancel</button></form></dialog>
  <dialog id="menu-dialog" class="dialog"><div class="dialog-head"><div><p class="eyebrow">YOUR TABLE</p><h2>Make yourself at home.</h2></div><button type="button" class="close" data-close="menu-dialog" aria-label="Close menu">×</button></div><div id="menu-content"></div><details class="rules"><summary>How to play Rift Chess</summary><p>Pieces move as in chess. Click a piece, then a glowing destination or its coordinate button.</p><p>An empty platform—or one carrying a single friendly piece other than a king—can slide into a neighboring rift. Select an empty platform, or choose “Shift its platform” after selecting a piece.</p><p>Moving a platform uses your turn. A transported pawn loses its first double step. Every move must keep your king safe. Checkmate wins.</p></details></dialog>
`;

const $ = <T extends HTMLElement>(selector: string): T => {
  const element = /^[a-zA-Z][\w-]*$/.test(selector) ? document.getElementById(selector) : document.querySelector(selector);
  if (!element) throw new Error(`Missing interface element: ${selector}`);
  return element as T;
};
$('menu-content').append(document.querySelector('.settings-panel')!, document.querySelector('.source-note')!);
for (const [id, text, parent] of [['resume-bot', 'Resume opponent', '.controls-panel'], ['retry-render', 'Retry display', '.status-panel']]) {
  const button = document.createElement('button');
  button.id = id; button.type = 'button'; button.className = 'button wide-button'; button.textContent = text; button.hidden = true;
  document.querySelector(parent)!.append(button);
}
const boardCanvas = $('canvas#board') as HTMLCanvasElement;
const boardContext = boardCanvas.getContext('2d', { alpha: false });
if (!boardContext) throw new Error('Canvas 2D is unavailable.');
const context = boardContext;
context.imageSmoothingEnabled = false;
const rgba = createRgbaBuffer();
const sound = new RiftAudio();
let worker: Worker;
declare const __BEND_WORKER__: string;
try {
  worker = new Worker(new URL(__BEND_WORKER__, import.meta.url), { type: 'module', name: 'rift-bend2-worker' });
} catch (error) {
  $('busy-label').textContent = error instanceof Error ? error.message : 'The Bend worker could not start.';
  $('busy').hidden = false;
  throw error;
}

let nextRequest = 1;
let epoch = 0;
let fileReadVersion = 0;
let latestRenderVersion = 0;
let latestHoverVersion = 0;
const pendingClicks = new Set<number>();
let hoverInFlight: number | null = null;
let queuedHover: { x: number; y: number } | null = null;
let animation: Animation = null;
let animationToken = 0;
let renderCost = 8;
let busy = true;
let mode: PlayMode = 'hotseat';
let humanWhite = true;
let botPaused = false;
let renderFault = false;
let renderRetried = false;
let layout: Layout = 'B';
let policy: Policy = 0;
let theme: 0 | 1 = 0;
let view: ViewValue = defaultView();
let cameraMoving = false;
let deferredCamera: ViewValue | null = null;
let cameraRender: CameraRender | null = null;
let queuedCameraRender: { frame: FrameValue; version: number } | null = null;
let boardEngaged = false;
let cameraDrag: CameraDrag | null = null;
let observation: ObservationView | null = null;
let frame: FrameValue | null = null;
let ledger: StoredCommand[] = [];
let selected = 64;
let hovered = 64;
let tile = 16;
let cursorSquare = 0;
let pendingPromotion: number[] = [];
let pendingReplay: { id: number; epoch: number; record: BendRecordFile; raw?: string; restoreMode: boolean } | null = null;
let recoveryPending = false;
let recoveryRaw: string | null = null;
let loadedRaw: string | null = null;
let toastTimer = 0;
const pending = new Map<number, 'new' | 'replay' | 'command' | 'bot' | 'pick' | 'render'>();

function say(message: string, timeout = 4600): void {
  const toast = $('toast');
  toast.textContent = message;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toast.textContent = ''; }, timeout);
}

function setBusy(value: boolean, message = 'Thinking…'): void {
  busy = value;
  $('busy').hidden = !value;
  $('busy').classList.toggle('has-position', observation !== null);
  $('busy-label').textContent = message;
  updateDisabled();
}

function syncCameraControls(): void {
  const yaw = $('camera-yaw') as HTMLInputElement;
  const pitch = $('camera-pitch') as HTMLInputElement;
  const zoom = $('camera-zoom') as HTMLInputElement;
  yaw.value = String(view.yaw);
  pitch.value = String(view.pitch);
  zoom.value = String(view.zoom);
  $('camera-yaw-value').textContent = `${view.yaw}°`;
  $('camera-pitch-value').textContent = `${view.pitch}°`;
  $('camera-zoom-value').textContent = `${view.zoom}%`;
}

function savePreferences(): void {
  try { localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ mode, humanWhite, botPaused, theme, view, volume: sound.getVolume(), sound: sound.isEnabled() })); } catch { /* Optional local preferences. */ }
}

function loadPreferences(): void {
  try {
    const data = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || 'null');
    if (!isRecord(data)) return;
    if (data.mode === 'bot' || data.mode === 'hotseat') mode = data.mode;
    if (typeof data.humanWhite === 'boolean') humanWhite = data.humanWhite;
    if (typeof data.botPaused === 'boolean') botPaused = data.botPaused;
    if (data.theme === 0 || data.theme === 1) theme = data.theme;
    if (data.view !== undefined) view = normalizeView(data.view, view);
    if (typeof data.volume === 'number') sound.setVolume(data.volume);
    if (typeof data.sound === 'boolean') sound.setEnabled(data.sound);
    ($('volume') as HTMLInputElement).value = String(Math.round(sound.getVolume() * 100));
    $('volume-value').textContent = `${Math.round(sound.getVolume() * 100)}%`;
    $('sound').textContent = sound.isEnabled() ? 'Sound on' : 'Sound off';
    $('sound').setAttribute('aria-pressed', String(sound.isEnabled()));
    $('theme-label').textContent = theme ? 'Warm' : 'Astral';
    document.querySelectorAll<HTMLElement>('[data-theme]').forEach(button => button.classList.toggle('active', Number(button.dataset.theme) === theme));
    syncCameraControls();
  } catch { /* Invalid cosmetics do not invalidate a game record. */ }
}

function recoverRender(reason: string): void {
  cameraMoving = false;
  cameraRender = null;
  queuedCameraRender = null;
  renderFault = true; animation = null;
  if (frame) frame = toFrame({ progress: 16, theme });
  setBusy(true, 'Display paused');
  $('retry-render').hidden = false;
  if (!renderRetried && frame) {
    renderRetried = true;
    requestRender(frame);
  } else {
    console.warn('Bend renderer:', reason);
    say('The board could not be updated. Your moves are intact. Retry the display, or export the record before reloading.', 60000);
  }
}

function post(request: WorkerRequestPayload, state?: 'new' | 'replay' | 'command' | 'bot' | 'pick' | 'render'): number {
  const id = request.id;
  if (state) pending.set(id, state);
  worker.postMessage({ ...request, epoch });
  return id;
}

function currentRevision(): number { return observation?.revision ?? 0; }

function toFrame(overrides: Partial<FrameValue> = {}): FrameValue | null {
  if (!frame) return null;
  const next = { ...frame, ...overrides } as FrameValue;
  next.selected = selected;
  next.hovered = hovered;
  next.theme = theme;
  next.view = normalizeView(overrides.view ?? view, view);
  return next;
}

function draw(image: WorkerResponse & { kind: 'image' }): void {
  const pixels = blitImage(image.image, rgba);
  context.putImageData(new ImageData(pixels as unknown as Uint8ClampedArray<ArrayBuffer>, IMAGE_SIZE, IMAGE_SIZE), 0, 0);
  renderCost = image.renderMs;
}

function flushCameraRender(): void {
  if (cameraRender || !queuedCameraRender) return;
  const queued = queuedCameraRender;
  queuedCameraRender = null;
  const id = nextRequest++;
  cameraRender = { id, version: queued.version };
  post({ kind: 'render', id, frame: queued.frame, version: queued.version }, 'render');
}

function requestRender(nextFrame = toFrame(), camera = false): void {
  if (!nextFrame) return;
  if (camera || cameraMoving || cameraRender || queuedCameraRender) {
    const version = ++latestRenderVersion;
    queuedCameraRender = { frame: nextFrame, version };
    if (camera) cameraMoving = true;
    flushCameraRender();
    return;
  }
  const version = ++latestRenderVersion;
  post({ kind: 'render', id: nextRequest++, frame: nextFrame, version }, 'render');
}

function updateFrame(next: Partial<FrameValue> = {}): void {
  const nextFrame = toFrame(next);
  if (!nextFrame) return;
  frame = nextFrame;
  if (animation) {
    animation.frame = { ...animation.frame, ...nextFrame, progress: animation.progress };
    if (cameraMoving) requestRender(animation.frame, true);
    return;
  }
  requestRender(nextFrame);
}

function setCamera(next: Partial<Pick<ViewValue, 'yaw' | 'pitch' | 'zoom'>>, persist = true): void {
  const nextView = normalizeView({ ...(deferredCamera ?? view), ...next }, view);
  if (pendingClicks.size) {
    deferredCamera = nextView;
    syncCameraControls();
    return;
  }
  deferredCamera = null;
  if (nextView.yaw === view.yaw && nextView.pitch === view.pitch && nextView.zoom === view.zoom) return;
  view = nextView;
  queuedHover = null;
  hoverInFlight = null;
  latestHoverVersion += 1;
  hovered = 64;
  syncCameraControls();
  const nextFrame = toFrame({ view: nextView, hovered });
  if (nextFrame) {
    frame = nextFrame;
    const renderFrame = animation ? { ...animation.frame, progress: animation.progress, view: nextView, hovered } : nextFrame;
    if (animation) animation.frame = renderFrame;
    requestRender(renderFrame, true);
  }
  updateDisabled();
  if (persist) savePreferences();
}

function opponentToMove(): boolean {
  if (mode !== 'bot' || !observation || observation.outcome) return false;
  return positionSide(observation.position) !== humanWhite;
}

function isBotTurn(): boolean { return opponentToMove() && !botPaused; }

function shouldLockBoard(): boolean {
  return recoveryPending || renderFault || cameraMoving || busy || animation !== null || !observation || observation.outcome !== null || opponentToMove();
}

function canUndo(): boolean {
  return !recoveryPending && !renderFault && !busy && animation === null && Boolean(observation?.canUndo);
}

function sideName(side: boolean): string { return side ? 'White' : 'Black'; }

function outcomeName(outcome: string | null): string {
  if (!outcome) return '';
  const labels: Record<string, string> = {
    WhiteCheckmate: 'White wins · checkmate', BlackCheckmate: 'Black wins · checkmate', Stalemate: 'Draw · stalemate',
    BareKings: 'Draw · bare kings', Threefold: 'Draw · threefold repetition', Progress100: 'Draw · 100 quiet actions',
    Agreed: 'Draw agreed', WhiteResignedOutcome: 'Black wins · White resigned', BlackResignedOutcome: 'White wins · Black resigned',
  };
  return labels[outcome] ?? outcome;
}

function policyName(value: Policy): string { return value === 0 ? 'Prompt at 100' : value === 1 ? 'Automatic at 100' : 'No quiet reminder'; }

function refreshStatus(): void {
  if (!observation) return;
  const terminal = outcomeName(observation.outcome);
  $('mode-label').textContent = mode === 'bot' ? `LOCAL BOT · ${humanWhite ? 'WHITE' : 'BLACK'}` : 'LOCAL HOTSEAT';
  $('turn-label').textContent = terminal || `${sideName(positionSide(observation.position))} to move`;
  $('mode-label').textContent = mode === 'bot' ? `YOU PLAY ${humanWhite ? 'WHITE' : 'BLACK'} · LOCAL BOT` : 'LOCAL HOTSEAT';
  $('status-title').textContent = terminal || `${sideName(positionSide(observation.position))} to move`;
  $('status-detail').textContent = terminal ? 'This match is complete. Start another table to continue.' : observation.inCheck ? `${sideName(positionSide(observation.position))} is in check. Select a legal response.` : selected < 64 ? 'Choose a lit destination, or clear the selection.' : 'Select a piece, then a lit destination.';
  if (!terminal && botPaused && opponentToMove()) $('status-detail').textContent = 'Opponent paused after undo. Undo again to change your move, or resume.';
  else if (!terminal && policy === 0 && BigInt(String(observation.position.quiet ?? 0)) >= 100n) $('status-detail').textContent = '100 quiet actions have passed. You can offer a draw or keep playing.';
  $('resume-bot').hidden = !(botPaused && opponentToMove());
  ($('resume-bot') as HTMLButtonElement).disabled = busy || renderFault;
  $('retry-render').hidden = !renderFault;
  $('legal-count').textContent = String(observation.legalIds.length);
  $('revision').textContent = String(observation.position.full ?? 1);
  $('layout-label').textContent = `${layout}-rift`;
  $('policy-label').textContent = policyName(policy);
  $('record-count').textContent = `${ledger.length} ${ledger.length === 1 ? 'action' : 'actions'}`;
  const history = $('ol#history');
  history.replaceChildren();
  if (!ledger.length) {
    const empty = document.createElement('li'); empty.className = 'empty'; empty.textContent = 'Accepted commands appear here.'; history.append(empty);
  } else {
    ledger.forEach((command, index) => { const item = document.createElement('li'); item.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span>${commandLabel(command)}`; history.append(item); });
  }
  const offer = observation.offerSide;
  $('draw-actions').hidden = offer === null || terminal !== '';
  $('draw-copy').textContent = offer === null ? '' : `${sideName(offer)} offers a draw.`;
  $('offer').textContent = offer === null ? 'Offer draw' : 'Draw offered';
  ($('offer') as HTMLButtonElement).disabled = shouldLockBoard() || offer !== null;
  ($('resign') as HTMLButtonElement).disabled = shouldLockBoard();
  ($('undo') as HTMLButtonElement).disabled = !canUndo();
  ($('accept') as HTMLButtonElement).disabled = shouldLockBoard();
  ($('decline') as HTMLButtonElement).disabled = shouldLockBoard();
  $('coordinates').textContent = hovered < 64 ? squareName(hovered) : selected < 64 ? squareName(selected) : '—';
  refreshSelectionCopy();
}

function refreshSelectionCopy(): void {
  const detail = $('selection');
  const shift = $('shift-piece') as HTMLButtonElement;
  if (selected < 64) {
    const code = boardCode(selected);
    const kind = code > 8 ? code - 8 : code;
    const names: Record<number, string> = { 1: 'pawn', 7: 'pawn', 2: 'knight', 3: 'bishop', 4: 'rook', 5: 'queen', 6: 'king' };
    detail.textContent = `${code < 8 ? 'White' : 'Black'} ${names[kind] ?? 'piece'} · ${squareName(selected)} selected`;
    shift.hidden = false;
  } else if (tile < 16) {
    detail.textContent = `Tile ${tile + 1} selected`;
    shift.hidden = true;
  } else {
    detail.textContent = 'Choose a piece to begin.';
    shift.hidden = true;
  }
  shift.disabled = selected >= 64 || legalShiftsFrom(macroOf(selected)).length === 0 || shouldLockBoard();
  const destinations = $('destinations');
  destinations.replaceChildren();
  const ids = selected < 64 ? legalMovesFrom(selected) : tile < 16 ? legalShiftsFrom(tile) : [];
  const groups = new Map<number, number[]>();
  for (const id of ids) {
    const to = decodeAction(id).to;
    groups.set(to, [...(groups.get(to) ?? []), id]);
  }
  $('selection-help').textContent = selected < 64 ? detail.textContent! : tile < 16 ? 'Choose a glowing rift to slide into.' : 'Choose a piece or an empty platform.';
  for (const [to, choices] of groups) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'destination';
    button.textContent = selected < 64 ? squareName(to) : tileName(to);
    button.setAttribute('aria-label', `${selected < 64 ? 'Move to' : 'Shift to'} ${button.textContent}`);
    button.disabled = shouldLockBoard();
    button.addEventListener('click', () => submitAction(choices));
    destinations.append(button);
  }
}

function updateDisabled(): void {
  const locked = shouldLockBoard();
  ['clear', 'shift-piece'].forEach(id => { ($(id) as HTMLButtonElement).disabled = locked; });
  refreshStatus();
}

function squareName(square: number): string {
  if (square < 0 || square >= 64) return '—';
  return `${String.fromCharCode(97 + (square % 8))}${Math.floor(square / 8) + 1}`;
}

function commandLabel(command: BrowserCommand): string {
  if (command.$ === 'MoveCommand') {
    const action = decodeAction(command.action ?? 0);
    const promotion = action.promotion ? ` = ${['', 'Q', 'R', 'B', 'N'][action.promotion]}` : '';
    return action.kind === 'move' ? `${squareName(action.from)} → ${squareName(action.to)}${promotion}` : `Shift ${tileName(action.from)} → ${tileName(action.to)}${promotion}`;
  }
  if (command.$ === 'UndoCommand') return 'Undo';
  if (command.$ === 'OfferCommand') return `${command.side ? 'White' : 'Black'} offers draw`;
  if (command.$ === 'AcceptCommand') return 'Draw accepted';
  if (command.$ === 'DeclineCommand') return 'Draw declined';
  return `${command.side ? 'White' : 'Black'} resigns`;
}

function tileName(tile: number): string {
  const square = Math.floor(tile / 4) * 16 + (tile % 4) * 2;
  return `${squareName(square)}–${squareName(square + 9)}`;
}

function decodeAction(id: number): { kind: 'move' | 'shift'; from: number; to: number; promotion: number } {
  if (id < 20_480) {
    const quotient = Math.floor(id / 5);
    return { kind: 'move', from: Math.floor(quotient / 64), to: quotient % 64, promotion: id % 5 };
  }
  const quotient = Math.floor((id - 20_480) / 5);
  return { kind: 'shift', from: Math.floor(quotient / 16), to: quotient % 16, promotion: id % 5 };
}

function boardCode(square: number): number {
  return observation ? positionBoard(observation.position)[square] ?? 0 : 0;
}

function isFriendly(code: number): boolean {
  return code !== 0 && (positionSide(observation!.position) ? code < 8 : code >= 9);
}

function presentMacro(macro: number): boolean {
  return observation ? (positionHoles(observation.position) & (1 << macro)) === 0 : false;
}

function macroOf(square: number): number { return Math.floor(Math.floor(square / 8) / 2) * 4 + Math.floor((square % 8) / 2); }

function legalMovesFrom(square: number): number[] {
  return observation?.legalIds.filter(id => { const action = decodeAction(id); return action.kind === 'move' && action.from === square; }) ?? [];
}

function legalShiftsFrom(macro: number): number[] {
  return observation?.legalIds.filter(id => { const action = decodeAction(id); return action.kind === 'shift' && action.from === macro; }) ?? [];
}

function setSelection(nextSelected: number, nextTile = 16): void {
  selected = nextSelected;
  tile = nextTile;
  const targetSquares = selected < 64 ? legalMovesFrom(selected).map(id => decodeAction(id).to) : [];
  const targetTiles = tile < 16 ? legalShiftsFrom(tile).map(id => decodeAction(id).to) : [];
  updateFrame({ selected, tile, targets: linkedList([...new Set(targetSquares)]), tileTargets: linkedList([...new Set(targetTiles)]) });
  sound.play('piececlick');
  refreshStatus();
}

function clearSelection(message = 'Selection cleared.'): void {
  selected = 64; tile = 16; pendingPromotion = [];
  updateFrame({ selected, tile, targets: linkedList([]), tileTargets: linkedList([]) });
  if (message) say(message, 1800);
  refreshStatus();
}

function submitAction(ids: number[]): void {
  if (!ids.length || !observation || shouldLockBoard()) return;
  if (ids.length > 1) {
    pendingPromotion = ids;
    const dialog = $('dialog#promotion-dialog') as HTMLDialogElement;
    dialog.showModal();
    return;
  }
  sendCommand({ $: 'MoveCommand', expected: currentRevision(), action: ids[0] });
}

function handleSquare(square: number): void {
  if (!observation || square >= 64 || shouldLockBoard()) return;
  cursorSquare = square;
  const code = boardCode(square);
  if (selected < 64) {
    if (isFriendly(code)) { setSelection(square); return; }
    const candidates = legalMovesFrom(selected).filter(id => decodeAction(id).to === square);
    if (candidates.length) { submitAction(candidates); return; }
  }
  if (tile < 16) {
    const macro = macroOf(square);
    const shifts = legalShiftsFrom(tile).filter(id => decodeAction(id).to === macro);
    if (shifts.length) { submitAction(shifts); return; }
    if (presentMacro(macro) && code === 0) { setSelection(64, macro); return; }
  }
  if (isFriendly(code)) { setSelection(square); return; }
  if (code === 0 && presentMacro(macroOf(square))) {
    const macro = macroOf(square);
    if (legalShiftsFrom(macro).length) { setSelection(64, macro); return; }
  }
  say(code === 0 ? 'That tile has no legal action here.' : 'That piece belongs to the other side.', 2500);
}

function handlePicked(square: number, version: number): void {
  // A subsequent hover must never cancel a click while Bend is picking it.
  if (pendingClicks.delete(version)) {
    handleSquare(square);
    if (!pendingClicks.size && deferredCamera) setCamera(deferredCamera);
    return;
  }
  if (hoverInFlight !== version) return;
  hoverInFlight = null;
  if (!queuedHover && version === latestHoverVersion && hovered !== square) {
    hovered = square;
    updateFrame({ hovered });
    refreshStatus();
  }
  pumpHover();
}

function pointerPosition(event: PointerEvent): { x: number; y: number } {
  const rect = boardCanvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * IMAGE_SIZE / rect.width, y: (event.clientY - rect.top) * IMAGE_SIZE / rect.height };
}

function beginCameraDrag(event: PointerEvent): void {
  cameraDrag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, view: { ...view } };
  boardEngaged = true;
  boardCanvas.classList.add('orbiting');
  boardCanvas.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function endCameraDrag(event: PointerEvent): void {
  if (!cameraDrag || cameraDrag.pointerId !== event.pointerId) return;
  if (boardCanvas.hasPointerCapture(event.pointerId)) boardCanvas.releasePointerCapture(event.pointerId);
  cameraDrag = null;
  boardCanvas.classList.remove('orbiting');
  savePreferences();
}

function cameraWheel(event: WheelEvent): void {
  if (!boardEngaged && document.activeElement !== boardCanvas) return;
  const amount = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 4 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 20 : Math.max(1, Math.min(8, Math.round(Math.abs(event.deltaY) / 18)));
  if (!amount) return;
  setCamera({ zoom: view.zoom + (event.deltaY < 0 ? amount : -amount) });
  event.preventDefault();
}

function dispatchPick(x: number, y: number, click: boolean): void {
  const version = ++latestHoverVersion;
  if (click) pendingClicks.add(version); else hoverInFlight = version;
  post({ kind: 'pick', id: nextRequest++, x, y, version, view: normalizeView(view) });
}

function pumpHover(): void {
  if (hoverInFlight !== null || !queuedHover || shouldLockBoard()) return;
  const point = queuedHover;
  queuedHover = null;
  dispatchPick(point.x, point.y, false);
}

function requestPick(event: PointerEvent, click: boolean): void {
  if (!observation || shouldLockBoard()) return;
  const point = pointerPosition(event);
  if (click) { queuedHover = null; dispatchPick(point.x, point.y, true); }
  else { queuedHover = point; pumpHover(); }
}

function beginAnimation(nextFrame: FrameValue): void {
  animationToken += 1;
  const step = renderCost > 36 ? 8 : renderCost > 14 ? 4 : 2;
  const capture = positionBoard(nextFrame.previous).filter(Boolean).length > positionBoard(nextFrame.position).filter(Boolean).length;
  animation = { token: animationToken, frame: nextFrame, progress: Math.max(0, Math.min(16, nextFrame.progress)), step, requestVersion: 0, capture, sounded: false };
  setBusy(true, 'Animating the move…');
  queueAnimationFrame(animation.token);
}

function queueAnimationFrame(token: number): void {
  if (!animation || animation.token !== token) return;
  if (cameraMoving) return;
  if (animation.capture && !animation.sounded && animation.progress >= 8) { sound.play('capture'); animation.sounded = true; }
  const nextFrame = { ...animation.frame, progress: animation.progress } as FrameValue;
  const version = ++latestRenderVersion;
  animation.requestVersion = version;
  post({ kind: 'render', id: nextRequest++, frame: nextFrame, version }, 'render');
}

function finishAnimation(): void {
  const wasBot = isBotTurn();
  if (animation) frame = { ...animation.frame, progress: 16, hovered, theme, view };
  animation = null;
  setBusy(false);
  if (observation?.outcome) { sound.play('win'); say(outcomeName(observation.outcome), 6500); }
  else if (wasBot) requestBot();
}

function requestBot(): void {
  if (!isBotTurn() || busy || !observation) return;
  setBusy(true, 'The local bot is studying the rift…');
  post({ kind: 'bot', id: nextRequest++ }, 'bot');
}

function sendCommand(command: BrowserCommand): void {
  if (!observation || (command.$ === 'UndoCommand' ? !canUndo() : shouldLockBoard())) return;
  setBusy(true, 'Moving…');
  post({ kind: 'command', id: nextRequest++, command }, 'command');
}

function parseRecord(value: unknown): BendRecordFile {
  if (!isRecord(value) || Object.keys(value).some(key => !['schema', 'layout', 'policy', 'commands'].includes(key))) throw new Error('Record has unexpected fields.');
  if (value.schema !== 'rift-bend-record/1' || (value.layout !== 'B' && value.layout !== 'C') || ![0, 1, 2].includes(value.policy as number) || !Array.isArray(value.commands) || value.commands.length > 20_000) throw new Error('Record header is invalid.');
  const commands = value.commands.map(command => exactCommand(command));
  if (commands.some(command => command === null)) throw new Error('Record contains an invalid command.');
  return { schema: 'rift-bend-record/1', layout: value.layout, policy: value.policy as Policy, commands: commands as StoredCommand[] };
}

function backupRaw(raw: string, reason: string): void {
  recoveryRaw = raw;
  let retained = false;
  try { localStorage.setItem(`${BACKUP_PREFIX}${Date.now()}-${crypto.randomUUID()}`, raw); retained = true; } catch { /* Download remains available in memory. */ }
  $('recovery-panel').hidden = false;
  $('recovery-copy').textContent = `${reason} ${retained ? 'A recovery copy is saved in this browser.' : 'Download a recovery copy before leaving.'}`;
  say(reason, 6000);
}

function loadRecord(): BendRecordFile | null {
  let raw: string | null = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch { return null; }
  if (!raw) return null;
  loadedRaw = raw;
  try { return parseRecord(JSON.parse(raw)); }
  catch (error) { recoveryPending = true; backupRaw(raw, error instanceof Error ? error.message : 'Saved record is invalid.'); return null; }
}

function saveRecord(): void {
  if (!observation || recoveryPending) return;
  const record: BendRecordFile = { schema: 'rift-bend-record/1', layout, policy, commands: ledger.map(command => ({ ...command })) };
  const text = JSON.stringify(record);
  try { localStorage.setItem(SAVE_KEY, text); }
  catch { say('The record could not be saved. Export a copy before leaving.', 6000); }
}

function beginSession(): void {
  epoch++; fileReadVersion++; pending.clear(); pendingReplay = null;
  pendingClicks.clear(); queuedHover = null; hoverInFlight = null; latestHoverVersion++;
  cameraMoving = false; cameraRender = null; queuedCameraRender = null; cameraDrag = null;
  deferredCamera = null;
  animation = null; animationToken++;
  renderFault = false; renderRetried = false;
}

function startMatch(nextLayout: Layout, nextPolicy: Policy, nextMode: PlayMode, nextHumanWhite = true, replaceSaved = true): void {
  beginSession();
  if (replaceSaved) { recoveryPending = false; $('recovery-panel').hidden = true; }
  botPaused = false;
  layout = nextLayout; policy = nextPolicy; mode = nextMode; humanWhite = nextHumanWhite; ledger = [];
  observation = null; frame = null; selected = 64; hovered = 64; tile = 16;
  syncCameraControls();
  setBusy(true, 'Preparing the Bend table…');
  post({ kind: 'new', id: nextRequest++, layout: layout === 'B', policy, theme, view }, 'new');
  savePreferences();
}

function replayRecord(record: BendRecordFile, raw?: string, restoreMode = false): void {
  beginSession();
  const id = nextRequest++;
  pendingReplay = { id, epoch, record, raw, restoreMode };
  setBusy(true, 'Replaying the accepted record…');
  post({ kind: 'replay', id, layout: record.layout === 'B', policy: record.policy, commands: record.commands, theme, view }, 'replay');
}

function exportRecord(): void {
  const record: BendRecordFile = { schema: 'rift-bend-record/1', layout, policy, commands: ledger.map(command => ({ ...command })) };
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `rift-bend-record-${layout.toLowerCase()}.json`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  say('Record exported.', 1800);
}

function updateTheme(nextTheme: 0 | 1): void {
  theme = nextTheme;
  document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(button => button.classList.toggle('active', Number(button.dataset.theme) === theme));
  $('theme-label').textContent = theme === 0 ? 'Astral' : 'Warm';
  if (frame) updateFrame({ theme });
  savePreferences();
}

worker.addEventListener('message', event => {
  const message = event.data as WorkerResponse;
  if (message.epoch !== epoch) return;
  if (message.kind === 'image') {
    pending.delete(message.id);
    const cameraResponse = cameraRender?.id === message.id;
    if (cameraResponse) cameraRender = null;
    if (message.version !== latestRenderVersion) {
      if (cameraResponse) flushCameraRender();
      return;
    }
    try { draw(message); } catch (error) { recoverRender(String(error)); return; }
    if (renderFault) {
      renderFault = false; renderRetried = false; setBusy(false);
      say('Board display restored.', 1800);
      if (isBotTurn()) requestBot();
    }
    if (cameraResponse) {
      if (queuedCameraRender) { flushCameraRender(); return; }
      cameraMoving = false;
      updateDisabled();
      if (animation) window.requestAnimationFrame(() => queueAnimationFrame(animation?.token ?? 0));
    }
    if (animation && message.version === animation.requestVersion) {
      if (animation.progress >= 16) { finishAnimation(); return; }
      animation.progress = Math.min(16, animation.progress + animation.step);
      window.requestAnimationFrame(() => queueAnimationFrame(animation?.token ?? 0));
    }
    return;
  }
  if (message.kind === 'picked') { handlePicked(message.square, message.version); return; }
  if (message.kind === 'error') {
    const kind = pending.get(message.id);
    pending.delete(message.id);
    if (kind === 'render') { recoverRender(message.message); return; }
    animation = null;
    setBusy(false);
    pendingClicks.clear();
    if (deferredCamera) setCamera(deferredCamera);
    const failedStartupReplay = Boolean(pendingReplay?.id === message.id && !observation);
    if (pendingReplay?.id === message.id) {
      if (pendingReplay.raw) backupRaw(pendingReplay.raw, 'Imported record was rejected by Bend.');
      pendingReplay = null;
    }
    if (failedStartupReplay) { recoveryPending = true; startMatch('B', 0, 'hotseat', true, false); }
    say(message.message, 6500);
    return;
  }
  const stateKind = pending.get(message.id);
  pending.delete(message.id);
  if (stateKind === 'new' || stateKind === 'replay') {
    if (stateKind === 'replay' && pendingReplay?.id === message.id && pendingReplay.epoch === epoch) {
      if (!pendingReplay.restoreMode) { mode = 'hotseat'; humanWhite = true; botPaused = false; }
      layout = pendingReplay.record.layout; policy = pendingReplay.record.policy; ledger = pendingReplay.record.commands.map(command => ({ ...command })); pendingReplay = null;
      recoveryPending = false; $('recovery-panel').hidden = true;
    }
    if (stateKind === 'new') ledger = [];
  }
  observation = message.observation;
  frame = { ...message.frame, view, theme };
  selected = frame.selected; hovered = frame.hovered; tile = frame.tile;
  if (message.accepted && message.command) ledger.push({ ...message.command });
  if (message.accepted && message.command?.$ === 'UndoCommand' && mode === 'bot') botPaused = true;
  if (message.accepted && message.command?.$ === 'MoveCommand' && stateKind === 'command') botPaused = false;
  if (!message.accepted && message.command) say('That command is illegal or stale; the table did not change.', 4000);
  if (message.accepted && message.command?.$ === 'MoveCommand') {
    sound.play(message.command.action !== undefined && message.command.action >= 20_480 ? 'shift' : 'move');
    beginAnimation({ ...message.frame, view, theme });
  } else {
    setBusy(false);
    requestRender({ ...message.frame, view, theme });
    if (stateKind === 'bot' && !message.accepted) say('The local bot has no move available.', 3000);
    if (stateKind === 'command' && message.accepted && message.command?.$ === 'ResignCommand') sound.play('win');
    if (observation.outcome) { sound.play('win'); say(outcomeName(observation.outcome), 6500); }
    if (stateKind === 'command' && message.accepted && message.command?.$ === 'OfferCommand' && mode === 'bot' && observation.offerSide !== null) {
      say('The local bot declines draw offers.', 2600);
      sendCommand({ $: 'DeclineCommand', expected: currentRevision(), side: !observation.offerSide });
    } else if (isBotTurn() && stateKind !== 'bot' && message.command?.$ !== 'UndoCommand') requestBot();
  }
  refreshStatus();
  saveRecord();
  savePreferences();
});

boardCanvas.addEventListener('pointermove', event => {
  if (cameraDrag?.pointerId === event.pointerId) {
    const yaw = cameraDrag.view.yaw + Math.round((event.clientX - cameraDrag.startX) * .8);
    const pitch = cameraDrag.view.pitch - Math.round((event.clientY - cameraDrag.startY) * .55);
    setCamera({ yaw, pitch }, false);
    return;
  }
  requestPick(event, false);
});
boardCanvas.addEventListener('pointerleave', () => {
  queuedHover = null; latestHoverVersion++; hovered = 64;
  if (!cameraDrag && !busy && !animation && !cameraMoving) updateFrame({ hovered });
  if (!cameraDrag && document.activeElement !== boardCanvas) boardEngaged = false;
});
boardCanvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary) return;
  if (event.button === 2 || (event.button === 0 && event.altKey)) { beginCameraDrag(event); return; }
  if (event.button !== 0) return;
  boardCanvas.focus(); boardEngaged = true; requestPick(event, true); void sound.unlock();
});
boardCanvas.addEventListener('pointerup', endCameraDrag);
boardCanvas.addEventListener('pointercancel', endCameraDrag);
boardCanvas.addEventListener('lostpointercapture', () => {
  if (!cameraDrag) return;
  cameraDrag = null;
  boardCanvas.classList.remove('orbiting');
  savePreferences();
});
boardCanvas.addEventListener('contextmenu', event => event.preventDefault());
boardCanvas.addEventListener('wheel', cameraWheel, { passive: false });
boardCanvas.addEventListener('focus', () => { boardEngaged = true; });
boardCanvas.addEventListener('blur', () => { if (!cameraDrag) boardEngaged = false; });
boardCanvas.addEventListener('keydown', event => {
  if (event.key === 'Escape') { clearSelection(); return; }
  if (event.key.toLowerCase() === 'u') { if (canUndo()) sendCommand({ $: 'UndoCommand', expected: currentRevision() }); return; }
  const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: 8, ArrowDown: -8 };
  if (event.key in moves) { event.preventDefault(); cursorSquare = (cursorSquare + moves[event.key] + 64) % 64; hovered = cursorSquare; updateFrame({ hovered }); $('coordinates').textContent = squareName(cursorSquare); return; }
  if (event.key === 'Enter') { event.preventDefault(); handleSquare(cursorSquare); }
});

$('clear').addEventListener('click', () => clearSelection());
$('shift-piece').addEventListener('click', () => { if (selected < 64) { const macro = macroOf(selected); if (legalShiftsFrom(macro).length) setSelection(64, macro); else say('That piece’s tile has no legal Shift.', 2600); } });
$('undo').addEventListener('click', () => { if (canUndo()) sendCommand({ $: 'UndoCommand', expected: currentRevision() }); });
$('resume-bot').addEventListener('click', () => { botPaused = false; savePreferences(); refreshStatus(); requestBot(); });
$('retry-render').addEventListener('click', () => { renderRetried = false; recoverRender(''); });
$('offer').addEventListener('click', () => { if (!observation || shouldLockBoard() || observation.offerSide !== null) return; sendCommand({ $: 'OfferCommand', expected: currentRevision(), side: positionSide(observation.position) }); });
$('accept').addEventListener('click', () => { if (!observation || observation.offerSide === null) return; sendCommand({ $: 'AcceptCommand', expected: currentRevision(), side: !observation.offerSide }); });
$('decline').addEventListener('click', () => { if (!observation || observation.offerSide === null) return; sendCommand({ $: 'DeclineCommand', expected: currentRevision(), side: !observation.offerSide }); });
$('resign').addEventListener('click', () => { if (!observation || shouldLockBoard()) return; sendCommand({ $: 'ResignCommand', expected: currentRevision(), side: positionSide(observation.position) }); });
$('new-game').addEventListener('click', () => ($('dialog#new-dialog') as HTMLDialogElement).showModal());
$('menu').addEventListener('click', () => { ($('dialog#menu-dialog') as HTMLDialogElement).showModal(); $('menu').setAttribute('aria-expanded', 'true'); });
$('menu-dialog').addEventListener('close', () => $('menu').setAttribute('aria-expanded', 'false'));
$('export').addEventListener('click', exportRecord);
$('download-recovery').addEventListener('click', () => {
  if (recoveryRaw === null) return;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([recoveryRaw], { type: 'application/json' }));
  link.download = 'rift-bend-recovery.json'; link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});
$('import').addEventListener('change', async event => {
  const version = ++fileReadVersion;
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  let raw = '';
  try { raw = await file.text(); if (version !== fileReadVersion) return; replayRecord(parseRecord(JSON.parse(raw)), raw); ($('dialog#menu-dialog') as HTMLDialogElement).close(); }
  catch (error) { if (raw) backupRaw(raw, error instanceof Error ? error.message : 'The imported record is invalid.'); else say('The imported record could not be read.', 5000); }
  (event.target as HTMLInputElement).value = '';
});
$('volume').addEventListener('input', event => { const value = Number((event.target as HTMLInputElement).value); sound.setVolume(value / 100); $('volume-value').textContent = `${value}%`; savePreferences(); });
$('sound').addEventListener('click', () => { sound.setEnabled(!sound.isEnabled()); const enabled = sound.isEnabled(); $('sound').textContent = enabled ? 'Sound on' : 'Sound off'; $('sound').setAttribute('aria-pressed', String(enabled)); void sound.unlock(); savePreferences(); });
$('camera-front').addEventListener('click', () => setCamera({ yaw: 0, pitch: 65, zoom: 100 }));
$('camera-overhead').addEventListener('click', () => setCamera({ yaw: 0, pitch: 90 }));
$('camera-left').addEventListener('click', () => setCamera({ yaw: view.yaw - 45 }));
$('camera-right').addEventListener('click', () => setCamera({ yaw: view.yaw + 45 }));
$('camera-reset').addEventListener('click', () => setCamera(defaultView()));
for (const [id, key] of [['camera-yaw', 'yaw'], ['camera-pitch', 'pitch'], ['camera-zoom', 'zoom']] as const) {
  const input = $(id) as HTMLInputElement;
  input.addEventListener('input', () => setCamera({ [key]: Number(input.value) }, false));
  input.addEventListener('change', savePreferences);
}
document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(button => button.addEventListener('click', () => updateTheme(Number(button.dataset.theme) === 1 ? 1 : 0)));
document.querySelectorAll<HTMLElement>('[data-close]').forEach(button => button.addEventListener('click', () => (document.getElementById(button.dataset.close!) as HTMLDialogElement)?.close()));
document.querySelectorAll<HTMLButtonElement>('[data-promotion]').forEach(button => button.addEventListener('click', () => {
  const promotion = Number(button.dataset.promotion);
  const action = pendingPromotion.find(id => decodeAction(id).promotion === promotion);
  ($('dialog#promotion-dialog') as HTMLDialogElement).close();
  if (action !== undefined && observation) sendCommand({ $: 'MoveCommand', expected: currentRevision(), action });
  pendingPromotion = [];
}));
$('new-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const play = (new FormData(form).get('play') as string) ?? 'hotseat';
  const nextLayout = (new FormData(form).get('layout') as Layout) ?? 'B';
  const nextPolicy = Number(new FormData(form).get('policy') ?? 0) as Policy;
  const nextMode: PlayMode = play === 'hotseat' ? 'hotseat' : 'bot';
  humanWhite = play !== 'bot-black';
  (form.closest('dialog') as HTMLDialogElement).close();
  startMatch(nextLayout, nextPolicy, nextMode, humanWhite);
});

window.addEventListener('pointerdown', () => { void sound.unlock(); }, { capture: true });
window.addEventListener('keydown', () => { void sound.unlock(); }, { capture: true });
window.addEventListener('pagehide', () => { savePreferences(); sound.dispose(); });
worker.addEventListener('error', () => { renderFault = true; setBusy(true, 'The game worker stopped. Reload to restore your saved match.'); });

loadPreferences();
const saved = loadRecord();
if (saved) replayRecord(saved, loadedRaw ?? undefined, true);
else startMatch('B', 0, recoveryPending ? 'hotseat' : mode, humanWhite, false);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js').catch(() => say('Offline caching is unavailable; this game still works while connected.', 5000)); });
}
