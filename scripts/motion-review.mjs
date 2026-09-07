import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createUiDriver } from './ui-driver.mjs';

const root = path.resolve('.artifacts/overhaul', process.env.RIFT_TEST_RUN || `motion-${Date.now()}`);
await fs.mkdir(root, { recursive: true });
const receiptPath = path.join(root, 'receipt.json');
try { await fs.access(receiptPath); throw new Error('Refusing to overwrite an existing motion receipt'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const fixtures = JSON.parse(await fs.readFile('fixtures/conformance.json', 'utf8')).fixtures;
const fixture = name => fixtures.find(item => item.name === name);
const empty = () => ({ ...structuredClone(fixture('en_passant').record.initial), board: Array(64).fill(0), ep_target: -1, ep_pawn: -1 });
const position = pieces => { const value = empty(); value.board[0] = 6; value.board[63] = -6; for (const [square, piece] of pieces) value.board[square] = piece; return value; };
const cases = [
  { name: 'ordinary', record: fixture('opening_B').record, match: a => a.from === 'e2' && a.to === 'e4' },
  { name: 'knight', record: fixture('opening_B').record, match: a => a.from === 'g1' && a.to === 'f3' },
  { name: 'capture', record: position([[27, 4], [43, -3]]), match: a => a.from === 'd4' && a.to === 'd6' },
  { name: 'checking-move', record: position([[27, 4]]), match: a => a.from === 'd4' && a.to === 'd8' },
  { name: 'castling', record: fixture('orthodox_castling').record, match: a => a.castle === 1 },
  { name: 'en-passant', record: fixture('en_passant').record, match: a => a.en_passant },
  { name: 'empty-shift', record: fixture('cut_check_ray').record, match: a => a.type === 'shift' && a.from === 'C2' && a.to === 'B2' },
  { name: 'loaded-rook-shift', record: { ...position([[34, 4]]), holes: 1056 }, match: a => a.type === 'shift' && a.from === 'B3' && a.to === 'C3' },
  ...['Q', 'R', 'B', 'N'].flatMap(promotion => [
    { name: `ordinary-promotion-${promotion}`, record: position([[52, 1]]), match: a => a.from === 'e7' && a.to === 'e8' && a.promotion === promotion },
    { name: `shift-promotion-${promotion}`, record: fixture('shift_promotion').record, match: a => a.type === 'shift' && a.from === 'B3' && a.to === 'B4' && a.promotion === promotion },
  ]),
];
const receipt = { started: new Date().toISOString(), classification: 'labeled fixture setup, actual rendered clicks and real-time animation capture; visual review required', cases: [], errors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=d3d11'] });
try {
  for (const item of cases.filter(item => !process.env.RIFT_MOTION_FILTER || new RegExp(process.env.RIFT_MOTION_FILTER).test(item.name))) {
    const directory = path.join(root, item.name); await fs.mkdir(directory, { recursive: true });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, serviceWorkers: 'block', recordVideo: { dir: directory, size: { width: 1600, height: 1000 } } });
    const page = await context.newPage(); const driver = createUiDriver(page);
    page.on('pageerror', error => receipt.errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') receipt.errors.push(message.text()); });
    const result = { name: item.name, setup: item.record, samples: [] }; receipt.cases.push(result);
    try {
      await page.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 60000 }); await driver.ready(); await driver.enterPlay();
      const build = await page.evaluate(async () => (await fetch('./precache.json', { cache: 'no-store' })).json());
      if (!receipt.build) receipt.build = build; else assert.deepEqual(build, receipt.build, 'Build changed during motion capture');
      await driver.loadScenario(item.record); await driver.camera('overview');
      if (process.env.RIFT_MOTION_MATERIAL) {
        await page.locator('#settings').click();
        await page.locator('#settings-dialog [name="material"]').selectOption(process.env.RIFT_MOTION_MATERIAL);
        await page.locator('#settings-dialog button[value="apply"]').click(); await driver.ready();
      }
      result.material = process.env.RIFT_MOTION_MATERIAL || 'ceramic';
      result.action = (await page.evaluate(() => window.rift.getLegalActions())).find(item.match); assert.ok(result.action, 'Required motion action is legal');
      await page.screenshot({ path: path.join(directory, 'before.png') });
      let operation;
      const watch = new Promise((resolve, reject) => {
        operation = driver.perform(result.action, {
          onPreview: () => page.screenshot({ path: path.join(directory, 'preview.png') }),
          beforeCommit: () => { void page.waitForFunction(() => window.rift.metrics().animating, null, { polling: 'raf', timeout: 10000 }).then(resolve, reject); },
        });
        void operation.catch(reject);
      });
      // The WebM records intermediate frames; synchronous PNG readback can stall the motion being judged.
      await watch; result.animationObserved = true; const start = Date.now();
      do {
        result.samples.push({ elapsedMs: Date.now() - start, metrics: await driver.metrics() });
        await page.waitForTimeout(40);
      } while ((await driver.metrics()).animating && result.samples.length < 100);
      await operation; result.observation = await driver.observation();
      if (item.name === 'checking-move') { assert.match(await page.locator('#check').innerText(), /check/i); await page.waitForTimeout(1100); }
      await page.screenshot({ path: path.join(directory, 'after.png') });
      assert.deepEqual(await page.evaluate(async () => (await fetch('./precache.json', { cache: 'no-store' })).json()), receipt.build, 'Build changed during motion case');
      result.videoReviewRequired = true;
      result.status = 'captured'; console.log(`CAPTURED ${item.name}: ${result.samples.length} motion observations; review actual video frames`);
    } finally { await context.close(); result.video = path.relative(root, await page.video().path()); }
    await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2));
  }
  assert.deepEqual(receipt.errors, []); receipt.status = 'captured-requires-review';
} catch (error) { receipt.status = 'fail'; receipt.failure = error.stack; process.exitCode = 1; console.error(error.message); }
finally { await browser.close(); receipt.finished = new Date().toISOString(); await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2)); }
