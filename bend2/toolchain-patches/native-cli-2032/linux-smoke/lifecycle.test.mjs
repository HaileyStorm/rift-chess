import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isolatedEnvironment, runOwnedProcess } from './common.mjs';

if (process.platform !== 'linux') {
  console.log(JSON.stringify({ schema: 'rift-native-cli-2032-linux-lifecycle-test/1',
    skipped: true, reason: 'Linux process handles required' }));
} else {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'rift-native-lifecycle-'));
  const home = path.join(fixture, 'home');
  const tmp = path.join(fixture, 'tmp');
  fs.mkdirSync(home, { mode: 0o700 });
  fs.mkdirSync(tmp, { mode: 0o700 });
  const env = isolatedEnvironment(fixture);
  let safeToRemove = false;
  try {
    const normal = await runOwnedProcess(process.execPath,
      ['-e', "process.stdout.write('owned child exited\\n')"],
      { cwd: fixture, env, timeoutMs: 3000, maxOutputBytes: 1024, label: 'normal child' });
    assert.equal(normal.status, 0);
    assert.equal(normal.stdout.toString('utf8'), 'owned child exited\n');
    assert.equal(normal.stderr.length, 0);
    await assert.rejects(runOwnedProcess(process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      { cwd: fixture, env, timeoutMs: 250, maxOutputBytes: 1024, label: 'timed child' }),
    (error) => {
      assert.equal(error.timedOut, true);
      assert.equal(error.workerMayBeLive, false, 'owned child exit was not observed');
      return true;
    });
    await assert.rejects(runOwnedProcess(process.execPath,
      ['-e', "process.stdout.write('x'.repeat(8192)); setInterval(() => {}, 1000)"],
      { cwd: fixture, env, timeoutMs: 3000, maxOutputBytes: 256, label: 'output-limited child' }),
    (error) => {
      assert.match(error.message, /exceeded its output limit/);
      assert.equal(error.workerMayBeLive, false, 'output-limited child exit was not observed');
      return true;
    });
    safeToRemove = true;
    console.log(JSON.stringify({ schema: 'rift-native-cli-2032-linux-lifecycle-test/1',
      passed: true, controls: ['normal-exit', 'direct-leader-timeout', 'output-limit'],
      scope: 'owned child lifecycle only; descendant ambiguity remains fail-closed' }));
  } finally {
    if (safeToRemove) {
      assert.deepEqual(fs.readdirSync(home), []);
      assert.deepEqual(fs.readdirSync(tmp), []);
      fs.rmdirSync(home);
      fs.rmdirSync(tmp);
      fs.rmdirSync(fixture);
    } else {
      console.error(`Lifecycle failure retained exact fixture for owner review: ${fixture}`);
    }
  }
}
