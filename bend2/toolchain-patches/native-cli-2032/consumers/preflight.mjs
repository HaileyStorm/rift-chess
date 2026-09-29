import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.BEND_NO_TELEMETRY = '1';
let networkCalls = 0;
globalThis.fetch = async () => {
  networkCalls++;
  throw new Error('unexpected network access');
};

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const scout = path.join(root, '.artifacts/toolchains/bend-2.0.32-scout');
const canonical = path.join(root, '.artifacts/toolchains/bend');
const adapterPath = path.join(root, 'bend2/toolchain-patches/native-cli-2032/Args2032.bend');
const helperPath = path.join(here, 'Consumers2032.bend');
const patchPath = path.join(here, '0001-consumer-args-2032.patch');
const sourceHashes = {
  'bend2/lib/graphics/v2/bench/gpu/PlanProfile.bend': '0722750083090909edab68825cd670dc922cd96f22fc3f3e90df7fa62b453f92',
  'bend2/lib/graphics/v2/bench/gpu/PlanReadback.bend': '2ce8eb321737935f531925ecd58b7cf12ffe585d85cc1a1f65e3240b81d47384',
  'bend2/tests/piece-sprites/PieceRenderBench.bend': '1f3431e993615f8b338a012feac9b524a652d2388c7e5d1adbc0c3a71b3d453c',
  'bend2/tests/piece-sprites/DecodePageTest.bend': '0ee5083f15b0c658dd7ad8591f6c24c52dd5ed302a4267d6bf807fdf0998da9c',
  'bend2/tests/piece-sprites/BoardSceneSpriteBench.bend': 'c430c30851ee4817bd5513b07c54dbc82ff69eced238fc848bfa8c2266d9de5a',
};
const expectedAdapter = '9ad65f50b9ccf35f59921ad785ba55487e95face685337bea0f9959b754b4fa6';
const expectedHelper = '19a535fdd0756ef4627b2bf93d36a4d5d52be89ead194f31fd8dcd5c8109380b';
const expectedPatch = '4ddf245874bddd2c2dcbb799889b4a280dd1de12fdd62057c8f33d6fc02c95a5';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).replace(/\r\n/g, '\n').trimEnd();

assert.equal(git(scout, 'rev-parse', 'HEAD'), '573002f01ec6c52416d44489543f69a9625facf8');
assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(git(canonical, 'rev-parse', 'HEAD'), 'd37909174ebd664338ae3194799a9e0899dedd51');
assert.equal(git(canonical, 'status', '--porcelain', '--untracked-files=all'), '');

for (const [relative, expected] of Object.entries(sourceHashes)) {
  const file = path.join(root, relative);
  assert.equal(sha256(fs.readFileSync(file)), expected, `consumer source changed: ${relative}`);
  assert.ok(fs.readFileSync(file, 'utf8').includes('IO.args(), with_args'),
    `expected original IO.args handoff missing: ${relative}`);
}
assert.equal(sha256(fs.readFileSync(adapterPath)), expectedAdapter, 'reviewed Args2032 adapter changed');
assert.equal(sha256(fs.readFileSync(helperPath)), expectedHelper, 'consumer helper changed');
const patchBytes = fs.readFileSync(patchPath);
assert.equal(sha256(patchBytes), expectedPatch, 'consumer migration patch changed');
const patchText = patchBytes.toString('utf8');
const targetPaths = [...patchText.matchAll(/^diff --git a\/([^\s]+) b\/([^\s]+)$/gm)]
  .map((match) => { assert.equal(match[1], match[2]); return match[1]; });
assert.deepEqual(targetPaths.sort(), Object.keys(sourceHashes).sort(),
  'patch must touch exactly the five inventoried consumers');
execFileSync('git', ['apply', '--unidiff-zero', '--check', patchPath], { cwd: root, stdio: 'pipe' });
const patchStats = git(root, 'apply', '--numstat', patchPath).split('\n').sort();
assert.deepEqual(patchStats,
  Object.keys(sourceHashes).map((file) => `3\t1\t${file}`).sort(),
  'patch must add only the shared import and args wrapper at each main boundary');

for (const relative of Object.keys(sourceHashes)) {
  const sourcePath = path.join(root, relative);
  const expectedHelperPath = path.resolve(path.dirname(sourcePath),
    relative.startsWith('bend2/lib/')
      ? '../../../../../toolchain-patches/native-cli-2032/consumers/Consumers2032.bend'
      : '../../toolchain-patches/native-cli-2032/consumers/Consumers2032.bend');
  assert.equal(expectedHelperPath, helperPath, `wrong helper path for ${relative}`);
}
assert.equal(path.resolve(path.dirname(helperPath), '../Args2032.bend'), adapterPath);
assert.match(patchText, /CliArgs\.users\(raw\), with_args\)/);
assert.match(fs.readFileSync(helperPath, 'utf8'), /Args\.strip_program\(raw\)/);
assert.match(fs.readFileSync(helperPath, 'utf8'), /Args\.WithProgram\{args\}: IO\.pure\(List<String>, args\)/);
assert.match(fs.readFileSync(helperPath, 'utf8'), /Args\.MissingProgram\{\}/);
assert.match(fs.readFileSync(helperPath, 'utf8'), /Args\.EmptyProgram\{\}/);

function stripProgramModel(raw) {
  if (raw.length === 0) return { tag: 'MissingProgram' };
  const [program, ...args] = raw;
  if (program.length === 0) return { tag: 'EmptyProgram' };
  return { tag: 'WithProgram', args };
}
assert.deepEqual(stripProgramModel([]), { tag: 'MissingProgram' });
assert.deepEqual(stripProgramModel(['']), { tag: 'EmptyProgram' });
assert.deepEqual(stripProgramModel(['program']), { tag: 'WithProgram', args: [] });
assert.deepEqual(stripProgramModel(['program', '--help', 'other-program', 'route']),
  { tag: 'WithProgram', args: ['--help', 'other-program', 'route'] });
assert.equal(networkCalls, 0);
console.log(JSON.stringify({
  schema: 'rift-native-cli-consumers-2032-preflight/1',
  ok: true,
  upstream: '573002f01ec6c52416d44489543f69a9625facf8',
  canonicalPin: 'd37909174ebd664338ae3194799a9e0899dedd51',
  sourceHashes,
  adapterSha256: expectedAdapter,
  helperSha256: expectedHelper,
  patchSha256: expectedPatch,
  patchTargets: targetPaths.sort(),
  networkCalls,
  scope: 'hash-bound source patch and pure argv contract check only; no Bend typecheck, compiler, native, or GPU run',
}));
