// Diagnostic only: locate load/check cost of the draft whole-Bend presentation.
// Run with `node bend2/tools/bend.mjs --run bend2/tools/check-v2-phases.ts`.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as Bend from '../../.artifacts/toolchains/bend/bend2/bend.ts';
import { resolveBaseForeignImports } from './loader-v2.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const input = path.join(root, 'bend2/ApplicationV2.bend');
const dir = path.join(root, '.artifacts/bend2/v2-preview/check-phases');
fs.mkdirSync(dir, { recursive: true });
const log = path.join(dir, `check-${Date.now()}-${process.pid}.jsonl`);
const started = performance.now();
const hash = () => createHash('sha256').update(fs.readFileSync(input)).digest('hex');
const before = hash();
function phase(name: string, details: Record<string, unknown> = {}): void {
  const fd = fs.openSync(log, 'a');
  try {
    fs.writeSync(fd, JSON.stringify({ name, elapsedMs: Math.round(performance.now() - started),
      rssMiB: Math.round(process.memoryUsage().rss / 1048576), ...details }) + '\n');
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
  console.log(`${name}: ${Math.round(performance.now() - started)}ms`);
}

phase('begin', { sourceSha256: before });
const book = Bend.book_nil();
const seen = new Map<string, string | null>();
try {
  await Bend.book_load(book, input.replaceAll('\\', '/'), '', seen);
  phase('book_loaded', { modules: seen.size, definitions: book.order.length });
  resolveBaseForeignImports(book);
  phase('base_foreign_relocated');
  Bend.book_valid(book);
  phase('book_valid', { holes: book.hols, open: book.open, sourceUnchanged: hash() === before });
  if (book.hols + book.open > 0) throw new Error('Unfilled laws or TODOs');
} catch (error) {
  phase('failed', { error: String(error).slice(0, 500), sourceUnchanged: hash() === before });
  throw error;
}
console.log(`phase receipt: ${log}`);
