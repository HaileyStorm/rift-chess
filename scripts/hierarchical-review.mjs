/** Capture evidence for the hierarchical visual review; it makes no acceptance verdict. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const execFileAsync = promisify(execFile);
const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const run = process.env.RIFT_TEST_RUN || 'hierarchical-review';
const root = path.resolve('.artifacts', 'hierarchical-review', run);
const receiptPath = path.join(root, 'receipt.json');
const all = { themes: ['gallery', 'nocturne', 'daylight'], families: ['classic', 'faceted'], materials: ['ceramic', 'metal', 'wood'], presets: ['white', 'black', 'overview', 'top'], zooms: [{ name: 'near', distance: 7 }, { name: 'normal', distance: 16 }, { name: 'far', distance: 28 }] };
const applicationViewports = [{ name: '1280x720', width: 1280, height: 720, tier: 'application' }, { name: '1600x1000', width: 1600, height: 1000, tier: 'application' }, { name: '1920x1080', width: 1920, height: 1080, tier: 'application' }, { name: '390x844', width: 390, height: 844, tier: 'narrow' }, { name: '1024x768-tablet', width: 1024, height: 768, tier: 'narrow' }];

function selected(name, values) {
  const raw = process.env[`RIFT_REVIEW_${name.toUpperCase()}`];
  if (!raw) return values;
  const requested = raw.split(',').map(value => value.trim()).filter(Boolean);
  const invalid = requested.filter(value => !values.includes(value));
  if (invalid.length) throw new Error(`Unknown ${name}: ${invalid.join(', ')}`);
  return values.filter(value => requested.includes(value));
}

function readLimit(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
  return value;
}

async function prepareOutput() {
  try { await fs.access(receiptPath); throw new Error(`Refusing to reuse immutable capture directory: ${root}`); }
  catch (error) { if (error?.code !== 'ENOENT') throw error; }
  try {
    const entries = await fs.readdir(root);
    if (entries.length) throw new Error(`Refusing non-empty capture directory without a receipt: ${root}`);
  } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  await fs.mkdir(root, { recursive: true });
}

async function sourceIdentity() {
  const packageInfo = JSON.parse(await fs.readFile('package.json', 'utf8'));
  try {
    const [{ stdout: revision }, { stdout: status }] = await Promise.all([execFileAsync('git', ['rev-parse', 'HEAD']), execFileAsync('git', ['status', '--porcelain'])]);
    return { packageVersion: packageInfo.version, gitRevision: revision.trim(), worktreeDirty: Boolean(status.trim()) };
  } catch { return { packageVersion: packageInfo.version, gitRevision: null, worktreeDirty: null }; }
}

function primaryCases() {
  const themes = selected('themes', all.themes), families = selected('families', all.families), materials = selected('materials', all.materials), presets = selected('presets', all.presets), zooms = selected('zooms', all.zooms.map(zoom => zoom.name)).map(name => all.zooms.find(zoom => zoom.name === name));
  return themes.flatMap(theme => families.flatMap(family => materials.flatMap(material => presets.flatMap(preset => zooms.map(zoom => ({ theme, family, material, preset, zoom }))))));
}

function layoutMetrics() {
  return {
    viewport: { width: innerWidth, height: innerHeight }, presentation: document.querySelector('#app')?.dataset.presentation ?? null,
    document: { scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 },
    boxes: Object.fromEntries(['.topbar', '#scene', '.action-dock', '.utility-deck', '#launch-surface'].map(selector => {
      const node = document.querySelector(selector), rect = node?.getBoundingClientRect();
      return [selector, rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, visible: Boolean((node instanceof HTMLElement) && !node.hidden && getComputedStyle(node).display !== 'none') } : null];
    })),
    dialogs: [...document.querySelectorAll('dialog')].filter(dialog => dialog.open).map(dialog => dialog.id),
  };
}

await prepareOutput();
const scopes = new Set((process.env.RIFT_REVIEW_SCOPE || 'play').split(',').map(value => value.trim()).filter(Boolean));
const cases = primaryCases();
const fullRequested = process.env.RIFT_REVIEW_FULL === '1';
const primaryLimit = readLimit('RIFT_REVIEW_LIMIT', fullRequested ? cases.length : 1);
if (primaryLimit >= cases.length && cases.length === 216 && !fullRequested) throw new Error('The 216-capture matrix requires RIFT_REVIEW_FULL=1 after the root build gate.');
const applicationLimit = readLimit('RIFT_REVIEW_APPLICATION_LIMIT', applicationViewports.length);
const receipt = {
  started: new Date().toISOString(), purpose: 'actual renderer capture evidence; visual acceptance remains pending independent review', url: base,
  requested: { scopes: [...scopes], primaryCases: cases.length, primaryLimit, fullRequested, applicationLimit, browserZoom: { status: 'pending', reason: 'Playwright viewport and deviceScaleFactor do not set genuine browser zoom; no DPR substitution was used.' } },
  captures: [], errors: [], reviewStatus: 'PENDING_HUMAN_VISUAL_REVIEW',
};

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' });
const driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });

async function persist() { await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2)); }

let lastAppearance = '';
async function applyAppearance({ theme, family, material, quality = 'balanced', motion = true }) {
  const key = JSON.stringify({ theme, family, material, quality, motion });
  if (key === lastAppearance) return;
  await page.locator('#settings').click();
  const dialog = page.locator('#settings-dialog');
  await dialog.locator('[name="theme"]').selectOption(theme);
  await dialog.locator('[name="family"]').selectOption(family);
  await dialog.locator('[name="material"]').selectOption(material);
  await dialog.locator('[name="quality"]').selectOption(quality);
  await dialog.locator('[name="motion"]').setChecked(motion);
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
  await driver.ready();
  lastAppearance = key;
}

async function setCameraDistance(preset, target) {
  await driver.camera(preset);
  await page.evaluate(distance => { const current = window.rift.metrics().cameraDistance; window.rift.orbit(0, 0, distance - current); }, target);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await driver.ready();
  const metrics = await driver.metrics();
  assert.equal(metrics.preset, preset, `Camera preset drifted from ${preset}`);
  assert.ok(metrics.cameraDistance >= 7 && metrics.cameraDistance <= 28, `Camera distance ${metrics.cameraDistance} fell outside the supported review window`);
  assert.ok(Math.abs(metrics.cameraDistance - target) < .15, `Camera distance ${metrics.cameraDistance} did not reach ${target}`);
  return metrics;
}

async function capture(name, metadata) {
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(root, file) });
  receipt.captures.push({ file, ...metadata, layout: await page.evaluate(layoutMetrics), metrics: await driver.metrics(), timestamp: new Date().toISOString() });
  await persist();
  console.log(`Captured ${file}`);
}

try {
  receipt.build = { source: await sourceIdentity(), browser: await browser.version() };
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await driver.enterPlay();
  receipt.build.assets = await page.evaluate(async () => { const response = await fetch('./precache.json', { cache: 'no-store' }); if (!response.ok) throw new Error('Missing built asset identity'); return response.json(); });
  await page.locator('#new-game').click();
  await page.locator('input[name="layout"][value="B"]').check();
  await page.locator('#start-game').click();
  await driver.ready();

  if (scopes.has('play')) {
    for (const item of cases.slice(0, primaryLimit)) {
      await applyAppearance(item);
      const metrics = await setCameraDistance(item.preset, item.zoom.distance);
      await capture(`play-${item.theme}-${item.family}-${item.material}-${item.preset}-${item.zoom.name}`, { tier: 'play', appearance: { theme: item.theme, family: item.family, material: item.material, quality: 'balanced', reducedMotion: true }, preset: item.preset, zoom: { name: item.zoom.name, targetDistance: item.zoom.distance, actualDistance: metrics.cameraDistance } });
    }
  }

  if (scopes.has('application')) {
    for (const viewport of applicationViewports.slice(0, applicationLimit)) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await applyAppearance({ theme: 'gallery', family: 'classic', material: 'ceramic' });
      for (const preset of viewport.width < 600 ? all.presets : ['overview']) {
        if (viewport.width < 600) {
          await driver.camera(preset); const defaultMetrics = await driver.metrics();
          await capture(`application-${viewport.name}-${preset}-default`, { tier: viewport.tier, preset, zoom: { name: 'authored-default', actualDistance: defaultMetrics.cameraDistance } });
        }
        const metrics = await setCameraDistance(preset, 16);
        await capture(`application-${viewport.name}${preset === 'overview' ? '' : '-' + preset}`, { tier: viewport.tier, appearance: { theme: 'gallery', family: 'classic', material: 'ceramic', quality: 'balanced', reducedMotion: true }, preset, zoom: { name: 'normal', targetDistance: 16, actualDistance: metrics.cameraDistance } });
      }
    }
  }

  const primaryCaptures = receipt.captures.filter(capture => capture.tier === 'play');
  receipt.coverage = {
    primaryCaptured: primaryCaptures.length,
    presets: [...new Set(primaryCaptures.map(capture => capture.preset))],
    zooms: [...new Set(primaryCaptures.map(capture => capture.zoom.name))],
    actualDistances: [...new Set(primaryCaptures.map(capture => Number(capture.zoom.actualDistance.toFixed(3))))],
    applicationCaptured: receipt.captures.filter(capture => capture.tier === 'application' || capture.tier === 'narrow').length,
  };
  if (fullRequested && scopes.has('play') && cases.length === 216) {
    assert.equal(primaryCaptures.length, 216, 'Full review did not capture every primary matrix row');
    assert.deepEqual(receipt.coverage.presets, all.presets, 'Full review missed a stable camera preset');
    assert.deepEqual(receipt.coverage.zooms, all.zooms.map(zoom => zoom.name), 'Full review missed a review distance');
    assert.equal(receipt.coverage.actualDistances.length, 3, 'Full review did not retain three distinct camera distances');
  }
  assert.deepEqual(receipt.errors, [], 'Browser errors occurred during capture');
  receipt.finalAssets = await page.evaluate(async () => (await fetch('./precache.json', { cache: 'no-store' })).json());
  assert.deepEqual(receipt.finalAssets, receipt.build.assets, 'Built assets changed during capture');
  receipt.status = 'capture_complete';
} catch (error) {
  receipt.status = 'capture_failed'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message);
} finally {
  receipt.finished = new Date().toISOString(); await persist(); await browser.close();
  console.log(JSON.stringify({ status: receipt.status, captures: receipt.captures.length, reviewStatus: receipt.reviewStatus, errors: receipt.errors }));
}
