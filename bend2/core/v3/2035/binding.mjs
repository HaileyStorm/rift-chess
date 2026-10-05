import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Worker, isMainThread, resourceLimits } from 'node:worker_threads';
import { requiredProofs, verifyV2 } from '../../../tools/freeze-v2.mjs';
import { lawManifests, loadAmendments } from '../../../tools/amendments.mjs';
import { proofVerdict } from '../proof-authority.mjs';
import { expectedCheckClosure, assertExactLoadedClosure, assertProofNodeRuntime, runLeasedWorker } from '../2032/aggregate-safety.mjs';
import { settleWorker, finalizeOwnedManifest } from '../../../toolchain-patches/2032/preview/lifecycle.mjs';
import { loadWithStableImports } from '../../../toolchain-patches/2032/tag-identity/preload-root.mjs';
import { selectedBinding2035, readSource, sha256, derived } from '../../../toolchain-patches/2035/selected-binding.mjs';
import { root } from '../../../tools/selected-modules.mjs';

export { root, derived, readSource, sha256 };
export const base = path.join(derived, 'bend2/base.bend');
export const checkPath = path.join(root, 'bend2/core/v2/CHECK.bend');
export const outputRoot = path.join(root, '.artifacts/bend2/2035-proof-20261005');
export const stages = ['binding', 'load', 'closure', 'typecheck', 'namespace-guard', 'promise-screen', 'post-binding', 'result'];
export const workerStackMiB = 64;
export const scope = 'frozen v2 source/type/promise screen with compiler namespace guard; no Safe/BendTT kernel, conformance, native/browser/GPU or pin acceptance';
const rel = file => path.relative(root, file).split(path.sep).join('/');
const hash = file => sha256(readSource(file));
const git = (directory, ...args) => execFileSync('git', ['-C', directory, ...args], {
  encoding: 'utf8', windowsHide: true, timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'],
}).replaceAll('\r\n', '\n').trimEnd();
const pinned = {
  'bend2/core/v3/proof-authority.mjs': '3737c455d542f2dc7ff1799bfc579969c42739814411a8494189eb1b56a74013',
  'bend2/toolchain-patches/2032/preview/lifecycle.mjs': '91d8b5c325a48602d0d6860624ab0abf9d5428d374a12d85988cb866a732fbc8',
  'bend2/core/v2/proof-runtime.json': '45e3de051fdc3b3e2260d2a2af4036234c39354c284c7b6d94f30e75a7413cbf',
};

// The proof Node executable is outside the repository source fence. Validate
// this one executing regular file through its descriptor without broadening it.
function proofNodeRuntime() {
  assertProofNodeRuntime();
  assert.equal(process.version, 'v24.12.0');
  assert.equal(process.platform, 'win32');
  assert.equal(process.arch, 'x64');
  assert.equal(typeof globalThis.Bun, 'undefined');
  const executable = path.resolve(process.execPath);
  assert.equal(fs.realpathSync(executable), executable, 'proof Node executable is redirected');
  const before = fs.lstatSync(executable, { bigint: true });
  assert.ok(before.isFile() && !before.isSymbolicLink());
  const fd = fs.openSync(executable, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const same = stat => {
    assert.ok(stat.isFile() && !stat.isSymbolicLink());
    for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(stat[key], before[key]);
  };
  let executableSha256;
  try {
    same(fs.fstatSync(fd, { bigint: true }));
    executableSha256 = sha256(fs.readFileSync(fd));
    same(fs.fstatSync(fd, { bigint: true }));
    same(fs.lstatSync(executable, { bigint: true }));
    assert.equal(fs.realpathSync(executable), executable);
  } finally { fs.closeSync(fd); }
  assert.equal(executableSha256, '2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8');
  const file = 'bend2/core/v2/proof-runtime.json';
  const bytes = readSource(path.join(root, file));
  assert.equal(sha256(bytes), pinned[file]);
  const metadata = JSON.parse(bytes);
  assert.equal(metadata.schema, 'rift-bend-v2-proof-runtime/1');
  for (const [key, actual] of Object.entries({ version: process.version, executable, sha256: executableSha256,
    platform: process.platform, arch: process.arch })) assert.equal(metadata.runtime[key], actual);
  assert.equal(metadata.worker.stackSizeMb, workerStackMiB);
  return { engine: 'Node', nodeVersion: process.version, executable, executableSha256,
    platform: process.platform, arch: process.arch, execArgv: process.execArgv,
    nodeOptions: process.env.NODE_OPTIONS ?? '', bunAbsent: true,
    workerConfiguration: { stackSizeMb: workerStackMiB, execArgv: [] },
    provenance: { file, sha256: sha256(bytes), metadata,
      scope: 'unchanged frozen proof runtime provenance; historical metadata warning flag is not an execution flag' } };
}

export function workerResourceReadback() {
  assert.equal(isMainThread, false);
  assert.equal(resourceLimits.stackSizeMb, workerStackMiB, 'actual proof Worker stack differs');
  return { ...resourceLimits };
}

// Preflight binds the reviewable working bytes. Execution additionally requires
// those bytes to be committed in a clean checkout, before and after every Worker.
export function binding2035({ requireClean = true } = {}) {
  const runtime = proofNodeRuntime();
  const frozen = verifyV2();
  const selected = selectedBinding2035('scene', true);
  const status = git(root, 'status', '--porcelain=v1', '--untracked-files=all');
  if (requireClean) assert.equal(status, '', 'source proof execution requires a clean checkout');
  for (const [directory, commit] of [
    ['.artifacts/toolchains/bend-2.0.35-scout', selected.upstream],
    ['.artifacts/toolchains/bend', selected.canonicalPin],
  ]) {
    assert.equal(git(path.join(root, directory), 'rev-parse', 'HEAD'), commit);
    assert.equal(git(path.join(root, directory), 'status', '--porcelain=v1', '--untracked-files=all'), '');
  }
  const paths = new Set(selected.sourceFiles.map(file => file.path));
  for (const file of [...Object.keys(frozen.manifest.files), ...Object.keys(frozen.manifest.evidence),
    ...lawManifests, 'bend2/tools/amendments.mjs', 'bend2/tools/amend.mjs',
    'bend2/core/v3/proof-authority.mjs', 'bend2/core/v3/2032/aggregate-safety.mjs',
    'bend2/core/v3/2032/mutation-verdict.mjs',
    ...['binding.mjs', 'aggregate.mjs', 'mutations.mjs', 'README.md'].map(name => `bend2/core/v3/2035/${name}`)]) paths.add(file);
  for (const manifest of lawManifests) {
    const value = JSON.parse(readSource(path.join(root, manifest)));
    for (const file of [...Object.keys(value.files ?? {}), ...Object.keys(value.evidence ?? {})]) paths.add(file);
  }
  for (const { file, value } of loadAmendments()) {
    paths.add(file);
    for (const key of ['tools', 'evidence', 'records', 'preserved', 'substitutions'])
      for (const file of Object.keys(value[key] ?? {})) paths.add(file);
  }
  const sourceFiles = [...paths].sort().map(file => ({ path: file, sha256: hash(path.join(root, file)) }));
  for (const [file, expected] of Object.entries(pinned)) assert.equal(hash(path.join(root, file)), expected);
  const expectedImports = [...new Set([...requiredProofs, ...fs.readdirSync(path.dirname(checkPath))
    .filter(name => name === 'LAWS.bend' || name.endsWith('Laws.bend'))])].sort();
  const imports = [...readSource(checkPath).toString('utf8').matchAll(/^import \.\/([^ ]+) as /gm)]
    .map(match => match[1]).sort();
  assert.deepEqual(imports, expectedImports, 'CHECK differs from the complete frozen declaration/witness/API set');
  return { schema: 'rift-v2-proof-2035-binding/1', producerScope: 'source/type/promise',
    namespaceGuard: 'Comp.js_lib(empty-root full-book view, true)',
    sourceCommit: git(root, 'rev-parse', 'HEAD'), sourceTree: git(root, 'show', '-s', '--format=%T', 'HEAD'),
    sourceStatus: status, clean: status === '', frozenSha256: frozen.sha256,
    frozenFiles: frozen.manifest.files, compiler: selected, sourceFiles,
    expectedLoadedPaths: expectedCheckClosure(root, checkPath, frozen.manifest.files, base),
    runtime };
}

export function assertExecutionRuntime(before) {
  assert.equal(process.platform, 'win32', 'this bounded source-only runner is Windows-specific; Linux gates remain unchanged');
  assert.deepEqual(proofNodeRuntime(), before.runtime);
}

export function sourceCone(entry, before) {
  return expectedCheckClosure(root, entry, before.frozenFiles, base)
    .filter(file => file !== fs.realpathSync(base)).map(rel).sort();
}

export function loadedClosure(seen, directory, expected, before, substitutions = {}) {
  const files = [...seen.keys()].map(file => {
    assert.equal(fs.realpathSync(file), file, 'loaded source path is redirected');
    if (file === fs.realpathSync(base)) return { path: '<derived>/bend2/base.bend', sha256: hash(file) };
    const name = path.relative(directory, file).split(path.sep).join('/');
    assert.ok(name && name !== '..' && !name.startsWith('../') && !path.isAbsolute(name), 'loaded source escaped cone');
    const sha = substitutions[name] ?? before.frozenFiles[name];
    assert.ok(sha, `unbound loaded source: ${name}`);
    assert.equal(hash(file), sha, `loaded source changed: ${name}`);
    return { path: name, sha256: sha };
  }).sort((a, b) => a.path.localeCompare(b.path));
  assertExactLoadedClosure([...expected, '<derived>/bend2/base.bend'], files.map(file => file.path));
  assert.equal(files.find(file => file.path === '<derived>/bend2/base.bend').sha256,
    before.compiler.derivedFiles.find(file => file.path === 'base.bend').sha256);
  return { files, sha256: sha256(JSON.stringify(files)) };
}

export async function loadProof(Bend, entry, directory) {
  const book = Bend.book_nil();
  const identity = await loadWithStableImports(Bend, book, entry, path.join(directory, 'bend2'));
  assert.equal(identity.seen.get(fs.realpathSync(entry)), '', 'proof root namespace changed');
  return { book, ...identity };
}

export async function positiveVerdict(Bend, book, mark) {
  Bend.book_valid(book, 0);
  assert.equal(book.hols, 0, 'unfilled law or TODO');
  assert.equal(Object.hasOwn(book, 'open'), false, '2035 Book hole shape changed');
  mark('namespace-guard');
  const Comp = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')).href);
  const original = book.order, view = { ...book, order: [] };
  assert.strictEqual(view.tlds, book.tlds);
  assert.strictEqual(view.ctrs, book.ctrs);
  const code = Comp.js_lib(view, true);
  assert.ok(typeof code === 'string' && code.length > 0);
  assert.strictEqual(book.order, original);
  assert.equal(view.order.length, 0);
  mark('promise-screen');
  const verdict = proofVerdict(Bend, { ...book, open: 0 });
  return { definitions: book.order.length, holes: book.hols, owned: verdict.own.length,
    namespaceGuard: 'successor 2.0.35 compiler-owned guard via empty-root js_lib; no definition emission' };
}

export const memory = () => ({ rssBytes: process.memoryUsage().rss, freeBytes: os.freemem() });
export async function withEvidenceRun(kind, before, run) {
  assertExecutionRuntime(before);
  assert.equal(fs.realpathSync(path.dirname(outputRoot)), path.dirname(outputRoot));
  git(root, 'check-ignore', '--quiet', rel(outputRoot));
  fs.mkdirSync(outputRoot, { recursive: true });
  assert.equal(fs.realpathSync(outputRoot), outputRoot);
  assert.ok(fs.lstatSync(outputRoot).isDirectory() && !fs.lstatSync(outputRoot).isSymbolicLink());
  return runLeasedWorker(path.join(outputRoot, 'source.lock'), JSON.stringify({
    schema: 'rift-v2-proof-2035-lease/1', kind, ownerTask: process.env.CODEX_THREAD_ID ?? null,
    bindingSha256: sha256(JSON.stringify(before)), workerMayBeLive: true,
  }), async () => {
    const directory = fs.mkdtempSync(path.join(outputRoot, `${kind}-`));
    fs.writeFileSync(path.join(directory, 'before.json'), JSON.stringify(before, null, 2) + '\n', { flag: 'wx' });
    return run(directory);
  });
}

export async function boundedAttempt(script, data, before, directory, label, timeoutMs) {
  const progress = new Int32Array(new SharedArrayBuffer(4));
  const started = Date.now(), memoryBefore = memory();
  let result, workerFailure, parentResourceLimits;
  try {
    const worker = new Worker(script, { workerData: { ...data, expectedBinding: before, progress: progress.buffer },
      resourceLimits: { stackSizeMb: workerStackMiB }, execArgv: [] });
    parentResourceLimits = { ...worker.resourceLimits };
    const capture = message => { if (message?.ok === false) workerFailure = message; };
    worker.on('message', capture);
    try { result = await settleWorker(worker, { timeoutMs, terminateGraceMs: 10_000 }); }
    finally { worker.off('message', capture); }
    assert.equal(parentResourceLimits.stackSizeMb, workerStackMiB);
    assert.equal(result.actualResourceLimits.stackSizeMb, workerStackMiB);
    assert.deepEqual(binding2035(), before, 'parent binding changed after Worker');
    const record = { ...result, elapsedMs: Date.now() - started, timeoutMs, memoryBefore,
      memoryAfter: memory(), parentResourceLimits,
      evidence: 'Windows Node 24.12.0 isolated source-only Worker, observed 64 MiB stack; no fixed free-RAM admission floor' };
    fs.writeFileSync(path.join(directory, `${label}.json`), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
    return record;
  } catch (error) {
    const failure = {
      schema: 'rift-v2-proof-2035-attempt-failure/1', accepted: false, finalReceipt: false,
      bindingSha256: sha256(JSON.stringify(before)), label, stage: stages[Atomics.load(progress, 0)],
      elapsedMs: Date.now() - started, timeoutMs, memoryBefore, memoryAfter: memory(), result,
      parentResourceLimits, workerFailure,
      timedOut: !!error?.timedOut, workerMayBeLive: !!error?.workerMayBeLive,
      reason: String(error?.message ?? error).slice(0, 1800),
      failureStack: String(workerFailure?.failureStack ?? error?.stack ?? error).slice(0, 6000),
    };
    try { fs.writeFileSync(path.join(directory, `${label}.failure.json`), JSON.stringify(failure, null, 2) + '\n', { flag: 'wx' }); }
    catch (writeError) { error.failureWriteError = String(writeError); }
    throw error;
  }
}

export function finishReceipt(directory, receipt, before) {
  const after = binding2035();
  assert.deepEqual(after, before, 'source/compiler/runtime binding changed');
  const bytes = Buffer.from(JSON.stringify({ ...receipt, before, after,
    bindingSha256: sha256(JSON.stringify(before)), scope }, null, 2) + '\n');
  finalizeOwnedManifest(path.join(directory, 'receipt.pending'), path.join(directory, 'receipt.json'), bytes,
    { beforeCommit: () => assert.deepEqual(binding2035(), before) });
  assert.deepEqual(readSource(path.join(directory, 'receipt.json')), bytes);
  return { output: rel(directory), receiptSha256: sha256(bytes), scope };
}
