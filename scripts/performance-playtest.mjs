import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createUiDriver } from './ui-driver.mjs';

const execFileAsync = promisify(execFile);
const viewport = { width: 1600, height: 1000 };
const root = path.resolve('.artifacts/overhaul', process.env.RIFT_TEST_RUN || `performance-${Date.now()}`);
const receiptPath = path.join(root, 'receipt.json');
const receipt = {
  started: new Date().toISOString(),
  classification: 'isolated actual Chrome input and frame pacing; input feedback ends at renderer CPU submission, not GPU completion or display; no screenshots or video during measured intervals',
  viewport,
  samples: [],
  errors: [],
};

await fs.mkdir(path.dirname(root), { recursive: true });
await fs.mkdir(root, { recursive: false });

async function sourceIdentity() {
  const packageInfo = JSON.parse(await fs.readFile('package.json', 'utf8'));
  try {
    const [{ stdout: revision }, { stdout: status }] = await Promise.all([
      execFileAsync('git', ['rev-parse', 'HEAD']),
      execFileAsync('git', ['status', '--porcelain']),
    ]);
    return { packageVersion: packageInfo.version, gitRevision: revision.trim(), worktreeDirty: Boolean(status.trim()) };
  } catch {
    return { packageVersion: packageInfo.version, gitRevision: null, worktreeDirty: null };
  }
}

async function persist() {
  await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2));
}

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
const page = await context.newPage();
const driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });

async function servedPrecache() {
  return page.evaluate(async () => {
    const response = await fetch('./precache.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`precache identity unavailable (${response.status})`);
    return response.json();
  });
}

async function rendererViewport() {
  return page.evaluate(() => {
    const metrics = window.rift.metrics();
    return { window: { width: innerWidth, height: innerHeight }, canvas: { width: metrics.width, height: metrics.height }, renderer: metrics.renderer };
  });
}

async function configure(theme, quality) {
  await page.locator('#settings').click();
  const dialog = page.locator('#settings-dialog');
  await dialog.locator('[name="theme"]').selectOption(theme);
  await dialog.locator('[name="quality"]').selectOption(quality);
  await dialog.locator('[name="motion"]').uncheck();
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
  await driver.ready();
}

async function newMatch(mode = 'hotseat') {
  await page.locator('#new-game').click();
  const dialog = page.locator('#new-dialog');
  await dialog.waitFor({ state: 'visible' });
  await dialog.locator(`input[name="mode"][value="${mode}"]`).check();
  await dialog.locator('input[name="layout"][value="B"]').check();
  await dialog.locator('input[name="draw"][value="prompt"]').check();
  await dialog.locator('#start-game').click();
  await driver.ready();
  await driver.camera('overview');
}

async function beginLongTaskProbe() {
  return page.evaluate(() => {
    const state = { startedAt: performance.now(), supported: false, entries: [], observer: null };
    if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      state.supported = true;
      state.observer = new PerformanceObserver(list => state.entries.push(...list.getEntries().map(entry => ({ startTime: entry.startTime, duration: entry.duration }))));
      state.observer.observe({ type: 'longtask' });
    }
    window.__riftPerformanceLongTasks = state;
    return { startedAt: state.startedAt, supported: state.supported };
  });
}

async function endLongTaskProbe() {
  return page.evaluate(() => {
    const state = window.__riftPerformanceLongTasks;
    if (!state) return { supported: false, entries: [] };
    state.entries.push(...(state.observer?.takeRecords() ?? []).map(entry => ({ startTime: entry.startTime, duration: entry.duration })));
    state.observer?.disconnect();
    return { supported: state.supported, entries: state.entries.filter(entry => entry.startTime >= state.startedAt) };
  });
}

async function armClickFeedback() {
  await page.evaluate(() => {
    window.__riftPerformanceClickFeedback = new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('No real click reached the page for feedback measurement.')), 10_000);
      const listener = event => {
        document.removeEventListener('click', listener, true);
        const inputAt = performance.now();
        const renderedFramesBefore = window.rift.metrics().renderedFrames;
        const target = event.target instanceof Element ? { id: event.target.id || null, tag: event.target.tagName } : null;
        const observeSubmission = () => {
          const metrics = window.rift.metrics();
          if (metrics.renderedFrames > renderedFramesBefore && metrics.lastRenderedAt >= inputAt) {
            window.clearTimeout(timeout);
            resolve({ inputAt, submittedAt: metrics.lastRenderedAt, delayMs: metrics.lastRenderedAt - inputAt, renderedFramesBefore, renderedFramesAfter: metrics.renderedFrames, target });
          } else requestAnimationFrame(observeSubmission);
        };
        requestAnimationFrame(observeSubmission);
      };
      document.addEventListener('click', listener, true);
    });
  });
}

async function takeClickFeedback() {
  return page.evaluate(() => window.__riftPerformanceClickFeedback);
}

function gate(metrics, quality) {
  const targetFps = quality === 'balanced' ? 60 : 30;
  const frameBudgetMs = 1000 / targetFps;
  const values = Object.fromEntries(['medianMs', 'p95Ms', 'p99Ms', 'maxMs'].map(name => [name, metrics[name] === null ? null : metrics[name] <= frameBudgetMs]));
  return { targetFps, frameBudgetMs, comparisons: values, allRecordedPercentilesMeet: Object.values(values).every(value => value === true) };
}

async function measure({ name, theme, quality, action, clickFeedback = false, fixtureSetup = null }) {
  await driver.ready();
  await page.evaluate(() => window.rift.resetMetrics());
  await beginLongTaskProbe();
  if (clickFeedback) await armClickFeedback();
  await action();
  const feedback = clickFeedback ? await takeClickFeedback() : null;
  const metrics = await driver.metrics();
  const sample = {
    name, theme, quality, fixtureSetup, metrics,
    actualFrames: metrics.samples, shadowFrames: metrics.shadowFrames, draws: metrics.calls,
    inputToFirstSubmittedFrame: feedback,
    inputToFirstSubmittedFrameLimit: 'Measured through the first renderer CPU submission after the real click; it is not GPU completion or display latency.',
    longTasks: await endLongTaskProbe(),
    gate: gate(metrics, quality),
    rendererViewport: await rendererViewport(),
    cpuP99Ms: null,
    cpuP99Limit: 'The renderer API exposes CPU median/p95/max only; this script records null rather than inferring CPU p99 from frame pacing.',
  };
  receipt.samples.push(sample);
  console.log(JSON.stringify({ name, theme, quality, medianMs: metrics.medianMs, p95Ms: metrics.p95Ms, p99Ms: metrics.p99Ms, maxMs: metrics.maxMs, cpuMedianMs: metrics.cpuMedianMs, cpuP95Ms: metrics.cpuP95Ms, cpuMaxMs: metrics.cpuMaxMs, actualFrames: sample.actualFrames, shadowFrames: sample.shadowFrames, draws: sample.draws, gate: sample.gate }));
  await persist();
  return sample;
}

async function orbitForFiveSeconds() {
  const box = await page.locator('#scene').boundingBox();
  assert.ok(box, 'Scene canvas must have a measurable box for orbit input.');
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'right' });
  for (let index = 0; index < 100; index++) {
    await page.mouse.move(x + Math.sin(index / 9) * 72, y + Math.cos(index / 11) * 38);
    await page.waitForTimeout(50);
  }
  await page.mouse.up({ button: 'right' });
}

async function zoomByWheel() {
  const box = await page.locator('#scene').boundingBox();
  assert.ok(box, 'Scene canvas must have a measurable box for wheel input.');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -720);
  await page.waitForTimeout(1500);
}

async function loadLoadedShiftTutorial() {
  const learn = await driver.openDrawer('Learn');
  await learn.locator('[data-tutorial="loadedShift"]').click();
  await driver.ready();
  await driver.camera('top');
  await driver.square('c6');
  await page.locator('#shift-passenger').click();
  await driver.square(driver.macroSquare('B4'));
  await page.locator('#confirm-shift').click();
  await page.locator('#promotion-dialog').waitFor({ state: 'visible' });
}

function captureFixture() {
  const board = Array(64).fill(0);
  const index = square => (Number(square[1]) - 1) * 8 + square.charCodeAt(0) - 97;
  for (const [square, piece] of Object.entries({ h1: 6, a1: 4, a4: -2, h8: -6 })) board[index(square)] = piece;
  return { board, holes: (1 << 5) | (1 << 10), side: 1, castling: 0, ep_target: -1, ep_pawn: -1, halfmove: 0, fullmove: 1 };
}

async function ensureMoveIntent() {
  if (await page.locator('#move-mode').getAttribute('aria-pressed') !== 'true') await page.locator('#move-mode').click();
}

async function prepareMoveSource(square) {
  await ensureMoveIntent();
  await driver.square(square);
}

try {
  await page.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await driver.enterPlay();
  receipt.build = {
    browser: await browser.version(),
    start: { source: await sourceIdentity(), precache: await servedPrecache(), rendererViewport: await rendererViewport() },
  };
  await persist();

  for (const theme of ['gallery', 'nocturne', 'daylight']) for (const quality of ['balanced', 'low']) {
    await configure(theme, quality);
    await newMatch();
    await measure({ name: 'idle', theme, quality, action: () => page.waitForTimeout(5000) });
    await measure({ name: 'orbit', theme, quality, action: orbitForFiveSeconds });
  }

  for (const quality of ['balanced', 'low']) {
    const theme = 'gallery';
    await configure(theme, quality);

    await newMatch();
    await measure({ name: 'zoom', theme, quality, action: zoomByWheel });

    await newMatch();
    await ensureMoveIntent();
    await measure({
      name: 'selection', theme, quality, clickFeedback: true,
      action: async () => {
        await driver.square('e2');
        await page.waitForFunction(() => window.rift.metrics().selectedSquare === 12);
        await page.waitForTimeout(1500);
      },
    });

    await loadLoadedShiftTutorial();
    await measure({
      name: 'loadedShift', theme, quality, clickFeedback: true,
      fixtureSetup: 'current Learn loadedShift tutorial; the promotion button is the real UI commit',
      action: async () => {
        const before = await driver.observation();
        await page.locator('#promotion-dialog button[value="N"]').click();
        await page.waitForFunction(revision => window.rift.getObservation().revision === revision + 1, before.revision);
        await driver.ready();
      },
    });

    await driver.loadScenario(captureFixture());
    await prepareMoveSource('a1');
    await measure({
      name: 'capture', theme, quality, clickFeedback: true,
      fixtureSetup: 'injected legal capture position only; the a1-to-a4 capture commits through the real canvas UI',
      action: async () => {
        const before = await driver.observation();
        await driver.square('a4');
        await page.waitForFunction(revision => window.rift.getObservation().revision === revision + 1, before.revision);
        await driver.ready();
        assert.equal((await driver.observation()).position.board[24], 4, 'The UI capture must leave the White rook on a4.');
      },
    });

    await newMatch('bot-black');
    await prepareMoveSource('e2');
    await measure({
      name: 'bot', theme, quality, clickFeedback: true,
      action: async () => {
        await driver.square('e4');
        await page.waitForFunction(() => window.rift.exportRecord().actions.length === 2 && !window.rift.metrics().animating, null, { timeout: 120_000 });
        await driver.ready();
      },
    });
  }

  receipt.build.end = { source: await sourceIdentity(), precache: await servedPrecache(), rendererViewport: await rendererViewport() };
  assert.deepEqual(receipt.build.end.source, receipt.build.start.source, 'Source identity changed during performance measurement.');
  assert.deepEqual(receipt.build.end.precache, receipt.build.start.precache, 'Served precache identity changed during performance measurement.');
  assert.deepEqual(receipt.build.end.rendererViewport, receipt.build.start.rendererViewport, 'Renderer or viewport identity changed during performance measurement.');
  assert.deepEqual(receipt.errors, []);
  receipt.status = 'MEASURED';
} catch (error) {
  receipt.status = 'FAILED';
  receipt.failure = error instanceof Error ? error.stack : String(error);
  process.exitCode = 1;
  console.error(error);
} finally {
  receipt.finished = new Date().toISOString();
  await persist();
  await context.close();
  await browser.close();
  console.log(JSON.stringify({ status: receipt.status, samples: receipt.samples.length, errors: receipt.errors.length, output: root }));
}
