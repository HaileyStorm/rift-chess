// Bounded source-to-C diagnostic for the exact optional downstream stack.
// It supervises only its own Bun child; it never builds or starts a GUI.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const artifact = path.join(root, '.artifacts/bend2/toolchain-patches/stack-optional-final');
const compiler = path.join(artifact, 'compiler');
const bun = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const input = path.join(root, 'bend2/Native.bend');
const out = path.join(artifact, 'results/full-native.c');
const receipt = path.join(artifact, 'results/full-native-emission.json');
const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

assert.equal(fs.realpathSync(compiler), compiler, 'expected canonical disposable compiler');
assert.ok(fs.existsSync(bun) && fs.existsSync(input));
fs.mkdirSync(path.dirname(out), { recursive: true });
assert.ok(!fs.existsSync(out), 'output target must be absent before this bounded attempt');
const sourceBefore = sha256(input);
const startedAt = new Date().toISOString();
const started = performance.now();
const result = spawnSync(bun, [path.join(compiler, 'bend2/main.ts'),
  input.replaceAll('\\', '/'), '-o', out.replaceAll('\\', '/')], {
  cwd: path.join(compiler, 'bend2'),
  env: { ...process.env, BEND_NO_TELEMETRY: '1' },
  encoding: 'utf8', timeout: 480000, maxBuffer: 16 * 1024 * 1024,
  windowsHide: true,
});
const data = {
  startedAt, endedAt: new Date().toISOString(), elapsedMs: Math.round(performance.now() - started),
  timeoutMs: 480000, inputSha256Before: sourceBefore, inputSha256After: sha256(input),
  status: result.status, signal: result.signal, errorCode: result.error?.code ?? null,
  stdoutTail: (result.stdout ?? '').slice(-4096),
  stderrTail: (result.stderr ?? '').slice(-4096),
  output: fs.existsSync(out) ? { bytes: fs.statSync(out).size, sha256: sha256(out) } : null,
};
fs.writeFileSync(receipt, JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify({ receipt, ...data }));
