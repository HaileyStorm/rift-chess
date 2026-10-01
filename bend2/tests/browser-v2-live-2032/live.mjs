import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { browserV2Runtime } from '../browser-v2-runtime.mjs';
import { approvedStaticBuild } from './approved-static-build.mjs';
import {
  assertExactServedBuild, attemptFirstFrame, liveArtifactRoot, resolvePinnedBuildPath,
  validateDedicatedOrigin, validateLiveRunName, validatePackagePath,
  validateStaticBuild, validateStaticBuildPin,
} from './contract.mjs';

const runtimeKeys = ['BEND_LIVE_PLAYWRIGHT_ENTRY', 'BEND_LIVE_PLAYWRIGHT_SHA256',
  'BEND_LIVE_PLAYWRIGHT_PACKAGE_SHA256', 'BEND_LIVE_PLAYWRIGHT_TREE_SHA256',
  'BEND_LIVE_PLAYWRIGHT_CORE_DIR', 'BEND_LIVE_PLAYWRIGHT_CORE_TREE_SHA256',
  'BEND_LIVE_BROWSER_EXECUTABLE', 'BEND_LIVE_BROWSER_SHA256',
  'BEND_LIVE_BROWSER_VERSION'];

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const posix = value => value.replaceAll('\\', '/');

function assertPlainPath(file, kind, label) {
  const stat = fs.lstatSync(file);
  assert.ok(!stat.isSymbolicLink(), `${label} must not be a symlink`);
  if (kind === 'directory') assert.ok(stat.isDirectory(), `${label} must be a directory`);
  else assert.ok(stat.isFile(), `${label} must be a regular file`);
  assert.equal(fs.realpathSync(file), file, `${label} path is redirected`);
  return stat;
}

function assertIgnored(file, label) {
  const relative = posix(path.relative(repo, file));
  try {
    execFileSync('git', ['-C', repo, 'check-ignore', '--no-index', '--quiet', '--', relative],
      { stdio: 'ignore' });
  } catch { assert.fail(`${label} must be Git-ignored: ${relative}`); }
}

function assertAbsent(file, label) {
  try {
    fs.lstatSync(file);
    assert.fail(`${label} already exists`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function assertCachedRuntimeInputs(env) {
  const supplied = runtimeKeys.filter(key => env[key] !== undefined && env[key] !== '');
  assert.deepEqual(supplied, runtimeKeys,
    '2032-2 browser smoke requires the complete exact cached Playwright/Chromium binding');
}

async function fetchLocalFile(origin, relative) {
  const address = new URL(relative, origin);
  const response = await fetch(address, { cache: 'no-store', redirect: 'error' });
  assert.equal(response.status, 200, `missing served package file: ${relative}`);
  assert.equal(new URL(response.url).origin, origin.origin,
    `served package file escaped the dedicated origin: ${relative}`);
  return Buffer.from(await response.arrayBuffer());
}

function ensureArtifactRoot() {
  const directories = [path.join(repo, '.artifacts'), path.join(repo, '.artifacts', 'bend2'),
    path.join(repo, ...liveArtifactRoot.split('/'))];
  for (const directory of directories) {
    if (!fs.existsSync(directory)) fs.mkdirSync(directory);
    assertPlainPath(directory, 'directory', `browser artifact directory ${directory}`);
  }
  assertIgnored(directories.at(-1), '2032-2 browser artifact root');
  return directories.at(-1);
}

async function main() {
  const pin = validateStaticBuildPin(approvedStaticBuild);
  const origin = validateDedicatedOrigin(
    process.env.BEND_2032_LIVE_URL || 'http://127.0.0.1:4186/');
  const heapMb = process.env.BEND_2032_CHROME_HEAP_MB
    ? Number(process.env.BEND_2032_CHROME_HEAP_MB) : null;
  assert.ok(heapMb === null || (Number.isInteger(heapMb) && heapMb >= 128 && heapMb <= 1024));

  const buildPath = resolvePinnedBuildPath(repo, pin);
  assertIgnored(path.dirname(buildPath), 'pinned static build directory');
  assertIgnored(buildPath, 'pinned static build manifest');
  assertPlainPath(buildPath, 'file', 'pinned static build manifest');
  const localBuildBytes = fs.readFileSync(buildPath);
  const build = validateStaticBuild(localBuildBytes, pin);
  const servedBuildBytes = await fetchLocalFile(origin, 'build.json');
  assertExactServedBuild(localBuildBytes, servedBuildBytes);
  for (const [name, expected] of Object.entries(build.files)) {
    validatePackagePath(name);
    const bytes = await fetchLocalFile(origin, name);
    assert.equal(sha256(bytes), expected, `served package bytes differ: ${name}`);
  }
  const buildBinding = {
    path: pin.path,
    version: build.version,
    rawSha256: pin.rawSha256,
    bundleSourceRevision: build.bundleSourceRevision,
    bundleSourceTree: build.bundleSourceTree,
    packerRevision: build.packerRevision,
    packerTree: build.packerTree,
    scope: build.scope,
    checkedFiles: Object.keys(build.files).length,
  };

  assertCachedRuntimeInputs(process.env);
  const runtime = await browserV2Runtime();
  assert.equal(runtime.provenance.mode, 'explicit-host-local-cache',
    '2032-2 browser smoke does not accept an unpinned system browser');
  assert.equal(runtime.provenance.playwrightVersion, '1.63.0');
  assert.ok(runtime.expectedVersion, 'cached Chromium version is not independently pinned');
  assert.equal(typeof runtime.chromium.launchPersistentContext, 'function');

  const artifactRoot = ensureArtifactRoot();
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const runName = validateLiveRunName(process.env.BEND_2032_LIVE_RUN ||
    `run-${stamp}-${process.pid}-${randomUUID()}`);
  const artifact = path.join(artifactRoot, runName);
  assertIgnored(artifact, '2032-2 browser run artifacts');
  assertAbsent(artifact, '2032-2 browser run directory');
  fs.mkdirSync(artifact);
  assertPlainPath(artifact, 'directory', '2032-2 browser run directory');
  const profile = path.join(artifact, 'profile');
  assertAbsent(profile, 'persistent browser profile');

  const launchOptions = { ...runtime.launch, headless: true,
    ...(heapMb ? { args: [`--js-flags=--max-old-space-size=${heapMb}`] } : {}) };
  const context = await runtime.chromium.launchPersistentContext(profile, {
    ...launchOptions, viewport: { width: 1280, height: 800 },
  });
  try {
    const browser = context.browser();
    assert.ok(browser, 'persistent browser context has no browser');
    const browserVersion = browser.version();
    assert.equal(browserVersion, runtime.expectedVersion,
      'cached browser version differs from independently reported version');
    const page = context.pages()[0] ?? await context.newPage();
    const errors = [];
    const requestFailures = [];
    const networkViolations = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('crash', () => errors.push('page crashed'));
    page.on('request', request => {
      const address = new URL(request.url());
      requests.push({ method: request.method(), pathname: address.pathname });
    });
    page.on('requestfailed', request => requestFailures.push({
      pathname: new URL(request.url()).pathname,
      failure: request.failure()?.errorText ?? 'unknown',
    }));
    await page.route('**/*', async route => {
      const address = new URL(route.request().url());
      if (address.origin !== origin.origin) {
        networkViolations.push({ method: route.request().method(),
          origin: address.origin, pathname: address.pathname });
        await route.abort('blockedbyclient');
      } else await route.continue();
    });
    await page.addInitScript(() => {
      const NativeWorker = window.Worker;
      window.__frames = [];
      window.__events = [];
      window.__refinements = [];
      window.__workerSignals = [];
      window.addEventListener('rift-bend-sprite-refined', event =>
        window.__refinements.push({ at: performance.now(), metrics: event.detail,
          revision: window.__shown?.revision ?? null,
          view: window.__shown?.view ? { yaw: window.__shown.view.yaw,
            pitch: window.__shown.view.pitch, zoom: window.__shown.view.zoom } : null }));
      window.Worker = class extends NativeWorker {
        requests = new Map();
        constructor(...args) {
          super(...args);
          window.__workerSignals.push({ kind: 'constructed' });
          this.addEventListener('error', event => window.__workerSignals.push({
            kind: 'error', message: String(event.message).slice(0, 500),
          }));
          this.addEventListener('messageerror', () => window.__workerSignals.push({ kind: 'messageerror' }));
          this.addEventListener('message', event => {
            const message = event.data;
            if (['ready', 'fault', 'frame'].includes(message?.kind)) window.__workerSignals.push({
              kind: message.kind, id: message.id ?? null,
              ...(message.kind === 'fault' ? { message: String(message.message).slice(0, 500) } : {}),
            });
            if (message.kind !== 'frame') return;
            const request = this.requests.get(message.id);
            window.__frames.push({ id: message.id, renderMs: message.renderMs,
              portMs: message.portMs, pixelMs: message.pixelMs,
              replyMs: request ? performance.now() - request.at : null,
              kinds: request?.kinds || [], dirty: !!message.image, pixelStats: message.pixelStats,
              treeMs: message.treeMs, traversalMs: message.traversalMs, sceneTimes: message.sceneTimes });
            if (request) this.requests.delete(message.id);
            if (message.image) window.__shown = message.presentation;
          });
        }
        postMessage(message, ...transfer) {
          if (message.kind === 'events') {
            const events = message.events || [];
            window.__events.push(...events.map(event => ({ ...event })));
            this.requests.set(message.id, { at: performance.now(), kinds: events.map(event => event.$) });
          }
          super.postMessage(message, ...transfer);
        }
      };
    });
    function p90(values) {
      const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
      return sorted.length ? +sorted[Math.ceil(sorted.length * 0.9) - 1].toFixed(2) : null;
    }
    async function settled() {
      await page.waitForFunction(() => document.querySelector('canvas')?.dataset.ready === 'true' &&
        document.querySelector('canvas')?.getAttribute('aria-busy') === 'false' && window.__shown,
      null, { timeout: 60000 });
    }
    async function canvasPoint(x, y) {
      const box = await page.locator('canvas').boundingBox();
      const { width, height } = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
      return { x: box.x + x * box.width / width, y: box.y + y * box.height / height };
    }
    async function control(id) {
      const rect = await page.locator(`[data-control="${id}"]`)
        .evaluate(button => JSON.parse(button.dataset.rect));
      const point = await canvasPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await page.mouse.click(point.x, point.y);
      await settled();
    }
    async function squarePoint(file, rank, piece = false) {
      const shown = await page.evaluate(() => window.__shown);
      const view = shown.view, yaw = view.yaw * Math.PI / 180;
      const scale = 45 / (Math.abs(Math.cos(yaw)) + Math.abs(Math.sin(yaw))) * view.zoom / 100;
      const u = file - 3.5, r = 3.5 - rank;
      const x = 256 + scale * (Math.cos(yaw) * u - Math.sin(yaw) * r);
      const y = 274 + scale * Math.sin(view.pitch * Math.PI / 180) *
        (Math.sin(yaw) * u + Math.cos(yaw) * r) - (piece ? 8 : 0);
      return canvasPoint(shown.plan.board.x + x * shown.plan.scale,
        shown.plan.board.y + y * shown.plan.scale);
    }

    await attemptFirstFrame(
      () => page.goto(origin.href, { waitUntil: 'networkidle' }),
      settled,
      async error => {
      const diagnostic = { schema: 'rift-bend-first-frame-failure/1', buildBinding,
        browserVersion, error: String(error).slice(0, 500),
        errors: errors.slice(-16).map(value => String(value).slice(0, 500)),
        requestFailures: requestFailures.slice(-16).map(({ pathname, failure }) => ({
          pathname: pathname.slice(0, 200), failure: String(failure).slice(0, 200),
        })), networkViolations: networkViolations.slice(-16) };
      try {
        diagnostic.page = await page.evaluate(() => {
          const canvas = document.querySelector('canvas');
          return { canvas: canvas ? { ready: canvas.dataset.ready ?? null,
            busy: canvas.getAttribute('aria-busy'), frame: canvas.dataset.frame ?? null,
            width: canvas.width, height: canvas.height, presentationMode: canvas.dataset.presentationMode ?? null,
          } : null, status: document.querySelector('[role="status"]')?.textContent?.slice(0, 500) ?? null,
          shown: !!window.__shown, frames: window.__frames?.length ?? null,
          events: window.__events?.length ?? null, workerSignals: window.__workerSignals?.slice(-16) ?? null };
        });
      } catch (diagnosticError) { diagnostic.pageError = String(diagnosticError).slice(0, 500); }
      try {
        await page.screenshot({ path: path.join(artifact, 'first-frame-failure.png'), timeout: 10000 });
        diagnostic.screenshot = 'first-frame-failure.png';
        diagnostic.screenshotSha256 = sha256(fs.readFileSync(path.join(artifact, diagnostic.screenshot)));
      } catch (screenshotError) { diagnostic.screenshotError = String(screenshotError).slice(0, 500); }
      try {
        fs.writeFileSync(path.join(artifact, 'first-frame-failure.json'),
          `${JSON.stringify(diagnostic)}\n`, { flag: 'wx' });
      } catch (writeError) { diagnostic.writeError = String(writeError).slice(0, 500); }
      console.error(JSON.stringify(diagnostic));
    });
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.spriteRoundTripMs,
      null, { timeout: 30000 });
    const initial = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width,
      height: canvas.height, mode: canvas.dataset.presentationMode,
      summary: canvas.getAttribute('aria-label') }));
    assert.deepEqual([initial.width, initial.height], [1024, 640]);
    await page.screenshot({ path: path.join(artifact, 'browser-v2-desktop.png') });

    const knight = await squarePoint(6, 0, true);
    await page.mouse.click(knight.x, knight.y);
    try {
      await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Knight g1'),
        null, { timeout: 8000 });
    } catch (error) {
      console.log(JSON.stringify({ knight, shown: await page.evaluate(() => {
        const { view, menu, plan } = window.__shown; return { view, menu, plan: { board: plan.board, scale: plan.scale } };
      }),
        summary: await page.locator('canvas').getAttribute('aria-label'),
        status: await page.locator('[role=status]').textContent(),
        events: await page.evaluate(() => window.__events.slice(-4)), errors },
      (_key, value) => typeof value === 'bigint' ? String(value) : value));
      throw error;
    }
    await settled();
    await page.screenshot({ path: path.join(artifact, 'browser-v2-selected.png') });
    await page.mouse.click(knight.x, knight.y);
    await page.waitForFunction(() => !document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Knight g1'));

    const pawn = await squarePoint(4, 1, true);
    await page.mouse.click(pawn.x, pawn.y);
    await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Pawn e2'));
    const destination = await squarePoint(4, 3);
    await page.mouse.click(destination.x, destination.y);
    await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Black to move'),
      null, { timeout: 20000 });
    await page.waitForTimeout(1100);
    await settled();
    const committed = await page.evaluate(() => {
      const text = localStorage.getItem('rift-bend-lab/save-v1');
      return text ? JSON.parse(text) : null;
    });
    assert.equal(committed?.schema, 'rift-bend-record/1');
    assert.equal(committed.commands?.length, 1,
      'fresh hotseat game did not persist exactly one action');
    assert.equal(committed.commands[0].$, 'MoveCommand');
    assert.equal(committed.commands[0].action, 3980,
      'committed action is not e2-e4');
    await page.screenshot({ path: path.join(artifact, 'browser-v2-after-e4.png') });

    if (process.env.BEND_2032_LIVE_WARM === '1') {
      await control(1); await control(23); await control(28);
      await page.waitForFunction(() => {
        const value = localStorage.getItem('rift-bend-lab/preferences-v1');
        return value && JSON.parse(value).theme === 1;
      });
    }

    const startEvent = await page.evaluate(() => window.__events.length);
    const refinementBeforeOrbit = await page.evaluate(() => window.__refinements.length);
    const beforeOrbit = await page.evaluate(() => ({ revision: window.__shown.revision,
      view: { yaw: window.__shown.view.yaw, pitch: window.__shown.view.pitch,
        zoom: window.__shown.view.zoom } }));
    const orbit = await squarePoint(4, 3);
    await page.mouse.move(orbit.x, orbit.y);
    await page.mouse.down({ button: 'right' });
    for (let step = 1; step <= 16; step++) await page.mouse.move(orbit.x + step * 3, orbit.y + step * 2);
    await settled();
    await page.screenshot({ path: path.join(artifact, 'browser-v2-orbit-motion.png') });
    await page.mouse.up({ button: 'right' });
    await settled();
    const presentedAfterOrbit = await page.evaluate(() => ({ revision: window.__shown.revision,
      view: { yaw: window.__shown.view.yaw, pitch: window.__shown.view.pitch,
        zoom: window.__shown.view.zoom } }));
    assert.equal(presentedAfterOrbit.revision, beforeOrbit.revision,
      'orbit unexpectedly changed the game revision');
    assert.ok(presentedAfterOrbit.view.yaw !== beforeOrbit.view.yaw ||
      presentedAfterOrbit.view.pitch !== beforeOrbit.view.pitch,
    'right-button orbit did not change the presented view');
    try {
      await page.waitForFunction(before => {
        const shown = window.__shown;
        return window.__refinements.slice(before).some(item =>
          String(item.revision) === String(shown.revision) &&
          item.view?.yaw === shown.view.yaw && item.view?.pitch === shown.view.pitch &&
          item.view?.zoom === shown.view.zoom);
      },
        refinementBeforeOrbit, { timeout: 30000 });
    } catch (error) {
      console.log(JSON.stringify(await page.evaluate(() => ({
        refinements: window.__refinements, lastFrames: window.__frames.slice(-8),
        lastEvents: window.__events.slice(-8), status: document.querySelector('[role=status]')?.textContent,
        spriteMs: document.querySelector('canvas')?.dataset.spriteRoundTripMs,
        busy: document.querySelector('canvas')?.getAttribute('aria-busy'),
      })), null, 2));
      throw error;
    }
    const events = await page.evaluate(start => window.__events.slice(start), startEvent);
    const down = events.findIndex(event => event.$ === 'PointerDown' && event.button === 2);
    const up = events.findIndex((event, index) => index > down && event.$ === 'PointerUp' && event.button === 2);
    assert.ok(down >= 0 && up > down);
    assert.ok(events.slice(down + 1, up).some(event => event.$ === 'PointerMove'));
    const afterOrbit = await page.evaluate(before => ({ revision: window.__shown.revision,
      view: { yaw: window.__shown.view.yaw, pitch: window.__shown.view.pitch,
        zoom: window.__shown.view.zoom }, refinements: window.__refinements.slice(before) }),
    refinementBeforeOrbit);
    assert.deepEqual({ revision: afterOrbit.revision, view: afterOrbit.view },
      presentedAfterOrbit, 'presented orbit view changed after its refinement wait');
    const matchingRefinements = afterOrbit.refinements.filter(item =>
      String(item.revision) === String(afterOrbit.revision) &&
      item.view?.yaw === afterOrbit.view.yaw && item.view?.pitch === afterOrbit.view.pitch &&
      item.view?.zoom === afterOrbit.view.zoom);
    assert.ok(matchingRefinements.length > 0,
      'no sprite refinement was presented for the new orbit view');
    await page.screenshot({ path: path.join(artifact, 'browser-v2-orbit.png') });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.querySelector('canvas')?.width === 512 &&
      document.querySelector('canvas')?.height === 1024 && document.querySelector('canvas')?.getAttribute('aria-busy') === 'false');
    await page.screenshot({ path: path.join(artifact, 'browser-v2-mobile.png') });
    const mobileKnight = await squarePoint(6, 7, true);
    await page.mouse.click(mobileKnight.x, mobileKnight.y);
    await page.waitForFunction(() => document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Knight g8'));
    await page.mouse.click(mobileKnight.x, mobileKnight.y);
    await page.waitForFunction(() => !document.querySelector('canvas')?.getAttribute('aria-label')?.includes('Knight g8'));
    const pref = await canvasPoint(284, 26);
    await page.mouse.click(pref.x, pref.y);
    await page.waitForFunction(() => window.__shown?.menu !== 0, null, { timeout: 8000 });
    await page.screenshot({ path: path.join(artifact, 'browser-v2-mobile-settings.png') });
    const mobile = await page.locator('canvas').evaluate(canvas => ({ width: canvas.width,
      height: canvas.height, mode: canvas.dataset.presentationMode,
      profile: canvas.dataset.browserProfile ? JSON.parse(canvas.dataset.browserProfile) : null }));
    assert.deepEqual([mobile.width, mobile.height], [512, 1024]);
    mobile.menu = await page.evaluate(() => window.__shown.menu);
    assert.ok((await page.locator('#accessibility button').allTextContents()).includes('CLOSE'));
    assert.deepEqual(errors, []);
    assert.deepEqual(requestFailures, [], 'browser package requests failed');
    assert.deepEqual(networkViolations, [], 'page attempted non-loopback network access');
    const qualityProbes = await page.evaluate(() => window.__events.filter(event => event.$ === 'QualityProbe'));
    assert.ok(qualityProbes.length >= 1, 'host reports a real eight-frame timing window to Bend');
    assert.ok(qualityProbes.every(event => event.sampleCount === 8 && event.measuredScale === 1));
    const frames = await page.evaluate(() => window.__frames);
    const refinements = await page.evaluate(() => window.__refinements);
    if (process.env.BEND_2032_EXPECT_COMPACT_MOTION === '1') {
      const fullMotion = frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty &&
        frame.pixelStats.visited > 50000);
      assert.ok(fullMotion.length >= 1, 'a real pointer drag presented the 256px Bend motion image');
      assert.ok(fullMotion.every(frame => frame.pixelStats.visited < 150000),
        'the 512px board slot reused the compact 256px motion tree');
    }
    const screenshotNames = ['browser-v2-desktop.png', 'browser-v2-selected.png',
      'browser-v2-after-e4.png', 'browser-v2-orbit-motion.png',
      'browser-v2-orbit.png', 'browser-v2-mobile.png', 'browser-v2-mobile-settings.png'];
    const screenshots = Object.fromEntries(screenshotNames.map(name => {
      const bytes = fs.readFileSync(path.join(artifact, name));
      return [name, { bytes: bytes.length, sha256: sha256(bytes) }];
    }));
    const result = JSON.stringify({ ok: true, url: origin.href, heapMb, buildBinding,
      browserRuntime: { ...runtime.provenance, browserVersion }, initial, mobile,
      mobileInput: 'narrow-viewport mouse; touch and physical device untested',
      hotseat: { persistedAction: committed.commands[0].action,
        savedCommands: committed.commands.length },
      orbit: { before: beforeOrbit, after: { revision: afterOrbit.revision,
        view: afterOrbit.view }, matchingRefinements: matchingRefinements.length },
      screenshots, requests: requests.length, requestFailures, networkViolations,
      warm: process.env.BEND_2032_LIVE_WARM === '1', refinements,
      qualityProbes: qualityProbes.map(({ physicalEdge, sampleCount, measuredScale,
        mainP90Us, workerP90Us }) => ({ physicalEdge, sampleCount, measuredScale,
        mainP90Us, workerP90Us })),
      drag: { events: events.length,
        renderedFrames: frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty).length,
        renderP90Ms: p90(frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty).map(frame => frame.renderMs)),
        portP90Ms: p90(frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty).map(frame => frame.portMs)),
        pixelP90Ms: p90(frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty).map(frame => frame.pixelMs)),
        replyP90Ms: p90(frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty).map(frame => frame.replyMs)),
        samples: frames.filter(frame => frame.kinds.includes('PointerMove') && frame.dirty).map(frame => ({
          pixelMs: +frame.pixelMs.toFixed(2), treeMs: +frame.treeMs.toFixed(2),
          traversalMs: +frame.traversalMs.toFixed(2), sceneTimes: frame.sceneTimes,
          ...frame.pixelStats })) }, errors }, (_key, value) => typeof value === 'bigint' ? String(value) : value);
    fs.writeFileSync(path.join(artifact, 'result.json'), `${result}\n`, { flag: 'wx' });
    console.log(result);
  } finally {
    await context.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(error => {
    console.error(error?.stack ?? String(error));
    process.exitCode = 1;
  });
