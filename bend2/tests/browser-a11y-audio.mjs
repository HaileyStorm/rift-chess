import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 1050 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', event => { if (event.type() === 'error') errors.push(event.text()); });
await page.addInitScript(() => {
  window.__audioStarts = 0;
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function(...args) {
    window.__audioStarts++;
    return Reflect.apply(start, this, args);
  };
});

try {
  await page.goto(process.env.BEND_TEST_URL || 'http://127.0.0.1:4184/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.ready === 'true' &&
    document.querySelector('canvas')?.getAttribute('aria-busy') === 'false');
  async function press(id) {
    const button = page.locator(`[data-control="${id}"]`);
    await button.waitFor();
    assert.equal(await button.isDisabled(), false);
    await button.focus();
    await page.keyboard.press('Enter');
  }
  // Keyboard activation of mirrored Bend controls must unlock Web Audio before
  // the human-Black opening schedules its automatic Bend bot move and PCM.
  await press(2);
  await page.locator('[data-control="32"]').waitFor();
  await press(32);
  await page.waitForFunction(() => document.querySelector('[data-control="32"]')?.getAttribute('aria-pressed') === 'true');
  await press(29);
  await page.waitForFunction(() => {
    const saved = localStorage.getItem('rift-bend-lab/save-v1');
    return saved && JSON.parse(saved).commands.length === 1 && window.__audioStarts > 0;
  }, null, { timeout: 60000 });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, audioStarts: await page.evaluate(() => window.__audioStarts),
    checks: ['Keyboard-only mirrored Bend controls start a bot move', 'Bend PCM reaches Web Audio after that keyboard user gesture'] }));
} finally {
  await browser.close();
}
