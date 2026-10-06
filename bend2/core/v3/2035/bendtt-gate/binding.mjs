import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { root, derived, readSource, sha256, selectedBinding2035 } from '../../../../toolchain-patches/2035/selected-binding.mjs';
import { verifyV2 } from '../../../../tools/freeze-v2.mjs';
import { expectedCheckClosure } from '../../2032/aggregate-safety.mjs';
import { candidate, leanSource, safeSource, relativeInput, validateSourceApproval,
  validateKernelApproval, validateLinuxRuntimeApproval, assertSafeRuntime } from './contracts.mjs';

export { root, derived, readSource, sha256 };
export const checkPath = path.join(root, 'bend2/core/v2/CHECK.bend');
export const outputRoot = path.join(root, '.artifacts/bend2/2035-kernel-20261005');
export const consumerFiles = ['approvals.mjs', 'binding.mjs', 'contracts.mjs', 'output.mjs', 'run.mjs', 'worker.mjs', 'probe.mjs', 'test.mjs', 'README.md', 'lineage-review-20261006.json'];
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
  return validateSourceApproval(approval, Object.fromEntries(['aggregate', 'mutations', 'handoff', 'review']
    .map(key => [key, localRecord(approval[key])])));
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

// This reviewed descendant reconciles only eleven exact noncritical Git blobs.
// Critical source/evidence, frozen closure and compiler checks below still apply.
function reviewedLineage(reference) {
  const file = 'bend2/core/v3/2035/bendtt-gate/lineage-review-20261006.json';
  const bytes = readSource(absolute(file));
  assert.equal(sha256(bytes), '0cd458ed8425bfb49d524ff95eb365861e98b33c4f4bba3b4d5edaa4c41d36a2', 'lineage review bytes changed');
  const review = JSON.parse(bytes.toString('utf8'));
  assert.equal(review.schema, 'rift-bendtt-2035-lineage-review/1');
  assert.equal(review.aggregateCommit, reference.sourceCommit);
  assert.equal(review.aggregateTree, reference.sourceTree);
  assert.equal(git(root, 'rev-parse', `${review.reviewedCommit}^{tree}`), review.reviewedTree);
  const ancestor = spawnSync('git', ['-C', root, 'merge-base', '--is-ancestor', review.reviewedCommit, 'HEAD'],
    { windowsHide: true, timeout: 30_000, stdio: ['ignore', 'ignore', 'pipe'] });
  assert.equal(ancestor.error, undefined); assert.equal(ancestor.status, 0, 'reviewed UI commit is not an ancestor');
  const changes = new Map();
  for (const change of review.changes) {
    assert.ok(!changes.has(change.path), 'duplicate reviewed lineage path');
    assert.equal(git(root, 'diff', '--name-status', reference.sourceCommit, review.reviewedCommit, '--', change.path),
      `${change.status}\t${change.path}`);
    if (change.beforeBlob !== null)
      assert.equal(git(root, 'rev-parse', `${reference.sourceCommit}:${change.path}`), change.beforeBlob);
    assert.equal(git(root, 'rev-parse', `${review.reviewedCommit}:${change.path}`), change.afterBlob);
    assert.equal(git(root, 'rev-parse', `HEAD:${change.path}`), change.afterBlob, `reviewed UI input changed: ${change.path}`);
    changes.set(change.path, change.status);
  }
  return { changes, identity: { path: file, sha256: sha256(bytes), reviewedCommit: review.reviewedCommit,
    reviewedTree: review.reviewedTree, reviewedFiles: changes.size } };
}

function lineage(reference) {
  const ancestor = spawnSync('git', ['-C', root, 'merge-base', '--is-ancestor', reference.sourceCommit, 'HEAD'],
    { windowsHide: true, timeout: 30_000, stdio: ['ignore', 'ignore', 'pipe'] });
  assert.equal(ancestor.error, undefined); assert.equal(ancestor.status, 0, 'source receipt is not an ancestor');
  assert.equal(git(root, 'rev-parse', `${reference.sourceCommit}^{tree}`), reference.sourceTree);
  const changes = git(root, 'diff', '--name-status', reference.sourceCommit, 'HEAD').split('\n').filter(Boolean);
  const allowedDocs = new Set(['bend2/SPRINT.md', 'bend2/docs/BEND_2035_EVALUATION.md',
    'bend2/docs/ROLLOVER_2026-10-05.md', 'bend2/docs/LOCAL_BEND_GUIDE.md',
    'bend2/core/v3/2035/README.md', 'bend2/toolchain-patches/2035/README.md']);
  const reviewed = reviewedLineage(reference);
  for (const line of changes) {
    const [status, file] = line.split('\t');
    const gate = file?.startsWith('bend2/core/v3/2035/bendtt-gate/');
    assert.ok(reviewed.changes.get(file) === status || (status === 'A' && (gate || file.startsWith('bend2/docs/')))
      || (status === 'M' && (allowedDocs.has(file) || (gate && ['approvals.mjs', 'README.md'].includes(file.split('/').at(-1))))),
    `post-source receipt drift is not approved additive consumer/docs work: ${line}`);
  }
  const critical = reference.before.sourceFiles.filter(file => !file.path.startsWith('.artifacts/'));
  assert.equal(git(root, 'diff', '--name-only', reference.sourceCommit, 'HEAD', '--',
    ...critical.map(file => file.path)), '', 'critical Git input changed since the accepted source receipt');
  return { aggregateCommit: reference.sourceCommit, aggregateTree: reference.sourceTree,
    criticalTrackedFiles: critical.length, laterChanges: changes, reviewedNoncritical: reviewed.identity };
}

export function captureSource(approval, { requireClean = true } = {}) {
  assert.equal(process.env.BEND_NO_TELEMETRY, '1');
  const { aggregate, mutations, handoff } = sourceEvidence(approval);
  const status = git(root, 'status', '--porcelain=v1', '--untracked-files=all');
  if (requireClean) assert.equal(status, '', 'BendTT consumer needs a clean checkout');
  const frozen = verifyV2(); assert.equal(frozen.sha256, aggregate.frozenSha256);
  const compiler = selectedBinding2035('scene', true);
  assert.deepEqual(compiler, aggregate.before.compiler, 'compiler/helper inventories differ from accepted source receipt');
  for (const file of aggregate.before.sourceFiles)
    assert.equal(hash(absolute(file.path)), file.sha256, `critical source/evidence bytes changed: ${file.path}`);
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
  const expectedPaths = expectedCheckClosure(root, checkPath, frozen.manifest.files, path.join(derived, 'bend2/base.bend'));
  const closure = expectedPaths.map(file => ({ path: file === path.join(derived, 'bend2/base.bend')
    ? '<derived>/bend2/base.bend' : path.relative(root, file).split(path.sep).join('/'), sha256: hash(file) }))
    .sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(closure, aggregate.closure.files, 'full frozen CHECK relative closure differs');
  const sources = consumerFiles.map(name => ({ path: `bend2/core/v3/2035/bendtt-gate/${name}`,
    sha256: hash(path.join(root, 'bend2/core/v3/2035/bendtt-gate', name)) }));
  const helpers = Object.entries(reusedHelpers).map(([file, expected]) => {
    assert.equal(hash(absolute(file)), expected, `reused lifecycle/helper changed: ${file}`);
    return { path: file, sha256: expected };
  });
  return { schema: 'rift-bendtt-2035-source-binding/1', producerScope: 'source/type/promise',
    namespaceGuard: aggregate.namespaceGuard, sourceCommit: git(root, 'rev-parse', 'HEAD'),
    sourceTree: git(root, 'rev-parse', 'HEAD^{tree}'), sourceStatus: status,
    frozenSha256: frozen.sha256, frozenFiles: frozen.manifest.files, closure, compiler,
    acceptedSource: { approval, sourceCommit: aggregate.sourceCommit, sourceTree: aggregate.sourceTree,
      bindingSha256: aggregate.bindingSha256, windowsRuntime: aggregate.before.runtime,
      mutationSchema: mutations.schema, handoffSchema: handoff.schema },
    lineage: lineage(aggregate), consumerFiles: sources, reusedHelpers: helpers, safeSource, leanSource };
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
