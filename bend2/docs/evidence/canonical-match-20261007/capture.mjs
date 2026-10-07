// Read-only current application evidence capture. This grants no pin/kernel authority.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function read(file) {
  assert.ok(file && !path.isAbsolute(file) && !file.includes('\\') && !file.split('/').includes('..'));
  const absolute = path.resolve(root, file);
  assert.equal(fs.realpathSync(absolute), absolute);
  const before = fs.lstatSync(absolute, { bigint: true });
  assert.ok(before.isFile() && !before.isSymbolicLink());
  const bytes = fs.readFileSync(absolute), after = fs.lstatSync(absolute, { bigint: true });
  for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(before[key], after[key]);
  return bytes;
}
function exact(entry) {
  assert.match(entry.sha256, /^[0-9a-f]{64}$/);
  const bytes = read(entry.path);
  assert.equal(hash(bytes), entry.sha256, `Changed source/evidence: ${entry.path}`);
  return bytes;
}
const manifestPath = 'bend2/docs/evidence/canonical-match-20261007/acceptance.json';
const bytes = read(manifestPath), manifest = JSON.parse(bytes);
assert.equal(manifest.schema, 'rift-canonical-match-application/1');
assert.equal(manifest.scope, 'candidate-source-browser-only');
assert.equal(manifest.disposition, 'reviewed');
assert.equal(manifest.adopted, false);
exact(manifest.review);
const seen = new Set();
for (const source of manifest.sources) {
  assert.ok(!seen.has(source.path)); seen.add(source.path); exact(source);
}
const creation = JSON.parse(exact(manifest.creationReceipt));
assert.equal(creation.before.sourceFiles.length, 315);
const changes = new Map(manifest.creationSourceAmendments.map(item => [item.path, item]));
assert.equal(changes.size, 2);
assert.deepEqual([...changes.keys()].sort(), ['bend2/ui/Commands.bend', 'bend2/ui/State.bend']);
let retained = 0;
for (const item of creation.before.sourceFiles) {
  const change = changes.get(item.path);
  if (change) { assert.equal(change.beforeSha256, item.sha256); exact({ path: item.path, sha256: change.afterSha256 }); }
  else { exact(item); retained++; }
}
assert.equal(retained, 313);
for (const item of manifest.originalConsumers) exact(item);
for (const item of manifest.evidence) {
  const data = JSON.parse(exact(item));
  if (item.kind === 'terminal') {
    assert.equal(data.passed, true); assert.equal(data.exitCode, 0);
    assert.equal(data.checkedExitedHandleClosed, true); assert.equal(data.checkedJobClosed, true);
    assert.deepEqual(data.before, data.after);
  } else if (item.kind === 'result') assert.equal(data.ok, true);
}
for (const cache of manifest.caches) {
  const data = JSON.parse(exact(cache));
  for (const item of data.binding.sourceFiles) exact(item);
  for (const item of data.binding.pristineFiles)
    exact({ path: '.artifacts/toolchains/bend-2.0.35-scout/bend2/' + item.path, sha256: item.sha256 });
  for (const item of data.binding.derivedFiles)
    exact({ path: '.artifacts/bend2/toolchain-patches/derived-2035-source-loader/bend2/' + item.path, sha256: item.sha256 });
  exact({ path: path.posix.join(path.posix.dirname(cache.path), data.output.file), sha256: data.output.sha256 });
}
const build = JSON.parse(exact(manifest.build));
assert.equal(build.candidate, manifest.candidate); assert.equal(build.adopted, false);
for (const [name, sha256] of Object.entries(build.files))
  exact({ path: path.posix.join(path.posix.dirname(manifest.build.path), name), sha256 });
assert.deepEqual(read(manifestPath), bytes, 'Manifest changed during capture');
const git = (...args) => execFileSync('git', ['-C', root, ...args], {
  encoding: 'utf8', windowsHide: true, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
git('merge-base', '--is-ancestor', manifest.baseline, 'HEAD');
console.log(JSON.stringify({ schema: 'rift-canonical-match-capture/1', manifestSha256: hash(bytes),
  currentCommit: git('rev-parse', 'HEAD'), currentDirty: Boolean(git('status', '--porcelain=v1')),
  retainedCreationSources: retained, amendedCreationSources: changes.size,
  originalConsumersUnchanged: manifest.originalConsumers.length, evidence: manifest.evidence.length,
  buildVersion: build.version, newProofWorkers: 0, adopted: false,
  scope: 'Current application bytes and retained execution evidence only; historical /2 capture is unchanged and rejects these UI amendments. No Safe/kernel/native/device/adoption authority.' }, null, 2));
