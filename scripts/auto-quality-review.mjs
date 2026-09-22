import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const root = path.resolve('.artifacts/auto-worlds', process.env.RIFT_TEST_RUN || `${Date.now()}`);
await fs.mkdir(root, { recursive: true });
const receiptFile = path.join(root, 'receipt.json');
try { await fs.access(receiptFile); throw new Error('Refusing to overwrite evidence'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const receipt = { checks: [], captures: [], errors: [], classification: 'Real UI input; optional explicit artificial frame workload verifies adaptation, not device benchmarking.' };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1092, height: 921 }, serviceWorkers: 'block' });
const page = await context.newPage(), driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(error.message));
async function settings(quality, theme) {
  await page.locator('#settings').click();
  if (quality) await page.locator('[name=quality]').selectOption(quality);
  if (theme) await page.locator('[name=theme]').selectOption(theme);
  await page.locator('#settings-dialog button[value=apply]').click(); await driver.ready();
}
try {
  await page.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/'); await driver.enterPlay();
  assert.equal((await driver.metrics()).qualityMode, 'auto'); receipt.checks.push('fresh profile defaults to Automatic');
  if (!process.env.RIFT_VISUAL_ONLY) {
    receipt.build = await page.evaluate(async () => (await fetch('./precache.json')).json());
    const before = await driver.record();
    await settings('high');
    await page.evaluate(() => {
      window.__qualityLoad = true;
      function load() { if (!window.__qualityLoad) return; const end = performance.now() + 35; while (performance.now() < end) {} requestAnimationFrame(load); }
      requestAnimationFrame(load);
    });
    await page.waitForTimeout(6500);
    assert.equal((await driver.metrics()).quality, 'high'); assert.equal((await driver.metrics()).qualityMode, 'manual');
    await settings('auto');
    await page.waitForFunction(() => window.rift.metrics().quality === 'low', null, { timeout: 60000 });
    await page.evaluate(() => { window.__qualityLoad = false; });
    assert.equal((await driver.metrics()).qualityMode, 'auto'); assert.deepEqual(await driver.record(), before);
    receipt.checks.push('manual high resists workload; Automatic lowers detail under explicit artificial frame load without changing match');
    await settings('low'); await page.reload(); await driver.enterPlay();
    assert.equal((await driver.metrics()).qualityMode, 'manual'); assert.equal((await driver.metrics()).quality, 'low');
    const legacy = await page.evaluate(() => { const value = JSON.parse(localStorage.getItem('rift-chess.save.v1')); delete value.preferences.qualityMode; return JSON.stringify(value); });
    // Install the legacy fixture after the old page's beforeunload autosave, before application startup.
    await page.addInitScript(value => localStorage.setItem('rift-chess.save.v1', value), legacy);
    await page.reload(); await driver.enterPlay(); assert.equal((await driver.metrics()).qualityMode, 'auto');
    receipt.checks.push('manual override survives reload; legacy saves without qualityMode use Automatic');
  }
  for (const theme of ['nocturne', 'daylight']) {
    await settings('balanced', theme);
    for (const camera of ['white', 'black', 'overview', 'top']) {
      await driver.camera(camera); await page.waitForFunction(() => !window.rift.metrics().cameraTravelling);
      await page.screenshot({ path: path.join(root, `${theme}-${camera}.png`) });
      receipt.captures.push({ theme, camera, metrics: await driver.metrics() });
    }
  }
  await settings('auto'); assert.equal((await driver.metrics()).qualityMode, 'auto');
  if (receipt.build) assert.deepEqual(await page.evaluate(async () => (await fetch('./precache.json')).json()), receipt.build);
  assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (error) { receipt.status = 'fail'; receipt.failure = error.stack; process.exitCode = 1; }
finally { await context.close(); await browser.close(); await fs.writeFile(receiptFile, JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ root, status: receipt.status, checks: receipt.checks, failure: receipt.failure })); }
