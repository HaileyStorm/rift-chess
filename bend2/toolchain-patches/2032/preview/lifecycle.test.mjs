import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  acquireOwnedLock, closeOwnedLock, finalizeOwnedManifest, releaseOwnedLock, settleWorker,
} from './lifecycle.mjs';

process.env.BEND_NO_TELEMETRY = '1';
let networkCalls = 0;
globalThis.fetch = async () => {
  networkCalls++;
  throw new Error('unexpected network access');
};

class FakeWorker extends EventEmitter {
  constructor(terminate = () => Promise.resolve()) {
    super();
    this.terminateAction = terminate;
    this.terminateCalls = 0;
    this.unrefCalls = 0;
  }
  terminate() {
    this.terminateCalls++;
    return this.terminateAction();
  }
  unref() { this.unrefCalls++; }
}

const tempRoot = fs.realpathSync(os.tmpdir());
const testRoot = fs.mkdtempSync(path.join(tempRoot, 'bend2-2032-preview-lifecycle-'));
function safeExists(file) {
  try { fs.lstatSync(file); return true; }
  catch (error) { if (error?.code === 'ENOENT') return false; throw error; }
}
function injectedFs(overrides) {
  return new Proxy(fs, {
    get(target, property) {
      if (property in overrides) return overrides[property];
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

try {
  const heldWorker = new FakeWorker();
  let workerResolved = false;
  const heldResult = settleWorker(heldWorker, { timeoutMs: 100, terminateGraceMs: 20 })
    .then((result) => { workerResolved = true; return result; });
  heldWorker.emit('message', { ok: true, value: 9 });
  await Promise.resolve();
  assert.equal(workerResolved, false, 'worker result must wait for its exit event');
  heldWorker.emit('exit', 0);
  assert.deepEqual(await heldResult, { ok: true, value: 9 });

  const failedWorker = new FakeWorker();
  let failedWorkerSettled = false;
  const failedResult = settleWorker(failedWorker, { timeoutMs: 100, terminateGraceMs: 20 });
  const observedWorkerFailure = failedResult.catch((error) => {
    failedWorkerSettled = true;
    throw error;
  });
  failedWorker.emit('message', { ok: false, error: 'injected worker error' });
  await Promise.resolve();
  assert.equal(failedWorkerSettled, false, 'worker error must also wait for exit');
  failedWorker.emit('exit', 1);
  await assert.rejects(observedWorkerFailure, /injected worker error/);

  const eventErrorWorker = new FakeWorker();
  let eventErrorSettled = false;
  const eventErrorResult = settleWorker(eventErrorWorker, { timeoutMs: 100, terminateGraceMs: 20 })
    .catch((error) => { eventErrorSettled = true; throw error; });
  eventErrorWorker.emit('error', new Error('injected worker event error'));
  await Promise.resolve();
  assert.equal(eventErrorSettled, false, 'Worker error event must wait for exit');
  eventErrorWorker.emit('exit', 1);
  await assert.rejects(eventErrorResult, /worker error; exit was observed/);

  let stoppedWorker;
  stoppedWorker = new FakeWorker(() => {
    setTimeout(() => stoppedWorker.emit('exit', 1), 1);
    return Promise.resolve(1);
  });
  await assert.rejects(settleWorker(stoppedWorker, { timeoutMs: 5, terminateGraceMs: 40 }),
    (error) => error.timedOut === true && error.workerMayBeLive === false);
  assert.equal(stoppedWorker.terminateCalls, 1);

  const lockPath = path.join(testRoot, 'live.lock');
  const lockBytes = Buffer.from(JSON.stringify({ workerMayBeLive: true, token: 'injection' }) + '\n');
  const lockLease = acquireOwnedLock(lockPath, lockBytes);
  const uncertainWorker = new FakeWorker(() => Promise.reject(new Error('injected terminate failure')));
  await assert.rejects(settleWorker(uncertainWorker, { timeoutMs: 5, terminateGraceMs: 10 }),
    (error) => error.timedOut === true && error.workerMayBeLive === true);
  lockLease.preserve = true;
  closeOwnedLock(lockLease);
  assert.equal(JSON.parse(fs.readFileSync(lockPath, 'utf8')).workerMayBeLive, true);
  assert.throws(() => acquireOwnedLock(lockPath, 'replacement'), { code: 'EEXIST' });
  assert.deepEqual(fs.readFileSync(lockPath), lockBytes,
    'uncertain worker lease must remain intact and may not be auto-reclaimed');

  const preexistingPath = path.join(testRoot, 'preexisting.lock');
  fs.writeFileSync(preexistingPath, 'do not replace\n', { flag: 'wx' });
  assert.throws(() => acquireOwnedLock(preexistingPath, 'new lease'), { code: 'EEXIST' });
  assert.equal(fs.readFileSync(preexistingPath, 'utf8'), 'do not replace\n');

  const partialPath = path.join(testRoot, 'partial.lock');
  const partialFs = injectedFs({
    writeSync(fd, bytes, offset, length, position) {
      fs.writeSync(fd, bytes, offset, Math.min(length, 4), position);
      throw new Error('injected lock write failure');
    },
  });
  assert.throws(() => acquireOwnedLock(partialPath, 'partial-write-payload', partialFs),
    /injected lock write failure/);
  assert.equal(safeExists(partialPath), false,
    'a partial lock may be removed only after its created identity is verified');
  const fsyncPath = path.join(testRoot, 'fsync.lock');
  const failedFsync = injectedFs({ fsyncSync: () => { throw new Error('injected lock fsync failure'); } });
  assert.throws(() => acquireOwnedLock(fsyncPath, 'complete-write-payload', failedFsync),
    /injected lock fsync failure/);
  assert.equal(safeExists(fsyncPath), false,
    'a fsync failure before worker creation must clean only the matching created lock');

  const identityPath = path.join(testRoot, 'identity.lock');
  const otherPath = path.join(testRoot, 'other.file');
  const identityBytes = Buffer.from('owned lease\n');
  const identityLease = acquireOwnedLock(identityPath, identityBytes);
  fs.writeFileSync(otherPath, 'different file\n', { flag: 'wx' });
  identityLease.fsApi = injectedFs({
    lstatSync(file, options) {
      return fs.lstatSync(path.resolve(file) === path.resolve(identityPath) ? otherPath : file, options);
    },
  });
  assert.throws(() => releaseOwnedLock(identityLease), /file identity changed/);
  assert.equal(fs.readFileSync(identityPath, 'utf8'), 'owned lease\n',
    'release must not unlink a path whose identity no longer matches the descriptor');
  fs.unlinkSync(identityPath);

  const finalPath = path.join(testRoot, 'manifest.json');
  const pendingPath = path.join(testRoot, 'manifest.pending');
  const manifestBytes = Buffer.from('{"verified":true}\n');
  const committed = finalizeOwnedManifest(pendingPath, finalPath, manifestBytes, {
    verifyTemp: (bytes) => assert.deepEqual(JSON.parse(bytes.toString()), { verified: true }),
    beforeCommit: () => assert.equal(safeExists(finalPath), false),
  });
  assert.equal(committed.tempRetained, false);
  assert.deepEqual(fs.readFileSync(finalPath), manifestBytes);

  const failedFinalPath = path.join(testRoot, 'failed-manifest.json');
  const failedPending = path.join(testRoot, 'failed-manifest.pending');
  assert.throws(() => finalizeOwnedManifest(failedPending, failedFinalPath, manifestBytes, {
    verifyTemp: (bytes) => assert.deepEqual(bytes, manifestBytes),
    beforeCommit: () => { throw new Error('injected final binding change'); },
  }), /injected final binding change/);
  assert.equal(safeExists(failedFinalPath), false,
    'failed final binding must not leave a plausible final manifest');
  assert.equal(safeExists(failedPending), false,
    'owned pending manifest should be removed after verified identity cleanup');

  const occupiedFinal = path.join(testRoot, 'occupied.json');
  const occupiedPending = path.join(testRoot, 'occupied.pending');
  fs.writeFileSync(occupiedFinal, 'existing final\n', { flag: 'wx' });
  assert.throws(() => finalizeOwnedManifest(occupiedPending, occupiedFinal, manifestBytes),
    /refuse to replace existing final manifest/);
  assert.equal(fs.readFileSync(occupiedFinal, 'utf8'), 'existing final\n');
  assert.equal(safeExists(occupiedPending), false);
  assert.equal(networkCalls, 0);
  console.log(JSON.stringify({
    schema: 'bend2-2032-preview-lifecycle-tests/1',
    passed: true,
    workerCases: ['wait-for-exit', 'reported-error-waits-for-exit', 'worker-error-waits-for-exit',
      'timeout-terminate-and-exit', 'timeout-without-exit-preserves-live-lock'],
    fileCases: ['preexisting-lock-preserved', 'partial-lock-write-cleanup-by-identity',
      'lock-fsync-failure-cleanup',
      'final-manifest-last-link', 'failed-final-binding-no-final', 'no-overwrite'],
    networkCalls,
  }));
} finally {
  const exact = fs.realpathSync(testRoot);
  assert.equal(path.dirname(exact), tempRoot);
  assert.match(path.basename(exact), /^bend2-2032-preview-lifecycle-[^\\/]+$/);
  fs.rmSync(exact, { recursive: true, force: true });
}
