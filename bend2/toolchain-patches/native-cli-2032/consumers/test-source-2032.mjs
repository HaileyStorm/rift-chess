// Small source-only check of the shared consumer helper, not of patched entries.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.BEND_NO_TELEMETRY = '1';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const entry = path.join(here, 'Consumers2032.bend');
const sha = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(sha(path.join(here, 'preflight.mjs')),
  '630541481d9787b985c2446e285f3606682833fdf41df2667d0b71a5536517b4');
const preflight = JSON.parse(execFileSync(process.execPath, [path.join(here, 'preflight.mjs')],
  { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
assert.equal(preflight.ok, true);
const expectedCompiler = {
  'bend2/bend.ts': '2def95c26e150c5a66a1a8ba3e5dd6ec5de3a8dd822627976f606a273b0cea88',
  'bend2/comp.ts': '4f420f4a9b9efadfb5708fa2e20703fbc44e130365805c4b1be09f3c276e39b1',
  'bend2/main.ts': 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
};
for (const [relative, expected] of Object.entries(expectedCompiler)) {
  assert.equal(sha(path.join(derived, relative)), expected, relative);
}
assert.equal(sha(entry), preflight.helperSha256);
let fetches = 0;
globalThis.fetch = async () => { fetches++; throw Error('network denied in consumer source check'); };
const Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
const book = Bend.book_nil();
const seen = new Map();
try {
  await Bend.book_load(book, entry, '', seen);
  Bend.book_valid(book);
} catch (error) {
  throw new Error((error?.$ === 'Err' ? Bend.err_show(error)
    : error?.message ?? String(error)).slice(0, 1400));
}
assert.equal(book.hols, 0);
assert.equal(book.tlds.users?.$, 'Def');
assert.equal(fetches, 0);
assert.equal(sha(entry), preflight.helperSha256);
for (const [relative, expected] of Object.entries(expectedCompiler)) {
  assert.equal(sha(path.join(derived, relative)), expected, relative);
}
console.log(JSON.stringify({ schema: 'rift-native-cli-consumers-2032-source/1', ok: true,
  upstream: preflight.upstream, helperSha256: preflight.helperSha256,
  derivedCompiler: expectedCompiler, loadedFiles: seen.size,
  definitions: book.order.length, holes: book.hols, fetches,
  scope: 'helper source typecheck only; no patched consumer entry or native argv acceptance' }));
