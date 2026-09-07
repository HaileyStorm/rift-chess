import { _electron } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = path.resolve('.artifacts', process.env.RIFT_NATIVE_RUN || 'native-pass'); await fs.mkdir(root, { recursive: true });
const executable = path.resolve(process.env.RIFT_ELECTRON_PATH || '.artifacts/native-unpacked/Rift-Chess-win32-x64-1.0.0/Rift Chess.exe');
const profile = path.join(root, 'profile');
const receipt = { started: new Date().toISOString(), checks: [], errors: [], executable_sha256: createHash('sha256').update(await fs.readFile(executable)).digest('hex') };
let app;
async function launch() {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name, value]) => value !== undefined && name !== 'ELECTRON_RUN_AS_NODE'));
  app = await _electron.launch({ executablePath: executable, env: { ...env, RIFT_CHESS_TEST_PROFILE: profile }, timeout: 60000 });
  await app.evaluate(async ({ app, session }) => { await app.whenReady(); session.defaultSession.enableNetworkEmulation({ offline: true }); });
  const page = await app.firstWindow({ timeout: 60000 }); page.on('pageerror', e => receipt.errors.push(e.message)); page.on('dialog', d => d.accept());
  await page.waitForFunction(() => Boolean(window.rift), null, { timeout: 60000 });
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => Boolean(window.rift));
  receipt.runtime = await app.evaluate(({ app }) => ({ versions: process.versions, profile: app.getPath('userData') }));
  assert.equal(path.resolve(receipt.runtime.profile), profile);
  return page;
}
try {
  let page = await launch();
  receipt.navigatorOnline = await page.evaluate(() => navigator.onLine);
  assert.equal(await page.evaluate(async () => { try { await fetch('http://127.0.0.1:4173/'); return true; } catch { return false; } }), false);
  assert.deepEqual(await page.evaluate(() => [typeof window.require, typeof window.process]), ['undefined', 'undefined']);
  receipt.checks.push('fresh isolated profile, packaged runtime, offline renderer, sandboxed UI');
  await page.screenshot({ path: path.join(root, 'first-launch.png') });
  await page.locator('#new-game').click(); await page.locator('input[name="mode"][value="bot-black"]').check(); await page.locator('input[name="layout"][value="B"]').check(); await page.locator('#start-game').click();
  await page.locator('[data-camera="top"]').click(); await page.waitForFunction(() => !window.rift.metrics().animating);
  for (const square of [12, 28]) { const point = await page.evaluate(square => window.rift.squareScreenPosition(square), square); await page.mouse.click(point.x, point.y); }
  await page.waitForFunction(() => window.rift.getObservation().revision >= 2 && !window.rift.metrics().animating, null, { timeout: 120000 });
  const saved = await page.evaluate(() => window.rift.exportRecord()); assert.equal(saved.actions.length, 2);
  receipt.checks.push('ordinary move and genuine local worker reply while offline');
  await page.screenshot({ path: path.join(root, 'offline-bot-reply.png') });
  receipt.metrics = await page.evaluate(() => window.rift.metrics());
  await app.close(); app = null;
  page = await launch(); assert.deepEqual(await page.evaluate(() => window.rift.exportRecord()), saved);
  receipt.checks.push('normal process close and restart restores full record');
  await app.evaluate(({ session }, destination) => {
    globalThis.__riftExport = null;
    session.defaultSession.once('will-download', (_event, item) => {
      item.setSavePath(destination);
      item.once('done', (_event, state) => { globalThis.__riftExport = state; });
    });
  }, path.join(root, 'export.json'));
  await page.locator('#export').click();
  for (let i = 0; i < 100; i++) { const state = await app.evaluate(() => globalThis.__riftExport); if (state) { assert.equal(state, 'completed'); break; } await page.waitForTimeout(100); }
  const exported = JSON.parse(await fs.readFile(path.join(root, 'export.json'), 'utf8')); assert.deepEqual(exported.record, saved);
  receipt.checks.push('packaged export produces valid replay');
  await page.locator('#import').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"invalid":true}') });
  assert.deepEqual(await page.evaluate(() => window.rift.exportRecord()), saved); receipt.checks.push('corrupt import rejected without losing packaged match');
  assert.deepEqual(receipt.errors, []); receipt.status = 'pass';
} catch (e) { receipt.status = 'fail'; receipt.failure = e.stack; process.exitCode = 1; console.error(e.message); if (app) { const pages = app.context().pages(); if (pages[0]) await pages[0].screenshot({ path: path.join(root, 'failure.png') }).catch(() => {}); } }
finally { if (app) await app.close().catch(() => {}); receipt.finished = new Date().toISOString(); await fs.writeFile(path.join(root, 'receipt.json'), JSON.stringify(receipt, null, 2)); console.log(JSON.stringify({ status: receipt.status, checks: receipt.checks })); }
