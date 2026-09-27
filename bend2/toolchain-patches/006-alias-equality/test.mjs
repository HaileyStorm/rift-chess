// Bounded candidate-only fixture gate. Never edits the clean 2.0.27 pin.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const here = path.dirname(fileURLToPath(import.meta.url));
const baseline = path.join(root, '.artifacts/bend2/toolchain-patches/fresh-2028-stack');
const candidate = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028');
const bun = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const patch = path.join(here, '006-after-004-2.0.28.patch');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonical = value => value.replace(/\r\n/g, '\n');
const read = file => fs.readFileSync(file, 'utf8');
assert.equal(execFileSync('git', ['-C', baseline, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  'bc178404f4778704fa5584a73fcdf72bcdf9f32c');
execFileSync('git', ['-C', baseline, 'apply', '--check', patch]);
assert.equal(spawnSync(bun, ['--version'], { encoding: 'utf8' }).stdout.trim(), '1.4.2');
const oldGuard = 'if ((q in p.book.tlds || q in p.book.ctrs) && (k in p.book.tlds || k in p.book.ctrs)) {';
const newGuard = 'if (q !== k && (q in p.book.tlds || q in p.book.ctrs) && (k in p.book.tlds || k in p.book.ctrs)) {';
const oldSource = canonical(read(path.join(baseline, 'bend2/bend.ts')));
assert.equal(oldSource.split(oldGuard).length, 2);
assert.equal(canonical(read(path.join(candidate, 'bend2/bend.ts'))), oldSource.replace(oldGuard, newGuard),
  'trial parser differs only in the equality guard modulo line endings');
for (const name of ['base.bend', 'comp.ts', 'main.ts', 'web_runtime.js'])
  assert.equal(sha(fs.readFileSync(path.join(candidate, 'bend2', name))),
    sha(fs.readFileSync(path.join(baseline, 'bend2', name))),
    `copied candidate drifted: ${name}`);

function run(compiler, file, checkOnly) {
  const args = [path.join(compiler, 'bend2/main.ts'), file.replaceAll('\\', '/')];
  if (checkOnly) args.push('--check-only');
  const result = spawnSync(bun, args, { encoding: 'utf8', cwd: path.join(compiler, 'bend2'),
    env: { ...process.env, BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9' },
    timeout: 120000, maxBuffer: 1048576 });
  return { status: result.status, output: (result.stdout || '') + (result.stderr || ''),
    error: result.error?.message ?? null };
}
const fixtures = [];
function expect(name, compiler, file, checkOnly, status, pattern) {
  const result = run(compiler, file, checkOnly);
  const ok = result.status === status && pattern.test(result.output) && !result.error;
  fixtures.push({ name, ok, ...result, file: path.relative(root, file).replaceAll('\\', '/'),
    compiler: compiler === candidate ? 'alias-equality trial' : 'pre-006 baseline' });
  if (!ok) throw Error(`${name}: unexpected status/output: ${JSON.stringify(result)}`);
}
const local = name => path.join(here, 'tests', name);
const upstream = name => path.join(baseline, 'tests/import', name);
expect('pre-006 identity alias rejects incorrectly', baseline, local('identity_test.bend'),
  true, 1, /alias Identity shadows Identity\.(?:read|Mark)/);
expect('identity alias checks constructor, def and imported law', candidate,
  local('identity_test.bend'), true, 0, /All terms check\./);
expect('identity alias evaluates correct value', candidate,
  local('identity_test.bend'), false, 0, /^7\s*$/m);
expect('frozen arithmetic laws parse past alias to their unfilled declarations', candidate,
  path.join(root, 'bend2/core/v2/ArithmeticLaws.bend'), true, 1, /10 TODOs found/);
for (const [name, pattern] of [
  ['alias_shadow.bend', /alias Nat shadows Nat\.add/],
  ['alias_decl.bend', /a fresh name \(M is an import's alias\)/],
  ['alias_twice.bend', /a fresh alias \(M names an earlier import\)/],
]) expect(name, candidate, upstream(name), true, 1, pattern);
expect('distinct constructor collision stays rejected', candidate,
  local('constructor_collision.bend'), true, 1,
  /alias Identity shadows Identity\.Mark/);
const receipt = { schema: 'rift-bend-2028-alias-equality-fixtures/1',
  at: new Date().toISOString(), sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'],
    { cwd: root, encoding: 'utf8' }).trim(),
  baselineTag: 'bc178404f4778704fa5584a73fcdf72bcdf9f32c',
  patchSha256: sha(fs.readFileSync(patch)),
  patchedBendCanonicalSha256: sha(Buffer.from(canonical(read(path.join(candidate, 'bend2/bend.ts'))))),
  fixtures, passed: fixtures.every(item => item.ok),
  scope: 'Local 2.0.28 parser compatibility and preserved ambiguity negatives; no full proof, native or pin acceptance' };
const output = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028-fixtures');
fs.mkdirSync(output, { recursive: true });
const file = path.join(output, 'receipt.json');
if (fs.existsSync(file)) {
  const prior = fs.readFileSync(file);
  const archive = path.join(output, `receipt-${sha(prior)}.json`);
  if (fs.existsSync(archive)) assert.equal(sha(fs.readFileSync(archive)), sha(prior));
  else fs.writeFileSync(archive, prior, { flag: 'wx' });
}
fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ file, passed: receipt.passed, cases: fixtures.length,
  patchSha256: receipt.patchSha256 }));
