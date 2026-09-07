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
const limit = Number(process.env.RIFT_MODE_LIMIT || 18), actionBudget = Number(process.env.RIFT_MODE_ACTION_BUDGET || 12);
if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(actionBudget) || actionBudget < 3) throw new Error('RIFT_MODE_LIMIT and RIFT_MODE_ACTION_BUDGET must be positive integers');
try { if ((await fs.readdir(root)).length) throw new Error(`Refusing to overwrite mode-matrix evidence: ${root}`); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
await fs.mkdir(root, { recursive: true });
const modes = [{ value: 'hotseat', human: null }, { value: 'bot-black', human: 1 }, { value: 'bot-white', human: -1 }];
const cases = modes.flatMap(mode => ['B', 'C'].flatMap(layout => ['prompt', 'auto100', 'off'].map(policy => ({ id: `${mode.value}-${layout}-${policy}`, ...mode, layout, policy })))).filter(item => !chosen.size || chosen.has(item.id)).slice(0, limit);
if (!cases.length) throw new Error('No configured mode matrix row matches RIFT_MODE_CASES');
const receipt = { started: new Date().toISOString(), purpose: 'state-coupled real-UI product matrix; no visual acceptance claim', url: base, requestedRows: cases.map(item => item.id), actionBudget, rows: [], errors: [], pending: [], separateCoverage: [] };
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
const loadedPlans = {
  B: {
    1: { empty: { type: 'shift', from: 'C3', to: 'B3' }, prepare: { type: 'move', from: 'b1', to: 'a3' }, loaded: { type: 'shift', from: 'A2', to: 'B2', passenger: 'a3' } },
    '-1': { empty: { type: 'shift', from: 'C2', to: 'B2' }, prepare: { type: 'move', from: 'b8', to: 'a6' }, loaded: { type: 'shift', from: 'A3', to: 'B3', passenger: 'a6' } },
  },
  C: {
    1: { empty: { type: 'shift', from: 'D3', to: 'C3' }, prepare: { type: 'move', from: 'b1', to: 'c3' }, loaded: { type: 'shift', from: 'B2', to: 'C2', passenger: 'c3' } },
    '-1': { empty: { type: 'shift', from: 'D2', to: 'C2' }, prepare: { type: 'move', from: 'g8', to: 'h6' }, loaded: { type: 'shift', from: 'D3', to: 'C3', passenger: 'h6' } },
  },
};

async function newMatch(row) {
  await page.locator('#new-game').click(); const dialog = page.locator('#new-dialog'); await dialog.waitFor({ state: 'visible' });
  assert.equal(await dialog.locator(`input[name="mode"][value="${row.value}"]`).isVisible(), true); assert.equal(await dialog.locator(`input[name="layout"][value="${row.layout}"]`).isVisible(), true); assert.equal(await dialog.locator(`input[name="draw"][value="${row.policy}"]`).isVisible(), true);
  await dialog.locator(`input[name="mode"][value="${row.value}"]`).check(); await dialog.locator(`input[name="layout"][value="${row.layout}"]`).check(); await dialog.locator(`input[name="draw"][value="${row.policy}"]`).check(); await dialog.locator('#start-game').click(); await driver.ready(); await driver.camera('top');
}

async function controlled(row) {
  if (row.value === 'hotseat') return driver.ready();
  await page.waitForFunction(side => { const state = window.rift.getObservation(); return Boolean(state.outcome) || (state.position.side === side && !window.rift.metrics().animating); }, row.human, { timeout: 120000 });
}

function pawnMove(actions, position) { return actions.find(action => action.type === 'move' && Math.abs(position.board[squareIndex(action.from)]) === 7) || actions.find(action => action.type === 'move'); }

function matchingAction(actions, expected) { return actions.find(action => action.type === expected.type && action.from === expected.from && action.to === expected.to); }
async function noteNaturalCheck(row) {
  const observation = await driver.observation();
  if (observation.in_check && row.steps.checkFeedback !== 'COMPLETE_NATURAL_CHECK') {
    assert.match(await page.locator('#check').innerText(), /is in check/i);
    row.steps.checkFeedback = 'COMPLETE_NATURAL_CHECK';
  }
}
async function commitPlanned(row, expected, label, passenger = null) {
  if (row.trace.length >= actionBudget) return null;
  await controlled(row); const before = await driver.observation(); if (before.outcome) return null;
  const action = matchingAction(await page.evaluate(() => window.rift.getLegalActions()), expected);
  if (!action) return null;
  if (passenger) await driver.performPassengerShift({ passenger, to: action.to, promotion: null }); else await driver.perform(action);
  const after = await driver.observation(); row.trace.push({ label, action, revision: after.revision, record: await driver.record() }); await noteNaturalCheck(row);
  return action;
}
async function advanceOpponent(row) {
  if (row.value !== 'hotseat') { await controlled(row); await noteNaturalCheck(row); return true; }
  if (row.trace.length >= actionBudget) return false;
  await controlled(row); const observation = await driver.observation();
  const action = pawnMove(await page.evaluate(() => window.rift.getLegalActions()), observation.position);
  if (!action) return false;
  await driver.perform(action); row.trace.push({ label: 'hotseat-opponent-preparation', action, revision: (await driver.observation()).revision, record: await driver.record() }); await noteNaturalCheck(row);
  return true;
}
async function cancelPreparation(row, expected) {
  if (row.trace.length >= actionBudget) return false;
  await controlled(row);
  const action = matchingAction(await page.evaluate(() => window.rift.getLegalActions()), expected);
  if (!action) return false;
  await driver.square(action.from); await page.locator('#cancel-selection').waitFor({ state: 'visible' }); await page.locator('#cancel-selection').click();
  row.steps.cancelReselect = 'complete';
  return true;
}
async function markUnmet(row, plan, nextStep, reason) {
  row.steps.loadedShift = 'UNMET_ACTION_BUDGET';
  row.resume = { reason, nextStep, plan, actionBudget, trace: row.trace, record: await driver.record(), observation: await driver.observation() };
  receipt.pending.push({ row: row.id, ...row.resume });
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
  const side = row.human ?? 1, plan = loadedPlans[row.layout][side];
  const result = { ...row, plan, trace: [], steps: { modal: 'pending', ordinary: 'pending', emptyShift: 'pending', loadedShift: 'pending', cancelReselect: 'pending', checkFeedback: 'pending', camera: 'pending', settings: 'pending', exportImport: 'pending', replay: 'pending', recovery: 'pending' }, status: 'RUNNING' }; receipt.rows.push(result); await persist();
  try {
    await newMatch(row); result.steps.modal = 'complete';
    if (!await commitPlanned(result, plan.empty, 'planned-empty-shift')) await markUnmet(result, plan, 'empty', 'planned empty Shift was unavailable or the action budget was exhausted');
    else {
      result.steps.emptyShift = 'complete';
      if (!await advanceOpponent(result)) await markUnmet(result, plan, 'prepare', 'opponent did not yield a controlled preparation turn');
      else if (!await cancelPreparation(result, plan.prepare)) await markUnmet(result, plan, 'prepare', 'planned preparation move was unavailable or the action budget was exhausted');
      else if (!await commitPlanned(result, plan.prepare, 'planned-passenger-preparation')) await markUnmet(result, plan, 'prepare', 'planned preparation move could not commit');
      else {
        result.steps.ordinary = 'complete';
        if (!await advanceOpponent(result)) await markUnmet(result, plan, 'loaded', 'opponent did not yield a controlled loaded-Shift turn');
        else if (!await commitPlanned(result, plan.loaded, 'planned-loaded-passenger-shift', plan.loaded.passenger)) await markUnmet(result, plan, 'loaded', 'planned passenger Shift was unavailable or the action budget was exhausted');
        else result.steps.loadedShift = 'complete';
      }
    }
    if (result.steps.loadedShift === 'complete') {
      if (result.steps.checkFeedback === 'pending') {
        result.steps.checkFeedback = 'SEPARATE_COVERAGE_REQUIRED_NO_NATURAL_CHECK';
        receipt.separateCoverage.push({ row: row.id, requirement: 'check feedback', reason: 'No natural check occurred in the deterministic matrix path; preserve separate edge-case UI coverage.' });
      }
      for (const preset of ['white', 'black', 'overview', 'top']) await driver.camera(preset); result.steps.camera = 'complete'; await settings(); result.steps.settings = 'complete';
      await exportImportReplayRecovery(result); result.finalRecord = await driver.record(); result.finalMetrics = await driver.metrics(); await page.screenshot({ path: path.join(root, `${row.id}-ending.png`) });
      result.status = result.steps.checkFeedback === 'COMPLETE_NATURAL_CHECK' ? 'COMPLETE_FLOW' : 'COMPLETE_FLOW_SEPARATE_CHECK_COVERAGE_REQUIRED';
    } else result.status = 'UNMET_ACTION_BUDGET';
  } catch (error) { result.status = 'FAILED'; result.failure = error.stack; }
  result.finished = new Date().toISOString(); await persist();
}

try {
  receipt.build = { source: await sourceIdentity(), browser: await browser.version() };
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.enterPlay();
  receipt.build.initialPrecache = await servedPrecache();
  for (const row of cases) await run(row);
  receipt.build.finalPrecache = await servedPrecache(); assert.deepEqual(receipt.build.finalPrecache, receipt.build.initialPrecache, 'Served precache identity changed during the matrix');
  receipt.status = receipt.rows.some(row => row.status === 'FAILED') ? 'FAILED' : receipt.rows.some(row => row.status === 'UNMET_ACTION_BUDGET') ? 'UNMET_ACTION_BUDGET' : receipt.rows.some(row => row.status === 'PENDING') ? 'PENDING' : receipt.separateCoverage.length ? 'COMPLETE_FLOW_MATRIX_SEPARATE_CHECK_COVERAGE_REQUIRED' : 'COMPLETE_FLOW_MATRIX';
  if (receipt.errors.length) throw new Error(`Browser errors: ${receipt.errors.join('; ')}`);
} catch (error) { receipt.status = 'FAILED'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message); }
finally { if (receipt.status === 'FAILED' || receipt.status === 'PENDING' || receipt.status === 'UNMET_ACTION_BUDGET') process.exitCode = 1; receipt.finished = new Date().toISOString(); await persist(); await context.close(); await browser.close(); console.log(JSON.stringify({ status: receipt.status, rows: receipt.rows.map(row => ({ id: row.id, status: row.status })) })); }
