import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { sourceFixture, validateSourceApproval, validateSafeOutput, assertSafeRuntime,
  assertSerializedUnchanged, safeWorkerFlags } from './contracts.mjs';
import { root, sourceEvidence, captureSource, captureRuntime, sha256 } from './binding.mjs';
import { executeCandidate, assertMemoryAdmission, writeJson } from './run.mjs';
import { approvedSource, approvedKernel, approvedLinuxRuntime } from './approvals.mjs';
import { windowsProbeRuntime, runtimeProbePacket } from './probe.mjs';
import { emitExclusive, outputIdentity } from './output.mjs';

process.env.BEND_NO_TELEMETRY = '1';
assert.deepEqual(approvedSource, sourceFixture);
for (const approval of [approvedKernel, approvedLinuxRuntime]) assert.equal(approval, null);
let calls = 0;
await assert.rejects(executeCandidate({ dependencies: { capture: () => { calls++; } } }), /approvals are null/);
assert.equal(calls, 0);
const actual = sourceEvidence(sourceFixture);
assert.equal(actual.aggregate.closure.files.length, 57);
const binding = captureSource(sourceFixture, { requireClean: false });
const currentRuntime = captureRuntime(windowsProbeRuntime);
assert.equal(binding.acceptedSource.sourceCommit, '0815db9a47d493748265b47fb294191c0edd4e73');
const raw = Object.fromEntries(['aggregate', 'mutations', 'handoff', 'review'].map(key =>
  [key, fs.readFileSync(path.join(root, sourceFixture[key].path))]));
const changed = structuredClone(sourceFixture);
changed.aggregate.sha256 = '0'.repeat(64);
assert.throws(() => validateSourceApproval(changed, raw), /SHA-256 differs/);
const damaged = { ...raw, aggregate: Buffer.from(raw.aggregate.toString().replace('"holes": 0', '"holes": 1')) };
assert.throws(() => validateSourceApproval(sourceFixture, damaged), /SHA-256 differs/);
assert.throws(() => validateSourceApproval({ ...sourceFixture, schema: 'rift-bendtt-aggregate-approval/1' }, raw));
const pending = Buffer.from(raw.review.toString().replace('Review disposition: accepted', 'Review disposition: pending'));
assert.throws(() => validateSourceApproval({ ...sourceFixture,
  review: { ...sourceFixture.review, sha256: sha256(pending) } }, { ...raw, review: pending }), /review lacks/);
assert.throws(() => assertSafeRuntime({ version: 'v24.12.0', platform: 'win32', arch: 'x64',
  executableSha256: windowsProbeRuntime.executableSha256, execArgv: [], nodeOptions: '', bunAbsent: true },
windowsProbeRuntime, true));
assert.throws(() => assertSafeRuntime({ version: 'v24.12.0', platform: 'win32', arch: 'x64',
  executableSha256: windowsProbeRuntime.executableSha256, execArgv: [...safeWorkerFlags],
  nodeOptions: '--require unowned', bunAbsent: true }, windowsProbeRuntime, true));
assert.throws(() => validateSafeOutput(['out of scope'], Buffer.from('x')), /out of scope/);
assert.throws(() => validateSafeOutput([], Buffer.alloc(0)), /empty or oversized/);
assert.throws(() => assertSerializedUnchanged({ bytes: 1, sha256: 'x' }, { bytes: 1, sha256: 'y' }), /changed/);
const memory = { mode: 'linux-init-cgroup-full-ancestry-admitted',
  ancestryMode: 'init-cgroup-namespace-visible-v2-full-ancestry', availableBytes: 12 * 1024 ** 3 };
assertMemoryAdmission(memory);
assert.throws(() => assertMemoryAdmission({ ...memory, availableBytes: memory.availableBytes - 1 }), /STOP/);
assert.throws(() => assertMemoryAdmission({ ...memory, ancestryMode: 'namespace-visible' }));

const fixtureRoot = path.join(root, '.artifacts/bend2/2035-preview/bendtt-contracts');
fs.mkdirSync(fixtureRoot, { recursive: true });
const directory = fs.mkdtempSync(path.join(fixtureRoot, 'contracts-'));
const out = path.join(directory, 'synthetic.bendtt');
let syntheticEmitCalls = 0;
const fakeSafe = { safe_emit: (_book, file) => { syntheticEmitCalls++; fs.writeFileSync(file, 'synthetic-not-proof'); return []; } };
// The production export keeps its fixed kernel-output fence. Only this distinct
// import of the original module receives an owned synthetic fixture dependency.
assert.throws(() => emitExclusive(fakeSafe, {}, out));
assert.equal(syntheticEmitCalls, 0); assert.equal(fs.existsSync(out), false);
const fixtureOutputUrl = new URL('./output.mjs?owned-contract-fixture', import.meta.url).href;
const bindingUrl = pathToFileURL(path.join(root, 'bend2/core/v3/2035/bendtt-gate/binding.mjs')).href;
const fixtureBinding = `export { readSource, sha256 } from ${JSON.stringify(bindingUrl)}; export const outputRoot = ${JSON.stringify(fixtureRoot)};`;
let fixtureRedirects = 0;
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === './binding.mjs' && context.parentURL === fixtureOutputUrl) {
    fixtureRedirects++;
    return { url: 'data:text/javascript,' + encodeURIComponent(fixtureBinding), shortCircuit: true };
  }
  return next(specifier, context);
} });
let fixtureEmit;
try { fixtureEmit = (await import(fixtureOutputUrl)).emitExclusive; }
finally { hooks.deregister(); }
assert.equal(fixtureRedirects, 1);
const output = fixtureEmit(fakeSafe, {}, out);
assert.equal(syntheticEmitCalls, 1); assert.deepEqual(output.file, outputIdentity(out));
assert.throws(() => fixtureEmit(fakeSafe, {}, out), /existing/);
const foreign = path.join(directory, 'unowned');
assert.throws(() => fixtureEmit({ safe_emit: () => { fs.writeFileSync(foreign, 'x'); return []; } }, {},
  path.join(directory, 'new.bendtt')), /unowned/);
assert.equal(fs.existsSync(foreign), false);
writeJson(path.join(directory, 'scope.json'), { synthetic: true, proof: false, output });

// Exercise the new serialization-to-kernel seam without any process or compiler.
const trace = [], serialized = { path: '/synthetic/CHECK.bendtt', bytes: 1, sha256: 'a'.repeat(64), dev: '1', ino: '1' };
const before = { source: { closure: actual.aggregate.closure.files }, kernel: { path: '/synthetic/bendtt',
  build: { leanStackSizeKb: '4194304' } } };
const deps = {
  platform: 'linux', capture: () => { trace.push('bind'); return before; },
  createRun: () => ({ directory: '/synthetic', home: '/synthetic/home', tmp: '/synthetic/tmp',
    lock: '/synthetic/lock', output: serialized.path }),
  acquire: () => { trace.push('lease'); return {}; }, memory: () => { trace.push('admission'); return memory; },
  worker: async () => { trace.push('worker'); return { mode: 'safe-emit', observedExit: true,
    emitted: { file: serialized, oos: [] } }; },
  output: () => { trace.push('serialized'); return { ...serialized, sha256: 'b'.repeat(64) }; },
  group: () => { calls++; throw Error('must not invoke'); }, preserve: () => trace.push('preserve'), write: () => {},
};
await assert.rejects(executeCandidate({ approvals: { source: {}, kernel: {}, runtime: {} }, dependencies: deps }), /serialized BendTT/);
assert.equal(calls, 0);
assert.deepEqual(trace, ['bind', 'lease', 'admission', 'worker', 'bind', 'serialized', 'preserve']);
assert.equal(runtimeProbePacket.executed, false);
console.log(JSON.stringify({ schema: 'rift-bendtt-2035-source-contract-check/1', passed: true,
  actualSourceReceipt: sourceFixture.aggregate.sha256, actualMutationReceipt: sourceFixture.mutations.sha256,
  sourceBindingSha256: sha256(JSON.stringify(binding)), coneFiles: binding.closure.length,
  currentRuntime,
  outputDirectory: path.relative(root, directory).split(path.sep).join('/'),
  scope: 'current raw receipts and source binding, pure contracts and synthetic output/control seam; no compiler import, Safe elaboration, Worker or kernel execution' }));
