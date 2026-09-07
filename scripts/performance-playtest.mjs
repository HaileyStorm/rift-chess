import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('.artifacts', process.env.RIFT_TEST_RUN || 'performance-final-2'); await fs.mkdir(root, { recursive: true });
const receipt = { started: new Date().toISOString(), method: 'One isolated Chrome window; callback intervals include input and worker activity. Other project test browsers closed.', viewport: { width: 1600, height: 1000 }, measurements: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const page = await browser.newPage({ viewport: receipt.viewport, serviceWorkers: 'block' });
page.on('pageerror', e => receipt.errors.push(e.message));
async function settings(values) { await page.locator('#settings').click(); const d = page.locator('dialog[open]'); for (const [key, value] of Object.entries(values)) await d.locator(`[name="${key}"]`).selectOption(value); await d.getByRole('button', { name: 'Apply', exact: true }).click(); await page.waitForTimeout(500); }
async function square(n) { const p = await page.evaluate(n => window.rift.squareScreenPosition(n), n); await page.mouse.click(p.x, p.y); }
async function ready() { await page.waitForFunction(() => !window.rift.metrics().animating); }
async function measure(name, activity) { await page.evaluate(() => window.rift.resetMetrics()); await activity(); receipt.measurements.push({ name, ...await page.evaluate(() => window.rift.metrics()) }); }
async function fresh(mode = 'hotseat') { await page.locator('#new-game').click(); await page.locator(`input[name="mode"][value="${mode}"]`).check(); await page.locator('input[name="layout"][value="B"]').check(); await page.locator('#start-game').click(); await ready(); }
async function setup(pieces, holes = [4, 10]) { const board = Array(64).fill(0); for (const [n, p] of Object.entries(pieces)) board[(+n[1] - 1) * 8 + n.charCodeAt(0) - 97] = p; await page.evaluate(p => window.rift.loadScenario(p), { board, holes: holes.reduce((a, n) => a | 1 << n, 0), side: 1, castling: 0, ep_target: -1, ep_pawn: -1, halfmove: 0, fullmove: 1 }); await page.locator('[data-camera="top"]').click(); await ready(); }
try {
  await page.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/'); await page.waitForFunction(() => Boolean(window.rift)); await fresh();
  for (const quality of ['balanced', 'low']) {
    await settings({ quality }); await page.locator('[data-camera="overview"]').click();
    await measure(`${quality} idle 5s`, () => page.waitForTimeout(5000));
    await measure(`${quality} right-drag orbit`, async () => { const b = await page.locator('#scene').boundingBox(), x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down({ button: 'right' }); for (let i = 0; i < 100; i++) { await page.mouse.move(x + Math.sin(i / 10) * 70, y + Math.cos(i / 10) * 35); await page.waitForTimeout(20); } await page.mouse.up({ button: 'right' }); });
    await setup({ e1: 6, a1: 4, h8: -6 });
    await measure(`${quality} loaded rook Shift and settle`, async () => { await page.locator('#shift-mode').click(); await square(0); await square(16); await page.waitForFunction(() => window.rift.getObservation().revision === 1); await ready(); await page.waitForTimeout(3000); });
    assert.equal(await page.evaluate(() => window.rift.getObservation().position.board[16]), 4);
    await setup({ h1: 6, a1: 4, a4: -2, h8: -6 }, [5, 10]);
    await measure(`${quality} capture and settle`, async () => { await square(0); await square(24); await page.waitForFunction(() => window.rift.getObservation().revision === 1); await ready(); await page.waitForTimeout(3000); });
    await fresh('bot-black'); await page.locator('[data-camera="top"]').click();
    await measure(`${quality} human move, worker thought and reply`, async () => { await square(12); await square(28); await page.waitForFunction(() => window.rift.exportRecord().actions.length === 2 && !window.rift.metrics().animating, null, { timeout: 60000 }); await page.waitForTimeout(1000); });
    await fresh();
  }
  for (const [theme, family, material] of [['gallery', 'classic', 'ceramic'], ['nocturne', 'faceted', 'metal'], ['daylight', 'classic', 'wood']]) { await settings({ theme, family, material, quality: 'balanced' }); await page.locator('[data-camera="overview"]').click(); await page.waitForTimeout(500); await page.screenshot({ path: path.join(root, `${theme}.png`) }); await page.locator('[data-camera="top"]').click(); await page.screenshot({ path: path.join(root, `${theme}-top.png`) }); }
  assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (e) { receipt.status = 'fail'; receipt.failure = e.stack; process.exitCode = 1; console.error(e.message); }
finally { await browser.close(); receipt.finished = new Date().toISOString(); await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); console.log(JSON.stringify(receipt)); }
