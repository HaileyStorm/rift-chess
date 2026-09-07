import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('.artifacts', process.env.RIFT_TEST_RUN || 'visual-pass'); await fs.mkdir(root, { recursive: true });
const receipt = { started: new Date().toISOString(), captures: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' });
page.on('pageerror', e => receipt.errors.push(e.message));
async function settings(values) {
  await page.locator('#settings').click(); const dialog = page.locator('dialog[open]');
  for (const [name, value] of Object.entries(values)) {
    const input = dialog.locator(`[name="${name}"]`);
    if (typeof value === 'boolean') await input.setChecked(value); else await input.selectOption(value);
  }
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
}
async function capture(name) {
  await page.waitForTimeout(300); await page.screenshot({ path: path.join(root, `${name}.png`), fullPage: true });
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, body: document.documentElement.scrollWidth }));
  assert.ok(dimensions.body <= dimensions.viewport + 1, `${name}: horizontal overflow`);
  receipt.captures.push({ name, metrics: await page.evaluate(() => window.rift.metrics()) });
  await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); console.log(`Captured ${name}`);
}
try {
  await page.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.rift));
  await page.locator('#new-game').click(); await page.locator('input[name="layout"][value="B"]').check(); await page.locator('#start-game').click();
  for (const [t, theme] of ['gallery', 'nocturne', 'daylight'].entries()) {
    for (const [f, family] of ['classic', 'faceted'].entries()) {
      const material = ['ceramic', 'metal', 'wood'][(t + f) % 3];
      await settings({ theme, family, material, quality: 'balanced' });
      for (const camera of ['white', 'black', 'overview', 'top']) {
        await page.locator(`[data-camera="${camera}"]`).click(); await capture(`${theme}-${family}-${material}-${camera}`);
      }
    }
  }
  await page.setViewportSize({ width: 1280, height: 800 }); await settings({ theme: 'gallery', family: 'classic', material: 'ceramic', quality: 'low', motion: true });
  await page.locator('[data-camera="overview"]').click(); await capture('1280-low-reduced-motion');
  await page.setViewportSize({ width: 390, height: 844 }); await capture('390-mobile');
  assert.equal(await page.locator('#settings').isVisible(), true);
  await page.setViewportSize({ width: 1600, height: 1000 });
  receipt.cycles = [];
  for (let i = 0; i < 20; i++) {
    await settings({ theme: ['gallery', 'nocturne', 'daylight'][i % 3], family: i % 2 ? 'faceted' : 'classic', material: ['ceramic', 'metal', 'wood'][i % 3], quality: 'low', motion: true });
    await page.locator('#new-game').click(); await page.locator('#start-game').click();
    receipt.cycles.push(await page.evaluate(() => window.rift.metrics()));
  }
  assert.ok(receipt.cycles.at(-1).memory.geometries <= receipt.cycles[2].memory.geometries + 12, 'Geometry grows across restarts');
  assert.ok(receipt.cycles.at(-1).memory.textures <= receipt.cycles[2].memory.textures + 2, 'Textures grow across restarts');
  assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (e) { receipt.status = 'fail'; receipt.failure = e.stack; process.exitCode = 1; console.error(e.message); }
finally { receipt.finished = new Date().toISOString(); await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); await browser.close(); }
