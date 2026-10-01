import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bindCompilerBaseEol, bindCompilerEol } from '../../2032/preview/compiler-eol.mjs';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = fs.realpathSync(path.resolve(HERE, '../../../..'));
export const OUTPUT_RELATIVE = '.artifacts/bend2/native-cli-2032-linux';
export const OUTPUT_ROOT = path.join(ROOT, OUTPUT_RELATIVE);
export const BASE_APP_COMMIT = '3080ad508fd73c1730a82c9393890cc199426918';
export const BEND_RELEASE = '573002f01ec6c52416d44489543f69a9625facf8';
export const CANONICAL_PIN = 'd37909174ebd664338ae3194799a9e0899dedd51';
export const LINUX_NODE_SHA256 = '93956de2e59480474a7b46571da1651180b1a050cdf32641ebec4ce6e478e068';
export const WINDOWS_C = Object.freeze({
  bytes: 2189927,
  sha256: '373f735cd13c42b2a2f307646bfd08931c93e0fc599c362a12676ffdc4a77281',
  crlfPairs: 270,
});
export const EXPECTED_C = Object.freeze({
  bytes: 2189657,
  sha256: 'e5bfb78237720399ff8222844e6bf0f4385f0d817d43bc4eaf03c057542421d4',
  newlineMode: 'LF',
});
// NativeCLI passes a string ending in LF to IO.print_err; the pinned and
// derived C effect append one more LF. Retain exact stderr, not a loose match.
export const PASSTHROUGH_STDERR = 'Unknown command.\n\n';
export function assertPassthroughStderr(value) {
  assert.equal(value, PASSTHROUGH_STDERR,
    'unexpected exact stderr for the explicit -- --help invocation');
}
export const SOURCE_HASHES = Object.freeze({
  'bend2/NativeCLI.bend': 'c637e16ce6c81c91be30a5ab9b690da880e5dd3e85b4c6be0e06609138dd471e',
  'bend2/lib/graphics/v2/bench/gpu/PlanProfile.bend': 'c92fa44415cbf9286b0b451694a408fb84d54f4250487bb9856485b3cf83ded6',
  'bend2/lib/graphics/v2/bench/gpu/PlanReadback.bend': '80d63b990d8a44a7bfd25e6d692b84e3d05c6014493525102e7d92b81137351e',
  'bend2/tests/piece-sprites/BoardSceneSpriteBench.bend': '9510f28fcecefb792c31987f22e8ec652ab27de34410e09ddbe721ed8c3bba14',
  'bend2/tests/piece-sprites/DecodePageTest.bend': 'a12bff4a9b7f7d97146c4b313059dd8359dd3cb1e6b6a433ee797604a5b3651b',
  'bend2/tests/piece-sprites/PieceRenderBench.bend': '146812dcb22d5d5110fb8d41549051d8837756da8edd13f6552f2123474bcafe',
});
export function expectedCandidateSources(baseFileHashes, patched) {
  assert.equal(typeof patched, 'boolean', 'candidate phase must be explicit');
  for (const relative of Object.keys(SOURCE_HASHES)) {
    assert.ok(Object.hasOwn(baseFileHashes, relative), `base source lacks patched entry: ${relative}`);
  }
  return patched ? { ...baseFileHashes, ...SOURCE_HASHES } : { ...baseFileHashes };
}
export const ORIGINAL_SOURCE_HASHES = Object.freeze({
  'bend2/NativeCLI.bend': 'bf055f12bac835a71b561a401def07f4fcfaa0d6dc775e6a82438e91158d7779',
  'bend2/lib/graphics/v2/bench/gpu/PlanProfile.bend': '0722750083090909edab68825cd670dc922cd96f22fc3f3e90df7fa62b453f92',
  'bend2/lib/graphics/v2/bench/gpu/PlanReadback.bend': '2ce8eb321737935f531925ecd58b7cf12ffe585d85cc1a1f65e3240b81d47384',
  'bend2/tests/piece-sprites/BoardSceneSpriteBench.bend': 'c430c30851ee4817bd5513b07c54dbc82ff69eced238fc848bfa8c2266d9de5a',
  'bend2/tests/piece-sprites/DecodePageTest.bend': '0ee5083f15b0c658dd7ad8591f6c24c52dd5ed302a4267d6bf807fdf0998da9c',
  'bend2/tests/piece-sprites/PieceRenderBench.bend': '1f3431e993615f8b338a012feac9b524a652d2388c7e5d1adbc0c3a71b3d453c',
});
export const INPUT_HASHES = Object.freeze({
  'bend2/toolchain-patches/native-cli-2032/0001-adapt-io-args-2032.patch':
    'c104cde276ef3890552c84ae6cb1518c73fe4555440503da648e365c6715c3eb',
  'bend2/toolchain-patches/native-cli-2032/Args2032.bend':
    '9ad65f50b9ccf35f59921ad785ba55487e95face685337bea0f9959b754b4fa6',
  'bend2/toolchain-patches/native-cli-2032/consumers/0001-consumer-args-2032.patch':
    '4ddf245874bddd2c2dcbb799889b4a280dd1de12fdd62057c8f33d6fc02c95a5',
  'bend2/toolchain-patches/native-cli-2032/consumers/Consumers2032.bend':
    '19a535fdd0756ef4627b2bf93d36a4d5d52be89ead194f31fd8dcd5c8109380b',
  'bend2/toolchain-patches/native-cli-2032/consumers/test-entries-2032.mjs':
    '0b6839e4269869d10a48fe15e35b3b30f41ac27f0e969ff404752a8fbd74d17c',
  'bend2/toolchain-patches/2032/preview/compiler-eol.mjs':
    'cb1cbb64e07e32c30cb9199424ec84e87cfcc516427c035a51fa6f7a84eacc27',
});

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const sha256Bytes = sha256;
export const sha256File = (file) => sha256(fs.readFileSync(file));
export function assertLinuxCBytes(bytes) {
  assert.ok(Buffer.isBuffer(bytes), 'C output must be raw bytes');
  assert.equal(bytes.length, EXPECTED_C.bytes, 'Linux-emitted C byte length differs from the reviewed LF output');
  assert.equal(sha256Bytes(bytes), EXPECTED_C.sha256, 'Linux-emitted C differs from the reviewed LF digest');
  assert.equal(bytes.includes(13), false, 'Linux-emitted C contains a carriage return');
  return { bytes: bytes.length, sha256: EXPECTED_C.sha256, newlineMode: EXPECTED_C.newlineMode };
}
export const helperPath = (relative) => path.join(ROOT, ...relative.split('/'));
export const toolchainPaths = () => ({
  scout: path.join(ROOT, '.artifacts/toolchains/bend-2.0.32-scout'),
  derived: path.join(ROOT, '.artifacts/bend2/toolchain-patches/derived-2032'),
  canonical: path.join(ROOT, '.artifacts/toolchains/bend'),
});

export function gitText(cwd, args, { timeoutMs = 30_000, maxBuffer = 16 * 1024 * 1024 } = {}) {
  const result = spawnSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8', timeout: timeoutMs, maxBuffer,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0 || result.signal) {
    throw new Error(`git ${args.join(' ')} failed: ${result.error?.message ??
      `status=${result.status} signal=${result.signal}`} ${String(result.stderr ?? '').slice(-1200)}`);
  }
  return result.stdout.replace(/\r\n/g, '\n').trimEnd();
}

export function gitBuffer(cwd, args, { input, timeoutMs = 60_000,
  maxBuffer = 128 * 1024 * 1024 } = {}) {
  const result = spawnSync('git', ['-C', cwd, ...args], {
    input, timeout: timeoutMs, maxBuffer,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (result.error || result.status !== 0 || result.signal) {
    const stderr = Buffer.isBuffer(result.stderr) ? result.stderr.toString('utf8') : String(result.stderr ?? '');
    throw new Error(`git ${args.join(' ')} failed: ${result.error?.message ??
      `status=${result.status} signal=${result.signal}`} ${stderr.slice(-1200)}`);
  }
  return result.stdout;
}

export function assertRegularFile(file, { executable = false } = {}) {
  const absolute = path.resolve(file);
  const stat = fs.lstatSync(absolute);
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), `expected a regular file: ${absolute}`);
  assert.equal(fs.realpathSync(absolute), absolute, `file path identity changed: ${absolute}`);
  if (executable) assert.ok((stat.mode & 0o111) !== 0, `file is not executable: ${absolute}`);
  return stat;
}

export function bindLinuxNode({ child = false } = {}) {
  assert.equal(process.platform, 'linux', 'native smoke is Linux-only');
  assert.equal(process.version, 'v22.23.1', 'exact reviewed Linux Node runtime required');
  assert.equal(process.env.NODE_OPTIONS ?? '', '', 'inherited Node options are not allowed');
  assert.equal(process.env.NODE_PATH ?? '', '', 'inherited Node module path is not allowed');
  assert.deepEqual(process.execArgv, child ? ['--max-old-space-size=512'] : [],
    'unexpected Node preload/flags');
  const executable = fs.realpathSync(process.execPath);
  assertRegularFile(executable, { executable: true });
  assert.equal(sha256File(executable), LINUX_NODE_SHA256, 'Linux Node executable bytes changed');
  return { version: process.version, executable, sha256: LINUX_NODE_SHA256,
    flags: [...process.execArgv] };
}

export function assertRealDirectory(directory) {
  const absolute = path.resolve(directory);
  const stat = fs.lstatSync(absolute);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), `expected a real directory: ${absolute}`);
  assert.equal(fs.realpathSync(absolute), absolute, `directory path identity changed: ${absolute}`);
  return stat;
}

function ensureDirectoryChain(directory, root) {
  const relative = path.relative(root, directory);
  assert.ok(relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    `directory escaped output root: ${directory}`);
  let current = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      assertRealDirectory(current);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      fs.mkdirSync(current, { mode: 0o700 });
      assertRealDirectory(current);
    }
  }
}

export function assertIgnoredOutputRoot() {
  const ignored = spawnSync('git', ['-C', ROOT, 'check-ignore', '--quiet', '--', OUTPUT_RELATIVE], {
    stdio: 'ignore', timeout: 10_000,
  });
  assert.equal(ignored.error, undefined, String(ignored.error));
  assert.equal(ignored.status, 0, `${OUTPUT_RELATIVE} is not ignored output`);
}

export function ensureOutputRoot() {
  assertIgnoredOutputRoot();
  const artifactsRoot = path.join(ROOT, '.artifacts');
  ensureDirectoryChain(artifactsRoot, ROOT);
  ensureDirectoryChain(OUTPUT_ROOT, artifactsRoot);
  assertRealDirectory(artifactsRoot);
  assertRealDirectory(path.join(ROOT, '.artifacts/bend2'));
  return OUTPUT_ROOT;
}

export function createRunDirectory() {
  ensureOutputRoot();
  const directory = fs.mkdtempSync(path.join(OUTPUT_ROOT, 'run-'));
  fs.chmodSync(directory, 0o700);
  const stat = assertRealDirectory(directory);
  return { directory, identity: { dev: String(stat.dev), ino: String(stat.ino) } };
}

export function assertRunDirectory(directory, identity = undefined) {
  assertIgnoredOutputRoot();
  const absolute = path.resolve(directory);
  assert.equal(path.dirname(absolute), OUTPUT_ROOT, 'run directory is outside the owned output root');
  assert.match(path.basename(absolute), /^run-[A-Za-z0-9_-]+$/, 'invalid run directory name');
  const stat = assertRealDirectory(absolute);
  if (identity) {
    assert.equal(String(stat.dev), identity.dev, 'run directory device changed');
    assert.equal(String(stat.ino), identity.ino, 'run directory identity changed');
  }
  assertRealDirectory(OUTPUT_ROOT);
  return absolute;
}

export function makeExclusiveDirectory(parent, name) {
  assertRealDirectory(parent);
  const directory = path.join(parent, name);
  fs.mkdirSync(directory, { mode: 0o700 });
  assertRealDirectory(directory);
  assert.equal(path.dirname(directory), path.resolve(parent));
  return directory;
}

export function writeExclusive(file, bytes) {
  const absolute = path.resolve(file);
  assertRealDirectory(path.dirname(absolute));
  const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const fd = fs.openSync(absolute, 'wx', 0o600);
  try {
    let at = 0;
    while (at < data.length) {
      const written = fs.writeSync(fd, data, at, data.length - at, at);
      assert.ok(Number.isInteger(written) && written > 0, `write made no progress: ${absolute}`);
      at += written;
    }
    fs.fsyncSync(fd);
    assert.ok(fs.fstatSync(fd).isFile(), `output is not a regular file: ${absolute}`);
  } finally {
    fs.closeSync(fd);
  }
  const stat = assertRegularFile(absolute);
  assert.equal(stat.size, data.length, `output length changed: ${absolute}`);
  assert.deepEqual(fs.readFileSync(absolute), data, `output bytes changed: ${absolute}`);
  return { bytes: data.length, sha256: sha256(data) };
}

export function writeJsonExclusive(file, value) {
  return writeExclusive(file, Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8'));
}

export function readSafeJson(file) {
  assertRegularFile(file);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function readTreeBendSources() {
  const raw = gitBuffer(ROOT, ['ls-tree', '-r', '-z', BASE_APP_COMMIT, '--', 'bend2']);
  const entries = [];
  for (const record of raw.toString('utf8').split('\0').filter(Boolean)) {
    const tab = record.indexOf('\t');
    assert.ok(tab > 0, 'malformed git ls-tree entry');
    const [mode, type, object] = record.slice(0, tab).split(' ');
    const relative = record.slice(tab + 1);
    assert.match(relative, /^[A-Za-z0-9._/-]+$/, `unsupported path bytes in base tree: ${relative}`);
    if (!relative.endsWith('.bend')) continue;
    assert.equal(mode, '100644', `reject non-regular Bend source: ${relative}`);
    assert.equal(type, 'blob', `reject non-blob Bend source: ${relative}`);
    assert.ok(relative.startsWith('bend2/') && !path.isAbsolute(relative) &&
      relative.split('/').every((part) => part && part !== '.' && part !== '..'),
    `unsafe Bend path in base tree: ${relative}`);
    entries.push({ relative, object });
  }
  entries.sort((a, b) => a.relative.localeCompare(b.relative));
  assert.ok(entries.length > 100, 'base application tree has an implausibly small Bend source set');
  assert.equal(new Set(entries.map(({ relative }) => relative)).size, entries.length,
    'duplicate Bend source path in base tree');
  return entries;
}

export function readBlobs(objects) {
  assert.ok(objects.length > 0);
  const output = gitBuffer(ROOT, ['cat-file', '--batch'], {
    input: Buffer.from(`${objects.join('\n')}\n`, 'ascii'), maxBuffer: 128 * 1024 * 1024,
  });
  const blobs = new Map();
  let cursor = 0;
  for (const requested of objects) {
    const end = output.indexOf(0x0a, cursor);
    assert.ok(end >= 0, 'truncated git cat-file header');
    const [actual, type, sizeText] = output.subarray(cursor, end).toString('ascii').split(' ');
    assert.equal(actual, requested, 'git cat-file returned a different object');
    assert.equal(type, 'blob', 'base tree entry was not a blob');
    assert.match(sizeText, /^\d+$/);
    const size = Number(sizeText);
    assert.ok(Number.isSafeInteger(size) && size <= 4 * 1024 * 1024,
      'unexpected Bend source blob size');
    cursor = end + 1;
    const finish = cursor + size;
    assert.ok(finish < output.length && output[finish] === 0x0a, 'truncated git cat-file blob');
    blobs.set(requested, Buffer.from(output.subarray(cursor, finish)));
    cursor = finish + 1;
  }
  assert.equal(cursor, output.length, 'unexpected trailing git cat-file data');
  return blobs;
}

export function readAndValidateInputFiles() {
  const found = {};
  for (const [relative, expected] of Object.entries(INPUT_HASHES)) {
    const file = helperPath(relative);
    assertRegularFile(file);
    const actual = sha256File(file);
    assert.equal(actual, expected, `source-bound Linux smoke input changed: ${relative}`);
    found[relative] = actual;
  }
  return found;
}

function validateToolchainDirectory(directory, expectedHead, expectedStatus, name) {
  assertRealDirectory(directory);
  const head = gitText(directory, ['rev-parse', 'HEAD']);
  assert.equal(head, expectedHead, `${name} checkout commit changed`);
  const status = gitText(directory, ['status', '--porcelain', '--untracked-files=all']);
  assert.equal(status, expectedStatus, `${name} checkout state changed`);
  return { head, status };
}

export function snapshotToolchainStack() {
  const { scout, derived, canonical } = toolchainPaths();
  const scoutState = validateToolchainDirectory(scout, BEND_RELEASE, '', 'pristine 2.0.32 scout');
  const canonicalState = validateToolchainDirectory(canonical, CANONICAL_PIN, '', 'canonical Bend');
  assertRealDirectory(derived);
  const derivedHead = gitText(derived, ['rev-parse', 'HEAD']);
  assert.equal(derivedHead, BEND_RELEASE, 'derived compiler base commit changed');
  assert.equal(gitText(derived, ['diff', '--cached', '--name-only']), '',
    'derived compiler has staged changes');
  const derivedStatus = gitText(derived, ['status', '--porcelain', '--untracked-files=all']);
  assert.equal(derivedStatus, ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts',
    'derived compiler has unexpected source or untracked changes');
  const eolHelper = helperPath('bend2/toolchain-patches/2032/preview/compiler-eol.mjs');
  assert.equal(sha256File(eolHelper), INPUT_HASHES['bend2/toolchain-patches/2032/preview/compiler-eol.mjs']);
  const derivedEol = bindCompilerEol((relative) => {
    const file = path.join(derived, ...relative.split('/'));
    assertRegularFile(file);
    return fs.readFileSync(file);
  });
  const baseFile = path.join(derived, 'bend2/base.bend');
  assertRegularFile(baseFile);
  const derivedBase = bindCompilerBaseEol(fs.readFileSync(baseFile), derivedEol.eol);
  return {
    scout: { path: '.artifacts/toolchains/bend-2.0.32-scout', ...scoutState },
    derived: {
      path: '.artifacts/bend2/toolchain-patches/derived-2032',
      head: derivedHead, status: derivedStatus,
      cached: gitText(derived, ['diff', '--cached', '--name-only']),
      eol: derivedEol, base: derivedBase,
    },
    canonical: { path: '.artifacts/toolchains/bend', ...canonicalState },
  };
}

export function parseExportArguments(args) {
  assert.equal(args.length, 0, 'source export takes no arguments');
  return {};
}

export function parseNativeArguments(args) {
  assert.ok(args.length >= 3, 'usage: native-smoke.mjs <run-dir> --clang <absolute-path> [--clang-sha256 <hex>]');
  const runDirectory = path.resolve(args[0]);
  let clangPath;
  let clangSha256;
  for (let index = 1; index < args.length;) {
    const flag = args[index++];
    if (flag === '--clang' && clangPath === undefined && index < args.length) {
      clangPath = args[index++];
    } else if (flag === '--clang-sha256' && clangSha256 === undefined && index < args.length) {
      clangSha256 = args[index++].toLowerCase();
    } else {
      throw new Error(`unknown or duplicate native-smoke argument: ${flag}`);
    }
  }
  assert.ok(clangPath && path.isAbsolute(clangPath), '--clang must be an absolute executable path');
  if (clangSha256 !== undefined) assert.match(clangSha256, /^[0-9a-f]{64}$/);
  return { runDirectory, clangPath, clangSha256 };
}

export function clangCompileArguments(cSource, binary) {
  return ['-std=c11', '-O2', cSource, '-lpthread', '-lm', '-o', binary];
}

export const SCENARIOS = Object.freeze([
  Object.freeze({ id: 'program-only', args: Object.freeze(['--threads', '1']), requiredText: Object.freeze(['Layout B', 'White to move', 'LEGAL ACTIONS']) }),
  Object.freeze({ id: 'help', args: Object.freeze(['--threads', '1', 'help']), requiredText: Object.freeze(['Commands:', 'LEGAL ACTIONS']) }),
  Object.freeze({ id: 'dash-dash-help-word', args: Object.freeze(['--threads', '1', '--', 'help']), requiredText: Object.freeze(['Commands:', 'LEGAL ACTIONS']) }),
  Object.freeze({ id: 'dash-dash-help', args: Object.freeze(['--threads', '1', '--', '--help']), requiredText: Object.freeze(['Unknown command.', 'Commands:']) }),
]);

export const WRITE_RESTART_STEPS = Object.freeze([
  Object.freeze({ id: '01-new', args: Object.freeze(['--threads', '1', 'new', 'B', 'prompt']), requiredText: Object.freeze(['Layout B', 'White to move']) }),
  Object.freeze({ id: '02-move', args: Object.freeze(['--threads', '1', 'move', '3980']), requiredText: Object.freeze(['Black to move']) }),
  Object.freeze({ id: '03-restart-show', args: Object.freeze(['--threads', '1', 'show']), requiredText: Object.freeze(['Black to move']) }),
]);

export function safeEntries(directory) {
  assertRealDirectory(directory);
  const entries = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    assert.ok(entry.name !== '.' && entry.name !== '..' && !entry.name.includes(path.sep),
      'unsafe directory entry');
    const absolute = path.join(directory, entry.name);
    const stat = fs.lstatSync(absolute);
    assert.ok(!stat.isSymbolicLink(), `unexpected symlink: ${absolute}`);
    if (stat.isDirectory()) entries.push({ name: entry.name, type: 'directory' });
    else {
      assert.ok(stat.isFile(), `unexpected special file: ${absolute}`);
      entries.push({ name: entry.name, type: 'file', size: stat.size, sha256: sha256File(absolute) });
    }
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

export function walkCandidate(candidate) {
  const files = {};
  const directories = [];
  const visit = (directory, prefix) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolute);
      assert.ok(!stat.isSymbolicLink(), `candidate source contains a symlink: ${absolute}`);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (stat.isDirectory()) {
        directories.push(relative);
        visit(absolute, relative);
      } else {
        assert.ok(stat.isFile() && relative.endsWith('.bend'),
          `candidate contains a non-Bend file: ${relative}`);
        assert.equal(fs.realpathSync(absolute), absolute,
          `candidate source path changed: ${relative}`);
        files[relative] = sha256File(absolute);
      }
    }
  };
  assertRealDirectory(candidate);
  visit(candidate, '');
  return { files, directories: directories.sort() };
}

export function isolatedEnvironment(runDirectory, extra = {}) {
  return {
    PATH: process.env.PATH ?? '/usr/bin:/bin',
    HOME: path.join(runDirectory, 'home'),
    TMPDIR: path.join(runDirectory, 'tmp'),
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    BEND_NO_TELEMETRY: '1',
    ...extra,
  };
}

function groupState(pid) {
  if (!pid) return false;
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    return 'unknown';
  }
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class OwnedProcessError extends Error {
  constructor(message, result, { workerMayBeLive = false, timedOut = false } = {}) {
    super(message);
    this.name = 'OwnedProcessError';
    this.result = result;
    this.workerMayBeLive = workerMayBeLive;
    this.timedOut = timedOut;
  }
}

export async function runOwnedProcess(executable, args, {
  cwd, env, timeoutMs, maxOutputBytes = 2 * 1024 * 1024, label = path.basename(executable),
} = {}) {
  assert.equal(process.platform, 'linux', 'owned process supervision is Linux-only');
  assert.ok(Number.isInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 300_000,
    'process timeout must be in (0, 300000] ms');
  assert.ok(Number.isInteger(maxOutputBytes) && maxOutputBytes > 0 && maxOutputBytes <= 8 * 1024 * 1024,
    'process output limit is invalid');
  assertRealDirectory(cwd);
  const startedAt = Date.now();
  let child;
  try {
    child = spawn(executable, args, {
      cwd, env, detached: true, windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new OwnedProcessError(`${label} could not be spawned: ${error?.message ?? error}`, {
      stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), status: null, signal: null,
      durationMs: Date.now() - startedAt,
    });
  }
  const stdoutChunks = [];
  const stderrChunks = [];
  let outputBytes = 0;
  let exceededOutput = false;
  let spawnError;
  let closedInfo;
  let exitInfo;
  let leaderExited = false;
  let resolveClosed;
  let resolveExited;
  let resolveStopReason;
  const closedPromise = new Promise((resolve) => { resolveClosed = resolve; });
  const exitedPromise = new Promise((resolve) => { resolveExited = resolve; });
  const stopReason = new Promise((resolve) => { resolveStopReason = resolve; });
  const capture = (target, chunk) => {
    const buffer = Buffer.from(chunk);
    const room = Math.max(0, maxOutputBytes - outputBytes);
    if (room > 0) target.push(buffer.subarray(0, room));
    outputBytes += buffer.length;
    if (outputBytes > maxOutputBytes && !exceededOutput) {
      exceededOutput = true;
      resolveStopReason({ kind: 'output-limit' });
    }
  };
  child.stdout.on('data', (chunk) => capture(stdoutChunks, chunk));
  child.stderr.on('data', (chunk) => capture(stderrChunks, chunk));
  child.once('error', (error) => {
    spawnError = error;
    resolveStopReason({ kind: 'spawn-error' });
  });
  child.once('exit', (status, signal) => {
    leaderExited = true;
    exitInfo = { status, signal };
    resolveExited();
  });
  child.once('close', (status, signal) => {
    closedInfo = { status, signal };
    resolveClosed(closedInfo);
  });
  const deadline = setTimeout(() => resolveStopReason({ kind: 'timeout' }), timeoutMs);
  const result = () => ({
    stdout: Buffer.concat(stdoutChunks), stderr: Buffer.concat(stderrChunks),
    status: (closedInfo ?? exitInfo)?.status ?? null,
    signal: (closedInfo ?? exitInfo)?.signal ?? null,
    pid: child.pid ?? null, durationMs: Date.now() - startedAt,
    outputBytes, exceededOutput,
  });
  try {
    const reason = await Promise.race([
      closedPromise.then(() => ({ kind: 'closed' })),
      stopReason,
    ]);
    clearTimeout(deadline);
    if (reason.kind === 'closed') {
      if (child.pid) {
        const state = groupState(child.pid);
        if (state !== false) {
          // A reaped leader's numeric PGID can be reused. Never signal it.
          throw new OwnedProcessError(`${label} exited but its process-group state is ambiguous`,
            result(), { workerMayBeLive: true });
        }
      }
      if (spawnError) {
        throw new OwnedProcessError(`${label} spawn error: ${spawnError.message}`, result());
      }
      if (closedInfo.status !== 0 || closedInfo.signal !== null) {
        throw new OwnedProcessError(`${label} failed: status=${closedInfo.status} signal=${closedInfo.signal}`, result());
      }
      return result();
    }
    if (!child.pid) {
      throw new OwnedProcessError(`${label} ${reason.kind}: no child process was created`, result(), {
        timedOut: reason.kind === 'timeout',
      });
    }
    // Only the live ChildProcess handle may be signaled. Before its 'exit'
    // event the leader has not been reaped, so the PID cannot be recycled.
    // Descendants holding pipes are not signaled by numeric process group;
    // preserve an uncertain lease for owner-reviewed recovery instead.
    let signalError;
    const signalLeader = (name) => {
      if (leaderExited) return;
      try {
        if (!child.kill(name)) signalError = `direct ${name} signal was not delivered`;
      } catch (error) { signalError = String(error?.message ?? error); }
    };
    signalLeader('SIGTERM');
    await Promise.race([exitedPromise, delay(3000)]);
    if (!leaderExited) {
      signalLeader('SIGKILL');
      await Promise.race([exitedPromise, delay(5000)]);
    }
    child.stdout.destroy();
    child.stderr.destroy();
    if (leaderExited) await Promise.race([closedPromise, delay(1000)]);
    if (!leaderExited || closedInfo === undefined) child.unref();
    const state = groupState(child.pid);
    const live = !leaderExited || closedInfo === undefined || state !== false;
    const description = reason.kind === 'timeout' ? 'timed out' :
      reason.kind === 'output-limit' ? 'exceeded its output limit' :
        `could not start (${spawnError?.message ?? 'process error'})`;
    throw new OwnedProcessError(`${label} ${description}${signalError ? `; ${signalError}` : ''}${live ? '; process-group exit is ambiguous' : '; owned child exited and group is absent'}`,
      result(), { workerMayBeLive: live, timedOut: reason.kind === 'timeout' });
  } catch (error) {
    clearTimeout(deadline);
    if (error instanceof OwnedProcessError) throw error;
    child.stdout.destroy();
    child.stderr.destroy();
    child.unref();
    throw new OwnedProcessError(`${label} supervisor failed: ${error?.message ?? error}`, result(), {
      workerMayBeLive: !!child.pid,
    });
  }
}
