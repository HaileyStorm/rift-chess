// Candidate-only negative controls for the 2.0.28+006 ownership guard.
// Does not change the pinned compiler or replace the frozen v2 checker.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const compiler = path.join(root, '.artifacts/bend2/toolchain-patches/final-2028-proof-e943f02a/bend2');
const expected = {
  'bend.ts': '359543edcf8060817f68e1ae6aeaad79888a20de511e676d065abab271657dd8',
  'comp.ts': '49c40305ef96f91187cc5eb8fceac02cbf2c4992cbdee4819ec7c0fd3ee8887b',
};
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function sourceFiles(directory, prefix = '') {
  const found = Object.create(null);
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert.ok(!entry.isSymbolicLink(), `Compiler source contains symlink: ${name}`);
    if (entry.isDirectory()) Object.assign(found, sourceFiles(file, name));
    else {
      assert.ok(entry.isFile(), `Compiler source contains special entry: ${name}`);
      found[name] = sha(fs.readFileSync(file));
    }
  }
  return found;
}
const files = sourceFiles(compiler);
const sorted = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
assert.equal(sorted.length, 95, 'Reviewed candidate source file count changed');
assert.equal(sha(Buffer.from(JSON.stringify(sorted), 'utf8')),
  '2ac802f1c362e80ba1198cb9a98dc867e28a4750f2e284edfa5af99c15e92c46',
  'Reviewed candidate source tree changed');
for (const [name, digest] of Object.entries(expected)) {
  const file = path.join(compiler, name);
  assert.equal(sha(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')), digest,
    `Reviewed candidate ${name} changed`);
}
const Bend = await import(pathToFileURL(path.join(compiler, 'bend.ts')).href);
const Comp = await import(pathToFileURL(path.join(compiler, 'comp.ts')).href);
const guarded = book => Comp.js_lib(book, [], [], { internal: true });

assert.equal(typeof guarded(Bend.book_nil()), 'string',
  'empty selected emit should accept an empty book');
const reserved = Bend.book_nil();
reserved.tlds.IO = { $: 'Def', b: false };
assert.throws(() => guarded(reserved),
  /IO is a name the compiler encodes itself: name yours apart/,
  'empty selected emit must run the private reserved-name guard');
const collision = Bend.book_nil();
collision.tlds.Evil = { $: 'Def', i: ['host'] };
collision.ctrs.Evil = {};
assert.throws(() => guarded(collision),
  /Evil names both a constructor and a foreign def: name one apart/,
  'empty selected emit must run the private foreign-constructor guard');

console.log(JSON.stringify({ candidateOnly: true, checks: 3, compilerFiles: sorted.length,
  compilerTreeSha256: '2ac802f1c362e80ba1198cb9a98dc867e28a4750f2e284edfa5af99c15e92c46',
  compilerCanonicalSha256: expected, result: 'passed' }));
