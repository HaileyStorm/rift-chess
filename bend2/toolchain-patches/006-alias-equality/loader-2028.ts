// Candidate-only Bun loader for finite project conformance, never the pinned
// v2 proof loader or production browser build. Local imports only.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Bend from '../../../.artifacts/bend2/toolchain-patches/alias-equality-2028/bend2/bend.ts';
import * as Comp from '../../../.artifacts/bend2/toolchain-patches/alias-equality-2028/bend2/comp.ts';
import type { BunPlugin } from 'bun';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const compiler = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028/bend2');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonicalHash = name => sha(Buffer.from(fs.readFileSync(path.join(compiler, name), 'utf8')
  .replace(/\r\n/g, '\n')));
assert.equal(canonicalHash('bend.ts'), '359543edcf8060817f68e1ae6aeaad79888a20de511e676d065abab271657dd8');
assert.equal(canonicalHash('comp.ts'), '49c40305ef96f91187cc5eb8fceac02cbf2c4992cbdee4819ec7c0fd3ee8887b');
assert.equal(canonicalHash('main.ts'), '5303e55d5b240d173f78c6c2f0b2e626a276482541a5d80fd1a22e986d1ab430');
process.env.BEND_NO_TELEMETRY = '1';
process.env.BEND_HUB = 'http://127.0.0.1:9';
globalThis.fetch = async () => { throw Error('Candidate conformance loader forbids remote fetch'); };

function relocateBaseEffects(book: Bend.Book): void {
  for (const def of Object.values(book.tlds)) {
    if (def.$ !== 'Def' || def.b !== true || !def.i) continue;
    def.i = def.i.map(spec => {
      const name = /^\.\/effs\/([A-Za-z0-9_-]+\.(?:c|js))$/.exec(spec)?.[1];
      if (!name) return spec;
      const file = path.join(compiler, 'effs', name);
      assert.ok(fs.statSync(file, { throwIfNoEntry: false })?.isFile());
      return file.replaceAll('\\', '/');
    });
  }
}

async function compile(file: string): Promise<string> {
  const book = Bend.book_nil();
  const entry = path.resolve(file).replaceAll('\\', '/');
  assert.ok(entry.startsWith(root.replaceAll('\\', '/') + '/'));
  await Bend.book_load(book, entry, '', new Map());
  relocateBaseEffects(book);
  Bend.book_valid(book);
  assert.equal(book.hols + book.open, 0, 'Unfilled Law or TODO');
  const outs = [...new Set(book.order)].filter(name => {
    const def = book.tlds[name];
    return def.$ === 'Def' && def.v !== null && def.b !== true && def.x === 0
      && def.i === undefined && Comp.io_base(book, def.T) === null;
  });
  return Comp.js_lib(book, outs, outs);
}

const plugin: BunPlugin = { name: 'rift-bend-candidate-2028-local-only', setup(build) {
  build.onLoad({ filter: /\.bend$/ }, async ({ path: file }) =>
    ({ contents: await compile(file), loader: 'js' }));
  build.onLoad({ filter: /[\\/]bend2[\\/]core[\\/]v2[\\/]conformance\.ts$/ }, async ({ path: file }) => {
    assert.equal(path.resolve(file), path.join(root, 'bend2/core/v2/conformance.ts'));
    const source = fs.readFileSync(file, 'utf8');
    const oldImport = "from '../../tests/interop.ts'";
    assert.equal(source.split(oldImport).length, 2, 'Expected one original interop import');
    return { contents: source.replace(oldImport,
      "from '../../toolchain-patches/006-alias-equality/interop-2028.ts'"), loader: 'ts' };
  });
} };
Bun.plugin(plugin);
