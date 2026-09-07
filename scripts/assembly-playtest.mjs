import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const run = process.env.RIFT_TEST_RUN || `assembly-playtest-${Date.now()}`;
const root = path.resolve('.artifacts', 'overhaul', run);
try { await fs.access(root); throw new Error(`Refusing to reuse output directory: ${root}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
await fs.mkdir(root, { recursive: true });
const receipt = { started: new Date().toISOString(), classification: 'real-UI assembly regression capture; images and WebM require visual review', url: base, build: {}, checks: [], records: {}, errors: [] };
let browser, context, page, video;
const persist = () => fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2));

function closeTo(actual, expected, label) { assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: expected ${expected}, got ${actual}`); }
function target(tile) { return [tile % 4 * 2 - 3, 0, 3 - Math.floor(tile / 4) * 2]; }
function verifyShuffled(metrics) {
  const assembly = metrics.assembly;
  assert.ok(metrics.assembling && assembly, 'Expected live assembly metrics');
  assert.equal(metrics.animating, true, 'Main interaction lock must remain active while assembling');
  assert.equal(assembly.total, 48); assert.equal(assembly.tiles.length, 14);
  assert.ok(assembly.tiles.some(({ tile, position }) => position.some((value, index) => Math.abs(value - target(tile)[index]) > 1e-6)), 'Assembly must visibly start shuffled');
  for (const { tile, pieces } of assembly.tiles) for (const { square, position } of pieces) {
    assert.equal(Math.floor(square / 8 / 2) * 4 + Math.floor(square % 8 / 2), tile, `piece ${square} must stay with tile ${tile}`);
    closeTo(position[0], square % 8 % 2 - .5, `piece ${square} local x`);
    closeTo(position[1], 0, `piece ${square} local y`);
    closeTo(position[2], .5 - Math.floor(square / 8) % 2, `piece ${square} local z`);
  }
}

async function build() { return page.evaluate(async () => {
  const response = await fetch('./precache.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Build manifest unavailable (${response.status})`);
  return response.json();
}); }
async function capture(name) { await page.screenshot({ path: path.join(root, `${name}.png`) }); receipt.captures ??= []; receipt.captures.push(`${name}.png`); }
async function settled() { await page.waitForFunction(() => !window.rift.metrics().assembling && !window.rift.metrics().animating, null, { timeout: 30000 }); }
async function assembling() { await page.waitForFunction(() => window.rift.metrics().assembling, null, { timeout: 10000 }); }
async function probe() { return page.evaluate(() => window.__assemblyProbe); }
async function newMatch(mode, layout) {
  await page.locator('#new-game').click();
  const dialog = page.locator('#new-dialog'); await dialog.waitFor({ state: 'visible' });
  await dialog.locator(`input[name="mode"][value="${mode}"]`).check();
  await dialog.locator(`input[name="layout"][value="${layout}"]`).check();
  await dialog.locator('#start-game').click();
}
async function check(name, action) {
  try { await action(); receipt.checks.push({ name, status: 'pass' }); }
  catch (error) { receipt.checks.push({ name, status: 'fail', error: error.message }); throw error; }
  finally { await persist(); }
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
  context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block', recordVideo: { dir: root, size: { width: 1600, height: 1000 } } });
  await context.addInitScript(() => {
    const clone = value => JSON.parse(JSON.stringify(value));
    const probe = window.__assemblyProbe = { frames: [], firstSubmittedFrame: null, firstAssemblySettledAt: null, workers: [], assemblyStarts: 0 };
    let wasAssembling = false;
    const request = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => {
      const submittedAt = performance.now();
      return request(timestamp => {
        callback(timestamp);
        const metrics = window.rift?.metrics?.();
        if (wasAssembling && metrics && !metrics.assembling && probe.firstSubmittedFrame && probe.firstAssemblySettledAt === null) probe.firstAssemblySettledAt = performance.now();
        if (metrics?.assembling && !wasAssembling) probe.assemblyStarts++;
        wasAssembling = Boolean(metrics?.assembling);
        if (metrics?.assembling && metrics.renderedFrames > 0) {
          const sample = { submittedAt, timestamp, recordedAt: performance.now(), metrics: clone(metrics) };
          if (!probe.firstSubmittedFrame) probe.firstSubmittedFrame = sample;
          if (probe.frames.length < 160 && (!probe.frames.length || sample.recordedAt - probe.frames.at(-1).recordedAt >= 75)) probe.frames.push(sample);
        }
      });
    };
    const RealWorker = window.Worker;
    class ObservedWorker extends RealWorker {
      constructor(...args) {
        super(...args);
        const metrics = window.rift?.metrics?.();
        probe.workers.push({ at: performance.now(), url: String(args[0]), assembling: metrics?.assembling ?? null, animating: metrics?.animating ?? null, revision: metrics?.revision ?? null });
      }
    }
    window.Worker = ObservedWorker;
  });
  page = await context.newPage(); video = page.video();
  page.on('pageerror', error => receipt.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
  const driver = createUiDriver(page);
  const noAssembly = async flow => {
    const metrics = await driver.metrics(); assert.equal(metrics.assembling, false, `${flow} must not assemble`);
    assert.equal((await probe()).assemblyStarts, 0, `${flow} must not have started an unobserved assembly since reload`);
    receipt.noAssemblySamples ??= []; receipt.noAssemblySamples.push({ flow, metrics });
  };
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => Boolean(window.rift), null, { timeout: 60000 });
  await page.evaluate(() => window.rift.assetsReady()); receipt.build.start = await build();

  await check('fresh startup keeps the live shuffled board inert through Take your seat', async () => {
    await assembling();
    const before = await driver.record(), metrics = await driver.metrics(); verifyShuffled(metrics);
    assert.equal(await page.getByRole('button', { name: 'Take your seat', exact: true }).isVisible(), true);
    await page.getByRole('button', { name: 'Take your seat', exact: true }).click();
    const canvas = await page.locator('#scene').boundingBox(); assert.ok(canvas);
    await page.mouse.click(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    assert.equal((await driver.observation()).revision, 0); assert.deepEqual(await driver.record(), before);
    receipt.records.fresh = { before, after: await driver.record() }; await settled(); await capture('fresh-settled');
    const sample = await probe(); receipt.assemblySamples = sample.frames; receipt.firstSubmittedFrame = sample.firstSubmittedFrame;
    assert.ok(sample.firstSubmittedFrame && sample.frames.length > 1 && sample.frames.length <= 160, 'Expected bounded live assembly RAF evidence');
    assert.equal(sample.firstSubmittedFrame.metrics.renderedFrames, 1, 'First-frame evidence must cover the first actual renderer submission.');
    verifyShuffled(sample.firstSubmittedFrame.metrics);
    const initialTiles = sample.firstSubmittedFrame.metrics.assembly.tiles;
    const displaced = initialTiles.filter(({ tile, position }) => position.some((value, index) => Math.abs(value - target(tile)[index]) > 1e-6)).length;
    assert.ok(displaced >= 12, 'At least twelve of fourteen tiles must begin away from their final slots');
    receipt.openingPresentation = { displacedTiles: displaced, slides: 48, observedDurationMs: sample.firstAssemblySettledAt - sample.firstSubmittedFrame.recordedAt };
    assert.ok(receipt.openingPresentation.observedDurationMs >= 8400, 'The uninterrupted opening must retain the 8.5-second clock within observation tolerance');
    assert.ok(sample.frames.at(-1).recordedAt - sample.firstSubmittedFrame.recordedAt >= 7500, 'Piece attachment samples must span the longer opening');
    const steps = sample.frames.map(frame => frame.metrics.assembly.step);
    assert.ok(steps.every((step, index) => index === 0 || step >= steps[index - 1]), 'Observed assembly slides must progress monotonically');
    assert.ok(steps.at(-1) >= 47, 'Sparse samples must reach the final slides');
    receipt.openingPresentation.firstSampledStep = steps[0]; receipt.openingPresentation.lastSampledStep = steps.at(-1);
    for (const frame of sample.frames) for (const tile of frame.metrics.assembly.tiles) {
      const original = sample.firstSubmittedFrame.metrics.assembly.tiles.find(item => item.tile === tile.tile);
      assert.deepEqual(tile.pieces, original.pieces, 'Pieces must preserve their tile-local positions during every observed slide.');
    }
  });

  await check('new hotseat C offers Skip animation and snaps without a record change', async () => {
    await newMatch('hotseat', 'C'); await assembling();
    const before = await driver.record(); assert.equal(await page.locator('#skip').isVisible(), true);
    await page.locator('#skip').click(); await settled();
    assert.deepEqual(await driver.record(), before); assert.equal((await driver.metrics()).assembly, null);
    receipt.records.hotseatSkip = { before, after: await driver.record() };
    await capture('hotseat-c-skipped');
  });

  await check('a second New Match supersedes an in-flight assembly without a stale continuation', async () => {
    await newMatch('hotseat', 'B'); await assembling();
    const replaced = await driver.observation();
    await page.locator('#new-game').click();
    await page.locator('#new-dialog input[name="layout"][value="C"]').check();
    assert.equal((await driver.metrics()).assembling, true, 'The first assembly must still be in flight when replaced.');
    await page.locator('#start-game').click(); await assembling();
    const replacement = await driver.observation(), record = await driver.record();
    assert.notEqual(replacement.game_id, replaced.game_id); assert.equal(replacement.position.holes, 1088);
    await settled();
    assert.equal((await driver.observation()).game_id, replacement.game_id);
    assert.deepEqual(await driver.record(), record);
    receipt.records.replacement = { replacedId: replaced.game_id, replacementId: replacement.game_id, record };
  });

  await check('bot-white B waits for assembly and delivers one real reply afterwards', async () => {
    const starts = (await probe()).workers.length;
    await newMatch('bot-white', 'B'); await assembling();
    assert.equal((await probe()).workers.length, starts, 'No worker may start during assembly');
    await page.waitForFunction(count => window.__assemblyProbe.workers.length >= count, starts + 1, { timeout: 30000 });
    await page.waitForFunction(() => window.rift.getObservation().revision === 1 && !window.rift.metrics().animating, null, { timeout: 120000 });
    const workers = (await probe()).workers.slice(starts);
    assert.equal(workers.length, 1); assert.equal(workers[0].assembling, false); assert.equal(workers[0].animating, false);
    assert.equal((await driver.record()).actions.length, 1); receipt.botWorkers = workers;
  });

  await check('reload, replay, import, tutorial, and unchanged Atelier never start another assembly', async () => {
    const saved = await driver.record();
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => Boolean(window.rift)); await page.evaluate(() => window.rift.assetsReady());
    assert.deepEqual(await driver.record(), saved); await noAssembly('saved reload');
    await page.locator('#replay').click(); await page.locator('#replay-back').click(); await noAssembly('replay'); await page.locator('#replay-exit').click();
    const priorId = (await driver.observation()).game_id;
    await page.locator('#import').setInputFiles({ name: 'record.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
    await page.waitForFunction(id => window.rift.getObservation().game_id !== id, priorId); assert.deepEqual(await driver.record(), saved); await noAssembly('import');
    const learn = await driver.openDrawer('Learn the rift'); await learn.locator('[data-tutorial="ordinary"]').click(); await page.locator('#lesson-return').waitFor({ state: 'visible' }); await noAssembly('tutorial'); await page.locator('#lesson-return').click();
    await page.locator('#settings').click(); await page.locator('#settings-dialog button[value="apply"]').click(); await page.waitForTimeout(50); assert.deepEqual(await driver.record(), saved); await noAssembly('unchanged Atelier');
  });

  await check('visible reduced-motion preference suppresses new-match assembly', async () => {
    await page.locator('#settings').click(); await page.locator('#settings-dialog input[name="motion"]').check(); await page.locator('#settings-dialog button[value="apply"]').click();
    await newMatch('hotseat', 'C'); await page.waitForTimeout(100); const metrics = await driver.metrics();
    assert.equal(metrics.reducedMotion, true); assert.equal(metrics.assembling, false); assert.equal(metrics.animating, false);
  });

  receipt.build.end = await build(); assert.deepEqual(receipt.build.end, receipt.build.start, 'Build manifest changed during playtest');
  assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (error) {
  receipt.status = 'fail'; receipt.failure = error instanceof Error ? error.stack : String(error); process.exitCode = 1;
  await capture('failure').catch(() => {}); console.error(error);
} finally {
  if (context) await context.close().catch(() => {});
  if (video) receipt.video = path.basename(await video.path().catch(() => 'unavailable.webm'));
  if (browser) await browser.close().catch(() => {});
  receipt.finished = new Date().toISOString(); await persist();
  console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks.length, errors: receipt.errors.length, output: root }));
}
