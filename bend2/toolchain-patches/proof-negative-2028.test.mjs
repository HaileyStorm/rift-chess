// Source-bound, small-book rejection controls for the candidate proof verdict.
// This is diagnostic evidence, not a replacement for the frozen aggregate.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
process.env.BEND_NO_TELEMETRY = '1';
process.env.BEND_HUB = 'http://127.0.0.1:9';
let deniedFetches = 0;
globalThis.fetch = async () => { deniedFetches++; throw Error('Proof test network fetch denied'); };
await import('./proof-guard-2028.test.mjs'); // checks all 95 candidate compiler files
const { proofNegativeControls, proofVerdict } = await import('./verify-v2-candidate-2028.mjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const compiler = path.join(root, '.artifacts/bend2/toolchain-patches/final-2028-proof-e943f02a/bend2');
const fixture = path.join(root, 'bend2/toolchain-patches/fixtures/proof-authority-negative-2028.bend');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fixtureSha256 = sha(fs.readFileSync(fixture));
assert.equal(fixtureSha256,
  '06d304ddeb723aca439615ba45d81322ce0d60142136e8c567ccf98b01f49e64',
  'Reviewed proof rejection fixture changed');
const Bend = await import(pathToFileURL(path.join(compiler, 'bend.ts')).href);
const Comp = await import(pathToFileURL(path.join(compiler, 'comp.ts')).href);
const book = Bend.book_nil();
await Bend.book_load(book, fixture.replaceAll('\\', '/'), '', new Map());
Bend.book_valid(book);
assert.equal(book.order.length, 497, 'Reviewed proof rejection term count changed');
Comp.js_lib(book, [], [], { internal: true });
const positive = proofVerdict(Bend, book);
assert.equal(positive.holes, 0);
assert.equal(positive.tainted, 0);
const negative = proofNegativeControls(Bend, book);
assert.equal(deniedFetches, 0);
assert.equal(sha(fs.readFileSync(fixture)), fixtureSha256);
console.log(JSON.stringify({ candidateOnly: true, fixtureSha256,
  terms: book.order.length, negativeControls: negative, deniedFetches,
  result: 'passed' }));
