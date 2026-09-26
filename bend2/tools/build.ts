import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { root, verifyFreeze, digest } from './freeze.mjs';
import { verifyAttestation } from './attest.mjs';
import { verifyLibrary } from './verify-library.mjs';
import { verifyV2 } from './freeze-v2.mjs';
import { compilerSourceTreeHash } from './emit-worker-libs.mjs';
import { assertCache } from './selected-modules.mjs';

const WORKER_ARTIFACT_KEYS = ['entry', 'program', 'worker', 'runtime', 'manifest'] as const;
const WORKER_BINDING_FILE = 'source-binding.json';
const BOT_WORKER_EXPECTATION = {
  library: 'bot',
  sourceRoot: 'bend2/platform/worker/BotAdapter.bend',
  exports: ['choose'],
  mode: 'required-only',
  policy: 'strict',
};

type WorkerLibrary = {
  manifest: {
    protocol: number;
    program: string;
    backend: string;
    mode: string;
    policy: string;
    exports: Record<string, number>;
    functions: Array<{ name: string }>;
    artifacts: Record<(typeof WORKER_ARTIFACT_KEYS)[number], string>;
    [key: string]: unknown;
  };
  contents: Map<string, Buffer>;
  hashes: Record<string, string>;
  binding?: Record<string, unknown>;
  bindingSha256?: string;
};

function requirePlainFileSet(directory: string, expected: string[]): void {
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Worker library path is not a plain directory: ${directory}`);
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const names = entries.map(entry => entry.name).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(names) !== JSON.stringify(wanted)) {
    throw new Error(`Worker library must contain exactly these files: ${wanted.join(', ')}; found: ${names.join(', ')}`);
  }
  for (const entry of entries) {
    if (!entry.isFile() || entry.isSymbolicLink()) throw new Error(`Worker library contains a non-file entry: ${entry.name}`);
  }
}

function bendSourceClosure(repositoryRoot: string, entry: string): Array<{ path: string; sha256: string }> {
  const found = new Map<string, string>();
  const visit = (relative: string): void => {
    if (path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(part => part === '..' || part === '')) {
      throw new Error(`Unsafe Bend source path in worker binding: ${relative}`);
    }
    const file = path.resolve(repositoryRoot, ...relative.split('/'));
    const prefix = `${path.resolve(repositoryRoot)}${path.sep}`;
    if (!file.startsWith(prefix)) throw new Error(`Bend worker source escapes the repository: ${relative}`);
    const real = fs.realpathSync(file);
    if (!real.startsWith(prefix)) throw new Error(`Bend worker source resolves outside the repository: ${relative}`);
    const canonical = path.relative(repositoryRoot, real).replaceAll('\\', '/');
    if (found.has(canonical)) return;
    const bytes = fs.readFileSync(real);
    const text = bytes.toString('utf8');
    found.set(canonical, digest(bytes));
    for (const line of text.split(/\r?\n/)) {
      const specifier = /^\s*import\s+(\S+)(?:\s+as\s+\w+)?\s*$/.exec(line)?.[1];
      if (!specifier || specifier === 'Base') continue;
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) throw new Error(`Unsupported Bend worker import: ${specifier}`);
      visit(path.relative(repositoryRoot, path.resolve(path.dirname(real), specifier)).replaceAll('\\', '/'));
    }
  };
  visit(entry);
  return [...found].map(([sourcePath, sha256]) => ({ path: sourcePath, sha256 }))
    .sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

type WorkerBindingContext = {
  repositoryRoot: string;
  expectedCompiler: { baseCommit: string; sourceTreeSha256: string };
  expectedLibrary: typeof BOT_WORKER_EXPECTATION;
};

function validateWorkerBinding(directory: string, artifacts: Record<string, string>, context: WorkerBindingContext) {
  const file = path.join(directory, WORKER_BINDING_FILE);
  let binding: any;
  try {
    binding = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Missing or invalid worker source binding: ${error instanceof Error ? error.message : String(error)}`);
  }
  const expected = context.expectedLibrary;
  if (binding.schema !== 'rift-bend-worker-source-binding/1' || binding.library !== expected.library ||
      binding.sourceRoot !== expected.sourceRoot || binding.mode !== expected.mode || binding.policy !== expected.policy ||
      !Array.isArray(binding.exports) || JSON.stringify(binding.exports) !== JSON.stringify(expected.exports)) {
    throw new Error('Worker source binding does not match the reviewed bot library, entrypoint, exports, and scheduling policy.');
  }
  if (!binding.compiler || binding.compiler.baseCommit !== context.expectedCompiler.baseCommit ||
      binding.compiler.sourceTreeSha256 !== context.expectedCompiler.sourceTreeSha256) {
    throw new Error('Worker source binding uses a stale or unreviewed Bend compiler variant.');
  }
  const pinFile = path.join(context.repositoryRoot, 'bend2/TOOLCHAIN.json');
  const pin = JSON.parse(fs.readFileSync(pinFile, 'utf8'));
  if (binding.compiler.baseCommit !== pin.bendCommit) throw new Error('Worker compiler base does not match the pinned Bend toolchain.');
  const sourceNames = Object.keys(artifacts).sort();
  if (!binding.artifacts || typeof binding.artifacts !== 'object' || Array.isArray(binding.artifacts) ||
      JSON.stringify(Object.keys(binding.artifacts).sort()) !== JSON.stringify(sourceNames)) {
    throw new Error('Worker source binding does not contain hashes for exactly the five runtime artifacts.');
  }
  for (const name of sourceNames) {
    if (binding.artifacts[name] !== artifacts[name]) throw new Error(`Worker artifact changed after source binding: ${name}`);
  }
  const expectedSources = bendSourceClosure(context.repositoryRoot, binding.sourceRoot);
  if (!Array.isArray(binding.sources) || JSON.stringify(binding.sources) !== JSON.stringify(expectedSources)) {
    throw new Error('Worker source binding is stale: the current Bend import closure or its hashes differ.');
  }
  return { binding, bindingSha256: digest(fs.readFileSync(file)) };
}

function validateWorkerLibrary(directory: string, expected: typeof BOT_WORKER_EXPECTATION,
  options: { allowBinding?: boolean; bindingContext?: WorkerBindingContext } = {}): WorkerLibrary {
  const manifestPath = path.join(directory, 'manifest.json');
  let manifest: WorkerLibrary['manifest'];
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid worker library manifest: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (manifest.protocol !== 1 || manifest.backend !== 'bend-web-workers-2' || manifest.mode !== expected.mode || manifest.policy !== expected.policy) {
    throw new Error('Bot worker manifest must match protocol 1, bend-web-workers-2, and the reviewed scheduling policy.');
  }
  if (!/^[0-9a-f]{64}$/.test(manifest.program)) throw new Error('Worker library manifest has an invalid program identity.');
  if (!manifest.exports || JSON.stringify(Object.keys(manifest.exports).sort()) !== JSON.stringify([...expected.exports].sort()) ||
      !Array.isArray(manifest.functions) || expected.exports.some(name => !Number.isInteger(manifest.exports[name]) ||
        manifest.functions[manifest.exports[name]]?.name !== name)) {
    throw new Error(`Bot worker manifest must export exactly: ${expected.exports.join(', ')}.`);
  }
  const artifacts = manifest.artifacts;
  if (!artifacts || typeof artifacts !== 'object' || Array.isArray(artifacts) ||
      JSON.stringify(Object.keys(artifacts).sort()) !== JSON.stringify([...WORKER_ARTIFACT_KEYS].sort())) {
    throw new Error('Worker library manifest must name exactly entry, program, worker, runtime, and manifest artifacts.');
  }
  const prefix = `bend-${manifest.program.slice(0, 16)}`;
  const expectedArtifacts = {
    entry: 'index.mjs',
    program: `${prefix}.program.mjs`,
    worker: `${prefix}.worker.mjs`,
    runtime: `${prefix}.runtime.mjs`,
    manifest: 'manifest.json',
  };
  for (const key of WORKER_ARTIFACT_KEYS) {
    const name = artifacts[key];
    if (typeof name !== 'string' || name !== expectedArtifacts[key] || path.basename(name) !== name || /[\\/]/.test(name)) {
      throw new Error(`Worker library manifest has an invalid ${key} artifact name.`);
    }
  }
  const expectedNames = Object.values(expectedArtifacts);
  requirePlainFileSet(directory, options.allowBinding ? [...expectedNames, WORKER_BINDING_FILE] : expectedNames);
  const contents = new Map(expectedNames.map(name => [name, fs.readFileSync(path.join(directory, name))]));
  const text = (name: string) => contents.get(name)!.toString('utf8');
  const manifestJson = JSON.stringify(manifest);
  if (!text(artifacts.program).includes(`export const manifest = freezeProgramData(${manifestJson});`)) {
    throw new Error('Worker program module and manifest.json describe different artifact sets.');
  }
  const entry = text(artifacts.entry);
  if (!entry.includes(`import * as program from "./${artifacts.program}";`) ||
      !entry.includes(`import {createWorkerSession} from "./${artifacts.runtime}";`) ||
      !entry.includes(`new URL("./${artifacts.worker}", import.meta.url)`) ||
      !entry.includes('export const manifest = program.manifest;')) {
    throw new Error('Worker entry does not link the matching program/runtime and module-relative helper URL.');
  }
  if (!text(artifacts.program).startsWith(`import {web_call, web_tail, web_fork, freezeProgramData} from "./${artifacts.runtime}";`) ||
      !text(artifacts.worker).includes(`import * as program from "./${artifacts.program}";`) ||
      !text(artifacts.worker).includes(`import {serveWorker} from "./${artifacts.runtime}";`) ||
      !text(artifacts.worker).includes('serveWorker(program);')) {
    throw new Error('Worker program and helper modules do not form the manifest-bound module graph.');
  }
  const modules = [artifacts.entry, artifacts.program, artifacts.worker, artifacts.runtime];
  const allowedImports = new Set(expectedNames);
  for (const name of modules) {
    const source = text(name);
    for (const line of source.split(/\r?\n/)) {
      const match = /^\s*import\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']\s*;?\s*$/.exec(line) ??
        /^\s*export\s+[^"']+?\s+from\s+["']([^"']+)["']\s*;?\s*$/.exec(line);
      if (!match) {
        if (/^\s*import\b/.test(line)) throw new Error(`Worker artifact ${name} has an unsupported multiline module declaration.`);
        continue;
      }
      const specifier = match[1];
      if (!specifier.startsWith('./') || !allowedImports.has(specifier.slice(2))) {
        throw new Error(`Worker artifact ${name} imports a missing or non-local module: ${specifier}`);
      }
    }
  }
  const hashes = Object.fromEntries(expectedNames.map(name => [name, digest(contents.get(name)!)]));
  const binding = options.allowBinding
    ? validateWorkerBinding(directory, hashes, options.bindingContext!) : undefined;
  return { manifest, contents, hashes, ...(binding ?? {}) };
}

/** Copy the checked five-file compiler output atomically into a static package. */
export function packageWorkerLibrary(sourceDirectory: string, outputDirectory: string, publicPrefix: string,
  options: WorkerBindingContext) {
  if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(publicPrefix)) throw new Error(`Unsafe worker asset prefix: ${publicPrefix}`);
  const source = path.resolve(sourceDirectory);
  const output = path.resolve(outputDirectory);
  if (source === output || source.startsWith(`${output}${path.sep}`) || output.startsWith(`${source}${path.sep}`)) {
    throw new Error('Worker library source and destination must be separate directories.');
  }
  const library = validateWorkerLibrary(source, options.expectedLibrary, { allowBinding: true, bindingContext: options });
  const parent = path.dirname(output);
  fs.mkdirSync(parent, { recursive: true });
  const currentExists = fs.existsSync(output);
  if (currentExists) {
    const current = validateWorkerLibrary(output, options.expectedLibrary);
    if (JSON.stringify(current.hashes) === JSON.stringify(library.hashes)) {
      return {
        entry: `${publicPrefix}/${library.manifest.artifacts.entry}`,
        manifest: library.manifest,
        files: Object.fromEntries(Object.keys(library.hashes).map(name => [`${publicPrefix}/${name}`, library.hashes[name]])),
        bindingSha256: library.bindingSha256,
      };
    }
    throw new Error('Worker output already contains a different valid artifact set; build into a fresh output directory.');
  }
  const stage = fs.mkdtempSync(path.join(parent, `.${path.basename(output)}.stage-`));
  for (const [name, bytes] of library.contents) fs.writeFileSync(path.join(stage, name), bytes, { flag: 'wx' });
  const staged = validateWorkerLibrary(stage, options.expectedLibrary);
  if (JSON.stringify(staged.hashes) !== JSON.stringify(library.hashes)) throw new Error('Worker staging copy failed SHA-256 verification.');
  fs.renameSync(stage, output);
  const packaged = validateWorkerLibrary(output, options.expectedLibrary);
  return {
    entry: `${publicPrefix}/${packaged.manifest.artifacts.entry}`,
    manifest: packaged.manifest,
    files: Object.fromEntries(Object.keys(packaged.hashes).map(name => [`${publicPrefix}/${name}`, packaged.hashes[name]])),
    bindingSha256: library.bindingSha256,
  };
}

function currentWorkerCompilerContext(): WorkerBindingContext['expectedCompiler'] {
  const variantPath = path.join(root, 'bend2/toolchain-patches/004-web-workers/VARIANT.json');
  const variant = JSON.parse(fs.readFileSync(variantPath, 'utf8'));
  const pin = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));
  if (variant.schema !== 'rift-bend-worker-toolchain/1' || variant.baseCommit !== pin.bendCommit ||
      !/^[0-9a-f]{64}$/.test(variant.sourceTreeSha256)) {
    throw new Error('The downstream worker compiler descriptor does not match the pinned Bend toolchain.');
  }
  if (!Array.isArray(variant.patches) || variant.patches.length === 0) throw new Error('Worker compiler descriptor has no maintained patch stack.');
  const patchRoot = path.resolve(root, 'bend2/toolchain-patches');
  const seenPatches = new Set<string>();
  for (const patch of variant.patches) {
    if (!patch || typeof patch.file !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(patch.file) ||
        !/^[0-9a-f]{64}$/.test(patch.sha256) || seenPatches.has(patch.file)) {
      throw new Error('Worker compiler descriptor contains an invalid or duplicate patch entry.');
    }
    seenPatches.add(patch.file);
    const file = path.resolve(patchRoot, patch.file);
    if (!file.startsWith(`${patchRoot}${path.sep}`) || !fs.statSync(file, { throwIfNoEntry: false })?.isFile() ||
        digest(fs.readFileSync(file)) !== patch.sha256) {
      throw new Error(`Worker compiler patch differs from its reviewed descriptor: ${patch.file}`);
    }
  }
  const compilerRoot = variant.compilerRoot
    ? path.resolve(root, variant.compilerRoot)
    : path.join(root, '.artifacts/bend2/toolchain-patches/workers-stage2-20260925');
  const artifactsRoot = path.resolve(root, '.artifacts/bend2/toolchain-patches');
  if (!compilerRoot.startsWith(`${artifactsRoot}${path.sep}`)) throw new Error('Worker compiler root must stay within the local Bend patch workspace.');
  const head = execFileSync('git', ['-C', compilerRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (head !== variant.baseCommit) throw new Error('Worker compiler checkout does not use the reviewed base commit.');
  const sourceTreeSha256 = compilerSourceTreeHash(compilerRoot);
  if (sourceTreeSha256 !== variant.sourceTreeSha256) throw new Error('Worker compiler source tree differs from its reviewed descriptor.');
  return { baseCommit: variant.baseCommit, sourceTreeSha256 };
}

export function workerPrecachePaths(files: Record<string, string>): string[] {
  return ['./', './build.json', ...Object.keys(files).sort().map(file => `./${file}`)];
}

async function main(): Promise<void> {
const draft = process.argv.includes('--draft');
const v2Preview = process.argv.includes('--v2-preview');
const plugin = (await import(v2Preview ? './loader-v2.ts' : './loader.ts')).default;
const semantic = draft ? null : verifyFreeze();
const pixels = draft ? null : verifyFreeze('graphics');
if (!draft) verifyAttestation();
const library = verifyLibrary();
const rulesV2 = draft ? null : verifyV2();
const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const sourceDirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal', '--', 'bend2'], { cwd: root, encoding: 'utf8' }).trim());
const targetOut = v2Preview ? path.join(root, '.artifacts/bend2/v2-preview/dist') : path.join(root, 'bend2/dist');
const out = v2Preview
  ? path.join(path.dirname(targetOut), `.dist-candidate-${process.pid}-${crypto.randomUUID()}`)
  : targetOut;
fs.mkdirSync(out, { recursive: true });
const common = { outdir: out, target: 'browser' as const, format: 'esm' as const, naming: '[name]-[hash].[ext]', minify: true, sourcemap: 'external' as const, splitting: false };
let spriteHelperName = '', spriteSource = '';
if (v2Preview) {
  spriteSource = assertCache('scene').manifest.output.sha256;
  const helper = await Bun.build({ ...common,
    entrypoints: [path.join(root, 'bend2/platform/browser/sprite-helper.ts')],
    plugins: [plugin], define: { __BEND_SPRITE_SOURCE__: JSON.stringify(spriteSource) } });
  if (!helper.success) throw new Error(helper.logs.map(String).join('\n'));
  spriteHelperName = path.basename(helper.outputs.find(file => file.path.endsWith('.js'))!.path);
}
const worker = await Bun.build({ ...common, entrypoints: [path.join(root,
  v2Preview ? 'bend2/platform/browser/worker-v2.ts' : 'bend2/platform/browser/worker.ts')],
  plugins: [plugin], ...(v2Preview ? { define: {
    __BEND_SPRITE_HELPER__: JSON.stringify(`./${spriteHelperName}`),
    __BEND_SPRITE_SOURCE__: JSON.stringify(spriteSource),
  } } : {}) });
if (!worker.success) throw new Error(worker.logs.map(String).join('\n'));
const workerName = path.basename(worker.outputs.find(file => file.path.endsWith('.js'))!.path);
const main = await Bun.build({ ...common, entrypoints: [path.join(root, 'bend2/platform/browser/host.ts')], define: { __BEND_WORKER__: JSON.stringify(`./${workerName}`) } });
if (!main.success) throw new Error(main.logs.map(String).join('\n'));
const mainName = path.basename(main.outputs.find(file => file.path.endsWith('.js'))!.path);
const css = fs.readFileSync(path.join(root, 'bend2/platform/browser/platform.css'));
const cssName = `style-${digest(css).slice(0, 12)}.css`;
fs.writeFileSync(path.join(out, cssName), css);
fs.writeFileSync(path.join(out, 'index.html'), fs.readFileSync(path.join(root, 'bend2/platform/browser/index.html'), 'utf8')
  .replace('./main.js', `./${mainName}`).replace('./style.css', `./${cssName}`));
fs.copyFileSync(path.join(root, 'bend2/THIRD_PARTY_NOTICES.txt'), path.join(out, 'THIRD_PARTY_NOTICES.txt'));
fs.copyFileSync(path.join(root, 'bend2/licenses/Bend-Apache-2.0.txt'), path.join(out, 'Bend-Apache-2.0.txt'));
fs.copyFileSync(path.join(root, 'bend2/lib/graphics/v2/OFL.txt'), path.join(out, 'Rift-Atlas-Sans-OFL.txt'));
const files = Object.fromEntries(['index.html', mainName, workerName, cssName, 'THIRD_PARTY_NOTICES.txt', 'Bend-Apache-2.0.txt', 'Rift-Atlas-Sans-OFL.txt'].map((name) => [name, digest(fs.readFileSync(path.join(out, name)))]));
if (v2Preview) files[spriteHelperName] = digest(fs.readFileSync(path.join(out, spriteHelperName)));
let workerLibraries: Record<string, unknown> = {};
if (v2Preview) {
  const artifactRoot = path.join(root, '.artifacts/bend2/v2-preview/worker-libs');
  const expectedCompiler = currentWorkerCompilerContext();
  const bot = packageWorkerLibrary(path.join(artifactRoot, 'bot'), path.join(out, 'worker-libs/bot'), 'worker-libs/bot',
    { repositoryRoot: root, expectedCompiler, expectedLibrary: BOT_WORKER_EXPECTATION });
  Object.assign(files, bot.files);
  workerLibraries = { bot: { entry: `./${bot.entry}`, protocol: bot.manifest.protocol, program: bot.manifest.program,
    backend: bot.manifest.backend, mode: bot.manifest.mode, policy: bot.manifest.policy,
    sourceBindingSha256: bot.bindingSha256, files: Object.keys(bot.files).sort() } };
}
if (v2Preview) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'bend2/assets/MANIFEST.json'), 'utf8'));
  if (manifest.schema !== 'rift-bend-art-assets/1') throw new Error('Unknown game artwork manifest');
  const artwork = path.join(out, 'assets');
  fs.mkdirSync(artwork, { recursive: true });
  for (const [id, record] of Object.entries(manifest.assets) as [string, any][]) {
    if (!/^observatory-(astral|stone)$/.test(id) || record.runtime !== `runtime/${id}.rga` ||
        record.depth !== 9 || record.runtimeBytes !== 786437)
      throw new Error(`Unexpected game artwork entry: ${id}`);
    const source = path.join(root, 'bend2/assets', record.source);
    const runtime = path.join(root, 'bend2/assets', record.runtime);
    if (digest(fs.readFileSync(source)) !== record.sourceSha256 ||
        digest(fs.readFileSync(runtime)) !== record.runtimeSha256 ||
        fs.statSync(runtime).size !== record.runtimeBytes)
      throw new Error(`Game artwork source/runtime drift: ${id}`);
    const name = `assets/${id}.rga`;
    fs.copyFileSync(runtime, path.join(out, name));
    files[name] = digest(fs.readFileSync(path.join(out, name)));
  }
  if (Object.keys(manifest.assets).length !== 2) throw new Error('Unexpected game artwork count');
  fs.copyFileSync(path.join(root, 'bend2/assets/LICENSES.md'), path.join(artwork, 'LICENSES.md'));
  files['assets/LICENSES.md'] = digest(fs.readFileSync(path.join(artwork, 'LICENSES.md')));
  const font = JSON.parse(fs.readFileSync(path.join(root, 'bend2/ui/v2/fonts/packed-manifest.json'), 'utf8'));
  const fontName = 'assets/rift-observatory-font.rga';
  if (font.schema !== 'rift-observatory-font-pack/1' ||
      font.output !== 'bend2/assets/runtime/rift-observatory-font.rga' ||
      font.source !== 'bend2/assets/source/fonts/dm-sans-pinned.ttf' ||
      font.bytes !== 151343 || font.coverage_bits !== 8 || font.records !== 242)
    throw new Error('Unexpected Bend font-pack contract');
  const fontSource = fs.readFileSync(path.join(root, font.source));
  const fontRuntime = fs.readFileSync(path.join(root, font.output));
  if (digest(fontSource) !== font.source_sha256 ||
      digest(fontRuntime) !== font.output_sha256 || fontRuntime.length !== font.bytes ||
      digest(fs.readFileSync(path.join(root, 'bend2/assets/source/fonts/OFL.txt'))) !==
        digest(fs.readFileSync(path.join(root, 'bend2/lib/graphics/v2/OFL.txt'))))
    throw new Error('Bend font source, pack or OFL bytes drifted');
  fs.writeFileSync(path.join(out, fontName), fontRuntime);
  files[fontName] = digest(fontRuntime);
  const pieceRoot = path.join(root, 'bend2/assets/source/pieces');
  const pieceManifest = JSON.parse(fs.readFileSync(path.join(pieceRoot, 'manifest.json'), 'utf8'));
  if (pieceManifest.format !== 'rift-chess-piece-art-source-v1' ||
      pieceManifest.source?.path !== '../chess-piece-atlas.png' ||
      pieceManifest.tiers?.interactive?.depth !== 7 ||
      pieceManifest.tiers.interactive.totalBytes !== 196623 ||
      pieceManifest.tiers.interactive.deploymentIntegrated !== true ||
      pieceManifest.tiers.interactive.pages?.length !== 3 ||
      digest(fs.readFileSync(path.join(pieceRoot, pieceManifest.source.path))) !== pieceManifest.source.sha256)
    throw new Error('Unexpected or drifted Bend piece artwork source');
  for (let index = 0; index < 3; index++) {
    const page = pieceManifest.tiers.interactive.pages[index];
    if (page.path !== `../../runtime/pieces/pieces-fast-${index}.rga` || page.bytes !== 65541)
      throw new Error(`Unexpected Bend piece page ${index}`);
    const bytes = fs.readFileSync(path.join(pieceRoot, page.path));
    if (bytes.length !== page.bytes || digest(bytes) !== page.sha256)
      throw new Error(`Bend piece page ${index} differs from its source manifest`);
    const name = `assets/pieces-fast-${index}.rga`;
    fs.writeFileSync(path.join(out, name), bytes);
    files[name] = digest(bytes);
  }
}
const version = digest(JSON.stringify(files)).slice(0, 20);
fs.writeFileSync(path.join(out, 'sw.js'), fs.readFileSync(path.join(root, 'bend2/platform/browser/sw.js'), 'utf8')
  .replace('__BEND_BUILD__', version).replace('__BEND_ASSETS__', JSON.stringify(workerPrecachePaths(files))));
files['sw.js'] = digest(fs.readFileSync(path.join(out, 'sw.js')));
fs.writeFileSync(path.join(out, 'build.json'), JSON.stringify({ schema: 'rift-bend-browser/2', builtAt: new Date().toISOString(), version, sourceRevision, sourceDirty, draft,
  ...(v2Preview ? { v2Preview: true, workerLibraries } : {}),
  application: 'Bend-owned rules, UI, bitmap text, input policy, codec, replay, animation and PCM synthesis; browser IO transport only',
  semanticSha256: rulesV2?.sha256 ?? null, parentSemanticSha256: semantic?.sha256 ?? null,
  pixelSemanticSha256: pixels?.sha256 ?? null, graphicsManifestSha256: digest(fs.readFileSync(path.join(root,'bend2/lib/graphics/VERIFICATION.json'))),
  toolchain: JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'))), files }, null, 2) + '\n');
if (v2Preview) {
  let preservedPrevious: string | null = null;
  if (fs.existsSync(targetOut)) {
    const old = fs.lstatSync(targetOut);
    if (!old.isDirectory() || old.isSymbolicLink()) throw new Error(`Existing v2 preview output is not a plain directory: ${targetOut}`);
    preservedPrevious = path.join(path.dirname(targetOut), `.dist-previous-${process.pid}-${crypto.randomUUID()}`);
    fs.renameSync(targetOut, preservedPrevious);
  }
  try {
    fs.renameSync(out, targetOut);
  } catch (error) {
    if (preservedPrevious && fs.existsSync(preservedPrevious)) fs.renameSync(preservedPrevious, targetOut);
    throw error;
  }
  console.log(JSON.stringify({ out: targetOut, preservedPrevious, draft, version,
    files: Object.keys(files), bytes: [...worker.outputs, ...main.outputs].reduce((sum, file) => sum + file.size, 0) }));
} else {
  console.log(JSON.stringify({ out, draft, version, files: Object.keys(files), bytes: [...worker.outputs, ...main.outputs].reduce((sum, file) => sum + file.size, 0) }));
}
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) await main();
