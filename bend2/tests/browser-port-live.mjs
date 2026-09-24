import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.env.BEND_TEST_URL || 'http://127.0.0.1:4184/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 1050 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__frames = [];
  window.__events = [];
  window.Worker = class extends NativeWorker {
    requests = new Map();
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        const message = event.data;
        if (message.kind !== 'frame') return;
        const request = this.requests.get(message.id);
        window.__frames.push({
          id: message.id,
          renderMs: message.renderMs,
          portMs: message.portMs,
          pixelMs: message.pixelMs,
          audioMs: message.audioMs,
          replyMs: request ? performance.now() - request.at : null,
          kinds: request?.kinds || [],
          bitmap: !!message.bitmap,
          imageBuffer: message.image instanceof ArrayBuffer,
          dirty: !!(message.bitmap || message.image),
        });
        if (request) this.requests.delete(message.id);
        if (message.bitmap || message.image) window.__shown = message.presentation;
      });
    }
    postMessage(message, ...transfer) {
      if (message.kind === 'events') {
        const events = message.events || [];
        window.__events.push(...events.map(event => ({ ...event })));
        this.requests.set(message.id, { at: performance.now(), kinds: events.map(event => event.$) });
      }
      super.postMessage(message, ...transfer);
    }
  };
});

function p90(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? +sorted[Math.ceil(sorted.length * 0.9) - 1].toFixed(2) : null;
}
async function ready() {
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.ready === 'true' &&
    document.querySelector('canvas')?.getAttribute('aria-busy') === 'false' && window.__shown, null, { timeout: 60000 });
}
async function canvasPoint(x, y) {
  const box = await page.locator('canvas').boundingBox();
  const { width, height } = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
  return { x: box.x + x * box.width / width, y: box.y + y * box.height / height };
}
async function squarePoint(file, rank, piece = false) {
  const shown = await page.evaluate(() => window.__shown);
  const view = shown.view, yaw = view.yaw * Math.PI / 180;
  const scale = 45 / (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw))) * view.zoom / 100;
  const u = file - 3.5, r = 3.5 - rank;
  const x = 256 + scale * (Math.cos(yaw) * u - Math.sin(yaw) * r);
  const y = (shown.mobile ? 64 : 128) + 274 + scale * Math.sin(view.pitch * Math.PI / 180) *
    (Math.sin(yaw) * u + Math.cos(yaw) * r) - (piece ? 8 : 0);
  return canvasPoint(x, y);
}

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await ready();
  const initial = await page.locator('canvas').evaluate(canvas => ({
    width: canvas.width, height: canvas.height, mode: canvas.dataset.presentationMode,
  }));
  assert.equal(initial.width, 1024);
  assert.equal(initial.height, 800);
  if (process.env.BEND_EXPECT_TRANSPORT) assert.equal(initial.mode, process.env.BEND_EXPECT_TRANSPORT);

  const knight = await squarePoint(6, 0, true);
  await page.mouse.click(knight.x, knight.y);
  await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Selected g1'));
  await page.mouse.click(knight.x, knight.y);
  await page.waitForFunction(() => !document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Selected g1'));

  const startEvent = await page.evaluate(() => window.__events.length);
  const orbit = await canvasPoint(265, 345);
  await page.mouse.move(orbit.x, orbit.y);
  await page.mouse.down({ button: 'right' });
  for (let step = 1; step <= 30; step++) await page.mouse.move(orbit.x + step * 3, orbit.y + step * 2);
  await page.mouse.up({ button: 'right' });
  await ready();
  const events = await page.evaluate(start => window.__events.slice(start), startEvent);
  const down = events.findIndex(event => event.$ === 'PointerDown' && event.button === 2);
  const up = events.findIndex((event, index) => index > down && event.$ === 'PointerUp' && event.button === 2);
  assert.ok(down >= 0 && up > down, 'camera drag preserves right-button Down before Up');
  assert.ok(events.slice(down + 1, up).some(event => event.$ === 'PointerMove'), 'camera drag retains movement between Down and Up');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('canvas')?.width === 512 &&
    document.querySelector('canvas')?.height === 1024 && document.querySelector('canvas')?.getAttribute('aria-busy') === 'false');
  const mobile = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height,
    bounds: canvas.getBoundingClientRect().toJSON(), mode: canvas.dataset.presentationMode,
    profile: canvas.dataset.browserProfile ? JSON.parse(canvas.dataset.browserProfile) : null }));
  assert.deepEqual([mobile.width, mobile.height], [512, 1024]);
  assert.ok(['image-bitmap', 'array-buffer'].includes(mobile.mode));
  assert.equal(mobile.profile?.schema, 'rift-bend-browser-profile/2');
  assert.equal(mobile.profile?.physicalEdge, Math.ceil(Math.max(mobile.bounds.width, mobile.bounds.height) * mobile.profile.devicePixelRatio));
  assert.equal(mobile.profile?.viewportPhysicalEdge, Math.ceil(844 * mobile.profile.devicePixelRatio));
  assert.equal(mobile.profile?.gpuMeasured, false);
  assert.equal(mobile.profile?.gpuP90Ms, null);
  assert.equal(mobile.profile?.memoryMib, null);
  assert.equal(mobile.profile?.cpu2048P90Ms, null);
  assert.equal(mobile.profile?.cpu4096P90Ms, null);
  assert.equal(mobile.profile?.imageBitmapActive, mobile.mode === 'image-bitmap');
  assert.deepEqual(errors, []);

  const frames = await page.evaluate(() => window.__frames);
  const dragFrames = frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty);
  console.log(JSON.stringify({ ok: true, url, browser: await browser.version(), initial, mobile,
    drag: { eventCount: events.length, pointerMoves: events.filter(event => event.$ === 'PointerMove').length,
      frames: dragFrames.length, renderP90Ms: p90(dragFrames.map(frame => frame.renderMs)),
      workerPreparationP90Ms: p90(dragFrames.map(frame => frame.portMs)), pixelP90Ms: p90(dragFrames.map(frame => frame.pixelMs)),
      audioP90Ms: p90(dragFrames.map(frame => frame.audioMs)), replyP90Ms: p90(dragFrames.map(frame => frame.replyMs)) },
    transport: { bitmapFrames: frames.filter(frame => frame.bitmap).length,
      rawBufferFrames: frames.filter(frame => frame.imageBuffer).length,
      presentationMs: await page.locator('canvas').getAttribute('data-host-presentation-ms') },
    checks: ['desktop frame', 'same-piece click deselects', 'right-drag preserves Down/Move/Up ordering',
      'mobile resize', 'profile does not infer GPU or memory measurements'], errors }));
} finally {
  await context.close();
  await browser.close();
}
