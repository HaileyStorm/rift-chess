// Deterministic, local-only candidate BotAdapter call/warmup. This is not a
// browser test: it exercises the emitted candidate worker package in Node's
// worker_threads using the existing project bootstrap.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { toControllerInput, positionForBotAdapter } from './browser-abi-2028.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const helperPath = fileURLToPath(import.meta.url);
const [distArg, controllerArg, runRootArg, baseCommit, compilerSourceTreeSha256, bindingPathArg] = process.argv.slice(2);
if (!distArg || !controllerArg || !runRootArg || !baseCommit || !compilerSourceTreeSha256 || !bindingPathArg)
  throw new Error('Usage: browser-candidate-bot-smoke-2028.mjs <candidate-dist> <controller.js> <run-root> <base-commit> <compiler-source-sha256> <source-binding.json>');

const dist = path.resolve(distArg);
const controllerFile = path.resolve(controllerArg);
const runRoot = path.resolve(runRootArg);
const bindingPath = path.resolve(bindingPathArg);
const allowed = path.resolve(root, '.artifacts/bend2/toolchain-patches/browser-2028-candidate');
const isInside = (parent, target) => {
  const relative = path.relative(parent, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
assert.ok(isInside(allowed, dist) && path.basename(dist) === 'dist', 'Candidate dist escaped its ignored run workspace');
assert.equal(path.dirname(dist), runRoot, 'Candidate dist and run root do not match');
assert.ok(/^run-[A-Za-z0-9-]+$/.test(path.basename(runRoot)), 'Candidate run root is not nonce-scoped');
assert.ok(isInside(runRoot, controllerFile), 'Candidate Controller cache escaped the nonce workspace');
assert.ok(isInside(runRoot, bindingPath), 'Candidate worker source binding escaped the nonce workspace');

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileHash = (file) => sha256(fs.readFileSync(file));
const helperSha256 = fileHash(helperPath);
const bootstrap = path.join(root, 'bend2/tests/bot-worker-bootstrap.mjs');
const bootstrapSha256 = fileHash(bootstrap);
const controllerSha256 = fileHash(controllerFile);
const bindingBytes = fs.readFileSync(bindingPath);
const binding = JSON.parse(bindingBytes.toString('utf8'));
const nodeRuntime = { version: process.version, path: process.execPath, sha256: fileHash(process.execPath) };
assert.equal(nodeRuntime.version, 'v24.12.0', 'Candidate worker-thread smoke is bound to Node 24.12.0');
assert.equal(binding.schema, 'rift-bend-worker-source-binding/1');
assert.equal(binding.library, 'bot');
assert.equal(binding.sourceRoot, 'bend2/platform/worker/BotAdapter.bend');
assert.equal(binding.compiler.baseCommit, baseCommit);
assert.equal(binding.compiler.sourceTreeSha256, compilerSourceTreeSha256);

const entry = path.join(dist, 'worker-libs/bot/index.mjs');
const manifestPath = path.join(dist, 'worker-libs/bot/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(manifest.backend, 'bend-web-workers-2');
assert.equal(manifest.mode, 'required-only');
assert.equal(manifest.policy, 'strict');
assert.deepEqual(Object.keys(manifest.exports).sort(), ['choose']);
const workerFiles = Object.fromEntries(Object.values(manifest.artifacts).sort()
  .map((name) => [name, fileHash(path.join(dist, 'worker-libs/bot', name))]));
assert.deepEqual(workerFiles, binding.artifacts, 'Packaged candidate worker files differ from its source binding');

const networkAttempts = [];
globalThis.fetch = async (input) => {
  networkAttempts.push(String(input));
  throw new Error(`Candidate bot smoke forbids network access: ${String(input)}`);
};
process.env.BEND_NO_TELEMETRY = '1';
process.env.BEND_HUB = 'http://127.0.0.1:9';

const apiModule = await import(pathToFileURL(controllerFile).href);
const api = apiModule.default;
assert.ok(api && typeof api.boot_reads === 'function' && typeof api.bot_job === 'function');
const list = (items) => items.reduceRight((tail, head) => ({ $: 'Con', head, tail }), { $: 'Nil' });
function values(value) {
  const result = [];
  while (value?.$ === 'Con') { result.push(value.head); value = value.tail; }
  assert.equal(value?.$, 'Nil', 'Candidate Controller returned a malformed Base.List');
  return result;
}
function dispatch(event, packet, native = false) {
  const tag = event.$?.startsWith('ui/Types.') ? event : toControllerInput(event);
  return api[native ? 'dispatch_at' : 'dispatch_at_web'](list([tag]), packet.presentation, packet.session);
}

function makeBotReadyPacket() {
  let packet = api.boot_reads('', '', true, true, 1024, 768);
  packet = { ...packet, session: { ...packet.session,
    program: { ...packet.session.program, prefs: { ...packet.session.program.prefs, mode: 1 } } } };
  const ids = values(packet.session.program.legal);
  const moveId = ids.find((candidate) => candidate < 20480 && candidate % 5 === 0);
  assert.notEqual(moveId, undefined, 'Candidate starting board has no normal first move');
  const quotient = Math.floor(moveId / 5);
  const from = Math.floor(quotient / 64), to = quotient % 64;
  const revision = packet.presentation.revision;
  packet = dispatch({ $: 'ui/Types.SquareInput', square: from, expected: revision }, packet);
  packet = dispatch({ $: 'ui/Types.SquareInput', square: to, expected: revision }, packet);
  assert.equal(packet.session.program.intent, moveId, 'Candidate first move was not staged');
  packet = dispatch({ $: 'Tick', ms: 240 }, packet);
  const animating = api.bot_job(packet.session);
  assert.equal(animating.eligible, true);
  assert.equal(animating.canApply, false);
  packet = dispatch({ $: 'Tick', ms: 240 }, packet);
  const job = api.bot_job(packet.session);
  assert.equal(job.eligible, true);
  assert.equal(job.canApply, true);
  assert.equal(job.revision, packet.presentation.revision);
  assert.deepEqual(values(job.ids), values(packet.session.program.legal));
  return { packet, job };
}

class NodeWorkerAdapter {
  constructor(url) {
    this.listeners = new Map();
    const workerEntry = url instanceof URL ? url.href : String(url);
    this.worker = new Worker(pathToFileURL(bootstrap), { workerData: { entry: workerEntry }, execArgv: [] });
    this.worker.on('error', () => {});
  }
  addEventListener(type, callback) {
    const wrapped = type === 'message'
      ? (data) => callback({ data })
      : (error) => callback({ error, message: error?.message, preventDefault() {} });
    this.listeners.set(callback, [type, wrapped]);
    this.worker.on(type, wrapped);
  }
  removeEventListener(type, callback) {
    const registered = this.listeners.get(callback);
    if (registered) { this.worker.off(registered[0], registered[1]); this.listeners.delete(callback); }
  }
  postMessage(message, transfer = []) { this.worker.postMessage(message, transfer); }
  terminate() { return this.worker.terminate(); }
}

const nonce = crypto.randomUUID();
const receiptPath = path.join(runRoot, `bot-smoke-${Date.now()}-${nonce}.json`);
const receipt = {
  schema: 'rift-bend-browser-2028-candidate-bot-smoke/1', nonce,
  at: new Date().toISOString(), status: 'running', baseCommit,
  compilerSourceTreeSha256, dist, nodeRuntime, controllerSha256, helperSha256, bootstrapSha256,
  sourceBindingSha256: sha256(bindingBytes), workerFiles,
  network: { deniedFetches: [] },
};
let session;
try {
  const { packet, job } = makeBotReadyPacket();
  const serial = dispatch({ $: 'Tick', ms: 16 }, packet, true);
  const library = await import(pathToFileURL(entry).href);
  assert.equal(library.manifest.program, manifest.program);
  session = library.createSession({ workers: 2, transport: 'clone', startupTimeoutMs: 30_000,
    workerFactory: (url) => new NodeWorkerAdapter(url) });
  await session.warmup();
  const adaptedPosition = positionForBotAdapter(job.position);
  assert.equal(adaptedPosition.$, '../../core/Model.Pos');
  const choice = await session.call('choose', [adaptedPosition, job.ids]);
  assert.ok(values(job.ids).includes(choice), 'Candidate worker returned a non-legal move ID');
  const applied = api.bot_apply_at(job.revision, choice, packet.session);
  assert.equal(applied.presentation.revision, job.revision + 1, 'Candidate controller did not accept its worker result');
  assert.deepEqual(applied.snapshot.frame.position, serial.snapshot.frame.position,
    'Candidate worker choice diverged from its deterministic serial scorer');
  const beforeClose = session.stats();
  assert.ok(beforeClose.requiredWitnesses > 0);
  assert.ok(beforeClose.remoteJobs > 0);
  await session.close();
  const afterClose = session.stats();
  assert.equal(afterClose.closed, true);
  assert.equal(afterClose.inFlight, 0);
  receipt.status = 'success';
  receipt.result = { warmupCompleted: true, revision: job.revision, choice,
    legalIds: values(job.ids), matchesSerial: true, statsBeforeClose: beforeClose, statsAfterClose: afterClose };
} catch (error) {
  receipt.status = 'failed';
  receipt.failure = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
} finally {
  if (session) {
    try { await session.close(); } catch { /* retain the original candidate smoke failure */ }
  }
  receipt.finishedAt = new Date().toISOString();
  receipt.network.deniedFetches = networkAttempts;
  receipt.postRunHashes = {
    helperSha256: fileHash(helperPath), bootstrapSha256: fileHash(bootstrap),
    controllerSha256: fileHash(controllerFile), sourceBindingSha256: fileHash(bindingPath),
    workerFiles: Object.fromEntries(Object.keys(workerFiles).map((name) =>
      [name, fileHash(path.join(dist, 'worker-libs/bot', name))])),
  };
  if (receipt.postRunHashes.helperSha256 !== helperSha256 ||
      receipt.postRunHashes.bootstrapSha256 !== bootstrapSha256 ||
      receipt.postRunHashes.controllerSha256 !== controllerSha256 ||
      receipt.postRunHashes.sourceBindingSha256 !== receipt.sourceBindingSha256 ||
      JSON.stringify(receipt.postRunHashes.workerFiles) !== JSON.stringify(workerFiles)) {
    receipt.status = 'failed';
    receipt.failure = receipt.failure ?? 'Candidate worker inputs changed during warmup/call.';
  }
  if (fs.existsSync(receiptPath)) throw new Error(`Candidate bot receipt already exists: ${receiptPath}`);
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
}
console.log(JSON.stringify({ receipt: receiptPath, status: receipt.status,
  choice: receipt.result?.choice ?? null, failure: receipt.failure ?? null }));
if (receipt.status !== 'success') process.exitCode = 1;
