// Generic transport for a Bend pixel application. All visible UI comes from Bend.
import { Ports } from './ports';
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
let busy = true, sequence = 0, timer = 0, clockActive = false, lastClock = 0, slow = 0;
const queue = new PresentedInputQueue<any>();
let capabilities: BrowserCapabilities;
const requestStarted = new Map<number, number>();
const bendCompute = new RollingP90();
const workerPreparation = new RollingP90();
const workerReply = new RollingP90();
const hostPresentation = new RollingP90();
let textureProbeScheduled = false;
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
function send(input: any): void {
  if (!presentation) return;
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
  requestStarted.set(id, performance.now());
  worker.postMessage({ kind: 'events', id, events: batch.events, presentation: batch.presentation });
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
      button.addEventListener('click', () => { ports?.unlock(); send({ $: 'Activate', id: control.id }); });
      controls.append(button);
    }
    button.textContent = control.label; button.disabled = !control.enabled;
    button.setAttribute('aria-pressed', String(control.active));
    button.dataset.rect = JSON.stringify(control.bounds);
  }
  for (const button of controls.querySelectorAll<HTMLElement>('[data-control]')) if (!keep.has(button.dataset.control!)) button.remove();
}
worker.addEventListener('message', event => {
  const message = event.data;
  if (message.kind === 'ready') {
    ports = new Ports(message.keys, send, message.maxFileBytes);
    const id = ++sequence;
    requestStarted.set(id, performance.now());
    worker.postMessage({ kind: 'boot', id, saved: ports.read(0), prefs: ports.read(1), width: innerWidth, height: innerHeight });
    return;
  }
  busy = false;
  clearTimeout(slow); delete canvas.dataset.slow;
  const started = requestStarted.get(message.id);
  if (started !== undefined) {
    workerReply.add(performance.now() - started);
    requestStarted.delete(message.id);
  }
  if (message.kind === 'fault') { status.textContent = `Bend runtime error: ${message.message}`; status.classList.remove('sr-only'); return; }
  bendCompute.add(message.renderMs);
  workerPreparation.add(message.portMs);
  if (message.image || message.bitmap) {
    const presentStart = performance.now();
    if (canvas.width !== message.width || canvas.height !== message.height) {
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
    canvas.dataset.hostPresentationMs = String(hostPresentation.value);
    publishProfile();
    scheduleTextureProbe();
    presentation = message.presentation;
    canvas.setAttribute('aria-label', message.summary);
    accessibility(message.controls);
    status.textContent = message.summary;
  }
  canvas.dataset.ready = 'true'; canvas.dataset.renderMs = String(message.renderMs);
  canvas.dataset.frame = String(message.id);
  for (const effect of message.effects) void ports.execute(effect);
  tick(message.after);
  // Always show a completed frame, even while newer pointer input is queued.
  pump();
  canvas.setAttribute('aria-busy', String(busy || queue.length > 0));
});
worker.addEventListener('error', event => { status.textContent = `Bend runtime error: ${event.message}`; status.classList.remove('sr-only'); });
function point(event: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: Math.max(0, Math.floor((event.clientX - rect.left) * canvas.width / rect.width)),
    y: Math.max(0, Math.floor((event.clientY - rect.top) * canvas.height / rect.height)) };
}
canvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary) return;
  canvas.focus(); ports?.unlock(); canvas.setPointerCapture(event.pointerId);
  send({ $: 'PointerDown', ...point(event), button: event.button, alt: event.altKey }); event.preventDefault();
});
canvas.addEventListener('pointermove', event => { if (event.isPrimary) send({ $: 'PointerMove', ...point(event) }); });
canvas.addEventListener('pointerup', event => {
  send({ $: 'PointerUp', ...point(event), button: event.button });
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener('pointercancel', event => send({ $: 'PointerUp', ...point(event), button: event.button }));
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
  fit();
  capabilities = measureBrowserCapabilities(window, canvas, capabilities.maxTextureEdge);
  publishProfile();
  send({ $: 'Resize', width: innerWidth, height: innerHeight });
});
fit();
capabilities = measureBrowserCapabilities(window, canvas);
if ('serviceWorker' in navigator) void navigator.serviceWorker.register('./sw.js');
