// Paired first-visit Chrome timing with real SW installs; diagnostic samples.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const targets = [
  ['baseline', process.env.BEND_GROUND_BASELINE_URL, process.env.BEND_GROUND_BASELINE_DIR],
  ['candidate', process.env.BEND_GROUND_CANDIDATE_URL, process.env.BEND_GROUND_CANDIDATE_DIR],
];
assert.ok(targets.every(([, url, directory]) => url && directory),
  'Supply baseline/trial URLs and local build directories');
const heapMb = process.env.BEND_CHROME_HEAP_MB ? Number(process.env.BEND_CHROME_HEAP_MB) : null;
assert.ok(heapMb === null || (Number.isInteger(heapMb) && heapMb >= 128 && heapMb <= 1024));
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  ...(heapMb ? { args: [`--js-flags=--max-old-space-size=${heapMb}`] } : {}) });
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function firstVisit(label, url, directory) {
  const local = fs.readFileSync(path.join(directory, 'build.json'));
  const served = await fetch(new URL('build.json', url), { cache: 'no-store' });
  assert.equal(served.status, 200);
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), local);
  const build = JSON.parse(local);
  const groundRequests = [];
  const countRequests = process.env.BEND_GROUND_COUNT_REQUESTS === '1';
  const proxy = countRequests ? http.createServer((request, response) => {
    const target = new URL(request.url, url);
    const upstream = http.request(target, { method: request.method,
      headers: { ...request.headers, host: target.host } }, incoming => {
      response.writeHead(incoming.statusCode, incoming.headers);
      const isGround = target.pathname ===
        new URL(build.preparedGround?.asset ?? '/not-prepared', url).pathname;
      const record = isGround ? { status: incoming.statusCode, bytes: 0 } : null;
      if (record) groundRequests.push(record);
      incoming.on('data', chunk => { if (record) record.bytes += chunk.byteLength; });
      incoming.pipe(response);
    });
    upstream.on('error', error => { response.writeHead(502); response.end(String(error)); });
    request.pipe(upstream);
  }) : null;
  if (proxy) await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  const visitUrl = proxy ? new URL(url).origin.replace(new URL(url).host,
    `127.0.0.1:${proxy.address().port}`) + new URL(url).pathname : url;
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    window.__refinements = [];
    window.addEventListener('rift-bend-sprite-refined', event =>
      window.__refinements.push(event.detail));
  });
  try {
    const began = performance.now();
    await page.goto(visitUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__refinements.length > 0,
      null, { timeout: countRequests ? 20000 : 60000 });
    const detailedMs = performance.now() - began;
    const requestsAtDetail = groundRequests.length;
    const firstMetric = await page.evaluate(() => window.__refinements[0]);
    const canvas = await page.locator('canvas').screenshot();
    await page.evaluate(() => navigator.serviceWorker.ready);
    const swReadyMs = performance.now() - began;
    const storage = await page.evaluate(() => navigator.storage.estimate());
    assert.deepEqual(errors, [], `${label} first-visit errors`);
    return { buildVersion: build.version, buildSha256: sha(local),
      detailedMs, swReadyMs, roundTripMs: firstMetric.roundTripMs,
      phases: { fetchMs: firstMetric.fetchMs, decodeMs: firstMetric.decodeMs,
        groundMs: firstMetric.groundMs, spritesMs: firstMetric.spritesMs,
        workerMs: firstMetric.workerMs,
        dispatchToStartMs: firstMetric.dispatchToStartMs,
        sendToAcceptanceMs: firstMetric.sendToAcceptanceMs,
        quietWindowMs: firstMetric.quietWindowMs },
      preparedGroundHit: firstMetric.preparedGroundHit ?? 0,
      canvasSha256: sha(canvas), usage: storage.usage ?? null, quota: storage.quota ?? null,
      ...(proxy ? { groundRequests: { atDetail: requestsAtDetail,
        atServiceWorkerReady: groundRequests.length, responses: groundRequests } } : {}) };
  } catch (error) {
    console.error(JSON.stringify({ label, visitUrl, errors, groundRequests,
      failure: String(error) }));
    throw error;
  } finally {
    await context.close();
    if (proxy) await new Promise((resolve, reject) => proxy.close(error => error ? reject(error) : resolve()));
  }
}
try {
  const reversed = process.env.BEND_GROUND_REVERSE === '1';
  const results = {};
  for (const [label, url, directory] of (reversed ? [...targets].reverse() : targets))
    results[label] = await firstVisit(label, url, directory);
  assert.equal(results.baseline.canvasSha256, results.candidate.canvasSha256);
  assert.equal(results.candidate.preparedGroundHit, 1);
  console.log(JSON.stringify({ ok: true, reversed, heapMb, ...results,
    scope: 'One same-host Chrome cold context per build with SW enabled; variable-load timing, not a quota/reliability bound; optional counting proxy adds a local hop' }));
} finally { await browser.close(); }
