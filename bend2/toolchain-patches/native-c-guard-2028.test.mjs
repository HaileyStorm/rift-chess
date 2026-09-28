// Candidate-only proof that the empty selected emit guard composes with C
// emission on a small real Bend program. No pin or native application build.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.BEND_NO_TELEMETRY = '1';
let deniedFetches = 0;
globalThis.fetch = async () => { deniedFetches++; throw Error('Native candidate test network fetch denied'); };
await import('./proof-guard-2028.test.mjs'); // exact 95-file compiler tree and collisions
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const compiler = path.join(root, '.artifacts/bend2/toolchain-patches/final-2028-proof-e943f02a/bend2');
const fixture = path.join(root, 'bend2/core/v3/fixtures/indented.bend');
const helper = path.join(root, 'bend2/core/v3/fixtures/indented-helper.bend');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fixtureSha256 = '28cd1194ad39241e0eac857178336de1e54a188a09c98ed3a84424a0dfb0bd8e';
const helperSha256 = '187e3972e579403f6cfa1d0f244ea133983aa51a98d2bc7c142f0c3cf368d8e6';
assert.equal(sha(fs.readFileSync(fixture)), fixtureSha256);
assert.equal(sha(fs.readFileSync(helper)), helperSha256);
const Bend = await import(pathToFileURL(path.join(compiler, 'bend.ts')).href);
const Comp = await import(pathToFileURL(path.join(compiler, 'comp.ts')).href);
const book = Bend.book_nil();
await Bend.book_load(book, fixture.replaceAll('\\', '/'), '', new Map());
Bend.book_valid(book);
assert.equal(book.hols + book.open, 0);
Comp.js_lib(book, [], [], { internal: true });
const c = Comp.compile_book(book);
assert.equal(book.order.length, 497);
assert.equal(Buffer.byteLength(c), 74265);
assert.equal(sha(c), '4e4a80984dcaafaf0ab44baed4bc73d0e7e9f5c5b99164a52669a632a3412516');
assert.equal(sha(fs.readFileSync(fixture)), fixtureSha256);
assert.equal(sha(fs.readFileSync(helper)), helperSha256);
assert.equal(deniedFetches, 0);
console.log(JSON.stringify({ candidateOnly: true, terms: book.order.length,
  cBytes: Buffer.byteLength(c), cSha256: sha(c), deniedFetches, result: 'passed' }));
