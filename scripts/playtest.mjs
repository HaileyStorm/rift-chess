/** Real browser inputs against the rendered game; fixture loading only sets scenarios. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';

const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:5173/';
const directory = path.resolve('.artifacts', process.env.RIFT_TEST_RUN || 'mechanics-pass');
await fs.mkdir(directory, { recursive: true });
const fixtures = JSON.parse(await fs.readFile('fixtures/conformance.json', 'utf8')).fixtures;
const evidence = { started: new Date().toISOString(), url: base, browser: 'Chrome', tests: [], errors: [], screenshots: [] };
console.log('Launching isolated Chrome for real rendered interaction.');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'], timeout: 60000 });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' });
page.on('pageerror', error => evidence.errors.push(error.message));
const observation = () => page.evaluate(() => window.rift.getObservation());
const screenPoint = square => page.evaluate(square => window.rift.squareScreenPosition(square), square);
const index = name => (Number(name[1]) - 1) * 8 + name.charCodeAt(0) - 97;
const tileIndex = name => (Number(name[1]) - 1) * 4 + name.charCodeAt(0) - 65;
const tileSquare = tile => Math.floor(tile / 4) * 16 + tile % 4 * 2;
async function screenshot(name) {
  await page.screenshot({ path: path.join(directory, `${name}.png`) }); evidence.screenshots.push(`${name}.png`);
}
async function clickSquare(square) { const point = await screenPoint(square); await page.mouse.click(point.x, point.y); }
async function load(record) {
  await page.evaluate(record => window.rift.loadScenario(record), record);
  await page.locator('[data-camera="top"]').click();
  if (await page.locator('#shift-mode').getAttribute('aria-pressed') === 'true') await page.locator('#shift-mode').click();
  await page.waitForTimeout(100);
}
async function perform(action) {
  const before = await observation();
  if (action.type === 'shift') {
    if (await page.locator('#shift-mode').getAttribute('aria-pressed') !== 'true') await page.locator('#shift-mode').click();
    await clickSquare(tileSquare(tileIndex(action.from))); await clickSquare(tileSquare(tileIndex(action.to)));
  } else { await clickSquare(index(action.from)); await clickSquare(index(action.to)); }
  if (action.promotion) {
    await page.locator('#promotion-dialog').waitFor({ state: 'visible' });
    assert.equal((await observation()).revision, before.revision, 'Promotion must not commit before choice');
    await page.locator(`#promotion-dialog button[value="${action.promotion}"]`).click();
  }
  await page.waitForFunction(revision => window.rift.getObservation().revision === revision, before.revision + 1, { timeout: 10000 });
  await page.waitForTimeout(550);
  return observation();
}
async function test(name, operation) {
  const start = performance.now();
  try { await operation(); evidence.tests.push({ name, status: 'pass', elapsed_ms: Math.round(performance.now() - start) }); console.log(`PASS ${name}`); }
  catch (error) { evidence.tests.push({ name, status: 'fail', error: error.message }); await screenshot(`failure-${evidence.tests.length}`); throw error; }
  finally { await fs.writeFile(path.join(directory, 'receipt.json'), JSON.stringify(evidence, null, 2)); }
}
const fixture = name => fixtures.find(item => item.name === name);

try {
  console.log('Loading game.');
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => Boolean(window.rift), null, { timeout: 60000 });
  await page.locator('#new-game').click(); await page.locator('input[name="layout"][value="B"]').check(); await page.locator('#start-game').click();
  await test('ordinary move from actual 3D piece with hidden/revealed hints', async () => {
    assert.equal(await page.locator('#show-moves').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#replay-controls').isVisible(), false);
    await clickSquare(index('e2')); await screenshot('piece-selected-hints-hidden');
    await page.locator('#scene').focus(); await page.keyboard.down('h'); await screenshot('piece-selected-hints-revealed'); await page.keyboard.up('h');
    assert.equal(await page.locator('#show-moves').getAttribute('aria-pressed'), 'false');
    await clickSquare(index('e4')); await page.waitForFunction(() => window.rift.getObservation().revision === 1);
    assert.equal((await observation()).position.board[index('e4')], 1);
    await page.waitForTimeout(300);
  });
  for (const [name, predicate] of [
    ['cut_check_ray', a => a.type === 'shift' && a.from === 'C2' && a.to === 'B2'],
    ['restore_check_ray', a => a.type === 'shift' && a.from === 'B2' && a.to === 'C2'],
    ['shift_promotion', a => a.type === 'shift' && a.promotion === 'N'],
    ['backward_pawn_ride', a => a.type === 'shift' && a.from === 'A2' && a.to === 'A1'],
    ['orthodox_castling', a => a.castle === 1],
    ['en_passant', a => a.en_passant],
    ['auto_at_99', a => a.type === 'shift'],
    ['prompt_at_99', a => a.type === 'shift'],
    ['mate_over_auto100', (a, child) => child.outcome?.reason === 'checkmate'],
    ['third_repetition_on_next_reverse', (a, child) => child.outcome?.reason === 'threefold'],
  ]) await test(name, async () => {
    const setup = fixture(name); const child = setup.children.find(child => predicate(child.action, child));
    assert.ok(child, `Missing expected ${name} action`); await load(setup.record);
    const actual = await perform(child.action);
    assert.deepEqual(actual.position, child.position); assert.deepEqual(actual.outcome, child.outcome);
    await screenshot(name);
  });
  await test('king-exposing Shift rejected without mutation', async () => {
    const original = fixture('restore_check_ray').record;
    const record = { ...original, initial: { ...original.initial, board: [...original.initial.board], side: 1 } };
    record.initial.board[index('a1')] = 0; record.initial.board[index('e1')] = 6;
    record.initial.board[index('e8')] = -4; record.initial.board[index('h8')] = -6;
    await load(record.initial); const before = await observation();
    await page.locator('#shift-mode').click(); await clickSquare(index('c3'));
    assert.match(await page.locator('#notice').innerText(), /check|king/i);
    assert.equal((await observation()).revision, before.revision);
  });
  await test('draw offer decline and acceptance use other player', async () => {
    await load(fixture('opening_B').record); await page.getByRole('button', { name: 'Offer draw', exact: true }).click();
    await page.getByRole('button', { name: /Decline/ }).click(); assert.equal((await observation()).draw_offer, null);
    await page.getByRole('button', { name: 'Offer draw', exact: true }).click(); await page.getByRole('button', { name: /Accept/ }).click();
    assert.equal((await observation()).outcome.reason, 'agreement');
  });
  await test('camera gesture and presets cannot commit', async () => {
    await load(fixture('opening_C').record); const before = await observation();
    const box = await page.locator('#scene').boundingBox(); await page.mouse.move(box.x + 200, box.y + 200); await page.mouse.down({ button: 'right' }); await page.mouse.move(box.x + 380, box.y + 250, { steps: 10 }); await page.mouse.up({ button: 'right' });
    for (const camera of ['white', 'black', 'overview', 'top']) await page.locator(`[data-camera="${camera}"]`).click();
    assert.deepEqual((await observation()).position, before.position); assert.equal((await observation()).revision, before.revision);
  });
  evidence.metrics = await page.evaluate(() => window.rift.metrics());
  assert.deepEqual(evidence.errors, []);
  evidence.status = 'pass';
} catch (error) { evidence.status = 'fail'; evidence.failure = error.stack; process.exitCode = 1; console.error(error.message); }
finally {
  evidence.finished = new Date().toISOString(); await fs.writeFile(path.join(directory, 'receipt.json'), JSON.stringify(evidence, null, 2));
  await browser.close();
}
