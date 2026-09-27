// Rendered camera/side-wall composition diagnostic; images are review evidence,
// not subjective acceptance or an exact-pixel gate.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const url = process.env.BEND_TEST_URL || 'http://127.0.0.1:4185/';
const out = path.resolve(process.env.BEND_COMPOSITION_OUT ||
  '.artifacts/bend2/v2-preview/composition');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const receipt = { schema: 'rift-bend-v2-composition/1', url,
  at: new Date().toISOString(), captures: [], errors: [], ok: false };
page.on('pageerror', error => receipt.errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error') receipt.errors.push(message.text());
});
await page.addInitScript(() => {
  const Native = window.Worker;
  window.__compositionRefined = [];
  window.__compositionFault = null;
  window.addEventListener('rift-bend-sprite-refined', () =>
    window.__compositionRefined.push(`${window.__compositionShown?.view?.yaw}:` +
      `${window.__compositionShown?.view?.pitch}`));
  window.Worker = class extends Native {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        if (event.data.kind === 'fault') window.__compositionFault = event.data.message;
        if (event.data.kind === 'frame' && (event.data.image || event.data.bitmap))
          window.__compositionShown = event.data.presentation;
      });
    }
  };
});
async function ready(yaw, pitch) {
  await page.waitForFunction(key => window.__compositionFault ||
    (window.__compositionShown?.view?.yaw === key.yaw &&
     window.__compositionShown?.view?.pitch === key.pitch &&
     document.querySelector('canvas')?.dataset.ready === 'true' &&
     document.querySelector('canvas')?.getAttribute('aria-busy') === 'false' &&
     window.__compositionRefined.includes(`${key.yaw}:${key.pitch}`)),
  { yaw, pitch }, { timeout: 90000 });
  assert.equal(await page.evaluate(() => window.__compositionFault), null);
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
async function capture(label, yaw, pitch) {
  await ready(yaw, pitch);
  const file = path.join(out, `${label}.png`);
  await page.screenshot({ path: file });
  receipt.captures.push({ label, yaw, pitch, file: path.basename(file),
    sha256: crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex') });
}
try {
  const response = await page.request.get(new URL('build.json', url).href);
  assert.equal(response.status(), 200);
  const buildBytes = await response.body();
  const build = JSON.parse(buildBytes);
  if (process.env.BEND_EXPECTED_BUILD) assert.equal(build.version, process.env.BEND_EXPECTED_BUILD);
  receipt.buildVersion = build.version;
  receipt.sourceRevision = build.sourceRevision;
  receipt.sourceDirty = build.sourceDirty;
  receipt.buildSha256 = crypto.createHash('sha256').update(buildBytes).digest('hex');
  await page.goto(url, { waitUntil: 'networkidle' });
  await capture('default-345-67', 345, 67);
  await control(56); // View rail.
  await page.waitForFunction(() => window.__compositionShown?.menu === 11);
  await control(13); // Rotate left 15 degrees; keep the same pitch.
  await capture('diagonal-330-67', 330, 67);
  await control(11); // Front preset for comparison.
  await capture('front-0-65', 0, 65);
  if (process.env.BEND_MIGRATION_CHECK === '1') {
    await page.evaluate(() => {
      const key = 'rift-bend-lab/preferences-v1';
      const preferences = JSON.parse(localStorage.getItem(key) || '{}');
      preferences.view = { yaw: 345, pitch: 52, zoom: 115 };
      localStorage.setItem(key, JSON.stringify(preferences));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await capture('legacy-default-migrated', 345, 67);
  }
  assert.deepEqual(receipt.errors, []);
  receipt.ok = true;
} catch (error) {
  receipt.failure = String(error.stack || error);
} finally {
  receipt.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(out, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`,
    { flag: 'wx' });
  await browser.close();
}
console.log(JSON.stringify({ out, ...receipt }));
if (!receipt.ok) process.exitCode = 1;
