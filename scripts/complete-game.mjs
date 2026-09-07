/** Agent-driven browser games. Decisions are heuristic; every action uses canvas input. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = path.resolve('.artifacts', process.env.RIFT_TEST_RUN || 'complete-game'); await fs.mkdir(root, { recursive: true });
const receipt = { started: new Date().toISOString(), kind: 'automated real-UI play, not a human usability study', games: [], checks: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage(); page.on('pageerror', e => receipt.errors.push(e.message));
page.on('dialog', dialog => dialog.accept());
const observe = () => page.evaluate(() => window.rift.getObservation());
const record = () => page.evaluate(() => window.rift.exportRecord());
const index = name => (Number(name[1]) - 1) * 8 + name.charCodeAt(0) - 97;
const macroSquare = name => (Number(name[1]) - 1) * 16 + (name.charCodeAt(0) - 65) * 2;
async function square(n) { const p = await page.evaluate(n => window.rift.squareScreenPosition(n), n); await page.mouse.click(p.x, p.y); }
async function action(a) {
  await page.waitForFunction(() => window.rift.metrics().animating === false, null, { timeout: 30000 });
  const before = await observe();
  console.log(`Attempt ${before.revision + 1}: ${a.type} ${a.from}-${a.to}`);
  if (a.type === 'shift') { if (await page.locator('#shift-mode').getAttribute('aria-pressed') !== 'true') await page.locator('#shift-mode').click(); await square(macroSquare(a.from)); await square(macroSquare(a.to)); }
  else { await square(index(a.from)); await square(index(a.to)); }
  if (a.promotion) await page.locator(`#promotion-dialog button[value="${a.promotion}"]`).click();
  await page.waitForFunction(revision => window.rift.getObservation().revision > revision, before.revision, { timeout: 20000 });
}
function choose(actions, position, ply) {
  const values = [0, 100, 320, 330, 500, 900, 2000, 100];
  const score = a => {
    const noise = ((Math.imul(a.id + 19, 1103515245) ^ Math.imul(ply + 7, 12345)) >>> 0) % 71;
    if (a.type === 'shift') return -25 + noise + (a.promotion ? 900 : 0);
    const src = index(a.from), dst = index(a.to), piece = Math.abs(position.board[src]);
    const capture = Math.abs(position.board[dst]);
    return (a.en_passant ? 1200 : values[capture] * 12) - (capture ? values[piece] * 0.2 : 0)
      + (a.promotion ? 900 : 0) + (piece === 1 || piece === 7 ? 30 + Math.abs(Math.floor(dst / 8) - Math.floor(src / 8)) * 10 : 0)
      + (piece === 2 || piece === 3 ? 12 : 0) + noise;
  };
  return [...actions].sort((a, b) => score(b) - score(a) || a.id - b.id)[0];
}
async function newGame(layout, human) {
  await page.locator('#new-game').click();
  await page.locator(`input[name="mode"][value="${human === 1 ? 'bot-black' : 'bot-white'}"]`).check();
  await page.locator(`input[name="layout"][value="${layout}"]`).check(); await page.locator('input[name="draw"][value="prompt"]').check();
  await page.locator('#start-game').click(); await page.locator('[data-camera="top"]').click();
}
async function play(layout, human, maxActions, plannedResignation = false) {
  await newGame(layout, human); const game = { layout, humanSide: human, policy: 'capture/pawn-advance heuristic with deterministic noise; opponent uses shipped worker', humanActions: [] }; receipt.games.push(game);
  let observed;
  for (;;) {
    await page.waitForFunction(side => { const o = window.rift.getObservation(); return o.outcome || o.position.side === side; }, human, { timeout: 120000 });
    await page.waitForTimeout(550); observed = await observe();
    const current = await record(); if (observed.outcome || current.actions.length >= maxActions) break;
    const actions = await page.evaluate(() => window.rift.getLegalActions()); const selected = choose(actions, observed.position, current.actions.length); assert.ok(selected);
    await action(selected); game.humanActions.push(selected.id);
    game.record = await record();
    if (game.humanActions.length % 10 === 0) { console.log(`${layout}, human ${human}: ${game.record.actions.length} actions`); await page.screenshot({ path: path.join(root, `${layout}-${human}-${game.record.actions.length}.png`) }); }
    await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2));
  }
  if (!observed.outcome && plannedResignation) { await page.locator('#resign').click(); observed = await observe(); game.plannedResignation = true; }
  game.record = await record(); game.outcome = observed.outcome; game.truncated = !observed.outcome;
  game.metrics = await page.evaluate(() => window.rift.metrics());
  await page.screenshot({ path: path.join(root, `${layout}-${human}-ending.png`) });
  console.log(`${layout} ended: ${JSON.stringify(game.outcome)} after ${game.record.actions.length} actions`);
  assert.ok(game.outcome, 'Game remains unfinished at the action budget; it is not a draw');
}
try {
  await page.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => Boolean(window.rift));
  await play('B', 1, 400);
  await play('C', -1, 24, true);
  const beforeReload = await record(); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => Boolean(window.rift)); assert.deepEqual(await record(), beforeReload); receipt.checks.push('save/reload after complete game');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => Boolean(window.rift)); assert.deepEqual(await record(), beforeReload); receipt.checks.push('browser offline reload with preserved completed record');
  await page.screenshot({ path: path.join(root, 'offline-reload.png') });
  assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (error) { receipt.status = 'fail'; receipt.failure = error.stack; receipt.finalObserved = await observe().catch(() => null); receipt.interaction = await page.evaluate(() => window.rift.metrics()).catch(() => null); if (receipt.games.length) receipt.games.at(-1).lastCapturedRecord = await record().catch(() => null); process.exitCode = 1; console.error(error.message); await page.screenshot({ path: path.join(root, 'failure.png') }).catch(() => {}); }
finally { receipt.finished = new Date().toISOString(); await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); await browser.close(); }
