/**
 * One exact-build Gallery/Balanced tail check: idle, loaded Shift, and bot response.
 * Successful collection is measurement evidence, not an automatic performance waiver.
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createUiDriver } from './ui-driver.mjs';

const execFileAsync = promisify(execFile);
const viewport = { width: 1600, height: 1000 };
const strict60BudgetMs = 1000 / 60;
const repetitions = 3;
const minimumIntervals = 300;
const maximumIntervals = 1200;
const probeTimeoutMs = 30_000;
const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const runName = process.env.RIFT_TEST_RUN || `performance-tail-${Date.now()}`;
const root = path.resolve('.artifacts', 'overhaul', runName);
const receiptPath = path.join(root, 'receipt.json');

try {
  await fs.access(root);
  throw new Error(`Refusing to reuse performance-tail evidence directory: ${root}`);
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
await fs.mkdir(path.dirname(root), { recursive: true });
await fs.mkdir(root, { recursive: false });

const receipt = {
  started: new Date().toISOString(),
  classification: 'fresh exact-build raw RAF and CPU tail measurement; input feedback ends at renderer CPU submission, not GPU completion or display; no screenshots, video, calibration, waiver, or GPU synchronization polls',
  requested: {
    theme: 'gallery', quality: 'balanced', scenarios: ['idle', 'loadedShift', 'bot'], repetitions,
    expectedSamples: repetitions * 3, minimumIntervals, maximumIntervals, probeTimeoutMs,
    strictComparison: 'intervalMs <= 1000 / 60', strict60BudgetMs,
  },
  committedActionPolicy: 'All commits use actual visible UI controls through ui-driver; no reducer-injected committed actions.',
  samples: [],
  errors: [],
};
const persist = () => fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2));

async function sourceIdentity() {
  const packageInfo = JSON.parse(await fs.readFile('package.json', 'utf8'));
  const [{ stdout: revision }, { stdout: status }] = await Promise.all([
    execFileAsync('git', ['rev-parse', 'HEAD']),
    execFileAsync('git', ['status', '--porcelain']),
  ]);
  return { packageVersion: packageInfo.version, gitRevision: revision.trim(), worktreeStatus: status.trim().split(/\r?\n/).filter(Boolean) };
}

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
const page = await context.newPage();
const driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(`pageerror: ${error.message}`));
page.on('console', message => { if (message.type() === 'error') receipt.errors.push(`console: ${message.text()}`); });

async function servedPrecache() {
  return page.evaluate(async () => {
    const response = await fetch('./precache.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Precache identity unavailable (${response.status})`);
    return response.json();
  });
}

async function rendererIdentity() {
  return page.evaluate(() => {
    const metrics = window.rift.metrics();
    return { viewport: { width: innerWidth, height: innerHeight }, canvas: { width: metrics.width, height: metrics.height }, renderer: metrics.renderer, devicePixelRatio };
  });
}

async function configureGalleryBalanced() {
  await page.locator('#settings').click();
  const dialog = page.locator('#settings-dialog');
  await dialog.waitFor({ state: 'visible' });
  await dialog.locator('[name="theme"]').selectOption('gallery');
  await dialog.locator('[name="family"]').selectOption('classic');
  await dialog.locator('[name="material"]').selectOption('ceramic');
  await dialog.locator('[name="quality"]').selectOption('balanced');
  await dialog.locator('[name="motion"]').setChecked(false);
  await dialog.locator('[name="contrast"]').setChecked(false);
  await dialog.locator('button[value="apply"]').click();
  await driver.ready();
}

async function newMatch(mode = 'hotseat') {
  await page.locator('#new-game').click();
  const dialog = page.locator('#new-dialog');
  await dialog.waitFor({ state: 'visible' });
  await dialog.locator(`input[name="mode"][value="${mode}"]`).check();
  await dialog.locator('input[name="layout"][value="B"]').check();
  await dialog.locator('input[name="draw"][value="prompt"]').check();
  await dialog.locator('#practice').check();
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
    window.__riftTailLongTasks = state;
    return { startedAt: state.startedAt, supported: state.supported };
  });
}

async function endLongTaskProbe() {
  return page.evaluate(() => {
    const state = window.__riftTailLongTasks;
    if (!state) return { supported: false, startedAt: null, entries: [] };
    state.entries.push(...(state.observer?.takeRecords() ?? []).map(entry => ({ startTime: entry.startTime, duration: entry.duration })));
    state.observer?.disconnect();
    window.__riftTailLongTasks = null;
    return {
      supported: state.supported, startedAt: state.startedAt,
      entries: state.entries.filter(entry => entry.startTime >= state.startedAt).map(entry => ({ ...entry, startRelativeToProbeMs: entry.startTime - state.startedAt })),
    };
  });
}

async function beginRawProbe(label) {
  await page.evaluate(({ label, minimumIntervals, maximumIntervals, probeTimeoutMs, strict60BudgetMs }) => {
    const startedAt = performance.now();
    const skipButton = document.querySelector('#skip');
    const state = {
      label, startedAt, minimumIntervals, maximumIntervals, probeTimeoutMs, strict60BudgetMs,
      intervals: [], markers: [], scenarioComplete: false, previousRafAt: null,
      skipButton, previousAnimating: skipButton ? !skipButton.hidden : false,
      raf: 0, timer: 0, settled: false,
      cancelInput: null, resolve: null, reject: null,
    };
    const projection = () => ({
      label: state.label, startedAt: state.startedAt, finishedAt: performance.now(),
      intervals: state.intervals, markers: state.markers, rendererMetrics: window.rift.metrics(),
    });
    const cleanup = () => { cancelAnimationFrame(state.raf); clearTimeout(state.timer); state.cancelInput?.(); };
    const finish = () => { if (state.settled) return; state.settled = true; cleanup(); state.resolve(projection()); };
    const fail = message => { if (state.settled) return; state.settled = true; cleanup(); state.reject(new Error(message)); };
    state.done = new Promise((resolve, reject) => { state.resolve = resolve; state.reject = reject; });
    state.complete = () => {
      const at = performance.now();
      state.scenarioComplete = true;
      state.markers.push({ type: 'scenario-complete', at, relativeToSampleStartMs: at - state.startedAt });
      if (state.intervals.length >= state.minimumIntervals) finish();
    };
    state.cancel = reason => fail(reason || `Raw RAF probe ${state.label} was cancelled`);
    const tick = rafAt => {
      const observedAt = performance.now();
      const animating = !state.skipButton?.hidden;
      if (animating !== state.previousAnimating) {
        const renderedFrames = window.rift.metrics().renderedFrames;
        state.markers.push({ type: animating ? 'animation-start' : 'animation-end', at: rafAt, observedAt, relativeToSampleStartMs: rafAt - state.startedAt, renderedFrames });
        state.previousAnimating = animating;
      }
      if (state.previousRafAt !== null) {
        const intervalMs = rafAt - state.previousRafAt;
        state.intervals.push({
          index: state.intervals.length, startAt: state.previousRafAt, endAt: rafAt,
          startRelativeToSampleMs: state.previousRafAt - state.startedAt, endRelativeToSampleMs: rafAt - state.startedAt,
          intervalMs, meetsStrict60: intervalMs <= state.strict60BudgetMs,
          observedAt, animatingAtEnd: animating,
        });
      }
      state.previousRafAt = rafAt;
      if (state.scenarioComplete && state.intervals.length >= state.minimumIntervals) return finish();
      if (state.intervals.length >= state.maximumIntervals) return fail(`Raw RAF probe ${state.label} reached ${state.maximumIntervals} intervals before scenario completion`);
      state.raf = requestAnimationFrame(tick);
    };
    state.timer = window.setTimeout(() => fail(`Raw RAF probe ${state.label} exceeded ${state.probeTimeoutMs}ms`), state.probeTimeoutMs);
    state.raf = requestAnimationFrame(tick);
    window.__riftTailProbe = state;
  }, { label, minimumIntervals, maximumIntervals, probeTimeoutMs, strict60BudgetMs });
}

async function armInputFeedback(selector) {
  await page.evaluate(selector => {
    const state = window.__riftTailProbe;
    if (!state || state.settled) throw new Error('Raw RAF probe is not active');
    let clicked = false;
    let finished = false;
    state.inputFeedback = new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        if (finished) return;
        finished = true; document.removeEventListener('click', listener, true);
        reject(new Error(clicked ? `No renderer CPU submission followed the click matching ${selector}` : `No real click matched ${selector}`));
      }, 10_000);
      const listener = event => {
        const target = event.target instanceof Element ? event.target.closest(selector) : null;
        if (!target || clicked || finished) return;
        clicked = true; document.removeEventListener('click', listener, true);
        const inputAt = performance.now();
        const renderedFramesBefore = window.rift.metrics().renderedFrames;
        state.markers.push({ type: 'input-click', at: inputAt, relativeToSampleStartMs: inputAt - state.startedAt, renderedFramesBefore, target: { id: target.id || null, tag: target.tagName, selector } });
        const observeSubmission = () => {
          if (finished) return;
          const metrics = window.rift.metrics();
          if (metrics.renderedFrames > renderedFramesBefore && metrics.lastRenderedAt >= inputAt) {
            finished = true; window.clearTimeout(timeout);
            state.markers.push({ type: 'first-cpu-render-submission', at: metrics.lastRenderedAt, relativeToSampleStartMs: metrics.lastRenderedAt - state.startedAt, renderedFrames: metrics.renderedFrames });
            resolve({ inputAt, submittedAt: metrics.lastRenderedAt, delayMs: metrics.lastRenderedAt - inputAt, renderedFramesBefore, renderedFramesAfter: metrics.renderedFrames, target: { id: target.id || null, tag: target.tagName, selector } });
          } else requestAnimationFrame(observeSubmission);
        };
        requestAnimationFrame(observeSubmission);
      };
      state.cancelInput = () => {
        document.removeEventListener('click', listener, true); window.clearTimeout(timeout);
        if (!finished) { finished = true; reject(new Error(`Input feedback for ${selector} was cancelled`)); }
      };
      document.addEventListener('click', listener, true);
    });
  }, selector);
}

async function rawProbePromise() {
  return page.evaluate(() => {
    const state = window.__riftTailProbe;
    if (!state) throw new Error('Raw RAF probe is missing');
    return state.done;
  });
}

async function inputFeedbackPromise() {
  return page.evaluate(() => {
    const state = window.__riftTailProbe;
    if (!state?.inputFeedback) throw new Error('Input feedback probe is missing');
    return state.inputFeedback;
  });
}

async function completeRawProbe() {
  await page.evaluate(() => window.__riftTailProbe?.complete());
}

async function cancelRawProbe(reason) {
  await page.evaluate(reason => window.__riftTailProbe?.cancel(reason), reason).catch(() => {});
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function intervalRelativeTo(interval, anchorAt) {
  if (!interval || anchorAt === null || anchorAt === undefined) return null;
  return {
    index: interval.index, intervalMs: interval.intervalMs, meetsStrict60: interval.meetsStrict60,
    startRelativeMs: interval.startAt - anchorAt, endRelativeMs: interval.endAt - anchorAt,
    startAt: interval.startAt, endAt: interval.endAt,
  };
}

function timelineSummary(raw) {
  const intervals = raw.intervals;
  const click = raw.markers.find(marker => marker.type === 'input-click') ?? null;
  const worst = intervals.reduce((candidate, interval) => !candidate || interval.intervalMs > candidate.intervalMs ? interval : candidate, null);
  const animationWindows = [];
  let active = null;
  for (const marker of raw.markers.filter(item => item.type === 'animation-start' || item.type === 'animation-end')) {
    if (marker.type === 'animation-start') {
      if (active) animationWindows.push(active);
      active = { start: marker, end: null };
    } else if (active) {
      active.end = marker; animationWindows.push(active); active = null;
    }
  }
  if (active) animationWindows.push(active);
  const windows = animationWindows.map((window, index) => {
    const first = intervals.find(interval => interval.endAt >= window.start.at) ?? null;
    const boundary = window.end?.at ?? raw.finishedAt;
    const last = [...intervals].reverse().find(interval => interval.startAt <= boundary) ?? null;
    return {
      index, start: window.start, end: window.end,
      firstIntervalRelativeToAnimationStart: intervalRelativeTo(first, window.start.at),
      lastIntervalRelativeToAnimationEnd: intervalRelativeTo(last, window.end?.at ?? null),
      firstIntervalRelativeToClick: intervalRelativeTo(first, click?.at ?? null),
      lastIntervalRelativeToClick: intervalRelativeTo(last, click?.at ?? null),
    };
  });
  return {
    firstInterval: intervalRelativeTo(intervals[0] ?? null, raw.startedAt),
    lastInterval: intervalRelativeTo(intervals.at(-1) ?? null, raw.startedAt),
    worstIntervalRelativeToSample: intervalRelativeTo(worst, raw.startedAt),
    worstIntervalRelativeToClick: intervalRelativeTo(worst, click?.at ?? null),
    firstIntervalAfterClick: intervalRelativeTo(intervals.find(interval => click && interval.endAt >= click.at) ?? null, click?.at ?? null),
    lastIntervalRelativeToClick: intervalRelativeTo(intervals.at(-1) ?? null, click?.at ?? null),
    animationWindows: windows,
  };
}

function strictComparisons(raw, metrics) {
  const durations = raw.intervals.map(interval => interval.intervalMs);
  const aggregate = {
    medianMs: percentile(durations, 0.5), p95Ms: percentile(durations, 0.95),
    p99Ms: percentile(durations, 0.99), maxMs: durations.length ? Math.max(...durations) : null,
  };
  return {
    comparator: 'value <= 1000 / 60', budgetMs: strict60BudgetMs, calibrated: false, waived: false,
    raw: {
      count: raw.intervals.length, misses: raw.intervals.filter(interval => !interval.meetsStrict60).length,
      allMeet: raw.intervals.every(interval => interval.meetsStrict60),
      aggregate,
      aggregateMeets: Object.fromEntries(Object.entries(aggregate).map(([key, value]) => [key, value !== null && value <= strict60BudgetMs])),
    },
    rendererMetricsMeet: Object.fromEntries(['medianMs', 'p95Ms', 'p99Ms', 'maxMs', 'cpuMedianMs', 'cpuP95Ms', 'cpuMaxMs'].map(key => [key, metrics[key] !== null && metrics[key] <= strict60BudgetMs])),
  };
}

async function measure({ scenario, repetition, fixtureSetup = null, inputSelector = null, action }) {
  await driver.ready();
  await page.evaluate(() => window.rift.resetMetrics());
  const longTaskStart = await beginLongTaskProbe();
  const label = `${scenario}-${repetition}`;
  await beginRawProbe(label);
  const rawPromise = rawProbePromise(); rawPromise.catch(() => {});
  let feedbackPromise = null;
  if (inputSelector) { await armInputFeedback(inputSelector); feedbackPromise = inputFeedbackPromise(); feedbackPromise.catch(() => {}); }
  let longTasks = null;
  try {
    await action();
    await completeRawProbe();
    const raw = await rawPromise;
    const inputToFirstSubmittedFrame = feedbackPromise ? await feedbackPromise : null;
    longTasks = await endLongTaskProbe();
    const metrics = raw.rendererMetrics;
    delete raw.rendererMetrics;
    const sample = {
      scenario, repetition, theme: 'gallery', quality: 'balanced', fixtureSetup,
      rawRaf: raw,
      timeline: timelineSummary(raw),
      metrics,
      longTasks: { ...longTasks, armedAt: longTaskStart.startedAt },
      inputToFirstSubmittedFrame,
      inputToFirstSubmittedFrameLimit: inputSelector ? 'Measured from the actual commit click to the first renderer CPU submission; not GPU completion or display latency.' : null,
      strictComparisons: strictComparisons(raw, metrics),
    };
    receipt.samples.push(sample);
    await persist();
    console.log(JSON.stringify({ scenario, repetition, rawIntervals: raw.intervals.length, rawMisses: sample.strictComparisons.raw.misses, p99Ms: sample.strictComparisons.raw.aggregate.p99Ms, cpuP95Ms: metrics.cpuP95Ms, longTasks: longTasks.entries.length }));
    return sample;
  } finally {
    await cancelRawProbe(`Measurement ${label} finished cleanup`);
    if (!longTasks) await endLongTaskProbe().catch(() => {});
  }
}

async function prepareLoadedPromotion() {
  const learn = await driver.openDrawer('Learn the rift');
  await learn.locator('[data-tutorial="loadedShift"]').click();
  await driver.ready();
  await driver.camera('top');
  const before = await driver.observation();
  await driver.square('c6');
  await page.locator('#shift-passenger').waitFor({ state: 'visible' });
  await page.locator('#shift-passenger').click();
  await driver.square(driver.macroSquare('B4'));
  await page.locator('#promotion-dialog').waitFor({ state: 'visible' });
  assert.equal((await driver.observation()).revision, before.revision, 'Destination-click promotion dialog must precede the loaded Shift commit');
  return before;
}

async function prepareBotCommit() {
  await newMatch('bot-black');
  const before = await driver.observation();
  await driver.square('e2');
  await page.waitForFunction(() => window.rift.metrics().selectedSquare === 12);
  assert.equal((await driver.observation()).revision, before.revision, 'Bot measurement source selection must remain uncommitted');
  return before;
}

async function cancelActiveProbe() {
  await page.evaluate(() => {
    window.__riftTailLongTasks?.observer?.disconnect();
    window.__riftTailLongTasks = null;
    window.__riftTailProbe?.cancel('Run cleanup');
  }).catch(() => {});
}

try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await driver.enterPlay();
  await configureGalleryBalanced();
  const startSource = await sourceIdentity();
  assert.deepEqual(startSource.worktreeStatus, [], 'Performance-tail source must be clean and committed');
  receipt.build = {
    browser: await browser.version(),
    start: { source: startSource, precache: await servedPrecache(), renderer: await rendererIdentity() },
    end: null,
  };
  await persist();

  for (let repetition = 1; repetition <= repetitions; repetition++) {
    await newMatch('hotseat');
    await measure({
      scenario: 'idle', repetition,
      action: () => page.waitForTimeout(5000),
    });

    const loadedBefore = await prepareLoadedPromotion();
    await measure({
      scenario: 'loadedShift', repetition,
      fixtureSetup: 'Current visible Carry one passenger tutorial; c6 passenger, B3 to B4 preview, and N promotion button are actual UI controls.',
      inputSelector: '#promotion-dialog button[value="N"]',
      action: async () => {
        await page.locator('#promotion-dialog button[value="N"]').click();
        await page.waitForFunction(revision => window.rift.getObservation().revision === revision + 1, loadedBefore.revision, { timeout: 10_000 });
        await driver.ready();
        assert.equal((await driver.observation()).position.board[58], 2, 'Loaded Shift must commit the selected knight promotion');
      },
    });

    const botBefore = await prepareBotCommit();
    await measure({
      scenario: 'bot', repetition,
      inputSelector: '#scene canvas',
      action: async () => {
        await driver.square('e4');
        await page.waitForFunction(() => window.rift.exportRecord().actions.length === 2 && !window.rift.metrics().animating, null, { timeout: 30_000 });
        await driver.ready();
        const after = await driver.observation();
        assert.equal(after.position.side, 1, 'Bot response must return control to White');
        assert.equal(after.revision, botBefore.revision + 2, 'Human and bot must contribute exactly two committed actions');
      },
    });
  }

  assert.equal(receipt.samples.length, repetitions * 3, 'Tail check must contain exactly nine samples');
  for (const scenario of ['idle', 'loadedShift', 'bot']) {
    assert.equal(receipt.samples.filter(sample => sample.scenario === scenario).length, repetitions, `${scenario} must have exactly three repetitions`);
  }
  receipt.build.end = { source: await sourceIdentity(), precache: await servedPrecache(), renderer: await rendererIdentity() };
  assert.deepEqual(receipt.build.end.source, receipt.build.start.source, 'Source identity changed during performance-tail measurement');
  assert.deepEqual(receipt.build.end.precache, receipt.build.start.precache, 'Served precache changed during performance-tail measurement');
  assert.deepEqual(receipt.build.end.renderer, receipt.build.start.renderer, 'Renderer or viewport identity changed during performance-tail measurement');
  assert.deepEqual(receipt.errors, [], 'Browser errors were recorded');
  receipt.strictSummary = {
    samples: receipt.samples.map(sample => ({
      scenario: sample.scenario, repetition: sample.repetition,
      rawIntervals: sample.strictComparisons.raw.count, rawMisses: sample.strictComparisons.raw.misses,
      rawAllMeet: sample.strictComparisons.raw.allMeet, aggregateMeets: sample.strictComparisons.raw.aggregateMeets,
      rendererMetricsMeet: sample.strictComparisons.rendererMetricsMeet,
    })),
    allRawIntervalsMeet: receipt.samples.every(sample => sample.strictComparisons.raw.allMeet),
    interpretation: 'Literal 1000/60 comparisons only. False values remain failures of that comparison and are neither calibrated nor waived.',
  };
  receipt.status = 'MEASURED_RAW_STRICT_COMPARISONS';
} catch (error) {
  receipt.status = 'FAILED';
  receipt.failure = error instanceof Error ? error.stack : String(error);
  process.exitCode = 1;
  console.error(error);
} finally {
  await cancelActiveProbe();
  receipt.finished = new Date().toISOString();
  await persist();
  await context.close();
  await browser.close();
  console.log(JSON.stringify({ status: receipt.status, samples: receipt.samples.length, errors: receipt.errors.length, output: root }));
}
