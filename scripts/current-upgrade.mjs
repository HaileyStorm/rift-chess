import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { createUiDriver } from './ui-driver.mjs';
import { cachedBuild, waitForServiceWorker } from './offline-assets.mjs';

const phase = process.env.RIFT_UPGRADE_PHASE;
const run = process.env.RIFT_TEST_RUN;
const url = process.env.RIFT_TEST_URL;
if (!['prepare', 'verify'].includes(phase)) throw new Error('RIFT_UPGRADE_PHASE must be prepare or verify.');
if (!run || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(run)) throw new Error('RIFT_TEST_RUN must be a simple alphanumeric evidence name.');
try {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('RIFT_TEST_URL must be the public http(s) origin.');
} catch {
  throw new Error('RIFT_TEST_URL must be the public http(s) origin.');
}

const root = path.resolve('.artifacts', 'current-upgrade', run);
const profile = path.join(root, 'profile');
const preparedPath = path.join(root, 'prepared.json');
const verifyPath = path.join(root, 'verify.json');
const options = { channel: 'chrome', headless: true, viewport: { width: 1600, height: 1000 } };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const execFileAsync = promisify(execFile);
let context = null;

const cleanAsset = asset => {
  const relative = typeof asset === 'string' && asset.startsWith('./') ? asset.slice(2) : '';
  if (!relative || asset.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error(`Unsafe manifest asset: ${asset}`);
  return relative;
};

async function writeImmutable(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function sourceIdentity() {
  const packageInfo = JSON.parse(await fs.readFile('package.json', 'utf8'));
  const revision = (await execFileAsync('git', ['rev-parse', 'HEAD'])).stdout.trim();
  const status = (await execFileAsync('git', ['status', '--porcelain'])).stdout.trim();
  return {
    packageVersion: packageInfo.version,
    revision,
    dirty: Boolean(status),
    harnessSha256: sha(await fs.readFile(new URL(import.meta.url))),
    offlineAssetsSha256: sha(await fs.readFile(new URL('./offline-assets.mjs', import.meta.url))),
    uiDriverSha256: sha(await fs.readFile(new URL('./ui-driver.mjs', import.meta.url))),
  };
}

async function distribution(directory) {
  if (!directory) throw new Error('RIFT_CURRENT_DIST or RIFT_EXPECTED_DIST is required for verify.');
  const base = await fs.realpath(directory);
  const manifestFile = path.resolve(process.env.RIFT_CURRENT_MANIFEST || path.join(base, 'precache.json'));
  const manifestBytes = await fs.readFile(manifestFile);
  const manifest = JSON.parse(manifestBytes);
  if (typeof manifest.version !== 'string' || !manifest.version || !Array.isArray(manifest.assets) || !manifest.assets.length) throw new Error(`Invalid distribution manifest: ${manifestFile}`);
  const assets = [...manifest.assets, './sw.js', './precache.json'];
  if (new Set(assets).size !== assets.length) throw new Error('Distribution manifest contains duplicate static assets.');
  const files = {};
  for (const asset of assets) {
    const relative = cleanAsset(asset);
    const file = path.resolve(base, relative);
    if (!file.startsWith(`${base}${path.sep}`)) throw new Error(`Distribution asset escapes its directory: ${asset}`);
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Distribution asset is not a regular file: ${asset}`);
    files[asset] = sha(await fs.readFile(file));
  }
  return { directory: base, manifestFile, manifest, manifestSha256: sha(manifestBytes), files };
}

async function servedManifest(page, label) {
  const result = await page.evaluate(async () => {
    const response = await fetch('./precache.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`precache unavailable (${response.status})`);
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return {
      url: response.url,
      sha256: [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join(''),
      manifest: JSON.parse(new TextDecoder().decode(bytes)),
    };
  });
  assert.equal(typeof result.manifest.version, 'string', `${label} manifest has no version.`);
  assert.ok(Array.isArray(result.manifest.assets) && result.manifest.assets.length, `${label} manifest has no assets.`);
  return result;
}

async function staticNetwork(manifest) {
  const entries = await Promise.all([...manifest.assets, './sw.js', './precache.json'].map(async asset => {
    const response = await fetch(new URL(asset, url), { cache: 'no-store' });
    const bytes = Buffer.from(await response.arrayBuffer());
    return { asset, url: response.url, status: response.status, redirected: response.redirected, bytes: bytes.length, sha256: sha(bytes) };
  }));
  for (const entry of entries) assert.equal(entry.status, 200, `Public static asset failed: ${entry.asset}`);
  return { files: Object.fromEntries(entries.map(entry => [entry.asset, entry.sha256])), responses: entries };
}

function verifyStaticNetwork(network, expected, label) {
  assert.deepEqual(network.files, expected.files, `${label} public static bytes differ from the expected distribution.`);
}

function verifyCachedFiles(cache, expected, label) {
  for (const file of cache.files) {
    const asset = expected.manifest.assets.find(candidate => new URL(candidate, url).href === file.url);
    assert.ok(asset, `${label} cache contains an unexpected asset: ${file.url}`);
    assert.equal(file.sha256, expected.files[asset], `${label} cache bytes differ from the expected distribution: ${asset}`);
  }
}

async function persistedSave(page, label) {
  const raw = await page.evaluate(() => localStorage.getItem('rift-chess.save.v1'));
  assert.ok(raw, `${label} has no persisted Rift save.`);
  const envelope = JSON.parse(raw);
  assert.equal(envelope.schema, 'rift-ui-save/1', `${label} persisted save schema mismatch.`);
  assert.ok(envelope.record?.actions?.length, `${label} persisted save must contain actions.`);
  return { raw, rawSha256: sha(Buffer.from(raw)), envelope };
}

function normalizedPreferences(value) {
  return { ...value, qualityMode: value.qualityMode ?? 'auto' };
}

function assertSaveUnchanged(actual, prepared, label) {
  assert.deepEqual(actual.envelope.record, prepared.envelope.record, `${label} changed the saved game record.`);
  assert.deepEqual(normalizedPreferences(actual.envelope.preferences), normalizedPreferences(prepared.envelope.preferences), `${label} changed saved preferences.`);
  if (prepared.envelope.preferences.qualityMode === undefined) assert.equal(actual.envelope.preferences.qualityMode ?? 'auto', 'auto', `${label} did not migrate legacy quality mode to Automatic.`);
  assert.equal(actual.envelope.mode, prepared.envelope.mode, `${label} changed the saved match mode.`);
  assert.equal(actual.envelope.practice, prepared.envelope.practice, `${label} changed the saved practice setting.`);
  assert.deepEqual(actual.envelope.promptEpisodes, prepared.envelope.promptEpisodes, `${label} changed saved draw-prompt state.`);
}

async function legalAction(page, wanted) {
  const action = await page.evaluate(value => window.rift.getLegalActions().find(item => item.type === value.type && item.from === value.from && item.to === value.to), wanted);
  assert.ok(action, `Expected legal ${wanted.type} ${wanted.from}->${wanted.to}.`);
  return action;
}

async function chooseHotseatOpening(page, driver, receipt) {
  await page.locator('#new-game').click();
  const dialog = page.locator('#new-dialog');
  await dialog.locator('input[name="mode"][value="hotseat"]').check();
  await dialog.locator('input[name="layout"][value="B"]').check();
  await dialog.locator('#start-game').click();
  await driver.ready();
  await driver.camera('top');
  const e2e4 = await legalAction(page, { type: 'move', from: 'e2', to: 'e4' });
  await driver.perform(e2e4);
  const blackMove = await page.evaluate(() => window.rift.getLegalActions().find(action => action.type === 'move' && !action.promotion));
  assert.ok(blackMove, 'Prepared hotseat position must expose an ordinary black move.');
  await driver.perform(blackMove);
  const save = await persistedSave(page, 'prepared hotseat match');
  assert.deepEqual(save.envelope.record.actions, [e2e4.id, blackMove.id], 'Prepared save must contain the two visible hotseat moves.');
  assert.equal(save.envelope.mode, 'hotseat');
  receipt.actions = { e2e4, blackMove };
  receipt.preparedSave = { ...save, envelope: save.envelope };
  return save;
}

function watch(page, receipt) {
  page.on('pageerror', error => receipt.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
}

async function launch() {
  context = await chromium.launchPersistentContext(profile, options);
  const page = context.pages()[0] ?? await context.newPage();
  return page;
}

async function closeContext() {
  if (!context) return;
  await context.close();
  context = null;
}

async function updateAndControl(page, version, receipt) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error('Missing prior service worker before registration.update().');
    await registration.update();
  });
  receipt.workerUpdate = { installed: await waitForServiceWorker(page, { phase: 'installed', version }) };
  await closeContext();
  page = await launch();
  watch(page, receipt);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  receipt.workerUpdate.controlled = await waitForServiceWorker(page, { phase: 'controlled', version });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  receipt.workerUpdate.reloaded = true;
  receipt.checks.push('post-control reload bound the renderer document to the newly activated current worker');
  return page;
}

async function failureReceipt(receipt, error) {
  await fs.mkdir(root, { recursive: true });
  const value = { ...receipt, status: 'fail', failed: true, finished: new Date().toISOString(), error: error instanceof Error ? error.stack : String(error) };
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const suffix = `${Date.now()}-${randomBytes(4).toString('hex')}`;
    try { await writeImmutable(path.join(root, `failure-${phase}-${suffix}.json`), value); return; } catch (writeError) { if (writeError?.code !== 'EEXIST' || attempt === 3) throw writeError; }
  }
}

const receipt = {
  schema: 'rift-current-upgrade/1', phase, run, url, root, profile,
  started: new Date().toISOString(), errors: [], checks: [],
};
let failed = null;

try {
  receipt.source = await sourceIdentity();
  if (phase === 'prepare') {
    try { await fs.access(root); throw new Error(`Prepare requires a fresh root and will not overwrite: ${root}`); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    await fs.mkdir(path.dirname(root), { recursive: true });
    await fs.mkdir(root, { recursive: false });
    const page = await launch();
    watch(page, receipt);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => Boolean(window.rift));
    const old = await servedManifest(page, 'live old build');
    receipt.oldBuild = { url: old.url, manifest: old.manifest, manifestSha256: old.sha256 };
    receipt.oldBuild.worker = { active: await waitForServiceWorker(page, { phase: 'active' }) };
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    receipt.oldBuild.worker.controlled = await waitForServiceWorker(page, { phase: 'controlled', version: old.manifest.version });
    const driver = createUiDriver(page);
    await driver.enterPlay();
    await chooseHotseatOpening(page, driver, receipt);
    receipt.oldBuild.cache = await cachedBuild(page, old.manifest, true);
    receipt.oldBuild.network = await staticNetwork(old.manifest);
    assert.equal(receipt.oldBuild.network.files['./precache.json'], old.sha256, 'Live old precache hash changed during prepare.');
    assert.deepEqual(receipt.errors, [], 'Prepare encountered browser errors.');
    receipt.checks.push('fresh public-origin profile controlled the served old worker and cached its exact manifest');
    receipt.checks.push('hotseat B committed visible e2-e4 and a legal black move and persisted record/preferences');
    await closeContext();
    receipt.classification = 'prepare-only live old-origin evidence; it is not upgrade acceptance.';
    receipt.status = 'pass';
    receipt.finished = new Date().toISOString();
    await writeImmutable(preparedPath, receipt);
  } else {
    const prepared = await readJson(preparedPath);
    const preparedBytes = await fs.readFile(preparedPath);
    receipt.preparedSha256 = sha(preparedBytes);
    if (prepared.schema !== receipt.schema || prepared.phase !== 'prepare' || prepared.run !== run || prepared.url !== url || path.resolve(prepared.profile) !== profile) throw new Error('prepared.json does not bind this verify invocation to its run, URL, and profile.');
    if (!prepared.preparedSave?.envelope?.record?.actions?.length) throw new Error('prepared.json has no bound persisted save.');
    try { await fs.access(verifyPath); throw new Error(`Verify refuses to overwrite existing evidence: ${verifyPath}`); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
    const current = await distribution(process.env.RIFT_CURRENT_DIST || process.env.RIFT_EXPECTED_DIST || 'dist');
    if (current.manifestSha256 === prepared.oldBuild.manifestSha256) throw new Error('Current distribution manifest is identical to the prepared live old build.');
    receipt.currentBuild = current;
    receipt.preparedSaveSha256 = prepared.preparedSave?.rawSha256 ?? null;
    const page = await launch();
    watch(page, receipt);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const currentNetwork = await staticNetwork(current.manifest);
    verifyStaticNetwork(currentNetwork, current, 'Current');
    receipt.currentBuild.network = currentNetwork;
    const controlledPage = await updateAndControl(page, current.manifest.version, receipt);
    const driver = createUiDriver(controlledPage);
    await driver.enterPlay();
    await driver.camera('top');
    const restored = await persistedSave(controlledPage, 'online upgraded save');
    assertSaveUnchanged(restored, prepared.preparedSave, 'Online upgrade');
    assert.deepEqual(await driver.record(), prepared.preparedSave.envelope.record, 'Online visible record changed during upgrade.');
    assert.equal((await driver.metrics()).qualityMode, prepared.preparedSave.envelope.preferences.qualityMode ?? 'auto', 'Online quality mode migration differs from the saved preference.');
    receipt.currentBuild.cache = await cachedBuild(controlledPage, current.manifest, true);
    verifyCachedFiles(receipt.currentBuild.cache, current, 'Current online');
    receipt.online = { worker: receipt.workerUpdate.controlled, persistedSave: restored, cache: receipt.currentBuild.cache };
    receipt.checks.push('Node fetch matched every current manifest, page, worker, and manifest byte to current dist');
    receipt.checks.push('registration.update plus close/reopen controlled the new current service worker');
    receipt.checks.push('online upgrade preserved the saved game and preferences; legacy missing qualityMode maps to Automatic');
    await closeContext();
    const offlineContextPage = await launch();
    watch(offlineContextPage, receipt);
    await context.setOffline(true);
    await offlineContextPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const offline = createUiDriver(offlineContextPage);
    await offline.enterPlay();
    await offline.camera('top');
    await waitForServiceWorker(offlineContextPage, { phase: 'controlled', version: current.manifest.version });
    const offlineSave = await persistedSave(offlineContextPage, 'cold offline save');
    assertSaveUnchanged(offlineSave, prepared.preparedSave, 'Cold offline restart');
    assert.deepEqual(await offline.record(), prepared.preparedSave.envelope.record, 'Cold offline visible record changed before the test move.');
    receipt.offline = { persistedSave: offlineSave, cache: await cachedBuild(offlineContextPage, current.manifest, true) };
    verifyCachedFiles(receipt.offline.cache, current, 'Current offline');
    assert.deepEqual(receipt.offline.cache, receipt.online.cache, 'Cold offline restart changed installed current asset bytes.');
    const move = await offlineContextPage.evaluate(() => window.rift.getLegalActions().find(action => action.type === 'move' && !action.promotion));
    assert.ok(move, 'Cold offline save has no ordinary legal move.');
    await offline.perform(move);
    const afterMove = await persistedSave(offlineContextPage, 'cold offline move');
    assert.deepEqual(afterMove.envelope.record.actions, [...prepared.preparedSave.envelope.record.actions, move.id], 'Cold offline driver move did not extend the prepared record.');
    receipt.offline.move = move;
    receipt.offline.afterMove = afterMove;
    receipt.checks.push('cold offline restart restored the save and committed a real legal move through the shared UI driver');
    assert.deepEqual(receipt.errors, []);
    await closeContext();
    receipt.status = 'pass';
    receipt.finished = new Date().toISOString();
    await writeImmutable(verifyPath, receipt);
  }
} catch (error) {
  failed = error;
  process.exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
} finally {
  try { await closeContext(); } catch (error) { failed ??= error; process.exitCode = 1; }
  if (failed) {
    try { await failureReceipt(receipt, failed); } catch (error) { console.error(`Could not write immutable failure receipt: ${error instanceof Error ? error.message : String(error)}`); }
  }
}
