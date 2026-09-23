import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const out = path.resolve('.artifacts/bend2/camera', process.env.BEND_PLAYTEST_RUN || new Date().toISOString().replace(/[:.]/g, '-'));
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
const receipt = { at: new Date().toISOString(), url: process.env.BEND_TEST_URL || 'http://127.0.0.1:4184/', checks: [], errors: [], captures: [] };
page.on('pageerror', error => receipt.errors.push(error.message));
page.on('console', event => { if (event.type() === 'error') receipt.errors.push(event.text()); });
// Read-only observation ties checks to actual worker image replies, not sliders alone.
await page.addInitScript(() => {
  const Native = window.Worker;
  window.__renderFrames = [];
  document.addEventListener('pointerdown', event => {
    if (event.button === 0 && event.target.id === 'board' && window.__armClickDelay) {
      window.__armClickDelay = false; window.__delayNextPick = true;
    }
  }, true);
  window.Worker = class extends Native {
    frames = new Map();
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        if (event.data.kind === 'picked' && event.data.id === this.delayedPick) {
          this.delayedPick = null;
          event.stopImmediatePropagation();
          setTimeout(() => this.dispatchEvent(new MessageEvent('message', { data: event.data })), 400);
          return;
        }
        if (event.data.kind === 'image') window.__displayedView = this.frames.get(event.data.id);
      });
    }
    postMessage(message, ...args) {
      if (message.kind === 'pick' && window.__delayNextPick) {
        window.__delayNextPick = false; this.delayedPick = message.id;
      }
      if (message.kind === 'render') {
        this.frames.set(message.id, message.frame.view);
        window.__renderFrames.push({ action: message.frame.lastAction, progress: message.frame.progress, view: message.frame.view });
        if (window.__rotateDuringAnimation && message.frame.progress > 0 && message.frame.progress < 16) {
          window.__rotateDuringAnimation = false; window.__animationRotation = true;
          queueMicrotask(() => document.querySelector('#camera-right').click());
        }
      }
      super.postMessage(message, ...args);
    }
  };
});
async function ready() {
  await page.waitForFunction(() => {
    const v = window.__displayedView;
    return v && document.querySelector('#busy')?.hidden && !document.querySelector('#offer')?.disabled
      && Number(document.querySelector('#camera-yaw').value) === v.yaw
      && Number(document.querySelector('#camera-pitch').value) === v.pitch
      && Number(document.querySelector('#camera-zoom').value) === v.zoom;
  }, null, { timeout: 60000 });
}
async function count(n) { await page.waitForFunction(n => JSON.parse(localStorage.getItem('rift-bend-lab/save-v1') || '{}').commands?.length === n, n, { timeout: 60000 }); await ready(); }
async function view() { return page.evaluate(() => window.__displayedView); }
async function record() { return page.evaluate(() => JSON.parse(localStorage.getItem('rift-bend-lab/save-v1'))); }
async function capture(name) { await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true }); receipt.captures.push(name); }
async function image() { return page.locator('canvas').evaluate(canvas => canvas.toDataURL()); }
async function square(file, rank, piece = false) {
  const v = await view(), a = v.yaw * Math.PI / 180;
  const s = 45 / (Math.abs(Math.cos(a)) + Math.abs(Math.sin(a))) * v.zoom / 100;
  const u = file - 3.5, r = 7 - rank - 3.5;
  const x = 256 + s * (Math.cos(a) * u - Math.sin(a) * r);
  const y = 274 + s * Math.sin(v.pitch * Math.PI / 180) * (Math.sin(a) * u + Math.cos(a) * r) - (piece ? 8 : 0);
  const b = await page.locator('#board').boundingBox();
  await page.mouse.click(b.x + x * b.width / 512, b.y + y * b.height / 512);
}
try {
  await page.goto(receipt.url, { waitUntil: 'networkidle' }); await ready();
  assert.deepEqual(await view(), { $: 'View', yaw: 0, pitch: 65, zoom: 100 });
  const front = await image(); await capture('01-front-open-gaps');
  await page.locator('#camera-overhead').click(); await ready();
  assert.equal((await view()).pitch, 90); assert.notEqual(await image(), front);
  await capture('02-overhead');
  await square(6, 0, true);
  await page.waitForFunction(() => document.querySelector('#selection').textContent.includes('g1'));
  await square(5, 2); await count(1);
  assert.equal((await record()).commands.length, 1);
  receipt.checks.push('Front default and real top-down rendering; pointer knight g1-f3 in top-down view');

  // Range-key events exercise coalescing while the actual Bend renderer is busy.
  await page.locator('#camera-yaw').focus(); await page.keyboard.press('Home');
  for (let n = 0; n < 180; n++) await page.keyboard.press('ArrowRight');
  await ready(); assert.equal((await view()).yaw, 180);
  await square(6, 7, true);
  await page.waitForFunction(() => document.querySelector('#selection').textContent.includes('g8'));
  await square(5, 5); await count(2);
  assert.equal((await record()).commands.length, 2);
  await capture('03-reversed-board');
  receipt.checks.push('Rapid orbit controls settle on latest angle; pointer knight g8-f6 after 180-degree rotation');

  await page.locator('#camera-front').click(); await ready();
  await square(0, 2);
  await page.waitForFunction(() => document.querySelector('#selection').textContent.toLowerCase().includes('tile'));
  await capture('04-open-shift-target');
  await square(2, 2); await count(3);
  assert((await record()).commands.at(-1).action >= 20480);
  await page.locator('#undo').click(); await count(4);
  receipt.checks.push('An open hole remains a valid Shift destination; Shift and undo preserve the camera');

  await square(5, 2, true);
  await page.waitForFunction(() => document.querySelector('#selection').textContent.includes('f3'));
  await page.evaluate(() => { window.__armClickDelay = true; window.__rotateDuringAnimation = true; window.__renderFrames = []; });
  await square(6, 4);
  await page.locator('#camera-left').click();
  await count(5);
  assert.equal((await record()).commands.at(-1).action, (21 * 64 + 38) * 5);
  assert(await page.evaluate(() => window.__animationRotation));
  const phases = await page.evaluate(action => window.__renderFrames.filter(frame => frame.action === action).map(frame => frame.progress), (21 * 64 + 38) * 5);
  assert(phases.every((phase, i) => i === 0 || phase >= phases[i - 1]), `Animation rewound: ${phases}`);
  receipt.checks.push('Injected pick latency: pending destination click survives camera change; rotation during animation never rewinds progress');

  const beforeDrag = await view(), beforeLedger = await record();
  await page.locator('#board').scrollIntoViewIfNeeded();
  let b = await page.locator('#board').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(b.x + b.width / 2 + 95, b.y + b.height / 2 - 24, { steps: 12 });
  await page.mouse.up({ button: 'right' }); await ready();
  assert.notDeepEqual(await view(), beforeDrag); assert.deepEqual(await record(), beforeLedger);
  const afterDrag = await view();
  await capture('05-oblique-open-gaps');
  await page.reload({ waitUntil: 'networkidle' }); await ready();
  assert.deepEqual(await view(), afterDrag);
  receipt.checks.push('Right-drag orbits without issuing a move; camera persists across reload');

  await page.locator('#camera-reset').click(); await ready();
  await page.locator('#board').scrollIntoViewIfNeeded();
  b = await page.locator('#board').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  const beforeScroll = await view();
  await page.mouse.wheel(0, 90); await page.waitForTimeout(250);
  assert.equal((await view()).zoom, beforeScroll.zoom, 'Hover alone must not hijack page scrolling');
  await page.locator('#board').focus(); await page.mouse.wheel(0, -90); await ready();
  assert((await view()).zoom > beforeScroll.zoom);
  receipt.checks.push('Ordinary page scroll preserved; focused-board wheel zoom works');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#camera-overhead').click(); await ready();
  await page.locator('#camera-pitch').focus(); await page.keyboard.press('Home'); await ready();
  assert.equal((await view()).pitch, 35);
  await capture('06-mobile-camera');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  receipt.checks.push('Mobile presets/sliders fit and render the minimum tilt');
  assert.equal(receipt.errors.length, 0, receipt.errors.join('\n'));
} catch (error) {
  receipt.failure = String(error); process.exitCode = 1; await capture('failure');
} finally {
  await fs.writeFile(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ out, ...receipt }, null, 2)); await browser.close();
}
