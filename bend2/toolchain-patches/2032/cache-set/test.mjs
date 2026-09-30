import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyCacheSet2032 } from './verify.mjs';
import { createSelectedLoader2032 } from '../browser-loader/loader.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../..');
const previewParent = path.join(repoRoot, '.artifacts/bend2/2032-preview');
const derivedRoot = '.artifacts/bend2/toolchain-patches/derived-2032';
const origin = {
  commit: '6c795db32c7cf5d9abb432b1235fd51e9b417ae4',
  tree: '6db022c0e5d8e80bb10d4072165373bc95fa6ba1',
};
const patchPaths = [
  'bend2/toolchain-patches/001-arity/rebase-2032/0001-arity-diagnostics.patch',
  'bend2/toolchain-patches/002-layout/rebase-2032/0002-after-001-2.0.32.patch',
  'bend2/toolchain-patches/005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch',
  'bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/0004-parser-plan-after-005-2.0.32.patch',
];
const fixedSources = [
  'bend2/tools/selected-modules.mjs',
  'bend2/toolchain-patches/2032/build-adapter/selected-library.mjs',
  'bend2/toolchain-patches/004-web-workers/rebase-2032/selected-module.mjs',
  'bend2/toolchain-patches/2032/preview/emit-menu.mjs',
  'bend2/toolchain-patches/2032/preview/emit-menu.worker.mjs',
  'bend2/toolchain-patches/2032/preview/compiler-eol.mjs',
  'bend2/toolchain-patches/2032/preview/lifecycle.mjs',
];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const posix = (value) => value.split(path.sep).join('/');
const { moduleSpecs } = await import(pathToFileURL(path.join(repoRoot, 'bend2/tools/selected-modules.mjs')).href);

function bytes(relative) { return fs.readFileSync(path.join(repoRoot, ...relative.split('/'))); }

function sourceFiles(name) {
  const found = new Map();
  function visit(file) {
    file = path.resolve(file);
    const relative = posix(path.relative(repoRoot, file));
    if (found.has(relative)) return;
    const content = bytes(relative);
    found.set(relative, sha256(content));
    for (const line of content.toString('utf8').split(/\r?\n/)) {
      const match = /^\s*import\s+([^\s]+)(?:\s+as\s+\w+)?\s*$/.exec(line);
      if (!match) continue;
      const imported = match[1];
      if (imported === 'Base') visit(path.join(repoRoot, derivedRoot, 'bend2/base.bend'));
      else if (imported.startsWith('"') || imported.startsWith("'")) {
        const foreign = imported.slice(1, -1);
        if (/\.(?:js|c)$/.test(foreign)) visit(path.resolve(path.dirname(file), foreign));
      } else visit(path.resolve(path.dirname(file), imported));
    }
  }
  visit(path.join(repoRoot, moduleSpecs[name].entry));
  for (const relative of fixedSources) found.set(relative, sha256(bytes(relative)));
  return [...found].map(([file, hash]) => ({ path: file, sha256: hash })).sort((a, b) => a.path.localeCompare(b.path));
}

function compilerBinding() {
  const files = ['bend2/bend.ts', 'bend2/comp.ts', 'bend2/main.ts'].map((relative) => {
    const content = bytes(`${derivedRoot}/${relative}`);
    const text = content.toString('utf8');
    const crlf = (text.match(/\r\n/g) ?? []).length;
    const bareLf = (text.match(/(?<!\r)\n/g) ?? []).length;
    assert.ok((crlf > 0) !== (bareLf > 0), `fixture compiler EOL is mixed: ${relative}`);
    const normalized = Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8');
    return { path: relative, sha256: sha256(content), normalizedSha256: sha256(normalized), eol: crlf ? 'crlf' : 'lf' };
  });
  assert.equal(new Set(files.map((file) => file.eol)).size, 1);
  return {
    eol: files[0].eol,
    files: files.map(({ eol, ...file }) => file),
  };
}

const compiler = compilerBinding();
const patchBindings = patchPaths.map((file) => ({ path: file, sha256: sha256(bytes(file)) }));
function makeBinding(name) {
  const spec = moduleSpecs[name];
  return {
    upstream: '573002f01ec6c52416d44489543f69a9625facf8',
    canonicalPin: 'd37909174ebd664338ae3194799a9e0899dedd51',
    sourceCommit: origin.commit,
    sourceTree: origin.tree,
    derivedEol: compiler.eol,
    derivedFiles: compiler.files,
    patches: patchBindings,
    sourceFiles: sourceFiles(name),
    module: { name, entry: spec.entry, exports: [...spec.exports] },
  };
}

function memorySample() { return { freeBytes: 3_000_000_000, rssBytes: 128_000_000 }; }
function linkDenied(error) { return ['EPERM', 'EACCES', 'ENOTSUP', 'UNKNOWN', 'EINVAL'].includes(error?.code); }
function removeLink(link) {
  if (!fs.existsSync(link)) return;
  try { fs.rmdirSync(link); } catch { fs.unlinkSync(link); }
}

function createFixture() {
  fs.mkdirSync(previewParent, { recursive: true });
  const root = fs.mkdtempSync(path.join(previewParent, 'cache-set-fixture-'));
  const paths = {};
  for (const name of Object.keys(moduleSpecs)) {
    const runDir = path.join(root, name);
    fs.mkdirSync(runDir);
    const output = Buffer.from(`synthetic verifier fixture for ${name}\n`);
    const binding = makeBinding(name);
    const manifest = {
      schema: 'rift-bend-selected-cache/2032-1',
      module: binding.module,
      bindingSha256: sha256(Buffer.from(JSON.stringify(binding))),
      binding,
      output: { file: `${name}.js`, bytes: output.length, sha256: sha256(output) },
      timing: { elapsedMs: 5, loadMs: 2, emitMs: 1, workerMs: 3 },
      memory: {
        beforeWorker: memorySample(), beforeLoad: memorySample(), afterLoad: memorySample(),
        afterEmit: memorySample(), afterEmission: memorySample(), minimumFreeBytes: 2.5 * 1024 ** 3,
      },
      networkCalls: 0,
      evidence: `one source-bound 2.0.32 ${name} selected-library emission; no whole-app/browser acceptance`,
    };
    fs.writeFileSync(path.join(runDir, `${name}.js`), output);
    const manifestPath = path.join(runDir, `${name}.manifest.json`);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    paths[name] = path.relative(root, manifestPath);
  }
  return {
    root,
    paths,
    manifestPath(name) { return path.join(root, paths[name]); },
    read(name) { return JSON.parse(fs.readFileSync(path.join(root, paths[name]), 'utf8')); },
    write(name, manifest) { fs.writeFileSync(path.join(root, paths[name]), `${JSON.stringify(manifest, null, 2)}\n`); },
    cleanup() {
      const exact = fs.realpathSync(root);
      assert.equal(path.dirname(exact), fs.realpathSync(previewParent),
        'refuse to clean fixture outside preview root');
      assert.match(path.basename(exact), /^cache-set-fixture-[^\\/]+$/);
      const stat = fs.lstatSync(root);
      assert.ok(stat.isDirectory() && !stat.isSymbolicLink(),
        'refuse to clean a replaced fixture root');
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

function expectFailure(label, prepare, pattern) {
  const fixture = createFixture();
  try {
    prepare(fixture);
    assert.throws(() => verifyCacheSet2032({
      previewRoot: fixture.root,
      manifestPaths: fixture.paths,
      sourceRoot: repoRoot,
    }), pattern, label);
  } finally {
    fixture.cleanup();
  }
  console.log(`ok - ${label}`);
}

function editBinding(fixture, name, mutate) {
  const manifest = fixture.read(name);
  mutate(manifest.binding, manifest);
  manifest.bindingSha256 = sha256(Buffer.from(JSON.stringify(manifest.binding)));
  fixture.write(name, manifest);
}

const valid = createFixture();
try {
  const result = verifyCacheSet2032({
    previewRoot: valid.root,
    manifestPaths: valid.paths,
    sourceRoot: repoRoot,
  });
  assert.deepEqual(Object.keys(result.modules), ['menu', 'controller', 'scene', 'chrome']);
  assert.equal(result.commonBinding.sourceCommit, origin.commit);
  assert.equal(result.modules.menu.bytes.toString('utf8'), 'synthetic verifier fixture for menu\n');
  assert.equal(sha256(result.modules.menu.manifestBytes), result.modules.menu.manifestSha256);
  let onLoad;
  createSelectedLoader2032(result).setup({ onLoad(_options, callback) { onLoad = callback; } });
  assert.equal((await onLoad({ path: path.join(repoRoot, moduleSpecs.menu.entry) })).contents,
    'synthetic verifier fixture for menu\n');
  const raw = fs.readFileSync(valid.manifestPath('menu'));
  assert.deepEqual(result.modules.menu.manifestBytes, raw);
  assert.equal(result.modules.menu.manifestSha256, sha256(raw));
  console.log('ok - synthetic four-cache internal consistency; not Linux artifact authenticity');
} finally {
  valid.cleanup();
}

expectFailure('missing module', (fixture) => { delete fixture.paths.chrome; }, /manifestPaths has unexpected fields/);
expectFailure('duplicate module path', (fixture) => { fixture.paths.chrome = fixture.paths.menu; }, /duplicate explicit manifest path/);
expectFailure('mixed source tree', (fixture) => editBinding(fixture, 'scene', (binding) => {
  binding.sourceTree = '0'.repeat(40);
}), /cache source tree differs/);
expectFailure('mixed source commit', (fixture) => editBinding(fixture, 'scene', (binding) => {
  binding.sourceCommit = '0'.repeat(40);
}), /cache was not emitted at source 6c/);
expectFailure('mixed patch stack', (fixture) => editBinding(fixture, 'controller', (binding) => {
  binding.patches[0].sha256 = '0'.repeat(64);
}), /manifest patch stack differs/);
expectFailure('mixed compiler EOL', (fixture) => editBinding(fixture, 'chrome', (binding) => {
  binding.derivedEol = binding.derivedEol === 'lf' ? 'crlf' : 'lf';
}), /manifest EOL differs/);
expectFailure('changed registry hash', (fixture) => editBinding(fixture, 'menu', (binding) => {
  binding.sourceFiles.find((file) => file.path === 'bend2/tools/selected-modules.mjs').sha256 = '0'.repeat(64);
}), /bound source bytes changed/);
expectFailure('changed module source hash', (fixture) => editBinding(fixture, 'scene', (binding) => {
  binding.sourceFiles.find((file) => file.path === binding.module.entry).sha256 = '0'.repeat(64);
}), /bound source bytes changed/);
expectFailure('changed output bytes', (fixture) => {
  fs.writeFileSync(path.join(path.dirname(fixture.manifestPath('chrome')), 'chrome.js'), 'tampered');
}, /chrome output byte count differs|chrome output bytes differ/);
expectFailure('manifest binding tamper', (fixture) => {
  const manifest = fixture.read('menu');
  manifest.bindingSha256 = '0'.repeat(64);
  fixture.write('menu', manifest);
}, /menu binding SHA-256 differs/);
expectFailure('manifest traversal path', (fixture) => {
  fixture.paths.menu = path.join('..', 'outside', 'menu.manifest.json');
}, /manifest path escapes the explicit preview root/);
expectFailure('output traversal name', (fixture) => {
  const manifest = fixture.read('chrome');
  manifest.output.file = '../chrome.js';
  fixture.write('chrome', manifest);
}, /chrome output name differs/);
expectFailure('unordered exports', (fixture) => editBinding(fixture, 'menu', (binding, manifest) => {
  binding.module.exports.reverse();
  manifest.module.exports.reverse();
}), /module differs/);

const symlinkFixture = createFixture();
try {
  const alias = path.join(symlinkFixture.root, 'menu-alias');
  try {
    fs.symlinkSync(path.dirname(symlinkFixture.manifestPath('menu')), alias, 'junction');
    const paths = { ...symlinkFixture.paths, menu: path.join('menu-alias', 'menu.manifest.json') };
    assert.throws(() => verifyCacheSet2032({
      previewRoot: symlinkFixture.root, manifestPaths: paths, sourceRoot: repoRoot,
    }), /reparse point|symbolic link/);
    console.log('ok - symlinked manifest path rejected');
  } catch (error) {
    if (!linkDenied(error)) throw error;
    console.log('skip - OS denied temporary symlink fixture');
  }
} finally {
  symlinkFixture.cleanup();
}

const outputLinkFixture = createFixture();
try {
  const link = path.join(path.dirname(outputLinkFixture.manifestPath('menu')), 'menu.js');
  const target = path.join(path.dirname(outputLinkFixture.manifestPath('chrome')), 'chrome.js');
  try {
    fs.unlinkSync(link);
    fs.symlinkSync(target, link, 'file');
    assert.throws(() => verifyCacheSet2032({
      previewRoot: outputLinkFixture.root,
      manifestPaths: outputLinkFixture.paths,
      sourceRoot: repoRoot,
    }), /reparse point|symbolic link/);
    console.log('ok - symlinked output path rejected');
  } catch (error) {
    if (!linkDenied(error)) throw error;
    console.log('skip - OS denied temporary output symlink fixture');
  }
} finally {
  outputLinkFixture.cleanup();
}

const previewRootFixture = createFixture();
const previewRootAlias = path.join(previewParent, `cache-set-root-alias-${process.pid}`);
try {
  try {
    fs.symlinkSync(previewRootFixture.root, previewRootAlias, 'junction');
    assert.throws(() => verifyCacheSet2032({
      previewRoot: previewRootAlias,
      manifestPaths: previewRootFixture.paths,
      sourceRoot: repoRoot,
    }), /reparse point|noncanonical ancestor/);
    console.log('ok - previewRoot reparse path rejected');
  } catch (error) {
    if (!linkDenied(error)) throw error;
    console.log('skip - OS denied previewRoot reparse fixture');
  }
} finally {
  removeLink(previewRootAlias);
  previewRootFixture.cleanup();
}

const previewAncestorFixture = createFixture();
let previewAncestorAlias;
try {
  const target = path.join(previewAncestorFixture.root, 'menu');
  const nested = path.join(target, 'nested-preview');
  fs.mkdirSync(nested);
  previewAncestorAlias = path.join(previewAncestorFixture.root, 'preview-ancestor');
  try {
    fs.symlinkSync(target, previewAncestorAlias, 'junction');
    assert.throws(() => verifyCacheSet2032({
      previewRoot: path.join(previewAncestorAlias, 'nested-preview'),
      manifestPaths: previewAncestorFixture.paths,
      sourceRoot: repoRoot,
    }), /reparse point|noncanonical ancestor/);
    console.log('ok - previewRoot ancestor reparse path rejected');
  } catch (error) {
    if (!linkDenied(error)) throw error;
    console.log('skip - OS denied previewRoot ancestor fixture');
  }
} finally {
  if (previewAncestorAlias) removeLink(previewAncestorAlias);
  previewAncestorFixture.cleanup();
}

const sourceRootFixture = createFixture();
let sourceRootAlias;
try {
  const target = path.join(sourceRootFixture.root, 'source-target');
  const nested = path.join(target, 'nested');
  fs.mkdirSync(nested, { recursive: true });
  sourceRootAlias = path.join(sourceRootFixture.root, 'source-root-ancestor');
  try {
    fs.symlinkSync(target, sourceRootAlias, 'junction');
    const injectedSourceRoot = path.join(sourceRootAlias, 'nested');
    assert.throws(() => verifyCacheSet2032({
      previewRoot: '.artifacts/bend2/2032-preview',
      manifestPaths: sourceRootFixture.paths,
      sourceRoot: injectedSourceRoot,
    }), /reparse point|noncanonical ancestor/);
    console.log('ok - sourceRoot ancestor reparse path rejected');
  } catch (error) {
    if (!linkDenied(error)) throw error;
    console.log('skip - OS denied sourceRoot ancestor fixture');
  }
} finally {
  if (sourceRootAlias) removeLink(sourceRootAlias);
  sourceRootFixture.cleanup();
}
