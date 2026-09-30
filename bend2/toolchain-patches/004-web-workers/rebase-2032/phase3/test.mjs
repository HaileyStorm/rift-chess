import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker as NodeWorker } from 'node:worker_threads';

process.env.BEND_NO_TELEMETRY = '1';
let networkCalls = 0;
globalThis.fetch = async () => {
  networkCalls++;
  throw new Error('unexpected network access');
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../..');
const derived = path.join(repo, '.artifacts/bend2/toolchain-patches/derived-2032');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const host = process.versions.bun ? {
  name: 'Bun', version: 'v26.3.0', bunVersion: '1.4.2',
  executableSha256: '15277c59ccd6c6c20f8dc9716c2b59c1776320d606b6a8658f70be8799519ca4',
  syncJsSha256: 'efe64dca089a1922152144681e772e75c59807be07dc0ff892d2b3349a11a874',
} : {
  name: 'Node', version: 'v24.12.0',
  executableSha256: '2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8',
  syncJsSha256: '3c99dcd84414a057fce65edb45dd69d600e6b57bee49aec23e7333130a510a1d',
};
assert.equal(process.platform, 'win32', 'phase3 runtime receipt is Windows-bound');
assert.equal(process.arch, 'x64');
assert.equal(process.version, host.version);
if (host.bunVersion) assert.equal(process.versions.bun, host.bunVersion);
assert.equal(sha(fs.readFileSync(process.execPath)), host.executableSha256);
assert.equal(fs.realpathSync(derived), derived, 'phase3 derived compiler root redirected');
const inputHashes = new Map([
  [path.join(derived, 'bend2/bend.ts'), '2def95c26e150c5a66a1a8ba3e5dd6ec5de3a8dd822627976f606a273b0cea88'],
  [path.join(derived, 'bend2/comp.ts'), '4f420f4a9b9efadfb5708fa2e20703fbc44e130365805c4b1be09f3c276e39b1'],
  [path.join(derived, 'bend2/main.ts'), 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae'],
  [path.join(here, 'runtime.mjs'), '96530bd87f177b5a2c0452d4d72e548921b04854f77f583fb606a74f7249170f'],
  [path.join(here, '../selected-module.mjs'), '1508c2620714fd0f96b531400510f1cf997671ec1a0dbc074a35484c24fc84c7'],
  [path.join(here, 'node-worker.mjs'), 'd214c1201b90b65deac32f0523660730ffe3ebd3069753d85c7c9587e755b493'],
  [path.join(here, 'fixtures/fetch-probe.mjs'), '24d648e7f4e6e4f4f966932a08e707b54db438024a822623f7dc8ea010dd71a5'],
  [path.join(repo, 'bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/fixtures/policies.bend'), '9204db93874b8c2a59ccae988211298e29d7c21945c06bae8452d6addafe9a6d'],
  [path.join(repo, 'bend2/toolchain-patches/004-web-workers/rebase-2032/fixtures/selected-root.bend'), 'dac7bc132314f909bc25af27ade1b0f7a680a62bc39d8e4cea5aa4978f4a2415'],
]);
function assertInputs() {
  for (const [file, expected] of inputHashes) {
    const stat = fs.lstatSync(file);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), `phase3 input is not regular: ${file}`);
    assert.equal(fs.realpathSync(file), file, `phase3 input redirected: ${file}`);
    assert.equal(sha(fs.readFileSync(file)), expected, `phase3 input drifted: ${file}`);
  }
}
assertInputs();
const self = fileURLToPath(import.meta.url);
const testSha256 = sha(fs.readFileSync(self));
const Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')));
const Comp = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')));
const { invokeSelected } = await import(pathToFileURL(path.join(here, 'runtime.mjs')));

async function load(file) {
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

async function run(book, root, args, mode, options = {}) {
  let cleaned;
  const result = await invokeSelected({ bend: Bend, compiler: Comp, book, root, args, mode,
    ...options,
    onTemporaryCleanup: (directory) => {
      cleaned = directory;
      options.onTemporaryCleanup?.(directory);
    },
  });
  assert.ok(cleaned, `${root} did not clean its temporary module`);
  assert.equal(fs.existsSync(cleaned), false, `${root} left a temporary module behind`);
  if (result.dispatch === 'worker') assert.equal(result.workerNetworkCalls, 0);
  return result;
}

async function workerProbe(workerData) {
  const worker = new NodeWorker(new URL('./node-worker.mjs', import.meta.url), {
    workerData,
  });
  let timer;
  const response = new Promise((resolve, reject) => {
    worker.once('message', resolve);
    worker.once('error', reject);
  });
  const exited = new Promise((resolve, reject) => {
    worker.once('exit', resolve);
    worker.once('error', reject);
  });
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('malformed protocol probe timed out')), 5000);
    });
    const [reply, exitCode] = await Promise.race([Promise.all([response, exited]), timeout]);
    return { reply, exitCode };
  } finally {
    clearTimeout(timer);
    if (worker.threadId !== -1) {
      try { await worker.terminate(); } catch {}
    }
  }
}

async function malformedProtocolProbe() {
  const { reply, exitCode } = await workerProbe({
    protocol: 'rift-bend-selected-node-worker/wrong', requestId: 'protocol-probe',
    root: 'identity', moduleUrl: 'file:///definitely-not-imported.mjs', args: [1],
  });
  assert.equal(exitCode, 0);
  assert.deepEqual({ protocol: reply.protocol, requestId: reply.requestId,
      ok: reply.ok, code: reply.code, workerNetworkCalls: reply.workerNetworkCalls }, {
      protocol: 'rift-bend-selected-node-worker/1', requestId: 'protocol-probe',
      ok: false, code: 'protocol', workerNetworkCalls: 0,
    });
}

async function workerFetchDenialProbe() {
  const moduleUrl = pathToFileURL(path.join(here, 'fixtures/fetch-probe.mjs')).href;
  const { reply, exitCode } = await workerProbe({
    protocol: 'rift-bend-selected-node-worker/1', requestId: 'fetch-probe',
    root: 'probe', moduleUrl, args: [],
  });
  assert.equal(exitCode, 0);
  assert.deepEqual({ ok: reply.ok, value: reply.value, workerNetworkCalls: reply.workerNetworkCalls },
    { ok: true, value: 7, workerNetworkCalls: 1 });
}

const policyBook = await load(path.join(repo,
  'bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/fixtures/policies.bend'));
await malformedProtocolProbe();
await workerFetchDenialProbe();
const required = await run(policyBook, 'required', [40], 'auto');
assert.deepEqual({ value: required.value, dispatch: required.dispatch,
  sourceEligible: required.sourceEligible }, { value: 40, dispatch: 'worker', sourceEligible: true });

const workerIdentity = await run(policyBook, 'identity', [41], 'require');
const syncIdentity = await run(policyBook, 'identity', [41], 'never');
assert.equal(workerIdentity.dispatch, 'worker');
assert.equal(syncIdentity.dispatch, 'sync');
assert.equal(workerIdentity.value, syncIdentity.value);
assert.equal(syncIdentity.reason, 'explicit_never');

const sourceNever = await run(policyBook, 'never_call', [42], 'auto');
assert.deepEqual({ value: sourceNever.value, dispatch: sourceNever.dispatch,
  reason: sourceNever.reason }, { value: 42, dispatch: 'sync', reason: 'source_never' });

const optionalBlocked = await run(policyBook, 'arithmetic', [40], 'auto');
assert.equal(optionalBlocked.value, 41);
assert.equal(optionalBlocked.dispatch, 'sync');
assert.match(optionalBlocked.reason, /^static_ineligible:intrinsic_reachable:/);

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error?.code === code,
    `expected selected dispatch to reject with ${code}`);
}
const networkProbeCompiler = { ...Comp,
  js_lib: () => `export default { identity(x) {
    globalThis.fetch('data:text/plain,parent-counter-probe').catch(() => {});
    return x;
  } };`,
};
let networkDeniedCleaned;
await rejectsCode(invokeSelected({ bend: Bend, compiler: networkProbeCompiler,
  book: policyBook, root: 'identity', args: [47], mode: 'require',
  onTemporaryCleanup: (directory) => { networkDeniedCleaned = directory; },
}), 'network_denied');
assert.ok(networkDeniedCleaned && !fs.existsSync(networkDeniedCleaned),
  'parent network-denial reply path left its module behind');
await rejectsCode(invokeSelected({ bend: Bend, compiler: Comp, book: policyBook,
  root: 'required_arithmetic', args: [40], mode: 'auto',
  onWorkerCreated: () => assert.fail('blocked required root created a Worker'),
}), 'policy_conflict');
await rejectsCode(invokeSelected({ bend: Bend, compiler: Comp, book: policyBook,
  root: 'conflict', args: [40], mode: 'require',
  onWorkerCreated: () => assert.fail('conflicting root created a Worker'),
}), 'policy_conflict');
await rejectsCode(invokeSelected({ bend: Bend, compiler: Comp, book: policyBook,
  root: 'required', args: [40], mode: 'never',
  onWorkerCreated: () => assert.fail('never-conflicting root created a Worker'),
}), 'policy_conflict');

const abortController = new AbortController();
let abortCreated = false;
let abortCleaned;
await rejectsCode(invokeSelected({ bend: Bend, compiler: Comp, book: policyBook,
  root: 'identity', args: [43], mode: 'require', signal: abortController.signal,
  onWorkerCreated: () => { abortCreated = true; abortController.abort(); },
  onTemporaryCleanup: (directory) => { abortCleaned = directory; },
}), 'aborted');
assert.equal(abortCreated, true, 'cancellation did not occur after actual Worker creation');
assert.ok(abortCleaned, 'aborted dispatch did not clean its temporary module');
assert.equal(fs.existsSync(abortCleaned), false);

let timeoutCleaned;
let timeoutCreated = false;
await assert.rejects(invokeSelected({ bend: Bend, compiler: Comp, book: policyBook,
  root: 'identity', args: [44], mode: 'require', timeoutMs: 1,
  onWorkerCreated: () => { timeoutCreated = true; },
  onTemporaryCleanup: (directory) => { timeoutCleaned = directory; },
}), (error) => error?.code === 'timeout');
assert.equal(timeoutCreated, true, 'timeout test did not create a real Worker');
assert.ok(timeoutCleaned, 'worker timeout did not clean its temporary module');
assert.equal(fs.existsSync(timeoutCleaned), false);

const originalTerminate = NodeWorker.prototype.terminate;
const unhandledRejections = [];
const onUnhandledRejection = (error) => unhandledRejections.push(error);
let rejectedTerminateCreated = false;
let rejectedTerminateCleaned;
let syntheticTerminations = 0;
process.on('unhandledRejection', onUnhandledRejection);
try {
  NodeWorker.prototype.terminate = function () {
    syntheticTerminations++;
    void Promise.resolve(originalTerminate.call(this)).catch(() => {});
    return Promise.reject(new Error('synthetic terminate rejection'));
  };
  await assert.rejects(invokeSelected({ bend: Bend, compiler: Comp, book: policyBook,
    root: 'identity', args: [45], mode: 'require', timeoutMs: 1,
    onWorkerCreated: () => { rejectedTerminateCreated = true; },
    onTemporaryCleanup: (directory) => { rejectedTerminateCleaned = directory; },
  }), (error) => error?.code === 'timeout');
} finally {
  NodeWorker.prototype.terminate = originalTerminate;
  await new Promise((resolve) => setTimeout(resolve, 30));
  process.removeListener('unhandledRejection', onUnhandledRejection);
}
assert.equal(rejectedTerminateCreated, true);
assert.ok(syntheticTerminations > 0, 'terminate rejection branch was not exercised');
assert.ok(rejectedTerminateCleaned);
assert.equal(fs.existsSync(rejectedTerminateCleaned), false);
assert.deepEqual(unhandledRejections, [], 'termination rejection escaped as unhandled');

const tempParent = fs.realpathSync(os.tmpdir());
let redirectedOriginal;
let redirectedMoved;
try {
  await assert.rejects(invokeSelected({ bend: Bend, compiler: Comp, book: policyBook,
    root: 'identity', args: [46], mode: 'require',
    onWorkerCreated: (directory) => {
      redirectedOriginal = directory;
      assert.equal(fs.realpathSync(directory), directory);
      assert.equal(path.dirname(directory), tempParent);
      assert.match(path.basename(directory), /^rift-bend-selected-worker-/);
      redirectedMoved = `${directory}.moved-${randomUUID()}`;
      fs.renameSync(directory, redirectedMoved);
      fs.mkdirSync(directory);
    },
  }), (error) => error?.code === 'cleanup_drift');
} finally {
  const survived = [redirectedOriginal, redirectedMoved].map((candidate) =>
    Boolean(candidate && fs.existsSync(candidate)));
  for (const candidate of [redirectedOriginal, redirectedMoved]) {
    if (!candidate || !fs.existsSync(candidate)) continue;
    const exact = fs.realpathSync(candidate);
    assert.equal(exact, candidate);
    assert.equal(path.dirname(exact), tempParent);
    assert.match(path.basename(exact), /^rift-bend-selected-worker-/);
    const stat = fs.lstatSync(exact, { bigint: true });
    assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
    fs.rmSync(exact, { recursive: true, force: false });
  }
  assert.deepEqual(survived, [true, true],
    'cleanup drift must preserve both the original allocation and replacement');
}

const noSuffix = await load(path.join(repo,
  'bend2/toolchain-patches/004-web-workers/rebase-2032/fixtures/selected-root.bend'));
assert.equal(sha(Buffer.from(Comp.js_lib(noSuffix, false))),
  host.syncJsSha256);
assert.equal(sha(Buffer.from(Comp.compile_book(noSuffix))),
  '9cb68b124aa2865f21a3c1cdb633bf691d45d1f06a8eea496869d2585750a009');
assert.equal(networkCalls, 0);
assertInputs();
assert.equal(sha(fs.readFileSync(self)), testSha256, 'phase3 test changed during run');
console.log(JSON.stringify({ schema: 'rift-bend-2032-phase3-host/1', passed: true,
  host, testSha256,
  syncCSha256: '9cb68b124aa2865f21a3c1cdb633bf691d45d1f06a8eea496869d2585750a009',
  networkCalls, scope: 'selected-root coarse Worker runtime on exact Windows host; not per-call scheduler or full 004' }));
