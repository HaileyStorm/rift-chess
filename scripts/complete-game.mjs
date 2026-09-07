/** Six natural terminal attempts through the rendered UI; never substitutes resignation or agreement. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { createUiDriver } from './ui-driver.mjs';
import { cachedBuild } from './offline-assets.mjs';

const execFileAsync = promisify(execFile);
const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const root = path.resolve('.artifacts', process.env.RIFT_TEST_RUN || 'complete-game');
const receiptPath = path.join(root, 'receipt.json');
const maxActions = Number(process.env.RIFT_COMPLETE_MAX_ACTIONS || 500);
const requested = new Set((process.env.RIFT_COMPLETE_GAMES || '').split(',').map(value => value.trim()).filter(Boolean));
const resumePath = process.env.RIFT_COMPLETE_RESUME;
if (!Number.isInteger(maxActions) || maxActions < 1) throw new Error('RIFT_COMPLETE_MAX_ACTIONS must be a positive integer');
async function prepareOutput() {
  try { await fs.access(receiptPath); throw new Error(`Refusing to overwrite an earlier completion receipt: ${root}`); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; }
  try { if ((await fs.readdir(root)).length) throw new Error(`Refusing non-empty completion output directory: ${root}`); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; }
  await fs.mkdir(path.join(root, 'records'), { recursive: true });
}
await prepareOutput();

let resume = null;
if (resumePath) {
  resume = JSON.parse(await fs.readFile(path.resolve(resumePath), 'utf8'));
  if (!process.env.RIFT_TEST_RUN || !resume.uiSave || !resume.fullRecord || !resume.mode || !resume.layout || !resume.policy || !Array.isArray(resume.priorTrace) || !resume.priorTraceBinding?.sha256) throw new Error('RIFT_COMPLETE_RESUME requires a prior resume input and a new RIFT_TEST_RUN output directory');
  const traceHash = createHash('sha256').update(JSON.stringify(resume.priorTrace)).digest('hex');
  if (traceHash !== resume.priorTraceBinding.sha256 || resume.fullRecord.actions.length !== resume.priorTraceBinding.actionCount) throw new Error('Resume trace binding does not match its full record');
}

const defaults = [
  { id: 'human-white-B-prompt', mode: 'bot-black', human: 1, layout: 'B', policy: 'prompt' },
  { id: 'human-black-B-auto100', mode: 'bot-white', human: -1, layout: 'B', policy: 'auto100' },
  { id: 'human-white-C-off', mode: 'bot-black', human: 1, layout: 'C', policy: 'off' },
  { id: 'human-black-C-prompt', mode: 'bot-white', human: -1, layout: 'C', policy: 'prompt' },
  { id: 'hotseat-B-auto100', mode: 'hotseat', human: null, layout: 'B', policy: 'auto100' },
  { id: 'hotseat-C-off', mode: 'hotseat', human: null, layout: 'C', policy: 'off' },
];
const games = (resume ? [{ id: `continuation-${resume.id}`, mode: resume.mode, human: resume.mode === 'bot-black' ? 1 : resume.mode === 'bot-white' ? -1 : null, layout: resume.layout, policy: resume.policy, resume }] : defaults).filter(game => !requested.size || requested.has(game.id));
if (!games.length) throw new Error('No configured game matches RIFT_COMPLETE_GAMES');

async function sourceIdentity() {
  const packageInfo = JSON.parse(await fs.readFile('package.json', 'utf8'));
  try { const [{ stdout: revision }, { stdout: status }] = await Promise.all([execFileAsync('git', ['rev-parse', 'HEAD']), execFileAsync('git', ['status', '--porcelain'])]); return { packageVersion: packageInfo.version, gitRevision: revision.trim(), worktreeDirty: Boolean(status.trim()) }; }
  catch { return { packageVersion: packageInfo.version, gitRevision: null, worktreeDirty: null }; }
}

const receipt = { started: new Date().toISOString(), purpose: 'automated real-UI games, not human usability or Elo evidence', url: base, maxActions, strategy: 'deterministic material, capture, promotion, pawn-progress, center, then action-id order; shifts receive a penalty and are selected only when their legal value warrants it, never repeated to force a draw', games: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'allow', acceptDownloads: true });
const page = await context.newPage(); const driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
async function persist() { await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2)); }
const squareIndex = square => (Number(square[1]) - 1) * 8 + square.charCodeAt(0) - 97;

function choose(actions, position) {
  const values = [0, 100, 320, 330, 500, 900, 2000, 100];
  const score = action => {
    if (action.type === 'shift') return (action.promotion ? 9800 : -180) + (action.id % 17) / 100;
    const source = squareIndex(action.from), target = squareIndex(action.to), moving = Math.abs(position.board[source]), victim = Math.abs(position.board[target]), progress = Math.abs(Math.floor(target / 8) - Math.floor(source / 8));
    return (action.promotion ? 10000 : 0) + (action.en_passant ? 1200 : values[victim] * 16) - (victim ? values[moving] : 0) + ((moving === 1 || moving === 7) ? 35 + progress * 12 : 0) + ((moving === 2 || moving === 3) ? 15 : 0) - Math.abs((target % 8) - 3.5);
  };
  return [...actions].sort((left, right) => score(right) - score(left) || left.id - right.id)[0];
}

async function newMatch(game) {
  if (game.resume) {
    await driver.openDrawer('Match & view');
    await page.locator('#import').setInputFiles({ name: 'resume-ui-save.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(game.resume.uiSave)) }); await driver.ready();
    if (JSON.stringify(await driver.record()) !== JSON.stringify(game.resume.fullRecord)) throw new Error('Visible UI import did not restore the requested continuation record');
    return;
  }
  await page.locator('#new-game').click(); const dialog = page.locator('#new-dialog'); await dialog.waitFor({ state: 'visible' });
  await dialog.locator(`input[name="mode"][value="${game.mode}"]`).check(); await dialog.locator(`input[name="layout"][value="${game.layout}"]`).check(); await dialog.locator(`input[name="draw"][value="${game.policy}"]`).check(); await dialog.locator('#practice').setChecked(false);
  await dialog.locator('#start-game').click(); await driver.ready(); await driver.camera('top');
}

async function waitForControlledTurn(game) {
  if (game.mode === 'hotseat') return driver.ready();
  await page.waitForFunction(side => { const state = window.rift.getObservation(); return Boolean(state.outcome) || (state.position.side === side && !window.rift.metrics().animating); }, game.human, { timeout: 120000 });
}

async function snapshotNewActions(game, record) {
  if (record.actions.length <= game.savedActions) return;
  const file = path.join('records', `${game.id}-prefix-${String(record.actions.length).padStart(4, '0')}.json`);
  await fs.writeFile(path.join(root, file), JSON.stringify(record, null, 2));
  const exactNext = record.actions.length === game.savedActions + 1;
  game.trace.push(exactNext ? { kind: 'action-prefix', actionNumber: record.actions.length, action: record.actions.at(-1), recordFile: file, observedPrefixLength: record.actions.length } : { kind: 'observed-prefix', fromAction: game.savedActions + 1, throughAction: record.actions.length, recordFile: file, observedPrefixLength: record.actions.length }); game.latestRecord = file;
  game.savedActions = record.actions.length; await persist();
}

async function play(game) {
  await newMatch(game); const state = { ...game, trace: [], savedActions: game.resume?.fullRecord.actions.length ?? 0, continuationOf: game.resume?.priorTraceBinding ?? null, status: 'RUNNING', started: new Date().toISOString() }; receipt.games.push(state); await persist();
  while (true) {
    await waitForControlledTurn(game); const observation = await driver.observation(), record = await driver.record(); await snapshotNewActions(state, record);
    if (observation.outcome) { state.outcome = observation.outcome; state.status = 'NATURAL_TERMINAL'; break; }
    if (record.actions.length >= maxActions) { state.status = 'INCOMPLETE_RESUMABLE'; state.reason = `action budget ${maxActions} reached before a natural terminal result`; break; }
    const action = choose(await page.evaluate(() => window.rift.getLegalActions()), observation.position);
    if (!action) { state.status = 'INCOMPLETE_RESUMABLE'; state.reason = 'No legal action was exposed while the game remained ongoing'; break; }
    await driver.perform(action); await snapshotNewActions(state, await driver.record());
  }
  state.finalRecord = await driver.record(); state.finalMetrics = await driver.metrics(); state.finished = new Date().toISOString(); await fs.writeFile(path.join(root, `records/${state.id}-final.json`), JSON.stringify(state.finalRecord, null, 2));
  if (state.status === 'INCOMPLETE_RESUMABLE') {
    const uiSave = await page.evaluate(() => JSON.parse(localStorage.getItem('rift-chess.save.v1')));
    const priorTrace = state.trace, priorTraceBinding = { actionCount: state.finalRecord.actions.length, sha256: createHash('sha256').update(JSON.stringify(priorTrace)).digest('hex') };
    state.resumeInput = path.join('records', `${state.id}-resume-input.json`); await fs.writeFile(path.join(root, state.resumeInput), JSON.stringify({ id: state.id, uiSave, fullRecord: state.finalRecord, mode: state.mode, layout: state.layout, policy: state.policy, priorTrace, priorTraceBinding }, null, 2));
  }
  await page.screenshot({ path: path.join(root, `${state.id}-ending.png`) }); await persist();
  return state.status === 'NATURAL_TERMINAL';
}

async function reloadChecks(game) {
  const before = await driver.record(); await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.enterPlay();
  receipt.build.normalReloadPrecache = await servedPrecache(); if (JSON.stringify(receipt.build.initialPrecache) !== JSON.stringify(receipt.build.normalReloadPrecache)) throw new Error('Served precache identity changed before normal reload verification');
  if (JSON.stringify(await driver.record()) !== JSON.stringify(before)) throw new Error('Completed game did not survive normal reload'); receipt.reload = { normal: 'preserved' };
  await page.evaluate(() => navigator.serviceWorker.ready);
  receipt.build.onlineCache = await cachedBuild(page, receipt.build.initialPrecache, true);
  await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.enterPlay();
  receipt.build.offlineCache = await cachedBuild(page, receipt.build.initialPrecache, true);
  if (JSON.stringify(receipt.build.onlineCache) !== JSON.stringify(receipt.build.offlineCache)) throw new Error('Offline reload changed cached asset bytes');
  if (JSON.stringify(await driver.record()) !== JSON.stringify(before)) throw new Error('Completed game did not survive offline reload'); await page.screenshot({ path: path.join(root, 'completed-offline-reload.png') }); receipt.reload.offline = 'preserved'; receipt.reload.completedGame = game.id;
}

async function servedPrecache() { return page.evaluate(async () => { const response = await fetch('./precache.json', { cache: 'no-store' }); if (!response.ok) throw new Error(`precache identity unavailable (${response.status})`); return response.json(); }); }

try {
  receipt.build = { source: await sourceIdentity(), browser: await browser.version() };
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.enterPlay();
  receipt.build.initialPrecache = await servedPrecache();
  for (const game of games) await play(game);
  if (receipt.games.every(game => game.status === 'NATURAL_TERMINAL')) { await reloadChecks(receipt.games.at(-1)); receipt.status = 'COMPLETE_NATURAL_TERMINALS'; } else receipt.status = 'INCOMPLETE_RESUMABLE';
  if (receipt.errors.length) throw new Error(`Browser errors: ${receipt.errors.join('; ')}`);
} catch (error) { receipt.status = 'FAILED'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message); }
finally { if (receipt.status === 'INCOMPLETE_RESUMABLE') process.exitCode = 1; receipt.finished = new Date().toISOString(); await persist(); await context.close(); await browser.close(); console.log(JSON.stringify({ status: receipt.status, games: receipt.games.map(game => ({ id: game.id, status: game.status, actions: game.finalRecord?.actions.length ?? 0 })) })); }
