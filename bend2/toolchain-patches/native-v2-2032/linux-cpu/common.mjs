import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bindCompilerBaseEol, bindCompilerEol } from '../../2032/preview/compiler-eol.mjs';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = fs.realpathSync(path.resolve(HERE, '../../../..'));
export const OUTPUT_RELATIVE = '.artifacts/bend2/native-v2-2032-linux';
export const OUTPUT_ROOT = path.join(ROOT, OUTPUT_RELATIVE);
export const CANDIDATE_COMMIT = '216567d9cdc927cf0b4e00632a80260f9901f4fa';
export const CANDIDATE_TREE = '4fa21705820578137a6c2cb7dfaa41b413c23567';
export const SCOUT_COMMIT = '573002f01ec6c52416d44489543f69a9625facf8';
export const CANONICAL_COMMIT = 'd37909174ebd664338ae3194799a9e0899dedd51';
export const NATIVE_ORIGINAL_SHA256 = '29fc92d043aff032de13ceafad63ef4f101c72b08f93b7199c3ce40bd333cf6d';
export const NATIVE_PATCHED_SHA256 = '9fe46e219123e3f59958de98c6f9b65fc618cca85ca0325740dffc30e8aef292';
export const PATCH_SHA256 = '28ec36660b3d78c2373b5ff0591385e7a6cc39e6fd33cb9a2a1732d0a01ad2fa';
export const NODE_SHA256 = '93956de2e59480474a7b46571da1651180b1a050cdf32641ebec4ce6e478e068';
export const TOOLCHAIN_EOLS = Object.freeze({
  scoutStatus: '',
  derivedStatus: ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts',
  canonicalStatus: '',
});
export const MEMORY_FLOOR_BYTES = 88 * 1024 ** 3;
export const MEMORY_PEAK_KIB = 72_346_644;
export const MEMORY_PEAK_REVISION = 'f8a7fbf';
export const EMIT_TIMEOUT_MS = 600_000;
export const CLANG_TIMEOUT_MS = 600_000;
export const WORKER_STACK_SIZE_MB = 64;
export const EXPECTED_PACKAGE_PATHS = Object.freeze([
  'assets/LICENSES.md',
  'assets/observatory-astral.rga',
  'assets/observatory-stone.rga',
  'assets/pieces-fast-0.rga',
  'assets/pieces-fast-1.rga',
  'assets/pieces-fast-2.rga',
  'assets/rift-observatory-font.rga',
  'licenses/Rift-Atlas-Sans-OFL.txt',
  'licenses/THIRD_PARTY_NOTICES.txt',
  'licenses/Bend-Apache-2.0.txt',
].sort());

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const sha256File = (file) => sha256(fs.readFileSync(file));

export function gitText(cwd, args, { timeoutMs = 30_000 } = {}) {
  const result = spawnSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8', timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0 || result.signal) {
    throw new Error(`git ${args.join(' ')} failed: ${result.error?.message ??
      `status=${result.status} signal=${result.signal}`} ${String(result.stderr ?? '').slice(-1600)}`);
  }
  return result.stdout.replace(/\r\n/g, '\n').trimEnd();
}

export function gitBuffer(cwd, args, { input, timeoutMs = 60_000,
  maxBuffer = 128 * 1024 * 1024 } = {}) {
  const result = spawnSync('git', ['-C', cwd, ...args], {
    input, timeout: timeoutMs, maxBuffer, stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0 || result.signal) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString('utf8') : String(result.stderr ?? '');
    throw new Error(`git ${args.join(' ')} failed: ${result.error?.message ??
      `status=${result.status} signal=${result.signal}`} ${stderr.slice(-1600)}`);
  }
  return result.stdout;
}

export function assertRealDirectory(directory) {
  const absolute = path.resolve(directory);
  const stat = fs.lstatSync(absolute);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), `expected a real directory: ${absolute}`);
  assert.equal(fs.realpathSync(absolute), absolute, `directory identity changed: ${absolute}`);
  return stat;
}

export function assertRegularFile(file, { executable = false } = {}) {
  const absolute = path.resolve(file);
  const stat = fs.lstatSync(absolute);
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), `expected a regular file: ${absolute}`);
  assert.equal(fs.realpathSync(absolute), absolute, `file identity changed: ${absolute}`);
  if (executable) assert.ok((stat.mode & 0o111) !== 0, `file is not executable: ${absolute}`);
  return stat;
}

export function writeExclusive(file, bytes, mode = 0o600) {
  const absolute = path.resolve(file);
  assertRealDirectory(path.dirname(absolute));
  const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const fd = fs.openSync(absolute, 'wx', mode);
  try {
    let offset = 0;
    while (offset < data.length) {
      const written = fs.writeSync(fd, data, offset, data.length - offset, offset);
      assert.ok(Number.isInteger(written) && written > 0, `write made no progress: ${absolute}`);
      offset += written;
    }
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  const stat = assertRegularFile(absolute);
  assert.equal(stat.size, data.length, `written size changed: ${absolute}`);
  assert.deepEqual(fs.readFileSync(absolute), data, `written bytes changed: ${absolute}`);
  return { bytes: data.length, sha256: sha256(data) };
}

export function writeJsonExclusive(file, value) {
  return writeExclusive(file, Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'));
}

export function readJson(file) {
  assertRegularFile(file);
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `expected JSON object: ${file}`);
  return value;
}

export function parseMemAvailable(text) {
  assert.equal(typeof text, 'string');
  const values = text.split(/\r?\n/).filter((line) => line.startsWith('MemAvailable:'));
  assert.equal(values.length, 1, 'expected exactly one MemAvailable line');
  const match = /^MemAvailable:\s+(\d+)\s+kB\s*$/.exec(values[0]);
  assert.ok(match, 'malformed MemAvailable line');
  const kib = Number(match[1]);
  assert.ok(Number.isSafeInteger(kib) && kib >= 0);
  const bytes = kib * 1024;
  assert.ok(Number.isSafeInteger(bytes), 'MemAvailable exceeds safe integer range');
  return bytes;
}

export function parseCgroupV2Path(text) {
  assert.equal(typeof text, 'string');
  const rows = text.split(/\r?\n/).filter((line) => line.startsWith('0::'));
  assert.equal(rows.length, 1, 'expected exactly one unified cgroup v2 process path');
  const value = rows[0].slice(3);
  assert.ok(value.startsWith('/'), 'cgroup path must be absolute');
  const parts = value.split('/').filter(Boolean);
  assert.ok(parts.every((part) => part !== '.' && part !== '..'), 'unsafe cgroup path');
  return parts;
}

export function cgroupHeadroomFromRows(rows) {
  assert.ok(Array.isArray(rows) && rows.length > 0, 'visible cgroup ancestry is required');
  let headroom = null;
  const normalized = rows.map((row) => {
    assert.ok(row && typeof row.path === 'string');
    if (row.limit === 'max') return { path: row.path, state: 'unlimited' };
    assert.ok(Number.isSafeInteger(row.limit) && row.limit >= 0);
    assert.ok(Number.isSafeInteger(row.current) && row.current >= 0);
    const available = Math.max(0, row.limit - row.current);
    headroom = headroom === null ? available : Math.min(headroom, available);
    return { path: row.path, state: 'finite', memoryMaxBytes: row.limit,
      memoryCurrentBytes: row.current, headroomBytes: available };
  });
  return { visibleAncestorHeadroomBytes: headroom, ancestors: normalized };
}

export function linuxMemorySnapshot({ procRoot = '/proc', cgroupRoot = '/sys/fs/cgroup' } = {}) {
  const hostAvailableBytes = parseMemAvailable(fs.readFileSync(path.join(procRoot, 'meminfo'), 'ascii'));
  const cgroupParts = parseCgroupV2Path(fs.readFileSync(path.join(procRoot, 'self/cgroup'), 'ascii'));
  const leaf = path.resolve(cgroupRoot, ...cgroupParts);
  const cgroupBase = path.resolve(cgroupRoot);
  assert.ok(leaf === cgroupBase || leaf.startsWith(`${cgroupBase}${path.sep}`), 'cgroup path escaped mount');
  let current = leaf;
  const rows = [];
  while (true) {
    const relative = path.relative(cgroupBase, current).split(path.sep).join('/');
    if (current === cgroupBase && !fs.existsSync(path.join(current, 'memory.max'))) {
      const controllers = fs.readFileSync(path.join(current, 'cgroup.controllers'), 'ascii').trim().split(/\s+/);
      assert.ok(controllers.includes('memory'), 'cgroup v2 memory controller is unavailable');
      rows.push({ path: '/', limit: 'max' });
      break;
    }
    const limitText = fs.readFileSync(path.join(current, 'memory.max'), 'ascii').trim();
    if (limitText === 'max') rows.push({ path: `/${relative}`, limit: 'max' });
    else {
      assert.match(limitText, /^\d+$/);
      const limit = Number(limitText);
      const usedText = fs.readFileSync(path.join(current, 'memory.current'), 'ascii').trim();
      assert.match(usedText, /^\d+$/);
      const used = Number(usedText);
      assert.ok(Number.isSafeInteger(limit) && Number.isSafeInteger(used));
      rows.push({ path: `/${relative}`, limit, current: used });
    }
    if (current === cgroupBase) break;
    current = path.dirname(current);
    assert.ok(current === cgroupBase || current.startsWith(`${cgroupBase}${path.sep}`),
      'cgroup ancestor escaped mount');
  }
  const cgroup = cgroupHeadroomFromRows(rows);
  const cgAvailable = cgroup.visibleAncestorHeadroomBytes;
  const availableBytes = cgAvailable === null ? hostAvailableBytes : Math.min(hostAvailableBytes, cgAvailable);
  const limitingSource = cgAvailable !== null && cgAvailable <= hostAvailableBytes
    ? 'visible cgroup v2 ancestor' : 'host /proc/meminfo MemAvailable';
  return { hostMemAvailableBytes: hostAvailableBytes, cgroupV2: cgroup,
    availableBytes, limitingSource };
}

export function memoryAdmission(phase, snapshot, sampledAtUtc = new Date().toISOString()) {
  assert.ok(phase === 'initial-preflight' || phase === 'immediately-before-c-emission',
    'memory admission phase is outside the reviewed two-sample policy');
  assert.ok(snapshot && Number.isSafeInteger(snapshot.availableBytes));
  return { phase, sampledAtUtc, floorBytes: MEMORY_FLOOR_BYTES,
    availableBytes: snapshot.availableBytes,
    admitted: snapshot.availableBytes >= MEMORY_FLOOR_BYTES,
    hostMemAvailableBytes: snapshot.hostMemAvailableBytes,
    cgroupV2: snapshot.cgroupV2, limitingSource: snapshot.limitingSource };
}

export function sampleMemoryAdmission(phase, snapshotter = linuxMemorySnapshot,
  sampledAtUtc = new Date().toISOString()) {
  assert.ok(phase === 'initial-preflight' || phase === 'immediately-before-c-emission',
    'memory admission phase is outside the reviewed two-sample policy');
  try {
    return memoryAdmission(phase, snapshotter(), sampledAtUtc);
  } catch (error) {
    return { phase, sampledAtUtc, floorBytes: MEMORY_FLOOR_BYTES,
      availableBytes: null, admitted: false,
      error: { kind: 'unreadable-memory-accounting', message: String(error?.message ?? error).slice(0, 1600) } };
  }
}

export function requireMemoryAdmission(sample) {
  assert.ok(sample && sample.phase);
  if (!sample.admitted) {
    const gib = Number.isFinite(sample.availableBytes)
      ? (sample.availableBytes / 1024 ** 3).toFixed(1) : 'unknown';
    throw new Error(`only ${gib} GiB is available under host/cgroup limits; C emission requires 88 GiB`);
  }
  return sample;
}

export function parseClangVersion(text) {
  assert.equal(typeof text, 'string');
  const match = /^(?!Apple clang).*?\bclang version (\d+)(?:\.\d+)*/m.exec(text);
  assert.ok(match, 'Clang version output did not identify upstream Clang');
  const version = Number(match[1]);
  assert.ok(Number.isSafeInteger(version) && version >= 14, 'Clang 14 or newer is required');
  return version;
}

export function clangCompileArguments(cSource, binary) {
  return ['-std=c11', '-O3', cSource, '-lpthread', '-lm', '-lX11', '-lasound', '-o', binary];
}

export function elfIdentity(bytes) {
  assert.ok(Buffer.isBuffer(bytes));
  assert.ok(bytes.length >= 20 && bytes.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])),
    'output is not an ELF file');
  assert.equal(bytes[4], 2, 'package requires ELF64');
  assert.equal(bytes[5], 1, 'package requires little-endian ELF');
  const machine = bytes.readUInt16LE(18);
  assert.equal(machine, 62, `package requires x86-64 ELF (e_machine=${machine})`);
  return { class: bytes[4], dataEncoding: bytes[5], machine };
}

function safeRelative(relative) {
  assert.equal(typeof relative, 'string');
  assert.ok(relative.length > 0 && !path.isAbsolute(relative) && !relative.includes('\\'),
    `unsafe relative path: ${relative}`);
  assert.ok(relative.split('/').every((part) => part && part !== '.' && part !== '..'),
    `unsafe relative path: ${relative}`);
  return relative;
}

export function checkedRepoFile(relative) {
  safeRelative(relative);
  const absolute = path.resolve(ROOT, ...relative.split('/'));
  assert.ok(absolute.startsWith(`${ROOT}${path.sep}`), `repo path escaped root: ${relative}`);
  assertRegularFile(absolute);
  return absolute;
}

function addAsset(rows, relative, packagePath, { manifest, kind, expectedBytes, expectedSha256 } = {}) {
  safeRelative(packagePath);
  assert.ok(EXPECTED_PACKAGE_PATHS.includes(packagePath), `unexpected package asset: ${packagePath}`);
  const file = checkedRepoFile(relative);
  const bytes = fs.readFileSync(file);
  const digest = sha256(bytes);
  if (expectedBytes !== undefined) assert.equal(bytes.length, expectedBytes, `${relative} size differs from manifest`);
  if (expectedSha256 !== undefined) assert.equal(digest, expectedSha256, `${relative} hash differs from manifest`);
  assert.ok(!rows.some((row) => row.packagePath === packagePath), `duplicate package path: ${packagePath}`);
  rows.push({ sourcePath: relative, packagePath, manifest, kind, bytes: bytes.length, sha256: digest });
  return bytes;
}

export function assertAssetRows(rows) {
  assert.ok(Array.isArray(rows));
  const paths = rows.map((row) => row.packagePath).sort();
  assert.deepEqual(paths, EXPECTED_PACKAGE_PATHS);
  assert.equal(new Set(paths).size, paths.length, 'duplicate package paths');
  for (const row of rows) {
    safeRelative(row.sourcePath);
    safeRelative(row.packagePath);
    assert.ok(Number.isSafeInteger(row.bytes) && row.bytes > 0);
    assert.match(row.sha256, /^[0-9a-f]{64}$/);
    assert.ok(typeof row.manifest === 'string' && typeof row.kind === 'string');
  }
  return rows;
}

export function collectRuntimeAssets() {
  const rows = [];
  const used = new Set();
  const manifests = {};
  const readManifest = (relative) => {
    const file = checkedRepoFile(relative);
    used.add(relative);
    manifests[relative] = sha256File(file);
    return readJson(file);
  };
  const artPath = 'bend2/assets/MANIFEST.json';
  const art = readManifest(artPath);
  assert.equal(art.schema, 'rift-bend-art-assets/1');
  assert.deepEqual(Object.keys(art.assets ?? {}).sort(), ['observatory-astral', 'observatory-stone']);
  for (const id of Object.keys(art.assets).sort()) {
    const record = art.assets[id];
    assert.equal(record.runtime, `runtime/${id}.rga`);
    assert.equal(record.depth, 9);
    assert.equal(record.runtimeBytes, 786437);
    const source = `bend2/assets/${record.source}`;
    const runtime = `bend2/assets/${record.runtime}`;
    addAsset(rows, runtime, `assets/${id}.rga`, { manifest: artPath, kind: 'runtime',
      expectedBytes: record.runtimeBytes, expectedSha256: record.runtimeSha256 });
    assert.equal(sha256File(checkedRepoFile(source)), record.sourceSha256, `art source differs: ${id}`);
    used.add(source); used.add(runtime);
  }
  addAsset(rows, 'bend2/assets/LICENSES.md', 'assets/LICENSES.md',
    { manifest: 'bend2/assets/LICENSES.md', kind: 'license' });
  used.add('bend2/assets/LICENSES.md');

  const fontPath = 'bend2/ui/v2/fonts/packed-manifest.json';
  const font = readManifest(fontPath);
  assert.equal(font.schema, 'rift-observatory-font-pack/1');
  assert.equal(font.output, 'bend2/assets/runtime/rift-observatory-font.rga');
  assert.equal(font.source, 'bend2/assets/source/fonts/dm-sans-pinned.ttf');
  assert.equal(font.bytes, 151343); assert.equal(font.coverage_bits, 8); assert.equal(font.records, 242);
  assert.equal(sha256File(checkedRepoFile(font.source)), font.source_sha256, 'font source differs from manifest');
  used.add(font.source);
  addAsset(rows, font.output, 'assets/rift-observatory-font.rga', { manifest: fontPath, kind: 'runtime',
    expectedBytes: font.bytes, expectedSha256: font.output_sha256 });
  used.add(font.output);
  const fontLicense = checkedRepoFile('bend2/assets/source/fonts/OFL.txt');
  const libraryLicense = checkedRepoFile('bend2/lib/graphics/v2/OFL.txt');
  assert.equal(sha256File(fontLicense), sha256File(libraryLicense), 'font license notices differ');
  used.add('bend2/assets/source/fonts/OFL.txt'); used.add('bend2/lib/graphics/v2/OFL.txt');

  const piecePath = 'bend2/assets/source/pieces/manifest.json';
  const pieces = readManifest(piecePath);
  const interactive = pieces.tiers?.interactive;
  const source = pieces.source;
  assert.equal(pieces.format, 'rift-chess-piece-art-source-v1');
  assert.equal(source?.path, '../chess-piece-atlas.png');
  assert.equal(interactive?.depth, 7); assert.equal(interactive?.totalBytes, 196623);
  assert.equal(interactive?.deploymentIntegrated, true);
  assert.equal(interactive?.pages?.length, 3);
  const pieceSource = path.posix.normalize(`bend2/assets/source/pieces/${source.path}`);
  assert.equal(sha256File(checkedRepoFile(pieceSource)), source.sha256, 'piece artwork source differs from manifest');
  used.add(pieceSource);
  for (let index = 0; index < interactive.pages.length; index++) {
    const page = interactive.pages[index];
    assert.equal(page.path, `../../runtime/pieces/pieces-fast-${index}.rga`);
    assert.equal(page.bytes, 65541);
    const sourcePath = path.posix.normalize(`bend2/assets/source/pieces/${page.path}`);
    addAsset(rows, sourcePath, `assets/pieces-fast-${index}.rga`, { manifest: piecePath, kind: 'runtime',
      expectedBytes: page.bytes, expectedSha256: page.sha256 });
    used.add(sourcePath);
  }
  addAsset(rows, 'bend2/THIRD_PARTY_NOTICES.txt', 'licenses/THIRD_PARTY_NOTICES.txt',
    { manifest: 'bend2/THIRD_PARTY_NOTICES.txt', kind: 'license' });
  addAsset(rows, 'bend2/licenses/Bend-Apache-2.0.txt', 'licenses/Bend-Apache-2.0.txt',
    { manifest: 'bend2/licenses/Bend-Apache-2.0.txt', kind: 'license' });
  addAsset(rows, 'bend2/lib/graphics/v2/OFL.txt', 'licenses/Rift-Atlas-Sans-OFL.txt',
    { manifest: 'bend2/lib/graphics/v2/OFL.txt', kind: 'license' });
  used.add('bend2/THIRD_PARTY_NOTICES.txt'); used.add('bend2/licenses/Bend-Apache-2.0.txt');
  assertAssetRows(rows);
  const inputSha256 = Object.fromEntries([...used].sort().map((relative) => [relative, sha256File(checkedRepoFile(relative))]));
  return { rows: rows.sort((a, b) => a.packagePath.localeCompare(b.packagePath)), manifests,
    inputSha256 };
}

export function toolchainPaths() {
  return {
    scout: path.join(ROOT, '.artifacts/toolchains/bend-2.0.32-scout'),
    derived: path.join(ROOT, '.artifacts/bend2/toolchain-patches/derived-2032'),
    canonical: path.join(ROOT, '.artifacts/toolchains/bend'),
  };
}

export function snapshotToolchains() {
  const { scout, derived, canonical } = toolchainPaths();
  for (const directory of [scout, derived, canonical]) assertRealDirectory(directory);
  const scoutState = { head: gitText(scout, ['rev-parse', 'HEAD']),
    status: gitText(scout, ['status', '--porcelain', '--untracked-files=all']) };
  const derivedState = { head: gitText(derived, ['rev-parse', 'HEAD']),
    cached: gitText(derived, ['diff', '--cached', '--name-only']),
    status: gitText(derived, ['status', '--porcelain', '--untracked-files=all']) };
  const canonicalState = { head: gitText(canonical, ['rev-parse', 'HEAD']),
    status: gitText(canonical, ['status', '--porcelain', '--untracked-files=all']) };
  assert.equal(scoutState.head, SCOUT_COMMIT); assert.equal(scoutState.status, TOOLCHAIN_EOLS.scoutStatus);
  assert.equal(derivedState.head, SCOUT_COMMIT); assert.equal(derivedState.cached, '');
  assert.equal(derivedState.status, TOOLCHAIN_EOLS.derivedStatus);
  assert.equal(canonicalState.head, CANONICAL_COMMIT); assert.equal(canonicalState.status, TOOLCHAIN_EOLS.canonicalStatus);
  const eolHelper = path.join(ROOT, 'bend2/toolchain-patches/2032/preview/compiler-eol.mjs');
  assertRegularFile(eolHelper);
  const compiler = bindCompilerEol((relative) => {
    const file = path.join(derived, ...relative.split('/'));
    assertRegularFile(file);
    return fs.readFileSync(file);
  });
  assert.equal(compiler.eol, 'lf', '2.0.32 derived compiler must use Linux LF source');
  const base = path.join(derived, 'bend2/base.bend');
  assertRegularFile(base);
  const baseBinding = bindCompilerBaseEol(fs.readFileSync(base), compiler.eol);
  return { scout: scoutState, derived: { ...derivedState, compiler, base: baseBinding },
    canonical: canonicalState, eolHelperSha256: sha256File(eolHelper) };
}

function parseGitTreeRecords(buffer) {
  const records = [];
  for (const raw of buffer.toString('utf8').split('\0').filter(Boolean)) {
    const tab = raw.indexOf('\t');
    assert.ok(tab > 0, 'malformed git ls-tree record');
    const [mode, type, object] = raw.slice(0, tab).split(' ');
    const relative = raw.slice(tab + 1);
    assert.match(relative, /^bend2\/[A-Za-z0-9._/-]+$/);
    if (!relative.endsWith('.bend')) continue;
    assert.equal(mode, '100644'); assert.equal(type, 'blob');
    records.push({ relative, object });
  }
  records.sort((a, b) => a.relative.localeCompare(b.relative));
  assert.equal(records.length, 284, 'tracked Bend source count changed');
  assert.equal(new Set(records.map((row) => row.relative)).size, records.length);
  return records;
}

function readGitBlobs(candidate, objects) {
  const output = gitBuffer(candidate, ['cat-file', '--batch'], {
    input: Buffer.from(`${objects.join('\n')}\n`, 'ascii'), maxBuffer: 256 * 1024 * 1024,
  });
  const blobs = new Map(); let cursor = 0;
  for (const requested of objects) {
    const lineEnd = output.indexOf(0x0a, cursor);
    assert.ok(lineEnd >= 0, 'truncated git object header');
    const [actual, type, sizeText] = output.subarray(cursor, lineEnd).toString('ascii').split(' ');
    assert.equal(actual, requested); assert.equal(type, 'blob'); assert.match(sizeText, /^\d+$/);
    const size = Number(sizeText);
    assert.ok(Number.isSafeInteger(size) && size <= 4 * 1024 * 1024);
    cursor = lineEnd + 1; const end = cursor + size;
    assert.ok(end < output.length && output[end] === 0x0a, 'truncated git object bytes');
    blobs.set(requested, output.subarray(cursor, end)); cursor = end + 1;
  }
  assert.equal(cursor, output.length, 'trailing git object bytes');
  return blobs;
}

export function snapshotCandidate(candidate) {
  assert.ok(path.isAbsolute(candidate), 'candidate must be an absolute path');
  const absolute = fs.realpathSync(candidate);
  assert.equal(absolute, candidate, 'candidate path was redirected');
  assertRealDirectory(absolute); assert.notEqual(absolute, ROOT);
  assert.equal(gitText(absolute, ['rev-parse', 'HEAD']), CANDIDATE_COMMIT);
  assert.equal(gitText(absolute, ['rev-parse', 'HEAD^{tree}']), CANDIDATE_TREE);
  assert.equal(gitText(absolute, ['diff', '--cached', '--name-only']), '');
  assert.equal(gitText(absolute, ['status', '--porcelain', '--untracked-files=all']), ' M bend2/NativeV2.bend');
  const patch = path.join(ROOT, 'bend2/toolchain-patches/native-v2-2032/events/0001-native-v2-events.patch');
  assertRegularFile(patch); assert.equal(sha256File(patch), PATCH_SHA256);
  const records = parseGitTreeRecords(gitBuffer(absolute,
    ['ls-tree', '-r', '-z', CANDIDATE_COMMIT, '--', 'bend2']));
  const blobs = readGitBlobs(absolute, records.map((row) => row.object));
  const sourceSha256 = {};
  for (const record of records) {
    const file = path.join(absolute, ...record.relative.split('/'));
    assertRegularFile(file);
    const actual = sha256File(file);
    const baseDigest = sha256(blobs.get(record.object));
    if (record.relative === 'bend2/NativeV2.bend') {
      assert.equal(baseDigest, NATIVE_ORIGINAL_SHA256);
      assert.equal(actual, NATIVE_PATCHED_SHA256);
    } else assert.equal(actual, baseDigest, `candidate source differs from base tree: ${record.relative}`);
    sourceSha256[record.relative] = actual;
  }
  return { directory: absolute, commit: CANDIDATE_COMMIT, tree: CANDIDATE_TREE,
    trackedBendFiles: records.length, sourceSha256, patchSha256: PATCH_SHA256 };
}

export function snapshotRoot() {
  const head = gitText(ROOT, ['rev-parse', 'HEAD']);
  const tree = gitText(ROOT, ['rev-parse', 'HEAD^{tree}']);
  const status = gitText(ROOT, ['status', '--porcelain', '--untracked-files=all']);
  assert.equal(status, '', 'Linux build requires a committed clean source checkout');
  return { head, tree, status };
}

export function assertLinuxNode({ child = false } = {}) {
  assert.equal(process.platform, 'linux', 'NativeV2 2.0.32 C build is Linux-only');
  assert.equal(process.version, 'v22.23.1', 'exact reviewed Linux Node runtime required');
  assert.deepEqual(process.execArgv, [], 'unexpected Node flags or preloads');
  assert.equal(process.env.NODE_OPTIONS ?? '', ''); assert.equal(process.env.NODE_PATH ?? '', '');
  assert.equal(process.env.BEND_NO_TELEMETRY, '1');
  const executable = fs.realpathSync(process.execPath);
  assertRegularFile(executable, { executable: true });
  assert.equal(sha256File(executable), NODE_SHA256, 'Linux Node executable bytes changed');
  return { version: process.version, executable, sha256: NODE_SHA256, child };
}

export function ensureOutputRoot() {
  const ignored = spawnSync('git', ['-C', ROOT, 'check-ignore', '--quiet', '--', OUTPUT_RELATIVE], {
    stdio: 'ignore', timeout: 10_000,
  });
  assert.equal(ignored.error, undefined, String(ignored.error));
  assert.equal(ignored.status, 0, `${OUTPUT_RELATIVE} must be ignored by Git`);
  const chain = [path.join(ROOT, '.artifacts'), path.join(ROOT, '.artifacts/bend2'), OUTPUT_ROOT];
  for (const directory of chain) {
    try { assertRealDirectory(directory); }
    catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      fs.mkdirSync(directory, { mode: 0o700 }); assertRealDirectory(directory);
    }
  }
  return OUTPUT_ROOT;
}

export function createRunDirectory() {
  ensureOutputRoot();
  const directory = fs.mkdtempSync(path.join(OUTPUT_ROOT, 'run-'));
  fs.chmodSync(directory, 0o700);
  const stat = assertRealDirectory(directory);
  return { directory, identity: { dev: String(stat.dev), ino: String(stat.ino) } };
}

export function assertRunDirectory(directory, identity) {
  const absolute = path.resolve(directory);
  assert.equal(path.dirname(absolute), OUTPUT_ROOT, 'run path escaped ignored output root');
  assert.match(path.basename(absolute), /^run-[A-Za-z0-9_-]+$/);
  const stat = assertRealDirectory(absolute);
  assert.equal(String(stat.dev), identity.dev); assert.equal(String(stat.ino), identity.ino);
  return absolute;
}

export function makePackageDirectory(runDirectory, relative) {
  safeRelative(relative);
  let current = runDirectory;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    try { assertRealDirectory(current); }
    catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      fs.mkdirSync(current, { mode: 0o700 }); assertRealDirectory(current);
    }
  }
  return current;
}

export function assertInputSnapshot(before, candidate) {
  assert.deepEqual(snapshotCandidate(candidate), before.candidate, 'candidate source changed during build');
  assert.deepEqual(snapshotToolchains(), before.toolchains, 'compiler stack changed during build');
  assert.deepEqual(collectRuntimeAssets(), before.assets, 'package inputs changed during build');
  assert.deepEqual(snapshotRoot(), before.root, 'source checkout changed during build');
  return true;
}

export function readBuildInputs(candidate, localScriptHashes = {}) {
  const patch = path.join(ROOT, 'bend2/toolchain-patches/native-v2-2032/events/0001-native-v2-events.patch');
  const helper = path.join(ROOT, 'bend2/toolchain-patches/2032/preview/compiler-eol.mjs');
  assertRegularFile(helper);
  assert.equal(sha256File(helper), 'cb1cbb64e07e32c30cb9199424ec84e87cfcc516427c035a51fa6f7a84eacc27');
  const candidateSnapshot = snapshotCandidate(candidate);
  const assets = collectRuntimeAssets();
  for (const [relative, expected] of Object.entries(assets.inputSha256)) {
    const candidateFile = path.join(candidateSnapshot.directory, ...relative.split('/'));
    assertRegularFile(candidateFile);
    assert.equal(sha256File(candidateFile), expected,
      `package input differs from event-patched candidate: ${relative}`);
  }
  return { candidate: candidateSnapshot, toolchains: snapshotToolchains(),
    assets, root: snapshotRoot(), patchSha256: sha256File(patch),
    eolHelperSha256: sha256File(helper), localScriptHashes };
}

export function assertExactInputBindings(plan, candidate, localScriptHashes = {}) {
  assertInputSnapshot(plan, candidate);
  assert.deepEqual(localScriptHashes, plan.localScriptHashes, 'build harness source changed during run');
  const patch = path.join(ROOT, 'bend2/toolchain-patches/native-v2-2032/events/0001-native-v2-events.patch');
  const helper = path.join(ROOT, 'bend2/toolchain-patches/2032/preview/compiler-eol.mjs');
  assert.equal(sha256File(patch), plan.patchSha256);
  assert.equal(sha256File(helper), plan.eolHelperSha256);
}

function processGroupState(pid) {
  if (!pid) return false;
  try { process.kill(-pid, 0); return true; }
  catch (error) { if (error?.code === 'ESRCH') return false; return 'unknown'; }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class OwnedProcessError extends Error {
  constructor(message, result, { timedOut = false, workerMayBeLive = false } = {}) {
    super(message); this.name = 'OwnedProcessError'; this.result = result;
    this.timedOut = timedOut; this.workerMayBeLive = workerMayBeLive;
  }
}

export async function runOwnedProcess(executable, args, {
  cwd, env, timeoutMs, maxOutputBytes = 2 * 1024 * 1024, label = path.basename(executable),
} = {}) {
  assert.equal(process.platform, 'linux', 'owned child supervision is Linux-only');
  assert.ok(Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 600_000);
  assert.ok(Number.isInteger(maxOutputBytes) && maxOutputBytes > 0 && maxOutputBytes <= 8 * 1024 * 1024);
  assertRealDirectory(cwd);
  const startedAt = Date.now(); let child;
  try {
    child = spawn(executable, args, { cwd, env, detached: true,
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  } catch (error) {
    throw new OwnedProcessError(`${label} could not be spawned: ${error?.message ?? error}`, {
      stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), status: null, signal: null,
      pid: null, durationMs: Date.now() - startedAt, outputBytes: 0,
    });
  }
  const out = []; const err = []; let outputBytes = 0; let exceeded = false;
  let spawnError; let exitInfo; let closeInfo; let leaderExited = false;
  let resolveClosed; let resolveExited; let resolveStop;
  const closed = new Promise((resolve) => { resolveClosed = resolve; });
  const exited = new Promise((resolve) => { resolveExited = resolve; });
  const stop = new Promise((resolve) => { resolveStop = resolve; });
  const capture = (chunks, data) => {
    const bytes = Buffer.from(data); const room = Math.max(0, maxOutputBytes - outputBytes);
    if (room) chunks.push(bytes.subarray(0, room));
    outputBytes += bytes.length;
    if (outputBytes > maxOutputBytes && !exceeded) { exceeded = true; resolveStop({ kind: 'output-limit' }); }
  };
  child.stdout.on('data', (data) => capture(out, data));
  child.stderr.on('data', (data) => capture(err, data));
  child.once('error', (error) => { spawnError = error; resolveStop({ kind: 'spawn-error' }); });
  child.once('exit', (status, signal) => { leaderExited = true; exitInfo = { status, signal }; resolveExited(); });
  child.once('close', (status, signal) => { closeInfo = { status, signal }; resolveClosed(); });
  const deadline = setTimeout(() => resolveStop({ kind: 'timeout' }), timeoutMs);
  const result = () => ({ stdout: Buffer.concat(out), stderr: Buffer.concat(err),
    status: (closeInfo ?? exitInfo)?.status ?? null,
    signal: (closeInfo ?? exitInfo)?.signal ?? null, pid: child.pid ?? null,
    durationMs: Date.now() - startedAt, outputBytes, exceededOutput: exceeded });
  try {
    const reason = await Promise.race([closed.then(() => ({ kind: 'closed' })), stop]);
    clearTimeout(deadline);
    if (reason.kind === 'closed') {
      const group = child.pid ? processGroupState(child.pid) : false;
      if (group !== false) throw new OwnedProcessError(`${label} exited but its process-group state is ambiguous`,
        result(), { workerMayBeLive: true });
      if (spawnError) throw new OwnedProcessError(`${label} spawn error: ${spawnError.message}`, result());
      if (closeInfo.status !== 0 || closeInfo.signal !== null)
        throw new OwnedProcessError(`${label} failed: status=${closeInfo.status} signal=${closeInfo.signal}`, result());
      return result();
    }
    if (!child.pid) throw new OwnedProcessError(`${label} ${reason.kind}: no child was created`, result(),
      { timedOut: reason.kind === 'timeout' });
    let signalError;
    const signalLeader = (name) => {
      if (leaderExited) return;
      try { if (!child.kill(name)) signalError = `direct ${name} signal was not delivered`; }
      catch (error) { signalError = String(error?.message ?? error); }
    };
    signalLeader('SIGTERM'); await Promise.race([exited, delay(3000)]);
    if (!leaderExited) { signalLeader('SIGKILL'); await Promise.race([exited, delay(5000)]); }
    child.stdout.destroy(); child.stderr.destroy();
    if (leaderExited) await Promise.race([closed, delay(1000)]);
    if (!leaderExited || closeInfo === undefined) child.unref();
    const group = processGroupState(child.pid);
    const live = !leaderExited || closeInfo === undefined || group !== false;
    const description = reason.kind === 'timeout' ? 'timed out' : reason.kind === 'output-limit'
      ? 'exceeded its output limit' : `could not start (${spawnError?.message ?? 'process error'})`;
    throw new OwnedProcessError(`${label} ${description}${signalError ? `; ${signalError}` : ''}` +
      (live ? '; process-group exit is ambiguous' : '; owned leader exited and group is absent'),
    result(), { timedOut: reason.kind === 'timeout', workerMayBeLive: live });
  } catch (error) {
    clearTimeout(deadline);
    if (error instanceof OwnedProcessError) throw error;
    child.stdout.destroy(); child.stderr.destroy(); child.unref();
    throw new OwnedProcessError(`${label} supervisor failed: ${error?.message ?? error}`, result(),
      { workerMayBeLive: !!child.pid });
  }
}

export function isolatedEnvironment(runDirectory) {
  return { PATH: process.env.PATH ?? '/usr/bin:/bin',
    HOME: path.join(runDirectory, 'home'), TMPDIR: path.join(runDirectory, 'tmp'),
    LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', BEND_NO_TELEMETRY: '1' };
}

export { bindCompilerEol, bindCompilerBaseEol };
