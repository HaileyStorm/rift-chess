import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { moduleSpecs } from '../../../tools/selected-modules.mjs';
import { bindCompilerEol } from './compiler-eol.mjs';
import {
  acquireOwnedLock, closeOwnedLock, finalizeOwnedManifest, releaseOwnedLock, settleWorker,
} from './lifecycle.mjs';

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
const outputRoot = path.join(repo, '.artifacts/bend2/2032-preview');
// Retain the historical lease path so menu-only and generalized emitters
// cannot run concurrently against the same preview output root.
const lockPath = path.join(outputRoot, 'menu-emitter.lock');
const adapterPath = path.join(repo, 'bend2/toolchain-patches/2032/build-adapter/selected-library.mjs');
const selectedHelperPath = path.join(repo,
  'bend2/toolchain-patches/004-web-workers/rebase-2032/selected-module.mjs');
const registryPath = path.join(repo, 'bend2/tools/selected-modules.mjs');
const release = '573002f01ec6c52416d44489543f69a9625facf8';
const canonicalPin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const minFreeBytes = 2.5 * 1024 ** 3;
const workerTimeoutMs = 300_000;
const args = process.argv.slice(2);
const moduleName = args[0] === '--module' ? args[1] : 'menu';
const preflightOnly = args.at(-1) === '--preflight-only';
assert.ok(args.length === 0 || (args.length === 1 && preflightOnly) ||
  (args.length === 2 && args[0] === '--module') ||
  (args.length === 3 && args[0] === '--module' && preflightOnly),
  'run one selected module: [--module menu|controller|scene|chrome] [--preflight-only]');
assert.ok(['menu', 'controller', 'scene', 'chrome'].includes(moduleName),
  'unknown selected module');
const spec = moduleSpecs[moduleName];
const patchStack = [
  ['bend2/toolchain-patches/001-arity/rebase-2032/0001-arity-diagnostics.patch',
    '98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db'],
  ['bend2/toolchain-patches/002-layout/rebase-2032/0002-after-001-2.0.32.patch',
    '2ed566176148cc1e064d2dae4c806c7912d557e38570ecfa5f47ddd0d78d395d'],
  ['bend2/toolchain-patches/005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch',
    '99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4'],
  ['bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/0004-parser-plan-after-005-2.0.32.patch',
    'bfdd64270c7714376c64a0306a58892d8a872d96f9d4bace0be091bf894fdb13'],
].map(([file, expected]) => [path.join(repo, file), expected]);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })
    .replace(/\r\n/g, '\n').trimEnd();
}
function collectSourceClosure(entry) {
  const found = new Map();
  const repoPrefix = repo + path.sep;
  const scoutPrefix = scout + path.sep;
  function visit(file) {
    file = path.resolve(file);
    if (found.has(file)) return;
    assert.ok(file.startsWith(repoPrefix) || file.startsWith(scoutPrefix),
      `source escaped the workspace/toolchain roots: ${file}`);
    const bytes = fs.readFileSync(file);
    found.set(file, sha256(bytes));
    for (const line of bytes.toString('utf8').split(/\r?\n/)) {
      const match = /^\s*import\s+([^\s]+)(?:\s+as\s+\w+)?\s*$/.exec(line);
      if (!match) continue;
      const specifier = match[1];
      if (specifier === 'Base') {
        visit(path.join(derived, 'bend2/base.bend'));
      } else if (specifier.startsWith('"') || specifier.startsWith("'")) {
        const foreign = specifier.slice(1, -1);
        if (/\.(?:js|c)$/.test(foreign)) visit(path.resolve(path.dirname(file), foreign));
      } else {
        visit(path.resolve(path.dirname(file), specifier));
      }
    }
  }
  visit(path.join(repo, entry));
  for (const file of [
    registryPath,
    adapterPath,
    selectedHelperPath,
    path.join(here, 'emit-menu.mjs'),
    path.join(here, 'emit-menu.worker.mjs'),
    path.join(here, 'compiler-eol.mjs'),
    path.join(here, 'lifecycle.mjs'),
  ]) {
    assert.ok(file.startsWith(repoPrefix), `adapter input escaped repository: ${file}`);
    found.set(file, sha256(fs.readFileSync(file)));
  }
  return [...found].map(([file, hash]) => ({
    path: path.relative(repo, file).replaceAll('\\', '/'), sha256: hash,
  })).sort((a, b) => a.path.localeCompare(b.path));
}
function bindingSnapshot() {
  const sourceCommit = git(repo, 'rev-parse', 'HEAD');
  const sourceTree = git(repo, 'show', '-s', '--format=%T', 'HEAD');
  assert.equal(git(repo, 'status', '--porcelain', '--untracked-files=all'), '',
    'selected source checkout must be clean and complete');
  assert.equal(git(scout, 'rev-parse', 'HEAD'), release);
  assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
  assert.equal(git(canonical, 'rev-parse', 'HEAD'), canonicalPin);
  assert.equal(git(canonical, 'status', '--porcelain', '--untracked-files=all'), '');
  assert.equal(git(derived, 'rev-parse', 'HEAD'), release);
  assert.equal(git(derived, 'status', '--porcelain', '--untracked-files=all'),
    ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts');
  const compilerEol = bindCompilerEol((relative) =>
    fs.readFileSync(path.join(derived, relative)));
  const patches = patchStack.map(([file, expected]) => {
    const actual = sha256(fs.readFileSync(file));
    assert.equal(actual, expected, `patch bytes changed: ${file}`);
    return { path: path.relative(repo, file).replaceAll('\\', '/'), sha256: actual };
  });
  return {
    upstream: release,
    canonicalPin,
    sourceCommit, sourceTree,
    derivedEol: compilerEol.eol,
    derivedFiles: compilerEol.files,
    patches,
    sourceFiles: collectSourceClosure(spec.entry),
    module: { name: moduleName, entry: spec.entry, exports: spec.exports },
  };
}
function checkFreeMemory(stage) {
  const freeBytes = os.freemem();
  const rssBytes = process.memoryUsage().rss;
  assert.ok(freeBytes >= minFreeBytes,
    `stop before ${stage}: free physical RAM ${freeBytes} B is below ${minFreeBytes} B`);
  return { freeBytes, rssBytes };
}
function runWorker(data) {
  const worker = new Worker(new URL('./emit-menu.worker.mjs', import.meta.url), { workerData: data });
  return settleWorker(worker, { timeoutMs: workerTimeoutMs, terminateGraceMs: 10_000 });
}

assert.ok(Array.isArray(spec.exports) && spec.exports.length > 0,
  'selected roots must remain explicit and nonempty');
const binding = bindingSnapshot();
const bindingSha256 = sha256(Buffer.from(JSON.stringify(binding)));
if (preflightOnly) {
  console.log(JSON.stringify({ schema: 'rift-bend-2032-selected-preflight/1', ok: true,
    module: binding.module,
    bindingSha256, sourceCommit: binding.sourceCommit,
    sourceTree: binding.sourceTree, derivedEol: binding.derivedEol,
    derivedFiles: binding.derivedFiles,
    scope: 'read-only source/compiler/patch preflight; no Worker, JS, manifest or pin adoption' }));
  process.exit(0);
}
const outputRootRealParent = fs.realpathSync(path.join(repo, '.artifacts/bend2'));
assert.equal(outputRootRealParent, path.join(repo, '.artifacts/bend2'));
execFileSync('git', ['check-ignore', '--quiet', path.relative(repo, outputRoot)], { cwd: repo });
fs.mkdirSync(outputRoot, { recursive: true });
const rootStat = fs.lstatSync(outputRoot);
assert.ok(rootStat.isDirectory() && !rootStat.isSymbolicLink(), 'preview output root must be a real directory');
const runId = `${moduleName}-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const runDir = path.join(outputRoot, runId);
const outputPath = path.join(runDir, `${moduleName}.js`);
const manifestPath = path.join(runDir, `${moduleName}.manifest.json`);
const tempManifestPath = path.join(runDir, `manifest-${runId}.pending`);
execFileSync('git', ['check-ignore', '--quiet', path.relative(repo, outputPath)], { cwd: repo });
const lockData = JSON.stringify({
  schema: 'rift-bend-preview-exclusive-lease/1',
  runId,
  workerMayBeLive: true,
  evidence: 'after Worker start, lock is retained unless the owned worker exit is observed',
}) + '\n';
let lockLease;
let manifestCommitted = false;
try {
  lockLease = acquireOwnedLock(lockPath, lockData);
  fs.mkdirSync(runDir, { recursive: false });
  const start = performance.now();
  const beforeWorker = checkFreeMemory(`${moduleName} emission worker`);
  const result = await runWorker({
    repo, scout, derived, entry: path.join(repo, spec.entry), outputPath,
    exports: spec.exports,
  });
  const outputStat = fs.lstatSync(outputPath);
  assert.ok(outputStat.isFile() && !outputStat.isSymbolicLink(), 'selected cache is not a regular file');
  const outputBytes = fs.readFileSync(outputPath);
  assert.equal(outputBytes.length, result.output.bytes, 'selected cache byte count differs from worker receipt');
  assert.equal(sha256(outputBytes), result.output.sha256, 'selected cache bytes differ from worker receipt');
  const module = await import(`data:text/javascript;base64,${outputBytes.toString('base64')}`);
  assert.deepEqual(Object.keys(module.default), spec.exports,
    'generated export names/order differ from the selected module specification');
  const afterEmissionMemory = checkFreeMemory(`${moduleName} cache verification`);
  const afterBinding = bindingSnapshot();
  assert.deepEqual(afterBinding, binding,
    'selected source/compiler/helper/patch binding changed during load or emission');
  assert.equal(networkCalls, 0);
  assert.equal(result.networkCalls, 0);

  const manifest = {
    schema: 'rift-bend-selected-cache/2032-1',
    module: binding.module,
    bindingSha256,
    binding,
    output: { file: `${moduleName}.js`, bytes: outputBytes.length, sha256: sha256(outputBytes) },
    timing: { elapsedMs: Math.round(performance.now() - start), ...result.timing },
    memory: { beforeWorker, ...result.memory, afterEmission: afterEmissionMemory,
      minimumFreeBytes: minFreeBytes },
    networkCalls,
    evidence: `one source-bound 2.0.32 ${moduleName} selected-library emission; no whole-app/browser acceptance`,
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  assert.deepEqual(bindingSnapshot(), binding,
    'source/compiler binding changed before temporary manifest creation');
  const commit = finalizeOwnedManifest(tempManifestPath, manifestPath, manifestBytes, {
    verifyTemp: (bytes) => assert.deepEqual(JSON.parse(bytes.toString('utf8')), manifest),
    beforeCommit: () => {
      assert.deepEqual(bindingSnapshot(), binding,
        'source/compiler binding changed before final manifest commit');
      const finalOutput = fs.lstatSync(outputPath);
      assert.ok(finalOutput.isFile() && !finalOutput.isSymbolicLink(), 'selected cache changed to non-regular file');
      const currentBytes = fs.readFileSync(outputPath);
      assert.equal(currentBytes.length, manifest.output.bytes, 'selected output changed before final manifest commit');
      assert.equal(sha256(currentBytes), manifest.output.sha256, 'selected output hash changed before final manifest commit');
    },
  });
  manifestCommitted = true;
  console.log(JSON.stringify({
    ok: true,
    output: path.relative(repo, outputPath).replaceAll('\\', '/'),
    manifest: path.relative(repo, manifestPath).replaceAll('\\', '/'),
    manifestSha256: sha256(manifestBytes),
    pendingManifestRetained: commit.tempRetained,
    outputSha256: manifest.output.sha256,
    bytes: manifest.output.bytes,
    exports: Object.keys(module.default),
    bindingSha256,
    timing: manifest.timing,
    memory: manifest.memory,
    networkCalls,
  }));
} catch (error) {
  if (lockLease && error?.workerMayBeLive === true) {
    lockLease.preserve = true;
    console.error(JSON.stringify({
      workerMayBeLive: true,
      lockPreserved: path.relative(repo, lockPath).replaceAll('\\', '/'),
      reason: String(error),
    }));
  }
  throw error;
} finally {
  if (lockLease) {
    if (lockLease.preserve) closeOwnedLock(lockLease);
    else {
      try { releaseOwnedLock(lockLease); }
      catch (error) {
        if (!manifestCommitted) throw error;
        lockLease.preserve = true;
        console.error(JSON.stringify({
          outputCommitted: true,
          lockPreserved: path.relative(repo, lockPath).replaceAll('\\', '/'),
          reason: String(error),
        }));
      }
    }
  }
}
