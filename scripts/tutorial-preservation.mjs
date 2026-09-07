/** Visible tutorial preservation flows. Saved-envelope reads are read-only assertions, never setup injection. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const root = path.resolve('.artifacts', 'tutorial-preservation', process.env.RIFT_TEST_RUN || 'prepared');
const receiptPath = path.join(root, 'receipt.json');
async function prepareOutput() {
  try { await fs.access(receiptPath); throw new Error(`Refusing to overwrite tutorial-preservation evidence: ${root}`); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  try { if ((await fs.readdir(root)).length) throw new Error(`Refusing non-empty tutorial-preservation evidence directory: ${root}`); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  await fs.mkdir(root, { recursive: true });
}
await prepareOutput();
const receipt = { started: new Date().toISOString(), purpose: 'visible tutorial preservation flows; storage values are read-only evidence', url: base, checks: [], captures: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block', acceptDownloads: true });
const page = await context.newPage(), driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
async function persist() { await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2)); }
async function capture(name) { await page.screenshot({ path: path.join(root, `${name}.png`) }); receipt.captures.push({ name, record: await driver.record(), timestamp: new Date().toISOString() }); await persist(); }
async function savedEnvelope() { return page.evaluate(() => JSON.parse(localStorage.getItem('rift-chess.save.v1'))); }
async function servedPrecache() { return page.evaluate(async () => { const response = await fetch('./precache.json', { cache: 'no-store' }); if (!response.ok) throw new Error(`precache unavailable (${response.status})`); return response.json(); }); }
async function newMatch(layout = 'B', policy = 'off', practice = false) {
  await page.locator('#new-game').click(); const dialog = page.locator('#new-dialog'); await dialog.waitFor({ state: 'visible' });
  await dialog.locator('input[name="mode"][value="hotseat"]').check(); await dialog.locator(`input[name="layout"][value="${layout}"]`).check(); await dialog.locator(`input[name="draw"][value="${policy}"]`).check(); await dialog.locator('#practice').setChecked(practice); await dialog.locator('#start-game').click(); await driver.ready(); await driver.camera('top');
}
async function openLesson(which) {
  const learn = page.locator('details.drawer').filter({ has: page.locator(`[data-tutorial="${which}"]`) }); if (!await learn.evaluate(element => element.open)) await learn.locator('summary').click();
  await page.locator(`[data-tutorial="${which}"]`).click(); await driver.ready(); await driver.camera('top'); await page.locator('#lesson-status').waitFor({ state: 'visible' }); await page.locator('#lesson-return').waitFor({ state: 'visible' });
}
const macro = name => (Number(name[1]) - 1) * 4 + name.charCodeAt(0) - 65;
function emptyShift(actions, position) { return actions.find(action => action.type === 'shift' && position.board.filter((piece, square) => piece !== 0 && Math.floor(square / 16) * 4 + Math.floor((square % 8) / 2) === macro(action.from)).length === 0); }
async function solveLesson(which) {
  if (which === 'ordinary') return driver.perform({ type: 'move', from: 'e2', to: 'e4', promotion: null });
  if (which === 'loadedShift') return driver.performPassengerShift({ passenger: 'c6', to: 'B4', promotion: 'N' });
  if (which === 'cutCheck') return driver.perform({ type: 'shift', from: 'C2', to: 'B2', promotion: null });
  const observation = await driver.observation(), action = emptyShift(await page.evaluate(() => window.rift.getLegalActions()), observation.position); assert.ok(action, 'Visible empty-Shift lesson must expose an empty legal Shift'); return driver.perform(action);
}
async function returnLesson(original) {
  await page.locator('#lesson-return').click(); await driver.ready(); assert.deepEqual(await driver.record(), original.record); const restored = await savedEnvelope(); assert.deepEqual(restored.record, original.record); assert.equal(restored.record.draw_policy, original.record.draw_policy); assert.equal(restored.practice, original.practice); assert.equal(await page.locator('#lesson-status').isVisible(), false);
}
async function test(name, run) { try { await run(); receipt.checks.push({ name, status: 'pass' }); } catch (error) { receipt.checks.push({ name, status: 'fail', error: error.message }); throw error; } finally { await persist(); } }

try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.enterPlay(); receipt.build = await servedPrecache();
  await test('all visible lessons preserve an existing hotseat B/off non-practice match', async () => {
    await newMatch('B', 'off', false); await driver.perform({ type: 'move', from: 'e2', to: 'e4', promotion: null }); await driver.perform({ type: 'move', from: 'e7', to: 'e5', promotion: null });
    const original = await savedEnvelope(); assert.equal(original.mode, 'hotseat'); assert.equal(original.practice, false); assert.equal(original.record.draw_policy, 'off'); receipt.original = original;
    for (const which of ['ordinary', 'emptyShift', 'loadedShift', 'cutCheck']) { await openLesson(which); assert.deepEqual((await savedEnvelope()).record, original.record); await capture(`lesson-${which}-opened`); await solveLesson(which); assert.deepEqual((await savedEnvelope()).record, original.record); }
    await returnLesson(original);
    await capture('lesson-return-restored-original');
  });
  await test('reload from a solved visible lesson restores the held match directly', async () => {
    const original = receipt.original; await openLesson('ordinary'); await solveLesson('ordinary'); assert.deepEqual((await savedEnvelope()).record, original.record); await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.enterPlay(); assert.deepEqual(await driver.record(), original.record); assert.equal(await page.locator('#lesson-status').isVisible(), false); await capture('lesson-reload-restores-match');
  });
  await test('New match and valid Import inside lessons clear the held-match session', async () => {
    const original = receipt.original; await openLesson('ordinary'); await page.locator('#new-game').click(); const dialog = page.locator('#new-dialog'); await dialog.locator('input[name="layout"][value="C"]').check(); await dialog.locator('#start-game').click(); await driver.ready(); assert.equal(await page.locator('#lesson-status').isVisible(), false); assert.notDeepEqual(await driver.record(), original.record);
    const importedSave = await savedEnvelope(); await openLesson('loadedShift'); await driver.openDrawer('Match & view'); await page.locator('#import').setInputFiles({ name: 'valid-save.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(importedSave)) }); await driver.ready(); assert.equal(await page.locator('#lesson-status').isVisible(), false); assert.deepEqual(await driver.record(), importedSave.record);
  });
  await test('Export in a visible lesson contains the lesson rather than its held backup', async () => {
    const held = await driver.record(); await openLesson('loadedShift'); const lessonRecord = await driver.record(); assert.notDeepEqual(lessonRecord, held); await driver.openDrawer('Match & view'); const downloadPromise = page.waitForEvent('download'); await page.locator('#export').click(); const download = await downloadPromise, exported = JSON.parse(await fs.readFile(await download.path(), 'utf8')); assert.deepEqual(exported.record, lessonRecord); assert.notDeepEqual(exported.record, held); await capture('lesson-export-visible-state');
  });
  receipt.finalBuild = await servedPrecache(); assert.deepEqual(receipt.finalBuild, receipt.build); assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (error) { receipt.status = 'fail'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message); await page.screenshot({ path: path.join(root, 'failure.png') }).catch(() => {}); }
finally { receipt.finished = new Date().toISOString(); await persist(); await context.close(); await browser.close(); console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks })); }
