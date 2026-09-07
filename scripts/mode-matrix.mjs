/** Real-input mode matrix with adaptive natural actions and separately labeled fixture checks. */
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
const cases = modes.flatMap(mode => ['B', 'C'].flatMap(layout => ['prompt', 'auto100', 'off'].map(policy => ({ id: `${mode.value}-${layout}-${policy}`, ...mode, layout, policy })))).filter(row => !chosen.size || chosen.has(row.id)).slice(0, limit);
if (!cases.length) throw new Error('No configured mode matrix row matches RIFT_MODE_CASES');
const conformance = JSON.parse(await fs.readFile('fixtures/conformance.json', 'utf8'));
const cutCheckRay = conformance.fixtures.find(item => item.name === 'cut_check_ray');
assert.ok(cutCheckRay, 'cut_check_ray fixture is required');
const cutCheckAction = cutCheckRay.children.find(item => item.action.type === 'shift' && item.action.from === 'C2' && item.action.to === 'B2')?.action;
assert.deepEqual(cutCheckAction, { id: 20985, type: 'shift', from: 'C2', to: 'B2', promotion: null });
assert.equal(cutCheckRay.record.actions.length, 0); assert.equal(cutCheckRay.record.initial.castling, 0); assert.equal(cutCheckRay.record.initial.ep_target, -1); assert.equal(cutCheckRay.record.initial.ep_pawn, -1);
const receipt = { started: new Date().toISOString(), purpose: 'adaptive real-UI mode matrix; fixture coverage is separately labeled and not a natural path', url: base, requestedRows: cases.map(row => row.id), actionBudget, rows: [], pending: [], errors: [] };
let browser, context, page, driver;
const persist = () => fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2));
async function sourceIdentity() {
  const packageInfo = JSON.parse(await fs.readFile('package.json', 'utf8'));
  try { const [{ stdout: revision }, { stdout: status }] = await Promise.all([execFileAsync('git', ['rev-parse', 'HEAD']), execFileAsync('git', ['status', '--porcelain'])]); return { packageVersion: packageInfo.version, gitRevision: revision.trim(), worktreeDirty: Boolean(status.trim()) }; }
  catch { return { packageVersion: packageInfo.version, gitRevision: null, worktreeDirty: null }; }
}
async function servedPrecache() { return page.evaluate(async () => { const response = await fetch('./precache.json', { cache: 'no-store' }); if (!response.ok) throw new Error(`precache identity unavailable (${response.status})`); return response.json(); }); }
async function bounded(promise, label, timeout = 5000) {
  let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeout); })]); }
  finally { clearTimeout(timer); }
}
const squareIndex = name => (Number(name[1]) - 1) * 8 + name.charCodeAt(0) - 97;
const macroIndex = name => (Number(name[1]) - 1) * 4 + name.charCodeAt(0) - 65;
const macroSquares = tile => [tile % 4 * 2 + Math.floor(tile / 4) * 16, tile % 4 * 2 + 1 + Math.floor(tile / 4) * 16, tile % 4 * 2 + 8 + Math.floor(tile / 4) * 16, tile % 4 * 2 + 9 + Math.floor(tile / 4) * 16];
const squareName = square => String.fromCharCode(97 + square % 8) + (Math.floor(square / 8) + 1);
const macroOf = square => Math.floor(square / 8 / 2) * 4 + Math.floor(square % 8 / 2);
const adjacentHole = (position, tile) => [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([x, y]) => {
  const file = tile % 4 + x, rank = Math.floor(tile / 4) + y;
  return file >= 0 && file < 4 && rank >= 0 && rank < 4 && (position.holes & (1 << (rank * 4 + file))) !== 0;
});
const uniqueShiftActions = actions => [...new Map(actions.filter(action => action.type === 'shift').map(action => [`${action.from}>${action.to}`, action])).values()].sort((a, b) => a.id - b.id);

async function legal() { return page.evaluate(() => window.rift.getLegalActions()); }
async function controlled(row) {
  if (row.value === 'hotseat') return driver.ready();
  await page.waitForFunction(side => { const observation = window.rift.getObservation(); return Boolean(observation.outcome) || (observation.position.side === side && !window.rift.metrics().animating); }, row.human, { timeout: 120000 });
}
async function snapshot(row, label) {
  const observation = await driver.observation(), record = await driver.record();
  row.actionCount = record.actions.length;
  if (row.lastRevision !== observation.revision) row.trace.push({ label, revision: observation.revision, observation, record });
  row.lastRevision = observation.revision;
  if (observation.in_check && row.steps.checkFeedback === 'pending') { assert.match(await page.locator('#check').innerText(), /is in check/i); row.steps.checkFeedback = 'COMPLETE_NATURAL_CHECK'; }
  return { observation, record };
}
async function newMatch(row) {
  await page.locator('#new-game').click(); const dialog = page.locator('#new-dialog'); await dialog.waitFor({ state: 'visible' });
  for (const [name, value] of [['mode', row.value], ['layout', row.layout], ['draw', row.policy]]) {
    const input = dialog.locator(`input[name="${name}"][value="${value}"]`); assert.equal(await input.isVisible(), true); await input.check();
  }
  await dialog.locator('#start-game').click(); await driver.ready(); await driver.camera('top');
}
async function settings() {
  await page.locator('#settings').click(); const dialog = page.locator('#settings-dialog');
  await dialog.locator('[name="quality"]').selectOption('balanced'); await dialog.locator('[name="motion"]').setChecked(true); await dialog.getByRole('button', { name: 'Apply', exact: true }).click(); await driver.ready();
}

function classify(position, actions) {
  const shifts = uniqueShiftActions(actions);
  const occupant = tile => macroSquares(tile).filter(square => position.board[square] !== 0);
  const empty = shifts.find(action => occupant(macroIndex(action.from)).length === 0);
  const loaded = shifts.find(action => {
    const pieces = occupant(macroIndex(action.from));
    return pieces.length === 1 && position.board[pieces[0]] * position.side > 0;
  });
  const ordinary = actions.filter(action => action.type === 'move' && !action.promotion).find(action => {
    const source = squareIndex(action.from), destination = squareIndex(action.to), tile = macroOf(destination), piece = Math.abs(position.board[source]);
    return (piece === 1 || piece === 7 || piece === 2) && macroOf(source) !== tile && adjacentHole(position, tile) && macroSquares(tile).every(square => position.board[square] === 0);
  });
  return { empty, loaded, ordinary };
}
async function cancelAndReselect(row, action) {
  if (row.steps.cancelReselect !== 'pending') return;
  const intent = action.type === 'move' ? '#move-mode' : '#shift-mode';
  if (await page.locator(intent).getAttribute('aria-pressed') !== 'true') await page.locator(intent).click();
  if (action.type === 'move') await driver.square(action.from); else await driver.square(driver.macroSquare(action.from));
  await page.locator('#cancel-selection').waitFor({ state: 'visible' }); await page.locator('#cancel-selection').click();
  row.steps.cancelReselect = 'complete';
}
async function commitNatural(row, action, kind) {
  if (row.actionCount >= actionBudget) return false;
  await cancelAndReselect(row, action);
  const position = (await driver.observation()).position, current = (await legal()).find(item => item.id === action.id);
  if (!current) return false;
  if (kind === 'loaded') {
    const passenger = macroSquares(macroIndex(current.from)).find(square => position.board[square] !== 0);
    if (passenger === undefined) return false;
    await driver.performPassengerShift({ passenger: squareName(passenger), to: current.to, promotion: current.promotion });
  } else await driver.perform(current);
  await snapshot(row, `natural-${kind}`); row.steps[kind === 'empty' ? 'emptyShift' : kind === 'loaded' ? 'loadedShift' : 'ordinary'] = 'complete';
  return true;
}
async function advanceHotseat(row) {
  if (row.value !== 'hotseat' || row.actionCount >= actionBudget) return row.value !== 'hotseat';
  const { observation } = await snapshot(row, 'hotseat-turn');
  const action = (await legal()).find(item => item.type === 'move' && Math.abs(observation.position.board[squareIndex(item.from)]) === 7) || (await legal())[0];
  if (!action) return false;
  await driver.perform(action); await snapshot(row, 'hotseat-opponent'); return true;
}
async function naturalCoverage(row) {
  while (row.actionCount < actionBudget) {
    await controlled(row); const { observation } = await snapshot(row, row.value === 'hotseat' ? 'hotseat-turn' : 'bot-reply-or-human-turn');
    if (row.steps.ordinary === 'complete' && row.steps.emptyShift === 'complete' && row.steps.loadedShift === 'complete' && row.steps.cancelReselect === 'complete') return true;
    if (observation.outcome) break;
    const candidates = classify(observation.position, await legal());
    const missing = row.steps.loadedShift === 'pending' && candidates.loaded ? ['loaded', candidates.loaded]
      : row.steps.emptyShift === 'pending' && candidates.empty ? ['empty', candidates.empty]
        : candidates.ordinary && (row.steps.ordinary === 'pending' || row.steps.loadedShift === 'pending') ? ['ordinary', candidates.ordinary] : null;
    if (!missing) {
      if (row.value === 'hotseat' && await advanceHotseat(row)) continue;
      break;
    }
    if (!await commitNatural(row, missing[1], missing[0])) break;
    if (row.steps.ordinary === 'complete' && row.steps.emptyShift === 'complete' && row.steps.loadedShift === 'complete' && row.steps.cancelReselect === 'complete') return true;
    if (row.value === 'hotseat' && !await advanceHotseat(row)) break;
  }
  return row.steps.ordinary === 'complete' && row.steps.emptyShift === 'complete' && row.steps.loadedShift === 'complete' && row.steps.cancelReselect === 'complete';
}
async function exportEnvelope(name) {
  await driver.openDrawer('Match & view'); const downloadPromise = page.waitForEvent('download'); await page.locator('#export').click();
  const download = await downloadPromise, envelope = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  assert.equal(envelope.schema, 'rift-ui-save/1', `${name} must be a UI save envelope`); return envelope;
}
async function importEnvelope(name, envelope) {
  await driver.openDrawer('Match & view'); const before = (await driver.observation()).game_id;
  await page.locator('#import').setInputFiles({ name: `${name}.json`, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(envelope)) });
  await page.waitForFunction(({ before, hash }) => window.rift.getObservation().game_id !== before && window.rift.exportRecord().final_position_hash === hash, { before, hash: envelope.record.final_position_hash }); await driver.ready();
}

function transformSquare(index, horizontal, vertical) {
  let file = index % 8, rank = Math.floor(index / 8); if (horizontal) file = 7 - file; if (vertical) rank = 7 - rank;
  return rank * 8 + file;
}
function transformMacro(name, horizontal, vertical) {
  let file = name.charCodeAt(0) - 65, rank = Number(name[1]) - 1; if (horizontal) file = 3 - file; if (vertical) rank = 3 - rank;
  return String.fromCharCode(65 + file) + (rank + 1);
}
function transformFixturePosition(source, horizontal, vertical) {
  const board = Array(64).fill(0);
  for (let index = 0; index < source.board.length; index++) board[transformSquare(index, horizontal, vertical)] = vertical ? -source.board[index] : source.board[index];
  let holes = 0;
  for (let index = 0; index < 16; index++) if (source.holes & (1 << index)) { let file = index % 4, rank = Math.floor(index / 4); if (horizontal) file = 3 - file; if (vertical) rank = 3 - rank; holes |= 1 << (rank * 4 + file); }
  return { ...structuredClone(source), board, holes, side: vertical ? -source.side : source.side };
}
function fixturePositionHash(position) { return createHash('sha256').update(JSON.stringify(['rift-chess/1.0', position.board, position.holes, position.side, position.castling, -1, -1])).digest('hex'); }
assert.equal(fixturePositionHash(cutCheckRay.record.initial), cutCheckRay.record.final_position_hash, 'cut_check_ray hash contract drifted');
function fixtureVariant(row) {
  const vertical = row.human === -1, horizontal = row.layout === 'C', initial = transformFixturePosition({ ...cutCheckRay.record.initial, holes: (1 << 5) | (1 << 9) }, horizontal, vertical);
  const action = { type: 'shift', from: transformMacro('C2', horizontal, vertical), to: transformMacro('B2', horizontal, vertical), promotion: null };
  return { id: `${vertical ? 'Black' : 'White'}${row.layout}`, initial, action, record: { ...structuredClone(cutCheckRay.record), draw_policy: row.policy, initial, actions: [], draw_offer: null, override: null, final_position_hash: fixturePositionHash(initial) } };
}
for (const [row, id, from, to] of [[{ layout: 'B', human: 1 }, 'WhiteB', 'C2', 'B2'], [{ layout: 'C', human: 1 }, 'WhiteC', 'B2', 'C2'], [{ layout: 'B', human: -1 }, 'BlackB', 'C3', 'B3'], [{ layout: 'C', human: -1 }, 'BlackC', 'B3', 'C3']]) {
  const variant = fixtureVariant({ ...row, policy: 'prompt' }); assert.equal(variant.id, id); assert.deepEqual(variant.action, { type: 'shift', from, to, promotion: null });
}
async function holdNextWorker(row) {
  if (row.value === 'hotseat') return null;
  let release, arrived, delivered; const released = new Promise(resolve => { release = resolve; }), requested = new Promise(resolve => { arrived = resolve; }), delivery = new Promise(resolve => { delivered = resolve; }); let held = false, closed = false;
  const handler = async route => {
    if (held) return route.continue(); held = true; arrived(); await released; try { await route.continue(); } finally { delivered(); }
  };
  await context.route('**/worker-*.js', handler);
  return { requested, delivery, release: () => { if (!closed) { closed = true; release(); if (!held) delivered(); } }, cleanup: () => context.unroute('**/worker-*.js', handler) };
}
async function separateFixtureCheck(row) {
  await controlled(row); const naturalObservation = await driver.observation(), naturalRecord = await driver.record(), naturalEnvelope = await exportEnvelope(`${row.id}-natural`);
  assert.equal(naturalEnvelope.mode, row.value); assert.equal(naturalEnvelope.record.draw_policy, row.policy); assert.deepEqual(naturalEnvelope.record, naturalRecord); if (row.value !== 'hotseat') assert.equal(naturalObservation.position.side, row.human);
  const variant = fixtureVariant({ ...row, human: row.human ?? 1 });
  const fixtureEnvelope = { ...structuredClone(naturalEnvelope), record: variant.record, mode: row.value, practice: naturalEnvelope.practice, preferences: structuredClone(naturalEnvelope.preferences) };
  row.edgeFixture = { classification: 'separate labeled fixture-derived check-feedback coverage; not a natural matrix path', fixture: 'cut_check_ray', adaptation: 'layout/color transform of immutable fixture with default B holes restored', sourceRecordSha256: createHash('sha256').update(JSON.stringify(cutCheckRay.record)).digest('hex'), naturalRecord, naturalEnvelope, fixtureEnvelope, variant: variant.id, controlledDelivery: row.value === 'hotseat' ? 'not needed' : 'next real worker-script delivery held only until the first committed revision witness' };
  await importEnvelope(`${row.id}-cut-check`, fixtureEnvelope); await controlled({ ...row, human: row.human ?? 1 });
  const before = await driver.observation(); assert.equal(before.in_check, true); assert.match(await page.locator('#check').innerText(), /is in check/i);
  const action = (await legal()).find(item => item.type === 'shift' && item.from === variant.action.from && item.to === variant.action.to && item.promotion === null); assert.ok(action, 'Fixture ray-cutting Shift must remain legal');
  const gate = await holdNextWorker(row);
  try {
    await driver.perform(action, { beforeCommit: () => page.evaluate(revision => {
      window.__riftFixtureCommit = new Promise(resolve => {
        const inspect = () => { const observation = window.rift.getObservation(); if (observation.revision > revision) resolve({ observation, record: window.rift.exportRecord(), checkText: document.querySelector('#check').textContent }); else requestAnimationFrame(inspect); }; requestAnimationFrame(inspect);
      });
    }, before.revision) });
    if (gate) await bounded(gate.requested, 'fixture worker request');
    const first = await page.evaluate(() => window.__riftFixtureCommit);
    assert.equal(first.observation.revision, before.revision + 1, 'First revision witness cannot include a bot reply'); assert.equal(first.observation.in_check, false); assert.deepEqual(first.record.actions, [action.id]); assert.doesNotMatch(first.checkText, /is in check/i);
    Object.assign(row.edgeFixture, { fixtureObservation: before, expectedAction: variant.action, committedAction: action, committedObservation: first.observation, fixtureRecord: first.record, committedCheckText: first.checkText });
  } finally { if (gate) { gate.release(); try { await bounded(gate.delivery, 'fixture worker delivery'); } finally { await gate.cleanup(); } } }
  await importEnvelope(`${row.id}-restore-natural`, naturalEnvelope); await controlled(row); assert.deepEqual(await driver.record(), naturalRecord); const restoredEnvelope = await exportEnvelope(`${row.id}-restored-natural`); assert.deepEqual(restoredEnvelope, naturalEnvelope); row.edgeFixture.restoredEnvelope = restoredEnvelope;
  row.steps.checkFeedback = 'COMPLETE_EDGE_FIXTURE_CHECK';
}
async function exportImportReplayRecovery(row) {
  await controlled(row); const before = await driver.record(), exported = await exportEnvelope(`${row.id}-roundtrip`);
  await importEnvelope(`${row.id}-roundtrip`, exported); await controlled(row); assert.deepEqual(await driver.record(), before); row.steps.exportImport = 'complete';
  await page.locator('#replay').click(); await page.locator('#replay-back').click(); await page.locator('#replay-exit').click(); await controlled(row); row.steps.replay = 'complete';
  const recovery = await page.evaluate(() => JSON.parse(localStorage.getItem('rift-chess.save.recovery.v1')).record);
  await page.evaluate(() => { const original = localStorage.getItem('rift-chess.save.v1'), backup = localStorage.getItem('rift-chess.save.recovery.v1'), corrupt = JSON.parse(original); corrupt.record.final_position_hash = 'corrupt'; addEventListener('beforeunload', () => { localStorage.setItem('rift-chess.save.v1', JSON.stringify(corrupt)); localStorage.setItem('rift-chess.save.recovery.v1', backup); }, { once: true }); });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.enterPlay(); await controlled(row); assert.deepEqual(await driver.record(), recovery); assert.match(await page.locator('#notice').innerText(), /recovery copy/); row.steps.recovery = 'complete';
}
async function markUnmet(row, reason) {
  for (const step of ['ordinary', 'emptyShift', 'loadedShift', 'cancelReselect']) if (row.steps[step] === 'pending') row.steps[step] = 'UNMET_ACTION_BUDGET';
  row.resume = { reason, actionBudget, actionCount: row.actionCount, trace: row.trace, record: await driver.record(), observation: await driver.observation() }; receipt.pending.push({ row: row.id, ...row.resume });
}
async function run(row) {
  const result = { ...row, trace: [], lastRevision: null, actionCount: 0, steps: { modal: 'pending', ordinary: 'pending', emptyShift: 'pending', loadedShift: 'pending', cancelReselect: 'pending', checkFeedback: 'pending', camera: 'pending', settings: 'pending', exportImport: 'pending', replay: 'pending', recovery: 'pending' }, status: 'RUNNING' };
  receipt.rows.push(result); await persist();
  try {
    await newMatch(row); result.steps.modal = 'complete'; await snapshot(result, 'new-match');
    if (!await naturalCoverage(result)) { await markUnmet(result, 'No current legal adaptive natural action completed every required type within the explicit action budget.'); result.status = 'UNMET_ACTION_BUDGET'; }
    else {
      if (result.steps.checkFeedback === 'pending') await separateFixtureCheck(result);
      for (const preset of ['white', 'black', 'overview', 'top']) await driver.camera(preset); result.steps.camera = 'complete'; await settings(); result.steps.settings = 'complete';
      await exportImportReplayRecovery(result); result.finalRecord = await driver.record(); result.finalMetrics = await driver.metrics(); await page.screenshot({ path: path.join(root, `${row.id}-ending.png`) }); result.status = 'COMPLETE_FLOW';
    }
  } catch (error) { result.status = 'FAILED'; result.failure = error instanceof Error ? error.stack : String(error); }
  result.finished = new Date().toISOString(); await persist();
}

try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
  context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block', acceptDownloads: true }); page = await context.newPage(); driver = createUiDriver(page);
  page.on('pageerror', error => receipt.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.enterPlay();
  receipt.build = { source: await sourceIdentity(), browser: await browser.version(), initialPrecache: await servedPrecache() };
  for (const row of cases) await run(row);
  receipt.build.finalPrecache = await servedPrecache(); assert.deepEqual(receipt.build.finalPrecache, receipt.build.initialPrecache);
  receipt.status = receipt.rows.some(row => row.status === 'FAILED') ? 'FAILED' : receipt.rows.some(row => row.status === 'UNMET_ACTION_BUDGET') ? 'UNMET_ACTION_BUDGET' : 'COMPLETE_FLOW_MATRIX';
  if (receipt.errors.length) throw new Error(`Browser errors: ${receipt.errors.join('; ')}`);
} catch (error) {
  receipt.status = 'FAILED'; receipt.failure = error instanceof Error ? error.stack : String(error); process.exitCode = 1; console.error(error);
} finally {
  if (receipt.status !== 'COMPLETE_FLOW_MATRIX') process.exitCode = 1;
  if (context) await context.close().catch(() => {}); if (browser) await browser.close().catch(() => {});
  receipt.finished = new Date().toISOString(); await persist(); console.log(JSON.stringify({ status: receipt.status, rows: receipt.rows.map(row => ({ id: row.id, status: row.status })) }));
}
