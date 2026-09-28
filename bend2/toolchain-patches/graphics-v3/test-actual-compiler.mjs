// Draft v3 adapter parity against the byte-frozen historical v2 tool.
// Small local fixture only; does not promote a graphics v3 library release.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const old = path.join(root, 'bend2/lib/graphics/v2/tools/actual_compiler.mjs');
const current = path.join(root, 'bend2/toolchain-patches/graphics-v3/actual_compiler.mjs');
const fixture = path.join(root, 'bend2/core/v3/fixtures/indented.bend');
const helper = path.join(root, 'bend2/core/v3/fixtures/indented-helper.bend');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(fs.readFileSync(old)),
  'ec53f6bada060e7140b840b9f0dec8e20bbfb5216504c47d0429ff9de5314f04',
  'Historical v2 graphics tool changed');
assert.equal(sha(fs.readFileSync(fixture)),
  '28cd1194ad39241e0eac857178336de1e54a188a09c98ed3a84424a0dfb0bd8e');
assert.equal(sha(fs.readFileSync(helper)),
  '187e3972e579403f6cfa1d0f244ea133983aa51a98d2bc7c142f0c3cf368d8e6');
const directory = fs.mkdtempSync(path.join(root, '.artifacts/bend2/graphics-v3-compiler-'));
const run = (tool, mode, output = null) => {
  const result = spawnSync(process.execPath, [tool, mode, fixture, ...(output ? [output] : [])], {
    cwd: root, env: { ...process.env, BEND_NO_TELEMETRY: '1' },
    encoding: 'utf8', timeout: 30000, maxBuffer: 400000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
};
const before = run(old, 'check'), after = run(current, 'check');
assert.equal(before.ok, true);
assert.equal(after.ok, true);
assert.equal(after.guard, 'empty selected js_lib');
assert.equal(after.deniedFetches, 0);
assert.deepEqual(after.promises, before.promises);
assert.deepEqual(after.closure, before.closure);
assert.equal(after.compiler, before.compiler);
const oldC = path.join(directory, 'v2.c'), newC = path.join(directory, 'v3.c');
run(old, 'c', oldC);
run(current, 'c', newC);
const baseline = fs.readFileSync(oldC), candidate = fs.readFileSync(newC);
assert.deepEqual(candidate, baseline, 'Draft adapter changed emitted C bytes');
const oldJs = path.join(directory, 'v2.mjs'), newJs = path.join(directory, 'v3.mjs');
run(old, 'js', oldJs);
run(current, 'js', newJs);
const baselineJs = fs.readFileSync(oldJs), candidateJs = fs.readFileSync(newJs);
assert.deepEqual(candidateJs, baselineJs, 'Draft adapter changed selected JS bytes');
assert.equal(sha(fs.readFileSync(fixture)),
  '28cd1194ad39241e0eac857178336de1e54a188a09c98ed3a84424a0dfb0bd8e');
assert.equal(sha(fs.readFileSync(helper)),
  '187e3972e579403f6cfa1d0f244ea133983aa51a98d2bc7c142f0c3cf368d8e6');
console.log(JSON.stringify({ draftOnly: true, directory: path.relative(root, directory),
  historicalToolSha256: sha(fs.readFileSync(old)),
  newToolSha256: sha(fs.readFileSync(current)), compiler: before.compiler,
  closure: after.closure.length, promises: after.promises,
  cBytes: candidate.length, cSha256: sha(candidate), exactC: true,
  jsBytes: candidateJs.length, jsSha256: sha(candidateJs), exactJs: true }));
