// Verify the required 001+002 patch stack in a pre-existing disposable tree.
// It never edits a compiler checkout. Run each patch's focused test first.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const artifactRoot = path.join(root, '.artifacts/bend2/toolchain-patches');
assert.ok(process.argv[2], 'pass the disposable compiler directory explicitly');
const stack = path.resolve(process.argv[2]);
const pin = path.join(root, '.artifacts/toolchains/bend');
const bun = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const base = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));
const patches = [
  ['001-arity/0001-arity-diagnostics.patch', '001-arity/receipt.json'],
  ['002-layout/0002-explain-layout.patch', '002-layout/receipt.json'],
];
const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const within = path.relative(artifactRoot, stack);
assert.ok(within && !within.startsWith('..') && !path.isAbsolute(within), 'stack must be under ignored artifacts');
assert.equal(fs.realpathSync(stack), stack, 'stack path must be canonical');

function run(binary, args, cwd, timeout = 30000) {
  const result = spawnSync(binary, args, {
    cwd, encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, BEND_NO_TELEMETRY: '1' },
  });
  assert.ifError(result.error);
  return result;
}
function success(result, label) {
  assert.equal(result.status, 0, `${label}: ${result.stderr}`);
  return result.stdout;
}
function git(tree, args) {
  return success(run('git', ['-C', tree, ...args], root), `git ${args.join(' ')}`);
}
function cli(tree, args) {
  return run(bun, [path.join(tree, 'bend2/main.ts'), ...args], path.join(tree, 'bend2'));
}

assert.equal(git(pin, ['rev-parse', 'HEAD']).trim(), base.bendCommit);
assert.equal(git(stack, ['rev-parse', 'HEAD']).trim(), base.bendCommit);
assert.equal(git(pin, ['status', '--porcelain', '--untracked-files=no']).trim(), '');
assert.equal(success(run(bun, ['--version'], root), 'Bun').trim(), base.bunVersion);
for (const [patchName, receiptName] of patches) {
  const patch = path.join(here, patchName);
  const receipt = JSON.parse(fs.readFileSync(path.join(here, receiptName), 'utf8'));
  assert.equal(hash(patch), receipt.patchSha256, `patch hash drift: ${patchName}`);
  git(stack, ['apply', '--reverse', '--check', '--', patch]);
}
success(run('git', ['-C', stack, 'diff', '--check'], root), 'stack diff');
assert.deepEqual(git(stack, ['diff', '--name-only']).trim().split(/\r?\n/).sort(),
  ['bend2/bend.ts', 'bend2/comp.ts', 'bend2/main.ts']);

const input = path.join(here, '002-layout/fixture.bend').replaceAll('\\', '/');
const reportText = success(cli(stack, [input, '--explain-layout']), 'combined layout');
const report = JSON.parse(reportText);
assert.equal(report.schema, 'bend-layout-v1');
assert.equal(report.declarations.find((item) => item.name === 'fork').sites[0].branches, 2);
assert.ok(!reportText.includes(root), 'absolute workspace path leaked');
const rejected = path.join(artifactRoot, 'arity/tests/join-256.bend');
assert.ok(fs.statSync(rejected).isFile(), 'run 001-arity/test.mjs first to create the join-256 fixture');
const out = path.join(artifactRoot, 'stack-verify', `${Date.now()}-${process.pid}`);
fs.mkdirSync(out, { recursive: true });
const failed = path.join(out, 'rejected.c');
const error = cli(stack, [rejected.replaceAll('\\', '/'), '-o', failed.replaceAll('\\', '/')]);
assert.notEqual(error.status, 0);
assert.match(error.stderr, /FID_ARITY_T.*captures=.*return binder/);
assert.ok(!fs.existsSync(failed), 'failed C file must not exist');
const outputHashes = {};
for (const ext of ['js', 'c']) {
  const from = path.join(out, `pin.${ext}`);
  const to = path.join(out, `stack.${ext}`);
  success(cli(pin, [input, '-o', from.replaceAll('\\', '/')]), `pin ${ext}`);
  success(cli(stack, [input, '-o', to.replaceAll('\\', '/')]), `stack ${ext}`);
  assert.equal(hash(to), hash(from), `successful ${ext} emission changed`);
  outputHashes[ext] = hash(to);
}
assert.equal(git(pin, ['status', '--porcelain', '--untracked-files=no']).trim(), '');
const result = { baseCommit: base.bendCommit,
  patches: patches.map(([name]) => ({ name, sha256: hash(path.join(here, name)) })),
  sources: Object.fromEntries(['bend.ts', 'comp.ts', 'main.ts'].map((name) =>
    [`bend2/${name}`, hash(path.join(stack, 'bend2', name))])),
  reportSchema: report.schema, forkBranches: 2,
  arityError: error.stderr.trim(), successfulOutputSha256: outputHashes,
  pinnedCheckoutClean: true,
  evidenceClass: 'small isolated combined CLI and emission smoke, not full native GUI/GPU acceptance' };
fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ result: path.join(out, 'result.json'), ...result }));
