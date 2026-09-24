import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';

const build = await Bun.build({
  entrypoints: [path.resolve('bend2/platform/browser/bitmap-surface.ts')],
  target: 'browser', format: 'iife', write: false,
});
if (!build.success) throw new Error(build.logs.map(String).join('\n'));
const bundledBitmapLibrary = await build.outputs[0].text();
const iifeEnd = bundledBitmapLibrary.lastIndexOf('})();');
if (iifeEnd < 0) throw new Error('Expected an IIFE bundle for the worker probe');
const bitmapLibrary = bundledBitmapLibrary.slice(0, iifeEnd) +
  'globalThis.BendBitmapSurface = { BitmapSurface };\n' + bundledBitmapLibrary.slice(iifeEnd);
const profileBuild = await Bun.build({
  entrypoints: [path.resolve('bend2/platform/browser/telemetry.ts')],
  target: 'browser', format: 'esm', write: false,
});
if (!profileBuild.success) throw new Error(profileBuild.logs.map(String).join('\n'));
const profileLibrary = await profileBuild.outputs[0].text();
const workerSource = `${bitmapLibrary}
const surface = new BendBitmapSurface.BitmapSurface();
const forcedFallback = new BendBitmapSurface.BitmapSurface(false);
self.onmessage = ({data}) => {
  const start = performance.now();
  const port = data.mode === 'fallback' ? forcedFallback : surface;
  const bitmap = port.convert(data.bytes, data.width, data.height);
  const workerMs = performance.now() - start;
  if (bitmap) self.postMessage({id:data.id, mode:'bitmap', width:data.width, height:data.height, workerMs, image:bitmap, bitmap}, [bitmap]);
  else self.postMessage({id:data.id, mode:'array-buffer', width:data.width, height:data.height, workerMs, image:data.bytes, bitmap:null}, [data.bytes]);
};`;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('about:blank');
  const profileChecks = await page.evaluate(async ({ profileLibrary }) => {
    const profileUrl = URL.createObjectURL(new Blob([profileLibrary], { type: 'text/javascript' }));
    const telemetry = await import(profileUrl);
    URL.revokeObjectURL(profileUrl);
    const capabilities = telemetry.measureBrowserCapabilities();
    const queriedMaxTextureEdge = telemetry.queryMaxTextureEdge();
    const fittedCanvas = document.createElement('canvas');
    fittedCanvas.style.cssText = 'width:640px;height:400px';
    document.body.append(fittedCanvas);
    const fittedCapabilities = telemetry.measureBrowserCapabilities(window, fittedCanvas);
    const p90 = new telemetry.RollingP90(4);
    for (const value of [4, 1, 2, 3, 100]) p90.add(value);
    const expectedEdge = Math.ceil(Math.max(innerWidth, innerHeight) * devicePixelRatio);
    return { capabilities, queriedMaxTextureEdge, fittedPhysicalEdge: fittedCapabilities.physicalEdge,
      expectedFittedEdge: Math.ceil(Math.max(fittedCanvas.getBoundingClientRect().width,
        fittedCanvas.getBoundingClientRect().height) * devicePixelRatio), p90: p90.value, expectedEdge };
  }, { profileLibrary });
  assert.equal(profileChecks.capabilities.schema, 'rift-bend-browser-profile/2');
  assert.equal(profileChecks.capabilities.physicalEdge, null);
  assert.equal(profileChecks.capabilities.viewportPhysicalEdge, profileChecks.expectedEdge);
  assert.equal(profileChecks.fittedPhysicalEdge, profileChecks.expectedFittedEdge);
  assert.equal(profileChecks.capabilities.maxTextureEdge, null);
  assert.ok(profileChecks.queriedMaxTextureEdge === null || Number.isSafeInteger(profileChecks.queriedMaxTextureEdge));
  assert.equal(profileChecks.capabilities.memoryMib, null);
  assert.equal(profileChecks.capabilities.cpu2048P90Ms, null);
  assert.equal(profileChecks.capabilities.cpu4096P90Ms, null);
  assert.equal(profileChecks.capabilities.gpuMeasured, false);
  assert.equal(profileChecks.capabilities.gpuP90Ms, null);
  assert.equal(profileChecks.p90, 100);
  const results = await page.evaluate(async ({ workerSource }) => {
    const workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
    const worker = new Worker(workerUrl);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('2D canvas unavailable');
    canvas.style.cssText = 'position:fixed;inset:0 auto auto 0;width:640px;height:400px;image-rendering:pixelated';
    document.body.append(canvas);
    const frames = [
      { mode: 'bitmap', width: 4, height: 3 },
      { mode: 'bitmap', width: 7, height: 5 }, // Resize the reusable worker surface.
      { mode: 'fallback', width: 5, height: 2 },
    ];
    const outcomes = [];
    for (let frameId = 0; frameId < frames.length; frameId++) {
      const frame = frames[frameId];
      const bytes = new Uint8Array(frame.width * frame.height * 4);
      for (let i = 0; i < bytes.length; i += 4) {
        const pixel = i / 4;
        bytes[i] = (pixel * 29 + frameId * 11) & 255;
        bytes[i + 1] = (pixel * 53 + 7) & 255;
        bytes[i + 2] = (pixel * 97 + frameId) & 255;
        bytes[i + 3] = 255;
      }
      const expected = [...bytes];
      const reply = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Worker transfer timed out')), 5000);
        const onError = event => {
          clearTimeout(timeout);
          reject(new Error(`Worker failed (${event.type}): ${String(event.message)} ${String(event.filename)}:${String(event.lineno)} ${String(event.error)}`));
        };
        const onMessage = event => {
          if (event.data.id !== frameId) return;
          clearTimeout(timeout); worker.removeEventListener('message', onMessage); worker.removeEventListener('error', onError); resolve(event.data);
        };
        worker.addEventListener('message', onMessage);
        worker.addEventListener('error', onError, { once: true });
        worker.postMessage({ ...frame, id: frameId, bytes: bytes.buffer }, [bytes.buffer]);
      });
      canvas.width = frame.width; canvas.height = frame.height;
      context.imageSmoothingEnabled = false;
      if (reply.bitmap) {
        context.drawImage(reply.bitmap, 0, 0, frame.width, frame.height);
        reply.bitmap.close();
      } else {
        context.putImageData(new ImageData(new Uint8ClampedArray(reply.image), frame.width, frame.height), 0, 0);
      }
      const actual = [...context.getImageData(0, 0, frame.width, frame.height).data];
      outcomes.push({ mode: reply.mode, exact: JSON.stringify(actual) === JSON.stringify(expected),
        imageAlias: !reply.bitmap || reply.image === reply.bitmap, bytes: actual.length });
    }
    const percentile = (values, quantile) => {
      const ordered = [...values].sort((a, b) => a - b);
      return +ordered[Math.ceil(ordered.length * quantile) - 1].toFixed(3);
    };
    async function sample(mode, width, height, id) {
      const bytes = new Uint8Array(width * height * 4);
      bytes.fill(255);
      const start = performance.now();
      const reply = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Benchmark frame timed out')), 10000);
        const onError = event => { clearTimeout(timeout); reject(new Error(`Benchmark worker failed: ${String(event.message)}`)); };
        const onMessage = event => {
          if (event.data.id !== id) return;
          clearTimeout(timeout); worker.removeEventListener('message', onMessage); worker.removeEventListener('error', onError); resolve(event.data);
        };
        worker.addEventListener('message', onMessage);
        worker.addEventListener('error', onError, { once: true });
        worker.postMessage({ id, mode, width, height, bytes: bytes.buffer }, [bytes.buffer]);
      });
      const replyMs = performance.now() - start;
      canvas.width = width; canvas.height = height;
      const presentStart = performance.now();
      if (reply.bitmap) {
        context.drawImage(reply.bitmap, 0, 0, width, height);
        reply.bitmap.close();
      } else {
        context.putImageData(new ImageData(new Uint8ClampedArray(reply.image), width, height), 0, 0);
      }
      const presentMs = performance.now() - presentStart;
      const frameReadyMs = await new Promise(resolve => requestAnimationFrame(() => resolve(performance.now() - start)));
      return { workerMs: reply.workerMs, replyMs, presentMs, frameReadyMs };
    }
    let benchmarkId = 10;
    const benchmarks = [];
    for (const [width, height] of [[1024, 800], [2048, 1024]]) {
      const timings = {
        bitmap: { worker: [], reply: [], present: [], frame: [] },
        fallback: { worker: [], reply: [], present: [], frame: [] },
      };
      for (let i = 0; i < 32; i++) {
        for (const mode of ['fallback', 'bitmap']) {
          const result = await sample(mode, width, height, benchmarkId++);
          if (i >= 4) {
            timings[mode].worker.push(result.workerMs);
            timings[mode].reply.push(result.replyMs);
            timings[mode].present.push(result.presentMs);
            timings[mode].frame.push(result.frameReadyMs);
          }
        }
      }
      for (const mode of ['fallback', 'bitmap']) benchmarks.push({ width, height, mode,
        measuredSamples: timings[mode].worker.length,
        workerMedianMs: percentile(timings[mode].worker, 0.5),
        workerP90Ms: percentile(timings[mode].worker, 0.9),
        workerToMainMedianMs: percentile(timings[mode].reply, 0.5),
        workerToMainP90Ms: percentile(timings[mode].reply, 0.9),
        presentationMedianMs: percentile(timings[mode].present, 0.5),
        presentationP90Ms: percentile(timings[mode].present, 0.9),
        nextRafMedianMs: percentile(timings[mode].frame, 0.5),
        nextRafP90Ms: percentile(timings[mode].frame, 0.9),
      });
    }
    worker.terminate();
    URL.revokeObjectURL(workerUrl);
    return { outcomes, benchmarks };
  }, { workerSource });
  assert.deepEqual(results.outcomes, [
    { mode: 'bitmap', exact: true, imageAlias: true, bytes: 48 },
    { mode: 'bitmap', exact: true, imageAlias: true, bytes: 140 },
    { mode: 'array-buffer', exact: true, imageAlias: true, bytes: 40 },
  ]);
  console.log(JSON.stringify({ ok: true, browser: await browser.version(), benchmarkScope: 'Local headless Chrome transport/staging comparison; next-rAF is a callback timing, not physical scan-out; GPU renderer and GPU performance are unverified.', checks: [
    'Transferable ImageBitmap preserves exact opaque RGBA pixels',
    'Reusable offscreen surface resizes without stale pixels',
    'Raw ArrayBuffer fallback preserves the same RGBA bytes',
    'The legacy truthy image marker aliases the bitmap for existing browser instrumentation',
    'Fitted canvas and viewport physical edges are measured separately',
    'Browser capability report leaves unmeasured CPU, memory and GPU values unknown',
  ], profile: { ...profileChecks.capabilities, maxTextureEdge: profileChecks.queriedMaxTextureEdge }, results }));
} finally {
  await browser.close();
}
