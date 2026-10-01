import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  BASE_APP_COMMIT, EXPECTED_C, WINDOWS_C, INPUT_HASHES, LINUX_NODE_SHA256,
  ORIGINAL_SOURCE_HASHES, PASSTHROUGH_STDERR,
  ROOT, SCENARIOS, SOURCE_HASHES, WRITE_RESTART_STEPS, assertLinuxCBytes,
  assertPassthroughStderr, assertRegularFile, clangCompileArguments, expectedCandidateSources,
  parseExportArguments, parseNativeArguments, readAndValidateInputFiles,
  sha256Bytes,
} from './common.mjs';

assert.deepEqual(Object.keys(SOURCE_HASHES).sort(), [
  'bend2/NativeCLI.bend',
  'bend2/lib/graphics/v2/bench/gpu/PlanProfile.bend',
  'bend2/lib/graphics/v2/bench/gpu/PlanReadback.bend',
  'bend2/tests/piece-sprites/BoardSceneSpriteBench.bend',
  'bend2/tests/piece-sprites/DecodePageTest.bend',
  'bend2/tests/piece-sprites/PieceRenderBench.bend',
].sort(), 'source map covers exactly the six patched argv entrypoints');
assert.equal(INPUT_HASHES['bend2/toolchain-patches/native-cli-2032/consumers/test-entries-2032.mjs'],
  '0b6839e4269869d10a48fe15e35b3b30f41ac27f0e969ff404752a8fbd74d17c');
assert.deepEqual(readAndValidateInputFiles(), INPUT_HASHES,
  'versioned patches, helper sources, entry map and EOL helper match their pins');
assert.deepEqual(expectedCandidateSources(ORIGINAL_SOURCE_HASHES, false), ORIGINAL_SOURCE_HASHES,
  'the materialized base must be checked against pre-patch bytes');
assert.deepEqual(expectedCandidateSources(ORIGINAL_SOURCE_HASHES, true), SOURCE_HASHES,
  'only the post-application candidate may be checked against patched bytes');
assert.throws(() => expectedCandidateSources(ORIGINAL_SOURCE_HASHES, undefined),
  /candidate phase must be explicit/);
assert.deepEqual(EXPECTED_C, {
  bytes: 2189657,
  sha256: 'e5bfb78237720399ff8222844e6bf0f4385f0d817d43bc4eaf03c057542421d4',
  newlineMode: 'LF',
});
assert.deepEqual(WINDOWS_C, {
  bytes: 2189927,
  sha256: '373f735cd13c42b2a2f307646bfd08931c93e0fc599c362a12676ffdc4a77281',
  crlfPairs: 270,
});
assert.equal(WINDOWS_C.bytes - EXPECTED_C.bytes, WINDOWS_C.crlfPairs,
  'reviewed cross-host C difference must be exactly one byte per CRLF pair');
assert.throws(() => assertLinuxCBytes('not raw C bytes'), /raw bytes/);
assert.throws(() => assertLinuxCBytes(Buffer.from('different output\n')), /byte length/);
assert.throws(() => assertLinuxCBytes(Buffer.alloc(EXPECTED_C.bytes, 10)), /reviewed LF digest/);
const nativeBase = execFileSync('git', ['-C', ROOT, 'show',
  `${BASE_APP_COMMIT}:bend2/NativeCLI.bend`], { timeout: 30_000, maxBuffer: 4 * 1024 * 1024 });
assert.equal(sha256Bytes(nativeBase), ORIGINAL_SOURCE_HASHES['bend2/NativeCLI.bend'],
  'pinned base NativeCLI bytes differ');
assert.match(nativeBase.toString('utf8'),
  /IO\.print_err\("Unknown command\.\\n"\)/,
  'the pinned base candidate no longer supplies the explicit LF');
assert.equal(PASSTHROUGH_STDERR, 'Unknown command.\n\n');
assert.doesNotThrow(() => assertPassthroughStderr(PASSTHROUGH_STDERR));
assert.throws(() => assertPassthroughStderr('Unknown command.\n'),
  /unexpected exact stderr/);
if (process.env.BEND_REVIEW_WINDOWS_C) {
  const file = path.resolve(process.env.BEND_REVIEW_WINDOWS_C);
  assertRegularFile(file);
  const windows = fs.readFileSync(file);
  assert.equal(windows.length, WINDOWS_C.bytes);
  assert.equal(sha256Bytes(windows), WINDOWS_C.sha256);
  const text = windows.toString('utf8');
  assert.ok(Buffer.from(text, 'utf8').equals(windows), 'Windows C is not valid UTF-8');
  assert.equal((text.match(/\r\n/g) ?? []).length, WINDOWS_C.crlfPairs);
  assert.equal((text.match(/\r/g) ?? []).length, WINDOWS_C.crlfPairs,
    'Windows C contains a carriage return outside a CRLF pair');
  assert.deepEqual(assertLinuxCBytes(Buffer.from(text.replaceAll('\r\n', '\n'), 'utf8')),
    EXPECTED_C, 'the exact Windows C must normalize to the reviewed Linux C digest');
}
assert.equal(LINUX_NODE_SHA256,
  '93956de2e59480474a7b46571da1651180b1a050cdf32641ebec4ce6e478e068');

assert.deepEqual(parseExportArguments([]), {});
assert.throws(() => parseExportArguments(['--overwrite']), /takes no arguments/);

const runDirectory = path.join(ROOT, '.artifacts/bend2/native-cli-2032-linux/run-synthetic');
const clangPath = path.join(ROOT, '.artifacts/toolchains/clang-18/bin/clang');
assert.deepEqual(parseNativeArguments([runDirectory, '--clang', clangPath]), {
  runDirectory: path.resolve(runDirectory), clangPath, clangSha256: undefined,
});
const digest = 'A'.repeat(64);
assert.deepEqual(parseNativeArguments([runDirectory, '--clang', clangPath, '--clang-sha256', digest]), {
  runDirectory: path.resolve(runDirectory), clangPath, clangSha256: digest.toLowerCase(),
});
assert.throws(() => parseNativeArguments([runDirectory, '--clang', 'clang']), /absolute executable path/);
assert.throws(() => parseNativeArguments([runDirectory, '--clang', clangPath, '--clang', clangPath]),
  /duplicate native-smoke argument/);

assert.deepEqual(clangCompileArguments('/run/NativeCLI.c', '/run/NativeCLI'), [
  '-std=c11', '-O2', '/run/NativeCLI.c', '-lpthread', '-lm', '-o', '/run/NativeCLI',
]);
assert.deepEqual(SCENARIOS.map(({ id, args }) => [id, [...args]]), [
  ['program-only', ['--threads', '1']],
  ['help', ['--threads', '1', 'help']],
  ['dash-dash-help-word', ['--threads', '1', '--', 'help']],
  ['dash-dash-help', ['--threads', '1', '--', '--help']],
]);
assert.ok(SCENARIOS.every(({ args }) => args[0] === '--threads' && args[1] === '1'));
assert.deepEqual(WRITE_RESTART_STEPS.map(({ id, args }) => [id, [...args]]), [
  ['01-new', ['--threads', '1', 'new', 'B', 'prompt']],
  ['02-move', ['--threads', '1', 'move', '3980']],
  ['03-restart-show', ['--threads', '1', 'show']],
]);
assert.ok(WRITE_RESTART_STEPS.every(({ args }) => args[0] === '--threads' && args[1] === '1'));

process.stdout.write('native-cli-2032 Linux smoke pure contract checks passed\n');
