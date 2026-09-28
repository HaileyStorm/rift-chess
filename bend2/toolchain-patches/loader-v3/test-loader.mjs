// Small pinned-2.0.27 parity only; it does not amend frozen v2 inputs.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const old = path.join(root, 'bend2/tools/loader.ts');
const current = path.join(root, 'bend2/toolchain-patches/loader-v3/loader.ts');
const fixture = path.join(root, 'bend2/core/v3/fixtures/indented.bend');
const helper = path.join(root, 'bend2/core/v3/fixtures/indented-helper.bend');
const pin = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json')));
const compiler = path.join(root, '.artifacts/toolchains/bend');
const bun = path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(pin.bendCommit, 'd37909174ebd664338ae3194799a9e0899dedd51');
assert.equal(sha(fs.readFileSync(old)),
  '478081ea8be6e4c55948ddec523cc17cd39a006a47926bab5653d6cabd88fe93');
assert.equal(sha(fs.readFileSync(fixture)),
  '28cd1194ad39241e0eac857178336de1e54a188a09c98ed3a84424a0dfb0bd8e');
assert.equal(sha(fs.readFileSync(helper)),
  '187e3972e579403f6cfa1d0f244ea133983aa51a98d2bc7c142f0c3cf368d8e6');
const command = (exe, args) => spawnSync(exe, args, {
  cwd: root, env: { ...process.env, BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9' },
  encoding: 'utf8', timeout: 30000, maxBuffer: 200000,
});
const head = command('git', ['-C', compiler, 'rev-parse', 'HEAD']);
assert.equal(head.status, 0, head.stderr);
assert.equal(head.stdout.trim(), pin.bendCommit);
const dirty = command('git', ['-C', compiler, 'status', '--porcelain', '--untracked-files=no']);
assert.equal(dirty.status, 0, dirty.stderr);
assert.equal(dirty.stdout.trim(), '');
const version = command(bun, ['--version']);
assert.equal(version.status, 0, version.stderr);
assert.equal(version.stdout.trim(), pin.bunVersion);

const directory = fs.mkdtempSync(path.join(root, '.artifacts/bend2/loader-v3-'));
const baselineFile = path.join(directory, 'v2.mjs');
const candidateFile = path.join(directory, 'v3.mjs');
const baseline = command(bun, [old, fixture, baselineFile]);
assert.equal(baseline.status, 0, baseline.stderr);
const candidate = command(bun, [current, fixture, candidateFile]);
assert.equal(candidate.status, 0, candidate.stderr);
assert.deepEqual(fs.readFileSync(candidateFile), fs.readFileSync(baselineFile),
  'Draft loader changed selected JS bytes');

// A PROOF that ignores its sibling LAWS is rejected by both loaders.
const proof = path.join(directory, 'PROOF.bend');
fs.writeFileSync(path.join(directory, 'LAWS.bend'), 'import Base\n');
fs.writeFileSync(proof, 'import Base\n\ndef sample() -> U32:\n  1\n');
for (const tool of [old, current]) {
  const result = command(bun, [tool, proof, path.join(directory, path.basename(tool) + '.mjs')]);
  assert.notEqual(result.status, 0, 'Unimported sibling Law accepted');
  assert.match(result.stderr, /PROOF\.bend must import \.\/LAWS\.bend/);
}
assert.equal(sha(fs.readFileSync(old)),
  '478081ea8be6e4c55948ddec523cc17cd39a006a47926bab5653d6cabd88fe93');
assert.equal(sha(fs.readFileSync(fixture)),
  '28cd1194ad39241e0eac857178336de1e54a188a09c98ed3a84424a0dfb0bd8e');
assert.equal(sha(fs.readFileSync(helper)),
  '187e3972e579403f6cfa1d0f244ea133983aa51a98d2bc7c142f0c3cf368d8e6');
const bytes = fs.readFileSync(candidateFile);
assert.equal(bytes.length, 2819);
assert.equal(sha(bytes), '513b6f64176e983a3ec1c579a2aad5dd0c6f7449deeb5a4f1ce455af7e0077ef');
console.log(JSON.stringify({ draftOnly: true, directory: path.relative(root, directory),
  oldSha256: sha(fs.readFileSync(old)), newSha256: sha(fs.readFileSync(current)),
  compiler: pin.bendCommit, jsBytes: bytes.length, jsSha256: sha(bytes),
  exactJs: true, missingSiblingLawRejected: true }));
