import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';
const root = path.resolve('.artifacts/overhaul', process.env.RIFT_TEST_RUN || `frame-profile-${Date.now()}`);
await fs.mkdir(root, { recursive: false });
const receipt = { started: new Date().toISOString(), classification: 'isolated actual Chrome frame pacing; no screenshots/video during measured intervals', samples: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' }); const driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
try {
  await page.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/'); await driver.ready(); await driver.enterPlay(); await driver.camera('overview');
  receipt.build = await page.evaluate(async () => (await fetch('./precache.json', { cache: 'no-store' })).json());
  for (const theme of (process.env.RIFT_PROFILE_THEMES || 'gallery,nocturne,daylight').split(',')) for (const quality of (process.env.RIFT_PROFILE_QUALITIES || 'balanced,low').split(',')) {
    await page.locator('#settings').click(); const dialog = page.locator('#settings-dialog');
    await dialog.locator('[name="theme"]').selectOption(theme); await dialog.locator('[name="quality"]').selectOption(quality); await dialog.locator('[name="motion"]').uncheck();
    await dialog.getByRole('button', { name: 'Apply', exact: true }).click(); await driver.ready();
    await page.waitForTimeout(1500);
    for (const activity of ['idle', 'orbit']) {
      await page.evaluate(() => window.rift.resetMetrics());
      if (activity === 'orbit') await page.evaluate(() => new Promise(resolve => {
        const start = performance.now(); let last = start;
        const frame = now => { window.rift.orbit((now - last) * .00016, 0); last = now; if (now - start < 5000) requestAnimationFrame(frame); else resolve(); }; requestAnimationFrame(frame);
      }));
      else await page.waitForTimeout(5000);
      const metrics = await driver.metrics(); receipt.samples.push({ theme, quality, activity, metrics });
      console.log(JSON.stringify({ theme, quality, activity, median: metrics.medianMs, p95: metrics.p95Ms, p99: metrics.p99Ms, max: metrics.maxMs, calls: metrics.calls }));
      await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2));
    }
  }
  assert.deepEqual(receipt.errors, []); receipt.status = 'measured';
} catch (error) { receipt.status = 'fail'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message); }
finally { await browser.close(); receipt.finished = new Date().toISOString(); await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); }
