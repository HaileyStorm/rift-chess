// Tracked producer is inert. Root arms a reviewed ignored copy by changing only this digest.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const approvedBindingSha256 = null;
const here = path.dirname(fileURLToPath(import.meta.url));
let nativeToolsReference;
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const OUTPUT = '.artifacts/bend2/native-v2-current99-linux';
export const FLAGS = Object.freeze(['--experimental-transform-types']);
export const helpers = Object.freeze({
  preload: 'bend2/toolchain-patches/2032/tag-identity/preload-root.mjs',
  aggregate: 'bend2/core/v3/2032/aggregate-safety.mjs',
  lifecycle: 'bend2/toolchain-patches/2032/preview/lifecycle.mjs',
  supervisor: 'bend2/core/v3/2032/bendtt-supervisor.mjs',
  assets: 'bend2/toolchain-patches/native-v2-2032/linux-cpu/common.mjs',
});
export function relative(value) {
  assert.equal(typeof value, 'string');
  assert.ok(value && !value.includes('\\') && !value.includes(':') && !value.startsWith('/')
    && value.split('/').every(p => p && p !== '.' && p !== '..'), 'unsafe relative path');
  return value;
}
export function realDirectory(value) {
  assert.equal(path.resolve(value), value); assert.equal(fs.realpathSync(value), value);
  const s = fs.lstatSync(value); assert.ok(s.isDirectory() && !s.isSymbolicLink()); return value;
}
export function syncDirectory(directory) {
  realDirectory(directory);
  const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
export function read(file) {
  assert.equal(path.resolve(file), file); assert.equal(fs.realpathSync(file), file);
  const before = fs.lstatSync(file, { bigint: true });
  const same = s => {
    assert.ok(s.isFile() && !s.isSymbolicLink());
    for (const k of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(s[k], before[k], file);
  };
  same(before); const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  let bytes;
  try { same(fs.fstatSync(fd, { bigint: true })); bytes = fs.readFileSync(fd);
    same(fs.fstatSync(fd, { bigint: true })); same(fs.lstatSync(file, { bigint: true }));
    assert.equal(fs.realpathSync(file), file); assert.equal(BigInt(bytes.length), before.size);
  } finally { fs.closeSync(fd); }
  return { bytes, identity: { path: file, bytes: bytes.length, sha256: sha256(bytes),
    dev: String(before.dev), ino: String(before.ino), mode: Number(before.mode & 0o777n) } };
}
export function write(file, data, mode = 0o600) {
  realDirectory(path.dirname(file)); const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const fd = fs.openSync(file, 'wx', mode);
  try { let offset = 0; while (offset < bytes.length) {
    const n = fs.writeSync(fd, bytes, offset, bytes.length - offset, offset); assert.ok(n > 0); offset += n;
  } fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  syncDirectory(path.dirname(file));
  const result = read(file); assert.deepEqual(result.bytes, bytes); return result.identity;
}
export const writeJson = (file, data) => write(file, JSON.stringify(data, null, 2) + '\n');
export function bindNativeTools(reference) {
  assert.equal(nativeToolsReference, undefined, 'native tool observation can be bound only once');
  assert.deepEqual(Object.keys(reference).sort(), ['path', 'sha256']);
  assert.equal(path.resolve(reference.path), reference.path); assert.match(reference.sha256, /^[a-f0-9]{64}$/);
  nativeToolsReference = Object.freeze({ ...reference });
}
export function nativeTools() {
  const b = config(); assert.ok(nativeToolsReference, 'original native linker observation required');
  const raw = read(nativeToolsReference.path); assert.equal(raw.identity.sha256, nativeToolsReference.sha256);
  const observation = JSON.parse(raw.bytes.toString('utf8'));
  assert.equal(observation.schema, 'rift-current99-native-cpu-tools/1');
  assert.equal(observation.ownerTask, b.ownerTask); assert.equal(observation.sourceCommit, b.source.commit);
  assert.equal(observation.nativeBindingSha256, approvedBindingSha256);
  assert.equal(observation.requestedCommand, b.clang.command);
  assert.ok(path.isAbsolute(b.clang.command));
  const actual = read(fs.realpathSync(b.clang.command)).identity;
  assert.deepEqual(actual, observation.resolvedClang);
  assert.ok(actual.mode & 0o111, 'observed linker is not executable');
  return { reference: { ...nativeToolsReference }, observation: raw.identity, clang: actual };
}
export function config() {
  assert.match(approvedBindingSha256 ?? '', /^[a-f0-9]{64}$/, 'STOP: native CPU binding is unarmed');
  const raw = read(path.join(here, 'approved-binding.json'));
  assert.equal(raw.identity.sha256, approvedBindingSha256);
  const b = JSON.parse(raw.bytes.toString('utf8'));
  assert.equal(b.schema, 'rift-current99-native-cpu-fixed-binding/1');
  assert.equal(b.ownerTask, '01a10a7d-098d-7af3-84fa-a7317597c654');
  assert.equal(process.env.CODEX_THREAD_ID, b.ownerTask);
  assert.equal(process.platform, 'linux'); assert.equal(process.arch, 'x64');
  realDirectory(b.root); realDirectory(b.candidateRoot); realDirectory(b.compilerRoot);
  assert.equal(process.cwd(), b.root);
  assert.equal(here, path.join(b.root, relative(b.consumerDirectory)));
  assert.equal(b.outputDirectory, OUTPUT); assert.match(b.runName, /^run-[A-Za-z0-9_-]+$/);
  assert.equal(b.review.disposition, 'accepted-for-one-current99-native-cpu-build');
  assert.equal(process.env.BEND_NO_TELEMETRY, '1'); assert.equal(process.env.NODE_OPTIONS ?? '', '');
  assert.equal(process.env.BUN_OPTIONS ?? '', ''); assert.equal(typeof globalThis.Bun, 'undefined');
  return b;
}
export const at = (root, name) => path.join(root, ...relative(name).split('/'));
export function git(b, ...args) {
  return execFileSync('git', ['-C', b.root, ...args], { encoding: 'utf8', windowsHide: true,
    timeout: 90_000, maxBuffer: 32 * 1024 ** 2, stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
}
function records(root, expected) {
  assert.ok(expected && typeof expected === 'object' && !Array.isArray(expected));
  return Object.fromEntries(Object.keys(expected).sort().map(name => {
    assert.match(expected[name], /^[a-f0-9]{64}$/); const r = read(at(root, name)).identity;
    assert.equal(r.sha256, expected[name], name); return [name, { bytes: r.bytes, sha256: r.sha256 }];
  }));
}
function inventory(root) {
  realDirectory(root);
  const visit = dir => fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)
    .flatMap(e => { assert.ok(!e.isSymbolicLink()); const file = path.join(dir, e.name);
      if (e.isDirectory()) return visit(file); assert.ok(e.isFile());
      const r = read(file).identity;
      return [[path.relative(root, file).split(path.sep).join('/'), { bytes: r.bytes, sha256: r.sha256 }]];
    });
  return Object.fromEntries(visit(root));
}
export function authenticate() {
  const b = config();
  assert.deepEqual(Object.keys(b.helpers).sort(), Object.keys(helpers).sort());
  for (const [key, name] of Object.entries(helpers)) {
    assert.equal(b.helpers[key], name); assert.ok(Object.hasOwn(b.repositoryInputs, name));
  }
  // common.mjs imports this inert EOL helper; aggregate imports lifecycle above.
  assert.ok(Object.hasOwn(b.repositoryInputs, 'bend2/toolchain-patches/2032/preview/compiler-eol.mjs'));
  const inputs = records(b.root, b.repositoryInputs);
  assert.deepEqual(Object.keys(b.modules).sort(), ['binding.mjs', 'run.mjs', 'worker.mjs']);
  for (const [name, expected] of Object.entries(b.modules)) {
    let raw = read(path.join(here, name)).bytes;
    if (name === 'binding.mjs') {
      const source = raw.toString('utf8');
      const pattern = /^const approvedBindingSha256 = (?:null|'[a-f0-9]{64}');$/gm;
      assert.equal([...source.matchAll(pattern)].length, 1);
      raw = Buffer.from(source.replace(pattern, 'const approvedBindingSha256 = null;'));
    }
    assert.equal(sha256(raw), expected, `producer source changed: ${name}`);
  }
  return inputs;
}
export async function loadHelpers() {
  const b = config(); authenticate(); const result = {};
  for (const [key, name] of Object.entries(helpers)) result[key] = await import(pathToFileURL(at(b.root, name)).href);
  return result;
}
export function capture(worker = false) {
  const b = config(), repository = authenticate();
  assert.equal(git(b, 'rev-parse', 'HEAD'), b.source.commit);
  assert.equal(git(b, 'rev-parse', 'HEAD^{tree}'), b.source.tree);
  assert.equal(git(b, 'status', '--porcelain=v1', '--untracked-files=no'), '', 'tracked source changed');
  assert.equal(process.version, 'v22.23.1'); assert.deepEqual(process.execArgv, worker ? FLAGS : []);
  const node = read(fs.realpathSync(process.execPath)).identity;
  assert.equal(node.path, b.runtime.path);
  assert.equal(node.sha256, '93956de2e59480474a7b46571da1651180b1a050cdf32641ebec4ce6e478e068');
  assert.equal(node.sha256, b.runtime.sha256);
  const tools = nativeTools(), clang = tools.clang;
  const originals = records(b.root, b.source.projectFiles);
  assert.equal(Object.keys(originals).length, 86);
  // Bind consumed source files, preserving ignored live sentinel/coordination
  // metadata. The independently derived and actual loaded closures below reject
  // extra consumed imports; an untracked directory inventory is not authority.
  const candidate = records(b.candidateRoot, b.source.candidateFiles);
  assert.deepEqual(Object.keys(candidate), Object.keys(originals));
  for (const name of Object.keys(originals)) if (name !== 'bend2/NativeV2.bend') assert.deepEqual(candidate[name], originals[name]);
  assert.equal(originals['bend2/NativeV2.bend'].sha256, '29fc92d043aff032de13ceafad63ef4f101c72b08f93b7199c3ce40bd333cf6d');
  assert.equal(candidate['bend2/NativeV2.bend'].sha256, '9fe46e219123e3f59958de98c6f9b65fc618cca85ca0325740dffc30e8aef292');
  const patch = 'bend2/toolchain-patches/native-v2-2032/events/0001-native-v2-events.patch';
  assert.equal(repository[patch]?.sha256, '28ec36660b3d78c2373b5ff0591385e7a6cc39e6fd33cb9a2a1732d0a01ad2fa');
  const compiler = inventory(b.compilerRoot);
  assert.deepEqual(compiler, records(b.compilerRoot, b.compilerFiles)); assert.equal(Object.keys(compiler).length, 99);
  assert.equal(Object.values(compiler).reduce((n, r) => n + r.bytes, 0), 1208629);
  const baseEffects = records(b.compilerRoot, b.source.baseEffectFiles);
  assert.equal(Object.keys(baseEffects).length, 69);
  for (const [name, record] of Object.entries(baseEffects)) assert.deepEqual(record, compiler[name]);
  return { bindingSha256: approvedBindingSha256, source: { commit: b.source.commit, tree: b.source.tree,
    sourceStatusScope: 'tracked-files', originals, candidate, baseEffects }, compiler, repository,
    runtime: { node, version: process.version }, clang, nativeTools: tools };
}
export function expectedLoadedPaths() {
  const b = config(), files = new Set(), effects = new Set(['base.bend']), visit = file => {
    if (files.has(file)) return; files.add(file);
    const data = read(file).bytes.toString('utf8');
    for (const line of data.split(/\r?\n/)) {
      if (!/^\s*import\b/.test(line)) continue;
      const foreign = /^\s*import\s+["'](\.{1,2}\/[^"']+\.(?:c|js))["']\s*(?:#.*)?$/.exec(line);
      if (foreign) {
        const target = path.resolve(path.dirname(file), foreign[1]);
        const name = path.relative(b.compilerRoot, target).split(path.sep).join('/');
        assert.ok(Object.hasOwn(b.source.baseEffectFiles, name), 'foreign effect escaped bound compiler inputs');
        effects.add(name); continue;
      }
      const m = /^\s*import\s+(Base|\.{1,2}\/[^\s]+\.bend)(?:\s+as\s+[A-Za-z_]\w*)?\s*(?:#.*)?$/.exec(line);
      assert.ok(m, `unsupported import in ${file}`);
      const target = m[1] === 'Base' ? path.join(b.compilerRoot, 'base.bend') : path.resolve(path.dirname(file), m[1]);
      const root = target === path.join(b.compilerRoot, 'base.bend') ? b.compilerRoot : b.candidateRoot;
      const name = path.relative(root, target).split(path.sep).join('/');
      assert.ok(Object.hasOwn(root === b.compilerRoot ? b.compilerFiles : b.source.candidateFiles, name));
      visit(target);
    }
  };
  visit(at(b.candidateRoot, 'bend2/NativeV2.bend'));
  assert.deepEqual([...effects].sort(), Object.keys(b.source.baseEffectFiles).sort());
  const project = [...files].filter(file => file !== path.join(b.compilerRoot, 'base.bend'))
    .map(file => path.relative(b.candidateRoot, file).split(path.sep).join('/')).sort();
  assert.deepEqual(project, Object.keys(b.source.candidateFiles).sort());
  return [...files].sort();
}
export function memoryAdmission(aggregate, phase) {
  let snapshot;
  try {
    const text = fs.readFileSync('/proc/meminfo', 'ascii'); const m = /^MemAvailable:\s+(\d+)\s+kB$/m.exec(text);
    assert.ok(m, 'MemAvailable unavailable'); const available = Number(m[1]) * 1024;
    assert.ok(Number.isSafeInteger(available));
    snapshot = aggregate.admittedMemorySnapshot({ hostFree: available });
    assert.equal(snapshot.mode, 'linux-init-cgroup-full-ancestry-admitted');
    assert.equal(snapshot.ancestryMode, 'init-cgroup-namespace-visible-v2-full-ancestry');
    const sample = { phase, sampledAt: new Date().toISOString(), floorBytes: 88 * 1024 ** 3,
      admitted: snapshot.availableBytes >= 88 * 1024 ** 3, snapshot };
    if (!sample.admitted) { const error = Error('STOP: native C production requires 88 GiB under full host/cgroup ancestry');
      error.memoryAdmission = sample; throw error; }
    return sample;
  } catch (error) {
    error.memoryAdmission ??= { phase, sampledAt: new Date().toISOString(), floorBytes: 88 * 1024 ** 3,
      admitted: false, snapshot: snapshot ?? null, error: String(error.message ?? error) };
    throw error;
  }
}
