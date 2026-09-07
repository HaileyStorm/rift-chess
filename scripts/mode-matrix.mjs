/** Product-flow matrix. Setup and commits stay in the visible UI; no fixture injection is used. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const execFileAsync = promisify(execFile);
const root = path.resolve('.artifacts', process.env.RIFT_TEST_RUN || 'mode-matrix');
const chosen = new Set((process.env.RIFT_MODE_CASES || '').split(',').map(value => value.trim()).filter(Boolean));
const limit = Number(process.env.RIFT_MODE_LIMIT || 18), loadedPlyLimit = Number(process.env.RIFT_MODE_LOADED_PLY_LIMIT || 6);
if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(loadedPlyLimit) || loadedPlyLimit < 1) throw new Error('RIFT_MODE_LIMIT and RIFT_MODE_LOADED_PLY_LIMIT must be positive integers');
await fs.mkdir(root, { recursive: true });
const modes = [{ value: 'hotseat', human: null }, { value: 'bot-black', human: 1 }, { value: 'bot-white', human: -1 }];
const cases = modes.flatMap(mode => ['B', 'C'].flatMap(layout => ['prompt', 'auto100', 'off'].map(policy => ({ id: `${mode.value}-${layout}-${policy}`, ...mode, layout, policy })))).filter(item => !chosen.size || chosen.has(item.id)).slice(0, limit);
if (!cases.length) throw new Error('No configured mode matrix row matches RIFT_MODE_CASES');
const receipt = { started: new Date().toISOString(), purpose: 'state-coupled real-UI product matrix; no visual acceptance claim', url: base, requestedRows: cases.map(item => item.id), rows: [], errors: [], pending: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block', acceptDownloads: true });
const page = await context.newPage(), driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
async function persist() { await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); }
async function sourceIdentity() {
  const packageInfo = JSON.parse(await fs.readFile('package.json', 'utf8'));
  try { const [{ stdout: revision }, { stdout: status }] = await Promise.all([execFileAsync('git', ['rev-parse', 'HEAD']), execFileAsync('git', ['status', '--porcelain'])]); return { packageVersion: packageInfo.version, gitRevision: revision.trim(), worktreeDirty: Boolean(status.trim()) }; }
  catch { return { packageVersion: packageInfo.version, gitRevision: null, worktreeDirty: null }; }
}
async function servedPrecache() { return page.evaluate(async () => { const response = await fetch('./precache.json', { cache: 'no-store' }); if (!response.ok) throw new Error(`precache identity unavailable (${response.status})`); return response.json(); }); }
const squareIndex = square => (Number(square[1]) - 1) * 8 + square.charCodeAt(0) - 97;
const macroIndex = name => (Number(name[1]) - 1) * 4 + name.charCodeAt(0) - 65;
const macroOfSquare = square => Math.floor(square / 16) * 4 + Math.floor((square % 8) / 2);

async function newMatch(row) {
  await page.locator('#new-game').click(); const dialog = page.locator('#new-dialog'); await dialog.waitFor({ state: 'visible' });
  assert.equal(await dialog.locator(`input[name="mode"][value="${row.value}"]`).isVisible(), true); assert.equal(await dialog.locator(`input[name="layout"][value="${row.layout}"]`).isVisible(), true); assert.equal(await dialog.locator(`input[name="draw"][value="${row.policy}"]`).isVisible(), true);
  await dialog.locator(`input[name="mode"][value="${row.value}"]`).check(); await dialog.locator(`input[name="layout"][value="${row.layout}"]`).check(); await dialog.locator(`input[name="draw"][value="${row.policy}"]`).check(); await dialog.locator('#start-game').click(); await driver.ready(); await driver.camera('top');
}

async function controlled(row) {
  if (row.value === 'hotseat') return driver.ready();
  await page.waitForFunction(side => { const state = window.rift.getObservation(); return Boolean(state.outcome) || (state.position.side === side && !window.rift.metrics().animating); }, row.human, { timeout: 120000 });
}

function shifts(actions, position, passengers) {
  return actions.filter(action => action.type === 'shift' && position.board.filter((piece, square) => piece !== 0 && macroOfSquare(square) === macroIndex(action.from)).length === passengers);
}
function pawnMove(actions, position) { return actions.find(action => action.type === 'move' && Math.abs(position.board[squareIndex(action.from)]) === 7) || actions.find(action => action.type === 'move'); }
function fallback(actions, position) { return pawnMove(actions, position) || actions.find(action => action.type === 'shift'); }

async function action(row, selected) {
  await controlled(row); const before = await driver.observation(); if (before.outcome) return false;
  const available = await page.evaluate(() => window.rift.getLegalActions()), chosenAction = selected(available, before.position);
  if (!chosenAction) return false;
  await driver.perform(chosenAction); row.trace.push({ action: chosenAction, revision: (await driver.observation()).revision, record: await driver.record() }); return true;
}

async function settings() {
  await page.locator('#settings').click(); const dialog = page.locator('#settings-dialog'); await dialog.locator('[name="quality"]').selectOption('balanced'); await dialog.locator('[name="motion"]').setChecked(true); await dialog.getByRole('button', { name: 'Apply', exact: true }).click(); await driver.ready();
}

async function exportImportReplayRecovery(row) {
  await controlled(row); const beforeExport = await driver.record();
  await driver.openDrawer('Match & view'); const downloadPromise = page.waitForEvent('download'); await page.locator('#export').click(); const download = await downloadPromise, exported = await fs.readFile(await download.path());
  await page.locator('#import').setInputFiles({ name: `${row.id}.json`, mimeType: 'application/json', buffer: exported }); await controlled(row); assert.deepEqual(await driver.record(), beforeExport); row.steps.exportImport = 'complete';
  await page.locator('#replay').click(); await page.locator('#replay-back').click(); await page.locator('#replay-exit').click(); await controlled(row); row.steps.replay = 'complete';
  const expected = await page.evaluate(() => JSON.parse(localStorage.getItem('rift-chess.save.recovery.v1')).record);
  await page.evaluate(() => { const original = localStorage.getItem('rift-chess.save.v1'), recovery = localStorage.getItem('rift-chess.save.recovery.v1'), corrupt = JSON.parse(original); corrupt.record.final_position_hash = 'corrupt'; addEventListener('beforeunload', () => { localStorage.setItem('rift-chess.save.v1', JSON.stringify(corrupt)); localStorage.setItem('rift-chess.save.recovery.v1', recovery); }, { once: true }); });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.enterPlay(); await controlled(row); assert.deepEqual(await driver.record(), expected); assert.match(await page.locator('#notice').innerText(), /recovery copy/); row.steps.recovery = 'complete';
}

async function run(row) {
  const result = { ...row, trace: [], steps: { modal: 'pending', ordinary: 'pending', emptyShift: 'pending', loadedShift: 'pending', cancelReselect: 'pending', camera: 'pending', settings: 'pending', exportImport: 'pending', replay: 'pending', recovery: 'pending' }, status: 'RUNNING' }; receipt.rows.push(result); await persist();
  try {
    await newMatch(row); result.steps.modal = 'complete';
    await controlled(row); const observation = await driver.observation(), ordinary = pawnMove(await page.evaluate(() => window.rift.getLegalActions()), observation.position); if (!ordinary) throw new Error('No initial ordinary action');
    await driver.square(ordinary.from); await page.locator('#cancel-selection').waitFor({ state: 'visible' }); await page.locator('#cancel-selection').click(); result.steps.cancelReselect = 'complete'; await driver.perform(ordinary); result.trace.push({ action: ordinary, revision: (await driver.observation()).revision, record: await driver.record() }); result.steps.ordinary = 'complete';
    const emptyDone = await action(result, (actions, position) => shifts(actions, position, 0)[0]); result.steps.emptyShift = emptyDone ? 'complete' : 'PENDING_NO_LEGAL_EMPTY_SHIFT';
    for (let ply = 0; ply < loadedPlyLimit && result.steps.loadedShift === 'pending'; ply++) {
      const loadedDone = await action(result, (actions, position) => shifts(actions, position, 1)[0]);
      if (loadedDone) { result.steps.loadedShift = 'complete'; break; }
      if (!await action(result, fallback)) break;
    }
    if (result.steps.loadedShift === 'pending') { result.steps.loadedShift = 'PENDING_NO_LEGAL_LOADED_SHIFT'; receipt.pending.push({ row: row.id, reason: `No legal loaded Shift after pawn advancement within ${loadedPlyLimit} controlled plies` }); }
    for (const preset of ['white', 'black', 'overview', 'top']) await driver.camera(preset); result.steps.camera = 'complete'; await settings(); result.steps.settings = 'complete';
    await exportImportReplayRecovery(result); result.finalRecord = await driver.record(); result.finalMetrics = await driver.metrics(); await page.screenshot({ path: path.join(root, `${row.id}-ending.png`) });
    result.status = Object.values(result.steps).some(value => String(value).startsWith('PENDING')) ? 'PENDING' : 'COMPLETE_FLOW';
  } catch (error) { result.status = 'FAILED'; result.failure = error.stack; }
  result.finished = new Date().toISOString(); await persist();
}

try {
  receipt.build = { source: await sourceIdentity(), browser: await browser.version() };
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.enterPlay();
  receipt.build.initialPrecache = await servedPrecache();
  for (const row of cases) await run(row);
  receipt.build.finalPrecache = await servedPrecache(); assert.deepEqual(receipt.build.finalPrecache, receipt.build.initialPrecache, 'Served precache identity changed during the matrix');
  receipt.status = receipt.rows.some(row => row.status === 'FAILED') ? 'FAILED' : receipt.rows.some(row => row.status === 'PENDING') ? 'PENDING' : 'COMPLETE_FLOW_MATRIX';
  if (receipt.errors.length) throw new Error(`Browser errors: ${receipt.errors.join('; ')}`);
} catch (error) { receipt.status = 'FAILED'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message); }
finally { if (receipt.status === 'FAILED' || receipt.status === 'PENDING') process.exitCode = 1; receipt.finished = new Date().toISOString(); await persist(); await context.close(); await browser.close(); console.log(JSON.stringify({ status: receipt.status, rows: receipt.rows.map(row => ({ id: row.id, status: row.status })) })); }
