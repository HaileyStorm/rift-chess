// Local synthetic acceptance for the separately versioned 2.0.32 candidate.
// This is not the frozen v2 aggregate, mutation suite, or BendTT verification.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const candidate = path.join(root, '.artifacts/toolchains/bend-2.0.32-scout');
const canonical = path.join(root, '.artifacts/toolchains/bend');
const bun = path.join(root,
  '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const checker = path.join(root, 'bend2/core/v3/2032/check.ts');
const authority = path.join(root, 'bend2/core/v3/proof-authority.mjs');
const pinFile = path.join(root, 'bend2/TOOLCHAIN.json');
const fixtureDir = path.join(root, 'bend2/core/v3/2032/fixtures');
const expected = {
  checkerSha256: '942e4774c24d641c4b5f015e650e5a846d346cd938a7cfc84be2ef4c4ecaf999',
  authoritySha256: '3737c455d542f2dc7ff1799bfc579969c42739814411a8494189eb1b56a74013',
  pinSha256: '17419db1617fece38c72dba9136463a313db43bf2c61f657334d9fdce0ae51a6',
  bunSha256: '15277c59ccd6c6c20f8dc9716c2b59c1776320d606b6a8658f70be8799519ca4',
  fixtures: {
    'positive.bend': '2c1fd9a325f671fd2525cb9a2f29315e014c5652222ed68a252ef38f1172f2ad',
    'todo.bend': 'b4d27ca79c6cff228b03939621b815835ff97c65db6f2d2f4f44937527dd7bec',
    'unsafe.bend': 'bc4d7fba5dcef6ea715065c3b33200242777ecbc73087b9fab648be49936651a',
    'foreign.bend': '2d33ba35d9a7d405d31d2bb7dba48c7749bdafc4276a2e761af276796d246d74',
    'foreign.js': 'df7fd8377468935fa77d221417b42f82eee1e282b9b84bc1b0c2f7152cd644c0',
    'compiler-owned.bend': 'd103ff1658e4434e1fb41cf49545c1ddd3d7ab3a027997217224803bdfb42bd9',
  },
  compilerSources: {
    'bend2/bend.ts': 'e342b14666c6fefbff988e985d3672f99d22bed5e33fbc0ad9e2d8d980b3c9d6',
    'bend2/comp.ts': '84a657f11d94ed6462bfc71710fef9f798e3bb4b6b345636e30dd3c6f4e4fffc',
    'bend2/main.ts': 'dfc58318166dc2720e626dfc46edaae38f8a0a7a8b3753cad7a48619896b94fb',
    'bend2/base.bend': 'a548d71e16e3e1b19f08ab187c1b04afabb7a3cf5fefa067004b77b6eaca9ba0',
  },
};

assert.equal(process.env.BEND_NO_TELEMETRY, '1', 'Run with telemetry disabled.');
assert.equal(sha(fs.readFileSync(checker)), expected.checkerSha256,
  'Candidate checker source differs from the reviewed test input.');
assert.equal(sha(fs.readFileSync(authority)), expected.authoritySha256);
assert.equal(sha(fs.readFileSync(pinFile)), expected.pinSha256);
assert.equal(JSON.parse(fs.readFileSync(pinFile, 'utf8')).bendCommit,
  'd37909174ebd664338ae3194799a9e0899dedd51');
assert.equal(git(canonical, 'rev-parse', 'HEAD'), 'd37909174ebd664338ae3194799a9e0899dedd51');
assert.equal(git(canonical, 'status', '--porcelain=v1', '--untracked-files=all'), '');
assert.equal(git(candidate, 'rev-parse', 'HEAD'), '573002f01ec6c52416d44489543f69a9625facf8');
assert.equal(git(candidate, 'show', '-s', '--format=%T', 'HEAD'),
  '0ecfc84c5f19bbae2c0c10735129749adf7d49e8');
assert.equal(git(candidate, 'status', '--porcelain=v1', '--untracked-files=all'), '');
assert.equal(sha(fs.readFileSync(bun)), expected.bunSha256);
assert.equal(execFileSync(bun, ['--version'], { encoding: 'utf8' }).trim(), '1.4.2');
for (const [relative, digest] of Object.entries(expected.compilerSources))
  assert.equal(sha(fs.readFileSync(path.join(candidate, relative))), digest, relative);
for (const [name, digest] of Object.entries(expected.fixtures))
  assert.equal(sha(fs.readFileSync(path.join(fixtureDir, name))), digest, name);

const cases = [
  { name: 'positive', exit: 0 },
  { name: 'todo', exit: 1, reason: /^1 TODO\/open proof holes$/ },
  { name: 'unsafe', exit: 1, reason: /^Proof depends on unsafe code: leaf, caller$/ },
  { name: 'foreign', exit: 1, reason: /^Proof depends on foreign code: leaf, caller$/ },
  { name: 'compilerOwned', exit: 1, stage: 'compiler-book-owned-guard',
    reason: /^IO is a name the compiler encodes itself: name yours apart$/ },
];
const results = [];
for (const item of cases) {
  const result = spawnSync(bun, [checker, item.name], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 400000,
    env: { ...process.env, BEND_NO_TELEMETRY: '1' },
  });
  assert.equal(result.error, undefined, `${item.name}: checker process error`);
  assert.equal(result.status, item.exit, `${item.name}: unexpected exit`);
  if (item.exit === 0) {
    assert.equal(result.stderr, '', `${item.name}: unexpected stderr`);
    const receipt = JSON.parse(result.stdout);
    assert.equal(receipt.ok, true);
    assert.equal(receipt.control, item.name);
    assert.equal(receipt.compiler.commit, '573002f01ec6c52416d44489543f69a9625facf8');
    assert.equal(receipt.sourceChecker,
      'Bend.book_valid passed (type and affine-ownership check)');
    assert.equal(receipt.compilerNamespace,
      'Comp.js_lib invoked; private book_owned guard passed; returned source discarded, not executed or persisted');
    assert.ok(Number.isSafeInteger(receipt.generatedSourceCodeUnits));
    assert.equal(receipt.bendTT, 'NOT RUN; this result is not a BendTT kernel verdict');
    assert.equal(receipt.networkFetches, 0);
    results.push({ control: item.name, verdict: 'synthetic source-checker positive' });
  } else {
    assert.equal(result.stdout, '', `${item.name}: unexpected stdout`);
    const receipt = JSON.parse(result.stderr);
    assert.equal(receipt.ok, false);
    assert.equal(receipt.control, item.name);
    assert.equal(receipt.stage, item.stage ?? 'proof-authority');
    assert.match(receipt.reason, item.reason);
    assert.equal(receipt.bendTT, 'NOT RUN');
    results.push({ control: item.name, verdict: 'distinct negative control rejected',
      reason: receipt.reason });
  }
}

const out = {
  schema: 'rift-bend-v3-proof-checker-2032-test-receipt/1',
  passed: true,
  candidate: { version: '2.0.32', commit: '573002f01ec6c52416d44489543f69a9625facf8',
    tree: '0ecfc84c5f19bbae2c0c10735129749adf7d49e8' },
  canonicalPin: { version: '2.0.27', commit: 'd37909174ebd664338ae3194799a9e0899dedd51',
    unchangedAndClean: true },
  runtime: { name: 'Bun', version: '1.4.2', sha256: expected.bunSha256 },
  checkerSha256: expected.checkerSha256,
  testSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
  authoritySha256: expected.authoritySha256,
  compilerSourceSha256: expected.compilerSources,
  fixtureSha256: expected.fixtures,
  results,
  compilerNamespaceGuard: 'Comp.js_lib exercised on main-free books; source returned for valid names is discarded; compiler-owned IO negative rejects before emission',
  frozenV2Closure: 'NOT ATTEMPTED; Windows nested-import path compatibility remains unresolved',
  bendTTKernelVerdict: 'NOT RUN',
  mutationSuite: 'NOT RUN',
  pinAdoption: 'NOT ATTEMPTED',
  scope: 'local synthetic source-checker, promise-screen, and representative compiler namespace-guard candidate only; not proof, full codegen/closure, or 2.0.32 acceptance',
};
process.stdout.write(JSON.stringify(out) + '\n');
