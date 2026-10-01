import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bindCompilerBaseEol, bindCompilerEol } from '../preview/compiler-eol.mjs';
import { moduleSpecs } from '../../../tools/selected-modules.mjs';
import { loadWithStableImports, stableDirectImports } from './preload-root.mjs';

process.env.BEND_NO_TELEMETRY = '1';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = {
  'shared/Frame.bend': 'e2abd1a6f88e21a26f5257abf86e32b5c6a2feee1d1b4e3706904caa2ede9cc3',
  'a/Producer.bend': 'a6f9ecbed0ca6dd58d01c8ac0a317e7a9d5b64297134d949f053539329266be8',
  'b/deep/Consumer.bend': '129872417bf602af230dbf47ab975ffaabab7bfc09b9dc2bc7d6acee3d4ac3b8',
};
for (const [relative, expected] of Object.entries(inputs))
  assert.equal(sha(fs.readFileSync(path.join(here, relative))), expected, `fixture changed: ${relative}`);
const compiler = bindCompilerEol(relative => fs.readFileSync(path.join(derived, relative)));
const base = bindCompilerBaseEol(fs.readFileSync(path.join(derived, 'bend2/base.bend')), compiler.eol);
let fetches = 0;
globalThis.fetch = async () => { fetches++; throw Error('tag-identity test denies network'); };
const Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
const Comp = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')).href);
const load = async (relative, namespace) => {
  const book = Bend.book_nil();
  const seen = new Map();
  try {
    await Bend.book_load(book, path.join(here, relative), namespace, seen);
    Bend.book_valid(book);
  } catch (error) {
    throw new Error((error?.$ === 'Err' ? Bend.err_show(error)
      : error?.message ?? String(error)).slice(0, 1200));
  }
  assert.equal(book.hols, 0);
  return { book, seen };
};
const loadStable = async relative => {
  const book = Bend.book_nil();
  let result;
  try {
    result = await loadWithStableImports(Bend, book, path.join(here, relative), here);
    Bend.book_valid(book);
  } catch (error) {
    throw new Error((error?.$ === 'Err' ? Bend.err_show(error)
      : error?.message ?? String(error)).slice(0, 1200));
  }
  assert.equal(book.hols, 0);
  return { book, ...result };
};
const moduleFor = async book => import(`data:text/javascript;base64,${Buffer.from(Comp.js_lib(book, true)).toString('base64')}`);

const oldProducer = await load('a/Producer.bend', '');
const oldConsumer = await load('b/deep/Consumer.bend', '');
const oldP = await moduleFor(oldProducer.book);
const oldC = await moduleFor(oldConsumer.book);
const oldFrame = oldP.default.make();
assert.equal(oldFrame.$, '../shared/Frame.Frame');
assert.ok(Object.hasOwn(oldConsumer.book.ctrs, '../../shared/Frame.Frame'));
assert.throws(() => oldC.default.plus_one(oldFrame), /has no tag/,
  'the fixture no longer reproduces the 2.0.32 cross-library tag mismatch');

const producer = await loadStable('a/Producer.bend');
const consumer = await loadStable('b/deep/Consumer.bend');
const p = await moduleFor(producer.book);
const c = await moduleFor(consumer.book);
assert.deepEqual(Object.keys(p.default), ['make']);
assert.deepEqual(Object.keys(c.default), ['plus_one']);
const frame = p.default.make();
const stableTag = 'shared/Frame.Frame';
assert.equal(frame.$, stableTag);
assert.ok(Object.hasOwn(consumer.book.ctrs, stableTag));
assert.equal(c.default.plus_one(frame), 42n);
assert.deepEqual(producer.preloaded, [['shared/Frame.bend', 'shared/Frame']]);
assert.deepEqual(consumer.preloaded, [['shared/Frame.bend', 'shared/Frame']]);
const direct = Object.fromEntries(Object.entries(moduleSpecs).map(([name, spec]) =>
  [name, stableDirectImports(path.join(root, spec.entry), path.join(root, 'bend2'))]));
assert.deepEqual(Object.fromEntries(Object.entries(direct).map(([name, value]) =>
  [name, value.imports.length])), { controller: 15, scene: 22, chrome: 3, menu: 10 });
assert.ok(direct.controller.imports.some(item => item.namespace === 'graphics/Scene'));
assert.ok(direct.scene.imports.some(item => item.namespace === 'graphics/Scene'));
assert.equal(fetches, 0);
console.log(JSON.stringify({ schema: 'rift-bend-2032-tag-identity/1', passed: true,
  compilerEol: compiler.eol, baseSha256: base.sha256,
  inputSha256: inputs, oldTag: oldFrame.$, stableTag: frame.$,
  oldExports: Object.keys(oldP.default), stableExports: Object.keys(p.default),
  scope: 'two small separately loaded JS libraries; not the full browser build or rendered frame' }));
