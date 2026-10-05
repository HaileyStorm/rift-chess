import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { moduleSpecs } from '../../../tools/selected-modules.mjs';
import { stableDirectImports } from '../tag-identity/preload-root.mjs';
import { verifyCacheSet2032V2 } from './verify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../..');
const previewParent = path.join(repoRoot, '.artifacts/bend2/2032-preview-v2-candidate-fixtures');
const derivedRoot = '.artifacts/bend2/toolchain-patches/derived-2032';
const origin = {
  commit: '03469c025ea6429cde5bab9c61b0ee304acd57be',
  tree: 'd881f9c09f7f9be20e4d6652c0a1e881f873972b',
};
const currentHead = execFileSync('git', ['-C', repoRoot, 'rev-parse', 'HEAD'],
  { encoding: 'utf8' }).trim();
const currentTree = execFileSync('git', ['-C', repoRoot, 'show', '-s', '--format=%T', currentHead],
  { encoding: 'utf8' }).trim();
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
  'bend2/toolchain-patches/2032/tag-identity/preload-root.mjs',
  'bend2/toolchain-patches/2032/preview/emit-menu.mjs',
  'bend2/toolchain-patches/2032/preview/emit-menu.worker.mjs',
  'bend2/toolchain-patches/2032/preview/compiler-eol.mjs',
  'bend2/toolchain-patches/2032/preview/lifecycle.mjs',
];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const posix = value => value.split(path.sep).join('/');
function bytes(relative) {
  return fs.readFileSync(path.join(repoRoot, ...relative.split('/')));
}

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
      if (imported === 'Base') {
        visit(path.join(repoRoot, derivedRoot, 'bend2/base.bend'));
      } else if (imported.startsWith('"') || imported.startsWith("'")) {
        const foreign = imported.slice(1, -1);
        if (/\.(?:js|c)$/.test(foreign)) visit(path.resolve(path.dirname(file), foreign));
      } else {
        visit(path.resolve(path.dirname(file), imported));
      }
    }
  }
  visit(path.join(repoRoot, moduleSpecs[name].entry));
  for (const relative of fixedSources) found.set(relative, sha256(bytes(relative)));
  return [...found].map(([file, hash]) => ({ path: file, sha256: hash }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function compilerBinding() {
  const files = ['bend2/bend.ts', 'bend2/comp.ts', 'bend2/main.ts'].map(relative => {
    const content = bytes(derivedRoot + '/' + relative);
    const text = content.toString('utf8');
    const crlf = (text.match(/\r\n/g) ?? []).length;
    const bareLf = (text.match(/(?<!\r)\n/g) ?? []).length;
    assert.ok((crlf > 0) !== (bareLf > 0), 'fixture compiler EOL is mixed: ' + relative);
    const normalized = Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8');
    return {
      path: relative,
      sha256: sha256(content),
      normalizedSha256: sha256(normalized),
      eol: crlf ? 'crlf' : 'lf',
    };
  });
  assert.equal(new Set(files.map(file => file.eol)).size, 1);
  return { eol: files[0].eol, files: files.map(({ eol, ...file }) => file) };
}

const patchBindings = patchPaths.map(file => ({ path: file, sha256: sha256(bytes(file)) }));
function makeBinding(name) {
  const spec = moduleSpecs[name];
  return {
    upstream: '573002f01ec6c52416d44489543f69a9625facf8',
    canonicalPin: 'd37909174ebd664338ae3194799a9e0899dedd51',
    sourceCommit: origin.commit,
    sourceTree: origin.tree,
    derivedEol: compilerBinding().eol,
    derivedFiles: compilerBinding().files,
    patches: patchBindings,
    sourceFiles: sourceFiles(name),
    module: { name, entry: spec.entry, exports: [...spec.exports] },
    tagIdentity: 'stable-imports-empty-root/1',
  };
}

function makeTagIdentity(name, closure) {
  const direct = stableDirectImports(path.resolve(repoRoot, moduleSpecs[name].entry),
    path.resolve(repoRoot, 'bend2'));
  return {
    policy: 'stable-imports-empty-root/1',
    preloaded: direct.imports.map(({ relative, namespace }) => [relative, namespace]),
    rootNamespace: '',
    loadedBendFiles: closure.filter(file => file.path.endsWith('.bend')).length,
  };
}

function moduleBytes(spec) {
  const entries = spec.exports.map(name =>
    '  ' + JSON.stringify(name) + ': run_lib((...args) => args, 1),');
  return Buffer.from('export default {\n' + entries.join('\n') + '\n};\n', 'utf8');
}

function memorySample() {
  return { freeBytes: 3_000_000_000, rssBytes: 128_000_000 };
}

function createFixture() {
  fs.mkdirSync(previewParent, { recursive: true });
  assert.equal(fs.realpathSync(previewParent), previewParent,
    'synthetic fixture parent must be canonical');
  const parentStat = fs.lstatSync(previewParent);
  assert.ok(parentStat.isDirectory() && !parentStat.isSymbolicLink(),
    'synthetic fixture parent must be a real directory');
  const root = fs.mkdtempSync(path.join(previewParent, 'cache-set-v2-fixture-'));
  const paths = {};
  for (const name of Object.keys(moduleSpecs)) {
    const runDir = path.join(root, name);
    fs.mkdirSync(runDir);
    const binding = makeBinding(name);
    const closure = binding.sourceFiles;
    const output = moduleBytes(moduleSpecs[name]);
    const tagIdentity = makeTagIdentity(name, closure);
    const manifest = {
      schema: 'rift-bend-selected-cache/2032-2',
      module: binding.module,
      bindingSha256: sha256(Buffer.from(JSON.stringify(binding))),
      binding,
      tagIdentity,
      output: { file: name + '.js', bytes: output.length, sha256: sha256(output) },
      timing: { elapsedMs: 5, loadMs: 2, emitMs: 1, workerMs: 3 },
      memory: {
        beforeWorker: memorySample(),
        beforeLoad: memorySample(),
        afterLoad: memorySample(),
        afterEmit: memorySample(),
        afterEmission: memorySample(),
        minimumFreeBytes: 2.5 * 1024 ** 3,
      },
      networkCalls: 0,
      evidence: 'one source-bound 2.0.32 ' + name +
        ' selected-library emission; no whole-app/browser acceptance',
    };
    fs.writeFileSync(path.join(runDir, name + '.js'), output);
    const manifestPath = path.join(runDir, name + '.manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    paths[name] = path.relative(root, manifestPath);
  }
  return {
    root,
    paths,
    manifestPath(name) { return path.join(root, paths[name]); },
    read(name) { return JSON.parse(fs.readFileSync(path.join(root, paths[name]), 'utf8')); },
    write(name, manifest) {
      fs.writeFileSync(path.join(root, paths[name]), JSON.stringify(manifest, null, 2) + '\n');
    },
    setOutput(name, output) {
      const manifest = this.read(name);
      fs.writeFileSync(path.join(path.dirname(this.manifestPath(name)), name + '.js'), output);
      manifest.output.bytes = output.length;
      manifest.output.sha256 = sha256(output);
      this.write(name, manifest);
    },
    cleanup() {
      const exact = fs.realpathSync(root);
      assert.equal(path.dirname(exact), fs.realpathSync(previewParent),
        'refuse to clean fixture outside its synthetic parent');
      assert.match(path.basename(exact), /^cache-set-v2-fixture-[^\\/]+$/);
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
    const manifestPaths = prepare(fixture) ?? fixture.paths;
    assert.throws(() => verifyCacheSet2032V2({
      previewRoot: fixture.root,
      manifestPaths,
      sourceRoot: repoRoot,
    }), pattern, label);
  } finally {
    fixture.cleanup();
  }
  console.log('rejected synthetic tamper - ' + label);
}

function editBinding(fixture, name, mutate) {
  const manifest = fixture.read(name);
  mutate(manifest.binding, manifest);
  manifest.bindingSha256 = sha256(Buffer.from(JSON.stringify(manifest.binding)));
  fixture.write(name, manifest);
}

let rejectedLinkControls = 0;
const skippedLinkControls = [];
function expectLinkFailure(label, prepare) {
  const fixture = createFixture();
  try {
    let options;
    try {
      options = prepare(fixture);
    } catch (error) {
      if (!['EPERM', 'EACCES', 'ENOTSUP', 'UNKNOWN', 'EINVAL'].includes(error?.code)) throw error;
      skippedLinkControls.push(label);
      console.log('skip - OS denied temporary link fixture: ' + label);
      return;
    }
    assert.throws(() => verifyCacheSet2032V2({
      previewRoot: fixture.root,
      manifestPaths: fixture.paths,
      sourceRoot: repoRoot,
      ...options,
    }), /reparse point|symbolic link|noncanonical ancestor/, label);
    rejectedLinkControls++;
    console.log('rejected filesystem link - ' + label);
  } finally {
    fixture.cleanup();
  }
}

expectFailure('legacy schema', fixture => {
  const manifest = fixture.read('menu');
  manifest.schema = 'rift-bend-selected-cache/2032-1';
  fixture.write('menu', manifest);
}, /unsupported cache manifest schema/);

expectFailure('stable policy tamper', fixture => {
  const manifest = fixture.read('menu');
  manifest.tagIdentity.policy = 'other-policy';
  fixture.write('menu', manifest);
}, /stable-import policy differs/);

expectFailure('stable preload namespace tamper', fixture => {
  const manifest = fixture.read('controller');
  manifest.tagIdentity.preloaded[0][1] = 'wrong_namespace';
  fixture.write('controller', manifest);
}, /stable preloaded import closure differs/);

expectFailure('nonempty selected root namespace', fixture => {
  const manifest = fixture.read('chrome');
  manifest.tagIdentity.rootNamespace = 'ChromeRaster';
  fixture.write('chrome', manifest);
}, /selected root namespace is not empty/);

expectFailure('wrong loaded Bend closure count', fixture => {
  const manifest = fixture.read('scene');
  manifest.tagIdentity.loadedBendFiles++;
  fixture.write('scene', manifest);
}, /loaded Bend source count differs/);

expectFailure('binding policy tamper', fixture => {
  editBinding(fixture, 'menu', binding => { binding.tagIdentity = 'other-policy'; });
}, /binding stable-import policy differs/);

expectFailure('missing preloader helper from source closure', fixture => {
  editBinding(fixture, 'menu', binding => {
    binding.sourceFiles = binding.sourceFiles.filter(file =>
      file.path !== 'bend2/toolchain-patches/2032/tag-identity/preload-root.mjs');
  });
}, /source closure differs/);

expectFailure('unresolvable source commit', fixture => {
  editBinding(fixture, 'controller', binding => { binding.sourceCommit = '0'.repeat(40); });
}, /cache source commit is not a valid Git commit/);

expectFailure('mixed source commit across four modules', fixture => {
  editBinding(fixture, 'controller', binding => {
    binding.sourceCommit = currentHead;
    binding.sourceTree = currentTree;
  });
}, /cache set mixes source\/compiler\/EOL\/patch bindings/);

expectFailure('mixed source tree across four modules', fixture => {
  editBinding(fixture, 'scene', binding => { binding.sourceTree = '0'.repeat(40); });
}, /cache source commit\/tree provenance differs/);

expectFailure('mixed reviewed patch stack', fixture => {
  editBinding(fixture, 'chrome', binding => { binding.patches[0].sha256 = '0'.repeat(64); });
}, /manifest patch stack differs/);

expectFailure('mixed compiler EOL', fixture => {
  editBinding(fixture, 'menu', binding => {
    binding.derivedEol = binding.derivedEol === 'lf' ? 'crlf' : 'lf';
  });
}, /manifest EOL differs/);

expectFailure('derived compiler hash tamper', fixture => {
  editBinding(fixture, 'menu', binding => { binding.derivedFiles[0].sha256 = '0'.repeat(64); });
}, /derived compiler bytes differ from manifest/);

expectFailure('canonical toolchain pin tamper', fixture => {
  editBinding(fixture, 'menu', binding => { binding.canonicalPin = '0'.repeat(40); });
}, /canonical Bend pin differs/);

expectFailure('pre-policy source commit', fixture => {
  editBinding(fixture, 'menu', binding => {
    binding.sourceCommit = '6c795db32c7cf5d9abb432b1235fd51e9b417ae4';
    binding.sourceTree = '6db022c0e5d8e80bb10d4072165373bc95fa6ba1';
  });
}, /predates the stable 2.0.32 tag policy/);

expectFailure('changed selected registry source hash', fixture => {
  editBinding(fixture, 'menu', binding => {
    binding.sourceFiles.find(file => file.path === 'bend2/tools/selected-modules.mjs')
      .sha256 = '0'.repeat(64);
  });
}, /bound source bytes changed/);

expectFailure('changed selected entry source hash', fixture => {
  editBinding(fixture, 'scene', binding => {
    binding.sourceFiles.find(file => file.path === binding.module.entry).sha256 = '0'.repeat(64);
  });
}, /bound source bytes changed/);

expectFailure('changed output bytes without manifest update', fixture => {
  fs.writeFileSync(path.join(path.dirname(fixture.manifestPath('chrome')), 'chrome.js'), 'tampered');
}, /chrome output byte count differs|chrome output bytes differ/);

expectFailure('wrong exact bare export with matching byte digest', fixture => {
  const output = moduleBytes(moduleSpecs.menu).toString('utf8')
    .replace(JSON.stringify(moduleSpecs.menu.exports[0]) + ':', '"not_selected":');
  fixture.setOutput('menu', Buffer.from(output, 'utf8'));
}, /exact bare root/);

expectFailure('extra exact bare export with matching byte digest', fixture => {
  const output = moduleBytes(moduleSpecs.chrome).toString('utf8')
    .replace('\n};\n', '\n  "extra": run_lib((...args) => args, 1),\n};\n');
  fixture.setOutput('chrome', Buffer.from(output, 'utf8'));
}, /export count differs/);

expectFailure('same-line extra export with matching byte digest', fixture => {
  const output = moduleBytes(moduleSpecs.chrome).toString('utf8')
    .replace('"shell": run_lib((...args) => args, 1),',
      '"shell": run_lib((...args) => args, 1), "extra": run_lib(() => 2, 1),');
  fixture.setOutput('chrome', Buffer.from(output, 'utf8'));
}, /extra code after shell/);

expectFailure('same-line duplicate export with matching byte digest', fixture => {
  const output = moduleBytes(moduleSpecs.chrome).toString('utf8')
    .replace('"shell": run_lib((...args) => args, 1),',
      '"shell": run_lib((...args) => args, 1), "shell": run_lib(() => 2, 1),');
  fixture.setOutput('chrome', Buffer.from(output, 'utf8'));
}, /extra code after shell/);

expectFailure('same-line appended expression with matching byte digest', fixture => {
  const output = moduleBytes(moduleSpecs.chrome).toString('utf8')
    .replace('"shell": run_lib((...args) => args, 1),',
      '"shell": run_lib((...args) => args, 1) || sideEffect(),');
  fixture.setOutput('chrome', Buffer.from(output, 'utf8'));
}, /extra code after shell/);

expectFailure('invalid UTF-8 selected output', fixture => {
  fixture.setOutput('scene', Buffer.from([0xff, 0xfe]));
}, /valid for encoding utf-8/i);

expectFailure('manifest binding digest tamper', fixture => {
  const manifest = fixture.read('menu');
  manifest.bindingSha256 = '0'.repeat(64);
  fixture.write('menu', manifest);
}, /binding SHA-256 differs/);

expectFailure('manifest traversal path', fixture => ({
  ...fixture.paths,
  menu: path.join('..', 'outside', 'menu.manifest.json'),
}), /manifest path escapes the explicit preview root/);

expectFailure('output traversal name', fixture => {
  const manifest = fixture.read('chrome');
  manifest.output.file = '../chrome.js';
  fixture.write('chrome', manifest);
}, /chrome output name differs/);

expectFailure('unordered exports', fixture => {
  editBinding(fixture, 'menu', (binding, manifest) => {
    binding.module.exports.reverse();
    manifest.module.exports.reverse();
  });
}, /module differs/);

expectFailure('missing module path', fixture => {
  const paths = { ...fixture.paths };
  delete paths.chrome;
  return paths;
}, /manifestPaths has unexpected fields/);

expectFailure('duplicate explicit module path', fixture => ({
  ...fixture.paths,
  chrome: fixture.paths.menu,
}), /duplicate explicit manifest path/);

expectLinkFailure('manifest path', fixture => {
  const alias = path.join(fixture.root, 'menu-alias');
  fs.symlinkSync(path.dirname(fixture.manifestPath('menu')), alias, 'junction');
  return { manifestPaths: { ...fixture.paths, menu: path.join('menu-alias', 'menu.manifest.json') } };
});

expectLinkFailure('output path', fixture => {
  const link = path.join(path.dirname(fixture.manifestPath('menu')), 'menu.js');
  const target = path.join(path.dirname(fixture.manifestPath('chrome')), 'chrome.js');
  fs.unlinkSync(link);
  fs.symlinkSync(target, link, 'file');
});

expectLinkFailure('previewRoot', fixture => {
  const alias = path.join(fixture.root, 'preview-root-alias');
  fs.symlinkSync(path.dirname(fixture.manifestPath('menu')), alias, 'junction');
  return { previewRoot: alias };
});

expectLinkFailure('previewRoot ancestor', fixture => {
  const target = path.join(fixture.root, 'menu');
  fs.mkdirSync(path.join(target, 'nested-preview'));
  const alias = path.join(fixture.root, 'preview-ancestor');
  fs.symlinkSync(target, alias, 'junction');
  return { previewRoot: path.join(alias, 'nested-preview') };
});

expectLinkFailure('sourceRoot ancestor', fixture => {
  const target = path.join(fixture.root, 'source-target');
  fs.mkdirSync(path.join(target, 'nested'), { recursive: true });
  const alias = path.join(fixture.root, 'source-root-ancestor');
  fs.symlinkSync(target, alias, 'junction');
  return { sourceRoot: path.join(alias, 'nested'), previewRoot: 'preview' };
});

console.log(JSON.stringify({
  schema: 'rift-bend-2032-cache-set-v2-tamper-test/1',
  passed: true,
  acceptedFixture: false,
  rejectedControls: 30 + rejectedLinkControls,
  skippedLinkControls,
  scope: 'synthetic tamper fixtures only; no four-cache integration or artifact authenticity claim',
}));

