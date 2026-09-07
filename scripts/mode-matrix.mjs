/** Product-flow matrix. Natural paths use only visible UI; edge fixture coverage uses a labeled visible save import. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
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
const receipt = { started: new Date().toISOString(), purpose: 'state-coupled real-UI product matrix with separately labeled visible-import edge check coverage; no visual acceptance claim', url: base, requestedRows: cases.map(item => item.id), actionBudget, rows: [], errors: [], pending: [] };
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

const conformance = JSON.parse(await fs.readFile('fixtures/conformance.json', 'utf8'));
const cutCheckRay = conformance.fixtures.find(item => item.name === 'cut_check_ray');
assert.ok(cutCheckRay, 'cut_check_ray fixture is required for labeled check-feedback coverage');
const cutCheckAction = cutCheckRay.children.find(item => item.action.type === 'shift' && item.action.from === 'C2' && item.action.to === 'B2')?.action;
assert.deepEqual(cutCheckAction, { id: 20985, type: 'shift', from: 'C2', to: 'B2', promotion: null });
assert.equal(cutCheckRay.record.actions.length, 0, 'cut_check_ray must remain an immutable setup record');
assert.equal(cutCheckRay.record.initial.castling, 0, 'cut_check_ray must not carry castling rights');
assert.equal(cutCheckRay.record.initial.ep_target, -1, 'cut_check_ray must not carry an en-passant target');
assert.equal(cutCheckRay.record.initial.ep_pawn, -1, 'cut_check_ray must not carry an en-passant pawn');

function transformSquare(index, horizontal, vertical) {
  let file = index % 8, rank = Math.floor(index / 8);
  if (horizontal) file = 7 - file;
  if (vertical) rank = 7 - rank;
  return rank * 8 + file;
}
function transformMacro(name, horizontal, vertical) {
  let file = name.charCodeAt(0) - 65, rank = Number(name[1]) - 1;
  if (horizontal) file = 3 - file;
  if (vertical) rank = 3 - rank;
  return String.fromCharCode(65 + file) + (rank + 1);
}
function transformFixturePosition(source, horizontal, vertical) {
  const board = Array(64).fill(0);
  for (let index = 0; index < source.board.length; index++) board[transformSquare(index, horizontal, vertical)] = vertical ? -source.board[index] : source.board[index];
  let holes = 0;
  for (let index = 0; index < 16; index++) if (source.holes & (1 << index)) {
    let file = index % 4, rank = Math.floor(index / 4);
    if (horizontal) file = 3 - file;
    if (vertical) rank = 3 - rank;
    holes |= 1 << (rank * 4 + file);
  }
  return { ...structuredClone(source), board, holes, side: vertical ? -source.side : source.side };
}
function fixturePositionHash(position) {
  return createHash('sha256').update(JSON.stringify(['rift-chess/1.0', position.board, position.holes, position.side, position.castling, -1, -1])).digest('hex');
}
assert.equal(fixturePositionHash(cutCheckRay.record.initial), cutCheckRay.record.final_position_hash, 'cut_check_ray hash contract drifted from the engine EP-none position identity');
function fixtureVariant(row) {
  const vertical = row.human === -1, horizontal = row.layout === 'C';
  const initial = transformFixturePosition({ ...cutCheckRay.record.initial, holes: (1 << 5) | (1 << 9) }, horizontal, vertical);
  const action = { type: 'shift', from: transformMacro('C2', horizontal, vertical), to: transformMacro('B2', horizontal, vertical), promotion: null };
  return {
    id: `${vertical ? 'Black' : 'White'}${row.layout}`,
    initial,
    action,
    record: { ...structuredClone(cutCheckRay.record), draw_policy: row.policy, initial, actions: [], draw_offer: null, override: null, final_position_hash: fixturePositionHash(initial) },
  };
}
const fixtureTransformCheck = [
  [{ layout: 'B', human: 1 }, 'WhiteB', 'C2', 'B2'],
  [{ layout: 'C', human: 1 }, 'WhiteC', 'B2', 'C2'],
  [{ layout: 'B', human: -1 }, 'BlackB', 'C3', 'B3'],
  [{ layout: 'C', human: -1 }, 'BlackC', 'B3', 'C3'],
];
for (const [row, id, from, to] of fixtureTransformCheck) {
  const variant = fixtureVariant({ ...row, policy: 'prompt' });
  assert.equal(variant.id, id);
  assert.deepEqual(variant.action, { type: 'shift', from, to, promotion: null });
}

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

async function exportEnvelope(name) {
  await driver.openDrawer('Match & view');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadPromise;
  const envelope = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  assert.equal(envelope.schema, 'rift-ui-save/1', `${name} must remain a UI save envelope`);
  return envelope;
}
async function importEnvelope(name, envelope) {
  await driver.openDrawer('Match & view');
  const priorId = (await driver.observation()).game_id;
  await page.locator('#import').setInputFiles({ name: `${name}.json`, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(envelope)) });
  await page.waitForFunction(({ expectedHash, priorId }) => window.rift.getObservation().game_id !== priorId && window.rift.exportRecord().final_position_hash === expectedHash, { expectedHash: envelope.record.final_position_hash, priorId }, { timeout: 10000 });
  await driver.ready();
}
async function separateFixtureCheck(row) {
  await controlled(row);
  const naturalObservation = await driver.observation();
  const naturalRecord = await driver.record();
  const naturalEnvelope = await exportEnvelope(`${row.id}-natural`);
  assert.equal(naturalEnvelope.mode, row.value, 'Fixture coverage must preserve the row mode.');
  assert.equal(naturalEnvelope.record.draw_policy, row.policy, 'Fixture coverage must preserve the row draw policy.');
  assert.deepEqual(naturalEnvelope.record, naturalRecord, 'Visible export must preserve the natural record before fixture coverage.');
  if (row.value !== 'hotseat') assert.equal(naturalObservation.position.side, row.human, 'Fixture coverage must save a human-to-move natural bot row.');
  const variant = fixtureVariant({ ...row, human: row.human ?? 1 });
  const fixtureEnvelope = {
    ...structuredClone(naturalEnvelope),
    record: variant.record,
    mode: row.value,
    practice: naturalEnvelope.practice,
    preferences: structuredClone(naturalEnvelope.preferences),
  };
  row.edgeFixture = { classification: 'separate labeled fixture-derived check-feedback coverage; not a natural matrix path', fixture: 'cut_check_ray', adaptation: 'Restore default B opening holes before the layout/color transform; original fixture remains immutable.', sourceRecordSha256: createHash('sha256').update(JSON.stringify(cutCheckRay.record)).digest('hex'), variant: variant.id, naturalRecord, naturalEnvelope, fixtureEnvelope };
  await importEnvelope(`${row.id}-cut-check-${variant.id}`, fixtureEnvelope);
  await controlled({ ...row, human: row.human ?? 1 });
  const before = await driver.observation();
  assert.equal(before.in_check, true, `${variant.id} fixture must put the human side in check.`);
  assert.equal(await page.locator('#check').innerText(), `${before.position.side === 1 ? 'White' : 'Black'} is in check`, `${variant.id} fixture must show check feedback before action.`);
  const action = await page.evaluate(expected => window.rift.getLegalActions().find(item => item.type === expected.type && item.from === expected.from && item.to === expected.to && item.promotion === expected.promotion), variant.action);
  assert.ok(action, `${variant.id} expected ray-cutting Shift must be legal through the shipped engine.`);
  await driver.perform(action, { beforeCommit: async () => page.evaluate(revision => {
    window.__riftFixtureCommit = new Promise(resolve => {
      const inspect = () => {
        const observation = window.rift.getObservation();
        if (observation.revision > revision) resolve({ observation, record: window.rift.exportRecord(), checkText: document.querySelector('#check').textContent });
        else requestAnimationFrame(inspect);
      };
      requestAnimationFrame(inspect);
    });
  }, before.revision) });
  const firstCommit = await page.evaluate(() => window.__riftFixtureCommit);
  const committed = firstCommit.observation;
  assert.equal(committed.revision, before.revision + 1, 'Check-clear evidence must precede the bot reply.');
  assert.equal(committed.in_check, false, `${variant.id} Shift must clear check at its committed position.`);
  const fixtureRecord = firstCommit.record;
  assert.deepEqual(fixtureRecord.actions, [action.id], `${variant.id} first committed record action must be the ray-cutting Shift.`);
  assert.doesNotMatch(firstCommit.checkText, /is in check/i, 'Visible check feedback must clear after the Shift.');
  row.edgeFixture.fixtureObservation = before;
  row.edgeFixture.expectedAction = variant.action;
  row.edgeFixture.committedAction = action;
  row.edgeFixture.committedObservation = committed;
  row.edgeFixture.fixtureRecord = fixtureRecord;
  row.edgeFixture.committedCheckText = firstCommit.checkText;
  await importEnvelope(`${row.id}-restore-natural`, naturalEnvelope);
  await controlled(row);
  assert.deepEqual(await driver.record(), naturalRecord, 'Visible fixture restore must recover the exact natural record.');
  const restoredEnvelope = await exportEnvelope(`${row.id}-restored-natural`);
  assert.deepEqual(restoredEnvelope, naturalEnvelope, 'Visible fixture restore must recover the exact natural UI envelope.');
  row.edgeFixture.restoredEnvelope = restoredEnvelope;
  row.steps.checkFeedback = 'COMPLETE_EDGE_FIXTURE_CHECK';
}

async function exportImportReplayRecovery(row) {
  await controlled(row); const beforeExport = await driver.record();
  const exported = await exportEnvelope(`${row.id}-roundtrip`);
  await importEnvelope(`${row.id}-roundtrip`, exported); await controlled(row); assert.deepEqual(await driver.record(), beforeExport); row.steps.exportImport = 'complete';
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
      if (result.steps.checkFeedback === 'pending') await separateFixtureCheck(result);
      for (const preset of ['white', 'black', 'overview', 'top']) await driver.camera(preset); result.steps.camera = 'complete'; await settings(); result.steps.settings = 'complete';
      await exportImportReplayRecovery(result); result.finalRecord = await driver.record(); result.finalMetrics = await driver.metrics(); await page.screenshot({ path: path.join(root, `${row.id}-ending.png`) });
      result.status = 'COMPLETE_FLOW';
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
  receipt.status = receipt.rows.some(row => row.status === 'FAILED') ? 'FAILED' : receipt.rows.some(row => row.status === 'UNMET_ACTION_BUDGET') ? 'UNMET_ACTION_BUDGET' : receipt.rows.some(row => row.status === 'PENDING') ? 'PENDING' : 'COMPLETE_FLOW_MATRIX';
  if (receipt.errors.length) throw new Error(`Browser errors: ${receipt.errors.join('; ')}`);
} catch (error) { receipt.status = 'FAILED'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message); }
finally { if (receipt.status === 'FAILED' || receipt.status === 'PENDING' || receipt.status === 'UNMET_ACTION_BUDGET') process.exitCode = 1; receipt.finished = new Date().toISOString(); await persist(); await context.close(); await browser.close(); console.log(JSON.stringify({ status: receipt.status, rows: receipt.rows.map(row => ({ id: row.id, status: row.status })) })); }
