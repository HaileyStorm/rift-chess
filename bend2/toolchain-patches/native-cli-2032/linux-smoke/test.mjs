import assert from 'node:assert/strict';
import path from 'node:path';
import {
  EXPECTED_C, INPUT_HASHES, LINUX_NODE_SHA256, ORIGINAL_SOURCE_HASHES, ROOT, SCENARIOS, SOURCE_HASHES,
  WRITE_RESTART_STEPS, clangCompileArguments, expectedCandidateSources,
  parseExportArguments, parseNativeArguments, readAndValidateInputFiles,
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
  bytes: 2189927,
  sha256: '373f735cd13c42b2a2f307646bfd08931c93e0fc599c362a12676ffdc4a77281',
});
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
