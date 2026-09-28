// Source-bound final 2.0.28 compiler/checker matrix replay.
// Runs the already-reviewed clone-local matrix script once per root, with a
// bounded fresh Node process for each lane. This does not change a compiler,
// fixture, Git ref/index, provider state, GPU state, or the pinned Bend checkout.
import assert from 'node:assert/strict';
import crypto, { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const artifactRoot = path.join(root, '.artifacts/bend2/toolchain-patches');
const runParent = path.join(artifactRoot, 'final-matrix-2028');
const replayParent = path.join(artifactRoot, 'replay-2028-stack');
const baseline = path.join(artifactRoot, 'baseline-005-matrix');
const upstream = {
  commit: 'bc178404f4778704fa5584a73fcdf72bcdf9f32c',
  tree: '71328f11e629467db41034257b668d9cc6a932ce',
};
const after005 = {
  'bend2/bend.ts': '9068fe33367505ba99bfaba3aa99ad66c1dc9e7799c014ec1f042a598ac888a2',
  'bend2/comp.ts': '950b582dbf47f50cfe7974d40aa5e09ae503f9987357b3f3a543bcb7abc3a7b3',
  'bend2/main.ts': 'bd7218bc60e4da73be2fdb3c56b8325dd4f0344c771e7a1a6788bb27f9dfb7ec',
};
const matrixSha256 = 'f8013d71eb1987bee945d990bb1720abd54811f92ada19592e04c303d9d770ee';
const groups = ['parse', 'check', 'compile', 'proof', 'show', 'comptime'];
const fixtureCount = 647;
const laneTimeoutMs = 300_000;
const laneProgressInterval = 64;
const driverPath = fileURLToPath(import.meta.url);
const nodeExecutable = fs.realpathSync(process.execPath);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonicalSha = bytes => {
  const text = bytes.toString('utf8');
  assert.ok(!text.includes('\0'), 'expected UTF-8 source input');
  return sha(Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8'));
};
const rel = file => path.relative(root, file).replaceAll('\\', '/');

function fail(message) {
  throw new Error(message);
}

function sorted(values) {
  return [...values].sort();
}

function sameList(actual, expected, label) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) fail(`${label} mismatch: ${JSON.stringify({ actual, expected })}`);
}

function sameMap(actual, expected, label) {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  const changed = [];
  for (const key of new Set([...actualKeys, ...expectedKeys])) {
    if (actual[key] !== expected[key]) changed.push(key);
  }
  if (changed.length) fail(`${label} mismatch (${changed.length}): ${changed.slice(0, 12).join(', ')}`);
}

function git(directory, args) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^GIT_/i.test(key)) delete env[key];
  Object.assign(env, {
    GIT_OPTIONAL_LOCKS: '0',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_TERMINAL_PROMPT: '0',
    GIT_ALLOW_PROTOCOL: 'file',
  });
  return execFileSync('git', ['-C', directory, ...args], {
    cwd: root, encoding: 'utf8', env, windowsHide: true,
  }).trimEnd();
}

function assertCanonicalDirectory(directory, label) {
  assert.ok(fs.statSync(directory).isDirectory(), `${label} is not a directory`);
  assert.equal(fs.realpathSync(directory), directory, `${label} must be a canonical path`);
}

function safeProjectFile(base, name) {
  assert.ok(typeof name === 'string' && name.length > 0, 'empty project-relative path');
  assert.ok(!name.includes('\\') && !path.posix.isAbsolute(name), `noncanonical path: ${name}`);
  const segments = name.split('/');
  assert.ok(segments.every(segment => segment && segment !== '.' && segment !== '..'),
    `unsafe project-relative path: ${name}`);
  const file = path.join(base, ...segments);
  const relative = path.relative(base, file);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative),
    `path escaped its root: ${name}`);
  return file;
}

function hashRecord(file) {
  assert.ok(fs.statSync(file).isFile(), `not a regular file: ${file}`);
  assert.equal(fs.realpathSync(file), file, `source path must not be a symlink: ${file}`);
  const bytes = fs.readFileSync(file);
  return { sha256: sha(bytes), canonicalSha256: canonicalSha(bytes), bytes: bytes.length };
}

function snapshotFinalInputs(clone, records) {
  const result = {};
  for (const name of Object.keys(records).sort()) {
    const record = records[name];
    assert.equal(record?.exists, true, `final receipt lacks an existing input: ${name}`);
    const actual = hashRecord(safeProjectFile(clone, name));
    assert.equal(actual.sha256, record.sha256, `final replay input changed: ${name}`);
    assert.equal(actual.canonicalSha256, record.canonicalSha256,
      `final replay canonical input changed: ${name}`);
    result[name] = { sha256: actual.sha256, canonicalSha256: actual.canonicalSha256 };
  }
  return result;
}

function snapshotBaselineCompiler() {
  const result = {};
  for (const [name, expected] of Object.entries(after005)) {
    const actual = hashRecord(safeProjectFile(baseline, name));
    assert.equal(actual.canonicalSha256, expected,
      `baseline after005 canonical compiler hash mismatch: ${name}`);
    result[name] = { sha256: actual.sha256, canonicalSha256: actual.canonicalSha256 };
  }
  return result;
}

function enumerateFixtureHashes(tree) {
  const files = {};
  for (const group of groups) {
    const directory = path.join(tree, 'tests', group);
    assert.ok(fs.statSync(directory).isDirectory(), `missing fixture group: ${rel(directory)}`);
    const names = fs.readdirSync(directory).filter(name => name.endsWith('.bend')).sort();
    for (const name of names) {
      const projectPath = `tests/${group}/${name}`;
      const file = safeProjectFile(tree, projectPath);
      files[projectPath] = sha(fs.readFileSync(file));
    }
  }
  const paths = Object.keys(files).sort();
  assert.equal(paths.length, fixtureCount, `expected exactly ${fixtureCount} matrix fixtures, found ${paths.length}`);
  assert.equal(new Set(paths).size, fixtureCount, 'fixture path list contains duplicates');
  return { count: paths.length, groups, files };
}

function fixtureDigest(snapshot) {
  return sha(Buffer.from(JSON.stringify(snapshot), 'utf8'));
}

function validateReplayReceipt(replayPath, expectedSha) {
  assert.match(expectedSha, /^[0-9a-f]{64}$/, 'expected replay receipt SHA-256 must be 64 lowercase hex characters');
  const canonicalReceipt = fs.realpathSync(replayPath);
  assert.equal(canonicalReceipt, replayPath, 'replay receipt path must be canonical');
  const receiptRelative = path.relative(replayParent, canonicalReceipt);
  assert.ok(receiptRelative && !receiptRelative.startsWith('..') && !path.isAbsolute(receiptRelative),
    'final replay receipt must be within the unique replay artifact tree');
  const bytes = fs.readFileSync(canonicalReceipt);
  assert.equal(sha(bytes), expectedSha, 'final replay receipt bytes do not match the supplied SHA-256');
  const replay = JSON.parse(bytes.toString('utf8'));
  assert.equal(replay.schema, 'rift-bend-2028-ordered-stack-replay/1');
  assert.equal(replay.status, 'success', 'final replay receipt is not successful');
  assert.deepEqual(replay.expectedUpstream, upstream, 'receipt upstream identity drifted');
  assert.equal(replay.cloneHead?.commit, upstream.commit, 'final clone receipt commit drifted');
  assert.equal(replay.cloneHead?.tree, upstream.tree, 'final clone receipt tree drifted');
  assert.equal(replay.cloneHead?.clean, true, 'source clone was not clean before replay');
  assert.deepEqual(replay.cloneHead?.remotes, [], 'final clone was not detached from remotes');
  assert.equal(replay.patchInputsUnchanged, true, 'replay patch inputs were not unchanged');
  assert.equal(replay.gateToolsUnchanged, true, 'replay gate executables were not unchanged');
  assert.equal(replay.workerGate?.inputsUnchanged, true, 'replay worker inputs were not unchanged');
  assert.equal(replay.workerGate?.status, 0, 'replay worker gate did not pass');
  assert.equal(replay.final?.head, upstream.commit, 'final compiler clone commit drifted');
  assert.equal(replay.final?.tree, upstream.tree, 'final compiler clone tree drifted');
  assert.equal(replay.final?.diffCheck, 'passed', 'final replay diff check did not pass');

  const clone = path.resolve(root, replay.clone ?? '');
  assert.equal(fs.realpathSync(clone), clone, 'replay clone path must be canonical');
  const cloneRelative = path.relative(replayParent, clone);
  assert.ok(cloneRelative && !cloneRelative.startsWith('..') && !path.isAbsolute(cloneRelative),
    'final replay clone escaped its unique isolated artifact tree');
  assert.equal(path.dirname(clone), path.dirname(canonicalReceipt),
    'final clone and replay receipt must share a unique run directory');
  assert.equal(path.basename(clone), 'compiler', 'unexpected final clone directory name');

  const finalFiles = replay.final?.files;
  assert.ok(finalFiles && typeof finalFiles === 'object', 'receipt omitted final input-file records');
  assert.equal(Object.keys(finalFiles).length, 28, 'expected exactly 28 final replay input records');
  const changedPaths = replay.final?.changedPaths;
  assert.ok(Array.isArray(changedPaths), 'receipt omitted final changed paths');
  assert.equal(changedPaths.length, 27, 'expected 27 patch-added/changed paths plus base.bend in the 28 inputs');
  sameList(changedPaths, sorted(new Set(changedPaths)), 'final replay changed-path ordering/uniqueness');
  assert.ok(Object.hasOwn(finalFiles, 'bend2/base.bend'), 'final 28-file set must include bend2/base.bend');
  sameList([...changedPaths].sort(), Object.keys(finalFiles)
    .filter(name => name !== 'bend2/base.bend').sort(),
  'final replay changed paths vs 28 input files');
  assert.equal(finalFiles['tests/workers/regression_matrix.mjs']?.sha256, matrixSha256,
    'replay final-file receipt binds an unexpected regression_matrix.mjs');

  assert.equal(git(clone, ['rev-parse', '--verify', 'HEAD^{commit}']), upstream.commit,
    'actual final clone HEAD differs from replay receipt');
  assert.equal(git(clone, ['rev-parse', '--verify', 'HEAD^{tree}']), upstream.tree,
    'actual final clone tree differs from replay receipt');
  assert.equal(git(clone, ['remote', '-v']).trim(), '', 'final clone has a configured remote');
  const actualChangedPaths = git(clone, ['status', '--porcelain=v1', '--untracked-files=all'])
    .split(/\r?\n/).filter(Boolean).map(line => line.slice(3)).sort();
  sameList(actualChangedPaths, [...changedPaths].sort(), 'actual final clone changed paths');
  const actualFinalInputs = snapshotFinalInputs(clone, finalFiles);
  return { replay, clone, finalFiles, actualFinalInputs, replayReceiptSha256: expectedSha };
}

function validateBaseline() {
  assertCanonicalDirectory(baseline, '005 matrix baseline');
  assert.equal(git(baseline, ['rev-parse', '--verify', 'HEAD^{commit}']), upstream.commit,
    '005 matrix baseline is not at the pinned upstream commit');
  assert.equal(git(baseline, ['rev-parse', '--verify', 'HEAD^{tree}']), upstream.tree,
    '005 matrix baseline tree differs from pinned upstream');
  const dirty = git(baseline, ['status', '--porcelain=v1', '--untracked-files=all'])
    .split(/\r?\n/).filter(Boolean).map(line => line.slice(3)).sort();
  sameList(dirty, Object.keys(after005).sort(), '005 baseline expected modified paths');
  return snapshotBaselineCompiler();
}

function sourceSnapshot(clone, finalFiles) {
  return {
    baselineCompiler: snapshotBaselineCompiler(),
    finalCloneInputs: snapshotFinalInputs(clone, finalFiles),
    finalMatrixScriptSha256: sha(fs.readFileSync(safeProjectFile(clone, 'tests/workers/regression_matrix.mjs'))),
    driverSha256: sha(fs.readFileSync(driverPath)),
  };
}

function captureIntegrity(clone, finalFiles) {
  const sourceHashes = sourceSnapshot(clone, finalFiles);
  const fixtureHashes = {
    baseline: enumerateFixtureHashes(baseline),
    finalClone: enumerateFixtureHashes(clone),
  };
  return { sourceHashes, fixtureHashes };
}

function assertCaptureUnchanged(actual, before, label) {
  for (const key of Object.keys(before.sourceHashes.baselineCompiler)) {
    assert.deepEqual(actual.sourceHashes.baselineCompiler[key], before.sourceHashes.baselineCompiler[key],
      `${label}: baseline compiler source changed: ${key}`);
  }
  for (const key of Object.keys(before.sourceHashes.finalCloneInputs)) {
    assert.deepEqual(actual.sourceHashes.finalCloneInputs[key], before.sourceHashes.finalCloneInputs[key],
      `${label}: final clone input changed: ${key}`);
  }
  assert.equal(actual.sourceHashes.finalMatrixScriptSha256,
    before.sourceHashes.finalMatrixScriptSha256, `${label}: matrix script changed`);
  assert.equal(actual.sourceHashes.driverSha256, before.sourceHashes.driverSha256,
    `${label}: wrapper changed`);
  for (const lane of ['baseline', 'finalClone']) {
    sameMap(actual.fixtureHashes[lane].files, before.fixtureHashes[lane].files,
      `${label}: ${lane} fixture bytes changed`);
    assert.equal(actual.fixtureHashes[lane].count, fixtureCount,
      `${label}: ${lane} fixture count changed`);
  }
  sameMap(actual.fixtureHashes.baseline.files, actual.fixtureHashes.finalClone.files,
    `${label}: baseline/final fixture paths or byte hashes differ`);
}

function sanitizeChildEnv(progressPath) {
  const env = { ...process.env };
  const removed = [];
  for (const key of Object.keys(env)) {
    if (/^(?:BEND_|BUN_|GIT_)/i.test(key) ||
        /^(?:NODE_OPTIONS|NODE_PATH|NODE_EXTRA_CA_CERTS|NODE_TLS_REJECT_UNAUTHORIZED|NODE_USE_ENV_PROXY)$/i.test(key) ||
        /proxy$/i.test(key)) {
      delete env[key];
      removed.push(key);
    }
  }
  Object.assign(env, {
    BEND_NO_TELEMETRY: '1',
    BEND_HUB: 'http://127.0.0.1:9',
    BEND_MATRIX_PROGRESS: progressPath,
  });
  return { env, removed: sorted(removed) };
}

async function runLane({ name, tree, clone, runDir, executable, expectedFixturePaths }) {
  const script = safeProjectFile(clone, 'tests/workers/regression_matrix.mjs');
  const outputPath = path.join(runDir, `${name}.rows.json`);
  const stdoutPath = path.join(runDir, `${name}.stdout.txt`);
  const stderrPath = path.join(runDir, `${name}.stderr.txt`);
  const progressPath = path.join(runDir, `${name}.progress.txt`);
  for (const file of [outputPath, stdoutPath, stderrPath, progressPath])
    assert.ok(!fs.existsSync(file), `refusing to overwrite existing lane output: ${file}`);

  const args = ['--stack-size=4096', '--experimental-strip-types', script,
    '--lane', tree, outputPath];
  const safeEnv = sanitizeChildEnv(progressPath);
  const stdoutFd = fs.openSync(stdoutPath, 'wx');
  const stderrFd = fs.openSync(stderrPath, 'wx');
  fs.writeFileSync(progressPath, '', { flag: 'wx' });
  const start = Date.now();
  const record = {
    name,
    root: rel(tree),
    command: { executable, args, cwd: rel(clone), shell: false },
    executableSha256: sha(fs.readFileSync(executable)),
    matrixScriptSha256: sha(fs.readFileSync(script)),
    timeoutMs: laneTimeoutMs,
    envPolicy: {
      bendNoTelemetry: '1', bendHub: 'http://127.0.0.1:9',
      removedVariableNames: safeEnv.removed,
      progressVariable: 'BEND_MATRIX_PROGRESS',
    },
    outputPath: rel(outputPath),
    stdoutPath: rel(stdoutPath),
    stderrPath: rel(stderrPath),
    progressPath: rel(progressPath),
    status: null,
    signal: null,
    timedOut: false,
    spawnError: null,
    progressCount: 0,
    lastProgressPath: null,
    startedAt: new Date(start).toISOString(),
  };

  console.log(`[${name}] starting bounded ${Math.round(laneTimeoutMs / 1000)}s lane: ${rel(tree)}`);
  const result = await new Promise(resolve => {
    let child;
    let timeout = null;
    let forceTimeout = null;
    let monitor = null;
    let finished = false;
    let spawnError = null;
    let lastReported = 0;
    const finish = result => {
      if (finished) return;
      finished = true;
      if (timeout) clearTimeout(timeout);
      if (forceTimeout) clearTimeout(forceTimeout);
      if (monitor) clearInterval(monitor);
      try { fs.closeSync(stdoutFd); } catch {}
      try { fs.closeSync(stderrFd); } catch {}
      resolve({ ...result, spawnError });
    };
    const sampleProgress = () => {
      let text = '';
      try { text = fs.readFileSync(progressPath, 'utf8'); } catch {}
      const paths = text.split(/\r?\n/).filter(Boolean);
      record.progressCount = paths.length;
      record.lastProgressPath = paths.at(-1) ?? null;
      if (paths.length - lastReported >= laneProgressInterval || paths.length === fixtureCount) {
        lastReported = paths.length;
        console.log(`[${name}] progress ${paths.length}/${fixtureCount}` +
          (record.lastProgressPath ? ` ${record.lastProgressPath}` : ''));
      }
    };

    try {
      child = spawn(executable, args, {
        cwd: clone, env: safeEnv.env,
        stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
        shell: false,
      });
    } catch (error) {
      spawnError = error?.message ?? String(error);
      finish({ status: null, signal: null, timedOut: false });
      return;
    }
    child.stdout.on('data', chunk => fs.writeSync(stdoutFd, chunk));
    child.stderr.on('data', chunk => fs.writeSync(stderrFd, chunk));
    child.on('error', error => { spawnError = error?.message ?? String(error); });
    monitor = setInterval(sampleProgress, 2000);
    timeout = setTimeout(() => {
      record.timedOut = true;
      try { child.kill('SIGTERM'); } catch {}
      forceTimeout = setTimeout(() => {
        if (!finished) try { child.kill('SIGKILL'); } catch {}
      }, 5000);
    }, laneTimeoutMs);
    child.on('close', (status, signal) => {
      sampleProgress();
      finish({ status, signal, timedOut: record.timedOut });
    });
  });

  record.status = result.status;
  record.signal = result.signal;
  record.timedOut = result.timedOut;
  record.spawnError = result.spawnError;
  record.durationMs = Date.now() - start;
  for (const [key, file] of [['stdout', stdoutPath], ['stderr', stderrPath]]) {
    const bytes = fs.readFileSync(file);
    record[key] = { bytes: bytes.length, sha256: sha(bytes) };
  }
  if (fs.existsSync(outputPath)) {
    const bytes = fs.readFileSync(outputPath);
    record.output = { bytes: bytes.length, sha256: sha(bytes), path: rel(outputPath) };
  } else {
    record.output = null;
  }
  if (result.status !== 0 || result.timedOut || result.spawnError) {
    const diagnostic = result.spawnError ?? `exit=${result.status} signal=${result.signal} timeout=${result.timedOut}`;
    const error = new Error(`${name} matrix lane failed: ${diagnostic}`);
    error.laneRecord = record;
    throw error;
  }
  try {
    assert.ok(record.output, `${name} lane exited successfully without a matrix output`);
    const rows = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    assert.ok(Array.isArray(rows), `${name} lane output is not a row array`);
    assert.equal(rows.length, fixtureCount, `${name} lane did not produce ${fixtureCount} rows`);
    const rowPaths = rows.map(row => row?.file);
    assert.equal(new Set(rowPaths).size, fixtureCount, `${name} lane produced duplicate fixture rows`);
    sameList(rowPaths, expectedFixturePaths, `${name} lane fixture path/order`);
    record.rowCount = rows.length;
    record.uniqueRows = new Set(rowPaths).size;
    record.rowPathsSha256 = sha(Buffer.from(`${rowPaths.join('\n')}\n`, 'utf8'));
    return { record, rows };
  } catch (error) {
    error.laneRecord = record;
    throw error;
  }
}

function compareRows(before, after) {
  assert.equal(before.length, fixtureCount, 'baseline lane row count drifted');
  assert.equal(after.length, fixtureCount, 'final clone lane row count drifted');
  const leftPaths = before.map(row => row.file);
  const rightPaths = after.map(row => row.file);
  sameList(leftPaths, rightPaths, 'matrix row paths/order');
  assert.equal(new Set(leftPaths).size, fixtureCount, 'matrix rows are not unique');
  for (let index = 0; index < fixtureCount; index += 1) {
    const left = Buffer.from(JSON.stringify(before[index]), 'utf8');
    const right = Buffer.from(JSON.stringify(after[index]), 'utf8');
    if (!left.equals(right)) fail(`matrix row differs byte-for-byte: ${leftPaths[index]}`);
  }
}

function createRunDirectory(runId) {
  assertCanonicalDirectory(root, 'repository root');
  assertCanonicalDirectory(artifactRoot, 'ignored toolchain artifact root');
  const prospective = path.join(runParent, runId, 'receipt.json');
  const checkEnv = { ...process.env };
  for (const key of Object.keys(checkEnv)) if (/^GIT_/i.test(key)) delete checkEnv[key];
  Object.assign(checkEnv, { GIT_OPTIONAL_LOCKS: '0', GIT_CONFIG_NOSYSTEM: '1' });
  const ignored = spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '-q', '--', rel(prospective)], {
    cwd: root, env: checkEnv, windowsHide: true, shell: false,
  });
  assert.equal(ignored.status, 0, 'final matrix evidence path is not Git-ignored');
  fs.mkdirSync(runParent, { recursive: true });
  assertCanonicalDirectory(runParent, 'final matrix output parent');
  const runDir = path.join(runParent, runId);
  fs.mkdirSync(runDir, { recursive: false });
  assert.equal(fs.realpathSync(runDir), runDir, 'unique evidence directory must be canonical');
  return runDir;
}

async function main() {
  const runId = `${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}-${process.pid}-${randomUUID()}`;
  const runDir = createRunDirectory(runId);
  const receiptPath = path.join(runDir, 'receipt.json');
  const inputArgs = process.argv.slice(2);
  const receipt = {
    schema: 'rift-bend-final-matrix-2028/1',
    runId,
    startedAt: new Date().toISOString(),
    status: 'running',
    scope: 'Two independent local compiler/checker lanes over the exact 647 Bend fixtures; a differential matrix, not proof, execution, native, browser, GUI, or GPU acceptance.',
    policy: {
      directProviderCommands: 0,
      networkInstrumented: false,
      noGpu: true,
      pinnedToolchainMutation: false,
      finalCloneMutation: false,
      frozenInputMutation: false,
      gitMutation: false,
      timeoutMsPerFreshLane: laneTimeoutMs,
      fixtureGroups: groups,
      fixtureCount,
    },
    arguments: { argv: inputArgs },
    runtime: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      executable: nodeExecutable,
      executableSha256: sha(fs.readFileSync(nodeExecutable)),
      driver: rel(driverPath),
      driverSha256: sha(fs.readFileSync(driverPath)),
      matrixScriptExpectedSha256: matrixSha256,
      nodeFlags: ['--stack-size=4096', '--experimental-strip-types'],
    },
    inputs: null,
    sourcesBefore: null,
    fixturesBefore: null,
    lanes: [],
    comparison: null,
    sourcesAfter: null,
    fixturesAfter: null,
    firstFailure: null,
  };
  let integrityBefore = null;
  let clone = null;
  let finalFiles = null;
  let baselineRows = null;
  let cloneRows = null;
  const firstFailure = error => {
    if (receipt.firstFailure) return;
    receipt.firstFailure = {
      name: error?.name ?? 'Error',
      message: error?.message ?? String(error),
    };
  };

  try {
    assert.equal(inputArgs.length, 3,
      'usage: node verify-final-matrix-2028.mjs --replay-receipt <receipt.json> <expected-sha256>');
    assert.equal(inputArgs[0], '--replay-receipt', 'expected --replay-receipt argument');
    const replayPath = path.resolve(root, inputArgs[1]);
    const expectedSha = inputArgs[2];
    const verified = validateReplayReceipt(replayPath, expectedSha);
    clone = verified.clone;
    finalFiles = verified.finalFiles;
    receipt.inputs = {
      replayReceipt: rel(replayPath),
      replayReceiptSha256: verified.replayReceiptSha256,
      upstream,
      finalClone: rel(clone),
      baseline: rel(baseline),
      finalInputCount: Object.keys(finalFiles).length,
      matrixScriptSha256: matrixSha256,
      baselineAfter005CanonicalSha256: after005,
    };
    validateBaseline();
    const matrixScript = safeProjectFile(clone, 'tests/workers/regression_matrix.mjs');
    assert.equal(sha(fs.readFileSync(matrixScript)), matrixSha256,
      'clone-local regression matrix script changed before execution');
    integrityBefore = captureIntegrity(clone, finalFiles);
    sameMap(integrityBefore.fixtureHashes.baseline.files,
      integrityBefore.fixtureHashes.finalClone.files,
      'baseline/final fixture path/hash manifests before replay');
    receipt.sourcesBefore = integrityBefore.sourceHashes;
    receipt.fixturesBefore = {
      count: fixtureCount,
      groups,
      roots: {
        baseline: { sha256: fixtureDigest(integrityBefore.fixtureHashes.baseline),
          files: integrityBefore.fixtureHashes.baseline.files },
        finalClone: { sha256: fixtureDigest(integrityBefore.fixtureHashes.finalClone),
          files: integrityBefore.fixtureHashes.finalClone.files },
      },
    };
    receipt.evidenceDirectory = rel(runDir);
    console.log(`[preflight] verified final replay ${verified.replayReceiptSha256}; 28 source inputs and 647 matching fixture hashes bound`);

    for (const lane of [
      { name: 'baseline', tree: baseline },
      { name: 'final-clone', tree: clone },
    ]) {
      const current = captureIntegrity(clone, finalFiles);
      assertCaptureUnchanged(current, integrityBefore, `pre-${lane.name}`);
      let result;
      try {
        result = await runLane({ ...lane, clone, runDir, executable: nodeExecutable,
          expectedFixturePaths: Object.keys(integrityBefore.fixtureHashes.baseline.files) });
      } catch (error) {
        if (error?.laneRecord) receipt.lanes.push(error.laneRecord);
        throw error;
      }
      receipt.lanes.push(result.record);
      if (lane.name === 'baseline') baselineRows = result.rows;
      else cloneRows = result.rows;
      const afterLane = captureIntegrity(clone, finalFiles);
      assertCaptureUnchanged(afterLane, integrityBefore, `post-${lane.name}`);
    }

    compareRows(baselineRows, cloneRows);
    receipt.comparison = {
      passed: true,
      rows: fixtureCount,
      uniqueRows: fixtureCount,
      byteIdenticalRows: fixtureCount,
      baselineOutputSha256: receipt.lanes[0].output.sha256,
      finalCloneOutputSha256: receipt.lanes[1].output.sha256,
      outputsByteIdentical: receipt.lanes[0].output.sha256 === receipt.lanes[1].output.sha256,
    };
    assert.equal(receipt.comparison.outputsByteIdentical, true,
      'serialized matrix outputs differ despite row-wise equality');
  } catch (error) {
    firstFailure(error);
  } finally {
    if (clone && finalFiles && integrityBefore) {
      try {
        const after = captureIntegrity(clone, finalFiles);
        receipt.sourcesAfter = after.sourceHashes;
        receipt.fixturesAfter = {
          count: fixtureCount,
          groups,
          roots: {
            baseline: { sha256: fixtureDigest(after.fixtureHashes.baseline),
              files: after.fixtureHashes.baseline.files },
            finalClone: { sha256: fixtureDigest(after.fixtureHashes.finalClone),
              files: after.fixtureHashes.finalClone.files },
          },
        };
        assertCaptureUnchanged(after, integrityBefore, 'final');
      } catch (error) {
        firstFailure(error);
      }
    }
    receipt.completedAt = new Date().toISOString();
    receipt.durationMs = Date.now() - Date.parse(receipt.startedAt);
    receipt.status = receipt.firstFailure ? 'failure' : 'success';
    receipt.receiptPath = rel(receiptPath);
    try {
      fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' });
      const receiptSha = sha(fs.readFileSync(receiptPath));
      console.log(`[${receipt.status}] receipt ${rel(receiptPath)} sha256=${receiptSha}`);
    } catch (error) {
      console.error(`Unable to preserve final matrix receipt: ${error?.message ?? String(error)}`);
      if (!receipt.firstFailure) receipt.firstFailure = { name: error?.name ?? 'Error', message: error?.message ?? String(error) };
      process.exitCode = 1;
      return;
    }
  }

  if (receipt.firstFailure) {
    console.error(`[failure] ${receipt.firstFailure.message}`);
    process.exitCode = 1;
  }
}

await main();
