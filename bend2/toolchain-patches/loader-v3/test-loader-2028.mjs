// Candidate-only loader seam: exact reviewed replay source, never the pin.
// This small fixture cannot substitute for the frozen aggregate proof.
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
const candidate = path.join(snapshot, 'bend2');
const source = path.join(root, 'bend2/toolchain-patches/loader-v3/loader.ts');
const preflight = path.join(root, 'bend2/toolchain-patches/verify-v2-candidate-2028.mjs');
const fixture = path.join(root, 'bend2/core/v3/fixtures/indented.bend');
const helper = path.join(root, 'bend2/core/v3/fixtures/indented-helper.bend');
const bun = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const receiptSha = 'a71ce32941c74abef1762bebb30d8526f115fc905bbb084722b3d6a4b2d7af01';
const loaderSha = '9d5077d46b34b8c49f7d58b0a87f3cbd94e08afc623fe8abab5ce76b337a03fe';
const preflightSha = '921eb57b3799b2a0c4a1bb01456619ae961205a8b5f30352ad99d805e9a12af4';
const fixtureSha = '28cd1194ad39241e0eac857178336de1e54a188a09c98ed3a84424a0dfb0bd8e';
const helperSha = '187e3972e579403f6cfa1d0f244ea133983aa51a98d2bc7c142f0c3cf368d8e6';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(process.platform, 'win32', 'This diagnostic binds the Windows Bun 1.4.2 runtime');
assert.equal(sha(fs.readFileSync(source)), loaderSha);
assert.equal(sha(fs.readFileSync(preflight)), preflightSha);
assert.equal(sha(fs.readFileSync(fixture)), fixtureSha);
assert.equal(sha(fs.readFileSync(helper)), helperSha);

const run = (exe, args, timeout = 30000) => spawnSync(exe, args, {
  cwd: root, env: { ...process.env, BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9' },
  encoding: 'utf8', timeout, maxBuffer: 200000,
});
const argumentsForPreflight = [
  '--max-old-space-size=768', preflight, '--replay-receipt', replay, receiptSha,
  '--compiler-snapshot', snapshot, '--preflight-only',
];
function checkPreflight() {
  const result = run(process.execPath, argumentsForPreflight);
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  const checked = JSON.parse(result.stdout.trim());
  assert.equal(checked.ok, true);
  assert.equal(checked.finalStackReplay, true);
  assert.equal(checked.replayReceiptSha256, receiptSha);
  assert.deepEqual(checked.compilerSnapshot, {
    files: 95, sha256: '2ac802f1c362e80ba1198cb9a98dc867e28a4750f2e284edfa5af99c15e92c46',
  });
  return checked;
}
const binding = checkPreflight();
const version = run(bun, ['--version']);
assert.equal(version.status, 0, version.stderr);
assert.equal(version.stdout.trim(), '1.4.2');

const directory = fs.mkdtempSync(path.join(root, '.artifacts/bend2/loader-v3-2028-'));
const loader = path.join(directory, 'loader-2028.ts');
const relative = file => {
  const value = path.relative(directory, file).replaceAll('\\', '/');
  return value.startsWith('.') ? value : `./${value}`;
};
let text = fs.readFileSync(source, 'utf8');
function replaceExactly(old, replacement) {
  assert.equal(text.split(old).length, 2, `Expected one compiler path: ${old}`);
  text = text.replace(old, replacement);
}
replaceExactly('../../../.artifacts/toolchains/bend/bend2/bend.ts', relative(path.join(candidate, 'bend.ts')));
replaceExactly('../../../.artifacts/toolchains/bend/bend2/comp.ts', relative(path.join(candidate, 'comp.ts')));
replaceExactly('../../../.artifacts/toolchains/bend/bend2/effs', relative(path.join(candidate, 'effs')));
fs.writeFileSync(loader, text, { flag: 'wx' });
const output = path.join(directory, 'fixture.mjs');
const positive = run(bun, [loader, fixture, output]);
assert.equal(positive.status, 0, positive.stderr || positive.error?.message);
const bytes = fs.readFileSync(output);
// The reviewed candidate adds an unused effect registry and escapes the
// imported hyphen in a local symbol. Pin its distinct bytes, then exercise
// the selected exports instead of mistaking cross-version byte drift for a
// semantic regression.
assert.equal(bytes.length, 3100, 'Candidate selected JS size changed');
assert.equal(sha(bytes), '8d427b379dae84f2bb53c373d969a90e44846912989c014af3f2062505636afb',
  'Candidate selected JS bytes changed');
const selected = (await import(pathToFileURL(output).href)).default;
assert.deepEqual(Object.keys(selected).sort(), ['indented-helper.leaf', 'main']);
assert.equal(selected.main(), 1);
assert.equal(selected['indented-helper.leaf'](), 1);

const proof = path.join(directory, 'PROOF.bend');
fs.writeFileSync(path.join(directory, 'LAWS.bend'), 'import Base\n', { flag: 'wx' });
fs.writeFileSync(proof, 'import Base\n\ndef sample() -> U32:\n  1\n', { flag: 'wx' });
const missingSibling = run(bun, [loader, proof, path.join(directory, 'bad.mjs')]);
assert.notEqual(missingSibling.status, 0, 'Unimported sibling Law accepted');
assert.match(missingSibling.stderr, /PROOF\.bend must import \.\/LAWS\.bend/);
fs.writeFileSync(proof, 'import Base\nimport ./LAWS.bend as Laws\n\ndef sample() -> U32:\n  1\n');
const lawfulOutput = path.join(directory, 'lawful.mjs');
const lawful = run(bun, [loader, proof, lawfulOutput]);
assert.equal(lawful.status, 0, lawful.stderr || lawful.error?.message);
const lawfulExports = (await import(pathToFileURL(lawfulOutput).href)).default;
assert.ok(Object.hasOwn(lawfulExports, 'sample'));
assert.equal(lawfulExports.sample(), 1);
const after = checkPreflight();
assert.deepEqual(after.compilerSnapshot, binding.compilerSnapshot);
assert.equal(sha(fs.readFileSync(source)), loaderSha);
assert.equal(sha(fs.readFileSync(preflight)), preflightSha);
assert.equal(sha(fs.readFileSync(fixture)), fixtureSha);
assert.equal(sha(fs.readFileSync(helper)), helperSha);
console.log(JSON.stringify({ ok: true, candidateOnly: true,
  replayReceiptSha256: receiptSha, compilerSnapshot: after.compilerSnapshot,
  stagedLoaderSha256: loaderSha, generatedLoaderSha256: sha(fs.readFileSync(loader)),
  selectedJsSha256: sha(bytes), missingSiblingLawRejected: true,
  explicitSiblingLawAccepted: true,
  directory: path.relative(root, directory) }));
