let workerCreations = 0;
let workerKinds = [];
let pageFetchCalls = 0;
globalThis.fetch = async (...args) => {
  pageFetchCalls++;
  throw new Error(`network disabled in fixture: ${String(args[0])}`);
};

function selectedLibrary(module, root) {
  const library = module?.default;
  const exports = library && typeof library === 'object' ? Object.keys(library) : [];
  if (exports.length !== 1 || exports[0] !== root || typeof library[root] !== 'function') {
    throw new Error(`selected export mismatch: ${root}`);
  }
  return { library, exports };
}

window.phase4Browser = {
  async required({ plan, root, args, moduleUrl }) {
    if (plan?.sourceEligible !== true || !plan.calls?.some((call) => call.policy === 'require')
      || plan.requirements?.length !== 1) {
      throw new Error('required call was not eligible for the bounded worker fixture');
    }
    workerCreations++;
    workerKinds.push('module');
    const worker = new Worker('/worker-bootstrap.mjs', { type: 'module' });
    const requestId = 'phase4-required-1';
    let timer;
    try {
      const reply = await new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('module Worker timed out')), 5000);
        worker.onmessage = (event) => resolve(event.data);
        worker.onerror = (event) => reject(new Error(event.message || 'module Worker failed'));
        worker.postMessage({ protocol: 'rift-bend-browser-worker/1', requestId,
          root, args, moduleUrl });
      });
      if (reply?.protocol !== 'rift-bend-browser-worker/1' || reply.requestId !== requestId) {
        throw new Error('module Worker response protocol mismatch');
      }
      if (!reply.ok) throw new Error(reply.error || 'module Worker call failed');
      return { ...reply, workerCreations, workerKinds: workerKinds.slice(), pageFetchCalls };
    } finally {
      clearTimeout(timer);
      worker.terminate();
    }
  },

  async never({ plan, root, args, moduleUrl }) {
    if (plan?.sourceEligible !== true || plan.requirements?.length !== 0
      || !plan.calls?.length || !plan.calls.every((call) => call.policy === 'never')) {
      throw new Error('never call did not remain on the local synchronous path');
    }
    const before = workerCreations;
    const { library, exports } = selectedLibrary(await import(moduleUrl), root);
    const value = library[root](...args);
    if (value !== null && (typeof value === 'object' || typeof value === 'function')
      && typeof value.then === 'function') throw new Error('selected result was asynchronous');
    return { root, exports, value, workerCreations, workerDelta: workerCreations - before,
      pageFetchCalls };
  },
};

window.phase4Ready = true;
