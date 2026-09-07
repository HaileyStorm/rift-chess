import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = path.resolve('.artifacts/overhaul', process.env.RIFT_TEST_RUN || 'piece-inspection'); await fs.mkdir(root, { recursive: true });
const receipt = { started: new Date().toISOString(), purpose: 'actual isolated asset contact sheets; capture completion is not visual approval', sheets: [], errors: [] };
const sourceHash = async () => createHash('sha256').update(await fs.readFile('src/render/pieces.ts')).digest('hex');
receipt.pieceSourceSha256 = await sourceHash();
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const page = await browser.newPage({ viewport: { width: 1800, height: 730 }, serviceWorkers: 'block' });
page.on('pageerror', error => receipt.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text() + ' ' + message.location().url); });
try {
  await page.goto(process.env.RIFT_INSPECTION_URL || 'http://127.0.0.1:5173/scripts/inspection/index.html'); await page.waitForFunction(() => Boolean(window.inspectPieces));
  const configurations = [];
  for (const family of ['classic', 'faceted']) for (const view of ['front', 'side', 'three-quarter', 'top']) {
    for (const material of ['ceramic', 'metal', 'wood']) configurations.push({ family, view, material, diagnostic: 'material', shadows: true, zoom: 1 });
    for (const diagnostic of ['neutral', 'normal', 'depth', 'wireframe']) configurations.push({ family, view, material: 'ceramic', diagnostic, shadows: false, zoom: 1 });
    configurations.push({ family, view, material: 'ceramic', diagnostic: 'neutral', shadows: true, zoom: 1 });
  }
  if (process.env.RIFT_INSPECTION_ORBIT === '1') for (const family of ['classic', 'faceted']) for (let azimuth = 0; azimuth < 360; azimuth += 22.5) configurations.push({ family, view: 'three-quarter', material: 'ceramic', diagnostic: 'material', shadows: true, zoom: 1, azimuth });
  if (process.env.RIFT_INSPECTION_SHADOW_VARIANTS === '1') for (const family of ['classic', 'faceted']) for (const [shadowBias, normalBias] of [[.00015, .03], [.00025, .003], [.00035, 0], [.0001, .005]]) configurations.push({ family, view: 'three-quarter', material: 'ceramic', diagnostic: 'neutral', shadows: true, zoom: 1, azimuth: 135, shadowBias, normalBias });
  for (const config of configurations) {
    const name = [config.family, config.azimuth === undefined ? config.view : `orbit-${config.azimuth}`, config.material, config.diagnostic, config.shadows ? 'shadow' : 'no-shadow', ...(config.shadowBias === undefined ? [] : [`bias-${config.shadowBias}-${config.normalBias}`])].join('-');
    if (process.env.RIFT_INSPECTION_FILTER && !new RegExp(process.env.RIFT_INSPECTION_FILTER).test(name)) continue;
    const actual = await page.evaluate(config => window.inspectPieces.render(config), config); await page.screenshot({ path: path.join(root, name + '.png') });
    receipt.sheets.push({ name, config, actual, pieces: 12 });
    if (receipt.sheets.length % 8 === 0) { console.log('Captured ' + receipt.sheets.length + '/' + configurations.length); await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); }
  }
  assert.deepEqual(receipt.errors, []); assert.equal(await sourceHash(), receipt.pieceSourceSha256, 'Piece source changed during inspection'); receipt.status = 'pass';
} catch (error) { receipt.status = 'fail'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message); }
finally { await browser.close(); receipt.finished = new Date().toISOString(); await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ status: receipt.status, sheets: receipt.sheets.length, errors: receipt.errors })); }
