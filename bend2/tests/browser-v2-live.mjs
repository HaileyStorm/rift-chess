import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const url = process.env.BEND_TEST_URL || 'http://127.0.0.1:4185/';
const artifact = '.artifacts/bend2/v2-preview';
await mkdir(artifact, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__frames = [];
  window.__events = [];
  window.__refinements = [];
  window.addEventListener('rift-bend-sprite-refined', event =>
    window.__refinements.push({ at: performance.now(), metrics: event.detail }));
  window.Worker = class extends NativeWorker {
    requests = new Map();
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        const message = event.data;
        if (message.kind !== 'frame') return;
        const request = this.requests.get(message.id);
        window.__frames.push({ id: message.id, renderMs: message.renderMs,
          portMs: message.portMs, pixelMs: message.pixelMs,
          replyMs: request ? performance.now() - request.at : null,
          kinds: request?.kinds || [], dirty: !!message.image, pixelStats: message.pixelStats,
          treeMs: message.treeMs, traversalMs: message.traversalMs, sceneTimes: message.sceneTimes });
        if (request) this.requests.delete(message.id);
        if (message.image) window.__shown = message.presentation;
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
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? +sorted[Math.ceil(sorted.length * 0.9) - 1].toFixed(2) : null;
}
async function settled() {
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.ready === 'true' &&
    document.querySelector('canvas')?.getAttribute('aria-busy') === 'false' && window.__shown,
    null, { timeout: 60000 });
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
  const y = 274 + scale * Math.sin(view.pitch * Math.PI / 180) *
    (Math.sin(yaw) * u + Math.cos(yaw) * r) - (piece ? 8 : 0);
  return canvasPoint(shown.plan.board.x + x * shown.plan.scale,
    shown.plan.board.y + y * shown.plan.scale);
}
try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await settled();
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.spriteRoundTripMs,
    null, { timeout: 30000 });
  const initial = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width,
    height: canvas.height, mode: canvas.dataset.presentationMode,
    summary: canvas.getAttribute('aria-label') }));
  assert.deepEqual([initial.width, initial.height], [1024, 640]);
  await page.screenshot({ path: `${artifact}/browser-v2-desktop.png` });

  const knight = await squarePoint(6, 0, true);
  await page.mouse.click(knight.x, knight.y);
  try {
    await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Knight g1'),
      null, { timeout: 8000 });
  } catch (error) {
    console.log(JSON.stringify({ knight, shown: await page.evaluate(() => {
      const { view, menu, plan } = window.__shown; return { view, menu, plan: { board: plan.board, scale: plan.scale } };
    }),
      summary: await page.locator('canvas').getAttribute('aria-label'),
      status: await page.locator('[role=status]').textContent(),
      events: await page.evaluate(() => window.__events.slice(-4)), errors },
      (_key, value) => typeof value === 'bigint' ? String(value) : value));
    throw error;
  }
  await settled();
  await page.screenshot({ path: `${artifact}/browser-v2-selected.png` });
  await page.mouse.click(knight.x, knight.y);
  await page.waitForFunction(() => !document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Knight g1'));

  const pawn = await squarePoint(4, 1, true);
  await page.mouse.click(pawn.x, pawn.y);
  await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Pawn e2'));
  const destination = await squarePoint(4, 3);
  await page.mouse.click(destination.x, destination.y);
  await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Black to move'),
    null, { timeout: 20000 });
  await page.waitForTimeout(1100);
  await settled();
  await page.screenshot({ path: `${artifact}/browser-v2-after-e4.png` });

  const startEvent = await page.evaluate(() => window.__events.length);
  const refinementBeforeOrbit = await page.evaluate(() => window.__refinements.length);
  const orbit = await squarePoint(4, 3);
  await page.mouse.move(orbit.x, orbit.y);
  await page.mouse.down({ button: 'right' });
  for (let step = 1; step <= 16; step++) await page.mouse.move(orbit.x + step * 3, orbit.y + step * 2);
  await settled();
  await page.screenshot({ path: `${artifact}/browser-v2-orbit-motion.png` });
  await page.mouse.up({ button: 'right' });
  await settled();
  try {
    await page.waitForFunction(before => window.__refinements.length > before,
      refinementBeforeOrbit, { timeout: 30000 });
  } catch (error) {
    console.log(JSON.stringify(await page.evaluate(() => ({
      refinements: window.__refinements, lastFrames: window.__frames.slice(-8),
      lastEvents: window.__events.slice(-8), status: document.querySelector('[role=status]')?.textContent,
      spriteMs: document.querySelector('canvas')?.dataset.spriteRoundTripMs,
      busy: document.querySelector('canvas')?.getAttribute('aria-busy'),
    })), null, 2));
    throw error;
  }
  const events = await page.evaluate(start => window.__events.slice(start), startEvent);
  const down = events.findIndex(event => event.$ === 'PointerDown' && event.button === 2);
  const up = events.findIndex((event, index) => index > down && event.$ === 'PointerUp' && event.button === 2);
  assert.ok(down >= 0 && up > down);
  assert.ok(events.slice(down + 1, up).some(event => event.$ === 'PointerMove'));
  await page.screenshot({ path: `${artifact}/browser-v2-orbit.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('canvas')?.width === 512 &&
    document.querySelector('canvas')?.height === 1024 && document.querySelector('canvas')?.getAttribute('aria-busy') === 'false');
  await page.screenshot({ path: `${artifact}/browser-v2-mobile.png` });
  const mobileKnight = await squarePoint(6, 7, true);
  await page.mouse.click(mobileKnight.x, mobileKnight.y);
  await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Knight g8'));
  await page.mouse.click(mobileKnight.x, mobileKnight.y);
  await page.waitForFunction(() => !document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Knight g8'));
  const pref = await canvasPoint(284, 26);
  await page.mouse.click(pref.x, pref.y);
  await page.waitForFunction(() => window.__shown?.menu !== 0, null, { timeout: 8000 });
  await page.screenshot({ path: `${artifact}/browser-v2-mobile-settings.png` });
  const mobile = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width,
    height: canvas.height, mode: canvas.dataset.presentationMode,
    profile: canvas.dataset.browserProfile ? JSON.parse(canvas.dataset.browserProfile) : null }));
  assert.deepEqual([mobile.width, mobile.height], [512, 1024]);
  mobile.menu = await page.evaluate(() => window.__shown.menu);
  assert.ok((await page.locator('#accessibility button').allTextContents()).includes('CLOSE'));
  assert.deepEqual(errors, []);
  const qualityProbes = await page.evaluate(() => window.__events.filter(event => event.$ === 'QualityProbe'));
  assert.ok(qualityProbes.length >= 1, 'host reports a real eight-frame timing window to Bend');
  assert.ok(qualityProbes.every(event => event.sampleCount === 8 && event.measuredScale === 1));
  const frames = await page.evaluate(() => window.__frames);
  const refinements = await page.evaluate(() => window.__refinements);
  console.log(JSON.stringify({ ok: true, url, initial, mobile,
    refinements,
    qualityProbes: qualityProbes.map(({ physicalEdge, sampleCount, measuredScale,
      mainP90Us, workerP90Us }) => ({ physicalEdge, sampleCount, measuredScale,
      mainP90Us, workerP90Us })),
    drag: { events: events.length, renderedFrames: frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty).length,
      renderP90Ms: p90(frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty).map(frame => frame.renderMs)),
      portP90Ms: p90(frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty).map(frame => frame.portMs)),
      pixelP90Ms: p90(frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty).map(frame => frame.pixelMs)),
      replyP90Ms: p90(frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty).map(frame => frame.replyMs)),
      samples: frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty).map(frame => ({
        pixelMs: +frame.pixelMs.toFixed(2), treeMs: +frame.treeMs.toFixed(2),
        traversalMs: +frame.traversalMs.toFixed(2), sceneTimes: frame.sceneTimes,
        ...frame.pixelStats })) },
    errors }, (_key, value) => typeof value === 'bigint' ? String(value) : value));
} finally {
  await context.close();
  await browser.close();
}
