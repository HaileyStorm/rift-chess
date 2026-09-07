import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createUiDriver } from './ui-driver.mjs';

const url = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const viewport = { width: 1600, height: 1000 };
const root = path.resolve('.artifacts/overhaul', process.env.RIFT_TEST_RUN || `startup-${Date.now()}`);
const receiptPath = path.join(root, 'receipt.json');
const receipt = { started: new Date().toISOString(), purpose: 'startup readiness and restored-bot regression checks through the actual UI', checks: [], errors: [] };

try {
  await fs.access(root);
  throw new Error(`Refusing to reuse startup evidence directory: ${root}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await fs.mkdir(root, { recursive: true });

async function persist() {
  await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2));
}

async function servedPrecache(page) {
  return page.evaluate(async () => {
    const response = await fetch('./precache.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`precache unavailable (${response.status})`);
    return response.json();
  });
}

async function waitForRift(page) {
  await page.waitForFunction(() => Boolean(window.rift), null, { timeout: 60_000 });
  return page.evaluate(() => performance.now());
}

async function waitForAssets(page) {
  await waitForRift(page);
  await page.evaluate(() => window.rift.assetsReady());
  await page.waitForFunction(() => !window.rift.metrics().animating, null, { timeout: 60_000 });
}

async function presentation(page) {
  return page.evaluate(() => ({
    mode: document.querySelector('#app')?.getAttribute('data-presentation'),
    launchHidden: document.querySelector('#launch-surface')?.hasAttribute('hidden'),
    metrics: window.rift.metrics(),
  }));
}

async function assertStablePresentation(page, expected, label) {
  await waitForAssets(page);
  await page.waitForTimeout(2800);
  const state = await presentation(page);
  assert.equal(state.mode, expected, `${label}: late startup changed the presentation.`);
  assert.equal(state.launchHidden, expected === 'play', `${label}: launch visibility disagrees with presentation.`);
  return state;
}

function assertPlayCamera(state, destination) {
  assert.equal(state.metrics.cameraTravelling, false);
  assert.equal(state.metrics.cameraTravelDestination, null);
  assert.ok(Math.hypot(...state.metrics.cameraPosition.map((value, index) => value - destination[index])) < .0001, 'Play must settle at its chosen camera endpoint, not a late entrance endpoint');
}

function deferred() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
}

function knownRouteCancellation(error) {
  return /already handled|Target page, context or browser has been closed|Request context disposed/i.test(String(error?.message ?? error));
}

async function newBotMatch(page, driver) {
  await page.locator('#new-game').click();
  const dialog = page.locator('#new-dialog');
  await dialog.waitFor({ state: 'visible' });
  await dialog.locator('input[name="mode"][value="bot-black"]').check();
  await dialog.locator('input[name="layout"][value="B"]').check();
  await dialog.locator('input[name="draw"][value="prompt"]').check();
  await dialog.locator('#start-game').click();
  await driver.ready();
  await driver.camera('top');
}

function observePage(page, label) {
  page.on('pageerror', error => receipt.errors.push(`${label}: pageerror: ${error.message}`));
  page.on('console', message => {
    const expectedSeedCancellation = allowingSeedWorkerCancellation && /worker-.*ERR_BLOCKED_BY_CLIENT|ERR_BLOCKED_BY_CLIENT.*worker-/i.test(message.text());
    if (message.type() === 'error' && !expectedSeedCancellation) receipt.errors.push(`${label}: console: ${message.text()}`);
  });
}

async function waitFor(condition, message, attempts = 200) {
  for (let attempt = 0; attempt < attempts && !condition(); attempt++) await new Promise(resolve => setTimeout(resolve, 50));
  assert.ok(condition(), message);
}

async function waitForRelease(promise, message, timeout = 10_000) {
  let timer;
  try {
    await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), timeout); })]);
  } finally {
    clearTimeout(timer);
  }
}

let browser = null;
let persistent = null;
let seedGate = null;
let stoneGate = null;
let allowingSeedWorkerCancellation = false;

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
  const exerciseEarlyChoice = async (name, action, expected = 'play') => {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    const page = await context.newPage();
    observePage(page, `early-${name}`);
    const texture = deferred();
    let held = false;
    await context.route('**/assets/marble-albedo.png*', async route => { held = true; await texture.promise; await route.continue(); });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      const bootstrapMs = await waitForRift(page);
      const build = await servedPrecache(page);
      if (!receipt.build) receipt.build = { start: build, end: null };
      assert.deepEqual(build, receipt.build.start);
      assert.ok(held, 'The texture must be held to prove this is a pre-readiness choice');
      assert.ok(await page.locator('#startup').isVisible());
      await action(page);
      const choice = await presentation(page);
      assert.equal(choice.mode, expected);
      const chosenEndpoint = choice.metrics.cameraTravelDestination ?? choice.metrics.cameraPosition;
      texture.release();
      const state = await assertStablePresentation(page, expected, `early ${name}`);
      if (expected === 'play') assertPlayCamera(state, chosenEndpoint);
      if (name === 'explore') {
        await page.locator('#launch-return').click();
        const returned = await presentation(page), endpoint = returned.metrics.cameraTravelDestination ?? returned.metrics.cameraPosition;
        assertPlayCamera(await assertStablePresentation(page, 'play', 'return after early explore'), endpoint);
      }
      assert.deepEqual(await servedPrecache(page), receipt.build.start);
      receipt.checks.push({ name: `early-${name}`, bootstrapMs, textureHeldBeforeChoice: held, presentation: state.mode, cameraTravelling: state.metrics.cameraTravelling, chosenEndpoint, settledCamera: state.metrics.cameraPosition });
      await persist();
    } finally {
      texture.release();
      await context.close();
    }
  };

  await exerciseEarlyChoice('skip', page => page.locator('#launch-skip').click());
  await exerciseEarlyChoice('resume', page => page.locator('#launch-resume').click());
  await exerciseEarlyChoice('new', async page => {
    await page.locator('#launch-new').click();
    const dialog = page.locator('#new-dialog');
    await dialog.waitFor({ state: 'visible' });
    await dialog.locator('input[name="layout"][value="B"]').check();
    await dialog.locator('#start-game').click();
  });
  await exerciseEarlyChoice('explore', page => page.locator('#launch-explore').click(), 'explore');

  const entranceContext = await browser.newContext({ viewport, serviceWorkers: 'block' });
  const entrancePage = await entranceContext.newPage();
  observePage(entrancePage, 'fresh-entrance');
  try {
    await entrancePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await waitForRift(entrancePage);
    await entrancePage.evaluate(() => window.rift.assetsReady());
    assert.deepEqual(await servedPrecache(entrancePage), receipt.build.start);
    await entrancePage.waitForFunction(() => window.rift.metrics().cameraTravelling, null, { timeout: 10_000 });
    const state = await presentation(entrancePage);
    assert.equal(state.mode, 'launch', 'The untouched fresh table must remain at the launch presentation.');
    receipt.checks.push({ name: 'fresh-entrance-after-first-draw', metrics: state.metrics });
    await persist();
  } finally {
    await entranceContext.close();
  }

  const reducedContext = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const reducedPage = await reducedContext.newPage();
  observePage(reducedPage, 'reduced-motion');
  try {
    await reducedPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await waitForAssets(reducedPage);
    assert.deepEqual(await servedPrecache(reducedPage), receipt.build.start);
    const state = await presentation(reducedPage);
    const osReduced = await reducedPage.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    assert.ok(osReduced, 'The fresh context must expose OS reduced motion.');
    assert.equal(state.metrics.reducedMotion, true, 'OS reduced motion must configure the fresh table.');
    assert.equal(state.metrics.cameraTravelling, false, 'Reduced motion must bypass the launch camera travel.');
    assert.equal(state.metrics.cameraTravelDestination, null, 'Reduced motion must not retain a queued camera destination.');
    receipt.checks.push({ name: 'os-reduced-motion-fresh-start', metrics: state.metrics });
    await persist();
  } finally {
    await reducedContext.close();
  }
  await browser.close(); browser = null;

  const profile = path.join(root, 'profile');
  persistent = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'], viewport, serviceWorkers: 'block' });
  const page = persistent.pages()[0] || await persistent.newPage();
  observePage(page, 'restored-bot');
  let workerMode = 'seed', seedWorkers = 0, reloadWorkers = 0, stoneRequests = 0;
  const seedRouteDone = deferred();
  seedGate = deferred();
  stoneGate = deferred();
  const routeFailures = [];
  const workerRoute = async route => {
    try {
      if (workerMode === 'seed') {
        seedWorkers++;
        await seedGate.promise;
        await route.abort('blockedbyclient');
        seedRouteDone.release();
      } else {
        reloadWorkers++;
        await route.continue();
      }
    } catch (error) {
      if (!knownRouteCancellation(error)) routeFailures.push(`worker: ${error.message}`);
      if (workerMode === 'seed') seedRouteDone.release();
    }
  };
  const stoneRoute = async route => {
    try {
      stoneRequests++;
      await stoneGate.promise;
      await route.continue();
    } catch (error) {
      if (!knownRouteCancellation(error)) routeFailures.push(`stone: ${error.message}`);
    }
  };
  await persistent.route('**/worker-*.js', workerRoute);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const bootstrapMs = await waitForRift(page);
    const driver = createUiDriver(page);
    await driver.enterPlay();
    assert.deepEqual(await servedPrecache(page), receipt.build.start); receipt.build.restoredBotBootstrapMs = bootstrapMs;
    await newBotMatch(page, driver);
    await driver.perform({ type: 'move', from: 'e2', to: 'e4', promotion: null });
    await page.waitForFunction(() => window.rift.getObservation().revision === 1 && window.rift.getObservation().position.side === -1);
    await waitFor(() => seedWorkers === 1, 'Expected one held worker request after the real e2-to-e4 move.');
    const savedBotTurn = await driver.record();
    assert.equal(savedBotTurn.actions.length, 1, 'The persisted record must stop before the bot reply.');
    allowingSeedWorkerCancellation = true;
    seedGate.release();
    await waitForRelease(seedRouteDone.promise, 'Held seed worker did not settle after bounded release.');
    workerMode = 'reload';
    await persistent.route('**/assets/marble-albedo.png*', stoneRoute);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await waitForRift(page);
    allowingSeedWorkerCancellation = false;
    await waitFor(() => stoneRequests === 1, 'The reload must hold the stone texture before assets become ready.');
    assert.deepEqual(await driver.record(), savedBotTurn, 'Reload must restore the saved bot-to-move record before assets are ready.');
    await page.waitForTimeout(250);
    assert.equal(reloadWorkers, 0, 'No restored bot worker may start before assets are ready.');
    stoneGate.release();
    await waitForAssets(page);
    await waitFor(() => reloadWorkers === 1, 'Exactly one fresh bot worker must start after assets are ready.');
    await page.waitForFunction(() => window.rift.exportRecord().actions.length === 2 && !window.rift.metrics().animating, null, { timeout: 120_000 });
    assert.equal(reloadWorkers, 1, 'The restored bot may reply once, not start duplicate workers.');
    assert.equal((await driver.record()).actions.length, 2, 'The fresh worker must deliver one real bot reply.');
    receipt.build.end = await servedPrecache(page);
    assert.deepEqual(receipt.build.end, receipt.build.start, 'Served precache changed during startup regression checks.');
    assert.deepEqual(routeFailures, [], 'Only bounded expected route cancellation is allowed.');
    receipt.checks.push({ name: 'restored-bot-waits-for-assets', seedWorkers, reloadWorkers, stoneRequests });
    await persist();
  } finally {
    allowingSeedWorkerCancellation = false;
    seedGate?.release();
    stoneGate?.release();
    await persistent.unroute('**/worker-*.js', workerRoute).catch(() => {});
    await persistent.unroute('**/assets/marble-albedo.png*', stoneRoute).catch(() => {});
  }
  assert.deepEqual(receipt.errors, []);
  receipt.status = 'PASS';
} catch (error) {
  receipt.status = 'FAILED';
  receipt.failure = error instanceof Error ? error.stack : String(error);
  process.exitCode = 1;
  console.error(error);
} finally {
  seedGate?.release();
  stoneGate?.release();
  if (persistent) await persistent.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  receipt.finished = new Date().toISOString();
  await persist();
  console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks.length, errors: receipt.errors.length, output: root }));
}
