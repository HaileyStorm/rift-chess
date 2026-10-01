// Cross-host patch-application gate only; no Bend compiler or native binary.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  BASE_APP_COMMIT, ORIGINAL_SOURCE_HASHES, ROOT, SOURCE_HASHES,
  assertRealDirectory, assertRunDirectory, createRunDirectory, gitBuffer,
  helperPath, makeExclusiveDirectory, sha256Bytes, sha256File,
} from './common.mjs';

const nativePatch = 'bend2/toolchain-patches/native-cli-2032/0001-adapt-io-args-2032.patch';
const consumersPatch = 'bend2/toolchain-patches/native-cli-2032/consumers/0001-consumer-args-2032.patch';
const { directory: runDirectory, identity } = createRunDirectory();
let cleaned = false;
try {
  const candidate = makeExclusiveDirectory(runDirectory, 'candidate');
  const directories = new Set();
  for (const [relative, expected] of Object.entries(ORIGINAL_SOURCE_HASHES)) {
    assert.ok(relative.startsWith('bend2/') && relative.split('/').every((part) =>
      part && part !== '.' && part !== '..'), `unsafe source path: ${relative}`);
    const bytes = gitBuffer(ROOT, ['show', `${BASE_APP_COMMIT}:${relative}`], {
      maxBuffer: 4 * 1024 * 1024,
    });
    assert.equal(sha256Bytes(bytes), expected, `base source changed: ${relative}`);
    const parts = relative.split('/');
    for (let at = 1; at < parts.length; at++) directories.add(parts.slice(0, at).join('/'));
    const parent = path.join(candidate, ...parts.slice(0, -1));
    fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
    assertRealDirectory(parent);
    const file = path.join(candidate, ...parts);
    fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
    assert.equal(sha256File(file), expected);
  }
  const directory = path.relative(ROOT, candidate).split(path.sep).join('/');
  assert.ok(directory.startsWith('.artifacts/bend2/native-cli-2032-linux/run-'));
  for (const relative of [nativePatch, consumersPatch]) {
    const patchFile = helperPath(relative);
    const args = ['apply', '--unidiff-zero', `--directory=${directory}`];
    for (const check of [true, false]) {
      const result = spawnSync('git', [...args, ...(check ? ['--check'] : []), patchFile], {
        cwd: ROOT, encoding: 'utf8', timeout: 30_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      assert.equal(result.error, undefined, String(result.error));
      assert.equal(result.status, 0, `patch ${relative} failed: ${String(result.stderr ?? '').slice(-500)}`);
    }
  }
  for (const [relative, expected] of Object.entries(SOURCE_HASHES)) {
    assert.equal(sha256File(path.join(candidate, ...relative.split('/'))), expected,
      `post-patch source changed: ${relative}`);
  }
  assertRunDirectory(runDirectory, identity);
  for (const relative of Object.keys(ORIGINAL_SOURCE_HASHES))
    fs.unlinkSync(path.join(candidate, ...relative.split('/')));
  for (const relative of [...directories].sort((a, b) => b.length - a.length))
    fs.rmdirSync(path.join(candidate, ...relative.split('/')));
  fs.rmdirSync(candidate);
  fs.rmdirSync(runDirectory);
  cleaned = true;
  console.log(JSON.stringify({ schema: 'rift-native-cli-2032-materialization-test/1',
    passed: true, files: Object.keys(SOURCE_HASHES).length,
    scope: 'exact base and two patch postimages only; no Bend source check, C, or native run' }));
} finally {
  if (!cleaned) console.error(`Materialization test failure retained exact ignored run: ${runDirectory}`);
}
