import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { root, derived, readSource, sha256 } from '../../../../toolchain-patches/2035/selected-binding.mjs';
import { capturePreparedInputs, preparedCheckPath } from './source-prepared.mjs';
import { validatePreparedSourceApproval } from './contracts-prepared.mjs';
import { candidate, leanSource, safeSource, relativeInput, exactKeys,
  validateKernelApproval, validateLinuxRuntimeApproval, assertSafeRuntime } from './contracts.mjs';

export { root, derived, readSource, sha256 };
export const checkPath = preparedCheckPath;
export const outputRoot = path.join(root, '.artifacts/bend2/2035-kernel-20261005');
export const consumerFiles = ['approvals.mjs', 'binding.mjs', 'contracts.mjs', 'contracts-prepared.mjs', 'source-prepared.mjs', 'output.mjs', 'run.mjs', 'worker.mjs', 'probe.mjs', 'test.mjs', 'README.md', 'lineage-prepared-20261007.json'];
const scout = path.join(root, '.artifacts/toolchains/bend-2.0.35-scout');
const canonical = path.join(root, '.artifacts/toolchains/bend');
const git = (directory, ...args) => {
  const sourceStatus = args.length === 3 && args[0] === 'status'
    && args[1] === '--porcelain=v1' && args[2] === '--untracked-files=all';
  const linuxStatus = process.platform === 'linux' && sourceStatus
    && [root, scout, canonical].includes(directory);
  const command = [...(linuxStatus && directory === canonical ? ['-c', 'core.autocrlf=true'] : []),
    '-C', directory, ...args];
  const timeoutMs = linuxStatus ? 90_000 : 30_000;
  try {
    return execFileSync('git', command, {
      encoding: 'utf8', windowsHide: true, timeout: timeoutMs, maxBuffer: 64 * 1024 ** 2,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).replaceAll('\r\n', '\n').trimEnd();
  } catch (error) {
    throw new Error(`Git failed: directory=${directory}; argv=${JSON.stringify(command)}; timeoutMs=${timeoutMs}: ${error.message}`,
      { cause: error });
  }
};
const hash = file => sha256(readSource(file));
const absolute = relative => path.join(root, ...relativeInput(relative).split('/'));
const reusedHelpers = {
  'bend2/core/v3/2032/bendtt-supervisor.mjs': 'e61c72e8c5fbe004109fe04cc976cbe63d3a7efcacb7bbb1671bada99bb6c793',
  'bend2/core/v3/2032/bendtt-gate/contracts.mjs': '2eb68071f4bc27bbf4a032ed3384b7dfcd94ea71bf6b4772d573b3a07198c963',
  'bend2/core/v3/2032/aggregate-safety.mjs': '2b29d0346a79b760e12c031e02f92bbfc106508cf02a6342ac4a52b4fa87dd23',
  'bend2/toolchain-patches/2032/preview/lifecycle.mjs': '91d8b5c325a48602d0d6860624ab0abf9d5428d374a12d85988cb866a732fbc8',
};

export function localRecord(entry) {
  assert.ok(entry?.path?.startsWith('.artifacts/bend2/'), 'approval evidence must be in ignored Bend2 artifacts');
  const file = absolute(entry.path);
  git(root, 'check-ignore', '--quiet', entry.path);
  const bytes = readSource(file);
  assert.equal(sha256(bytes), entry.sha256, `evidence hash differs: ${entry.path}`);
  return bytes;
}
export function sourceEvidence(approval) {
  assert.ok(approval, 'source approval is null');
  const records = { receipt: localRecord(approval.receipt), review: localRecord(approval.review) };
  for (const key of ['terminal', 'settlement', 'supervisor', 'capture', 'start'])
    records[key] = localRecord(approval.native[key]);
  return validatePreparedSourceApproval(approval, records);
}

// The sole executing Node and the approved prebuilt kernel may be external.
// This reader does not widen the repository-fenced readSource helper.
export function externalFile(file, { executable = false } = {}) {
  assert.equal(typeof file, 'string'); assert.ok(path.isAbsolute(file));
  assert.equal(path.resolve(file), file); assert.equal(fs.realpathSync(file), file, 'external path is redirected');
  const before = fs.lstatSync(file, { bigint: true });
  const same = stat => {
    assert.ok(stat.isFile() && !stat.isSymbolicLink());
    for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(stat[key], before[key], 'external file changed');
  };
  same(before);
  if (executable) assert.ok((before.mode & 0o111n) !== 0n, 'kernel is not executable');
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  let bytes;
  try {
    same(fs.fstatSync(fd, { bigint: true })); bytes = fs.readFileSync(fd);
    same(fs.fstatSync(fd, { bigint: true })); same(fs.lstatSync(file, { bigint: true }));
    assert.equal(fs.realpathSync(file), file);
  } finally { fs.closeSync(fd); }
  return { bytes, identity: { path: file, bytes: bytes.length, sha256: sha256(bytes),
    dev: String(before.dev), ino: String(before.ino), mode: Number(before.mode & 0o777n) } };
}
export function captureRuntime(expected, worker = false) {
  const node = externalFile(path.resolve(process.execPath)).identity;
  const runtime = { version: process.version, platform: process.platform, arch: process.arch,
    executableSha256: node.sha256, execArgv: process.execArgv, nodeOptions: process.env.NODE_OPTIONS ?? '',
    bunAbsent: typeof globalThis.Bun === 'undefined' };
  assertSafeRuntime(runtime, expected, worker);
  return { ...runtime, executable: node };
}

// Only the designated digest literal is normalized to break self-reference.
// Every listed postimage and every post-source change is otherwise exact.
const approvedLineageSha256 = '0e9c38e22a11246edbd494afc82da810ce8c6e6567a177de205bdec2e1765653';
const lineagePath = 'bend2/core/v3/2035/bendtt-gate/lineage-prepared-20261007.json';
const lineageChanges = new Map([
  ['binding.mjs', 'M'], ['approvals.mjs', 'M'], ['test.mjs', 'M'], ['README.md', 'M'], ['probe.mjs', 'M'],
  ['contracts-prepared.mjs', 'A'], ['source-prepared.mjs', 'A'],
].map(([name, status]) => [`bend2/core/v3/2035/bendtt-gate/${name}`, status]));
const gitBytes = file => execFileSync('git', ['-C', root, 'show', `HEAD:${file}`],
  { windowsHide: true, timeout: 30_000, maxBuffer: 1024 ** 2, stdio: ['ignore', 'pipe', 'pipe'] });

function reviewedLineage(reference, approval) {
  const bytes = readSource(absolute(lineagePath));
  assert.equal(sha256(bytes), approvedLineageSha256, 'lineage amendment bytes changed');
  const committed = gitBytes(lineagePath);
  assert.equal(sha256(committed), approvedLineageSha256, 'committed lineage amendment bytes changed');
  assert.deepEqual(bytes, committed, 'lineage amendment working bytes differ from HEAD');
  const review = JSON.parse(bytes.toString('utf8'));
  exactKeys(review, ['schema', 'sourceCommit', 'sourceTree', 'bindingSha256',
    'receiptSha256', 'sourceReviewSha256', 'scope', 'changes'], 'prepared lineage');
  assert.equal(review.schema, 'rift-bendtt-2035-lineage-amendment/2');
  assert.equal(review.sourceCommit, reference.sourceCommit);
  assert.equal(review.sourceTree, reference.sourceTree);
  assert.equal(review.bindingSha256, reference.bindingSha256);
  assert.equal(review.receiptSha256, approval.receipt.sha256);
  assert.equal(review.sourceReviewSha256, approval.review.sha256);
  assert.equal(review.scope, 'Exact prepared consumer postimages; Windows source/type/promise only; no kernel/runtime/native/adoption authority');
  const changed = new Map();
  for (const change of review.changes) {
    assert.ok(!changed.has(change.path), 'duplicate amended lineage path');
    assert.equal(lineageChanges.get(change.path), change.status, 'unknown consumer amendment path/status');
    if (change.status === 'M') {
      assert.equal(git(root, 'rev-parse', `${reference.sourceCommit}:${change.path}`), change.beforeBlob);
    } else {
      const absent = spawnSync('git', ['-C', root, 'cat-file', '-e', `${reference.sourceCommit}:${change.path}`],
        { windowsHide: true, timeout: 30_000, stdio: ['ignore', 'ignore', 'pipe'] });
      assert.equal(absent.error, undefined); assert.equal(absent.status, 128, 'added consumer existed at source receipt');
    }
    const head = gitBytes(change.path), working = readSource(absolute(change.path));
    let text = head.toString('utf8');
    assert.deepEqual(Buffer.from(text), head, 'consumer postimage is not valid UTF-8');
    assert.deepEqual(working, head, `amended consumer working bytes differ from HEAD: ${change.path}`);
    if (change.path.endsWith('/binding.mjs')) {
      exactKeys(change, ['path', 'status', 'beforeBlob', 'normalization', 'normalizedSha256'], 'normalized binding lineage');
      assert.equal(change.normalization, 'one-lineage-digest-literal');
      const matches = [...text.matchAll(/^const approvedLineageSha256 = '[0-9a-f]{64}';$/gm)];
      assert.equal(matches.length, 1, 'lineage digest declaration must occur exactly once');
      assert.equal(matches[0][0], `const approvedLineageSha256 = '${approvedLineageSha256}';`);
      text = text.replace(matches[0][0], "const approvedLineageSha256 = '" + '0'.repeat(64) + "';");
      assert.equal(sha256(Buffer.from(text)), change.normalizedSha256, 'normalized binding postimage differs');
    } else {
      exactKeys(change, change.status === 'M' ? ['path', 'status', 'beforeBlob', 'afterBlob']
        : ['path', 'status', 'afterBlob'], 'consumer postimage lineage');
      assert.equal(git(root, 'rev-parse', `HEAD:${change.path}`), change.afterBlob, `consumer postimage differs: ${change.path}`);
    }
    changed.set(change.path, change.status);
  }
  assert.deepEqual([...changed].sort(), [...lineageChanges].sort(), 'consumer amendment inventory differs');
  // Its own added path is authenticated by the complete-byte digest above.
  changed.set(lineagePath, 'A');
  for (const name of consumerFiles) {
    const file = `bend2/core/v3/2035/bendtt-gate/${name}`;
    if (changed.has(file)) continue;
    assert.equal(git(root, 'rev-parse', `HEAD:${file}`),
      git(root, 'rev-parse', `${reference.sourceCommit}:${file}`), `unreviewed consumer HEAD change: ${file}`);
    assert.deepEqual(readSource(absolute(file)), gitBytes(file), `unreviewed consumer working change: ${file}`);
  }
  return { changes: changed, identity: { path: lineagePath, sha256: sha256(bytes),
    sourceCommit: review.sourceCommit, reviewedFiles: changed.size,
    normalization: 'binding: exactly one designated digest value; all other bytes exact' } };
}
function lineage(reference, approval) {
  const ancestor = spawnSync('git', ['-C', root, 'merge-base', '--is-ancestor', reference.sourceCommit, 'HEAD'],
    { windowsHide: true, timeout: 30_000, stdio: ['ignore', 'ignore', 'pipe'] });
  assert.equal(ancestor.error, undefined); assert.equal(ancestor.status, 0, 'source receipt is not an ancestor');
  assert.equal(git(root, 'rev-parse', `${reference.sourceCommit}^{tree}`), reference.sourceTree);
  const reviewed = reviewedLineage(reference, approval);
  const changes = git(root, 'diff', '--no-renames', '--name-status', reference.sourceCommit, 'HEAD').split('\n').filter(Boolean);
  for (const line of changes) {
    const [status, file, extra] = line.split('\t');
    assert.equal(extra, undefined, 'unexpected diff record');
    assert.equal(reviewed.changes.get(file), status, `post-source receipt drift is unreviewed: ${line}`);
  }
  assert.deepEqual(changes.map(line => line.split('\t').reverse()).sort(),
    [...reviewed.changes].sort(), 'reviewed consumer changes are missing at HEAD');
  const critical = reference.before.sourceFiles.filter(file => !file.path.startsWith('.artifacts/'));
  assert.equal(git(root, 'diff', '--name-only', reference.sourceCommit, 'HEAD', '--',
    ...critical.map(file => file.path)), '', 'critical Git input changed since the accepted source receipt');
  return { sourceCommit: reference.sourceCommit, sourceTree: reference.sourceTree,
    criticalTrackedFiles: critical.length, laterChanges: changes, reviewedNoncritical: reviewed.identity };
}

export function captureSource(approval, { requireClean = true } = {}) {
  assert.equal(process.env.BEND_NO_TELEMETRY, '1');
  const { receipt } = sourceEvidence(approval);
  const status = git(root, 'status', '--porcelain=v1', '--untracked-files=all');
  if (requireClean) assert.equal(status, '', 'BendTT consumer needs a clean checkout');
  const captured = capturePreparedInputs(receipt);
  const { compiler, closure, frozenFiles, frozenSha256, preparedManifest } = captured;
  for (const [dir, commit] of [[scout, candidate.commit],
    [path.join(root, '.artifacts/toolchains/bend'), compiler.canonicalPin]]) {
    assert.equal(git(dir, 'rev-parse', 'HEAD'), commit);
    assert.equal(git(dir, 'status', '--porcelain=v1', '--untracked-files=all'), '');
  }
  assert.equal(git(scout, 'rev-parse', 'HEAD^{tree}'), candidate.tree);
  for (const source of [leanSource, safeSource]) {
    assert.equal(git(scout, 'rev-parse', `${candidate.commit}:${source.path}`), source.gitBlob);
    const bytes = execFileSync('git', ['-C', scout, 'show', `${candidate.commit}:${source.path}`],
      { windowsHide: true, timeout: 30_000, maxBuffer: 1024 ** 2, stdio: ['ignore', 'pipe', 'pipe'] });
    assert.equal(sha256(bytes), source.sha256);
    assert.equal(hash(path.join(derived, source.path)), source.sha256, 'derived Safe/kernel source differs from pristine LF blob');
  }
  const sources = consumerFiles.map(name => ({ path: `bend2/core/v3/2035/bendtt-gate/${name}`,
    sha256: hash(path.join(root, 'bend2/core/v3/2035/bendtt-gate', name)) }));
  const helpers = Object.entries(reusedHelpers).map(([file, expected]) => {
    assert.equal(hash(absolute(file)), expected, `reused lifecycle/helper changed: ${file}`);
    return { path: file, sha256: expected };
  });
  return { schema: 'rift-bendtt-2035-source-binding/2', producerScope: 'source/type/promise',
    namespaceGuard: receipt.aggregate.namespaceGuard, sourceCommit: git(root, 'rev-parse', 'HEAD'),
    sourceTree: git(root, 'rev-parse', 'HEAD^{tree}'), sourceStatus: status,
    frozenSha256, frozenFiles, preparedManifest, closure, compiler, controller: captured.controller,
    negativeControls: captured.negativeControls,
    acceptedSource: { approval, sourceCommit: receipt.sourceCommit, sourceTree: receipt.sourceTree,
      bindingSha256: receipt.bindingSha256, windowsRuntime: receipt.before.runtime,
      receiptSchema: receipt.schema, actualFreshWorkers: receipt.actualFreshWorkers },
    lineage: lineage(receipt, approval), consumerFiles: sources, reusedHelpers: helpers, safeSource, leanSource };
}

export function captureBinding(approvals, options = {}) {
  assert.ok(approvals?.source && approvals?.kernel && approvals?.runtime, 'source/kernel/Linux runtime approvals are null');
  assert.equal(process.platform, 'linux', 'kernel execution is Linux-only');
  const source = captureSource(approvals.source, options);
  const expectedRuntime = validateLinuxRuntimeApproval(approvals.runtime, localRecord(approvals.runtime.review));
  const runtime = captureRuntime(expectedRuntime, options.worker === true);
  const { bytes, identity } = externalFile(approvals.kernel.path, { executable: true });
  const kernel = validateKernelApproval(approvals.kernel, bytes, localRecord(approvals.kernel.review));
  return { source, runtime, kernel: { ...kernel, identity } };
}
