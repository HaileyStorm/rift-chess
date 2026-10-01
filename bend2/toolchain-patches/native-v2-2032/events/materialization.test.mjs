// Exact one-file 2.0.32 NativeV2 patch postimage; never edits the app source.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = fs.realpathSync(path.resolve(here, '../../../..'));
const relativeRoot = '.artifacts/bend2/native-v2-2032-events';
const outputRoot = path.join(root, relativeRoot);
const source = path.join(root, 'bend2/NativeV2.bend');
const patchFile = path.join(here, '0001-native-v2-events.patch');
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const assertDirectory = directory => {
  const stat = fs.lstatSync(directory);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  assert.equal(fs.realpathSync(directory), directory);
};
assert.equal(sha(source), '29fc92d043aff032de13ceafad63ef4f101c72b08f93b7199c3ce40bd333cf6d');
assert.equal(sha(patchFile), '28ec36660b3d78c2373b5ff0591385e7a6cc39e6fd33cb9a2a1732d0a01ad2fa');
const ignored = spawnSync('git', ['-C', root, 'check-ignore', '--quiet', '--', relativeRoot],
  { stdio: 'ignore', timeout: 10_000 });
assert.equal(ignored.error, undefined, String(ignored.error));
assert.equal(ignored.status, 0, 'output root is not ignored');
for (const directory of [path.join(root, '.artifacts'), path.join(root, '.artifacts/bend2'), outputRoot]) {
  if (!fs.existsSync(directory)) fs.mkdirSync(directory);
  assertDirectory(directory);
}
const run = fs.mkdtempSync(path.join(outputRoot, 'run-'));
assertDirectory(run);
const candidate = path.join(run, 'candidate');
const bend2 = path.join(candidate, 'bend2');
fs.mkdirSync(candidate);
fs.mkdirSync(bend2);
assertDirectory(candidate);
assertDirectory(bend2);
const target = path.join(bend2, 'NativeV2.bend');
let complete = false;
try {
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  assert.equal(sha(target), sha(source));
  const directory = path.relative(root, candidate).split(path.sep).join('/');
  assert.ok(directory.startsWith(`${relativeRoot}/run-`) && !directory.includes('..'));
  for (const check of [true, false]) {
    const args = ['apply', '--unidiff-zero', `--directory=${directory}`,
      ...(check ? ['--check'] : []), patchFile];
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'] });
    assert.equal(result.error, undefined, String(result.error));
    assert.equal(result.status, 0, `patch failed: ${String(result.stderr ?? '').slice(-500)}`);
  }
  const postSha256 = sha(target);
  assert.equal(postSha256, '9fe46e219123e3f59958de98c6f9b65fc618cca85ca0325740dffc30e8aef292',
    'event patch postimage differs from reviewed candidate');
  assert.deepEqual(fs.readdirSync(bend2), ['NativeV2.bend']);
  fs.unlinkSync(target);
  fs.rmdirSync(bend2);
  fs.rmdirSync(candidate);
  fs.rmdirSync(run);
  complete = true;
  console.log(JSON.stringify({ schema: 'rift-native-v2-2032-event-materialization/1',
    passed: true, preSha256: sha(source), patchSha256: sha(patchFile), postSha256,
    scope: 'exact one-file patch postimage only; no Bend source check or native run' }));
} finally {
  if (!complete) console.error(`Patch materialization failure retained exact ignored run: ${run}`);
}
