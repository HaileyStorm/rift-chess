import { requiredFanoutProtocol as protocol } from './pool.mjs';

let fetchCalls = 0;
let assignedWorkerId = null;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error('network disabled in required fan-out Worker');
};

let helpersPromise;
async function helpers() {
  helpersPromise ??= import('./helpers.mjs');
  const module = await helpersPromise;
  const library = module?.default;
  if (!library || Object.keys(library).sort().join(',') !== 'left_leaf,right_leaf'
    || typeof library.left_leaf !== 'function' || typeof library.right_leaf !== 'function') {
    throw new Error('required fan-out helper module mismatch');
  }
  return library;
}

function exactKeys(value, expected) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const got = Object.keys(value).sort();
  const want = [...expected].sort();
  return got.length === want.length && got.every((key, index) => key === want[index]);
}

function validU32Args(args, arity) {
  if (!Array.isArray(args) || args.length !== arity) return false;
  for (let index = 0; index < arity; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(args, index)
      || !Number.isInteger(args[index]) || args[index] < 0 || args[index] > 0xffff_ffff) return false;
  }
  return true;
}

self.onmessage = async ({ data }) => {
  if (exactKeys(data, ['type', 'protocol', 'workerId'])
    && data.type === 'hello' && data.protocol === protocol
    && Number.isSafeInteger(data.workerId) && data.workerId >= 0) {
    if (assignedWorkerId !== null) return;
    assignedWorkerId = data.workerId;
    self.postMessage({ type: 'ready', protocol, workerId: data.workerId,
      workerScope: typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope });
    return;
  }

  const requestKeys = ['type', 'protocol', 'requestId', 'invocationId', 'regionId',
    'sourceSlot', 'helperId', 'args'];
  if (!exactKeys(data, requestKeys) || data.type !== 'run' || data.protocol !== protocol
    || assignedWorkerId === null
    || !Number.isSafeInteger(data.requestId) || data.requestId < 1
    || !Number.isSafeInteger(data.invocationId) || data.invocationId < 1
    || typeof data.regionId !== 'string' || data.regionId.length < 1 || data.regionId.length > 128
    || !Number.isSafeInteger(data.sourceSlot) || data.sourceSlot < 0
    || !['left_leaf', 'right_leaf'].includes(data.helperId)
    || !validU32Args(data.args, 2)) {
    return;
  }

  const identity = { protocol, requestId: data.requestId, invocationId: data.invocationId,
    regionId: data.regionId, sourceSlot: data.sourceSlot, helperId: data.helperId };
  try {
    const library = await helpers();
    const value = library[data.helperId](...data.args);
    if (value !== null && (typeof value === 'object' || typeof value === 'function')
      && typeof value.then === 'function') throw new Error('required helper returned a promise');
    if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
      throw new Error('required helper returned a non-U32 value');
    }
    self.postMessage({ type: 'result', ...identity, workerId: assignedWorkerId,
      ok: true, value, workerScope: typeof WorkerGlobalScope !== 'undefined'
        && self instanceof WorkerGlobalScope, fetchCalls });
  } catch (error) {
    self.postMessage({ type: 'result', ...identity, workerId: assignedWorkerId,
      ok: false, error: String(error?.message ?? error).slice(0, 512),
      workerScope: typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope,
      fetchCalls });
  }
};
