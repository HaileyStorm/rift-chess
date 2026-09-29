// Give the source-only probe a bounded worker stack; no compiler or host state changes.
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';

const entry = process.argv[2] ?? 'ArithmeticProof.bend';
assert.ok(['ArithmeticProof.bend', 'CHECK.bend'].includes(entry));
assert.equal(process.env.BEND_NO_TELEMETRY, '1');
const worker = new Worker(new URL('./probe-derived.ts', import.meta.url), {
  type: 'module', workerData: { entry }, resourceLimits: { stackSizeMb: 64 },
});
const timer = setTimeout(() => {
  console.error('Bounded 2.0.32 source probe exceeded 300 seconds.');
  process.exitCode = 1;
  void worker.terminate();
}, 300000);
worker.on('error', error => { console.error(error.stack ?? String(error)); process.exitCode = 1; });
worker.on('exit', code => { clearTimeout(timer); if (code !== 0) process.exitCode = 1; });
