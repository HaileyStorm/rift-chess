// Disposable 2.0.28 graphics proof and finite reference gate. The candidate
// TS bridge changes only host-authored constructor tags, not pixel oracles.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyV2 } from '../../tools/freeze-v2.mjs';
import { verifyLibrary } from '../../tools/verify-library.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const here = path.dirname(fileURLToPath(import.meta.url));
const baseline = path.join(root, '.artifacts/bend2/toolchain-patches/fresh-2028-stack');
const candidate = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028/bend2');
const bun = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const semantic = verifyV2();
const frozenLibrary = verifyLibrary({ check: false });
assert.ok(frozenLibrary.sourceFreeze, 'Graphics v1 source freeze must exist');
const graphicsManifestSha256 = sha(fs.readFileSync(path.join(root, 'bend2/lib/graphics/VERIFICATION.json')));
const runnerSha256 = sha(fs.readFileSync(fileURLToPath(import.meta.url)));
const tag = execFileSync('git', ['-C', baseline, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(tag, 'bc178404f4778704fa5584a73fcdf72bcdf9f32c');
execFileSync('git', ['-C', baseline, 'diff', '--check']);
const patchSha256 = sha(fs.readFileSync(path.join(here, '006-after-004-2.0.28.patch')));
assert.equal(patchSha256, 'a558b9b53cb46667659dc52036ad13a64da4e026ca8cf51dbd1ede9468fa8344');
const compiler = Object.fromEntries(['bend.ts', 'comp.ts', 'main.ts', 'base.bend', 'web_runtime.js']
  .map(name => [name, sha(fs.readFileSync(path.join(candidate, name)))]));
const canonical = name => sha(fs.readFileSync(path.join(candidate, name), 'utf8').replace(/\r\n/g, '\n'));
assert.equal(canonical('bend.ts'), '359543edcf8060817f68e1ae6aeaad79888a20de511e676d065abab271657dd8');
assert.equal(canonical('comp.ts'), '49c40305ef96f91187cc5eb8fceac02cbf2c4992cbdee4819ec7c0fd3ee8887b');
assert.equal(canonical('main.ts'), '5303e55d5b240d173f78c6c2f0b2e626a276482541a5d80fd1a22e986d1ab430');
assert.equal(canonical('web_runtime.js'), '5def0b7c33be027416c869adbf16a26cc98a0008461b11c2e49453c955ad97d6');
assert.equal(compiler['base.bend'], '722a76eaa91732b3c50299f91769ae6ba97ad80705013209b816f5204536aebb');
assert.equal(compiler['base.bend'], sha(fs.readFileSync(path.join(baseline, 'bend2/base.bend'))));
const pinned = path.join(root, '.artifacts/toolchains/bend');
const pin = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));
assert.equal(execFileSync('git', ['-C', pinned, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), pin.bendCommit);
assert.equal(execFileSync('git', ['-C', pinned, 'status', '--porcelain', '--untracked-files=no'],
  { encoding: 'utf8' }).trim(), '');
assert.equal(spawnSync(bun, ['--version'], { encoding: 'utf8' }).stdout.trim(), pin.bunVersion);

const proofs = [
  'bend2/lib/graphics/contracts/PROOF.bend',
  'bend2/lib/graphics/pixels/PROOF.bend',
  'bend2/lib/graphics/v2/assets/contracts/PROOF.bend',
  'bend2/lib/graphics/v2/contracts/PROOF.bend',
  'bend2/lib/graphics/v2/contracts/extensions/PROOF.bend',
  'bend2/lib/graphics/v2/contracts/expansion/PROOF.bend',
  'bend2/lib/graphics/v2/contracts/third/PROOF.bend',
  'bend2/lib/grid8/contracts/PROOF.bend',
];
function discoverProofs(directory, found = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    assert.ok(!entry.isSymbolicLink(), `Graphics proof discovery rejects links: ${file}`);
    if (entry.isDirectory()) discoverProofs(file, found);
    else if (entry.name === 'PROOF.bend') found.push(relative(file));
  }
  return found;
}
assert.deepEqual(proofs.slice().sort(), [
  ...discoverProofs(path.join(root, 'bend2/lib/graphics')),
  ...discoverProofs(path.join(root, 'bend2/lib/grid8')),
].sort(), 'A new graphics/grid8 proof entry point needs this candidate gate');
function closure(file, found = new Set()) {
  file = fs.realpathSync(file);
  assert.ok(file.startsWith(root + path.sep), `Graphics source escaped project: ${file}`);
  if (found.has(file)) return found;
  found.add(file);
  const source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.bend')) {
    for (const match of source.matchAll(/^\s*import\s+([^\s]+)(?:\s+as\s+\w+)?\s*(?:#.*)?$/gm)) {
      if (match[1] === 'Base') continue;
      assert.ok(match[1].startsWith('./') || match[1].startsWith('../'));
      closure(path.resolve(path.dirname(file), match[1]), found);
    }
  } else if (file.endsWith('library.ts') || file.endsWith('graphics-regression.ts')) {
    for (const match of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g))
      closure(path.resolve(path.dirname(file), match[1]), found);
  }
  return found;
}
const inputs = new Set();
for (const proof of proofs) closure(path.join(root, proof), inputs);
for (const name of ['graphics-regression.ts', 'graphics-loader-2028.ts', 'loader-2028.ts',
  '006-after-004-2.0.28.patch']) inputs.add(path.join(here, name));
closure(path.join(root, 'bend2/lib/graphics/v2/tests/library.ts'), inputs);
closure(path.join(here, 'graphics-regression.ts'), inputs);
const sources = [...inputs].sort().map(file => ({ path: relative(file), sha256: sha(fs.readFileSync(file)) }));
const env = { ...process.env, BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9' };
function run(executable, args, cwd, extra = {}, timeout = 240000) {
  const start = Date.now();
  const result = spawnSync(executable, args, { cwd, env: { ...env, ...extra },
    encoding: 'utf8', timeout, maxBuffer: 2e6 });
  return { status: result.status, error: result.error?.message ?? null,
    stdout: (result.stdout || '').trim(), stderr: (result.stderr || '').trim(),
    elapsedMs: Date.now() - start };
}
const proofResults = proofs.map(file => {
  const check = run(bun, [path.join(candidate, 'main.ts'), path.join(root, file).replaceAll('\\', '/'),
    '--check-only'], candidate, {}, 120000);
  const passed = check.status === 0 && !check.error && check.stdout === 'All terms check.' && !check.stderr;
  console.log(JSON.stringify({ proof: file, passed, elapsedMs: check.elapsedMs }));
  return { file, ...check, passed };
});
const diagnostic = path.join(here, 'graphics-regression.ts');
const pinnedPixels = run(process.execPath, ['bend2/tools/bend.mjs', '--run', diagnostic], root);
const candidatePixels = run(bun, ['--preload', path.join(here, 'loader-2028.ts'), diagnostic], root,
  { BEND_DIAGNOSTIC_COORD_PREFIX: 'Shapes.' });
const library = path.join(root, 'bend2/lib/graphics/v2/tests/library.ts');
const pinnedLibrary = run(process.execPath, ['bend2/tools/bend.mjs', '--run', library], root);
const candidateLibrary = run(bun, ['--preload', path.join(here, 'graphics-loader-2028.ts'), library], root);
function verdict(record, expected) {
  if (record.status !== 0 || record.error || record.stderr) return false;
  try { return Object.entries(expected).every(([key, value]) => JSON.parse(record.stdout)[key] === value); }
  catch { return false; }
}
const unchanged = verifyV2().sha256 === semantic.sha256 &&
  JSON.stringify(verifyLibrary({ check: false })) === JSON.stringify(frozenLibrary) &&
  sha(fs.readFileSync(path.join(root, 'bend2/lib/graphics/VERIFICATION.json'))) === graphicsManifestSha256 &&
  sources.every(source => sha(fs.readFileSync(path.join(root, source.path))) === source.sha256) &&
  Object.entries(compiler).every(([name, hash]) => sha(fs.readFileSync(path.join(candidate, name))) === hash) &&
  sha(fs.readFileSync(fileURLToPath(import.meta.url))) === runnerSha256;
const passed = unchanged && proofResults.length === 8 && proofResults.every(record => record.passed) &&
  verdict(pinnedPixels, { ok: true, cases: 1088, tagPrefix: '' }) &&
  verdict(candidatePixels, { ok: true, cases: 1088, tagPrefix: 'Shapes.' }) &&
  verdict(pinnedLibrary, { ok: true, checks: 5874 }) &&
  verdict(candidateLibrary, { ok: true, checks: 5874 });
const receipt = { schema: 'rift-bend-2028-candidate-graphics/1', at: new Date().toISOString(),
  sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  semanticSha256: semantic.sha256, graphicsSourceFreezeSha256: frozenLibrary.sourceFreeze,
  graphicsManifestSha256, candidateTag: tag, patchSha256, compiler, runnerSha256,
  sources, proofs: proofResults, pinnedPixels, candidatePixels, pinnedLibrary, candidateLibrary,
  unchanged, passed,
  scope: 'Eight local graphics/grid8 proof entry points and two finite JS pixel references; exact candidate-only Coord tags; not native/GPU/browser or pin acceptance' };
const out = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028-graphics');
fs.mkdirSync(out, { recursive: true });
const file = path.join(out, `receipt-${Date.now()}-${crypto.randomUUID()}.json`);
fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ file, passed, proofs: proofResults.filter(record => record.passed).length,
  pinnedPixels: pinnedPixels.status, candidatePixels: candidatePixels.status,
  pinnedLibrary: pinnedLibrary.status, candidateLibrary: candidateLibrary.status }));
if (!passed) process.exitCode = 1;
