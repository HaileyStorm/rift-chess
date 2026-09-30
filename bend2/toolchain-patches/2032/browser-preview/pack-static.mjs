import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyCacheSet2032 } from '../cache-set/verify.mjs';
import { linuxSelectedReceipt } from '../browser-loader/linux-receipt.mjs';
import { assertLocalBunRuntime } from '../browser-loader/runtime.mjs';
import { finalizeOwnedManifest } from '../preview/lifecycle.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const bundleSchema = 'rift-bend-2032-worker-bundle-probe/1';
export const bundleScope = 'mixed-revision selected-cache Worker bundles when sourceRevision differs from cacheSourceCommit; not a served, rendered, interactive, GPU/native, published or pin-adopted app';
export const bundleSourceFiles = Object.freeze([
  'bend2/toolchain-patches/2032/browser-loader/loader.mjs',
  'bend2/toolchain-patches/2032/browser-loader/bundle-real.mjs',
  'bend2/toolchain-patches/2032/cache-set/verify.mjs',
  'bend2/toolchain-patches/2032/preview/lifecycle.mjs',
  'bend2/toolchain-patches/2032/browser-loader/linux-receipt.mjs',
  'bend2/toolchain-patches/2032/browser-loader/runtime.mjs',
  'bend2/platform/browser/worker-v2.ts',
  'bend2/platform/browser/sprite-helper.ts',
]);

const inputRootRelative = '.artifacts/bend2/2032-browser-probe';
const cacheRootRelative = '.artifacts/bend2/2032-preview';
const outputRootRelative = '.artifacts/bend2/2032-static-preview';
const shaPattern = /^[0-9a-f]{64}$/;
const revisionPattern = /^[0-9a-f]{40}$/;
const names = ['menu', 'controller', 'scene', 'chrome'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const posix = value => value.split(path.sep).join('/');

function exactKeys(value, keys, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} has unexpected fields`);
}

function inside(parent, target) {
  const relative = path.relative(parent, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function reparse(stat) {
  const attributes = typeof stat.attributes === 'bigint' ? stat.attributes
    : typeof stat.attributes === 'number' ? BigInt(stat.attributes) : 0n;
  return stat.isSymbolicLink() || (attributes & 0x400n) !== 0n;
}

function comparable(value) {
  let result = path.normalize(value);
  if (process.platform === 'win32') result = result.replace(/^\\\\\?\\/i, '').toLowerCase();
  return result;
}

function assertSamePath(target, label) {
  assert.equal(comparable(fs.realpathSync.native(target)), comparable(target), `${label} has a reparse-point ancestor`);
}

export function assertPlainPath(target, kind, label) {
  const absolute = path.resolve(target);
  const parsed = path.parse(absolute);
  let cursor = parsed.root;
  const rootStat = fs.lstatSync(cursor);
  assert.ok(rootStat.isDirectory() && !reparse(rootStat), `${label} has an unsafe filesystem root`);
  assertSamePath(cursor, label);
  const parts = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  for (const [index, part] of parts.entries()) {
    cursor = path.join(cursor, part);
    const stat = fs.lstatSync(cursor);
    assert.ok(!reparse(stat), `${label} contains a reparse point`);
    const last = index === parts.length - 1;
    if (!last || kind === 'directory') assert.ok(stat.isDirectory(), `${label} ancestor is not a directory`);
    else assert.ok(stat.isFile(), `${label} is not a regular file`);
    assertSamePath(cursor, label);
  }
}

function safeRelative(rootPath, relative, label) {
  assert.ok(typeof relative === 'string' && relative.length > 0 && !relative.includes('\\'), `${label} must be a nonempty POSIX path`);
  assert.equal(path.posix.normalize(relative), relative, `${label} is not canonical`);
  assert.ok(!relative.startsWith('/') && !relative.split('/').some(part => part === '..' || part === '.'), `${label} escapes its root`);
  const absolute = path.resolve(rootPath, ...relative.split('/'));
  assert.ok(inside(rootPath, absolute), `${label} escapes its root`);
  return absolute;
}

export function readPlainFile(rootPath, target, label) {
  const absoluteRoot = path.resolve(rootPath);
  const absolute = path.resolve(target);
  assert.ok(inside(absoluteRoot, absolute), `${label} escapes its allowed root`);
  assertPlainPath(absolute, 'file', label);
  const before = fs.lstatSync(absolute, { bigint: true });
  const noFollow = fs.constants.O_NOFOLLOW ?? 0;
  const fd = fs.openSync(absolute, fs.constants.O_RDONLY | noFollow);
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    assert.ok(opened.isFile() && !reparse(opened), `${label} is not a regular file`);
    assert.equal(opened.dev, before.dev, `${label} changed while opening`);
    assert.equal(opened.ino, before.ino, `${label} changed while opening`);
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    assert.equal(after.dev, opened.dev, `${label} changed while reading`);
    assert.equal(after.ino, opened.ino, `${label} changed while reading`);
    assert.equal(after.size, opened.size, `${label} changed while reading`);
    assertPlainPath(absolute, 'file', label);
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function sourceFile(rootPath, relative, label) {
  const absolute = safeRelative(rootPath, relative, label);
  return readPlainFile(rootPath, absolute, label);
}

function expectedCacheMap(receipt = linuxSelectedReceipt) {
  return Object.fromEntries(names.map(name => {
    const item = receipt[name];
    return [name, { path: item.manifest, sha256: item.manifestSha256,
      outputSha256: item.outputSha256 }];
  }));
}

export function assertPinnedCacheSet(cacheSet, receipt = linuxSelectedReceipt) {
  for (const name of names) {
    const item = cacheSet.modules?.[name];
    const expected = receipt[name];
    assert.ok(item && expected, `missing pinned selected cache: ${name}`);
    assert.ok(Buffer.isBuffer(item.manifestBytes) && Buffer.isBuffer(item.bytes),
      `missing exact selected cache bytes: ${name}`);
    assert.equal(sha(item.manifestBytes), expected.manifestSha256,
      `raw Linux cache manifest differs: ${name}`);
    assert.equal(item.bytes.length, expected.bytes,
      `Linux selected cache byte count differs: ${name}`);
    assert.equal(sha(item.bytes), expected.outputSha256,
      `Linux selected cache output differs: ${name}`);
  }
}

export function verifyWorkerBundle({ manifestPath, expectedManifestSha256, repositoryRoot, expected }) {
  const rootPath = path.resolve(repositoryRoot);
  assertPlainPath(rootPath, 'directory', 'repository root');
  assert.match(expectedManifestSha256, shaPattern, 'independent manifest SHA-256 is invalid');
  const allowedInputRoot = path.resolve(rootPath, inputRootRelative);
  const absoluteManifest = path.resolve(manifestPath);
  assert.ok(inside(allowedInputRoot, absoluteManifest), 'bundle manifest is outside the local bundle-probe root');
  assert.equal(path.basename(absoluteManifest), 'worker.manifest.json', 'unexpected bundle manifest filename');
  const manifestBytes = readPlainFile(allowedInputRoot, absoluteManifest, 'bundle manifest');
  assert.equal(sha(manifestBytes), expectedManifestSha256, 'bundle manifest raw bytes differ from the independently provided SHA-256');
  const manifestText = manifestBytes.toString('utf8');
  assert.deepEqual(Buffer.from(manifestText, 'utf8'), manifestBytes, 'bundle manifest is not valid exact UTF-8');
  const manifest = JSON.parse(manifestText);
  exactKeys(manifest, ['schema', 'sourceRevision', 'sourceTree', 'cacheSourceCommit', 'compilerEol',
    'bunRuntime', 'cacheManifests', 'outputs', 'sourceFiles', 'networkCalls', 'scope'], 'bundle manifest');
  assert.equal(manifest.schema, bundleSchema, 'unsupported worker bundle schema');
  assert.equal(manifest.scope, bundleScope, 'worker bundle scope differs');
  assert.equal(manifest.networkCalls, 0, 'worker bundle records network access');
  assert.equal(manifest.compilerEol, 'lf', 'worker bundle does not use the reported Linux LF compiler');
  for (const field of ['sourceRevision', 'sourceTree', 'cacheSourceCommit'])
    assert.match(manifest[field], revisionPattern, `invalid ${field}`);
  assert.equal(manifest.cacheSourceCommit, expected.cacheSourceCommit, 'worker bundle cache source revision differs from the verified cache set');

  exactKeys(manifest.bunRuntime, ['version', 'executable', 'sha256'], 'bundle Bun runtime');
  assert.equal(manifest.bunRuntime.version, expected.bunRuntime.version, 'bundle Bun version differs');
  assert.equal(manifest.bunRuntime.executable, expected.bunRuntime.executable, 'bundle Bun executable path differs');
  assert.equal(manifest.bunRuntime.sha256, expected.bunRuntime.sha256, 'bundle Bun executable hash differs');
  assert.match(manifest.bunRuntime.sha256, shaPattern, 'invalid Bun runtime SHA-256');

  exactKeys(manifest.cacheManifests, names, 'bundle cache manifests');
  assert.deepEqual(manifest.cacheManifests, expected.cacheManifests, 'bundle cache manifest pins differ from the independent Linux receipt');

  assert.ok(Array.isArray(manifest.sourceFiles), 'bundle sourceFiles must be an array');
  assert.equal(manifest.sourceFiles.length, bundleSourceFiles.length, 'bundle source file count differs');
  const verifiedSources = [];
  for (const [index, entry] of manifest.sourceFiles.entries()) {
    exactKeys(entry, ['file', 'sha256'], 'bundle source file');
    assert.equal(entry.file, bundleSourceFiles[index], 'bundle source file order or path differs');
    assert.match(entry.sha256, shaPattern, `invalid source SHA-256: ${entry.file}`);
    const bytes = sourceFile(rootPath, entry.file, `bundle source ${entry.file}`);
    assert.equal(sha(bytes), entry.sha256, `bundle source bytes differ: ${entry.file}`);
    verifiedSources.push({ file: entry.file, sha256: entry.sha256 });
  }

  assert.ok(Array.isArray(manifest.outputs) && manifest.outputs.length === 2, 'worker bundle must contain exactly two JavaScript outputs');
  const outputNames = ['sprite-helper', 'worker'];
  const outputs = {};
  for (const [index, entry] of manifest.outputs.entries()) {
    exactKeys(entry, ['file', 'bytes', 'sha256'], 'worker bundle output');
    const prefix = outputNames[index];
    assert.match(entry.file, new RegExp(`^${prefix}-[0-9a-f]{12}\\.js$`), `invalid ${prefix} output path`);
    assert.ok(Number.isSafeInteger(entry.bytes) && entry.bytes > 0, `invalid ${prefix} output byte count`);
    assert.match(entry.sha256, shaPattern, `invalid ${prefix} output SHA-256`);
    assert.equal(entry.file.slice(prefix.length + 1, -3), entry.sha256.slice(0, 12), `${prefix} content name differs from its hash`);
    const outputPath = path.join(path.dirname(absoluteManifest), entry.file);
    assert.ok(inside(allowedInputRoot, outputPath), `${prefix} output escapes the bundle-probe root`);
    const bytes = readPlainFile(allowedInputRoot, outputPath, `${prefix} output`);
    assert.equal(bytes.length, entry.bytes, `${prefix} output byte count differs`);
    assert.equal(sha(bytes), entry.sha256, `${prefix} output bytes differ`);
    outputs[prefix] = { file: entry.file, bytes, sha256: entry.sha256 };
  }
  assert.ok(outputs.worker.bytes.includes(Buffer.from(outputs['sprite-helper'].file)),
    'worker bundle does not reference its source-bound sprite helper');
  return { manifest, manifestBytes, manifestSha256: sha(manifestBytes), outputs, sourceFiles: verifiedSources };
}

export function verifyRevisionBinding(manifest, { packerRevision, packerTree, commitTree, isAncestor, browserTreeEqual }) {
  assert.match(manifest.sourceRevision, revisionPattern, 'invalid bundle source revision');
  assert.match(manifest.sourceTree, revisionPattern, 'invalid bundle source tree');
  assert.match(packerRevision, revisionPattern, 'invalid packer source revision');
  assert.match(packerTree, revisionPattern, 'invalid packer source tree');
  assert.equal(commitTree(manifest.sourceRevision), manifest.sourceTree, 'bundle source tree does not match its Git commit');
  assert.equal(isAncestor(manifest.sourceRevision, packerRevision), true,
    'bundle source revision is not an ancestor of the packer checkout');
  assert.equal(browserTreeEqual(manifest.sourceRevision, packerRevision), true,
    'browser source closure changed between worker bundling and static packaging');
  return { bundleSourceRevision: manifest.sourceRevision, bundleSourceTree: manifest.sourceTree,
    packerRevision, packerTree };
}

function git(rootPath, ...args) {
  return execFileSync('git', ['-C', rootPath, ...args], { encoding: 'utf8' }).trim();
}

function assertIgnored(rootPath, absolutePath, label) {
  const relative = posix(path.relative(rootPath, absolutePath));
  try {
    execFileSync('git', ['-C', rootPath, 'check-ignore', '--no-index', '--quiet', '--', relative], { stdio: 'ignore' });
  } catch {
    assert.fail(`${label} must be ignored by Git: ${relative}`);
  }
}

function ensureDirectory(rootPath, relative, label) {
  const target = safeRelative(rootPath, relative, label);
  let cursor = rootPath;
  for (const part of path.relative(rootPath, target).split(path.sep)) {
    cursor = path.join(cursor, part);
    try { fs.mkdirSync(cursor); }
    catch (error) { if (error?.code !== 'EEXIST') throw error; }
    const stat = fs.lstatSync(cursor);
    assert.ok(stat.isDirectory() && !reparse(stat), `${label} contains a non-directory or reparse path`);
    assertSamePath(cursor, label);
  }
  return target;
}

export function writeNewFile(rootPath, outputDirectory, relative, bytes) {
  const target = safeRelative(outputDirectory, relative, 'output file path');
  assert.ok(inside(outputDirectory, target), 'output file escapes the unique preview directory');
  const parentRelative = path.relative(rootPath, path.dirname(target)).split(path.sep).join('/');
  ensureDirectory(rootPath, parentRelative, 'preview output directory');
  const fd = fs.openSync(target, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o600);
  try {
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  assertPlainPath(target, 'file', 'new preview file');
  const saved = readPlainFile(outputDirectory, target, 'new preview file');
  assert.equal(sha(saved), sha(bytes), 'new preview file bytes differ after write');
  return target;
}

function json(bytes, label) {
  try { return JSON.parse(bytes.toString('utf8')); }
  catch (error) { throw new Error(`${label} is invalid JSON: ${error.message}`); }
}

function repoBytes(rootPath, relative) {
  return sourceFile(rootPath, relative, `source ${relative}`);
}

function digestFile(rootPath, relative) {
  return sha(repoBytes(rootPath, relative));
}

function copyFile(rootPath, out, files, destination, source, bytes = repoBytes(rootPath, source)) {
  writeNewFile(rootPath, out, destination, bytes);
  files[destination] = sha(bytes);
  return bytes;
}

function underAssets(rootPath, relative, label) {
  const assetsRoot = path.resolve(rootPath, 'bend2/assets');
  const target = path.resolve(assetsRoot, ...relative.split('/'));
  assert.ok(inside(assetsRoot, target), `${label} escapes the asset root`);
  assert.equal(relative.includes('\\'), false, `${label} has a non-POSIX path`);
  assert.ok(!relative.split('/').some(part => part === '..'), `${label} escapes the asset root`);
  return target;
}

export function packageAssets(rootPath, out, files) {
  const assetRoot = path.join(rootPath, 'bend2/assets');
  const artManifestBytes = repoBytes(rootPath, 'bend2/assets/MANIFEST.json');
  const artManifest = json(artManifestBytes, 'observatory asset manifest');
  assert.equal(artManifest.schema, 'rift-bend-art-assets/1', 'unknown observatory asset manifest');
  exactKeys(artManifest.assets, ['observatory-astral', 'observatory-stone'], 'observatory assets');
  const assets = {};
  for (const id of ['observatory-astral', 'observatory-stone']) {
    const record = artManifest.assets[id];
    exactKeys(record, ['source', 'sourceSha256', 'sourceSize', 'runtime', 'runtimeSha256', 'runtimeBytes', 'depth', 'derivedBy'], `${id} record`);
    assert.equal(record.source, `source/${id}.png`, `${id} source path differs`);
    assert.deepEqual(record.sourceSize, [1254, 1254], `${id} source dimensions differ`);
    assert.equal(record.runtime, `runtime/${id}.rga`, `${id} runtime path differs`);
    assert.equal(record.runtimeBytes, 786437, `${id} runtime byte count differs`);
    assert.equal(record.depth, 9, `${id} runtime depth differs`);
    const source = readPlainFile(assetRoot, underAssets(rootPath, record.source, `${id} source`), `${id} source`);
    const runtime = readPlainFile(assetRoot, underAssets(rootPath, record.runtime, `${id} runtime`), `${id} runtime`);
    assert.equal(sha(source), record.sourceSha256, `${id} source bytes differ`);
    assert.equal(runtime.length, record.runtimeBytes, `${id} runtime byte count differs`);
    assert.equal(sha(runtime), record.runtimeSha256, `${id} runtime bytes differ`);
    const destination = `assets/${id}.rga`;
    copyFile(rootPath, out, files, destination, record.runtime, runtime);
    assets[id] = { source: record.source, sourceSha256: record.sourceSha256,
      runtime: record.runtime, runtimeSha256: record.runtimeSha256, runtimeBytes: runtime.length };
  }
  const assetLicenses = copyFile(rootPath, out, files, 'assets/LICENSES.md', 'bend2/assets/LICENSES.md');
  assets.manifestSha256 = sha(artManifestBytes);
  assets.licensesSha256 = sha(assetLicenses);

  const fontManifestBytes = repoBytes(rootPath, 'bend2/ui/v2/fonts/packed-manifest.json');
  const font = json(fontManifestBytes, 'packed font manifest');
  assert.equal(font.schema, 'rift-observatory-font-pack/1', 'unknown packed font manifest');
  assert.equal(font.output, 'bend2/assets/runtime/rift-observatory-font.rga', 'font output path differs');
  assert.equal(font.source, 'bend2/assets/source/fonts/dm-sans-pinned.ttf', 'font source path differs');
  assert.equal(font.bytes, 151343, 'packed font byte count differs');
  assert.equal(font.coverage_bits, 8, 'packed font coverage differs');
  assert.equal(font.records, 242, 'packed font record count differs');
  const fontSource = repoBytes(rootPath, font.source);
  const fontRuntime = repoBytes(rootPath, font.output);
  assert.equal(sha(fontSource), font.source_sha256, 'font source bytes differ');
  assert.equal(fontRuntime.length, font.bytes, 'packed font byte count differs');
  assert.equal(sha(fontRuntime), font.output_sha256, 'packed font bytes differ');
  assert.equal(digestFile(rootPath, 'bend2/assets/source/fonts/OFL.txt'), digestFile(rootPath, 'bend2/lib/graphics/v2/OFL.txt'), 'font OFL bytes differ from the graphics license');
  copyFile(rootPath, out, files, 'assets/rift-observatory-font.rga', font.output, fontRuntime);
  assets.font = { source: font.source, sourceSha256: font.source_sha256,
    runtime: font.output, runtimeSha256: font.output_sha256, runtimeBytes: fontRuntime.length,
    manifestSha256: sha(fontManifestBytes) };

  const pieceManifestBytes = repoBytes(rootPath, 'bend2/assets/source/pieces/manifest.json');
  const pieces = json(pieceManifestBytes, 'interactive piece manifest');
  const tier = pieces.tiers?.interactive;
  assert.equal(pieces.format, 'rift-chess-piece-art-source-v1', 'unknown piece-art manifest');
  assert.equal(pieces.source?.path, '../chess-piece-atlas.png', 'piece source path differs');
  assert.equal(tier?.depth, 7, 'interactive piece depth differs');
  assert.equal(tier?.totalBytes, 196623, 'interactive piece tier byte count differs');
  assert.equal(tier?.deploymentIntegrated, true, 'interactive piece tier is not deployment-integrated');
  assert.equal(tier?.pages?.length, 3, 'interactive piece page count differs');
  const pieceSource = readPlainFile(assetRoot, underAssets(rootPath, 'source/chess-piece-atlas.png', 'piece source'), 'piece source');
  assert.equal(sha(pieceSource), pieces.source.sha256, 'piece source bytes differ');
  assets.pieces = { source: 'source/chess-piece-atlas.png', sourceSha256: pieces.source.sha256,
    manifestSha256: sha(pieceManifestBytes), pages: [] };
  for (let index = 0; index < 3; index++) {
    const page = tier.pages[index];
    assert.equal(page.path, `../../runtime/pieces/pieces-fast-${index}.rga`, `piece page ${index} path differs`);
    assert.equal(page.bytes, 65541, `piece page ${index} byte count differs`);
    const pagePath = path.resolve(path.dirname(path.join(assetRoot, 'source/pieces/manifest.json')), ...page.path.split('/'));
    assert.ok(inside(assetRoot, pagePath), `piece page ${index} escapes the asset root`);
    const bytes = readPlainFile(assetRoot, pagePath, `piece page ${index}`);
    assert.equal(bytes.length, page.bytes, `piece page ${index} byte count differs`);
    assert.equal(sha(bytes), page.sha256, `piece page ${index} bytes differ`);
    const destination = `assets/pieces-fast-${index}.rga`;
    copyFile(rootPath, out, files, destination, `runtime/pieces/pieces-fast-${index}.rga`, bytes);
    assets.pieces.pages.push({ file: destination, bytes: bytes.length, sha256: page.sha256 });
  }
  return assets;
}

function outputParent(rootPath) {
  const parent = path.join(rootPath, outputRootRelative);
  assertIgnored(rootPath, parent, 'static preview output root');
  ensureDirectory(rootPath, outputRootRelative, 'static preview output root');
  assertPlainPath(parent, 'directory', 'static preview output root');
  return parent;
}

function uniqueOutput(rootPath) {
  const parent = outputParent(rootPath);
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const run = `run-${stamp}-${process.pid}-${randomUUID()}`;
  const directory = path.join(parent, run);
  fs.mkdirSync(directory);
  assertPlainPath(directory, 'directory', 'unique preview output');
  return directory;
}

function currentCacheSet(rootPath) {
  const cacheRoot = path.join(rootPath, cacheRootRelative);
  const manifestPaths = Object.fromEntries(names.map(name => {
    const absolute = path.resolve(rootPath, linuxSelectedReceipt[name].manifest);
    assert.ok(inside(cacheRoot, absolute), `${name} Linux receipt path escapes cache root`);
    return [name, posix(path.relative(cacheRoot, absolute))];
  }));
  return verifyCacheSet2032({ previewRoot: cacheRoot, manifestPaths, sourceRoot: rootPath });
}

function assertCleanPackageSources(rootPath) {
  const paths = ['bend2/platform/browser', 'bend2/assets',
    'bend2/ui/v2/fonts/packed-manifest.json', 'bend2/lib/graphics/v2/OFL.txt',
    'bend2/TOOLCHAIN.json',
    'bend2/THIRD_PARTY_NOTICES.txt', 'bend2/licenses/Bend-Apache-2.0.txt',
    'bend2/toolchain-patches/2032/browser-preview',
    'bend2/toolchain-patches/2032/cache-set/verify.mjs',
    'bend2/toolchain-patches/2032/browser-loader/linux-receipt.mjs',
    'bend2/toolchain-patches/2032/browser-loader/runtime.mjs',
    'bend2/toolchain-patches/2032/preview/lifecycle.mjs'];
  const dirty = git(rootPath, 'status', '--porcelain', '--untracked-files=all', '--', ...paths);
  assert.equal(dirty, '', 'browser, asset, and license inputs must be clean before static packaging');
  for (const relative of [
    'bend2/toolchain-patches/2032/browser-preview/pack-static.mjs',
    'bend2/toolchain-patches/2032/cache-set/verify.mjs',
    'bend2/toolchain-patches/2032/browser-loader/linux-receipt.mjs',
    'bend2/toolchain-patches/2032/browser-loader/runtime.mjs',
    'bend2/toolchain-patches/2032/preview/lifecycle.mjs',
  ]) {
    execFileSync('git', ['-C', rootPath, 'cat-file', '-e', `HEAD:${relative}`], { stdio: 'ignore' });
    execFileSync('git', ['-C', rootPath, 'diff', '--quiet', 'HEAD', '--', relative], { stdio: 'ignore' });
  }
}

function packageSourceSnapshot(rootPath) {
  const scopes = ['bend2/platform/browser', 'bend2/assets',
    'bend2/ui/v2/fonts/packed-manifest.json', 'bend2/lib/graphics/v2/OFL.txt',
    'bend2/THIRD_PARTY_NOTICES.txt', 'bend2/licenses/Bend-Apache-2.0.txt',
    'bend2/TOOLCHAIN.json', 'bend2/toolchain-patches/2032/browser-preview',
    'bend2/toolchain-patches/2032/cache-set/verify.mjs',
    'bend2/toolchain-patches/2032/browser-loader/linux-receipt.mjs',
    'bend2/toolchain-patches/2032/browser-loader/runtime.mjs',
    'bend2/toolchain-patches/2032/preview/lifecycle.mjs'];
  const files = execFileSync('git', ['-C', rootPath, 'ls-files', '-z', '--', ...scopes],
    { encoding: 'utf8' }).split('\0').filter(Boolean).sort();
  assert.ok(files.includes('bend2/toolchain-patches/2032/browser-preview/pack-static.mjs'),
    'static preview packer is not tracked in the source commit');
  return files.map(file => ({ file, sha256: sha(sourceFile(rootPath, file, `package input ${file}`)) }));
}

async function buildHost(workerFile) {
  assert.equal(typeof Bun?.build, 'function', 'run with the repository-local Bun runtime');
  const result = await Bun.build({ target: 'browser', format: 'esm', splitting: false, minify: true,
    entrypoints: [path.join(root, 'bend2/platform/browser/host.ts')],
    define: { __BEND_WORKER__: JSON.stringify(`./${workerFile}`) } });
  assert.equal(result.success, true, result.logs.map(String).join('\n'));
  assert.equal(result.outputs.length, 1, 'host bundle must contain one output');
  assert.ok(result.outputs[0].path.endsWith('.js'), 'host bundle output is not JavaScript');
  return Buffer.from(await result.outputs[0].arrayBuffer());
}

function parseArguments(argv) {
  assert.equal(argv.length, 4, 'pass exactly --manifest <path> --sha256 <independent manifest SHA-256>');
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    assert.ok(key === '--manifest' || key === '--sha256', `unknown option: ${key}`);
    assert.ok(!Object.hasOwn(values, key), `duplicate option: ${key}`);
    values[key] = argv[index + 1];
  }
  assert.ok(values['--manifest'] && values['--sha256'], 'both manifest path and SHA-256 are required');
  return { manifest: values['--manifest'], sha256: values['--sha256'] };
}

async function main(argv) {
  process.env.BEND_NO_TELEMETRY = '1';
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw new Error('unexpected network access'); };
  const args = parseArguments(argv);
  const toolchain = json(repoBytes(root, 'bend2/TOOLCHAIN.json'), 'Bend toolchain pin');
  const runtimeRoot = path.join(root, '.artifacts/toolchains/runtime');
  const bunExe = assertLocalBunRuntime(root, runtimeRoot, process.execPath);
  assert.equal(Bun.version, toolchain.bunVersion, 'Bun version differs from the local toolchain pin');
  const bunRuntime = { version: Bun.version,
    executable: posix(path.relative(root, bunExe)), sha256: sha(readPlainFile(root, bunExe, 'local Bun executable')) };

  const cacheSet = currentCacheSet(root);
  assertPinnedCacheSet(cacheSet);
  const expected = {
    packerRevision: git(root, 'rev-parse', 'HEAD'),
    packerTree: git(root, 'show', '-s', '--format=%T', 'HEAD'),
    cacheSourceCommit: cacheSet.commonBinding.sourceCommit,
    bunRuntime,
    cacheManifests: expectedCacheMap(),
  };
  const inputPath = path.resolve(root, args.manifest);
  const inputRoot = path.join(root, inputRootRelative);
  assertIgnored(root, inputRoot, 'bundle-probe input root');
  assertPlainPath(inputRoot, 'directory', 'bundle-probe input root');
  const verified = verifyWorkerBundle({ manifestPath: inputPath,
    expectedManifestSha256: args.sha256, repositoryRoot: root, expected });
  assert.deepEqual(verified.manifest.cacheManifests, expected.cacheManifests);
  assertCleanPackageSources(root);
  const packageInputs = packageSourceSnapshot(root);
  const packerFile = 'bend2/toolchain-patches/2032/browser-preview/pack-static.mjs';
  const packerSha256 = packageInputs.find(item => item.file === packerFile)?.sha256;
  assert.match(packerSha256, shaPattern, 'tracked packer source is missing from input snapshot');
  const revisions = verifyRevisionBinding(verified.manifest, {
    packerRevision: expected.packerRevision,
    packerTree: expected.packerTree,
    commitTree: revision => git(root, 'show', '-s', '--format=%T', revision),
    isAncestor: (ancestor, descendant) => {
      try { execFileSync('git', ['-C', root, 'merge-base', '--is-ancestor', ancestor, descendant], { stdio: 'ignore' }); return true; }
      catch { return false; }
    },
    browserTreeEqual: (bundleRevision, packerRevision) => {
      try { execFileSync('git', ['-C', root, 'diff', '--quiet', bundleRevision, packerRevision, '--', 'bend2/platform/browser'], { stdio: 'ignore' }); return true; }
      catch { return false; }
    },
  });

  const out = uniqueOutput(root);
  const files = {};
  copyFile(root, out, files, verified.outputs['sprite-helper'].file,
    path.relative(root, path.join(path.dirname(inputPath), verified.outputs['sprite-helper'].file)).split(path.sep).join('/'),
    verified.outputs['sprite-helper'].bytes);
  copyFile(root, out, files, verified.outputs.worker.file,
    path.relative(root, path.join(path.dirname(inputPath), verified.outputs.worker.file)).split(path.sep).join('/'),
    verified.outputs.worker.bytes);
  const assets = packageAssets(root, out, files);

  const css = repoBytes(root, 'bend2/platform/browser/platform.css');
  const cssName = `style-${sha(css).slice(0, 12)}.css`;
  copyFile(root, out, files, cssName, 'bend2/platform/browser/platform.css', css);
  const host = await buildHost(verified.outputs.worker.file);
  const mainName = `main-${sha(host).slice(0, 12)}.js`;
  copyFile(root, out, files, mainName, 'bend2/platform/browser/host.ts', host);
  const html = repoBytes(root, 'bend2/platform/browser/index.html').toString('utf8');
  assert.equal((html.match(/\.\/main\.js/g) ?? []).length, 1, 'browser HTML must contain exactly one main placeholder');
  assert.equal((html.match(/\.\/style\.css/g) ?? []).length, 1, 'browser HTML must contain exactly one style placeholder');
  const index = Buffer.from(html.replace('./main.js', `./${mainName}`).replace('./style.css', `./${cssName}`));
  copyFile(root, out, files, 'index.html', 'bend2/platform/browser/index.html', index);
  copyFile(root, out, files, 'THIRD_PARTY_NOTICES.txt', 'bend2/THIRD_PARTY_NOTICES.txt');
  copyFile(root, out, files, 'Bend-Apache-2.0.txt', 'bend2/licenses/Bend-Apache-2.0.txt');
  copyFile(root, out, files, 'Rift-Atlas-Sans-OFL.txt', 'bend2/lib/graphics/v2/OFL.txt');

  const fileMap = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  const version = sha(Buffer.from(JSON.stringify(fileMap))).slice(0, 20);
  const precache = ['./', './build.json', ...Object.keys(fileMap).sort().map(file => `./${file}`)];
  const swTemplate = repoBytes(root, 'bend2/platform/browser/sw.js').toString('utf8');
  assert.equal((swTemplate.match(/__BEND_BUILD__/g) ?? []).length, 1, 'service worker build placeholder differs');
  assert.equal((swTemplate.match(/__BEND_ASSETS__/g) ?? []).length, 1, 'service worker precache placeholder differs');
  const sw = Buffer.from(swTemplate.replace('__BEND_BUILD__', version).replace('__BEND_ASSETS__', JSON.stringify(precache)));
  assert.ok(sw.toString('utf8').includes(`const ASSETS = ${JSON.stringify(precache)};`), 'service worker precache differs from exact output file list');
  writeNewFile(root, out, 'sw.js', sw);
  files['sw.js'] = sha(sw);

  assert.equal(networkCalls, 0, 'static preview packaging attempted network access');
  assert.deepEqual(packageSourceSnapshot(root), packageInputs,
    'browser, asset or packer source bytes changed during static packaging');
  assertCleanPackageSources(root);
  assert.equal(git(root, 'rev-parse', 'HEAD'), revisions.packerRevision, 'packer HEAD changed during static packaging');
  assert.equal(git(root, 'show', '-s', '--format=%T', 'HEAD'), revisions.packerTree, 'packer source tree changed during static packaging');
  assert.equal(fs.existsSync(path.join(out, 'worker-libs')), false, 'static preview must omit bot worker libraries');
  assert.equal(Object.keys(files).some(file => file.includes('prepared-ground')), false, 'static preview must omit prepared ground');
  const build = {
    schema: 'rift-bend-browser-static-preview/2032-1',
    builtAt: new Date().toISOString(),
    version,
    ...revisions,
    cacheSourceCommit: expected.cacheSourceCommit,
    packer: { version: '2032-1', file: packerFile, sha256: packerSha256 },
    bundle: { schema: bundleSchema, sourceRevision: revisions.bundleSourceRevision,
      sourceTree: revisions.bundleSourceTree, manifest: posix(path.relative(root, inputPath)), manifestSha256: verified.manifestSha256,
      outputs: Object.fromEntries(Object.entries(verified.outputs).map(([name, item]) => [name,
        { file: item.file, bytes: item.bytes.length, sha256: item.sha256 }])), cacheManifests: expected.cacheManifests },
    runtime: bunRuntime,
    assets,
    host: { entry: 'bend2/platform/browser/host.ts', sha256: sha(host) },
    files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)),
    networkCalls,
    acceptance: { target: 'hotseat first-render smoke only', preparedGround: false,
      botWorkerLibrary: false, offline: false, rendered: false, fullBrowserAcceptance: false },
    scope: 'ignored local static preview; source-bound 2.0.32 selected-cache bundle plus current browser host; not published or release-ready',
  };
  const buildBytes = Buffer.from(JSON.stringify(build, null, 2) + '\n');
  finalizeOwnedManifest(path.join(out, 'build.pending'), path.join(out, 'build.json'), buildBytes, {
    verifyTemp: bytes => assert.deepEqual(bytes, buildBytes),
    beforeCommit: () => {
      assert.deepEqual(packageSourceSnapshot(root), packageInputs,
        'browser, asset or packer source bytes changed before final build manifest');
      assertCleanPackageSources(root);
      assert.equal(git(root, 'rev-parse', 'HEAD'), revisions.packerRevision,
        'packer HEAD changed before final build manifest');
      assert.equal(git(root, 'show', '-s', '--format=%T', 'HEAD'), revisions.packerTree,
        'packer tree changed before final build manifest');
      for (const [relative, expectedHash] of Object.entries(files))
        assert.equal(sha(readPlainFile(out, path.join(out, relative), `preview output ${relative}`)),
          expectedHash, `preview output bytes changed: ${relative}`);
    },
  });
  assert.equal(git(root, 'rev-parse', 'HEAD'), revisions.packerRevision, 'packer HEAD changed before handoff');
  assert.equal(git(root, 'show', '-s', '--format=%T', 'HEAD'), revisions.packerTree, 'packer source tree changed before handoff');
  assertPlainPath(out, 'directory', 'completed static preview');
  console.log(JSON.stringify({ ok: true, preview: posix(path.relative(root, out)), version,
    manifestSha256: verified.manifestSha256, bundleSourceRevision: revisions.bundleSourceRevision,
    packerRevision: revisions.packerRevision,
    cacheSourceCommit: expected.cacheSourceCommit, files: Object.keys(files), scope: build.scope }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error?.stack ?? String(error));
    process.exitCode = 1;
  });
}
