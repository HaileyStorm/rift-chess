import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { approvedBundle } from './approved-bundle.mjs';
import { approvedReceipt } from '../browser-loader-v2/approved-receipt.mjs';
import { assertLocalBunRuntime } from '../browser-loader/runtime.mjs';
import { verifyCacheSet2032V2 } from '../cache-set-v2/verify.mjs';
import { finalizeOwnedManifest } from '../preview/lifecycle.mjs';
import { assertPlainPath, packageAssets, readPlainFile, root, writeNewFile } from '../browser-preview/pack-static.mjs';
import { assertApprovedReceipt, assertReceiptMatchesCacheSet, cacheModuleNames,
  validateReceiptShape } from '../browser-loader-v2/receipt.mjs';

export const bundleSchema = 'rift-bend-2032-worker-bundle-probe-v2/1';
export const bundleScope = '2.0.32-2 cache-bound Worker bundles only; not a served, rendered, interactive, GPU/native, published or pin-adopted app';
export const bundleSourceFiles = Object.freeze([
  'bend2/toolchain-patches/2032/browser-loader-v2/bundle-real.mjs',
  'bend2/toolchain-patches/2032/browser-loader-v2/receipt.mjs',
  'bend2/toolchain-patches/2032/browser-loader-v2/receipt.schema.json',
  'bend2/toolchain-patches/2032/browser-loader-v2/approved-receipt.mjs',
  'bend2/toolchain-patches/2032/browser-loader/loader.mjs',
  'bend2/toolchain-patches/2032/browser-loader/runtime.mjs',
  'bend2/toolchain-patches/2032/cache-set-v2/verify.mjs',
  'bend2/toolchain-patches/2032/preview/lifecycle.mjs',
  'bend2/tools/selected-modules.mjs',
  'bend2/TOOLCHAIN.json',
  'bend2/platform/browser/worker-v2.ts',
  'bend2/platform/browser/sprite-helper.ts',
  'bend2/platform/browser/asset-port.ts',
  'bend2/platform/browser/image-port.ts',
  'bend2/platform/browser/bitmap-surface.ts',
  'bend2/tools/bend.mjs',
  'bend2/tools/loader.ts',
].sort());

const inputRootRelative = '.artifacts/bend2/2032-browser-probe-v2';
const cacheRootRelative = '.artifacts/bend2/2032-preview';
const outputRootRelative = '.artifacts/bend2/2032-static-preview-v2';
const sha256Pattern = /^[0-9a-f]{64}$/;
const gitObjectPattern = /^[0-9a-f]{40}$/;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const posix = value => value.split(path.sep).join('/');

function exactKeys(value, keys, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} has missing or unexpected fields`);
}

function inside(parent, target) {
  const relative = path.relative(parent, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function exactUtf8Json(bytes, label) {
  const text = bytes.toString('utf8');
  assert.deepEqual(Buffer.from(text, 'utf8'), bytes, `${label} is not exact UTF-8`);
  try { return JSON.parse(text); }
  catch (error) { throw new Error(`${label} is invalid JSON: ${error.message}`); }
}

export function parseArguments(argv) {
  assert.equal(argv.length, 4, 'pass exactly --manifest <path> --sha256 <independent manifest SHA-256>');
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    assert.ok(key === '--manifest' || key === '--sha256', `unknown option: ${key}`);
    assert.ok(!Object.hasOwn(values, key), `duplicate option: ${key}`);
    assert.ok(typeof argv[index + 1] === 'string' && argv[index + 1].length > 0,
      `missing value for ${key}`);
    values[key] = argv[index + 1];
  }
  assert.ok(values['--manifest'] && values['--sha256'], 'both manifest path and SHA-256 are required');
  assert.match(values['--sha256'], sha256Pattern, '--sha256 must be a lowercase SHA-256');
  return { manifest: values['--manifest'], sha256: values['--sha256'] };
}

export function assertApprovedBundle(approval, manifestPath, rawSha256, manifest) {
  assert.ok(approval !== null && approval !== undefined,
    'no independently reviewed 2.0.32-2 static bundle pin is armed');
  exactKeys(approval, ['path', 'sha256', 'sourceRevision', 'sourceTree', 'cacheSource'],
    'reviewed static bundle pin');
  assert.ok(typeof approval.path === 'string' && approval.path.length > 0,
    'reviewed static bundle path is empty');
  assert.equal(path.posix.normalize(approval.path), approval.path,
    'reviewed static bundle path is not canonical');
  assert.match(approval.sha256, sha256Pattern, 'reviewed static bundle SHA-256 is invalid');
  assert.match(approval.sourceRevision, gitObjectPattern, 'reviewed bundle source revision is invalid');
  assert.match(approval.sourceTree, gitObjectPattern, 'reviewed bundle source tree is invalid');
  exactKeys(approval.cacheSource, ['commit', 'tree'], 'reviewed bundle cache source');
  assert.match(approval.cacheSource.commit, gitObjectPattern, 'reviewed cache source commit is invalid');
  assert.match(approval.cacheSource.tree, gitObjectPattern, 'reviewed cache source tree is invalid');
  assert.equal(approval.path, manifestPath, 'bundle manifest path differs from reviewed pin');
  assert.equal(approval.sha256, rawSha256, 'bundle manifest SHA-256 differs from reviewed pin');
  assert.equal(approval.sourceRevision, manifest.sourceRevision,
    'bundle source revision differs from reviewed pin');
  assert.equal(approval.sourceTree, manifest.sourceTree, 'bundle source tree differs from reviewed pin');
  assert.deepEqual(approval.cacheSource,
    { commit: manifest.cacheSourceCommit, tree: manifest.cacheSourceTree },
    'bundle cache source differs from reviewed pin');
  return approval;
}

function expectedCacheManifests(receipt) {
  return Object.fromEntries(cacheModuleNames.map(name => {
    const item = receipt.manifests[name];
    return [name, { path: item.manifestPath, manifestSha256: item.manifestSha256,
      outputBytes: item.outputBytes, outputSha256: item.outputSha256,
      sourceCommit: item.sourceCommit, sourceTree: item.sourceTree }];
  }));
}

export function validateBundleManifest({ manifestBytes, manifestPath, suppliedSha256, approval,
  receipt, receiptPath, receiptSha256, bunRuntime, readOutput, readSource } = {}) {
  assert.ok(Buffer.isBuffer(manifestBytes), 'bundle manifest bytes must be a Buffer');
  assert.match(suppliedSha256, sha256Pattern, 'independent bundle SHA-256 is invalid');
  assert.equal(sha256(manifestBytes), suppliedSha256,
    'bundle manifest raw bytes differ from the independently supplied SHA-256');
  assert.ok(typeof manifestPath === 'string' && manifestPath.length > 0,
    'bundle manifest path must be explicit');
  assert.equal(path.posix.normalize(manifestPath), manifestPath, 'bundle manifest path is not canonical');
  assert.ok(manifestPath.startsWith(`${inputRootRelative}/`),
    'bundle manifest is outside the v2 local bundle-probe root');
  assert.equal(path.posix.basename(manifestPath), 'worker-v2.manifest.json',
    'unexpected v2 bundle manifest filename');
  const manifest = exactUtf8Json(manifestBytes, 'v2 bundle manifest');
  assertApprovedBundle(approval, manifestPath, suppliedSha256, manifest);
  validateReceiptShape(receipt);
  assert.ok(typeof receiptPath === 'string' && receiptPath.length > 0,
    'independent receipt path must be explicit');
  assert.equal(path.posix.normalize(receiptPath), receiptPath, 'independent receipt path is not canonical');
  assert.ok(receiptPath.startsWith('bend2/toolchain-patches/2032/browser-loader-v2/'),
    'independent receipt is outside browser-loader-v2');
  assert.match(receiptSha256, sha256Pattern, 'independent receipt SHA-256 is invalid');
  exactKeys(manifest, ['schema', 'sourceRevision', 'sourceTree', 'cacheSourceCommit',
    'cacheSourceTree', 'cacheSchema', 'independentReceipt', 'bunRuntime', 'cacheManifests',
    'outputs', 'sourceFiles', 'networkCalls', 'scope'], 'v2 bundle manifest');
  assert.equal(manifest.schema, bundleSchema, 'unsupported 2.0.32-2 Worker bundle schema');
  assert.equal(manifest.scope, bundleScope, '2.0.32-2 Worker bundle scope differs');
  assert.equal(manifest.cacheSchema, 'rift-bend-selected-cache/2032-2',
    'Worker bundle is not bound to selected-cache 2032-2');
  assert.equal(manifest.networkCalls, 0, 'Worker bundle records network access');
  for (const field of ['sourceRevision', 'sourceTree', 'cacheSourceCommit', 'cacheSourceTree'])
    assert.match(manifest[field], gitObjectPattern, `invalid v2 bundle ${field}`);
  assert.deepEqual({ commit: manifest.cacheSourceCommit, tree: manifest.cacheSourceTree },
    receipt.cacheSource, 'Worker bundle cache source differs from the independent receipt');

  exactKeys(manifest.independentReceipt, ['path', 'sha256'], 'bundle independent receipt');
  assert.deepEqual(manifest.independentReceipt, { path: receiptPath, sha256: receiptSha256 },
    'bundle receipt path/hash differs from the independently pinned receipt');
  exactKeys(manifest.bunRuntime, ['version', 'executable', 'sha256'], 'bundle Bun runtime');
  assert.deepEqual(manifest.bunRuntime, bunRuntime, 'bundle Bun runtime differs from the local pinned runtime');
  assert.match(manifest.bunRuntime.sha256, sha256Pattern, 'bundle Bun executable SHA-256 is invalid');
  assert.deepEqual(manifest.cacheManifests, expectedCacheManifests(receipt),
    'bundle cache manifest pins differ from the independently pinned receipt');

  assert.ok(Array.isArray(manifest.sourceFiles), 'bundle sourceFiles must be an array');
  const expectedSources = [...new Set([...bundleSourceFiles, receiptPath])].sort();
  assert.equal(manifest.sourceFiles.length, expectedSources.length, 'bundle source file count differs');
  const sources = [];
  for (const [index, entry] of manifest.sourceFiles.entries()) {
    exactKeys(entry, ['file', 'sha256'], 'bundle source file');
    assert.equal(entry.file, expectedSources[index], 'bundle source file set or ordering differs');
    assert.match(entry.sha256, sha256Pattern, `invalid bundle source SHA-256: ${entry.file}`);
    const bytes = readSource(entry.file);
    assert.ok(Buffer.isBuffer(bytes), `bundle source bytes are missing: ${entry.file}`);
    assert.equal(sha256(bytes), entry.sha256, `bundle source bytes differ: ${entry.file}`);
    sources.push({ file: entry.file, sha256: entry.sha256 });
  }

  assert.ok(Array.isArray(manifest.outputs) && manifest.outputs.length === 2,
    'Worker bundle must contain exactly two JavaScript outputs');
  const prefixes = ['sprite-helper', 'worker'];
  const outputs = {};
  for (const [index, entry] of manifest.outputs.entries()) {
    exactKeys(entry, ['file', 'bytes', 'sha256'], 'Worker bundle output');
    const prefix = prefixes[index];
    assert.match(entry.file, new RegExp(`^${prefix}-[0-9a-f]{12}\\.js$`),
      `invalid ${prefix} output path`);
    assert.ok(Number.isSafeInteger(entry.bytes) && entry.bytes > 0,
      `invalid ${prefix} output byte count`);
    assert.match(entry.sha256, sha256Pattern, `invalid ${prefix} output SHA-256`);
    assert.equal(entry.file.slice(prefix.length + 1, -3), entry.sha256.slice(0, 12),
      `${prefix} content name differs from its hash`);
    const bytes = readOutput(entry.file);
    assert.ok(Buffer.isBuffer(bytes), `${prefix} output bytes are missing`);
    assert.equal(bytes.length, entry.bytes, `${prefix} output byte count differs`);
    assert.equal(sha256(bytes), entry.sha256, `${prefix} output bytes differ`);
    outputs[prefix] = { file: entry.file, bytes, sha256: entry.sha256 };
  }
  assert.ok(outputs.worker.bytes.includes(Buffer.from(outputs['sprite-helper'].file)),
    'Worker bundle does not reference its source-bound sprite helper');
  return { manifest, manifestBytes, manifestSha256: sha256(manifestBytes), outputs, sourceFiles: sources };
}

export function verifyRevisionBinding(manifest, { packerRevision, packerTree, commitTree, isAncestor,
  browserTreeEqual }) {
  for (const [label, value] of Object.entries({ sourceRevision: manifest.sourceRevision,
    sourceTree: manifest.sourceTree, cacheSourceCommit: manifest.cacheSourceCommit,
    packerRevision, packerTree }))
    assert.match(value, gitObjectPattern, `invalid ${label}`);
  assert.equal(commitTree(manifest.sourceRevision), manifest.sourceTree,
    'bundle source tree does not match its Git commit');
  assert.equal(isAncestor(manifest.cacheSourceCommit, manifest.sourceRevision), true,
    'cache source revision is not an ancestor of the Worker bundle source');
  assert.equal(isAncestor(manifest.sourceRevision, packerRevision), true,
    'bundle source revision is not an ancestor of the packer checkout');
  assert.equal(browserTreeEqual(manifest.sourceRevision, packerRevision), true,
    'browser source tree changed between Worker bundling and static packaging');
  return { bundleSourceRevision: manifest.sourceRevision, bundleSourceTree: manifest.sourceTree,
    packerRevision, packerTree };
}

function git(rootPath, ...args) {
  return execFileSync('git', ['-C', rootPath, ...args], { encoding: 'utf8' }).trim();
}

function assertIgnored(rootPath, absolutePath, label) {
  const relative = posix(path.relative(rootPath, absolutePath));
  try { execFileSync('git', ['-C', rootPath, 'check-ignore', '--no-index', '--quiet', '--', relative], { stdio: 'ignore' }); }
  catch { assert.fail(`${label} must be ignored by Git: ${relative}`); }
}

function ensureOutputParent(rootPath) {
  const artifactRoot = path.join(rootPath, '.artifacts', 'bend2');
  assertPlainPath(artifactRoot, 'directory', 'v2 static preview artifact root');
  const parent = path.join(rootPath, outputRootRelative);
  assertIgnored(rootPath, parent, 'v2 static preview output root');
  try { fs.mkdirSync(parent); }
  catch (error) { if (error?.code !== 'EEXIST') throw error; }
  assertPlainPath(parent, 'directory', 'v2 static preview output root');
  return parent;
}

function uniqueOutput(rootPath) {
  const parent = ensureOutputParent(rootPath);
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const directory = path.join(parent, `run-${stamp}-${process.pid}-${randomUUID()}`);
  fs.mkdirSync(directory);
  assertPlainPath(directory, 'directory', 'unique v2 static preview output');
  return directory;
}

function sourceBytes(rootPath, relative, label = `source ${relative}`) {
  return readPlainFile(rootPath, path.resolve(rootPath, ...relative.split('/')), label);
}

function digestFile(rootPath, relative) {
  return sha256(sourceBytes(rootPath, relative));
}

function copyFile(rootPath, out, files, destination, source, bytes = sourceBytes(rootPath, source)) {
  writeNewFile(rootPath, out, destination, bytes);
  files[destination] = sha256(bytes);
  return bytes;
}

async function buildHost(workerFile, rootPath) {
  assert.equal(typeof Bun?.build, 'function', 'run with the repository-local Bun runtime');
  const result = await Bun.build({ target: 'browser', format: 'esm', splitting: false, minify: true,
    entrypoints: [path.join(rootPath, 'bend2/platform/browser/host.ts')],
    define: { __BEND_WORKER__: JSON.stringify(`./${workerFile}`) } });
  assert.equal(result.success, true, result.logs.map(String).join('\n'));
  assert.equal(result.outputs.length, 1, 'host bundle must contain one output');
  assert.ok(result.outputs[0].path.endsWith('.js'), 'host bundle output is not JavaScript');
  return Buffer.from(await result.outputs[0].arrayBuffer());
}

const packageScopes = [
  'bend2/platform/browser', 'bend2/assets', 'bend2/ui/v2/fonts/packed-manifest.json',
  'bend2/lib/graphics/v2/OFL.txt', 'bend2/TOOLCHAIN.json', 'bend2/THIRD_PARTY_NOTICES.txt',
  'bend2/licenses/Bend-Apache-2.0.txt', 'bend2/toolchain-patches/2032/browser-preview',
  'bend2/toolchain-patches/2032/browser-preview-v2',
  'bend2/toolchain-patches/2032/cache-set-v2/verify.mjs',
  'bend2/toolchain-patches/2032/browser-loader-v2',
  'bend2/toolchain-patches/2032/browser-loader/loader.mjs',
  'bend2/toolchain-patches/2032/browser-loader/runtime.mjs',
  'bend2/toolchain-patches/2032/preview/lifecycle.mjs',
  'bend2/tools/selected-modules.mjs', 'bend2/tools/bend.mjs', 'bend2/tools/loader.ts',
];
const requiredTrackedSources = [
  'bend2/toolchain-patches/2032/browser-preview/pack-static.mjs',
  'bend2/toolchain-patches/2032/browser-preview-v2/pack-static.mjs',
  'bend2/toolchain-patches/2032/browser-preview-v2/approved-bundle.mjs',
  'bend2/toolchain-patches/2032/browser-preview-v2/sw-v2.template.js',
  'bend2/toolchain-patches/2032/cache-set-v2/verify.mjs',
  'bend2/toolchain-patches/2032/browser-loader-v2/receipt.mjs',
];

function assertCleanCheckout(rootPath) {
  assert.equal(git(rootPath, 'status', '--porcelain', '--untracked-files=all'), '',
    'static packaging requires a clean source checkout');
}

function packageSourceSnapshot(rootPath) {
  const files = execFileSync('git', ['-C', rootPath, 'ls-files', '-z', '--', ...packageScopes],
    { encoding: 'utf8' }).split('\0').filter(Boolean).sort();
  for (const required of requiredTrackedSources)
    assert.ok(files.includes(required), `required package source is not tracked: ${required}`);
  return files.map(file => ({ file, sha256: sha256(sourceBytes(rootPath, file, `package input ${file}`)) }));
}

function assertTrackedAt(rootPath, relative, revision, expectedSha256) {
  assert.equal(git(rootPath, 'ls-files', '--error-unmatch', '--', relative), relative,
    `required bundle source is not versioned: ${relative}`);
  const current = sourceBytes(rootPath, relative, `bundle source ${relative}`);
  assert.equal(sha256(current), expectedSha256, `bundle source differs from manifest: ${relative}`);
  const atRevision = execFileSync('git', ['-C', rootPath, 'show', `${revision}:${relative}`]);
  assert.equal(sha256(atRevision), expectedSha256,
    `bundle source at ${revision} differs from manifest: ${relative}`);
}

function assertBundleSources(rootPath, bundle) {
  for (const source of bundle.sourceFiles)
    assertTrackedAt(rootPath, source.file, bundle.manifest.sourceRevision, source.sha256);
}

function receiptManifestPaths(rootPath, receipt) {
  const cacheRoot = path.join(rootPath, cacheRootRelative);
  const paths = Object.fromEntries(cacheModuleNames.map(name => {
    const relative = receipt.manifests[name].manifestPath;
    const absolute = path.resolve(rootPath, ...relative.split('/'));
    assert.ok(inside(cacheRoot, absolute), `${name} receipt path escapes the v2 cache root`);
    return [name, absolute];
  }));
  return { cacheRoot, paths };
}

function cacheSnapshot(cacheSet) {
  return Object.fromEntries(cacheModuleNames.map(name => [name, {
    manifestSha256: sha256(cacheSet.modules[name].manifestBytes),
    outputBytes: cacheSet.modules[name].bytes.length,
    outputSha256: sha256(cacheSet.modules[name].bytes),
  }]));
}

function assertCacheSet(rootPath, receipt, paths) {
  const verified = verifyCacheSet2032V2({ previewRoot: path.join(rootPath, cacheRootRelative),
    manifestPaths: paths, sourceRoot: rootPath });
  assertReceiptMatchesCacheSet(receipt, verified, paths, rootPath);
  return verified;
}

async function main(argv) {
  process.env.BEND_NO_TELEMETRY = '1';
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw new Error('unexpected network access'); };
  const args = parseArguments(argv);
  const rootPath = root;
  assertPlainPath(rootPath, 'directory', 'repository root');
  assertCleanCheckout(rootPath);
  const inputRoot = path.join(rootPath, inputRootRelative);
  assertIgnored(rootPath, inputRoot, 'v2 bundle input root');
  assertPlainPath(inputRoot, 'directory', 'v2 bundle input root');
  const inputPath = path.resolve(rootPath, args.manifest);
  assert.ok(inside(inputRoot, inputPath), 'bundle manifest is outside the v2 bundle-probe root');
  assert.equal(path.basename(inputPath), 'worker-v2.manifest.json', 'unexpected v2 bundle manifest filename');
  assertPlainPath(inputPath, 'file', 'v2 bundle manifest');
  assertIgnored(rootPath, inputPath, 'v2 bundle manifest');
  const manifestRelativePath = posix(path.relative(rootPath, inputPath));
  const manifestBytes = readPlainFile(inputRoot, inputPath, 'v2 bundle manifest');
  assert.equal(sha256(manifestBytes), args.sha256,
    'bundle manifest raw bytes differ from the independently supplied SHA-256');
  const manifest = exactUtf8Json(manifestBytes, 'v2 bundle manifest');
  assertApprovedBundle(approvedBundle, manifestRelativePath, args.sha256, manifest);

  exactKeys(manifest.independentReceipt, ['path', 'sha256'], 'bundle independent receipt');
  const receiptPath = manifest.independentReceipt.path;
  assert.ok(typeof receiptPath === 'string' && receiptPath.length > 0, 'bundle receipt path is empty');
  assert.equal(path.posix.normalize(receiptPath), receiptPath, 'bundle receipt path is not canonical');
  assert.ok(receiptPath.startsWith('bend2/toolchain-patches/2032/browser-loader-v2/'),
    'bundle receipt is outside browser-loader-v2');
  const receiptFile = path.resolve(rootPath, ...receiptPath.split('/'));
  assert.ok(inside(rootPath, receiptFile), 'bundle receipt path escapes the repository');
  const receiptBytes = readPlainFile(rootPath, receiptFile, 'independent v2 cache receipt');
  assert.equal(sha256(receiptBytes), manifest.independentReceipt.sha256,
    'independent receipt bytes differ from the bundle manifest');
  const receipt = validateReceiptShape(exactUtf8Json(receiptBytes, 'independent v2 cache receipt'));
  assertApprovedReceipt(approvedReceipt, receiptPath, manifest.independentReceipt.sha256, receipt);

  const { paths: manifestPaths } = receiptManifestPaths(rootPath, receipt);
  const verifiedCaches = assertCacheSet(rootPath, receipt, manifestPaths);
  const initialCacheSnapshot = cacheSnapshot(verifiedCaches);

  const toolchain = exactUtf8Json(sourceBytes(rootPath, 'bend2/TOOLCHAIN.json'), 'Bend toolchain pin');
  const runtimeRoot = path.join(rootPath, '.artifacts/toolchains/runtime');
  const bunExe = assertLocalBunRuntime(rootPath, runtimeRoot, process.execPath);
  assert.equal(Bun.version, toolchain.bunVersion, 'Bun version differs from local toolchain pin');
  const bunRuntime = { version: Bun.version, executable: posix(path.relative(rootPath, bunExe)),
    sha256: sha256(readPlainFile(rootPath, bunExe, 'local Bun executable')) };
  const bundleRoot = path.dirname(inputPath);
  const bundle = validateBundleManifest({ manifestBytes, manifestPath: manifestRelativePath,
    suppliedSha256: args.sha256, approval: approvedBundle, receipt, receiptPath,
    receiptSha256: manifest.independentReceipt.sha256, bunRuntime,
    readOutput: file => readPlainFile(bundleRoot, path.join(bundleRoot, file), `Worker bundle ${file}`),
    readSource: file => sourceBytes(rootPath, file, `bundle source ${file}`) });

  const packerRevision = git(rootPath, 'rev-parse', 'HEAD');
  const packerTree = git(rootPath, 'show', '-s', '--format=%T', 'HEAD');
  const revisions = verifyRevisionBinding(bundle.manifest, {
    packerRevision, packerTree,
    commitTree: revision => git(rootPath, 'show', '-s', '--format=%T', revision),
    isAncestor: (ancestor, descendant) => {
      try { execFileSync('git', ['-C', rootPath, 'merge-base', '--is-ancestor', ancestor, descendant], { stdio: 'ignore' }); return true; }
      catch { return false; }
    },
    browserTreeEqual: (bundleRevision, currentRevision) => {
      try { execFileSync('git', ['-C', rootPath, 'diff', '--quiet', bundleRevision, currentRevision,
        '--', 'bend2/platform/browser'], { stdio: 'ignore' }); return true; }
      catch { return false; }
    },
  });
  assertBundleSources(rootPath, bundle);
  const packageInputs = packageSourceSnapshot(rootPath);
  const packerFile = 'bend2/toolchain-patches/2032/browser-preview-v2/pack-static.mjs';
  const packerSha256 = packageInputs.find(item => item.file === packerFile)?.sha256;
  assert.match(packerSha256, sha256Pattern, 'tracked v2 packer source is missing from package snapshot');

  const out = uniqueOutput(rootPath);
  const files = {};
  for (const output of [bundle.outputs['sprite-helper'], bundle.outputs.worker])
    copyFile(rootPath, out, files, output.file,
      posix(path.relative(rootPath, path.join(bundleRoot, output.file))), output.bytes);
  const assets = packageAssets(rootPath, out, files);

  const css = sourceBytes(rootPath, 'bend2/platform/browser/platform.css');
  const cssName = `style-${sha256(css).slice(0, 12)}.css`;
  copyFile(rootPath, out, files, cssName, 'bend2/platform/browser/platform.css', css);
  const host = await buildHost(bundle.outputs.worker.file, rootPath);
  const mainName = `main-${sha256(host).slice(0, 12)}.js`;
  copyFile(rootPath, out, files, mainName, 'bend2/platform/browser/host.ts', host);
  const html = sourceBytes(rootPath, 'bend2/platform/browser/index.html').toString('utf8');
  assert.equal((html.match(/\.\/main\.js/g) ?? []).length, 1,
    'browser HTML must contain exactly one main placeholder');
  assert.equal((html.match(/\.\/style\.css/g) ?? []).length, 1,
    'browser HTML must contain exactly one style placeholder');
  const index = Buffer.from(html.replace('./main.js', `./${mainName}`).replace('./style.css', `./${cssName}`));
  copyFile(rootPath, out, files, 'index.html', 'bend2/platform/browser/index.html', index);
  copyFile(rootPath, out, files, 'THIRD_PARTY_NOTICES.txt', 'bend2/THIRD_PARTY_NOTICES.txt');
  copyFile(rootPath, out, files, 'Bend-Apache-2.0.txt', 'bend2/licenses/Bend-Apache-2.0.txt');
  copyFile(rootPath, out, files, 'Rift-Atlas-Sans-OFL.txt', 'bend2/lib/graphics/v2/OFL.txt');

  const fileMap = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  const version = sha256(Buffer.from(JSON.stringify(fileMap))).slice(0, 20);
  const precache = ['./', './build.json', ...Object.keys(fileMap).sort().map(file => `./${file}`)];
  const swTemplate = sourceBytes(rootPath,
    'bend2/toolchain-patches/2032/browser-preview-v2/sw-v2.template.js').toString('utf8');
  assert.equal((swTemplate.match(/__BEND_BUILD__/g) ?? []).length, 1,
    'v2 service-worker build placeholder differs');
  assert.equal((swTemplate.match(/__BEND_ASSETS__/g) ?? []).length, 1,
    'v2 service-worker precache placeholder differs');
  const sw = Buffer.from(swTemplate.replace('__BEND_BUILD__', version)
    .replace('__BEND_ASSETS__', JSON.stringify(precache)));
  assert.ok(sw.toString('utf8').includes(`const ASSETS = ${JSON.stringify(precache)};`),
    'v2 service-worker precache differs from exact output file list');
  assert.ok(sw.toString('utf8').includes("const SCOPE_CACHE_PREFIX = 'rift-bend-v2-' + encodeURIComponent(self.registration.scope) + '|';") &&
    sw.toString('utf8').includes(`const CACHE = SCOPE_CACHE_PREFIX + '${version}';`) &&
    sw.toString('utf8').includes('name.startsWith(SCOPE_CACHE_PREFIX)'),
  'v2 service worker does not isolate its cache by registration scope');
  assert.ok(!sw.toString('utf8').includes('rift-bend-v1-'),
    'v2 service worker must not evict or reuse the v1 cache namespace');
  writeNewFile(rootPath, out, 'sw.js', sw);
  files['sw.js'] = sha256(sw);

  const assertInputsUnchanged = () => {
    assert.equal(networkCalls, 0, 'static packaging attempted network access');
    assert.equal(sha256(readPlainFile(inputRoot, inputPath, 'v2 bundle manifest')), args.sha256,
      'bundle manifest changed during static packaging');
    assert.equal(sha256(readPlainFile(rootPath, receiptFile, 'independent v2 cache receipt')),
      manifest.independentReceipt.sha256, 'independent receipt changed during static packaging');
    assert.deepEqual(cacheSnapshot(assertCacheSet(rootPath, receipt, manifestPaths)), initialCacheSnapshot,
      'selected 2032-2 caches changed during static packaging');
    assert.deepEqual(packageSourceSnapshot(rootPath), packageInputs,
      'browser, asset, license, or packer source bytes changed during static packaging');
    assertCleanCheckout(rootPath);
    assert.equal(git(rootPath, 'rev-parse', 'HEAD'), packerRevision,
      'source revision changed during static packaging');
    assert.equal(git(rootPath, 'show', '-s', '--format=%T', 'HEAD'), packerTree,
      'source tree changed during static packaging');
    assertBundleSources(rootPath, bundle);
    assert.ok(bundle.outputs.worker.bytes.includes(Buffer.from(bundle.outputs['sprite-helper'].file)),
      'Worker no longer references its sprite helper');
    assert.equal(fs.existsSync(path.join(out, 'worker-libs')), false,
      'static preview must omit bot worker libraries');
    assert.equal(Object.keys(files).some(file => file.includes('prepared-ground')), false,
      'static preview must omit prepared ground');
    for (const [relative, expectedHash] of Object.entries(files))
      assert.equal(sha256(readPlainFile(out, path.join(out, relative), `preview output ${relative}`)),
        expectedHash, `preview output bytes changed: ${relative}`);
  };
  assertInputsUnchanged();

  const build = {
    schema: 'rift-bend-browser-static-preview/2032-2',
    builtAt: new Date().toISOString(), version, ...revisions,
    cacheSchema: 'rift-bend-selected-cache/2032-2',
    cacheSource: receipt.cacheSource,
    cacheManifests: bundle.manifest.cacheManifests,
    packer: { version: '2032-2', file: packerFile, sha256: packerSha256 },
    bundle: { schema: bundleSchema, sourceRevision: revisions.bundleSourceRevision,
      sourceTree: revisions.bundleSourceTree, manifest: manifestRelativePath,
      manifestSha256: bundle.manifestSha256, independentReceipt: manifest.independentReceipt,
      outputs: Object.fromEntries(Object.entries(bundle.outputs).map(([name, item]) => [name,
        { file: item.file, bytes: item.bytes.length, sha256: item.sha256 }])) },
    runtime: bunRuntime, assets,
    host: { entry: 'bend2/platform/browser/host.ts', sha256: sha256(host) },
    files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)),
    networkCalls,
    acceptance: { target: 'hotseat first-render smoke only', preparedGround: false,
      botWorkerLibrary: false, offline: false, rendered: false, fullBrowserAcceptance: false },
    scope: 'ignored local 2.0.32-2 static preview; independently pinned cache and Worker bundle; not published or release-ready',
  };
  const buildBytes = Buffer.from(JSON.stringify(build, null, 2) + '\n');
  finalizeOwnedManifest(path.join(out, 'build.pending'), path.join(out, 'build.json'), buildBytes, {
    verifyTemp: bytes => assert.deepEqual(bytes, buildBytes),
    beforeCommit: assertInputsUnchanged,
  });
  assert.equal(git(rootPath, 'rev-parse', 'HEAD'), packerRevision,
    'source revision changed before static preview handoff');
  assert.equal(git(rootPath, 'show', '-s', '--format=%T', 'HEAD'), packerTree,
    'source tree changed before static preview handoff');
  assertPlainPath(out, 'directory', 'completed v2 static preview');
  console.log(JSON.stringify({ ok: true, preview: posix(path.relative(rootPath, out)), version,
    manifestSha256: bundle.manifestSha256, bundleSourceRevision: revisions.bundleSourceRevision,
    packerRevision, cacheSourceCommit: receipt.cacheSource.commit, files: Object.keys(files),
    scope: build.scope }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  main(process.argv.slice(2)).catch(error => {
    console.error(error?.stack ?? String(error));
    process.exitCode = 1;
  });
