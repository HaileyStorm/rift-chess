const protocol = 'rift-bend-browser-worker/1';
let workerFetchCalls = 0;
globalThis.fetch = async (...args) => {
  workerFetchCalls++;
  throw new Error(`network disabled in worker fixture: ${String(args[0])}`);
};

self.onmessage = async ({ data }) => {
  const { protocol: requestProtocol, requestId, root, args, moduleUrl } = data ?? {};
  try {
    if (requestProtocol !== protocol || requestId !== 'phase4-required-1'
      || root !== 'required' || !Array.isArray(args)) throw new Error('invalid worker request');
    const selectedUrl = new URL(moduleUrl, self.location.href);
    if (selectedUrl.origin !== self.location.origin
      || selectedUrl.pathname !== '/selected-required.mjs') throw new Error('module URL outside fixture');
    const module = await import(selectedUrl.href);
    const library = module?.default;
    const exports = library && typeof library === 'object' ? Object.keys(library) : [];
    if (exports.length !== 1 || exports[0] !== root || typeof library[root] !== 'function') {
      throw new Error('selected export mismatch');
    }
    const value = library[root](...args);
    if (value !== null && (typeof value === 'object' || typeof value === 'function')
      && typeof value.then === 'function') throw new Error('selected result was asynchronous');
    self.postMessage({ protocol, requestId, ok: true, root, exports, value, workerFetchCalls });
  } catch (error) {
    self.postMessage({ protocol, requestId, ok: false, root, exports: [], workerFetchCalls,
      error: String(error?.message ?? error).slice(0, 512) });
  }
};
