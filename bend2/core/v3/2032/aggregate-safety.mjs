import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { acquireOwnedLock, closeOwnedLock, releaseOwnedLock } from
  '../../../toolchain-patches/2032/preview/lifecycle.mjs';

// Derive the expected load set from the frozen source bytes, independently of
// the compiler's `seen` map. Base is the sole non-local import in this cone.
export function expectedCheckClosure(root, checkPath, frozenFiles, derivedBase) {
  const found = new Set([fs.realpathSync(derivedBase)]);
  const visit = (file) => {
    const real = fs.realpathSync(file);
    assert.equal(real, file, `non-canonical proof path: ${file}`);
    if (found.has(real)) return;
    const relative = path.relative(root, real).replaceAll('\\', '/');
    assert.ok(relative && !relative.startsWith('../') && !path.isAbsolute(relative),
      `proof import escaped repository: ${relative}`);
    assert.ok(frozenFiles[relative], `unfrozen proof import: ${relative}`);
    found.add(real);
    const lines = fs.readFileSync(real, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!/^\s*import\b/.test(line)) continue;
      const match = /^\s*import\s+(Base|\.{1,2}\/[^\s]+\.bend)(?:\s+as\s+[A-Za-z_]\w*)?\s*(?:#.*)?$/.exec(line);
      assert.ok(match, `unexpected proof import in ${relative}`);
      if (match[1] !== 'Base') {
        const target = path.resolve(path.dirname(real), match[1]);
        assert.equal(fs.realpathSync(target), target, `non-canonical proof import: ${match[1]}`);
        visit(target);
      }
    }
  };
  visit(checkPath);
  return [...found].sort();
}

export function assertExactLoadedClosure(expected, actual) {
  assert.deepEqual([...actual].sort(), [...expected].sort(),
    'compiler loaded closure differs from the complete frozen CHECK import cone');
}

// An uncertain Worker exit leaves the ignored, exclusive lock in place. No
// automatic stale-lease reclamation is permitted; a later operator must first
// establish host/process identity and review the terminal evidence.
export async function runLeasedWorker(lockPath, payload, run) {
  const lease = acquireOwnedLock(lockPath, payload);
  try {
    return await run();
  } catch (error) {
    if (error?.workerMayBeLive === true || error?.cause?.workerMayBeLive === true) {
      lease.preserve = true;
      error.lockPreserved = lockPath;
    }
    throw error;
  } finally {
    if (lease.preserve) closeOwnedLock(lease);
    else releaseOwnedLock(lease);
  }
}

export function visibleMemorySnapshot({ platform = process.platform, hostFree,
  read = (file) => fs.readFileSync(file, 'utf8') } = {}) {
  let available = hostFree;
  assert.ok(Number.isSafeInteger(available) && available >= 0);
  if (platform !== 'linux') return { visibleUpperBoundBytes: available,
    mode: 'host-free-observation', cgroupPath: null, visibleLimits: [] };
  const cgroups = read('/proc/self/cgroup').trim().split(/\r?\n/);
  const unified = cgroups.filter(line => line.startsWith('0::'));
  assert.equal(unified.length, 1, 'one cgroup-v2 process path required');
  const cgroupPath = unified[0].slice(3);
  assert.ok(cgroupPath.startsWith('/'), 'cgroup-v2 path must be absolute');
  const segments = cgroupPath.split('/').filter(Boolean);
  assert.ok(segments.every(part => part !== '.' && part !== '..' &&
    !part.includes('\\') && !part.includes('\0')),
  'unsafe cgroup-v2 process path');
  const mounts = read('/proc/self/mountinfo').split(/\r?\n/).filter(line => {
    const parts = line.split(' - ');
    return parts.length === 2 && parts[1].split(' ')[0] === 'cgroup2' &&
      parts[0].split(' ')[4] === '/sys/fs/cgroup';
  });
  assert.equal(mounts.length, 1, 'one canonical cgroup-v2 mount required');
  const mountRoot = mounts[0].split(' - ')[0].split(' ')[3];
  assert.equal(mountRoot, '/', 'cgroup-v2 mount hides possible ancestor caps');
  const mountpoint = '/sys/fs/cgroup';
  const dirs = [mountpoint];
  for (const part of segments) dirs.push(path.posix.join(dirs.at(-1), part));
  const visibleLimits = [];
  for (const dir of dirs) {
    let max;
    try { max = read(`${dir}/memory.max`).trim(); }
    catch (error) {
      if (dir !== mountpoint || error?.code !== 'ENOENT') throw error;
      max = 'absent-root';
    }
    let current = null;
    if (max !== 'max' && max !== 'absent-root') {
      assert.match(max, /^\d+$/, 'malformed cgroup-v2 memory.max');
      current = read(`${dir}/memory.current`).trim();
      assert.match(current, /^\d+$/, 'malformed cgroup-v2 memory.current');
      const remaining = BigInt(max) - BigInt(current);
      available = Number(remaining > 0n && remaining < BigInt(available)
        ? remaining : remaining <= 0n ? 0n : BigInt(available));
    }
    visibleLimits.push({ path: dir.slice(mountpoint.length) || '/', max, current });
  }
  return { visibleUpperBoundBytes: available,
    mode: visibleLimits.some(item => /^\d+$/.test(item.max))
      ? 'namespace-visible-v2-finite' : 'namespace-visible-v2-unlimited',
    cgroupPath, mountRoot, visibleLimits };
}

export function admittedMemorySnapshot(options = {}) {
  const snapshot = visibleMemorySnapshot(options);
  const platform = options.platform ?? process.platform;
  assert.equal(platform, 'win32',
    'Linux proof Worker admission needs independently verified global cgroup ancestry');
  return { ...snapshot, availableBytes: snapshot.visibleUpperBoundBytes,
    mode: 'windows-host-free-admitted' };
}

export function assertProofNodeRuntime({ version = process.version,
  platform = process.platform, execArgv = process.execArgv,
  nodeOptions = process.env.NODE_OPTIONS ?? '' } = {}) {
  assert.deepEqual(execArgv, [], 'proof Worker requires no inherited Node flags');
  assert.equal(nodeOptions, '', 'proof Worker requires no NODE_OPTIONS');
  assert.ok((platform === 'win32' && version === 'v24.12.0') ||
    (platform === 'linux' && version === 'v22.23.1'),
  `unreviewed proof Node runtime: ${version} on ${platform}`);
}

export async function probeProofNodeImports(derived) {
  const previousFetch = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = async () => { fetches++; throw Error('network denied in proof runtime probe'); };
  try {
    const Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
    const Comp = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')).href);
    const book = Bend.book_nil();
    const source = Comp.js_lib({ ...book, order: [] }, true);
    assert.ok(typeof source === 'string' && source.length > 0);
    assert.equal(book.order.length, 0);
    const owned = Bend.book_nil();
    owned.tlds.IO = { b: false };
    assert.throws(() => Comp.js_lib({ ...owned, order: [] }, true),
      /name the compiler encodes itself/);
    const foreign = Bend.book_nil();
    foreign.tlds.X = { $: 'Def', i: [], b: false };
    foreign.ctrs.X = {};
    assert.throws(() => Comp.js_lib({ ...foreign, order: [] }, true),
      /names both a constructor and a foreign def/);
    assert.equal(fetches, 0);
    return { tsImports: ['bend.ts', 'comp.ts'], emptyRootNamespaceGuard: true,
      ownedNameRejected: true, foreignConstructorRejected: true,
      fixedRuntimeBytes: Buffer.byteLength(source), fetches,
      scope: 'source-only runtime syntax and empty-root compiler guard; no CHECK, BendTT or mutation Worker' };
  } finally {
    globalThis.fetch = previousFetch;
  }
}
