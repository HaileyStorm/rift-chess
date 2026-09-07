import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('.artifacts/overhaul', process.env.RIFT_TEST_RUN || 'world-review'); await fs.mkdir(path.dirname(root), { recursive: true }); await fs.mkdir(root);
const receipt = { started: new Date().toISOString(), purpose: 'actual world/entrance inspection candidate; images require visual review', captures: [], checks: [], events: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block', recordVideo: { dir: root, size: { width: 1600, height: 1000 } } });
receipt.pageCreatedAt = Date.now();
const page = await context.newPage(); page.on('pageerror', error => receipt.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
async function event(name) { receipt.events.push({ name, wallTime: Date.now(), ...await page.evaluate(() => ({ performanceTime: performance.now(), timeOrigin: performance.timeOrigin })) }); }
async function shot(name) {
  await page.waitForFunction(() => !window.rift.metrics().cameraTravelling && !window.rift.metrics().assembling);
  await page.waitForTimeout(500);
  const layout = await page.evaluate(() => ({ mode: document.querySelector('#app').dataset.presentation, viewport: [innerWidth, innerHeight], scrollY, boxes: Object.fromEntries(['.topbar', '#scene', '.action-dock'].map(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return [selector, { x: r.x, y: r.y, width: r.width, height: r.height }]; })) }));
  if (layout.mode === 'play' && layout.viewport[0] >= 951) for (const [name, box] of Object.entries(layout.boxes)) assert.ok(box.y >= -1 && box.y + box.height <= layout.viewport[1] + 1, name + ' is outside the playing viewport');
  await page.screenshot({ path: path.join(root, name + '.png') }); receipt.captures.push({ name, layout, metrics: await page.evaluate(() => window.rift.metrics()) });
}
async function returnToPlay() { await event('before-return'); await page.locator('#launch-return').click(); await page.waitForFunction(() => !window.rift.metrics().cameraTravelling); await event('after-return'); }
try {
  await page.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForFunction(() => Boolean(window.rift)); await page.evaluate(() => window.rift.assetsReady());
  receipt.readyAt = await page.evaluate(() => ({ at: performance.now(), metrics: window.rift.metrics() }));
  receipt.build = await page.evaluate(async () => (await fetch('./precache.json', { cache: 'no-store' })).json());
  await shot('gallery-entrance'); assert.equal(await page.locator('#shift-mode').isVisible(), false);
  await page.locator('#launch-explore').click(); await page.locator('#launch-return').waitFor({ state: 'visible' });
  const before = await page.evaluate(() => window.rift.getObservation().revision);
  const p = await page.evaluate(() => window.rift.squareScreenPosition(12)); await page.mouse.click(p.x, p.y); assert.equal(await page.evaluate(() => window.rift.getObservation().revision), before);
  receipt.checks.push('launch/explore conceal match chrome and block board commits, with a visible return control');
  await shot('gallery-explore'); await returnToPlay();
  for (const theme of ['gallery', 'nocturne', 'daylight']) {
    await page.locator('#settings').click(); const dialog = page.locator('dialog[open]');
    await dialog.locator('[name="theme"]').selectOption(theme); await dialog.locator('[name="family"]').selectOption('classic'); await dialog.locator('[name="material"]').selectOption('ceramic');
    await dialog.getByRole('button', { name: 'Apply', exact: true }).click(); await page.evaluate(() => window.rift.assetsReady());
    if (!(await page.locator('#explore-table').isVisible())) await page.locator('details').filter({ has: page.locator('#explore-table') }).locator('summary').click();
    await page.locator('#explore-table').click(); await shot(theme + '-world');
    await returnToPlay(); await page.locator('#scene').focus(); await page.keyboard.press('1'); await shot(theme + '-white');
    await page.keyboard.press('3'); await shot(theme + '-overview');
    await page.keyboard.press('4'); await shot(theme + '-top');
  }
  await page.reload(); await page.waitForFunction(() => Boolean(window.rift)); await page.evaluate(() => window.rift.assetsReady());
  assert.equal(await page.locator('#launch-surface').isVisible(), false); receipt.checks.push('existing saved game reload bypasses the entrance');
  receipt.finalBuild = await page.evaluate(async () => (await fetch('./precache.json', { cache: 'no-store' })).json()); assert.deepEqual(receipt.finalBuild, receipt.build);
  assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (error) { receipt.status = 'fail'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message); await page.screenshot({ path: path.join(root, 'failure.png') }).catch(() => {}); }
finally { await context.close(); await browser.close(); receipt.finished = new Date().toISOString(); await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ status: receipt.status, captures: receipt.captures.length, errors: receipt.errors, checks: receipt.checks })); }
