// Real-Chrome malformed prepared-resource fallback, not a hosted acceptance.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baselineUrl = process.env.BEND_GROUND_BASELINE_URL;
const trialUrl = process.env.BEND_GROUND_CANDIDATE_URL;
const baselineDir = process.env.BEND_GROUND_BASELINE_DIR;
const trialDir = process.env.BEND_GROUND_CANDIDATE_DIR;
assert.ok(baselineUrl && trialUrl && baselineDir && trialDir,
  'Supply baseline/trial URLs and both local build directories');
for (const [servedUrl, localDir] of [[baselineUrl, baselineDir], [trialUrl, trialDir]]) {
  const response = await fetch(new URL('build.json', servedUrl), { cache: 'no-store' });
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),
    fs.readFileSync(path.join(localDir, 'build.json')), 'Served build differs from local bytes');
}
const build = JSON.parse(fs.readFileSync(path.join(trialDir, 'build.json'), 'utf8'));
assert.equal(build.v2Preview, true);
assert.equal(build.preparedGround.assetSha256,
  build.files[build.preparedGround.asset]);
const original = fs.readFileSync(path.join(trialDir, build.preparedGround.asset));
assert.equal(crypto.createHash('sha256').update(original).digest('hex'), build.preparedGround.assetSha256);
const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function capture(url, mode = '') {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 },
    serviceWorkers: 'block' });
  let intercepted = 0;
  if (mode) await context.route('**/assets/ground-initial-*.json', async route => {
    intercepted++;
    if (mode === 'missing') await route.fulfill({ status: 404, body: 'Not found' });
    else {
      const tampered = Buffer.from(original);
      tampered[tampered.length - 1] ^= 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: tampered });
    }
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    window.__refinements = [];
    window.addEventListener('rift-bend-sprite-refined', event =>
      window.__refinements.push(event.detail));
  });
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__refinements.length > 0, null, { timeout: 60000 });
    const metrics = await page.evaluate(() => window.__refinements[0]);
    const png = await page.locator('canvas').screenshot();
    assert.deepEqual(errors, [], `${mode || 'baseline'} browser errors`);
    return { metrics, png, intercepted };
  } finally { await context.close(); }
}

try {
  const baseline = await capture(baselineUrl);
  const results = [];
  for (const mode of ['missing', 'tampered']) {
    const result = await capture(trialUrl, mode);
    assert.ok(result.intercepted >= 1, `${mode} did not intercept the prepared fetch`);
    assert.equal(result.metrics.preparedGroundHit, 0, `${mode} used unverified prepared pixels`);
    assert.deepEqual(result.png, baseline.png, `${mode} fallback changed the initial canvas`);
    results.push({ mode, intercepted: result.intercepted, groundMs: result.metrics.groundMs,
      preparedGroundHit: result.metrics.preparedGroundHit });
  }
  console.log(JSON.stringify({ ok: true, buildVersion: build.version,
    initialSha256: crypto.createHash('sha256').update(baseline.png).digest('hex'), results,
    scope: 'Local real-Chrome 404/SHA-mismatch prepared asset fallback; service workers blocked' }));
} finally { await browser.close(); }
