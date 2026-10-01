import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequiredPool, requiredFanoutProtocol } from './pool.mjs';

process.env.BEND_NO_TELEMETRY = '1';
let pageFetchCalls = 0;
globalThis.fetch = async () => {
  pageFetchCalls += 1;
  throw new Error('network access disabled by phase-seven gate');
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../..');
const scout = path.join(repo, '.artifacts/toolchains/bend-2.0.32-scout');
const canonical = path.join(repo, '.artifacts/toolchains/bend');
const fixture = path.join(here, 'fixtures/parallel-fanout.bend');
const noSuffixFixture = path.join(repo,
  'bend2/toolchain-patches/004-web-workers/rebase-2032/fixtures/selected-root.bend');
const policiesFixture = path.join(repo,
  'bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/fixtures/policies.bend');
const selectedAdapter = path.join(repo,
  'bend2/toolchain-patches/004-web-workers/rebase-2032/selected-module.mjs');
const testFile = fileURLToPath(import.meta.url);
const poolFile = path.join(here, 'pool.mjs');
const browserWorkerFile = path.join(here, 'fanout-browser-worker.mjs');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pristine = '573002f01ec6c52416d44489543f69a9625facf8';
const pin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const syncJsSha256 = '3c99dcd84414a057fce65edb45dd69d600e6b57bee49aec23e7333130a510a1d';
const syncCSha256 = '9cb68b124aa2865f21a3c1cdb633bf691d45d1f06a8eea496869d2585750a009';
const phase6CompSha256 = '0f2366677b546498b137b0d08684a36230a72f4df4cabca27293076fb78faa11';
const fixtureSha256 = '12073787c66bf2300cd11f81e80f4a29ad56845616a49c313f5a93d0dcf3c43c';
const patchStack = [
  ['001-arity/rebase-2032/0001-arity-diagnostics.patch',
    '98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db'],
  ['002-layout/rebase-2032/0002-after-001-2.0.32.patch',
    '2ed566176148cc1e064d2dae4c806c7912d557e38570ecfa5f47ddd0d78d395d'],
  ['005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch',
    '99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4'],
  ['004-web-workers/rebase-2032/phase2/0004-parser-plan-after-005-2.0.32.patch',
    'bfdd64270c7714376c64a0306a58892d8a872d96f9d4bace0be091bf894fdb13'],
  ['004-web-workers/rebase-2032/phase5-percall/0004-percall-u32-after-phase2-2.0.32.patch',
    '06e956f9f69c8c4a5d3dc0cd5f55c2633ab276f3cd99050e0ec9e36a2afa40be'],
  ['004-web-workers/rebase-2032/phase6-two-u32/0006-two-u32-after-phase5-2.0.32.patch',
    '89da56c0062c07d2a14b580c0a363b053949eae76456697c7eed65bcdeedf468'],
].map(([relative, hash]) => [path.join(repo, 'bend2/toolchain-patches', relative), hash]);
const inputPaths = [fixture, testFile, poolFile, browserWorkerFile, noSuffixFixture,
  policiesFixture, selectedAdapter, path.join(repo, 'package.json'), path.join(repo, 'package-lock.json'),
  path.join(scout, 'bend2/base.bend'), ...patchStack.map(([file]) => file)];

function git(directory, ...args) {
  return execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8' })
    .replace(/\r\n/g, '\n').trimEnd();
}

function snapshot() {
  const result = Object.fromEntries(inputPaths.map((file) => [
    path.relative(repo, file).replaceAll('\\', '/'), sha(fs.readFileSync(file)),
  ]));
  for (const [file, expected] of patchStack) {
    assert.equal(result[path.relative(repo, file).replaceAll('\\', '/')], expected,
      `ordered source patch changed: ${file}`);
  }
  return result;
}

function assertCheckouts() {
  assert.equal(git(scout, 'rev-parse', 'HEAD'), pristine);
  assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
  assert.equal(git(canonical, 'rev-parse', 'HEAD'), pin);
  assert.equal(git(canonical, 'status', '--porcelain', '--untracked-files=all'), '');
}

function applyPatch(directory, file) {
  execFileSync('git', ['-C', directory, 'apply', '--check', file], { stdio: 'pipe' });
  execFileSync('git', ['-C', directory, 'apply', file], { stdio: 'pipe' });
}

async function loadBook(Bend, file) {
  const book = Bend.book_nil();
  try {
    await Bend.book_load(book, file.replaceAll('\\', '/'), '', new Map());
    Bend.book_valid(book);
  } catch (error) {
    throw new Error((error?.$ === 'Err' ? Bend.err_show(error)
      : error?.message ?? String(error)).slice(0, 1800));
  }
  assert.equal(book.hols, 0);
  return book;
}

function validFakeReply(request, workerId, value) {
  return { type: 'result', protocol: requiredFanoutProtocol,
    requestId: request.requestId, invocationId: request.invocationId,
    regionId: request.regionId, sourceSlot: request.sourceSlot,
    helperId: request.helperId, workerId, ok: true, value,
    workerScope: true, fetchCalls: 0 };
}

class FakeWorker {
  constructor(workerId, endpoints, mode = 'manual') {
    this.workerId = workerId;
    this.endpoints = endpoints;
    this.mode = mode;
    this.requests = [];
    this.completed = new Set();
    this.terminated = false;
    endpoints.push(this);
  }

  postMessage(data) {
    if (this.terminated) throw new Error('post to terminated fake Worker');
    if (data.type === 'hello') {
      queueMicrotask(() => this.onmessage?.({ data: { type: 'ready',
        protocol: requiredFanoutProtocol, workerId: this.workerId, workerScope: true } }));
      return;
    }
    this.requests.push(data);
    if (this.mode === 'automatic') {
      setTimeout(() => this.deliverTask(data), data.sourceSlot === 0 ? 12 : 0);
    } else if (this.mode === 'fail') {
      queueMicrotask(() => this.onmessage?.({ data: { type: 'result',
        protocol: requiredFanoutProtocol, requestId: data.requestId,
        invocationId: data.invocationId, regionId: data.regionId,
        sourceSlot: data.sourceSlot, helperId: data.helperId, workerId: this.workerId,
        ok: false, error: 'fixture-required-task-failure', workerScope: true, fetchCalls: 0 } }));
    }
  }

  deliverTask(request) {
    this.completed.add(request.requestId);
    const value = request.helperId === 'left_leaf' ? request.args[0] : request.args[1];
    this.onmessage?.({ data: validFakeReply(request, this.workerId, value) });
  }

  deliver(request) { this.deliverTask(request); }

  terminate() {
    this.terminated = true;
  }
}

async function nextTurn() {
  await new Promise((resolve) => setImmediate(resolve));
}

async function deterministicRuntimeGate() {
  const endpoints = [];
  const pool = await createRequiredPool({ size: 3, maxQueue: 12,
    maxJobsPerRegion: 12, taskTimeoutMs: 2000,
    helpers: { left_leaf: { arity: 2 }, right_leaf: { arity: 2 } },
    workerFactory: (workerId) => new FakeWorker(workerId, endpoints) });
  assert.equal(pool.stats().ready, 3);

  let neverRuns = 0;
  const primary = pool.runRegion({ cap: 2, regionId: 'phase7-primary', tasks: [
    { slot: 0, policy: 'require', helperId: 'left_leaf', args: [40, 2] },
    { slot: 1, policy: 'require', helperId: 'right_leaf', args: [40, 2] },
    { slot: 2, policy: 'never', local: () => { neverRuns += 1; return 40; } },
    { slot: 3, policy: 'require', helperId: 'right_leaf', args: [9, 5] },
    { slot: 4, policy: 'require', helperId: 'left_leaf', args: [7, 6] },
  ] });
  await nextTurn();
  assert.equal(endpoints[0].requests.length, 1);
  assert.equal(endpoints[1].requests.length, 1);
  assert.equal(endpoints[2].requests.length, 0,
    'the @2 region cap limits distinct participating Worker IDs, not job count');
  const firstFast = endpoints[1].requests[0];
  assert.equal(firstFast.sourceSlot, 1);
  endpoints[1].deliver(firstFast);
  await nextTurn();
  const next = endpoints[1].requests.at(-1);
  assert.equal(next.sourceSlot, 3);
  endpoints[1].deliver(next);
  await nextTurn();
  const finalOnSecond = endpoints[1].requests.at(-1);
  assert.equal(finalOnSecond.sourceSlot, 4);
  endpoints[1].deliver(finalOnSecond);
  endpoints[0].deliver(endpoints[0].requests[0]);
  const result = await primary;
  assert.deepEqual(result.values, [40, 2, 40, 5, 7],
    'results are restored to source slots despite out-of-order completion');
  assert.equal(neverRuns, 1);
  assert.equal(result.execution[2].route, 'local');
  assert.equal(result.execution[2].workerId, null);
  assert.deepEqual(result.workerIds, [0, 1]);
  assert.ok(result.workerIds.length <= result.cap);
  assert.equal(pool.stats().dispatched, 4);
  assert.equal(pool.stats().busy, 0);

  const smaller = pool.runRegion({ cap: 1, regionId: 'invocation-one', tasks: [
    { slot: 0, policy: 'require', helperId: 'left_leaf', args: [1, 2] },
    { slot: 1, policy: 'require', helperId: 'right_leaf', args: [3, 4] },
  ] });
  const larger = pool.runRegion({ cap: 2, regionId: 'invocation-two', tasks: [
    { slot: 0, policy: 'require', helperId: 'left_leaf', args: [5, 6] },
    { slot: 1, policy: 'require', helperId: 'right_leaf', args: [7, 8] },
    { slot: 2, policy: 'require', helperId: 'left_leaf', args: [9, 10] },
  ] });
  await nextTurn();
  const inFlight = endpoints.flatMap((endpoint) => endpoint.requests
    .filter((request) => !endpoint.completed.has(request.requestId)));
  const reqA = endpoints[0].requests.at(-1);
  const reqB1 = endpoints[1].requests.at(-1);
  const reqB2 = endpoints[2].requests.at(-1);
  assert.equal(reqA.regionId, 'invocation-one');
  assert.equal(reqB1.regionId, 'invocation-two');
  assert.equal(reqB2.regionId, 'invocation-two');
  endpoints[2].deliver(reqB2);
  endpoints[1].deliver(reqB1);
  await nextTurn();
  const endpointB3 = endpoints.find((endpoint) => endpoint.requests.some((request) =>
    request.regionId === 'invocation-two' && !endpoint.completed.has(request.requestId)));
  assert.ok(endpointB3, 'third sibling did not reuse one of the region\'s capped participants');
  const reqB3 = endpointB3.requests.findLast((request) => request.regionId === 'invocation-two'
    && !endpointB3.completed.has(request.requestId));
  assert.equal(reqB3.regionId, 'invocation-two');
  endpointB3.deliver(reqB3);
  endpoints[0].deliver(reqA);
  await nextTurn();
  const reqA2 = endpoints[0].requests.findLast((request) => request.regionId === 'invocation-one'
    && !endpoints[0].completed.has(request.requestId));
  assert.equal(reqA2.regionId, 'invocation-one');
  endpoints[0].deliver(reqA2);
  const [smallResult, largeResult] = await Promise.all([smaller, larger]);
  assert.ok(smallResult.workerIds.length <= 1);
  assert.ok(largeResult.workerIds.length <= 2);
  assert.deepEqual(smallResult.values, [1, 4]);
  assert.deepEqual(largeResult.values, [5, 8, 9]);
  assert.ok(inFlight.length >= 3);
  await pool.close();
  assert.equal(pool.stats().closed, true);
  assert.ok(endpoints.every((endpoint) => endpoint.terminated));

  const failedEndpoints = [];
  const failing = await createRequiredPool({ size: 1, maxQueue: 2,
    helpers: { left_leaf: { arity: 2 } }, workerFactory: (id) => new FakeWorker(id, failedEndpoints, 'fail') });
  let forbiddenFallbackRuns = 0;
  await assert.rejects(failing.runRegion({ cap: 1, tasks: [
    { slot: 0, policy: 'require', helperId: 'left_leaf', args: [10, 20],
      local: () => { forbiddenFallbackRuns += 1; return 10; } },
  ] }), (error) => error.code === 'task_policy');
  assert.equal(forbiddenFallbackRuns, 0,
    'required task records reject an implicit local-fallback hook');
  await assert.rejects(failing.runRegion({ cap: 2, tasks: [
    { slot: 0, policy: 'require', helperId: 'left_leaf', args: [10, 20] },
  ] }), (error) => error.code === 'worker_task');
  await failing.close();

  const queueEndpoints = [];
  const bounded = await createRequiredPool({ size: 1, maxQueue: 1,
    helpers: { left_leaf: { arity: 2 } }, workerFactory: (id) => new FakeWorker(id, queueEndpoints) });
  const active = bounded.runRegion({ cap: 1, regionId: 'queue-active', tasks: [
    { slot: 0, policy: 'require', helperId: 'left_leaf', args: [11, 99] },
  ] });
  await nextTurn();
  const waiting = bounded.runRegion({ cap: 1, regionId: 'queue-one', tasks: [
    { slot: 0, policy: 'require', helperId: 'left_leaf', args: [12, 99] },
  ] });
  assert.equal(bounded.stats().queued, 1);
  await assert.rejects(bounded.runRegion({ cap: 1, regionId: 'queue-overflow', tasks: [
    { slot: 0, policy: 'require', helperId: 'left_leaf', args: [13, 99] },
  ] }), (error) => error.code === 'queue_budget');
  assert.equal(bounded.stats().queued, 1);
  queueEndpoints[0].deliver(queueEndpoints[0].requests[0]);
  const first = await active;
  await nextTurn();
  queueEndpoints[0].deliver(queueEndpoints[0].requests[1]);
  const second = await waiting;
  assert.deepEqual([first.values[0], second.values[0]], [11, 12]);
  assert.equal(bounded.stats().dispatched, 2);
  await bounded.close();

  const cancelEndpoints = [];
  const cancellable = await createRequiredPool({ size: 1, maxQueue: 2,
    helpers: { left_leaf: { arity: 2 } }, workerFactory: (id) => new FakeWorker(id, cancelEndpoints) });
  const abort = new AbortController();
  const cancelled = cancellable.runRegion({ cap: 1, regionId: 'cancel-before-stale', signal: abort.signal,
    tasks: [{ slot: 0, policy: 'require', helperId: 'left_leaf', args: [21, 99] }] });
  await nextTurn();
  const stale = cancelEndpoints[0].requests[0];
  abort.abort();
  await assert.rejects(cancelled, (error) => error.code === 'aborted');
  const survivor = cancellable.runRegion({ cap: 1, regionId: 'after-cancel', tasks: [
    { slot: 0, policy: 'require', helperId: 'left_leaf', args: [22, 99] },
  ] });
  assert.equal(cancellable.stats().queued, 1);
  cancelEndpoints[0].deliver(stale);
  await nextTurn();
  const current = cancelEndpoints[0].requests.at(-1);
  assert.notEqual(current.requestId, stale.requestId);
  cancelEndpoints[0].deliver(stale);
  assert.equal(cancellable.stats().busy, 1,
    'a duplicate stale response cannot release or settle a newer request');
  cancelEndpoints[0].deliver(current);
  assert.deepEqual((await survivor).values, [22]);
  assert.equal(cancellable.stats().staleResponses, 1);
  assert.equal(cancellable.stats().activeRegions, 0);
  await cancellable.close();

  await assert.rejects(createRequiredPool({ size: 1, helpers: { left_leaf: { arity: 2 } },
    workerFactory: () => { throw new Error('denied'); } }), (error) => error.code === 'workers_unavailable');
  const partialEndpoints = [];
  const unhandledStartupRejections = [];
  const observeUnhandled = (reason) => unhandledStartupRejections.push(String(reason?.message ?? reason));
  process.on('unhandledRejection', observeUnhandled);
  try {
    await assert.rejects(createRequiredPool({ size: 2, helpers: { left_leaf: { arity: 2 } },
      workerFactory: (id) => {
        if (id === 1) throw new Error('second Worker denied');
        return new FakeWorker(id, partialEndpoints);
      } }), (error) => error.code === 'workers_unavailable');
    await nextTurn();
    assert.deepEqual(unhandledStartupRejections, [],
      'failure after partial construction must observe every earlier startup gate');
  } finally {
    process.off('unhandledRejection', observeUnhandled);
  }
  assert.equal(partialEndpoints.length, 1);
  assert.equal(partialEndpoints[0].terminated, true,
    'partial Worker construction failure must terminate already-created endpoints');
  return { passed: true, poolSize: 3, maxQueue: 12, primaryResults: result.values,
    primaryParticipants: result.workerIds, sourceSlotOrder: true, localNeverSibling: true,
    invocationCaps: [smallResult.workerIds.length, largeResult.workerIds.length],
    queueOverflow: 'strict rejection', staleResponseIgnored: true,
    requiredFailure: 'strict rejection; no local fallback', workersTerminated: true };
}

function chromeExecutable(chromium) {
  const override = process.env.BEND_PHASE7_CHROME;
  const candidates = override ? [path.resolve(override)] : [];
  if (!override) {
    if (os.platform() === 'win32') {
      candidates.push(path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google/Chrome/Application/chrome.exe'));
      if (process.env.LOCALAPPDATA) candidates.push(path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'));
    } else if (os.platform() === 'darwin') {
      candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    } else {
      candidates.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
        '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
    }
    candidates.push(chromium.executablePath());
  }
  for (const candidate of candidates) {
    try { if (fs.statSync(candidate).isFile()) return fs.realpathSync(candidate); } catch {}
  }
  return null;
}

async function runChrome(remoteHelpers, localHelpers) {
  let playwright;
  try { playwright = await import('playwright'); }
  catch { return { available: false, reason: 'local Playwright package unavailable' }; }
  const chrome = chromeExecutable(playwright.chromium);
  if (!chrome) return { available: false, reason: 'local Chrome/Chromium executable unavailable' };

  const csp = "default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'";
  const driver = `
import { createRequiredPool } from './pool.mjs';
import remote from './helpers.mjs';
import local from './local.mjs';
const NativeWorker = globalThis.Worker;
let workerCreations=0, workerTerminations=0, pageFetchCalls=0;
globalThis.Worker = class extends NativeWorker {
  constructor(...args) { super(...args); workerCreations++; }
  terminate() { workerTerminations++; return super.terminate(); }
};
globalThis.fetch = async () => { pageFetchCalls++; throw new Error('page fetch disabled'); };
try {
  const pool=await createRequiredPool({size:3,maxQueue:8,maxJobsPerRegion:8,taskTimeoutMs:3000,
    helpers:{left_leaf:{arity:2},right_leaf:{arity:2}},
    workerFactory:()=>new Worker(new URL('./fanout-browser-worker.mjs',import.meta.url),{type:'module'})});
  let localRuns=0;
  const outcome=await pool.runRegion({cap:2,regionId:'browser-parallel-let',tasks:[
    {slot:0,policy:'require',helperId:'left_leaf',args:[40,2]},
    {slot:1,policy:'require',helperId:'right_leaf',args:[40,2]},
    {slot:2,policy:'never',local:()=>{localRuns++;return local.local_leaf(40,2)}},
    {slot:3,policy:'require',helperId:'right_leaf',args:[9,5]},
  ]});
  const beforeClose=pool.stats();
  await pool.close();
  window.phase7Result={error:null,values:outcome.values,execution:outcome.execution,
    workerIds:outcome.workerIds,cap:outcome.cap,localRuns,beforeClose,
    workerCreations,workerTerminations,pageFetchCalls};
} catch(error) { window.phase7Result={error:String(error?.message??error),workerCreations,workerTerminations,pageFetchCalls}; }
`;
  const assets = new Map([
    ['/driver.mjs', Buffer.from(driver)],
    ['/pool.mjs', fs.readFileSync(poolFile)],
    ['/fanout-browser-worker.mjs', fs.readFileSync(browserWorkerFile)],
    ['/helpers.mjs', Buffer.from(remoteHelpers)],
    ['/local.mjs', Buffer.from(localHelpers)],
  ]);
  const served = [];
  const rejected = [];
  const outside = [];
  const pageErrors = [];
  const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"></head><body><script type="module" src="/driver.mjs"></script></body></html>');
  let server;
  let browser;
  try {
    server = http.createServer((request, response) => {
      const remoteAddress = request.socket.remoteAddress;
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      if (request.method !== 'GET' || !['127.0.0.1', '::ffff:127.0.0.1'].includes(remoteAddress)) {
        rejected.push({ method: request.method, path: url.pathname });
        response.writeHead(404, { 'Cache-Control': 'no-store' }).end();
        return;
      }
      if (url.pathname === '/favicon.ico') {
        response.writeHead(204, { 'Cache-Control': 'no-store', 'Content-Security-Policy': csp }).end();
        return;
      }
      const bytes = url.pathname === '/' ? html : assets.get(url.pathname);
      if (!bytes) {
        rejected.push({ method: request.method, path: url.pathname });
        response.writeHead(404, { 'Cache-Control': 'no-store' }).end();
        return;
      }
      served.push({ path: url.pathname, sha256: sha(bytes) });
      response.writeHead(200, { 'Content-Type': url.pathname === '/' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8',
        'Content-Length': bytes.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin', 'Content-Security-Policy': csp }).end(bytes);
    });
    await new Promise((resolve, rejectPromise) => {
      server.once('error', rejectPromise);
      server.listen(0, '127.0.0.1', resolve);
    });
    browser = await playwright.chromium.launch({ headless: true, executablePath: chrome, timeout: 10000 });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const origin = `http://127.0.0.1:${server.address().port}`;
    page.on('request', (request) => { if (new URL(request.url()).origin !== origin) outside.push(request.url()); });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.route('**/*', async (route) => {
      if (new URL(route.request().url()).origin !== origin) {
        outside.push(route.request().url());
        await route.abort('blockedbyclient');
      } else await route.continue();
    });
    await page.goto(`${origin}/`, { waitUntil: 'load', timeout: 8000 });
    await page.waitForFunction(() => window.phase7Result !== undefined, null, { timeout: 12000 });
    const result = await page.evaluate(() => window.phase7Result);
    assert.equal(result.error, null);
    assert.deepEqual(result.values, [40, 2, 40, 5]);
    assert.equal(result.execution[2].route, 'local');
    assert.equal(result.execution[2].workerId, null);
    assert.ok(result.workerIds.length <= result.cap);
    assert.deepEqual(result.workerIds, [...new Set(result.execution
      .filter((item) => item.route === 'worker').map((item) => item.workerId))].sort((a, b) => a - b));
    assert.equal(result.localRuns, 1);
    assert.equal(result.workerCreations, 3);
    assert.equal(result.workerTerminations, 3);
    assert.equal(result.pageFetchCalls, 0);
    assert.equal(result.beforeClose.busy, 0);
    assert.equal(result.beforeClose.queued, 0);
    assert.equal(result.beforeClose.activeRegions, 0);
    assert.deepEqual(outside, []);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(rejected, []);
    const expectedRoutes = ['/', '/driver.mjs', '/pool.mjs', '/fanout-browser-worker.mjs',
      '/helpers.mjs', '/local.mjs'];
    assert.deepEqual([...new Set(served.map(({ path: route }) => route))].sort(), expectedRoutes.sort());
    for (const [route, bytes] of assets) {
      const item = served.find(({ path: servedPath }) => servedPath === route);
      assert.ok(item, `${route} was not served`);
      assert.equal(item.sha256, sha(bytes), `${route} differs from source/emission bytes`);
    }
    return { available: true, browserVersion: browser.version(), executable: path.basename(chrome),
      values: result.values, execution: result.execution, workerIds: result.workerIds,
      workersCreatedAndTerminated: [result.workerCreations, result.workerTerminations],
      workerScopeWitnessed: result.execution.filter((item) => item.route === 'worker').length,
      served: served.map(({ path: route, sha256 }) => ({ route, sha256 })),
      fetchCalls: { page: result.pageFetchCalls, rejectedRequests: rejected.length,
        outsideOrigin: outside.length } };
  } finally {
    if (browser) await browser.close();
    if (server?.listening) await new Promise((resolve, rejectPromise) => {
      server.close((error) => error ? rejectPromise(error) : resolve());
      server.closeAllConnections();
    });
  }
}

function captureScratch() {
  const parent = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(parent, 'rift-bend-phase7-required-fanout-'));
  const exact = fs.realpathSync(directory);
  const stat = fs.lstatSync(exact, { bigint: true });
  assert.equal(path.dirname(exact), parent);
  assert.match(path.basename(exact), /^rift-bend-phase7-required-fanout-[^\\/]+$/);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  return { parent, exact, identity: { dev: stat.dev, ino: stat.ino, birthtimeNs: stat.birthtimeNs, mode: stat.mode } };
}

function cleanupScratch(scratch) {
  const stat = fs.lstatSync(scratch.exact, { bigint: true });
  assert.equal(path.dirname(fs.realpathSync(scratch.exact)), scratch.parent);
  assert.match(path.basename(scratch.exact), /^rift-bend-phase7-required-fanout-[^\\/]+$/);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  for (const key of ['dev', 'ino', 'birthtimeNs', 'mode']) assert.equal(stat[key], scratch.identity[key]);
  fs.rmSync(scratch.exact, { recursive: true, force: false });
  assert.equal(fs.existsSync(scratch.exact), false);
}

assert.equal(process.platform, 'win32', 'phase-seven replay is pinned to the local Windows Node/browser host');
assert.equal(process.arch, 'x64');
assert.equal(process.version, 'v24.12.0');
assert.equal(sha(fs.readFileSync(process.execPath)),
  '2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8');
assertCheckouts();
const before = snapshot();
assert.equal(sha(fs.readFileSync(fixture)), fixtureSha256, 'parallel-let fixture bytes changed');
const runtime = await deterministicRuntimeGate();

const scratch = captureScratch();
let primaryError;
let receipt;
try {
  const targetBend2 = path.join(scratch.exact, 'bend2');
  fs.mkdirSync(targetBend2, { recursive: true });
  for (const file of ['bend.ts', 'comp.ts', 'main.ts', 'base.bend']) {
    fs.copyFileSync(path.join(scout, 'bend2', file), path.join(targetBend2, file));
  }
  fs.cpSync(path.join(scout, 'bend2/effs'), path.join(targetBend2, 'effs'), { recursive: true });
  for (const [patch] of patchStack.slice(0, 4)) applyPatch(scratch.exact, patch);
  for (const [file, expected] of Object.entries({
    'bend2/bend.ts': '2def95c26e150c5a66a1a8ba3e5dd6ec5de3a8dd822627976f606a273b0cea88',
    'bend2/comp.ts': '4f420f4a9b9efadfb5708fa2e20703fbc44e130365805c4b1be09f3c276e39b1',
    'bend2/main.ts': 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
  })) assert.equal(sha(fs.readFileSync(path.join(scratch.exact, file))), expected,
    `001→002→005→phase-two replay mismatch: ${file}`);

  const Bend = await import(pathToFileURL(path.join(targetBend2, 'bend.ts')));
  const phase2Comp = await import(`${pathToFileURL(path.join(targetBend2, 'comp.ts')).href}?phase2-baseline`);
  const noSuffixBook = await loadBook(Bend, noSuffixFixture);
  const baselineJs = Buffer.from(phase2Comp.js_lib(noSuffixBook, false));
  const baselineC = Buffer.from(phase2Comp.compile_book(noSuffixBook));
  assert.equal(sha(baselineJs), syncJsSha256);
  assert.equal(sha(baselineC), syncCSha256);

  for (const [patch] of patchStack.slice(4)) applyPatch(scratch.exact, patch);
  assert.equal(sha(fs.readFileSync(path.join(targetBend2, 'comp.ts'))), phase6CompSha256,
    'phase-six compiler source bytes changed on ordered replay');
  const Comp = await import(`${pathToFileURL(path.join(targetBend2, 'comp.ts')).href}?phase7`);
  assert.deepEqual(Buffer.from(Comp.js_lib(noSuffixBook, false)), baselineJs,
    'phase-six no-suffix JavaScript differs from the phase-two baseline');
  assert.deepEqual(Buffer.from(Comp.compile_book(noSuffixBook)), baselineC,
    'phase-six no-suffix C differs from the phase-two baseline');

  const book = await loadBook(Bend, fixture);
  const plan = Comp.plan_web_workers(book, ['fanout']);
  assert.equal(plan.conflicts.length, 0, JSON.stringify(plan.conflicts));
  assert.deepEqual(plan.requirements.map(({ from, to, max }) => [from, to, max]), [
    ['fanout', 'left_leaf', 2], ['fanout', 'right_leaf', 2],
  ]);
  assert.deepEqual(plan.calls.filter(({ from }) => from === 'fanout')
    .map(({ to, policy, max }) => [to, policy, max]), [
      ['left_leaf', 'require', 2], ['right_leaf', 'require', 2], ['local_leaf', 'never', undefined],
      ['preserve', 'automatic', undefined],
    ]);
  assert.throws(() => Comp.js_percall_lib(book, 'fanout'),
    /exactly one direct required call/, 'phase 6 must fail closed on two sibling requirements');

  const { selectedModule } = await import(pathToFileURL(selectedAdapter));
  const remoteHelpers = selectedModule(Bend, Comp, book, ['left_leaf', 'right_leaf']);
  const localHelpers = selectedModule(Bend, Comp, book, ['local_leaf']);
  const remoteExports = await import(`data:text/javascript;base64,${Buffer.from(remoteHelpers).toString('base64')}`);
  assert.deepEqual(Object.keys(remoteExports.default).sort(), ['left_leaf', 'right_leaf']);
  assert.deepEqual(Object.keys((await import(`data:text/javascript;base64,${Buffer.from(localHelpers).toString('base64')}`)).default), ['local_leaf']);
  assert.equal(remoteExports.default.left_leaf(40, 2), 40);
  assert.equal(remoteExports.default.right_leaf(40, 2), 2);

  assert.deepEqual(Buffer.from(Comp.js_lib(noSuffixBook, false)), baselineJs,
    'source planning and helper emission changed ordinary no-suffix JS bytes');
  assert.deepEqual(Buffer.from(Comp.compile_book(noSuffixBook)), baselineC,
    'source planning and helper emission changed ordinary no-suffix C bytes');
  assert.equal(pageFetchCalls, 0);

  const browser = await runChrome(remoteHelpers, localHelpers);
  assert.equal(browser.available, true,
    `phase-seven full gate requires a real local Chrome Worker run: ${browser.reason ?? 'unavailable'}`);
  assert.deepEqual(snapshot(), before, 'bound inputs changed during the phase-seven replay');
  assertCheckouts();
  receipt = { schema: 'rift-bend-required-fanout-phase7/1', passed: true,
    source: { pristine, pin, patchShas: patchStack.map(([file]) => sha(fs.readFileSync(file))),
      fixtureSha256: sha(fs.readFileSync(fixture)), inputHashes: before,
      phase6CompilerSha256: sha(fs.readFileSync(path.join(targetBend2, 'comp.ts'))) },
    compiler: { requiredSiblingOrder: ['left_leaf', 'right_leaf'],
      neverSibling: 'local_leaf', regionCapAnnotation: 2,
      helperModuleExports: ['left_leaf', 'right_leaf'],
      builderGap: 'phase-six per-call builder rejects two direct required calls; no compiler fan-out emission claimed',
      noSuffix: { jsSha256: sha(baselineJs), cSha256: sha(baselineC), unchangedAfterBuild: true } },
    deterministicRuntime: runtime, chrome: browser,
    scope: 'source-bound phase-six replay, checked parallel-let helper roots, bounded required Worker pool runtime, deterministic protocol/lifecycle controls, and one local Chrome module-Worker witness only; not the old 107-case suite, compiler-emitted fan-out, Web-platform matrix, game integration, native/GPU, frozen proof, pin amendment, or release acceptance' };
} catch (error) {
  primaryError = error;
} finally {
  try { cleanupScratch(scratch); }
  catch (cleanupError) {
    if (primaryError) primaryError.cleanupError = cleanupError;
    else primaryError = cleanupError;
  }
}
if (primaryError) throw primaryError;
console.log(JSON.stringify(receipt));
