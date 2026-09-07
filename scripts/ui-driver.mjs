/** Shared real-input driver; only loadScenario may inject a fixture state. */
import assert from 'node:assert/strict';

const squareIndex = square => typeof square === 'number' ? square : (Number(square[1]) - 1) * 8 + square.charCodeAt(0) - 97;
const tileIndex = tile => (Number(tile[1]) - 1) * 4 + tile.charCodeAt(0) - 65;
const tileSquare = tile => Math.floor(tile / 4) * 16 + tile % 4 * 2;
const macroSquare = tile => tileSquare(typeof tile === 'string' ? tileIndex(tile) : tile);
const cameraKey = { white: '1', black: '2', overview: '3', top: '4' };

export function createUiDriver(page) {
  const observation = () => page.evaluate(() => window.rift.getObservation());
  const record = () => page.evaluate(() => window.rift.exportRecord());
  const metrics = () => page.evaluate(() => window.rift.metrics());

  async function ready() {
    await page.waitForFunction(() => Boolean(window.rift), null, { timeout: 60000 });
    await page.evaluate(() => window.rift.assetsReady());
    await page.waitForFunction(() => !window.rift.metrics().animating);
  }

  async function enterPlay() {
    await ready();
    const returnButton = page.locator('#launch-return');
    const skipButton = page.locator('#launch-skip');
    if (await returnButton.isVisible()) await returnButton.click();
    else if (await skipButton.isVisible()) await skipButton.click();
    await ready();
  }

  async function camera(preset = 'top') {
    await page.locator('#scene').focus();
    await page.keyboard.press(cameraKey[preset]);
    await ready();
  }

  async function square(square) {
    const point = await page.evaluate(index => window.rift.squareScreenPosition(index), squareIndex(square));
    await page.mouse.click(point.x, point.y);
  }

  async function openDrawer(name) {
    const drawer = page.locator('details.drawer').filter({ has: page.locator('summary', { hasText: name }) });
    await drawer.waitFor({ state: 'attached' });
    if (!await drawer.evaluate(element => element.open)) await drawer.locator('summary').click();
    return drawer;
  }

  async function loadScenario(value) {
    await page.evaluate(record => window.rift.loadScenario(record), value);
    await enterPlay();
    await camera('top');
  }

  async function ensureIntent(intent) {
    const id = intent === 'shift' ? '#shift-mode' : '#move-mode';
    if (await page.locator(id).getAttribute('aria-pressed') !== 'true') await page.locator(id).click();
  }

  async function selectShiftSource(from) {
    await ensureIntent('shift');
    await square(tileSquare(tileIndex(from)));
    await page.waitForFunction(tile => window.rift.metrics().selectedTile === tile, tileIndex(from));
  }

  async function stageShift(action, onPreview) {
    const before = await observation();
    await selectShiftSource(action.from);
    await square(tileSquare(tileIndex(action.to)));
    await page.locator('#confirm-shift').waitFor({ state: 'visible' });
    assert.equal((await observation()).revision, before.revision, 'A Shift preview must not commit before Confirm Shift');
    await onPreview?.({ phase: 'preview', revision: before.revision, timestamp: Date.now() });
    return before;
  }

  async function waitForCommit(revision) {
    await page.waitForFunction(expected => window.rift.getObservation().revision === expected + 1, revision, { timeout: 10000 });
    await ready();
    return observation();
  }

  async function perform(action, { onPreview, beforeCommit } = {}) {
    const before = action.type === 'shift' ? await stageShift(action, onPreview) : await observation();
    if (action.type === 'move') {
      await ensureIntent('move');
      await square(action.from);
      if (!action.promotion) await beforeCommit?.();
      await square(action.to);
    }
    if (action.type === 'shift') { if (!action.promotion) await beforeCommit?.(); await page.locator('#confirm-shift').click(); }
    if (action.promotion) {
      await page.locator('#promotion-dialog').waitFor({ state: 'visible' });
      assert.equal((await observation()).revision, before.revision, 'Promotion must not commit before choice');
      await beforeCommit?.();
      await page.locator(`#promotion-dialog button[value="${action.promotion}"]`).click();
    }
    return waitForCommit(before.revision);
  }

  async function performPassengerShift(action, hooks = {}) {
    const before = await observation();
    await ensureIntent('move');
    await square(action.passenger);
    await page.locator('#shift-passenger').waitFor({ state: 'visible' });
    assert.equal((await observation()).revision, before.revision, 'Selecting a passenger must not commit a Shift');
    await page.locator('#shift-passenger').click();
    await square(tileSquare(tileIndex(action.to)));
    await page.locator('#confirm-shift').waitFor({ state: 'visible' });
    assert.equal((await observation()).revision, before.revision, 'Passenger Shift must remain a rendered preview until confirmation');
    await hooks.onPreview?.({ phase: 'preview', revision: before.revision, timestamp: Date.now() });
    if (!action.promotion) await hooks.beforeCommit?.();
    await page.locator('#confirm-shift').click();
    if (action.promotion) {
      await page.locator('#promotion-dialog').waitFor({ state: 'visible' });
      assert.equal((await observation()).revision, before.revision, 'Passenger promotion must not commit before choice');
      await hooks.beforeCommit?.();
      await page.locator(`#promotion-dialog button[value="${action.promotion}"]`).click();
    }
    return waitForCommit(before.revision);
  }

  return { camera, enterPlay, loadScenario, macroSquare, metrics, observation, openDrawer, perform, performPassengerShift, ready, record, square };
}
