/** Packaged gate plus opt-in development visual evidence; the latter is never packaged acceptance. */
import { _electron } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const visualOnly = process.env.RIFT_NATIVE_VISUAL_ONLY === '1';
if (!process.env.RIFT_ELECTRON_PATH) throw new Error(visualOnly ? 'RIFT_ELECTRON_PATH must name the explicit Electron development runtime' : 'RIFT_ELECTRON_PATH must name the accepted packaged candidate executable');
const root = path.resolve('.artifacts', process.env.RIFT_NATIVE_RUN || 'native-pass');
const executable = path.resolve(process.env.RIFT_ELECTRON_PATH);
const projectRoot = path.resolve('.');
const resources = path.join(path.dirname(executable), 'resources');
const appAsar = path.join(resources, 'app.asar');
const profile = path.join(root, 'profile');
const receiptPath = path.join(root, 'receipt.json');
async function prepareOutput() {
  try { if ((await fs.readdir(root)).length) throw new Error(`Refusing to overwrite native evidence: ${root}`); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  await fs.mkdir(root, { recursive: true });
}
await prepareOutput();
const sha256 = async file => createHash('sha256').update(await fs.readFile(file)).digest('hex');
const receipt = visualOnly
  ? { started: new Date().toISOString(), classification: 'native development-build visual/scaling evidence only; never packaged acceptance', runtime: { executable, projectRoot }, checks: [], captures: [], errors: [] }
  : { started: new Date().toISOString(), purpose: 'packaged offline gate; captures are evidence, not visual acceptance', candidate: { executable, executable_sha256: await sha256(executable), resources, app_asar: appAsar, app_asar_sha256: await sha256(appAsar) }, checks: [], captures: [], errors: [] };
let app;

async function nativeState() {
  return app.evaluate(({ app, BrowserWindow, screen }) => {
    const window = BrowserWindow.getAllWindows()[0], display = screen.getDisplayMatching(window.getBounds());
    return { appVersion: app.getVersion(), display: { id: display.id, scaleFactor: display.scaleFactor, size: display.size, workAreaSize: display.workAreaSize }, window: window.getBounds(), electronZoomFactor: window.webContents.getZoomFactor() };
  });
}
async function servedAssets() {
  // The player renderer deliberately has connect-src 'none'. Inspect the same registered
  // static protocol in Electron's main process without relaxing the product CSP.
  return app.evaluate(async ({ net }) => {
    const precache = await net.fetch('rift://app/precache.json', { cache: 'no-store' }); if (!precache.ok) throw new Error(`precache unavailable (${precache.status})`);
    const manifest = await precache.json(), png = manifest.assets.find(asset => asset.toLowerCase().endsWith('.png'));
    if (!png) throw new Error('Packaged precache contains no PNG asset to verify');
    const image = await net.fetch(new URL(png, 'rift://app/').href, { cache: 'no-store' }); return { manifest, png: { asset: png, ok: image.ok, mime: image.headers.get('content-type') }, inspection: 'Electron main-process net.fetch through registered rift static protocol; renderer CSP unchanged' };
  });
}
async function capture(page, name) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const nativeImage = await app.evaluate(({ BrowserWindow }) => new Promise((resolve, reject) => {
    const contents = BrowserWindow.getAllWindows()[0].webContents;
    let frames = 0;
    const timer = setTimeout(() => { contents.endFrameSubscription(); reject(new Error('No fresh native compositor frames arrived for capture')); }, 10000);
    contents.beginFrameSubscription(false, image => {
      if (++frames < 2) return;
      contents.endFrameSubscription(); clearTimeout(timer);
      resolve({ png: image.toPNG().toString('base64'), size: image.getSize(), scaleFactors: image.getScaleFactors() });
    });
  }));
  await fs.writeFile(path.join(root, `${name}.png`), Buffer.from(nativeImage.png, 'base64'));
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, devicePixelRatio }));
  const layout = await page.evaluate(() => Object.fromEntries(['.topbar', '#scene', '.action-dock', '.utility-deck'].map(selector => { const rect = document.querySelector(selector)?.getBoundingClientRect(); return [selector, rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null]; })));
  receipt.captures.push({ name, captureMethod: 'Electron webContents.beginFrameSubscription, second fresh native compositor frame after layout RAFs', image: { size: nativeImage.size, scaleFactors: nativeImage.scaleFactors }, viewport, native: await nativeState(), layout, metrics: await page.evaluate(() => window.rift.metrics()), timestamp: new Date().toISOString() });
  for (const selector of ['.topbar', '#scene', '.action-dock']) { const box = layout[selector]; assert.ok(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, `${name}: ${selector} must fit the actual native content viewport`); }
}
async function launch() {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name, value]) => value !== undefined && name !== 'ELECTRON_RUN_AS_NODE'));
  app = await _electron.launch({ executablePath: executable, args: visualOnly ? [projectRoot] : undefined, env: { ...env, RIFT_CHESS_TEST_PROFILE: profile }, timeout: 60000 });
  await app.evaluate(async ({ app, session }, developmentVisual) => { await app.whenReady(); if (!developmentVisual) await session.defaultSession.enableNetworkEmulation({ offline: true }); }, visualOnly);
  const page = await app.firstWindow({ timeout: 60000 }), driver = createUiDriver(page);
  page.on('pageerror', error => receipt.errors.push(error.message));
  await driver.ready(); await driver.enterPlay();
  const appRuntime = await app.evaluate(({ app }) => ({ isPackaged: app.isPackaged, appPath: app.getAppPath(), profile: app.getPath('userData') }));
  receipt.runtime = { ...(await nativeState()), ...appRuntime }; assert.equal(path.resolve(receipt.runtime.profile), profile);
  if (visualOnly) { assert.equal(receipt.runtime.isPackaged, false); assert.equal(path.resolve(receipt.runtime.appPath), projectRoot); }
  return { page, driver };
}
async function waitHuman(page, side) { await page.waitForFunction(expected => { const observation = window.rift.getObservation(); return Boolean(observation.outcome) || (observation.position.side === expected && !window.rift.metrics().animating); }, side, { timeout: 120000 }); }
async function newBotMatch(page, driver, mode, layout) {
  await page.locator('#new-game').click(); const dialog = page.locator('#new-dialog'); await dialog.waitFor({ state: 'visible' });
  await dialog.locator(`input[name="mode"][value="${mode}"]`).check(); await dialog.locator(`input[name="layout"][value="${layout}"]`).check(); await dialog.locator('#start-game').click(); await driver.ready(); await driver.camera('top');
}
async function humanBotTurn(page, driver, mode) {
  const side = mode === 'bot-black' ? 1 : -1; await waitHuman(page, side); const observation = await driver.observation();
  const action = await page.evaluate(() => window.rift.getLegalActions()).then(actions => actions.find(item => item.type === 'move' && item.from === (side === 1 ? 'e2' : 'e7') && item.to === (side === 1 ? 'e4' : 'e5')) || actions.find(item => item.type === 'move'));
  assert.ok(action, 'Expected a visible ordinary move for the human side'); await driver.perform(action); await waitHuman(page, side); return driver.record();
}
async function captureScalingMatrix(page, classification) {
  try {
  for (const size of [{ width: 1280, height: 720 }, { width: 1600, height: 1000 }]) {
    await app.evaluate(({ BrowserWindow }, bounds) => BrowserWindow.getAllWindows()[0].setBounds(bounds), size); await page.waitForTimeout(250);
    for (const zoom of [.8, 1, 1.25, 1.5]) {
      await app.evaluate(({ BrowserWindow }, factor) => BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(factor), zoom); await page.waitForTimeout(150); await capture(page, `${classification}-scaling-${size.width}x${size.height}-zoom-${zoom}`);
      if (size.width === 1280 && zoom === 1.5) for (const [opener, dialog] of [['settings', 'settings-dialog'], ['new-game', 'new-dialog']]) {
        await page.locator(`#${opener}`).click(); await page.locator(`#${dialog}`).waitFor({ state: 'visible' });
        const fit = await page.locator(`#${dialog}`).evaluate(element => { const r = element.getBoundingClientRect(); return r.x >= -1 && r.y >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; });
        assert.equal(fit, true, `Native ${dialog} must fit the smallest scaled viewport`);
        await capture(page, `${classification}-scaling-1280x720-zoom-1.5-${dialog}`);
        if (dialog === 'new-dialog') {
          const focusPath = [];
          for (let tab = 0; tab < 24; tab++) {
            await page.keyboard.press('Tab');
            const focused = await page.evaluate(() => document.activeElement?.id || document.activeElement?.getAttribute('name') || document.activeElement?.tagName);
            focusPath.push(focused);
            if (focused === 'start-game') break;
          }
          assert.equal(focusPath.at(-1), 'start-game', 'Tab must reach the New Match action in the native scaled dialog');
          const readScroll = () => page.locator('#new-dialog').evaluate(element => {
            const button = element.querySelector('#start-game').getBoundingClientRect(), box = element.getBoundingClientRect();
            return { scrollTop: element.scrollTop, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, actionVisible: button.top >= Math.max(0, box.top) && button.bottom <= Math.min(innerHeight, box.bottom) && button.left >= box.left && button.right <= box.right };
          });
          let scrollEnd = await readScroll();
          assert.equal(scrollEnd.actionVisible, true, 'Keyboard focus must reveal the complete Start game control');
          if (scrollEnd.scrollHeight > scrollEnd.clientHeight + 2) {
            await page.locator('#new-dialog').hover(); await page.mouse.wheel(0, scrollEnd.scrollHeight);
            await page.waitForFunction(() => { const dialog = document.querySelector('#new-dialog'); return dialog.scrollTop + dialog.clientHeight >= dialog.scrollHeight - 2; });
            scrollEnd = await readScroll();
            assert.ok(scrollEnd.scrollTop > 0 && scrollEnd.scrollTop + scrollEnd.clientHeight >= scrollEnd.scrollHeight - 2, 'An overflowing dialog must be captured at its actual scroll end');
            assert.equal(scrollEnd.actionVisible, true);
          }
          receipt.nativeDialogScroll ??= []; receipt.nativeDialogScroll.push({ classification, focusPath, ...scrollEnd });
          await capture(page, `${classification}-scaling-1280x720-zoom-1.5-new-dialog-bottom`);
        }
        await page.keyboard.press('Escape'); await page.locator(`#${dialog}`).waitFor({ state: 'hidden' });
        assert.equal(await page.evaluate(() => document.activeElement?.id), opener, 'Native Escape must return focus to the dialog opener');
      }
    }
  }
  } finally {
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
}
async function loadedTutorial(page, driver) {
  const learn = page.locator('details.drawer').filter({ has: page.locator('[data-tutorial="loadedShift"]') }); if (!await learn.evaluate(element => element.open)) await learn.locator('summary').click();
  await page.locator('[data-tutorial="loadedShift"]').click(); await driver.ready(); await driver.camera('top');
  const actual = await driver.performPassengerShift({ passenger: 'c6', to: 'B4', promotion: 'N' }); assert.equal(actual.position.board[58], 2); receipt.checks.push('visible loaded-Shift tutorial uses passenger route, preview confirmation, and promotion choice');
}
async function staleNativeWorkerResponse(page, driver) {
  await page.evaluate(() => {
    const original = window.Worker, state = { original, queued: 0, callbacks: [], messages: [] };
    class HeldWorker extends original {
      set onmessage(listener) {
        super.onmessage = listener ? event => { state.queued++; state.messages.push({ type: event.data?.type, game_id: event.data?.game_id, revision: event.data?.revision, actionId: event.data?.action?.id }); state.callbacks.push(() => listener.call(this, event)); } : null;
      }
      get onmessage() { return super.onmessage; }
    }
    window.Worker = HeldWorker;
    window.__riftNativeWorkerHold = {
      queued: () => state.queued,
      messages: () => state.messages,
      release: () => { const callbacks = state.callbacks.splice(0); callbacks.forEach(callback => callback()); return callbacks.length; },
      restore: () => { window.Worker = state.original; delete window.__riftNativeWorkerHold; },
    };
  });
  try {
    await newBotMatch(page, driver, 'bot-black', 'B');
    await driver.perform({ type: 'move', from: 'e2', to: 'e4', promotion: null });
    await page.waitForFunction(() => window.__riftNativeWorkerHold.queued() === 1, null, { timeout: 120_000 });
    const old = await driver.observation();
    const [held] = await page.evaluate(() => window.__riftNativeWorkerHold.messages());
    assert.equal(held.type, 'suggestion'); assert.equal(held.game_id, old.game_id); assert.equal(held.revision, old.revision);
    assert.ok(await page.evaluate(id => window.rift.getLegalActions().some(action => action.id === id), held.actionId), 'Held native response must contain an actual legal proposed action');
    await newBotMatch(page, driver, 'hotseat', 'C');
    const replacement = { record: await driver.record(), observation: await driver.observation() };
    assert.notEqual(replacement.observation.game_id, old.game_id, 'Real New Match must create a new game before stale delivery.');
    assert.equal(replacement.observation.revision, 0, 'Fresh Hotseat C must begin at revision zero.');
    assert.equal(await page.evaluate(() => window.__riftNativeWorkerHold.release()), 1);
    await page.waitForTimeout(2000);
    assert.deepEqual(await driver.record(), replacement.record, 'Released stale native worker response changed the new record.');
    const after = await driver.observation();
    assert.equal(after.game_id, replacement.observation.game_id, 'Released stale native worker response changed game identity.');
    assert.equal(after.revision, replacement.observation.revision, 'Released stale native worker response changed revision.');
    receipt.staleWorkerProbe = { classification: 'Actual native worker suggestion held in an instrumented callback, not a fabricated payload', held, replacementGameId: after.game_id, replacementRevision: after.revision, releasedCallbacks: 1 };
    receipt.checks.push('instrumented native Worker held one actual callback; stale release after real New Hotseat C left the replacement match unchanged');
  } finally {
    await page.evaluate(() => window.__riftNativeWorkerHold?.restore()).catch(() => {});
  }
}
try {
  let { page, driver } = await launch();
  if (visualOnly) {
    receipt.build = await servedAssets(); assert.equal(receipt.build.png.ok, true); assert.match(receipt.build.png.mime || '', /^image\/png\b/i);
    await captureScalingMatrix(page, 'development-visual'); receipt.finalBuild = await servedAssets(); assert.deepEqual(receipt.finalBuild, receipt.build); assert.deepEqual(receipt.errors, []); receipt.checks.push('actual development app window captured at two bounds and four Electron zoom factors; OS display scale is recorded separately'); receipt.status = 'development_visual_evidence_only';
  } else {
  receipt.build = await servedAssets(); assert.equal(receipt.build.png.ok, true); assert.match(receipt.build.png.mime || '', /^image\/png\b/i);
  receipt.navigatorOnline = await page.evaluate(() => navigator.onLine); assert.equal(await page.evaluate(async () => { try { await fetch('http://127.0.0.1:4173/'); return true; } catch { return false; } }), false); assert.deepEqual(await page.evaluate(() => [typeof window.require, typeof window.process]), ['undefined', 'undefined']);
  await capture(page, 'packaged-first-launch'); await captureScalingMatrix(page, 'packaged'); receipt.checks.push('isolated packaged sandbox stays offline; native display scale and Electron zoom are recorded separately');
  await newBotMatch(page, driver, 'bot-black', 'B'); const whiteRecord = await humanBotTurn(page, driver, 'bot-black'); assert.equal(whiteRecord.actions.length >= 2, true); await capture(page, 'packaged-offline-human-white-bot');
  await page.locator('#replay').click(); await page.locator('#replay-back').click(); await page.locator('#replay-exit').click(); await driver.ready(); receipt.checks.push('visible replay returns to the live packaged match');
  await app.close(); app = null;
  ({ page, driver } = await launch()); assert.deepEqual(await driver.record(), whiteRecord); assert.deepEqual(await servedAssets(), receipt.build); receipt.checks.push('normal packaged restart restores record and exact served assets');
  await app.evaluate(({ session }, destination) => { globalThis.__riftExport = null; session.defaultSession.once('will-download', (_event, item) => { item.setSavePath(destination); item.once('done', (_event, state) => { globalThis.__riftExport = state; }); }); }, path.join(root, 'export.json'));
  await driver.openDrawer('Match & view'); await page.locator('#export').click(); let exportState = null;
  for (let i = 0; i < 100; i++) { exportState = await app.evaluate(() => globalThis.__riftExport); if (exportState) break; await page.waitForTimeout(100); }
  assert.equal(exportState, 'completed', 'Packaged export did not complete');
  const exported = JSON.parse(await fs.readFile(path.join(root, 'export.json'), 'utf8')); assert.deepEqual(exported.record, whiteRecord); await page.locator('#import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"invalid":true}') }); assert.deepEqual(await driver.record(), whiteRecord); receipt.checks.push('packaged export/rejected corrupt import preserve the restored match');
  await newBotMatch(page, driver, 'bot-white', 'C'); const blackRecord = await humanBotTurn(page, driver, 'bot-white'); assert.equal(blackRecord.actions.length >= 2, true); await capture(page, 'packaged-offline-human-black-bot'); receipt.checks.push('both human colors complete a visible move against the shipped offline worker');
  await loadedTutorial(page, driver); await capture(page, 'packaged-loaded-shift-promotion');
  await staleNativeWorkerResponse(page, driver);
  receipt.finalBuild = await servedAssets(); assert.deepEqual(receipt.finalBuild, receipt.build); assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
  }
} catch (error) { receipt.status = 'fail'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message); if (app) { const pages = app.context().pages(); if (pages[0]) await pages[0].screenshot({ path: path.join(root, 'failure.png') }).catch(() => {}); } }
finally { if (app) await app.close().catch(() => {}); receipt.finished = new Date().toISOString(); await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks })); }
