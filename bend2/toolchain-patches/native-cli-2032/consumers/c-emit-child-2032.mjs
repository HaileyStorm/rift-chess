// Bounded child for source-only C emission; no artifact or executable writes.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.BEND_NO_TELEMETRY = '1';
let fetches = 0;
globalThis.fetch = async () => { fetches++; throw Error('network denied in C-emission child'); };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const candidate = fs.realpathSync(process.argv[2] ?? '');
const source = path.join(candidate, 'bend2/NativeCLI.bend');
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032/bend2');
const Bend = await import(pathToFileURL(path.join(derived, 'bend.ts')).href);
const Comp = await import(pathToFileURL(path.join(derived, 'comp.ts')).href);
const book = Bend.book_nil();
const seen = new Map();
try {
  await Bend.book_load(book, source, '', seen);
  Bend.book_valid(book);
  assert.equal(book.hols, 0);
  const c = Comp.compile_book(book);
  const bytes = Buffer.from(c, 'utf8');
  assert.ok(bytes.length > 0);
  assert.equal(fetches, 0);
  console.log(JSON.stringify({ schema: 'rift-native-cli-2032-c-emission-child/1', ok: true,
    bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    definitions: book.order.length, loadedFiles: seen.size, holes: book.hols,
    includesX11: c.includes('#include <X11/'),
    includesAlsa: c.includes('#include <alsa/'),
    bangs: !/^#define BANGS\s+0$/m.test(c), fetches }));
} catch (error) {
  console.error((error?.$ === 'Err' ? Bend.err_show(error)
    : error?.message ?? String(error)).slice(0, 1400));
  process.exitCode = 1;
}
