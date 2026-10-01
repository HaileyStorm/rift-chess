// Portable lifecycle controls for the Linux-only source-check worker.
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { loadSourceInBoundedWorker, observeSourceWorker,
  SOURCE_CHECK_WORKER_STACK_MB } from './source-check-worker.mjs';

const api = source => `data:text/javascript,${encodeURIComponent(source)}`;
const entryFile = path.resolve('NativeV2-source-check-fixture.bend');
const passed = [];
const check = async (name, run) => {
  await run();
  passed.push(name);
};

await check('source worker loads and validates in an isolated bounded thread', async () => {
  const compilerUrl = api(`
    export function book_nil() { return { hols: 0, order: [], tlds: {} }; }
    export async function book_load(book, file, _source, seen) {
      seen.set(file, true); book.order.push('main'); book.tlds.main = { $: 'Def' };
    }
    export function book_valid(book) { book.order.push('validated'); }
  `);
  const result = await loadSourceInBoundedWorker({ compilerUrl, entryFile, timeoutMs: 10_000 });
  assert.deepEqual(result, {
    book: { holes: 0, mainTag: 'Def', definitions: 2 },
    seenFiles: [entryFile],
    fetches: 0,
  });
});

await check('source load failure is reported only after worker exit', async () => {
  const compilerUrl = api(`
    export function book_nil() { return { hols: 0, order: [], tlds: {} }; }
    export async function book_load() { throw new Error('fixture source-load failure'); }
    export function book_valid() { throw new Error('book_valid must not run after load failure'); }
  `);
  await assert.rejects(loadSourceInBoundedWorker({ compilerUrl, entryFile, timeoutMs: 10_000 }),
    /fixture source-load failure/);
});

await check('book_valid failure is reported by the worker', async () => {
  const compilerUrl = api(`
    export function book_nil() { return { hols: 0, order: [], tlds: {} }; }
    export async function book_load(book, file, _source, seen) {
      seen.set(file, true); book.order.push('main'); book.tlds.main = { $: 'Def' };
    }
    export function book_valid() { throw new Error('fixture book_valid failure'); }
  `);
  await assert.rejects(loadSourceInBoundedWorker({ compilerUrl, entryFile, timeoutMs: 10_000 }),
    /fixture book_valid failure/);
});

await check('worker fetches are denied and surfaced', async () => {
  const compilerUrl = api(`
    export function book_nil() { return { hols: 0, order: [], tlds: {} }; }
    export async function book_load() { await fetch('https://invalid.example/'); }
    export function book_valid() {}
  `);
  await assert.rejects(loadSourceInBoundedWorker({ compilerUrl, entryFile, timeoutMs: 10_000 }),
    /source gate prohibits network fetch/);
});

await check('abnormal exit without a result is observed', async () => {
  const worker = new Worker('process.exit(7)', {
    eval: true,
    resourceLimits: { stackSizeMb: SOURCE_CHECK_WORKER_STACK_MB },
  });
  assert.equal(worker.resourceLimits.stackSizeMb, SOURCE_CHECK_WORKER_STACK_MB);
  await assert.rejects(observeSourceWorker(worker, { timeoutMs: 10_000 }), /exited with code 7/);
});

await check('success message followed by nonzero exit is rejected', async () => {
  const worker = new Worker(`
    const { parentPort } = require('node:worker_threads');
    parentPort.postMessage({ ok: true, result: 'must not be accepted before exit' });
    process.exit(23);
  `, { eval: true, resourceLimits: { stackSizeMb: SOURCE_CHECK_WORKER_STACK_MB } });
  await assert.rejects(observeSourceWorker(worker, { timeoutMs: 10_000 }), /exited with code 23/);
});

await check('duplicate result messages are rejected', async () => {
  const worker = new Worker(`
    const { parentPort } = require('node:worker_threads');
    parentPort.postMessage({ ok: true, result: 'first' });
    parentPort.postMessage({ ok: true, result: 'duplicate' });
  `, { eval: true, resourceLimits: { stackSizeMb: SOURCE_CHECK_WORKER_STACK_MB } });
  await assert.rejects(observeSourceWorker(worker, { timeoutMs: 10_000 }), /more than one result message/);
});

await check('rejected timeout termination stays unobserved until a real exit event', async () => {
  const worker = new EventEmitter();
  worker.terminate = () => Promise.reject(new Error('fixture terminate rejection'));
  const result = observeSourceWorker(worker, { timeoutMs: 5 });
  await assert.rejects(result, /exit remains unobserved.*fixture terminate rejection/);
  assert.equal(worker.listenerCount('exit'), 1, 'exit observer was removed without an exit event');
  assert.equal(worker.listenerCount('error'), 1, 'error observer was removed while worker state was uncertain');
  worker.emit('exit', 1);
  assert.equal(worker.listenerCount('exit'), 0, 'exit observer was not removed after exit was observed');
  assert.equal(worker.listenerCount('error'), 0);
});

await check('rejected error-path termination stays unobserved until a real exit event', async () => {
  const worker = new EventEmitter();
  worker.terminate = () => Promise.reject(new Error('fixture error-path terminate rejection'));
  const result = observeSourceWorker(worker, { timeoutMs: 10_000 });
  worker.emit('error', new Error('fixture worker error'));
  await assert.rejects(result, /exit remains unobserved.*fixture error-path terminate rejection/);
  assert.equal(worker.listenerCount('exit'), 1, 'exit observer was removed without an exit event');
  worker.emit('exit', 1);
  assert.equal(worker.listenerCount('exit'), 0, 'exit observer was not removed after exit was observed');
});

await check('hung worker is terminated at its owned timeout', async () => {
  const worker = new Worker('while (true) {}', {
    eval: true,
    resourceLimits: { stackSizeMb: SOURCE_CHECK_WORKER_STACK_MB },
  });
  assert.equal(worker.resourceLimits.stackSizeMb, SOURCE_CHECK_WORKER_STACK_MB);
  await assert.rejects(observeSourceWorker(worker, { timeoutMs: 40 }), /exceeded its 40 ms timeout/);
});

console.log(JSON.stringify({ schema: 'rift-native-v2-2032-source-worker-tests/1',
  passed: true, checks: passed }));
