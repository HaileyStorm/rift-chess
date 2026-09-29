// Exact, source-only 2.0.32 downstream replay; never moves the canonical pin.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const scout = path.join(root, '.artifacts/toolchains/bend-2.0.32-scout');
const canonical = path.join(root, '.artifacts/toolchains/bend');
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const release = '573002f01ec6c52416d44489543f69a9625facf8';
const pin = 'd37909174ebd664338ae3194799a9e0899dedd51';
assert.ok(process.argv.slice(2).every(arg => arg === '--compare-derived'),
  'Only --compare-derived is supported');
const compareDerived = process.argv.includes('--compare-derived');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const patches = [
  ['001', 'bend2/toolchain-patches/001-arity/rebase-2032/0001-arity-diagnostics.patch',
    '98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db',
    ['bend2/comp.ts']],
  ['002', 'bend2/toolchain-patches/002-layout/rebase-2032/0002-after-001-2.0.32.patch',
    '2ed566176148cc1e064d2dae4c806c7912d557e38570ecfa5f47ddd0d78d395d',
    ['bend2/bend.ts', 'bend2/comp.ts', 'bend2/main.ts']],
  ['005', 'bend2/toolchain-patches/005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch',
    '99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4',
    ['bend2/bend.ts', 'bend2/main.ts']],
];
const final = {
  'bend2/bend.ts': '2c3953bb4fcb12aa97d4ce8cd041ef0ce8324c724fd0adc9b0352fff4c0f5c09',
  'bend2/comp.ts': '0108bf3a080d1cfbb987a5d95fb5b1e7acae91da85efb419eed7e06dd75334a7',
  'bend2/main.ts': 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
};
const stages = [
  { 'bend2/comp.ts': 'a067bd0fae6111e500f16db33697ed7f1347be7e20c4fb90d9996484489a1038' },
  { 'bend2/bend.ts': 'dcae4da6b687c96e3a2bd6c7e98ee00140857ef41cdce68c8bd16c887b9e592f',
    'bend2/comp.ts': final['bend2/comp.ts'],
    'bend2/main.ts': 'df8839e6f77d657f67e7f47022ac5c8f2ca90dc4cd7bae9af0982c574267bd9e' },
  final,
];
function git(dir, ...args) {
  const p = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', timeout: 30000 });
  assert.equal(p.error, undefined, String(p.error));
  assert.equal(p.status, 0, p.stderr);
  return p.stdout.replace(/\r\n/g, '\n').trimEnd();
}
function sourceHash(tree, file) { return sha(fs.readFileSync(path.join(tree, file))); }
function assertHashes(tree, hashes) {
  for (const [file, expected] of Object.entries(hashes))
    assert.equal(sourceHash(tree, file), expected, `${file} differs after replay`);
}
assert.equal(git(scout, 'rev-parse', 'HEAD'), release);
assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(git(canonical, 'rev-parse', 'HEAD'), pin);
assert.equal(git(canonical, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(git(derived, 'rev-parse', 'HEAD'), release);
assert.equal(git(derived, 'diff', '--cached', '--name-only'), '');
assert.equal(git(derived, 'status', '--porcelain', '--untracked-files=no'),
  ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts');
if (compareDerived) assertHashes(derived, final);

const tempRoot = fs.realpathSync(os.tmpdir());
const scratch = fs.mkdtempSync(path.join(tempRoot, 'bend2-replay-2032-'));
try {
  fs.cpSync(path.join(scout, 'bend2'), path.join(scratch, 'bend2'), { recursive: true });
  const replay = [];
  for (let i = 0; i < patches.length; i++) {
    const [name, relative, expected, files] = patches[i];
    const file = path.join(root, relative);
    assert.equal(sha(fs.readFileSync(file)), expected, `patch ${name} bytes changed`);
    const diff = fs.readFileSync(file, 'utf8');
    assert.deepEqual([...diff.matchAll(/^diff --git a\/([^\r\n]+) b\/([^\r\n]+)/gm)]
      .map(match => { assert.equal(match[1], match[2]); return match[1]; }), files,
    `patch ${name} touched an unexpected path`);
    git(scratch, 'apply', '--check', file);
    git(scratch, 'apply', file);
    assertHashes(scratch, stages[i]);
    replay.push({ patch: name, sha256: expected, paths: files });
  }
  assertHashes(scratch, final);
  if (compareDerived) for (const file of Object.keys(final))
    assert.deepEqual(fs.readFileSync(path.join(scratch, file)),
      fs.readFileSync(path.join(derived, file)), `${file} differs from derived candidate`);
  console.log(JSON.stringify({ schema: 'rift-bend-2032-patch-replay/1', ok: true,
    upstream: release, canonicalPin: pin, replay, finalSourceSha256: final,
    comparedDerived: compareDerived,
    scope: 'exact source-only 001→002→005 replay; derived equality only with --compare-derived; not proof, compiler matrix, worker, native, GPU or pin acceptance' }));
} finally {
  const exact = fs.realpathSync(scratch);
  assert.equal(path.dirname(exact), tempRoot, 'replay cleanup escaped OS temp');
  assert.match(path.basename(exact), /^bend2-replay-2032-[^\\/]+$/);
  fs.rmSync(exact, { recursive: true, force: true });
}
