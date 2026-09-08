import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const root = path.resolve('.artifacts', 'overhaul', process.env.RIFT_TEST_RUN || `touch-playtest-${Date.now()}`);
try { await fs.access(root); throw new Error(`Refusing to reuse output directory: ${root}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
await fs.mkdir(root, { recursive: true });
const receipt = { started: new Date().toISOString(), classification: 'Chrome CDP touch emulation only; not physical-device or human-usability proof.', url: base, build: null, contexts: [], errors: [] };
const persist = () => fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2));
let browser;

async function servedBuild(page) {
  return page.evaluate(async () => {
    const response = await fetch('./precache.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Missing build manifest (${response.status})`);
    return response.json();
  });
}

async function touch(session, type, touchPoints) {
  await session.send('Input.dispatchTouchEvent', { type, touchPoints });
}

async function tap(session, point) {
  const contact = { x: point.x, y: point.y, id: 1, radiusX: 1, radiusY: 1, force: 1 };
  await touch(session, 'touchStart', [contact]);
  await touch(session, 'touchEnd', []);
}

async function runContext(profile) {
  let context;
  const evidence = { name: profile.name, viewport: { width: profile.width, height: profile.height }, hasTouch: true, checks: [] };
  try {
    context = await browser.newContext({ viewport: evidence.viewport, hasTouch: true, serviceWorkers: 'block' });
    const page = await context.newPage(); const driver = createUiDriver(page); const session = await context.newCDPSession(page);
    page.on('pageerror', error => receipt.errors.push(`${profile.name} pageerror: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') receipt.errors.push(`${profile.name} console: ${message.text()}`); });
    const point = square => page.evaluate(index => window.rift.squareScreenPosition(index), typeof square === 'number' ? square : (Number(square[1]) - 1) * 8 + square.charCodeAt(0) - 97);
    const tapControl = async selector => { const control = page.locator(selector); await control.waitFor({ state: 'visible' }); await control.scrollIntoViewIfNeeded(); const box = await control.boundingBox(); assert.ok(box, `No visible touch target for ${selector}`); await tap(session, { x: box.x + box.width / 2, y: box.y + box.height / 2 }); };
    const tapSquare = square => point(square).then(value => tap(session, value));
    const commitMove = async (from, to) => {
      const before = await driver.observation(), record = await driver.record();
      const action = await page.evaluate(({ from, to }) => window.rift.getLegalActions().find(item => item.type === 'move' && item.from === from && item.to === to), { from, to });
      assert.ok(action, `Missing legal move ${from}-${to}`); await tapSquare(from); await tapSquare(to);
      await page.waitForFunction(expected => window.rift.getObservation().revision === expected + 1, before.revision); await driver.ready();
      const after = await driver.observation(); assert.equal(after.revision, before.revision + 1); assert.equal((await driver.record()).actions.at(-1), action.id); assert.equal((await driver.record()).actions.length, record.actions.length + 1);
      return action.id;
    };
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.ready();
    const launch = await page.locator('#launch-return').isVisible() ? '#launch-return' : await page.locator('#launch-skip').isVisible() ? '#launch-skip' : null;
    if (launch) await tapControl(launch); await driver.ready(); await driver.camera('top');
    evidence.manifest = { start: await servedBuild(page), end: null };
    if (receipt.build === null) receipt.build = evidence.manifest.start; else assert.deepEqual(evidence.manifest.start, receipt.build, 'Contexts must bind the same manifest');
    await tapControl('#new-game'); await page.locator('#new-dialog').waitFor({ state: 'visible' });
    await tapControl('#new-dialog input[name="mode"][value="hotseat"]'); await tapControl('#new-dialog input[name="layout"][value="B"]'); await tapControl('#start-game'); await driver.ready();
    const cameraBefore = await driver.metrics(), cameraRecord = await driver.record(), canvas = await page.locator('#scene canvas').boundingBox(); assert.ok(canvas, 'Canvas must accept touch input');
    const start = [{ x: canvas.x + canvas.width / 2 - 55, y: canvas.y + canvas.height / 2, id: 1 }, { x: canvas.x + canvas.width / 2 + 55, y: canvas.y + canvas.height / 2, id: 2 }];
    await touch(session, 'touchStart', start); await touch(session, 'touchMove', [{ ...start[0], x: start[0].x - 45, y: start[0].y - 24 }, { ...start[1], x: start[1].x + 60, y: start[1].y + 28 }]); await touch(session, 'touchEnd', []);
    await page.waitForFunction(distance => Math.abs(window.rift.metrics().cameraDistance - distance) > .05, cameraBefore.cameraDistance);
    assert.equal((await driver.observation()).revision, cameraBefore.revision); assert.deepEqual(await driver.record(), cameraRecord); evidence.checks.push({ name: 'two-finger orbit/pinch changes camera without mutation' });
    assert.equal((await driver.metrics()).selectedSquare, cameraBefore.selectedSquare); assert.equal((await driver.metrics()).selectedTile, cameraBefore.selectedTile);
    await driver.camera('top');
    const cancelBefore = await driver.observation(), cancelRecord = await driver.record(); await tapSquare('b1'); await page.waitForFunction(() => window.rift.metrics().selectedSquare === 1); await tapSquare('b1'); await page.waitForFunction(() => window.rift.metrics().selectedSquare === null);
    assert.equal((await driver.observation()).revision, cancelBefore.revision); assert.deepEqual(await driver.record(), cancelRecord); evidence.checks.push({ name: 'same ordinary source tap cancels without mutation' });
    const opening = [await commitMove('b1', 'a3'), await commitMove('g7', 'g6')]; evidence.checks.push({ name: 'ordinary source/destination taps commit once', actionIds: opening });
    const before = await driver.observation(), record = await driver.record();
    const shift = await page.evaluate(() => window.rift.getLegalActions().find(item => item.type === 'shift' && item.from === 'A2' && item.to === 'B2'));
    assert.equal(before.position.board[16], 2, 'B opening must load A2 with the knight from b1-a3'); assert.ok(shift, 'B opening after b1-a3/g7-g6 must expose loaded A2-B2 Shift'); await tapControl('#shift-mode'); assert.equal(await page.locator('#confirm-shift').count(), 0, 'Confirm Shift must be absent');
    await tapSquare(driver.macroSquare('A2')); await page.waitForFunction(() => window.rift.metrics().selectedTile === 4);
    await tapSquare(driver.macroSquare('A2')); await page.waitForFunction(() => window.rift.metrics().selectedTile === null); assert.deepEqual(await driver.record(), record); evidence.checks.push({ name: 'same Shift source tap cancels without mutation' });
    await tapSquare(driver.macroSquare('A2')); await page.waitForFunction(() => window.rift.metrics().selectedTile === 4); await tapSquare(driver.macroSquare('B2'));
    await page.waitForFunction(expected => window.rift.getObservation().revision === expected + 1, before.revision); await driver.ready();
    assert.equal((await driver.observation()).revision, before.revision + 1); assert.equal((await driver.record()).actions.at(-1), shift.id); assert.equal((await driver.record()).actions.length, record.actions.length + 1); evidence.checks.push({ name: 'visible Shift control and source/destination taps commit loaded Shift', actionId: shift.id });
    evidence.manifest.end = await servedBuild(page); assert.deepEqual(evidence.manifest.end, evidence.manifest.start, 'Manifest changed during touch emulation'); receipt.contexts.push(evidence);
  } finally {
    if (context) await context.close();
  }
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
  for (const profile of [{ name: 'phone-390x844', width: 390, height: 844 }, { name: 'tablet-1024x768', width: 1024, height: 768 }]) await runContext(profile);
  assert.deepEqual(receipt.errors, []);
  receipt.status = 'pass';
} catch (error) {
  receipt.status = 'fail'; receipt.failure = error instanceof Error ? error.stack : String(error); process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(error => receipt.errors.push(`browser close: ${error.message}`));
  receipt.finished = new Date().toISOString(); await persist();
  console.log(JSON.stringify({ status: receipt.status, contexts: receipt.contexts.length, output: root }));
}
