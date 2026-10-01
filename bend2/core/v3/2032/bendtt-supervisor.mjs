// Linux-only bounded owner for one process and the process group created by
// detached:true. This is a lifecycle primitive, not a BendTT/check binder.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const MAX_CAPTURE_BYTES = 128 * 1024 * 1024;
const CAPTURE_BLOCK_BYTES = 32 * 1024;
const POLL_MS = 10;

function validateInvocation(executable, args, options) {
  if (typeof executable !== 'string' || !path.isAbsolute(executable))
    throw new TypeError('executable must be an absolute path');
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string' || arg.includes('\0')))
    throw new TypeError('args must be strings without NUL bytes');
  if (!options || typeof options !== 'object' || Array.isArray(options))
    throw new TypeError('options must be an object');
  const { cwd, env = {}, timeoutMs, maxOutputBytes, label = 'owned process' } = options;
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd))
    throw new TypeError('cwd must be an absolute path');
  if (!env || typeof env !== 'object' || Array.isArray(env))
    throw new TypeError('env must be an object of explicit environment overrides');
  for (const [key, value] of Object.entries(env)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)
        || typeof value !== 'string' || value.includes('\0'))
      throw new TypeError('env keys and values must be valid strings');
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > MAX_TIMEOUT_MS)
    throw new RangeError(`timeoutMs must be an integer from 250 to ${MAX_TIMEOUT_MS}`);
  if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1
      || maxOutputBytes > MAX_CAPTURE_BYTES)
    throw new RangeError(`maxOutputBytes must be an integer from 1 to ${MAX_CAPTURE_BYTES}`);
  if (typeof label !== 'string' || !label.trim() || label.length > 160)
    throw new TypeError('label must be a non-empty string of at most 160 characters');
  return { cwd, env, timeoutMs, maxOutputBytes, label };
}

function readLeader(pid) {
  let line;
  try { line = fs.readFileSync(`/proc/${pid}/stat`, 'utf8'); }
  catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ESRCH') return null;
    return { unavailable: error?.code ?? 'read-error' };
  }
  // comm is parenthesized but may itself contain spaces and right parens.
  const close = line.lastIndexOf(')');
  if (close < 0) return { unavailable: 'malformed-proc-stat' };
  const statPid = Number(line.slice(0, line.indexOf(' ')));
  const fields = line.slice(close + 1).trim().split(/\s+/);
  if (!Number.isSafeInteger(statPid) || fields.length < 20)
    return { unavailable: 'malformed-proc-stat' };
  const pgrp = Number(fields[2]); // proc stat field 5
  const session = Number(fields[3]); // proc stat field 6
  const startTimeTicks = fields[19]; // proc stat field 22
  if (!Number.isSafeInteger(pgrp) || !Number.isSafeInteger(session)
      || !/^\d+$/.test(startTimeTicks))
    return { unavailable: 'malformed-proc-stat' };
  return { pid: statPid, pgrp, session, startTimeTicks, state: fields[0] };
}

// This is deliberately pure so its fail-closed policy can be tested on hosts
// that cannot exercise Linux process groups. It never simulates a platform.
export function ownedSignalDecision({ expected, observed, exitObserved }) {
  if (exitObserved) return { allowed: false, reason: 'leader-exit-observed' };
  if (!expected || !Number.isSafeInteger(expected.pid) || expected.pid <= 1
      || expected.pgid !== expected.pid || expected.session !== expected.pid
      || !/^\d+$/.test(expected.startTimeTicks ?? ''))
    return { allowed: false, reason: 'owned-identity-unavailable' };
  if (!observed || observed.unavailable)
    return { allowed: false, reason: 'leader-identity-unreadable' };
  if (observed.pid !== expected.pid || observed.pgrp !== expected.pgid
      || observed.session !== expected.session
      || observed.startTimeTicks !== expected.startTimeTicks)
    return { allowed: false, reason: 'leader-identity-mismatch' };
  if (typeof observed.state !== 'string' || observed.state.length !== 1
      || !'RSDZTWtXxKPI'.includes(observed.state))
    return { allowed: false, reason: 'leader-identity-unreadable' };
  if (observed.state === 'Z' || observed.state === 'X' || observed.state === 'x')
    return { allowed: false, reason: 'leader-not-live' };
  return { allowed: true, reason: 'exact-live-owned-leader' };
}

function groupState(pgid) {
  try {
    process.kill(-pgid, 0);
    return { quiescent: false, known: true };
  } catch (error) {
    if (error?.code === 'ESRCH') return { quiescent: true, known: true };
    if (error?.code === 'EPERM') return { quiescent: false, known: false };
    return { quiescent: false, known: false, error: error?.code ?? String(error) };
  }
}

function appendCapture(capture, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    let block = capture.blocks.at(-1);
    if (!block || block.used === block.bytes.length) {
      block = { bytes: Buffer.allocUnsafe(CAPTURE_BLOCK_BYTES), used: 0 };
      capture.blocks.push(block);
    }
    const copied = Math.min(bytes.length - offset, block.bytes.length - block.used);
    bytes.copy(block.bytes, block.used, offset, offset + copied);
    block.used += copied;
    offset += copied;
  }
  capture.length += bytes.length;
}

function materializeCapture(capture) {
  const output = Buffer.allocUnsafe(capture.length);
  let offset = 0;
  for (const block of capture.blocks) {
    block.bytes.copy(output, offset, 0, block.used);
    offset += block.used;
  }
  return output;
}

function appendBounded(capture, chunk, state, maxBytes, field) {
  const seen = Math.min(Number.MAX_SAFE_INTEGER, state[field] + chunk.length);
  state[field] = seen;
  const captured = state.stdoutCaptured + state.stderrCaptured;
  const remaining = Math.max(0, maxBytes - captured);
  if (remaining > 0) {
    const piece = chunk.subarray(0, remaining);
    if (piece.length) {
      appendCapture(capture, piece);
      state[field === 'stdoutBytesSeen' ? 'stdoutCaptured' : 'stderrCaptured'] += piece.length;
    }
  }
  if (state.stdoutBytesSeen + state.stderrBytesSeen > maxBytes)
    state.outputLimitExceeded = true;
}

function signalOwnedGroup(child, identity, state, signal) {
  const observed = identity ? readLeader(child.pid) : null;
  const decision = ownedSignalDecision({ expected: identity, observed,
    exitObserved: state.exitObserved });
  if (!decision.allowed) return { sent: false, ...decision };
  try {
    process.kill(-identity.pgid, signal);
    state.signals.push(signal);
    return { sent: true, reason: decision.reason };
  } catch (error) {
    return { sent: false, reason: `signal-failed-${error?.code ?? 'unknown'}`,
      error: error?.message ?? String(error) };
  }
}

function resultSnapshot(child, identity, state, label, startedAt, reason, quiescence) {
  const stdout = materializeCapture(state.stdoutCapture);
  const stderr = materializeCapture(state.stderrCapture);
  return {
    label,
    stdout,
    stderr,
    stdoutBytesSeen: state.stdoutBytesSeen,
    stderrBytesSeen: state.stderrBytesSeen,
    status: state.exitObserved ? state.status : null,
    signal: state.exitObserved ? state.signal : null,
    pid: child.pid ?? null,
    processIdentity: identity ? { ...identity } : null,
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    groupQuiescent: quiescence.quiescent,
    groupStateKnown: quiescence.known,
    timedOut: reason === 'timeout',
    outputLimitExceeded: state.outputLimitExceeded,
    terminationReason: reason,
    signalsSent: [...state.signals],
    signalAttempts: state.signalAttempts.map((attempt) => ({ ...attempt })),
    retryCount: 0,
  };
}

function uncertainError(child, identity, state, label, startedAt, reason, quiescence, detail) {
  const error = new Error(`${label}: process-group state is uncertain; preserving it (${detail})`);
  error.code = 'ERR_OWNED_GROUP_UNCERTAIN';
  error.workerMayBeLive = true;
  error.partialResult = resultSnapshot(child, identity, state, label, startedAt, reason, quiescence);
  error.detail = detail;
  return error;
}

function detachUncertainChild(child) {
  // Keep the remote processes untouched while allowing this bounded caller to
  // return. The pipes are drained-and-discarded, not closed (which could send
  // SIGPIPE to the process being preserved).
  for (const stream of [child.stdout, child.stderr]) {
    if (!stream) continue;
    stream.removeAllListeners('data');
    stream.on('data', () => {});
    stream.resume();
    stream.unref?.();
  }
  child.unref();
}

/**
 * Spawn exactly one executable in a new Linux session/process group, capture
 * at most maxOutputBytes combined, and wait for the leader, its stdio, and its
 * process group to become quiescent. `timeoutMs` is a hard wall-clock budget;
 * a small portion is reserved for TERM/KILL and quiescence observation.
 *
 * The caller must bind/validate the derived compiler and explicit BENDTT path
 * before calling. This function never resolves either through PATH on behalf
 * of the caller: executable must be absolute, and shell execution is disabled.
 */
export async function runOwnedGroup(executable, args, options) {
  if (process.platform !== 'linux') {
    const error = new Error('runOwnedGroup is supported only on Linux');
    error.code = 'ERR_OWNED_GROUP_LINUX_ONLY';
    throw error;
  }
  const { cwd, env, timeoutMs, maxOutputBytes, label } =
    validateInvocation(executable, args, options);
  const startedAt = performance.now();
  const hardDeadline = startedAt + timeoutMs;
  const cleanupReserveMs = Math.min(1000, Math.max(100, Math.ceil(timeoutMs * 0.1)));
  const executionDeadline = hardDeadline - cleanupReserveMs;
  const termGraceMs = Math.min(200, Math.max(20, Math.floor(cleanupReserveMs / 3)));
  const childEnv = { ...process.env, ...env, BEND_NO_TELEMETRY: '1' };
  const state = {
    stdoutCapture: { blocks: [], length: 0 }, stderrCapture: { blocks: [], length: 0 },
    stdoutCaptured: 0, stderrCaptured: 0,
    stdoutBytesSeen: 0, stderrBytesSeen: 0, stdoutEnded: false, stderrEnded: false,
    outputLimitExceeded: false, exitObserved: false, status: null, signal: null,
    signals: [], signalAttempts: [], spawnError: null,
  };

  let child;
  try {
    child = spawn(executable, args, { cwd, env: childEnv, shell: false,
      detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    error.workerMayBeLive = false;
    throw error;
  }
  let identity = null;
  child.once('spawn', () => {
    if (Number.isSafeInteger(child.pid)) {
      const first = readLeader(child.pid);
      if (first && !first.unavailable && first.pid === child.pid
          && first.pgrp === child.pid && first.session === child.pid
          && first.state !== 'Z' && first.state !== 'X') {
        identity = { pid: child.pid, pgid: child.pid, session: child.pid,
          startTimeTicks: first.startTimeTicks };
      }
    }
  });
  child.once('error', (error) => { state.spawnError = error; });
  child.once('exit', (status, signal) => {
    state.exitObserved = true;
    state.status = status;
    state.signal = signal;
  });
  child.stdout.on('data', (chunk) => appendBounded(state.stdoutCapture, chunk,
    state, maxOutputBytes, 'stdoutBytesSeen'));
  child.stderr.on('data', (chunk) => appendBounded(state.stderrCapture, chunk,
    state, maxOutputBytes, 'stderrBytesSeen'));
  child.stdout.once('end', () => { state.stdoutEnded = true; });
  child.stderr.once('end', () => { state.stderrEnded = true; });

  let terminationReason = null;
  let termAttempted = false;
  let termSentAt = null;
  let killAttempted = false;
  let lastKillDecision = null;
  let lastGroupState = { quiescent: false, known: false };

  const done = () => state.exitObserved && state.stdoutEnded && state.stderrEnded
    && lastGroupState.quiescent;
  const snapshot = () => resultSnapshot(child, identity, state, label, startedAt,
    terminationReason, lastGroupState);
  const preserve = (detail) => {
    detachUncertainChild(child);
    return uncertainError(child, identity, state, label, startedAt,
      terminationReason, lastGroupState, detail);
  };

  while (true) {
    const now = performance.now();
    if (state.spawnError) {
      state.spawnError.workerMayBeLive = false;
      state.spawnError.code ??= 'ERR_OWNED_GROUP_SPAWN';
      throw state.spawnError;
    }
    if (!identity && !state.exitObserved && Number.isSafeInteger(child.pid)) {
      const current = readLeader(child.pid);
      if (current && !current.unavailable && current.pid === child.pid
          && current.pgrp === child.pid && current.session === child.pid
          && current.state !== 'Z' && current.state !== 'X') {
        identity = { pid: child.pid, pgid: child.pid, session: child.pid,
          startTimeTicks: current.startTimeTicks };
      }
    }
    lastGroupState = Number.isSafeInteger(child.pid)
      ? groupState(child.pid) : { quiescent: true, known: true };

    if (state.outputLimitExceeded && terminationReason === null) {
      terminationReason = 'output-limit';
    }
    if (terminationReason === null && now >= executionDeadline
        && (!state.exitObserved || !lastGroupState.quiescent || !state.stdoutEnded
          || !state.stderrEnded)) {
      terminationReason = 'timeout';
    }

    if (done()) {
      if (terminationReason === null && now >= executionDeadline)
        terminationReason = 'timeout';
      return snapshot();
    }

    if (terminationReason !== null && !termAttempted) {
      termAttempted = true;
      const decision = signalOwnedGroup(child, identity, state, 'SIGTERM');
      state.signalAttempts.push({ signal: 'SIGTERM', ...decision });
      if (decision.sent) termSentAt = now;
    }

    if (terminationReason !== null && termSentAt !== null
        && !lastGroupState.quiescent && !killAttempted
        && now - termSentAt >= termGraceMs) {
      killAttempted = true;
      lastKillDecision = signalOwnedGroup(child, identity, state, 'SIGKILL');
      state.signalAttempts.push({ signal: 'SIGKILL', ...lastKillDecision });
    }

    if (done()) return snapshot();

    const finalKillAt = hardDeadline - Math.min(50, Math.floor(cleanupReserveMs / 4));
    if (terminationReason !== null && now < hardDeadline && now >= finalKillAt
        && !lastGroupState.quiescent
        && !killAttempted && identity && !state.exitObserved) {
      killAttempted = true;
      lastKillDecision = signalOwnedGroup(child, identity, state, 'SIGKILL');
      state.signalAttempts.push({ signal: 'SIGKILL', ...lastKillDecision });
    }

    if (now >= hardDeadline) {
      if (lastGroupState.quiescent && state.exitObserved && state.stdoutEnded
          && state.stderrEnded) return snapshot();
      const detail = !identity
        ? 'exact leader identity was never observed live'
        : state.exitObserved && !lastGroupState.quiescent
          ? 'leader exited before the group became quiescent'
          : lastKillDecision && !lastKillDecision.sent
            ? `SIGKILL was not authorized: ${lastKillDecision.reason}`
            : !lastGroupState.known ? 'process-group liveness could not be established'
              : 'leader, stdio, or process group did not quiesce before the hard deadline';
      throw preserve(detail);
    }

    await new Promise((resolve) => setTimeout(resolve,
      Math.max(1, Math.min(POLL_MS, hardDeadline - now))));
  }
}
