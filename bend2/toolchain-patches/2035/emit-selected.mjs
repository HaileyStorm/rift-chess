// node bend2/tools/bend.mjs --run bend2/toolchain-patches/2035/emit-selected.mjs --module scene
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { selectedModule } from '../004-web-workers/rebase-2032/selected-module.mjs';
import { loadWithStableImports } from '../2032/tag-identity/preload-root.mjs';
import { acquireOwnedLock, closeOwnedLock, releaseOwnedLock, finalizeOwnedManifest,
  settleWorker } from '../2032/preview/lifecycle.mjs';
import { assertLocalBunRuntime } from '../2032/browser-loader/runtime.mjs';
import { root, moduleSpecs, derived, previewRoot, selectedBinding2035, readSource, sha256 }
  from './selected-binding.mjs';

process.env.BEND_NO_TELEMETRY = '1';
let networkCalls = 0;
let describeError = String;
globalThis.fetch = async () => { networkCalls++; throw Error('candidate selected emitter denies network'); };
const memory = () => ({ rssBytes: process.memoryUsage().rss, freeBytes: os.freemem() });

// Exact predicate from source-bound 2.0.35 comp.ts::io_base. io_type narrows
// its result to one argument, so it cannot replace this purity predicate.
function ioBase2035(bend, book, type) {
  const io = book.tlds.IO;
  if (io?.$ !== 'Def' || !io.b) return null;
  const tlds = Object.assign(Object.create(book.tlds), { IO: { ...io, v: null } });
  const [head, args] = bend.term_unapply(bend.term_wnf({ ...book, tlds }, type));
  return head.$ === 'Ref' && head.k === 'IO' ? args : null;
}

export function emitSelectedLibrary2035(bend, compiler, book, roots) {
  assert.equal(book.hols, 0, 'selected source has unfilled declarations');
  assert.ok(Array.isArray(roots) && roots.length > 0 && roots.every(name =>
    typeof name === 'string' && name.length > 0 && !name.includes(':')),
  'candidate selected exports must be explicit bare names');
  const order = book.order;
  const tlds = book.tlds;
  const definitions = roots.map(name => book.tlds[name]);
  const code = selectedModule(bend, { ...compiler,
    io_base: (sourceBook, type) => ioBase2035(bend, sourceBook, type),
  }, book, roots);
  assert.equal(book.order, order, 'selected emission changed source order identity');
  assert.equal(book.tlds, tlds, 'selected emission changed source declaration identity');
  assert.deepEqual(roots.map(name => book.tlds[name]), definitions);
  return code;
}

async function workerMain() {
  const { name, diagnostic, binding, outputPath } = workerData;
  assert.deepEqual(selectedBinding2035(name, diagnostic), binding, 'worker input binding changed');
  const bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
  describeError = error => error?.$ === 'Err' ? bend.err_show(error) : String(error);
  const compiler = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')).href);
  const started = performance.now();
  const beforeLoad = memory();
  const book = bend.book_nil();
  const identity = await loadWithStableImports(bend, book,
    path.join(root, binding.module.entry), path.join(root, 'bend2'));
  bend.book_valid(book, 0);
  assert.equal(book.hols, 0, 'selected module has an unfilled law or TODO');
  const actualSources = [...identity.seen.keys()].map(file => ({
    path: path.relative(root, file).split(path.sep).join('/'), sha256: sha256(readSource(file)),
  })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  assert.deepEqual(actualSources, binding.sourceFiles.filter(file => file.path.endsWith('.bend')),
    'loaded Bend closure differs from the bound current source');
  assert.equal(identity.seen.get(fs.realpathSync(path.join(root, binding.module.entry))), '');
  assert.deepEqual(selectedBinding2035(name, diagnostic), binding, 'source changed during checking');
  const checkedMs = Math.round(performance.now() - started);
  const afterCheck = memory();
  const emitStart = performance.now();
  const code = emitSelectedLibrary2035(bend, compiler, book, binding.module.exports);
  const bytes = Buffer.from(code);
  const publicModule = await import(`data:text/javascript;base64,${bytes.toString('base64')}`);
  assert.deepEqual(Object.keys(publicModule.default), binding.module.exports,
    'candidate public exports differ from the selected registry');
  const commonTags = Object.fromEntries(['core/Model:Pos', 'graphics/Scene:Frame', 'graphics/Camera:View']
    .filter(key => book.ctrs[key]).map(key => [key, bend.name_key(key)]));
  if (!diagnostic && (name === 'controller' || name === 'scene')) {
    assert.equal(commonTags['core/Model:Pos'], 'core/Model.Pos');
    assert.equal(commonTags['graphics/Scene:Frame'], 'graphics/Scene.Frame');
    assert.equal(commonTags['graphics/Camera:View'], 'graphics/Camera.View');
  }
  let diagnosticResult;
  if (diagnostic) {
    assert.equal(commonTags['core/Model:Pos'], 'core/Model.Pos');
    assert.equal(publicModule.default.square_file(9), 1);
    assert.equal(publicModule.default.square_row(9), 6);
    diagnosticResult = { square: 9, file: 1, row: 6 };
  }
  assert.deepEqual(selectedBinding2035(name, diagnostic), binding, 'source changed during emission');
  assert.equal(networkCalls, 0);
  if (outputPath) {
    const fd = fs.openSync(outputPath, 'wx');
    try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    assert.deepEqual(readSource(outputPath), bytes, 'candidate output readback changed');
  }
  return { ok: true, output: { bytes: bytes.length, sha256: sha256(bytes) },
    exports: Object.keys(publicModule.default), diagnosticResult,
    tagIdentity: { policy: binding.tagIdentity, rootNamespace: '',
      preloaded: identity.preloaded, loadedBendFiles: actualSources.length, commonTags },
    timing: { checkedMs, emitMs: Math.round(performance.now() - emitStart) },
    memory: { beforeLoad, afterCheck, afterEmit: memory() }, networkCalls };
}

async function main() {
  const args = process.argv.slice(2);
  const diagnostic = args.length === 1 && args[0] === '--scene-diagnostic';
  const preflight = args.at(-1) === '--preflight-only';
  assert.ok(diagnostic || ((args.length === 2 || (args.length === 3 && preflight))
    && args[0] === '--module'),
  'use --module controller|scene|chrome|menu [--preflight-only], or --scene-diagnostic');
  const name = diagnostic ? 'scene' : args[1];
  assert.ok(Object.hasOwn(moduleSpecs, name), 'unknown selected module');
  assert.ok(typeof Bun !== 'undefined', 'run through the local Bend wrapper');
  const bunExe = assertLocalBunRuntime(root, path.join(root, '.artifacts/toolchains/runtime'), process.execPath);
  const binding = selectedBinding2035(name, diagnostic);
  assert.equal(Bun.version, binding.bunVersion, 'local Bun version differs from the accepted runtime');
  binding.runtime = { version: Bun.version, executable: path.relative(root, bunExe).split(path.sep).join('/'),
    sha256: sha256(readSource(bunExe)) };
  const bindingSha256 = sha256(JSON.stringify(binding));
  // Runtime is checked by this parent; the worker checks all source/compiler inputs.
  const sourceBinding = { ...binding };
  delete sourceBinding.runtime;
  if (preflight) {
    console.log(JSON.stringify({ schema: 'rift-bend-2035-selected-preflight/1', ok: true,
      module: binding.module, bindingSha256, sourceFiles: binding.sourceFiles.length,
      compilerFiles: binding.derivedFiles.length, memory: memory(),
      evidence: 'read-only exact candidate/source binding; no compiler execution' }));
    return;
  }
  let lease;
  let runDir;
  let outputPath;
  if (!diagnostic) {
    assert.equal(fs.realpathSync(path.dirname(previewRoot)), path.dirname(previewRoot));
    fs.mkdirSync(previewRoot, { recursive: true });
    assert.equal(fs.realpathSync(previewRoot), previewRoot, 'candidate preview root is redirected');
    lease = acquireOwnedLock(path.join(previewRoot, 'selected-emitter.lock'), JSON.stringify({
      schema: 'rift-bend-2035-emission-lease/1', module: name, bindingSha256,
      workerMayBeLive: true, ownerTask: process.env.CODEX_THREAD_ID ?? null,
    }));
  }
  try {
    if (!diagnostic) {
      runDir = fs.mkdtempSync(path.join(previewRoot, name + '-'));
      outputPath = path.join(runDir, name + '.js');
    }
    const worker = new Worker(fileURLToPath(import.meta.url), {
      workerData: { name, diagnostic, binding: sourceBinding, outputPath },
    });
    const result = await settleWorker(worker, { timeoutMs: diagnostic ? 60_000 : 300_000,
      terminateGraceMs: 10_000 });
    assert.deepEqual(selectedBinding2035(name, diagnostic), sourceBinding, 'parent binding changed after emission');
    assert.equal(sha256(readSource(bunExe)), binding.runtime.sha256, 'runtime bytes changed');
    assert.equal(networkCalls + result.networkCalls, 0);
    if (diagnostic) {
      console.log(JSON.stringify({ schema: 'rift-bend-2035-scene-source-diagnostic/1', bindingSha256,
        module: binding.module, sourceFiles: binding.sourceFiles.length,
        compilerSourceSha256: Object.fromEntries(binding.derivedFiles
          .filter(file => ['bend.ts', 'comp.ts', 'base.bend'].includes(file.path))
          .map(file => [file.path, file.sha256])),
        ...result, evidence: 'small current Scene source/check/selected JS witness; no candidate cache or frame' }));
      return;
    }
    const output = readSource(outputPath);
    assert.equal(output.length, result.output.bytes);
    assert.equal(sha256(output), result.output.sha256);
    const manifest = { schema: 'rift-bend-selected-cache/2035-1', bindingSha256, binding,
      module: binding.module, tagIdentity: result.tagIdentity,
      output: { file: name + '.js', ...result.output }, timing: result.timing,
      memory: result.memory, networkCalls: 0,
      evidence: 'one current-source candidate selected-library emission; no proof/browser/native/GPU acceptance' };
    const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
    const manifestPath = path.join(runDir, name + '.manifest.json');
    finalizeOwnedManifest(path.join(runDir, 'manifest.pending'), manifestPath, manifestBytes, {
      verifyTemp: bytes => assert.deepEqual(JSON.parse(bytes), manifest),
      beforeCommit: () => {
        assert.deepEqual(selectedBinding2035(name), sourceBinding, 'binding changed before manifest commit');
        assert.deepEqual(readSource(outputPath), output, 'output changed before manifest commit');
      },
    });
    assert.deepEqual(readSource(manifestPath), manifestBytes, 'manifest readback changed');
    console.log(JSON.stringify({ ok: true, module: name, bindingSha256,
      output: path.relative(root, outputPath), manifest: path.relative(root, manifestPath),
      manifestSha256: sha256(manifestBytes), ...result }));
  } catch (error) {
    if (lease && error?.workerMayBeLive) lease.preserve = true;
    console.error(JSON.stringify({ ok: false, runDir, workerMayBeLive: !!error?.workerMayBeLive,
      timedOut: !!error?.timedOut, retainedPartialOutput: !!runDir, error: String(error).slice(0, 1800) }));
    throw error;
  } finally {
    if (lease) {
      if (lease.preserve) closeOwnedLock(lease);
      else releaseOwnedLock(lease);
    }
  }
}

if (!isMainThread) {
  workerMain().then(result => { parentPort.postMessage(result); parentPort.close(); }, error => {
    parentPort.postMessage({ ok: false, error: describeError(error).slice(0, 1800), networkCalls });
    parentPort.close();
  });
} else if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
