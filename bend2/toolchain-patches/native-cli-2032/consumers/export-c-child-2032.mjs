// Exact one-output C emitter for an isolated application candidate.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.BEND_NO_TELEMETRY = '1';
let fetches = 0;
globalThis.fetch = async () => { fetches++; throw Error('network denied in C export'); };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const candidate = fs.realpathSync(process.argv[2] ?? '');
const output = path.resolve(process.argv[3] ?? '');
const outRoot = fs.realpathSync(path.join(root, '.artifacts/bend2/native-cli-2032'));
const parent = fs.realpathSync(path.dirname(output));
assert.equal(path.basename(output), 'NativeCLI.c');
assert.equal(path.dirname(parent), outRoot);
assert.match(path.basename(parent), /^run-[^\\/]+$/);
assert.ok(fs.lstatSync(parent).isDirectory() && !fs.lstatSync(parent).isSymbolicLink());
assert.equal(path.join(parent, 'NativeCLI.c'), output);
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032/bend2');
const Bend = await import(pathToFileURL(path.join(derived, 'bend.ts')).href);
const Comp = await import(pathToFileURL(path.join(derived, 'comp.ts')).href);
const book = Bend.book_nil();
const seen = new Map();
try {
  await Bend.book_load(book, path.join(candidate, 'bend2/NativeCLI.bend'), '', seen);
  Bend.book_valid(book);
  assert.equal(book.hols, 0);
  const c = Comp.compile_book(book);
  const bytes = Buffer.from(c, 'utf8');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256, '373f735cd13c42b2a2f307646bfd08931c93e0fc599c362a12676ffdc4a77281');
  assert.equal(fetches, 0);
  const fd = fs.openSync(output, 'wx');
  try {
    let at = 0;
    while (at < bytes.length) {
      const n = fs.writeSync(fd, bytes, at, bytes.length - at, at);
      if (n <= 0) throw new Error('C artifact write made no progress');
      at += n;
    }
    fs.fsyncSync(fd);
    assert.ok(fs.fstatSync(fd).isFile());
  } finally {
    fs.closeSync(fd);
  }
  const stat = fs.lstatSync(output);
  assert.ok(stat.isFile() && !stat.isSymbolicLink());
  assert.equal(stat.size, bytes.length);
  assert.equal(createHash('sha256').update(fs.readFileSync(output)).digest('hex'), sha256);
  console.log(JSON.stringify({ schema: 'rift-native-cli-2032-c-export-child/1', ok: true,
    bytes: bytes.length, sha256, definitions: book.order.length,
    loadedFiles: seen.size, holes: book.hols, fetches,
    includesX11: c.includes('#include <X11/'),
    includesAlsa: c.includes('#include <alsa/'),
    bangs: !/^#define BANGS\s+0$/m.test(c) }));
} catch (error) {
  console.error((error?.$ === 'Err' ? Bend.err_show(error)
    : error?.message ?? String(error)).slice(0, 1400));
  process.exitCode = 1;
}
