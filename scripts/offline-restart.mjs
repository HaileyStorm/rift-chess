import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createUiDriver } from './ui-driver.mjs';
import { cachedBuild } from './offline-assets.mjs';

const url = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const root = path.resolve('.artifacts', process.env.RIFT_TEST_RUN || 'offline-restart');
try { await fs.access(root); throw new Error(`Refusing to overwrite offline-restart evidence: ${root}`); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
await fs.mkdir(root, { recursive: true });
const profile = path.join(root, 'profile');
const receipt = {
  started: new Date().toISOString(),
  classification: 'cold offline restart against one current build; this is not a v1-to-current upgrade test',
  url,
  checks: [],
  errors: [],
};
const options = { channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'], viewport: { width: 1600, height: 1000 } };
let context;
const execFileAsync = promisify(execFile);

async function persist() { await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); }
async function sourceIdentity() {
  const packageInfo = JSON.parse(await fs.readFile('package.json', 'utf8'));
  try {
    const [{ stdout: revision }, { stdout: status }] = await Promise.all([execFileAsync('git', ['rev-parse', 'HEAD']), execFileAsync('git', ['status', '--porcelain'])]);
    return { packageVersion: packageInfo.version, gitRevision: revision.trim(), worktreeDirty: Boolean(status.trim()) };
  } catch { return { packageVersion: packageInfo.version, gitRevision: null, worktreeDirty: null }; }
}
function watchPage(page) {
  page.on('pageerror', error => receipt.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
  page.on('requestfailed', request => {
    (receipt.failedRequests ??= []).push({ url: request.url(), type: request.resourceType(), failure: request.failure() });
  });
}
async function precache(page) {
  return page.evaluate(async () => {
    const response = await fetch('./precache.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`precache unavailable (${response.status})`);
    return response.json();
  });
}
async function newMatch(page, driver, { mode, layout, policy = 'prompt' }) {
  await page.locator('#new-game').click();
  const dialog = page.locator('#new-dialog');
  await dialog.waitFor({ state: 'visible' });
  await dialog.locator(`input[name="mode"][value="${mode}"]`).check();
  await dialog.locator(`input[name="layout"][value="${layout}"]`).check();
  await dialog.locator(`input[name="draw"][value="${policy}"]`).check();
  await dialog.locator('#start-game').click();
  await driver.ready();
  await driver.camera('top');
}
async function exportEnvelope(page, driver, name) {
  await driver.openDrawer('Match & view');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadPromise;
  const envelope = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  assert.equal(envelope.schema, 'rift-ui-save/1', `${name} must export a UI save envelope`);
  return envelope;
}
async function legalAction(page, expected) {
  const action = await page.evaluate(match => window.rift.getLegalActions().find(item => item.type === match.type && item.from === match.from && item.to === match.to), expected);
  assert.ok(action, `Expected legal ${expected.type} ${expected.from}->${expected.to}`);
  return action;
}

try {
  context = await chromium.launchPersistentContext(profile, options);
  let page = context.pages()[0];
  watchPage(page);
  let driver = createUiDriver(page);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await driver.enterPlay();
  await driver.camera('top');
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated', null, { timeout: 20000 });
  receipt.build = { source: await sourceIdentity(), startPublicPrecache: await precache(page) };
  receipt.build.onlineCache = await cachedBuild(page, receipt.build.startPublicPrecache);
  receipt.checks.push('current build service worker activated with bound precache');

  await newMatch(page, driver, { mode: 'bot-black', layout: 'B' });
  const e4 = await legalAction(page, { type: 'move', from: 'e2', to: 'e4' });
  const botReplyStart = (await driver.observation()).revision;
  await driver.perform(e4);
  await page.waitForFunction(revision => window.rift.getObservation().revision === revision + 2 && window.rift.getObservation().position.side === 1 && !window.rift.metrics().animating, botReplyStart, { timeout: 120000 });
  await driver.ready();
  const onlineEnvelope = await exportEnvelope(page, driver, 'online-bot-reply');
  assert.ok(onlineEnvelope.record.actions.length >= 2, 'The persisted bot-black game must contain the visible human move and a real bot reply.');
  assert.equal(onlineEnvelope.mode, 'bot-black');
  receipt.onlineBeforeClose = { record: onlineEnvelope.record, preferences: onlineEnvelope.preferences, envelope: onlineEnvelope };
  await page.screenshot({ path: path.join(root, 'online-before-close.png') });
  await persist();

  await context.close();
  context = null;
  receipt.checks.push('browser process closed after nonempty bot-black save');
  await persist();

  context = await chromium.launchPersistentContext(profile, options);
  await context.setOffline(true);
  page = context.pages()[0];
  watchPage(page);
  driver = createUiDriver(page);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await driver.enterPlay();
  await driver.camera('top');
  receipt.build.offlineCache = await cachedBuild(page, receipt.build.startPublicPrecache, true);
  const restoredEnvelope = await exportEnvelope(page, driver, 'offline-restored');
  assert.deepEqual(restoredEnvelope.record, onlineEnvelope.record, 'Cold offline restart must restore the exact current-build record.');
  assert.deepEqual(restoredEnvelope.preferences, onlineEnvelope.preferences, 'Cold offline restart must restore exact current-build preferences.');
  assert.deepEqual(restoredEnvelope, onlineEnvelope, 'Cold offline restart must restore the complete current-build UI envelope.');
  assert.deepEqual(receipt.build.offlineCache, receipt.build.onlineCache, 'Cold offline restart changed cached asset bytes.');
  receipt.offlineRestored = { record: restoredEnvelope.record, preferences: restoredEnvelope.preferences, envelope: restoredEnvelope };
  receipt.checks.push('cold offline current-build restart restored exact record, preferences, envelope, and precache');
  await page.screenshot({ path: path.join(root, 'offline-restored.png') });

  const offlineBefore = await driver.observation();
  const offlineMove = await page.evaluate(() => window.rift.getLegalActions().find(action => action.type === 'move' && !action.promotion));
  assert.ok(offlineMove, 'The restored bot game must expose an ordinary human move.');
  await driver.perform(offlineMove);
  await page.waitForFunction(before => {
    const current = window.rift.getObservation();
    return current.game_id === before.game_id && current.revision === before.revision + 2 && current.position.side === 1 && !window.rift.metrics().animating;
  }, offlineBefore, { timeout: 120000 });
  const offlineBotRecord = await driver.record();
  assert.equal(offlineBotRecord.actions[restoredEnvelope.record.actions.length], offlineMove.id);
  receipt.offlineBotReply = { humanAction: offlineMove, record: offlineBotRecord };
  receipt.checks.push('fresh offline browser process completed a visible human move and real local-worker reply');

  await newMatch(page, driver, { mode: 'hotseat', layout: 'B' });
  const beforeHotseat = await driver.record();
  const knight = await legalAction(page, { type: 'move', from: 'b1', to: 'a3' });
  await driver.perform(knight);
  const blackPawn = await legalAction(page, { type: 'move', from: 'g7', to: 'g6' });
  await driver.perform(blackPawn);
  const loadedShift = await legalAction(page, { type: 'shift', from: 'A2', to: 'B2' });
  const passengerAtA3 = await page.evaluate(() => window.rift.getObservation().position.board[16] === 2);
  assert.equal(passengerAtA3, true, 'The opening sequence must leave the stable passenger knight on a3.');
  await driver.performPassengerShift({ passenger: 'a3', to: loadedShift.to, promotion: null });
  const afterHotseat = await driver.record();
  assert.deepEqual(afterHotseat.actions, [knight.id, blackPawn.id, loadedShift.id], 'The offline hotseat sequence must commit the exact three visible actions.');
  const landed = await driver.observation();
  assert.equal(landed.position.board[16], 0);
  assert.equal(landed.position.board[18], 2, 'The transported knight must land on c3.');
  receipt.offlineHotseat = { before: beforeHotseat, after: afterHotseat, actions: { knight, blackPawn, loadedShift } };
  receipt.checks.push('offline visible hotseat opening committed b1-a3, g7-g6, and loaded A2-B2 Shift with passenger a3');
  await page.screenshot({ path: path.join(root, 'offline-hotseat-after.png') });
  receipt.build.endCache = await cachedBuild(page, receipt.build.startPublicPrecache, true);
  assert.deepEqual(receipt.build.endCache, receipt.build.onlineCache, 'Cached bytes changed during offline current-build restart.');
  assert.deepEqual(receipt.errors, []);
  receipt.status = 'pass';
} catch (error) {
  receipt.status = 'fail';
  receipt.failure = error instanceof Error ? error.stack : String(error);
  process.exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  if (context) await context.close();
  receipt.finished = new Date().toISOString();
  await persist();
  console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks }));
}
