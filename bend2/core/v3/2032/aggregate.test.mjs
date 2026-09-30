import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyV2 } from '../../../tools/freeze-v2.mjs';
import { assertExactLoadedClosure, effectiveFreeBytes, expectedCheckClosure,
  runLeasedWorker } from './aggregate-safety.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const script = path.join(root, 'bend2/core/v3/2032/aggregate.mjs');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const frozen = verifyV2();
const expected = expectedCheckClosure(root, path.join(root, 'bend2/core/v2/CHECK.bend'),
  frozen.manifest.files, path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032/bend2/base.bend'));
assert.ok(expected.length > 38, 'expected transitive closure and Base');
assertExactLoadedClosure(expected, new Set(expected));
assert.throws(() => assertExactLoadedClosure(expected, expected.filter((name) =>
  !name.endsWith('CanonicalLaws.bend'))), /complete frozen CHECK import cone/);
assert.throws(() => assertExactLoadedClosure(expected, [...expected, 'extra.bend']),
  /complete frozen CHECK import cone/);
assert.equal(effectiveFreeBytes({ platform: 'linux', hostFree: 40_000,
  read: (file) => file.endsWith('memory.max') ? '30000\n' : '25000\n' }), 5_000);
assert.throws(() => effectiveFreeBytes({ platform: 'linux', hostFree: 40_000,
  read: (file) => file.endsWith('memory.max') ? 'max\n' : '25000\n' }),
  /finite cgroup-v2 memory limit/);
assert.throws(() => effectiveFreeBytes({ platform: 'linux', hostFree: 40_000,
  read: () => { const error = new Error('missing controller'); error.code = 'ENOENT'; throw error; } }),
  /missing controller/);
assert.throws(() => effectiveFreeBytes({ platform: 'linux', hostFree: 40_000,
  read: () => 'invalid' }), /regular expression/);
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'rift-aggregate-lease-'));
const fixtureLock = path.join(fixture, 'worker.lock');
try {
  assert.equal(await runLeasedWorker(fixtureLock, 'owned', async () => 42), 42);
  assert.equal(fs.existsSync(fixtureLock), false);
  await assert.rejects(runLeasedWorker(fixtureLock, 'owned', async () => {
    const error = new Error('uncertain exit');
    error.workerMayBeLive = true;
    throw error;
  }), (error) => error.lockPreserved === fixtureLock);
  assert.equal(fs.readFileSync(fixtureLock, 'utf8'), 'owned');
  await assert.rejects(runLeasedWorker(fixtureLock, 'second', async () => 99),
    (error) => error.code === 'EEXIST');
} finally {
  if (fs.existsSync(fixtureLock)) fs.unlinkSync(fixtureLock);
  fs.rmdirSync(fixture);
}
const invoke = (...args) => spawnSync(process.execPath, [script, ...args], {
  cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 2_000_000,
  env: { ...process.env, BEND_NO_TELEMETRY: '1' },
});
const invalid = invoke('--wrong');
assert.equal(invalid.error, undefined);
assert.notEqual(invalid.status, 0);
assert.match(invalid.stderr, /usage: aggregate\.mjs \[--preflight-only\]/);
assert.equal(invalid.stdout, '');
const preflight = invoke('--preflight-only');
assert.equal(preflight.error, undefined);
assert.equal(preflight.status, 0, preflight.stderr);
assert.equal(preflight.stderr, '');
const receipt = JSON.parse(preflight.stdout);
assert.equal(receipt.schema, 'rift-v2-aggregate-2032-preflight/1');
assert.equal(receipt.ok, true);
assert.equal(receipt.sourceCommit, execFileSync('git', ['rev-parse', 'HEAD'],
  { cwd: root, encoding: 'utf8' }).trim());
assert.equal(receipt.scriptSha256, sha(fs.readFileSync(script)));
assert.equal(receipt.runtime.nodeExeSha256, sha(fs.readFileSync(process.execPath)));
assert.equal(receipt.patches.length, 4);
assert.equal(receipt.safetySha256, sha(fs.readFileSync(path.join(root,
  'bend2/core/v3/2032/aggregate-safety.mjs'))));
assert.equal(receipt.expectedLoadedFiles, expected.length);
assert.ok(['lf', 'crlf'].includes(receipt.compilerEol.eol));
assert.equal(receipt.compilerBase.normalizedSha256,
  '485705690d8927389bd156f18e42653176a5e139afe363a7e9bc217eb6f5e716');
assert.match(receipt.scope, /no Worker, proof or pin verdict/);
console.log(JSON.stringify({ schema: 'rift-v2-aggregate-2032-preflight-test/1',
  passed: true, sourceCommit: receipt.sourceCommit,
  frozenSha256: receipt.frozenSha256, compilerEol: receipt.compilerEol.eol,
  scriptSha256: receipt.scriptSha256, controls: ['complete-closure',
    'omitted-law', 'unexpected-source', 'cgroup-limit', 'lease-uncertain-exit',
    'exclusive-admission', 'invalid-cli', 'exact-read-only-preflight'],
  scope: 'source/patch/runtime binding only; aggregate Worker and BendTT not run' }));
