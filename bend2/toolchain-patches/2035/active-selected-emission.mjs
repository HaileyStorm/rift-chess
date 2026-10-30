import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolveActive } from '../../tools/active-toolchain.mjs';
import { finalizeOwnedManifest } from '../2032/preview/lifecycle.mjs';

const self = fileURLToPath(import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const within = (root, file) => { const rel = path.relative(root, file); return rel !== '' && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel); };
const helpers = {
  preloader: 'bend2/toolchain-patches/2032/tag-identity/preload-root.mjs',
  selectedModule: 'bend2/toolchain-patches/004-web-workers/rebase-2032/selected-module.mjs',
};
function relative(name) {
  assert.ok(typeof name === 'string' && name && !name.includes('\\') && !name.includes(':') && !path.isAbsolute(name));
  assert.ok(name.split('/').every(part => part && part !== '.' && part !== '..')); return name;
}
function read(file, maximum = 16 * 2 ** 20) {
  assert.equal(fs.realpathSync(file), file);
  const before = fs.lstatSync(file, { bigint: true });
  assert.ok(before.isFile() && !before.isSymbolicLink() && before.size > 0n && before.size <= BigInt(maximum));
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const bytes = fs.readFileSync(fd);
    for (const stat of [fs.fstatSync(fd, { bigint: true }), fs.lstatSync(file, { bigint: true })])
      for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(stat[key], before[key]);
    assert.equal(fs.realpathSync(file), file); return bytes;
  } finally { fs.closeSync(fd); }
}
function write(file, bytes) {
  const fd = fs.openSync(file, 'wx');
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  assert.deepEqual(read(file, 4 * 2 ** 20), bytes);
  return { file: path.basename(file), bytes: bytes.length, sha256: sha(bytes) };
}

// comp.ts::io_base requires the unapplied IO head, including under a telescope.
function emitSelectedLibrary2035(bend, compiler, selectedModule, book, roots) {
  assert.equal(book.hols, 0);
  assert.ok(Array.isArray(roots) && roots.length > 0 && roots.every(name => typeof name === 'string' && name.length > 0 && !name.includes(':')));
  const order = book.order, tlds = book.tlds, definitions = roots.map(name => tlds[name]);
  const code = selectedModule(bend, { ...compiler, io_base: (sourceBook, type) => {
    const io = sourceBook.tlds.IO;
    if (io?.$ !== 'Def' || !io.b) return null;
    const declarations = Object.assign(Object.create(sourceBook.tlds), { IO: { ...io, v: null } });
    const [head, args] = bend.term_unapply(bend.term_wnf({ ...sourceBook, tlds: declarations }, type));
    return head.$ === 'Ref' && head.k === 'IO' ? args : null;
  } }, book, roots);
  assert.equal(book.order, order); assert.equal(book.tlds, tlds);
  assert.deepEqual(roots.map(name => book.tlds[name]), definitions); return code;
}

export async function emitActiveSelected2035({ selection, inputRef, outputDirectory }) {
  const active = resolveActive({ ...selection, purpose: 'selectedEmission' });
  assert.equal(active.adapterRef.base, 'repository');
  assert.equal(path.resolve(active.repositoryRoot, active.adapterRef.path), self, 'selected adapter is not this executing module');
  assert.ok(typeof Bun !== 'undefined', 'selected emission requires its reviewed Bun launch');
  assert.equal(active.runtime.engine, 'bun'); assert.equal(process.env.BEND_NO_TELEMETRY, '1');
  const roots = { repository: active.repositoryRoot, packet: active.packetRoot }, allowed = new Map(), fences = new Map();
  function target(row) {
    assert.deepEqual(Object.keys(row).sort(), ['base', 'bytes', 'path', 'sha256']);
    assert.ok(Object.hasOwn(roots, row.base)); const file = path.resolve(roots[row.base], relative(row.path));
    assert.ok(within(roots[row.base], file)); assert.match(row.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(row.bytes) && row.bytes > 0); return file;
  }
  function ref(row, selected = true) {
    const file = target(row); if (selected) assert.deepEqual(allowed.get(file), row, 'consumed input is not selected');
    const bytes = read(file); assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256);
    if (fences.has(file)) assert.equal(fences.get(file), row.sha256); fences.set(file, row.sha256); return bytes;
  }
  for (const row of active.inputRefs) { const file = target(row); assert.ok(!allowed.has(file), 'duplicate selected input'); allowed.set(file, row); }
  assert.deepEqual(allowed.get(target(inputRef)), inputRef, 'config must be an exact unique selected input');
  ref(active.adapterRef, false);
  const descriptor = JSON.parse(ref(selection.descriptorRef, false));
  assert.equal(selection.descriptorRef.sha256, active.descriptorSha256);
  assert.equal(selection.adoptionRef.sha256, active.adoptionSha256);
  const adoption = JSON.parse(ref(selection.adoptionRef, false));
  assert.equal(adoption.currentApplication.sourceRevision, active.sourceRevision);
  assert.equal(adoption.activationReview.sha256, active.reviewSha256);
  ref(adoption.activationReview, false); ref(selection.originalLaunchRef, false);
  const executable = active.runtime.executable, runtimeFile = path.resolve(executable.path);
  assert.equal(runtimeFile, path.resolve(process.execPath));
  const runtimeIdentity = fs.lstatSync(runtimeFile, { bigint: true });
  function verifyRuntime() {
    const bytes = read(runtimeFile, 128 * 2 ** 20);
    assert.equal(bytes.length, executable.bytes); assert.equal(sha(bytes), executable.sha256);
    const stat = fs.lstatSync(runtimeFile, { bigint: true });
    for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(stat[key], runtimeIdentity[key]);
  }
  verifyRuntime();
  const configBytes = ref(inputRef); assert.ok(configBytes.length <= 512 * 2 ** 10);
  const config = JSON.parse(configBytes);
  assert.equal(config.schema, 'rift-current35-selected-emission-input/1');
  assert.equal(config.sourceRevision, active.sourceRevision); assert.match(config.sourceRevision, /^[a-f0-9]{40}$/);
  assert.equal(config.program, null); assert.equal(config.entry.base, 'repository');
  assert.ok(config.entry.path.startsWith('bend2/') && config.entry.path.endsWith('.bend'));
  assert.deepEqual(config.compilerInventory, descriptor.activeToolchain.inventory);
  const inventory = JSON.parse(ref(config.compilerInventory));
  assert.equal(inventory.schema, 'rift-compiler-byte-inventory/1');
  const compilerRoot = active.sourceDirectory;
  assert.equal(path.resolve(active.repositoryRoot, relative(inventory.sourceDirectory)), compilerRoot);
  assert.equal(inventory.files.length, 99);
  for (const row of inventory.files) {
    const bound = { ...row, base: 'repository', path: inventory.sourceDirectory + '/' + relative(row.path) };
    const file = target(bound); if (allowed.has(file)) assert.deepEqual(allowed.get(file), bound); else allowed.set(file, bound);
    ref(bound);
  }
  assert.deepEqual(Object.keys(config.helpers).sort(), Object.keys(helpers).sort());
  for (const [key, name] of Object.entries(helpers)) {
    assert.equal(config.helpers[key].base, 'repository'); assert.equal(config.helpers[key].path, name); ref(config.helpers[key]);
  }
  const bound = file => { const row = allowed.get(file); assert.ok(row, 'unbound consumed file: ' + file); return ref(row); };
  const modules = new Set();
  function module(file) {
    if (modules.has(file)) return; modules.add(file);
    const text = file === self ? ref(active.adapterRef, false).toString('utf8') : bound(file).toString('utf8');
    for (const match of text.matchAll(/(?:^|\n)import\s+(?:[^;'"\n]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
      if (match[1].startsWith('node:')) continue;
      assert.ok(match[1].startsWith('.')); module(path.resolve(path.dirname(file), match[1]));
    }
  }
  module(self); for (const row of Object.values(config.helpers)) module(target(row));
  const closure = new Set(), project = path.join(active.repositoryRoot, 'bend2');
  function visit(file) {
    if (closure.has(file)) return; closure.add(file);
    assert.ok(within(project, file) || within(compilerRoot, file)); const bytes = bound(file);
    if (!file.endsWith('.bend')) { assert.ok(/\.(?:c|js)$/.test(file)); return; }
    for (const line of bytes.toString('utf8').split(/\r?\n/).filter(line => /^\s*import\b/.test(line))) {
      const match = /^\s*import\s+(Base|\.{1,2}\/[^\s]+\.bend)(?:\s+as\s+\w+)?\s*(?:#.*)?$/.exec(line);
      const foreign = /^\s*import\s+["'](\.{1,2}\/[^"']+\.(?:c|js))["']\s*(?:#.*)?$/.exec(line);
      assert.ok(match || foreign, 'unsupported selected source import: ' + line);
      const spec = foreign ? foreign[1] : match[1];
      visit(spec === 'Base' ? path.join(compilerRoot, 'base.bend') : path.resolve(path.dirname(file), spec));
    }
  }
  const entry = target(config.entry); ref(config.entry); visit(entry);
  assert.ok(Array.isArray(config.sourceClosure) && config.sourceClosure.every(row => row.base === 'repository'));
  assert.deepEqual(config.sourceClosure.map(row => { ref(row); return target(row); }).sort(), [...closure].sort(), 'complete source closure differs');
  for (const row of active.inputRefs) ref(row);
  const verify = () => {
    for (const [file, digest] of fences) assert.equal(sha(read(file)), digest, 'consumed input changed: ' + file);
    verifyRuntime();
  };
  const out = path.resolve(outputDirectory); assert.ok(within(active.packetRoot, out));
  const parent = path.dirname(out); assert.equal(fs.realpathSync(parent), parent); assert.ok(fs.lstatSync(parent).isDirectory());
  assert.match(config.outputFile, /^[A-Za-z][A-Za-z0-9_-]*\.mjs$/);
  const intent = out + '.intent.json'; assert.ok(!fs.existsSync(out) && !fs.existsSync(intent), 'retain original emission attempt');
  const methods = ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork'];
  const saved = Object.fromEntries(methods.map(key => [key, childProcess[key]]));
  const savedFetch = globalThis.fetch, savedSpawn = Bun.spawn, savedSpawnSync = Bun.spawnSync;
  let networkCalls = 0, subprocessCalls = 0, stage = 'intent', created = false;
  const deny = () => { subprocessCalls++; throw Error('selected emission denies subprocess'); };
  try {
    globalThis.fetch = async () => { networkCalls++; throw Error('selected emission denies network'); };
    for (const key of methods) childProcess[key] = deny;
    syncBuiltinESMExports(); Bun.spawn = Bun.spawnSync = deny;
    verify(); write(intent, Buffer.from(JSON.stringify({ schema: 'rift-current35-selected-emission-intent/1', inputRef,
      selection: active, outputDirectory: out, noRetry: true }, null, 2) + '\n'));
    fs.mkdirSync(out); created = true;
    stage = 'compiler-import';
    const bend = await import(pathToFileURL(path.join(compilerRoot, 'bend.ts')).href);
    const compiler = await import(pathToFileURL(path.join(compilerRoot, 'comp.ts')).href);
    const { loadWithStableImports } = await import(pathToFileURL(target(config.helpers.preloader)).href);
    const { selectedModule } = await import(pathToFileURL(target(config.helpers.selectedModule)).href);
    stage = 'load'; const book = bend.book_nil();
    const loaded = await loadWithStableImports(bend, book, entry, project);
    assert.deepEqual(loaded.preloaded, config.preloads); assert.equal(loaded.seen.get(entry), '');
    assert.deepEqual([...loaded.seen.keys()].sort(), [...closure].filter(file => file.endsWith('.bend')).sort());
    stage = 'whole-book'; bend.book_valid(book, 0); assert.equal(book.hols, 0);
    stage = 'selected-emission';
    const bytes = Buffer.from(emitSelectedLibrary2035(bend, compiler, selectedModule, book, config.exports));
    assert.ok(bytes.length > 0 && bytes.length <= 4 * 2 ** 20); verify();
    assert.equal(networkCalls, 0); assert.equal(subprocessCalls, 0);
    const output = write(path.join(out, config.outputFile), bytes);
    const manifest = { schema: 'rift-current35-selected-emission/1', ok: true, entry: config.entry.path,
      sources: config.sourceClosure.map(({ base, ...row }) => row), exports: config.exports, program: null,
      output, preloaded: loaded.preloaded, wholeBookValid: true, holes: book.hols, sourceFencesPassed: true,
      sourceFenceCount: fences.size, networkCalls, subprocessCalls, compilerRoot: inventory.sourceDirectory,
      compilerInventory: config.compilerInventory, runtime: active.runtime, sourceRevision: config.sourceRevision,
      inputRef, selection: active, provenance: { adapter: active.adapterRef, helpers: config.helpers,
        manifestFinalizer: allowed.get(path.resolve(active.repositoryRoot, 'bend2/toolchain-patches/2032/preview/lifecycle.mjs')),
        descriptor: selection.descriptorRef, adoption: selection.adoptionRef,
        activationReview: adoption.activationReview, originalLaunch: selection.originalLaunchRef, executable },
      kernelAccepted: false, nativeDeviceAccepted: false,
      scope: 'Reviewed production selection; whole-book validation and pure selected JS source emission only. No emitted program execution, proof, browser, native, GPU or performance acceptance.' };
    const metadata = Buffer.from(JSON.stringify(manifest, null, 2) + '\n'); assert.ok(metadata.length <= 512 * 2 ** 10);
    const manifestPath = path.join(out, 'manifest.json');
    finalizeOwnedManifest(path.join(out, 'manifest.pending'), manifestPath, metadata, {
      verifyTemp: bytes => assert.deepEqual(bytes, metadata),
      beforeCommit: () => { assert.deepEqual(read(path.join(out, output.file), 4 * 2 ** 20), bytes); verify(); },
    });
    assert.deepEqual(read(manifestPath, 512 * 2 ** 10), metadata);
    const manifestRef = { file: 'manifest.json', bytes: metadata.length, sha256: sha(metadata) };
    return { ok: true, selection: active, manifest: { path: path.join(out, manifestRef.file), ...manifestRef },
      output: { path: path.join(out, output.file), ...output } };
  } catch (error) {
    if (created) {
      try { write(path.join(out, 'failure.json'), Buffer.from(JSON.stringify({ ok: false, stage,
        error: String(error.message ?? error).slice(0, 6000), networkCalls, subprocessCalls, inputRef }, null, 2) + '\n')); }
      catch (receiptError) { error.receiptWriteError = String(receiptError); }
    }
    throw error;
  } finally {
    globalThis.fetch = savedFetch; for (const key of methods) childProcess[key] = saved[key];
    syncBuiltinESMExports(); Bun.spawn = savedSpawn; Bun.spawnSync = savedSpawnSync;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === self) throw Error('use owning reviewed launcher');
