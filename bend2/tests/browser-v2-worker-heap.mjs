// Chrome-only diagnostic for the actual Bend scene worker's heap and orbit
// timings. Heap snapshots are between replies, not a GC trace or device cap.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const url = process.env.BEND_TEST_URL || 'http://127.0.0.1:4185/';
const buildFile = process.env.BEND_LIVE_BUILD_JSON || '.artifacts/bend2/v2-preview/dist/build.json';
const buildBytes = fs.readFileSync(buildFile);
const expected = JSON.parse(buildBytes);
if (process.env.BEND_ALLOW_DRAFT !== '1')
  assert.equal(expected.sourceDirty, false, 'Use a clean, source-bound build or explicitly opt into a draft diagnostic');
const heapMb = Number(process.env.BEND_CHROME_HEAP_MB ?? 128);
assert.ok(Number.isInteger(heapMb) && (heapMb === 0 || (heapMb >= 128 && heapMb <= 1024)));
const served = await fetch(new URL('build.json', url), { cache: 'no-store' });
assert.equal(served.status, 200);
assert.deepEqual(Buffer.from(await served.arrayBuffer()), buildBytes, 'Served build differs');
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: heapMb ? [`--js-flags=--max-old-space-size=${heapMb}`] : [] });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.__heapProbeFrames = [];
  window.Worker = class extends NativeWorker {
    requests = new Map();
    constructor(...args) {
      super(...args);
      this.addEventListener('message', event => {
        const m = event.data;
        if (m.kind !== 'frame') return;
        const request = this.requests.get(m.id);
        window.__heapProbeFrames.push({ id: m.id, kinds: request?.kinds || [], dirty: !!m.image,
          replyMs: request ? performance.now() - request.at : null,
          treeMs: m.treeMs, traversalMs: m.traversalMs,
          pointerMs: m.sceneTimes?.pointer, visited: m.pixelStats?.visited });
        this.requests.delete(m.id);
        if (m.image) window.__heapProbeShown = m.presentation;
      });
    }
    postMessage(message, ...transfer) {
      if (message.kind === 'events') this.requests.set(message.id, {
        at: performance.now(), kinds: (message.events || []).map(event => event.$) });
      super.postMessage(message, ...transfer);
    }
  };
});

let cdp, sessionId;
try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.ready === 'true' &&
    document.querySelector('canvas')?.getAttribute('aria-busy') === 'false' && window.__heapProbeShown,
  null, { timeout: 60000 });
  cdp = await browser.newBrowserCDPSession();
  const targets = (await cdp.send('Target.getTargets')).targetInfos;
  const worker = targets.find(target => target.type === 'worker' &&
    new URL(target.url).pathname.includes('/worker-v2-'));
  assert.ok(worker, 'Bend scene worker target not found');
  ({ sessionId } = await cdp.send('Target.attachToTarget', { targetId: worker.targetId, flatten: false }));
  let requestId = 0;
  const pending = new Map();
  cdp.on('Target.receivedMessageFromTarget', event => {
    if (event.sessionId !== sessionId) return;
    const message = JSON.parse(event.message);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  });
  async function workerCommand(method) {
    const id = ++requestId;
    const reply = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('Worker heap query timed out')); }, 8000);
      pending.set(id, { resolve, reject, timer });
    });
    try {
      await cdp.send('Target.sendMessageToTarget', { sessionId,
        message: JSON.stringify({ id, method }) });
      return await reply;
    } catch (error) {
      const entry = pending.get(id);
      if (entry) { clearTimeout(entry.timer); pending.delete(id); }
      throw error;
    }
  }
  async function heap() {
    const usage = await workerCommand('Runtime.getHeapUsage');
    return { usedMiB: +(usage.usedSize / 1048576).toFixed(2),
      totalMiB: +(usage.totalSize / 1048576).toFixed(2) };
  }
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  const position = await page.evaluate(() => {
    const p = window.__heapProbeShown.plan;
    const canvas = document.querySelector('canvas');
    return { x: p.board.x + 256 * p.scale, y: p.board.y + 274 * p.scale,
      width: canvas.width, height: canvas.height };
  });
  const x = box.x + position.x * box.width / position.width;
  const y = box.y + position.y * box.height / position.height;
  const samples = [{ step: 0, heap: await heap() }];
  const profileEnabled = process.env.BEND_WORKER_CPU_PROFILE === '1';
  if (profileEnabled) {
    await workerCommand('Profiler.enable');
    await workerCommand('Profiler.start');
  }
  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'right' });
  for (let step = 1; step <= 18; step++) {
    const before = await page.evaluate(() => window.__heapProbeFrames.length);
    await page.mouse.move(x + step * 4, y + step * 2);
    await page.waitForFunction(count => window.__heapProbeFrames.length > count,
      before, { timeout: 20000 });
    const frame = await page.evaluate(() => window.__heapProbeFrames.at(-1));
    samples.push({ step, frame, heap: await heap() });
  }
  await page.mouse.up({ button: 'right' });
  await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-busy') === 'false');
  const profile = profileEnabled ? (await workerCommand('Profiler.stop')).profile : null;
  if (profileEnabled) await workerCommand('Profiler.disable');
  samples.push({ step: 'released', heap: await heap() });
  assert.deepEqual(errors, []);
  const dirtyMotion = samples.filter(sample => sample.frame?.dirty &&
    sample.frame.kinds.includes('PointerMove'));
  assert.ok(dirtyMotion.length >= 8, 'Too few observed motion frames');
  const p90 = key => {
    const sorted = dirtyMotion.map(sample => sample.frame[key]).filter(Number.isFinite).sort((a, b) => a - b);
    return +sorted[Math.ceil(sorted.length * 0.9) - 1].toFixed(2);
  };
  const result = { ok: true, build: { version: expected.version,
    sourceRevision: expected.sourceRevision, sourceDirty: expected.sourceDirty,
    sha256: crypto.createHash('sha256').update(buildBytes).digest('hex') },
    chromeHeapFlagMiB: heapMb || null, samples, motionFrames: dirtyMotion.length,
    p90Ms: { reply: p90('replyMs'), scene: p90('treeMs'),
      pointer: p90('pointerMs'), traversal: p90('traversalMs') },
    errors, scope: 'Chrome Bend-worker between-frame heap and real drag; no physical RAM cap or GC attribution' };
  if (profile) {
    const nodes = new Map(profile.nodes.map(node => [node.id, node.callFrame]));
    const counts = new Map();
    for (const id of profile.samples || []) counts.set(id, (counts.get(id) || 0) + 1);
    result.cpuProfile = { samples: profile.samples?.length || 0,
      top: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([id, count]) => ({
        functionName: nodes.get(id)?.functionName, url: nodes.get(id)?.url,
        lineNumber: nodes.get(id)?.lineNumber, samples: count })) };
  }
  const output = path.join('.artifacts/bend2/v2-preview',
    `worker-heap-${Date.now()}-${process.pid}`);
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'result.json'), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' });
  if (profile) fs.writeFileSync(path.join(output, 'cpu.cpuprofile'), JSON.stringify(profile), { flag: 'wx' });
  console.log(JSON.stringify({ output, build: result.build, motionFrames: result.motionFrames,
    chromeHeapFlagMiB: result.chromeHeapFlagMiB, p90Ms: result.p90Ms,
    heapMiB: samples.map(item => item.heap.usedMiB), cpuProfile: result.cpuProfile, errors }));
} finally {
  if (cdp && sessionId) await cdp.send('Target.detachFromTarget', { sessionId }).catch(() => {});
  await context.close();
  await browser.close();
}
