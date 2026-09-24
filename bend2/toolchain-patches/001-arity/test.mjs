import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const pinned = resolve(root, '.artifacts/toolchains/bend');
const patched = resolve(root, '.artifacts/bend2/toolchain-patches/arity/compiler');
const out = resolve(root, '.artifacts/bend2/toolchain-patches/arity/tests');
const bun = resolve(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const checkOnly = process.argv.includes('--check-only');
mkdirSync(out, { recursive: true });
const pin = 'd37909174ebd664338ae3194799a9e0899dedd51';

function git(path, ...args) {
  const p = spawnSync('git', ['-C', path, ...args], { encoding: 'utf8', timeout: 10000 });
  assert.equal(p.status, 0, `git ${args.join(' ')}: ${p.stderr}`);
  return p.stdout.trim();
}
assert.equal(git(pinned, 'rev-parse', 'HEAD'), pin);
assert.equal(git(patched, 'rev-parse', 'HEAD'), pin);
assert.equal(git(pinned, 'status', '--porcelain'), '', 'pinned tree must be clean');
assert.equal(git(patched, 'status', '--porcelain'), 'M bend2/comp.ts');

function sha(data) { return createHash('sha256').update(data).digest('hex'); }
function run(compiler, source, ext, check = false) {
  const target = join(out, `${source}.${compiler === pinned ? 'pin' : 'patch'}${ext}`);
  const args = [resolve(compiler, 'bend2/main.ts'), join(out, source + '.bend'),
    ...(check ? ['--check-only'] : ['-o', target])];
  const p = spawnSync(bun, args, { cwd: resolve(compiler, 'bend2'),
    env: { ...process.env, BEND_NO_TELEMETRY: '1' },
    encoding: 'utf8', timeout: 15000 });
  assert.equal(p.error, undefined, `${source}: ${String(p.error)}`);
  return { ...p, target };
}

function fixture(width, binderWords, parallel = false) {
  const fields = (n) => Array.from({ length: n }, (_, i) => `f${i}: U32`).join(', ');
  const vals = (n) => Array.from({ length: n }, () => 'x').join(', ');
  // Two live 125-word records survive across a non-tail call or fork. The
  // binder adds 5 or 6 result words, reaching precisely 255 or 256.
  return `import Base
type Wide is Data:
  Wide{${fields(width)}}
type Small is Data:
  Small{${fields(binderWords)}}
def make_wide(+x: U32) -> Wide:
  Wide{${vals(width)}}
def make_small(+x: U32) -> Small:
  Small{${vals(binderWords)}}
def one() -> U32:
  4
def take(a: Wide, b: Wide, c: Small, d: U32) -> U32:
  1
def join(a: Wide, b: Wide) -> U32:
  ${parallel ? 'x y = make_small(3) one()' : 'x = make_small(3)'}
  take(a, b, x, ${parallel ? 'y' : '4'})
def main() -> U32:
  join(make_wide(1), make_wide(2))
`;
}

function constructorFixture(width) {
  const fields = Array.from({ length: width }, (_, i) => `f${i}: U32`).join(', ');
  const values = Array.from({ length: width }, () => '0').join(', ');
  return `import Base
type Huge is Data:
  Huge{${fields}}
def main() -> Huge:
  Huge{${values}}
`;
}

const cases = [
  ['wide-record', fixture(125, 5, false)],
  ['join-255', fixture(125, 4, true)],
  ['join-256', fixture(125, 5, true)],
  ['constructor-256', constructorFixture(256)],
];
const deadline = Date.now() + 75000;
for (const [name, src] of cases) {
  assert.ok(Date.now() < deadline, 'test suite exceeded 75-second cap');
  writeFileSync(join(out, name + '.bend'), src);
  console.log(`${name} source sha256=${sha(src)}`);
  for (const compiler of [pinned, patched]) {
    const check = run(compiler, name, '', true);
    assert.equal(check.status, 0, `${name}: check failed: ${check.stdout}\n${check.stderr}`);
    console.log(`${name} ${compiler === pinned ? 'pin' : 'patch'} check: pass`);
  }
  if (checkOnly) continue;
  for (const ext of ['.js', '.c']) {
    const old = run(pinned, name, ext);
    const now = run(patched, name, ext);
    if ((name === 'join-256' || name === 'constructor-256') && ext === '.c') {
      assert.notEqual(old.status, 0, 'baseline should reject 256 words');
      assert.match(old.stderr + old.stdout, /an arity over 255/);
      assert.notEqual(now.status, 0, 'patch must reject 256 words');
      assert.ok(!existsSync(old.target) && !existsSync(now.target),
        'a failed C emission must leave no output artifact');
      if (name === 'join-256') {
        assert.match(now.stderr + now.stdout,
          /native C layout exceeds 255-word cap: FID_ARITY_T\[\d+\]=256/);
        assert.match(now.stderr + now.stdout,
          /owner="join", segment=FID_MAIN_K\d+, captures=3 \["a":125, "b":125, "x":5\] \(255 words\), return binder="y" \(1 words\)/);
      } else {
        assert.match(now.stderr + now.stdout,
          /native C layout exceeds 255-word cap: CID_ARITY_T\[\d+\]=256, owner="Huge"/);
      }
      console.log(`${name} C diagnostic: ${String(now.stderr + now.stdout).match(/native C layout exceeds[^\r\n]*/)?.[0]}`);
    } else {
      assert.equal(old.status, 0, `${name} pinned ${ext}: ${old.stdout}\n${old.stderr}`);
      assert.equal(now.status, 0, `${name} patched ${ext}: ${now.stdout}\n${now.stderr}`);
      const a = readFileSync(old.target), b = readFileSync(now.target);
      assert.deepEqual(b, a, `${name} ${ext} bytes drifted`);
      console.log(`${name} ${ext}: byte-identical sha256=${sha(a)}`);
    }
  }
}
