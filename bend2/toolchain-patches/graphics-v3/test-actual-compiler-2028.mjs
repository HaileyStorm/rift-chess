// Candidate-only graphics compiler seam on the reviewed 2.0.28+006 snapshot.
// The frozen v2 graphics verifier and canonical 2.0.27 pin remain untouched.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const replay = path.join(root, '.artifacts/bend2/toolchain-patches/replay-2028-stack',
  '2026-09-27T22-06-39-801Z-28608-fa355796-dd12-424a-8ed9-eabeb7ba84ed/receipt.json');
const snapshot = path.join(root, '.artifacts/bend2/toolchain-patches/final-2028-proof-e943f02a');
const source = path.join(root, 'bend2/toolchain-patches/graphics-v3/actual_compiler.mjs');
const preflight = path.join(root, 'bend2/toolchain-patches/verify-v2-candidate-2028.mjs');
const fixture = path.join(root, 'bend2/core/v3/fixtures/indented.bend');
const helper = path.join(root, 'bend2/core/v3/fixtures/indented-helper.bend');
const receiptSha = 'a71ce32941c74abef1762bebb30d8526f115fc905bbb084722b3d6a4b2d7af01';
const sourceSha = '13b0d1c03542cf7eb57f79a4adf796cf7aeb0953a9020d8174260403fba5cb32';
const preflightSha = '921eb57b3799b2a0c4a1bb01456619ae961205a8b5f30352ad99d805e9a12af4';
const fixtureSha = '28cd1194ad39241e0eac857178336de1e54a188a09c98ed3a84424a0dfb0bd8e';
const helperSha = '187e3972e579403f6cfa1d0f244ea133983aa51a98d2bc7c142f0c3cf368d8e6';
const candidateTag = 'bc178404f4778704fa5584a73fcdf72bcdf9f32c';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
for (const [file, digest] of [[source, sourceSha], [preflight, preflightSha],
  [fixture, fixtureSha], [helper, helperSha]]) assert.equal(sha(fs.readFileSync(file)), digest);

const run = (args, timeout = 30000) => spawnSync(process.execPath,
  ['--max-old-space-size=768', ...args], { cwd: root,
    env: { ...process.env, BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9' },
    encoding: 'utf8', timeout, maxBuffer: 400000 });
const preflightArgs = [preflight, '--replay-receipt', replay, receiptSha,
  '--compiler-snapshot', snapshot, '--preflight-only'];
function checkPreflight() {
  const result = run(preflightArgs);
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  const checked = JSON.parse(result.stdout.trim());
  assert.equal(checked.ok, true);
  assert.equal(checked.finalStackReplay, true);
  assert.equal(checked.replayReceiptSha256, receiptSha);
  assert.deepEqual(checked.compilerSnapshot, { files: 95,
    sha256: '2ac802f1c362e80ba1198cb9a98dc867e28a4750f2e284edfa5af99c15e92c46' });
  return checked;
}
const binding = checkPreflight();
const directory = fs.mkdtempSync(path.join(root, '.artifacts/bend2/graphics-v3-2028-'));
const tool = path.join(directory, 'actual_compiler-2028.mjs');
let content = fs.readFileSync(source, 'utf8');
function replaceExactly(old, replacement) {
  assert.equal(content.split(old).length, 2, `Expected one source-bound substitution: ${old}`);
  content = content.replace(old, replacement);
}
replaceExactly("const pin = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));",
  `const pin = { bendCommit: '${candidateTag}' };`);
replaceExactly("const compiler = path.join(root, '.artifacts/toolchains/bend');",
  "const compiler = path.join(root, '.artifacts/bend2/toolchain-patches/final-2028-proof-e943f02a');");
replaceExactly("if (git('rev-parse', 'HEAD') !== pin.bendCommit) throw Error('Compiler pin mismatch');\n" +
  "if (git('status', '--porcelain', '--untracked-files=no'))\n  throw Error('Compiler tracked tree is dirty');",
  '// Candidate source/replay/snapshot is independently checked before and after this temporary copy.');
fs.writeFileSync(tool, content, { flag: 'wx' });

function check(mode, input = fixture, output = null, expectedStatus = 0) {
  const result = run([tool, mode, input, ...(output ? [output] : [])]);
  assert.equal(result.error, undefined);
  assert.equal(result.status, expectedStatus, result.stderr);
  if (expectedStatus !== 0) return result;
  assert.equal(result.stderr, '');
  const value = JSON.parse(result.stdout.trim());
  assert.equal(value.ok, true);
  assert.equal(value.compiler, candidateTag);
  assert.equal(value.guard, 'empty selected js_lib');
  assert.equal(value.deniedFetches, 0);
  return value;
}
const checked = check('check');
assert.deepEqual(checked.promises, []);
const sources = Object.fromEntries(checked.closure.map(({ path: name, sha256 }) => [name.replaceAll('\\', '/'), sha256]));
assert.deepEqual(sources, {
  '.artifacts/bend2/toolchain-patches/final-2028-proof-e943f02a/bend2/base.bend':
    binding.baseSha256,
  'bend2/core/v3/fixtures/indented-helper.bend': helperSha,
  'bend2/core/v3/fixtures/indented.bend': fixtureSha,
});
const cFile = path.join(directory, 'fixture.c');
const jsFile = path.join(directory, 'fixture.mjs');
check('c', fixture, cFile);
check('js', fixture, jsFile);
const jsBytes = fs.readFileSync(jsFile), cBytes = fs.readFileSync(cFile);
assert.equal(cBytes.length, 74265);
assert.equal(sha(cBytes), '4e4a80984dcaafaf0ab44baed4bc73d0e7e9f5c5b99164a52669a632a3412516');
assert.equal(jsBytes.length, 3100);
assert.equal(sha(jsBytes), '8d427b379dae84f2bb53c373d969a90e44846912989c014af3f2062505636afb');
const exports = (await import(pathToFileURL(jsFile).href)).default;
assert.deepEqual(Object.keys(exports).sort(), ['indented-helper.leaf', 'main']);
assert.equal(exports.main(), 1);
assert.equal(exports['indented-helper.leaf'](), 1);

const proof = path.join(directory, 'PROOF.bend');
fs.writeFileSync(path.join(directory, 'LAWS.bend'), 'import Base\n', { flag: 'wx' });
fs.writeFileSync(proof, 'import Base\n\ndef sample() -> U32:\n  1\n', { flag: 'wx' });
assert.match(check('check', proof, null, 1).stderr, /PROOF must import sibling LAWS/);
fs.writeFileSync(proof, 'import Base\nimport ./LAWS.bend as Laws\n\ndef sample() -> U32:\n  1\n');
check('check', proof);

const after = checkPreflight();
assert.deepEqual(after.compilerSnapshot, binding.compilerSnapshot);
for (const [file, digest] of [[source, sourceSha], [preflight, preflightSha],
  [fixture, fixtureSha], [helper, helperSha]]) assert.equal(sha(fs.readFileSync(file)), digest);
console.log(JSON.stringify({ ok: true, candidateOnly: true, replayReceiptSha256: receiptSha,
  compilerSnapshot: after.compilerSnapshot, stagedToolSha256: sourceSha,
  temporaryToolSha256: sha(fs.readFileSync(tool)), closure: checked.closure.length,
  promises: checked.promises, cBytes: cBytes.length, cSha256: sha(cBytes),
  jsBytes: jsBytes.length, jsSha256: sha(jsBytes), selectedExportsExecuted: true,
  missingSiblingLawRejected: true, explicitSiblingLawAccepted: true,
  directory: path.relative(root, directory) }));
