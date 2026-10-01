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

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../..');
const scout = path.join(repo, '.artifacts/toolchains/bend-2.0.32-scout');
const canonical = path.join(repo, '.artifacts/toolchains/bend');
const fixture = path.join(here, 'fixtures/two-u32-leaf.bend');
const noSuffixFixture = path.join(repo,
  'bend2/toolchain-patches/004-web-workers/rebase-2032/fixtures/selected-root.bend');
const patchFile = path.join(here, '0006-two-u32-after-phase5-2.0.32.patch');
const testFile = fileURLToPath(import.meta.url);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pristine = '573002f01ec6c52416d44489543f69a9625facf8';
const pin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const syncJsSha256 = '3c99dcd84414a057fce65edb45dd69d600e6b57bee49aec23e7333130a510a1d';
const syncCSha256 = '9cb68b124aa2865f21a3c1cdb633bf691d45d1f06a8eea496869d2585750a009';
const phase6CompSha256 = '0f2366677b546498b137b0d08684a36230a72f4df4cabca27293076fb78faa11';
const fixtureSha256 = 'c8a5bcf43624b9b35e7fdc853b62ab573aefe18def5b87bc665591df40581c98';
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
const inputPaths = [fixture, testFile, noSuffixFixture,
  path.join(repo, 'bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/fixtures/policies.bend'),
  path.join(repo, 'package.json'), path.join(repo, 'package-lock.json'),
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
    if (expected !== null) {
      assert.equal(result[path.relative(repo, file).replaceAll('\\', '/')], expected,
        `ordered patch bytes changed: ${file}`);
    }
  }
  return result;
}
function assertCheckoutBindings() {
  assert.equal(git(scout, 'rev-parse', 'HEAD'), pristine);
  assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
  assert.equal(git(canonical, 'rev-parse', 'HEAD'), pin);
  assert.equal(git(canonical, 'status', '--porcelain', '--untracked-files=all'), '');
}
function applyPatch(directory, file) {
  execFileSync('git', ['-C', directory, 'apply', file], { stdio: 'pipe' });
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
function allocateScratch(state, parent) {
  state.directory = fs.mkdtempSync(path.join(parent, 'rift-bend-phase6-two-u32-'));
  const lexical = path.resolve(state.directory);
  assert.equal(path.dirname(lexical), parent);
  assert.match(path.basename(lexical), /^rift-bend-phase6-two-u32-[^\\/]+$/);
  const stat = fs.lstatSync(lexical, { bigint: true });
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  state.identity = { dev: stat.dev, ino: stat.ino, birthtimeNs: stat.birthtimeNs, mode: stat.mode };
  state.real = fs.realpathSync(lexical);
  assert.equal(state.real, lexical);
  return state.real;
}
function cleanupScratch(state, parent) {
  if (!state.directory) return;
  const lexical = path.resolve(state.directory);
  assert.equal(path.dirname(lexical), parent);
  assert.match(path.basename(lexical), /^rift-bend-phase6-two-u32-[^\\/]+$/);
  const stat = fs.lstatSync(lexical, { bigint: true });
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  for (const key of ['dev', 'ino', 'birthtimeNs', 'mode']) assert.equal(stat[key], state.identity[key]);
  assert.equal(fs.realpathSync(lexical), state.real);
  assert.equal(path.dirname(state.real), parent);
  fs.rmSync(state.real, { recursive: true, force: false });
  assert.equal(fs.existsSync(state.real), false);
  state.cleaned = true;
}
function chromeExecutable(chromium) {
  const override = process.env.BEND_PHASE6_CHROME;
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
  return null;
}

async function runBrowser(build, unaryBuild) {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    return { available: false, reason: 'local Playwright package unavailable' };
  }
  const chrome = chromeExecutable(playwright.chromium);
  if (chrome === null) return { available: false, reason: 'local Chrome/Chromium executable unavailable' };

  const csp = "default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'";
  const testProgramSource = `${build.files['program.mjs']}\nexport { __bendPerCallDispatch as __phase6TestDispatch };\n`;
  const driver = `
import Program, { __bendPerCallTaskWitnesses as binaryWitnesses } from "./program.mjs";
import UnaryProgram, { __bendPerCallTaskWitnesses as unaryWitnesses } from "./unary/program.mjs";
import { __phase6TestDispatch } from "./program-test.mjs";
const NativeWorker = globalThis.Worker;
let workerCreations = 0;
let workerTerminations = 0;
globalThis.Worker = class extends NativeWorker {
  constructor(...args) { super(...args); workerCreations++; }
  terminate() { workerTerminations++; return super.terminate(); }
};
let pageFetchCalls = 0;
globalThis.fetch = async () => { pageFetchCalls++; throw new Error("page fetch disabled"); };
async function probeWorker(args, requestId) {
  return await new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.mjs", import.meta.url), { type: "module" });
    let settled = false;
    const timer = setTimeout(() => finish(new Error("malformed worker probe timed out")), 5000);
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { worker.terminate(); } catch (cleanupError) { error ??= cleanupError; }
      if (error) reject(error);
      else resolve(value);
    };
    worker.onmessage = ({ data }) => finish(null, data);
    worker.onerror = (event) => finish(new Error(event.message || "malformed worker probe failed"));
    worker.onmessageerror = () => finish(new Error("malformed worker probe could not be cloned"));
    try {
      worker.postMessage({ protocol: "bend-percall-worker/2032-1", requestId,
        callee: "second", args });
    } catch (error) { finish(error); }
  });
}
async function rejectSparseDispatcherArgs(args) {
  try {
    await __phase6TestDispatch("second", args);
    return "accepted";
  } catch (error) {
    return String(error?.message ?? error);
  }
}
try {
  const missingFirst = new Array(2); missingFirst[1] = 2;
  const missingSecond = new Array(2); missingSecond[0] = 4;
  const dispatcherFirst = await rejectSparseDispatcherArgs(missingFirst);
  const dispatcherSecond = await rejectSparseDispatcherArgs(missingSecond);
  const workerFirst = await probeWorker(missingFirst, 901);
  const workerSecond = await probeWorker(missingSecond, 902);
  const orderedWorkerReply = await probeWorker([40, 2], 900);
  const binaryValue = await Program.caller(40);
  const unaryValue = await UnaryProgram.unary_caller(40);
  window.phase6Result = { error: null, binaryValue, unaryValue,
    dispatcherRejects: [dispatcherFirst, dispatcherSecond],
    malformedWorkerReplies: [workerFirst, workerSecond], orderedWorkerArgs: [40, 2],
    orderedWorkerReply, workerCreations,
    workerTerminations, pageFetchCalls, binaryWitnesses, unaryWitnesses };
} catch (error) {
  window.phase6Result = { error: String(error?.message ?? error), workerCreations,
    workerTerminations, pageFetchCalls, binaryWitnesses, unaryWitnesses };
}
`;
  const assets = new Map([
    ['/driver.mjs', Buffer.from(driver)],
    ['/program-test.mjs', Buffer.from(testProgramSource)],
    ...Object.entries(build.files).map(([name, source]) => [`/${name}`, Buffer.from(source)]),
    ...Object.entries(unaryBuild.files).map(([name, source]) => [`/unary/${name}`, Buffer.from(source)]),
  ]);
  const served = [];
  const rejectedRequests = [];
  const outsideRequests = [];
  const pageErrors = [];
  const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"></head><body><script type="module" src="/driver.mjs"></script></body></html>');
  let browser;
  let server;
  try {
    server = http.createServer((request, response) => {
      const remote = request.socket.remoteAddress;
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      if (request.method !== 'GET' || !['127.0.0.1', '::ffff:127.0.0.1'].includes(remote)) {
        rejectedRequests.push({ method: request.method, path: url.pathname });
        response.writeHead(404, { 'Cache-Control': 'no-store' }).end();
        return;
      }
      if (url.pathname === '/favicon.ico') {
        response.writeHead(204, { 'Cache-Control': 'no-store', 'Content-Security-Policy': csp }).end();
        return;
      }
      const bytes = url.pathname === '/' ? html : assets.get(url.pathname);
      if (bytes === undefined) {
        rejectedRequests.push({ method: request.method, path: url.pathname });
        response.writeHead(404, { 'Cache-Control': 'no-store' }).end();
        return;
      }
      served.push({ path: url.pathname, sha256: sha(bytes) });
      const type = url.pathname === '/' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8';
      response.writeHead(200, { 'Content-Type': type, 'Content-Length': bytes.length,
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'same-origin', 'Content-Security-Policy': csp }).end(bytes);
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    browser = await playwright.chromium.launch({ headless: true, executablePath: chrome, timeout: 10000 });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const origin = `http://127.0.0.1:${server.address().port}`;
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin) outsideRequests.push(request.url());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.route('**/*', async (route) => {
      if (new URL(route.request().url()).origin !== origin) {
        outsideRequests.push(route.request().url());
        await route.abort('blockedbyclient');
      } else await route.continue();
    });
    await page.goto(`${origin}/`, { waitUntil: 'load', timeout: 8000 });
    await page.waitForFunction(() => window.phase6Result !== undefined, null, { timeout: 15000 });
    const result = await page.evaluate(() => window.phase6Result);
    assert.equal(result.error, null);
    const badReply = (requestId) => ({ protocol: 'bend-percall-worker/2032-1',
      requestId, callee: 'second', ok: false, error: 'invalid required worker request', fetchCalls: 0 });
    assert.deepEqual(result, {
      error: null,
      binaryValue: 3,
      unaryValue: 41,
      dispatcherRejects: [
        'required worker accepts exactly 2 dense U32 argument(s)',
        'required worker accepts exactly 2 dense U32 argument(s)',
      ],
      malformedWorkerReplies: [badReply(901), badReply(902)],
      orderedWorkerArgs: [40, 2],
      orderedWorkerReply: { protocol: 'bend-percall-worker/2032-1', requestId: 900,
        callee: 'second', ok: true, value: 2,
        witness: { kind: 'bend-percall-task/2032-1', callee: 'second',
          workerScope: true, value: 2, fetchCalls: 0 } },
      workerCreations: 5,
      workerTerminations: 5,
      pageFetchCalls: 0,
      binaryWitnesses: [{ kind: 'bend-percall-task/2032-1', callee: 'second',
        workerScope: true, value: 2, fetchCalls: 0, requestId: 1 }],
      unaryWitnesses: [{ kind: 'bend-percall-task/2032-1', callee: 'identity',
        workerScope: true, value: 40, fetchCalls: 0, requestId: 1 }],
    });
    assert.deepEqual(outsideRequests, []);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(rejectedRequests, []);
    const expectedRoutes = ['/', '/driver.mjs', '/program-test.mjs', '/program.mjs',
      '/worker.mjs', '/callee.mjs', '/unary/program.mjs', '/unary/worker.mjs', '/unary/callee.mjs'];
    assert.deepEqual([...new Set(served.map(({ path: route }) => route))].sort(), expectedRoutes.sort());
    for (const [name, source] of Object.entries(build.files)) {
      const route = `/${name}`;
      const item = served.find(({ path: servedPath }) => servedPath === route);
      assert.ok(item, `${route} was not served`);
      assert.equal(item.sha256, sha(Buffer.from(source)), `${route} differs from compiler output`);
    }
    for (const [name, source] of Object.entries(unaryBuild.files)) {
      const route = `/unary/${name}`;
      const item = served.find(({ path: servedPath }) => servedPath === route);
      assert.ok(item, `${route} was not served`);
      assert.equal(item.sha256, sha(Buffer.from(source)), `${route} differs from unary compiler output`);
    }
    const testProgramItem = served.find(({ path: servedPath }) => servedPath === '/program-test.mjs');
    assert.equal(testProgramItem?.sha256, sha(Buffer.from(testProgramSource)));
    return { available: true, browserVersion: browser.version(), chromeExecutable: path.basename(chrome),
      values: { binary: result.binaryValue, unary: result.unaryValue,
        orderedWorkerArgs: result.orderedWorkerArgs, orderedWorker: result.orderedWorkerReply.value },
      workerCreations: result.workerCreations,
      workerTerminations: result.workerTerminations, dispatcherRejects: result.dispatcherRejects,
      malformedWorkerReplies: result.malformedWorkerReplies,
      binaryWitnesses: result.binaryWitnesses, unaryWitness: result.unaryWitnesses[0],
      localRequests: served.map(({ path: route }) => route), outsideRequests: outsideRequests.length };
  } finally {
    if (browser) await browser.close();
    if (server?.listening) await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  }
}

assert.equal(process.platform, 'win32', 'phase-six fixture is pinned to the Windows Node/browser environment');
assert.equal(process.arch, 'x64');
assert.equal(process.version, 'v24.12.0');
assert.equal(sha(fs.readFileSync(process.execPath)),
  '2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8');
assertCheckoutBindings();
const before = snapshot();
assert.equal(sha(fs.readFileSync(fixture)), fixtureSha256, 'fixture bytes changed');
assert.equal(before[path.relative(repo, noSuffixFixture).replaceAll('\\', '/')],
  'dac7bc132314f909bc25af27ade1b0f7a680a62bc39d8e4cea5aa4978f4a2415');

const scratchParent = fs.realpathSync(os.tmpdir());
const scratchState = {};
const scratch = allocateScratch(scratchState, scratchParent);
let primaryError;
let receipt;
try {
  const sourceBend2 = path.join(scout, 'bend2');
  const targetBend2 = path.join(scratch, 'bend2');
  fs.mkdirSync(targetBend2, { recursive: true });
  for (const file of ['bend.ts', 'comp.ts', 'main.ts', 'base.bend']) {
    fs.copyFileSync(path.join(sourceBend2, file), path.join(targetBend2, file));
  }
  fs.cpSync(path.join(sourceBend2, 'effs'), path.join(targetBend2, 'effs'), { recursive: true });
  for (const [file] of patchStack.slice(0, 4)) applyPatch(scratch, file);
  for (const [file, expected] of Object.entries({
    'bend2/bend.ts': '2def95c26e150c5a66a1a8ba3e5dd6ec5de3a8dd822627976f606a273b0cea88',
    'bend2/comp.ts': '4f420f4a9b9efadfb5708fa2e20703fbc44e130365805c4b1be09f3c276e39b1',
    'bend2/main.ts': 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
  })) assert.equal(sha(fs.readFileSync(path.join(scratch, file))), expected,
    `001→002→005→phase2 replay mismatch: ${file}`);

  const Bend = await import(pathToFileURL(path.join(targetBend2, 'bend.ts')));
  const phase2Comp = await import(pathToFileURL(path.join(targetBend2, 'comp.ts')).href + '?phase2');
  const noSuffixBook = await load(Bend, noSuffixFixture);
  const baselineJs = Buffer.from(phase2Comp.js_lib(noSuffixBook, false));
  const baselineC = Buffer.from(phase2Comp.compile_book(noSuffixBook));
  assert.equal(sha(baselineJs), syncJsSha256);
  assert.equal(sha(baselineC), syncCSha256);

  const phase5Patch = patchStack[4][0];
  applyPatch(scratch, phase5Patch);
  assert.equal(sha(fs.readFileSync(path.join(targetBend2, 'comp.ts'))),
    '288f301527997727189b07d1e8ed44030b2c8b5bea606b1ff4404943595f8fb8');
  const phase5Comp = await import(pathToFileURL(path.join(targetBend2, 'comp.ts')).href + '?phase5');
  assert.deepEqual(Buffer.from(phase5Comp.js_lib(noSuffixBook, false)), baselineJs,
    'phase-5 no-suffix JavaScript differs from the phase-2 baseline');
  assert.deepEqual(Buffer.from(phase5Comp.compile_book(noSuffixBook)), baselineC,
    'phase-5 no-suffix C differs from the phase-2 baseline');

  const phase6Patch = patchStack[5][0];
  assert.equal(sha(fs.readFileSync(phase6Patch)), '89da56c0062c07d2a14b580c0a363b053949eae76456697c7eed65bcdeedf468');
  applyPatch(scratch, phase6Patch);
  const finalCompHash = sha(fs.readFileSync(path.join(targetBend2, 'comp.ts')));
  assert.equal(finalCompHash, phase6CompSha256, 'phase-six compiler candidate bytes changed');
  const Comp = await import(pathToFileURL(path.join(targetBend2, 'comp.ts')).href + '?phase6');
  assert.deepEqual(Buffer.from(Comp.js_lib(noSuffixBook, false)), baselineJs,
    'phase-six no-suffix JavaScript differs from the phase-2 baseline');
  assert.deepEqual(Buffer.from(Comp.compile_book(noSuffixBook)), baselineC,
    'phase-six no-suffix C differs from the phase-2 baseline');

  const book = await load(Bend, fixture);
  const plan = Comp.plan_web_workers(book, ['caller']);
  assert.equal(plan.conflicts.length, 0, JSON.stringify({ conflicts: plan.conflicts,
    functions: plan.functions.filter(({ name }) => ['caller', 'second'].includes(name)), calls: plan.calls }));
  assert.deepEqual(plan.requirements.map(({ from, to }) => [from, to]), [['caller', 'second']]);
  const build = Comp.js_percall_lib(book, 'caller');
  assert.equal(build.schema, 'bend-percall-build/2032-2');
  assert.equal(build.caller, 'caller');
  assert.equal(build.callee, 'second');
  assert.equal(build.arity, 2);
  assert.deepEqual(Object.keys(build.files).sort(), ['callee.mjs', 'program.mjs', 'worker.mjs']);
  assert.match(build.files['program.mjs'], /async function \$caller\$/);
  assert.match(build.files['program.mjs'], /await __bendPerCallDispatch\("second", \[/);
  assert.match(build.files['worker.mjs'], /const expectedArity = 2/);
  assert.match(build.files['worker.mjs'], /library\[expectedCallee\]\(\.\.\.args\)/);
  assert.match(build.files['program.mjs'], /Object\.prototype\.hasOwnProperty\.call\(args, i\)/);
  assert.match(build.files['worker.mjs'], /Object\.prototype\.hasOwnProperty\.call\(args, i\)/);
  assert.doesNotMatch(build.files['program.mjs'], /args\.every\(/);
  assert.doesNotMatch(build.files['worker.mjs'], /args\.every\(/);
  assert.match(build.files['callee.mjs'], /\"second\"/);

  const unary = Comp.js_percall_lib(book, 'unary_caller');
  assert.equal(unary.callee, 'identity');
  assert.equal(unary.arity, 1, 'phase-five unary leaf remains supported');
  assert.equal(unary.schema, 'bend-percall-build/2032-2');
  for (const name of ['capped_caller', 'multi_caller', 'require_triple', 'require_pattern',
    'require_wrong_types', 'require_nonleaf', 'nested_caller', 'require_under_never']) {
    assert.throws(() => Comp.js_percall_lib(book, name), /worker|per-call|pure first-order/i,
      `${name} was not rejected by the strict binary-leaf boundary`);
  }
  assert.equal(nodeFetchCalls, 0);

  const unaryBuild = unary;
  assert.equal(unaryBuild.arity, 1);
  assert.match(unaryBuild.files['worker.mjs'], /const expectedArity = 1/);
  assert.match(unaryBuild.files['worker.mjs'], /library\[expectedCallee\]\(\.\.\.args\)/);
  assert.deepEqual(Buffer.from(Comp.js_lib(noSuffixBook, false)), baselineJs,
    'late no-suffix JavaScript differs after planner/build calls');
  assert.deepEqual(Buffer.from(Comp.compile_book(noSuffixBook)), baselineC,
    'late no-suffix C differs after planner/build calls');
  const browser = await runBrowser(build, unaryBuild);
  assert.deepEqual(snapshot(), before, 'bound source, compiler patches, or fixture changed during run');
  assertCheckoutBindings();
  receipt = { schema: 'rift-bend-percall-phase6-two-u32/1', passed: true,
    upstream: pristine, pin, compilerSha256: finalCompHash,
    patchSha256: sha(fs.readFileSync(phase6Patch)), fixtureSha256: sha(fs.readFileSync(fixture)),
    baseline: { jsSha256: sha(baselineJs), cSha256: sha(baselineC) },
    generatedSha256: { binary: Object.fromEntries(Object.entries(build.files)
      .map(([name, source]) => [name, sha(Buffer.from(source))])),
      unary: Object.fromEntries(Object.entries(unaryBuild.files)
        .map(([name, source]) => [name, sha(Buffer.from(source))])) },
    acceptedShape: 'one direct closed pure (U32, U32) -> U32 callee; U32 -> U32 caller',
    unaryCompatibility: { callee: unary.callee, arity: unary.arity },
    rejectedShapes: ['@N cap', 'multiple requirements', 'three-U32 callee',
      'wrong callee argument type', 'callee with a definition call',
      'planner-rejected pattern selector', 'nested requirement',
      'require under never'],
    browser, nodeFetchCalls,
    scope: 'source-bound narrow per-call compiler extension; no scheduler rewrite, multi-engine, hosted/offline, game, native, GPU, exhaustive lifecycle, proof or release acceptance' };
} catch (error) {
  primaryError = error;
} finally {
  try { cleanupScratch(scratchState, scratchParent); }
  catch (cleanupError) {
    if (primaryError) primaryError.cleanupError = cleanupError;
    else primaryError = cleanupError;
  }
}
if (primaryError) throw primaryError;
assert.equal(scratchState.cleaned, true);
receipt.temporaryCheckoutCleaned = true;
console.log(JSON.stringify(receipt));
