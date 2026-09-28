// Paired real-Chrome pixels for the immutable settled-ground cache draft.
// Supply two locally served, separately manifest-bound v2-preview directories.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const oldUrl = process.env.BEND_GROUND_BASELINE_URL;
const newUrl = process.env.BEND_GROUND_CANDIDATE_URL;
const oldDir = process.env.BEND_GROUND_BASELINE_DIR;
const newDir = process.env.BEND_GROUND_CANDIDATE_DIR;
for (const value of [oldUrl, newUrl, oldDir, newDir]) assert.ok(value, 'Supply both URLs and local build directories');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const output = fs.mkdtempSync(path.join(root, '.artifacts/bend2/ground-cache-parity-'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function canvasPoint(page, x, y) {
  const box = await page.locator('canvas').boundingBox();
  const size = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
  return { x: box.x + x * box.width / size.width, y: box.y + y * box.height / size.height };
}
async function squarePoint(page, file, rank, piece = false) {
  const shown = await page.evaluate(() => window.__shown);
  const view = shown.view, yaw = view.yaw * Math.PI / 180;
  const scale = 45 / (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw))) * view.zoom / 100;
  const u = file - 3.5, r = 3.5 - rank;
  const x = 256 + scale * (Math.cos(yaw) * u - Math.sin(yaw) * r);
  const y = 274 + scale * Math.sin(view.pitch * Math.PI / 180) *
    (Math.sin(yaw) * u + Math.cos(yaw) * r) - (piece ? 8 : 0);
  return canvasPoint(page, shown.plan.board.x + x * shown.plan.scale,
    shown.plan.board.y + y * shown.plan.scale);
}
async function control(page, id) {
  const rect = await page.locator(`[data-control="${id}"]`).evaluate(button => JSON.parse(button.dataset.rect));
  const point = await canvasPoint(page, rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.click(point.x, point.y);
}
async function sample(label, url, directory) {
  const local = fs.readFileSync(path.join(directory, 'build.json'));
  const response = await fetch(new URL('build.json', url), { cache: 'no-store' });
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), local,
    `${label} served build differs from its local manifest`);
  const build = JSON.parse(local);
  assert.equal(build.schema, 'rift-bend-browser/2');
  assert.equal(build.v2Preview, true);
  let assetsVerified = 0;
  for (const [file, expected] of Object.entries(build.files)) {
    assert.match(file, /^[A-Za-z0-9._/-]+$/);
    assert.ok(file.split('/').every(part => part && part !== '.' && part !== '..'));
    const target = new URL(file, url);
    assert.equal(target.origin, new URL(url).origin);
    assert.ok(target.pathname.startsWith(new URL(url).pathname));
    assert.equal(sha(fs.readFileSync(path.join(directory, ...file.split('/')))), expected,
      `${label} local asset changed: ${file}`);
    const served = await fetch(target, { cache: 'no-store' });
    assert.equal(served.status, 200, `${label} asset unavailable: ${file}`);
    assert.equal(sha(Buffer.from(await served.arrayBuffer())), expected,
      `${label} served asset differs: ${file}`);
    assetsVerified++;
  }
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    window.__shown = null;
    window.__refinements = [];
    window.addEventListener('rift-bend-sprite-refined', event =>
      window.__refinements.push(event.detail));
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
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__shown && window.__refinements.length > 0,
      null, { timeout: 60000 });
    const initialMetrics = await page.evaluate(() => window.__refinements.at(-1));
    const initial = await page.locator('canvas').screenshot({ path: path.join(output, `${label}-start.png`) });
    const before = await page.evaluate(() => window.__refinements.length);
    const from = await squarePoint(page, 4, 1, true);
    await page.mouse.click(from.x, from.y);
    await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Pawn e2'),
      null, { timeout: 12000 });
    const to = await squarePoint(page, 4, 3);
    await page.mouse.click(to.x, to.y);
    await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Black to move'),
      null, { timeout: 20000 });
    await page.waitForFunction(previous => window.__refinements.length > previous,
      before, { timeout: 60000 });
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(() => window.__refinements.at(-1));
    const moved = await page.locator('canvas').screenshot({ path: path.join(output, `${label}-e4.png`) });
    const beforeView = await page.evaluate(() => window.__refinements.length);
    await control(page, 56);
    await page.locator('[data-control="11"]').waitFor();
    await control(page, 11);
    await page.waitForFunction(() => window.__shown?.view?.yaw === 0 && window.__shown?.view?.pitch === 65,
      null, { timeout: 12000 });
    await page.waitForFunction(previous => window.__refinements.length > previous,
      beforeView, { timeout: 60000 });
    await page.waitForTimeout(500);
    const viewMetrics = await page.evaluate(() => window.__refinements.at(-1));
    const front = await page.locator('canvas').screenshot({ path: path.join(output, `${label}-front.png`) });
    assert.deepEqual(errors, [], `${label} browser errors`);
    return { buildVersion: build.version, buildSha256: sha(local), sourceRevision: build.sourceRevision,
      assetsVerified,
      initialSha256: sha(initial), movedSha256: sha(moved), frontSha256: sha(front),
      initialMetrics, metrics, viewMetrics,
      initial, moved, front };
  } finally { await context.close(); }
}

try {
  const reversed = process.env.BEND_GROUND_REVERSE === '1';
  const results = {};
  for (const [label, url, directory] of (reversed
    ? [['candidate', newUrl, newDir], ['baseline', oldUrl, oldDir]]
    : [['baseline', oldUrl, oldDir], ['candidate', newUrl, newDir]]))
    results[label] = await sample(label, url, directory);
  const before = results.baseline, after = results.candidate;
  assert.notEqual(before.buildVersion, after.buildVersion, 'Compare two distinct built source sets');
  if (process.env.BEND_ALLOW_BASELINE_CACHE === '1')
    assert.equal(before.metrics.groundCacheHit, 1, 'Cached baseline did not reuse ground');
  else assert.equal(before.metrics.groundCacheHit, undefined,
    'Baseline must be the uncached helper, not another candidate build');
  assert.deepEqual(after.initial, before.initial, 'First detailed canvas changed');
  assert.deepEqual(after.moved, before.moved, 'Same-view e2e4 detailed canvas changed');
  assert.deepEqual(after.front, before.front, 'Front-view detailed canvas changed');
  assert.equal(after.metrics.groundCacheHit, 1, 'Bend-approved same-ground move did not reuse ground');
  assert.equal(after.viewMetrics.groundCacheHit, 0, 'Changed camera reused stale ground');
  console.log(JSON.stringify({ ok: true, output: path.relative(root, output), reversed,
    baseline: { version: before.buildVersion, sourceRevision: before.sourceRevision,
      assetsVerified: before.assetsVerified,
      buildSha256: before.buildSha256, groundMs: before.metrics.groundMs,
      spritesMs: before.metrics.spritesMs,
      workerMs: before.metrics.workerMs, roundTripMs: before.metrics.roundTripMs,
      initialSpritesMs: before.initialMetrics.spritesMs,
      frontSpritesMs: before.viewMetrics.spritesMs },
    candidate: { version: after.buildVersion, sourceRevision: after.sourceRevision,
      assetsVerified: after.assetsVerified,
      buildSha256: after.buildSha256, groundMs: after.metrics.groundMs,
      spritesMs: after.metrics.spritesMs,
      workerMs: after.metrics.workerMs, roundTripMs: after.metrics.roundTripMs,
      initialSpritesMs: after.initialMetrics.spritesMs,
      frontSpritesMs: after.viewMetrics.spritesMs,
      groundCacheHit: after.metrics.groundCacheHit,
      changedViewGroundCacheHit: after.viewMetrics.groundCacheHit },
    initialSha256: after.initialSha256, movedSha256: after.movedSha256,
    frontSha256: after.frontSha256, exactInitial: true, exactMoved: true, exactFront: true }));
} finally { await browser.close(); }
