import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const aggregateApprovalSchema = 'rift-bendtt-aggregate-approval/1';
export const kernelApprovalSchema = 'rift-bendtt-kernel-approval/1';
export const successLine = 'ALL PROOFS CHECK\n';
export const expectedBendttSource = Object.freeze({
  commit: '573002f01ec6c52416d44489543f69a9625facf8',
  tree: '0ecfc84c5f19bbae2c0c10735129749adf7d49e8',
  path: 'bend2/bendtt.lean',
  gitBlob: '047ff907c8754ca3917ff341974aea18fab4720b',
  // SHA-256 of the Git blob bytes (LF), not this checkout's possible CRLF
  // working-file representation.
  sha256: '7f6ef51c9f75d7de91c15f790fb3385189b1129e7bc13812c9d8aa30a2c73dec',
});
export const expectedBendttSafeSource = Object.freeze({
  commit: '573002f01ec6c52416d44489543f69a9625facf8',
  tree: '0ecfc84c5f19bbae2c0c10735129749adf7d49e8',
  path: 'bend2/safe.ts',
  gitBlob: 'a0b6fd07573c7fbf547ccdecb42ffa167bee6ba9',
  sha256: '0409d451415fbac0cd596aadb107f95244961a2b8847acf3d380ffdbbfb5c6ea',
});

const shaPattern = /^[0-9a-f]{64}$/;
const commitPattern = /^[0-9a-f]{40}$/;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const exactKeys = (value, expected, label) => {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} fields differ`);
};
const absoluteCanonical = (value, label, pathApi = path) => {
  assert.equal(typeof value, 'string', `${label} must be a string`);
  assert.ok(pathApi.isAbsolute(value), `${label} must be absolute`);
  assert.equal(pathApi.resolve(value), value, `${label} must be canonical`);
};

function checkReview(review, kind, sha, source, bytes, kernelDetails = null) {
  exactKeys(review, ['disposition', 'path', 'sha256'], `${kind} independent review`);
  assert.equal(review.disposition, 'accepted', `${kind} independent review is not accepted`);
  absoluteCanonical(review.path, `${kind} review path`);
  assert.match(review.sha256, shaPattern, `${kind} review SHA-256 is malformed`);
  assert.ok(Buffer.isBuffer(bytes), `${kind} review bytes are unavailable`);
  assert.equal(sha256(bytes), review.sha256, `${kind} independent review bytes changed`);
  const text = bytes.toString('utf8').split(String.fromCharCode(13)).join('');
  assert.match(text, /^Review disposition: accepted$/m,
    `${kind} review lacks the accepted disposition`);
  assert.match(text, new RegExp(`^${kind === 'aggregate' ? 'Aggregate receipt' : 'BendTT kernel'} SHA256: ${sha}$`, 'm'),
    `${kind} review does not bind the approved object SHA-256`);
  if (kind === 'aggregate') {
    assert.match(text, new RegExp(`^Aggregate source commit: ${source.commit}$`, 'm'),
      'aggregate review does not bind the source commit');
    assert.match(text, new RegExp(`^Aggregate source tree: ${source.tree}$`, 'm'),
      'aggregate review does not bind the source tree');
  } else {
    assert.match(text, new RegExp(`^BendTT source Git blob: ${expectedBendttSource.gitBlob}$`, 'm'),
      'BendTT review does not bind the Lean source Git blob');
    assert.match(text, new RegExp(`^BendTT source commit: ${expectedBendttSource.commit}$`, 'm'),
      'BendTT review does not bind the scout source commit');
    assert.match(text, new RegExp(`^BendTT source tree: ${expectedBendttSource.tree}$`, 'm'),
      'BendTT review does not bind the scout source tree');
    assert.match(text, new RegExp(`^BendTT source SHA256: ${expectedBendttSource.sha256}$`, 'm'),
      'BendTT review does not bind the LF Git-blob bytes');
    assert.match(text, new RegExp(`^BendTT safe[.]ts Git blob: ${expectedBendttSafeSource.gitBlob}$`, 'm'),
      'BendTT review does not bind the derived verdict implementation');
    assert.match(text, new RegExp(`^BendTT safe[.]ts SHA256: ${expectedBendttSafeSource.sha256}$`, 'm'),
      'BendTT review does not bind the LF verdict implementation bytes');
    assert.match(text, new RegExp(`^Lean exact version: ${escapeRegex(kernelDetails.lean.version)}$`, 'm'),
      'BendTT review does not bind the exact Lean version');
    assert.match(text, new RegExp(`^Lean executable SHA256: ${kernelDetails.lean.sha256}$`, 'm'),
      'BendTT review does not bind the Lean executable hash');
    assert.match(text, new RegExp(`^leanc exact version: ${escapeRegex(kernelDetails.leanc.version)}$`, 'm'),
      'BendTT review does not bind the exact leanc version');
    assert.match(text, new RegExp(`^leanc executable SHA256: ${kernelDetails.leanc.sha256}$`, 'm'),
      'BendTT review does not bind the leanc executable hash');
    assert.match(text, new RegExp(`^Lean build command: ${escapeRegex(JSON.stringify(kernelDetails.build.leanCommand))}$`, 'm'),
      'BendTT review does not bind the Lean build command');
    assert.match(text, new RegExp(`^leanc build command: ${escapeRegex(JSON.stringify(kernelDetails.build.leancCommand))}$`, 'm'),
      'BendTT review does not bind the native link command');
  }
}

function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function validateAggregateApproval(approval, rawBytes, reviewBytes, expected) {
  exactKeys(approval, ['schema', 'path', 'sha256', 'sourceCommit', 'sourceTree',
    'frozenSha256', 'holes', 'fetches', 'review'], 'aggregate approval');
  assert.equal(approval.schema, aggregateApprovalSchema);
  absoluteCanonical(approval.path, 'aggregate receipt path');
  assert.match(approval.sha256, shaPattern, 'aggregate receipt SHA-256 is malformed');
  assert.ok(Buffer.isBuffer(rawBytes), 'raw aggregate receipt bytes are unavailable');
  assert.equal(sha256(rawBytes), approval.sha256, 'raw aggregate receipt SHA-256 differs');
  assert.match(approval.sourceCommit, commitPattern, 'aggregate source commit is malformed');
  assert.match(approval.sourceTree, commitPattern, 'aggregate source tree is malformed');
  assert.equal(approval.frozenSha256, expected.frozenSha256,
    'aggregate approval does not bind the current frozen-v2 verification');
  assert.equal(approval.holes, 0, 'aggregate approval reports proof holes');
  assert.equal(approval.fetches, 0, 'aggregate approval reports fetches');

  let receipt;
  try { receipt = JSON.parse(rawBytes.toString('utf8')); }
  catch (error) { throw new Error('approved aggregate receipt is not JSON', { cause: error }); }
  assert.equal(receipt.schema, 'rift-v2-aggregate-2032-source/1');
  assert.equal(receipt.passed, true, '2.0.32 aggregate source gate did not pass');
  assert.equal(receipt.ok, true, '2.0.32 aggregate Worker did not report success');
  assert.equal(receipt.sourceCommit, approval.sourceCommit);
  assert.equal(receipt.sourceTree, approval.sourceTree);
  assert.equal(receipt.frozenSha256, expected.frozenSha256);
  assert.equal(receipt.holes, 0);
  assert.equal(receipt.fetches, 0);
  assert.equal(receipt.expectedLoadedFiles, expected.loadedFiles,
    'aggregate receipt did not bind the full frozen CHECK cone');
  assert.equal(receipt.loadedFiles, expected.loadedFiles,
    'aggregate Worker loaded a different number of frozen CHECK sources');
  assert.equal(receipt.runtime?.platform, 'linux');
  assert.equal(receipt.runtime?.arch, 'x64');
  assert.equal(receipt.runtime?.nodeVersion, 'v22.23.1');
  assert.match(receipt.scope ?? '', /^aggregate frozen CHECK source\/type\/promise screen only;/,
    'aggregate receipt scope is not the versioned full CHECK gate');
  assert.equal(receipt.compilerEol?.eol, 'lf', 'aggregate receipt is not bound to LF-derived compiler sources');
  assert.deepEqual(receipt.compilerEol, expected.compilerEol,
    'aggregate receipt compiler postimage hashes differ');
  assert.deepEqual(receipt.compilerBase, expected.compilerBase,
    'aggregate receipt Base bytes differ');
  assert.equal(receipt.binderSha256, expected.compilerEolBinderSha256,
    'aggregate receipt compiler EOL binder differs');
  assert.equal(receipt.scriptSha256, expected.aggregateScriptSha256,
    'aggregate receipt runner source differs from the reviewed version');
  assert.equal(receipt.safetySha256, expected.aggregateSafetySha256,
    'aggregate receipt safety helper differs from the reviewed version');
  assert.deepEqual(receipt.patches, expected.patches,
    'aggregate receipt patch stack differs from current reviewed inputs');
  assert.deepEqual(receipt.runtime, expected.aggregateRuntime,
    'aggregate receipt runtime identity differs from the current Linux verifier');
  checkReview(approval.review, 'aggregate', approval.sha256,
    { commit: approval.sourceCommit, tree: approval.sourceTree }, reviewBytes);
  return receipt;
}

export function validateKernelApproval(approval, bytes, reviewBytes, sourceBinding) {
  exactKeys(approval, ['schema', 'path', 'sha256', 'source', 'lean', 'leanc',
    'build', 'review'], 'BendTT kernel approval');
  assert.equal(approval.schema, kernelApprovalSchema);
  absoluteCanonical(approval.path, 'BendTT executable path');
  assert.match(approval.sha256, shaPattern, 'BendTT executable SHA-256 is malformed');
  assert.ok(Buffer.isBuffer(bytes), 'BendTT executable bytes are unavailable');
  assert.equal(sha256(bytes), approval.sha256, 'BendTT executable SHA-256 differs');
  assert.deepEqual(approval.source, expectedBendttSource,
    'BendTT kernel provenance is not linked to the exact scout bendtt.lean Git blob');
  assert.deepEqual(approval.source, sourceBinding,
    'BendTT kernel provenance differs from the current pristine scout source');

  for (const [name, tool] of [['Lean', approval.lean], ['leanc', approval.leanc]]) {
    exactKeys(tool, ['path', 'version', 'sha256'], `${name} provenance`);
    absoluteCanonical(tool.path, `${name} executable path`);
    assert.equal(typeof tool.version, 'string', `${name} exact version output is required`);
    assert.ok(tool.version.length > 0 && !/[\r\n]/.test(tool.version),
      `${name} exact version output must be one line`);
    assert.match(tool.sha256, shaPattern, `${name} executable SHA-256 is malformed`);
  }
  assert.match(approval.lean.version, /^Lean \(version 4\.34\.0(?:, [^)]+)?\)$/,
    'BendTT must be built by Lean 4.34.0');
  exactKeys(approval.build, ['leanCommand', 'leancCommand', 'leanStackSizeKb'],
    'BendTT build provenance');
  assert.deepEqual(approval.build.leanCommand,
    [approval.lean.path, '-c', 'bendtt.c', 'bendtt.lean'],
    'BendTT Lean build command differs');
  assert.deepEqual(approval.build.leancCommand,
    [approval.leanc.path, '-O3', '-DNDEBUG', 'bendtt.c', '-o', 'bendtt'],
    'BendTT native link command differs');
  assert.equal(approval.build.leanStackSizeKb, '4194304');
  checkReview(approval.review, 'kernel', approval.sha256,
    { commit: expectedBendttSource.commit, tree: expectedBendttSource.tree }, reviewBytes,
    { lean: approval.lean, leanc: approval.leanc, build: approval.build });
  return { sha256: approval.sha256, source: approval.source,
    lean: approval.lean, leanc: approval.leanc, build: approval.build };
}

export function assertOwnedGroupSuccess(result, expectedStdout, label) {
  assert.ok(result && typeof result === 'object', `${label}: missing owned-process result`);
  assert.equal(result.status, 0, `${label}: exit status is not zero`);
  assert.equal(result.signal, null, `${label}: process ended by signal`);
  assert.ok(Buffer.isBuffer(result.stdout), `${label}: stdout is not captured bytes`);
  assert.ok(Buffer.isBuffer(result.stderr), `${label}: stderr is not captured bytes`);
  assert.equal(result.stdout.toString('utf8'), expectedStdout,
    `${label}: stdout differs from the exact success line`);
  assert.equal(result.stderr.length, 0, `${label}: stderr is not empty`);
  assert.equal(result.groupQuiescent, true, `${label}: owned process group did not quiesce`);
  assert.equal(result.groupStateKnown, true, `${label}: process-group liveness is unknown`);
  assert.equal(result.timedOut, false, `${label}: process timed out`);
  assert.equal(result.outputLimitExceeded, false, `${label}: output limit exceeded`);
  assert.equal(result.terminationReason, null, `${label}: unexpected termination reason`);
  assert.ok(Number.isSafeInteger(result.pid) && result.pid > 0,
    `${label}: process identity is unavailable`);
  assert.ok(Number.isSafeInteger(result.durationMs) && result.durationMs >= 0,
    `${label}: duration is invalid`);
  assert.equal(result.stdoutBytesSeen, result.stdout.length,
    `${label}: stdout was truncated`);
  assert.equal(result.stderrBytesSeen, 0, `${label}: stderr byte count is inconsistent`);
  assert.deepEqual(result.signalsSent, [], `${label}: supervisor sent a termination signal`);
  assert.equal(result.retryCount, 0, `${label}: process invocation was retried`);
  assert.ok(result.processIdentity && result.processIdentity.pid === result.pid
    && result.processIdentity.pgid === result.pid
    && result.processIdentity.session === result.pid
    && /^\d+$/.test(result.processIdentity.startTimeTicks ?? ''),
  `${label}: exact owned process identity was not recorded`);
  return result;
}

export function isBelow(root, target, pathApi = path) {
  const relative = pathApi.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${pathApi.sep}`)
    && !pathApi.isAbsolute(relative);
}
