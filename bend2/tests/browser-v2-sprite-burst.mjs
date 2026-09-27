// Real browser burst: exercise the same camera rail and Bend sprite helper as
// play, then report latency and the final refined frame without a time gate.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const url = process.env.BEND_TEST_URL || 'http://127.0.0.1:4185/';
const out = process.env.BEND_BURST_OUT || '.artifacts/bend2/v2-preview/sprite-burst';
const clicks = Number(process.env.BEND_BURST_CLICKS || 6);
assert.ok(Number.isSafeInteger(clicks) && clicks >= 1 && clicks <= 6);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.addInitScript(() => {
  const Native = window.Worker;
  window.__frames = [];
  window.__refinements = [];
  window.addEventListener('rift-bend-sprite-refined', event =>
    window.__refinements.push({ at: performance.now(), metrics: event.detail,
      view: window.__shown?.view }));
  window.Worker = class extends Native {
    requests = new Map();
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        const frame = event.data;
        if (frame.kind === 'fault') window.__fault = frame.message;
        if (frame.kind !== 'frame') return;
        const request = this.requests.get(frame.id);
        window.__frames.push({ at: performance.now(), id: frame.id,
          after: frame.after, pixelMs: frame.pixelMs, renderMs: frame.renderMs,
          portMs: frame.portMs, view: frame.presentation?.view,
          kinds: request?.kinds || [], dirty: !!(frame.image || frame.bitmap),
          pixelStats: frame.pixelStats });
        this.requests.delete(frame.id);
        if (frame.image || frame.bitmap) window.__shown = frame.presentation;
      });
    }
    postMessage(message, ...transfer) {
      if (message.kind === 'events') this.requests.set(message.id,
        { kinds: (message.events || []).map(event => event.$) });
      super.postMessage(message, ...transfer);
    }
  };
});

async function ready() {
  await page.waitForFunction(() => window.__fault ||
    (document.querySelector('canvas')?.dataset.ready === 'true' &&
      document.querySelector('canvas')?.getAttribute('aria-busy') === 'false' && window.__shown),
  null, { timeout: 90000 });
  const fault = await page.evaluate(() => window.__fault);
  if (fault) throw new Error(fault);
}
async function control(id) {
  const button = page.locator(`[data-control="${id}"]`);
  assert.equal(await button.count(), 1);
  const rect = JSON.parse(await button.getAttribute('data-rect'));
  const point = await page.locator('canvas').evaluate((canvas, rect) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: bounds.x + (rect.x + rect.width / 2) * bounds.width / canvas.width,
      y: bounds.y + (rect.y + rect.height / 2) * bounds.height / canvas.height };
  }, rect);
  await page.mouse.click(point.x, point.y);
}
async function canvasPoint(x, y) {
  return page.locator('canvas').evaluate((canvas, { x, y }) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: bounds.x + x * bounds.width / canvas.width,
      y: bounds.y + y * bounds.height / canvas.height };
  }, { x, y });
}

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await ready();
  await page.waitForFunction(() => window.__refinements.length > 0, null, { timeout: 90000 });
  await control(56);
  await page.waitForFunction(() => window.__shown?.menu === 11, null, { timeout: 30000 });
  await ready();
  const initial = await page.evaluate(() => window.__shown.view);
  const before = await page.evaluate(() => ({ at: performance.now(), frames: window.__frames.length,
    refinements: window.__refinements.length }));
  for (let i = 0; i < clicks; i++) await control(14);
  const sentAt = await page.evaluate(() => performance.now());
  const expectedYaw = (initial.yaw + clicks * 15) % 360;
  await page.waitForFunction(yaw => window.__shown?.view?.yaw === yaw &&
    document.querySelector('canvas')?.getAttribute('aria-busy') === 'false',
  expectedYaw, { timeout: 90000 });
  await page.waitForFunction(({ yaw, before }) => window.__shown?.view?.yaw === yaw &&
    window.__refinements.length > before &&
    Number(document.querySelector('canvas')?.dataset.spriteRoundTripMs) > 0,
  { yaw: expectedYaw, before: before.refinements }, { timeout: 90000 });
  await ready();
  const result = await page.evaluate(({ before, sentAt }) => ({
    view: window.__shown.view, menu: window.__shown.menu,
    frames: window.__frames.slice(before.frames),
    refinements: window.__refinements.slice(before.refinements),
    lastInputToRefineMs: window.__refinements.at(-1).at - sentAt,
    elapsedMs: performance.now() - before.at,
    summary: document.querySelector('canvas')?.getAttribute('aria-label'),
  }), { before, sentAt });
  assert.equal(result.view.yaw, expectedYaw);
  assert.equal(result.menu, 11);
  assert.match(result.summary, /White to move/);
  // Camera buttons above are settled updates. A real right-button drag is
  // required to exercise the distinct compact motion branch before release.
  const orbitStart = await page.evaluate(() => ({ frames: window.__frames.length,
    refinements: window.__refinements.length }));
  const center = await canvasPoint(512, 320);
  await page.mouse.move(center.x, center.y);
  await page.mouse.down({ button: 'right' });
  for (let i = 1; i <= 16; i++) {
    await page.mouse.move(center.x + i * 3, center.y + i * 2);
    await page.waitForTimeout(20);
  }
  await page.waitForFunction(start => window.__frames.slice(start).some(frame =>
    frame.kinds.includes('PointerMove') && frame.dirty &&
      frame.pixelStats?.visited > 50000),
  orbitStart.frames, { timeout: 30000 });
  const motion = await page.evaluate(start => window.__frames.slice(start)
    .filter(frame => frame.kinds.includes('PointerMove') && frame.dirty &&
      frame.pixelStats?.visited > 50000),
  orbitStart.frames);
  assert.ok(motion.length > 0);
  if (process.env.BEND_EXPECT_COMPACT_MOTION === '1')
    assert.ok(motion.every(frame => frame.pixelStats.visited < 230000),
      `motion frame escaped compact path: ${JSON.stringify(motion)}`);
  await page.screenshot({ path: `${out}/motion.png` });
  await page.mouse.up({ button: 'right' });
  await page.waitForFunction(start => window.__refinements.length > start,
    orbitStart.refinements, { timeout: 90000 });
  await ready();
  assert.deepEqual(errors, []);
  await page.screenshot({ path: `${out}/final.png` });
  const build = await page.evaluate(async () => (await (await fetch('./build.json')).json()));
  const receipt = { ok: true, url, buildVersion: build.version,
    sourceRevision: build.sourceRevision, sourceDirty: build.sourceDirty,
    draft: build.draft, clicks, initial, expectedYaw, ...result, motion, errors };
  await writeFile(`${out}/receipt.json`, JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt));
} finally {
  await browser.close();
}
