import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('.artifacts', process.env.RIFT_TEST_RUN || 'offline-restart'); await fs.mkdir(root, { recursive: true });
const profile = path.join(root, 'profile'); const receipt = { checks: [], errors: [], started: new Date().toISOString() };
const options = { channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'], viewport: { width: 1600, height: 1000 } };
const url = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/'; let context;
async function ready(page) { await page.waitForFunction(() => Boolean(window.rift)); await page.evaluate(() => window.rift.assetsReady()); await page.waitForFunction(() => !window.rift.metrics().animating); }
try {
  context = await chromium.launchPersistentContext(profile, options); let page = context.pages()[0];
  page.on('pageerror', e => receipt.errors.push(e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' }); await ready(page);
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated', null, { timeout: 20000 });
  receipt.checks.push('service worker installed and activated');
  const before = await page.evaluate(() => window.rift.exportRecord());
  await context.close(); context = null; receipt.checks.push('browser process closed');
  context = await chromium.launchPersistentContext(profile, options); await context.setOffline(true); page = context.pages()[0];
  page.on('pageerror', e => receipt.errors.push(e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }); await ready(page);
  assert.deepEqual(await page.evaluate(() => window.rift.exportRecord()), before);
  receipt.checks.push('cold browser restart offline restored exact record');
  await page.locator('#new-game').click(); await page.locator('input[name="mode"][value="bot-black"]').check(); await page.locator('input[name="layout"][value="B"]').check(); await page.locator('#start-game').click(); await page.locator('[data-camera="top"]').click();
  await ready(page);
  for (const square of [12, 28]) { const point = await page.evaluate(square => window.rift.squareScreenPosition(square), square); await page.mouse.click(point.x, point.y); }
  await page.waitForFunction(() => window.rift.getObservation().revision === 2 && !window.rift.metrics().animating); await page.waitForTimeout(300);
  receipt.checks.push('ordinary canvas move and local bot reply after cold offline restart');
  await page.screenshot({ path: path.join(root, 'offline-play.png') }); assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (e) { receipt.status = 'fail'; receipt.failure = e.stack; process.exitCode = 1; console.error(e.message); }
finally { if (context) await context.close(); receipt.finished = new Date().toISOString(); await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); console.log(JSON.stringify(receipt)); }
