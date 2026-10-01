import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { requiredProofs, verifyV2 } from '../../../../tools/freeze-v2.mjs';
import { bindCompilerBaseEol, bindCompilerEol } from
  '../../../../toolchain-patches/2032/preview/compiler-eol.mjs';
import { assertProofNodeRuntime, expectedCheckClosure } from '../aggregate-safety.mjs';
import { expectedBendttSafeSource, expectedBendttSource, isBelow, validateAggregateApproval,
  validateKernelApproval } from './contracts.mjs';

const release = '573002f01ec6c52416d44489543f69a9625facf8';
const releaseTree = '0ecfc84c5f19bbae2c0c10735129749adf7d49e8';
const canonicalPin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const pinSha256 = '17419db1617fece38c72dba9136463a313db43bf2c61f657334d9fdce0ae51a6';
const bunSha256 = 'a83d263767d839e4d2649ca8e35d07159c7afc99afdc96d731ced29e056dda0c';
const authoritySha256 = '3737c455d542f2dc7ff1799bfc579969c42739814411a8494189eb1b56a74013';
const compilerEolBinderSha256 = 'cb1cbb64e07e32c30cb9199424ec84e87cfcc516427c035a51fa6f7a84eacc27';
const lifecycleSha256 = '91d8b5c325a48602d0d6860624ab0abf9d5428d374a12d85988cb866a732fbc8';
const supervisorSha256 = 'e61c72e8c5fbe004109fe04cc976cbe63d3a7efcacb7bbb1671bada99bb6c793';
const patchSpecs = Object.freeze([
  ['bend2/toolchain-patches/001-arity/rebase-2032/0001-arity-diagnostics.patch',
    '98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db'],
  ['bend2/toolchain-patches/002-layout/rebase-2032/0002-after-001-2.0.32.patch',
    '2ed566176148cc1e064d2dae4c806c7912d557e38570ecfa5f47ddd0d78d395d'],
  ['bend2/toolchain-patches/005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch',
    '99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4'],
  ['bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/0004-parser-plan-after-005-2.0.32.patch',
    'bfdd64270c7714376c64a0306a58892d8a872d96f9d4bace0be091bf894fdb13'],
]);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const rel = (file) => file.replaceAll('\\', '/');
const abs = (root, file) => path.join(root, ...file.split('/'));

function gitText(directory, ...args) {
  return execFileSync('git', ['-C', directory, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).replace(/\r\n/g, '\n').trimEnd();
}

function gitBytes(directory, ...args) {
  return execFileSync('git', ['-C', directory, ...args], {
    encoding: 'buffer', maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function fileHash(file) { return sha256(fs.readFileSync(file)); }

function requireClean(directory, label) {
  assert.equal(gitText(directory, 'status', '--porcelain=v1', '--untracked-files=all'), '',
    `${label} must be clean`);
}

function readLocalApprovalFile(root, entry, label) {
  assert.ok(entry && typeof entry.path === 'string', `${label} path is not approved`);
  assert.ok(path.posix.isAbsolute(entry.path), `${label} path must be absolute`);
  assert.equal(path.posix.normalize(entry.path), entry.path, `${label} path is not canonical`);
  const rootPosix = rel(root).replace(/\/$/, '');
  assert.ok(isBelow(rootPosix, entry.path), `${label} must be inside this Rift checkout`);
  const st = fs.lstatSync(entry.path);
  assert.ok(st.isFile() && !st.isSymbolicLink(), `${label} must be a regular non-symlink file`);
  assert.equal(fs.realpathSync(entry.path), entry.path, `${label} has a non-canonical real path`);
  const relative = path.relative(root, entry.path);
  execFileSync('git', ['check-ignore', '--quiet', rel(relative)], { cwd: root,
    stdio: 'ignore' });
  return fs.readFileSync(entry.path);
}

function readExecutable(file, expectedSha, label) {
  assert.ok(path.posix.isAbsolute(file), `${label} path must be absolute`);
  assert.equal(path.posix.normalize(file), file, `${label} path must be canonical`);
  const st = fs.lstatSync(file);
  assert.ok(st.isFile() && !st.isSymbolicLink(), `${label} must be a regular non-symlink file`);
  assert.ok((st.mode & 0o111) !== 0, `${label} must have an executable mode bit`);
  assert.equal(fs.realpathSync(file), file, `${label} real path differs`);
  const bytes = fs.readFileSync(file);
  assert.equal(sha256(bytes), expectedSha, `${label} SHA-256 differs from the approved executable`);
  return { path: file, sha256: expectedSha, size: bytes.length,
    mode: st.mode & 0o777, dev: String(st.dev), ino: String(st.ino) };
}

function checkReceiptLineage(root, receiptCommit, receiptTree, criticalPaths) {
  assert.match(receiptCommit, /^[0-9a-f]{40}$/);
  assert.match(receiptTree, /^[0-9a-f]{40}$/);
  assert.equal(gitText(root, 'rev-parse', `${receiptCommit}^{tree}`), receiptTree,
    'aggregate receipt source tree is not the tree of its source commit');
  const ancestor = spawnSync('git', ['-C', root, 'merge-base', '--is-ancestor',
    receiptCommit, 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'] });
  assert.equal(ancestor.error, undefined, 'could not establish aggregate source ancestry');
  assert.equal(ancestor.status, 0, 'aggregate receipt source is not an ancestor of the clean checkout');
  const currentCommit = gitText(root, 'rev-parse', 'HEAD');

  // Later source may add runner/tooling/docs/evidence files, modify only the
  // reviewed approval module among existing gate files, and update only the
  // three named sprint/matrix documentation paths. Every semantic, frozen,
  // compiler, namespace and aggregate-safety input is compared byte-for-byte
  // below, including the complete frozen manifest input set.
  const changed = gitText(root, 'diff', '--name-status', receiptCommit, currentCommit)
    .split('\n').filter(Boolean).map((line) => {
      const [status, ...parts] = line.split('\t');
      return { status, file: parts.at(-1) };
    });
  for (const item of changed) {
    const file = rel(item.file ?? '');
    const gateFile = file.startsWith('bend2/core/v3/2032/bendtt-gate/');
    const additiveArea = file.startsWith('bend2/core/v3/2032/')
      || file.startsWith('bend2/toolchain-patches/')
      || file.startsWith('bend2/docs/');
    const namedDocUpdate = ['bend2/SPRINT.md', 'bend2/core/v3/2032/README.md',
      'bend2/toolchain-patches/2032/README.md'].includes(file);
    const allowed = (item.status === 'A' && additiveArea)
      || (item.status === 'M' && gateFile
        && ['bend2/core/v3/2032/bendtt-gate/approvals.mjs',
          'bend2/core/v3/2032/bendtt-gate/README.md'].includes(file))
      || (item.status === 'M' && namedDocUpdate);
    assert.ok(allowed, `post-aggregate source drift is not additive runner/docs/approval work: ${item.status} ${file}`);
  }

  for (const relative of criticalPaths) {
    const prior = gitBytes(root, 'show', `${receiptCommit}:${relative}`);
    const current = gitBytes(root, 'show', `HEAD:${relative}`);
    assert.ok(prior.equals(current), `critical proof/checker input drifted after aggregate: ${relative}`);
    assert.ok(fs.readFileSync(abs(root, relative)).equals(current),
      `working source differs from clean HEAD for critical input: ${relative}`);
  }
  return { sourceCommit: currentCommit, sourceTree: gitText(root, 'show', '-s', '--format=%T', 'HEAD'),
    aggregateSourceCommit: receiptCommit, aggregateSourceTree: receiptTree,
    criticalFiles: criticalPaths.length, laterChanges: changed };
}

export function captureBinding({ root, aggregateApproval, kernelApproval, bunPath }) {
  assert.equal(process.platform, 'linux', 'the 2.0.32 BendTT verdict candidate is Linux-only');
  assert.equal(process.env.BEND_NO_TELEMETRY, '1', 'BEND_NO_TELEMETRY=1 is required');
  assertProofNodeRuntime();
  root = fs.realpathSync(root);
  requireClean(root, 'Rift source checkout');
  const sourceCommit = gitText(root, 'rev-parse', 'HEAD');
  const sourceTree = gitText(root, 'show', '-s', '--format=%T', 'HEAD');
  const frozen = verifyV2();
  const folder = abs(root, 'bend2/core/v2');
  const checkPath = abs(root, 'bend2/core/v2/CHECK.bend');
  const actualImports = [...fs.readFileSync(checkPath, 'utf8')
    .matchAll(/^import \.\/([^ ]+) as /gm)].map((match) => match[1]).sort();
  const requiredDeclarations = fs.readdirSync(folder)
    .filter((name) => name === 'LAWS.bend' || name.endsWith('Laws.bend')).sort();
  const expectedImports = [...new Set([...requiredProofs, ...requiredDeclarations])].sort();
  assert.deepEqual(actualImports, expectedImports,
    'frozen CHECK entry differs from the exact proof/declaration import set');

  const derived = fs.realpathSync(abs(root, '.artifacts/bend2/toolchain-patches/derived-2032'));
  const scout = fs.realpathSync(abs(root, '.artifacts/toolchains/bend-2.0.32-scout'));
  const canonical = fs.realpathSync(abs(root, '.artifacts/toolchains/bend'));
  assert.equal(gitText(scout, 'rev-parse', 'HEAD'), release);
  assert.equal(gitText(scout, 'show', '-s', '--format=%T', 'HEAD'), releaseTree);
  requireClean(scout, 'pristine 2.0.32 scout');
  assert.equal(gitText(derived, 'rev-parse', 'HEAD'), release);
  const derivedStatus = gitText(derived, 'status', '--porcelain=v1', '--untracked-files=all')
    .split('\n').filter(Boolean).map((line) => line.slice(3)).sort();
  assert.deepEqual(derivedStatus, ['bend2/bend.ts', 'bend2/comp.ts', 'bend2/main.ts'],
    'derived compiler checkout must contain only the reviewed three-file patch stack');
  assert.equal(gitText(canonical, 'rev-parse', 'HEAD'), canonicalPin);
  requireClean(canonical, 'canonical 2.0.27 compiler pin');
  assert.equal(fileHash(abs(root, 'bend2/TOOLCHAIN.json')), pinSha256,
    'canonical Bend 2.0.27 pin file changed');
  const pin = JSON.parse(fs.readFileSync(abs(root, 'bend2/TOOLCHAIN.json'), 'utf8'));
  assert.equal(pin.bendVersion, '2.0.27');
  assert.equal(pin.bendCommit, canonicalPin);

  const compilerEol = bindCompilerEol((relative) => fs.readFileSync(abs(derived, relative)));
  assert.equal(compilerEol.eol, 'lf', 'Linux derived compiler must use the exact LF postimages');
  const compilerBase = bindCompilerBaseEol(
    fs.readFileSync(abs(derived, 'bend2/base.bend')), compilerEol.eol);
  const compilerEolBinderSha256 = fileHash(abs(root,
    'bend2/toolchain-patches/2032/preview/compiler-eol.mjs'));
  assert.equal(compilerEolBinderSha256,
    'cb1cbb64e07e32c30cb9199424ec84e87cfcc516427c035a51fa6f7a84eacc27');
  const aggregateScriptSha256 = fileHash(abs(root, 'bend2/core/v3/2032/aggregate.mjs'));
  const aggregateSafetyFile = abs(root, 'bend2/core/v3/2032/aggregate-safety.mjs');
  const aggregateSafetySha256 = fileHash(aggregateSafetyFile);
  assert.equal(fileHash(abs(root, 'bend2/core/v3/proof-authority.mjs')), authoritySha256);
  assert.equal(fileHash(aggregateSafetyFile), aggregateSafetySha256,
    'aggregate safety helper changed during binding');
  assert.equal(fileHash(abs(root, 'bend2/toolchain-patches/2032/preview/lifecycle.mjs')),
    lifecycleSha256, 'exclusive lease helper differs from the reviewed implementation');
  const supervisorFile = abs(root, 'bend2/core/v3/2032/bendtt-supervisor.mjs');
  const processSupervisorSha256 = fileHash(supervisorFile);
  assert.equal(processSupervisorSha256, supervisorSha256,
    'owned process-group supervisor differs from the reviewed implementation');
  const patches = patchSpecs.map(([relative, expected]) => {
    const actual = fileHash(abs(root, relative));
    assert.equal(actual, expected, `2.0.32 patch stack changed: ${relative}`);
    return { path: relative, sha256: actual };
  });

  const scoutSafeBytes = gitBytes(scout, 'show', `${release}:${expectedBendttSafeSource.path}`);
  assert.equal(sha256(scoutSafeBytes), expectedBendttSafeSource.sha256,
    'scout safe.ts Git-blob LF bytes changed');
  assert.equal(gitText(scout, 'rev-parse', `${release}:${expectedBendttSafeSource.path}`),
    expectedBendttSafeSource.gitBlob);
  const derivedSafeSha256 = fileHash(abs(derived, expectedBendttSafeSource.path));
  assert.equal(derivedSafeSha256, expectedBendttSafeSource.sha256,
    'derived Linux safe.ts working bytes differ from the reviewed LF Git blob');
  const bendttBytes = gitBytes(scout, 'show', `${release}:${expectedBendttSource.path}`);
  assert.equal(sha256(bendttBytes), expectedBendttSource.sha256);
  assert.equal(gitText(scout, 'rev-parse', `${release}:${expectedBendttSource.path}`),
    expectedBendttSource.gitBlob);
  const kernelSource = { ...expectedBendttSource };
  const kernelExe = readExecutable(kernelApproval.path, kernelApproval.sha256, 'BendTT kernel');
  const kernelBytes = fs.readFileSync(kernelExe.path);
  const kernelProvenance = validateKernelApproval(kernelApproval, kernelBytes,
    readLocalApprovalFile(root, kernelApproval.review, 'BendTT independent review'), kernelSource);

  const aggregateBytes = readLocalApprovalFile(root, aggregateApproval, 'raw aggregate receipt');
  const aggregateReviewBytes = readLocalApprovalFile(root, aggregateApproval.review,
    'aggregate independent review');
  const expectedLoadedPaths = expectedCheckClosure(root, checkPath, frozen.manifest.files,
    abs(derived, 'bend2/base.bend'));
  const aggregate = validateAggregateApproval(aggregateApproval, aggregateBytes,
    aggregateReviewBytes, { frozenSha256: frozen.sha256,
      loadedFiles: expectedLoadedPaths.length, aggregateScriptSha256,
      aggregateSafetySha256, compilerEol, compilerBase,
      compilerEolBinderSha256, patches,
      aggregateRuntime: { nodeVersion: process.version, nodeExeSha256: fileHash(process.execPath),
        platform: process.platform, arch: process.arch } });
  const lineage = checkReceiptLineage(root, aggregate.sourceCommit, aggregate.sourceTree,
    [...new Set([...Object.keys(frozen.manifest.files), 'bend2/TOOLCHAIN.json',
      'bend2/laws/semantic-v2.json', 'bend2/tools/freeze-v2.mjs', 'bend2/tools/freeze.mjs',
      'bend2/tools/amendments.mjs', 'bend2/core/v3/proof-authority.mjs',
      'bend2/core/v3/2032/aggregate.mjs', 'bend2/core/v3/2032/aggregate-safety.mjs',
      'bend2/toolchain-patches/2032/preview/compiler-eol.mjs',
      'bend2/toolchain-patches/2032/preview/lifecycle.mjs', ...patchSpecs.map(([file]) => file)])].sort());
  assert.equal(lineage.sourceCommit, sourceCommit);
  assert.equal(lineage.sourceTree, sourceTree);
  assert.equal(aggregateApproval.holes, 0);
  assert.equal(aggregateApproval.fetches, 0);

  assert.ok(typeof bunPath === 'string' && path.posix.isAbsolute(bunPath),
    'BUN_BIN must be explicit and absolute');
  assert.equal(path.posix.normalize(bunPath), bunPath, 'BUN_BIN path is not canonical');
  const bun = readExecutable(bunPath, bunSha256, 'Bun 1.4.2');
  const kernel = readExecutable(kernelApproval.path, kernelApproval.sha256, 'BendTT kernel');
  const derivedBase = fs.realpathSync(abs(derived, 'bend2/base.bend'));
  const expectedLoadedSources = expectedLoadedPaths.map((file) => ({
    path: file === derivedBase ? '<derived>/bend2/base.bend'
      : path.relative(root, file).replaceAll('\\', '/'),
    sha256: fileHash(file),
  }));
  return { sourceCommit, sourceTree, frozenSha256: frozen.sha256,
    frozenFiles: Object.keys(frozen.manifest.files).length,
    checkPath: fs.realpathSync(checkPath), expectedLoadedPaths, expectedLoadedSources,
    aggregate: { path: aggregateApproval.path, sha256: aggregateApproval.sha256,
      sourceCommit: aggregate.sourceCommit, sourceTree: aggregate.sourceTree,
      holes: aggregate.holes, fetches: aggregate.fetches },
    lineage, kernel: { ...kernelProvenance, path: kernel.path,
    actualSha256: kernel.sha256, source: kernelSource,
      sourceSha256: expectedBendttSource.sha256,
      safeSource: { ...expectedBendttSafeSource, derivedSha256: derivedSafeSha256 } },
    bun, compilerEol, compilerBase, compilerEolBinderSha256,
    aggregateScriptSha256, aggregateSafetySha256, lifecycleSha256,
    processSupervisorSha256, patches,
    node: { version: process.version, executable: fs.realpathSync(process.execPath),
      sha256: fileHash(process.execPath), platform: process.platform, arch: process.arch },
    networkBoundary: { telemetry: 'BEND_NO_TELEMETRY=1',
      imports: 'frozen CHECK and exact local .bend closure only',
      proxies: 'loopback sink for HTTP(S)/ALL proxy variables; no external URL imports accepted' } };
}

export function validateBunPath(value) {
  assert.equal(typeof value, 'string', 'Set BUN_BIN to the existing Linux Bun 1.4.2 executable');
  assert.ok(path.posix.isAbsolute(value), 'BUN_BIN must be an explicit absolute path');
  assert.equal(path.posix.normalize(value), value, 'BUN_BIN path is not canonical');
  return value;
}
