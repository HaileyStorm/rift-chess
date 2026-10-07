// Isolated current-source candidate preview. This does not adopt the compiler
// or substitute the accepted bot Worker/proof/native package.
import assert from 'node:assert/strict';
import { menuApplicationBinding2035 } from '../../core/v3/2035/bendtt-gate/application/menu-binding.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root, previewRoot, candidateCommit, readSource, sha256, selectedBinding2035 } from './selected-binding.mjs';
import { createBrowserTagBoundary2035, browserTagBoundaryBinding2035 } from './browser-tag-boundary.mjs';
import { packageAssets, writeNewFile } from '../2032/browser-preview/pack-static.mjs';
import { assertLocalBunRuntime } from '../2032/browser-loader/runtime.mjs';
import { prepare as workerCompilerBinding2035 } from './workers/prepare.mjs';
import { emitDefaultGround2035 } from './prepared-ground.mjs';
import { verifyPrepared } from '../../core/v3/prepared-match/verify.mjs';

const selected = {
  scene: ["stationary-motion-20261006/scene-3utptJ", "6890966efa0d46fc344b3f3d9ff8c351a90b9649f1b8f3d670ac3b89808855f1"],
  controller: ["stationary-motion-20261006/canonical-ui-emission-r2", "f3292a336c26a3978f7c3764e721a3d2241cba9cb8c100a30a60f173c3917b5a"],
  menu: ["stationary-motion-20261006/menu-app-Ft8mws", "cc95018a8c8ec97509c7b6d4f8dee5985fd84f20601ba9fba7f4bad77539feba"],
};
const relative = file => path.relative(root, file).split(path.sep).join('/');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
const botDirectory = '.artifacts/bend2/toolchain-patches/workers-2035-candidate/bot-t0Qkcm';
const botBindingHash = '2fb3a8633d629b5703d694dd0bf8a071ce865d1df9957aca1de45fda43613dc2';

function botLibrary2035(runtime) {
  const bindingBytes = readSource(path.join(root, botDirectory, 'source-binding.json'));
  assert.equal(sha256(bindingBytes), botBindingHash, 'selected bot binding changed');
  const binding = JSON.parse(bindingBytes);
  assert.equal(binding.ok, true);
  assert.equal(binding.upstreamCommit, candidateCommit);
  assert.equal(binding.sourceRoot, 'bend2/platform/worker/BotAdapter.bend');
  assert.deepEqual(binding.exports, ['choose']);
  assert.equal(binding.networkCalls, 0);
  assert.deepEqual(binding.compiler, workerCompilerBinding2035().hashes);
  for (const item of binding.sources) assert.equal(sha256(readSource(path.join(root, item.path))), item.sha256);
  for (const group of [binding.implementation, binding.loaderDependencies])
    for (const [file, digest] of Object.entries(group)) assert.equal(sha256(readSource(path.join(root, file))), digest);
  const diagnostic = readSource(path.join(root, binding.diagnostic.path));
  assert.equal(sha256(diagnostic), binding.diagnostic.sha256);
  const checked = JSON.parse(diagnostic);
  assert.equal(checked.ok, true);
  assert.deepEqual(checked.compiler, binding.compiler);
  assert.equal(binding.diagnostic.engine.executableSha256, runtime.sha256);
  for (const [file, digest] of Object.entries(binding.diagnostic.fixtures))
    assert.equal(sha256(readSource(path.join(root, 'bend2/toolchain-patches/2035/workers', file))), digest);
  const manifestBytes = readSource(path.join(root, botDirectory, 'manifest.json'));
  assert.equal(sha256(manifestBytes), binding.manifestSha256);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.protocol, 1);
  assert.equal(manifest.backend, 'bend-web-workers-2035');
  assert.equal(manifest.natRepresentation, 'number48-host-bigint');
  assert.equal(manifest.mode, 'required-only');
  assert.equal(manifest.policy, 'strict');
  assert.equal(manifest.program, binding.program);
  assert.deepEqual(Object.keys(manifest.exports), ['choose']);
  assert.equal(manifest.functions[manifest.exports.choose]?.name, 'choose');
  const prefix = `bend-${manifest.program.slice(0, 16)}`;
  assert.deepEqual(manifest.artifacts, { entry: 'index.mjs', program: `${prefix}.program.mjs`,
    worker: `${prefix}.worker.mjs`, runtime: `${prefix}.runtime.mjs`, manifest: 'manifest.json' });
  assert.deepEqual(Object.keys(binding.artifacts).sort(), Object.values(manifest.artifacts).sort());
  const contents = Object.fromEntries(Object.entries(binding.artifacts).map(([file, digest]) => {
    const bytes = readSource(path.join(root, botDirectory, file));
    assert.equal(sha256(bytes), digest, `selected bot artifact changed: ${file}`);
    return [file, bytes];
  }));
  assert.ok(contents[manifest.artifacts.program].toString('utf8')
    .includes(`export const manifest = freezeProgramData(${JSON.stringify(manifest)});`));
  return { binding, manifest, contents };
}

function caches(runtime) {
  return Object.fromEntries(Object.entries(selected).map(([name, [directory, expected]]) => {
    const manifestPath = path.join(previewRoot, directory, name + '.manifest.json');
    const raw = readSource(manifestPath);
    assert.equal(sha256(raw), expected, `${name} manifest changed`);
    const manifest = JSON.parse(raw);
    assert.equal(manifest.schema, 'rift-bend-selected-cache/2035-1');
    assert.equal(sha256(JSON.stringify(manifest.binding)), manifest.bindingSha256);
    assert.deepEqual(manifest.binding, { ...(name === 'menu' ? menuApplicationBinding2035() : selectedBinding2035(name)), runtime },
      `Stale current ${name} cache`);
    assert.equal(manifest.networkCalls, 0);
    assert.equal(manifest.output.file, name + '.js');
    const bytes = readSource(path.join(path.dirname(manifestPath), manifest.output.file));
    assert.equal(bytes.length, manifest.output.bytes);
    assert.equal(sha256(bytes), manifest.output.sha256);
    return [name, { bytes, manifest, compatibility: null, manifestPath: relative(manifestPath), manifestSha256: expected }];
  }));
}

export async function buildPreview2035({ preparedGround = true } = {}) {
  assert.equal(typeof preparedGround, 'boolean');
  const preparedManifest = 'bend2/laws/semantic-prepared-v3.json';
  const preparedBytes = readSource(path.join(root, preparedManifest));
  const preparedCore = { ...verifyPrepared(JSON.parse(preparedBytes)),
    manifest: preparedManifest, manifestSHA256: sha256(preparedBytes) };
  assert.equal(typeof Bun?.build, 'function', 'use the repository-local Bend wrapper');
  const executable = assertLocalBunRuntime(root, path.join(root, '.artifacts/toolchains/runtime'), process.execPath);
  const runtime = { version: Bun.version, executable: relative(executable), sha256: sha256(readSource(executable)) };
  assert.equal(runtime.version, '1.4.2');
  assert.equal(git('-C', '.artifacts/toolchains/bend-2.0.35-scout', 'rev-parse', 'HEAD'), candidateCommit);
  assert.equal(git('-C', '.artifacts/toolchains/bend-2.0.35-scout', 'status', '--porcelain', '--untracked-files=no'), '');
  const before = caches(runtime);
  const bot = botLibrary2035(runtime);
  const boundary = createBrowserTagBoundary2035();
  const extraSources = ['bend2/toolchain-patches/2035/build-preview.mjs',
    'bend2/core/v3/2035/bendtt-gate/application/menu-binding.mjs',
    'bend2/core/v3/2035/bendtt-gate/application/emit-menu.mjs',
    preparedManifest, 'bend2/core/v3/prepared-match/verify.mjs',
    'bend2/toolchain-patches/2032/browser-preview/pack-static.mjs',
    'bend2/platform/browser/platform.css', 'bend2/platform/browser/index.html',
    'bend2/platform/browser/sw.js', 'bend2/platform/browser/bitmap-surface.ts',
    'bend2/platform/browser/telemetry.ts', ...(preparedGround ? [
      'bend2/toolchain-patches/2035/prepared-ground.mjs', 'bend2/assets/MANIFEST.json',
      'bend2/assets/source/observatory-astral.png', 'bend2/assets/runtime/observatory-astral.rga'] : [])];
  const sourceHashes = () => extraSources.map(file => ({ path: file, sha256: sha256(readSource(path.join(root, file))) }));
  const sources = sourceHashes();
  const sourceRevision = git('rev-parse', 'HEAD');
  const sourceDirty = Boolean(git('status', '--porcelain', '--untracked-files=normal', '--', 'bend2'));
  const out = fs.mkdtempSync(path.join(previewRoot, 'browser-'));
  const prepared = preparedGround ? await emitDefaultGround2035(out, before) : null;
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
  const helper = await bundle('bend2/platform/browser/sprite-helper.ts', { __BEND_SPRITE_SOURCE__: JSON.stringify(spriteSource),
    ...(prepared ? {
      __BEND_PREPARED_GROUND_PATH__: JSON.stringify(prepared.assetPath),
      __BEND_PREPARED_GROUND_SHA__: JSON.stringify(prepared.assetSha256),
      __BEND_PREPARED_PLATE_SHA__: JSON.stringify(prepared.plateSha256),
      __BEND_PREPARED_FRAME_JSON__: JSON.stringify(prepared.frameJson),
    } : {}) });
  const worker = await bundle('bend2/platform/browser/worker-v2.ts', {
    __BEND_SPRITE_SOURCE__: JSON.stringify(spriteSource), __BEND_SPRITE_HELPER__: JSON.stringify('./' + helper) });
  const host = await bundle('bend2/platform/browser/host.ts', { __BEND_WORKER__: JSON.stringify('./' + worker) });
  const files = Object.fromEntries([helper, worker, host].map(name => [name, sha256(readSource(path.join(out, name)))]));
  if (prepared) {
    files[prepared.assetFile] = prepared.assetSha256;
    files[prepared.metadataFile] = prepared.metadataSha256;
  }
  const write = (name, bytes) => { writeNewFile(root, out, name, Buffer.from(bytes)); files[name] = sha256(readSource(path.join(out, name))); };
  for (const [file, bytes] of Object.entries(bot.contents)) write('worker-libs/bot/' + file, bytes);
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
  assert.deepEqual(verifyPrepared(JSON.parse(readSource(path.join(root, preparedManifest)))),
    { verified: preparedCore.verified, scope: preparedCore.scope,
      canonicalContentSHA256: preparedCore.canonicalContentSHA256 }, 'prepared core changed during build');
  assert.deepEqual(botLibrary2035(runtime), bot, 'bot inputs changed during build');
  assert.equal(git('rev-parse', 'HEAD'), sourceRevision);
  const manifest = { schema: 'rift-bend-browser/2035-preview-1', builtAt: new Date().toISOString(),
    version, sourceRevision, sourceDirty, draft: true, candidate: candidateCommit, adopted: false,
    toolchain: JSON.parse(readSource(path.join(root, 'bend2/TOOLCHAIN.json'))),
    runtime, selected: Object.fromEntries(Object.entries(before).map(([name, item]) => [name, {
      manifest: item.manifestPath, manifestSha256: item.manifestSha256, outputSha256: item.manifest.output.sha256,
      bindingSha256: item.manifest.bindingSha256, compatibility: item.compatibility }])),
    browserBoundary: boundary.binding, preparedCore, sources, assets, files,
    workerLibraries: { bot: { entry: './worker-libs/bot/index.mjs', program: bot.manifest.program,
      backend: bot.manifest.backend, mode: bot.manifest.mode, policy: bot.manifest.policy,
      sourceBinding: botDirectory + '/source-binding.json', sourceBindingSha256: botBindingHash,
      artifacts: bot.binding.artifacts } }, preparedGround: prepared,
    scope: 'candidate current-source game and source-bound bot Worker preview; runtime/proof/native/GPU/adoption gates require their own evidence' };
  writeNewFile(root, out, 'build.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  for (const [name, hash] of Object.entries(files)) assert.equal(sha256(readSource(path.join(out, name))), hash);
  console.log(JSON.stringify({ ok: true, out: relative(out), version, buildSha256: sha256(readSource(path.join(out, 'build.json'))), scope: manifest.scope }));
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildPreview2035({ preparedGround: process.env.BEND_2035_PREPARED_GROUND !== '0' });
