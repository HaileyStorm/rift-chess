import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createUiDriver } from './ui-driver.mjs';

const viewport = { width: 1600, height: 1000 };
const output = path.resolve('.artifacts/overhaul', process.env.RIFT_COMPARISON_RUN || `comparison-${Date.now()}`);
const receiptPath = path.join(output, 'receipt.json');
const builds = [
  { id: 'v1', url: 'http://127.0.0.1:4180/', legacy: true, precacheVersion: '8fbcc1d7056bd881ae88', sourceCommit: '9c0d8b01535f04d22bde93dfe22641aedd0c7ebc' },
  { id: 'new', url: process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/', legacy: false },
];
const themes = ['gallery', 'nocturne', 'daylight'];
const presets = ['white', 'overview'];
const settings = { family: 'classic', material: 'ceramic', quality: 'balanced', motion: true };
const conformance = JSON.parse(await fs.readFile('fixtures/conformance.json', 'utf8'));
const opening = conformance.fixtures.find(item => item.name === 'opening_B');
assert.ok(opening, 'opening_B fixture is required for matched comparison capture.');

try {
  await fs.access(output);
  throw new Error(`Refusing to reuse existing comparison capture directory: ${output}`);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await fs.mkdir(output, { recursive: true });

const receipt = {
  started: new Date().toISOString(),
  classification: 'matched rendered comparison captures for human WOW review; not gameplay acceptance or a camera-transform comparison',
  comparisonContract: {
    fixture: 'opening_B',
    positionHash: opening.position_hash,
    settings: { ...settings, theme: 'per capture' },
    viewport,
    presets,
    cameraLimit: 'White and overview are matched semantic presets. Authored lens and camera coordinates are deliberately allowed to differ and are never asserted equal.',
  },
  builds: {},
  captures: [],
  errors: [],
};

async function persist() {
  await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2));
}

async function buildIdentity(page, legacy) {
  return page.evaluate(async legacy => {
    const read = async path => {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) return null;
      return response.json();
    };
    return { precache: await read('./precache.json'), source: legacy ? await read('./build-source.json') : null };
  }, legacy);
}

async function waitLegacyReady(page) {
  await page.waitForFunction(() => Boolean(window.rift) && !window.rift.metrics().animating, null, { timeout: 60_000 });
  await page.waitForTimeout(500);
}

async function applyLegacySettings(page, theme) {
  await page.locator('#settings').click();
  const dialog = page.locator('dialog[open]');
  await dialog.locator('[name="theme"]').selectOption(theme);
  await dialog.locator('[name="family"]').selectOption(settings.family);
  await dialog.locator('[name="material"]').selectOption(settings.material);
  await dialog.locator('[name="quality"]').selectOption(settings.quality);
  await dialog.locator('[name="motion"]').check();
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
  await waitLegacyReady(page);
}

async function applyCurrentSettings(page, driver, theme) {
  await page.locator('#settings').click();
  const dialog = page.locator('#settings-dialog');
  await dialog.locator('[name="theme"]').selectOption(theme);
  await dialog.locator('[name="family"]').selectOption(settings.family);
  await dialog.locator('[name="material"]').selectOption(settings.material);
  await dialog.locator('[name="quality"]').selectOption(settings.quality);
  await dialog.locator('[name="motion"]').check();
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
  await driver.ready();
}

async function observedState(page) {
  return page.evaluate(() => ({ observation: window.rift.getObservation(), record: window.rift.exportRecord(), preset: window.rift.metrics().preset, viewport: { width: innerWidth, height: innerHeight } }));
}

function assertOpening(state, label) {
  assert.deepEqual(state.observation.position, opening.record.initial, `${label}: observed position differs from opening_B.`);
  assert.equal(state.observation.position_hash, opening.position_hash, `${label}: observed position hash differs from opening_B.`);
  assert.deepEqual(state.record.actions, [], `${label}: fixture must retain an empty action record.`);
}

async function closeSecondaryDrawer(page) {
  const drawer = page.locator('details.drawer').nth(1);
  if (await drawer.count() && await drawer.evaluate(element => element.open)) await drawer.locator('summary').click();
}

async function fileHash(file) {
  return createHash('sha256').update(await fs.readFile(file)).digest('hex');
}

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });

try {
  for (const build of builds) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    const page = await context.newPage();
    page.on('pageerror', error => receipt.errors.push(`${build.id}: pageerror: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') receipt.errors.push(`${build.id}: console: ${message.text()}`); });
    try {
      let driver = null;
      await page.goto(build.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      const start = await buildIdentity(page, build.legacy);
      assert.ok(start.precache?.version, 'Every comparison build needs its served identity.');
      if (build.legacy) {
        assert.equal(start.precache?.version, build.precacheVersion, 'The legacy server must expose the declared immutable precache.');
        assert.equal(start.source?.source_commit, build.sourceCommit, 'The legacy server must expose the declared source commit.');
        await waitLegacyReady(page); await page.evaluate(record => window.rift.loadScenario(record), opening.record);
        await waitLegacyReady(page);
      } else {
        driver = createUiDriver(page);
        await driver.enterPlay();
        await driver.loadScenario(opening.record);
        await driver.ready();
        await closeSecondaryDrawer(page);
      }
      receipt.builds[build.id] = { url: build.url, start, end: null };

      for (const theme of themes) {
        if (build.legacy) await applyLegacySettings(page, theme);
        else await applyCurrentSettings(page, driver, theme);
        assertOpening(await observedState(page), `${build.id}/${theme}/setup`);

        for (const preset of presets) {
          if (build.legacy) {
            await page.locator(`[data-camera="${preset}"]`).click();
            await waitLegacyReady(page);
          } else await driver.camera(preset);
          const state = await observedState(page);
          assertOpening(state, `${build.id}/${theme}/${preset}`);
          assert.equal(state.preset, preset, `${build.id}/${theme}/${preset}: semantic camera preset did not apply.`);
          assert.deepEqual(state.viewport, viewport, `${build.id}/${theme}/${preset}: viewport changed.`);
          const file = `${build.id}-${theme}-${preset}.png`;
          const filePath = path.join(output, file);
          await page.waitForTimeout(250);
          await page.screenshot({ path: filePath });
          receipt.captures.push({
            build: build.id, theme, preset, file, sha256: await fileHash(filePath),
            observed: state,
            matchedState: { fixture: 'opening_B', positionHash: opening.position_hash, settings: { theme, ...settings }, viewport, preset },
            cameraLimit: 'Semantic preset matched; authored lens and camera coordinates are intentionally not compared.',
          });
          await persist();
        }
      }

      receipt.builds[build.id].end = await buildIdentity(page, build.legacy);
      assert.deepEqual(receipt.builds[build.id].end.precache, start.precache, `${build.id}: served precache changed during capture.`);
      if (build.legacy) assert.deepEqual(receipt.builds[build.id].end.source, start.source, 'Legacy source identity changed during capture.');
    } finally {
      await context.close();
    }
  }
  assert.equal(receipt.captures.length, 12, 'Expected both builds × three themes × two presets.');
  assert.deepEqual(receipt.errors, []);
  receipt.status = 'CAPTURED_REQUIRES_HUMAN_WOW_REVIEW';
} catch (error) {
  receipt.status = 'FAILED';
  receipt.failure = error instanceof Error ? error.stack : String(error);
  process.exitCode = 1;
  console.error(error);
} finally {
  receipt.finished = new Date().toISOString();
  await persist();
  await browser.close();
  console.log(JSON.stringify({ status: receipt.status, captures: receipt.captures.length, errors: receipt.errors.length, output }));
}
