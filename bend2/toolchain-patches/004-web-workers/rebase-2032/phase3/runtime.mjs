import { Worker } from 'node:worker_threads';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectedModule } from '../selected-module.mjs';

const PROTOCOL = 'rift-bend-selected-node-worker/1';
let nextRequestId = 0;

export class SelectedWorkerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SelectedWorkerError';
    this.code = code;
  }
}

export async function invokeSelected({ bend, compiler, book, root, args = [], mode = 'auto',
  signal, timeoutMs = 10000, onWorkerCreated, onTemporaryCleanup }) {
  if (!['auto', 'require', 'never'].includes(mode)) {
    throw new SelectedWorkerError('configuration', 'mode must be auto, require, or never');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) {
    throw new SelectedWorkerError('configuration', 'timeoutMs must be 1..120000');
  }
  if (!Array.isArray(args)) throw new SelectedWorkerError('arguments', 'arguments must be an array');
  try { args = structuredClone(args); }
  catch (error) { throw new SelectedWorkerError('arguments', `arguments are not cloneable: ${error?.message ?? error}`); }

  const plan = compiler.plan_web_workers(book, [root]);
  const calls = plan.calls;
  const requires = calls.filter((call) => call.policy === 'require');
  const nevers = calls.filter((call) => call.policy === 'never');
  const blocked = [...new Set(plan.functions.find((fn) => fn.name === root)?.reasons ?? [])];
  const mixedPolicy = requires.length > 0 && nevers.length > 0;
  const policyConflict = plan.conflicts.length > 0 || mixedPolicy
    || (mode === 'never' && requires.length > 0)
    || (mode === 'require' && nevers.length > 0);
  const wantsWorker = mode === 'require' || requires.length > 0;

  if (signal?.aborted) throw new SelectedWorkerError('aborted', 'selected worker call aborted before dispatch');
  if (wantsWorker && policyConflict) {
    throw new SelectedWorkerError('policy_conflict', 'required selected-root dispatch conflicts with a never region');
  }
  if (wantsWorker && !plan.sourceEligible) {
    throw new SelectedWorkerError('required_blocked',
      `required selected root is statically blocked: ${blocked.join(', ') || 'policy conflict'}`);
  }

  let route = 'sync';
  let reason = null;
  if (wantsWorker) route = 'worker';
  else if (mode === 'never' || nevers.length > 0) reason = mode === 'never' ? 'explicit_never' : 'source_never';
  else if (!plan.sourceEligible) reason = `static_ineligible:${blocked.join(', ') || 'unknown'}`;
  else reason = 'optional_dispatch_not_requested';

  const source = selectedModule(bend, compiler, book, [root]);
  const tempParent = fs.realpathSync(os.tmpdir());
  const allocatedDirectory = fs.mkdtempSync(path.join(tempParent, 'rift-bend-selected-worker-'));
  const { exactDirectory, directoryIdentity } = captureTemporaryDirectory(allocatedDirectory, tempParent);
  const modulePath = path.join(exactDirectory, 'selected.mjs');
  let worker = null;
  try {
    fs.writeFileSync(modulePath, source, { flag: 'wx' });
    const moduleUrl = pathToFileURL(modulePath).href;
    if (route === 'sync') {
      const module = await import(`${moduleUrl}?${++nextRequestId}`);
      const library = module.default;
      if (!library || Object.keys(library).length !== 1 || typeof library[root] !== 'function') {
        throw new SelectedWorkerError('export_mismatch', 'selected synchronous export mismatch');
      }
      const value = library[root](...args);
      if (value !== null && (typeof value === 'object' || typeof value === 'function')
        && typeof value.then === 'function') {
        throw new SelectedWorkerError('async_result', 'selected Bend function returned a promise');
      }
      if (signal?.aborted) throw new SelectedWorkerError('aborted', 'selected sync call aborted after evaluation');
      return { value, dispatch: 'sync', reason, workerCreated: false,
        sourceEligible: plan.sourceEligible };
    }

    const requestId = `selected-${++nextRequestId}`;
    worker = new Worker(new URL('./node-worker.mjs', import.meta.url), {
      workerData: { protocol: PROTOCOL, requestId, root, moduleUrl, args },
    });
    onWorkerCreated?.(exactDirectory);
    const { value, workerNetworkCalls } = await receive(worker, requestId, { signal, timeoutMs });
    return { value, dispatch: 'worker', reason: null, workerCreated: true,
      sourceEligible: plan.sourceEligible, workerNetworkCalls };
  } finally {
    if (worker !== null) {
      try { await worker.terminate(); } catch {}
    }
    removeTemporaryDirectory(exactDirectory, tempParent, directoryIdentity);
    onTemporaryCleanup?.(exactDirectory);
  }
}

function captureTemporaryDirectory(directory, tempParent) {
  let stat;
  try { stat = fs.lstatSync(directory, { bigint: true }); } catch {
    throw new SelectedWorkerError('cleanup_drift', 'temporary worker directory could not be identified');
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new SelectedWorkerError('cleanup_drift', 'temporary worker directory is not a plain directory');
  }
  const identity = { dev: stat.dev, ino: stat.ino, birthtimeNs: stat.birthtimeNs, mode: stat.mode };
  let exactDirectory;
  try { exactDirectory = fs.realpathSync(directory); } catch {
    throw new SelectedWorkerError('cleanup_drift', 'temporary worker directory could not be resolved');
  }
  checkTemporaryDirectory(directory, exactDirectory, tempParent, identity);
  return { exactDirectory, directoryIdentity: identity };
}

function checkTemporaryDirectory(candidate, exactDirectory, tempParent, identity) {
  const fail = () => { throw new SelectedWorkerError('cleanup_drift',
    'temporary worker directory changed or is not a plain owned directory'); };
  let resolved;
  try { resolved = fs.realpathSync(candidate); } catch { return fail(); }
  if (resolved !== exactDirectory || path.dirname(resolved) !== tempParent
    || !path.basename(resolved).startsWith('rift-bend-selected-worker-')) return fail();
  let stat;
  try { stat = fs.lstatSync(candidate, { bigint: true }); } catch { return fail(); }
  if (!stat.isDirectory() || stat.isSymbolicLink()) return fail();
  if (identity && (stat.dev !== identity.dev || stat.ino !== identity.ino
    || stat.birthtimeNs !== identity.birthtimeNs || stat.mode !== identity.mode)) return fail();
  try {
    if (fs.realpathSync(candidate) !== exactDirectory) return fail();
  } catch { return fail(); }
  return stat;
}

function removeTemporaryDirectory(directory, tempParent, identity) {
  checkTemporaryDirectory(directory, directory, tempParent, identity);
  fs.rmSync(directory, { recursive: true, force: false });
}

function receive(worker, requestId, { signal, timeoutMs }) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) {
    return Promise.reject(new SelectedWorkerError('configuration', 'timeoutMs must be 1..120000'));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => fail(new SelectedWorkerError('timeout', 'selected worker timed out')), timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      worker.removeListener('message', onMessage);
      worker.removeListener('error', onError);
      worker.removeListener('exit', onExit);
      signal?.removeEventListener('abort', onAbort);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        Promise.resolve(worker.terminate()).then(() => reject(error), () => reject(error));
      } catch {
        reject(error);
      }
    };
    const onMessage = (message) => {
      if (message?.protocol !== PROTOCOL || message.requestId !== requestId) {
        return fail(new SelectedWorkerError('protocol', 'selected worker response mismatch'));
      }
      if (!Number.isSafeInteger(message.workerNetworkCalls) || message.workerNetworkCalls !== 0) {
        return fail(new SelectedWorkerError('network_denied', 'selected worker attempted network access'));
      }
      if (!message.ok) return fail(new SelectedWorkerError(message.code ?? 'worker_error', message.error ?? 'worker failed'));
      finish(resolve, { value: message.value, workerNetworkCalls: message.workerNetworkCalls });
    };
    const onError = (error) => fail(new SelectedWorkerError('worker_error', String(error?.message ?? error)));
    const onExit = (code) => {
      if (!settled) fail(new SelectedWorkerError('worker_exit', `selected worker exited before reply (${code})`));
    };
    const onAbort = () => fail(new SelectedWorkerError('aborted', 'selected worker call aborted'));
    worker.on('message', onMessage);
    worker.once('error', onError);
    worker.once('exit', onExit);
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}
