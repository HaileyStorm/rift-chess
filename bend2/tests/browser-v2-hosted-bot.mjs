// Real hosted module-worker gate: play a bot turn, then repeat cold offline.
// Use BEND_TEST_URL to point at a source-bound static deployment.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.env.BEND_TEST_URL || 'https://haileystorm.github.io/rift-chess-bend2/';
const expected = process.env.BEND_EXPECTED_BUILD;
const build = await (await fetch(new URL('build.json', url), { cache: 'no-store' })).json();
assert.equal(build.draft, false);
assert.equal(build.sourceDirty, false);
if (expected) assert.equal(build.version, expected);
assert.equal(build.workerLibraries.bot.backend, 'bend-web-workers-2');
assert.equal(build.workerLibraries.bot.mode, 'required-only');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const errors = [], modules = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', response => {
  if (response.url().includes('/worker-libs/bot/')) modules.push({
    path: new URL(response.url()).pathname, status: response.status(),
    type: response.headers()['content-type'] || '',
    fromServiceWorker: response.fromServiceWorker(),
  });
});
await page.addInitScript(() => {
  const Original = window.Worker;
  window.Worker = class extends Original {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        const value = event.data;
        if (value.kind === 'fault') window.__fault = value.message;
        if (value.kind === 'frame') {
          window.__replyId = value.id;
          if (value.image || value.bitmap) window.__shown = value.presentation;
        }
      });
    }
  };
});

async function ready() {
  await page.waitForFunction(() => window.__fault ||
    (window.__shown && document.querySelector('canvas')?.dataset.ready === 'true' &&
     document.querySelector('canvas')?.getAttribute('aria-busy') === 'false'),
  null, { timeout: 60000 });
  const fault = await page.evaluate(() => window.__fault);
  if (fault) throw new Error(`Bend worker fault: ${fault}`);
}

async function logicalClick(x, y) {
  const before = await page.evaluate(() => window.__replyId || 0);
  const point = await page.locator('canvas').evaluate((canvas, { x, y }) => {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + x * rect.width / canvas.width,
      y: rect.top + y * rect.height / canvas.height };
  }, { x, y });
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(before => window.__replyId > before || window.__fault,
    before, { timeout: 60000 });
  await ready();
}

async function control(id) {
  const button = page.locator(`[data-control="${id}"]`);
  await button.waitFor({ timeout: 15000 });
  assert.equal(await button.isDisabled(), false, `control ${id} enabled`);
  const rect = JSON.parse(await button.getAttribute('data-rect'));
  await logicalClick(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await ready();
}

async function square(file, rank, piece = false) {
  const point = await page.evaluate(({ file, rank, piece }) => {
    const shown = window.__shown;
    const yaw = shown.view.yaw * Math.PI / 180;
    const projection = 45 / (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw))) * shown.view.zoom / 100;
    const u = file - 3.5, r = 3.5 - rank;
    return {
      x: shown.plan.board.x + (256 + projection * (Math.cos(yaw) * u - Math.sin(yaw) * r)) * shown.plan.scale,
      y: shown.plan.board.y + (274 + projection * Math.sin(shown.view.pitch * Math.PI / 180) *
        (Math.sin(yaw) * u + Math.cos(yaw) * r) - (piece ? 8 : 0)) * shown.plan.scale,
    };
  }, { file, rank, piece });
  await logicalClick(point.x, point.y);
}

async function commandCount(count) {
  await page.waitForFunction(count => {
    const record = JSON.parse(localStorage.getItem('rift-bend-lab/save-v1') || 'null');
    return record?.commands?.length === count || window.__fault;
  }, count, { timeout: 60000 });
  const fault = await page.evaluate(() => window.__fault);
  if (fault) throw new Error(`Bend worker fault: ${fault}`);
}

async function botTurn() {
  await control(2); // New Match
  await control(31); // Human White / local Black opponent
  await control(29); // Start
  await commandCount(0);
  await square(4, 1, true); // e2 pawn body
  await square(4, 3); // e4
  await commandCount(1);
  await commandCount(2); // Bend worker chose and applied Black's reply
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('rift-bend-lab/save-v1')));
  assert.equal(record.commands.length, 2);
  assert.equal(record.commands[0].$, 'MoveCommand');
  assert.equal(record.commands[1].$, 'MoveCommand');
  return record.commands.map(command => command.action);
}

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await ready();
  const online = await botTurn();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30000 });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready();
  const offline = await botTurn();
  assert.deepEqual(errors, []);
  const unique = new Map(modules.map(entry => [entry.path, entry]));
  assert.ok(unique.size >= 4, `expected module worker graph, saw ${unique.size} bot modules`);
  for (const entry of unique.values()) {
    assert.equal(entry.status, 200, `${entry.path} loads`);
    assert.match(entry.type, /javascript/i, `${entry.path} has module MIME`);
  }
  console.log(JSON.stringify({ ok: true, url, version: build.version,
    online, offline, moduleResponses: modules, errors }));
} catch (error) {
  const diagnostic = await page.evaluate(() => ({ fault: window.__fault,
    aria: document.querySelector('canvas')?.getAttribute('aria-label'),
    record: localStorage.getItem('rift-bend-lab/save-v1'),
    menu: window.__shown?.menu, replyId: window.__replyId })).catch(() => ({}));
  console.error(JSON.stringify({ diagnostic, modules, errors }));
  throw error;
} finally {
  await context.close();
  await browser.close();
}
