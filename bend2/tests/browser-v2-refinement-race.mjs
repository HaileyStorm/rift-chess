// Force an input between the sprite refinement's worker message and the host
// listener. The host must defer the Bend image and present it once input drains.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const changeView = process.env.BEND_RACE_VIEW === '1';
const changeControls = process.env.BEND_RACE_CONTROL === '1';
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.addInitScript(({ changeView, changeControls }) => {
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        if (event.data.kind === 'frame') {
          window.__latestView = event.data.presentation.view;
          window.__replyId = event.data.id;
          if (changeControls && event.data.image && event.data.presentation.menu === 5 &&
              event.data.controls.some(control => control.id === 42 && !control.enabled))
            window.__resignPageZero = structuredClone(event.data);
        }
        if (changeControls) { window.__gameWorker = this; return; }
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
}, { changeView, changeControls });
try {
  await page.goto(process.env.BEND_TEST_URL || 'http://127.0.0.1:4185/',
    { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.ready === 'true',
    null, { timeout: 60000 });
  if (changeControls) {
    const control = async id => {
      const button = page.locator(`[data-control="${id}"]`);
      assert.equal(await button.isDisabled(), false);
      const rect = JSON.parse(await button.getAttribute('data-rect'));
      const point = await page.locator('canvas').evaluate((canvas, rect) => {
        const box = canvas.getBoundingClientRect();
        return { x: box.x + (rect.x + rect.width / 2) * box.width / canvas.width,
          y: box.y + (rect.y + rect.height / 2) * box.height / canvas.height };
      }, rect);
      const previous = await page.evaluate(() => window.__replyId);
      await page.mouse.click(point.x, point.y);
      await page.waitForFunction(previous => window.__replyId > previous &&
        document.querySelector('canvas')?.getAttribute('aria-busy') === 'false', previous,
      { timeout: 60000 });
    };
    await control(2); await control(30); await control(29);
    await control(57); await control(7); await control(52);
    assert.ok(await page.evaluate(() => window.__resignPageZero));
    assert.equal(await page.locator('[data-control="52"]').getAttribute('aria-pressed'), 'true');
    const before = await page.locator('canvas').evaluate(canvas => Number(canvas.dataset.spriteDiscarded || 0));
    // Deliver actual earlier Bend pixels/controls after a same-revision menu
    // choice. Only the transport ordering is forced; no hit plan is fabricated.
    await page.evaluate(() => window.__gameWorker.dispatchEvent(new MessageEvent('message', {
      data: { ...window.__resignPageZero, kind: 'refinement' },
    })));
    const discarded = await page.locator('canvas').evaluate(canvas => Number(canvas.dataset.spriteDiscarded || 0));
    assert.ok(discarded > before, 'earlier control plan is discarded');
    await control(42);
    const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('rift-bend-lab/save-v1')));
    assert.equal(journal.commands.length, 1, 'canvas Confirm commits one resignation');
    assert.match(await page.locator('canvas').getAttribute('aria-label'), /Black resigned/);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ ok: true, controlRace: true, discarded, errors }));
  } else {
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
    atlasPick: canvas.dataset.atlasPick,
    summary: canvas.getAttribute('aria-label'),
  }));
  assert.ok(observed.deferred >= 1 && observed.roundTripMs > 0);
  assert.equal(observed.atlasPick, 'true', 'accepted refinement carries its displayed atlas input mode');
  if (changeView) assert.ok(observed.discarded >= 1);
  assert.match(observed.summary, /White to move/);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, ...observed, errors }));
  }
} finally {
  await browser.close();
}
