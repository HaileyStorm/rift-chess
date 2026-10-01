// A bounded, separately observable source-loader worker for the Linux-only gate.
import assert from 'node:assert/strict';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

export const SOURCE_CHECK_WORKER_STACK_MB = 64;
export const SOURCE_CHECK_WORKER_OLD_GENERATION_MB = 1024;
export const SOURCE_CHECK_WORKER_TIMEOUT_MS = 120_000;

function sourceWorkerEnvironment() {
  return { BEND_NO_TELEMETRY: '1' };
}

const errorText = error => error instanceof Error
  ? (error.stack ?? error.message).slice(0, 1800)
  : String(error).slice(0, 1800);

export function observeSourceWorker(worker, { timeoutMs = SOURCE_CHECK_WORKER_TIMEOUT_MS,
  label = 'source-check worker' } = {}) {
  const validTimeout = Number.isSafeInteger(timeoutMs) && timeoutMs > 0;
  const invalidTimeout = validTimeout ? undefined
    : new Error('worker timeout must be a positive safe integer');
  const effectiveTimeoutMs = validTimeout ? timeoutMs : SOURCE_CHECK_WORKER_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    let response;
    let gotResponse = false;
    let exitCode;
    let workerError;
    let timedOut = false;
    let settled = false;
    let terminationRequested = false;
    const cleanup = () => {
      clearTimeout(timer);
      worker.off('message', onMessage);
      worker.off('error', onError);
      worker.off('exit', onExit);
    };
    const finish = () => {
      if (settled || exitCode === undefined) return;
      settled = true;
      cleanup();
      if (invalidTimeout) {
        reject(new Error(`${label} rejected invalid timeout after observed exit ${exitCode}: ${errorText(invalidTimeout)}`));
      } else if (timedOut) {
        reject(new Error(`${label} exceeded its ${timeoutMs} ms timeout (exit ${exitCode})`));
      } else if (workerError) {
        reject(new Error(`${label} failed: ${errorText(workerError)}`));
      } else if (exitCode !== 0) {
        reject(new Error(`${label} exited with code ${exitCode}`));
      } else if (!gotResponse) {
        reject(new Error(`${label} exited without a result message`));
      } else if (!response || response.ok !== true) {
        const detail = response && typeof response.error === 'string'
          ? response.error : 'worker returned a malformed failure result';
        reject(new Error(`${label} failed: ${detail}`));
      } else resolve(response.result);
    };
    const rejectUnobservedExit = reason => {
      if (exitCode !== undefined) {
        finish();
        return;
      }
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`${label} termination was not confirmed; exit remains unobserved: ${errorText(reason)}`));
      // Retain the exit observer (and error handler) until Node reports actual worker exit.
    };
    const requestTermination = cause => {
      if (terminationRequested || exitCode !== undefined) return;
      terminationRequested = true;
      let termination;
      try {
        termination = worker.terminate();
      } catch (error) {
        rejectUnobservedExit(new Error(`${cause}: ${errorText(error)}`));
        return;
      }
      Promise.resolve(termination).then(code => {
        if (exitCode === undefined) exitCode = code;
        finish();
      }, error => {
        if (exitCode !== undefined) finish();
        else rejectUnobservedExit(new Error(`${cause}; terminate rejected: ${errorText(error)}`));
      });
    };
    const onMessage = message => {
      if (settled) return;
      if (gotResponse) {
        workerError = new Error('worker sent more than one result message');
        requestTermination('worker sent more than one result message');
        return;
      }
      gotResponse = true;
      response = message;
      finish();
    };
    const onError = error => {
      if (settled) return;
      workerError = error;
      requestTermination('worker emitted an error');
    };
    const onExit = code => {
      exitCode = code;
      if (settled) {
        cleanup();
        return;
      }
      finish();
    };
    const timer = setTimeout(() => {
      timedOut = true;
      requestTermination('worker timed out');
    }, effectiveTimeoutMs);
    worker.on('message', onMessage);
    worker.on('error', onError);
    worker.on('exit', onExit);
    if (invalidTimeout) requestTermination('invalid worker timeout');
  });
}

export async function loadSourceInBoundedWorker({ compilerUrl, entryFile,
  timeoutMs = SOURCE_CHECK_WORKER_TIMEOUT_MS }) {
  assert.equal(typeof compilerUrl, 'string', 'compiler URL must be a string');
  assert.equal(typeof entryFile, 'string', 'entry source path must be a string');
  assert.ok(entryFile.length > 0, 'entry source path must not be empty');
  assert.ok(Number.isSafeInteger(timeoutMs) && timeoutMs > 0,
    'worker timeout must be a positive safe integer');
  const worker = new Worker(new URL(import.meta.url), {
    workerData: { operation: 'load-source', compilerUrl, entryFile },
    // V8 heap flags accepted by the parent are rejected in worker execArgv.
    // Apply the heap bound through Node's worker resource-limits API instead.
    execArgv: [],
    env: sourceWorkerEnvironment(),
    resourceLimits: {
      maxOldGenerationSizeMb: SOURCE_CHECK_WORKER_OLD_GENERATION_MB,
      stackSizeMb: SOURCE_CHECK_WORKER_STACK_MB,
    },
  });
  return observeSourceWorker(worker, { timeoutMs, label: 'NativeV2 source loader' });
}

async function loadSource({ compilerUrl, entryFile }) {
  assert.equal(workerData.operation, 'load-source');
  let Bend;
  let fetches = 0;
  globalThis.fetch = async () => {
    fetches++;
    throw new Error('source gate prohibits network fetch');
  };
  try {
    Bend = await import(compilerUrl);
    const book = Bend.book_nil();
    const seen = new Map();
    await Bend.book_load(book, entryFile, '', seen);
    Bend.book_valid(book);
    return {
      book: { holes: book.hols, mainTag: book.tlds.main?.$, definitions: book.order.length },
      seenFiles: [...seen.keys()],
      fetches,
    };
  } catch (error) {
    let detail;
    try {
      detail = error?.$ === 'Err' && Bend ? Bend.err_show(error) : error?.message ?? String(error);
    } catch (formatError) {
      detail = `${error?.message ?? String(error)} (error formatting failed: ${errorText(formatError)})`;
    }
    throw new Error(String(detail).slice(0, 1800));
  }
}

if (!isMainThread) {
  assert.ok(parentPort, 'worker parent port is unavailable');
  loadSource(workerData).then(
    result => parentPort.postMessage({ ok: true, result }),
    error => parentPort.postMessage({ ok: false, error: errorText(error) }),
  );
}
