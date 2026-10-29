import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const FLAGS = Object.freeze(['--experimental-transform-types']);
export const LIMITS = Object.freeze({ stackSizeMb: 64, maxOldGenerationSizeMb: 65536 });
export function directoryIdentity(directory) {
  assert.equal(fs.realpathSync(directory), directory);
  const s = fs.lstatSync(directory, { bigint: true }); assert.ok(s.isDirectory() && !s.isSymbolicLink());
  return { path: directory, dev: String(s.dev), ino: String(s.ino) };
}
export function syncDirectory(directory) {
  directoryIdentity(directory);
  const fd = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY);
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
export function read(file) {
  assert.equal(path.resolve(file), file); assert.equal(fs.realpathSync(file), file);
  const before = fs.lstatSync(file, { bigint: true }); assert.ok(before.isFile() && !before.isSymbolicLink());
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  let bytes;
  try {
    bytes = fs.readFileSync(fd);
    for (const current of [fs.fstatSync(fd, { bigint: true }), fs.lstatSync(file, { bigint: true })])
      for (const key of ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs']) assert.equal(current[key], before[key]);
  } finally { fs.closeSync(fd); }
  assert.equal(fs.realpathSync(file), file);
  return { bytes, identity: { path: file, bytes: bytes.length, sha256: sha256(bytes),
    dev: String(before.dev), ino: String(before.ino), mode: Number(before.mode & 0o777n) } };
}
export function verify(fences) {
  for (const expected of fences) assert.deepEqual(read(expected.path).identity, expected);
}
export function write(file, data, mode = 0o600) {
  directoryIdentity(path.dirname(file)); const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const fd = fs.openSync(file, 'wx', mode);
  try {
    let offset = 0;
    while (offset < bytes.length) { const n = fs.writeSync(fd, bytes, offset, bytes.length - offset); assert.ok(n > 0); offset += n; }
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  syncDirectory(path.dirname(file));
  const result = read(file); assert.deepEqual(result.bytes, bytes); return result.identity;
}
export const writeJson = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
function count(file) {
  const value = fs.readFileSync(file, 'ascii').trim(); assert.match(value, /^[0-9]+$/);
  const n = Number(value); assert.ok(Number.isSafeInteger(n) && n >= 0); return n;
}
function events(directory, requireZero = false) {
  const raw = fs.readFileSync(path.join(directory, 'memory.events'), 'ascii'), counters = {};
  for (const line of raw.trim().split('\n')) {
    const m = /^([a-z_]+)\s+([0-9]+)$/.exec(line); assert.ok(m); assert.ok(!Object.hasOwn(counters, m[1])); counters[m[1]] = m[2];
  }
  for (const name of ['oom', 'oom_kill', 'oom_group_kill']) {
    assert.ok(Object.hasOwn(counters, name));
    if (requireZero) assert.equal(counters[name], '0', 'native containment OOM event');
  }
  return { raw, counters };
}
// The cap is containment; only OUTER ancestors must reserve remaining growth.
export function memorySnapshot(aggregate, unit, phase, expectedLeaf = null, requireGrowth = true) {
  const policy = { unit, memoryMaxBytes: 72 * 1024 ** 3, swapMaxBytes: 0, oomGroup: 1, reserveBytes: 8 * 1024 ** 3 };
  const sample = { phase, sampledAt: new Date().toISOString(), policy, admitted: false, requireGrowth };
  try {
    assert.match(unit, /^[A-Za-z0-9_.@-]+\.service$/);
    const m = /^MemAvailable:\s+(\d+)\s+kB$/m.exec(fs.readFileSync('/proc/meminfo', 'ascii')); assert.ok(m);
    const available = Number(m[1]) * 1024; assert.ok(Number.isSafeInteger(available));
    sample.hostMemAvailableBytes = available;
    const ancestry = aggregate.admittedMemorySnapshot({ hostFree: available });
    sample.ancestry = ancestry;
    assert.equal(ancestry.mode, 'linux-init-cgroup-full-ancestry-admitted');
    assert.equal(ancestry.ancestryMode, 'init-cgroup-namespace-visible-v2-full-ancestry');
    const cg = ancestry.cgroupPath;
    assert.ok(cg.startsWith(`/user.slice/user-${process.getuid()}.slice/user@${process.getuid()}.service/`));
    assert.equal(path.posix.basename(cg), unit);
    const directory = '/sys/fs/cgroup' + cg, identity = directoryIdentity(directory);
    if (expectedLeaf) assert.deepEqual(identity, expectedLeaf);
    const row = ancestry.visibleLimits.find(r => r.path === cg); assert.ok(row);
    const leaf = { identity, max: count(directory + '/memory.max'), current: count(directory + '/memory.current'),
      swap: count(directory + '/memory.swap.max'), swapCurrent: count(directory + '/memory.swap.current'),
      oomGroup: count(directory + '/memory.oom.group'), events: events(directory, true) };
    sample.leaf = leaf;
    assert.equal(leaf.max, policy.memoryMaxBytes); assert.equal(row.max, String(leaf.max));
    assert.equal(leaf.swap, 0); assert.equal(leaf.swapCurrent, 0); assert.equal(leaf.oomGroup, 1); assert.ok(leaf.current <= leaf.max);
    const required = leaf.max - leaf.current + policy.reserveBytes, outer = [];
    sample.outer = outer; sample.requiredOutsideHeadroomBytes = required;
    for (const r of ancestry.visibleLimits.filter(r => r.path !== cg && r.max !== 'max' && r.max !== 'absent-root')) {
      assert.match(r.max, /^[0-9]+$/); assert.match(r.current, /^[0-9]+$/);
      const headroom = BigInt(r.max) - BigInt(r.current), d = '/sys/fs/cgroup' + (r.path === '/' ? '' : r.path);
      outer.push({ identity: directoryIdentity(d), max: r.max, current: r.current, headroom: String(headroom), events: events(d) });
      if (requireGrowth) assert.ok(headroom >= BigInt(required), 'outer cgroup lacks growth plus reserve');
    }
    if (requireGrowth) assert.ok(available >= required, 'host lacks growth plus reserve');
    assert.deepEqual(directoryIdentity(directory), identity);
    assert.ok(fs.readFileSync('/proc/self/cgroup', 'ascii').split('\n').includes('0::' + cg));
    Object.assign(sample, { hostMemAvailableBytes: available, ancestry, leaf, outer, requiredOutsideHeadroomBytes: required, admitted: true });
    return sample;
  } catch (error) {
    sample.error = String(error.message ?? error); error.memoryAdmission = sample; throw error;
  }
}

