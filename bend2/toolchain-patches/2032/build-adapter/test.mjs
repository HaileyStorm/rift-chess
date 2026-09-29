import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bindCompilerEol } from '../preview/compiler-eol.mjs';

process.env.BEND_NO_TELEMETRY = '1';
let networkCalls = 0;
globalThis.fetch = async () => {
  networkCalls++;
  throw new Error('unexpected network access');
};

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');
const scout = path.join(repo, '.artifacts/toolchains/bend-2.0.32-scout');
const derived = path.join(repo, '.artifacts/bend2/toolchain-patches/derived-2032');
const canonical = path.join(repo, '.artifacts/toolchains/bend');
const entry = path.join(here, 'fixtures/selected-font.bend');
const workerEntry = path.join(repo,
  'bend2/toolchain-patches/004-web-workers/rebase-2032/fixtures/selected-root.bend');
const workerForeign = path.join(repo,
  'bend2/toolchain-patches/004-web-workers/rebase-2032/fixtures/foreign.js');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const release = '573002f01ec6c52416d44489543f69a9625facf8';
const canonicalPin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const patchStack = [
  ['001-arity/rebase-2032/0001-arity-diagnostics.patch',
    '98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db'],
  ['002-layout/rebase-2032/0002-after-001-2.0.32.patch',
    '2ed566176148cc1e064d2dae4c806c7912d557e38570ecfa5f47ddd0d78d395d'],
  ['005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch',
    '99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4'],
  ['004-web-workers/rebase-2032/phase2/0004-parser-plan-after-005-2.0.32.patch',
    'bfdd64270c7714376c64a0306a58892d8a872d96f9d4bace0be091bf894fdb13'],
].map(([relative, expected]) => [
  path.join(repo, 'bend2/toolchain-patches', relative), expected,
]);

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })
    .replace(/\r\n/g, '\n').trimEnd();
}
const compilerBinding = (tree) => bindCompilerEol((relative) =>
  fs.readFileSync(path.join(tree, relative)));
function applyPatch(cwd, file) {
  execFileSync('git', ['apply', '--check', file], { cwd, stdio: 'pipe' });
  execFileSync('git', ['apply', file], { cwd, stdio: 'pipe' });
}
async function load(Bend, source = entry) {
  const book = Bend.book_nil();
  try {
    await Bend.book_load(book, source.replaceAll('\\', '/'), '', new Map());
    Bend.book_valid(book);
  } catch (error) {
    throw new Error((error?.$ === 'Err' ? Bend.err_show(error)
      : error?.message ?? String(error)).slice(0, 1800));
  }
  assert.equal(book.hols, 0);
  return book;
}
function mutateTld(book, name, fields) {
  const tlds = Object.assign(Object.create(null), book.tlds);
  tlds[name] = { ...tlds[name], ...fields };
  return { ...book, tlds };
}
function sourceClosure(starts, extraFiles = []) {
  const found = new Map();
  const repoPrefix = repo + path.sep;
  const scoutPrefix = scout + path.sep;
  function visit(file) {
    file = path.resolve(file);
    if (found.has(file)) return;
    assert.ok(file.startsWith(repoPrefix) || file.startsWith(scoutPrefix),
      `source import escaped bound roots: ${file}`);
    const bytes = fs.readFileSync(file);
    found.set(file, sha256(bytes));
    for (const line of bytes.toString('utf8').split(/\r?\n/)) {
      const match = /^\s*import\s+([^\s]+)(?:\s+as\s+\w+)?\s*$/.exec(line);
      if (!match) continue;
      const spec = match[1];
      if (spec.startsWith('"') || spec.startsWith("'")) continue;
      if (spec === 'Base') visit(path.join(scout, 'bend2/base.bend'));
      else visit(path.resolve(path.dirname(file), spec));
    }
  }
  for (const start of starts) visit(start);
  for (const helper of [
    path.join(here, 'selected-library.mjs'),
    path.join(repo, 'bend2/toolchain-patches/004-web-workers/rebase-2032/selected-module.mjs'),
    path.join(repo, 'bend2/toolchain-patches/2032/preview/compiler-eol.mjs'),
    path.join(here, 'test.mjs'),
    ...extraFiles,
  ]) {
    assert.ok(helper.startsWith(repo + path.sep), `bound input escaped repository: ${helper}`);
    found.set(helper, sha256(fs.readFileSync(helper)));
  }
  return [...found].map(([file, hash]) => ({
    path: path.relative(repo, file).replaceAll('\\', '/'), sha256: hash,
  })).sort((a, b) => a.path.localeCompare(b.path));
}

function bindingSnapshot() {
  const scoutHead = git(scout, 'rev-parse', 'HEAD');
  assert.equal(scoutHead, release);
  const scoutStatus = git(scout, 'status', '--porcelain', '--untracked-files=all');
  assert.equal(scoutStatus, '');
  const canonicalHead = git(canonical, 'rev-parse', 'HEAD');
  assert.equal(canonicalHead, canonicalPin);
  const canonicalStatus = git(canonical, 'status', '--porcelain', '--untracked-files=all');
  assert.equal(canonicalStatus, '');
  const derivedHead = git(derived, 'rev-parse', 'HEAD');
  assert.equal(derivedHead, release);
  const derivedStatus = git(derived, 'status', '--porcelain', '--untracked-files=all');
  assert.equal(derivedStatus, ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts');
  const compiler = compilerBinding(derived);
  const patches = patchStack.map(([file, expected]) => {
    const actual = sha256(fs.readFileSync(file));
    assert.equal(actual, expected, `patch bytes changed: ${file}`);
    return { path: path.relative(repo, file).replaceAll('\\', '/'), sha256: actual };
  });
  return {
    repositories: {
      scout: { head: scoutHead, status: scoutStatus },
      canonical: { head: canonicalHead, status: canonicalStatus },
      derived: { head: derivedHead, status: derivedStatus },
    },
    compilerEol: compiler.eol,
    compilerFiles: compiler.files,
    patchStack: patches,
    sourceFiles: sourceClosure([entry, workerEntry], [workerForeign]),
  };
}

const inputBinding = bindingSnapshot();
const inputBindingSha256 = sha256(Buffer.from(JSON.stringify(inputBinding)));
const { emitSelectedLibrary2032 } = await import('./selected-library.mjs');
const Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')));
const Comp = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')));
const book = await load(Bend);
assert.ok(book.order.includes('font_cap'));
const rootDef = book.tlds.font_cap;
assert.ok(rootDef?.$ === 'Def' && rootDef.v !== null && rootDef.b !== true &&
  rootDef.x === 0 && rootDef.i === undefined && Comp.io_base(book, rootDef.T) === null);

const noSuffixBefore = Comp.js_lib(book, false);
const selected = emitSelectedLibrary2032(Bend, Comp, book, ['font_cap']);
const noSuffixAfter = Comp.js_lib(book, false);
assert.deepEqual(Buffer.from(noSuffixAfter), Buffer.from(noSuffixBefore),
  'selected library emission changed exact no-suffix output bytes');
const loadedSelected = await import(`data:text/javascript;base64,${Buffer.from(selected).toString('base64')}`);
assert.deepEqual(Object.keys(loadedSelected.default), ['font_cap']);
assert.equal(loadedSelected.default.font_cap(), 262144);
assert.throws(() => emitSelectedLibrary2032(Bend, Comp, book, []), /explicit export roots/);
assert.throws(() => emitSelectedLibrary2032(Bend, Comp, book, ['font_cap', 'font_cap']), /unique/);

const workerBook = await load(Bend, workerEntry);
const workerLibrary = emitSelectedLibrary2032(Bend, Comp, workerBook, ['worker_root']);
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(workerLibrary).toString('base64')}`);
assert.deepEqual(Object.keys(workerModule.default), ['worker_root']);
assert.equal(workerModule.default.worker_root(40), 42);
assert.equal(Object.hasOwn(workerModule.default, 'hidden_root'), false);
const orderedRoots = ['secondary_root', 'worker_root'];
const orderedLibrary = emitSelectedLibrary2032(Bend, Comp, workerBook, orderedRoots);
const orderedModule = await import(`data:text/javascript;base64,${Buffer.from(orderedLibrary).toString('base64')}`);
assert.deepEqual(Object.keys(orderedModule.default), orderedRoots);
assert.equal(orderedModule.default.secondary_root(7), 21);
for (const roots of [[], ['worker_root', 'worker_root'], ['absent_root'],
  ['IO.print'], ['io_root'], ['template_root'], ['foreign_root']]) {
  assert.throws(() => emitSelectedLibrary2032(Bend, Comp, workerBook, roots),
    /worker export root|explicit|unique/,
    `unsupported root selection was accepted: ${JSON.stringify(roots)}`);
}

const ownedCollision = mutateTld(book, 'IO', { b: false });
assert.throws(() => Comp.js_lib(ownedCollision, false), /IO is a name the compiler encodes itself/);
const constructorName = Object.keys(book.ctrs).find((name) => name.includes('/FontPack.Entry'));
assert.ok(constructorName, 'fixture has an app constructor for the foreign collision control');
const foreignTemplate = Object.values(book.tlds).find((tld) => tld.$ === 'Def');
const foreignCollision = mutateTld(book, constructorName, { ...foreignTemplate, i: ['synthetic-host'] });
assert.throws(() => Comp.js_lib(foreignCollision, false),
  new RegExp(`${constructorName} names both a constructor and a foreign def`));

const temporaryRoot = fs.realpathSync(os.tmpdir());
const replay = fs.mkdtempSync(path.join(temporaryRoot, 'rift-bend-2032-build-adapter-'));
try {
  fs.cpSync(path.join(scout, 'bend2'), path.join(replay, 'bend2'), { recursive: true });
  for (const [file] of patchStack) applyPatch(replay, file);
  assert.deepEqual(compilerBinding(replay), compilerBinding(derived),
    'independent replay has a different reviewed postimage or checkout EOL mode');
  const ReplayBend = await import(pathToFileURL(path.join(replay, 'bend2/bend.ts')));
  const ReplayComp = await import(pathToFileURL(path.join(replay, 'bend2/comp.ts')));
  const replayBook = await load(ReplayBend);
  const replayNoSuffix = ReplayComp.js_lib(replayBook, false);
  assert.deepEqual(Buffer.from(noSuffixBefore), Buffer.from(replayNoSuffix),
    'no-suffix JavaScript differs from independent 001+002+005+phase2 replay');
  assert.deepEqual(Buffer.from(fs.readFileSync(path.join(derived, 'bend2/comp.ts'))),
    Buffer.from(fs.readFileSync(path.join(replay, 'bend2/comp.ts'))),
    'replayed phase2 compiler differs byte-for-byte from derived compiler');
} finally {
  const exact = fs.realpathSync(replay);
  assert.equal(path.dirname(exact), temporaryRoot, 'replay cleanup escaped OS temp');
  assert.match(path.basename(exact), /^rift-bend-2032-build-adapter-[^\\/]+$/);
  fs.rmSync(exact, { recursive: true, force: true });
}

assert.equal(networkCalls, 0);
assert.deepEqual(bindingSnapshot(), inputBinding,
  'source, helper, compiler or patch bytes changed during load/emission');
console.log(JSON.stringify({
  schema: 'rift-bend-2032-selected-build-adapter/1',
  passed: true,
  upstream: release,
  inputBindingSha256,
  derivedCompilerSha256: inputBinding.compilerFiles,
  patchStack: inputBinding.patchStack,
  sourceFiles: inputBinding.sourceFiles,
  selectedRoots: ['font_cap'],
  selectedLibrarySha256: sha256(Buffer.from(selected)),
  noSuffixSha256: sha256(Buffer.from(noSuffixBefore)),
  evaluated: { font_cap: loadedSelected.default.font_cap(), worker_root: workerModule.default.worker_root(40) },
  workerRootKeys: Object.keys(workerModule.default),
  orderedWorkerKeys: Object.keys(orderedModule.default),
  rejected: ['empty roots', 'duplicate roots', 'compiler-owned IO name',
    'foreign definition colliding with app constructor', 'unknown/base/IO/template/foreign selected roots'],
  networkCalls,
  scope: 'local selected browser-library emission and exact no-suffix replay only; not build.ts integration, full app/browser acceptance, frozen proofs, native, GPU, or pin amendment',
}));
