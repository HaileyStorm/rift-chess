// Draft production binding. Only root's reviewed source edit may replace null.
// There is deliberately no environment, argv, dependency or approval override.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const approvedBindingSha256 = null;
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const here = path.dirname(fileURLToPath(import.meta.url));
export const helperNames = Object.freeze({
  contracts: 'bend2/core/v3/2035/bendtt-gate/contracts.mjs',
  groupContracts: 'bend2/core/v3/2032/bendtt-gate/contracts.mjs',
  selectedBinding: 'bend2/toolchain-patches/2035/selected-binding.mjs',
  selectedModules: 'bend2/tools/selected-modules.mjs',
  aggregate: 'bend2/core/v3/2032/aggregate-safety.mjs',
  lifecycle: 'bend2/toolchain-patches/2032/preview/lifecycle.mjs',
  supervisor: 'bend2/core/v3/2032/bendtt-supervisor.mjs',
  preload: 'bend2/toolchain-patches/2032/tag-identity/preload-root.mjs',
  proof: 'bend2/core/v3/proof-authority.mjs',
});
export function relative(value) {
  assert.equal(typeof value, 'string');
  assert.ok(value && !value.includes('\\') && !value.includes(':') && !value.startsWith('/')
    && value.split('/').every(p => p && p !== '.' && p !== '..'), 'noncanonical relative input');
  return value;
}
export function readFile(file, limit = 64 * 1024 ** 2) {
  assert.equal(path.resolve(file), file); assert.equal(fs.realpathSync(file), file, 'redirected input');
  const before = fs.lstatSync(file, { bigint: true });
  const same = stat => {
    assert.ok(stat.isFile() && !stat.isSymbolicLink());
    for (const k of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(stat[k], before[k], 'input changed');
  };
  same(before); assert.ok(before.size >= 0n && before.size <= BigInt(limit));
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  let bytes;
  try {
    same(fs.fstatSync(fd, { bigint: true })); bytes = fs.readFileSync(fd);
    same(fs.fstatSync(fd, { bigint: true })); same(fs.lstatSync(file, { bigint: true }));
    assert.equal(fs.realpathSync(file), file); assert.equal(BigInt(bytes.length), before.size);
  } finally { fs.closeSync(fd); }
  return { bytes, identity: { path: file, bytes: bytes.length, sha256: sha256(bytes),
    dev: String(before.dev), ino: String(before.ino), mode: Number(before.mode & 0o777n) } };
}
export function config() {
  assert.match(approvedBindingSha256 ?? '', /^[0-9a-f]{64}$/,
    'STOP: native current99 binding is unarmed; root review and original owner receipts required');
  const raw = readFile(path.join(here, 'approved-binding.json')).bytes;
  assert.equal(sha256(raw), approvedBindingSha256, 'fixed binding differs');
  const b = JSON.parse(raw.toString('utf8'));
  assert.equal(b.schema, 'rift-current99-native-fixed-binding/1');
  assert.equal(b.ownerTask, '01a10a7d-098d-7af3-84fa-a7317597c654');
  assert.equal(process.env.CODEX_THREAD_ID, b.ownerTask, 'actual enrolled owner required');
  assert.equal(process.platform, 'linux'); assert.equal(process.arch, 'x64');
  assert.equal(process.cwd(), b.root); assert.equal(fs.realpathSync(b.root), b.root);
  assert.equal(here, path.join(b.root, ...relative(b.consumerDirectory).split('/')));
  assert.equal(typeof b.compilerRoot, 'string'); assert.ok(path.isAbsolute(b.compilerRoot));
  assert.equal(path.resolve(b.compilerRoot), b.compilerRoot);
  assert.equal(fs.realpathSync(b.compilerRoot), b.compilerRoot);
  assert.equal(b.entry, 'bend2/core/v3/2035/PREPARED_CHECK.bend');
  assert.equal(b.outputDirectory, '.artifacts/bend2/2035-kernel-20261005');
  assert.equal(process.env.BEND_NO_TELEMETRY, '1');
  assert.equal(process.env.NODE_OPTIONS ?? '', ''); assert.equal(typeof globalThis.Bun, 'undefined');
  assert.equal(b.review.disposition, 'accepted-for-one-current99-full62-native-kernel-run');
  assert.equal(b.source.review.disposition, 'accepted-current99-source-and-windows-history');
  return b;
}
export const absolute = input => path.join(config().root, ...relative(input).split('/'));
export function bound(ref) {
  assert.match(ref.sha256, /^[0-9a-f]{64}$/);
  const raw = readFile(absolute(ref.path)); assert.equal(raw.identity.sha256, ref.sha256, ref.path);
  return raw;
}
function jsonRef(ref) { const raw = bound(ref); return { record: JSON.parse(raw.bytes.toString('utf8')), identity: raw.identity }; }
function acquisitionReceipt() {
  const ref = config().nativeAcquisitionReceipt;
  if (ref === null) return null;
  assert.match(ref.sha256, /^[0-9a-f]{64}$/);
  // One original owner receipt may live outside the repository, like Node and
  // the approved kernel. This does not broaden repository-relative source reads.
  assert.ok(path.isAbsolute(ref.path));
  const result = readFile(ref.path); assert.equal(result.identity.sha256, ref.sha256);
  return result.identity;
}
function git(...args) {
  return execFileSync('git', ['-C', config().root, ...args], { windowsHide: true, timeout: 90_000,
    maxBuffer: 16 * 1024 ** 2, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' }).replaceAll('\r\n', '\n').trimEnd();
}
function inventory(directory) {
  assert.equal(fs.realpathSync(directory), directory);
  const stat = fs.lstatSync(directory); assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    .flatMap(entry => {
      assert.ok(!entry.isSymbolicLink()); const file = path.join(directory, entry.name);
      if (entry.isDirectory()) return inventory(file);
      assert.ok(entry.isFile()); const { identity } = readFile(file);
      return [{ path: path.relative(config().compilerRoot, file).split(path.sep).join('/'),
        bytes: identity.bytes, sha256: identity.sha256 }];
    });
}
function records(refs) {
  const seen = new Set();
  return refs.map(ref => { assert.ok(!seen.has(relative(ref.path))); seen.add(ref.path);
    const raw = bound(ref); return { path: ref.path, bytes: raw.identity.bytes, sha256: raw.identity.sha256 }; });
}
export function authenticate() {
  const b = config();
  assert.deepEqual(Object.keys(b.helpers).sort(), Object.keys(helperNames).sort());
  for (const [key, name] of Object.entries(helperNames)) {
    assert.equal(b.helpers[key].path, name); bound(b.helpers[key]);
  }
  bound(b.review); bound(b.source.review);
  assert.deepEqual(b.consumerFiles.map(f => f.path.split('/').at(-1)).sort(), ['binding.mjs', 'run.mjs', 'worker.mjs']);
  for (const ref of b.consumerFiles) {
    assert.equal(path.dirname(absolute(ref.path)), here);
    if (ref.path.endsWith('/binding.mjs')) {
      const text = readFile(absolute(ref.path)).bytes.toString('utf8');
      const declaration = /^const approvedBindingSha256 = '[0-9a-f]{64}';$/gm;
      assert.equal([...text.matchAll(declaration)].length, 1, 'one designated digest literal required');
      const normalized = text.replace(declaration, 'const approvedBindingSha256 = null;');
      assert.equal(sha256(normalized), ref.normalizedSha256, 'normalized binding bytes differ');
    } else bound(ref);
  }
  // Provenance only: the actual owner performs live claim/STOP/uncertainty checks
  // before launch. A historical acquisition receipt cannot prove current ownership.
  acquisitionReceipt();
  const compiler = inventory(b.compilerRoot).sort((a, c) => a.path < c.path ? -1 : a.path > c.path ? 1 : 0);
  assert.equal(compiler.length, 99); assert.equal(compiler.reduce((n, f) => n + f.bytes, 0), 1_208_629);
  assert.deepEqual(compiler, b.source.compiler, 'current99 compiler membership or bytes differ');
  records(b.source.inputs); // Complete reviewed current source and normative input set, not just closure.
  records(b.source.historicalWindows); // Original raw Windows records retain Windows scope.
  assert.equal(b.source.historicalWindowsAdmission.disposition, 'accepted-authenticated-original-windows-evidence');
  bound(b.source.historicalWindowsAdmission);
  return b;
}
let helpers;
export async function loadHelpers() {
  authenticate();
  if (!helpers) {
    const loaded = {};
    for (const name of ['contracts', 'aggregate', 'lifecycle', 'supervisor', 'preload', 'proof'])
      loaded[name] = await import(pathToFileURL(absolute(helperNames[name])).href);
    helpers = loaded;
  }
  authenticate(); return helpers;
}
export function closureFiles(paths) {
  const b = config(), base = path.join(b.compilerRoot, 'base.bend');
  return paths.map(file => ({ path: file === base ? '<derived>/bend2/base.bend'
    : path.relative(b.root, file).split(path.sep).join('/'), sha256: readFile(file).identity.sha256 }))
    .sort((a, c) => a.path.localeCompare(c.path));
}
export function captureRuntime(contracts, worker = false) {
  const b = config(), node = readFile(path.resolve(process.execPath), 128 * 1024 ** 2).identity;
  assert.equal(node.path, b.nodePath);
  const runtime = { version: process.version, platform: process.platform, arch: process.arch,
    executableSha256: node.sha256, execArgv: [...process.execArgv], nodeOptions: process.env.NODE_OPTIONS ?? '',
    bunAbsent: typeof globalThis.Bun === 'undefined' };
  const expected = contracts.validateLinuxRuntimeApproval(b.runtime, bound(b.runtime.review).bytes);
  contracts.assertSafeRuntime(runtime, expected, worker);
  return { ...runtime, executable: node };
}
export async function captureBinding(worker = false) {
  await loadHelpers(); return captureBindingSync(worker);
}
export function captureBindingSync(worker = false) {
  const b = authenticate(), h = helpers;
  assert.ok(h, 'authenticated helper load required');
  assert.equal(git('rev-parse', '--show-toplevel'), b.root);
  assert.equal(git('status', '--porcelain=v1', '--untracked-files=all'), '', 'native checkout must be clean');
  assert.equal(git('rev-parse', 'HEAD'), b.source.commit); assert.equal(git('rev-parse', 'HEAD^{tree}'), b.source.tree);
  const expectedPaths = h.aggregate.expectedCheckClosure(b.root, absolute(b.entry), b.source.frozenFiles,
    path.join(b.compilerRoot, 'base.bend'));
  const closure = closureFiles(expectedPaths);
  assert.equal(closure.length, 62); assert.deepEqual(closure, b.source.closure, 'full62 input set differs');
  const kernelApproval = jsonRef(b.kernelApproval);
  const rawKernel = readFile(kernelApproval.record.path);
  assert.ok((rawKernel.identity.mode & 0o111) !== 0);
  const kernel = h.contracts.validateKernelApproval(kernelApproval.record, rawKernel.bytes,
    bound(kernelApproval.record.review).bytes);
  const runtime = captureRuntime(h.contracts, worker);
  authenticate();
  return { source: { schema: 'rift-current99-native-source-binding/1', sourceCommit: b.source.commit,
    sourceTree: b.source.tree, sourceStatus: '', compilerRoot: b.compilerRoot, compiler: b.source.compiler,
    frozenFiles: b.source.frozenFiles, frozenSha256: b.source.frozenSha256,
    closure, expectedPaths, inputs: records(b.source.inputs), historicalWindows: records(b.source.historicalWindows),
    historicalWindowsAdmission: bound(b.source.historicalWindowsAdmission).identity,
    sourceReview: bound(b.source.review).identity, productionReview: bound(b.review).identity,
    consumerFiles: b.consumerFiles, helpers: Object.values(b.helpers),
    nativeAcquisitionReceipt: acquisitionReceipt(),
    ownershipLimit: 'Receipt is provenance only; actual owner must verify live exact reservation and existing fences before launch' },
    runtime, kernel: { ...kernel, identity: rawKernel.identity, approval: kernelApproval.identity } };
}
export function outputIdentity(file) {
  const rel = path.relative(absolute(config().outputDirectory), file);
  assert.ok(rel && !rel.startsWith('..') && !path.isAbsolute(rel));
  const result = readFile(file); assert.ok(result.identity.bytes > 0);
  const { mode, ...identity } = result.identity; return identity;
}
