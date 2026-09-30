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
