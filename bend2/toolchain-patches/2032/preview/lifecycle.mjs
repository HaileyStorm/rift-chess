import fs from 'node:fs';
import path from 'node:path';

export class WorkerLifecycleError extends Error {
  constructor(message, { workerMayBeLive = false, timedOut = false, cause } = {}) {
    super(message, { cause });
    this.name = 'WorkerLifecycleError';
    this.workerMayBeLive = workerMayBeLive;
    this.timedOut = timedOut;
  }
}

function identity(stat, file) {
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error(`refuse non-regular/reparse file: ${file}`);
  }
  const value = { dev: String(stat.dev), ino: String(stat.ino) };
  if (value.ino === '0') throw new Error(`file identity unavailable: ${file}`);
  return value;
}

function sameIdentity(a, b) {
  return a.dev === b.dev && a.ino === b.ino;
}

function pathIdentity(file, expected, fsApi) {
  const actual = identity(fsApi.lstatSync(file, { bigint: true }), file);
  if (!sameIdentity(actual, expected)) throw new Error(`file identity changed: ${file}`);
  return actual;
}

function descriptorIdentity(fd, file, expected, fsApi) {
  const actual = identity(fsApi.fstatSync(fd, { bigint: true }), file);
  if (!sameIdentity(actual, expected)) throw new Error(`open-file identity changed: ${file}`);
  pathIdentity(file, expected, fsApi);
}

function writeAll(fd, bytes, fsApi) {
  let offset = 0;
  while (offset < bytes.length) {
    const written = fsApi.writeSync(fd, bytes, offset, bytes.length - offset, offset);
    if (!Number.isInteger(written) || written <= 0) throw new Error('file write made no progress');
    offset += written;
  }
}

function unlinkExact(file, expected, fsApi) {
  pathIdentity(file, expected, fsApi);
  fsApi.unlinkSync(file);
}

export function acquireOwnedLock(file, payload, fsApi = fs) {
  const bytes = Buffer.from(payload);
  let fd;
  let created = false;
  let fileId;
  let handedOff = false;
  let primaryError;
  try {
    fd = fsApi.openSync(file, 'wx');
    created = true;
    fileId = identity(fsApi.fstatSync(fd, { bigint: true }), file);
    pathIdentity(file, fileId, fsApi);
    writeAll(fd, bytes, fsApi);
    fsApi.fsyncSync(fd);
    descriptorIdentity(fd, file, fileId, fsApi);
    const lease = { file, fd, fileId, bytes, fsApi, preserve: false, closed: false };
    handedOff = true;
    return lease;
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (!handedOff) {
      let closeError;
      if (fd !== undefined) {
        try { fsApi.closeSync(fd); } catch (error) { closeError = error; }
      }
      if (created && fileId && !closeError) {
        try { unlinkExact(file, fileId, fsApi); }
        catch (error) {
          if (primaryError) primaryError.cleanupError = error;
          else throw error;
        }
      }
      if (closeError && primaryError) primaryError.closeError = closeError;
      else if (closeError) throw closeError;
    }
  }
}

export function closeOwnedLock(lease) {
  if (lease.closed) return;
  lease.fsApi.closeSync(lease.fd);
  lease.closed = true;
}

export function releaseOwnedLock(lease) {
  if (lease.preserve) throw new Error('refuse to release a preserved worker lease');
  if (lease.closed) throw new Error('owned lock descriptor was already closed');
  try {
    descriptorIdentity(lease.fd, lease.file, lease.fileId, lease.fsApi);
    if (!lease.fsApi.readFileSync(lease.file).equals(lease.bytes)) {
      throw new Error(`lock contents changed: ${lease.file}`);
    }
    closeOwnedLock(lease);
    pathIdentity(lease.file, lease.fileId, lease.fsApi);
    if (!lease.fsApi.readFileSync(lease.file).equals(lease.bytes)) {
      throw new Error(`lock contents changed before release: ${lease.file}`);
    }
    unlinkExact(lease.file, lease.fileId, lease.fsApi);
  } catch (error) {
    if (!lease.closed) {
      try { closeOwnedLock(lease); } catch (closeError) { error.closeError = closeError; }
    }
    throw error;
  }
}

export function settleWorker(worker, {
  timeoutMs,
  terminateGraceMs = 10_000,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  if (!(timeoutMs > 0) || !(terminateGraceMs > 0)) {
    throw new RangeError('worker timeout and termination grace must be positive');
  }
  return new Promise((resolve, reject) => {
    let message;
    let eventError;
    let timeoutRequested = false;
    let settled = false;
    let deadline;
    let exitDeadline;
    const detach = () => {
      clearTimer(deadline);
      clearTimer(exitDeadline);
      worker.off('message', onMessage);
      worker.off('error', onError);
      worker.off('exit', onExit);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      detach();
      reject(error);
    };
    const onMessage = (value) => { message ??= value; };
    const onError = (error) => { eventError ??= error; };
    const onExit = (code) => {
      if (settled) return;
      if (timeoutRequested) {
        fail(new WorkerLifecycleError('worker timed out; exit was observed after termination request',
          { timedOut: true, cause: eventError }));
      } else if (eventError) {
        fail(new WorkerLifecycleError('worker error; exit was observed', { cause: eventError }));
      } else if (!message) {
        fail(new WorkerLifecycleError(`worker exited without a result (code ${code})`));
      } else if (!message.ok) {
        fail(new WorkerLifecycleError(message.error ?? 'worker reported failure'));
      } else if (code !== 0) {
        fail(new WorkerLifecycleError(`worker exited with code ${code}`));
      } else {
        settled = true;
        detach();
        resolve(message);
      }
    };
    const onTimeout = () => {
      if (settled) return;
      timeoutRequested = true;
      exitDeadline = setTimer(() => {
        if (settled) return;
        try { worker.unref?.(); } catch { }
        fail(new WorkerLifecycleError(
          `worker timeout; no exit observed within ${terminateGraceMs}ms; lock must be preserved; worker may be live`,
          { workerMayBeLive: true, timedOut: true, cause: eventError }));
      }, terminateGraceMs);
      try {
        Promise.resolve(worker.terminate()).then(() => undefined, (error) => { eventError ??= error; });
      } catch (error) {
        eventError ??= error;
      }
    };
    worker.on('message', onMessage);
    worker.on('error', onError);
    worker.on('exit', onExit);
    deadline = setTimer(onTimeout, timeoutMs);
  });
}

function assertAbsent(file, fsApi) {
  try {
    fsApi.lstatSync(file, { bigint: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  throw new Error(`refuse to replace existing final manifest: ${file}`);
}

export function finalizeOwnedManifest(tempFile, finalFile, bytes, {
  verifyTemp = () => {},
  beforeCommit = () => {},
  fsApi = fs,
} = {}) {
  if (requireSameDirectory(tempFile, finalFile) !== true) {
    throw new Error('temporary and final manifests must share a directory for atomic linking');
  }
  const content = Buffer.from(bytes);
  let fd;
  let created = false;
  let fileId;
  let committed = false;
  let tempRetained = false;
  let primaryError;
  try {
    fd = fsApi.openSync(tempFile, 'wx');
    created = true;
    fileId = identity(fsApi.fstatSync(fd, { bigint: true }), tempFile);
    pathIdentity(tempFile, fileId, fsApi);
    writeAll(fd, content, fsApi);
    fsApi.fsyncSync(fd);
    descriptorIdentity(fd, tempFile, fileId, fsApi);
    fsApi.closeSync(fd);
    fd = undefined;
    pathIdentity(tempFile, fileId, fsApi);
    const onDisk = fsApi.readFileSync(tempFile);
    if (!onDisk.equals(content)) throw new Error('temporary manifest bytes changed before commit');
    verifyTemp(onDisk);
    beforeCommit();
    assertAbsent(finalFile, fsApi);
    fsApi.linkSync(tempFile, finalFile);
    committed = true;
    try { unlinkExact(tempFile, fileId, fsApi); }
    catch { tempRetained = true; }
    return { finalFile, tempFile, tempRetained };
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (fd !== undefined) {
      try { fsApi.closeSync(fd); } catch (error) {
        if (primaryError) primaryError.closeError = error;
        else if (!committed) throw error;
      }
    }
    if (created && fileId && !committed) {
      try { unlinkExact(tempFile, fileId, fsApi); }
      catch (error) {
        if (primaryError) primaryError.cleanupError = error;
        else throw error;
      }
    }
  }
}

function requireSameDirectory(a, b) {
  return path.resolve(path.dirname(a)) === path.resolve(path.dirname(b));
}
