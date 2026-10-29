// Read-only active selection; owning review and original launcher remain required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const OFFICIAL = '79df8d9c40722ee9507a1e253f283b51025f9d6c';
const CURRENT = '.artifacts/bend2/toolchain-patches/workers-2035-cli-r2/bend2';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const keys = (value, names) => assert.deepEqual(Object.keys(value).sort(), [...names].sort());
const requiredAssurance = Object.freeze([
  'formal-v1-source-promise-safe', 'formal-pixel-source-promise-safe',
  'formal-library-source-promise-safe', 'formal-v2-prepared-kernel',
  'formal-semantic-mutations', 'browser-play-shift-worker-view-picking-offline',
  'native-cpu-build', 'native-gui-pcm-restart',
  'native-gpu-full-window-250ms', 'declared-motion-target',
]);
export const gpuContract = Object.freeze({
  width: 1024, height: 640, pressMilliseconds: 60,
  sampleAfterReleaseMilliseconds: 250,
  predicate: 'selection_diff > 0 && deselect_restore_diff < selection_diff',
  runtimeParallelism: 'unchanged-balanced',
});

function relative(name) {
  assert.equal(typeof name, 'string');
  assert.ok(name && !name.includes('\\') && !name.includes(':') && !path.isAbsolute(name));
  assert.ok(name.split('/').every(part => part && part !== '.' && part !== '..'));
  return name;
}
function context(repositoryRoot, packetRoot) {
  const roots = { repository: path.resolve(repositoryRoot), packet: path.resolve(packetRoot) };
  for (const root of Object.values(roots)) assert.equal(fs.realpathSync(root), root);
  const fences = new Map();
  function read(base, name, maximum = 64 * 1024 ** 2) {
    assert.ok(Object.hasOwn(roots, base)); relative(name);
    const root = roots[base], target = path.resolve(root, name);
    assert.ok(target.startsWith(root + path.sep));
    assert.equal(fs.realpathSync(target), target, 'redirected input');
    const before = fs.lstatSync(target, { bigint: true });
    assert.ok(before.isFile() && !before.isSymbolicLink());
    assert.ok(before.size > 0n && before.size <= BigInt(maximum), 'bounded input read exceeded');
    const fd = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    let bytes;
    try {
      bytes = fs.readFileSync(fd);
      const held = fs.fstatSync(fd, { bigint: true }), after = fs.lstatSync(target, { bigint: true });
      for (const field of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) {
        assert.equal(held[field], before[field]); assert.equal(after[field], before[field]);
      }
    } finally { fs.closeSync(fd); }
    assert.equal(fs.realpathSync(target), target);
    const digest = sha(bytes), previous = fences.get(target);
    if (previous) assert.equal(digest, previous.digest, 'consumed input changed');
    fences.set(target, { base, name, digest, maximum });
    return bytes;
  }
  function ref(value) {
    assert.ok(value && typeof value === 'object'); keys(value, ['base', 'path', 'bytes', 'sha256']);
    assert.match(value.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isSafeInteger(value.bytes) && value.bytes > 0);
    const bytes = read(value.base, value.path);
    assert.equal(bytes.length, value.bytes); assert.equal(sha(bytes), value.sha256);
    return bytes;
  }
  const json = value => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(ref(value)));
  function finish() {
    for (const fence of [...fences.values()]) assert.equal(sha(read(fence.base, fence.name, fence.maximum)), fence.digest);
  }
  return { roots, read, ref, json, finish };
}

function inventory(c, reference, expectedDirectory) {
  const value = c.json(reference);
  assert.equal(value.schema, 'rift-compiler-byte-inventory/1');
  assert.equal(value.sourceDirectory, expectedDirectory);
  const names = value.files.map(row => relative(row.path));
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(names, [...names].sort());
  const observed = [];
  function walk(directory, prefix = '') {
    assert.equal(fs.realpathSync(directory), directory);
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      assert.ok(!entry.isSymbolicLink());
      if (entry.isDirectory()) walk(path.join(directory, entry.name), prefix + entry.name + '/');
      else { assert.ok(entry.isFile()); observed.push(prefix + entry.name); }
    }
  }
  walk(path.resolve(c.roots.repository, expectedDirectory));
  assert.deepEqual(observed.sort(), names, 'compiler inventory membership differs');
  for (const row of value.files) c.ref({ ...row, base: 'repository', path: expectedDirectory + '/' + row.path });
  return value;
}

function identities(c, descriptor) {
  assert.equal(descriptor.schema, 'rift-active-toolchain/2');
  assert.ok(['unarmed', 'proposed-active'].includes(descriptor.state));
  const active = descriptor.activeToolchain;
  assert.equal(active.version, '2.0.35'); assert.equal(active.officialCommit, OFFICIAL);
  assert.equal(active.sourceDirectory, CURRENT);
  const effective = inventory(c, active.inventory, CURRENT);
  // These are the actual current profile's membership/bytes, not an acceptance quota.
  assert.equal(effective.files.length, 99);
  assert.equal(effective.files.reduce((sum, row) => sum + row.bytes, 0), 1208629);
  const lineage = c.json(active.lineage);
  assert.equal(lineage.schema, 'rift-current99-lineage-identities/1');
  assert.equal(lineage.officialCommit, OFFICIAL);
  assert.deepEqual(lineage.effectiveInventory, active.inventory);
  inventory(c, lineage.officialInventory, '.artifacts/toolchains/bend-2.0.35-scout/bend2');
  c.ref(lineage.officialCommitSource);
  for (const reference of lineage.producerSources) c.ref(reference);
  for (const reference of lineage.historicalTransformationInputs) c.ref(reference);
  const legacy = c.json(descriptor.legacyCreationInputs);
  assert.equal(legacy.schema, 'rift-legacy-creation-identities/1');
  const protectedPaths = new Set();
  for (const reference of legacy.files) {
    assert.equal(reference.base, 'repository'); assert.ok(!protectedPaths.has(reference.path));
    protectedPaths.add(reference.path); c.ref(reference);
  }
  for (const name of ['semantic-v1', 'pixels-v1', 'proof-v1', 'semantic-v2'])
    assert.ok(protectedPaths.has(`bend2/laws/${name}.json`));
  for (const name of ['bend2/TOOLCHAIN.json', 'bend2/laws/semantic-prepared-v3.json',
    'bend2/tools/amend.mjs', 'bend2/tools/amendments.mjs']) assert.ok(protectedPaths.has(name));
  const amendments = [...protectedPaths].filter(name => /^bend2\/laws\/amendments\/\d{3}-.+\.json$/.test(name)).sort();
  assert.equal(amendments.length, 5, 'this successor preserves the five original amendments');
  let parent = null;
  for (const [i, name] of amendments.entries()) {
    const raw = c.read('repository', name), amendment = JSON.parse(raw);
    assert.equal(amendment.schema, 'rift-bend-amendment/1');
    assert.equal(amendment.sequence, i + 1); assert.equal(amendment.parentSha256, parent);
    assert.equal(amendment.semanticMeaning, 'unchanged'); parent = sha(raw);
  }
  return protectedPaths;
}

function permittedSubstitutions(c, record, protectedPaths) {
  for (const substitution of record.nonsemanticSubstitutions) {
    relative(substitution.target);
    assert.ok(!protectedPaths.has(substitution.target), 'historical creation input cannot be substituted');
    assert.ok(/^bend2\/tools\/[A-Za-z0-9_.-]+\.(mjs|ts)$/.test(substitution.target)
      || /^bend2\/docs\/[A-Za-z0-9_.-]+\.md$/.test(substitution.target)
      && substitution.target !== 'bend2/docs/LAW_CHANGE_POLICY.md');
    assert.ok(substitution.reason?.trim());
    assert.notEqual(substitution.preimage.sha256, substitution.current.sha256);
    c.ref(substitution.preimage); assert.equal(substitution.current.base, 'repository');
    assert.equal(substitution.current.path, substitution.target); c.ref(substitution.current);
  }
}

function assuranceReferences(record) {
  keys(record.assurance, requiredAssurance);
  const references = [];
  for (const obligation of requiredAssurance) {
    const entry = record.assurance[obligation];
    assert.ok(entry && entry.receipts?.length > 0 && entry.applicability?.explanation?.trim(),
      `applicable original assurance unresolved: ${obligation}`);
    assert.ok(entry.applicability.sourceBindings?.length > 0);
    references.push(...entry.receipts, ...entry.applicability.sourceBindings);
  }
  assert.deepEqual(record.assurance['native-gpu-full-window-250ms'].contract, gpuContract);
  return references;
}

// Deliberate adoption-review inspection only. Never called by resolveActive().
// Existing original loadAmendments()/verifyFreeze() retain their semantics and
// may be used by the owning adoption review, never imported/executed here.
export function inspectAdoptionInputs({ repositoryRoot, packetRoot, descriptorRef, adoptionRef = null }) {
  const c = context(repositoryRoot, packetRoot), descriptor = c.json(descriptorRef);
  const protectedPaths = identities(c, descriptor);
  if (adoptionRef) {
    const record = c.json(adoptionRef);
    assert.equal(record.schema, 'rift-toolchain-adoption/2');
    assert.deepEqual(record.descriptor, descriptorRef);
    assert.deepEqual(record.historicalAuthorities, descriptor.legacyCreationInputs);
    permittedSubstitutions(c, record, protectedPaths);
    for (const reference of assuranceReferences(record)) c.ref(reference);
  }
  c.finish();
  return { kind: 'adoption-review-identity-only', descriptorSha256: descriptorRef.sha256,
    assuranceBoundary: 'Byte identity/chain linkage only. This is not semantic amendment verification or approval.' };
}

export function reviewSubjectSha256(record) {
  const { activationReview: ignored, ...subject } = record;
  return sha(Buffer.from(JSON.stringify(subject)));
}

// Only the explicitly selected executable is read. No PATH/environment lookup,
// version subprocess, alternate runtime search or cross-host path guessing.
function bindHostRuntime(binding, originalLaunch) {
  assert.equal(binding.platform, process.platform);
  const engine = process.versions.bun ? 'bun' : 'node';
  const version = engine === 'bun' ? process.versions.bun : process.version;
  assert.equal(binding.engine, engine); assert.equal(binding.version, version);
  const executable = binding.executable;
  assert.ok(path.isAbsolute(executable.path));
  const target = path.resolve(executable.path);
  assert.equal(target, path.resolve(process.execPath), 'selected runtime is not this original process executable');
  assert.equal(fs.realpathSync(target), target, 'redirected runtime executable');
  assert.match(executable.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isSafeInteger(executable.bytes) && executable.bytes > 0);
  assert.equal(originalLaunch.schema, 'rift-owned-runtime-launch/1');
  assert.equal(originalLaunch.hostId, binding.hostId);
  assert.deepEqual(originalLaunch.runtime, { engine, platform: binding.platform, version,
    executablePath: executable.path, executableSha256: executable.sha256 });
  assert.ok(Array.isArray(originalLaunch.argv) && originalLaunch.argv.length > 0);
  // argv[0] spelling may use '/' on Windows while execPath uses '\\'.
  // Preserve its original bytes in the launch record and bind the same resolved
  // executable; remaining absolute-entrypoint arguments must match this process.
  assert.equal(path.resolve(originalLaunch.argv[0]), target);
  assert.deepEqual(originalLaunch.argv.slice(1), [...process.execArgv, ...process.argv.slice(1)],
    'existing original launch arguments differ from this process');
  assert.equal(fs.realpathSync(originalLaunch.cwd), fs.realpathSync(process.cwd()));
  const before = fs.lstatSync(target, { bigint: true });
  assert.ok(before.isFile() && !before.isSymbolicLink()); assert.equal(before.size, BigInt(executable.bytes));
  const fd = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const digest = createHash('sha256'), buffer = Buffer.alloc(1024 * 1024);
    let offset = 0, size;
    while ((size = fs.readSync(fd, buffer, 0, buffer.length, offset)) > 0) {
      digest.update(buffer.subarray(0, size)); offset += size;
    }
    assert.equal(offset, executable.bytes); assert.equal(digest.digest('hex'), executable.sha256);
    const held = fs.fstatSync(fd, { bigint: true }), after = fs.lstatSync(target, { bigint: true });
    for (const field of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) {
      assert.equal(held[field], before[field]); assert.equal(after[field], before[field]);
    }
  } finally { fs.closeSync(fd); }
  return () => {
    assert.equal(fs.realpathSync(target), target);
    const after = fs.lstatSync(target, { bigint: true });
    for (const field of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(after[field], before[field]);
  };
}

// Routine selection: three trusted immutable authority documents, selected host
// runtime, one adapter and that run's current inputs. No historical traversal.
export function resolveActive({ repositoryRoot, packetRoot, descriptorRef, adoptionRef,
  trustedReviewSha256, hostId, purpose, originalLaunchRef }) {
  assert.ok(['browserBuild', 'selectedEmission', 'nativeBuild'].includes(purpose));
  const c = context(repositoryRoot, packetRoot), descriptor = c.json(descriptorRef), record = c.json(adoptionRef);
  assert.equal(descriptor.schema, 'rift-active-toolchain/2');
  assert.equal(record.schema, 'rift-toolchain-adoption/2');
  assert.equal(descriptor.state, 'proposed-active', 'descriptor remains UNARMED');
  assert.equal(record.state, 'submitted-for-owning-review', 'adoption record remains UNARMED');
  assert.deepEqual(record.descriptor, descriptorRef);
  assert.deepEqual(record.historicalAuthorities, descriptor.legacyCreationInputs);
  assert.equal(descriptor.activeToolchain.version, '2.0.35');
  assert.equal(descriptor.activeToolchain.officialCommit, OFFICIAL);
  assert.equal(descriptor.activeToolchain.sourceDirectory, CURRENT);
  assert.ok(record.activationReview, 'owning activation review unresolved');
  assert.match(trustedReviewSha256 ?? '', /^[a-f0-9]{64}$/, 'caller has no trusted review binding');
  assert.equal(record.activationReview.sha256, trustedReviewSha256);
  const review = c.json(record.activationReview);
  assert.equal(review.schema, 'rift-active-toolchain-review/2');
  assert.equal(review.disposition, 'accepted-for-current35-v2-production');
  assert.equal(review.reviewer, '01a1124e-8f2a-7aa0-891d-6ef073d7aee8');
  assert.equal(review.descriptorSha256, descriptorRef.sha256);
  assert.equal(review.recordSubjectSha256, reviewSubjectSha256(record));
  // Assurance applicability is covered by the trusted reviewed record subject.
  // Inspecting receipt bytes belongs to adoption review, not every build.
  assuranceReferences(record);
  assert.ok(descriptor.hostRuntimeBindings && descriptor.productionAdapters && record.currentApplication,
    'host runtimes, production adapters or current application binding unresolved');
  const bindings = descriptor.hostRuntimeBindings.filter(row => row.hostId === hostId && row.purpose === purpose);
  assert.equal(bindings.length, 1, 'explicit host/runtime binding unresolved or ambiguous');
  const checkRuntimeUnchanged = bindHostRuntime(bindings[0], c.json(originalLaunchRef));
  const adapter = descriptor.productionAdapters[purpose];
  c.ref(adapter);
  assert.match(record.currentApplication.sourceRevision, /^[a-f0-9]{40}$/);
  const inputs = record.currentApplication.inputsByPurpose[purpose];
  assert.ok(Array.isArray(inputs) && inputs.length > 0, 'current run inputs unresolved');
  for (const reference of inputs) c.ref(reference);
  if (purpose !== 'browserBuild') {
    // Compiler-emitting runs require the effective tree; the compiler-free
    // repacker instead guards the retained emission/package inputs it consumes.
    const effective = inventory(c, descriptor.activeToolchain.inventory, CURRENT);
    assert.equal(effective.files.length, 99);
    assert.equal(effective.files.reduce((sum, row) => sum + row.bytes, 0), 1208629);
  }
  c.finish(); checkRuntimeUnchanged();
  return Object.freeze({ kind: 'owning-reviewed-active-selection', version: '2.0.35', purpose, hostId,
    sourceDirectory: path.resolve(c.roots.repository, CURRENT), runtime: bindings[0],
    repositoryRoot: c.roots.repository, packetRoot: c.roots.packet,
    adapterRef: Object.freeze({ ...adapter }),
    inputRefs: Object.freeze(inputs.map(reference => Object.freeze({ ...reference }))),
    descriptorSha256: descriptorRef.sha256, adoptionSha256: adoptionRef.sha256,
    reviewSha256: trustedReviewSha256,
    assuranceBoundary: 'Trusted owning review establishes accepted applicability; identity checks prove no semantics or runtime behavior.' });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  throw Error('use owning reviewed launcher');
}

