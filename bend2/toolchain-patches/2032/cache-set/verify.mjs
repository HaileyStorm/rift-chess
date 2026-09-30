import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const expectedOrigin = Object.freeze({
  commit: '6c795db32c7cf5d9abb432b1235fd51e9b417ae4',
  tree: '6db022c0e5d8e80bb10d4072165373bc95fa6ba1',
});
const expectedUpstream = '573002f01ec6c52416d44489543f69a9625facf8';
const expectedCanonicalPin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const moduleSpecs = Object.freeze({
  menu: Object.freeze({ entry: 'bend2/ui/v2/MenuAA.bend', exports: Object.freeze([
    'font_path', 'font_byte_cap', 'load_font', 'play', 'same_base', 'base_chrome',
    'same_static', 'controls_chrome', 'dynamic_chrome', 'compose', 'render',
  ]) }),
  controller: Object.freeze({ entry: 'bend2/ApplicationControl.bend', exports: Object.freeze([
    'boot_reads', 'dispatch_at', 'dispatch_at_web', 'refine', 'bot_job', 'bot_apply_at',
    'bot_fallback_at', 'storage_key', 'max_file_bytes', 'audio_samples',
  ]) }),
  scene: Object.freeze({ entry: 'bend2/graphics/v2game/BoardScene.bend', exports: Object.freeze([
    'asset_ids', 'load_plates', 'sprite_asset_ids', 'load_sprite_pages',
    'underlay128_asset', 'underlay256_asset', 'underlay512_asset', 'underlay1024_asset',
    'render512_asset', 'render1024_asset', 'underlay256_theme', 'underlay512_theme',
    'underlay1024_theme', 'fast_ground512', 'fast_ground1024', 'settled_ground512',
    'fast_prepare512', 'fast_prepare1024', 'fast_pointer512', 'fast_pointer1024',
    'fast_camera256_for_512', 'fast_camera512', 'fast_camera1024', 'fast_sprite_pieces512',
    'fast_feedback_on_pieces512', 'fast_sprite_feedback_static512', 'sprite_same_placement',
    'sprite_same_ground', 'sprite_camera_only_change', 'nearest2',
  ]) }),
  chrome: Object.freeze({ entry: 'bend2/ui/v2/ChromeRaster.bend', exports: Object.freeze([
    'shell', 'overlay', 'compose',
  ]) }),
});
const patchSpecs = Object.freeze([
  ['bend2/toolchain-patches/001-arity/rebase-2032/0001-arity-diagnostics.patch',
    '98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db'],
  ['bend2/toolchain-patches/002-layout/rebase-2032/0002-after-001-2.0.32.patch',
    '2ed566176148cc1e064d2dae4c806c7912d557e38570ecfa5f47ddd0d78d395d'],
  ['bend2/toolchain-patches/005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch',
    '99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4'],
  ['bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/0004-parser-plan-after-005-2.0.32.patch',
    'bfdd64270c7714376c64a0306a58892d8a872d96f9d4bace0be091bf894fdb13'],
]);
const derivedCompilerFiles = Object.freeze([
  'bend2/bend.ts', 'bend2/comp.ts', 'bend2/main.ts',
]);
const derivedRoot = '.artifacts/bend2/toolchain-patches/derived-2032';
const fixedSources = Object.freeze([
  'bend2/tools/selected-modules.mjs',
  'bend2/toolchain-patches/2032/build-adapter/selected-library.mjs',
  'bend2/toolchain-patches/004-web-workers/rebase-2032/selected-module.mjs',
  'bend2/toolchain-patches/2032/preview/emit-menu.mjs',
  'bend2/toolchain-patches/2032/preview/emit-menu.worker.mjs',
  'bend2/toolchain-patches/2032/preview/compiler-eol.mjs',
  'bend2/toolchain-patches/2032/preview/lifecycle.mjs',
]);
const manifestKeys = [
  'schema', 'module', 'bindingSha256', 'binding', 'output', 'timing', 'memory',
  'networkCalls', 'evidence',
];
const bindingKeys = [
  'upstream', 'canonicalPin', 'sourceCommit', 'sourceTree', 'derivedEol',
  'derivedFiles', 'patches', 'sourceFiles', 'module',
];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const posix = (value) => value.split(path.sep).join('/');

function exactKeys(value, expected, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} has unexpected fields`);
}

function within(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function comparablePath(value) {
  let normalized = path.normalize(value);
  if (process.platform === 'win32') {
    normalized = normalized.replace(/^\\\\\?\\UNC\\/i, '\\\\')
      .replace(/^\\\\\?\\/i, '').toLowerCase();
  }
  return normalized;
}

function assertRealPath(target, label) {
  const actual = fs.realpathSync.native(target);
  assert.equal(comparablePath(actual), comparablePath(target),
    `${label} has a reparse-point or noncanonical ancestor`);
}

function isReparsePoint(stat) {
  const reparseAttribute = typeof stat.attributes === 'bigint'
    ? (stat.attributes & 0x400n) !== 0n
    : typeof stat.attributes === 'number' && (stat.attributes & 0x400) !== 0;
  return stat.isSymbolicLink() || reparseAttribute;
}

function assertCanonicalPath(target, label, expectedType) {
  const absolute = path.resolve(target);
  const parsed = path.parse(absolute);
  let cursor = parsed.root;
  const rootStat = fs.lstatSync(cursor);
  assert.ok(rootStat.isDirectory() && !isReparsePoint(rootStat), `${label} has an unsafe filesystem root`);
  assertRealPath(cursor, label);
  const parts = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  for (const [index, part] of parts.entries()) {
    cursor = path.join(cursor, part);
    const stat = fs.lstatSync(cursor);
    assert.ok(!isReparsePoint(stat), `${label} contains a reparse point`);
    const last = index === parts.length - 1;
    if (!last || expectedType === 'directory')
      assert.ok(stat.isDirectory(), `${label} ancestor is not a directory`);
    else assert.ok(stat.isFile(), `${label} is not a regular file`);
    assertRealPath(cursor, label);
  }
}

function checkedPath(root, target, label, expectedType) {
  assert.ok(within(root, target), `${label} escapes its allowed root`);
  const relative = path.relative(root, target);
  let cursor = root;
  const parts = relative.split(path.sep);
  for (const [index, part] of parts.entries()) {
    cursor = path.join(cursor, part);
    const stat = fs.lstatSync(cursor);
    assert.ok(!isReparsePoint(stat), `${label} contains a reparse point`);
    const last = index === parts.length - 1;
    if (!last) assert.ok(stat.isDirectory(), `${label} parent is not a directory`);
    else if (expectedType === 'directory') assert.ok(stat.isDirectory(), `${label} is not a directory`);
    else assert.ok(stat.isFile(), `${label} is not a regular file`);
  }
  return target;
}

function sameFileIdentity(left, right, label) {
  assert.ok(left.isFile() && right.isFile(), `${label} is not a regular file`);
  assert.ok(left.ino !== 0n && right.ino !== 0n, `${label} filesystem does not expose file identity`);
  assert.equal(left.dev, right.dev, `${label} device changed during read`);
  assert.equal(left.ino, right.ino, `${label} file identity changed during read`);
  assert.equal(left.size, right.size, `${label} size changed during read`);
  assert.equal(left.mtimeNs, right.mtimeNs, `${label} modification time changed during read`);
  assert.equal(left.ctimeNs, right.ctimeNs, `${label} change time changed during read`);
}

function readIdentityCheckedFile(root, target, label) {
  checkedPath(root, target, label, 'file');
  assertRealPath(target, label);
  const before = fs.lstatSync(target, { bigint: true });
  assert.ok(!isReparsePoint(before), `${label} is a reparse point`);
  const noFollow = fs.constants.O_NOFOLLOW ?? 0;
  const fd = fs.openSync(target, fs.constants.O_RDONLY | noFollow);
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    sameFileIdentity(before, opened, label);
    const bytes = fs.readFileSync(fd);
    sameFileIdentity(opened, fs.fstatSync(fd, { bigint: true }), label);
    const afterPath = fs.lstatSync(target, { bigint: true });
    assert.ok(!isReparsePoint(afterPath), `${label} became a reparse point during read`);
    sameFileIdentity(opened, afterPath, label);
    assertRealPath(target, label);
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}

function assertIgnored(root, absolutePath, label) {
  const relative = posix(path.relative(root, absolutePath));
  try {
    execFileSync('git', ['-C', root, 'check-ignore', '--no-index', '--quiet', '--', relative],
      { stdio: 'ignore' });
  } catch {
    assert.fail(`${label} must be ignored by Git: ${relative}`);
  }
}

function sourceBytes(root, relative) {
  assert.ok(typeof relative === 'string' && relative.length > 0 && !relative.includes('\\'),
    'source path must be a nonempty POSIX path');
  assert.equal(path.posix.normalize(relative), relative, `noncanonical source path: ${relative}`);
  assert.ok(!relative.startsWith('/') && !relative.split('/').includes('..'),
    `source path escapes repository: ${relative}`);
  const absolute = path.resolve(root, ...relative.split('/'));
  checkedPath(root, absolute, `source file ${relative}`, 'file');
  return fs.readFileSync(absolute);
}

function collectSourcePaths(root, name) {
  const spec = moduleSpecs[name];
  const found = new Set();
  function visit(absolute) {
    const relative = posix(path.relative(root, absolute));
    if (found.has(relative)) return;
    const bytes = sourceBytes(root, relative);
    found.add(relative);
    for (const line of bytes.toString('utf8').split(/\r?\n/)) {
      const match = /^\s*import\s+([^\s]+)(?:\s+as\s+\w+)?\s*$/.exec(line);
      if (!match) continue;
      const imported = match[1];
      if (imported === 'Base') {
        visit(path.resolve(root, derivedRoot, 'bend2/base.bend'));
      } else if (imported.startsWith('"') || imported.startsWith("'")) {
        const foreign = imported.slice(1, -1);
        if (/\.(?:js|c)$/.test(foreign)) visit(path.resolve(path.dirname(absolute), foreign));
      } else {
        visit(path.resolve(path.dirname(absolute), imported));
      }
    }
  }
  visit(path.resolve(root, spec.entry));
  for (const relative of fixedSources) {
    sourceBytes(root, relative);
    found.add(relative);
  }
  return [...found].sort();
}

function validateOriginSourceFiles(root, relativePaths) {
  if (relativePaths.length === 0) return;
  const committed = git(root, 'ls-tree', '-r', '--name-only', expectedOrigin.commit, '--', ...relativePaths)
    .split(/\r?\n/).filter(Boolean).sort();
  assert.deepEqual(committed, relativePaths, 'source 6c does not contain the complete bound source closure');
  try {
    execFileSync('git', ['-C', root, 'diff', '--quiet', expectedOrigin.commit, '--', ...relativePaths],
      { stdio: 'ignore' });
  } catch {
    assert.fail('bound tracked source bytes changed since source 6c');
  }
}

function validateDerivedCompiler(root, binding) {
  assert.ok(binding.derivedEol === 'lf' || binding.derivedEol === 'crlf', 'unknown derived compiler EOL');
  const modes = new Set();
  const files = derivedCompilerFiles.map((relative) => {
    const bytes = sourceBytes(root, `${derivedRoot}/${relative}`);
    const text = bytes.toString('utf8');
    const crlf = (text.match(/\r\n/g) ?? []).length;
    const bareLf = (text.match(/(?<!\r)\n/g) ?? []).length;
    assert.ok((crlf > 0) !== (bareLf > 0), `mixed or absent compiler EOL: ${relative}`);
    const eol = crlf ? 'crlf' : 'lf';
    modes.add(eol);
    return {
      path: relative,
      sha256: sha256(bytes),
      normalizedSha256: sha256(Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8')),
    };
  });
  assert.equal(modes.size, 1, 'derived compiler files have inconsistent EOL modes');
  assert.equal(binding.derivedEol, [...modes][0], 'manifest EOL differs from current derived compiler');
  assert.deepEqual(binding.derivedFiles, files, 'derived compiler bytes differ from manifest');
}

function validatePatches(root, binding) {
  const expected = patchSpecs.map(([relative, expectedHash]) => {
    const actual = sha256(sourceBytes(root, relative));
    assert.equal(actual, expectedHash, `reviewed patch bytes changed: ${relative}`);
    return { path: relative, sha256: actual };
  });
  assert.deepEqual(binding.patches, expected, 'manifest patch stack differs from 001->002->005->004');
}

function validateSourceClosure(root, name, binding, expectedPaths) {
  assert.ok(Array.isArray(binding.sourceFiles), 'binding.sourceFiles must be an array');
  const actual = new Map();
  for (const file of binding.sourceFiles) {
    exactKeys(file, ['path', 'sha256'], 'sourceFiles entry');
    assert.match(file.sha256, /^[0-9a-f]{64}$/, `invalid source SHA-256: ${file.path}`);
    assert.ok(!actual.has(file.path), `duplicate bound source file: ${file.path}`);
    actual.set(file.path, file.sha256);
  }
  assert.deepEqual([...actual.keys()].sort(), expectedPaths,
    `source closure differs from current ${name} module imports/helpers`);
  for (const relative of expectedPaths) {
    const currentHash = sha256(sourceBytes(root, relative));
    assert.equal(actual.get(relative), currentHash, `bound source bytes changed: ${relative}`);
  }
  const registryHash = actual.get('bend2/tools/selected-modules.mjs');
  assert.ok(registryHash, 'selected-module registry is missing from source closure');
  return registryHash;
}

function resolveExplicitPath(previewRoot, value, label) {
  assert.ok(typeof value === 'string' && value.length > 0, `${label} must be an explicit path`);
  const absolute = path.isAbsolute(value) ? path.resolve(value) : path.resolve(previewRoot, value);
  assert.ok(within(previewRoot, absolute), `${label} escapes the explicit preview root`);
  return absolute;
}

function validateManifest(root, previewRoot, name, manifestPath, expectedPaths) {
  assert.equal(path.basename(manifestPath), `${name}.manifest.json`, `${name} manifest has wrong name`);
  checkedPath(previewRoot, manifestPath, `${name} manifest`, 'file');
  assertIgnored(root, manifestPath, `${name} manifest`);
  const manifestBytes = readIdentityCheckedFile(previewRoot, manifestPath, `${name} manifest`);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  exactKeys(manifest, manifestKeys, `${name} manifest`);
  assert.equal(manifest.schema, 'rift-bend-selected-cache/2032-1', 'unsupported cache manifest schema');
  assert.equal(manifest.networkCalls, 0, 'cache manifest records network access');
  assert.equal(manifest.evidence,
    `one source-bound 2.0.32 ${name} selected-library emission; no whole-app/browser acceptance`,
    'cache evidence statement is unexpected');
  assert.ok(manifest.timing && typeof manifest.timing === 'object' && !Array.isArray(manifest.timing),
    'manifest timing must be an object');
  assert.ok(manifest.memory && typeof manifest.memory === 'object' && !Array.isArray(manifest.memory),
    'manifest memory must be an object');
  exactKeys(manifest.timing, ['elapsedMs', 'loadMs', 'emitMs', 'workerMs'], `${name} timing`);
  for (const [field, value] of Object.entries(manifest.timing))
    assert.ok(Number.isSafeInteger(value) && value >= 0, `${name} timing.${field} is invalid`);
  exactKeys(manifest.memory, ['beforeWorker', 'beforeLoad', 'afterLoad', 'afterEmit',
    'afterEmission', 'minimumFreeBytes'], `${name} memory`);
  assert.equal(manifest.memory.minimumFreeBytes, 2.5 * 1024 ** 3,
    `${name} memory admission floor differs`);
  for (const field of ['beforeWorker', 'beforeLoad', 'afterLoad', 'afterEmit', 'afterEmission']) {
    exactKeys(manifest.memory[field], ['freeBytes', 'rssBytes'], `${name} memory.${field}`);
    for (const [metric, value] of Object.entries(manifest.memory[field]))
      assert.ok(Number.isSafeInteger(value) && value > 0, `${name} memory.${field}.${metric} is invalid`);
  }
  assert.ok(manifest.output && typeof manifest.output === 'object' && !Array.isArray(manifest.output),
    'manifest output must be an object');
  exactKeys(manifest.output, ['file', 'bytes', 'sha256'], `${name} output`);
  assert.equal(manifest.output.file, `${name}.js`, `${name} output name differs`);
  assert.ok(Number.isSafeInteger(manifest.output.bytes) && manifest.output.bytes > 0,
    `${name} output byte count is invalid`);
  assert.match(manifest.output.sha256, /^[0-9a-f]{64}$/, `${name} output hash is invalid`);
  const outputPath = path.join(path.dirname(manifestPath), manifest.output.file);
  checkedPath(previewRoot, outputPath, `${name} output`, 'file');
  assertIgnored(root, outputPath, `${name} output`);
  const bytes = readIdentityCheckedFile(previewRoot, outputPath, `${name} output`);
  assert.equal(bytes.length, manifest.output.bytes, `${name} output byte count differs`);
  assert.equal(sha256(bytes), manifest.output.sha256, `${name} output bytes differ`);

  const spec = moduleSpecs[name];
  const expectedModule = { name, entry: spec.entry, exports: [...spec.exports] };
  assert.deepEqual(manifest.module, expectedModule, `${name} manifest module differs`);
  exactKeys(manifest.binding, bindingKeys, `${name} binding`);
  assert.deepEqual(manifest.binding.module, expectedModule, `${name} binding module differs`);
  assert.equal(manifest.bindingSha256, sha256(Buffer.from(JSON.stringify(manifest.binding))),
    `${name} binding SHA-256 differs`);
  assert.equal(manifest.binding.upstream, expectedUpstream, 'wrong 2.0.32 upstream source');
  assert.equal(manifest.binding.canonicalPin, expectedCanonicalPin, 'canonical Bend pin differs');
  assert.equal(manifest.binding.sourceCommit, expectedOrigin.commit, 'cache was not emitted at source 6c');
  assert.equal(manifest.binding.sourceTree, expectedOrigin.tree, 'cache source tree differs from source 6c');
  validateDerivedCompiler(root, manifest.binding);
  validatePatches(root, manifest.binding);
  const registryHash = validateSourceClosure(root, name, manifest.binding, expectedPaths);
  const pin = JSON.parse(sourceBytes(root, 'bend2/TOOLCHAIN.json').toString('utf8'));
  assert.equal(pin.bendCommit, expectedCanonicalPin, 'current canonical TOOLCHAIN pin differs');
  return { manifest, manifestBytes, manifestSha256: sha256(manifestBytes), bytes, registryHash };
}

export function verifyCacheSet2032({ previewRoot: requestedPreviewRoot, manifestPaths, sourceRoot = repoRoot } = {}) {
  assert.ok(typeof requestedPreviewRoot === 'string' && requestedPreviewRoot.length > 0,
    'previewRoot must be explicit');
  const root = path.resolve(sourceRoot);
  const previewRoot = path.resolve(root, requestedPreviewRoot);
  assertCanonicalPath(root, 'sourceRoot', 'directory');
  assert.ok(within(root, previewRoot), 'previewRoot must be inside sourceRoot');
  assertCanonicalPath(previewRoot, 'previewRoot', 'directory');
  assertIgnored(root, previewRoot, 'previewRoot');

  exactKeys(manifestPaths, Object.keys(moduleSpecs), 'manifestPaths');
  const head = git(root, 'rev-parse', 'HEAD');
  assert.equal(path.resolve(git(root, 'rev-parse', '--show-toplevel')), root,
    'sourceRoot must be the Git repository root');
  assert.equal(git(root, 'show', '-s', '--format=%T', expectedOrigin.commit), expectedOrigin.tree,
    'source 6c commit/tree provenance is unavailable');
  try {
    execFileSync('git', ['-C', root, 'merge-base', '--is-ancestor', expectedOrigin.commit, head],
      { stdio: 'ignore' });
  } catch {
    assert.fail('source 6c must remain an ancestor of the current repository HEAD');
  }
  const sourcePathsByModule = Object.fromEntries(Object.keys(moduleSpecs)
    .map((name) => [name, collectSourcePaths(root, name)]));
  const trackedSourcePaths = [...new Set(Object.values(sourcePathsByModule).flat()
    .filter((relative) => !relative.startsWith('.artifacts/')))].sort();
  validateOriginSourceFiles(root, trackedSourcePaths);

  const resolved = new Map();
  for (const name of Object.keys(moduleSpecs)) {
    const manifestPath = resolveExplicitPath(previewRoot, manifestPaths[name], `${name} manifest path`);
    const key = process.platform === 'win32' ? manifestPath.toLowerCase() : manifestPath;
    assert.ok(!resolved.has(key), `duplicate explicit manifest path for ${name} and ${resolved.get(key)}`);
    resolved.set(key, name);
  }
  const modules = {};
  let common;
  let registryHash;
  for (const name of Object.keys(moduleSpecs)) {
    const result = validateManifest(root, previewRoot, name,
      resolveExplicitPath(previewRoot, manifestPaths[name], `${name} manifest path`),
      sourcePathsByModule[name]);
    const binding = result.manifest.binding;
    const currentCommon = {
      upstream: binding.upstream,
      canonicalPin: binding.canonicalPin,
      sourceCommit: binding.sourceCommit,
      sourceTree: binding.sourceTree,
      derivedEol: binding.derivedEol,
      derivedFiles: binding.derivedFiles,
      patches: binding.patches,
    };
    if (common === undefined) {
      common = currentCommon;
      registryHash = result.registryHash;
    } else {
      assert.deepEqual(currentCommon, common, 'cache set mixes source/compiler/EOL/patch bindings');
      assert.equal(result.registryHash, registryHash, 'cache set mixes selected-module registry hashes');
    }
    modules[name] = {
      bytes: result.bytes,
      manifest: result.manifest,
      manifestBytes: result.manifestBytes,
      manifestSha256: result.manifestSha256,
    };
  }
  assert.equal(git(root, 'rev-parse', 'HEAD'), head, 'repository HEAD changed during cache verification');
  return { modules, commonBinding: common, registrySha256: registryHash };
}
