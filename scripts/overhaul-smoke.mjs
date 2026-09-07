import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve('.artifacts/overhaul', process.env.RIFT_TEST_RUN || 'integrated-slice');
await fs.mkdir(root, { recursive: true });
const receipt = { started: new Date().toISOString(), classification: 'intermediate implementation smoke, NOT final visual or product acceptance', checks: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block', recordVideo: { dir: root, size: { width: 1600, height: 1000 } } });
const page = await context.newPage(); page.on('pageerror', e => receipt.errors.push(e.message));
page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
async function capture(name) { await page.screenshot({ path: path.join(root, name + '.png') }); }
async function square(n) { const p = await page.evaluate(n => window.rift.squareScreenPosition(n), n); await page.mouse.click(p.x, p.y); }
async function lesson() {
  const panel = page.locator('details').filter({ has: page.locator('[data-tutorial="loadedShift"]') });
  if (!(await panel.getAttribute('open'))) { if (!(await page.locator('[data-tutorial="loadedShift"]').isVisible())) await panel.locator('summary').click(); }
  await page.locator('[data-tutorial="loadedShift"]').click(); await page.locator('#scene').focus(); await page.keyboard.press('4');
  await page.waitForFunction(() => !window.rift.metrics().animating);
}
try {
  await page.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/'); await page.waitForFunction(() => Boolean(window.rift));
  await page.evaluate(() => window.rift.assetsReady());
  receipt.build = await page.evaluate(async () => { const response = await fetch('./precache.json', { cache: 'no-store' }); if (!response.ok) throw new Error('Build identity unavailable'); return response.json(); });
  await page.waitForTimeout(800); await capture('entrance'); await page.locator('#launch-skip').click();
  assert.equal(await page.locator('#replay-controls').isVisible(), false);
  receipt.checks.push('inactive replay controls are genuinely hidden');
  await lesson(); const before = await page.evaluate(() => window.rift.getObservation());
  await square(42); await page.locator('#shift-passenger').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#shift-mode').getAttribute('aria-pressed'), 'false');
  await capture('passenger-choice'); await page.locator('#shift-passenger').click();
  assert.equal(await page.evaluate(() => window.rift.metrics().selectedTile), 9);
  await capture('loaded-source'); await square(50); await page.locator('#confirm-shift').waitFor({ state: 'visible' });
  assert.equal((await page.evaluate(() => window.rift.getObservation())).revision, before.revision);
  await capture('destination-preview'); await page.locator('#confirm-shift').click();
  await page.locator('#promotion-dialog').waitFor({ state: 'visible' });
  assert.equal((await page.evaluate(() => window.rift.getObservation())).revision, before.revision);
  await page.locator('#promotion-dialog button[value="N"]').click();
  await page.waitForFunction(r => window.rift.getObservation().revision === r + 1 && !window.rift.metrics().animating, before.revision);
  assert.equal(await page.evaluate(() => window.rift.getObservation().position.board[58]), 2);
  await capture('shift-underpromotion'); receipt.checks.push('blocked passenger selected in Move mode offers visible Shift route; preview and promotion precede atomic commit');
  await lesson(); await page.locator('#shift-mode').click(); await square(42);
  assert.equal(await page.evaluate(() => window.rift.metrics().selectedTile), 9); receipt.checks.push('explicit Shift mode accepts clicking the passenger directly');
  await page.locator('#cancel-selection').click(); assert.equal(await page.evaluate(() => window.rift.metrics().selectedTile), null);
  await page.locator('#new-game').click(); await page.locator('input[name="layout"][value="B"]').check(); await page.locator('#start-game').click(); await page.waitForTimeout(1100);
  for (const [theme, family, material] of [['gallery', 'classic', 'ceramic'], ['nocturne', 'faceted', 'metal'], ['daylight', 'classic', 'wood']]) {
    await page.locator('#settings').click(); const d = page.locator('dialog[open]');
    for (const [key, value] of Object.entries({ theme, family, material })) await d.locator(`[name="${key}"]`).selectOption(value);
    await d.getByRole('button', { name: 'Apply', exact: true }).click();
    await page.evaluate(() => window.rift.setCamera('overview')); await page.waitForTimeout(600); await capture(theme);
    await page.evaluate(() => { window.rift.setCamera('white'); window.rift.orbit(0, .1, -4.5); }); await page.waitForTimeout(300); await capture(theme + '-near');
  }
  receipt.metrics = await page.evaluate(() => window.rift.metrics()); assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (e) { receipt.status = 'fail'; receipt.failure = e.stack; process.exitCode = 1; console.error(e.message); await capture('failure').catch(() => {}); }
finally { await context.close(); await browser.close(); receipt.finished = new Date().toISOString(); await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, errors: receipt.errors })); }
