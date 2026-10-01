// Linux-only process-supervision controls; never invoke Bend, Clang or the app.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertLinuxNode, runOwnedProcess } from './common.mjs';

if (process.platform !== 'linux') {
  process.stdout.write('native-v2-2032 Linux process lifecycle test skipped: Linux process handles required\n');
} else {
  assertLinuxNode();
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'rift-native-v2-2032-lifecycle-'));
  let safeToRemove = false;
  try {
    const env = { PATH: process.env.PATH ?? '/usr/bin:/bin', BEND_NO_TELEMETRY: '1',
      HOME: fixture, TMPDIR: fixture, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' };
    const normal = await runOwnedProcess(process.execPath,
      ['-e', "process.stdout.write('supervised child exited\\n')"],
      { cwd: fixture, env, timeoutMs: 5000, maxOutputBytes: 1024, label: 'normal child' });
    assert.equal(normal.status, 0);
    assert.equal(normal.stdout.toString('utf8'), 'supervised child exited\n');
    assert.equal(normal.stderr.length, 0);
    await assert.rejects(runOwnedProcess(process.execPath,
      ['-e', 'setInterval(() => {}, 1000)'],
      { cwd: fixture, env, timeoutMs: 250, maxOutputBytes: 1024, label: 'timed child' }),
    (error) => {
      assert.equal(error.timedOut, true);
      assert.equal(error.workerMayBeLive, false);
      return true;
    });
    await assert.rejects(runOwnedProcess(process.execPath,
      ['-e', "process.stdout.write('x'.repeat(4096)); setInterval(() => {}, 1000)"],
      { cwd: fixture, env, timeoutMs: 5000, maxOutputBytes: 128, label: 'output-limited child' }),
    (error) => {
      assert.match(error.message, /output limit/);
      assert.equal(error.workerMayBeLive, false);
      return true;
    });
    assert.deepEqual(fs.readdirSync(fixture), [], 'process test left unexpected files');
    safeToRemove = true;
    process.stdout.write(JSON.stringify({ schema: 'rift-native-v2-2032-linux-cpu-lifecycle/1',
      passed: true, cases: ['normal-exit', 'direct-leader-timeout', 'output-limit'],
      policy: 'signal only the owned live leader; ambiguous descendants remain for owner recovery' }) + '\n');
  } finally {
    if (safeToRemove) fs.rmdirSync(fixture);
    else process.stderr.write(`Lifecycle failure retained exact temporary fixture: ${fixture}\n`);
  }
}
