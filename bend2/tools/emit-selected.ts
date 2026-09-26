// Emit one validated Bend browser module in its own bounded Bun process.
// Example: node bend2/tools/bend.mjs --run bend2/tools/emit-selected.ts controller
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as Bend from '../../.artifacts/toolchains/bend/bend2/bend.ts';
import * as Comp from '../../.artifacts/toolchains/bend/bend2/comp.ts';
import { resolveBaseForeignImports } from './loader-v2.ts';
import { root, cacheDir, moduleSpecs, currentBinding, sha256 } from './selected-modules.mjs';

const name = process.argv[2];
const spec = moduleSpecs[name];
if (!spec) throw new Error('Choose controller, scene or chrome');
fs.mkdirSync(cacheDir, { recursive: true });
const phases = path.join(cacheDir, `${name}-${Date.now()}-${process.pid}.phases.jsonl`);
const started = performance.now();
function phase(label: string, fields: Record<string, unknown> = {}): void {
  const fd = fs.openSync(phases, 'a');
  try {
    fs.writeSync(fd, JSON.stringify({ label, elapsedMs: Math.round(performance.now() - started),
      rssMiB: Math.round(process.memoryUsage().rss / 1048576), ...fields }) + '\n');
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  console.log(`${label}: ${Math.round(performance.now() - started)}ms`);
}

const before = currentBinding(name);
phase('binding', { sources: before.sourceFiles.length });
const book = Bend.book_nil();
try {
  await Bend.book_load(book, path.join(root, spec.entry).replaceAll('\\', '/'), '',
    new Map<string, string | null>());
  phase('loaded', { definitions: book.order.length });
  resolveBaseForeignImports(book);
  Bend.book_valid(book);
  assert.equal(book.hols + book.open, 0, 'Unfilled law or TODO in Bend module');
  phase('validated');
  for (const item of spec.exports) {
    const def = book.tlds[item];
    assert.ok(def && def.$ === 'Def' && def.v !== null && def.b !== true &&
      def.x === 0 && def.i === undefined && Comp.io_base(book, def.T) === null,
    `Selected export is not a filled pure Bend definition: ${item}`);
  }
  phase('roots', { exports: spec.exports });
  const code = Comp.js_lib(book, spec.exports, spec.exports);
  phase('emitted', { bytes: Buffer.byteLength(code) });
  const after = currentBinding(name);
  assert.deepEqual(after, before, 'Bend source/toolchain changed during emission');
  const output = path.join(cacheDir, `${name}.js`);
  const manifest = path.join(cacheDir, `${name}.manifest.json`);
  fs.writeFileSync(output, code, 'utf8');
  fs.writeFileSync(manifest, JSON.stringify({ binding: after,
    output: { file: path.basename(output), bytes: Buffer.byteLength(code), sha256: sha256(code) },
    evidence: 'selected Bend JS emission; separate from browser/native/GPU acceptance' }, null, 2) + '\n');
  phase('bound', { sha256: sha256(code), manifest });
} catch (error) {
  phase('failed', { error: String(error).slice(0, 500) });
  if (error && typeof error === 'object' && '$' in error && error.$ === 'Err')
    throw new Error(Bend.err_show(error as Bend.Err));
  throw error;
}
