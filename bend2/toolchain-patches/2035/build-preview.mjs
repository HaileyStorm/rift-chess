// Isolated current-source candidate preview. This does not adopt the compiler
// or substitute the accepted bot Worker/proof/native package.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root, previewRoot, candidateCommit, readSource, sha256, selectedBinding2035 } from './selected-binding.mjs';
import { createBrowserTagBoundary2035, browserTagBoundaryBinding2035 } from './browser-tag-boundary.mjs';
import { packageAssets, writeNewFile } from '../2032/browser-preview/pack-static.mjs';
import { assertLocalBunRuntime } from '../2032/browser-loader/runtime.mjs';

const selected = {
  scene: ['scene-kwR2KB', '2ca50d6b2a57643e6c209bb3e5ce19372d65e405d3660f6f2394b88137e9172e'],
  controller: ['controller-jhr9Ml', 'b878f33af950904b2869889225eaaeee5507958fd152c6c223365d06189551cc'],
  menu: ['menu-yN96SS', 'b390548eb759944aea5cbee08256f85a3cba26986eb86e93a97749b8f47c67ec'],
  chrome: ['chrome-knTtdv', 'e4ea2af8e09125df337715d1a3e3c2948ba593a91e275f2b98ec035e675d68c8'],
};
const relative = file => path.relative(root, file).split(path.sep).join('/');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();

function caches(runtime) {
  return Object.fromEntries(Object.entries(selected).map(([name, [directory, expected]]) => {
    const manifestPath = path.join(previewRoot, directory, name + '.manifest.json');
    const raw = readSource(manifestPath);
    assert.equal(sha256(raw), expected, `${name} manifest changed`);
    const manifest = JSON.parse(raw);
    assert.equal(manifest.schema, 'rift-bend-selected-cache/2035-1');
    assert.deepEqual(manifest.binding, { ...selectedBinding2035(name), runtime });
    assert.equal(sha256(JSON.stringify(manifest.binding)), manifest.bindingSha256);
    assert.equal(manifest.networkCalls, 0);
    assert.equal(manifest.output.file, name + '.js');
    const bytes = readSource(path.join(path.dirname(manifestPath), manifest.output.file));
    assert.equal(bytes.length, manifest.output.bytes);
    assert.equal(sha256(bytes), manifest.output.sha256);
    return [name, { bytes, manifest, manifestPath: relative(manifestPath), manifestSha256: expected }];
  }));
}

export async function buildPreview2035() {
  assert.equal(typeof Bun?.build, 'function', 'use the repository-local Bend wrapper');
  const executable = assertLocalBunRuntime(root, path.join(root, '.artifacts/toolchains/runtime'), process.execPath);
  const runtime = { version: Bun.version, executable: relative(executable), sha256: sha256(readSource(executable)) };
  assert.equal(runtime.version, '1.4.2');
  assert.equal(git('-C', '.artifacts/toolchains/bend-2.0.35-scout', 'rev-parse', 'HEAD'), candidateCommit);
  assert.equal(git('-C', '.artifacts/toolchains/bend-2.0.35-scout', 'status', '--porcelain', '--untracked-files=no'), '');
  const before = caches(runtime);
  const boundary = createBrowserTagBoundary2035();
  const extraSources = ['bend2/toolchain-patches/2035/build-preview.mjs',
    'bend2/toolchain-patches/2032/browser-preview/pack-static.mjs',
    'bend2/platform/browser/platform.css', 'bend2/platform/browser/index.html',
    'bend2/platform/browser/sw.js', 'bend2/platform/browser/bitmap-surface.ts',
    'bend2/platform/browser/telemetry.ts'];
  const sourceHashes = () => extraSources.map(file => ({ path: file, sha256: sha256(readSource(path.join(root, file))) }));
  const sources = sourceHashes();
  const sourceRevision = git('rev-parse', 'HEAD');
  const sourceDirty = Boolean(git('status', '--porcelain', '--untracked-files=normal', '--', 'bend2'));
  const out = fs.mkdtempSync(path.join(previewRoot, 'browser-'));
  const plugin = { name: 'rift-bend-2035-exact-selected', setup(build) {
    build.onLoad({ filter: /\.bend$/ }, args => {
      const selectedEntry = Object.values(before).find(item => path.resolve(root, item.manifest.binding.module.entry) === path.resolve(args.path));
      assert.ok(selectedEntry, `unexpected candidate Bend import: ${args.path}`);
      return { contents: selectedEntry.bytes.toString('utf8'), loader: 'js' };
    });
  } };
  const common = { outdir: out, target: 'browser', format: 'esm', naming: '[name]-[hash].[ext]',
    minify: true, splitting: false, plugins: [plugin, boundary.plugin] };
  const bundle = async (entry, define) => {
    const result = await Bun.build({ ...common, entrypoints: [path.join(root, entry)], define });
    assert.ok(result.success, result.logs.map(String).join('\n'));
    const files = result.outputs.filter(output => output.path.endsWith('.js'));
    assert.equal(files.length, 1);
    return path.basename(files[0].path);
  };
  const spriteSource = before.scene.manifest.output.sha256;
  const helper = await bundle('bend2/platform/browser/sprite-helper.ts', { __BEND_SPRITE_SOURCE__: JSON.stringify(spriteSource) });
  const worker = await bundle('bend2/platform/browser/worker-v2.ts', {
    __BEND_SPRITE_SOURCE__: JSON.stringify(spriteSource), __BEND_SPRITE_HELPER__: JSON.stringify('./' + helper) });
  const host = await bundle('bend2/platform/browser/host.ts', { __BEND_WORKER__: JSON.stringify('./' + worker) });
  const files = Object.fromEntries([helper, worker, host].map(name => [name, sha256(readSource(path.join(out, name)))]));
  const write = (name, bytes) => { writeNewFile(root, out, name, Buffer.from(bytes)); files[name] = sha256(readSource(path.join(out, name))); };
  const css = readSource(path.join(root, 'bend2/platform/browser/platform.css'));
  const cssName = 'style-' + sha256(css).slice(0, 12) + '.css';
  write(cssName, css);
  write('index.html', readSource(path.join(root, 'bend2/platform/browser/index.html')).toString('utf8')
    .replace('./main.js', './' + host).replace('./style.css', './' + cssName));
  for (const [name, source] of [
    ['THIRD_PARTY_NOTICES.txt', 'bend2/THIRD_PARTY_NOTICES.txt'],
    ['Bend-Apache-2.0.txt', 'bend2/licenses/Bend-Apache-2.0.txt'],
    ['Rift-Atlas-Sans-OFL.txt', 'bend2/lib/graphics/v2/OFL.txt'],
  ]) write(name, readSource(path.join(root, source)));
  const assets = packageAssets(root, out, files);
  const version = sha256(JSON.stringify(files)).slice(0, 20);
  write('sw.js', readSource(path.join(root, 'bend2/platform/browser/sw.js')).toString('utf8')
    .replace('__BEND_BUILD__', version).replace('__BEND_ASSETS__', JSON.stringify(['./', './build.json', ...Object.keys(files).sort().map(name => './' + name)])));
  assert.deepEqual(browserTagBoundaryBinding2035(), boundary.binding, 'candidate ports changed during build');
  assert.deepEqual(sourceHashes(), sources, 'build inputs changed');
  const after = caches(runtime);
  for (const name of Object.keys(before)) assert.deepEqual(after[name], before[name]);
  assert.equal(git('rev-parse', 'HEAD'), sourceRevision);
  const manifest = { schema: 'rift-bend-browser/2035-preview-1', builtAt: new Date().toISOString(),
    version, sourceRevision, sourceDirty, draft: true, candidate: candidateCommit, adopted: false,
    toolchain: JSON.parse(readSource(path.join(root, 'bend2/TOOLCHAIN.json'))),
    runtime, selected: Object.fromEntries(Object.entries(before).map(([name, item]) => [name, {
      manifest: item.manifestPath, manifestSha256: item.manifestSha256, outputSha256: item.manifest.output.sha256,
      bindingSha256: item.manifest.bindingSha256 }])),
    browserBoundary: boundary.binding, sources, assets, files,
    workerLibraries: {}, preparedGround: null,
    scope: 'candidate hotseat/controller/menu/scene/chrome preview; bot Worker, proof/native/GPU/adoption unverified' };
  writeNewFile(root, out, 'build.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  for (const [name, hash] of Object.entries(files)) assert.equal(sha256(readSource(path.join(out, name))), hash);
  console.log(JSON.stringify({ ok: true, out: relative(out), version, buildSha256: sha256(readSource(path.join(out, 'build.json'))), scope: manifest.scope }));
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildPreview2035();
