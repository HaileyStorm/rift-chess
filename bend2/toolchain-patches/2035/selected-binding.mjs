import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { root, moduleSpecs } from '../../tools/selected-modules.mjs';

export { root, moduleSpecs };
export const candidateCommit = '79df8d9c40722ee9507a1e253f283b51025f9d6c';
export const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2035-source-loader');
export const previewRoot = path.join(root, '.artifacts/bend2/2035-preview');
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const here = 'bend2/toolchain-patches/2035/';
const upstream = path.join(root, '.artifacts/toolchains/bend-2.0.35-scout/bend2');
const pinned = {
  'bend.ts': '7deae3693eb896f33c73867081b99d2c6f3ed3b57e77e55eb5f6260840dd0e63',
  'comp.ts': '32fb66e09f608ce9e4b173384bcfeec453db8c5bc96650e26ad861bef815a8d9',
  'main.ts': 'd1a3e026f5014f8daec3614df8e39cf261e3fbc47769eb0916fd891bc18703c9',
  'base.bend': 'c742fae9c49b14f0cc9128429a2c6109364c8a933a142f2c90b9f2e5fd976661',
};
const loaderHash = '250c5e2b02e64aff5656f6bea7368ff0a1bcb25e0c1b0fe7661c87e588a3c82e';
const helpers = {
  [here + 'windows-source-loader.mjs']: 'cb59652fcb01896b6b19fc685b930f7e660e7de3e4253976e3ef35ade5e799d3',
  'bend2/toolchain-patches/2032/tag-identity/preload-root.mjs': '8fbf6eb7be20273edc02706cbadd8182d79fa020b91075da6dc652e76158c733',
  'bend2/toolchain-patches/004-web-workers/rebase-2032/selected-module.mjs': '1508c2620714fd0f96b531400510f1cf997671ec1a0dbc074a35484c24fc84c7',
  'bend2/toolchain-patches/005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch':
    '99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4',
};
const relative = file => path.relative(root, file).split(path.sep).join('/');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

export function readSource(file) {
  const absolute = path.resolve(file);
  const rel = path.relative(root, absolute);
  assert.ok(rel !== '' && rel !== '..' && !rel.startsWith('..' + path.sep)
    && !path.isAbsolute(rel), 'binding input escaped repository');
  assert.equal(fs.realpathSync(absolute), absolute, 'binding input is redirected');
  const before = fs.lstatSync(absolute, { bigint: true });
  assert.ok(before.isFile() && !before.isSymbolicLink(), 'binding input is not regular');
  const fd = fs.openSync(absolute, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const same = stat => {
    assert.ok(stat.isFile() && !stat.isSymbolicLink());
    for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'])
      assert.equal(stat[key], before[key], `binding file changed during read: ${relative(absolute)}`);
  };
  try {
    same(fs.fstatSync(fd, { bigint: true }));
    const bytes = fs.readFileSync(fd);
    same(fs.fstatSync(fd, { bigint: true }));
    same(fs.lstatSync(absolute, { bigint: true }));
    assert.equal(fs.realpathSync(absolute), absolute);
    return bytes;
  } finally { fs.closeSync(fd); }
}
function filesUnder(dir, prefix = '') {
  assert.equal(fs.realpathSync(dir), path.resolve(dir), 'compiler source directory is redirected');
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => compare(a.name, b.name))
    .flatMap(entry => {
      assert.ok(!entry.isSymbolicLink(), 'compiler source is linked');
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) return filesUnder(file, prefix + entry.name + '/');
      assert.ok(entry.isFile(), 'compiler source is not regular');
      return [{ path: prefix + entry.name, sha256: sha256(readSource(file)) }];
    });
}
function sourceClosure(entry) {
  const found = new Map();
  function visit(file) {
    file = path.resolve(file);
    if (found.has(file)) return;
    const bytes = readSource(file);
    found.set(file, sha256(bytes));
    for (const line of bytes.toString('utf8').split(/\r?\n/)) {
      const match = /^\s*import\s+(\S+)(?:\s+as\s+\w+)?\s*(?:#.*)?$/.exec(line);
      if (!match) continue;
      const spec = match[1];
      if (spec === 'Base') visit(path.join(derived, 'bend2/base.bend'));
      else if (spec.startsWith('"')) {
        assert.ok(/^"\.\.?\/[^"\\]+\.(?:js|c)"$/.test(spec), 'unsupported foreign source import');
        visit(path.resolve(path.dirname(file), spec.slice(1, -1)));
      } else {
        assert.ok(/^\.\.?\/[^\\]+\.bend$/.test(spec), 'nonlocal selected source import');
        visit(path.resolve(path.dirname(file), spec));
      }
    }
  }
  visit(path.join(root, entry));
  return [...found].map(([file, hash]) => ({ path: relative(file), sha256: hash }))
    .sort((a, b) => compare(a.path, b.path));
}

export function selectedBinding2035(name, diagnostic = false) {
  const registered = moduleSpecs[name];
  assert.ok(registered, 'unknown selected module');
  const module = diagnostic
    ? { name: 'scene-source-diagnostic', entry: 'bend2/graphics/Scene.bend',
      exports: ['square_file', 'square_row'] }
    : { name, entry: registered.entry, exports: [...registered.exports] };
  assert.ok(!diagnostic || name === 'scene', 'only the small scene diagnostic is supported');
  const pristineFiles = filesUnder(upstream);
  const derivedFiles = filesUnder(path.join(derived, 'bend2'));
  assert.equal(pristineFiles.length, 97, 'pristine compiler source inventory changed');
  assert.deepEqual(derivedFiles.map(file => file.path), pristineFiles.map(file => file.path));
  for (const file of pristineFiles) {
    if (pinned[file.path]) assert.equal(file.sha256, pinned[file.path], 'candidate source preimage changed');
    const actual = derivedFiles.find(item => item.path === file.path);
    assert.equal(actual.sha256, file.path === 'bend.ts' ? loaderHash : file.sha256,
      `derived compiler source changed: ${file.path}`);
  }
  const sourceFiles = sourceClosure(module.entry);
  for (const file of [
    ...Object.keys(helpers), here + 'emit-selected.mjs', here + 'selected-binding.mjs',
    'bend2/tools/selected-modules.mjs', 'bend2/tools/bend.mjs', 'bend2/tools/loader.ts',
    'bend2/TOOLCHAIN.json', 'bend2/toolchain-patches/2032/preview/lifecycle.mjs',
    'bend2/toolchain-patches/2032/browser-loader/runtime.mjs',
  ]) {
    const hash = sha256(readSource(path.join(root, file)));
    if (helpers[file]) assert.equal(hash, helpers[file], `candidate helper changed: ${file}`);
    sourceFiles.push({ path: file, sha256: hash });
  }
  const pin = JSON.parse(readSource(path.join(root, 'bend2/TOOLCHAIN.json')));
  assert.equal(pin.bendCommit, 'd37909174ebd664338ae3194799a9e0899dedd51', 'accepted pin changed');
  return { schema: 'rift-bend-2035-selected-binding/1', upstream: candidateCommit,
    canonicalPin: pin.bendCommit, bunVersion: pin.bunVersion, module,
    pristineFiles, derivedFiles, sourceFiles: sourceFiles.sort((a, b) => compare(a.path, b.path)),
    tagIdentity: 'stable-imports-empty-root/1',
    provenance: 'exact key-source hashes and pristine/derived byte comparison; root owns Git revision verification' };
}
