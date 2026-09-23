import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const out = path.resolve('.artifacts/bend2/browser', process.env.BEND_PLAYTEST_RUN || new Date().toISOString().replace(/[:.]/g, '-'));
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const receipt = { at: new Date().toISOString(), url: process.env.BEND_TEST_URL || 'http://127.0.0.1:4184/', checks: [], errors: [], captures: [] };
page.on('pageerror', (error) => receipt.errors.push(error.message));
page.on('console', (event) => { if (event.type() === 'error') receipt.errors.push(event.text()); });
async function capture(name) { await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true }); receipt.captures.push(name); }
async function ready() {
  await page.waitForFunction(() => document.querySelector('#busy')?.hidden === true, null, { timeout: 30000 });
  await page.waitForFunction(() => {
    const color = document.querySelector('canvas')?.getContext('2d')?.getImageData(256, 256, 1, 1).data;
    return color && color[0] + color[1] + color[2] > 0;
  });
  await page.waitForTimeout(450);
}
async function clickPixel(x, y) {
  const rect = await page.locator('#board').boundingBox();
  assert(rect);
  await page.mouse.click(rect.x + x * rect.width / 512, rect.y + y * rect.height / 512);
}
async function clickSquare(file, rank, piece = false) {
  await clickPixel(256 + 45 * (file - 3.5), 274 + 45 * Math.sin(65 * Math.PI / 180) * (7 - rank - 3.5) - (piece ? 8 : 0));
}
try {
  await page.goto(receipt.url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#turn-label')?.textContent?.includes('White'), { timeout: 60000 });
  await ready();
  await capture('01-start');
  receipt.checks.push('Browser booted actual bundled Bend rules/renderer');
  await clickSquare(6, 0, true);
  await page.waitForFunction(() => document.querySelector('#selection')?.textContent?.includes('g1'), { timeout: 15000 });
  await ready();
  await capture('02-knight-selected');
  await clickSquare(5, 2);
  await page.waitForFunction(() => document.querySelector('#turn-label')?.textContent?.includes('Black'), { timeout: 15000 });
  await ready();
  receipt.checks.push('Pointer selected g1 knight and moved to f3');
  await capture('03-knight-f3');
  await clickSquare(6, 7, true);
  await page.waitForFunction(() => document.querySelector('#selection')?.textContent?.includes('g8'), { timeout: 15000 });
  await clickSquare(5, 5);
  await page.waitForFunction(() => document.querySelector('#turn-label')?.textContent?.includes('White'), { timeout: 15000 });
  await ready();
  receipt.checks.push('Black knight g8-f6');
  await clickSquare(0, 2);
  await page.waitForFunction(() => document.querySelector('#selection')?.textContent?.toLowerCase().includes('tile'), { timeout: 15000 });
  await capture('04-shift-selected');
  await clickSquare(2, 2);
  await page.waitForFunction(() => document.querySelector('#turn-label')?.textContent?.includes('Black'), { timeout: 15000 });
  await ready();
  receipt.checks.push('Empty tile Shift through the rendered board');
  await capture('05-shifted');
  await page.locator('#undo').click();
  await page.waitForFunction(() => document.querySelector('#turn-label')?.textContent?.includes('White'), { timeout: 15000 });
  await ready();
  receipt.checks.push('Undo restores prior turn');
  const before = await page.evaluate(() => localStorage.getItem('rift-bend-lab/save-v1'));
  assert(before && JSON.parse(before).commands.length === 4);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#turn-label')?.textContent?.includes('White'), { timeout: 30000 });
  await ready();
  assert.equal(await page.evaluate(() => localStorage.getItem('rift-bend-lab/save-v1')), before);
  receipt.checks.push('Reload preserves and replays accepted command ledger');
  await capture('06-reloaded');
  await page.locator('#menu').click();
  await capture('07-menu');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('08-mobile');
  assert.equal(receipt.errors.length, 0, receipt.errors.join('\n'));
} catch (error) {
  receipt.failure = String(error);
  await capture('failure');
  process.exitCode = 1;
} finally {
  await fs.writeFile(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ out, ...receipt }, null, 2));
  await browser.close();
}
