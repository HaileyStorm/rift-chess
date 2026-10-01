import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequiredPool, requiredFanoutProtocol } from '../phase7-required-fanout/pool.mjs';

process.env.BEND_NO_TELEMETRY = '1';
let nodeFetchCalls = 0;
globalThis.fetch = async () => {
  nodeFetchCalls += 1;
  throw new Error('network access is disabled in the phase-eight gate');
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../..');
const scout = path.join(repo, '.artifacts/toolchains/bend-2.0.32-scout');
const canonical = path.join(repo, '.artifacts/toolchains/bend');
const fixture = path.join(here, 'fixtures/parallel-fanout.bend');
const recursiveNoCycleFixture = path.join(here, 'fixtures/recursive-site-no-cycle.bend');
const recursiveU32Fixture = path.join(here, 'fixtures/recursive-u32-nondecreasing.bend');
const fixtures = ['mixed-cap', 'missing-cap', 'sequential-required', 'unsupported-helper',
  'extra-required', 'automatic-sibling', 'local-non-u32', 'recursive-non-tail',
  'long-caller', 'long-helper']
  .map((name) => path.join(here, `fixtures/${name}.bend`));
const noSuffixFixture = path.join(repo,
  'bend2/toolchain-patches/004-web-workers/rebase-2032/fixtures/selected-root.bend');
const poolFile = path.join(here, '../phase7-required-fanout/pool.mjs');
const phase8Patch = path.join(here, '0008-compiler-fanout-after-phase6-2.0.32.patch');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pristine = '573002f01ec6c52416d44489543f69a9625facf8';
const pin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const baselineJsSha256 = '3c99dcd84414a057fce65edb45dd69d600e6b57bee49aec23e7333130a510a1d';
const baselineCSha256 = '9cb68b124aa2865f21a3c1cdb633bf691d45d1f06a8eea496869d2585750a009';
const phase6CompilerSha256 = '0f2366677b546498b137b0d08684a36230a72f4df4cabca27293076fb78faa11';
const expectedPhase8PatchSha256 = 'cbba5fbaad3d41f40cc167e418310a84bc5a9fe7ef54030f7576f5203f1f9fa3';
const expectedPhase8CompilerSha256 = '12adbdb7f3f8af73ec3f27c874d8350b5991f415d6dcd1993c5dfa81d56cd731';
const expectedPatchStack = [
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
const inputPaths = [fixture, recursiveNoCycleFixture, recursiveU32Fixture, ...fixtures, fileURLToPath(import.meta.url), poolFile,
  path.join(here, 'fixtures/long-helper-module.bend'),
  noSuffixFixture, path.join(repo, 'bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/fixtures/policies.bend'),
  path.join(repo, 'package.json'), path.join(repo, 'package-lock.json'),
  path.join(scout, 'bend2/base.bend'), phase8Patch, ...expectedPatchStack.map(([file]) => file)];

function git(directory, ...args) {
  return execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8' })
    .replace(/\r\n/g, '\n').trimEnd();
}

function snapshot() {
  assert.equal(sha(fs.readFileSync(phase8Patch)), expectedPhase8PatchSha256,
    'phase-eight derived compiler patch bytes changed');
  const result = Object.fromEntries(inputPaths.map((file) => [
    path.relative(repo, file).replaceAll('\\', '/'), sha(fs.readFileSync(file)),
  ]));
  for (const [file, expected] of expectedPatchStack) {
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

function makeScratch() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'rift-bend-phase8-fanout-'));
  const parentIdentity = fs.lstatSync(parent, { bigint: true });
  const parentReal = fs.realpathSync(parent);
  assert.equal(parentReal, path.resolve(parent));
  assert.ok(parentIdentity.isDirectory() && !parentIdentity.isSymbolicLink());
  const exact = path.join(parent, 'repo');
  assert.equal(path.dirname(exact), parent);
  execFileSync('git', ['clone', '--no-hardlinks', scout, exact], { stdio: 'ignore' });
  const stat = fs.lstatSync(exact, { bigint: true });
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  assert.equal(fs.realpathSync(exact), exact);
  assert.equal(git(exact, 'rev-parse', 'HEAD'), pristine);
  assert.equal(git(exact, 'status', '--porcelain', '--untracked-files=all'), '');
  return { parent, parentReal, parentIdentity, exact, identity: stat };
}

function cleanupScratch(scratch) {
  if (!scratch) return;
  const parent = path.resolve(scratch.parent);
  assert.equal(parent, scratch.parent);
  assert.match(path.basename(parent), /^rift-bend-phase8-fanout-[^\\/]+$/);
  const parentStat = fs.lstatSync(parent, { bigint: true });
  assert.ok(parentStat.isDirectory() && !parentStat.isSymbolicLink());
  for (const key of ['dev', 'ino', 'birthtimeNs', 'mode']) {
    assert.equal(parentStat[key], scratch.parentIdentity[key], `temporary parent ${key} changed`);
  }
  assert.equal(fs.realpathSync(parent), scratch.parentReal);
  const exact = path.resolve(scratch.exact);
  assert.equal(path.dirname(exact), parent);
  assert.equal(path.basename(exact), 'repo');
  const stat = fs.lstatSync(exact, { bigint: true });
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  for (const key of ['dev', 'ino', 'birthtimeNs', 'mode']) assert.equal(stat[key], scratch.identity[key]);
  assert.equal(fs.realpathSync(exact), exact);
  const children = fs.readdirSync(parent);
  assert.ok(children.includes('repo') && children.every((name) => ['bundle', 'repo'].includes(name)));
  fs.rmSync(parent, { recursive: true, force: false });
  assert.equal(fs.existsSync(parent), false);
}

function applyPatch(directory, file) {
  execFileSync('git', ['-C', directory, 'apply', '--check', '--whitespace=error-all', file],
    { stdio: 'pipe' });
  execFileSync('git', ['-C', directory, 'apply', '--whitespace=error-all', file],
    { stdio: 'pipe' });
}

async function loadBook(Bend, file) {
  const book = Bend.book_nil();
  try {
    await Bend.book_load(book, file.replaceAll('\\', '/'), '', new Map());
    Bend.book_valid(book);
  } catch (error) {
    throw new Error((error?.$ === 'Err' ? Bend.err_show(error)
      : error?.message ?? String(error)).slice(0, 1600));
  }
  assert.equal(book.hols, 0);
  return book;
}

function validReply(request, workerId, value) {
  return { type: 'result', protocol: requiredFanoutProtocol,
    requestId: request.requestId, invocationId: request.invocationId,
    regionId: request.regionId, sourceSlot: request.sourceSlot,
    helperId: request.helperId, workerId, ok: true, value,
    workerScope: true, fetchCalls: 0 };
}

class FakeWorker {
  constructor(workerId, state) {
    this.workerId = workerId;
    this.state = state;
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
    this.terminated = false;
    this.timers = new Set();
  }
  postMessage(message) {
    if (this.terminated) throw new Error('postMessage on terminated test worker');
    if (message.type === 'hello') {
      const timer = setTimeout(() => this.onmessage?.({ data: { type: 'ready',
        protocol: requiredFanoutProtocol, workerId: this.workerId, workerScope: true } }), 0);
      this.timers.add(timer);
      return;
    }
    if (message.type !== 'run') throw new Error('unexpected test-worker message');
    this.state.dispatched.push({ workerId: this.workerId, sourceSlot: message.sourceSlot,
      helperId: message.helperId });
    const delay = this.state.delayBySlot?.[message.sourceSlot] ?? 0;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (this.terminated) return;
      this.state.completed.push(message.sourceSlot);
      if (this.state.failSlot === message.sourceSlot) {
        this.onmessage?.({ data: { type: 'result', protocol: requiredFanoutProtocol,
          requestId: message.requestId, invocationId: message.invocationId,
          regionId: message.regionId, sourceSlot: message.sourceSlot,
          helperId: message.helperId, workerId: this.workerId, ok: false,
          error: 'fixture required helper failure', workerScope: true, fetchCalls: 0 } });
      } else {
        const value = message.helperId === 'left_leaf' ? message.args[0] : message.args[1];
        this.onmessage?.({ data: validReply(message, this.workerId, value) });
      }
    }, delay);
    this.timers.add(timer);
  }
  terminate() {
    if (this.terminated) return Promise.resolve();
    this.terminated = true;
    this.state.terminated += 1;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
    return Promise.resolve();
  }
}

async function deterministicRuntimeGate() {
  const helpers = { left_leaf: { arity: 2 }, right_leaf: { arity: 2 } };
  const state = { dispatched: [], completed: [], terminated: 0,
    delayBySlot: { 0: 120, 1: 5, 2: 5 } };
  const pool = await createRequiredPool({ size: 3, helpers,
    workerFactory: (workerId) => new FakeWorker(workerId, state) });
  let localRuns = 0;
  const result = await pool.runRegion({ cap: 2, regionId: 'phase8-three-jobs-two-workers', tasks: [
    { slot: 0, policy: 'require', helperId: 'left_leaf', args: [40, 2] },
    { slot: 1, policy: 'require', helperId: 'right_leaf', args: [40, 2] },
    { slot: 2, policy: 'require', helperId: 'left_leaf', args: [7, 2] },
    { slot: 3, policy: 'never', local: () => { localRuns += 1; return 40; } },
  ] });
  const stats = pool.stats();
  assert.deepEqual(result.values, [40, 2, 7, 40]);
  assert.deepEqual(result.execution.map((item) => item.route), ['worker', 'worker', 'worker', 'local']);
  assert.deepEqual(state.completed, [1, 2, 0], 'fixture must complete out of source-slot order');
  assert.deepEqual(result.workerIds, [0, 1], 'cap 2 limits participating Worker IDs, not jobs/helpers');
  assert.equal(result.cap, 2);
  assert.equal(state.dispatched.length, 3);
  assert.equal(localRuns, 1);
  assert.equal(stats.size, 3);
  await pool.close();
  assert.equal(state.terminated, 3);

  const cancelState = { dispatched: [], completed: [], terminated: 0, delayBySlot: { 0: 60000 } };
  const cancelPool = await createRequiredPool({ size: 1, helpers,
    workerFactory: (workerId) => new FakeWorker(workerId, cancelState) });
  const controller = new AbortController();
  let cancelledLocalRuns = 0;
  const cancelled = cancelPool.runRegion({ cap: 1, regionId: 'phase8-cancel',
    signal: controller.signal, tasks: [
      { slot: 0, policy: 'require', helperId: 'left_leaf', args: [1, 2] },
      { slot: 1, policy: 'require', helperId: 'right_leaf', args: [3, 4] },
      { slot: 2, policy: 'never', local: () => { cancelledLocalRuns += 1; return 5; } },
    ] });
  setTimeout(() => controller.abort(), 5);
  await assert.rejects(cancelled, (error) => error.code === 'aborted');
  await cancelPool.close();
  assert.deepEqual(cancelState.dispatched.map((item) => item.sourceSlot), [0]);
  assert.equal(cancelledLocalRuns, 1);
  assert.equal(cancelState.terminated, 1);

  const failureState = { dispatched: [], completed: [], terminated: 0, failSlot: 0 };
  const failurePool = await createRequiredPool({ size: 1, helpers,
    workerFactory: (workerId) => new FakeWorker(workerId, failureState) });
  let failureLocalRuns = 0;
  const failed = failurePool.runRegion({ cap: 1, regionId: 'phase8-failure', tasks: [
    { slot: 0, policy: 'require', helperId: 'left_leaf', args: [1, 2] },
    { slot: 1, policy: 'require', helperId: 'right_leaf', args: [3, 4] },
    { slot: 2, policy: 'never', local: () => { failureLocalRuns += 1; return 5; } },
  ] });
  await assert.rejects(failed, (error) => error.code === 'worker_task');
  await failurePool.close();
  assert.deepEqual(failureState.dispatched.map((item) => item.sourceSlot), [0],
    'a required-task failure must cancel queued siblings without local fallback');
  assert.equal(failureLocalRuns, 1);
  assert.equal(failureState.terminated, 1);

  await assert.rejects(createRequiredPool({ size: 1, helpers,
    workerFactory: () => { throw new Error('denied by deterministic fixture'); } }),
  (error) => error.code === 'workers_unavailable');
  return { passed: true, capTwoJobsThree: { values: result.values,
    completionOrder: state.completed, workerIds: result.workerIds, dispatched: state.dispatched.length },
  cancellation: { code: 'aborted', queuedSiblingDispatched: false, noFallback: true },
  failure: { code: 'worker_task', queuedSiblingDispatched: false, noFallback: true },
  workerCreationDenial: 'workers_unavailable' };
}

function chromeExecutable(chromium) {
  const override = process.env.BEND_PHASE8_CHROME;
  const candidates = override ? [path.resolve(override)] : [];
  if (!override) {
    if (os.platform() === 'win32') {
      candidates.push(
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google/Chrome/Application/chrome.exe'));
      if (process.env.LOCALAPPDATA) candidates.push(path.join(process.env.LOCALAPPDATA,
        'Google/Chrome/Application/chrome.exe'));
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

async function browserWitness(bundleDir, build) {
  const playwright = await import('playwright');
  const executable = chromeExecutable(playwright.chromium);
  assert.ok(executable, 'phase-eight requires a locally available Chrome/Chromium binary');
  const routes = new Map([
    ['/program.mjs', fs.readFileSync(path.join(bundleDir, 'program.mjs'))],
    ['/helpers.mjs', fs.readFileSync(path.join(bundleDir, 'helpers.mjs'))],
    ['/worker.mjs', fs.readFileSync(path.join(bundleDir, 'worker.mjs'))],
    ['/pool.mjs', fs.readFileSync(path.join(bundleDir, 'pool.mjs'))],
    ['/driver.mjs', Buffer.from(`
import * as ProgramModule from "/program.mjs";
const Program = ProgramModule.default;
let pageFetchCalls = 0;
globalThis.fetch = async () => { pageFetchCalls += 1; throw new Error("page network denied"); };
const NativeWorker = globalThis.Worker;
let workerCreations = 0;
let workerTerminations = 0;
const completionOrder = [];
globalThis.Worker = class {
  constructor(...args) {
    this.inner = new NativeWorker(...args);
    workerCreations += 1;
  }
  set onmessage(handler) {
    this.inner.onmessage = (event) => {
      if (event.data?.type === "result") completionOrder.push(event.data.sourceSlot);
      handler?.(event);
    };
  }
  set onerror(handler) { this.inner.onerror = handler; }
  set onmessageerror(handler) { this.inner.onmessageerror = handler; }
  postMessage(data, transfer) {
    if (data?.type === "run" && data.sourceSlot === 0) {
      setTimeout(() => this.inner.postMessage(data, transfer), 250);
    } else this.inner.postMessage(data, transfer);
  }
  terminate() { workerTerminations += 1; return this.inner.terminate(); }
};
try {
  const firstValue = await Program.fanout(40);
  const firstWitness = ProgramModule.__bendRequiredFanoutWitness;
  const value = await Program.fanout(40);
  const region = ProgramModule.__bendRequiredFanoutWitness;
  const stats = await ProgramModule.__bendRequiredFanoutStats();
  const witnessExports = Object.keys(ProgramModule).filter((name) =>
    /^__bendRequiredFanoutWitness(?:es)?$/.test(name));
  await ProgramModule.__bendCloseRequiredFanout();
  window.phase8Result = { firstValue, value, values: region.values, execution: region.execution,
    workerIds: region.workerIds, cap: region.cap, stats, completionOrder,
    workerCreations, workerTerminations, pageFetchCalls, witnessExports,
    firstInvocationId: firstWitness.invocationId, latestInvocationId: region.invocationId,
    firstAndLatestDiffer: firstWitness !== region };
} catch (error) {
  try { await ProgramModule.__bendCloseRequiredFanout(); } catch {}
  window.phase8Result = { error: String(error?.stack ?? error), workerCreations,
    workerTerminations, completionOrder, pageFetchCalls };
}
`)],
    ['/index.html', Buffer.from(`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>phase8 compiler fanout</title><script type="module" src="/driver.mjs"></script>`) ],
  ]);
  const seen = [];
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    seen.push(pathname);
    const key = pathname === '/' ? '/index.html' : pathname;
    const body = routes.get(key);
    if (!body) { response.writeHead(404); response.end('not found'); return; }
    const type = key.endsWith('.mjs') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8';
    response.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'" });
    response.end(body);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  let browser;
  try {
    browser = await playwright.chromium.launch({ executablePath: executable, headless: true,
      args: ['--no-sandbox'] });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const pageErrors = [];
    const outsideOrigin = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    context.on('request', (request) => {
      if (!request.url().startsWith('http://127.0.0.1:')) outsideOrigin.push(request.url());
    });
    const address = server.address();
    const origin = `http://127.0.0.1:${address.port}`;
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.phase8Result !== undefined, null, { timeout: 30000 });
    const result = await page.evaluate(() => window.phase8Result);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(outsideOrigin, []);
    assert.equal(result.error, undefined, result.error);
    assert.equal(result.firstValue, 40);
    assert.equal(result.value, 40);
    assert.deepEqual(result.values, [40, 2, 7, 40], 'compiled parallel-let must preserve source-slot results');
    assert.deepEqual(result.execution.map((item) => item.route), ['worker', 'worker', 'worker', 'local']);
    assert.equal(result.cap, 2);
    assert.equal(result.workerIds.length, 2, '@2 limits participating Worker IDs');
    assert.deepEqual(result.completionOrder, [1, 2, 0, 1, 2, 0], 'both real-Worker invocations must complete out of source order');
    assert.equal(result.stats.dispatched, 6, 'six required jobs run with only two participating Workers across two invocations');
    assert.equal(result.stats.size, 2);
    assert.equal(result.workerCreations, 2);
    assert.equal(result.workerTerminations, 2);
    assert.equal(result.pageFetchCalls, 0);
    assert.deepEqual(result.witnessExports, ['__bendRequiredFanoutWitness'],
      'the reusable compiler module retains only one latest witness slot');
    assert.equal(result.firstAndLatestDiffer, true);
    assert.notEqual(result.firstInvocationId, result.latestInvocationId);
    const served = [...new Set(seen)].sort();
    assert.deepEqual(served, ['/', '/driver.mjs', '/helpers.mjs', '/pool.mjs', '/program.mjs', '/worker.mjs']);
    return { available: true, browserVersion: browser.version(), executable: path.basename(executable),
      values: result.values, invocations: [result.firstInvocationId, result.latestInvocationId],
      completionOrder: result.completionOrder,
      execution: result.execution, workerIds: result.workerIds, cap: result.cap,
      workerCreationsAndTerminations: [result.workerCreations, result.workerTerminations],
      workerStats: result.stats, pageFetchCalls: result.pageFetchCalls, served };
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

const deterministic = await deterministicRuntimeGate();
assertCheckouts();
const before = snapshot();
const scratch = makeScratch();
let primaryError;
let receipt;
try {
  const targetBend2 = path.join(scratch.exact, 'bend2');
  const patchFiles = expectedPatchStack.map(([file]) => file);
  for (const patch of patchFiles.slice(0, 4)) applyPatch(scratch.exact, patch);
  for (const [file, expected] of Object.entries({
    'bend2/bend.ts': '2def95c26e150c5a66a1a8ba3e5dd6ec5de3a8dd822627976f606a273b0cea88',
    'bend2/comp.ts': '4f420f4a9b9efadfb5708fa2e20703fbc44e130365805c4b1be09f3c276e39b1',
    'bend2/main.ts': 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
  })) assert.equal(sha(fs.readFileSync(path.join(scratch.exact, file))), expected,
    `001->002->005->phase2 replay mismatch: ${file}`);
  const Bend = await import(pathToFileURL(path.join(targetBend2, 'bend.ts')));
  const phase2Comp = await import(`${pathToFileURL(path.join(targetBend2, 'comp.ts')).href}?phase2-baseline`);
  const noSuffixBook = await loadBook(Bend, noSuffixFixture);
  const baselineJs = Buffer.from(phase2Comp.js_lib(noSuffixBook, false));
  const baselineC = Buffer.from(phase2Comp.compile_book(noSuffixBook));
  assert.equal(sha(baselineJs), baselineJsSha256);
  assert.equal(sha(baselineC), baselineCSha256);

  for (const patch of patchFiles.slice(4)) applyPatch(scratch.exact, patch);
  assert.equal(sha(fs.readFileSync(path.join(targetBend2, 'comp.ts'))), phase6CompilerSha256);
  const phase6Comp = await import(`${pathToFileURL(path.join(targetBend2, 'comp.ts')).href}?phase6-baseline`);
  assert.deepEqual(Buffer.from(phase6Comp.js_lib(noSuffixBook, false)), baselineJs);
  assert.deepEqual(Buffer.from(phase6Comp.compile_book(noSuffixBook)), baselineC);
  applyPatch(scratch.exact, phase8Patch);
  const phase8CompSha256 = sha(fs.readFileSync(path.join(targetBend2, 'comp.ts')));
  assert.equal(phase8CompSha256, expectedPhase8CompilerSha256,
    'phase-eight compiler source bytes changed on ordered replay');
  const BendComp = await import(`${pathToFileURL(path.join(targetBend2, 'bend.ts')).href}?phase8`);
  const Comp = await import(`${pathToFileURL(path.join(targetBend2, 'comp.ts')).href}?phase8`);
  const noSuffixAfter = Buffer.from(Comp.js_lib(noSuffixBook, false));
  const noSuffixCAfter = Buffer.from(Comp.compile_book(noSuffixBook));
  assert.deepEqual(noSuffixAfter, baselineJs, 'phase-eight source planning changed ordinary no-suffix JS bytes');
  assert.deepEqual(noSuffixCAfter, baselineC, 'phase-eight source planning changed ordinary no-suffix C bytes');

  const book = await loadBook(BendComp, fixture);
  const plan = Comp.plan_web_workers(book, ['fanout']);
  assert.equal(plan.conflicts.length, 0, JSON.stringify(plan.conflicts));
  assert.deepEqual(plan.requirements.map(({ from, to, max }) => [from, to, max]), [
    ['fanout', 'left_leaf', 2], ['fanout', 'right_leaf', 2], ['fanout', 'left_leaf', 2],
  ]);
  assert.deepEqual(plan.calls.filter(({ from }) => from === 'fanout')
    .map(({ to, policy, max }) => [to, policy, max]), [
      ['left_leaf', 'require', 2], ['right_leaf', 'require', 2],
      ['left_leaf', 'require', 2], ['local_leaf', 'never', undefined],
      ['preserve', 'automatic', undefined],
    ]);
  const build = Comp.js_required_fanout_lib(book, 'fanout');
  assert.equal(build.schema, 'bend-required-fanout-build/2032-1');
  assert.equal(build.cap, 2);
  assert.deepEqual(build.slots, [
    { slot: 0, policy: 'require', helperId: 'left_leaf' },
    { slot: 1, policy: 'require', helperId: 'right_leaf' },
    { slot: 2, policy: 'require', helperId: 'left_leaf' },
    { slot: 3, policy: 'never' },
  ]);
  assert.deepEqual({ ...build.helperArities }, { left_leaf: 2, right_leaf: 2 });
  assert.equal(build.runtime.sha256, sha(fs.readFileSync(poolFile)),
    'compiler output must bind the exact tested phase-seven pool runtime');
  assert.deepEqual(Object.keys(build.files).sort(), ['helpers.mjs', 'program.mjs', 'worker.mjs']);
  assert.match(build.files['program.mjs'], /import \{ createRequiredPool as __bendCreateRequiredPool \} from "\.\/pool\.mjs"/);
  assert.match(build.files['program.mjs'], /await __bendRunRequiredFanout/);
  assert.match(build.files['program.mjs'], /cap: 2/);
  assert.match(build.files['program.mjs'], /policy: "never", local:/);
  assert.match(build.files['worker.mjs'], /requiredFanoutProtocol as protocol/);
  assert.match(build.files['worker.mjs'], /sourceSlot/);
  assert.match(build.files['worker.mjs'], /Object\.prototype\.hasOwnProperty\.call\(expectedHelpers, data\.helperId\)/);
  assert.match(build.files['worker.mjs'], /WorkerGlobalScope/);
  assert.match(build.files['worker.mjs'], /network disabled in required fan-out Worker/);

  const recursiveBook = await loadBook(BendComp, fixtures[7]);
  const recursivePlan = Comp.plan_web_workers(recursiveBook, ['fanout']);
  assert.deepEqual(recursivePlan.conflicts, [], 'recursive fixture still satisfies required-worker policy planning');
  assert.deepEqual(recursivePlan.requirements.map(({ from, to, max }) => [from, to, max]), [
    ['fanout', 'left_leaf', 2], ['fanout', 'right_leaf', 2], ['fanout', 'left_leaf', 2],
  ], 'all sibling helpers, caps, and call-free leaves remain eligible apart from recursion');
  assert.deepEqual(recursivePlan.calls.filter(({ from }) => from === 'fanout')
    .map(({ to, policy, max }) => [to, policy, max]), [
      ['left_leaf', 'require', 2], ['right_leaf', 'require', 2],
      ['left_leaf', 'require', 2], ['local_leaf', 'never', undefined],
      ['fanout', 'automatic', undefined], ['preserve', 'automatic', undefined],
    ], 'the checked parallel-let and all helper/cap policies match the accepted region; only the recursive edge is extra');
  assert.deepEqual(recursivePlan.functions.find((fn) => fn.name === 'fanout')?.reasons,
    ['higher_order_or_dynamic_call:fanout'], 'the only worker-plan ineligibility is the recursive caller edge');
  for (const helper of ['left_leaf', 'right_leaf', 'local_leaf']) {
    const helperPlan = Comp.plan_web_workers(recursiveBook, [helper]);
    assert.equal(helperPlan.sourceEligible, true);
    assert.deepEqual(helperPlan.calls, []);
  }
  let recursiveError;
  try { Comp.js_required_fanout_lib(recursiveBook, 'fanout'); }
  catch (error) { recursiveError = error; }
  assert.ok(recursiveError instanceof Error, 'recursive caller unexpectedly passed fan-out preflight');
  assert.match(recursiveError.message,
    /required fan-out caller cannot be self- or mutually-recursive because its lowered calls are async/);
  const noCycleBook = await loadBook(BendComp, recursiveNoCycleFixture);
  const noCyclePlan = Comp.plan_web_workers(noCycleBook, ['fanout']);
  assert.deepEqual(noCyclePlan.conflicts, []);
  assert.deepEqual(noCyclePlan.requirements, recursivePlan.requirements,
    'removing the recursive edge preserves the exact same required-worker sites and caps');
  assert.deepEqual(noCyclePlan.functions.find((fn) => fn.name === 'fanout')?.reasons, [],
    'the no-cycle counterpart has no unsupported dependency reasons');
  assert.deepEqual(recursivePlan.calls.filter(({ from, to }) => from === 'fanout' && to !== 'fanout')
    .map(({ to, policy, max, native }) => [to, policy, max, native]),
  noCyclePlan.calls.filter(({ from }) => from === 'fanout')
    .map(({ to, policy, max, native }) => [to, policy, max, native]),
    'the only call-graph edge removed by the paired fixture is the recursive self-edge');
  assert.throws(() => Comp.js_required_fanout_lib(noCycleBook, 'fanout'),
    /required fan-out caller must be a filled pure first-order U32 -> U32 definition/,
    'with the recursive edge removed, every worker-site/helper check passes and only the expected Nat caller signature remains unsupported');

    let u32RecursionError;
    try { await loadBook(BendComp, recursiveU32Fixture); }
    catch (error) { u32RecursionError = error; }
    assert.ok(u32RecursionError instanceof Error,
      'the U32 self-call boundary probe unexpectedly passed Bend source validation');
    assert.match(u32RecursionError.message, /expected : a decreasing self-call/);
    assert.match(u32RecursionError.message, /observed : fanout/);

  for (const [file, pattern, callerName] of [
    [fixtures[0], /share one positive @N worker cap/],
    [fixtures[1], /share one positive @N worker cap/],
    [fixtures[2], /one direct parallel-let/],
    [fixtures[3], /policy conflict|closed call-free U32 subset/],
    [fixtures[4], /one direct parallel-let/],
    [fixtures[5], /two or more @N calls and at least one direct never sibling/],
    [fixtures[6], /two or more @N calls and at least one direct never sibling/],
    [fixtures[8], /regionId exceeds the phase-seven runtime limit of 128 characters/, 'f'.repeat(111)],
    [fixtures[9], /helper ID exceeds the phase-seven pool limit/],
  ]) {
    const invalidBook = await loadBook(BendComp, file);
    const caller = callerName ?? 'fanout';
    assert.throws(() => Comp.js_required_fanout_lib(invalidBook, caller), pattern,
      `unsupported shape unexpectedly compiled: ${path.basename(file)}`);
  }

  const helpersUrl = `data:text/javascript;base64,${Buffer.from(build.files['helpers.mjs']).toString('base64')}`;
  const emittedHelpers = (await import(helpersUrl)).default;
  assert.deepEqual(Object.keys(emittedHelpers).sort(), ['left_leaf', 'right_leaf']);
  assert.equal(emittedHelpers.left_leaf(40, 2), 40);
  assert.equal(emittedHelpers.right_leaf(40, 2), 2);

  const bundleDir = path.join(scratch.parent, 'bundle');
  fs.mkdirSync(bundleDir);
  for (const [name, source] of Object.entries(build.files)) {
    fs.writeFileSync(path.join(bundleDir, name), source, { flag: 'wx' });
  }
  fs.copyFileSync(poolFile, path.join(bundleDir, 'pool.mjs'));
  for (const name of ['program.mjs', 'helpers.mjs', 'worker.mjs', 'pool.mjs']) {
    execFileSync(process.execPath, ['--check', path.join(bundleDir, name)], { stdio: 'pipe' });
  }
  const program = await import(`${pathToFileURL(path.join(bundleDir, 'program.mjs')).href}?syntax-check`);
  assert.equal(typeof program.default.fanout, 'function');
  assert.equal(program.__bendRequiredFanoutWitness, null);
  assert.equal('__bendRequiredFanoutWitnesses' in program, false);
  const localFunction = 'function $local_leaf$(_a_0, _b_0) {\n  return _a_0;\n}';
  assert.ok(build.files['program.mjs'].includes(localFunction), 'instrumentation target changed');
  fs.writeFileSync(path.join(bundleDir, 'program-failure.mjs'),
    build.files['program.mjs'].replace(localFunction,
      'function $local_leaf$(_a_0, _b_0) {\n  globalThis.__phase8LocalRuns = (globalThis.__phase8LocalRuns ?? 0) + 1;\n  return _a_0;\n}'),
    { flag: 'wx' });
  const failureProgram = await import(`${pathToFileURL(path.join(bundleDir, 'program-failure.mjs')).href}?failure`);
  const savedWorker = globalThis.Worker;
  for (const [mode, expectedCode] of [['assigned-failure', 'worker_task'],
    ['malformed-assignment', 'worker_protocol']]) {
    const state = { mode, dispatched: [], terminated: 0 };
    globalThis.Worker = class {
      constructor() { this.onmessage = null; this.onerror = null; this.onmessageerror = null; this.terminated = false; this.workerId = null; state.created = (state.created ?? 0) + 1; }
      postMessage(message) {
        if (message.type === 'hello') {
          this.workerId = message.workerId;
          queueMicrotask(() => this.onmessage?.({ data: { type: 'ready', protocol: requiredFanoutProtocol,
            workerId: message.workerId, workerScope: true } }));
          return;
        }
        state.dispatched.push(message.sourceSlot);
        queueMicrotask(() => {
          if (this.terminated) return;
          const reply = { type: 'result', protocol: requiredFanoutProtocol,
            requestId: message.requestId, invocationId: message.invocationId, regionId: message.regionId,
            sourceSlot: message.sourceSlot, helperId: message.helperId, workerId: this.workerId,
            workerScope: mode === 'malformed-assignment' ? false : true, fetchCalls: 0 };
          if (mode === 'assigned-failure') Object.assign(reply, { ok: false, error: 'assigned helper failure' });
          else Object.assign(reply, { ok: true, value: 40 });
          this.onmessage?.({ data: reply });
        });
      }
      terminate() { if (!this.terminated) { this.terminated = true; state.terminated += 1; } return Promise.resolve(); }
    };
    globalThis.__phase8LocalRuns = 0;
    try {
      await assert.rejects(failureProgram.default.fanout(40), (error) => error.code === expectedCode);
      assert.equal(globalThis.__phase8LocalRuns, 1,
        `${mode}: the explicit never sibling runs once; failed required calls are not recomputed locally`);
      assert.equal(failureProgram.__bendRequiredFanoutWitness, null,
        `${mode}: failed invocations must not retain a stale or growing witness`);
      assert.deepEqual(state.dispatched, [0, 1], `${mode}: assigned tasks must not be retried or locally recomputed`);
    } finally {
      await failureProgram.__bendCloseRequiredFanout();
      assert.equal(state.terminated, 2);
      globalThis.Worker = savedWorker;
    }
  }
  const browser = await browserWitness(bundleDir, build);
  assert.equal(nodeFetchCalls, 0);
  assert.deepEqual(snapshot(), before, 'bound compiler, inputs, and phase8 files changed during replay');
  assertCheckouts();
  receipt = { schema: 'rift-bend-required-fanout-phase8/1', passed: true,
    source: { pristine, pin, patchShas: patchFiles.map((file) => sha(fs.readFileSync(file))),
      phase8PatchSha256: sha(fs.readFileSync(phase8Patch)), fixtureSha256: sha(fs.readFileSync(fixture)),
      inputHashes: before, phase6CompilerSha256, phase8CompilerSha256: phase8CompSha256 },
    compiler: { schema: build.schema, caller: build.caller, slots: build.slots,
      helperArities: build.helperArities, regionCap: build.cap,
      runtime: build.runtime, emittedModules: Object.keys(build.files).sort(),
      noSuffix: { jsSha256: sha(noSuffixAfter), cSha256: sha(noSuffixCAfter), unchangedAfterBuild: true } },
    deterministicRuntime: deterministic, chrome: browser,
    scope: 'ordered isolated 2.0.32 compiler replay through phase8; one checked direct parallel-let lowered into the exact pinned phase7 bounded Worker pool; three required jobs plus a local never sibling; deterministic cap/cancel/failure controls and one real Chrome module-Worker witness only; not game integration, multi-engine acceptance, native/GPU, proof gates, pin amendment, or release readiness' };
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
