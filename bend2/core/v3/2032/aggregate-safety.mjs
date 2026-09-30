import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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

export function effectiveFreeBytes({ platform = process.platform, hostFree,
  read = (file) => fs.readFileSync(file, 'utf8') } = {}) {
  let available = hostFree;
  assert.ok(Number.isSafeInteger(available) && available >= 0);
  if (platform === 'linux') {
    // A v1, absent, or unlimited v2 controller cannot establish this process's
    // effective memory admission from os.freemem(). Stop before creating a
    // large Worker instead of assuming host-global free RAM is allocatable.
    const limit = read('/sys/fs/cgroup/memory.max').trim();
    assert.notEqual(limit, 'max', 'finite cgroup-v2 memory limit required on Linux');
    const current = read('/sys/fs/cgroup/memory.current').trim();
    assert.match(limit, /^\d+$/);
    assert.match(current, /^\d+$/);
    const remaining = BigInt(limit) - BigInt(current);
    available = Number(remaining > 0n ? remaining < BigInt(available)
      ? remaining : BigInt(available) : 0n);
  }
  return available;
}
