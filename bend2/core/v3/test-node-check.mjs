// Seven real-source smoke cases for the draft canonical-pin checker.
// The full frozen aggregate and candidate 2.0.28 pin remain separate gates.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const checker = path.join(root, 'bend2/core/v3/node-check.mjs');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fixtures = [
  ['bend2/toolchain-patches/fixtures/proof-authority-negative-2028.bend',
    '06d304ddeb723aca439615ba45d81322ce0d60142136e8c567ccf98b01f49e64', 0,
    /^All terms check\.\r?\n$/],
  ['bend2/graphics/PROOF.bend',
    '8e4d60373335777f0241a212d66ec109e65ca37d741dda1cfe21640c680cd7da', 0,
    /^All terms check\.\r?\n$/],
  ['bend2/core/v3/fixtures/indented.bend',
    '28cd1194ad39241e0eac857178336de1e54a188a09c98ed3a84424a0dfb0bd8e', 0,
    /^All terms check\.\r?\n$/],
  ['bend2/core/v3/fixtures/todo.bend',
    'b4d27ca79c6cff228b03939621b815835ff97c65db6f2d2f4f44937527dd7bec', 1,
    /^Error: 1 TODO\/open proof holes\r?\n/],
  ['bend2/core/v3/fixtures/unsafe.bend',
    '6d8ae465df4719c59ceb5d52cdac450191e55d460556fe9d3152d76edf781840', 1,
    /^Error: Proof depends on unsafe code: leaf, caller\r?\n/],
  ['bend2/core/v3/fixtures/foreign.bend',
    '2d33ba35d9a7d405d31d2bb7dba48c7749bdafc4276a2e761af276796d246d74', 1,
    /^Error: Proof depends on foreign code: leaf, caller\r?\n/],
];
const foreignJs = path.join(root, 'bend2/core/v3/fixtures/foreign.js');
const foreignJsSha = 'b1b2dadf9536efc0f5e0fbbd91169a1284142a71cd1ecb98a9970c153bc43ee8';
assert.equal(sha(fs.readFileSync(foreignJs)), foreignJsSha);
const indentedHelper = path.join(root, 'bend2/core/v3/fixtures/indented-helper.bend');
const indentedHelperSha = '187e3972e579403f6cfa1d0f244ea133983aa51a98d2bc7c142f0c3cf368d8e6';
assert.equal(sha(fs.readFileSync(indentedHelper)), indentedHelperSha);
const results = [];
for (const [name, expected, exit, output] of fixtures) {
  const file = path.join(root, name);
  assert.equal(sha(fs.readFileSync(file)), expected, `Fixture drifted: ${name}`);
  const result = spawnSync(process.execPath, [checker, file], {
    cwd: root, encoding: 'utf8', timeout: 10000, maxBuffer: 400000,
    env: { ...process.env, BEND_NO_TELEMETRY: '1' },
  });
  assert.equal(result.error, undefined, `Checker process failed: ${name}`);
  assert.equal(result.status, exit, `Wrong checker exit: ${name}`);
  assert.match(exit === 0 ? result.stdout : result.stderr, output,
    `Wrong checker verdict: ${name}`);
  if (exit === 0) assert.equal(result.stderr, '');
  else assert.equal(result.stdout, '');
  assert.equal(sha(fs.readFileSync(file)), expected, `Fixture changed during check: ${name}`);
  results.push({ name, exit, verdict: exit === 0 ? 'clean' : 'rejected' });
}
assert.equal(sha(fs.readFileSync(foreignJs)), foreignJsSha);
assert.equal(sha(fs.readFileSync(indentedHelper)), indentedHelperSha);
const external = path.join(root, 'bend2/core/v3/fixtures/external.bend');
const externalSha = '2fa5196bb02562c6b4c975831ea8d555edbc959c1e71aeeec59861fba59f6e00';
assert.equal(sha(fs.readFileSync(external)), externalSha);
const externalResult = spawnSync(process.execPath, [checker, external], {
  cwd: root, encoding: 'utf8', timeout: 10000, maxBuffer: 400000,
  env: { ...process.env, BEND_NO_TELEMETRY: '1' },
});
assert.equal(externalResult.error, undefined);
assert.equal(externalResult.status, 1);
assert.equal(externalResult.stdout, '');
assert.match(externalResult.stderr, /Error: Proof import is not local: .*0xdeadbeef\/unavailable\.bend/);
assert.equal(sha(fs.readFileSync(external)), externalSha);
results.push({ name: 'bend2/core/v3/fixtures/external.bend', exit: 1,
  verdict: 'external import denied before worker' });
const aggregatePreflight = spawnSync(process.execPath,
  [checker, path.join(root, 'bend2/core/v2/CHECK.bend'), '--preflight-only'], {
    cwd: root, encoding: 'utf8', timeout: 10000, maxBuffer: 400000,
    env: { ...process.env, BEND_NO_TELEMETRY: '1' },
  });
assert.equal(aggregatePreflight.error, undefined);
assert.equal(aggregatePreflight.status, 0);
assert.equal(aggregatePreflight.stderr, '');
const closure = JSON.parse(aggregatePreflight.stdout);
assert.equal(closure.aggregate, true);
assert.equal(closure.sources, 56);
assert.equal(closure.closureSha256,
  'dd78b631130bf7a79d2818e0763437b6879114bce608611451bd0e9692d50741');
console.log(JSON.stringify({ schema: 'rift-bend-v3-draft-checker-smoke/1',
  checkerSha256: sha(fs.readFileSync(checker)), results,
  aggregatePreflight: { sources: closure.sources, closureSha256: closure.closureSha256 },
  passed: true }));
