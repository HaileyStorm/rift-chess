// Source-bound C-emission probe; does not write C or build a native binary.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.BEND_NO_TELEMETRY = '1';
const here = path.dirname(fileURLToPath(import.meta.url));
const candidate = fs.realpathSync(process.argv[2] ?? '');
const entry = 'bend2/NativeCLI.bend';
const sourceGate = path.join(here, 'test-entries-2032.mjs');
const child = path.join(here, 'c-emit-child-2032.mjs');
const sha = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const scriptsBefore = [sha(sourceGate), sha(child), sha(fileURLToPath(import.meta.url))];
function run(script, timeoutMs, args) {
  const result = spawnSync(process.execPath,
    ['--max-old-space-size=512', script, ...args], {
      cwd: here, env: { ...process.env, BEND_NO_TELEMETRY: '1' },
      encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  if (result.error || result.status !== 0 || result.signal) {
    throw new Error(`${path.basename(script)} failed: ${result.error?.message ??
      `status=${result.status} signal=${result.signal}`} ${String(result.stderr ?? '').slice(-1200)}`);
  }
  return JSON.parse(result.stdout);
}
const before = run(sourceGate, 60_000, [candidate, entry]);
assert.equal(before.ok, true);
const emitted = run(child, 180_000, [candidate]);
assert.equal(emitted.ok, true);
assert.match(emitted.sha256, /^[0-9a-f]{64}$/);
assert.ok(emitted.bytes > 0);
assert.equal(emitted.definitions, before.definitions);
assert.equal(emitted.loadedFiles, before.loadedFiles);
assert.equal(emitted.holes, 0);
assert.equal(emitted.fetches, 0);
const after = run(sourceGate, 60_000, [candidate, entry]);
assert.deepEqual(after, before, 'source and compiler bindings changed during C emission');
assert.deepEqual([sha(sourceGate), sha(child), sha(fileURLToPath(import.meta.url))], scriptsBefore);
console.log(JSON.stringify({ schema: 'rift-native-cli-2032-c-emission/1', ok: true,
  entry, sourceSha256: before.sha256, bindingSha256: before.bindingSha256,
  emittedC: { bytes: emitted.bytes, sha256: emitted.sha256,
    includesX11: emitted.includesX11, includesAlsa: emitted.includesAlsa,
    bangs: emitted.bangs },
  definitions: emitted.definitions, loadedFiles: emitted.loadedFiles, holes: 0,
  fetches: 0, sourceGateSha256: scriptsBefore[0], childSha256: scriptsBefore[1],
  scope: 'source-bound in-memory C emission only; no C artifact, native binary, argv, GUI, GPU, pin or release acceptance' }));
