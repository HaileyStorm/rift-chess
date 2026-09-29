// Source-only 2.0.32 check for the small versioned argv adapter, not NativeCLI.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const scout = path.join(root, '.artifacts/toolchains/bend-2.0.32-scout');
const canonical = path.join(root, '.artifacts/toolchains/bend');
const entry = path.join(root, 'bend2/toolchain-patches/native-cli-2032/Args2032.bend');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
process.env.BEND_NO_TELEMETRY = '1';
assert.equal(git(scout, 'rev-parse', 'HEAD'), '573002f01ec6c52416d44489543f69a9625facf8');
assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(git(canonical, 'rev-parse', 'HEAD'), 'd37909174ebd664338ae3194799a9e0899dedd51');
assert.equal(git(canonical, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(git(derived, 'rev-parse', 'HEAD'), '573002f01ec6c52416d44489543f69a9625facf8');
assert.equal(git(derived, 'diff', '--cached', '--name-only'), '');
for (const [file, expected] of Object.entries({
  'bend2/bend.ts': '2def95c26e150c5a66a1a8ba3e5dd6ec5de3a8dd822627976f606a273b0cea88',
  'bend2/comp.ts': '4f420f4a9b9efadfb5708fa2e20703fbc44e130365805c4b1be09f3c276e39b1',
  'bend2/main.ts': 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
})) assert.equal(sha(path.join(derived, file)), expected, file);
assert.equal(sha(entry), '9ad65f50b9ccf35f59921ad785ba55487e95face685337bea0f9959b754b4fa6');
let fetches = 0;
globalThis.fetch = async () => { fetches++; throw Error('network denied in argv source check'); };
const Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
const book = Bend.book_nil(), seen = new Map();
try {
  await Bend.book_load(book, entry, '', seen);
  Bend.book_valid(book);
} catch (error) {
  throw new Error((error?.$ === 'Err' ? Bend.err_show(error)
    : error?.message ?? String(error)).slice(0, 1200));
}
assert.equal(book.hols, 0);
assert.equal(book.tlds.ProgramArgs?.$, 'ADT');
assert.equal(book.tlds.strip_program?.$, 'Def');
assert.equal(book.tlds.program_result?.$, 'Def');
assert.equal(fetches, 0);
assert.equal(sha(entry), '9ad65f50b9ccf35f59921ad785ba55487e95face685337bea0f9959b754b4fa6');
console.log(JSON.stringify({ schema: 'rift-bend-native-cli-args-2032-source/1', ok: true,
  release: '573002f01ec6c52416d44489543f69a9625facf8',
  adapterSha256: sha(entry), loadedFiles: seen.size, definitions: book.order.length,
  fetches, scope: 'small 2.0.32 argv adapter type check only; no patched NativeCLI or native command acceptance' }));
