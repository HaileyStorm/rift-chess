/** Real-UI regressions for state coupling repaired in main.ts; capture evidence is not visual acceptance. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const root = path.resolve('.artifacts', 'ui-state-regressions', process.env.RIFT_TEST_RUN || 'prepared');
const receiptPath = path.join(root, 'receipt.json');
async function prepareOutput() {
  try { await fs.access(receiptPath); throw new Error(`Refusing to overwrite prior UI-state evidence: ${root}`); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  try { if ((await fs.readdir(root)).length) throw new Error(`Refusing non-empty UI-state evidence directory: ${root}`); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  await fs.mkdir(root, { recursive: true });
}
await prepareOutput();
const fixtures = JSON.parse(await fs.readFile('fixtures/conformance.json', 'utf8')).fixtures;
const receipt = { started: new Date().toISOString(), purpose: 'real UI state regressions; fixture loads are labelled edge-case setup only', url: base, checks: [], captures: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' });
const page = await context.newPage(), driver = createUiDriver(page);
page.on('pageerror', error => receipt.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
async function persist() { await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2)); }
async function capture(name) { await page.screenshot({ path: path.join(root, `${name}.png`) }); receipt.captures.push({ name, metrics: await driver.metrics(), viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight })), timestamp: new Date().toISOString() }); await persist(); }
async function servedPrecache() { return page.evaluate(async () => { const response = await fetch('./precache.json', { cache: 'no-store' }); if (!response.ok) throw new Error(`precache unavailable (${response.status})`); return response.json(); }); }
async function newGame(mode = 'hotseat', layout = 'B', policy = 'prompt') {
  await page.locator('#new-game').click(); const dialog = page.locator('#new-dialog'); await dialog.waitFor({ state: 'visible' });
  await dialog.locator(`input[name="mode"][value="${mode}"]`).check(); await dialog.locator(`input[name="layout"][value="${layout}"]`).check(); await dialog.locator(`input[name="draw"][value="${policy}"]`).check(); await dialog.locator('#start-game').click(); await driver.ready(); await driver.camera('top');
}
async function focusKeyboardSquare(target) {
  let current = (await driver.metrics()).keyboardSquare;
  while (current % 8 < target % 8) { await page.keyboard.press('ArrowRight'); current++; }
  while (current % 8 > target % 8) { await page.keyboard.press('ArrowLeft'); current--; }
  while (current < target) { await page.keyboard.press('ArrowUp'); current += 8; }
  while (current > target) { await page.keyboard.press('ArrowDown'); current -= 8; }
  assert.equal((await driver.metrics()).keyboardSquare, target);
}
async function ordinary(from, to) { return driver.perform({ type: 'move', from, to, promotion: null }); }
async function test(name, run) { try { await run(); receipt.checks.push({ name, status: 'pass' }); } catch (error) { receipt.checks.push({ name, status: 'fail', error: error.message }); throw error; } finally { await persist(); } }

try {
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.enterPlay(); receipt.build = await servedPrecache();
  await test('edge fixture at 99 quiet actions exposes one aggregate offer and one response', async () => {
    const fixture = fixtures.find(item => item.name === 'prompt_at_99'), action = fixture.children.find(child => child.action.type === 'shift').action;
    receipt.fixtureSetup = 'prompt_at_99'; await driver.loadScenario(fixture.record); await driver.perform(action);
    await page.locator('#quiet-prompt').waitFor({ state: 'visible' }); assert.match(await page.locator('#quiet-message').innerText(), /100 quiet actions.*agreement/i);
    await page.locator('#quiet-offer-draw').click(); await page.locator('#actor-dialog').waitFor({ state: 'visible' }); await page.locator('#actor-white').click();
    await page.locator('#draw-response').waitFor({ state: 'visible' }); assert.equal(await page.locator('#quiet-offer-draw').isVisible(), false); assert.equal(await page.locator('#quiet-offer-draw').isDisabled(), true); assert.equal(await page.locator('#draw-response').locator('#draw-offer').count(), 1); assert.equal(await page.locator('#notice').innerText(), '');
  });
  await test('keyboard-only source, destination focus, and Enter commit keep hints hidden', async () => {
    await newGame(); await page.locator('#scene').focus(); await focusKeyboardSquare(12); await page.keyboard.press('Enter'); await focusKeyboardSquare(28);
    const initialPawn = (await driver.observation()).position.board[12]; assert.ok(initialPawn > 0, 'e2 must contain White\'s initial pawn before the keyboard commit');
    const beforeEnter = await driver.metrics(); assert.equal(beforeEnter.keyboardSquare, 28); assert.equal(beforeEnter.focusSquare, 28); assert.equal(beforeEnter.moveHints, false); await capture('keyboard-focus-before-enter'); await page.keyboard.press('Enter'); await page.waitForFunction(() => window.rift.getObservation().revision === 1 && !window.rift.metrics().animating); const after = await driver.observation(); assert.equal(after.position.board[12], 0); assert.equal(Math.sign(after.position.board[28]), Math.sign(initialPawn));
    await page.locator('#replay').click(); await page.locator('#replay-back').click(); await page.locator('#scene').focus(); await focusKeyboardSquare(12); assert.match(await page.locator('#selection').innerText(), /^e2: White pawn\. Replay position\.$/); await page.locator('#replay-exit').click();
  });
  await test('temporary H hints reset after focus leaves the board', async () => {
    await newGame(); await page.locator('#scene').focus(); await page.keyboard.down('h'); assert.equal((await driver.metrics()).revealHeld, true); assert.equal((await driver.metrics()).moveHints, true); await page.keyboard.press('Tab'); await page.keyboard.up('h'); await page.waitForFunction(() => !window.rift.metrics().revealHeld && !window.rift.metrics().moveHints); assert.equal(await page.locator('#show-moves').getAttribute('aria-pressed'), 'false');
  });
  await test('unchanged Atelier Apply preserves a real bot animation arriving while its dialog is open', async () => {
    let releaseWorker;
    const workerRelease = new Promise(resolve => { releaseWorker = resolve; });
    const holdWorker = async route => { await workerRelease; await route.continue(); };
    await context.route('**/worker-*.js', holdWorker);
    await newGame('bot-white'); await page.locator('#settings').click();
    const applyBox = await page.locator('#settings-dialog button[value="apply"]').boundingBox(); assert.ok(applyBox);
    await page.evaluate(() => {
      window.__atelierClickEvidence = [];
      const observe = event => {
        const target = event.target instanceof Element ? event.target.closest('button') : null;
        if (target?.matches('#settings-dialog button[value="apply"]')) {
          window.__atelierClickEvidence.push({ at: performance.now(), metrics: window.rift.metrics() });
          document.removeEventListener('click', observe, true);
        }
      };
      document.addEventListener('click', observe, true);
    });
    const animationWatch = page.waitForFunction(() => window.rift.metrics().animating, null, { polling: 'raf', timeout: 20000 });
    releaseWorker(); await animationWatch;
    await page.mouse.click(applyBox.x + applyBox.width / 2, applyBox.y + applyBox.height / 2);
    await driver.ready();
    const clicks = await page.evaluate(() => window.__atelierClickEvidence), settled = await driver.metrics();
    const beforeApply = clicks[0]?.metrics;
    receipt.atelierAnimation = { clicks, settled, scenario: 'Real first bot move arrives while Atelier is open; only worker delivery is held.' };
    assert.ok(beforeApply?.animating, 'Actual Apply click must occur while the bot animation is active');
    assert.equal(settled.skippedAnimations, beforeApply.skippedAnimations);
    await context.unroute('**/worker-*.js', holdWorker); await capture('atelier-during-bot-animation');
  });
  await test('bot-turn resignation and draw offer attribute actions to the human side while worker delivery is delayed', async () => {
    let delivered = 0; const cancelled = new Set(), routeFailures = []; receipt.workerRouteEvents = [];
    await context.route('**/worker-*.js', async route => {
      const request = ++delivered; await new Promise(resolve => setTimeout(resolve, 5000));
      try { await route.continue(); receipt.workerRouteEvents.push({ request, status: 'delivered' }); }
      catch (error) {
        if (cancelled.has(request) && error.message.includes('Route is already handled!')) receipt.workerRouteEvents.push({ request, status: 'closed by tested worker termination' });
        else routeFailures.push({ request, error: error.message });
      }
    });
    const waitWorker = async count => { for (let i = 0; i < 100 && delivered < count; i++) await page.waitForTimeout(50); assert.ok(delivered >= count, 'Expected intercepted shipped-worker delivery before acting during its turn'); };
    await newGame('bot-black'); await ordinary('e2', 'e4'); await waitWorker(1); await page.waitForFunction(() => window.rift.getObservation().position.side === -1 && window.rift.metrics().animating === false); assert.match(await page.locator('#turn').innerText(), /Black to move.*bot thinking/i); await driver.openDrawer('Match & view'); cancelled.add(1); await page.locator('#resign').click(); assert.equal((await driver.observation()).outcome.winner, -1);
    await newGame('bot-black'); await ordinary('e2', 'e4'); await waitWorker(2); await page.waitForFunction(() => window.rift.getObservation().position.side === -1 && window.rift.metrics().animating === false); await driver.openDrawer('Match & view'); cancelled.add(2); await page.locator('#offer-draw').click(); assert.equal((await driver.observation()).draw_offer, null); assert.match(await page.locator('#notice').innerText(), /local bot declines/i); await page.waitForTimeout(6000); await context.unroute('**/worker-*.js'); assert.deepEqual(routeFailures, []);
  });
  await test('390x844 exposes Atelier, Learn links, active side, and board keyboard focus', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await newGame(); assert.equal(await page.locator('#settings').isVisible(), true); assert.match(await page.locator('#turn').innerText(), /White to move/);
    const learn = page.locator('details.drawer').filter({ has: page.locator('[data-tutorial="ordinary"]') }); if (!await learn.evaluate(element => element.open)) await learn.locator('summary').click(); await page.getByRole('link', { name: 'How to play', exact: true }).waitFor({ state: 'visible' }); await page.getByRole('link', { name: 'Full rules', exact: true }).waitFor({ state: 'visible' }); await page.locator('#about').click(); await page.locator('#about-dialog').waitFor({ state: 'visible' }); await page.keyboard.press('Escape'); await page.locator('#scene').focus(); await focusKeyboardSquare(1); assert.equal((await driver.metrics()).focusSquare, 1); await capture('390-narrow-learn-and-focus');
  });
  receipt.finalBuild = await servedPrecache(); assert.deepEqual(receipt.finalBuild, receipt.build); assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (error) { receipt.status = 'fail'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message); await page.screenshot({ path: path.join(root, 'failure.png') }).catch(() => {}); }
finally { receipt.finished = new Date().toISOString(); await persist(); await context.close(); await browser.close(); console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks })); }
