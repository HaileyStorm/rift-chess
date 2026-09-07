/** Genuine tab zoom via the Chromium extension API in a disposable, task-owned profile.
 * https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom
 * https://playwright.dev/docs/chrome-extensions
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
assert.equal(new URL(base).hostname, '127.0.0.1', 'Zoom helper is restricted to the task-local application');
const root = path.resolve('.artifacts/overhaul', process.env.RIFT_TEST_RUN || `browser-zoom-${Date.now()}`);
await fs.mkdir(root, { recursive: false });
const extension = path.join(root, 'zoom-extension'); await fs.mkdir(extension);
await fs.writeFile(path.join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'Rift local zoom inspection', version: '1.0', host_permissions: ['http://127.0.0.1/*'], background: { service_worker: 'worker.js' } }));
await fs.writeFile(path.join(extension, 'worker.js'), 'chrome.runtime.onInstalled.addListener(() => {});');
const executablePath = process.env.RIFT_CHROMIUM_PATH || path.resolve('.artifacts/browser-runtime/chromium-1243/chrome-win64/chrome.exe');
const receipt = { started: new Date().toISOString(), method: 'chrome.tabs.setZoom/getZoom, actual Chromium tab zoom; no CSS zoom or DPR substitution', captures: [], errors: [] };
const context = await chromium.launchPersistentContext(path.join(root, 'profile'), { executablePath, channel: 'chromium', headless: true, viewport: { width: 1600, height: 1000 }, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--enable-gpu', '--use-angle=d3d11'] });
const page = context.pages()[0] || await context.newPage(); const driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
const layout = () => page.evaluate(() => ({ innerWidth, innerHeight, devicePixelRatio, scrollY, horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1, boxes: Object.fromEntries(['.topbar', '#scene', '.action-dock'].map(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return [selector, { x: r.x, y: r.y, width: r.width, height: r.height }]; })) }));
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  await page.goto(base); await driver.ready(); await driver.enterPlay();
  receipt.build = await page.evaluate(async () => (await fetch('./precache.json', { cache: 'no-store' })).json());
  receipt.browser = context.browser()?.version() || null;
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    for (const factor of [.8, 1, 1.25, 1.5]) {
      const actual = await worker.evaluate(async ({ base, factor }) => { const tabs = await chrome.tabs.query({ url: base + '*' }); if (tabs.length !== 1) throw new Error('Expected exactly one task tab'); await chrome.tabs.setZoomSettings(tabs[0].id, { mode: 'automatic', scope: 'per-tab' }); await chrome.tabs.setZoom(tabs[0].id, factor); return chrome.tabs.getZoom(tabs[0].id); }, { base, factor });
      assert.ok(Math.abs(actual - factor) < .001, 'Actual browser tab zoom matches requested factor');
      await driver.camera('overview'); await page.waitForTimeout(200);
      const name = `${viewport.width}x${viewport.height}-${Math.round(factor * 100)}percent`;
      await page.screenshot({ path: path.join(root, name + '.png') });
      const geometry = await layout(); assert.equal(geometry.horizontalOverflow, false, 'Browser zoom must not create horizontal overflow');
      for (const [selector, box] of Object.entries(geometry.boxes)) assert.ok(box.y >= -1 && box.y + box.height <= geometry.innerHeight + 1, selector + ' must fit in the playing viewport at actual tab zoom');
      receipt.captures.push({ name, viewport, requestedZoom: factor, confirmedZoom: actual, layout: geometry, metrics: await driver.metrics() });
      await page.locator('#settings').click(); await page.screenshot({ path: path.join(root, name + '-atelier.png') });
      await page.locator('#settings-dialog button[value="close"]').click();
      await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2));
      console.log(`CAPTURED ${name}`);
    }
  }
  assert.deepEqual(receipt.errors, []); receipt.status = 'captured-requires-review';
} catch (error) { receipt.status = 'fail'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message); }
finally { await context.close(); receipt.finished = new Date().toISOString(); await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); }
