import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// A saved record made by build 8106 before the whole-application release. The
// exact bytes are fixture input; seeding them tests record compatibility, not
// migration of an old service-worker cache.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, '.artifacts/bend2/returning-save',
  new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-'));
await fs.mkdir(dir, { recursive: true });
const fixture = new URL('./fixtures/record-8106.json', import.meta.url);
const before = { build: '8106a3f0fed5f9274f95', saved: (await fs.readFile(fixture, 'utf8')).trimEnd() };
const old = JSON.parse(before.saved);
if (before.build !== '8106a3f0fed5f9274f95' || old.commands.length !== 3) throw new Error('Historical save input changed');
const context = await chromium.launchPersistentContext(path.join(dir, 'profile'), {
  channel: 'chrome', headless: true, viewport: { width: 1280, height: 1050 },
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => {
  const Native = Worker;
  window.Worker = class extends Native {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        if (event.data.kind === 'frame' && event.data.image) window.__shown = event.data.presentation;
        if (event.data.kind === 'fault') window.__fault = event.data.message;
      });
    }
  };
});
const saved = () => page.evaluate(() => localStorage.getItem('rift-bend-lab/save-v1'));
async function ready(revision) {
  await page.waitForFunction(n => window.__fault ||
    (window.__shown?.revision === n && !document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Validating record')),
  revision, { timeout: 90000 });
  if (await page.evaluate(() => window.__fault)) throw new Error('Worker fault');
}
async function control(id) {
  const button = page.locator(`[data-control="${id}"]`);
  if (await button.isDisabled()) throw new Error(`Control ${id} disabled`);
  const r = JSON.parse(await button.getAttribute('data-rect'));
  const box = await page.locator('canvas').boundingBox();
  const size = await page.locator('canvas').evaluate(c => ({ width: c.width, height: c.height }));
  await page.mouse.click(box.x + (r.x + r.width / 2) * box.width / size.width,
    box.y + (r.y + r.height / 2) * box.height / size.height);
}
const checks = [];
try {
  const url = process.env.BEND_TEST_URL || 'https://haileystorm.github.io/rift-chess-bend2/';
  await page.goto(url, { waitUntil: 'networkidle' });
  const build = await page.evaluate(async () => await (await fetch(`./build.json?returning=${Date.now()}`)).json());
  const expected = JSON.parse(await fs.readFile(path.join(root, 'bend2/dist/build.json'), 'utf8'));
  if (build.version !== expected.version || build.draft || build.sourceDirty) throw new Error(`Unexpected hosted build ${build.version}`);
  await page.evaluate(text => localStorage.setItem('rift-bend-lab/save-v1', text), before.saved);
  await page.reload({ waitUntil: 'networkidle' });
  await ready(3);
  if (await saved() !== before.saved) throw new Error('Historical record bytes changed during boot');
  checks.push('Exact three-command record from build 8106 survives new hosted boot and replay');
  await control(3);
  await page.waitForFunction(() => window.__shown?.menu === 8);
  await control(48);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('rift-bend-lab/save-v1')).commands.length === 4);
  await ready(4);
  const restored = await saved();
  if (JSON.parse(restored).commands.at(-1).$ !== 'UndoCommand') throw new Error('Undo was not accepted');
  checks.push('Real canvas Undo and other-player consent append one accepted command');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await ready(4);
  if (await saved() !== restored) throw new Error('Cold offline reload changed accepted record');
  checks.push('Cold offline reload retains the historical record and accepted Undo');
  await page.screenshot({ path: path.join(dir, 'after-offline.png') });
  if (errors.length) throw new Error(`Browser page errors: ${errors.join(' | ')}`);
  const receipt = { schema: 'rift-bend-returning-save/1', at: new Date().toISOString(),
    evidenceClass: 'Historical saved bytes seeded into an isolated current-browser profile; not an old service-worker upgrade',
    url, beforeVersion: before.build,
    afterVersion: build.version, oldRecordSha256: crypto.createHash('sha256').update(before.saved).digest('hex'),
    fixtureSha256: crypto.createHash('sha256').update(await fs.readFile(fixture)).digest('hex'),
    oldCommands: old.commands.length, checks, errors };
  await fs.writeFile(path.join(dir, 'receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify({ ok: true, checks, receipt: path.join(dir, 'receipt.json') }));
} finally {
  await context.close();
}
