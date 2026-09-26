// Force an input between the sprite refinement's worker message and the host
// listener. The host must defer the Bend image and present it once input drains.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const changeView = process.env.BEND_RACE_VIEW === '1';
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.addInitScript(({ changeView }) => {
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        if (event.data.kind === 'frame') window.__latestView = event.data.presentation.view;
        if (event.data.kind !== 'refinement' || window.__forcedRefinementRace) return;
        window.__forcedRefinementRace = true;
        const canvas = document.querySelector('canvas');
        if (changeView) {
          canvas?.focus();
          canvas?.dispatchEvent(new WheelEvent('wheel', {
            bubbles: true, cancelable: true, clientX: 100, clientY: 100, deltaY: -120,
          }));
        } else {
          canvas?.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true, isPrimary: true, clientX: 100, clientY: 100,
          }));
        }
      });
    }
  };
}, { changeView });
try {
  await page.goto(process.env.BEND_TEST_URL || 'http://127.0.0.1:4185/',
    { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.ready === 'true',
    null, { timeout: 60000 });
  await page.waitForFunction(() => Number(document.querySelector('canvas')?.dataset.spriteDeferred) > 0,
    null, { timeout: 60000 });
  if (changeView) await page.waitForFunction(() =>
    Number(document.querySelector('canvas')?.dataset.spriteDiscarded) > 0 &&
    window.__latestView?.zoom > 100, null, { timeout: 60000 });
  await page.waitForFunction(() => Number(document.querySelector('canvas')?.dataset.spriteRoundTripMs) > 0 &&
    document.querySelector('canvas')?.getAttribute('aria-busy') === 'false',
    null, { timeout: 60000 });
  const observed = await page.locator('canvas').evaluate(canvas => ({
    deferred: Number(canvas.dataset.spriteDeferred),
    discarded: Number(canvas.dataset.spriteDiscarded || 0),
    roundTripMs: Number(canvas.dataset.spriteRoundTripMs),
    summary: canvas.getAttribute('aria-label'),
  }));
  assert.ok(observed.deferred >= 1 && observed.roundTripMs > 0);
  if (changeView) assert.ok(observed.discarded >= 1);
  assert.match(observed.summary, /White to move/);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, ...observed, errors }));
} finally {
  await browser.close();
}
