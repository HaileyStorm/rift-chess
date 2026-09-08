/**
 * Remaining overhaul detail, state, and accessibility capture gate.
 * Structural assertions may fail the run; successful capture is not an aesthetic verdict.
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const runName = process.env.RIFT_TEST_RUN || `visual-detail-state-${Date.now()}`;
const root = path.resolve('.artifacts', 'overhaul', runName);
try {
  await fs.access(root);
  throw new Error(`Refusing to reuse existing capture directory: ${root}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await fs.mkdir(root, { recursive: true });

const conformance = JSON.parse(await fs.readFile('fixtures/conformance.json', 'utf8'));
const fixture = name => {
  const value = conformance.fixtures.find(item => item.name === name);
  assert.ok(value, `Missing fixture: ${name}`);
  return value;
};
const receiptPath = path.join(root, 'receipt.json');
const receipt = {
  started: new Date().toISOString(),
  classification: 'bounded rendered capture and structural checks; human visual review is required',
  aestheticVerdict: 'NOT_EVALUATED',
  captures: [],
  structuralChecks: [],
  errors: [],
};
const persist = () => fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2));

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' });
const page = await context.newPage();
const driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(`pageerror: ${error.message}`));
page.on('console', message => { if (message.type() === 'error') receipt.errors.push(`console: ${message.text()}`); });

async function buildIdentity() {
  return page.evaluate(async () => {
    const response = await fetch('./precache.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Build identity unavailable (${response.status})`);
    return response.json();
  });
}

async function settings(values) {
  await page.locator('#settings').click();
  const dialog = page.locator('#settings-dialog');
  await dialog.waitFor({ state: 'visible' });
  for (const [name, value] of Object.entries(values)) {
    const input = dialog.locator(`[name="${name}"]`);
    if (typeof value === 'boolean') await input.setChecked(value);
    else await input.selectOption(value);
  }
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
  await driver.ready();
}

async function newMatch() {
  await page.locator('#new-game').click();
  const dialog = page.locator('#new-dialog');
  await dialog.waitFor({ state: 'visible' });
  await dialog.locator('input[name="mode"][value="hotseat"]').check();
  await dialog.locator('input[name="layout"][value="B"]').check();
  await dialog.locator('input[name="draw"][value="prompt"]').check();
  await dialog.locator('#practice').check();
  await dialog.locator('#start-game').click();
  await driver.ready();
}

async function capture(name, { fullPage = false, note = null } = {}) {
  await page.waitForTimeout(250);
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(root, file), fullPage });
  const layout = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    activeElement: document.activeElement?.id || document.activeElement?.tagName || null,
    selection: document.querySelector('#selection')?.textContent || null,
    selectionDetail: document.querySelector('#selection-detail')?.textContent || null,
    check: document.querySelector('#check')?.textContent || null,
  }));
  assert.ok(layout.document.width <= layout.viewport.width + 1, `${name}: horizontal overflow`);
  receipt.captures.push({ name, file, note, fullPage, layout, metrics: await driver.metrics() });
  await persist();
  console.log(`Captured ${name}`);
}

async function setNearDistance(distance = 7) {
  await driver.camera('overview');
  const before = await driver.metrics();
  await page.evaluate(({ target, current }) => window.rift.orbit(-0.22, 0.12, target - current), { target: distance, current: before.cameraDistance });
  const after = await driver.metrics();
  assert.ok(Math.abs(after.cameraDistance - distance) <= 0.15, `Expected near camera distance ${distance}, got ${after.cameraDistance}`);
  return after.cameraDistance;
}

async function captureQualityBaselines() {
  await newMatch();
  for (const quality of ['low', 'balanced', 'high']) {
    await settings({ theme: 'gallery', family: 'classic', material: 'ceramic', quality, motion: false, contrast: false });
    await driver.camera('overview');
    await capture(`initial-full-scene-${quality}`, { note: `Initial B-rift full scene at ${quality} quality` });
  }
  await settings({ quality: 'balanced', motion: false, contrast: true });
  await driver.camera('overview');
  await capture('initial-full-scene-high-contrast', { note: 'High contrast is a visual sample, not a contrast-ratio certification' });
  await settings({ quality: 'low', motion: true, contrast: false });
  await driver.camera('overview');
  await capture('initial-full-scene-reduced-motion', { note: 'Reduced-motion rendered state; motion timing is covered separately' });
}

async function captureLoadedShiftDetail() {
  await settings({ theme: 'gallery', family: 'classic', material: 'ceramic', quality: 'high', motion: true, contrast: true });
  const learn = await driver.openDrawer('Learn the rift');
  await learn.locator('[data-tutorial="loadedShift"]').click();
  await driver.ready();
  const distance = await setNearDistance(7);
  const action = await page.evaluate(() => window.rift.getLegalActions().find(item => item.type === 'shift' && item.from === 'B3' && item.to === 'B4' && item.promotion === 'N'));
  assert.ok(action, 'Loaded-Shift tutorial is missing the expected B3 to B4 underpromotion');
  const before = await driver.observation();
  const beforeRecord = await driver.record();

  await driver.square('c6');
  await page.locator('#shift-passenger').waitFor({ state: 'visible' });
  assert.equal((await driver.observation()).revision, before.revision, 'Passenger selection must not commit');
  await capture('detail-distance-7-loaded-passenger-selected', {
    note: `Actual tutorial passenger click, camera distance ${distance.toFixed(2)}; inspect grounding, seams, cavity, and board corners`,
  });

  await page.locator('#shift-passenger').click();
  await driver.hover(driver.macroSquare(action.to));
  await page.waitForFunction(tile => window.rift.metrics().shiftPreview === tile, (Number(action.to[1]) - 1) * 4 + action.to.charCodeAt(0) - 65);
  assert.equal((await driver.observation()).revision, before.revision, 'Rendered Shift hover preview must remain uncommitted');
  assert.deepEqual(await driver.record(), beforeRecord, 'Rendered Shift hover preview must preserve the record');
  receipt.structuralChecks.push('Loaded Shift hover previews the full legal destination without committing it.');
  await capture('detail-distance-7-loaded-shift-preview', {
    note: 'Inspect passenger seating, selected platform, destination cavity, macro-tile seams, bevels, and near frame corners',
  });
  await page.evaluate(() => window.rift.orbit(0.38, 0.08, 0));
  assert.ok(Math.abs((await driver.metrics()).cameraDistance - 7) <= 0.15, 'Detail orbit changed the required near distance');
  await capture('detail-distance-7-cavity-seams-corners', {
    note: 'Alternate near angle for cavity depth, internal square boundaries, macro seams, and frame-corner finish',
  });
  await driver.square(driver.macroSquare(action.to));
  const promotion = page.locator('#promotion-dialog');
  await promotion.waitFor({ state: 'visible' });
  assert.equal((await driver.observation()).revision, before.revision, 'Promotion dialog must remain uncommitted before a choice');
  await page.keyboard.press('Escape');
  await promotion.waitFor({ state: 'hidden' });
  assert.equal((await driver.observation()).revision, before.revision, 'Promotion Escape must preserve the revision');
  assert.deepEqual(await driver.record(), beforeRecord, 'Promotion Escape must preserve the record');
}

async function captureCheckAndModalStates() {
  await driver.loadScenario(fixture('cut_check_ray').record);
  await settings({ theme: 'nocturne', family: 'faceted', material: 'metal', quality: 'balanced', motion: true, contrast: true });
  await driver.camera('overview');
  const check = page.locator('#check');
  assert.match(await check.innerText(), /is in check/i, 'Check fixture must have a textual check label');
  assert.equal(await check.getAttribute('aria-live'), 'polite');
  receipt.structuralChecks.push('Check uses visible text and an aria-live status in addition to danger styling.');
  await capture('state-check-labeled-high-contrast', {
    note: 'Labeled cut_check_ray fixture; inspect check readability without relying on color alone',
  });

  await newMatch();
  const gameId = (await driver.observation()).game_id;
  await page.locator('#new-game').focus();
  await page.locator('#new-game').click();
  await page.locator('#new-dialog').waitFor({ state: 'visible' });
  await capture('state-new-match-modal-keyboard', { note: 'Modal before keyboard Escape and focus-return check' });
  await page.keyboard.press('Escape');
  await page.locator('#new-dialog').waitFor({ state: 'hidden' });
  assert.equal((await driver.observation()).game_id, gameId, 'Escape must preserve the live match');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'new-game', 'Focus must return to the New match opener');
  receipt.structuralChecks.push('New-match modal closes with Escape, preserves the match, and returns focus to its opener.');
  await capture('state-modal-escape-focus-return', { note: 'Keyboard Escape closed the dialog; inspect the returned focus indicator on New match' });
}

async function captureResponsiveStates() {
  await settings({ theme: 'daylight', family: 'classic', material: 'wood', quality: 'low', motion: true, contrast: true });
  await driver.camera('overview');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('responsive-390x844-high-contrast-reduced-motion', {
    fullPage: true,
    note: 'Emulated narrow viewport; inspect board, active side, action dock, focus styling, and reachable drawers',
  });
  assert.equal(await page.locator('#settings').isVisible(), true, 'Atelier must remain reachable at 390x844');

  await page.setViewportSize({ width: 1024, height: 768 });
  await capture('responsive-1024x768-tablet-high-contrast-reduced-motion', {
    fullPage: true,
    note: 'Emulated tablet landscape; inspect board dominance, utility deck, and control reachability',
  });
  assert.equal(await page.locator('#scene').isVisible(), true, 'Board must remain visible at tablet landscape size');
  receipt.structuralChecks.push('390x844 and 1024x768 are emulated CSS viewports, not physical-device evidence.');
}

async function exerciseWarmMemoryCycles() {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const cases = [
    { id: 'gallery-classic-ceramic', theme: 'gallery', family: 'classic', material: 'ceramic' },
    { id: 'gallery-faceted-metal', theme: 'gallery', family: 'faceted', material: 'metal' },
    { id: 'nocturne-classic-wood', theme: 'nocturne', family: 'classic', material: 'wood' },
    { id: 'nocturne-faceted-ceramic', theme: 'nocturne', family: 'faceted', material: 'ceramic' },
    { id: 'daylight-classic-metal', theme: 'daylight', family: 'classic', material: 'metal' },
    { id: 'daylight-faceted-wood', theme: 'daylight', family: 'faceted', material: 'wood' },
  ];
  const applyCase = async item => {
    const { id: _id, ...appearance } = item;
    await settings({ ...appearance, quality: 'low', motion: true, contrast: false });
    await newMatch();
    await driver.camera('overview');
    return driver.metrics();
  };

  receipt.memoryGate = {
    classification: 'bounded warm-cache comparison, not a proof of lifetime memory bounds',
    cases,
    warmup: [],
    baseline: {},
    samples: [],
    allowances: { geometries: 12, textures: 2 },
  };
  for (const item of cases) {
    const metrics = await applyCase(item);
    receipt.memoryGate.warmup.push({ id: item.id, memory: metrics.memory });
  }
  for (const item of cases) {
    const metrics = await applyCase(item);
    receipt.memoryGate.baseline[item.id] = metrics.memory;
  }
  for (let round = 1; round <= 2; round++) {
    for (const item of cases) {
      const metrics = await applyCase(item);
      const baseline = receipt.memoryGate.baseline[item.id];
      assert.ok(metrics.memory.geometries <= baseline.geometries + receipt.memoryGate.allowances.geometries,
        `${item.id} round ${round}: geometry count grew beyond the warm baseline allowance`);
      assert.ok(metrics.memory.textures <= baseline.textures + receipt.memoryGate.allowances.textures,
        `${item.id} round ${round}: texture count grew beyond the warm baseline allowance`);
      receipt.memoryGate.samples.push({ round, id: item.id, memory: metrics.memory });
    }
    await persist();
  }
  receipt.structuralChecks.push('Every measured memory case was exercised in a warm-up pass and a like-for-like baseline pass before two comparison rounds.');
}

try {
  await page.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await driver.enterPlay();
  receipt.build = { start: await buildIdentity(), end: null };
  await captureQualityBaselines();
  await captureLoadedShiftDetail();
  await captureCheckAndModalStates();
  await captureResponsiveStates();
  await exerciseWarmMemoryCycles();
  receipt.build.end = await buildIdentity();
  assert.deepEqual(receipt.build.end, receipt.build.start, 'Served build identity changed during capture');
  assert.deepEqual(receipt.errors, [], 'Browser errors were recorded');
  receipt.status = 'CAPTURED_REQUIRES_HUMAN_VISUAL_REVIEW';
} catch (error) {
  receipt.status = 'FAILED';
  receipt.failure = error.stack;
  process.exitCode = 1;
  console.error(error.message);
  await page.screenshot({ path: path.join(root, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  receipt.finished = new Date().toISOString();
  await persist();
  await context.close();
  await browser.close();
}
