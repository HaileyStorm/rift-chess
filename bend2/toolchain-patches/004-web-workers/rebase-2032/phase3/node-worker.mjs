import { parentPort, workerData } from 'node:worker_threads';

const protocol = 'rift-bend-selected-node-worker/1';
const { protocol: requestProtocol, requestId, root, moduleUrl, args } = workerData ?? {};
let workerNetworkCalls = 0;
globalThis.fetch = async () => {
  workerNetworkCalls++;
  throw Object.assign(new Error('network access is disabled in the selected worker'), {
    code: 'network_denied',
  });
};

try {
  if (!parentPort || requestProtocol !== protocol) {
    throw Object.assign(new Error('worker protocol mismatch'), { code: 'protocol' });
  }
  if (typeof requestId !== 'string' || typeof root !== 'string'
    || typeof moduleUrl !== 'string' || !Array.isArray(args)) {
    throw Object.assign(new Error('invalid worker request'), { code: 'invalid_request' });
  }
  const module = await import(moduleUrl);
  const library = module.default;
  const names = library && typeof library === 'object' ? Object.keys(library) : [];
  if (names.length !== 1 || names[0] !== root || typeof library[root] !== 'function') {
    throw Object.assign(new Error('selected worker export mismatch'), { code: 'export_mismatch' });
  }
  const value = library[root](...args);
  if (value !== null && (typeof value === 'object' || typeof value === 'function')
    && typeof value.then === 'function') {
    throw Object.assign(new Error('selected Bend function returned a promise'), { code: 'async_result' });
  }
  parentPort.postMessage({ protocol, requestId, ok: true, value, workerNetworkCalls });
} catch (error) {
  if (parentPort) parentPort.postMessage({ protocol, requestId, ok: false,
    code: typeof error?.code === 'string' ? error.code : 'worker_error',
    error: String(error?.message ?? error).slice(0, 512), workerNetworkCalls });
} finally {
  parentPort?.close();
}
