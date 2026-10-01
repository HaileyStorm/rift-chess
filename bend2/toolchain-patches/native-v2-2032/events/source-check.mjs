// Linux-only, no-emission source check of the exact isolated event-patched GUI entry.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadSourceInBoundedWorker, SOURCE_CHECK_WORKER_OLD_GENERATION_MB,
  SOURCE_CHECK_WORKER_STACK_MB,
  SOURCE_CHECK_WORKER_TIMEOUT_MS } from './source-check-worker.mjs';
import { bindCompilerBaseEol, bindCompilerEol } from '../../2032/preview/compiler-eol.mjs';

const root = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..'));
const script = fileURLToPath(import.meta.url);
const eolHelper = path.join(root, 'bend2/toolchain-patches/2032/preview/compiler-eol.mjs');
const sourceWorkerScript = path.join(root,
  'bend2/toolchain-patches/native-v2-2032/events/source-check-worker.mjs');
const candidateCommit = '216567d9cdc927cf0b4e00632a80260f9901f4fa';
const candidateTree = '4fa21705820578137a6c2cb7dfaa41b413c23567';
const scoutCommit = '573002f01ec6c52416d44489543f69a9625facf8';
const canonicalCommit = 'd37909174ebd664338ae3194799a9e0899dedd51';
const nativeOriginal = '29fc92d043aff032de13ceafad63ef4f101c72b08f93b7199c3ce40bd333cf6d';
const nativePatched = '9fe46e219123e3f59958de98c6f9b65fc618cca85ca0325740dffc30e8aef292';
const patchSha256 = '28ec36660b3d78c2373b5ff0591385e7a6cc39e6fd33cb9a2a1732d0a01ad2fa';
const nodeSha256 = '93956de2e59480474a7b46571da1651180b1a050cdf32641ebec4ce6e478e068';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fileSha = file => sha(fs.readFileSync(file));
const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], {
  encoding: 'utf8', timeout: 30_000, maxBuffer: 16 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'pipe'],
}).replace(/\r\n/g, '\n').trimEnd();
const realDirectory = directory => {
  assert.ok(path.isAbsolute(directory));
  const stat = fs.lstatSync(directory);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  assert.equal(fs.realpathSync(directory), directory);
};
const realFile = file => {
  const stat = fs.lstatSync(file);
  assert.ok(stat.isFile() && !stat.isSymbolicLink());
  assert.equal(fs.realpathSync(file), file);
  return stat;
};

assert.equal(process.platform, 'linux', 'the candidate source check is Linux-only');
assert.equal(process.version, 'v22.23.1');
assert.deepEqual(process.execArgv, ['--max-old-space-size=1024'], 'unexpected Node flags/preloads');
assert.equal(process.env.NODE_OPTIONS ?? '', '');
assert.equal(process.env.NODE_PATH ?? '', '');
assert.equal(process.env.BEND_NO_TELEMETRY, '1');
const nodeExecutable = fs.realpathSync(process.execPath);
realFile(nodeExecutable);
assert.equal(fileSha(nodeExecutable), nodeSha256, 'Linux Node executable changed');
realFile(script);
realFile(eolHelper);
realFile(sourceWorkerScript);
const scriptSha256 = fileSha(script);
const eolHelperSha256 = fileSha(eolHelper);
const sourceWorkerSha256 = fileSha(sourceWorkerScript);
const sourceHead = git(root, 'rev-parse', 'HEAD');
assert.equal(process.argv.length, 3, 'usage: node --max-old-space-size=1024 source-check.mjs <absolute-candidate>');
assert.ok(path.isAbsolute(process.argv[2]), 'candidate path must be absolute');
const candidate = fs.realpathSync(process.argv[2]);
assert.equal(candidate, process.argv[2], 'candidate path was redirected');
realDirectory(candidate);
assert.notEqual(candidate, root, 'never source-check a patched main checkout');
assert.equal(git(candidate, 'rev-parse', 'HEAD'), candidateCommit);
assert.equal(git(candidate, 'rev-parse', 'HEAD^{tree}'), candidateTree);
assert.equal(git(candidate, 'diff', '--cached', '--name-only'), '', 'candidate index is not clean');
assert.equal(git(candidate, 'status', '--porcelain', '--untracked-files=all'),
  ' M bend2/NativeV2.bend', 'candidate has changes other than the exact event patch');
assert.equal(git(root, 'status', '--porcelain', '--untracked-files=all'), '',
  'source-gate checkout must be clean');

const patch = path.join(root, 'bend2/toolchain-patches/native-v2-2032/events/0001-native-v2-events.patch');
realFile(patch);
assert.equal(fileSha(patch), patchSha256);
const entries = git(candidate, 'ls-files', '--', '*.bend').split('\n');
assert.equal(entries.length, 284, 'candidate tracked Bend source set changed size');
assert.equal(new Set(entries).size, entries.length);
const boundSources = {};
for (const relative of entries) {
  assert.ok(relative.startsWith('bend2/') && !path.isAbsolute(relative) &&
    relative.split('/').every(part => part && part !== '.' && part !== '..'),
  `unsafe tracked Bend source: ${relative}`);
  const file = path.join(candidate, ...relative.split('/'));
  realFile(file);
  const digest = fileSha(file);
  const original = execFileSync('git', ['-C', candidate, 'show', `${candidateCommit}:${relative}`], {
    timeout: 30_000, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const expected = relative === 'bend2/NativeV2.bend' ? nativePatched : sha(original);
  if (relative === 'bend2/NativeV2.bend') assert.equal(sha(original), nativeOriginal);
  assert.equal(digest, expected, `candidate source differs from exact base/patch: ${relative}`);
  boundSources[relative] = digest;
}
assert.equal(boundSources['bend2/NativeV2.bend'], nativePatched);

const scout = path.join(root, '.artifacts/toolchains/bend-2.0.32-scout');
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const canonical = path.join(root, '.artifacts/toolchains/bend');
for (const directory of [scout, derived, canonical]) realDirectory(directory);
assert.equal(git(scout, 'rev-parse', 'HEAD'), scoutCommit);
assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(git(canonical, 'rev-parse', 'HEAD'), canonicalCommit);
assert.equal(git(canonical, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(git(derived, 'rev-parse', 'HEAD'), scoutCommit);
assert.equal(git(derived, 'diff', '--cached', '--name-only'), '');
assert.equal(git(derived, 'status', '--porcelain', '--untracked-files=all'),
  ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts');
const compiler = bindCompilerEol(relative => {
  const file = path.join(derived, ...relative.split('/'));
  realFile(file);
  return fs.readFileSync(file);
});
assert.equal(compiler.eol, 'lf', 'Linux derived compiler checkout is not LF');
const base = path.join(derived, 'bend2/base.bend');
realFile(base);
const baseBinding = bindCompilerBaseEol(fs.readFileSync(base), compiler.eol);
const before = { candidateStatus: git(candidate, 'status', '--porcelain', '--untracked-files=all'),
  sourceSha256: boundSources, compiler, base: baseBinding,
  derivedStatus: git(derived, 'status', '--porcelain', '--untracked-files=all'),
  patchSha256: fileSha(patch), scriptSha256, eolHelperSha256, sourceWorkerSha256, sourceHead };

const sourceResult = await loadSourceInBoundedWorker({
  compilerUrl: pathToFileURL(path.join(derived, 'bend2/bend.ts')).href,
  entryFile: path.join(candidate, 'bend2/NativeV2.bend'),
});
const { book, seenFiles, fetches } = sourceResult;
assert.equal(book.holes, 0, 'NativeV2 source contains holes');
assert.equal(book.mainTag, 'Def');
assert.equal(fetches, 0, 'NativeV2 source check attempted a network fetch');
assert.ok(Array.isArray(seenFiles), 'source worker returned no loaded-file list');
const closure = [];
for (const file of seenFiles) {
  const real = fs.realpathSync(file);
  assert.equal(real, file, 'loaded source identity changed');
  realFile(real);
  if (real === base) closure.push(['<derived>/bend2/base.bend', fileSha(real)]);
  else {
    const relative = path.relative(candidate, real).replaceAll('\\', '/');
    assert.ok(relative.startsWith('bend2/') && !relative.startsWith('../') &&
      !path.isAbsolute(relative), `source load escaped candidate: ${relative}`);
    assert.equal(fileSha(real), boundSources[relative], `unbound source import: ${relative}`);
    closure.push([relative, boundSources[relative]]);
  }
}
closure.sort(([left], [right]) => left.localeCompare(right));
assert.equal(new Set(closure.map(([file]) => file)).size, closure.length);
assert.equal(closure.filter(([file]) => file === '<derived>/bend2/base.bend').length, 1);
assert.equal(git(candidate, 'status', '--porcelain', '--untracked-files=all'), before.candidateStatus);
assert.equal(git(derived, 'status', '--porcelain', '--untracked-files=all'), before.derivedStatus);
assert.equal(git(root, 'rev-parse', 'HEAD'), before.sourceHead);
assert.equal(git(root, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(git(scout, 'rev-parse', 'HEAD'), scoutCommit);
assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(git(canonical, 'rev-parse', 'HEAD'), canonicalCommit);
assert.equal(git(canonical, 'status', '--porcelain', '--untracked-files=all'), '');
for (const [relative, expected] of Object.entries(before.sourceSha256))
  assert.equal(fileSha(path.join(candidate, ...relative.split('/'))), expected,
    `candidate source changed during source check: ${relative}`);
assert.deepEqual(bindCompilerEol(relative => fs.readFileSync(path.join(derived, ...relative.split('/')))),
  before.compiler, 'compiler changed during source check');
assert.deepEqual(bindCompilerBaseEol(fs.readFileSync(base), compiler.eol), before.base);
assert.equal(fileSha(patch), before.patchSha256);
assert.equal(fileSha(script), before.scriptSha256);
assert.equal(fileSha(eolHelper), before.eolHelperSha256);
assert.equal(fileSha(sourceWorkerScript), before.sourceWorkerSha256);
assert.equal(fetches, 0);
console.log(JSON.stringify({ schema: 'rift-native-v2-2032-source-check/1', passed: true,
  evidenceClass: 'Linux-derived-source-load-typecheck-only',
  candidateCommit, candidateTree, eventPatchSha256: patchSha256,
  sourceCheckoutHead: sourceHead, scriptSha256, eolHelperSha256, sourceWorkerSha256,
  worker: { configuredResourceLimits: {
    maxOldGenerationSizeMb: SOURCE_CHECK_WORKER_OLD_GENERATION_MB,
    stackSizeMb: SOURCE_CHECK_WORKER_STACK_MB,
  }, timeoutMs: SOURCE_CHECK_WORKER_TIMEOUT_MS, observedExit: true },
  node: { version: process.version, executableSha256: nodeSha256 },
  compilerEol: compiler.eol, compiler: compiler.files, base: baseBinding,
  entrySha256: nativePatched, trackedBendFiles: entries.length,
  loadedFiles: seenFiles.length, definitions: book.definitions, holes: book.holes,
  fetches, closure: Object.fromEntries(closure),
  scope: 'NativeV2 2.0.32 source/type check only; no C emission, GUI, PCM, GPU, proof, pin or release' }));
