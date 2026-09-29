import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.BEND_NO_TELEMETRY = '1';
let nodeFetchCalls = 0;
globalThis.fetch = async () => {
  nodeFetchCalls++;
  throw new Error('network access is disabled in this test');
};

const { chromium } = await import('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../');
const scout = path.join(repo, '.artifacts/toolchains/bend-2.0.32-scout');
const derived = path.join(repo, '.artifacts/bend2/toolchain-patches/derived-2032');
const canonical = path.join(repo, '.artifacts/toolchains/bend');
const phase2Fixture = path.join(here, '../phase2/fixtures/policies.bend');
const baseSource = path.join(scout, 'bend2/base.bend');
const phase1 = path.join(repo, 'bend2/toolchain-patches/004-web-workers/rebase-2032/selected-module.mjs');
const phase3Runtime = path.join(repo, 'bend2/toolchain-patches/004-web-workers/rebase-2032/phase3/runtime.mjs');
const phase3Worker = path.join(repo, 'bend2/toolchain-patches/004-web-workers/rebase-2032/phase3/node-worker.mjs');
const driverFile = path.join(here, 'browser-driver.mjs');
const workerFile = path.join(here, 'worker-bootstrap.mjs');
const testFile = fileURLToPath(import.meta.url);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const release = '573002f01ec6c52416d44489543f69a9625facf8';
const pin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const expectedCompiler = {
  'bend2/bend.ts': '2def95c26e150c5a66a1a8ba3e5dd6ec5de3a8dd822627976f606a273b0cea88',
  'bend2/comp.ts': '4f420f4a9b9efadfb5708fa2e20703fbc44e130365805c4b1be09f3c276e39b1',
  'bend2/main.ts': 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
};
const patchStack = [
  ['001-arity/rebase-2032/0001-arity-diagnostics.patch',
    '98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db'],
  ['002-layout/rebase-2032/0002-after-001-2.0.32.patch',
    '2ed566176148cc1e064d2dae4c806c7912d557e38570ecfa5f47ddd0d78d395d'],
  ['005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch',
    '99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4'],
  ['004-web-workers/rebase-2032/phase2/0004-parser-plan-after-005-2.0.32.patch',
    'bfdd64270c7714376c64a0306a58892d8a872d96f9d4bace0be091bf894fdb13'],
].map(([relative, hash]) => [path.join(repo, 'bend2/toolchain-patches', relative), hash]);
const inputPaths = [
  ...Object.keys(expectedCompiler).map((file) => path.join(derived, file)),
  baseSource, phase2Fixture, phase1, phase3Runtime, phase3Worker, driverFile, workerFile, testFile,
  path.join(repo, 'bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/test.mjs'),
  path.join(repo, 'package.json'), path.join(repo, 'package-lock.json'),
  ...patchStack.map(([file]) => file),
];

function git(directory, ...args) {
  return execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8' }).replace(/\r\n/g, '\n').trimEnd();
}
function snapshot() {
  const result = Object.fromEntries(inputPaths.map((file) => [
    path.relative(repo, file).replaceAll('\\', '/'), sha(fs.readFileSync(file)),
  ]));
  for (const [file, expected] of patchStack) {
    assert.equal(result[path.relative(repo, file).replaceAll('\\', '/')], expected, `patch changed: ${file}`);
  }
  for (const [file, expected] of Object.entries(expectedCompiler)) {
    assert.equal(result[path.relative(repo, path.join(derived, file)).replaceAll('\\', '/')],
      expected, `derived compiler changed: ${file}`);
  }
  return result;
}
function assertCheckoutBindings() {
  assert.equal(git(scout, 'rev-parse', 'HEAD'), release);
  assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
  assert.equal(git(derived, 'rev-parse', 'HEAD'), release);
  assert.equal(git(derived, 'status', '--porcelain', '--untracked-files=all'),
    ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts');
  assert.equal(git(canonical, 'rev-parse', 'HEAD'), pin);
  assert.equal(git(canonical, 'status', '--porcelain', '--untracked-files=all'), '');
}
async function load(Bend, file) {
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
function planForBrowser(plan) {
  return { sourceEligible: plan.sourceEligible,
    calls: plan.calls.map(({ policy, to }) => ({ policy, to })),
    requirements: plan.requirements.map(({ to, max }) => ({ to, max })) };
}
function selectedBytes(selectedModule, Bend, Comp, book, root) {
  return Buffer.from(selectedModule(Bend, Comp, book, [root]), 'utf8');
}
function allocateTempOutputs(state, parent, outputs, { beforeResolve = () => {},
  writeFileSync = fs.writeFileSync } = {}) {
  state.allocated = fs.mkdtempSync(path.join(parent, 'rift-bend-phase4-browser-'));
  const lexical = path.resolve(state.allocated);
  assert.equal(path.dirname(lexical), parent);
  assert.match(path.basename(lexical), /^rift-bend-phase4-browser-[^\\/]+$/);
  const stat = fs.lstatSync(lexical, { bigint: true });
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  state.identity = { dev: stat.dev, ino: stat.ino, birthtimeNs: stat.birthtimeNs, mode: stat.mode };
  beforeResolve(lexical);
  const real = fs.realpathSync(lexical);
  assert.equal(real, lexical);
  state.captured = { real, identity: state.identity };
  state.outputs = [];
  for (const [name, bytes] of outputs) {
    assert.equal(path.basename(name), name, 'temporary output name must be a basename');
    const file = path.join(real, name);
    assert.equal(path.dirname(path.resolve(file)), real);
    state.outputs.push(file);
    writeFileSync(file, bytes, { flag: 'wx' });
  }
}
function assertTempIdentity(state, parent) {
  assert.ok(state.allocated && state.identity, 'temporary directory lacks captured ownership identity');
  const lexical = path.resolve(state.allocated);
  assert.equal(path.dirname(lexical), parent);
  assert.match(path.basename(lexical), /^rift-bend-phase4-browser-[^\\/]+$/);
  const current = fs.lstatSync(lexical, { bigint: true });
  assert.ok(current.isDirectory() && !current.isSymbolicLink());
  for (const key of ['dev', 'ino', 'birthtimeNs', 'mode']) assert.equal(current[key], state.identity[key]);
  const real = fs.realpathSync(lexical);
  assert.equal(real, state.captured?.real ?? lexical);
  assert.equal(path.dirname(real), parent);
  return real;
}
function cleanupTempOutputs(state, parent) {
  if (!state.allocated) return;
  const exact = assertTempIdentity(state, parent);
  fs.rmSync(exact, { recursive: true, force: false });
  assert.equal(fs.existsSync(exact), false);
  state.cleaned = true;
}
async function settleResources(primaryError, actions) {
  const cleanupErrors = [];
  for (const [resource, cleanup] of actions) {
    try { await cleanup(); } catch (error) { cleanupErrors.push({ resource, error }); }
  }
  if (primaryError) {
    if (cleanupErrors.length) primaryError.cleanupFailures = cleanupErrors.map(({ resource, error }) => ({
      resource, message: String(error?.message ?? error),
    }));
    throw primaryError;
  }
  if (cleanupErrors.length) {
    throw new AggregateError(cleanupErrors.map(({ resource, error }) =>
      new Error(`${resource}: ${String(error?.message ?? error)}`, { cause: error })),
    'phase4 fixture teardown failed');
  }
}
async function closeFixtureServer(server) {
  if (!server?.listening) return;
  let timer;
  const closed = new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  server.closeAllConnections();
  try {
    await Promise.race([closed, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('loopback server close timed out')), 5000);
    })]);
  } finally {
    clearTimeout(timer);
  }
}
async function closeFixtureBrowser(browser) {
  let timer;
  try {
    await Promise.race([Promise.resolve().then(() => browser.close()), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Chrome close timed out')), 5000);
    })]);
  } finally {
    clearTimeout(timer);
  }
}
function chromeExecutable(chromium) {
  const override = process.env.BEND_PHASE4_CHROME;
  const candidates = override ? [path.resolve(override)] : [];
  if (!override) {
    if (os.platform() === 'win32') {
      candidates.push(
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google/Chrome/Application/chrome.exe'));
      if (process.env.LOCALAPPDATA) {
        candidates.push(path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'));
      }
    } else if (os.platform() === 'darwin') {
      candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    } else {
      candidates.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
        '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
    }
    candidates.push(chromium.executablePath());
  }
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return fs.realpathSync(candidate);
    } catch {}
  }
  throw new Error(override
    ? `BEND_PHASE4_CHROME does not name an available browser file: ${candidates[0]}`
    : `Chrome/Chromium is unavailable; set BEND_PHASE4_CHROME to its executable path (checked: ${candidates.join(', ')})`);
}
async function failureInjectionProbes(parent) {
  const captureState = {};
  try {
    assert.throws(() => allocateTempOutputs(captureState, parent, [], {
      beforeResolve: () => { throw new Error('injected capture failure'); },
    }), /injected capture failure/);
  } finally {
    cleanupTempOutputs(captureState, parent);
  }
  assert.equal(captureState.cleaned, true);

  const writeState = {};
  let writeCount = 0;
  try {
    assert.throws(() => allocateTempOutputs(writeState, parent,
      [['first.mjs', Buffer.from('first')], ['second.mjs', Buffer.from('second')]], {
        writeFileSync: (...args) => {
          if (++writeCount === 2) throw new Error('injected write failure');
          fs.writeFileSync(...args);
        },
      }), /injected write failure/);
  } finally {
    cleanupTempOutputs(writeState, parent);
  }
  assert.equal(writeState.cleaned, true);

  const primary = new Error('injected primary failure');
  const attempted = [];
  await assert.rejects(settleResources(primary, [
    ['browser.close', async () => { attempted.push('browser.close'); throw new Error('injected close failure'); }],
    ['server.close', async () => { attempted.push('server.close'); }],
    ['temporary output', async () => { attempted.push('temporary output'); }],
  ]), (error) => error === primary);
  assert.deepEqual(attempted, ['browser.close', 'server.close', 'temporary output']);
  assert.deepEqual(primary.cleanupFailures.map(({ resource }) => resource), ['browser.close']);
}

assertCheckoutBindings();
const before = snapshot();
const Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')));
const Comp = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')));
const { selectedModule } = await import(pathToFileURL(phase1));
const { invokeSelected } = await import(pathToFileURL(phase3Runtime));
assert.equal(sha(fs.readFileSync(phase2Fixture)), '9204db93874b8c2a59ccae988211298e29d7c21945c06bae8452d6addafe9a6d');
const book = await load(Bend, phase2Fixture);
const requiredPlan = Comp.plan_web_workers(book, ['required']);
const neverPlan = Comp.plan_web_workers(book, ['never_call']);
const blockedPlan = Comp.plan_web_workers(book, ['required_arithmetic']);
assert.equal(requiredPlan.sourceEligible, true);
assert.deepEqual(requiredPlan.calls.map(({ to, policy }) => [to, policy]), [['identity', 'require']]);
assert.equal(requiredPlan.requirements.length, 1);
assert.equal(neverPlan.sourceEligible, true);
assert.deepEqual(neverPlan.calls.map(({ to, policy }) => [to, policy]), [['identity', 'never']]);
assert.equal(neverPlan.requirements.length, 0);
assert.equal(blockedPlan.sourceEligible, false);
assert.ok(blockedPlan.conflicts.some(({ kind }) => kind === 'require_unsupported'));

let blockedWorkerCreated = false;
await assert.rejects(invokeSelected({ bend: Bend, compiler: Comp, book,
  root: 'required_arithmetic', args: [40], mode: 'auto', timeoutMs: 5000,
  onWorkerCreated: () => { blockedWorkerCreated = true; },
}), (error) => error?.code === 'policy_conflict');
assert.equal(blockedWorkerCreated, false, 'blocked required root reached Node Worker construction');

const tempParent = fs.realpathSync(os.tmpdir());
await failureInjectionProbes(tempParent);
const requiredModule = selectedBytes(selectedModule, Bend, Comp, book, 'required');
const neverModule = selectedBytes(selectedModule, Bend, Comp, book, 'never_call');
const generatedHashes = { required: sha(requiredModule), never_call: sha(neverModule) };
const csp = "default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
const html = '<!doctype html><meta charset="utf-8"><title>Bend phase4 module Worker</title><script type="module" src="/browser-driver.mjs"></script>';
const served = [];
const rejectedLocalRequests = [];
const tempState = {};
let server;
let browser;
let receipt;
let primaryError;
try {
  allocateTempOutputs(tempState, tempParent, [
    ['selected-required.mjs', requiredModule], ['selected-never.mjs', neverModule],
  ]);
  const requiredPath = path.join(tempState.captured.real, 'selected-required.mjs');
  const neverPath = path.join(tempState.captured.real, 'selected-never.mjs');
  const allowed = new Map([
    ['/', { bytes: Buffer.from(html), type: 'text/html; charset=utf-8' }],
    ['/browser-driver.mjs', { bytes: fs.readFileSync(driverFile), type: 'text/javascript; charset=utf-8' }],
    ['/worker-bootstrap.mjs', { bytes: fs.readFileSync(workerFile), type: 'text/javascript; charset=utf-8' }],
    ['/selected-required.mjs', { file: requiredPath, type: 'text/javascript; charset=utf-8' }],
    ['/selected-never.mjs', { file: neverPath, type: 'text/javascript; charset=utf-8' }],
  ]);
  server = http.createServer((request, response) => {
    const remote = request.socket.remoteAddress;
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const item = allowed.get(url.pathname);
    if (request.method !== 'GET' || !item
      || !['127.0.0.1', '::ffff:127.0.0.1'].includes(remote)) {
      rejectedLocalRequests.push({ method: request.method, path: url.pathname });
      response.writeHead(404, { 'Cache-Control': 'no-store' }).end();
      return;
    }
    const bytes = item.file ? fs.readFileSync(item.file) : item.bytes;
    served.push({ path: url.pathname, type: item.type, sha256: sha(bytes) });
    response.writeHead(200, { 'Content-Type': item.type, 'Content-Length': bytes.length,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin', 'Content-Security-Policy': csp }).end(bytes);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const chrome = chromeExecutable(chromium);
  browser = await chromium.launch({ headless: true, executablePath: chrome, timeout: 10000 });
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  const outside = [];
  const pageErrors = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== origin) outside.push(request.url());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/*', async (route) => {
    if (new URL(route.request().url()).origin !== origin) {
      outside.push(route.request().url());
      await route.abort('blockedbyclient');
    } else await route.continue();
  });
  await page.goto(`${origin}/`, { waitUntil: 'load', timeout: 8000 });
  await page.waitForFunction(() => window.phase4Ready === true, null, { timeout: 5000 });
  const workerResult = await page.evaluate(({ plan }) => window.phase4Browser.required({
    plan, root: 'required', args: [40], moduleUrl: `${location.origin}/selected-required.mjs`,
  }), { plan: planForBrowser(requiredPlan) });
  assert.equal(workerResult.ok, true);
  assert.equal(workerResult.root, 'required');
  assert.deepEqual(workerResult.exports, ['required']);
  assert.equal(workerResult.value, 40);
  assert.equal(workerResult.workerFetchCalls, 0);
  assert.equal(workerResult.workerCreations, 1);
  assert.deepEqual(workerResult.workerKinds, ['module']);
  const neverResult = await page.evaluate(({ plan }) => window.phase4Browser.never({
    plan, root: 'never_call', args: [42], moduleUrl: `${location.origin}/selected-never.mjs`,
  }), { plan: planForBrowser(neverPlan) });
  assert.deepEqual(neverResult.exports, ['never_call']);
  assert.equal(neverResult.value, 42);
  assert.equal(neverResult.workerDelta, 0);
  assert.equal(neverResult.workerCreations, 1);
  assert.equal(neverResult.pageFetchCalls, 0);
  assert.deepEqual(outside, [], 'browser fixture attempted a non-loopback request');
  assert.deepEqual(pageErrors, []);
  assert.deepEqual([...new Set(served.map(({ path: route }) => route))].sort(),
    ['/', '/browser-driver.mjs', '/selected-never.mjs', '/selected-required.mjs', '/worker-bootstrap.mjs']);
  assert.deepEqual(rejectedLocalRequests, []);
  assert.ok(served.filter(({ path: route }) => route.endsWith('.mjs'))
    .every(({ type }) => type.startsWith('text/javascript')));
  const servedHash = (route) => {
    const matches = served.filter(({ path: servedPath }) => servedPath === route);
    assert.equal(matches.length, 1, `${route} was not served exactly once`);
    return matches[0].sha256;
  };
  assert.equal(servedHash('/selected-required.mjs'), generatedHashes.required,
    'served required module differs from emitted bytes');
  assert.equal(servedHash('/selected-never.mjs'), generatedHashes.never_call,
    'served never module differs from emitted bytes');
  assert.equal(servedHash('/browser-driver.mjs'), before[path.relative(repo, driverFile).replaceAll('\\', '/')],
    'served browser driver differs from its bound source bytes');
  assert.equal(servedHash('/worker-bootstrap.mjs'), before[path.relative(repo, workerFile).replaceAll('\\', '/')],
    'served worker bootstrap differs from its bound source bytes');
  assert.equal(nodeFetchCalls, 0);
  assertTempIdentity(tempState, tempParent);
  assert.deepEqual(snapshot(), before, 'source/compiler/patch/test bytes changed during browser run');
  assertCheckoutBindings();
  receipt = { schema: 'rift-bend-worker-browser-phase4/1', passed: true,
    browser: browser.version(), upstream: release, derivedCompiler: expectedCompiler,
    chromeExecutable: path.basename(chrome),
    patchStack: patchStack.map(([file, hash]) => ({
      path: path.relative(repo, file).replaceAll('\\', '/'), sha256: hash })),
    inputSha256: before, generatedModuleSha256: generatedHashes,
    required: { export: workerResult.exports, value: workerResult.value,
      dispatch: 'Worker(type=module)', workerFetchCalls: workerResult.workerFetchCalls },
    never: { export: neverResult.exports, value: neverResult.value,
      dispatch: 'local sync', workerDelta: neverResult.workerDelta },
    blockedRequired: { root: 'required_arithmetic', conflict: 'require_unsupported',
      rejectedBeforeWorker: !blockedWorkerCreated },
    served, rejectedLocalRequests, outsideRequests: outside.length, nodeFetchCalls,
    scope: 'one real Chrome module Worker call and one local never call; not full scheduler, game, 107-case gate, frozen proofs, native, GPU, release or toolchain adoption' };
} catch (error) {
  primaryError = error;
}
await settleResources(primaryError, [
  ['browser.close', async () => { if (browser) { await closeFixtureBrowser(browser); browser = null; } }],
  ['loopback server', async () => { await closeFixtureServer(server); }],
  ['temporary output', async () => { cleanupTempOutputs(tempState, tempParent); }],
]);
receipt.temporaryOutputCleaned = tempState.cleaned === true;
console.log(JSON.stringify(receipt));
