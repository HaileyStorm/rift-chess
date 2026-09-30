// Source-bound bundle candidate for the four explicitly selected 2.0.32 JS
// caches. Builds two browser Workers only; it does not serve or run the game.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, moduleSpecs } from '../../../tools/selected-modules.mjs';
import { verifyCacheSet2032 } from '../cache-set/verify.mjs';
import { finalizeOwnedManifest } from '../preview/lifecycle.mjs';
import { createSelectedLoader2032 } from './loader.mjs';
import { linuxSelectedReceipt } from './linux-receipt.mjs';
import { assertLocalBunRuntime } from './runtime.mjs';

process.env.BEND_NO_TELEMETRY = '1';
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw Error('unexpected network access'); };
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const names = Object.keys(moduleSpecs).sort();
const args = process.argv.slice(2);
assert.equal(args.length, names.length * 2,
  'pass exactly --menu/--controller/--scene/--chrome <manifest path>');
const manifestPaths = {};
for (let index = 0; index < args.length; index += 2) {
  const name = args[index].startsWith('--') ? args[index].slice(2) : '';
  assert.ok(names.includes(name) && !Object.hasOwn(manifestPaths, name),
    `unknown or duplicate selected module: ${args[index]}`);
  manifestPaths[name] = path.resolve(args[index + 1]);
}
assert.deepEqual(Object.keys(manifestPaths).sort(), names);
assert.equal(typeof Bun?.build, 'function', 'run with the repository-local Bun runtime');
const runtimeRoot = path.join(root, '.artifacts/toolchains/runtime');
const bunExe = assertLocalBunRuntime(root, runtimeRoot, process.execPath);
const toolchain = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));
assert.equal(Bun.version, toolchain.bunVersion, 'Bun version differs from the pinned runtime');
const bunRuntime = { version: Bun.version,
  executable: path.relative(root, bunExe).replaceAll('\\', '/'),
  sha256: sha(fs.readFileSync(bunExe)) };
const previewRoot = path.join(root, '.artifacts/bend2/2032-preview');
const verify = () => {
  const set = verifyCacheSet2032({ previewRoot, manifestPaths });
  assert.equal(set.commonBinding.derivedEol, 'lf', 'reported Linux cache set must use LF compiler');
  for (const name of names) {
    const expected = linuxSelectedReceipt[name];
    assert.equal(path.relative(root, manifestPaths[name]).replaceAll('\\', '/'),
      expected.manifest, `wrong Linux receipt path: ${name}`);
    assert.equal(sha(set.modules[name].manifestBytes), expected.manifestSha256,
      `raw Linux manifest bytes differ: ${name}`);
    assert.equal(set.modules[name].bytes.length, expected.bytes,
      `Linux output byte count differs: ${name}`);
    assert.equal(sha(set.modules[name].bytes), expected.outputSha256,
      `Linux output bytes differ: ${name}`);
  }
  return set;
};
const before = verify();
const snapshot = (set) => Object.fromEntries(names.map((name) => [name, {
  manifest: sha(set.modules[name].manifestBytes),
  output: sha(set.modules[name].bytes),
}]));
const initial = snapshot(before);
const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'],
  { cwd: root, encoding: 'utf8' }).trim();
const sourceTree = execFileSync('git', ['show', '-s', '--format=%T', 'HEAD'],
  { cwd: root, encoding: 'utf8' }).trim();
assert.equal(execFileSync('git', ['status', '--porcelain', '--untracked-files=all'],
  { cwd: root, encoding: 'utf8' }).trim(), '', 'bundle source checkout must be clean');
const plugin = createSelectedLoader2032(before);
const source = before.modules.scene.manifest.output.sha256;
const common = { target: 'browser', format: 'esm', splitting: false, minify: true,
  plugins: [plugin] };
async function buildOne(entrypoint, define) {
  const result = await Bun.build({ ...common, entrypoints: [entrypoint], define });
  assert.equal(result.success, true, result.logs.map(String).join('\n'));
  assert.equal(result.outputs.length, 1, 'unexpected browser bundle outputs');
  assert.ok(result.outputs[0].path.endsWith('.js'), 'expected one JavaScript output');
  return Buffer.from(await result.outputs[0].arrayBuffer());
}
const helper = await buildOne(path.join(root, 'bend2/platform/browser/sprite-helper.ts'), {
  __BEND_SPRITE_SOURCE__: JSON.stringify(source),
  __BEND_PREPARED_GROUND_PATH__: JSON.stringify(''),
  __BEND_PREPARED_GROUND_SHA__: JSON.stringify(''),
  __BEND_PREPARED_PLATE_SHA__: JSON.stringify(''),
  __BEND_PREPARED_FRAME_JSON__: JSON.stringify(''),
});
const helperFile = `sprite-helper-${sha(helper).slice(0, 12)}.js`;
const worker = await buildOne(path.join(root, 'bend2/platform/browser/worker-v2.ts'), {
  __BEND_SPRITE_HELPER__: JSON.stringify(`./${helperFile}`),
  __BEND_SPRITE_SOURCE__: JSON.stringify(source),
});
assert.deepEqual(snapshot(verify()), initial, 'selected caches changed during bundle');
assert.equal(execFileSync('git', ['rev-parse', 'HEAD'],
  { cwd: root, encoding: 'utf8' }).trim(), sourceRevision);
assert.equal(networkCalls, 0);
const artifactParent = path.join(root, '.artifacts/bend2');
assert.equal(fs.realpathSync(artifactParent), artifactParent,
  'bundle artifact parent must not be a reparse path');
const outputRoot = path.join(artifactParent, '2032-browser-probe');
execFileSync('git', ['check-ignore', '--quiet', path.relative(root, outputRoot)], { cwd: root });
fs.mkdirSync(outputRoot, { recursive: true });
const outputRootStat = fs.lstatSync(outputRoot);
assert.ok(outputRootStat.isDirectory() && !outputRootStat.isSymbolicLink());
const runDir = path.join(outputRoot, `worker-${Date.now()}-${process.pid}-${randomUUID()}`);
fs.mkdirSync(runDir);
const workerFile = `worker-${sha(worker).slice(0, 12)}.js`;
for (const [name, bytes] of [[helperFile, helper], [workerFile, worker]]) {
  const file = path.join(runDir, name);
  fs.writeFileSync(file, bytes, { flag: 'wx' });
  const fd = fs.openSync(file, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  assert.equal(sha(fs.readFileSync(file)), sha(bytes));
}
const manifest = {
  schema: 'rift-bend-2032-worker-bundle-probe/1',
  sourceRevision, sourceTree,
  cacheSourceCommit: before.modules.menu.manifest.binding.sourceCommit,
  compilerEol: before.modules.menu.manifest.binding.derivedEol,
  bunRuntime,
  cacheManifests: Object.fromEntries(names.map((name) => [name, {
    path: path.relative(root, manifestPaths[name]).replaceAll('\\', '/'),
    sha256: initial[name].manifest,
    outputSha256: initial[name].output,
  }])),
  outputs: [{ file: helperFile, bytes: helper.length, sha256: sha(helper) },
    { file: workerFile, bytes: worker.length, sha256: sha(worker) }],
  sourceFiles: [
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'loader.mjs'),
    fileURLToPath(import.meta.url),
    path.join(root, 'bend2/toolchain-patches/2032/cache-set/verify.mjs'),
    path.join(root, 'bend2/toolchain-patches/2032/preview/lifecycle.mjs'),
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'linux-receipt.mjs'),
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'runtime.mjs'),
    path.join(root, 'bend2/platform/browser/worker-v2.ts'),
    path.join(root, 'bend2/platform/browser/sprite-helper.ts'),
  ].map((file) => ({
    file: path.relative(root, file).replaceAll('\\', '/'),
    sha256: sha(fs.readFileSync(file)),
  })),
  networkCalls,
  scope: 'mixed-revision selected-cache Worker bundles when sourceRevision differs from cacheSourceCommit; not a served, rendered, interactive, GPU/native, published or pin-adopted app',
};
assert.deepEqual(snapshot(verify()), initial, 'selected caches changed before manifest');
assert.equal(execFileSync('git', ['status', '--porcelain', '--untracked-files=all'],
  { cwd: root, encoding: 'utf8' }).trim(), '', 'bundle source changed during build');
const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
const manifestFile = path.join(runDir, 'worker.manifest.json');
finalizeOwnedManifest(path.join(runDir, 'worker.manifest.pending'),
  manifestFile, manifestBytes, {
    verifyTemp: (bytes) => assert.deepEqual(JSON.parse(bytes.toString('utf8')), manifest),
    beforeCommit: () => {
      assert.deepEqual(snapshot(verify()), initial, 'selected caches changed before final commit');
      assert.equal(execFileSync('git', ['status', '--porcelain', '--untracked-files=all'],
        { cwd: root, encoding: 'utf8' }).trim(), '', 'bundle source changed before final commit');
      assert.equal(execFileSync('git', ['show', '-s', '--format=%T', 'HEAD'],
        { cwd: root, encoding: 'utf8' }).trim(), sourceTree,
      'bundle source tree changed before final commit');
      for (const output of manifest.outputs)
        assert.equal(sha(fs.readFileSync(path.join(runDir, output.file))), output.sha256);
    },
  });
console.log(JSON.stringify({ ok: true, runDir: path.relative(root, runDir).replaceAll('\\', '/'),
  manifestSha256: sha(fs.readFileSync(manifestFile)),
  outputs: manifest.outputs, cacheSourceCommit: manifest.cacheSourceCommit, networkCalls,
  bunRuntime,
  scope: manifest.scope }));
