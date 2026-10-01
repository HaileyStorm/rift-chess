import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import {
  BASE_APP_COMMIT, CANONICAL_PIN, EXPECTED_C, HERE, ROOT, assertPassthroughStderr,
  SCENARIOS, SOURCE_HASHES, WRITE_RESTART_STEPS, assertLinuxCBytes, assertRealDirectory,
  assertRunDirectory, assertRegularFile, bindLinuxNode, clangCompileArguments, isolatedEnvironment,
  gitText, makeExclusiveDirectory, parseNativeArguments, readAndValidateInputFiles,
  readBlobs, readSafeJson, readTreeBendSources, runOwnedProcess, safeEntries,
  sha256Bytes, sha256File,
  snapshotToolchainStack, walkCandidate, writeExclusive, writeJsonExclusive,
} from './common.mjs';

process.env.BEND_NO_TELEMETRY = '1';
const scriptPath = fileURLToPath(import.meta.url);
const commonPath = path.join(HERE, 'common.mjs');

function assertAbsent(file) {
  try { fs.lstatSync(file); }
  catch (error) { if (error?.code === 'ENOENT') return; throw error; }
  throw new Error(`refuse to overwrite existing evidence or output: ${file}`);
}

function assertCandidateTree(candidate, receipt) {
  const current = walkCandidate(candidate);
  const tree = gitText(ROOT, ['rev-parse', `${BASE_APP_COMMIT}^{tree}`]);
  assert.equal(tree, receipt.candidate.baseTree, 'base application tree object changed');
  const entries = readTreeBendSources();
  const blobs = readBlobs(entries.map(({ object }) => object));
  const original = Object.fromEntries(entries.map(({ relative, object }) =>
    [relative, sha256Bytes(blobs.get(object))]));
  const expected = Object.fromEntries(Object.keys(original).sort().map((relative) =>
    [relative, SOURCE_HASHES[relative] ?? original[relative]]));
  assert.deepEqual(Object.keys(receipt.candidate.sourceSha256).sort(), Object.keys(expected).sort(),
    'source receipt does not bind every tracked Bend source in the base tree');
  assert.deepEqual(receipt.candidate.sourceSha256, expected,
    'source receipt Bend inputs differ from the exact base commit and patch postimages');
  assert.deepEqual(current.files, expected, 'materialized app-source bytes changed after C export');
  assert.equal(Object.keys(current.files).length, receipt.candidate.bendSourceFiles);
  for (const [relative, expected] of Object.entries(SOURCE_HASHES)) {
    assert.equal(current.files[relative], expected, `patched app entry changed: ${relative}`);
  }
  const expectedDirectories = new Set();
  for (const relative of Object.keys(current.files)) {
    const parts = relative.split('/');
    for (let index = 1; index < parts.length; index++) expectedDirectories.add(parts.slice(0, index).join('/'));
  }
  assert.deepEqual(current.directories, [...expectedDirectories].sort(),
    'materialized candidate contains an unbound/empty directory');
}

function assertSourceReceipt(runDirectory) {
  const receiptPath = path.join(runDirectory, 'source-export.json');
  const processPath = path.join(runDirectory, 'export-process.json');
  assertRegularFile(receiptPath);
  assertRegularFile(processPath);
  const receiptHash = sha256File(receiptPath);
  const processHash = sha256File(processPath);
  const receipt = readSafeJson(receiptPath);
  const exporter = readSafeJson(processPath);
  assert.equal(receipt.schema, 'rift-native-cli-2032-linux-c-export/1');
  assert.equal(receipt.ok, true);
  assert.equal(receipt.evidenceClass, 'source-bound-linux-c-export');
  assert.equal(receipt.host.platform, 'linux');
  assert.equal(receipt.candidate.baseCommit, BASE_APP_COMMIT);
  assert.equal(receipt.candidate.representation,
    'ignored materialized Bend-source tree; no Git metadata or tracked-checkout claim');
  assert.equal(receipt.upstreamBendCommit, '573002f01ec6c52416d44489543f69a9625facf8');
  assert.equal(receipt.canonicalBendPinUnchanged, CANONICAL_PIN);
  assert.equal(receipt.source.entry, 'bend2/NativeCLI.bend');
  assert.equal(receipt.source.sha256, SOURCE_HASHES['bend2/NativeCLI.bend']);
  assert.equal(receipt.source.loadedFiles, 17);
  assert.equal(receipt.source.definitions, 1232);
  assert.equal(receipt.source.holes, 0);
  assert.equal(receipt.source.fetches, 0);
  assert.equal(receipt.emittedC.bytes, EXPECTED_C.bytes);
  assert.equal(receipt.emittedC.sha256, EXPECTED_C.sha256);
  assert.equal(receipt.emittedC.newlineMode, EXPECTED_C.newlineMode);
  assert.equal(receipt.emittedC.generatedLocally, true);
  assert.equal(receipt.nativeBinaryBuilt, false);
  assert.deepEqual(receipt.inputFiles, readAndValidateInputFiles(), 'source-bound patch/test inputs changed');
  assert.deepEqual(receipt.toolchain, snapshotToolchainStack(),
    'pristine scout, derived compiler or canonical pin changed after C export');
  assert.deepEqual(receipt.sourceScripts, {
    common: sha256File(commonPath), exporter: sha256File(path.join(HERE, 'export-c.mjs')),
  }, 'source exporter code changed after C export');
  const candidate = path.join(runDirectory, receipt.candidate.directory);
  assertCandidateTree(candidate, receipt);
  const closure = Object.entries(receipt.source.closure).sort(([a], [b]) => a.localeCompare(b));
  assert.equal(closure.length, 17, 'source receipt closure size changed');
  const derivedBase = path.join(ROOT, '.artifacts/bend2/toolchain-patches/derived-2032/bend2/base.bend');
  for (const [relative, digest] of closure) {
    if (relative === '<derived>/bend2/base.bend') {
      assert.equal(digest, receipt.toolchain.derived.base.sha256, 'derived Base closure hash changed');
    } else {
      assert.ok(relative.startsWith('bend2/') && !path.isAbsolute(relative) &&
        relative.split('/').every((part) => part && part !== '.' && part !== '..'),
      `unsafe source closure path: ${relative}`);
      assert.equal(receipt.candidate.sourceSha256[relative], digest,
        `source closure is not bound to the materialized candidate: ${relative}`);
      assertRegularFile(path.join(candidate, ...relative.split('/')));
    }
  }
  assert.equal(closure.filter(([relative]) => relative === '<derived>/bend2/base.bend').length, 1,
    'source closure must contain exactly one derived Base');
  assertRegularFile(derivedBase);
  const binding = {
    candidateBaseCommit: receipt.candidate.baseCommit,
    candidateBaseTree: receipt.candidate.baseTree,
    candidateSourceSha256: receipt.candidate.sourceSha256,
    loadedClosure: closure,
    toolchain: receipt.toolchain,
    inputFiles: receipt.inputFiles,
    sourceScripts: receipt.sourceScripts,
  };
  assert.equal(sha256Bytes(Buffer.from(JSON.stringify(binding), 'utf8')),
    receipt.sourceBindingSha256, 'source binding digest does not match its recorded inputs');
  const cSource = path.join(runDirectory, receipt.emittedC.file);
  assertRegularFile(cSource);
  assertLinuxCBytes(fs.readFileSync(cSource));
  assert.equal(exporter.schema, 'rift-native-cli-2032-linux-export-process/1');
  assert.equal(exporter.ok, true);
  assert.equal(exporter.runDirectory, runDirectory);
  assert.equal(exporter.sourceExportSha256, receiptHash);
  assert.equal(exporter.cSha256, EXPECTED_C.sha256);
  assert.equal(receiptPath, path.join(runDirectory, 'source-export.json'));
  return { receipt, receiptHash, processHash, cSource };
}

function assertCompilerTarget(target) {
  const normalized = target.trim();
  assert.ok(normalized.includes('linux'), `Clang target is not Linux: ${normalized}`);
  const arch = process.arch;
  const expected = {
    x64: /^(x86_64|amd64)-/i,
    arm64: /^(aarch64|arm64)-/i,
    x86: /^(i[3-6]86|x86)-/i,
    arm: /^arm[^-]*-/i,
    riscv64: /^riscv64-/i,
  }[arch];
  assert.ok(expected, `unsupported Linux CPU architecture: ${arch}`);
  assert.match(normalized, expected, `Clang target does not match this CPU: ${normalized}`);
  return normalized;
}

function assertElf(file) {
  const bytes = Buffer.alloc(20);
  const fd = fs.openSync(file, 'r');
  try { assert.equal(fs.readSync(fd, bytes, 0, bytes.length, 0), bytes.length); }
  finally { fs.closeSync(fd); }
  assert.deepEqual([...bytes.subarray(0, 4)], [0x7f, 0x45, 0x4c, 0x46], 'Clang output is not an ELF binary');
  assert.equal(bytes[5], 1, 'native ELF is not little-endian');
  const machine = bytes.readUInt16LE(18);
  const expected = { x64: 62, arm64: 183, x86: 3, arm: 40, riscv64: 243 }[process.arch];
  assert.equal(machine, expected, 'ELF machine does not match the local Linux CPU');
}

function textOutput(buffer, name) {
  const value = buffer.toString('utf8');
  assert.ok(Buffer.from(value, 'utf8').equals(buffer), `${name} is not valid UTF-8`);
  assert.doesNotMatch(value, /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/,
    `${name} contains unexpected control bytes`);
  return value;
}

function countText(text, pattern) {
  return text.split(pattern).length - 1;
}

function validateScenarioOutput(id, stdout, stderr) {
  const joined = `${stdout}\n${stderr}`;
  assert.doesNotMatch(joined,
    /Both CLI snapshots are invalid|Save failed|Error:|Segmentation fault|permission denied/i,
    `${id} reported an unexpected CLI or runtime error`);
  if (id === 'program-only') {
    assert.equal(stderr, '', 'program-only invocation unexpectedly wrote to stderr');
    assert.equal(countText(stdout, 'Commands:'), 1, 'program-only output shape changed');
    assert.ok(stdout.includes('Layout B') && stdout.includes('White to move') &&
      stdout.includes('LEGAL ACTIONS'), 'program-only invocation did not render the initial CLI state');
    assert.doesNotMatch(stdout, /Unknown command\./, 'program-only invocation unexpectedly dispatched a command');
    return;
  }
  if (id === 'help' || id === 'dash-dash-help-word') {
    assert.equal(stderr, '', 'help invocation unexpectedly wrote to stderr');
    assert.equal(countText(stdout, 'Commands:'), 2, 'help output shape changed');
    assert.ok(stdout.includes('LEGAL ACTIONS'), 'help invocation omitted the initial action list');
    return;
  }
  if (id === 'dash-dash-help') {
    assertPassthroughStderr(stderr);
    assert.equal(countText(stdout, 'Commands:'), 2, 'passthrough help output shape changed');
    assert.ok(stdout.includes('LEGAL ACTIONS'), 'passthrough help omitted the rendered application state');
    return;
  }
  assert.ok(stdout.includes('Layout B') && stdout.includes('White to move'),
    `${id} did not preserve the initial saved game state`);
}

function validateWriteRestartOutput(id, stdout, stderr) {
  assert.equal(stderr, '', `${id} unexpectedly wrote to stderr`);
  assert.doesNotMatch(stdout, /Unknown command\.|Both CLI snapshots are invalid|Save failed|Error:/,
    `${id} reported an unexpected CLI or runtime error`);
  const side = id === '01-new' ? 'White' : 'Black';
  const header = `RIFT CHESS | Layout B | Draws prompt | ${side} to move | quiet 0\n`;
  assert.equal(countText(stdout, 'RIFT CHESS |'), 1, `${id} rendered an unexpected number of game states`);
  assert.ok(stdout.includes(header), `${id} rendered unexpected game state text`);
  if (id === '03-restart-show') {
    assert.equal(countText(stdout, 'LEGAL ACTIONS'), 0, 'show unexpectedly listed actions');
    assert.equal(countText(stdout, 'Commands:'), 0, 'show unexpectedly printed help');
  } else {
    assert.equal(countText(stdout, 'LEGAL ACTIONS'), 1, `${id} action-list output changed`);
    assert.equal(countText(stdout, 'Commands:'), 1, `${id} command-help output changed`);
  }
}

function snapshotSaveDirectory(saveDirectory) {
  const entries = safeEntries(saveDirectory);
  assert.ok(entries.every((entry) => entry.type === 'file'), 'save directory contains nested or special content');
  const expected = ['rift-chess-cli-a.json', 'rift-chess-cli-b.json'];
  assert.deepEqual(entries.map(({ name }) => name), expected,
    'write/restart scenario produced unexpected save files');
  const snapshots = {};
  for (const [name, sequence] of [[expected[0], 1], [expected[1], 2]]) {
    const value = readSafeJson(path.join(saveDirectory, name));
    assert.equal(value.schema, 'rift-bend-cli-store/1', `invalid snapshot schema: ${name}`);
    assert.equal(value.sequence, sequence, `unexpected rotating snapshot sequence: ${name}`);
    assert.ok(typeof value.record === 'string' && value.record.length > 0,
      `snapshot has no portable record: ${name}`);
    snapshots[name] = { sequence: value.sequence, sha256: sha256File(path.join(saveDirectory, name)) };
  }
  return snapshots;
}

async function invoke(binary, args, scenarioDirectory, saveDirectory, id, runDirectory) {
  const stdoutPath = path.join(scenarioDirectory, `${id}.stdout.txt`);
  const stderrPath = path.join(scenarioDirectory, `${id}.stderr.txt`);
  const resultPath = path.join(scenarioDirectory, `${id}.result.json`);
  for (const file of [stdoutPath, stderrPath, resultPath]) assertAbsent(file);
  let result;
  let error;
  try {
    result = await runOwnedProcess(binary, args, {
      cwd: scenarioDirectory,
      env: isolatedEnvironment(runDirectory, {
        RIFT_CHESS_SAVE_DIR: saveDirectory,
      }),
      timeoutMs: 30_000, maxOutputBytes: 1024 * 1024, label: `NativeCLI ${id}`,
    });
  } catch (caught) {
    error = caught;
    result = caught?.result;
  }
  const stdout = result?.stdout ?? Buffer.alloc(0);
  const stderr = result?.stderr ?? Buffer.alloc(0);
  writeExclusive(stdoutPath, stdout);
  writeExclusive(stderrPath, stderr);
  writeJsonExclusive(resultPath, {
    schema: 'rift-native-cli-2032-linux-invocation/1', id,
    args, cwd: scenarioDirectory, saveDirectory,
    status: result?.status ?? null, signal: result?.signal ?? null,
    durationMs: result?.durationMs ?? null, timedOut: error?.timedOut ?? false,
    workerMayBeLive: error?.workerMayBeLive ?? false,
    outputBytes: result?.outputBytes ?? 0,
  });
  if (error) throw error;
  assert.equal(result.status, 0, `${id} exited unsuccessfully`);
  assert.equal(result.signal, null, `${id} ended by signal`);
  return {
    stdout: textOutput(stdout, `${id} stdout`), stderr: textOutput(stderr, `${id} stderr`),
    status: result.status, durationMs: result.durationMs,
  };
}

async function runAndRecord(executable, args, runDirectory, id, options) {
  const stdoutPath = path.join(runDirectory, `${id}.stdout.txt`);
  const stderrPath = path.join(runDirectory, `${id}.stderr.txt`);
  const resultPath = path.join(runDirectory, `${id}.result.json`);
  for (const file of [stdoutPath, stderrPath, resultPath]) assertAbsent(file);
  let result;
  let error;
  try { result = await runOwnedProcess(executable, args, options); }
  catch (caught) { error = caught; result = caught?.result; }
  const stdout = result?.stdout ?? Buffer.alloc(0);
  const stderr = result?.stderr ?? Buffer.alloc(0);
  writeExclusive(stdoutPath, stdout);
  writeExclusive(stderrPath, stderr);
  writeJsonExclusive(resultPath, {
    schema: 'rift-native-cli-2032-linux-tool-process/1', id, executable, args,
    status: result?.status ?? null, signal: result?.signal ?? null,
    durationMs: result?.durationMs ?? null, timedOut: error?.timedOut ?? false,
    workerMayBeLive: error?.workerMayBeLive ?? false,
    outputBytes: result?.outputBytes ?? 0,
  });
  if (error) throw error;
  return result;
}

async function runBasicScenarios(binary, runDirectory) {
  const scenarioRoot = makeExclusiveDirectory(runDirectory, 'scenarios');
  const results = [];
  let directHelpOutput;
  for (const spec of SCENARIOS) {
    const scenarioDirectory = makeExclusiveDirectory(scenarioRoot, spec.id);
    const saveDirectory = makeExclusiveDirectory(scenarioDirectory, 'save');
    const outcome = await invoke(binary, spec.args, scenarioDirectory, saveDirectory, spec.id, runDirectory);
    validateScenarioOutput(spec.id, outcome.stdout, outcome.stderr);
    if (spec.id === 'help') directHelpOutput = outcome.stdout;
    if (spec.id === 'dash-dash-help-word')
      assert.equal(outcome.stdout, directHelpOutput,
        'runtime -- help differs from the same direct application command');
    const files = safeEntries(saveDirectory);
    assert.deepEqual(files, [], `${spec.id} unexpectedly wrote native save data`);
    results.push({ id: spec.id, args: spec.args, status: outcome.status,
      durationMs: outcome.durationMs, saveFiles: [] });
  }
  return { scenarioRoot, results };
}

async function runWriteRestart(binary, runDirectory) {
  const scenarioRoot = path.join(runDirectory, 'scenarios');
  assertRealDirectory(scenarioRoot);
  const directory = makeExclusiveDirectory(scenarioRoot, 'write-restart');
  const saveDirectory = makeExclusiveDirectory(directory, 'save');
  const results = [];
  for (const step of WRITE_RESTART_STEPS) {
    const outcome = await invoke(binary, step.args, directory, saveDirectory, step.id, runDirectory);
    assert.ok(outcome.stdout.includes(step.requiredText[0]), `${step.id} output did not match expected game state`);
    if (step.requiredText[1]) assert.ok(outcome.stdout.includes(step.requiredText[1]), `${step.id} output was incomplete`);
    validateWriteRestartOutput(step.id, outcome.stdout, outcome.stderr);
    if (step.id === '01-new') {
      assert.deepEqual(safeEntries(saveDirectory).map(({ name }) => name), ['rift-chess-cli-a.json'],
        'new-game invocation did not write exactly the first rotating snapshot');
    } else if (step.id === '02-move') {
      assert.deepEqual(safeEntries(saveDirectory).map(({ name }) => name),
        ['rift-chess-cli-a.json', 'rift-chess-cli-b.json'],
      'move invocation did not write exactly the second rotating snapshot');
    }
    results.push({ id: step.id, args: step.args, status: outcome.status,
      durationMs: outcome.durationMs });
  }
  assert.ok(results[1].status === 0 && results[2].status === 0);
  const snapshots = snapshotSaveDirectory(saveDirectory);
  return { id: 'write-restart', saveFiles: snapshots, steps: results };
}

async function main() {
  const nodeRuntime = bindLinuxNode();
  const { runDirectory: requestedRun, clangPath, clangSha256: expectedClangSha } =
    parseNativeArguments(process.argv.slice(2));
  const runDirectory = assertRunDirectory(requestedRun);
  const runnerScriptsBefore = {
    common: sha256File(commonPath),
    exporter: sha256File(path.join(HERE, 'export-c.mjs')),
    nativeSmoke: sha256File(scriptPath),
  };
  const failurePath = path.join(runDirectory, 'native-failure.json');
  const receiptPath = path.join(runDirectory, 'native-receipt.json');
  for (const file of [failurePath, receiptPath, path.join(runDirectory, 'NativeCLI')]) assertAbsent(file);
  const scenarioRoot = path.join(runDirectory, 'scenarios');
  assertAbsent(scenarioRoot);
  let sourceExport;
  try {
    sourceExport = assertSourceReceipt(runDirectory);
    assert.equal(sourceExport.receipt.candidate.baseCommit, BASE_APP_COMMIT);
  } catch (error) {
    writeJsonExclusive(failurePath, {
      schema: 'rift-native-cli-2032-linux-native-failure/1', ok: false,
      runDirectory, stage: 'source-export-preflight', error: String(error?.message ?? error).slice(0, 2400),
      timedOut: false, workerMayBeLive: false,
    });
    process.stderr.write(`Linux native smoke rejected source export; failure evidence retained at ${runDirectory}: ${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
    return;
  }
  const { receipt, receiptHash, processHash, cSource } = sourceExport;
  const env = isolatedEnvironment(runDirectory);
  let stage = 'clang-version';
  const evidence = { schema: 'rift-native-cli-2032-linux-native-failure/1', ok: false,
    runDirectory, sourceExportSha256: receiptHash, clang: null, stage };
  let clangSupplied;
  let clang;
  let clangIdentity;
  try {
    assertRealDirectory(path.join(runDirectory, 'tmp'));
    assertRealDirectory(path.join(runDirectory, 'home'));
    clangSupplied = path.resolve(clangPath);
    clang = fs.realpathSync(clangSupplied);
    assertRegularFile(clang, { executable: true });
    clangIdentity = { supplied: clangSupplied, resolved: clang, sha256: sha256File(clang) };
    evidence.clang = clangIdentity;
    if (expectedClangSha !== undefined) {
      assert.equal(clangIdentity.sha256, expectedClangSha, 'supplied Clang binary SHA-256 differs');
    }
    const version = await runAndRecord(clang, ['--version'], runDirectory, 'clang-version', {
      cwd: runDirectory, env, timeoutMs: 10_000, maxOutputBytes: 64 * 1024,
      label: 'supplied Clang --version',
    });
    assert.equal(version.stderr.length, 0, 'Clang version query wrote unexpected stderr');
    const versionText = `${version.stdout.toString('utf8')}\n${version.stderr.toString('utf8')}`;
    const versionMatch = versionText.match(/clang version\s+(\d+)(?:\.|\s)/i);
    assert.ok(versionMatch, 'supplied compiler did not identify itself as Clang');
    const clangMajor = Number(versionMatch[1]);
    assert.ok(Number.isInteger(clangMajor) && clangMajor >= 18,
      `Clang 18 or newer required; supplied version is ${clangMajor}`);
    const targetResult = await runAndRecord(clang, ['-dumpmachine'], runDirectory, 'clang-target', {
      cwd: runDirectory, env, timeoutMs: 10_000, maxOutputBytes: 4096,
      label: 'supplied Clang target query',
    });
    const target = assertCompilerTarget(targetResult.stdout.toString('utf8'));
    assert.equal(targetResult.stderr.length, 0, 'Clang target query wrote unexpected stderr');
    assert.equal(sha256File(clang), clangIdentity.sha256, 'supplied Clang binary changed during preflight');
    assert.equal(fs.realpathSync(clangSupplied), clang, 'supplied Clang path resolved differently');
    stage = 'compile';
    evidence.stage = stage;
    assertRunDirectory(runDirectory);
    const binary = path.join(runDirectory, 'NativeCLI');
    assertAbsent(binary);
    assertLinuxCBytes(fs.readFileSync(cSource));
    const compileArgs = clangCompileArguments(cSource, binary);
    const compile = await runAndRecord(clang, compileArgs, runDirectory, 'clang-compile', {
        cwd: runDirectory, env, timeoutMs: 180_000, maxOutputBytes: 2 * 1024 * 1024,
        label: 'supplied Clang NativeCLI compile',
      });
    assert.equal(compile.status, 0);
    assert.equal(compile.stdout.length, 0, 'Clang emitted unexpected compile stdout');
    assert.equal(compile.stderr.length, 0, 'Clang emitted unexpected compile diagnostics');
    assert.equal(fs.realpathSync(clangSupplied), clang, 'Clang symlink target changed during compile');
    assert.equal(sha256File(clang), clangIdentity.sha256, 'supplied Clang binary changed during compile');
    assertLinuxCBytes(fs.readFileSync(cSource));
    assertRegularFile(binary, { executable: true });
    assertElf(binary);
    const binarySha = sha256File(binary);
    stage = 'program-only-help-and-argv-cases';
    evidence.stage = stage;
    const basics = await runBasicScenarios(binary, runDirectory);
    stage = 'isolated-save-write-and-restart';
    evidence.stage = stage;
    const writeRestart = await runWriteRestart(binary, runDirectory);
    assert.deepEqual(readAndValidateInputFiles(), receipt.inputFiles,
      'source-bound patches, helpers or test-entry map changed during native run');
    assert.deepEqual(snapshotToolchainStack(), receipt.toolchain,
      'toolchain stack changed during native run');
    assert.deepEqual({ common: sha256File(commonPath),
      exporter: sha256File(path.join(HERE, 'export-c.mjs')),
      nativeSmoke: sha256File(scriptPath) }, runnerScriptsBefore,
    'native-smoke scripts changed during native scenarios');
    assertCandidateTree(path.join(runDirectory, receipt.candidate.directory), receipt);
    assertLinuxCBytes(fs.readFileSync(cSource));
    assert.equal(sha256File(path.join(runDirectory, 'source-export.json')), receiptHash,
      'source export receipt changed during native run');
    assert.equal(sha256File(path.join(runDirectory, 'export-process.json')), processHash,
      'export-process record changed during native run');
    assert.equal(sha256File(clang), clangIdentity.sha256, 'supplied Clang binary changed during native run');
    assert.equal(sha256File(binary), binarySha, 'native executable changed during CLI scenarios');
    const nativeReceipt = {
      schema: 'rift-native-cli-2032-linux-native-smoke/1', ok: true,
      evidenceClass: 'source-bound-linux-cpu-native-cli-smoke',
      sourceExportSha256: receiptHash, exportProcessSha256: processHash,
      sourceBindingSha256: receipt.sourceBindingSha256,
      nodeRuntime,
      runnerScripts: runnerScriptsBefore,
      source: { candidateBaseCommit: receipt.candidate.baseCommit,
        entrySha256: receipt.source.sha256, loadedFiles: receipt.source.loadedFiles,
        definitions: receipt.source.definitions, holes: receipt.source.holes, fetches: receipt.source.fetches },
      compiler: {
        suppliedPath: clangSupplied, resolvedPath: clang, sha256: clangIdentity.sha256,
        version: versionText.trim(), major: clangMajor, target,
        args: { version: ['--version'], target: ['-dumpmachine'], compile: compileArgs },
        compileStatus: compile.status, compileSignal: compile.signal,
      },
      cSource: { bytes: EXPECTED_C.bytes, sha256: EXPECTED_C.sha256,
        newlineMode: EXPECTED_C.newlineMode,
        file: path.basename(cSource), generatedLocally: true },
      nativeBinary: { file: path.basename(binary), sha256: binarySha, format: 'ELF',
        cpuArchitecture: process.arch, threads: 1 },
      scenarios: [...basics.results, writeRestart],
      isolation: { ignoredOutputRoot: '.artifacts/bend2/native-cli-2032-linux',
        runDirectory, perScenarioSaveDirectories: true, environment: 'sanitized; RIFT_CHESS_SAVE_DIR set per case' },
      nativeGuiTested: false, pcmTested: false, gpuTested: false,
      bendProofsRechecked: false, pinAmendment: false, releaseAcceptance: false,
      scope: 'CPU CLI argv, help passthrough, rotating-file write/restart smoke only; no GUI, PCM, GPU, frozen proof, pin or release acceptance',
    };
    assertRunDirectory(runDirectory);
    writeJsonExclusive(receiptPath, nativeReceipt);
    process.stdout.write(`${JSON.stringify({ ok: true, runDirectory,
      nativeReceiptSha256: sha256File(receiptPath), cSha256: EXPECTED_C.sha256,
      binarySha256: binarySha, scenarios: nativeReceipt.scenarios.length })}\n`);
  } catch (error) {
    evidence.stage = stage;
    evidence.error = String(error?.message ?? error).slice(0, 2400);
    evidence.timedOut = error?.timedOut ?? false;
    evidence.workerMayBeLive = error?.workerMayBeLive ?? false;
    if (error?.result) {
      evidence.child = { pid: error.result.pid, status: error.result.status,
        signal: error.result.signal, durationMs: error.result.durationMs,
        outputBytes: error.result.outputBytes };
    }
    try { writeJsonExclusive(failurePath, evidence); } catch { }
    process.stderr.write(`Linux native smoke failed at ${stage}; partial evidence retained at ${runDirectory}: ${evidence.error}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(scriptPath)) {
  main().catch((error) => {
    process.stderr.write(`${String(error?.stack ?? error).slice(0, 3000)}\n`);
    process.exitCode = 1;
  });
}
