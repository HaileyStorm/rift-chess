/** Real-UI stale-worker recovery and responsiveness gate for the redesigned application. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const runName = process.env.RIFT_TEST_RUN || `final-${Date.now()}`;
const root = path.resolve('.artifacts', 'responsiveness', runName);
const receiptPath = path.join(root, 'receipt.json');
try {
  await fs.access(root);
  throw new Error(`Refusing to reuse responsiveness evidence directory: ${root}`);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
await fs.mkdir(root, { recursive: true });

const receipt = {
  started: new Date().toISOString(),
  purpose: 'real-UI stale-worker cancellation/recovery plus bounded responsiveness measurements',
  url: base,
  committedActionPolicy: 'All committed actions use visible controls through ui-driver; no reducer-injected committed actions.',
  fixtureSetups: [],
  checks: [],
  measurements: [],
  workerRequests: [],
  errors: [],
};
const persist = () => fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2));

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' });
const page = await context.newPage();
const driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(`pageerror: ${error.message}`));
page.on('console', message => { if (message.type() === 'error') receipt.errors.push(`console: ${message.text()}`); });

async function servedBuild() {
  return page.evaluate(async () => {
    const response = await fetch('./precache.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Build identity unavailable (${response.status})`);
    return response.json();
  });
}

async function newGame(mode = 'hotseat', layout = 'B', policy = 'prompt') {
  await page.locator('#new-game').click();
  const dialog = page.locator('#new-dialog');
  await dialog.waitFor({ state: 'visible' });
  await dialog.locator(`input[name="mode"][value="${mode}"]`).check();
  await dialog.locator(`input[name="layout"][value="${layout}"]`).check();
  await dialog.locator(`input[name="draw"][value="${policy}"]`).check();
  await dialog.locator('#practice').check();
  await dialog.locator('#start-game').click();
  await driver.ready();
  await driver.camera('top');
  return driver.observation();
}

async function setQuality(value) {
  await page.locator('#settings').click();
  const dialog = page.locator('#settings-dialog');
  await dialog.waitFor({ state: 'visible' });
  await dialog.locator('[name="quality"]').selectOption(value);
  await dialog.locator('[name="motion"]').setChecked(false);
  await dialog.locator('button[value="apply"]').click();
  await driver.ready();
}

const workerGates = [];
const expectedCancelledWorkers = new Set();
const routeFailures = [];
const settlementFailures = [];
let releaseAllWorkers = false;
const workerRoute = async route => {
  const number = workerGates.length + 1;
  let release;
  let markSettled;
  const gate = {
    number,
    url: new URL(route.request().url()).pathname.split('/').at(-1),
    interceptedAt: new Date().toISOString(),
    release: () => release?.(),
    released: false,
    outcome: 'held',
    settled: new Promise(resolve => { markSettled = resolve; }),
  };
  const hold = new Promise(resolve => { release = resolve; });
  workerGates.push(gate);
  if (releaseAllWorkers) gate.release();
  await hold;
  gate.released = true;
  try {
    await route.continue();
    gate.outcome = 'continued';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (expectedCancelledWorkers.has(gate.number) && message.includes('Route is already handled!')) {
      gate.outcome = 'closed-by-tested-worker-termination';
    } else {
      gate.outcome = 'route-error';
      gate.error = message;
      routeFailures.push({ number: gate.number, message });
    }
  } finally {
    receipt.workerRequests.push({ number: gate.number, url: gate.url, interceptedAt: gate.interceptedAt, released: gate.released, expectedCancellation: expectedCancelledWorkers.has(gate.number), outcome: gate.outcome, error: gate.error ?? null });
    markSettled();
  }
};

async function waitForWorker(number) {
  for (let attempt = 0; attempt < 200 && workerGates.length < number; attempt++) await page.waitForTimeout(50);
  const gate = workerGates[number - 1];
  assert.ok(gate, `Worker request ${number} was not captured`);
  return gate;
}

async function settleWithin(gate, timeout = 10_000) {
  let timer;
  try {
    await Promise.race([
      gate.settled,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Worker request ${gate.number} did not settle within ${timeout}ms`)), timeout); }),
    ]);
  } catch (error) {
    if (!settlementFailures.some(item => item.number === gate.number)) settlementFailures.push({ number: gate.number, message: error.message });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function releaseAndSettle(gate) {
  gate.release();
  await settleWithin(gate);
  if (gate.outcome === 'route-error') throw new Error(`Worker request ${gate.number} route failed: ${gate.error}`);
}

async function measure(name, activity) {
  await driver.ready();
  await page.evaluate(() => window.rift.resetMetrics());
  await activity();
  const metrics = await driver.metrics();
  receipt.measurements.push({ name, metrics });
  await persist();
  return metrics;
}

async function waitForStableIdentity(identity, delay = 2000) {
  await page.waitForTimeout(delay);
  const observation = await driver.observation();
  assert.equal(observation.game_id, identity.game_id);
  assert.equal(observation.revision, identity.revision);
  return observation;
}

try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await driver.enterPlay();
  receipt.build = { start: await servedBuild(), end: null };

  await context.route('**/worker-*.js', workerRoute);

  await newGame('bot-black');
  await driver.perform({ type: 'move', from: 'e2', to: 'e4', promotion: null });
  const undoWorker = await waitForWorker(1);
  expectedCancelledWorkers.add(undoWorker.number);
  await page.locator('#undo').click();
  const afterUndo = await driver.observation();
  assert.equal(afterUndo.position.side, 1, 'Undo must return control to the human side');
  assert.equal((await driver.record()).actions.length, 0, 'Undo must remove the human move');
  await releaseAndSettle(undoWorker);
  await waitForStableIdentity({ game_id: afterUndo.game_id, revision: afterUndo.revision });
  receipt.checks.push({ name: 'undo cancels a held real worker before any stale commit', status: 'pass', workerRequest: undoWorker.number });

  await driver.perform({ type: 'move', from: 'e2', to: 'e4', promotion: null });
  const newGameWorker = await waitForWorker(2);
  expectedCancelledWorkers.add(newGameWorker.number);
  const replacement = await newGame('hotseat', 'C');
  assert.equal(replacement.revision, 0);
  await releaseAndSettle(newGameWorker);
  await waitForStableIdentity({ game_id: replacement.game_id, revision: replacement.revision });
  assert.equal((await driver.record()).actions.length, 0);
  receipt.checks.push({ name: 'new match rejects a held previous-game worker', status: 'pass', workerRequest: newGameWorker.number });

  await newGame('bot-black');
  await driver.perform({ type: 'move', from: 'e2', to: 'e4', promotion: null });
  const offeredWorker = await waitForWorker(3);
  const matchTools = await driver.openDrawer('Match & view');
  expectedCancelledWorkers.add(offeredWorker.number);
  await matchTools.locator('#offer-draw').click();
  assert.match(await page.locator('#notice').innerText(), /local bot declines/i);
  const recoveryWorker = await waitForWorker(4);
  const heldDrawRecord = await driver.record();
  await releaseAndSettle(offeredWorker);
  await page.waitForTimeout(2000);
  assert.deepEqual(await driver.record(), heldDrawRecord, 'Released stale draw worker must not change the record while the fresh worker remains held');
  await releaseAndSettle(recoveryWorker);
  await page.waitForFunction(() => window.rift.exportRecord().actions.length === 2 && !window.rift.metrics().animating, null, { timeout: 30_000 });
  assert.equal((await driver.observation()).position.side, 1, 'Recovered bot reply must return control to the human');
  receipt.checks.push({ name: 'draw decline rejects the stale worker for 2 seconds, then accepts only the fresh worker reply', status: 'pass', staleWorkerRequest: offeredWorker.number, recoveryWorkerRequest: recoveryWorker.number });

  releaseAllWorkers = true;
  for (const gate of workerGates) gate.release();
  await context.unroute('**/worker-*.js');

  await newGame();
  await setQuality('balanced');
  await driver.camera('overview');
  await measure('balanced idle callback intervals, 5 seconds', () => page.waitForTimeout(5000));
  await measure('balanced actual right-drag orbit', async () => {
    const before = await driver.observation();
    const box = await page.locator('#scene').boundingBox();
    assert.ok(box, 'Scene must have a rendered input box');
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down({ button: 'right' });
    for (let index = 0; index < 120; index++) {
      await page.mouse.move(x + Math.sin(index / 12) * 70, y + Math.cos(index / 12) * 35);
      await page.waitForTimeout(16);
    }
    await page.mouse.up({ button: 'right' });
    const after = await driver.observation();
    assert.equal(after.game_id, before.game_id);
    assert.equal(after.revision, before.revision, 'Camera orbit must not commit a game action');
  });

  await setQuality('low');
  await measure('low idle callback intervals, 5 seconds', () => page.waitForTimeout(5000));
  await newGame('bot-black');
  await measure('human move, worker thought and bot animation', async () => {
    await driver.perform({ type: 'move', from: 'e2', to: 'e4', promotion: null });
    await page.waitForFunction(() => window.rift.exportRecord().actions.length === 2 && !window.rift.metrics().animating, null, { timeout: 30_000 });
  });

  await page.setViewportSize({ width: 1266, height: 680 });
  await page.waitForTimeout(300);
  const bounds = await page.locator('#scene').boundingBox();
  assert.ok(bounds && bounds.y + bounds.height <= 680, 'Board is below the 1266x680 CSS viewport emulation');
  receipt.checks.push({ name: 'board remains inside a 1266x680 CSS viewport emulation', status: 'pass', evidenceClass: 'CSS viewport only; not native Windows display-scaling proof', bounds });
  await page.screenshot({ path: path.join(root, 'scaled-window.png'), fullPage: true });

  receipt.build.end = await servedBuild();
  assert.deepEqual(receipt.build.end, receipt.build.start, 'Served build changed during responsiveness gate');
  assert.deepEqual(routeFailures, [], 'Unexpected worker route failures were recorded');
  assert.deepEqual(settlementFailures, [], 'Worker route settlement timeouts were recorded');
  assert.deepEqual(receipt.errors, [], 'Browser errors were recorded');
  receipt.status = 'pass';
} catch (error) {
  receipt.status = 'fail';
  receipt.failure = error.stack;
  process.exitCode = 1;
  console.error(error.message);
  await page.screenshot({ path: path.join(root, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  releaseAllWorkers = true;
  for (const gate of workerGates) gate.release();
  await Promise.allSettled(workerGates.map(gate => settleWithin(gate, 5000)));
  receipt.routeFailures = routeFailures;
  receipt.settlementFailures = settlementFailures;
  if (routeFailures.length || settlementFailures.length) {
    receipt.status = 'fail';
    receipt.failure ??= `Worker route cleanup failed: ${JSON.stringify({ routeFailures, settlementFailures })}`;
    process.exitCode = 1;
  }
  await context.close();
  await browser.close();
  receipt.finished = new Date().toISOString();
  await persist();
  console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks, measurements: receipt.measurements.map(item => item.name), workerRequests: receipt.workerRequests }));
}
