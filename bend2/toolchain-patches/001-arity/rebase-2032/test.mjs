// Candidate-only 2.0.32 arity diagnostic gate; never changes the canonical pin.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const pristine = path.join(root, '.artifacts/toolchains/bend-2.0.32-scout');
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const bun = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const patch = path.join(root, 'bend2/toolchain-patches/001-arity/rebase-2032/0001-arity-diagnostics.patch');
const version = '573002f01ec6c52416d44489543f69a9625facf8';
const out = path.join(root, '.artifacts/bend2/toolchain-patches/arity-2032', `${Date.now()}-${process.pid}`);
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const git = (dir, ...args) => {
  const p = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', timeout: 10000 });
  assert.equal(p.status, 0, p.stderr);
  return p.stdout.trim();
};
assert.equal(git(pristine, 'rev-parse', 'HEAD'), version);
assert.equal(git(derived, 'rev-parse', 'HEAD'), version);
assert.equal(git(pristine, 'status', '--porcelain', '--untracked-files=no'), '');
assert.equal(git(derived, 'status', '--porcelain', '--untracked-files=no'), 'M bend2/comp.ts');
assert.equal(sha(fs.readFileSync(patch)), '98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db');
assert.equal(sha(fs.readFileSync(path.join(derived, 'bend2/comp.ts'))),
  'a067bd0fae6111e500f16db33697ed7f1347be7e20c4fb90d9996484489a1038');
fs.mkdirSync(out, { recursive: true });
const fields = n => Array.from({ length: n }, (_, i) => `f${i}: U32`).join(', ');
const values = n => Array.from({ length: n }, () => 'x').join(', ');
function fixture(resultWords) {
  return `import Base
type Wide is Data:
  Wide{${fields(121)}}
type Small is Data:
  Small{${fields(resultWords)}}
def make_wide(+x: U32) -> Wide:
  Wide{${values(121)}}
def make_small(+x: U32) -> Small:
  Small{${values(resultWords)}}
def one() -> U32:
  4
def take(a: Wide, b: Wide, c: Small, d: U32) -> U32:
  1
def join(a: Wide, b: Wide) -> U32:
  x y = make_small(3) one()
  take(a, b, x, y)
def main() -> U32:
  join(make_wide(1), make_wide(2))
`;
}
function constructorFixture(words) {
  return `import Base
type Box is Data:
  Box{${fields(words)}}
def make(+x: U32) -> Box:
  Box{${values(words)}}
def main() -> Box:
  make(1)
`;
}
function run(compiler, name, ext, check = false) {
  const label = compiler === pristine ? 'pristine' : 'derived';
  const output = path.join(out, `${name}-${label}${ext}`);
  const args = [path.join(compiler, 'bend2/main.ts'), path.join(out, name + '.bend'),
    ...(check ? ['--check-only'] : ['-o', output])];
  const p = spawnSync(bun, args, { cwd: path.join(compiler, 'bend2'),
    env: { ...process.env, BEND_NO_TELEMETRY: '1' }, encoding: 'utf8', timeout: 30000 });
  assert.equal(p.error, undefined, `${label}/${name}: ${String(p.error)}`);
  return { status: p.status, output, text: (p.stdout || '') + (p.stderr || '') };
}
const cases = [['join-247', fixture(4)], ['join-248', fixture(5)],
  ...[247, 248, 255, 256].map(n => [`constructor-${n}`, constructorFixture(n)])];
const results = [];
for (const [name, source] of cases) {
  fs.writeFileSync(path.join(out, name + '.bend'), source, { flag: 'wx' });
  const checks = [pristine, derived].map(compiler => run(compiler, name, '', true));
  assert.ok(checks.every(result => result.status === 0), `${name} source check failed: ${checks.map(x => x.text).join('\n')}`);
  for (const ext of ['.js', '.c']) {
    const baseline = run(pristine, name, ext), candidate = run(derived, name, ext);
    if (name === 'join-248' && ext === '.c') {
      assert.notEqual(baseline.status, 0, 'Pristine 2.0.32 must reject its 248-word segment');
      assert.match(baseline.text, /an arity over 247/);
      assert.notEqual(candidate.status, 0, 'Derived 2.0.32 must retain the rejection');
      assert.match(candidate.text, /native C segment layout exceeds 247-word cap: FID_T\[\d+\]=248/);
      assert.match(candidate.text, /owner="join".*captures=3 \["a":121, "b":121, "x":5\] \(247 words\).*return binder="y" \(1 words\)/);
      assert.ok(!fs.existsSync(baseline.output) && !fs.existsSync(candidate.output), 'Rejected C output exists');
      results.push({ name, ext, rejected: true, diagnostic: candidate.text.match(/native C segment layout exceeds[^\r\n]*/)?.[0] });
    } else {
      assert.equal(baseline.status, 0, `${name} pristine ${ext}: ${baseline.text}`);
      assert.equal(candidate.status, 0, `${name} derived ${ext}: ${candidate.text}`);
      const a = fs.readFileSync(baseline.output), b = fs.readFileSync(candidate.output);
      assert.deepEqual(b, a, `${name} successful ${ext} bytes drifted`);
      results.push({ name, ext, sha256: sha(a), bytes: a.length });
    }
  }
}
assert.equal(git(pristine, 'status', '--porcelain', '--untracked-files=no'), '');
assert.equal(git(derived, 'status', '--porcelain', '--untracked-files=no'), 'M bend2/comp.ts');
const receipt = { ok: true, version, patchSha256: sha(fs.readFileSync(patch)), results,
  scope: 'Bounded 2.0.32 FID rejection and CID success-boundary fixtures with exact successful C/JS bytes; true encoded CID overflow not exercised; no full compiler, proof, native, GPU, browser or pin acceptance' };
fs.writeFileSync(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ out, ...receipt }));
