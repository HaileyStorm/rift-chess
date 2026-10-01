import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import { parentPort, workerData } from 'node:worker_threads';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

process.env.BEND_NO_TELEMETRY = '1';
let networkCalls = 0;
globalThis.fetch = async () => {
  networkCalls++;
  throw new Error('unexpected network access');
};

const minFreeBytes = 2.5 * 1024 ** 3;
const started = performance.now();
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
function respond(message) {
  parentPort.postMessage(message);
  parentPort.close();
}
function checkFreeMemory(stage) {
  const freeBytes = os.freemem();
  const rssBytes = process.memoryUsage().rss;
  assert.ok(freeBytes >= minFreeBytes,
    `stop before ${stage}: free physical RAM ${freeBytes} B is below ${minFreeBytes} B`);
  return { freeBytes, rssBytes };
}

async function main() {
  const memoryBeforeLoad = checkFreeMemory('selected source load');
  const Bend = await import(pathToFileURL(path.join(workerData.derived, 'bend2/bend.ts')));
  const Comp = await import(pathToFileURL(path.join(workerData.derived, 'bend2/comp.ts')));
  const { emitSelectedLibrary2032 } = await import(pathToFileURL(
    path.join(workerData.repo, 'bend2/toolchain-patches/2032/build-adapter/selected-library.mjs')));
  const { loadWithStableImports } = await import(pathToFileURL(
    path.join(workerData.repo, 'bend2/toolchain-patches/2032/tag-identity/preload-root.mjs')));
  const book = Bend.book_nil();
  const loadStart = performance.now();
  let tagIdentity;
  try {
    tagIdentity = await loadWithStableImports(Bend, book,
      workerData.entry.replaceAll('\\', '/'), path.join(workerData.repo, 'bend2'));
    Bend.book_valid(book);
  } catch (error) {
    throw new Error((error?.$ === 'Err' ? Bend.err_show(error)
      : error?.message ?? String(error)).slice(0, 1200));
  }
  const loadedBendSources = [...tagIdentity.seen.keys()].map(file => {
    const real = fs.realpathSync(file);
    assert.equal(real, file, 'loaded Bend source path changed identity');
    const stat = fs.lstatSync(real);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'loaded source is not a regular file');
    const relative = path.relative(workerData.repo, real).replaceAll('\\', '/');
    assert.ok(relative !== '..' && !relative.startsWith('../') && !path.isAbsolute(relative),
      'loaded Bend source escaped the bound repository/toolchain roots');
    return { path: relative, sha256: sha256(fs.readFileSync(real)) };
  }).sort((a, b) => a.path.localeCompare(b.path));
  assert.deepEqual(loadedBendSources, workerData.bendSourceFiles,
    'actual loaded Bend closure differs from the source-bound import graph');
  assert.equal(book.hols, 0, 'selected module has unfilled laws or TODOs');
  const loadMs = performance.now() - loadStart;
  const memoryAfterLoad = checkFreeMemory('selected JavaScript emission');
  for (const root of workerData.exports) {
    const def = book.tlds[root];
    assert.ok(book.order.includes(root) && def?.$ === 'Def' && def.v !== null &&
      def.b !== true && def.x === 0 && def.i === undefined &&
      Comp.io_base(book, def.T) === null,
    `selected export is not a filled pure hostable definition: ${root}`);
  }
  const emitStart = performance.now();
  const code = emitSelectedLibrary2032(Bend, Comp, book, workerData.exports);
  const emitMs = performance.now() - emitStart;
  const memoryAfterEmit = checkFreeMemory('selected cache write');
  const bytes = Buffer.from(code, 'utf8');
  fs.writeFileSync(workerData.outputPath, bytes, { flag: 'wx' });
  const fd = fs.openSync(workerData.outputPath, 'r');
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  respond({
    ok: true,
    output: { bytes: bytes.length, sha256: sha256(bytes) },
    timing: { loadMs: Math.round(loadMs), emitMs: Math.round(emitMs), workerMs: Math.round(performance.now() - started) },
    memory: { beforeLoad: memoryBeforeLoad, afterLoad: memoryAfterLoad, afterEmit: memoryAfterEmit },
    tagIdentity: { policy: 'stable-imports-empty-root/1',
      preloaded: tagIdentity.preloaded, rootNamespace: tagIdentity.seen.get(fs.realpathSync(workerData.entry)),
      loadedBendFiles: loadedBendSources.length },
    networkCalls,
  });
}

main().catch((error) => respond({ ok: false, error: String(error).slice(0, 1800), networkCalls }));
