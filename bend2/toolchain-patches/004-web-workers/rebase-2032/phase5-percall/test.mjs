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
const derived = path.join(repo, '.artifacts/bend2/toolchain-patches/derived-2032');
const canonical = path.join(repo, '.artifacts/toolchains/bend');
const fixture = path.join(here, 'fixtures/percall-u32.bend');
const tailLoopFixture = path.join(here, 'fixtures/tail-loop.bend');
const noSuffixFixture = path.join(repo,
  'bend2/toolchain-patches/004-web-workers/rebase-2032/fixtures/selected-root.bend');
const patchFile = path.join(here, '0004-percall-u32-after-phase2-2.0.32.patch');
const testFile = fileURLToPath(import.meta.url);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pristine = '573002f01ec6c52416d44489543f69a9625facf8';
const pin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const syncJsSha256 = '3c99dcd84414a057fce65edb45dd69d600e6b57bee49aec23e7333130a510a1d';
const syncCSha256 = '9cb68b124aa2865f21a3c1cdb633bf691d45d1f06a8eea496869d2585750a009';
const compilerAfter = {
  'bend2/bend.ts': '2def95c26e150c5a66a1a8ba3e5dd6ec5de3a8dd822627976f606a273b0cea88',
  'bend2/comp.ts': '288f301527997727189b07d1e8ed44030b2c8b5bea606b1ff4404943595f8fb8',
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
  ['004-web-workers/rebase-2032/phase5-percall/0004-percall-u32-after-phase2-2.0.32.patch',
    '06e956f9f69c8c4a5d3dc0cd5f55c2633ab276f3cd99050e0ec9e36a2afa40be'],
].map(([relative, hash]) => [path.join(repo, 'bend2/toolchain-patches', relative), hash]);
const inputPaths = [fixture, tailLoopFixture, noSuffixFixture, testFile,
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
    assert.equal(result[path.relative(repo, file).replaceAll('\\', '/')], expected,
      `ordered patch bytes changed: ${file}`);
  }
  return result;
}
function assertCheckoutBindings() {
  assert.equal(git(scout, 'rev-parse', 'HEAD'), pristine);
  assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
  assert.equal(git(derived, 'rev-parse', 'HEAD'), pristine);
  assert.equal(git(derived, 'status', '--porcelain', '--untracked-files=all'),
    ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts');
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
function chromeExecutable(chromium) {
  const override = process.env.BEND_PHASE5_CHROME;
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
    ? `BEND_PHASE5_CHROME does not name an available browser file: ${candidates[0]}`
    : `Chrome/Chromium is unavailable; set BEND_PHASE5_CHROME (checked: ${candidates.join(', ')})`);
}
function allocateOutputs(state, parent, outputs) {
  state.allocated = fs.mkdtempSync(path.join(parent, 'rift-bend-phase5-percall-'));
  const lexical = path.resolve(state.allocated);
  assert.equal(path.dirname(lexical), parent);
  assert.match(path.basename(lexical), /^rift-bend-phase5-percall-[^\\/]+$/);
  const stat = fs.lstatSync(lexical, { bigint: true });
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  state.identity = { dev: stat.dev, ino: stat.ino, birthtimeNs: stat.birthtimeNs, mode: stat.mode };
  const real = fs.realpathSync(lexical);
  assert.equal(real, lexical);
  state.real = real;
  state.files = [];
  for (const [name, bytes] of outputs) {
    assert.equal(path.basename(name), name);
    const file = path.join(real, name);
    assert.equal(path.dirname(path.resolve(file)), real);
    fs.writeFileSync(file, bytes, { flag: 'wx' });
    state.files.push(file);
  }
}
function cleanupOutputs(state, parent) {
  if (!state.allocated) return;
  const lexical = path.resolve(state.allocated);
  assert.equal(path.dirname(lexical), parent);
  assert.match(path.basename(lexical), /^rift-bend-phase5-percall-[^\\/]+$/);
  const stat = fs.lstatSync(lexical, { bigint: true });
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  for (const key of ['dev', 'ino', 'birthtimeNs', 'mode']) assert.equal(stat[key], state.identity[key]);
  const real = fs.realpathSync(lexical);
  assert.equal(real, state.real);
  assert.equal(path.dirname(real), parent);
  fs.rmSync(real, { recursive: true, force: false });
  assert.equal(fs.existsSync(real), false);
  state.cleaned = true;
}

assert.equal(process.platform, 'win32', 'phase-five browser receipt is Windows-bound');
assert.equal(process.arch, 'x64');
assert.equal(process.version, 'v24.12.0');
assert.equal(sha(fs.readFileSync(process.execPath)),
  '2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8');
assertCheckoutBindings();
const before = snapshot();
assert.equal(before[path.relative(repo, fixture).replaceAll('\\', '/')],
  'fd7ab11f6045dde3a46f6b09d3ba575bbbf220012f01a9f04eece9f5c793d1cc');
assert.equal(before[path.relative(repo, tailLoopFixture).replaceAll('\\', '/')],
  '0fe21e0dac0002e95e376dcced0225ca3e6a187620b5dbce875c05dd86e039e5');
assert.equal(before[path.relative(repo, noSuffixFixture).replaceAll('\\', '/')],
  'dac7bc132314f909bc25af27ade1b0f7a680a62bc39d8e4cea5aa4978f4a2415');

const scratchParent = fs.realpathSync(os.tmpdir());
const scratch = fs.mkdtempSync(path.join(scratchParent, 'bend2-percall-replay-'));
const scratchStat = fs.lstatSync(scratch, { bigint: true });
const scratchIdentity = { dev: scratchStat.dev, ino: scratchStat.ino,
  birthtimeNs: scratchStat.birthtimeNs, mode: scratchStat.mode };
function cleanupScratch() {
  if (!fs.existsSync(scratch)) return;
  const exact = path.resolve(scratch);
  assert.equal(path.dirname(exact), scratchParent);
  assert.match(path.basename(exact), /^bend2-percall-replay-[^\\/]+$/);
  const stat = fs.lstatSync(exact, { bigint: true });
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  for (const key of ['dev', 'ino', 'birthtimeNs', 'mode']) assert.equal(stat[key], scratchIdentity[key]);
  assert.equal(fs.realpathSync(exact), exact);
  fs.rmSync(exact, { recursive: true, force: false });
}
process.once('exit', () => { try { cleanupScratch(); } catch {} });
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
const phase2Comp = await import(pathToFileURL(path.join(targetBend2, 'comp.ts')));
const noSuffixBook = await load(Bend, noSuffixFixture);
const baselineJs = Buffer.from(phase2Comp.js_lib(noSuffixBook, false));
const baselineC = Buffer.from(phase2Comp.compile_book(noSuffixBook));
assert.equal(sha(baselineJs), syncJsSha256);
assert.equal(sha(baselineC), syncCSha256);

applyPatch(scratch, patchFile);
for (const [file, expected] of Object.entries(compilerAfter)) {
  const actual = sha(fs.readFileSync(path.join(scratch, file)));
  assert.equal(actual, expected, `per-call compiler source hash mismatch: ${file}`);
  if (file !== 'bend2/comp.ts') {
    assert.equal(actual, sha(fs.readFileSync(path.join(derived, file))),
      `phase-five replay unexpectedly changed a non-emitter phase-two source: ${file}`);
  }
}
assert.equal(sha(fs.readFileSync(path.join(scratch, 'bend2/main.ts'))), compilerAfter['bend2/main.ts']);
const Comp = await import(pathToFileURL(path.join(targetBend2, 'comp.ts')).href + '?phase5=1');
assert.deepEqual(Buffer.from(Comp.js_lib(noSuffixBook, false)), baselineJs,
  'no-suffix JS output changed');
assert.deepEqual(Buffer.from(Comp.compile_book(noSuffixBook)), baselineC,
  'no-suffix C output changed');

const book = await load(Bend, fixture);
const plan = Comp.plan_web_workers(book, ['caller']);
assert.equal(plan.conflicts.length, 0);
assert.deepEqual(plan.requirements.map(({ from, to }) => [from, to]), [['caller', 'identity']]);
const build = Comp.js_percall_lib(book, 'caller');
assert.equal(build.schema, 'bend-percall-build/2032-1');
assert.equal(build.caller, 'caller');
assert.equal(build.callee, 'identity');
assert.deepEqual(Object.keys(build.files).sort(), ['callee.mjs', 'program.mjs', 'worker.mjs']);
assert.match(build.files['program.mjs'], /async function \$caller\$/);
assert.match(build.files['program.mjs'], /await __bendPerCallDispatch\("identity"/);
assert.match(build.files['worker.mjs'], /WorkerGlobalScope/);
assert.match(build.files['worker.mjs'], /bend-percall-task\/2032-1/);

for (const name of ['capped_caller', 'native_required', 'multi_caller',
  'required_intrinsic', 'required_pair', 'nested_caller',
  'require_under_never', 'never_call']) {
  assert.throws(() => Comp.js_percall_lib(book, name), /worker|per-call/,
    `${name} was not rejected by the strict compiler boundary`);
}
const ordinary = Comp.js_lib(book, true);
assert.doesNotMatch(ordinary, /new Worker\(/,
  'the synchronous library emitter must not route even source-never calls to a Worker');
const tailLoopBook = await load(Bend, tailLoopFixture);
assert.throws(() => Comp.js_percall_lib(tailLoopBook, 'recursive_caller'), /filled pure first-order/,
  'an unsafe self-recursive caller must fail the ordinary strict purity boundary');
const pureTailLoopSource = fs.readFileSync(tailLoopFixture, 'utf8').replace(/@unsafe\r?\n/, '');
const pureTailLoopPath = path.join(scratch, 'tail-loop-pure-rejected.bend');
fs.writeFileSync(pureTailLoopPath, pureTailLoopSource, { flag: 'wx' });
const pureTailLoopBook = Bend.book_nil();
let pureTailLoopError = '';
try {
  await Bend.book_load(pureTailLoopBook, pureTailLoopPath.replaceAll('\\', '/'), '', new Map());
  Bend.book_valid(pureTailLoopBook);
  assert.fail('Bend accepted the non-decreasing pure self-tail-recursive caller');
} catch (error) {
  pureTailLoopError = error?.$ === 'Err' ? Bend.err_show(error) : String(error?.message ?? error);
}
assert.match(pureTailLoopError, /decreasing self-call/,
  'the source checker did not guard the corresponding safe self-recursion');
const lateJs = Buffer.from(Comp.js_lib(noSuffixBook, false));
const lateC = Buffer.from(Comp.compile_book(noSuffixBook));
assert.deepEqual(lateJs, baselineJs,
  'no-suffix JavaScript changed after per-call and policy planner invocations');
assert.deepEqual(lateC, baselineC,
  'no-suffix C changed after per-call and policy planner invocations');
assert.equal(sha(lateJs), syncJsSha256);
assert.equal(sha(lateC), syncCSha256);

const tempParent = fs.realpathSync(os.tmpdir());
const tempState = {};
const outputs = [
  ...Object.entries(build.files).map(([name, text]) => [name, Buffer.from(text)]),
  ['local.mjs', Buffer.from(ordinary)],
];
const html = '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,">'
  + '<title>Bend per-call worker</title>'
  + '<script type="module" src="/driver.mjs"></script>';
const driver = `
let workerCreations = 0;
let workerTerminations = 0;
let terminateThrowsNext = false;
let pageFetchCalls = 0;
globalThis.fetch = async () => { pageFetchCalls++; throw new Error("network disabled in page"); };
const NativeWorker = globalThis.Worker;
globalThis.Worker = class extends NativeWorker {
  constructor(...args) { workerCreations++; super(...args); }
  terminate() {
    workerTerminations++;
    const result = super.terminate();
    if (terminateThrowsNext) {
      terminateThrowsNext = false;
      throw new Error("injected terminate failure");
    }
    return result;
  }
};
window.phase5Ready = false;
window.phase5Error = null;
try {
  const local = await import("/local.mjs");
  const localValue = local.default.never_call(41);
  if (localValue !== 41 || (localValue && typeof localValue.then === "function")) {
    throw new Error("source never was not a synchronous local call");
  }
  const localWorkerCreations = workerCreations;
  const perCall = await import("/program.mjs");
  const resumedValue = await perCall.default.caller(41);
  const negatives = {};
  const cleanupFailures = {};
  for (const mode of ["wrong-id", "wrong-kind", "extra-field", "fetch-attempt"]) {
    const module = await import("/" + mode + "/program.mjs");
    if (mode === "wrong-id") terminateThrowsNext = true;
    try {
      await module.default.caller(41);
      negatives[mode] = "unexpected success";
    } catch (error) {
      negatives[mode] = String(error?.message ?? error);
      if (mode === "wrong-id") {
        cleanupFailures.wrongIdReply = String(error?.cleanupError?.message ?? "missing");
      }
    }
  }
  const timeoutModule = await import("/timeout/program.mjs");
  try {
    await timeoutModule.default.caller(41);
    negatives.timeout = "unexpected success";
  } catch (error) {
    negatives.timeout = String(error?.message ?? error);
  }
  const originalPostMessage = NativeWorker.prototype.postMessage;
  try {
    NativeWorker.prototype.postMessage = function () { throw new Error("injected postMessage failure"); };
    await perCall.default.caller(41);
    negatives.postMessage = "unexpected success";
  } catch (error) {
    negatives.postMessage = String(error?.message ?? error);
  } finally {
    NativeWorker.prototype.postMessage = originalPostMessage;
  }
  const terminationProbe = await import("/program.mjs?terminate-probe");
  terminateThrowsNext = true;
  try {
    await terminationProbe.default.caller(41);
    negatives.terminate = "unexpected success";
  } catch (error) {
    negatives.terminate = String(error?.message ?? error);
  }
  window.phase5Result = { localValue, localWorkerCreations, resumedValue,
    workerCreations, workerTerminations, negatives, cleanupFailures,
    witnesses: perCall.__bendPerCallTaskWitnesses, pageFetchCalls };
} catch (error) {
  window.phase5Error = String(error?.stack || error);
}
window.phase5Ready = true;
`;
const csp = "default-src 'none'; script-src 'self'; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";
const negativeWorkers = new Map([
  ['wrong-id', `const protocol = "bend-percall-worker/2032-1"; self.onmessage = ({data}) => {
    const value = data.args[0]; const witness = {kind:"bend-percall-task/2032-1",callee:data.callee,workerScope:true,value,fetchCalls:0};
    self.postMessage({protocol,requestId:data.requestId+1,callee:data.callee,ok:true,value,witness}); };`],
  ['wrong-kind', `const protocol = "bend-percall-worker/2032-1"; self.onmessage = ({data}) => {
    const value = data.args[0]; const witness = {kind:"wrong-task-kind",callee:data.callee,workerScope:true,value,fetchCalls:0};
    self.postMessage({protocol,requestId:data.requestId,callee:data.callee,ok:true,value,witness}); };`],
  ['extra-field', `const protocol = "bend-percall-worker/2032-1"; self.onmessage = ({data}) => {
    const value = data.args[0]; const witness = {kind:"bend-percall-task/2032-1",callee:data.callee,workerScope:true,value,fetchCalls:0};
    self.postMessage({protocol,requestId:data.requestId,callee:data.callee,ok:true,value,witness,extra:true}); };`],
  ['fetch-attempt', `const protocol = "bend-percall-worker/2032-1"; let fetchCalls=0;
    globalThis.fetch=async()=>{fetchCalls++;throw new Error("injected data-url fetch");};
    self.onmessage = async ({data}) => { try { await fetch("data:text/plain,probe"); } catch {}
    const value=data.args[0]; const witness={kind:"bend-percall-task/2032-1",callee:data.callee,workerScope:true,value,fetchCalls};
    self.postMessage({protocol,requestId:data.requestId,callee:data.callee,ok:true,value,witness}); };`],
  ['timeout', 'self.onmessage = () => {};'],
]);
const allowed = new Map([
  ['/', { bytes: Buffer.from(html), type: 'text/html; charset=utf-8' }],
  ['/driver.mjs', { bytes: Buffer.from(driver), type: 'text/javascript; charset=utf-8' }],
]);
for (const [name, bytes] of outputs) {
  allowed.set(`/${name}`, { name, type: 'text/javascript; charset=utf-8' });
}
for (const [mode, source] of negativeWorkers) {
  for (const [name, bytes] of [['program.mjs', build.files['program.mjs']],
    ['worker.mjs', source]]) {
    allowed.set(`/${mode}/${name}`, { bytes: Buffer.from(bytes), type: 'text/javascript; charset=utf-8' });
  }
}
const served = [];
const rejectedRequests = [];
const outsideRequests = [];
const pageErrors = [];
let server;
let browser;
let receipt;
let primaryError;
try {
  allocateOutputs(tempState, tempParent, outputs);
  server = http.createServer((request, response) => {
    const remote = request.socket.remoteAddress;
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const item = allowed.get(url.pathname);
    if (request.method !== 'GET' || !item
      || !['127.0.0.1', '::ffff:127.0.0.1'].includes(remote)) {
      rejectedRequests.push({ method: request.method, path: url.pathname });
      response.writeHead(404, { 'Cache-Control': 'no-store' }).end();
      return;
    }
    const bytes = item.name ? fs.readFileSync(path.join(tempState.real, item.name)) : item.bytes;
    served.push({ path: url.pathname, type: item.type, sha256: sha(bytes) });
    response.writeHead(200, { 'Content-Type': item.type, 'Content-Length': bytes.length,
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin', 'Content-Security-Policy': csp }).end(bytes);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { chromium } = await import('playwright');
  const chrome = chromeExecutable(chromium);
  browser = await chromium.launch({ headless: true, executablePath: chrome, timeout: 10000 });
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
  await page.waitForFunction(() => window.phase5Ready === true, null, { timeout: 20000 });
  const browserResult = await page.evaluate(() => ({
    error: window.phase5Error,
    result: window.phase5Result,
  }));
  assert.equal(browserResult.error, null);
  assert.deepEqual(browserResult.result, {
    localValue: 41,
    localWorkerCreations: 0,
    resumedValue: 42,
    workerCreations: 8,
    workerTerminations: 8,
    negatives: {
      'wrong-id': 'required worker task witness or reply mismatch',
      'wrong-kind': 'required worker task witness or reply mismatch',
      'extra-field': 'required worker task witness or reply mismatch',
      'fetch-attempt': 'required worker task witness or reply mismatch',
      timeout: 'required worker timed out',
      postMessage: 'injected postMessage failure',
      terminate: 'injected terminate failure',
    },
    cleanupFailures: { wrongIdReply: 'injected terminate failure' },
    witnesses: [{ kind: 'bend-percall-task/2032-1', callee: 'identity',
      workerScope: true, value: 41, fetchCalls: 0, requestId: 1 }],
    pageFetchCalls: 0,
  });
  assert.deepEqual(outsideRequests, []);
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(rejectedRequests, []);
  const expectedRoutes = ['/', '/callee.mjs', '/driver.mjs', '/local.mjs', '/program.mjs', '/worker.mjs',
    ...[...negativeWorkers.keys()].flatMap((mode) => [`/${mode}/program.mjs`, `/${mode}/worker.mjs`])];
  assert.deepEqual([...new Set(served.map(({ path: route }) => route))].sort(), expectedRoutes.sort());
  assert.ok(served.filter(({ path: route }) => route.endsWith('.mjs'))
    .every(({ type }) => type.startsWith('text/javascript')));
  for (const [name, bytes] of outputs) {
    const route = `/${name}`;
    const item = served.find(({ path: servedPath }) => servedPath === route);
    assert.ok(item, `${route} was not served`);
    assert.equal(item.sha256, sha(bytes), `${route} bytes differ from compiler output`);
  }
  for (const [mode, source] of negativeWorkers) {
    for (const [name, bytes] of [['program.mjs', Buffer.from(build.files['program.mjs'])],
      ['worker.mjs', Buffer.from(source)]]) {
      const route = `/${mode}/${name}`;
      const item = served.find(({ path: servedPath }) => servedPath === route);
      assert.ok(item, `${route} was not served`);
      assert.equal(item.sha256, sha(bytes), `${route} bytes differ from the bound adversarial fixture`);
    }
  }
  assert.equal(nodeFetchCalls, 0);
  assert.deepEqual(snapshot(), before, 'bound source, compiler, patches or fixture changed during run');
  assertCheckoutBindings();
  receipt = { schema: 'rift-bend-percall-phase5/1', passed: true,
    upstream: pristine, pin, compilerAfter, patchStack: patchStack.map(([file, hash]) => ({
      path: path.relative(repo, file).replaceAll('\\', '/'), sha256: hash,
    })), inputSha256: before, generatedSha256: Object.fromEntries(outputs.map(([name, bytes]) => [name, sha(bytes)])),
    browser: browser.version(), chromeExecutable: path.basename(chrome),
    dispatch: 'one real module Worker call to compiled identity U32 -> U32 callee',
    taskWitness: browserResult.result.witnesses[0],
    localNever: { value: browserResult.result.localValue,
      workerCreations: browserResult.result.localWorkerCreations },
    resumedCallerResult: browserResult.result.resumedValue,
    nodeFetchCalls, outsideRequests: outsideRequests.length,
    runtimeNegativeCases: Object.keys(browserResult.result.negatives),
    scope: 'one strict per-call closed U32 shape, bounded message/timeout/transport-cleanup controls and policy negatives; not 107-case, full 004, multi-engine, game, hosted, native, GPU or release acceptance' };
} catch (error) {
  primaryError = error;
}
const cleanupErrors = [];
try { if (browser) await browser.close(); } catch (error) { cleanupErrors.push(error); }
try {
  if (server?.listening) await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  });
} catch (error) { cleanupErrors.push(error); }
try { cleanupOutputs(tempState, tempParent); } catch (error) { cleanupErrors.push(error); }
try {
  cleanupScratch();
} catch (error) { cleanupErrors.push(error); }
if (primaryError) {
  if (cleanupErrors.length) primaryError.cleanupFailures = cleanupErrors.map((error) => String(error));
  throw primaryError;
}
if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'phase-five cleanup failed');
receipt.temporaryOutputCleaned = tempState.cleaned === true;
console.log(JSON.stringify(receipt));
