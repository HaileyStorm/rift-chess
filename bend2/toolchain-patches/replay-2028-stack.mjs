// Replay the reviewed 2.0.28 patch order from the upstream commit, isolated
// from any dirty source worktree. This records source composition only.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const artifactRoot = path.join(root, '.artifacts/bend2/toolchain-patches');
const source = path.join(artifactRoot, 'fresh-2028-stack');
const runParent = path.join(artifactRoot, 'replay-2028-stack');
const upstream = {
  commit: 'bc178404f4778704fa5584a73fcdf72bcdf9f32c',
  tree: '71328f11e629467db41034257b668d9cc6a932ce',
};
const known = {
  after002: {
    'bend2/bend.ts': 'f4bcb58153ac06af6c11214b9c3d6680ffeb8ee597c04001ffe93d8ffeac248e',
    'bend2/comp.ts': '950b582dbf47f50cfe7974d40aa5e09ae503f9987357b3f3a543bcb7abc3a7b3',
    'bend2/main.ts': '8e8c02ef9cade0310ed098d1596e789070e7e91aabf98e24b3dd648fa849a928',
  },
  after005: {
    'bend2/bend.ts': '9068fe33367505ba99bfaba3aa99ad66c1dc9e7799c014ec1f042a598ac888a2',
    'bend2/comp.ts': '950b582dbf47f50cfe7974d40aa5e09ae503f9987357b3f3a543bcb7abc3a7b3',
    'bend2/main.ts': 'bd7218bc60e4da73be2fdb3c56b8325dd4f0344c771e7a1a6788bb27f9dfb7ec',
  },
  after004: {
    'bend2/bend.ts': 'c90ace39dbbbc1b6b4fd7e5bb9604b64968fcf00d0a39c20e46ac8059088ec56',
    'bend2/comp.ts': '49c40305ef96f91187cc5eb8fceac02cbf2c4992cbdee4819ec7c0fd3ee8887b',
    'bend2/main.ts': '5303e55d5b240d173f78c6c2f0b2e626a276482541a5d80fd1a22e986d1ab430',
    'bend2/web_runtime.js': '5def0b7c33be027416c869adbf16a26cc98a0008461b11c2e49453c955ad97d6',
  },
  after006: {
    'bend2/bend.ts': '359543edcf8060817f68e1ae6aeaad79888a20de511e676d065abab271657dd8',
    'bend2/comp.ts': '49c40305ef96f91187cc5eb8fceac02cbf2c4992cbdee4819ec7c0fd3ee8887b',
    'bend2/main.ts': '5303e55d5b240d173f78c6c2f0b2e626a276482541a5d80fd1a22e986d1ab430',
    'bend2/web_runtime.js': '5def0b7c33be027416c869adbf16a26cc98a0008461b11c2e49453c955ad97d6',
  },
};
const patches = [
  {
    id: '001-arity', path: 'bend2/toolchain-patches/001-arity/0001-arity-diagnostics.patch',
    sha256: 'dc5d01754f933d4568538c8cd3bda046f584f0cda2f1b196d254e05cfe2d92da',
    targets: ['bend2/comp.ts'],
  },
  {
    id: '002-layout-2028', path: 'bend2/toolchain-patches/002-layout/rebase-2028/002-after-001-2.0.28.patch',
    sha256: '21fa3dbbf542147289d7efec92db0867bdbae36ecfb6e1b436ab87cd16a1a469',
    targets: ['bend2/bend.ts', 'bend2/comp.ts', 'bend2/main.ts'],
    expectedStage: 'after002',
  },
  {
    id: '005-windows-import-path', path: 'bend2/toolchain-patches/005-windows-import-path/005-after-001-002.patch',
    sha256: '2a2c4c5c0061080d35815849fd37cdace7c6949e8bf99c5cc6b566d30dfb8d0d',
    targets: ['bend2/bend.ts', 'bend2/main.ts'],
    expectedStage: 'after005',
  },
  {
    id: '004-web-workers-compiler', path: 'bend2/toolchain-patches/004-web-workers/rebase-2028/004-after-005-2.0.28.patch',
    sha256: '8cdf93ac066391f93638d7a4bacf2efd85624d77271af0ed5a981d6bd5d7207c',
    targets: ['bend2/bend.ts', 'bend2/comp.ts', 'bend2/main.ts', 'bend2/web_runtime.js'],
    expectedStage: 'after004',
  },
  {
    id: '004-maintained-worker-test-inputs',
    path: 'bend2/toolchain-patches/004-web-workers/004-after-001-002.patch',
    sha256: '57ec91c6c66e859c3febc55b19f7a7c8d4a319c03350ea4a7176f99b4aef3a9b',
    filterWorkerTests: true,
    targets: [
      'gates/workers.mjs',
      'tests/workers/auto_policy_perf.mjs', 'tests/workers/browser_caller.mjs',
      'tests/workers/browser_runner.py', 'tests/workers/continuations.bend',
      'tests/workers/f32_finite.bend', 'tests/workers/html_bundle.mjs',
      'tests/workers/image_tree.bend', 'tests/workers/index.html',
      'tests/workers/integer_tree.bend', 'tests/workers/node_adapter.mjs',
      'tests/workers/node_bootstrap.mjs', 'tests/workers/node_integration.mjs',
      'tests/workers/oracle_hashes.json', 'tests/workers/policies.bend',
      'tests/workers/policy_parser.bend', 'tests/workers/regression_matrix.mjs',
      'tests/workers/runtime_test.mjs', 'tests/workers/stage2_test.mjs',
      'tests/workers/worker_bundle.html', 'tests/workers/worker_bundle.js',
      'tests/workers/workload_shapes.bend',
    ],
    expectedStage: 'after004',
  },
  {
    id: '004-web-workers-test-adapter', path: 'bend2/toolchain-patches/004-web-workers/rebase-2028/004-tests-after-005-2.0.28.patch',
    sha256: '7f412bb7c2c092380b713d49487f11c1e22ce5d39ac9df4662d49ff87b310402',
    targets: [
      'gates/workers.mjs', 'tests/workers/node_integration.mjs',
      'tests/workers/regression_matrix.mjs', 'tests/workers/oracle_hashes_2028.json',
    ],
    expectedStage: 'after004',
  },
  {
    id: '006-alias-equality', path: 'bend2/toolchain-patches/006-alias-equality/006-after-004-2.0.28.patch',
    sha256: 'a558b9b53cb46667659dc52036ad13a64da4e026ca8cf51dbd1ede9468fa8344',
    targets: ['bend2/bend.ts'],
    expectedStage: 'after006',
  },
];
const keyFiles = ['bend2/bend.ts', 'bend2/comp.ts', 'bend2/main.ts', 'bend2/base.bend', 'bend2/web_runtime.js'];
const isoStamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const runId = `${isoStamp}-${process.pid}-${randomUUID()}`;
const runRoot = path.join(runParent, runId);
const clone = path.join(runRoot, 'compiler');
const receiptPath = path.join(runRoot, 'receipt.json');
const emptyGitConfig = path.join(runRoot, 'empty-global.gitconfig');
const disabledHooks = path.join(runRoot, 'hooks-disabled');
const receipt = {
  schema: 'rift-bend-2028-ordered-stack-replay/1',
  runId,
  startedAt: new Date().toISOString(),
  status: 'running',
  scope: 'Fresh local Git-HEAD replay of the ordered 2.0.28 compiler/test patches; not compiler, proof, browser, native, GPU, pin-adoption, or release acceptance.',
  networkPolicy: {
    bendNoTelemetry: true,
    gitAllowedProtocol: 'file only',
    checkoutEol: 'explicit core.autocrlf=true for the independently pinned Windows CRLF fixture oracle',
    remoteRemovedBeforeReplay: false,
    fetchCommands: 0,
    directProviderCommands: 0,
    networkInstrumented: false,
  },
  expectedUpstream: upstream,
  source: path.relative(root, source).replaceAll('\\', '/'),
  sourceWorktree: null,
  clone: path.relative(root, clone).replaceAll('\\', '/'),
  patchInputs: [],
  stages: [],
  commands: [],
};

process.env.BEND_NO_TELEMETRY = '1';
let gateTools = null;

function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function canonicalDigest(bytes) {
  const text = bytes.toString('utf8');
  assert.ok(!text.includes('\0'), 'expected UTF-8 text input');
  return digest(Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8'));
}

function commandEnv() {
  const env = { ...process.env };
  for (const name of Object.keys(env)) if (/^GIT_/i.test(name)) delete env[name];
  delete env.BUN_BIN;
  delete env.CHROME_BIN;
  delete env.NODE_OPTIONS;
  Object.assign(env, {
    BEND_NO_TELEMETRY: '1',
    BEND_HUB: 'http://127.0.0.1:9',
    GIT_ALLOW_PROTOCOL: 'file',
    GIT_CONFIG_GLOBAL: emptyGitConfig,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_TERMINAL_PROMPT: '0',
  });
  if (gateTools) {
    env.BUN_BIN = gateTools.bun.path;
    env.CHROME_BIN = gateTools.chrome.path;
  }
  return env;
}

function recordCommand(binary, args, cwd, result) {
  receipt.commands.push({
    binary,
    args,
    cwd: path.relative(root, cwd).replaceAll('\\', '/') || '.',
    status: result.status,
    error: result.error?.message ?? null,
  });
}

function run(binary, args, cwd = root, timeout = 120000, preserveError = false) {
  const effectiveArgs = binary === 'git'
    ? ['-c', `core.hooksPath=${disabledHooks}`, '-c', 'core.autocrlf=true', ...args]
    : args;
  const result = spawnSync(binary, effectiveArgs, {
    cwd,
    env: commandEnv(),
    encoding: 'utf8',
    timeout,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  recordCommand(binary, effectiveArgs, cwd, result);
  if (result.error && !preserveError) throw result.error;
  return result;
}

function localExecutable(file, label) {
  const resolved = path.resolve(file);
  assert.equal(fs.realpathSync(resolved), resolved, `${label} must be a canonical local file`);
  assert.ok(fs.statSync(resolved).isFile(), `${label} must be a regular file`);
  return { path: resolved, sha256: digest(fs.readFileSync(resolved)) };
}

function resolveGateTools() {
  const bun = localExecutable(path.join(root,
    '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe'), 'pinned Bun');
  const bunVersion = requireSuccess(run(bun.path, ['--version']), 'pinned Bun version').trim();
  assert.equal(bunVersion, '1.4.2', 'Bun runtime differs from the workspace pin');
  bun.version = bunVersion;
  const chromePath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ].find(file => fs.existsSync(file));
  assert.ok(chromePath, 'local Chrome is required for the zero-skip browser worker gate');
  const chrome = localExecutable(chromePath, 'installed Chrome');
  // Windows Chrome may attach to an existing GUI instance and never exit for
  // --version. The exact executable bytes, not that command's text, bind this gate.
  gateTools = { bun, chrome, node: localExecutable(process.execPath, 'Node runtime') };
  receipt.gateTools = { ...gateTools, inheritedExecutableOverrides: 'cleared', nodeOptions: 'cleared' };
  saveReceipt();
}

function recheckGateTools() {
  for (const [label, tool] of Object.entries(gateTools))
    assert.equal(localExecutable(tool.path, label).sha256, tool.sha256,
      `worker gate executable changed during the run: ${label}`);
  receipt.gateToolsUnchanged = true;
}

function requireSuccess(result, label) {
  assert.equal(result.status, 0, `${label} failed: ${(result.stderr || result.stdout || '').slice(-6000)}`);
  return result.stdout;
}

function git(directory, args) {
  return requireSuccess(run('git', ['-C', directory, ...args]), `git ${args.join(' ')}`);
}

function saveReceipt() {
  receipt.updatedAt = new Date().toISOString();
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

function normalizedPaths(paths) {
  return [...new Set(paths)].sort();
}

function parsePatchTargets(patchBytes) {
  const text = patchBytes.toString('utf8');
  return normalizedPaths([...text.matchAll(/^diff --git a\/[^\r\n]+ b\/([^\r\n]+)$/gm)].map(match => match[1]));
}

function workerTestPatch(patchBytes) {
  const sourceText = patchBytes.toString('utf8');
  assert.ok(sourceText.startsWith('diff --git '), 'maintained patch has an unexpected preamble');
  const chunks = sourceText.split(/(?=^diff --git )/m);
  const selected = chunks.filter(chunk => {
    const header = /^diff --git a\/([^\r\n]+) b\/([^\r\n]+)/.exec(chunk);
    assert.ok(header && header[1] === header[2], 'maintained patch has an unsafe path header');
    return header[1] === 'gates/workers.mjs' || header[1].startsWith('tests/workers/');
  });
  const filtered = Buffer.from(selected.join(''), 'utf8');
  assert.deepEqual(parsePatchTargets(filtered),
    normalizedPaths(patches.find(item => item.filterWorkerTests).targets),
    'maintained worker-test selection drifted');
  return filtered;
}

function snapshot(directory, paths) {
  const files = {};
  for (const name of normalizedPaths(paths)) {
    const file = path.join(directory, ...name.split('/'));
    if (!fs.existsSync(file)) {
      files[name] = { exists: false };
      continue;
    }
    const bytes = fs.readFileSync(file);
    files[name] = { exists: true, sha256: digest(bytes), canonicalSha256: canonicalDigest(bytes) };
  }
  return files;
}

function changedPaths(directory) {
  return normalizedPaths(git(directory, ['status', '--porcelain=v1', '--untracked-files=all'])
    .split(/\r?\n/).filter(Boolean).map(line => line.slice(3)));
}

function checkExpected(stage, files, stageRecord) {
  const expected = known[stage];
  if (!expected) return;
  const mismatches = [];
  for (const [name, sha256] of Object.entries(expected)) {
    const actual = files[name]?.canonicalSha256;
    if (actual !== sha256) mismatches.push({ path: name, expectedCanonicalSha256: sha256, actualCanonicalSha256: actual ?? null });
  }
  stageRecord.expectedCanonical = { passed: mismatches.length === 0, mismatches };
  saveReceipt();
  assert.equal(mismatches.length, 0, `${stage} canonical source hash mismatch: ${JSON.stringify(mismatches)}`);
}

function sourceHeadEvidence() {
  assert.ok(fs.statSync(source).isDirectory(), 'fresh-2028-stack is missing');
  const canonicalSource = fs.realpathSync(source);
  const canonicalArtifacts = fs.realpathSync(artifactRoot);
  assert.equal(canonicalSource, source, 'fresh-2028-stack must be a canonical local directory');
  const relative = path.relative(canonicalArtifacts, canonicalSource);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'source must remain under ignored toolchain artifacts');
  const commit = git(source, ['rev-parse', '--verify', 'HEAD^{commit}']).trim();
  const tree = git(source, ['rev-parse', '--verify', 'HEAD^{tree}']).trim();
  assert.equal(commit, upstream.commit, 'fresh-2028-stack HEAD is not the expected upstream commit');
  assert.equal(tree, upstream.tree, 'fresh-2028-stack HEAD tree is not the expected upstream tree');
  const status = git(source, ['status', '--porcelain=v1', '--untracked-files=all']);
  receipt.sourceWorktree = {
    head: commit,
    tree,
    dirty: status.trim().length !== 0,
    statusSha256: digest(Buffer.from(status, 'utf8')),
    changedPaths: status.split(/\r?\n/).filter(Boolean).map(line => line.slice(3)),
    replaySource: 'Git HEAD/tree only; source worktree files are not copied',
  };
  saveReceipt();
}

function loadPatchInputs() {
  for (const spec of patches) {
    const file = path.join(root, ...spec.path.split('/'));
    const tracked = run('git', ['-C', root, 'ls-files', '--error-unmatch', '--', spec.path]);
    requireSuccess(tracked, `tracked patch ${spec.path}`);
    requireSuccess(run('git', ['-C', root, 'diff', '--quiet', 'HEAD', '--', spec.path]),
      `unmodified tracked patch ${spec.path}`);
    const bytes = fs.readFileSync(file);
    const rawSha256 = digest(bytes);
    const canonicalSha256 = canonicalDigest(bytes);
    const targets = spec.filterWorkerTests
      ? parsePatchTargets(workerTestPatch(bytes)) : parsePatchTargets(bytes);
    assert.equal(rawSha256, spec.sha256, `tracked patch bytes drifted: ${spec.path}`);
    assert.deepEqual(targets, normalizedPaths(spec.targets), `patch target list drifted: ${spec.path}`);
    const frozenFile = path.join(runRoot, 'patches', `${spec.id}.patch`);
    fs.writeFileSync(frozenFile, bytes, { flag: 'wx' });
    assert.equal(digest(fs.readFileSync(frozenFile)), spec.sha256,
      `frozen patch copy drifted: ${spec.path}`);
    spec.frozenFile = frozenFile;
    receipt.patchInputs.push({
      id: spec.id,
      path: spec.path,
      rawSha256,
      canonicalSha256,
      frozenPath: path.relative(root, frozenFile).replaceAll('\\', '/'),
      frozenSha256: spec.sha256,
      targets,
      expectedRawSha256: spec.sha256,
      ...(spec.filterWorkerTests ? {
        selection: 'exact gates/workers.mjs and tests/workers/* hunks from the pinned maintained 004 patch',
        filteredSha256: digest(workerTestPatch(bytes)),
      } : {}),
    });
  }
  saveReceipt();
}

function cloneFromHead() {
  const cloneResult = run('git', ['clone', '--local', '--no-hardlinks', '--no-checkout', '--', source, clone]);
  requireSuccess(cloneResult, 'local pristine-HEAD clone');
  const actualClone = fs.realpathSync(clone);
  assert.equal(actualClone, clone, 'clone path must be canonical');
  const origin = git(clone, ['remote', 'remove', 'origin']);
  void origin;
  receipt.networkPolicy.remoteRemovedBeforeReplay = true;
  const remotes = git(clone, ['remote', '-v']).trim();
  assert.equal(remotes, '', 'clone must have no remotes before patch replay');
  git(clone, ['checkout', '--detach', upstream.commit]);
  const commit = git(clone, ['rev-parse', '--verify', 'HEAD^{commit}']).trim();
  const tree = git(clone, ['rev-parse', '--verify', 'HEAD^{tree}']).trim();
  const status = git(clone, ['status', '--porcelain=v1', '--untracked-files=all']).trim();
  assert.equal(commit, upstream.commit, 'clone HEAD drifted');
  assert.equal(tree, upstream.tree, 'clone tree drifted');
  assert.equal(status, '', 'clone must start pristine and clean');
  receipt.cloneHead = { commit, tree, clean: true, remotes: [] };
  const files = snapshot(clone, keyFiles);
  receipt.stages.push({ id: 'pristine-upstream-head', changedPaths: [], files });
  saveReceipt();
}

function applyStack() {
  const cumulativeTargets = [];
  const snapshotPaths = [...keyFiles, ...patches.flatMap(item => item.targets)];
  for (const spec of patches) {
    const stageRecord = {
      id: spec.id,
      patch: spec.path,
      applyCheck: 'pending',
      applied: false,
      changedPaths: [],
      files: null,
    };
    receipt.stages.push(stageRecord);
    receipt.currentStage = spec.id;
    saveReceipt();
    let patchFile = spec.frozenFile;
    assert.equal(digest(fs.readFileSync(patchFile)), spec.sha256,
      `${spec.id} frozen input drifted before apply`);
    if (spec.filterWorkerTests) {
      const filtered = workerTestPatch(fs.readFileSync(patchFile));
      patchFile = path.join(runRoot, '004-maintained-worker-test-inputs.patch');
      fs.writeFileSync(patchFile, filtered, { flag: 'wx' });
      stageRecord.filteredPatchSha256 = digest(filtered);
      saveReceipt();
    }
    requireSuccess(run('git', ['-C', clone, 'apply', '--check', '--', patchFile]), `${spec.id} git apply --check`);
    assert.equal(digest(fs.readFileSync(patchFile)), stageRecord.filteredPatchSha256 ?? spec.sha256,
      `${spec.id} patch input drifted during apply check`);
    stageRecord.applyCheck = 'passed';
    saveReceipt();
    requireSuccess(run('git', ['-C', clone, 'apply', '--', patchFile]), `${spec.id} git apply`);
    assert.equal(digest(fs.readFileSync(patchFile)), stageRecord.filteredPatchSha256 ?? spec.sha256,
      `${spec.id} patch input drifted during apply`);
    stageRecord.applied = true;
    cumulativeTargets.push(...spec.targets);

    const untracked = git(clone, ['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).filter(Boolean);
    if (untracked.length) {
      git(clone, ['add', '--intent-to-add', '--', ...untracked]);
      stageRecord.intentToAddPaths = normalizedPaths(untracked);
    } else stageRecord.intentToAddPaths = [];

    requireSuccess(run('git', ['-C', clone, 'diff', '--check', '--']), `${spec.id} git diff --check`);
    stageRecord.diffCheck = 'passed';
    stageRecord.changedPaths = changedPaths(clone);
    const expectedPaths = normalizedPaths(cumulativeTargets);
    assert.deepEqual(stageRecord.changedPaths, expectedPaths, `${spec.id} changed path set drifted`);
    stageRecord.files = snapshot(clone, snapshotPaths);
    if (spec.expectedStage) checkExpected(spec.expectedStage, stageRecord.files, stageRecord);
    saveReceipt();
  }
  requireSuccess(run('git', ['-C', clone, 'diff', '--check', '--']), 'final git diff --check');
  receipt.final = {
    head: git(clone, ['rev-parse', '--verify', 'HEAD^{commit}']).trim(),
    tree: git(clone, ['rev-parse', '--verify', 'HEAD^{tree}']).trim(),
    changedPaths: changedPaths(clone),
    files: snapshot(clone, [...keyFiles, ...patches.flatMap(item => item.targets)]),
    diffCheck: 'passed',
  };
  assert.equal(receipt.final.head, upstream.commit, 'patch replay changed clone HEAD');
  assert.equal(receipt.final.tree, upstream.tree, 'patch replay changed clone HEAD tree');
  assert.deepEqual(receipt.final.changedPaths, normalizedPaths(patches.flatMap(item => item.targets)),
    'final patch stack target set drifted');
}

function recheckPatchInputs() {
  for (const spec of patches) {
    assert.equal(digest(fs.readFileSync(path.join(root, ...spec.path.split('/')))),
      spec.sha256, `tracked patch changed during replay: ${spec.path}`);
    assert.equal(digest(fs.readFileSync(spec.frozenFile)), spec.sha256,
      `frozen patch changed during replay: ${spec.id}`);
  }
  receipt.patchInputsUnchanged = true;
}

function runWorkerGate() {
  receipt.currentStage = 'final-stack-worker-gate';
  const oracle = JSON.parse(fs.readFileSync(path.join(clone,
    'tests/workers/oracle_hashes_2028.json'), 'utf8'));
  assert.equal(oracle.schema, 'bend-worker-oracles-2028/1');
  const sourcePaths = normalizedPaths([...keyFiles, ...patches.flatMap(item => item.targets),
    ...oracle.fixtures.map(item => item.file)]);
  const before = snapshot(clone, sourcePaths);
  for (const [file, details] of Object.entries(receipt.final.files))
    assert.deepEqual(before[file], details, `worker-gate preflight differs from final replay: ${file}`);
  for (const fixture of oracle.fixtures)
    assert.equal(before[fixture.file]?.sha256, fixture.sourceSha256,
      `independent fixture bytes drifted: ${fixture.file}`);
  const gateArgs = ['--experimental-strip-types', 'gates/workers.mjs', 'test'];
  const result = run(process.execPath, gateArgs, clone, 180000, true);
  const stdoutPath = path.join(runRoot, 'worker-gate.stdout.txt');
  const stderrPath = path.join(runRoot, 'worker-gate.stderr.txt');
  fs.writeFileSync(stdoutPath, result.stdout ?? '', { flag: 'wx' });
  fs.writeFileSync(stderrPath, result.stderr ?? '', { flag: 'wx' });
  const after = snapshot(clone, sourcePaths);
  const summary = Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']
    .map(key => [key, Number(new RegExp(`(?:^|\\n)ℹ ${key} (\\d+)`, 'u').exec(result.stdout ?? '')?.[1] ?? NaN)]));
  receipt.workerGate = {
    command: [process.execPath, ...gateArgs],
    cwd: path.relative(root, clone).replaceAll('\\', '/'),
    environment: { BEND_NO_TELEMETRY: '1', BEND_HUB: 'http://127.0.0.1:9',
      GIT_ALLOW_PROTOCOL: 'file', BUN_BIN: gateTools.bun.path,
      CHROME_BIN: gateTools.chrome.path, NODE_OPTIONS: null },
    status: result.status,
    error: result.error?.message ?? null,
    stdout: { path: path.relative(root, stdoutPath).replaceAll('\\', '/'),
      sha256: digest(fs.readFileSync(stdoutPath)), bytes: fs.statSync(stdoutPath).size },
    stderr: { path: path.relative(root, stderrPath).replaceAll('\\', '/'),
      sha256: digest(fs.readFileSync(stderrPath)), bytes: fs.statSync(stderrPath).size },
    summary, before, after, inputsUnchanged: JSON.stringify(before) === JSON.stringify(after),
  };
  saveReceipt();
  requireSuccess(result, 'final-stack worker gate');
  assert.deepEqual(summary, { tests: 107, pass: 107, fail: 0, cancelled: 0, skipped: 0, todo: 0 },
    'final-stack worker gate result differs from 107/107');
  assert.deepEqual(after, before, 'final-stack worker gate changed compiler, test or fixture bytes');
}

function main() {
  assert.equal(fs.realpathSync(artifactRoot), artifactRoot,
    'toolchain artifact root must be a canonical local directory');
  fs.mkdirSync(runParent, { recursive: true });
  assert.equal(fs.realpathSync(runParent), runParent,
    'replay output parent must not be a reparse/symlink path');
  assert.ok(fs.realpathSync(runParent).startsWith(fs.realpathSync(artifactRoot) + path.sep),
    'replay output parent escaped ignored toolchain artifacts');
  fs.mkdirSync(runRoot);
  fs.mkdirSync(path.join(runRoot, 'patches'));
  fs.mkdirSync(disabledHooks);
  fs.writeFileSync(emptyGitConfig, '', { flag: 'wx' });
  saveReceipt();
  const ignore = run('git', ['-C', root, 'check-ignore', '--quiet', '--no-index', '--', path.relative(root, runRoot)]);
  requireSuccess(ignore, 'ignored receipt and clone root');
  sourceHeadEvidence();
  loadPatchInputs();
  cloneFromHead();
  applyStack();
  recheckPatchInputs();
  resolveGateTools();
  runWorkerGate();
  recheckGateTools();
  recheckPatchInputs();
  receipt.status = 'success';
  receipt.completedAt = new Date().toISOString();
  delete receipt.currentStage;
  saveReceipt();
}

try {
  main();
  console.log(JSON.stringify({ status: receipt.status, receipt: path.relative(root, receiptPath).replaceAll('\\', '/'), clone: receipt.clone }));
} catch (error) {
  receipt.status = 'failure';
  receipt.completedAt = new Date().toISOString();
  receipt.failure = {
    stage: receipt.currentStage ?? null,
    name: error?.name ?? 'Error',
    message: String(error?.message ?? error).slice(0, 8000),
    stack: String(error?.stack ?? '').slice(0, 12000),
  };
  try { saveReceipt(); } catch { /* retain the original failure if receipt storage itself fails */ }
  console.error(JSON.stringify({ status: receipt.status, receipt: path.relative(root, receiptPath).replaceAll('\\', '/'), failure: receipt.failure }));
  process.exitCode = 1;
}
