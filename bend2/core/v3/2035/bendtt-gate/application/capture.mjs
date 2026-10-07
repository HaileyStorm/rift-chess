// Application lineage capture. Every frozen/executing proof dependency remains exact.
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../../../../', import.meta.url));
const creationCommit = 'da0915da556da2a5288280e779099af30877301d';
const consumerBaseline = '1fe43efdcb33580051a29e60b36c909b05b5ff94';
const authenticatedRegistry = { path: 'bend2/tools/selected-modules.mjs',
  sha256: '3638db30ce2c4d9e3ba13272bed451c093bf36de6edae227c16463d832ee766d', changed: false };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBytes = (revision, file) => {
  assert.match(revision, /^[0-9a-f]{40}$/);
  assert.ok(typeof file === 'string' && !file.includes('..') && !file.includes('\\') && !path.isAbsolute(file));
  return execFileSync('git', ['-C', root, 'show', `${revision}:${file}`], {
    windowsHide: true, timeout: 30_000, maxBuffer: 8 * 1024 ** 2, stdio: ['ignore', 'pipe', 'pipe'],
  });
};
function workingBytes(file) {
  assert.ok(typeof file === 'string' && !file.includes('..') && !file.includes('\\') && !path.isAbsolute(file));
  const absolute = path.resolve(root, file);
  assert.equal(fs.realpathSync(absolute), absolute, 'application input is redirected');
  const before = fs.lstatSync(absolute, { bigint: true });
  assert.ok(before.isFile() && !before.isSymbolicLink());
  const bytes = fs.readFileSync(absolute), after = fs.lstatSync(absolute, { bigint: true });
  for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(before[key], after[key]);
  return bytes;
}
const gate = 'bend2/core/v3/2035/bendtt-gate/';
const consumers = ['approvals.mjs', 'binding.mjs', 'contracts.mjs', 'contracts-prepared.mjs',
  'source-prepared.mjs', 'output.mjs', 'run.mjs', 'worker.mjs', 'probe.mjs', 'test.mjs',
  'README.md', 'lineage-prepared-20261007.json'];
const manifestPath = gate + 'application/reviewed-menu-base-20261007.json';
const approvedApplicationSha256 = '1b7d6d66d5871a214aac1f09d4336976957ae25023167d8d4c94254774ca586a';
const receiptSha256 = 'a5ccbfdb0a009501525785ffb94640d573593517b02942ad470c6c977c04f698';
const baselineTree = '8580d9e1e4c28d53e9f324900ab3c0cc01ee17cf';
const git = (...args) => execFileSync('git', ['-C', root, ...args], {
  encoding: 'utf8', windowsHide: true, timeout: 30_000, maxBuffer: 8 * 1024 ** 2,
  stdio: ['ignore', 'pipe', 'pipe'],
}).trimEnd().replaceAll('\r\n', '\n');
function evidence(entry) {
  assert.ok(entry.path.startsWith('.artifacts/bend2/'));
  assert.match(entry.sha256, /^[0-9a-f]{64}$/);
  git('check-ignore', '--quiet', entry.path);
  const bytes = workingBytes(entry.path);
  assert.equal(hash(bytes), entry.sha256, `application evidence differs: ${entry.path}`);
  return bytes;
}
function preImportInputs() {
  assert.equal(git('rev-parse', `${consumerBaseline}^{tree}`), baselineTree);
  git('merge-base', '--is-ancestor', creationCommit, consumerBaseline);
  const consumerFiles = consumers.map(name => {
    const file = gate + name, before = gitBytes(consumerBaseline, file);
    assert.deepEqual(workingBytes(file), before, `original /2 consumer changed: ${file}`);
    return { path: file, sha256: hash(before) };
  });
  // Read the authenticated literal as data; do not execute approvals to get it.
  const text = workingBytes(gate + 'approvals.mjs').toString('utf8');
  const matches = [...text.matchAll(/^export const approvedSource = (\{[\s\S]*?^\});$/gm)];
  assert.equal(matches.length, 1);
  const approval = JSON.parse(matches[0][1]);
  assert.equal(approval.receipt.sha256, receiptSha256);
  const raw = evidence(approval.receipt), receipt = JSON.parse(raw);
  assert.equal(receipt.before.sourceFiles.length, 315);
  const seen = new Set();
  for (const item of receipt.before.sourceFiles) {
    assert.ok(!seen.has(item.path), 'duplicate creation input'); seen.add(item.path);
    assert.equal(hash(workingBytes(item.path)), item.sha256, `unreviewed dependency before import: ${item.path}`);
    if (item.path === authenticatedRegistry.path) assert.equal(item.sha256, authenticatedRegistry.sha256);
  }
  assert.ok(seen.has(authenticatedRegistry.path));
  return { approval, receipt, consumerFiles };
}
function reviewedApplication() {
  const bytes = workingBytes(manifestPath);
  assert.equal(hash(bytes), approvedApplicationSha256, 'application amendment is not approved');
  const manifest = JSON.parse(bytes);
  assert.equal(manifest.schema, 'rift-bend-2035-application-amendment/1');
  assert.equal(manifest.disposition, 'accepted');
  assert.equal(manifest.baseline, consumerBaseline); assert.equal(manifest.baselineTree, baselineTree);
  assert.equal(manifest.creationReceiptSha256, receiptSha256);
  assert.deepEqual(manifest.registry, authenticatedRegistry);
  evidence(manifest.review);
  assert.equal(manifest.review.disposition, 'accepted');
  const changed = new Map();
  for (const item of manifest.changes) {
    assert.ok(!changed.has(item.path), 'duplicate application postimage');
    const working = workingBytes(item.path);
    assert.deepEqual(working, gitBytes(git('rev-parse', 'HEAD'), item.path), 'uncommitted application postimage');
    let normalized = working;
    if (item.path === gate + 'application/capture.mjs') {
      const declaration = `const approvedApplicationSha256 = '${approvedApplicationSha256}';`;
      const text = working.toString('utf8'); assert.deepEqual(Buffer.from(text), working);
      assert.equal(text.split(declaration).length, 2, 'application digest declaration must be unique');
      normalized = Buffer.from(text.replace(declaration, "const approvedApplicationSha256 = '" + '0'.repeat(64) + "';"));
      assert.equal(item.normalization, 'one-application-digest-literal');
    }
    assert.equal(hash(normalized), item.afterSha256, `application postimage differs: ${item.path}`);
    if (item.status === 'M') assert.equal(hash(gitBytes(consumerBaseline, item.path)), item.beforeSha256);
    else { assert.equal(item.status, 'A'); assert.equal(git('ls-tree', consumerBaseline, '--', item.path), ''); }
    changed.set(item.path, item.status);
  }
  assert.deepEqual(bytes, gitBytes(git('rev-parse', 'HEAD'), manifestPath)); changed.set(manifestPath, 'A');
  git('merge-base', '--is-ancestor', consumerBaseline, 'HEAD');
  const actual = git('diff', '--no-renames', '--name-status', consumerBaseline, 'HEAD')
    .split('\n').filter(Boolean).map(line => { const [status, file, extra] = line.split('\t'); assert.equal(extra, undefined); return [file, status]; });
  assert.deepEqual(actual.sort(), [...changed].sort(), 'unlisted application revision change');
  assert.equal(git('status', '--porcelain=v1', '--untracked-files=all'), '', 'application capture requires a clean checkout');
  for (const item of manifest.evidence) evidence(item);
  return { path: manifestPath, sha256: hash(bytes), manifest };
}
export async function captureApplicationCompatibility({ draft = false } = {}) {
  assert.equal(typeof draft, 'boolean');
  const preliminary = preImportInputs();
  // All executable project dependencies are authenticated before these imports.
  const { validatePreparedSourceApproval } = await import('../contracts-prepared.mjs');
  const { capturePreparedInputs } = await import('../source-prepared.mjs');
  const { approvedSource, approvedKernel, approvedLinuxRuntime } = await import('../approvals.mjs');
  assert.deepEqual(approvedSource, preliminary.approval);
  assert.equal(approvedKernel, null); assert.equal(approvedLinuxRuntime, null);
  const records = { receipt: evidence(approvedSource.receipt), review: evidence(approvedSource.review) };
  for (const name of ['terminal', 'settlement', 'supervisor', 'capture', 'start']) records[name] = evidence(approvedSource.native[name]);
  const creation = validatePreparedSourceApproval(approvedSource, records);
  const current = capturePreparedInputs(preliminary.receipt);
  const application = draft ? null : reviewedApplication();
  assert.deepEqual(preImportInputs(), preliminary, 'application input changed during capture');
  return { schema: 'rift-bend-2035-application-compatibility/1', disposition: draft ? 'draft-unapproved' : 'reviewed',
    creation: { sourceCommit: preliminary.receipt.sourceCommit, sourceTree: preliminary.receipt.sourceTree,
      receiptSha256, bindingSha256: preliminary.receipt.bindingSha256, positiveKey: preliminary.receipt.positiveKey,
      actualFreshWorkers: preliminary.receipt.actualFreshWorkers, sourceReview: approvedSource.review, native: approvedSource.native, validated: true },
    registry: authenticatedRegistry, current, originalConsumers: preliminary.consumerFiles, application,
    currentCommit: git('rev-parse', 'HEAD'), currentDirty: Boolean(git('status', '--porcelain=v1', '--untracked-files=all')),
    newProofWorkers: 0, approvedKernel: null, approvedLinuxRuntime: null,
    scope: 'Exact candidate-only menu export and reviewed application postimages; shared registry/frozen dependencies unchanged; immutable /2 creation execution retained separately; no Safe/kernel/runtime/native/device/adoption authority' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--draft'));
  console.log(JSON.stringify(await captureApplicationCompatibility({ draft: process.argv[2] === '--draft' }), null, 2));
}
