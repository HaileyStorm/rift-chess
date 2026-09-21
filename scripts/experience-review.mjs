import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const root = path.resolve('.artifacts/experience', process.env.RIFT_TEST_RUN || `review-${Date.now()}`);
await fs.mkdir(root, { recursive: true });
const receiptPath = path.join(root, 'receipt.json');
try { await fs.access(receiptPath); throw new Error('Refusing to overwrite evidence'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const fixtures = JSON.parse(await fs.readFile('fixtures/conformance.json', 'utf8')).fixtures;
const position = structuredClone(fixtures.find(item => item.name === 'en_passant').record.initial);
position.board = Array(64).fill(0); position.board[0] = 6; position.board[63] = -6;
position.board[21] = 2; position.board[38] = -3; position.ep_target = -1; position.ep_pawn = -1;
const receipt = { classification: 'fixture setup; real pointer and keyboard input, rendered feedback and menu review', checks: [], captures: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block', recordVideo: { dir: root, size: { width: 1600, height: 1000 } } });
const page = await context.newPage(), driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
async function settled() { await driver.ready(); await page.waitForFunction(() => !window.rift.metrics().cameraTravelling); }
async function shot(name) { await settled(); await page.screenshot({ path: path.join(root, `${name}.png`) }); receipt.captures.push({ name, metrics: await driver.metrics() }); }
async function appearance(theme) {
  await page.locator('#settings').click();
  await page.locator('#settings-dialog [name="theme"]').selectOption(theme);
  await page.locator('#settings-dialog button[value="apply"]').click();
  await page.evaluate(() => window.rift.assetsReady()); await settled();
}
try {
  await page.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await driver.enterPlay(); await driver.loadScenario(position); await driver.camera('white'); await settled();
  for (const theme of ['gallery', 'nocturne', 'daylight']) {
    await appearance(theme); await shot(`${theme}-table`);
    await page.locator('#shift-mode').click(); await driver.hover('f3');
    await page.waitForFunction(() => window.rift.metrics().hoveredSquare === 21);
    await shot(`${theme}-hover`);
    await driver.square('f3');
    const selected = await driver.metrics();
    assert.equal(selected.selectedSquare, 21); assert.equal(selected.selectedTile, null); assert.equal(selected.shiftMode, false);
    assert.equal(selected.selectedFeedback.visible, true); assert.equal(selected.moveHints, false);
    assert.match(await page.locator('#selection').textContent(), /Knight.*f3/);
    await shot(`${theme}-selected`);
    await page.mouse.move(1, 1);
    assert.equal((await driver.metrics()).hoveredSquare, null);
    assert.equal((await driver.metrics()).selectedFeedback.visible, true);
    await page.locator('#cancel-selection').click();
    receipt.checks.push(`${theme}: piece click overrides tile intent; hover and persistent selection exist without move hints`);
  }
  await appearance('gallery'); await driver.camera('top');
  const capture = await page.evaluate(() => window.rift.getLegalActions().find(action => action.from === 'f3' && action.to === 'g5'));
  assert.ok(capture); await driver.perform(capture);
  assert.equal((await driver.observation()).revision, 1); await shot('knight-capture-finished');
  receipt.checks.push('knight capture completed through real input; video records attack and death');
  await page.locator('#menu-toggle').click(); assert.equal(await page.locator('#match-tools').isVisible(), true); await shot('menu');
  await page.locator('#menu-toggle').click();
  await page.locator('#settings').click(); await page.screenshot({ path: path.join(root, 'settings.png') });
  await page.locator('#settings-dialog button[value="close"]').click();
  await page.locator('#new-game').click(); await page.screenshot({ path: path.join(root, 'new-match.png') });
  await page.locator('#new-dialog button[value="cancel"]').click();
  await page.locator('#sound-toggle').click(); assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'), 'false');
  assert.equal(await page.evaluate(() => localStorage.getItem('rift-chess.sound')), 'off');
  await page.locator('#sound-toggle').click(); assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'), 'true');
  receipt.checks.push('menu opens/closes, settings/new match dialogs, immediate persistent sound toggle');
  for (const [width, height] of [[1092, 921], [390, 844]]) {
    await page.setViewportSize({ width, height }); await driver.loadScenario(position); await driver.camera('white'); await settled();
    await driver.square('f3'); await shot(`selection-${width}`);
    const layout = await page.evaluate(() => {
      const text = document.querySelector('#selection'), dock = document.querySelector('.action-dock').getBoundingClientRect();
      return { scroll: document.documentElement.scrollWidth, width: innerWidth, textFits: text.scrollWidth <= text.clientWidth, dockBottom: dock.bottom, height: innerHeight };
    });
    assert.ok(layout.scroll <= width, 'horizontal overflow'); assert.ok(layout.textFits, 'selection clipped'); assert.ok(layout.dockBottom <= height + 1, 'dock below viewport');
    receipt.checks.push(`${width}x${height}: selection text fits and dock stays visible`);
  }
  assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (error) { receipt.status = 'fail'; receipt.failure = error.stack; process.exitCode = 1; }
finally { await context.close(); await browser.close(); await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ root, status: receipt.status, checks: receipt.checks, failure: receipt.failure })); }
