import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const url = process.env.BEND_TEST_URL || 'http://127.0.0.1:4185/';
const buildPath = path.join(root, '.artifacts/bend2/v2-preview/dist/build.json');
const build = JSON.parse(await fs.readFile(buildPath, 'utf8'));
const expectedBuild = process.env.BEND_EXPECTED_BUILD;
if (expectedBuild && build.version !== expectedBuild) {
  throw new Error(`Served build mismatch: expected ${expectedBuild}, local bundle is ${build.version}`);
}
const run = process.env.BEND_SCENARIO_RUN || new Date().toISOString().replace(/[:.]/g, '-');
const out = path.join(root, '.artifacts/bend2/v2-preview/scenarios', run);
await fs.mkdir(out, { recursive: true });
const extended = process.env.BEND_V2_EXTENDED === '1';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const receipt = {
  schema: 'rift-bend-v2-browser-scenarios/1', at: new Date().toISOString(), url,
  buildVersion: build.version, buildSourceRevision: build.sourceRevision,
  extended, checks: [], captures: [], errors: [], metrics: {}, ok: false,
};

await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__frames = [];
  window.__events = [];
  window.__sounds = [];
  window.__refinements = [];
  window.addEventListener('rift-bend-sprite-refined', event =>
    window.__refinements.push(event.detail));
  window.__audioStarts = 0;
  try {
    const nativeStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      window.__audioStarts++;
      return Reflect.apply(nativeStart, this, args);
    };
  } catch {}
  window.Worker = class extends NativeWorker {
    pending = new Map();
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        const message = event.data;
        if (message.kind === 'fault') window.__fault = message.message;
        if (message.kind !== 'frame') return;
        const request = this.pending.get(message.id);
        for (const effect of message.effects || []) {
          if (effect.$ === 'Sound') {
            const samples = new Float32Array(effect.samples);
            let peak = 0, finite = true;
            for (const sample of samples) {
              finite &&= Number.isFinite(sample);
              peak = Math.max(peak, Math.abs(sample));
            }
            window.__sounds.push({ samples: samples.length, peak, finite, rate: effect.rate });
          }
        }
        window.__reply = { id: message.id, after: message.after, renderMs: message.renderMs };
        if (message.image || message.bitmap) {
          window.__shown = message.presentation;
          window.__frames.push({ id: message.id, after: message.after, renderMs: message.renderMs,
            portMs: message.portMs, pixelMs: message.pixelMs,
            replyMs: request ? performance.now() - request.at : null,
            kinds: request?.kinds || [], dirty: !!(message.image || message.bitmap) });
        }
        this.pending.delete(message.id);
      });
    }
    postMessage(message, ...transfer) {
      if (message.kind === 'events') {
        const events = message.events || [];
        window.__events.push(...events.map(event => ({ ...event })));
        this.pending.set(message.id, { at: performance.now(), kinds: events.map(event => event.$) });
      }
      super.postMessage(message, ...transfer);
    }
  };
});

page.on('pageerror', error => receipt.errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });

async function ready() {
  await page.waitForFunction(() => window.__fault ||
    (document.querySelector('canvas')?.dataset.ready === 'true' &&
      document.querySelector('canvas')?.getAttribute('aria-busy') === 'false' &&
      window.__shown && window.__reply?.after === 0), null, { timeout: 60000 });
  const fault = await page.evaluate(() => window.__fault);
  if (fault) throw new Error(`Bend worker fault: ${fault}`);
}

async function change(action) {
  const previous = await page.evaluate(() => window.__reply?.id || 0);
  await action();
  await page.waitForFunction(previous => window.__reply?.id > previous, previous, { timeout: 60000 });
  await ready();
}

async function capture(name) {
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
  receipt.captures.push(`${name}.png`);
}

async function plateWitness(theme) {
  const name = `observatory-${theme}`;
  if (!build.files?.[`assets/${name}.rga`]) return;
  const source = await fs.readFile(path.join(root, `bend2/assets/runtime/${name}.rga`));
  assert.deepEqual([...source.subarray(0, 5)], [82, 71, 65, 49, 9]);
  const x = 480, y = 280;
  const offset = 5 + (y * 512 + x) * 3;
  const expected = [...source.subarray(offset, offset + 3)];
  const displayed = await page.locator('canvas').evaluate((canvas, point) => {
    const board = window.__shown.plan.board, scale = window.__shown.plan.scale;
    const context = canvas.getContext('2d');
    const pixelX = Math.floor(board.x + point.x * scale);
    const pixelY = Math.floor(board.y + point.y * scale);
    return [...context.getImageData(pixelX, pixelY, 1, 1).data].slice(0, 3);
  }, { x, y });
  assert.deepEqual(displayed, expected, `${theme} Bend plate must reach a visible background pixel`);
}

async function canvasPoint(x, y) {
  const box = await page.locator('canvas').boundingBox();
  const size = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
  return { x: box.x + x * box.width / size.width, y: box.y + y * box.height / size.height };
}

async function squarePoint(file, rank, piece = false) {
  const shown = await page.evaluate(() => window.__shown);
  const view = shown.view, yaw = view.yaw * Math.PI / 180;
  const projection = 45 / (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw))) * view.zoom / 100;
  const u = file - 3.5, r = 3.5 - rank;
  const x = 256 + projection * (Math.cos(yaw) * u - Math.sin(yaw) * r);
  const y = 274 + projection * Math.sin(view.pitch * Math.PI / 180) *
    (Math.sin(yaw) * u + Math.cos(yaw) * r) - (piece ? 8 : 0);
  const board = shown.plan.board, scale = shown.plan.scale;
  return canvasPoint(board.x + x * scale, board.y + y * scale);
}

async function square(file, rank, piece = false) {
  const point = await squarePoint(file, rank, piece);
  await change(() => page.mouse.click(point.x, point.y));
}

async function control(id, settle = true) {
  const button = page.locator(`[data-control="${id}"]`);
  assert.equal(await button.count(), 1, `canonical control ${id} exists`);
  assert.equal(await button.isDisabled(), false, `canonical control ${id} enabled`);
  const rect = JSON.parse(await button.getAttribute('data-rect'));
  const point = await canvasPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
  if (settle) await change(() => page.mouse.click(point.x, point.y));
  else await page.mouse.click(point.x, point.y);
}

async function waitMenu(menu) {
  await page.waitForFunction(menu => window.__shown?.menu === menu, menu, { timeout: 15000 });
  await ready();
}

async function getRecord() {
  return page.evaluate(() => JSON.parse(localStorage.getItem('rift-bend-lab/save-v1') || 'null'));
}

async function commandCount(count) {
  await page.waitForFunction(count => JSON.parse(localStorage.getItem('rift-bend-lab/save-v1') || '{}').commands?.length === count,
    count, { timeout: 60000 });
  await ready();
}

async function upload(value) {
  if (await page.evaluate(() => window.__shown.menu) !== 2) {
    await control(1);
    await waitMenu(2);
  }
  const chooser = page.waitForEvent('filechooser');
  await control(21, false);
  const file = await chooser;
  const before = await page.evaluate(() => window.__reply.id);
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  await file.setFiles({ name: 'v2-scenario.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.waitForFunction(before => window.__reply?.id > before, before, { timeout: 60000 });
  await ready();
}

async function freshMatch() {
  await control(2);
  await waitMenu(1);
  await control(29);
  await commandCount(0);
}

const fixtureIds = [2680, 15845, 7845, 18440, 10765, 17835, 13365, 15235];
const fixtureRecord = count => ({ schema: 'rift-bend-record/1', layout: 'B', policy: 0,
  commands: fixtureIds.slice(0, count).map((action, expected) => ({ $: 'MoveCommand', expected, action })) });

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await ready();
  const desktop = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height,
    aria: canvas.getAttribute('aria-label'), scale: window.__shown?.plan?.scale,
    board: window.__shown?.plan?.board }));
  assert.deepEqual([desktop.width, desktop.height], [1024, 640]);
  assert.ok(desktop.board?.width > 0 && desktop.board?.height > 0 && desktop.scale > 0);
  await capture('01-desktop-initial');
  await plateWitness('astral');
  receipt.metrics.desktop = desktop;

  // A visible piece can be selected and toggled off by clicking it again.
  await square(6, 0, true);
  assert.match(await page.locator('canvas').getAttribute('aria-label'), /Knight g1/);
  assert.equal(await page.locator('[data-control="4"]').count(), 0,
    'compact play controls do not retain the old Move button');
  await capture('02-selected-knight');
  await square(6, 0, true);
  assert.doesNotMatch(await page.locator('canvas').getAttribute('aria-label'), /Knight g1/);
  assert.equal(await page.locator('[data-control="4"]').count(), 0);
  receipt.checks.push('Rendered click selects g1 knight and second click deselects it');

  // Play a legal move with both colors through the actual presented board.
  await square(4, 1, true);
  assert.match(await page.locator('canvas').getAttribute('aria-label'), /Pawn e2/);
  await square(4, 3);
  await commandCount(1);
  assert.match(await page.locator('canvas').getAttribute('aria-label'), /Black to move/);
  await square(4, 6, true);
  await square(4, 4);
  await commandCount(2);
  assert.match(await page.locator('canvas').getAttribute('aria-label'), /White to move/);
  await capture('03-both-sides-e4-e5');
  receipt.checks.push('White e2-e4 and Black e7-e5 commit from canvas input and persist');

  // Undo is a consent flow in hotseat. Closing its prompt preserves the record;
  // the other player can then explicitly agree to the request.
  const beforeUndo = await getRecord();
  await control(3);
  await waitMenu(8);
  assert.deepEqual(await getRecord(), beforeUndo);
  await capture('04-undo-consent');
  await control(28);
  await waitMenu(0);
  assert.deepEqual(await getRecord(), beforeUndo);
  await control(3);
  await waitMenu(8);
  await control(48);
  await commandCount(3);
  assert.equal((await getRecord()).commands.at(-1).$,'UndoCommand');
  const afterUndo = await getRecord();
  receipt.checks.push('Undo prompt cancellation is inert; explicit agreement appends UndoCommand');

  // Settings, Help and New Match are navigable through the same canonical hit
  // rectangles exposed to assistive technology.
  await control(1);
  await waitMenu(2);
  await capture('05-settings');
  if (extended) {
    // The game chooses and decodes a separate Bend plate for each theme. Keep
    // this as rendered evidence, including a selected piece on the warm court.
    const beforeWarm = await page.evaluate(() => window.__refinements.length);
    await control(23);
    await control(28);
    await waitMenu(0);
    await page.waitForFunction(before => window.__refinements.length > before,
      beforeWarm, { timeout: 60000 });
    await capture('05b-warm-court');
    await plateWitness('stone');
    await square(6, 7, true);
    assert.match(await page.locator('canvas').getAttribute('aria-label'), /Knight g8/);
    await capture('05c-warm-selected');
    await square(6, 7, true);
    await control(1);
    await waitMenu(2);
    const beforeAstral = await page.evaluate(() => window.__refinements.length);
    await control(22);
    await capture('05d-astral-restored-settings');
    await control(28);
    await waitMenu(0);
    await page.waitForFunction(before => window.__refinements.length > before,
      beforeAstral, { timeout: 60000 });
    await plateWitness('astral');
    await control(1);
    await waitMenu(2);
    receipt.checks.push('Both themes render through the Bend scene and selection remains interactive after switching');
  }
  const soundBefore = await page.locator('[data-control="24"]').getAttribute('aria-pressed');
  await control(24);
  const soundAfter = await page.locator('[data-control="24"]').getAttribute('aria-pressed');
  assert.notEqual(soundAfter, soundBefore);
  const savedPrefs = await page.evaluate(() => localStorage.getItem('rift-bend-lab/preferences-v1'));
  await control(28);
  await control(27);
  await waitMenu(3);
  await capture('06-help');
  await control(28);
  await waitMenu(0);
  await control(2);
  await waitMenu(1);
  await capture('07-new-match-prompt');
  await control(28);
  await waitMenu(0);
  assert.deepEqual(await getRecord(), afterUndo, 'canceling New Match preserves the active match');
  await page.reload({ waitUntil: 'networkidle' });
  await ready();
  assert.deepEqual(await getRecord(), afterUndo, 'saved command history survives page reload');
  assert.equal(await page.evaluate(() => localStorage.getItem('rift-bend-lab/preferences-v1')), savedPrefs,
    'settings preference survives page reload');
  await control(1);
  await waitMenu(2);
  assert.equal(await page.locator('[data-control="24"]').getAttribute('aria-pressed'), soundAfter);
  await control(28);
  await waitMenu(0);
  if (extended && soundAfter !== soundBefore) {
    await control(1);
    await waitMenu(2);
    await control(24);
    assert.equal(await page.locator('[data-control="24"]').getAttribute('aria-pressed'), soundBefore,
      'restore the initial sound preference before sound scenarios');
    await control(28);
    await waitMenu(0);
  }
  receipt.checks.push('Settings, Help and New Match prompts respond; match and preference survive reload');

  if (extended) {
    // Import a short reference sequence whose final move captures, then verify
    // the promoted-piece chooser by replaying the exact canonical path.
    await freshMatch();
    await upload(fixtureRecord(2));
    await commandCount(2);
    await square(0, 3, true);
    await square(1, 4);
    await commandCount(3);
    assert.equal((await getRecord()).commands.at(-1).action, 7845);
    await capture('08-capture');
    receipt.checks.push('File chooser imports a legal record and a rendered move captures');

    await freshMatch();
    await upload(fixtureRecord(8));
    await commandCount(8);
    await square(1, 6, true);
    await square(1, 7);
    await waitMenu(4);
    await capture('09-promotion-choice');
    await control(41);
    await commandCount(9);
    assert.equal((await getRecord()).commands.at(-1).action, 15969);
    receipt.checks.push('Imported record reaches promotion and explicit knight underpromotion');

    const audio = await page.evaluate(() => ({ sounds: window.__sounds, starts: window.__audioStarts }));
    assert.ok(audio.sounds.some(sound => sound.samples > 0 && sound.finite && sound.peak > 0 && sound.peak <= 1));
    receipt.metrics.audio = audio;
    receipt.checks.push('A move emits finite, bounded Bend PCM through browser audio');

    await freshMatch();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload({ waitUntil: 'networkidle' });
    await ready();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30000 });
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready();
    assert.ok(Object.keys(build.files).some(name => /^sprite-helper-[a-z0-9]+\.js$/.test(name)));
    for (let index = 0; index < 3; index++)
      assert.ok(build.files[`assets/pieces-fast-${index}.rga`]);
    await page.waitForFunction(() => Number(document.querySelector('canvas')?.dataset.spriteRoundTripMs) > 0,
      null, { timeout: 60000 });
    await square(4, 1, true);
    await square(4, 3);
    await commandCount(1);
    await capture('10-offline-move');
    await context.setOffline(false);
    receipt.checks.push('Service-worker-controlled page reloads offline, refines ornate pieces with a module helper, and accepts a real move');
  }

  // Exercise legal topology Shift from an initially empty platform source.
  await context.setOffline(false);
  await freshMatch();
  await square(0, 2);
  const shift = await page.locator('[data-control]').evaluateAll(nodes => nodes
    .filter(node => Number(node.dataset.control) >= 21480 && !node.disabled)
    .map(node => ({ id: Number(node.dataset.control), label: node.textContent })));
  assert.ok(shift.length, 'an empty shiftable platform presents legal Shift destinations');
  await control(shift[0].id);
  await commandCount(1);
  assert.ok((await getRecord()).commands[0].action >= 20480, 'committed action encodes Shift');
  await capture('11-shift');
  receipt.checks.push('Rendered empty-platform Shift changes topology and persists');

  // Responsive portrait view keeps the board and controls inside the 512x1024
  // logical presentation and accepts a Black selection toggle.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('canvas')?.width === 512 &&
    document.querySelector('canvas')?.height === 1024 &&
    document.querySelector('canvas')?.getAttribute('aria-busy') === 'false', null, { timeout: 60000 });
  await ready();
  await capture('12-portrait');
  const portrait = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width,
    height: canvas.height, board: window.__shown?.plan?.board,
    scale: window.__shown?.plan?.scale, menu: window.__shown?.menu }));
  assert.deepEqual([portrait.width, portrait.height], [512, 1024]);
  await control(1);
  await waitMenu(2);
  await capture('13-portrait-settings');
  assert.ok((await page.locator('#accessibility button').allTextContents()).some(label => label.toLowerCase() === 'close'));
  await control(28);
  await waitMenu(0);
  await square(6, 7, true);
  assert.match(await page.locator('canvas').getAttribute('aria-label'), /Knight g8/);
  await square(6, 7, true);
  assert.doesNotMatch(await page.locator('canvas').getAttribute('aria-label'), /Knight g8/);
  receipt.metrics.portrait = portrait;
  receipt.checks.push('Portrait layout exposes board/settings controls and Black selection toggles off');

  assert.deepEqual(receipt.errors, []);
  receipt.ok = true;
} catch (error) {
  receipt.failure = String(error.stack || error);
  try { await capture('FAIL'); } catch (captureError) { receipt.captureFailure = String(captureError); }
  throw error;
} finally {
  receipt.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ out, ...receipt }, null, 2));
  await context.close();
  await browser.close();
}
