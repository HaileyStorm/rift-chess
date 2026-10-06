// Generic transport for a Bend pixel application. All visible UI comes from Bend.
import { Ports, type PreparedPickFile } from './ports';
import { PresentedInputQueue } from './input-queue';
import { makeBrowserProfile, measureBrowserCapabilities, PROFILE_EVENT, queryMaxTextureEdge, RollingP90, type BrowserCapabilities } from './telemetry';
declare const __BEND_WORKER__: string;
const canvas = document.querySelector('canvas')!;
const context = canvas.getContext('2d', { alpha: false })!;
const status = document.querySelector<HTMLElement>('[role="status"]')!;
const controls = document.querySelector<HTMLElement>('#accessibility')!;
const worker = new Worker(new URL(__BEND_WORKER__, import.meta.url), { type: 'module' });
let ports: Ports;
let presentation: unknown;
const receivedAtlasMasks = new Map<number, number>();
const queuedAtlasMasks = new Set<number>();
let inflightAtlasMask: number | null = null;

function atlasMaskId(shown: any): number | null {
  return shown?.atlasPick === true && Number.isSafeInteger(shown.atlasMaskId) &&
    shown.atlasMaskId > 0 ? shown.atlasMaskId : null;
}

function retireAtlasMasks(): void {
  const needed = new Set(queuedAtlasMasks);
  for (const id of [atlasMaskId(presentation), inflightAtlasMask,
    atlasMaskId(touchImport?.presentation),
    pendingRefinement?.atlasPick === true ? pendingRefinement.atlasMaskId : null]) {
    if (id !== null) needed.add(id);
  }
  const masks = [...receivedAtlasMasks].filter(([id]) => !needed.has(id))
    .map(([id, offer]) => ({ id, offer }));
  if (!masks.length) return;
  for (const { id } of masks) receivedAtlasMasks.delete(id);
  worker.postMessage({ kind: 'retire-atlas-masks', masks });
}
let presentedControls: any[] = [];
const queuedPickers = new WeakMap<object, PreparedPickFile>();
const inflightPickers = new Map<number, PreparedPickFile[]>();
const activePickers = new Set<PreparedPickFile>();
let touchImport: { pointerId: number; input: any; presentation: unknown; layoutVersion: number } | null = null;
let layoutVersion = 0;
let presentedTheme: number | null = null;
let pendingRefinement: any = null;
let busy = true, sequence = 0, timer = 0, clockActive = false, lastClock = 0, slow = 0;
const queue = new PresentedInputQueue<any>();
let capabilities: BrowserCapabilities;
const requestStarted = new Map<number, number>();
const bendCompute = new RollingP90();
const workerPreparation = new RollingP90();
const workerReply = new RollingP90();
const hostPresentation = new RollingP90();
const qualityWindow: Array<{ mainUs: number; workerUs: number }> = [];
let textureProbeScheduled = false;
function nextQualityProbe(): void {
  if (qualityWindow.length < 8 || !presentation) return;
  const p90 = (key: 'mainUs' | 'workerUs') => {
    const ordered = qualityWindow.map(sample => sample[key]).sort((a, b) => a - b);
    return ordered[7];
  };
  const mainP90Us = p90('mainUs'), workerP90Us = p90('workerUs');
  qualityWindow.length = 0;
  // This is measured transport telemetry only. Bend owns the tier decision.
  const measuredScale = canvas.width === 2048 && canvas.height === 1280 ||
    canvas.width === 1024 && canvas.height === 2048 ? 2 : 1;
  send({ $: 'QualityProbe', portrait: canvas.height > canvas.width,
    physicalEdge: capabilities.physicalEdge ?? 0,
    timingValid: Number.isSafeInteger(mainP90Us) && Number.isSafeInteger(workerP90Us),
    sampleCount: 8, measuredScale, mainP90Us, workerP90Us });
}
function publishProfile(): void {
  const samples = { bendCompute: bendCompute.count, workerPreparation: workerPreparation.count,
    workerReply: workerReply.count, hostPresentation: hostPresentation.count };
  const profile = makeBrowserProfile(capabilities, bendCompute.value, workerPreparation.value, workerReply.value,
    hostPresentation.value, samples, canvas.dataset.presentationMode === 'image-bitmap');
  canvas.dataset.browserProfile = JSON.stringify(profile);
  canvas.dispatchEvent(new CustomEvent(PROFILE_EVENT, { detail: profile }));
}
function scheduleTextureProbe(): void {
  if (textureProbeScheduled || capabilities.maxTextureEdge !== null) return;
  textureProbeScheduled = true;
  const probe = () => {
    const maxTextureEdge = queryMaxTextureEdge();
    capabilities = measureBrowserCapabilities(window, canvas, maxTextureEdge);
    publishProfile();
  };
  const idle = (window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
  if (idle) idle(probe, { timeout: 2500 });
  else window.setTimeout(probe, 1000);
}
function send(input: any, picker?: PreparedPickFile): void {
  if (!presentation) { if (picker) ports?.discardPickFile(picker); return; }
  if (picker) { queuedPickers.set(input, picker); activePickers.add(picker); }
  const mask = atlasMaskId(presentation);
  if (mask !== null) queuedAtlasMasks.add(mask);
  queue.enqueue(input, presentation);
  pump();
}
function pump(): void {
  if (busy) return;
  const batch = queue.takeBatch();
  if (!batch) return;
  busy = true;
  canvas.setAttribute('aria-busy', 'true');
  slow = window.setTimeout(() => { canvas.dataset.slow = 'true'; }, 150);
  const id = ++sequence;
  inflightAtlasMask = atlasMaskId(batch.presentation);
  // Conservatively retain all queued views until the queue drains, including
  // coalesced moves; retirement never depends on an inaccurate event count.
  if (!queue.length) queuedAtlasMasks.clear();
  const prepared = batch.events.flatMap(event => {
    const picker = queuedPickers.get(event);
    if (picker) queuedPickers.delete(event);
    return picker ? [picker] : [];
  });
  if (prepared.length) inflightPickers.set(id, prepared);
  requestStarted.set(id, performance.now());
  worker.postMessage({ kind: 'events', id, events: batch.events, presentation: batch.presentation });
  retireAtlasMasks();
}
// Scale the fixed-size pixel surface to the largest size that fits the window.
function fit(): void {
  const scale = Math.min(innerWidth / canvas.width, innerHeight / canvas.height);
  canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
  canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
}
function tick(after: number): void {
  clearTimeout(timer);
  if (!after) { clockActive = false; return; }
  if (!clockActive) { clockActive = true; lastClock = performance.now(); }
  timer = window.setTimeout(() => {
    const now = performance.now(), ms = Math.max(1, Math.round(now - lastClock)); lastClock = now;
    send({ $: 'Tick', ms });
  }, after);
}
function accessibility(items: any[]): void {
  const keep = new Set<string>();
  for (const control of items) {
    const id = String(control.id); keep.add(id);
    let button = controls.querySelector<HTMLButtonElement>(`[data-control="${id}"]`);
    if (!button) {
      button = document.createElement('button'); button.dataset.control = id;
      button.addEventListener('click', () => {
        ports?.unlock();
        const input = { $: 'Activate', id: control.id };
        // This control is Bend-presented and enabled. The browser must open its
        // gesture-gated chooser now, before an arbitrarily slow worker reply.
        const picker = control.id === 21 ? ports?.preparePickFile() : undefined;
        send(input, picker);
      });
      controls.append(button);
    }
    button.textContent = control.label; button.disabled = !control.enabled;
    button.setAttribute('aria-pressed', String(control.active));
    button.dataset.rect = JSON.stringify(control.bounds);
  }
  for (const button of controls.querySelectorAll<HTMLElement>('[data-control]')) if (!keep.has(button.dataset.control!)) button.remove();
}
function discardRefinement(message: any): void { message?.bitmap?.close(); }
function samePresentedView(candidate: any): boolean {
  const current = presentation as any;
  const next = candidate.presentation;
  return !!current && current.revision === next?.revision && current.menu === next.menu &&
    current.view?.yaw === next.view?.yaw && current.view?.pitch === next.view?.pitch &&
    current.view?.zoom === next.view?.zoom && presentedTheme === candidate.renderTheme &&
    // Menu choices and selection can change the hit plan without changing the
    // match revision or camera. Keep the refined pixels and active controls from
    // the same Bend presentation before replacing the canvas hit plan.
    JSON.stringify(presentedControls) === JSON.stringify(candidate.controls) &&
    canvas.getAttribute('aria-label') === candidate.summary &&
    candidate.width === canvas.width && candidate.height === canvas.height;
}
function presentRefinement(message: any): void {
  if (!samePresentedView(message)) {
    canvas.dataset.spriteDiscarded = String(Number(canvas.dataset.spriteDiscarded || 0) + 1);
    discardRefinement(message);
    retireAtlasMasks();
    return;
  }
  if (message.bitmap) {
    try { context.drawImage(message.bitmap, 0, 0, message.width, message.height); }
    finally { message.bitmap.close(); }
  } else if (message.image) {
    context.putImageData(new ImageData(new Uint8ClampedArray(message.image),
      message.width, message.height), 0, 0);
  } else {
    retireAtlasMasks();
    return;
  }
  presentation = { ...message.presentation, atlasPick: message.atlasPick === true, atlasMaskId: message.atlasMaskId, atlasMaskOffer: message.atlasMaskOffer };
  canvas.dataset.atlasPick = String(message.atlasPick === true);
  canvas.dataset.spriteRoundTripMs = String(message.spriteMetrics?.roundTripMs ?? '');
  retireAtlasMasks();
  canvas.dispatchEvent(new CustomEvent('rift-bend-sprite-refined',
    { bubbles: true, detail: message.spriteMetrics }));
}
worker.addEventListener('message', event => {
  const message = event.data;
  if (message.atlasPick === true) {
    if (!Number.isSafeInteger(message.atlasMaskId) || message.atlasMaskId < 1 ||
        !Number.isSafeInteger(message.atlasMaskOffer) || message.atlasMaskOffer < 1)
      throw new Error('Displayed atlas frame has no mask identity');
    receivedAtlasMasks.set(message.atlasMaskId,
      Math.max(receivedAtlasMasks.get(message.atlasMaskId) ?? 0, message.atlasMaskOffer));
    if (receivedAtlasMasks.size > 8) throw new Error('Atlas mask retention bound exceeded');
  }
  if (message.kind === 'ready') {
    ports = new Ports(message.keys, send, message.maxFileBytes);
    const id = ++sequence;
    requestStarted.set(id, performance.now());
    worker.postMessage({ kind: 'boot', id, saved: ports.read(0), prefs: ports.read(1), width: innerWidth, height: innerHeight });
    return;
  }
  // A late Bend-authored sprite image refines the already-presented position.
  // It never acknowledges or reorders an input request, changes controls, or
  // samples the automatic detail policy. Hold at most one refinement while an
  // input is in flight, then compare Bend's presented revision/view/theme.
  if (message.kind === 'refinement') {
    if (busy || queue.length) {
      discardRefinement(pendingRefinement);
      pendingRefinement = message;
      canvas.dataset.spriteDeferred = String(Number(canvas.dataset.spriteDeferred || 0) + 1);
    } else {
      presentRefinement(message);
    }
    retireAtlasMasks();
    return;
  }
  inflightAtlasMask = null;
  busy = false;
  clearTimeout(slow); delete canvas.dataset.slow;
  const started = requestStarted.get(message.id);
  if (started !== undefined) {
    workerReply.add(performance.now() - started);
    requestStarted.delete(message.id);
  }
  if (message.kind === 'fault') {
    for (const picker of activePickers) ports.discardPickFile(picker);
    ports.cancelPickFiles();
    activePickers.clear();
    inflightPickers.delete(message.id);
    retireAtlasMasks();
    status.textContent = `Bend runtime error: ${message.message}`; status.classList.remove('sr-only'); return;
  }
  bendCompute.add(message.renderMs);
  workerPreparation.add(message.portMs);
  if (message.image || message.bitmap) {
    const presentStart = performance.now();
    if (canvas.width !== message.width || canvas.height !== message.height) {
      qualityWindow.length = 0;
      canvas.width = message.width; canvas.height = message.height; fit();
    }
    capabilities = measureBrowserCapabilities(window, canvas, capabilities.maxTextureEdge);
    context.imageSmoothingEnabled = false;
    if (message.bitmap) {
      try { context.drawImage(message.bitmap, 0, 0, message.width, message.height); }
      finally { message.bitmap.close(); }
      canvas.dataset.presentationMode = 'image-bitmap';
    } else {
      context.putImageData(new ImageData(new Uint8ClampedArray(message.image), message.width, message.height), 0, 0);
      canvas.dataset.presentationMode = 'array-buffer';
    }
    hostPresentation.add(performance.now() - presentStart);
    if (message.id > 1 && Number.isFinite(message.portMs) && message.portMs >= 0) {
      const mainUs = Math.min(4_294_967_295, Math.round((performance.now() - presentStart) * 1000));
      const workerUs = Math.min(4_294_967_295, Math.round(message.portMs * 1000));
      qualityWindow.push({ mainUs, workerUs });
    }
    canvas.dataset.hostPresentationMs = String(hostPresentation.value);
    publishProfile();
    scheduleTextureProbe();
    presentation = { ...message.presentation, atlasPick: message.atlasPick === true, atlasMaskId: message.atlasMaskId, atlasMaskOffer: message.atlasMaskOffer };
    canvas.dataset.atlasPick = String(message.atlasPick === true);
    presentedControls = message.controls;
    presentedTheme = message.renderTheme;
    canvas.setAttribute('aria-label', message.summary);
    accessibility(message.controls);
    status.textContent = message.summary;
  }
  canvas.dataset.ready = 'true'; canvas.dataset.renderMs = String(message.renderMs);
  canvas.dataset.frame = String(message.id);
  const prepared = inflightPickers.get(message.id) ?? [];
  inflightPickers.delete(message.id);
  for (const effect of message.effects) {
    const picker = effect.$ === 'PickFile' ? prepared.shift() : undefined;
    if (picker) activePickers.delete(picker);
    void ports.execute(effect, picker);
  }
  for (const picker of prepared) { ports.discardPickFile(picker); activePickers.delete(picker); }
  tick(message.after);
  // Always show a completed frame, even while newer pointer input is queued.
  pump();
  canvas.setAttribute('aria-busy', String(busy || queue.length > 0));
  if (!busy && !queue.length && pendingRefinement) {
    const ready = pendingRefinement;
    pendingRefinement = null;
    presentRefinement(ready);
  }
  retireAtlasMasks();
  if (qualityWindow.length >= 8) queueMicrotask(nextQualityProbe);
});
worker.addEventListener('error', event => {
  for (const picker of activePickers) ports?.discardPickFile(picker);
  ports?.cancelPickFiles();
  activePickers.clear();
  status.textContent = `Bend runtime error: ${event.message}`; status.classList.remove('sr-only');
});
window.addEventListener('pagehide', () => {
  for (const picker of activePickers) ports?.discardPickFile(picker);
  ports?.cancelPickFiles();
  activePickers.clear();
});
function point(event: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: Math.max(0, Math.floor((event.clientX - rect.left) * canvas.width / rect.width)),
    y: Math.max(0, Math.floor((event.clientY - rect.top) * canvas.height / rect.height)) };
}
function importAt(x: number, y: number): boolean {
  // Same first-enabled-control and half-open bounds as Bend's ChromePlan.hit.
  const control = presentedControls.find(item => item.enabled && x >= item.bounds.x &&
    x < item.bounds.x + item.bounds.width && y >= item.bounds.y &&
    y < item.bounds.y + item.bounds.height);
  return control?.id === 21;
}
canvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary) return;
  canvas.focus(); ports?.unlock(); canvas.setPointerCapture(event.pointerId);
  const p = point(event);
  const input = { $: 'PointerDown', ...p, button: event.button, alt: event.altKey };
  const importing = event.button === 0 && !event.altKey && importAt(p.x, p.y);
  if (importing && event.pointerType !== 'mouse') {
    // Touch/pen activation is granted on pointerup, not pointerdown.
    touchImport = { pointerId: event.pointerId, input, presentation, layoutVersion };
    event.preventDefault();
    return;
  }
  const picker = importing ? ports?.preparePickFile() : undefined;
  send(input, picker); event.preventDefault();
});
canvas.addEventListener('pointermove', event => {
  if (event.isPrimary && touchImport?.pointerId !== event.pointerId)
    send({ $: 'PointerMove', ...point(event) });
});
canvas.addEventListener('pointerup', event => {
  if (touchImport?.pointerId === event.pointerId) {
    const held = touchImport;
    touchImport = null;
    retireAtlasMasks();
    const p = point(event);
    if (held.presentation !== presentation || held.layoutVersion !== layoutVersion ||
      !importAt(held.input.x, held.input.y) || !importAt(p.x, p.y)) {
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      return;
    }
    send(held.input, ports?.preparePickFile());
  }
  send({ $: 'PointerUp', ...point(event), button: event.button });
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener('pointercancel', event => {
  if (touchImport?.pointerId === event.pointerId) { touchImport = null; retireAtlasMasks(); return; }
  send({ $: 'PointerUp', ...point(event), button: event.button });
});
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('wheel', event => {
  if (document.activeElement !== canvas) return;
  send({ $: 'Wheel', ...point(event), delta: event.deltaY }); event.preventDefault();
}, { passive: false });
for (const [name, down] of [['keydown', true], ['keyup', false]] as const) canvas.addEventListener(name, event => {
  ports?.unlock(); send({ $: 'KeyInput', code: event.keyCode, down, alt: event.altKey, ctrl: event.ctrlKey || event.metaKey, shift: event.shiftKey });
  if ([13, 27, 32, 37, 38, 39, 40].includes(event.keyCode)) event.preventDefault();
});
window.addEventListener('resize', () => {
  // Invalidate a held touch Import as soon as layout changes, even if its
  // Resize event is still queued and the old presentation remains current.
  layoutVersion++;
  qualityWindow.length = 0;
  fit();
  capabilities = measureBrowserCapabilities(window, canvas, capabilities.maxTextureEdge);
  publishProfile();
  send({ $: 'Resize', width: innerWidth, height: innerHeight });
});
fit();
capabilities = measureBrowserCapabilities(window, canvas);
if ('serviceWorker' in navigator) void navigator.serviceWorker.register('./sw.js');
