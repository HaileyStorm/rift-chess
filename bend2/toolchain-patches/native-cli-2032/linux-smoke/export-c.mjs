import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import {
  BASE_APP_COMMIT, BEND_RELEASE, CANONICAL_PIN, EXPECTED_C, HERE,
  ORIGINAL_SOURCE_HASHES, ROOT, SOURCE_HASHES, assertRealDirectory, assertRegularFile,
  assertRunDirectory, bindLinuxNode, createRunDirectory, gitText, helperPath, isolatedEnvironment,
  expectedCandidateSources, makeExclusiveDirectory, readAndValidateInputFiles, readBlobs, readSafeJson,
  parseExportArguments, readTreeBendSources, runOwnedProcess, sha256Bytes, sha256File,
  snapshotToolchainStack, walkCandidate,
  writeExclusive, writeJsonExclusive,
} from './common.mjs';

process.env.BEND_NO_TELEMETRY = '1';
const scriptPath = fileURLToPath(import.meta.url);
const commonPath = path.join(HERE, 'common.mjs');
const nativePatchRelative = 'bend2/toolchain-patches/native-cli-2032/0001-adapt-io-args-2032.patch';
const consumersPatchRelative = 'bend2/toolchain-patches/native-cli-2032/consumers/0001-consumer-args-2032.patch';

function expectedPatchPaths(relative, expectedPaths) {
  const file = helperPath(relative);
  assertRegularFile(file);
  const text = fs.readFileSync(file, 'utf8');
  const paths = [...text.matchAll(/^diff --git a\/([^\s]+) b\/([^\s]+)$/gm)].map((match) => {
    assert.equal(match[1], match[2], `patch source/target differ: ${relative}`);
    return match[1];
  }).sort();
  assert.deepEqual(paths, [...expectedPaths].sort(), `patch target scope changed: ${relative}`);
  return paths;
}

function applyBoundPatch(runDirectory, identity, candidate, relativePatch, expectedTargets) {
  expectedPatchPaths(relativePatch, expectedTargets);
  const patch = helperPath(relativePatch);
  const directory = path.relative(ROOT, candidate).split(path.sep).join('/');
  assert.ok(directory && !directory.startsWith('../') && !path.isAbsolute(directory),
    'candidate patch directory escaped the repository');
  const common = ['apply', '--unidiff-zero', `--directory=${directory}`];
  const check = spawnSync('git', [...common, '--check', patch], {
    cwd: ROOT, encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(check.error, undefined, String(check.error));
  assert.equal(check.status, 0, `patch preflight failed: ${String(check.stderr ?? '').slice(-1200)}`);
  const applied = spawnSync('git', [...common, patch], {
    cwd: ROOT, encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(applied.error, undefined, String(applied.error));
  assert.equal(applied.status, 0, `patch application failed: ${String(applied.stderr ?? '').slice(-1200)}`);
  assertRunDirectory(runDirectory, identity);
}

function ensureSourceParents(candidate, relative) {
  const components = relative.split('/');
  let current = candidate;
  for (const component of components.slice(0, -1)) {
    current = path.join(current, component);
    try { assertRealDirectory(current); }
    catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      fs.mkdirSync(current, { mode: 0o700 });
      assertRealDirectory(current);
    }
  }
}

function assertCandidateSource(candidate, baseFileHashes, patched) {
  const current = walkCandidate(candidate);
  const expectedFiles = expectedCandidateSources(baseFileHashes, patched);
  const expectedPaths = Object.keys(expectedFiles).sort();
  assert.deepEqual(Object.keys(current.files).sort(), expectedPaths,
    'candidate source file set changed from the exact base commit');
  for (const relative of expectedPaths) {
    assert.equal(current.files[relative], expectedFiles[relative],
      `candidate Bend source changed: ${relative}`);
  }
  return current.files;
}

function assertCandidateDirectories(candidate, sourceFiles) {
  const expected = new Set();
  for (const relative of Object.keys(sourceFiles)) {
    const parts = relative.split('/');
    for (let index = 1; index < parts.length; index++) expected.add(parts.slice(0, index).join('/'));
  }
  const actual = walkCandidate(candidate).directories;
  assert.deepEqual(actual, [...expected].sort(), 'candidate contains an unbound/empty directory');
}

function materializeCandidate(runDirectory, entries, blobs) {
  const candidate = makeExclusiveDirectory(runDirectory, 'candidate');
  const baseFileHashes = {};
  for (const { relative, object } of entries) {
    const bytes = blobs.get(object);
    assert.ok(bytes, `missing base Bend blob: ${relative}`);
    const digest = sha256Bytes(bytes);
    baseFileHashes[relative] = digest;
    if (Object.hasOwn(ORIGINAL_SOURCE_HASHES, relative)) {
      assert.equal(digest, ORIGINAL_SOURCE_HASHES[relative], `base application source changed: ${relative}`);
    }
    ensureSourceParents(candidate, relative);
    const target = path.join(candidate, ...relative.split('/'));
    writeExclusive(target, bytes);
  }
  assertCandidateSource(candidate, baseFileHashes, false);
  return { candidate, baseFileHashes };
}

function sourceClosure(candidate, derived, seen, candidateSources, derivedBase) {
  const base = fs.realpathSync(path.join(derived, 'bend2/base.bend'));
  assert.equal(base, derivedBase, 'derived Base identity changed');
  const closure = [];
  for (const file of seen.keys()) {
    const real = fs.realpathSync(file);
    assertRegularFile(real);
    assert.equal(real, file, 'loaded Bend source path changed identity');
    if (real === base) {
      closure.push(['<derived>/bend2/base.bend', sha256File(real)]);
      continue;
    }
    const relative = path.relative(candidate, real);
    assert.ok(relative !== '..' && !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative), `loaded Bend source escaped the materialized candidate: ${real}`);
    const normalized = relative.replaceAll('\\', '/');
    assert.equal(candidateSources[normalized], sha256File(real), `loaded source is not bound: ${normalized}`);
    closure.push([normalized, candidateSources[normalized]]);
  }
  closure.sort(([left], [right]) => left.localeCompare(right));
  assert.equal(closure.length, seen.size, 'duplicate loaded source identity');
  assert.equal(new Set(closure.map(([file]) => file)).size, closure.length, 'duplicate loaded source path');
  return closure;
}

async function runChild(runDirectory, identity) {
  const nodeRuntime = bindLinuxNode({ child: true });
  assertRunDirectory(runDirectory, identity);
  const tmp = path.join(runDirectory, 'tmp');
  const home = path.join(runDirectory, 'home');
  assertRealDirectory(tmp);
  assertRealDirectory(home);
  let stage = 'source-input-preflight';
  const partial = { schema: 'rift-native-cli-2032-linux-c-export-failure/1', ok: false,
    runDirectory, stage, hostPlatform: process.platform };
  try {
    const sourceScripts = { common: sha256File(commonPath), exporter: sha256File(scriptPath) };
    const inputFiles = readAndValidateInputFiles();
    const toolchain = snapshotToolchainStack();
    assert.equal(toolchain.scout.head, BEND_RELEASE);
    assert.equal(toolchain.derived.head, BEND_RELEASE);
    assert.equal(toolchain.canonical.head, CANONICAL_PIN);
    const commit = gitText(ROOT, ['rev-parse', BASE_APP_COMMIT]);
    assert.equal(commit, BASE_APP_COMMIT, 'base app commit identity changed');
    const baseTree = gitText(ROOT, ['rev-parse', `${BASE_APP_COMMIT}^{tree}`]);
    const entries = readTreeBendSources();
    const blobs = readBlobs(entries.map(({ object }) => object));
    stage = 'candidate-materialization';
    partial.stage = stage;
    const { candidate, baseFileHashes } = materializeCandidate(runDirectory, entries, blobs);
    const patchPaths = {
      native: expectedPatchPaths(nativePatchRelative, ['bend2/NativeCLI.bend']),
      consumers: expectedPatchPaths(consumersPatchRelative, Object.keys(SOURCE_HASHES)
        .filter((relative) => relative !== 'bend2/NativeCLI.bend')),
    };
    stage = 'patch-application';
    partial.stage = stage;
    applyBoundPatch(runDirectory, identity, candidate, nativePatchRelative, patchPaths.native);
    applyBoundPatch(runDirectory, identity, candidate, consumersPatchRelative, patchPaths.consumers);
    const candidateSources = assertCandidateSource(candidate, baseFileHashes, true);
    assertCandidateDirectories(candidate, candidateSources);
    const before = { inputFiles, toolchain, candidateSources, sourceScripts };
    stage = 'source-check-and-local-c-emission';
    partial.stage = stage;
    let fetches = 0;
    globalThis.fetch = async () => {
      fetches++;
      throw new Error('network denied by the Linux NativeCLI smoke source gate');
    };
    const derived = path.join(ROOT, '.artifacts/bend2/toolchain-patches/derived-2032');
    const derivedBase = fs.realpathSync(path.join(derived, 'bend2/base.bend'));
    const Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
    const book = Bend.book_nil();
    const seen = new Map();
    await Bend.book_load(book, path.join(candidate, 'bend2/NativeCLI.bend'), '', seen);
    Bend.book_valid(book);
    assert.equal(book.hols, 0, 'NativeCLI source contains holes');
    assert.equal(book.tlds.main?.$, 'Def', 'NativeCLI entry point was not loaded');
    const closure = sourceClosure(candidate, derived, seen, candidateSources, derivedBase);
    assert.equal(seen.size, 17, 'NativeCLI import closure size changed');
    assert.equal(book.order.length, 1232, 'NativeCLI definition count changed');
    assert.equal(fetches, 0, 'source loading attempted network fetch');
    const Comp = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')).href);
    const cText = Comp.compile_book(book);
    const cBytes = Buffer.from(cText, 'utf8');
    const cSha256 = sha256Bytes(cBytes);
    const includesX11 = cText.includes('#include <X11/');
    const includesAlsa = cText.includes('#include <alsa/');
    const bangs = !/^#define BANGS\s+0$/m.test(cText);
    partial.emittedC = { bytes: cBytes.length, sha256: cSha256 };
    assert.equal(cBytes.length, EXPECTED_C.bytes, 'Linux-emitted C byte length differs from the known candidate');
    assert.equal(cSha256, EXPECTED_C.sha256,
      `Linux-emitted C differs from the known candidate digest: expected ${EXPECTED_C.sha256}, got ${cSha256}`);
    assert.equal(includesX11, false, 'CLI C contains an X11 include');
    assert.equal(includesAlsa, false, 'CLI C contains an ALSA include');
    assert.equal(bangs, false, 'CLI C enables GPU BANGS');
    assert.equal(fetches, 0, 'compiler emission attempted network fetch');
    assert.deepEqual(readAndValidateInputFiles(), before.inputFiles,
      'patch, helper or source-gate input changed during C emission');
    assert.deepEqual(snapshotToolchainStack(), before.toolchain,
      'pristine scout, derived compiler or canonical pin changed during C emission');
    assert.deepEqual(assertCandidateSource(candidate, baseFileHashes, true), before.candidateSources,
      'candidate source changed during C emission');
    assert.deepEqual({ common: sha256File(commonPath), exporter: sha256File(scriptPath) },
      before.sourceScripts, 'Linux source exporter changed during C emission');
    const sourceBinding = {
      candidateBaseCommit: commit, candidateBaseTree: baseTree,
      candidateSourceSha256: candidateSources, loadedClosure: closure,
      toolchain, inputFiles, sourceScripts,
    };
    const bindingSha256 = sha256Bytes(Buffer.from(JSON.stringify(sourceBinding), 'utf8'));
    const receipt = {
      schema: 'rift-native-cli-2032-linux-c-export/1', ok: true,
      evidenceClass: 'source-bound-linux-c-export',
      host: { platform: process.platform, arch: process.arch, node: nodeRuntime },
      candidate: {
        baseCommit: commit, baseTree, directory: 'candidate',
        representation: 'ignored materialized Bend-source tree; no Git metadata or tracked-checkout claim',
        bendSourceFiles: entries.length, sourceSha256: candidateSources,
      },
      upstreamBendCommit: BEND_RELEASE, canonicalBendPinUnchanged: CANONICAL_PIN,
      patchTargets: patchPaths, sourceBindingSha256: bindingSha256,
      toolchain, inputFiles, sourceScripts,
      source: {
        entry: 'bend2/NativeCLI.bend', sha256: candidateSources['bend2/NativeCLI.bend'],
        loadedFiles: seen.size, definitions: book.order.length, holes: book.hols,
        fetches, closure: Object.fromEntries(closure),
      },
      emittedC: {
        file: 'NativeCLI.c', bytes: cBytes.length, sha256: cSha256,
        includesX11, includesAlsa, bangs, generatedLocally: true,
      },
      nativeBinaryBuilt: false, nativeRuntimeTested: false,
      scope: 'exact 2.0.32 NativeCLI source check and locally emitted C only; no native, GUI, PCM, GPU, frozen proof, pin or release acceptance',
    };
    stage = 'exclusive-c-artifact-write';
    partial.stage = stage;
    const cPath = path.join(runDirectory, 'NativeCLI.c');
    assertRunDirectory(runDirectory, identity);
    const written = writeExclusive(cPath, cBytes);
    assert.deepEqual(written, { bytes: EXPECTED_C.bytes, sha256: EXPECTED_C.sha256 });
    assertRegularFile(cPath);
    assert.equal(sha256File(cPath), EXPECTED_C.sha256);
    assert.deepEqual(readAndValidateInputFiles(), before.inputFiles,
      'source input changed during C file write');
    assert.deepEqual(snapshotToolchainStack(), before.toolchain,
      'toolchain stack changed during C file write');
    assert.deepEqual(assertCandidateSource(candidate, baseFileHashes, true), before.candidateSources,
      'candidate source changed during C file write');
    assertRunDirectory(runDirectory, identity);
    writeJsonExclusive(path.join(runDirectory, 'source-export.json'), receipt);
    partial.ok = true;
    partial.stage = 'complete';
    return receipt;
  } catch (error) {
    partial.stage = stage;
    partial.error = String(error?.message ?? error).slice(0, 2000);
    partial.workerMayBeLive = false;
    try {
      assertRunDirectory(runDirectory, identity);
      writeJsonExclusive(path.join(runDirectory, 'export-failure.json'), partial);
    }
    catch { }
    throw error;
  }
}

async function main() {
  const nodeRuntime = bindLinuxNode({ child: process.argv[2] === '--child' });
  if (process.argv[2] === '--child') {
    assert.equal(process.argv.length, 6, 'internal export child arguments are malformed');
    const runDirectory = path.resolve(process.argv[3]);
    const identity = { dev: process.argv[4], ino: process.argv[5] };
    const receipt = await runChild(runDirectory, identity);
    process.stdout.write(`${JSON.stringify(receipt)}\n`);
    return;
  }
  parseExportArguments(process.argv.slice(2));
  const { directory: runDirectory, identity } = createRunDirectory();
  makeExclusiveDirectory(runDirectory, 'tmp');
  makeExclusiveDirectory(runDirectory, 'home');
  let childResult;
  try {
    childResult = await runOwnedProcess(process.execPath,
      ['--max-old-space-size=512', scriptPath, '--child', runDirectory, identity.dev, identity.ino], {
        cwd: ROOT, env: isolatedEnvironment(runDirectory), timeoutMs: 300_000,
        maxOutputBytes: 128 * 1024, label: 'Linux source-bound C exporter',
      });
    assertRunDirectory(runDirectory, identity);
    writeExclusive(path.join(runDirectory, 'export-child.stdout.txt'), childResult.stdout);
    writeExclusive(path.join(runDirectory, 'export-child.stderr.txt'), childResult.stderr);
    const receipt = JSON.parse(childResult.stdout.toString('utf8'));
    assert.equal(receipt.ok, true);
    assert.equal(receipt.candidate.baseCommit, BASE_APP_COMMIT);
    assert.deepEqual(receipt.emittedC, {
      file: 'NativeCLI.c', bytes: EXPECTED_C.bytes, sha256: EXPECTED_C.sha256,
      includesX11: false, includesAlsa: false, bangs: false, generatedLocally: true,
    });
    assert.deepEqual(readSafeJson(path.join(runDirectory, 'source-export.json')), receipt,
      'source receipt differs from supervised exporter result');
    assertRunDirectory(runDirectory, identity);
    writeJsonExclusive(path.join(runDirectory, 'export-process.json'), {
      schema: 'rift-native-cli-2032-linux-export-process/1', ok: true,
      child: { pid: childResult.pid, status: childResult.status, signal: childResult.signal,
        durationMs: childResult.durationMs },
      parentNode: nodeRuntime,
      runDirectory,
      sourceExportSha256: sha256File(path.join(runDirectory, 'source-export.json')),
      cSha256: sha256File(path.join(runDirectory, 'NativeCLI.c')),
    });
    process.stdout.write(`${JSON.stringify({ ok: true, runDirectory,
      sourceExportSha256: sha256File(path.join(runDirectory, 'source-export.json')),
      cBytes: EXPECTED_C.bytes, cSha256: EXPECTED_C.sha256,
      next: `node bend2/toolchain-patches/native-cli-2032/linux-smoke/native-smoke.mjs "${runDirectory}" --clang /absolute/path/to/clang-18` })}\n`);
  } catch (error) {
    const result = error?.result;
    try {
      assertRunDirectory(runDirectory, identity);
      if (result) {
        if (!fs.existsSync(path.join(runDirectory, 'export-child.stdout.txt')))
          writeExclusive(path.join(runDirectory, 'export-child.stdout.txt'), result.stdout);
        if (!fs.existsSync(path.join(runDirectory, 'export-child.stderr.txt')))
          writeExclusive(path.join(runDirectory, 'export-child.stderr.txt'), result.stderr);
      }
      writeJsonExclusive(path.join(runDirectory, 'export-process-failure.json'), {
        schema: 'rift-native-cli-2032-linux-export-process-failure/1', ok: false,
        runDirectory, error: String(error?.message ?? error).slice(0, 2000),
        timedOut: error?.timedOut ?? false, workerMayBeLive: error?.workerMayBeLive ?? false,
        child: result ? { pid: result.pid, status: result.status, signal: result.signal,
          durationMs: result.durationMs, outputBytes: result.outputBytes } : null,
      });
    } catch (evidenceError) {
      process.stderr.write(`Could not write export failure evidence: ${String(evidenceError?.message ?? evidenceError)}\n`);
    }
    process.stderr.write(`Linux source/C export failed; partial evidence retained at ${runDirectory}: ${String(error?.message ?? error)}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(scriptPath)) {
  main().catch((error) => {
    process.stderr.write(`${String(error?.stack ?? error).slice(0, 3000)}\n`);
    process.exitCode = 1;
  });
}
