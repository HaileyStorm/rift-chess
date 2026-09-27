// Rendered inspection of exposed tile and rift walls at four cardinal yaws.
// This is a visual diagnostic, not an exact-pixel or latency acceptance gate.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const url = process.env.BEND_TEST_URL || 'http://127.0.0.1:4185/';
const out = path.resolve(process.env.BEND_ANGLES_OUT || '.artifacts/bend2/v2-preview/board-angles');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const receipt = { schema: 'rift-bend-v2-board-angles/1', url, at: new Date().toISOString(),
  captures: [], errors: [], ok: false };
page.on('pageerror', error => receipt.errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
await page.addInitScript(() => {
  const Native = window.Worker;
  window.__refinedViews = [];
  window.__shown = null;
  window.__fault = null;
  window.addEventListener('rift-bend-sprite-refined', () =>
    window.__refinedViews.push(window.__shown?.view?.yaw));
  window.Worker = class extends Native {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        if (event.data.kind === 'fault') window.__fault = event.data.message;
        if (event.data.kind === 'frame' && (event.data.image || event.data.bitmap))
          window.__shown = event.data.presentation;
      });
    }
  };
});
async function ready(yaw) {
  await page.waitForFunction(yaw => window.__fault ||
    (window.__shown?.view?.yaw === yaw &&
     document.querySelector('canvas')?.dataset.ready === 'true' &&
     document.querySelector('canvas')?.getAttribute('aria-busy') === 'false' &&
     window.__refinedViews.includes(yaw)), yaw, { timeout: 90000 });
  assert.equal(await page.evaluate(() => window.__fault), null);
}
async function control(id) {
  const button = page.locator(`[data-control="${id}"]`);
  assert.equal(await button.count(), 1);
  const rect = JSON.parse(await button.getAttribute('data-rect'));
  const point = await page.locator('canvas').evaluate((canvas, r) => {
    const bounds = canvas.getBoundingClientRect();
    return { x: bounds.x + (r.x + r.width / 2) * bounds.width / canvas.width,
      y: bounds.y + (r.y + r.height / 2) * bounds.height / canvas.height };
  }, rect);
  await page.mouse.click(point.x, point.y);
}
try {
  const served = await page.request.get(new URL('build.json', url).href);
  assert.equal(served.status(), 200);
  const buildBytes = await served.body();
  const build = JSON.parse(buildBytes);
  if (process.env.BEND_EXPECTED_BUILD) assert.equal(build.version, process.env.BEND_EXPECTED_BUILD);
  receipt.buildVersion = build.version;
  receipt.sourceRevision = build.sourceRevision;
  receipt.buildSha256 = crypto.createHash('sha256').update(buildBytes).digest('hex');
  await page.goto(url, { waitUntil: 'networkidle' });
  await ready(345);
  await control(56); // View rail
  await page.waitForFunction(() => window.__shown?.menu === 11, null, { timeout: 30000 });
  let clicks = 0;
  for (const [target, count] of [[0, 1], [90, 7], [180, 13], [270, 19]]) {
    while (clicks < count) {
      await control(14); // rotate right 15 degrees
      clicks++;
    }
    await ready(target);
    const file = path.join(out, `yaw-${target}.png`);
    await page.screenshot({ path: file });
    receipt.captures.push({ yaw: target, file: path.basename(file),
      sha256: crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex') });
  }
  assert.deepEqual(receipt.errors, []);
  receipt.ok = true;
} catch (error) {
  receipt.failure = String(error.stack || error);
} finally {
  receipt.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(out, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
  await browser.close();
}
console.log(JSON.stringify({ out, ...receipt }));
if (!receipt.ok) process.exitCode = 1;
