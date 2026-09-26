// Real-browser check that a Bend policy promotion from three synthetic valid
// timing windows retains the sprite scene instead of reverting to proxies.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.env.BEND_TEST_URL || 'http://127.0.0.1:4185/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__refinements = [];
  window.__frames = [];
  window.addEventListener('rift-bend-sprite-refined', event =>
    window.__refinements.push(event.detail));
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args);
      window.__gameWorker = this;
      this.addEventListener('message', event => {
        if (event.data.kind === 'frame') {
          window.__presentation = event.data.presentation;
          window.__frames.push({ id: event.data.id, width: event.data.width,
            height: event.data.height, sceneTimes: event.data.sceneTimes });
        }
        if (event.data.kind === 'fault') window.__fault = event.data.message;
      });
    }
  };
});
try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__fault || window.__refinements.length > 0,
    null, { timeout: 60000 });
  assert.equal(await page.evaluate(() => window.__fault), undefined);
  const probe = { $: 'QualityProbe', portrait: false, physicalEdge: 1920,
    timingValid: true, sampleCount: 8, measuredScale: 1,
    mainP90Us: 1000, workerP90Us: 1500 };
  for (let index = 0; index < 3; index++) {
    const id = 400 + index;
    await page.evaluate(({ id, probe }) => window.__gameWorker.postMessage({
      kind: 'events', id, events: [probe], presentation: window.__presentation,
    }), { id, probe });
    await page.waitForFunction(id => window.__fault ||
      document.querySelector('canvas')?.dataset.frame === String(id),
      id, { timeout: 120000 });
    assert.equal(await page.evaluate(() => window.__fault), undefined);
  }
  await page.waitForFunction(() => document.querySelector('canvas')?.width === 2048 &&
    document.querySelector('canvas')?.height === 1280, null, { timeout: 120000 });
  const observed = await page.evaluate(() => ({
    width: document.querySelector('canvas').width,
    height: document.querySelector('canvas').height,
    source: window.__presentation,
    refinements: window.__refinements.length,
    roundTripMs: Number(document.querySelector('canvas').dataset.spriteRoundTripMs),
    lastFrame: window.__frames.at(-1),
  }));
  assert.deepEqual([observed.width, observed.height], [2048, 1280]);
  assert.ok(observed.refinements >= 1 && observed.roundTripMs > 0,
    'existing detailed Bend sprite scene is retained when tier promotes');
  assert.ok(observed.lastFrame.sceneTimes.prepared > 0);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: '.artifacts/bend2/v2-preview/browser-v2-enhanced.png' });
  console.log(JSON.stringify({ ok: true, width: observed.width, height: observed.height,
    refinements: observed.refinements, roundTripMs: observed.roundTripMs,
    preparedMs: observed.lastFrame.sceneTimes.prepared, errors }));
} finally {
  await browser.close();
}
