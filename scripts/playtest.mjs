/** Real browser inputs against the rendered game; fixture loading only sets scenarios. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createUiDriver } from './ui-driver.mjs';

const base = process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/';
const directory = path.resolve('.artifacts', process.env.RIFT_TEST_RUN || 'mechanics-pass');
await fs.mkdir(path.dirname(directory), { recursive: true }); await fs.mkdir(directory);
const fixtures = JSON.parse(await fs.readFile('fixtures/conformance.json', 'utf8')).fixtures;
const evidence = { started: new Date().toISOString(), url: base, browser: 'Chrome', tests: [], errors: [], screenshots: [] };
console.log('Launching isolated Chrome for real rendered interaction.');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'], timeout: 60000 });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block' });
  const driver = createUiDriver(page);
  page.on('pageerror', error => evidence.errors.push(error.message));
  const observation = () => driver.observation();
  const index = name => (Number(name[1]) - 1) * 8 + name.charCodeAt(0) - 97;
async function screenshot(name) {
  await page.screenshot({ path: path.join(directory, `${name}.png`) }); evidence.screenshots.push(`${name}.png`);
}
  const load = record => driver.loadScenario(record);
  const perform = action => driver.perform(action);
async function test(name, operation) {
  const start = performance.now();
  try { await operation(); evidence.tests.push({ name, status: 'pass', elapsed_ms: Math.round(performance.now() - start) }); console.log(`PASS ${name}`); }
  catch (error) { evidence.tests.push({ name, status: 'fail', error: error.message }); await screenshot(`failure-${evidence.tests.length}`); throw error; }
  finally { await fs.writeFile(path.join(directory, 'receipt.json'), JSON.stringify(evidence, null, 2)); }
}
const fixture = name => fixtures.find(item => item.name === name);
const sources = (actions, type) => [...new Set(actions.filter(action => action.type === type).map(action => action.from))];
const keyboardTo = target => driver.focusSquare(target);

try {
  console.log('Loading game.');
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => Boolean(window.rift), null, { timeout: 60000 });
  evidence.build = await page.evaluate(async () => (await fetch('./precache.json', { cache: 'no-store' })).json());
  await test('launch Skip reaches the live board and waits for assets', async () => {
    assert.equal(await page.locator('#launch-skip').isVisible(), true);
    await driver.enterPlay();
    assert.equal(await page.locator('#launch-surface').isVisible(), false);
  });
  await page.locator('#new-game').click(); await page.locator('input[name="layout"][value="B"]').check(); await page.locator('#start-game').click();
  await test('Atelier apply waits for renderer assets without a logical commit', async () => {
    const before = await observation();
    await page.locator('#settings').click();
    await page.locator('#settings-dialog button[value="apply"]').click();
    await driver.ready();
    assert.equal((await observation()).revision, before.revision);
  });
  await test('ordinary move from actual 3D piece with hidden/revealed hints', async () => {
    assert.equal(await page.locator('#show-moves').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#replay-controls').isVisible(), false);
    await driver.square(index('e2')); await screenshot('piece-selected-hints-hidden');
    await page.locator('#scene').focus(); await page.keyboard.down('h'); await screenshot('piece-selected-hints-revealed'); await page.keyboard.up('h');
    assert.equal(await page.locator('#show-moves').getAttribute('aria-pressed'), 'false');
    await driver.square(index('e4')); await page.waitForFunction(() => window.rift.getObservation().revision === 1);
    assert.equal((await observation()).position.board[index('e4')], 1);
    await page.waitForTimeout(300);
  });
  await test('Shift source and hover are inert, while mouse and keyboard destinations commit exactly once', async () => {
    const setup = fixture('cut_check_ray'), child = setup.children.find(item => item.action.type === 'shift' && item.action.from === 'C2' && item.action.to === 'B2');
    assert.ok(child, 'Missing C2-to-B2 Shift fixture');
    await load(setup.record); const before = await observation(), saved = await driver.record();
    await page.locator('#shift-mode').click(); await driver.square(driver.macroSquare('C2')); assert.equal((await observation()).revision, before.revision);
    await driver.hover(driver.macroSquare('B2')); await page.waitForFunction(() => window.rift.metrics().shiftPreview === 5); assert.deepEqual(await driver.record(), saved);
    await page.locator('#selection').hover(); assert.equal((await driver.metrics()).shiftPreview, null, 'Pointer leave clears the destination preview');
    await driver.hover(driver.macroSquare('B2')); await driver.camera('overview'); assert.equal((await driver.metrics()).shiftPreview, null, 'Camera changes clear the pointer preview');
    await driver.camera('top'); await driver.hover(driver.macroSquare('B2'));
    const target = await page.evaluate(index => window.rift.squareScreenPosition(index), driver.macroSquare('B2'));
    await page.mouse.move(target.x, target.y); await page.mouse.down(); await page.mouse.move(target.x + 18, target.y + 18); await page.mouse.up(); assert.equal((await observation()).revision, before.revision);
    assert.equal((await driver.metrics()).shiftPreview, null, 'Canceled drag clears the destination preview');
    await page.locator('#cancel-selection').click(); assert.deepEqual(await driver.record(), saved);
    await page.locator('#shift-mode').click(); await driver.square(driver.macroSquare('C2')); await driver.hover(driver.macroSquare('B2')); await driver.square(driver.macroSquare('B2'));
    await page.waitForFunction(revision => window.rift.getObservation().revision === revision + 1, before.revision); assert.deepEqual((await observation()).position, child.position);
    await load(setup.record); const keyboardBefore = await observation(); await page.locator('#scene').focus(); await page.keyboard.press('s'); await keyboardTo(driver.macroSquare('C2')); await page.keyboard.press('Enter'); assert.equal((await observation()).revision, keyboardBefore.revision);
    await keyboardTo(driver.macroSquare('B2')); await page.keyboard.press('Enter'); await page.waitForFunction(revision => window.rift.getObservation().revision === revision + 1, keyboardBefore.revision); assert.deepEqual((await observation()).position, child.position);
  });
  await test('ordinary and Shift source clicks or Enter cancel themselves and reselect another legal source', async () => {
    const openingB = fixture('opening_B'), openingC = fixture('opening_C');
    await load(openingB.record); const beforeMoves = await driver.record(), moveSources = sources(await page.evaluate(() => window.rift.getLegalActions()), 'move'); assert.ok(moveSources.length >= 2);
    const [moveA, moveB] = moveSources; await driver.square(moveA); assert.equal((await driver.metrics()).selectedSquare, index(moveA)); await driver.square(moveA); assert.equal((await driver.metrics()).selectedSquare, null);
    await driver.square(moveA); await driver.square(moveB); assert.equal((await driver.metrics()).selectedSquare, index(moveB)); assert.deepEqual(await driver.record(), beforeMoves);
    await load(openingB.record); await keyboardTo(index(moveA)); await page.keyboard.press('Enter'); await keyboardTo(index(moveA)); await page.keyboard.press('Enter'); assert.equal((await driver.metrics()).selectedSquare, null);
    await keyboardTo(index(moveA)); await page.keyboard.press('Enter'); await keyboardTo(index(moveB)); await page.keyboard.press('Enter'); assert.equal((await driver.metrics()).selectedSquare, index(moveB)); assert.deepEqual(await driver.record(), beforeMoves);
    for (const setup of [openingB, openingC]) {
      await load(setup.record); const beforeShifts = await driver.record(), shiftSources = sources(await page.evaluate(() => window.rift.getLegalActions()), 'shift'); assert.ok(shiftSources.length >= 2);
      const [shiftA, shiftB] = shiftSources; await page.locator('#shift-mode').click(); await driver.square(driver.macroSquare(shiftA)); assert.equal((await driver.metrics()).selectedTile, (Number(shiftA[1]) - 1) * 4 + shiftA.charCodeAt(0) - 65);
      await driver.square(driver.macroSquare(shiftA)); assert.equal((await driver.metrics()).selectedTile, null);
      await driver.square(driver.macroSquare(shiftA)); await driver.square(driver.macroSquare(shiftB)); assert.equal((await driver.metrics()).selectedTile, (Number(shiftB[1]) - 1) * 4 + shiftB.charCodeAt(0) - 65); assert.deepEqual(await driver.record(), beforeShifts);
    }
    await load(openingC.record); const keyboardShifts = sources(await page.evaluate(() => window.rift.getLegalActions()), 'shift'), [shiftA, shiftB] = keyboardShifts; assert.ok(shiftB);
    await page.locator('#scene').focus(); await page.keyboard.press('s'); await keyboardTo(driver.macroSquare(shiftA)); await page.keyboard.press('Enter'); await keyboardTo(driver.macroSquare(shiftA)); await page.keyboard.press('Enter'); assert.equal((await driver.metrics()).selectedTile, null);
    await keyboardTo(driver.macroSquare(shiftA)); await page.keyboard.press('Enter'); await keyboardTo(driver.macroSquare(shiftB)); await page.keyboard.press('Enter'); assert.equal((await driver.metrics()).selectedTile, (Number(shiftB[1]) - 1) * 4 + shiftB.charCodeAt(0) - 65);
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
  await test('passenger click stages a rendered Shift hover preview before destination commit', async () => {
    const setup = fixture('shift_promotion'), child = setup.children.find(item => item.action.type === 'shift' && item.action.promotion === 'N');
    assert.ok(child, 'Missing expected loaded Shift promotion'); await load(setup.record);
    const actual = await driver.performPassengerShift({ passenger: 'c6', to: child.action.to, promotion: child.action.promotion }, { onPreview: () => screenshot('passenger-shift-preview') });
    assert.deepEqual(actual.position, child.position); assert.deepEqual(actual.outcome, child.outcome);
  });
  await test('king-exposing Shift rejected without mutation', async () => {
    const original = fixture('restore_check_ray').record;
    const record = { ...original, initial: { ...original.initial, board: [...original.initial.board], side: 1 } };
    record.initial.board[index('a1')] = 0; record.initial.board[index('e1')] = 6;
    record.initial.board[index('e8')] = -4; record.initial.board[index('h8')] = -6;
    await load(record.initial); const before = await observation();
    await page.locator('#shift-mode').click(); await driver.square(index('c3'));
    assert.match(await page.locator('#notice').innerText(), /check|king/i);
    assert.equal((await observation()).revision, before.revision);
  });
  await test('draw offer decline and acceptance use other player', async () => {
    await load(fixture('opening_B').record); await driver.openDrawer('Match & view'); await page.getByRole('button', { name: 'Offer draw', exact: true }).click(); await page.locator('#actor-white').click();
    await page.getByRole('button', { name: /Decline/ }).click(); assert.equal((await observation()).draw_offer, null);
    await page.getByRole('button', { name: 'Offer draw', exact: true }).click(); await page.locator('#actor-white').click(); await page.getByRole('button', { name: /Accept/ }).click();
    assert.equal((await observation()).outcome.reason, 'agreement');
  });
  await test('camera gesture and presets cannot commit', async () => {
    await load(fixture('opening_C').record); const before = await observation();
    const box = await page.locator('#scene').boundingBox(); await page.mouse.move(box.x + 200, box.y + 200); await page.mouse.down({ button: 'right' }); await page.mouse.move(box.x + 380, box.y + 250, { steps: 10 }); await page.mouse.up({ button: 'right' });
    for (const camera of ['white', 'black', 'overview', 'top']) await driver.camera(camera);
    assert.deepEqual((await observation()).position, before.position); assert.equal((await observation()).revision, before.revision);
  });
  evidence.metrics = await page.evaluate(() => window.rift.metrics());
  assert.deepEqual(evidence.errors, []);
  evidence.finalBuild = await page.evaluate(async () => (await fetch('./precache.json', { cache: 'no-store' })).json()); assert.deepEqual(evidence.finalBuild, evidence.build);
  evidence.status = 'pass';
} catch (error) { evidence.status = 'fail'; evidence.failure = error.stack; process.exitCode = 1; console.error(error.message); }
finally {
  evidence.finished = new Date().toISOString(); await fs.writeFile(path.join(directory, 'receipt.json'), JSON.stringify(evidence, null, 2));
  await browser.close();
}
