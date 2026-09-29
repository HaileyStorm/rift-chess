// Real Chrome install/cache/offline gate for a manifest-bound v2-preview build.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const url = process.env.BEND_GROUND_CANDIDATE_URL;
const directory = process.env.BEND_GROUND_CANDIDATE_DIR;
assert.ok(url && directory, 'Supply trial URL and dist');
const localBuild = fs.readFileSync(path.join(directory, 'build.json'));
const served = await fetch(new URL('build.json', url), { cache: 'no-store' });
assert.equal(served.status, 200);
assert.deepEqual(Buffer.from(await served.arrayBuffer()), localBuild,
  'Served trial build differs from local bytes');
const build = JSON.parse(localBuild.toString('utf8'));
assert.equal(build.v2Preview, true);
const asset = build.preparedGround.asset;
assert.equal(build.files[asset], build.preparedGround.assetSha256);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage(), errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.addInitScript(() => {
  window.__refinements = [];
  window.__shown = null;
  window.addEventListener('rift-bend-sprite-refined', event => window.__refinements.push(event.detail));
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        if (event.data.kind === 'frame' && event.data.image) window.__shown = event.data.presentation;
      });
    }
  };
});
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function canvasPoint(x, y) {
  const box = await page.locator('canvas').boundingBox();
  const size = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
  return { x: box.x + x * box.width / size.width, y: box.y + y * box.height / size.height };
}
async function squarePoint(file, rank, piece = false) {
  const shown = await page.evaluate(() => window.__shown);
  const view = shown.view, yaw = view.yaw * Math.PI / 180;
  const scale = 45 / (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw))) * view.zoom / 100;
  const u = file - 3.5, r = 3.5 - rank;
  const x = 256 + scale * (Math.cos(yaw) * u - Math.sin(yaw) * r);
  const y = 274 + scale * Math.sin(view.pitch * Math.PI / 180) *
    (Math.sin(yaw) * u + Math.cos(yaw) * r) - (piece ? 8 : 0);
  return canvasPoint(shown.plan.board.x + x * shown.plan.scale,
    shown.plan.board.y + y * shown.plan.scale);
}
try {
  const began = performance.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__shown && window.__refinements.length > 0,
    null, { timeout: 60000 });
  const online = await page.locator('canvas').screenshot();
  const onlineMetric = await page.evaluate(() => window.__refinements.at(-1));
  assert.equal(onlineMetric.preparedGroundHit, 1);
  await page.evaluate(() => navigator.serviceWorker.ready);
  const readyMs = performance.now() - began;
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null,
    null, { timeout: 30000 });
  const cached = await page.evaluate(async assetPath => {
    const target = new URL(assetPath, location.href);
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      const response = await cache.match(target);
      if (response) {
        const bytes = await response.arrayBuffer();
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        return { cache: name, bytes: bytes.byteLength,
          sha256: [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('') };
      }
    }
    return null;
  }, asset);
  assert.ok(cached, 'Prepared ground absent from an installed service-worker cache');
  assert.equal(cached.bytes, build.preparedGround.assetBytes);
  assert.equal(cached.sha256, build.preparedGround.assetSha256);
  const storage = await page.evaluate(() => navigator.storage.estimate());

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__shown && window.__refinements.length > 0,
    null, { timeout: 60000 });
  const offlineMetric = await page.evaluate(() => window.__refinements.at(-1));
  assert.equal(offlineMetric.preparedGroundHit, 1,
    'Offline first detail silently fell back instead of loading the cached prepared asset');
  const offline = await page.locator('canvas').screenshot();
  assert.deepEqual(offline, online, 'Offline controlled initial canvas changed');
  const from = await squarePoint(4, 1, true);
  await page.mouse.click(from.x, from.y);
  await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Pawn e2'),
    null, { timeout: 12000 });
  const to = await squarePoint(4, 3);
  await page.mouse.click(to.x, to.y);
  await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Black to move'),
    null, { timeout: 20000 });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, buildVersion: build.version, cache: cached.cache,
    assetSha256: cached.sha256, assetBytes: cached.bytes, swReadyMs: readyMs,
    storage: { usage: storage.usage ?? null, quota: storage.quota ?? null },
    onlineInitialSha256: sha(online), offlineInitialSha256: sha(offline),
    offlinePreparedGroundHit: offlineMetric.preparedGroundHit, offlineMove: 'e2-e4',
    scope: 'One local real-Chrome controlled offline install/reload; not a quota or hosted reliability bound' }));
} finally {
  await context.setOffline(false).catch(() => {});
  await context.close();
  await browser.close();
}
