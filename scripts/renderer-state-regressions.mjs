/** Bounded renderer-state probes. configureAppearance calls are labelled API stress, never gameplay commits. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const root = path.resolve('.artifacts', 'renderer-state-regressions', process.env.RIFT_TEST_RUN || 'prepared');
const receiptPath = path.join(root, 'receipt.json');
async function prepareOutput() {
  try { await fs.access(receiptPath); throw new Error(`Refusing to overwrite renderer-state evidence: ${root}`); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  try { if ((await fs.readdir(root)).length) throw new Error(`Refusing non-empty renderer-state evidence directory: ${root}`); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  await fs.mkdir(root, { recursive: true });
}
await prepareOutput();
const receipt = { started: new Date().toISOString(), purpose: 'bounded renderer-state regressions; configureAppearance is explicit renderer-API stress only', url: base, checks: [], probes: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' });
const page = await context.newPage(), driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
async function persist() { await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2)); }
async function servedPrecache() { return page.evaluate(async () => { const response = await fetch('./precache.json', { cache: 'no-store' }); if (!response.ok) throw new Error(`precache unavailable (${response.status})`); return response.json(); }); }
const distance = (left, right) => Math.hypot(...left.map((value, index) => value - right[index]));
async function probe(label, appearance) {
  const before = await driver.metrics();
  const states = await page.evaluate(async value => { window.rift.configureAppearance(value); const immediate = window.rift.metrics(); await window.rift.assetsReady(); return { immediate, settled: window.rift.metrics() }; }, appearance);
  const entry = { label, appearance, before, immediate: states.immediate, settled: states.settled, evidence: 'renderer API stress probe; no game action dispatched' }; receipt.probes.push(entry); await persist(); return entry;
}
async function openLoadedTutorial() {
  const learn = page.locator('details.drawer').filter({ has: page.locator('[data-tutorial="loadedShift"]') }); if (!await learn.evaluate(element => element.open)) await learn.locator('summary').click();
  await page.locator('[data-tutorial="loadedShift"]').click(); await driver.ready(); await driver.camera('top');
}
async function selectLoadedTile() {
  await driver.square('c6'); await page.locator('#shift-passenger').click();
  await page.waitForFunction(() => window.rift.metrics().selectedTile !== null && window.rift.metrics().maxTileLift > .01);
}
async function newMatch() {
  await page.locator('#new-game').click(); const dialog = page.locator('#new-dialog'); await dialog.waitFor({ state: 'visible' }); await dialog.locator('input[name="layout"][value="B"]').check(); await dialog.locator('#start-game').click(); await driver.ready(); await driver.camera('top');
}
async function test(name, run) { try { await run(); receipt.checks.push({ name, status: 'pass' }); } catch (error) { receipt.checks.push({ name, status: 'fail', error: error.message }); throw error; } finally { await persist(); } }

try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.enterPlay(); receipt.build = await servedPrecache();
  await test('real UI selected tile snaps its lift immediately under reduced-motion renderer stress', async () => {
    await probe('enable-motion-before-real-ui-selection', { reducedMotion: false }); await openLoadedTutorial(); await selectLoadedTile();
    const snap = await probe('reduced-motion-with-selected-loaded-tile', { reducedMotion: true }); assert.ok(snap.before.maxTileLift > .01); assert.equal(snap.immediate.reducedMotion, true); assert.equal(snap.immediate.maxTileLift, 0); assert.equal(snap.settled.pendingSceneReadiness, 0); assert.ok(snap.settled.renderedFrames > snap.before.renderedFrames);
  });
  await test('near angled hole input selects B4 instead of the A4 undercarriage behind it', async () => {
    await driver.camera('overview');
    await page.evaluate(() => window.rift.orbit(-.22, .12, 7 - window.rift.metrics().cameraDistance));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const before = await driver.observation(); assert.equal((await driver.metrics()).selectedTile, 9);
    await driver.square(driver.macroSquare('B4'));
    await page.locator('#confirm-shift').waitFor({ state: 'visible' });
    assert.match(await page.locator('#selection').innerText(), /Preview Shift B3.*B4/);
    assert.equal((await driver.observation()).revision, before.revision);
    await page.screenshot({ path: path.join(root, 'near-hole-preview.png') });
    await page.locator('#confirm-shift').click(); await page.locator('#promotion-dialog button[value="N"]').click(); await driver.ready();
    assert.equal((await driver.observation()).revision, before.revision + 1); assert.equal((await driver.observation()).position.board[58], 2);
    receipt.probes.push({ label: 'near-hole-input', evidence: 'Same camera, tutorial position and actual canvas destination click as the failed close-up capture; promotion committed through visible UI.', metrics: await driver.metrics() });
  });
  await test('actual Explore/Return travel snaps to its recorded destination under renderer stress', async () => {
    await probe('restore-motion-before-explore', { reducedMotion: false }); await driver.openDrawer('Match & view'); await page.locator('#explore-table').click(); await page.locator('#launch-return').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      window.__cameraSnapProbe = new Promise((resolve, reject) => {
        const observe = event => {
          if (!(event.target instanceof Element) || !event.target.closest('#launch-return')) return;
          document.removeEventListener('click', observe);
          const before = window.rift.metrics();
          try {
            window.rift.configureAppearance({ reducedMotion: true }); const immediate = window.rift.metrics();
            window.rift.assetsReady().then(() => resolve({ before, immediate, settled: window.rift.metrics() }), reject);
          } catch (error) { reject(error); }
        };
        document.addEventListener('click', observe);
      });
    });
    await page.locator('#launch-return').click();
    const snap = await page.evaluate(() => window.__cameraSnapProbe);
    receipt.probes.push({ label: 'reduced-motion-during-return-travel', evidence: 'Actual Return click followed by a labelled renderer-API change in the same event, after the product handler.', ...snap });
    assert.ok(snap.before.cameraTravelling); assert.ok(snap.before.cameraTravelDestination);
    assert.equal(snap.immediate.cameraTravelling, false); assert.ok(distance(snap.immediate.cameraPosition, snap.before.cameraTravelDestination) < .001);
    assert.ok(snap.settled.renderedFrames > snap.before.renderedFrames); assert.equal(snap.settled.cameraTravelling, false); assert.ok(distance(snap.settled.cameraPosition, snap.before.cameraTravelDestination) < .001, 'Camera resumed travel after the snap');
  });
  await test('rapid A-B-C renderer changes settle all readiness promises before a real UI move', async () => {
    const stress = await page.evaluate(async () => {
      const configurations = [
        { theme: 'gallery', family: 'classic', material: 'ceramic', quality: 'low', reducedMotion: true },
        { theme: 'nocturne', family: 'faceted', material: 'metal', quality: 'balanced', reducedMotion: false },
        { theme: 'daylight', family: 'classic', material: 'wood', quality: 'high', reducedMotion: false },
      ];
      const promises = configurations.map(configuration => { window.rift.configureAppearance(configuration); return window.rift.assetsReady(); });
      const results = await Promise.allSettled(promises); return { results: results.map(result => result.status), metrics: window.rift.metrics() };
    });
    receipt.probes.push({ label: 'rapid-A-B-C', evidence: 'renderer API stress probe; no game action dispatched', ...stress }); assert.deepEqual(stress.results, ['fulfilled', 'fulfilled', 'fulfilled']); assert.equal(stress.metrics.pendingSceneReadiness, 0); assert.equal(stress.metrics.quality, 'high');
    await newMatch(); await driver.perform({ type: 'move', from: 'e2', to: 'e4', promotion: null }); assert.equal((await driver.observation()).revision, 1); await page.locator('#settings').click(); const settings = page.locator('#settings-dialog'); assert.equal(await settings.locator('[name="theme"]').inputValue(), 'daylight'); assert.equal(await settings.locator('[name="family"]').inputValue(), 'classic'); assert.equal(await settings.locator('[name="material"]').inputValue(), 'wood'); assert.equal(await settings.locator('[name="quality"]').inputValue(), 'high'); await page.keyboard.press('Escape');
  });
  await test('check pulse stops on reduced motion and future checks retain only the static cue', async () => {
    const board = Array(64).fill(0); board[0] = 6; board[63] = -6; board[27] = 4;
    const fixture = { board, holes: 144, side: 1, castling: 0, ep_target: -1, ep_pawn: -1, halfmove: 0, fullmove: 1 };
    await probe('check-event-motion-enabled', { reducedMotion: false }); await driver.loadScenario(fixture);
    await page.evaluate(() => {
      window.__checkPulseSnap = new Promise((resolve, reject) => {
        const deadline = performance.now() + 10000;
        function observe() {
          const before = window.rift.metrics();
          if (before.checkPulseActive) {
            const record = window.rift.exportRecord();
            window.rift.configureAppearance({ reducedMotion: true });
            const immediate = window.rift.metrics();
            window.rift.assetsReady().then(() => resolve({ before, immediate, record, afterRecord: window.rift.exportRecord() }), reject);
          } else if (performance.now() > deadline) reject(new Error('No active check pulse observed after the real checking move'));
          else requestAnimationFrame(observe);
        }
        requestAnimationFrame(observe);
      });
    });
    await driver.perform({ type: 'move', from: 'd4', to: 'd8', promotion: null });
    const snap = await page.evaluate(() => window.__checkPulseSnap);
    assert.equal(snap.before.checkPulseActive, true); assert.equal(snap.immediate.checkPulseActive, false); assert.deepEqual(snap.afterRecord, snap.record);
    await driver.loadScenario(fixture); await driver.perform({ type: 'move', from: 'd4', to: 'd8', promotion: null });
    assert.equal((await driver.metrics()).checkPulseActive, false); assert.match(await page.locator('#check').innerText(), /Black is in check/);
    await page.screenshot({ path: path.join(root, 'reduced-motion-check.png') });
    receipt.probes.push({ label: 'check-pulse-reduced-motion', evidence: 'Labelled sparse fixture setup; both checking moves use actual rendered clicks. Renderer API stress disables reduced-motion travel during an observed active pulse.', snap });
  });
  receipt.finalBuild = await servedPrecache(); assert.deepEqual(receipt.finalBuild, receipt.build); assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (error) { receipt.status = 'fail'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message); await page.screenshot({ path: path.join(root, 'failure.png') }).catch(() => {}); }
finally { receipt.finished = new Date().toISOString(); await persist(); await context.close(); await browser.close(); console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks })); }
