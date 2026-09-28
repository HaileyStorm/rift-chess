// Draft versioned successor to graphics/v2/tools/actual_compiler.mjs.
// Historical v2 review inputs remain byte-identical; this is not adopted by
// their verifier or an approved new graphics-library release.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const pin = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8'));
const compiler = path.join(root, '.artifacts/toolchains/bend');
process.env.BEND_NO_TELEMETRY = '1';
let deniedFetches = 0;
globalThis.fetch = async () => { deniedFetches++; throw Error('Graphics checker network fetch denied'); };
function git(...args) {
  const result = spawnSync('git', ['-C', compiler, ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw Error(result.stderr || 'Git failed');
  return result.stdout.trim();
}
if (git('rev-parse', 'HEAD') !== pin.bendCommit) throw Error('Compiler pin mismatch');
if (git('status', '--porcelain', '--untracked-files=no'))
  throw Error('Compiler tracked tree is dirty');
const Bend = await import(pathToFileURL(path.join(compiler, 'bend2/bend.ts')).href);
const Comp = await import(pathToFileURL(path.join(compiler, 'bend2/comp.ts')).href);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

export async function checked(file) {
  const resolved = path.resolve(file);
  const book = Bend.book_nil(), seen = new Map();
  await Bend.book_load(book, resolved.replaceAll('\\', '/'), '', seen);
  const sibling = path.join(path.dirname(resolved), 'LAWS.bend');
  if (path.basename(resolved) === 'PROOF.bend' && fs.existsSync(sibling) &&
      !seen.has(fs.realpathSync(sibling))) throw Error('PROOF must import sibling LAWS');
  Bend.book_valid(book);
  // Both the current pin and 2.0.28 reach their ownership/collision guard
  // before any selected root becomes live through this empty emit.
  Comp.js_lib(book, [], [], { internal: true });
  if (book.hols + book.open) throw Error(`${book.hols + book.open} unfilled laws/TODOs`);
  const promises = Object.entries(book.tlds)
    .filter(([key, value]) => value.b !== true && (value.u === true || value.i !== undefined))
    .map(([key]) => key);
  const closure = [...seen.keys()].filter(name => fs.existsSync(name) && fs.statSync(name).isFile())
    .sort().map(name => ({ path: path.relative(root, name), sha256: sha(fs.readFileSync(name)) }));
  if (deniedFetches) throw Error(`${deniedFetches} network fetch attempts denied`);
  return { book, closure, promises };
}

export function exportsOf(book) {
  return [...new Set(book.order)].filter(key => {
    const def = book.tlds[key];
    return !key.includes('/') && def.$ === 'Def' && def.v !== null && def.b !== true &&
      def.x === 0 && def.i === undefined && Comp.io_base(book, def.T) === null;
  });
}

const [mode, input, target] = process.argv.slice(2);
if (mode) {
  try {
    if (!['check', 'js', 'c'].includes(mode) || !input)
      throw Error('Usage: actual_compiler.mjs check|js|c input.bend [output]');
    const source = path.resolve(input);
    const output = target ? path.resolve(target) : null;
    if (mode !== 'check' && !output) throw Error('An output path is required');
    process.chdir(path.join(compiler, 'bend2'));
    const began = performance.now(), result = await checked(source);
    if (mode === 'js')
      fs.writeFileSync(output, Comp.js_lib(result.book, exportsOf(result.book), exportsOf(result.book)), { flag: 'wx' });
    if (mode === 'c') fs.writeFileSync(output, Comp.compile_book(result.book), { flag: 'wx' });
    console.log(JSON.stringify({ ok: true, mode, input: path.relative(root, source),
      ms: performance.now() - began, compiler: pin.bendCommit, host: process.version,
      guard: 'empty selected js_lib', promises: result.promises,
      closure: result.closure, deniedFetches }));
  } catch (error) {
    console.error(error?.$ === 'Err' ? Bend.err_show(error) : error?.stack ?? String(error));
    process.exitCode = 1;
  }
}
