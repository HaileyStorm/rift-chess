import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const root = path.resolve('.artifacts', 'overhaul', process.env.RIFT_TEST_RUN || `shift-edge-review-${Date.now()}`);
try { await fs.access(root); throw new Error(`Refusing to reuse output directory: ${root}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
await fs.mkdir(root, { recursive: true });
const fixtures = JSON.parse(await fs.readFile('fixtures/conformance.json', 'utf8')).fixtures;
const receipt = { started: new Date().toISOString(), purpose: 'real-UI legal-shift edge review; captures require visual inspection', url: base, checks: [], captures: [], samples: [], errors: [] };
let browser, context, page;
const persist = () => fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2));
const macro = name => (Number(name[1]) - 1) * 4 + name.charCodeAt(0) - 65;
const tileName = tile => typeof tile === 'number' ? String.fromCharCode(65 + tile % 4) + (Math.floor(tile / 4) + 1) : tile;
const pair = (from, to) => `${tileName(from)}>${tileName(to)}`;
const unique = values => [...new Set(values)].sort();
const fixture = name => { const value = fixtures.find(item => item.name === name); assert.ok(value, `Missing ${name} fixture`); return value; };
const sparseTwoDirection = { board: Array(64).fill(0), holes: (1 << 5) | (1 << 10), side: 1, castling: 0, ep_target: -1, ep_pawn: -1, halfmove: 0, fullmove: 1 };
sparseTwoDirection.board[0] = 6; sparseTwoDirection.board[63] = -6; sparseTwoDirection.board[20] = 2;

function tilePoint(tile) { return [tile % 4 * 2 - 3, 3 - Math.floor(tile / 4) * 2]; }
function boundary(edge) {
  const [fromX, fromZ] = tilePoint(edge.from), [toX, toZ] = tilePoint(edge.to);
  assert.ok(Math.hypot(edge.position[0] - (fromX + toX) / 2, edge.position[2] - (fromZ + toZ) / 2) < .06, `${pair(edge.from, edge.to)} edge must sit on its shared boundary`);
}

async function capture(name, driver) {
  await page.screenshot({ path: path.join(root, `${name}.png`) });
  receipt.captures.push({ name, metrics: await driver.metrics(), timestamp: new Date().toISOString() });
}
async function legalPairs() { return page.evaluate(() => [...new Set(window.rift.getLegalActions().filter(action => action.type === 'shift').map(action => `${action.from}>${action.to}`))].sort()); }
async function expectEdges(driver, expected, selected = null, label = '') {
  const metrics = await driver.metrics(); assert.ok(Array.isArray(metrics.shiftEdges), 'Renderer metrics must expose actual shift edge meshes');
  const edges = metrics.shiftEdges;
  assert.deepEqual(unique(edges.map(edge => pair(edge.from, edge.to))), expected, `${label} must render exactly the legal edges`);
  assert.equal(edges.length, expected.length, `${label} must not duplicate promotion variants`);
  for (const edge of edges) {
    const active = selected === edge.from;
    assert.equal(edge.selected, active, `${pair(edge.from, edge.to)} selected state`); boundary(edge);
    assert.ok(Math.abs(edge.position[1] - (active && !metrics.reducedMotion ? .16 : .052)) < .001, `${pair(edge.from, edge.to)} edge height`);
    assert.equal(edge.width, active ? .10 : .075, `${pair(edge.from, edge.to)} edge strength`);
    assert.ok(Number.isFinite(edge.screen?.x) && Number.isFinite(edge.screen?.y), `${pair(edge.from, edge.to)} needs an actual mesh projection`);
  }
  receipt.samples.push({ label, metrics });
}
async function expectPreview(driver, expected, label) {
  const metrics = await driver.metrics(); assert.equal(metrics.shiftPreview, expected, `${label} preview hole`);
  receipt.samples.push({ label, metrics });
}
async function selectSource(driver, from) {
  await page.locator('#shift-mode').click(); await driver.square(driver.macroSquare(from));
  await page.waitForFunction(tile => window.rift.metrics().selectedTile === tile, macro(from));
}
async function clickEdge(driver, from, to) {
  await page.locator('#move-mode').click(); assert.equal((await driver.metrics()).shiftMode, false, 'A lit edge must be discoverable from ordinary Move intent');
  const before = await driver.observation(), record = await driver.record();
  const edge = (await driver.metrics()).shiftEdges.find(item => item.from === from && item.to === to);
  assert.ok(edge?.screen, `Missing projected ${pair(from, to)} edge`); await page.mouse.click(edge.screen.x, edge.screen.y);
  await page.waitForFunction(tile => window.rift.metrics().selectedTile === tile, from);
  const metrics = await driver.metrics(); assert.equal(metrics.shiftMode, true); assert.equal(metrics.selectedTile, from); assert.equal((await driver.observation()).revision, before.revision); assert.deepEqual(await driver.record(), record);
}
async function setTheme(driver, theme) {
  await page.locator('#settings').click(); const dialog = page.locator('#settings-dialog');
  await dialog.locator('select[name="theme"]').selectOption(theme); await dialog.locator('button[value="apply"]').click(); await driver.ready();
}
async function check(name, run) {
  try { await run(); receipt.checks.push({ name, status: 'pass' }); }
  catch (error) { receipt.checks.push({ name, status: 'fail', error: error.message }); throw error; }
  finally { await persist(); }
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
  context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' });
  page = await context.newPage(); const driver = createUiDriver(page);
  page.on('pageerror', error => receipt.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.enterPlay();
  const servedBuild = () => page.evaluate(async () => { const response = await fetch('./precache.json', { cache: 'no-store' }); if (!response.ok) throw new Error('Missing build identity'); return response.json(); });
  receipt.build = await servedBuild();

  await check('opening B/C render only their deduplicated legal shift edges', async () => {
    for (const name of ['opening_B', 'opening_C']) {
      const setup = fixture(name), expected = unique(setup.children.filter(child => child.action.type === 'shift').map(child => pair(child.action.from, child.action.to)));
      await driver.loadScenario(setup.record); await driver.camera('top'); assert.deepEqual(await legalPairs(), expected); await expectEdges(driver, expected, null, name); await capture(`${name}-top-unselected`, driver);
    }
  });

  await check('two-direction source renders west and north edges across the three themes', async () => {
    for (const theme of ['gallery', 'nocturne', 'daylight']) {
      await driver.loadScenario(sparseTwoDirection); await setTheme(driver, theme); await driver.camera('top');
      const expected = await legalPairs(); assert.ok(expected.includes('C2>B2') && expected.includes('C2>C3'), `${theme} sparse setup needs west and north C2 edges`);
      await expectEdges(driver, expected, null, `${theme} unselected`); await capture(`two-direction-${theme}-top-unselected`, driver);
      await clickEdge(driver, 6, 5); await expectEdges(driver, expected, 6, `${theme} selected`); await driver.camera('overview'); await capture(`two-direction-${theme}-overview-selected`, driver);
    }
  });

  await check('loaded promotion edge deduplicates and real passenger preview/cancel/commit preserve state', async () => {
    const setup = fixture('shift_promotion'), promoted = setup.children.find(child => child.action.type === 'shift' && child.action.from === 'B3' && child.action.to === 'B4' && child.action.promotion === 'N');
    assert.ok(promoted, 'Missing B3-to-B4 knight-promotion Shift'); await driver.loadScenario(setup.record); await setTheme(driver, 'gallery');
    const expected = await legalPairs(); await expectEdges(driver, expected, null, 'loaded promotion unselected'); await expectPreview(driver, null, 'loaded promotion before selection');
    const before = await driver.record(), revision = (await driver.observation()).revision;
    await page.locator('#move-mode').click(); await driver.square('c6'); await page.locator('#shift-passenger').waitFor({ state: 'visible' }); await capture('loaded-promotion-passenger', driver);
    await page.locator('#shift-passenger').click(); await page.waitForFunction(() => window.rift.metrics().selectedTile === 9); await expectEdges(driver, expected, 9, 'loaded promotion selected'); await expectPreview(driver, null, 'loaded promotion source selected');
    assert.equal((await driver.metrics()).shiftEdges.filter(edge => edge.from === 9 && edge.to === 13).length, 1, 'Four promotion choices share one B3-to-B4 edge');
    await driver.square(driver.macroSquare('B4')); await page.locator('#confirm-shift').waitFor({ state: 'visible' }); assert.equal((await driver.observation()).revision, revision); await expectPreview(driver, 13, 'loaded promotion target selected'); await capture('loaded-promotion-preview', driver);
    await page.locator('#cancel-selection').click(); assert.deepEqual(await driver.record(), before); await expectEdges(driver, expected, null, 'loaded promotion cancel'); await expectPreview(driver, null, 'loaded promotion cancel');
    const after = await driver.performPassengerShift({ passenger: 'c6', to: 'B4', promotion: 'N' });
    assert.deepEqual(after.position, promoted.position); assert.equal((await driver.record()).actions.at(-1), promoted.action.id); await capture('loaded-promotion-settled', driver);
  });

  await check('king-safety fixture has no rendered edge outside its legal directions', async () => {
    const setup = fixture('cut_check_ray'), expected = unique(setup.children.filter(child => child.action.type === 'shift').map(child => pair(child.action.from, child.action.to)));
    await driver.loadScenario(setup.record); assert.deepEqual(expected, ['C2>B2', 'C3>D3']); assert.deepEqual(await legalPairs(), expected); await expectEdges(driver, expected, null, 'cut check ray');
  });

  await check('reduced motion keeps the selected edge strong without lifting it', async () => {
    await driver.loadScenario(sparseTwoDirection); await selectSource(driver, 'C2');
    const expected = await legalPairs(); await expectEdges(driver, expected, 6, 'selected before reduced-motion toggle');
    await page.locator('#settings').click();
    const dialog = page.locator('#settings-dialog'), motion = dialog.locator('input[name="motion"]'); if (!await motion.isChecked()) await motion.check();
    await dialog.locator('button[value="apply"]').click(); await driver.ready();
    assert.equal((await driver.metrics()).selectedTile, 6, 'Toggling reduced motion must preserve the selected source');
    await expectEdges(driver, expected, 6, 'reduced-motion selected');
    const metrics = await driver.metrics(); assert.equal(metrics.reducedMotion, true);
    await capture('two-direction-gallery-reduced-motion-selected', driver);
    await page.locator('#settings').click(); await motion.uncheck(); await dialog.locator('button[value="apply"]').click(); await driver.ready();
    assert.equal((await driver.metrics()).reducedMotion, false); await expectEdges(driver, expected, 6, 'selected after restoring motion');
  });

  receipt.finalBuild = await servedBuild(); assert.deepEqual(receipt.finalBuild, receipt.build, 'Build changed during edge review');
  assert.ok(receipt.captures.length <= 12, 'Keep visual review bounded'); assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (error) {
  receipt.status = 'fail'; receipt.failure = error instanceof Error ? error.stack : String(error); process.exitCode = 1;
  await capture('failure', { metrics: async () => ({}) }).catch(() => {}); console.error(error);
} finally {
  if (context) await context.close().catch(() => {}); if (browser) await browser.close().catch(() => {});
  receipt.finished = new Date().toISOString(); await persist();
  console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks.length, captures: receipt.captures.length, output: root }));
}
