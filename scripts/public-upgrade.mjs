import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { createUiDriver } from './ui-driver.mjs';
import { cachedBuild } from './offline-assets.mjs';

const phase = process.env.RIFT_UPGRADE_PHASE;
const run = process.env.RIFT_TEST_RUN;
const url = process.env.RIFT_TEST_URL;
if (!['prepare', 'verify'].includes(phase)) throw new Error('RIFT_UPGRADE_PHASE must be prepare or verify.');
if (!run || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(run)) throw new Error('RIFT_TEST_RUN must be a simple alphanumeric evidence name.');
if (!url || !/^https?:\/\//.test(url)) throw new Error('RIFT_TEST_URL must be the public http(s) origin.');

const root = path.resolve('.artifacts', 'public-upgrade', run);
const profile = path.join(root, 'profile');
const preparedPath = path.join(root, 'prepared.json');
const verifyPath = path.join(root, 'verify.json');
const options = { channel: 'chrome', headless: true, viewport: { width: 1600, height: 1000 } };
let context;

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const cleanAsset = asset => {
  const relative = typeof asset === 'string' && asset.startsWith('./') ? asset.slice(2) : '';
  if (!relative || asset.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..')) throw new Error(`Unsafe manifest asset: ${asset}`);
  return relative;
};
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
async function writeNew(file, value) { await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' }); }
async function failure(kind, error) {
  await fs.mkdir(root, { recursive: true });
  await writeNew(path.join(root, `${kind}-failure-${Date.now()}.json`), { ...receipt, failed: true, finished: new Date().toISOString(), error: error instanceof Error ? error.stack : String(error) });
}
async function expected(directory) {
  if (!directory) throw new Error('RIFT_EXPECTED_DIST is required for prepare.');
  const base = await fs.realpath(directory);
  const manifestFile = process.env.RIFT_EXPECTED_MANIFEST || path.join(base, 'precache.json');
  const manifestBytes = await fs.readFile(manifestFile);
  const manifest = JSON.parse(manifestBytes);
  if (!manifest.version || !Array.isArray(manifest.assets) || !manifest.assets.length) throw new Error(`Invalid expected manifest: ${manifestFile}`);
  const files = {};
  for (const asset of [...manifest.assets, './sw.js', './precache.json']) {
    const relative = cleanAsset(asset);
    const file = path.resolve(base, relative);
    if (!file.startsWith(`${base}${path.sep}`)) throw new Error(`Expected asset escapes directory: ${asset}`);
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Expected asset is not a regular file: ${asset}`);
    files[asset] = sha(await fs.readFile(file));
  }
  return { directory: base, manifestFile: path.resolve(manifestFile), manifest, manifestSha256: sha(manifestBytes), files };
}
async function browserAssets(page, manifest) {
  const assets = [...manifest.assets, './sw.js', './precache.json'];
  const responses = new Map();
  const onResponse = response => {
    const fromServiceWorker = typeof response.fromServiceWorker === 'function' ? response.fromServiceWorker() : null;
    responses.set(response.url(), { fromServiceWorker, responseURL: response.url() });
  };
  page.on('response', onResponse);
  const result = await page.evaluate(async wanted => Promise.all(wanted.map(async asset => {
    const response = await fetch(asset, { cache: 'no-store' });
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return { asset, url: response.url, status: response.status, sha256: [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('') };
  })), assets).finally(() => page.off('response', onResponse));
  const files = Object.fromEntries(result.map(entry => [entry.asset, entry.sha256]));
  for (const entry of result) assert.equal(entry.status, 200, `Public asset failed: ${entry.asset}`);
  return { files, responses: result.map(entry => ({ ...entry, provenance: responses.get(entry.url) ?? { fromServiceWorker: null, responseURL: entry.url } })) };
}
async function networkAssets(manifest) {
  const result = await Promise.all([...manifest.assets, './sw.js', './precache.json'].map(async asset => {
    const response = await fetch(new URL(asset, url), { cache: 'no-store' });
    const bytes = Buffer.from(await response.arrayBuffer());
    return { asset, url: response.url, status: response.status, redirected: response.redirected, sha256: sha(bytes) };
  }));
  const files = Object.fromEntries(result.map(entry => [entry.asset, entry.sha256]));
  for (const entry of result) assert.equal(entry.status, 200, `Public network asset failed: ${entry.asset}`);
  return { files, responses: result };
}
function verifyCacheFiles(cache, expected) {
  for (const file of cache.files) {
    const asset = expected.manifest.assets.find(asset => new URL(asset, url).href === file.url);
    assert.equal(file.sha256, expected.files[asset], 'Installed cache differs from the expected distribution.');
  }
}
async function swState(page) {
  return page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration?.active || registration.active.state !== 'activated') throw new Error('No activated service worker.');
    return { activeScriptURL: registration.active.scriptURL, caches: await caches.keys(), controller: navigator.serviceWorker.controller?.scriptURL ?? null };
  });
}
function watch(page, receipt) {
  page.on('pageerror', error => receipt.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
}
async function exportEnvelope(page, current, label) {
  if (current) await current.openDrawer('Match & view');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadPromise;
  const result = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  assert.equal(result.schema, 'rift-ui-save/1', `${label} must export a Rift UI envelope`);
  assert.ok(result.record?.actions?.length, `${label} must have a nonempty record`);
  return result;
}
async function action(page, value) {
  const found = await page.evaluate(want => window.rift.getLegalActions().find(item => item.type === want.type && item.from === want.from && item.to === want.to), value);
  assert.ok(found, `Expected legal ${value.type} ${value.from}->${value.to}`);
  return found;
}
async function oldMove(page, wanted) {
  const before = await page.evaluate(() => window.rift.getObservation());
  const actual = await action(page, wanted);
  for (const square of [wanted.from, wanted.to]) {
    const index = (Number(square[1]) - 1) * 8 + square.charCodeAt(0) - 97;
    const point = await page.evaluate(value => window.rift.squareScreenPosition(value), index);
    await page.mouse.click(point.x, point.y);
  }
  await page.waitForFunction(revision => window.rift.getObservation().revision === revision + 1 && !window.rift.metrics().animating, before.revision);
  return actual;
}
async function prepareV1(page, receipt) {
  await page.locator('#new-game').click();
  const dialog = page.locator('#new-dialog');
  await dialog.locator('input[name="mode"][value="hotseat"]').check();
  await dialog.locator('input[name="layout"][value="B"]').check();
  await dialog.locator('#start-game').click();
  await page.locator('[data-camera="top"]').click();
  await page.waitForFunction(() => !window.rift.metrics().animating);
  const b1a3 = await oldMove(page, { type: 'move', from: 'b1', to: 'a3' });
  const g7g6 = await oldMove(page, { type: 'move', from: 'g7', to: 'g6' });
  await page.locator('#settings').click();
  const settings = page.locator('dialog[open]');
  await settings.locator('select[name="theme"]').selectOption('nocturne');
  await settings.locator('select[name="family"]').selectOption('classic');
  await settings.locator('select[name="material"]').selectOption('ceramic');
  await settings.locator('select[name="quality"]').selectOption('low');
  await settings.locator('button[value="apply"]').click();
  const envelope = await exportEnvelope(page, null, 'v1 visible save');
  assert.deepEqual(envelope.record.actions, [b1a3.id, g7g6.id]);
  for (const [key, value] of Object.entries({ theme: 'nocturne', family: 'classic', material: 'ceramic', quality: 'low' })) assert.equal(envelope.preferences[key], value, `v1 settings must retain ${key}`);
  receipt.preparedEnvelope = envelope;
  receipt.actions = { b1a3, g7g6 };
}
async function updateWorker(page, cacheVersion, receipt) {
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); if (!registration) throw new Error('Missing prior service worker.'); await registration.update(); });
  await page.waitForFunction(async version => {
    const registration = await navigator.serviceWorker.getRegistration();
    const names = (await caches.keys()).filter(name => name.startsWith('rift-chess-static-'));
    return registration?.waiting?.state === 'installed' || registration?.installing?.state === 'installed' || (registration?.active?.state === 'activated' && names.length === 1 && names[0] === `rift-chess-static-${version}`);
  }, cacheVersion, { timeout: 60000 });
  await context.close(); context = null;
  context = await chromium.launchPersistentContext(profile, options);
  page = context.pages()[0];
  watch(page, receipt);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(async version => {
    const registration = await navigator.serviceWorker.getRegistration();
    const names = (await caches.keys()).filter(name => name.startsWith('rift-chess-static-'));
    return Boolean(registration?.active?.state === 'activated' && !registration.waiting && !registration.installing && navigator.serviceWorker.controller?.scriptURL === registration.active.scriptURL && names.length === 1 && names[0] === `rift-chess-static-${version}`);
  }, cacheVersion, { timeout: 60000 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  return page;
}
async function newCurrentMatch(page, driver) {
  await page.locator('#new-game').click();
  const dialog = page.locator('#new-dialog');
  await dialog.locator('input[name="mode"][value="bot-black"]').check();
  await dialog.locator('input[name="layout"][value="B"]').check();
  await dialog.locator('#start-game').click();
  await driver.ready();
  await driver.camera('top');
}
async function verifyV1Worker(baseline) {
  const { stdout } = await promisify(execFile)('git', ['show', 'v1.0.0:public/sw.js']);
  const expectedSource = stdout.replaceAll('\r\n', '\n').replace('__RIFT_CACHE_VERSION__', baseline.manifest.version);
  const actualSource = (await fs.readFile(path.join(baseline.directory, 'sw.js'), 'utf8')).replaceAll('\r\n', '\n');
  assert.equal(actualSource, expectedSource, 'Expected v1 worker does not derive from the v1.0.0 template.');
  return { templateSha256: sha(stdout), normalizedBuiltSha256: sha(actualSource), normalization: 'CRLF to LF for source-template comparison; distribution/network hashes remain exact bytes' };
}

const receipt = { schema: 'rift-public-upgrade/1', phase, run, url, root, profile, started: new Date().toISOString(), errors: [], checks: [] };
try {
  const git = promisify(execFile);
  const revision = (await git('git', ['rev-parse', 'HEAD'])).stdout.trim();
  const dirty = Boolean((await git('git', ['status', '--porcelain'])).stdout.trim());
  receipt.source = { revision, dirty, v1Tag: (await git('git', ['rev-parse', 'v1.0.0^{commit}'])).stdout.trim(), harnessSha256: sha(await fs.readFile(new URL(import.meta.url))) };
  if (phase === 'prepare') {
    try { await fs.access(root); throw new Error(`Prepare requires a fresh root: ${root}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await fs.mkdir(root, { recursive: true });
    const baseline = await expected(process.env.RIFT_EXPECTED_DIST);
    context = await chromium.launchPersistentContext(profile, options);
    let page = context.pages()[0]; watch(page, receipt);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => Boolean(window.rift));
    await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === 'activated');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await page.waitForFunction(() => !window.rift.metrics().animating);
    await prepareV1(page, receipt);
    receipt.baseline = baseline;
    receipt.serviceWorker = await swState(page);
    receipt.baselineCache = await cachedBuild(page, baseline.manifest);
    verifyCacheFiles(receipt.baselineCache, baseline);
    receipt.networkAssets = await networkAssets(baseline.manifest);
    assert.deepEqual(receipt.networkAssets.files, baseline.files, 'Public v1 network responses differ from RIFT_EXPECTED_DIST.');
    receipt.liveAssets = await browserAssets(page, baseline.manifest);
    assert.deepEqual(receipt.liveAssets.files, baseline.files, 'Public v1 browser responses differ from RIFT_EXPECTED_DIST.');
    receipt.v1WorkerSource = await verifyV1Worker(baseline);
    receipt.liveWorkerSha256 = receipt.liveAssets.files['./sw.js'];
    assert.deepEqual(receipt.errors, []);
    receipt.classification = 'prepare-only evidence; it is not upgrade acceptance and requires a later real public deployment plus verify.';
    receipt.finished = new Date().toISOString();
    await writeNew(preparedPath, receipt);
  } else {
    const prepared = await json(preparedPath);
    receipt.preparedSha256 = sha(await fs.readFile(preparedPath));
    if (prepared.schema !== receipt.schema || prepared.phase !== 'prepare' || prepared.run !== run || prepared.url !== url || prepared.profile !== profile) throw new Error('prepared.json does not bind this verify invocation to its prepare profile and URL.');
    try { await fs.access(verifyPath); throw new Error(`Refusing to overwrite verification receipt: ${verifyPath}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const current = await expected(process.env.RIFT_EXPECTED_DIST || 'dist');
    assert.notEqual(current.manifestSha256, prepared.baseline.manifestSha256, 'Current expected manifest must differ from the prepared v1 manifest.');
    context = await chromium.launchPersistentContext(profile, options);
    let page = context.pages()[0]; watch(page, receipt);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    page = await updateWorker(page, current.manifest.version, receipt);
    const driver = createUiDriver(page); await driver.enterPlay(); await driver.camera('top');
    const restored = await exportEnvelope(page, driver, 'upgraded online save');
    assert.deepEqual(restored, prepared.preparedEnvelope, 'Upgrade changed the v1 record or preferences before any new match.');
    receipt.current = current;
    receipt.online = { serviceWorker: await swState(page), networkAssets: await networkAssets(current.manifest), assets: await browserAssets(page, current.manifest), envelope: restored };
    assert.deepEqual(receipt.online.networkAssets.files, current.files, 'Current public network responses differ from current expected distribution.');
    receipt.online.cache = await cachedBuild(page, current.manifest, true);
    verifyCacheFiles(receipt.online.cache, current);
    assert.deepEqual(receipt.online.assets.files, current.files, 'Current public browser responses differ from current expected distribution.');
    await page.screenshot({ path: path.join(root, 'online-upgraded.png') });
    await context.close(); context = null;
    context = await chromium.launchPersistentContext(profile, options);
    await context.setOffline(true);
    page = context.pages()[0]; watch(page, receipt);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const offline = createUiDriver(page); await offline.enterPlay(); await offline.camera('top');
    assert.deepEqual(await exportEnvelope(page, offline, 'offline restored save'), prepared.preparedEnvelope, 'Offline upgraded restart changed the prepared save.');
    receipt.offlineCache = await cachedBuild(page, current.manifest, true);
    assert.deepEqual(receipt.offlineCache, receipt.online.cache, 'Cold offline restart changed installed asset bytes.');
    const loaded = await action(page, { type: 'shift', from: 'A2', to: 'B2' });
    await offline.performPassengerShift({ passenger: 'a3', to: loaded.to, promotion: null });
    const loadedRecord = await offline.record();
    assert.deepEqual(loadedRecord.actions, [...prepared.preparedEnvelope.record.actions, loaded.id], 'Offline loaded Shift must extend the exact prepared record.');
    await page.screenshot({ path: path.join(root, 'offline-loaded-shift.png') });
    await newCurrentMatch(page, offline);
    const e2e4 = await action(page, { type: 'move', from: 'e2', to: 'e4' });
    const before = await offline.observation();
    await offline.perform(e2e4);
    await page.waitForFunction(previous => { const now = window.rift.getObservation(); return now.revision === previous.revision + 2 && now.position.side === 1 && !window.rift.metrics().animating; }, before, { timeout: 120000 });
    const botRecord = await offline.record();
    assert.equal(botRecord.actions[0], e2e4.id, 'Offline bot match must begin with the visible e2-e4 input.');
    assert.equal(botRecord.actions.length, 2, 'Offline bot match must contain exactly the human move and real reply.');
    await page.screenshot({ path: path.join(root, 'offline-bot-reply.png') });
    receipt.offline = { loadedShift: loaded, loadedRecord, e2e4, botRecord };
    receipt.checks.push('v1 save and preferences survived online upgrade and cold offline restart; loaded Shift and offline bot reply used visible inputs');
    assert.deepEqual(receipt.errors, []);
    receipt.finished = new Date().toISOString();
    await writeNew(verifyPath, receipt);
  }
} catch (error) {
  process.exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
  await failure(phase, error);
} finally {
  if (context) await context.close();
}
