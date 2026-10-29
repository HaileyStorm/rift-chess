import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { resolveActive, resolveCandidateNativeBuild } from '../../tools/active-toolchain.mjs';
import { read, verify, write, writeJson, sha256, directoryIdentity, syncDirectory, memorySnapshot, FLAGS, LIMITS } from './native-resources.mjs';

const self = fileURLToPath(import.meta.url), TIMEOUT = 600000;
const ORIGINAL = '8447be64f7f196bd7ecb14a9bb07a795f0bab004ad7078f4703b11e7a31882db';
const PATCH = '28ec36660b3d78c2373b5ff0591385e7a6cc39e6fd33cb9a2a1732d0a01ad2fa';
const OVERLAY = '805482c3f7fb7958977ad6f1e3d46476dd1dc6d3969234b36784c250762907a8';
const helperPaths = { assets: 'bend2/toolchain-patches/native-v2-2032/linux-cpu/common.mjs',
  aggregate: 'bend2/core/v3/2032/aggregate-safety.mjs', lifecycle: 'bend2/toolchain-patches/2032/preview/lifecycle.mjs',
  supervisor: 'bend2/core/v3/2032/bendtt-supervisor.mjs' };
const within = (root, file) => file.startsWith(root + path.sep);
function relative(name) {
  assert.ok(typeof name === 'string' && name && !name.includes('\\') && !name.includes(':') && !path.isAbsolute(name));
  assert.ok(name.split('/').every(p => p && p !== '.' && p !== '..')); return name;
}
function mkdir(directory) {
  directoryIdentity(path.dirname(directory)); fs.mkdirSync(directory, { mode: 0o700 }); return directoryIdentity(directory);
}
function parents(root, name) {
  let d = root;
  for (const p of relative(name).split('/')) {
    d = path.join(d, p); if (!fs.existsSync(d)) mkdir(d); else directoryIdentity(d);
  }
  return d;
}
function overlay(bytes) {
  assert.equal(sha256(bytes), ORIGINAL);
  const text = bytes.toString('utf8'), eol = text.includes('\r\n') ? '\r\n' : '\n';
  const anchor = '        T.PointerMove{x, y} <> acc, closed)' + eol;
  assert.equal(text.split(anchor).length, 2);
  const addition = ['    case Look{_, _} <> rest:',
    '      events_go(rest, alt_mask, ctrl_mask, shift_mask, acc, closed)',
    '    case Scroll{x, y, _, dy} <> rest:',
    '      events_go(rest, alt_mask, ctrl_mask, shift_mask,',
    '        T.Wheel{x, y, F32.sub(0.0, F32.mul(dy, 100.0))} <> acc, closed)'].join(eol) + eol;
  const result = Buffer.from(text.replace(anchor, anchor + addition)); assert.equal(sha256(result), OVERLAY); return result;
}
function reviewedApplication(active, selection, ref) {
  const descriptor = JSON.parse(ref(selection.descriptorRef, false).bytes);
  let authority, application;
  if (active.kind === 'owning-reviewed-candidate-native-selection') {
    authority = JSON.parse(ref(selection.candidateRef, false).bytes);
    assert.equal(authority.schema, 'rift-candidate-native-build/1');
    application = authority.application; ref(authority.review, false);
    ref(descriptor.activeToolchain.lineage, false);
  } else {
    assert.equal(active.kind, 'owning-reviewed-active-selection');
    authority = JSON.parse(ref(selection.adoptionRef, false).bytes);
    assert.equal(authority.schema, 'rift-toolchain-adoption/2');
    application = authority.currentApplication; ref(authority.activationReview, false);
  }
  ref(selection.originalLaunchRef, false);
  return { descriptor, application };
}
function context(active, selection, inputRef) {
  const roots = { repository: active.repositoryRoot, packet: active.packetRoot }, fences = new Map(), allowed = new Map();
  function ref(row, selected = true) {
    assert.deepEqual(Object.keys(row).sort(), ['base', 'bytes', 'path', 'sha256']);
    assert.ok(Object.hasOwn(roots, row.base)); const file = path.resolve(roots[row.base], relative(row.path));
    assert.ok(within(roots[row.base], file)); assert.match(row.sha256, /^[a-f0-9]{64}$/);
    if (selected) assert.deepEqual(allowed.get(file), row, 'unselected consumed source');
    const current = read(file); assert.equal(current.bytes.length, row.bytes); assert.equal(current.identity.sha256, row.sha256);
    if (fences.has(file)) assert.deepEqual(current.identity, fences.get(file));
    fences.set(file, current.identity); return current;
  }
  for (const row of active.inputRefs) {
    const file = path.resolve(roots[row.base], relative(row.path)); assert.ok(!allowed.has(file), 'duplicate selected input'); allowed.set(file, row);
  }
  assert.equal(active.inputRefs.filter(r => r.base === inputRef.base && r.path === inputRef.path
    && r.bytes === inputRef.bytes && r.sha256 === inputRef.sha256).length, 1, 'build config must be an exact selected input');
  const { descriptor, application } = reviewedApplication(active, selection, ref);
  const inventory = JSON.parse(ref(descriptor.activeToolchain.inventory, false).bytes);
  for (const row of inventory.files) {
    const bound = { ...row, base: 'repository', path: descriptor.activeToolchain.sourceDirectory + '/' + relative(row.path) };
    const file = path.resolve(active.repositoryRoot, bound.path);
    if (allowed.has(file)) assert.deepEqual(allowed.get(file), bound); else allowed.set(file, bound);
  }
  for (const row of allowed.values()) ref(row);
  const config = JSON.parse(ref(inputRef).bytes);
  assert.equal(config.schema, 'rift-current35-native-build-input/1');
  assert.equal(config.sourceRevision, application.sourceRevision);
  assert.equal(config.entry.base, 'repository'); assert.equal(config.entry.path, 'bend2/NativeV2.bend');
  assert.equal(config.entry.sha256, ORIGINAL); assert.equal(config.eventPatch.sha256, PATCH); ref(config.eventPatch);
  assert.equal(config.eventPatch.base, 'repository');
  assert.equal(config.eventPatch.path, 'bend2/toolchain-patches/native-v2-2032/events/0001-native-v2-events.patch');
  assert.equal(config.overlaySha256, OVERLAY);
  assert.deepEqual(Object.keys(config.helpers).sort(), Object.keys(helperPaths).sort());
  for (const [key, expected] of Object.entries(helperPaths)) {
    assert.equal(config.helpers[key].base, 'repository'); assert.equal(config.helpers[key].path, expected); ref(config.helpers[key]);
  }
  function bound(file) { const row = allowed.get(file); assert.ok(row, 'consumed file is not selected: ' + file); return ref(row); }
  const modules = new Set();
  function module(file) {
    if (modules.has(file)) return; modules.add(file);
    const text = bound(file).bytes.toString('utf8');
    for (const m of text.matchAll(/(?:^|\n)import\s+(?:[^;'"]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
      if (m[1].startsWith('node:')) continue;
      assert.ok(m[1].startsWith('.')); module(path.resolve(path.dirname(file), m[1]));
    }
  }
  module(self); module(path.join(path.dirname(self), 'native-build-worker.mjs'));
  for (const row of Object.values(config.helpers)) module(path.resolve(active.repositoryRoot, row.path));
  const compiler = active.sourceDirectory, projectRoot = path.join(active.repositoryRoot, 'bend2'), found = new Set();
  function visit(file) {
    if (found.has(file)) return; found.add(file); const data = bound(file).bytes;
    if (path.extname(file) !== '.bend') { assert.ok(within(compiler, file) && /\.(c|js)$/.test(file)); return; }
    assert.ok(within(compiler, file) || within(projectRoot, file));
    for (const line of data.toString('utf8').split(/\r?\n/).filter(l => /^\s*import\b/.test(l))) {
      const m = /^\s*import\s+(Base|\.{1,2}\/[^\s]+)(?:\s+as\s+\w+)?\s*(?:#.*)?$/.exec(line);
      const foreign = /^\s*import\s+["'](\.{1,2}\/[^"']+\.(?:c|js))["']\s*(?:#.*)?$/.exec(line);
      assert.ok(m || foreign, 'unsupported source import: ' + line);
      const spec = foreign ? foreign[1] : m[1];
      visit(spec === 'Base' ? path.join(compiler, 'base.bend') :
        path.resolve(path.dirname(file), path.extname(spec) ? spec : spec + '.bend'));
    }
  }
  visit(path.join(active.repositoryRoot, config.entry.path));
  assert.deepEqual(config.sourceClosure.map(r => ref(r).identity.path).sort(), [...found].sort(), 'source closure differs');
  const runtime = read(config.runtime.path), clang = read(config.clang.path);
  for (const [actual, expected] of [[runtime, config.runtime], [clang, config.clang]]) {
    assert.equal(actual.identity.bytes, expected.bytes); assert.equal(actual.identity.sha256, expected.sha256); assert.ok(actual.identity.mode & 0o111);
    fences.set(actual.identity.path, actual.identity);
  }
  assert.equal(config.runtime.path, process.execPath); assert.equal(config.runtime.version, process.version);
  for (const key of ['path', 'bytes', 'sha256']) assert.equal(config.runtime[key], active.runtime.executable[key]);
  assert.equal(active.runtime.engine, 'node'); assert.deepEqual(process.execArgv, []);
  assert.deepEqual(config.workerExecArgv, FLAGS);
  assert.deepEqual(Object.keys(config.containment), ['unit']);
  relative(config.outputParent); assert.ok(config.outputParent.startsWith('.artifacts/bend2/'));
  ref(config.entry); return { config, compiler, found, bound, fences, ref };
}
async function emit(workerPath, data, lifecycle, run) {
  const worker = new Worker(pathToFileURL(workerPath), { workerData: data, execArgv: [...FLAGS],
    resourceLimits: { ...LIMITS }, stdout: true, stderr: true });
  const chunks = { stdout: [], stderr: [] }, sizes = { stdout: 0, stderr: 0 }; let failure;
  for (const stream of Object.keys(chunks)) worker[stream].on('data', bytes => {
    const room = Math.max(0, 65536 - sizes[stream]); sizes[stream] += bytes.length;
    if (room) chunks[stream].push(Buffer.from(bytes).subarray(0, room));
  });
  worker.on('message', value => { if (!value?.ok) failure = value; });
  let result, error;
  try { result = await lifecycle.settleWorker(worker, { timeoutMs: TIMEOUT, terminateGraceMs: 10000 }); } catch (e) { error = e; }
  const logs = {}, prefixes = {}, partialReadbacks = {}, logWriteErrors = {};
  let firstLogError;
  for (const stream of Object.keys(chunks)) {
    const file = path.join(run, 'worker.' + stream); prefixes[stream] = Buffer.concat(chunks[stream]);
    try { logs[stream] = write(file, prefixes[stream]); }
    catch (e) {
      firstLogError ??= e; logWriteErrors[stream] = { message: String(e.message ?? e) };
      try {
        const partial = read(file); logs[stream] = partial.identity; partialReadbacks[stream] = partial.bytes;
      } catch (readError) { logWriteErrors[stream].readbackError = String(readError.message ?? readError); }
    }
  }
  try {
    if (error) throw error;
    if (firstLogError) throw firstLogError;
    assert.ok(sizes.stdout <= 65536 && sizes.stderr <= 65536, 'worker log bound exceeded');
    assert.deepEqual(result.limits, LIMITS); assert.deepEqual(result.execArgv, FLAGS); assert.equal(result.fetches, 0);
    return { ...result, logs, observedExit: true };
  } catch (primary) {
    primary.workerFailure = failure; primary.workerLogs = { logs, sizes, prefixes, partialReadbacks, logWriteErrors };
    if (firstLogError) primary.logWriteError = firstLogError;
    if (primary.workerMayBeLive === true) primary.retainedWorker = worker;
    throw primary;
  }
}
function launcher() {
  return '#!/bin/sh\nset -eu\npackage_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)\ndata_dir=${RIFT_CHESS_DATA_DIR:-"$package_dir/data"}\ncase "$data_dir" in /*) ;; *) data_dir="$package_dir/$data_dir" ;; esac\nmkdir -p "$data_dir"\nexport RIFT_CHESS_DATA_DIR="$data_dir"\nexport BEND_NO_TELEMETRY=1\ncd "$package_dir"\nexec "$package_dir/bin/rift-chess-native-v2" --gpu off "$@"\n';
}
function retainLink(run, result, command) {
  const { stdout, stderr, ...metadata } = result, streams = {};
  for (const [name, bytes] of Object.entries({ stdout, stderr })) {
    assert.ok(Buffer.isBuffer(bytes)); streams[name] = write(path.join(run, 'clang.' + name), bytes);
  }
  const record = { ...metadata, command, streams }; writeJson(path.join(run, 'clang-process.json'), record); return record;
}
async function buildNative2035({ selection, inputRef, outputDirectory }, active) {
  const candidate = active.kind === 'owning-reviewed-candidate-native-selection';
  const classification = candidate ? { kind: 'candidate-nonadopted-native-cpu-build', adopted: false } : {};
  assert.equal(active.adapterRef.base, 'repository'); assert.equal(path.resolve(active.repositoryRoot, active.adapterRef.path), self);
  assert.equal(process.platform, 'linux'); assert.equal(process.arch, 'x64'); assert.equal(process.env.BEND_NO_TELEMETRY, '1');
  assert.equal(process.env.NODE_OPTIONS ?? '', ''); assert.equal(process.env.NODE_PATH ?? '', ''); assert.equal(process.env.BUN_OPTIONS ?? '', '');
  // runOwnedGroup merges its supplied environment over the inherited one.
  // Reject overrides that could select unbound headers, tools or loader code.
  for (const name of ['CPATH', 'C_INCLUDE_PATH', 'CPLUS_INCLUDE_PATH', 'OBJC_INCLUDE_PATH',
    'LIBRARY_PATH', 'COMPILER_PATH', 'GCC_EXEC_PREFIX', 'CCC_OVERRIDE_OPTIONS',
    'LD_PRELOAD', 'LD_AUDIT', 'LD_LIBRARY_PATH']) {
    assert.equal(process.env[name] ?? '', '', 'unbound native build environment: ' + name);
  }
  const c = context(active, selection, inputRef), b = c.config, h = {};
  for (const [key, row] of Object.entries(b.helpers)) h[key] = await import(pathToFileURL(path.resolve(active.repositoryRoot, row.path)).href);
  assert.equal(h.assets.ROOT, active.repositoryRoot);
  const assets = h.assets.collectRuntimeAssets();
  for (const [name, digest] of Object.entries(assets.inputSha256)) assert.equal(c.bound(path.join(active.repositoryRoot, name)).identity.sha256, digest);
  const parent = path.resolve(active.repositoryRoot, b.outputParent), run = path.resolve(outputDirectory);
  directoryIdentity(parent); assert.equal(path.dirname(run), parent); assert.match(path.basename(run), /^[A-Za-z0-9_-]+$/);
  const intent = run + '.intent.json'; assert.equal(fs.existsSync(intent), false); assert.equal(fs.existsSync(run), false);
  let lease, stage = 'lock', initial, worker, link, linkRecord, receipt, runCreated = false, fetches = 0;
  const oldFetch = globalThis.fetch; globalThis.fetch = async () => { fetches++; throw Error('native build network denied'); };
  try {
    verify([...c.fences.values()]);
    lease = h.lifecycle.acquireOwnedLock(path.join(parent, 'active-native-build.lock'), JSON.stringify({ output: run, selection: active.reviewSha256, owner: process.env.CODEX_THREAD_ID }));
    writeJson(intent, { schema: 'rift-current35-native-build-intent/1', ...classification,
      output: run, inputRef, selection: active, pid: process.pid, noRetry: true });
    const runIdentity = mkdir(run); runCreated = true;
    stage = 'initial-admission'; initial = memorySnapshot(h.aggregate, b.containment.unit, 'before-application-load');
    writeJson(path.join(run, 'initial-memory.json'), initial);
    stage = 'stage-source'; const source = path.join(run, 'source'); mkdir(source); const staged = [], expectedLoaded = [];
    for (const file of c.found) {
      if (within(c.compiler, file)) { if (file.endsWith('.bend')) expectedLoaded.push(file); continue; }
      const name = path.relative(active.repositoryRoot, file).split(path.sep).join('/');
      parents(source, path.posix.dirname(name)); const destination = path.join(source, name);
      staged.push(write(destination, name === b.entry.path ? overlay(c.bound(file).bytes) : c.bound(file).bytes));
      if (destination.endsWith('.bend')) expectedLoaded.push(destination);
    }
    const fences = [...c.fences.values(), ...staged]; verify(fences);
    stage = 'load-validate-emit';
    worker = await emit(path.join(path.dirname(self), 'native-build-worker.mjs'), { run, runIdentity, compiler: c.compiler,
      entry: path.join(source, b.entry.path), projectBendRoot: path.join(source, 'bend2'), expectedLoaded: expectedLoaded.sort(),
      fences, aggregate: path.resolve(active.repositoryRoot, b.helpers.aggregate.path), unit: b.containment.unit, leaf: initial.leaf.identity }, h.lifecycle, run);
    verify(fences); const cFile = read(worker.emitted.path); assert.deepEqual(cFile.identity, worker.emitted);
    assert.ok(cFile.bytes.includes(Buffer.from('#include <X11/')) && cFile.bytes.includes(Buffer.from('#include <alsa/')));
    stage = 'package-assets'; const pkg = path.join(run, 'package'); mkdir(pkg); mkdir(path.join(pkg, 'bin')); const files = {};
    for (const row of h.assets.assertAssetRows(assets.rows)) {
      parents(pkg, path.posix.dirname(row.packagePath));
      files[row.packagePath] = write(path.join(pkg, row.packagePath), c.bound(path.join(active.repositoryRoot, row.sourcePath)).bytes);
    }
    const shell = write(path.join(pkg, 'run-native-v2.sh'), launcher(), 0o755);
    writeJson(path.join(pkg, 'runtime-assets.json'), { manifests: assets.manifests, files });
    mkdir(path.join(run, 'home')); mkdir(path.join(run, 'tmp'));
    const env = { PATH: '/usr/bin:/bin', HOME: path.join(run, 'home'), TMPDIR: path.join(run, 'tmp'),
      TMP: path.join(run, 'tmp'), TEMP: path.join(run, 'tmp'), LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', BEND_NO_TELEMETRY: '1',
      NODE_OPTIONS: '', BUN_OPTIONS: '', HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9', ALL_PROXY: 'http://127.0.0.1:9',
      http_proxy: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9', all_proxy: 'http://127.0.0.1:9', NO_PROXY: '', no_proxy: '' };
    stage = 'clang-link'; verify(fences); const binaryPath = path.join(pkg, 'bin/rift-chess-native-v2');
    const linkArgs = h.assets.clangCompileArguments(worker.emitted.path, binaryPath), linkCommand = [b.clang.path, ...linkArgs];
    try { link = await h.supervisor.runOwnedGroup(b.clang.path, linkArgs,
      { cwd: run, env, timeoutMs: TIMEOUT, maxOutputBytes: 2 * 1024 ** 2, label: 'current35 native CPU link' }); }
    catch (error) {
      if (error.partialResult) {
        link = error.partialResult;
        try { linkRecord = retainLink(run, link, linkCommand); } catch (e) { error.receiptWriteError = String(e); }
      }
      throw error;
    }
    linkRecord = retainLink(run, link, linkCommand);
    assert.equal(link.status, 0); assert.equal(link.signal, null); assert.equal(link.groupQuiescent, true); assert.equal(link.groupStateKnown, true);
    assert.equal(link.outputLimitExceeded, false); assert.equal(link.timedOut, false);
    const binaryFd = fs.openSync(binaryPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try { fs.fsyncSync(binaryFd); } finally { fs.closeSync(binaryFd); }
    syncDirectory(path.dirname(binaryPath));
    const binary = read(binaryPath); assert.ok(binary.identity.mode & 0o111);
    const elf = h.assets.elfIdentity(binary.bytes.subarray(0, 20));
    verify(fences); assert.deepEqual(h.assets.collectRuntimeAssets(), assets);
    for (const row of [...Object.values(files), shell, worker.emitted]) assert.deepEqual(read(row.path).identity, row);
    assert.equal(fetches, 0); stage = 'receipt';
    receipt = { schema: candidate ? 'rift-current35-native-cpu-candidate-package/1' : 'rift-current35-native-cpu-package/1',
      ...classification, passed: true, selection: active, inputRef,
      sourceRevision: b.sourceRevision, originalEntry: b.entry, eventPatch: b.eventPatch, overlaySha256: OVERLAY,
      sourceClosure: b.sourceClosure, staged, worker, link: linkRecord, assets, files, launcher: shell, binary: { ...binary.identity, elf },
      admissions: [initial, worker.admission], containment: memorySnapshot(h.aggregate, b.containment.unit, 'final', initial.leaf.identity, false),
      scope: (candidate ? 'Nonadopted candidate. ' : '') +
        'Current35 source validation, C emission, CPU ELF link and assets only; no ELF/CUDA/device/proof or inherited acceptance claim.' };
    const receiptPath = path.join(pkg, 'receipt.json'), receiptBytes = Buffer.from(JSON.stringify(receipt, null, 2) + '\n');
    h.lifecycle.finalizeOwnedManifest(path.join(pkg, 'receipt.pending'), receiptPath, receiptBytes,
      { beforeCommit: () => { verify(fences); } });
    const receiptReadback = read(receiptPath); assert.deepEqual(receiptReadback.bytes, receiptBytes);
    syncDirectory(pkg); const receiptIdentity = receiptReadback.identity;
    h.lifecycle.releaseOwnedLock(lease); lease = null;
    return { passed: true, ...classification, receipt: receiptIdentity, binary: binary.identity, sourceC: worker.emitted };
  } catch (error) {
    if (lease) { lease.preserve = true; try { h.lifecycle.closeOwnedLock(lease); } catch (e) { error.lockCloseError = String(e); } }
    const failure = { schema: 'rift-current35-native-build-failure/1', ...classification, stage, reason: String(error.message ?? error),
      workerMayBeLive: error.workerMayBeLive === true, worker: worker ?? error.workerFailure ?? null,
      workerLogs: error.workerLogs ?? null, link: linkRecord ?? null,
      receiptWriteError: error.receiptWriteError ?? null, admission: error.memoryAdmission ?? null, initial,
      lockPreserved: !!lease, lockCloseError: error.lockCloseError ?? null };
    try { writeJson(runCreated ? path.join(run, 'failure.json') : run + '.failure.json', failure); }
    catch (e) { error.receiptWriteError = String(e); }
    throw error;
  } finally { globalThis.fetch = oldFetch; }
}

export async function buildActiveNative2035(args) {
  return buildNative2035(args, resolveActive({ ...args.selection, purpose: 'nativeBuild' }));
}

export async function buildCandidateNative2035(args) {
  const candidate = resolveCandidateNativeBuild(args.selection);
  assert.deepEqual(args.inputRef, candidate.buildConfigRef);
  assert.equal(path.resolve(args.outputDirectory), candidate.outputDirectory);
  return buildNative2035(args, candidate);
}

