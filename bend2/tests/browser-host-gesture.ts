import assert from 'node:assert/strict';

type Listener = (event: any) => void;

class FakeTarget {
  private readonly listeners = new Map<string, Listener[]>();
  addEventListener(type: string, listener: Listener): void {
    const entries = this.listeners.get(type) ?? [];
    entries.push(listener);
    this.listeners.set(type, entries);
  }
  fire(type: string, event: any = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

class FakeButton extends FakeTarget {
  dataset: Record<string, string> = {};
  textContent = '';
  disabled = false;
  attributes = new Map<string, string>();
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  remove(): void {}
}

class FakeControls extends FakeTarget {
  readonly buttons: FakeButton[] = [];
  querySelector(selector: string): FakeButton | null {
    const id = selector.match(/data-control="([^"]+)"/)?.[1];
    return this.buttons.find(button => button.dataset.control === id) ?? null;
  }
  querySelectorAll(): FakeButton[] { return this.buttons; }
  append(button: FakeButton): void { this.buttons.push(button); }
}

class FakeInput extends FakeTarget {
  type = '';
  files: File[] | null = null;
  click(): void { pickerClicks++; }
}

class FakeCanvas extends FakeTarget {
  width = 1024;
  height = 640;
  style = { width: '', height: '' };
  dataset: Record<string, string> = {};
  attributes = new Map<string, string>();
  captured = new Set<number>();
  readonly context = { imageSmoothingEnabled: false, putImageData() {}, drawImage() {} };
  getContext(): typeof this.context { return this.context; }
  getBoundingClientRect(): DOMRect {
    const width = Number.parseFloat(this.style.width) || this.width;
    const height = Number.parseFloat(this.style.height) || this.height;
    return { x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height,
      toJSON: () => ({ x: 0, y: 0, width, height }) } as DOMRect;
  }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  focus(): void {}
  setPointerCapture(pointerId: number): void { this.captured.add(pointerId); }
  hasPointerCapture(pointerId: number): boolean { return this.captured.has(pointerId); }
  releasePointerCapture(pointerId: number): void { this.captured.delete(pointerId); }
  dispatchEvent(event: Event): boolean { return true; }
}

class FakeWorker extends FakeTarget {
  static current!: FakeWorker;
  readonly messages: any[] = [];
  constructor(_url: URL, _options: WorkerOptions) { super(); FakeWorker.current = this; }
  postMessage(message: any): void { this.messages.push(message); }
  reply(data: any): void { this.fire('message', { data }); }
}

let pickerClicks = 0;
const canvas = new FakeCanvas();
const status = { textContent: '', classList: { remove() {} } };
const controls = new FakeControls();
const storage = new Map<string, string>();
const fakeWindow = Object.assign(new FakeTarget(), {
  innerWidth: 1024,
  innerHeight: 640,
  devicePixelRatio: 1,
  setTimeout: () => 1,
});
const fakeDocument = {
  activeElement: canvas,
  querySelector(selector: string) {
    if (selector === 'canvas') return canvas;
    if (selector === '[role="status"]') return status;
    if (selector === '#accessibility') return controls;
    return null;
  },
  createElement(tag: string) {
    if (tag === 'input') return new FakeInput();
    if (tag === 'button') return new FakeButton();
    throw new Error(`Unexpected element: ${tag}`);
  },
};
Object.defineProperties(globalThis, {
  document: { configurable: true, value: fakeDocument },
  window: { configurable: true, value: fakeWindow },
  Worker: { configurable: true, value: FakeWorker },
  AudioContext: { configurable: true, value: class { state = 'running'; resume() {} } },
  ImageData: { configurable: true, value: class { constructor(_pixels: Uint8ClampedArray, _width: number, _height: number) {} } },
  CustomEvent: { configurable: true, value: class { constructor(readonly type: string, readonly init?: unknown) {} } },
  localStorage: { configurable: true, value: {
    getItem(key: string) { return storage.get(key) ?? null; },
    setItem(key: string, value: string) { storage.set(key, value); },
  } },
  navigator: { configurable: true, value: { serviceWorker: { register() { return Promise.resolve(); } } } },
  innerWidth: { configurable: true, get: () => fakeWindow.innerWidth },
  innerHeight: { configurable: true, get: () => fakeWindow.innerHeight },
  __BEND_WORKER__: { configurable: true, value: './worker.js' },
});

await import('../platform/browser/host.ts');
const worker = FakeWorker.current;
const firstPresentation = { revision: 0, menu: 0, view: { yaw: 0, pitch: 0, zoom: 100 } };
const resizedPresentation = { revision: 1, menu: 0, view: { yaw: 0, pitch: 0, zoom: 100 } };
const laterPresentation = { revision: 2, menu: 0, view: { yaw: 0, pitch: 0, zoom: 100 } };
const importBounds = { x: 100, y: 100, width: 80, height: 40 };
const resizedBounds = { x: 180, y: 220, width: 64, height: 48 };
const controlsFor = (bounds: typeof importBounds) => [
  { id: 21, label: 'Import', enabled: true, active: false, bounds },
];
worker.reply({ kind: 'ready', keys: ['save', 'prefs'], maxFileBytes: 2048 });
const bootRequest = worker.messages.find(message => message.kind === 'boot');
assert.ok(bootRequest, 'host starts the Bend worker');
worker.reply(frame(bootRequest.id, firstPresentation, controlsFor(importBounds), 1024, 640));

function frame(id: number, presentation: unknown, presented: any[], width: number, height: number, effects: any[] = []): any {
  return { kind: 'frame', id, presentation, controls: presented, width, height, image: new Uint8Array(4),
    summary: 'test frame', renderMs: 0, portMs: 0, after: 0, effects, renderTheme: 0 };
}
function eventRequests(): any[] { return worker.messages.filter(message => message.kind === 'events'); }
function eventKinds(): string[] { return eventRequests().flatMap(request => request.events.map((event: any) => event.$)); }
function center(bounds: typeof importBounds): { x: number; y: number } {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}
function clientPoint(point: { x: number; y: number }): { clientX: number; clientY: number } {
  const rect = canvas.getBoundingClientRect();
  return { clientX: rect.left + point.x * rect.width / canvas.width,
    clientY: rect.top + point.y * rect.height / canvas.height };
}
function pointer(pointerId: number, pointerType: string, point: { x: number; y: number }): any {
  return { pointerId, pointerType, isPrimary: true, button: 0, altKey: false,
    ...clientPoint(point), preventDefault() {} };
}
function respond(request: any, presentation: unknown, presented: any[], width = canvas.width, height = canvas.height, effects: any[] = []): void {
  worker.reply(frame(request.id, presentation, presented, width, height, effects));
}
function resize(width: number, height: number): void {
  fakeWindow.innerWidth = width;
  fakeWindow.innerHeight = height;
  fakeWindow.fire('resize');
}

// A resize immediately replans layout, but its Bend frame can still be in flight
// when the finger lifts. That lift must not open a chooser or send a lone PointerUp.
const oldCenter = center(importBounds);
canvas.fire('pointerdown', pointer(1, 'touch', oldCenter));
assert.equal(pickerClicks, 0, 'touch Import waits for pointerup');
resize(500, 900);
const resizeRequest = eventRequests().at(-1)!;
assert.deepEqual(resizeRequest.events.map((event: any) => event.$), ['Resize']);
canvas.fire('pointerup', pointer(1, 'touch', oldCenter));
assert.equal(pickerClicks, 0, 'a resize-invalidated touch does not open the chooser');
assert.deepEqual(eventKinds(), ['Resize'], 'an invalidated touch sends neither stale PointerDown nor unpaired PointerUp');
respond(resizeRequest, resizedPresentation, controlsFor(resizedBounds), 512, 1024);

// A completed presentation change also invalidates the held origin, even where
// Import remains at the same coordinates in the newly presented controls.
const resizedCenter = center(resizedBounds);
canvas.fire('pointerdown', pointer(2, 'touch', resizedCenter));
canvas.fire('keydown', { keyCode: 37, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, preventDefault() {} });
const keyRequest = eventRequests().at(-1)!;
assert.deepEqual(keyRequest.events.map((event: any) => event.$), ['KeyInput']);
respond(keyRequest, laterPresentation, controlsFor(resizedBounds));
canvas.fire('pointerup', pointer(2, 'touch', resizedCenter));
assert.equal(pickerClicks, 0, 'a changed Bend presentation does not validate an old touch down');
assert.deepEqual(eventKinds(), ['Resize', 'KeyInput'], 'a stale presentation sends no PointerUp');

// Releasing outside Import remains a cancellation, not a chooser activation.
const outside = { x: resizedCenter.x + 200, y: resizedCenter.y + 100 };
canvas.fire('pointerdown', pointer(3, 'touch', resizedCenter));
canvas.fire('pointerup', pointer(3, 'touch', outside));
assert.equal(pickerClicks, 0, 'leaving Import cancels the touch activation');
assert.deepEqual(eventKinds(), ['Resize', 'KeyInput'], 'a canceled Import gesture sends no unpaired events');

// Normal touch still opens the chooser and delivers a balanced pointer pair.
canvas.fire('pointerdown', pointer(4, 'touch', resizedCenter));
canvas.fire('pointerup', pointer(4, 'touch', resizedCenter));
assert.equal(pickerClicks, 1, 'a valid touch Import opens the chooser on release');
let request = eventRequests().at(-1)!;
assert.deepEqual(request.events.map((event: any) => event.$), ['PointerDown']);
respond(request, { ...laterPresentation, revision: 3 }, controlsFor(resizedBounds), canvas.width, canvas.height, [{ $: 'PickFile' }]);
request = eventRequests().at(-1)!;
assert.deepEqual(request.events.map((event: any) => event.$), ['PointerUp']);
respond(request, { ...laterPresentation, revision: 4 }, controlsFor(resizedBounds));

// Mouse and accessible-button activation retain their immediate chooser paths.
// The browser turns Enter/Space activation of the focused native button into click.
canvas.fire('pointerdown', pointer(5, 'mouse', resizedCenter));
assert.equal(pickerClicks, 2, 'mouse Import opens immediately on pointerdown');
canvas.fire('pointerup', pointer(5, 'mouse', resizedCenter));
request = eventRequests().at(-1)!;
respond(request, { ...laterPresentation, revision: 5 }, controlsFor(resizedBounds), canvas.width, canvas.height, [{ $: 'PickFile' }]);
request = eventRequests().at(-1)!;
assert.deepEqual(request.events.map((event: any) => event.$), ['PointerUp']);
respond(request, { ...laterPresentation, revision: 6 }, controlsFor(resizedBounds));

controls.buttons[0].fire('click');
assert.equal(pickerClicks, 3, 'accessible-button clicks retain the keyboard Import path');
request = eventRequests().at(-1)!;
assert.deepEqual(request.events, [{ $: 'Activate', id: 21 }]);
respond(request, { ...laterPresentation, revision: 7 }, controlsFor(resizedBounds), canvas.width, canvas.height, [{ $: 'PickFile' }]);

console.log(JSON.stringify({ ok: true, checks: [
  'resize while touch Import is held suppresses chooser and unpaired PointerUp',
  'completed presentation change invalidates a held touch origin',
  'release outside Import cancels', 'normal touch, mouse, and accessible-button Import paths',
] }));
