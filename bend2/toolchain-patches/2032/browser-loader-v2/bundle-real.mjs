// 2.0.32-2 browser Worker bundle candidate. Run only after an independent
// receipt pins all four 2032-2 cache manifests and outputs.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, moduleSpecs } from '../../../tools/selected-modules.mjs';
import { verifyCacheSet2032V2 } from '../cache-set-v2/verify.mjs';
import { finalizeOwnedManifest, acquireOwnedLock, releaseOwnedLock } from '../preview/lifecycle.mjs';
import { createSelectedLoader2032 } from '../browser-loader/loader.mjs';
import { assertLocalBunRuntime } from '../browser-loader/runtime.mjs';
import { approvedReceipt } from './approved-receipt.mjs';
import { assertApprovedReceipt, assertReceiptMatchesCacheSet, cacheModuleNames, parseBundleArguments,
  validateReceiptShape } from './receipt.mjs';

process.env.BEND_NO_TELEMETRY = '1';
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw Error('unexpected network access'); };

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const posix = (value) => value.split(path.sep).join('/');
const args = parseBundleArguments(process.argv.slice(2));

function git(...gitArgs) {
  return execFileSync('git', ['-C', root, ...gitArgs], { encoding: 'utf8' }).trim();
}

function within(parent, target) {
  const relative = path.relative(parent, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

function isReparsePoint(stat) {
  const attribute = typeof stat.attributes === 'bigint'
    ? (stat.attributes & 0x400n) !== 0n
    : typeof stat.attributes === 'number' && (stat.attributes & 0x400) !== 0;
  return stat.isSymbolicLink() || attribute;
}

function comparablePath(value) {
  let normalized = path.normalize(value);
  if (process.platform === 'win32') {
    normalized = normalized.replace(/^\\\\\?\\UNC\\/i, '\\\\')
      .replace(/^\\\\\?\\/i, '').toLowerCase();
  }
  return normalized;
}

function assertRegularPath(target, label, expectedType) {
  const absolute = path.resolve(target);
  const parsed = path.parse(absolute);
  let cursor = parsed.root;
  const checkComponent = (candidate, last) => {
    const stat = fs.lstatSync(candidate);
    assert.ok(!isReparsePoint(stat), `${label} contains a reparse point`);
    if (last && expectedType === 'file') assert.ok(stat.isFile(), `${label} is not a regular file`);
    else assert.ok(stat.isDirectory(), `${label} ancestor is not a directory`);
    assert.equal(comparablePath(fs.realpathSync.native(candidate)), comparablePath(candidate),
      `${label} contains a noncanonical filesystem path`);
    return stat;
  };
  checkComponent(cursor, false);
  const parts = absolute.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let finalStat;
  for (const [index, part] of parts.entries()) {
    cursor = path.join(cursor, part);
    finalStat = checkComponent(cursor, index === parts.length - 1);
  }
  return finalStat;
}

function sameFileIdentity(left, right, label) {
  assert.ok(left.isFile() && right.isFile(), `${label} is not a regular file`);
  assert.ok(left.ino !== 0n && right.ino !== 0n, `${label} filesystem does not expose file identity`);
  assert.equal(left.dev, right.dev, `${label} device changed during read`);
  assert.equal(left.ino, right.ino, `${label} file identity changed during read`);
  assert.equal(left.size, right.size, `${label} size changed during read`);
  assert.equal(left.mtimeNs, right.mtimeNs, `${label} modification time changed during read`);
  assert.equal(left.ctimeNs, right.ctimeNs, `${label} change time changed during read`);
}

function readRegularFile(target, label) {
  assertRegularPath(target, label, 'file');
  const before = fs.lstatSync(target, { bigint: true });
  assert.ok(!isReparsePoint(before), `${label} is a reparse point`);
  const noFollow = fs.constants.O_NOFOLLOW ?? 0;
  const fd = fs.openSync(target, fs.constants.O_RDONLY | noFollow);
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    sameFileIdentity(before, opened, label);
    const bytes = fs.readFileSync(fd);
    sameFileIdentity(opened, fs.fstatSync(fd, { bigint: true }), label);
    const after = fs.lstatSync(target, { bigint: true });
    assert.ok(!isReparsePoint(after), `${label} became a reparse point during read`);
    sameFileIdentity(opened, after, label);
    assertRegularPath(target, label, 'file');
    return bytes;
  } finally {
    fs.closeSync(fd);
  }
}

function committedFileBytes(relative) {
  return execFileSync('git', ['-C', root, 'show', `HEAD:${relative}`]);
}

function assertTrackedUnchanged(relative, currentBytes) {
  const tracked = git('ls-files', '--error-unmatch', '--', relative);
  assert.equal(tracked, relative, `required source is not versioned: ${relative}`);
  assert.deepEqual(currentBytes, committedFileBytes(relative),
    `versioned source differs from HEAD: ${relative}`);
}

const receiptFile = path.isAbsolute(args.receiptPath)
  ? path.resolve(args.receiptPath) : path.resolve(root, args.receiptPath);
assert.ok(within(root, receiptFile), 'independent receipt must be inside the repository');
const receiptPath = posix(path.relative(root, receiptFile));
assert.equal(path.posix.normalize(receiptPath), receiptPath,
  'independent receipt path must be canonical and repository-relative');
assert.ok(receiptPath.startsWith('bend2/toolchain-patches/2032/browser-loader-v2/'),
  'independent receipt must be a versioned file in browser-loader-v2');
const receiptBytes = readRegularFile(receiptFile, 'independent receipt');
assert.equal(sha256(receiptBytes), args.receiptSha256,
  'independent receipt bytes differ from the separately supplied SHA-256');
const receipt = validateReceiptShape(JSON.parse(receiptBytes.toString('utf8')));
assertApprovedReceipt(approvedReceipt, receiptPath, args.receiptSha256, receipt);

const manifestPaths = Object.fromEntries(cacheModuleNames.map((name) => {
  const supplied = path.isAbsolute(args.manifestArgs[name])
    ? path.resolve(args.manifestArgs[name]) : path.resolve(root, args.manifestArgs[name]);
  return [name, supplied];
}));
const previewRoot = path.join(root, '.artifacts/bend2/2032-preview');
const verify = () => {
  const verified = verifyCacheSet2032V2({ previewRoot, manifestPaths });
  assertReceiptMatchesCacheSet(receipt, verified, manifestPaths, root);
  return verified;
};
const before = verify();
const cacheSnapshot = (set) => Object.fromEntries(cacheModuleNames.map((name) => [name, {
  manifestSha256: sha256(set.modules[name].manifestBytes),
  outputBytes: set.modules[name].bytes.length,
  outputSha256: sha256(set.modules[name].bytes),
}]));
const initialCacheSnapshot = cacheSnapshot(before);

assert.equal(typeof Bun?.build, 'function', 'run with the repository-local Bun runtime');
const runtimeRoot = path.join(root, '.artifacts/toolchains/runtime');
const bunExe = assertLocalBunRuntime(root, runtimeRoot, process.execPath);
const toolchain = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));
assert.equal(Bun.version, toolchain.bunVersion, 'Bun version differs from the pinned runtime');
const bunRuntime = {
  version: Bun.version,
  executable: posix(path.relative(root, bunExe)),
  sha256: sha256(readRegularFile(bunExe, 'repository-local Bun executable')),
};

const candidateSources = [
  'bend2/toolchain-patches/2032/browser-loader-v2/bundle-real.mjs',
  'bend2/toolchain-patches/2032/browser-loader-v2/receipt.mjs',
  'bend2/toolchain-patches/2032/browser-loader-v2/receipt.schema.json',
  'bend2/toolchain-patches/2032/browser-loader-v2/approved-receipt.mjs',
  'bend2/toolchain-patches/2032/browser-loader/loader.mjs',
  'bend2/toolchain-patches/2032/browser-loader/runtime.mjs',
  'bend2/toolchain-patches/2032/cache-set-v2/verify.mjs',
  'bend2/toolchain-patches/2032/preview/lifecycle.mjs',
  'bend2/tools/selected-modules.mjs',
  'bend2/TOOLCHAIN.json',
  'bend2/platform/browser/worker-v2.ts',
  'bend2/platform/browser/sprite-helper.ts',
  'bend2/platform/browser/asset-port.ts',
  'bend2/platform/browser/image-port.ts',
  'bend2/platform/browser/bitmap-surface.ts',
  'bend2/tools/bend.mjs',
  'bend2/tools/loader.ts',
];
const sourceFiles = [...new Set([...candidateSources, receiptPath])].sort();
const assertSourceSnapshot = () => sourceFiles.map((relative) => {
  const bytes = readRegularFile(path.resolve(root, ...relative.split('/')), `source file ${relative}`);
  assertTrackedUnchanged(relative, bytes);
  return { file: relative, sha256: sha256(bytes) };
});
const sourceRevision = git('rev-parse', 'HEAD');
const sourceTree = git('show', '-s', '--format=%T', 'HEAD');
assert.equal(git('status', '--porcelain', '--untracked-files=all'), '',
  'bundle source checkout must be clean and versioned');
const sourceSnapshot = assertSourceSnapshot();
const assertSourceUnchanged = () => {
  assert.equal(git('rev-parse', 'HEAD'), sourceRevision, 'bundle source revision changed');
  assert.equal(git('show', '-s', '--format=%T', 'HEAD'), sourceTree, 'bundle source tree changed');
  assert.equal(git('status', '--porcelain', '--untracked-files=all'), '',
    'bundle source checkout changed during build');
  assert.deepEqual(assertSourceSnapshot(), sourceSnapshot, 'versioned bundle source bytes changed');
  assert.equal(sha256(readRegularFile(receiptFile, 'independent receipt')), args.receiptSha256,
    'independent receipt changed during build');
};

const plugin = createSelectedLoader2032(before);
const sceneSource = before.modules.scene.manifest.output.sha256;
const buildOptions = { target: 'browser', format: 'esm', splitting: false, minify: true,
  plugins: [plugin] };
async function buildOne(entrypoint, define) {
  const result = await Bun.build({ ...buildOptions, entrypoints: [entrypoint], define });
  assert.equal(result.success, true, result.logs.map(String).join('\n'));
  assert.equal(result.outputs.length, 1, 'unexpected browser bundle outputs');
  assert.ok(result.outputs[0].path.endsWith('.js'), 'expected one JavaScript output');
  return Buffer.from(await result.outputs[0].arrayBuffer());
}

const artifactParent = path.join(root, '.artifacts/bend2');
assert.equal(comparablePath(fs.realpathSync.native(artifactParent)), comparablePath(artifactParent),
  'bundle artifact parent must not be a reparse path');
const outputRoot = path.join(artifactParent, '2032-browser-probe-v2');
execFileSync('git', ['-C', root, 'check-ignore', '--quiet', '--', posix(path.relative(root, outputRoot))],
  { stdio: 'ignore' });
fs.mkdirSync(outputRoot, { recursive: true });
assertRegularPath(outputRoot, 'bundle output root', 'directory');
const sourceLease = acquireOwnedLock(path.join(outputRoot, '.worker-bundle-v2.lock'),
  Buffer.from(JSON.stringify({ schema: 'rift-bend-worker-bundle-lease/1',
    pid: process.pid, sourceRevision, sourceTree, receiptSha256: args.receiptSha256 })));

let completion;
try {
  const runDir = path.join(outputRoot, `worker-${Date.now()}-${process.pid}-${randomUUID()}`);
  fs.mkdirSync(runDir);
  assertRegularPath(runDir, 'worker bundle run directory', 'directory');

  const helper = await buildOne(path.join(root, 'bend2/platform/browser/sprite-helper.ts'), {
    __BEND_SPRITE_SOURCE__: JSON.stringify(sceneSource),
    __BEND_PREPARED_GROUND_PATH__: JSON.stringify(''),
    __BEND_PREPARED_GROUND_SHA__: JSON.stringify(''),
    __BEND_PREPARED_PLATE_SHA__: JSON.stringify(''),
    __BEND_PREPARED_FRAME_JSON__: JSON.stringify(''),
  });
  const helperFile = `sprite-helper-${sha256(helper).slice(0, 12)}.js`;
  const worker = await buildOne(path.join(root, 'bend2/platform/browser/worker-v2.ts'), {
    __BEND_SPRITE_HELPER__: JSON.stringify(`./${helperFile}`),
    __BEND_SPRITE_SOURCE__: JSON.stringify(sceneSource),
  });
  const outputs = [[helperFile, helper], [`worker-${sha256(worker).slice(0, 12)}.js`, worker]];
  for (const [fileName, bytes] of outputs) {
    const outputFile = path.join(runDir, fileName);
    fs.writeFileSync(outputFile, bytes, { flag: 'wx' });
    const fd = fs.openSync(outputFile, 'r');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    assert.equal(sha256(readRegularFile(outputFile, `bundle output ${fileName}`)), sha256(bytes));
  }
  const outputManifest = outputs.map(([file, bytes]) => ({
    file, bytes: bytes.length, sha256: sha256(bytes),
  }));
  const manifest = {
    schema: 'rift-bend-2032-worker-bundle-probe-v2/1',
    sourceRevision,
    sourceTree,
    cacheSourceCommit: receipt.cacheSource.commit,
    cacheSourceTree: receipt.cacheSource.tree,
    cacheSchema: 'rift-bend-selected-cache/2032-2',
    independentReceipt: { path: receiptPath, sha256: args.receiptSha256 },
    bunRuntime,
    cacheManifests: Object.fromEntries(cacheModuleNames.map((name) => [name, {
      path: receipt.manifests[name].manifestPath,
      manifestSha256: initialCacheSnapshot[name].manifestSha256,
      outputBytes: initialCacheSnapshot[name].outputBytes,
      outputSha256: initialCacheSnapshot[name].outputSha256,
      sourceCommit: receipt.manifests[name].sourceCommit,
      sourceTree: receipt.manifests[name].sourceTree,
    }])),
    outputs: outputManifest,
    sourceFiles: sourceSnapshot,
    networkCalls,
    scope: '2.0.32-2 cache-bound Worker bundles only; not a served, rendered, interactive, GPU/native, published or pin-adopted app',
  };
  const assertInputsAndOutputsUnchanged = () => {
    assert.deepEqual(cacheSnapshot(verify()), initialCacheSnapshot,
      'selected 2032-2 caches changed during bundle');
    assertSourceUnchanged();
    assert.equal(networkCalls, 0, 'bundle attempted network access');
    for (const output of outputManifest) {
      const bytes = readRegularFile(path.join(runDir, output.file), `bundle output ${output.file}`);
      assert.equal(bytes.length, output.bytes, `bundle output byte count changed: ${output.file}`);
      assert.equal(sha256(bytes), output.sha256, `bundle output changed: ${output.file}`);
    }
  };
  assertInputsAndOutputsUnchanged();
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  const manifestFile = path.join(runDir, 'worker-v2.manifest.json');
  finalizeOwnedManifest(path.join(runDir, 'worker-v2.manifest.pending'), manifestFile, manifestBytes, {
    verifyTemp: (bytes) => assert.deepEqual(JSON.parse(bytes.toString('utf8')), manifest),
    beforeCommit: assertInputsAndOutputsUnchanged,
  });
  const committedManifest = readRegularFile(manifestFile, 'final worker bundle manifest');
  assert.deepEqual(committedManifest, manifestBytes, 'final worker bundle manifest bytes differ');
  completion = { ok: true,
    runDir: posix(path.relative(root, runDir)),
    manifestSha256: sha256(committedManifest),
    independentReceipt: manifest.independentReceipt,
    cacheSourceCommit: manifest.cacheSourceCommit,
    cacheSourceTree: manifest.cacheSourceTree,
    outputs: outputManifest,
    networkCalls,
    bunRuntime,
    scope: manifest.scope };
} finally {
  releaseOwnedLock(sourceLease);
}
console.log(JSON.stringify(completion));
