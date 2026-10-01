import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ownedSignalDecision, runOwnedGroup } from './bendtt-supervisor.mjs';

const linux = process.platform === 'linux';
const linuxTest = linux ? test : test.skip;

const expected = Object.freeze({ pid: 701, pgid: 701, session: 701, startTimeTicks: '12345' });
const live = Object.freeze({ pid: 701, pgrp: 701, session: 701,
  startTimeTicks: '12345', state: 'S' });

test('signal policy requires the still-live exact session leader', () => {
  assert.deepEqual(ownedSignalDecision({ expected, observed: live, exitObserved: false }),
    { allowed: true, reason: 'exact-live-owned-leader' });
  assert.deepEqual(ownedSignalDecision({ expected, observed: live, exitObserved: true }),
    { allowed: false, reason: 'leader-exit-observed' });
  assert.deepEqual(ownedSignalDecision({ expected,
    observed: { ...live, startTimeTicks: '12346' }, exitObserved: false }),
  { allowed: false, reason: 'leader-identity-mismatch' });
  assert.deepEqual(ownedSignalDecision({ expected,
    observed: { ...live, pgrp: 702 }, exitObserved: false }),
  { allowed: false, reason: 'leader-identity-mismatch' });
  assert.deepEqual(ownedSignalDecision({ expected,
    observed: { ...live, state: 'Z' }, exitObserved: false }),
  { allowed: false, reason: 'leader-not-live' });
  assert.deepEqual(ownedSignalDecision({ expected, observed: null, exitObserved: false }),
  { allowed: false, reason: 'leader-identity-unreadable' });
  assert.deepEqual(ownedSignalDecision({ expected: null, observed: live, exitObserved: false }),
  { allowed: false, reason: 'owned-identity-unavailable' });
  for (const pid of [0, 1]) {
    assert.deepEqual(ownedSignalDecision({
      expected: { pid, pgid: pid, session: pid, startTimeTicks: '12345' },
      observed: { ...live, pid, pgrp: pid, session: pid }, exitObserved: false,
    }), { allowed: false, reason: 'owned-identity-unavailable' });
  }
});

if (!linux) {
  test('runtime rejects non-Linux without attempting a spawn', async () => {
    await assert.rejects(runOwnedGroup(process.execPath, [], {
      cwd: process.cwd(), env: {}, timeoutMs: 1000, maxOutputBytes: 64,
      label: 'non-linux guard',
    }), { code: 'ERR_OWNED_GROUP_LINUX_ONLY' });
  });
}

function makeFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rift-bendtt-supervisor-'));
  return { directory, dispose: () => fs.rmSync(directory, { recursive: true, force: true }) };
}

function run(script, fixture, { timeoutMs = 2000, maxOutputBytes = 4096 } = {}) {
  return runOwnedGroup(process.execPath, ['-e', script], {
    cwd: fixture.directory,
    env: { BENDTT: process.execPath },
    timeoutMs,
    maxOutputBytes,
    label: 'unique Linux process-group fixture',
  });
}

function waitForGroupGone(pgid, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const poll = () => {
      try {
        process.kill(-pgid, 0);
        if (Date.now() >= deadline) reject(new Error(`fixture process group ${pgid} persisted`));
        else setTimeout(poll, 20);
      } catch (error) {
        if (error?.code === 'ESRCH') resolve();
        else reject(error);
      }
    };
    poll();
  });
}

function readLinuxProc(pid) {
  let line;
  try { line = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); }
  catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ESRCH') return null;
    throw error;
  }
  const close = line.lastIndexOf(')');
  const fields = line.slice(close + 1).trim().split(/\s+/);
  return { pid: Number(line.slice(0, line.indexOf(' '))), state: fields[0],
    pgrp: Number(fields[2]), session: Number(fields[3]), startTimeTicks: fields[19] };
}

function requestExactFixtureExit(record, cleanupFile) {
  if (!Number.isSafeInteger(record.pid) || record.pid <= 1
      || !Number.isSafeInteger(record.pgrp) || record.pgrp <= 1
      || record.session !== record.pgrp || !/^\d+$/.test(record.startTimeTicks ?? '')
      || typeof record.token !== 'string' || !record.token)
    throw new Error('refusing fixture cleanup: malformed recorded process identity');
  const first = readLinuxProc(record.pid);
  if (!first) return false;
  let command;
  try { command = fs.readFileSync(`/proc/${record.pid}/cmdline`, 'utf8').split('\0'); }
  catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ESRCH') return false;
    throw error;
  }
  const second = readLinuxProc(record.pid);
  if (!second) return false;
  const exact = (observed) => observed.pid === record.pid
    && observed.pgrp === record.pgrp && observed.session === record.session
    && observed.startTimeTicks === record.startTimeTicks;
  if (!exact(first) || !exact(second) || !command.includes(record.token))
    throw new Error('refusing fixture cleanup: descendant PID/session/starttime/token changed');
  if (second.state === 'Z' || second.state === 'X' || second.state === 'x') return false;
  try { fs.writeFileSync(cleanupFile, record.token, { flag: 'wx' }); }
  catch (error) {
    if (error?.code !== 'EEXIST' || fs.readFileSync(cleanupFile, 'utf8') !== record.token)
      throw error;
  }
  return true;
}

linuxTest('normal exit captures exact bytes and observes group quiescence', async () => {
  const fixture = makeFixture();
  try {
    const result = await run(
      "process.stdout.write(Buffer.from([0, 1, 255])); process.stderr.write(Buffer.from([10, 13]));",
      fixture);
    assert.equal(result.status, 0);
    assert.equal(result.signal, null);
    assert.deepEqual(result.stdout, Buffer.from([0, 1, 255]));
    assert.deepEqual(result.stderr, Buffer.from([10, 13]));
    assert.equal(result.groupQuiescent, true);
    assert.equal(result.timedOut, false);
    assert.equal(result.outputLimitExceeded, false);
    assert.equal(result.retryCount, 0);
  } finally {
    fixture.dispose();
  }
});

linuxTest('timeout signals the owned group and waits for its actual descendant', async () => {
  const fixture = makeFixture();
  try {
    const script = `
      const { spawn } = require('node:child_process');
      const child = spawn(process.execPath, ['-e',
        "process.on('SIGTERM', () => setTimeout(() => process.exit(0), 25)); setInterval(() => {}, 1000)"] ,
        { stdio: ['ignore', 'ignore', 'ignore'] });
      child.on('exit', () => process.exit(0));
      process.on('SIGTERM', () => {});
      process.stdout.write(JSON.stringify({ descendantPid: child.pid }) + '\\n');
      setInterval(() => {}, 1000);
    `;
    const result = await run(script, fixture, { timeoutMs: 1200, maxOutputBytes: 1024 });
    const [record] = result.stdout.toString('utf8').trim().split('\n');
    const childPid = JSON.parse(record).descendantPid;
    assert.ok(Number.isSafeInteger(childPid) && childPid > 1);
    assert.equal(result.timedOut, true);
    assert.equal(result.status, 0);
    assert.deepEqual(result.signalsSent, ['SIGTERM']);
    assert.equal(result.groupQuiescent, true);
    await waitForGroupGone(result.pid);
  } finally {
    fixture.dispose();
  }
});

linuxTest('output limit caps combined captured bytes and terminates the group', async () => {
  const fixture = makeFixture();
  try {
    const result = await run(
      "process.on('SIGTERM', () => {}); process.stdout.write(Buffer.alloc(100, 65)); process.stderr.write(Buffer.alloc(100, 66)); setInterval(() => {}, 1000);",
      fixture, { timeoutMs: 1500, maxOutputBytes: 128 });
    assert.equal(result.outputLimitExceeded, true);
    assert.equal(result.terminationReason, 'output-limit');
    assert.equal(result.stdout.length + result.stderr.length, 128);
    assert.ok(result.stdout.length > 0 && result.stderr.length > 0);
    assert.equal(result.stdoutBytesSeen + result.stderrBytesSeen, 200);
    assert.ok(result.signalsSent.includes('SIGTERM'));
    assert.ok(result.signalsSent.includes('SIGKILL'));
    assert.equal(result.groupQuiescent, true);
    assert.equal(result.retryCount, 0);
  } finally {
    fixture.dispose();
  }
});

linuxTest('nonzero exit is returned once with independent status and streams', async () => {
  const fixture = makeFixture();
  try {
    const countFile = path.join(fixture.directory, 'launch-count');
    const script = `
      const fs = require('node:fs');
      fs.writeFileSync(${JSON.stringify(countFile)}, 'one');
      process.stdout.write(JSON.stringify([process.env.BEND_NO_TELEMETRY, process.env.BENDTT]));
      process.stderr.write('stderr');
      process.exitCode = 23;
    `;
    const result = await run(script, fixture);
    assert.equal(result.status, 23);
    assert.equal(result.signal, null);
    assert.deepEqual(JSON.parse(result.stdout.toString()), ['1', process.execPath]);
    assert.equal(result.stderr.toString(), 'stderr');
    assert.equal(fs.readFileSync(countFile, 'utf8'), 'one');
    assert.equal(result.retryCount, 0);
    assert.equal(result.groupQuiescent, true);
  } finally {
    fixture.dispose();
  }
});

linuxTest('leader exit with a live descendant is reported uncertain and never group-signalled', async () => {
  const fixture = makeFixture();
  let processGroupId = null;
  let fixtureQuiescent = false;
  const token = randomUUID();
  const identityFile = path.join(fixture.directory, 'descendant-identity.json');
  const cleanupFile = path.join(fixture.directory, 'descendant-cleanup');
  try {
    const descendantCode = `
      const fs = require('node:fs');
      const stat = fs.readFileSync('/proc/self/stat', 'utf8');
      const fields = stat.slice(stat.lastIndexOf(')') + 1).trim().split(/\\s+/);
      const identity = { pid: process.pid, pgrp: Number(fields[2]), session: Number(fields[3]),
        startTimeTicks: fields[19], token: process.argv[1] };
      fs.writeFileSync(process.argv[2], JSON.stringify(identity), { flag: 'wx' });
      setInterval(() => {
        try {
          if (fs.readFileSync(process.argv[3], 'utf8') === process.argv[1]) process.exit(0);
        } catch {}
      }, 10);
      setTimeout(() => process.exit(0), 5000);
    `;
    const script = `
      const { spawn } = require('node:child_process');
      const fs = require('node:fs');
      const identityFile = ${JSON.stringify(identityFile)};
      const childCode = ${JSON.stringify(descendantCode)};
      spawn(process.execPath, ['-e', childCode, ${JSON.stringify(token)}, identityFile,
        ${JSON.stringify(cleanupFile)}], { stdio: ['ignore', 'inherit', 'inherit'] });
      const ready = setInterval(() => {
        try {
          const record = fs.readFileSync(identityFile, 'utf8');
          clearInterval(ready);
          clearTimeout(fail);
          process.stdout.write(record + '\\n', () => process.exit(0));
        } catch {}
      }, 5);
      const fail = setTimeout(() => process.exit(71), 700);
    `;
    let caught = null;
    let runResult = null;
    try { runResult = await run(script, fixture, { timeoutMs: 1000, maxOutputBytes: 1024 }); }
    catch (error) { caught = error; }
    assert.ok(caught, 'live group with an exited leader must not resolve as complete');
    if (caught.workerMayBeLive) processGroupId = caught.partialResult.pid;
    else if (runResult) processGroupId = runResult.pid;
    assert.equal(caught.code, 'ERR_OWNED_GROUP_UNCERTAIN');
    assert.equal(caught.workerMayBeLive, true);
    assert.equal(caught.partialResult.groupQuiescent, false);
    assert.equal(caught.partialResult.status, 0);
    assert.deepEqual(caught.partialResult.signalsSent, []);
    assert.deepEqual(caught.partialResult.signalAttempts.map(({ signal, reason }) =>
      ({ signal, reason })), [{ signal: 'SIGTERM', reason: 'leader-exit-observed' }]);
    const record = JSON.parse(caught.partialResult.stdout.toString('utf8').trim());
    assert.ok(Number.isSafeInteger(record.pid) && record.pid > 1);
    assert.equal(record.token, token);
    assert.equal(record.pgrp, processGroupId);
    assert.equal(record.session, processGroupId);
  } finally {
    try {
      if (fs.existsSync(identityFile)) {
        const record = JSON.parse(fs.readFileSync(identityFile, 'utf8'));
        if (record.token !== token) throw new Error('fixture identity token changed');
        processGroupId ??= record.pgrp;
        requestExactFixtureExit(record, cleanupFile);
      }
      if (processGroupId !== null) {
        await waitForGroupGone(processGroupId, 6000);
        fixtureQuiescent = true;
      } else {
        fixtureQuiescent = true;
      }
    } finally {
      // Keep the unique fixture and identity evidence if its group cannot be
      // proven quiescent; never discard evidence while a process may use it.
      if (fixtureQuiescent) fixture.dispose();
    }
  }
});

