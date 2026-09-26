import { parentPort, workerData } from 'node:worker_threads';

const listeners = new Map();
globalThis.self = globalThis;
globalThis.postMessage = (message, transfer = []) => parentPort.postMessage(message, transfer);
globalThis.addEventListener = (type, callback) => {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(callback);
};
globalThis.removeEventListener = (type, callback) => listeners.get(type)?.delete(callback);
parentPort.on('message', (data) => {
  for (const callback of listeners.get('message') ?? []) callback({ data });
});
await import(workerData.entry);
