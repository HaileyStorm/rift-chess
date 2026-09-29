// Bound C artifact export; the final manifest is published only after verification.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalizeOwnedManifest } from '../../2032/preview/lifecycle.mjs';

process.env.BEND_NO_TELEMETRY = '1';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const candidate = fs.realpathSync(process.argv[2] ?? '');
const sourceGate = path.join(here, 'test-entries-2032.mjs');
const child = path.join(here, 'export-c-child-2032.mjs');
const lifecycle = path.join(root, 'bend2/toolchain-patches/2032/preview/lifecycle.mjs');
const script = fileURLToPath(import.meta.url);
const sha = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const scriptsBefore = [sourceGate, child, lifecycle, script].map(sha);
assert.equal(scriptsBefore[0], '0b6839e4269869d10a48fe15e35b3b30f41ac27f0e969ff404752a8fbd74d17c');
assert.equal(scriptsBefore[2], '91d8b5c325a48602d0d6860624ab0abf9d5428d374a12d85988cb866a732fbc8');
function run(scriptPath, timeoutMs, args) {
  const result = spawnSync(process.execPath,
    ['--max-old-space-size=512', scriptPath, ...args], {
      cwd: root, env: { ...process.env, BEND_NO_TELEMETRY: '1' },
      encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  if (result.error || result.status !== 0 || result.signal) {
    throw new Error(`${path.basename(scriptPath)} failed: ${result.error?.message ??
      `status=${result.status} signal=${result.signal}`} ${String(result.stderr ?? '').slice(-1200)}`);
  }
  return JSON.parse(result.stdout);
}
const entry = 'bend2/NativeCLI.bend';
const before = run(sourceGate, 60_000, [candidate, entry]);
assert.equal(before.ok, true);
const base = fs.realpathSync(root);
const artifacts = path.join(base, '.artifacts');
const bendArtifacts = path.join(artifacts, 'bend2');
for (const directory of [artifacts, bendArtifacts]) {
  const stat = fs.lstatSync(directory);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), `unsafe artifact parent: ${directory}`);
  assert.equal(fs.realpathSync(directory), directory);
}
const outRoot = path.join(bendArtifacts, 'native-cli-2032');
fs.mkdirSync(outRoot, { recursive: true });
assert.equal(fs.realpathSync(outRoot), outRoot);
assert.ok(fs.lstatSync(outRoot).isDirectory() && !fs.lstatSync(outRoot).isSymbolicLink());
const runDir = fs.mkdtempSync(path.join(outRoot, 'run-'));
const runStat = fs.lstatSync(runDir, { bigint: true });
assert.ok(runStat.isDirectory() && !runStat.isSymbolicLink());
const runId = { dev: runStat.dev, ino: runStat.ino, birthtimeNs: runStat.birthtimeNs };
function assertRun() {
  assert.equal(fs.realpathSync(runDir), runDir);
  assert.equal(path.dirname(runDir), outRoot);
  const stat = fs.lstatSync(runDir, { bigint: true });
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  for (const key of Object.keys(runId)) assert.equal(stat[key], runId[key]);
}
const output = path.join(runDir, 'NativeCLI.c');
try {
  const emitted = run(child, 180_000, [candidate, output]);
  assert.equal(emitted.ok, true);
  assertRun();
  const outputStat = fs.lstatSync(output);
  assert.ok(outputStat.isFile() && !outputStat.isSymbolicLink());
  assert.equal(outputStat.size, emitted.bytes);
  assert.equal(sha(output), emitted.sha256);
  assert.equal(emitted.sha256, '373f735cd13c42b2a2f307646bfd08931c93e0fc599c362a12676ffdc4a77281');
  const after = run(sourceGate, 60_000, [candidate, entry]);
  assert.deepEqual(after, before, 'source/closure changed during C export');
  assert.deepEqual([sourceGate, child, lifecycle, script].map(sha), scriptsBefore);
  const manifest = {
    schema: 'rift-native-cli-2032-c-export/1', evidenceClass: 'source-bound-C-artifact',
    entry, sourceSha256: before.sha256, bindingSha256: before.bindingSha256,
    candidateBaseCommit: '3080ad508fd73c1730a82c9393890cc199426918',
    upstreamBendCommit: '573002f01ec6c52416d44489543f69a9625facf8',
    scripts: { sourceGate: scriptsBefore[0], child: scriptsBefore[1],
      lifecycle: scriptsBefore[2], exporter: scriptsBefore[3] },
    cSource: { file: 'NativeCLI.c', bytes: emitted.bytes, sha256: emitted.sha256,
      includesX11: emitted.includesX11, includesAlsa: emitted.includesAlsa,
      bangs: emitted.bangs },
    definitions: emitted.definitions, loadedFiles: emitted.loadedFiles,
    holes: emitted.holes, fetches: emitted.fetches,
    runtime: 'C artifact only; no linked binary or native argv acceptance',
  };
  const bytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const final = path.join(runDir, 'manifest.json');
  const temp = path.join(runDir, 'manifest.pending.json');
  const committed = finalizeOwnedManifest(temp, final, bytes, {
    verifyTemp: (onDisk) => assert.deepEqual(JSON.parse(onDisk), manifest),
    beforeCommit: () => {
      assertRun();
      assert.equal(sha(output), emitted.sha256);
      assert.deepEqual([sourceGate, child, lifecycle, script].map(sha), scriptsBefore);
    },
  });
  console.log(JSON.stringify({ schema: manifest.schema, ok: true,
    runDir, cSourceSha256: emitted.sha256, cSourceBytes: emitted.bytes,
    manifestSha256: sha(final), bindingSha256: before.bindingSha256,
    tempRetained: committed.tempRetained, runtime: manifest.runtime }));
} catch (error) {
  console.error(`incomplete C export retained at ${runDir}: ${String(error?.message ?? error).slice(0, 1200)}`);
  process.exitCode = 1;
}
