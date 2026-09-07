import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('.artifacts/responsiveness'); await fs.mkdir(root, { recursive: true });
const receipt = { started: new Date().toISOString(), checks: [], measurements: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' }); const page = await context.newPage();
page.on('pageerror', e => receipt.errors.push(e.message)); page.on('dialog', d => d.accept());
let delayed = 0;
async function square(n) { const p = await page.evaluate(n => window.rift.squareScreenPosition(n), n); await page.mouse.click(p.x, p.y); }
async function newGame(mode = 'hotseat', layout = 'B') { await page.locator('#new-game').click(); await page.locator(`input[name="mode"][value="${mode}"]`).check(); await page.locator(`input[name="layout"][value="${layout}"]`).check(); await page.locator('#start-game').click(); await page.locator('[data-camera="top"]').click(); await page.waitForFunction(() => !window.rift.metrics().animating); }
async function e4() { await square(12); await square(28); await page.waitForFunction(() => !window.rift.metrics().animating && window.rift.getObservation().revision >= 1); }
async function waitDelay(count) { for (let i = 0; i < 100 && delayed < count; i++) await page.waitForTimeout(50); assert.ok(delayed >= count, 'Worker source delivery was not observed'); }
async function quality(value) { await page.locator('#settings').click(); const dialog = page.locator('dialog[open]'); await dialog.locator('[name="quality"]').selectOption(value); await dialog.getByRole('button', { name: 'Apply', exact: true }).click(); await page.waitForTimeout(500); }
async function measure(name, activity) { await page.evaluate(() => window.rift.resetMetrics()); await activity(); receipt.measurements.push({ name, ...await page.evaluate(() => window.rift.metrics()) }); }
try {
  await page.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => Boolean(window.rift));
  await context.route('**/worker-*.js', async route => { delayed++; await new Promise(resolve => setTimeout(resolve, 1500)); await route.continue().catch(() => {}); });
  await newGame('bot-black'); await e4(); await waitDelay(1); await page.locator('#undo').click(); const undoRevision = await page.evaluate(() => window.rift.getObservation().revision); await page.waitForTimeout(2000);
  assert.equal(await page.evaluate(() => window.rift.exportRecord().actions.length), 0); assert.equal(await page.evaluate(() => window.rift.getObservation().revision), undoRevision); receipt.checks.push('undo cancels a delayed real worker before any stale commit');
  await e4(); await waitDelay(2); await newGame('hotseat', 'C'); const newId = await page.evaluate(() => window.rift.getObservation().game_id); await page.waitForTimeout(2000);
  assert.equal(await page.evaluate(() => window.rift.getObservation().game_id), newId); assert.equal(await page.evaluate(() => window.rift.getObservation().revision), 0); receipt.checks.push('new game rejects delayed previous-game worker');
  const beforeDraw = delayed; await newGame('bot-black'); await e4(); await waitDelay(beforeDraw + 1); await page.getByRole('button', { name: 'Offer draw', exact: true }).click();
  await page.waitForFunction(() => window.rift.exportRecord().actions.length === 2 && !window.rift.metrics().animating, null, { timeout: 30000 }); receipt.checks.push('draw decline during bot thought restarts valid search');
  await context.unroute('**/worker-*.js');
  await newGame(); await quality('balanced'); await page.locator('[data-camera="overview"]').click();
  await measure('balanced idle callback intervals, 5 seconds', () => page.waitForTimeout(5000));
  await measure('balanced actual right-drag orbit', async () => { const b = await page.locator('#scene').boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down({ button: 'right' }); for (let i = 0; i < 120; i++) { await page.mouse.move(x + Math.sin(i / 12) * 70, y + Math.cos(i / 12) * 35); await page.waitForTimeout(16); } await page.mouse.up({ button: 'right' }); });
  await quality('low'); await measure('low idle callback intervals, 5 seconds', () => page.waitForTimeout(5000));
  await newGame('bot-black'); await measure('human move, worker thought and bot animation', async () => { await e4(); await page.waitForFunction(() => window.rift.exportRecord().actions.length === 2 && !window.rift.metrics().animating); });
  await page.setViewportSize({ width: 1266, height: 680 }); await page.waitForTimeout(300); const bounds = await page.locator('#scene').boundingBox(); assert.ok(bounds.y + bounds.height <= 680, 'Board is below the viewport at Windows-scaled size'); receipt.checks.push('board remains fully visible at 1266x680 CSS pixels');
  await page.screenshot({ path: path.join(root, 'scaled-window.png'), fullPage: true });
  assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (e) { receipt.status = 'fail'; receipt.failure = e.stack; process.exitCode = 1; console.error(e.message); await page.screenshot({ path: path.join(root, 'failure.png') }).catch(() => {}); }
finally { await browser.close(); receipt.finished = new Date().toISOString(); await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, measurements: receipt.measurements })); }
