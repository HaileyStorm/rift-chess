// Replay the reviewed worker patch stack into a disposable checkout. The
// upstream pin is never patched, updated or hidden behind the variant path.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilerSourceTreeHash } from './emit-worker-libs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pin = path.join(root, '.artifacts/toolchains/bend');
const target = path.join(root, '.artifacts/bend2/toolchain-patches/workers-stage2-20260925');
const patchRoot = path.join(root, 'bend2/toolchain-patches');
const variant = JSON.parse(fs.readFileSync(path.join(patchRoot, '004-web-workers/VARIANT.json'), 'utf8'));
const toolchain = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));
const sha = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const run = (args) => {
  const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
assert.equal(variant.schema, 'rift-bend-worker-toolchain/1');
assert.equal(variant.baseCommit, toolchain.bendCommit);
assert.equal(run(['-C', pin, 'rev-parse', 'HEAD']), variant.baseCommit);
assert.equal(run(['-C', pin, 'status', '--porcelain', '--untracked-files=no']), '', 'Upstream pin is dirty');
assert.equal(path.relative(root, target).replaceAll('\\', '/'),
  '.artifacts/bend2/toolchain-patches/workers-stage2-20260925');
for (const record of variant.patches) {
  const file = path.join(patchRoot, record.file);
  assert.ok(file.startsWith(patchRoot + path.sep));
  assert.equal(sha(file), record.sha256, `Patch bytes changed: ${record.file}`);
}
if (!fs.existsSync(target)) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  run(['-C', pin, 'worktree', 'add', '--detach', target, variant.baseCommit]);
  for (const record of variant.patches) {
    const file = path.join(patchRoot, record.file);
    run(['-C', target, 'apply', '--check', file]);
    run(['-C', target, 'apply', file]);
  }
}
assert.equal(run(['-C', target, 'rev-parse', 'HEAD']), variant.baseCommit);
assert.equal(compilerSourceTreeHash(target), variant.sourceTreeSha256,
  'Variant compiler source changed or patch replay incomplete');
console.log(JSON.stringify({ target, baseCommit: variant.baseCommit,
  sourceTreeSha256: variant.sourceTreeSha256, pristinePin: true }));
