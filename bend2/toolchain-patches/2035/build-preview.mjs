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
import { prepare as workerCompilerBinding2035 } from './workers/prepare.mjs';
import { emitDefaultGround2035 } from './prepared-ground.mjs';

const selected = {
  scene: ['stationary-motion-20261006/scene-yHJgb5', '6045830dc3fdd3c274612458622671ca228ded21eb0d37f56462d7cd58c9e6b8'],
  controller: ['camera-refinement-20261006/controller-eZtJGy', '00d6655ae5586ce36eb650762b9c6c138204dba932b49d6432c36c350833d07d'],
  menu: ['camera-refinement-20261006/menu-S4IxDK', '0197e43645ae79b36a1ae2bb5db8519ca14ce7d1ff0e892666c6435e2506ae68'],
  chrome: ['chrome-knTtdv', 'e4ea2af8e09125df337715d1a3e3c2948ba593a91e275f2b98ec035e675d68c8'],
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

// The retained Chrome emission predates added scene/controller exports. Its own
// entry, exports, compiler and source closure are unchanged. Preserve that
// original receipt and permit only this reviewed registry transition.
export function assertSelectedCacheBinding2035(name, cached, current, manifestSha256) {
  const registry = 'bend2/tools/selected-modules.mjs';
  const oldHash = 'b3abdbcb1a6bdfe749535b90b17d54ef3205f950c87ff34efcdf31a23f37ee63';
  const newHash = '39f4e5700c2cbad3ae1a9e44ef72e3acee97eb914466e34b3f65616b05c2de64';
  if (name !== 'chrome' || manifestSha256 !== selected.chrome[1]
      || cached.sourceFiles.find(item => item.path === registry)?.sha256 !== oldHash) {
    assert.deepEqual(cached, current);
    return null;
  }
  const records = current.sourceFiles.filter(item => item.path === registry);
  assert.equal(records.length, 1);
  assert.equal(records[0].sha256, newHash, 'unreviewed registry transition');
  const bytes = readSource(path.join(root, registry));
  assert.equal(sha256(bytes), newHash);
  const addition = "'sprite_pick_data', 'sprite_pose_pieces', 'sprite_same_view', 'sprite_has_view',";
  const controllerAddition = "'dispatch_at_web_meta', 'dispatch_at_web_atlas_meta', 'refine', 'orbiting', 'bot_job'";
  const source = bytes.toString('utf8');
  assert.equal(source.split(addition).length - 1, 1);
  assert.equal(source.split(controllerAddition).length - 1, 1);
  assert.equal(sha256(Buffer.from(source.replace(addition, "'sprite_pick_data',")
    .replace(controllerAddition, "'refine', 'bot_job'"))), oldHash);
  const compatible = { ...cached, sourceFiles: cached.sourceFiles.map(item =>
    item.path === registry ? { ...item, sha256: newHash } : item) };
  assert.deepEqual(compatible, current, 'Chrome inputs changed beyond reviewed registry exports');
  return { schema: 'rift-selected-cache-compatibility/1', path: registry,
    emittedSourceSha256: oldHash, currentSourceSha256: newHash,
    currentBindingSha256: sha256(JSON.stringify(current)),
    scope: 'retained Chrome emission, exact current module inputs; no fresh Chrome emission' };
}

function caches(runtime) {
  return Object.fromEntries(Object.entries(selected).map(([name, [directory, expected]]) => {
    const manifestPath = path.join(previewRoot, directory, name + '.manifest.json');
    const raw = readSource(manifestPath);
    assert.equal(sha256(raw), expected, `${name} manifest changed`);
    const manifest = JSON.parse(raw);
    assert.equal(manifest.schema, 'rift-bend-selected-cache/2035-1');
    assert.equal(sha256(JSON.stringify(manifest.binding)), manifest.bindingSha256);
    const compatibility = assertSelectedCacheBinding2035(name, manifest.binding,
      { ...selectedBinding2035(name), runtime }, expected);
    assert.equal(manifest.networkCalls, 0);
    assert.equal(manifest.output.file, name + '.js');
    const bytes = readSource(path.join(path.dirname(manifestPath), manifest.output.file));
    assert.equal(bytes.length, manifest.output.bytes);
    assert.equal(sha256(bytes), manifest.output.sha256);
    return [name, { bytes, manifest, compatibility, manifestPath: relative(manifestPath), manifestSha256: expected }];
  }));
}

export async function buildPreview2035({ preparedGround = true } = {}) {
  assert.equal(typeof preparedGround, 'boolean');
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
  assert.deepEqual(botLibrary2035(runtime), bot, 'bot inputs changed during build');
  assert.equal(git('rev-parse', 'HEAD'), sourceRevision);
  const manifest = { schema: 'rift-bend-browser/2035-preview-1', builtAt: new Date().toISOString(),
    version, sourceRevision, sourceDirty, draft: true, candidate: candidateCommit, adopted: false,
    toolchain: JSON.parse(readSource(path.join(root, 'bend2/TOOLCHAIN.json'))),
    runtime, selected: Object.fromEntries(Object.entries(before).map(([name, item]) => [name, {
      manifest: item.manifestPath, manifestSha256: item.manifestSha256, outputSha256: item.manifest.output.sha256,
      bindingSha256: item.manifest.bindingSha256, compatibility: item.compatibility }])),
    browserBoundary: boundary.binding, sources, assets, files,
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
