import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';
const root = path.resolve('.artifacts', process.env.RIFT_TEST_RUN || 'lifecycle-pass'); await fs.mkdir(root, { recursive: true });
const receipt = { started: new Date().toISOString(), checks: [], errors: [] };
const fixtures = JSON.parse(await fs.readFile('fixtures/conformance.json', 'utf8')).fixtures;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } }); const page = await context.newPage();
const driver = createUiDriver(page);
page.on('pageerror', e => receipt.errors.push(e.message)); page.on('dialog', dialog => dialog.accept());
const observe = () => driver.observation();
const record = () => driver.record();
const index = n => (Number(n[1]) - 1) * 8 + n.charCodeAt(0) - 97;
const sparse = (pieces, holes = [5, 9], fields = {}) => { const board = Array(64).fill(0); for (const [name, piece] of Object.entries(pieces)) board[index(name)] = piece; return { board, holes: holes.reduce((a, n) => a | 1 << n, 0), side: 1, castling: 0, ep_target: -1, ep_pawn: -1, halfmove: 0, fullmove: 1, ...fields }; };
const load = value => driver.loadScenario(value);
const act = (type, from, to, promotion) => driver.perform({ type, from, to, promotion });
async function test(name, run) {
  try { await run(); receipt.checks.push({ name, status: 'pass' }); console.log(`PASS ${name}`); }
  catch (e) { receipt.checks.push({ name, status: 'fail', error: e.message }); throw e; }
  finally { await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); }
}
try {
  await page.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => Boolean(window.rift)); await driver.enterPlay();
  await test('all ordinary and Shift promotion choices before atomic commit', async () => {
    for (const [promotion, code] of [['Q', 5], ['R', 4], ['B', 3], ['N', 2]]) {
      await load(sparse({ h1: 6, h8: -6, a7: 1 })); await act('move', 'a7', 'a8', promotion); assert.equal((await observe()).position.board[56], code);
      await load(fixtures.find(f => f.name === 'shift_promotion').record); await act('shift', 'B3', 'B4', promotion); assert.equal((await observe()).position.board[58], code);
    }
    await page.screenshot({ path: path.join(root, 'underpromotion.png') });
  });
  await test('loaded rook Shift consumes castling right', async () => { await load(sparse({ e1: 6, a1: 4, h8: -6 }, [4, 10], { castling: 2 })); await act('shift', 'A1', 'A2'); const p = (await observe()).position; assert.equal(p.board[16], 4); assert.equal(p.castling, 0); });
  await test('transport consumes fresh pawn eligibility', async () => { await load(sparse({ e1: 6, a2: 7, h8: -6 }, [1, 10])); await act('shift', 'A1', 'B1'); assert.equal((await observe()).position.board[10], 1); });
  await test('empty Shift expires en passant', async () => { await load(fixtures.find(f => f.name === 'en_passant').record); const action = (await page.evaluate(() => window.rift.getLegalActions())).find(a => a.type === 'shift'); await act('shift', action.from, action.to); assert.equal((await observe()).position.ep_target, -1); assert.equal((await observe()).position.ep_pawn, -1); });
  await test('all progress policies at 100 and prompt dismissal', async () => {
    const baseline = fixtures.find(f => f.name === 'prompt_at_99').record;
    for (const policy of ['prompt', 'auto100', 'off']) {
      await load({ ...baseline, draw_policy: policy }); await act('shift', 'A2', 'B2'); const o = await observe(); assert.equal(o.position.halfmove, 100);
      assert.equal(o.outcome?.reason ?? null, policy === 'auto100' ? 'progress100' : null);
      if (policy === 'prompt') { assert.equal(await page.locator('#quiet-prompt').isVisible(), true); await page.locator('#quiet-dismiss').click(); await page.locator('#show-moves').click(); assert.equal(await page.locator('#quiet-prompt').isVisible(), false); await page.locator('#undo').click(); await act('shift', 'A2', 'B2'); assert.equal(await page.locator('#quiet-prompt').isVisible(), true); }
      if (policy === 'off') assert.equal(await page.locator('.quiet-readout').isVisible(), false);
    }
  });
  await test('threefold survives actual browser reload', async () => { await load(fixtures.find(f => f.name === 'opening_B').record); await act('shift', 'A2', 'B2'); await act('shift', 'B2', 'A2'); const saved = await record(); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => Boolean(window.rift)); await driver.enterPlay(); assert.deepEqual(await record(), saved); await driver.camera('top'); await act('shift', 'A2', 'B2'); await act('shift', 'B2', 'A2'); assert.equal((await observe()).outcome.reason, 'threefold'); });
  await test('stalemate and bare-kings endings', async () => { await load(sparse({ a1: 6, h8: -6, c2: -5, a3: -2, e3: -2, a5: -2, e5: -2, c7: -2 })); assert.equal((await observe()).outcome.reason, 'stalemate'); await load(sparse({ a1: 6, h8: -6 })); assert.equal((await observe()).outcome.reason, 'bare_kings'); });
  await test('nonmoving hotseat player can resign through the actor dialog; earlier replay stays ongoing', async () => { await load(fixtures.find(f => f.name === 'opening_B').record); await act('move', 'e2', 'e4'); await driver.openDrawer('Match & view'); await page.locator('#resign').click(); await page.locator('#actor-dialog').waitFor({ state: 'visible' }); assert.match(await page.locator('#actor-dialog-title').innerText(), /who resigns/i); await page.locator('#actor-white').click(); assert.equal((await observe()).outcome.winner, -1); await page.locator('#replay').click(); await page.locator('#replay-back').click(); assert.equal(await page.locator('#check').innerText(), 'Position steady'); await page.locator('#replay-exit').click(); });
  await test('new-game Escape preserves current match', async () => { await page.locator('#new-game').click(); await page.locator('#start-game').click(); const id = (await observe()).game_id; await page.locator('#new-game').click(); await page.keyboard.press('Escape'); assert.equal((await observe()).game_id, id); });
  await test('corrupt file rejected; raw replay adapter accepted', async () => { const before = await record(); await page.locator('#import').setInputFiles({ name: 'corrupt.json', mimeType: 'application/json', buffer: Buffer.from('{"schema":"rift-ui-save/1"}') }); assert.deepEqual(await record(), before); await page.locator('#import').setInputFiles({ name: 'record.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixtures.find(f => f.name === 'opening_B').record)) }); assert.deepEqual(await record(), fixtures.find(f => f.name === 'opening_B').record); });
  await test('semantic corruption restores known-good recovery copy', async () => { await driver.camera('top'); await act('move', 'e2', 'e4'); await act('move', 'e7', 'e5'); const recovered = await page.evaluate(() => JSON.parse(localStorage.getItem('rift-chess.save.recovery.v1')).record); await page.evaluate(() => { const original = localStorage.getItem('rift-chess.save.v1'); const recovery = localStorage.getItem('rift-chess.save.recovery.v1'); const x = JSON.parse(original); x.record.final_position_hash = 'corrupt'; addEventListener('beforeunload', () => { localStorage.setItem('rift-chess.save.v1', JSON.stringify(x)); localStorage.setItem('rift-chess.save.recovery.v1', recovery); }); }); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => Boolean(window.rift)); await driver.enterPlay(); assert.deepEqual(await record(), recovered); assert.match(await page.locator('#notice').innerText(), /recovery copy/); });

  assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (e) { receipt.status = 'fail'; receipt.failure = e.stack; process.exitCode = 1; console.error(e.message); await page.screenshot({ path: path.join(root, 'failure.png') }).catch(() => {}); }
finally { receipt.finished = new Date().toISOString(); await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); await browser.close(); }
