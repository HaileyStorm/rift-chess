import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const out = path.resolve('.artifacts/bend2/scenarios', process.env.BEND_PLAYTEST_RUN || new Date().toISOString().replace(/[:.]/g, '-'));
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
const page = await context.newPage();
const receipt = { at: new Date().toISOString(), url: process.env.BEND_TEST_URL || 'http://127.0.0.1:4184/', checks: [], errors: [], captures: [] };
page.on('pageerror', error => receipt.errors.push(error.message));
page.on('console', event => { if (event.type() === 'error') receipt.errors.push(event.text()); });
// Observe the real worker, and support one explicitly labelled host fault test.
// Normal scenarios still use actual pointer clicks, controls and file inputs.
await page.addInitScript(() => {
  const Native = window.Worker;
  window.__faultRenders = 0;
  window.__audioStarts = 0;
  const startSound = OscillatorNode.prototype.start;
  OscillatorNode.prototype.start = function(...args) { window.__audioStarts++; return Reflect.apply(startSound, this, args); };
  window.Worker = class extends Native {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        if (event.data.kind === 'state') window.__lastState = event.data;
      });
    }
    postMessage(message, ...args) {
      if (message.kind === 'render' && window.__faultRenders > 0) {
        window.__faultRenders--;
        setTimeout(() => this.dispatchEvent(new MessageEvent('message', { data: { kind: 'error', id: message.id, epoch: message.epoch, message: 'Injected renderer fault for recovery test' } })), 0);
      } else super.postMessage(message, ...args);
    }
  };
});
const ids = [2680, 15845, 7845, 18440, 10765, 17835, 13365, 15235];
const record = (count, layout = 'B') => ({ schema: 'rift-bend-record/1', layout, policy: 0, commands: ids.slice(0, count).map((action, expected) => ({ $: 'MoveCommand', expected, action })) });
async function ready() {
  await page.waitForFunction(() => document.querySelector('#busy')?.hidden === true, null, { timeout: 60000 });
  await page.waitForTimeout(450);
}
async function count(n) { await page.waitForFunction(n => { try { return JSON.parse(localStorage.getItem('rift-bend-lab/save-v1') || '{}').commands?.length === n; } catch { return false; } }, n, { timeout: 60000 }); await ready(); }
async function saved() { return page.evaluate(() => JSON.parse(localStorage.getItem('rift-bend-lab/save-v1'))); }
async function upload(value) { await page.locator('#import').setInputFiles({ name: 'scenario.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) }); }
async function pixel(x, y) {
  const b = await page.locator('#board').boundingBox();
  await page.mouse.click(b.x + x * b.width / 512, b.y + y * b.height / 512);
}
async function capture(name) { await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true }); receipt.captures.push(name); }
async function newGame(play = 'hotseat', layout = 'B') {
  await page.locator('#new-game').click();
  await page.locator(`#new-form input[name="play"][value="${play}"]`).check();
  await page.locator(`#new-form input[name="layout"][value="${layout}"]`).check();
  await page.locator('#new-form button[type="submit"]').click();
  await count(0);
}
try {
  await page.goto(receipt.url, { waitUntil: 'networkidle' });
  await count(0);
  await upload(record(2)); await count(2);
  await pixel(160, 172);
  await page.getByRole('button', { name: 'Move to b5', exact: true }).click();
  await page.waitForTimeout(130); await capture('01-capture-animation');
  await count(3);
  assert.equal((await saved()).commands.at(-1).action, 7845);
  receipt.checks.push('Actual pointer capture a4xb5, animated victim and accepted ledger');

  await upload(record(8)); await count(8);
  await pixel(256, 147);
  await page.getByRole('button', { name: 'Move to b8', exact: true }).click();
  await page.locator('#promotion-dialog').waitFor({ state: 'visible' });
  await capture('02-promotion-dialog');
  await page.locator('[data-promotion="4"]').click(); await count(9);
  assert.equal((await saved()).commands.at(-1).action, 15969);
  receipt.checks.push('Real eight-ply record leads to underpromotion through the UI');
  await capture('03-promoted-knight');

  // Imported records deliberately enter hotseat and do not auto-advance.
  await upload(record(2)); await count(2);
  await page.locator('#offer').click(); await count(3);
  await page.locator('#accept').click(); await count(4);
  assert.match(await page.locator('#turn-label').innerText(), /Draw agreed/);
  assert.equal(await page.locator('#undo').isEnabled(), true);
  await page.locator('#undo').click(); await count(5);
  assert.match(await page.locator('#turn-label').innerText(), /Black to move/);
  await page.locator('#resign').click(); await count(6);
  assert.match(await page.locator('#turn-label').innerText(), /White wins/);
  await page.locator('#undo').click(); await count(7);
  assert.match(await page.locator('#turn-label').innerText(), /White to move/);
  receipt.checks.push('Draw agreement, resignation and undo reopen finished games');

  await newGame('bot');
  await pixel(232, 303); await page.getByRole('button', { name: 'Move to f3', exact: true }).click();
  await count(2);
  await page.locator('#undo').click(); await count(3);
  assert.equal(await page.locator('#resume-bot').isVisible(), true);
  await page.waitForTimeout(700); assert.equal((await saved()).commands.length, 3);
  await page.reload({ waitUntil: 'networkidle' }); await count(3);
  assert.match(await page.locator('#mode-label').innerText(), /YOU PLAY WHITE/);
  assert.equal(await page.locator('#resume-bot').isVisible(), true);
  await page.locator('#undo').click(); await count(4);
  assert.match(await page.locator('#turn-label').innerText(), /White to move/);
  await pixel(208, 242); await page.getByRole('button', { name: 'Move to e4', exact: true }).click(); await count(6);
  receipt.checks.push('Bot plays legal replies; undo pauses it; mode and pause survive reload');

  await upload(record(1)); await count(1); await page.waitForTimeout(600);
  assert.equal((await saved()).commands.length, 1);
  assert.match(await page.locator('#mode-label').innerText(), /LOCAL HOTSEAT/);
  receipt.checks.push('Portable imports do not inherit or trigger an old bot');

  await upload(record(8, 'B'));
  await upload(record(2, 'C'));
  await count(2); assert.equal((await saved()).layout, 'C');
  await page.waitForTimeout(600); assert.deepEqual(await saved(), record(2, 'C'));
  const invalid = record(1); invalid.commands[0].action = 21759;
  await upload(invalid); await newGame('hotseat', 'C'); await page.waitForTimeout(600);
  assert.equal((await saved()).layout, 'C'); assert.equal((await saved()).commands.length, 0);
  receipt.checks.push('Newest import wins; a cancelled failing replay cannot replace a new match');

  const stable = JSON.stringify(await saved());
  const oldColor = await page.evaluate(() => Array.from(document.querySelector('canvas').getContext('2d').getImageData(294, 280, 1, 1).data));
  await page.locator('#menu').click();
  await page.evaluate(() => { window.__faultRenders = 2; });
  await page.getByRole('button', { name: 'Warm theme', exact: true }).click();
  await page.getByRole('button', { name: 'Close menu', exact: true }).click();
  await page.locator('#retry-render').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#offer').isDisabled(), true);
  assert.equal(JSON.stringify(await saved()), stable);
  await page.locator('#retry-render').click(); await ready();
  assert.equal(await page.locator('#retry-render').isVisible(), false);
  const warmColor = await page.evaluate(() => Array.from(document.querySelector('canvas').getContext('2d').getImageData(294, 280, 1, 1).data));
  assert.notDeepEqual(warmColor, oldColor, 'Warm lighting must actually change rendered pixels after recovery');
  receipt.checks.push('Injected render failure locks stale display; settled retry preserves game');
  await capture('04-warm-court');

  await page.evaluate(() => localStorage.setItem('rift-bend-lab/save-v1', '{bad'));
  await page.reload({ waitUntil: 'networkidle' }); await ready();
  assert.equal(await page.evaluate(() => localStorage.getItem('rift-bend-lab/save-v1')), '{bad');
  assert.equal(await page.locator('#recovery-panel').isVisible(), true);
  assert.equal(await page.locator('#offer').isDisabled(), true);
  await capture('05-recovery');
  await newGame();
  receipt.checks.push('Malformed save retained with recovery UI until explicit new match');

  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' }); await count(0);
  await pixel(112, 194); await page.getByRole('button', { name: 'Move to a4', exact: true }).click(); await count(1);
  receipt.checks.push('Cold offline reload and an actual offline move succeed');
  await capture('06-offline');
  assert(await page.evaluate(() => window.__audioStarts > 0), 'User gestures must trigger actual Web Audio oscillators');
  await context.setOffline(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#menu').click(); await capture('07-mobile-menu');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  assert.equal(receipt.errors.length, 0, receipt.errors.join('\n'));
} catch (error) {
  receipt.failure = String(error); process.exitCode = 1;
  await capture('failure');
} finally {
  await fs.writeFile(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ out, ...receipt }, null, 2));
  await browser.close();
}
