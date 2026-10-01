import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { acquireOwnedLock, closeOwnedLock, releaseOwnedLock } from
  '../../../toolchain-patches/2032/preview/lifecycle.mjs';

const INIT_CGROUP_NAMESPACE_INODE = 0xEFFFFFFB;
const CGROUP2_SUPER_MAGIC = 0x63677270;

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

function decodeMountInfoPath(value) {
  assert.ok(!/\\(?!040|011|012|134)/.test(value), 'malformed mountinfo path escape');
  const decoded = value.replace(/\\(040|011|012|134)/g,
    (_, octal) => String.fromCharCode(Number.parseInt(octal, 8)));
  assert.ok(decoded.startsWith('/') && path.posix.normalize(decoded) === decoded,
    'mountinfo path must be absolute and canonical');
  return decoded;
}

function parseMountInfo(text) {
  return text.split(/\r?\n/).filter(Boolean).map(line => {
    const parts = line.split(' - ');
    assert.equal(parts.length, 2, 'malformed mountinfo entry');
    const fields = parts[0].trim().split(/\s+/);
    const superFields = parts[1].trim().split(/\s+/);
    assert.ok(fields.length >= 6 && /^\d+$/.test(fields[0]) &&
      /^\d+$/.test(fields[1]) && /^\d+:\d+$/.test(fields[2]) &&
      superFields.length >= 3, 'malformed mountinfo fields');
    return { id: fields[0], root: decodeMountInfoPath(fields[3]),
      mountpoint: decodeMountInfoPath(fields[4]), filesystem: superFields[0] };
  });
}

function sameOrAncestorPath(ancestor, target) {
  return target === ancestor || target.startsWith(`${ancestor}/`);
}

export function visibleMemorySnapshot({ platform = process.platform, hostFree,
  read = (file) => fs.readFileSync(file, 'utf8'),
  stat = (file) => fs.statSync(file),
  statfs = (file) => fs.statfsSync(file) } = {}) {
  let available = hostFree;
  assert.ok(Number.isSafeInteger(available) && available >= 0);
  if (platform !== 'linux') return { visibleUpperBoundBytes: available,
    mode: 'host-free-observation', cgroupPath: null, visibleLimits: [] };
  const namespaceInode = stat('/proc/self/ns/cgroup')?.ino;
  assert.equal(namespaceInode, INIT_CGROUP_NAMESPACE_INODE,
    'Linux proof Worker requires the init cgroup namespace to establish global cgroup ancestry');
  const cgroupFilesystemType = statfs('/sys/fs/cgroup')?.type;
  assert.equal(cgroupFilesystemType, CGROUP2_SUPER_MAGIC,
    'canonical cgroup path is not backed by the cgroup-v2 filesystem');
  const cgroups = read('/proc/self/cgroup').trim().split(/\r?\n/);
  const unified = cgroups.filter(line => line.startsWith('0::'));
  assert.equal(unified.length, 1, 'one cgroup-v2 process path required');
  const cgroupPath = unified[0].slice(3);
  assert.ok(cgroupPath.startsWith('/'), 'cgroup-v2 path must be absolute');
  assert.equal(path.posix.normalize(cgroupPath), cgroupPath,
    'cgroup-v2 process path must be canonical');
  const segments = cgroupPath.split('/').filter(Boolean);
  assert.ok(segments.every(part => part !== '.' && part !== '..' &&
    !part.includes('\\') && !part.includes('\0')),
  'unsafe cgroup-v2 process path');
  const mountpoint = '/sys/fs/cgroup';
  const mounts = parseMountInfo(read('/proc/self/mountinfo'));
  const cgroupMounts = mounts.filter(entry => entry.filesystem === 'cgroup2');
  assert.equal(cgroupMounts.length, 1, 'one cgroup-v2 mount required');
  const cgroupMount = cgroupMounts[0];
  assert.equal(cgroupMount.mountpoint, mountpoint, 'one canonical cgroup-v2 mount required');
  const mountRoot = cgroupMount.root;
  assert.equal(mountRoot, '/', 'cgroup-v2 mount hides possible ancestor caps');
  const dirs = [mountpoint];
  for (const part of segments) dirs.push(path.posix.join(dirs.at(-1), part));
  const protectedPaths = new Set([`${mountpoint}/cgroup.controllers`]);
  for (const dir of dirs) {
    protectedPaths.add(dir);
    protectedPaths.add(`${dir}/memory.max`);
    protectedPaths.add(`${dir}/memory.current`);
  }
  for (const entry of mounts) {
    const nested = entry.mountpoint.startsWith(`${mountpoint}/`);
    if (entry.mountpoint === mountpoint) {
      assert.equal(entry, cgroupMount,
        'another filesystem mount shadows the canonical cgroup-v2 root');
    } else if (nested && [...protectedPaths].some(target =>
      sameOrAncestorPath(entry.mountpoint, target))) {
      throw new Error(`cgroup ancestry path is shadowed by nested mount ${entry.mountpoint}`);
    }
  }
  const visibleLimits = [];
  for (const dir of dirs) {
    let max;
    try { max = read(`${dir}/memory.max`).trim(); }
    catch (error) {
      if (dir !== mountpoint || error?.code !== 'ENOENT') throw error;
      const controllers = read(`${mountpoint}/cgroup.controllers`).trim().split(/\s+/).filter(Boolean);
      assert.equal(new Set(controllers).size, controllers.length,
        'malformed cgroup-v2 root controller list');
      assert.ok(controllers.every(name => /^[a-z_]+$/.test(name)),
        'malformed cgroup-v2 root controller list');
      assert.ok(controllers.includes('memory'),
        'root memory.max is absent without cgroup-v2 memory controller proof');
      max = 'absent-root';
    }
    let current = null;
    if (dir !== mountpoint) {
      current = read(`${dir}/memory.current`).trim();
      assert.match(current, /^\d+$/, 'malformed cgroup-v2 memory.current');
    }
    if (max !== 'max' && max !== 'absent-root') {
      assert.match(max, /^\d+$/, 'malformed cgroup-v2 memory.max');
      if (current === null) {
        current = read(`${dir}/memory.current`).trim();
        assert.match(current, /^\d+$/, 'malformed cgroup-v2 memory.current');
      }
      const remaining = BigInt(max) - BigInt(current);
      available = Number(remaining > 0n && remaining < BigInt(available)
        ? remaining : remaining <= 0n ? 0n : BigInt(available));
    }
    visibleLimits.push({ path: dir.slice(mountpoint.length) || '/', max, current });
  }
  return { visibleUpperBoundBytes: available,
    mode: visibleLimits.some(item => /^\d+$/.test(item.max))
      ? 'namespace-visible-v2-finite' : 'namespace-visible-v2-unlimited',
    cgroupNamespaceInode: namespaceInode,
    cgroupFilesystemType,
    ancestryMode: 'init-cgroup-namespace-visible-v2-full-ancestry',
    cgroupPath, mountRoot, visibleLimits };
}

export function admittedMemorySnapshot(options = {}) {
  const snapshot = visibleMemorySnapshot(options);
  const platform = options.platform ?? process.platform;
  if (platform === 'linux') return { ...snapshot,
    availableBytes: snapshot.visibleUpperBoundBytes,
    mode: 'linux-init-cgroup-full-ancestry-admitted' };
  assert.equal(platform, 'win32');
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
