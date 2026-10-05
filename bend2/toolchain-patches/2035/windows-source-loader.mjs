import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const scout = path.join(root, '.artifacts/toolchains/bend-2.0.35-scout');
const canonical = path.join(root, '.artifacts/toolchains/bend');
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2035-source-loader');
const release = '79df8d9c40722ee9507a1e253f283b51025f9d6c';
const pin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const preimage = '7deae3693eb896f33c73867081b99d2c6f3ed3b57e77e55eb5f6260840dd0e63';
const postimage = '250c5e2b02e64aff5656f6bea7368ff0a1bcb25e0c1b0fe7661c87e588a3c82e';
const inheritedPatch = 'bend2/toolchain-patches/005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch';
const inheritedHash = '99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
assert.ok(process.argv.slice(2).every(arg => arg === '--materialize'), 'Only --materialize is supported');

function git(tree, ...args) {
  const result = spawnSync('git', ['-C', tree, ...args], {
    encoding: 'utf8', timeout: 30000, windowsHide: true,
  });
  assert.equal(result.error, undefined, String(result.error));
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trimEnd();
}
function cleanTree(tree, commit) {
  assert.equal(fs.realpathSync(tree), path.resolve(tree), 'compiler checkout is redirected');
  assert.equal(git(tree, 'rev-parse', 'HEAD'), commit);
  assert.equal(git(tree, 'status', '--porcelain', '--untracked-files=all'), '');
}
function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length, 2, `source anchor changed: ${before.slice(0, 100)}`);
  return source.replace(before, after);
}

cleanTree(scout, release);
cleanTree(canonical, pin);
assert.equal(git(root, 'check-ignore', '.artifacts/bend2/toolchain-patches/derived-2035-source-loader'),
  '.artifacts/bend2/toolchain-patches/derived-2035-source-loader');
const upstream = fs.readFileSync(path.join(scout, 'bend2/bend.ts'));
assert.equal(sha(upstream), preimage, 'candidate loader preimage changed');
const patchBytes = fs.readFileSync(path.join(root, inheritedPatch));
assert.equal(sha(patchBytes), inheritedHash, 'inherited Windows safeguards changed');
const patch = patchBytes.toString('utf8').replaceAll('\r\n', '\n');
let helpers = patch.slice(patch.indexOf('+function path_is_inside('), patch.indexOf(' async function book_file('))
  .split('\n').filter(line => line.startsWith('+')).map(line => line.slice(1)).join('\n');
assert.ok(helpers.startsWith('function path_is_inside('));
helpers = helpers.slice(0, helpers.indexOf('function cache_relative('));
helpers = helpers.slice(0, helpers.indexOf('export function book_seen('))
  + helpers.slice(helpers.indexOf('function path_posix('));

let source = upstream.toString('utf8');
const start = source.indexOf('async function hub_get(');
const end = source.indexOf('export async function book_load(');
assert.ok(start > 0 && end > start);
source = source.slice(0, start) + helpers + `async function book_file(book: Book, file: string, spn?: Span): Promise<string> {
  if (path_inside(BEND_LIB, file)) {
    throw new Error("candidate source loader accepts local files only; packages are disabled");
  }
  if (!fs.existsSync(file)) {
    throw Err(book, ctx_nil(), "no such file: " + file, undefined, spn);
  }
  const real = fs.realpathSync(file);
  if (path_inside(BEND_LIB, real)) {
    throw new Error("candidate source loader accepts local files only; packages are disabled");
  }
  return real;
}

` + source.slice(end);
source = replaceOnce(source, `  if (seen.has(real)) {
    if (seen.get(real) === null) {`, `  const fileIds = file_id_map(seen);
  const identity = file_identity_key(real);
  const priorNs = seen.has(real) ? seen.get(real)
    : identity !== null && fileIds.has(identity) ? fileIds.get(identity) : undefined;
  if (priorNs !== undefined) {
    if (priorNs === null) {`);
source = replaceOnce(source, `  seen.set(real, null);
  const dir   = real.slice(0, real.lastIndexOf("/") + 1);`, `  seen.set(real, null);
  if (identity !== null) {
    fileIds.set(identity, null);
  }
  const parent = path.dirname(real);
  const dir   = parent.endsWith(path.sep) ? parent : parent + path.sep;`);
source = replaceOnce(source, `    const as  = nv === null ? m[1] : await name_hash(book, nv[1], sp) + m[1].slice(nv[1].length);`, `    if (path.isAbsolute(m[1]) || path.win32.isAbsolute(m[1])
      || m[1].includes("\\\\") || nv !== null || hub(m[1]) || hub(ns)) {
      throw new Error("candidate source loader accepts local relative imports only; absolute paths and packages are disabled");
    }
    const as  = m[1];`);
source = replaceOnce(source, `    const got = await book_file(book, hub(as) ? BEND_LIB + "/" + rel : path.posix.resolve(dir, rel), sp);
    const lib = fs.existsSync(BEND_LIB) ? fs.realpathSync(BEND_LIB) + "/" : "\\0";
    const sub = (got.startsWith(lib) ? got.slice(lib.length)
      : path.posix.relative(top, got)).replace(/\\.bend$/, "");
    if (!ok(sub, got.startsWith(lib)) || (hub(ns) && !got.startsWith(lib))) {`, `    const got = await book_file(book, path.resolve(dir, rel), sp);
    const gotIdentity = file_identity_key(got);
    const existingPath = seen.has(got) ? seen.get(got)
      : gotIdentity !== null && fileIds.has(gotIdentity) ? fileIds.get(gotIdentity) : undefined;
    const resolvedSub = path.posix.join(path.posix.dirname(ns), relative_module_path(dir, got));
    const sub = (existingPath !== undefined && existingPath !== null ? existingPath : resolvedSub)
      .replace(/\\.bend$/, "");
    if (!ok(sub, false)) {`);
source = replaceOnce(source, `  seen.set(real, ns);
  return n0;`, `  seen.set(real, ns);
  if (identity !== null) {
    fileIds.set(identity, ns);
  }
  return n0;`);
source = replaceOnce(source, `// directory; a "0x<hash>/" path is its own namespace, read from BEND_LIB
// and fetched from BEND_HUB on a miss; a "<name>@<version>/" path is the
// hash the hub names it, kept under BEND_LIB/names. "as Name" binds a`, `// directory; this isolated candidate denies package imports and network
// source loading. "as Name" binds a`);
assert.equal(sha(source), postimage, 'candidate loader postimage changed');

function sourceFiles(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(entry => {
      const file = path.join(dir, entry.name);
      assert.ok(!entry.isSymbolicLink(), `compiler source is linked: ${file}`);
      assert.equal(fs.realpathSync(file), path.resolve(file), `compiler source is redirected: ${file}`);
      const relative = prefix + entry.name;
      if (entry.isDirectory()) return sourceFiles(file, relative + '/');
      assert.ok(entry.isFile(), `compiler source is not regular: ${file}`);
      return [[relative, fs.readFileSync(file)]];
    });
}
const expected = new Map(sourceFiles(path.join(scout, 'bend2')));
expected.set('bend.ts', Buffer.from(source));
if (process.argv.includes('--materialize') && !fs.existsSync(derived)) {
  let ancestor = path.dirname(derived);
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  assert.equal(fs.realpathSync(ancestor), path.resolve(ancestor), 'derived ancestor is redirected');
  fs.mkdirSync(derived, { recursive: true });
  assert.equal(fs.realpathSync(derived), path.resolve(derived), 'derived target is redirected');
  for (const [file, bytes] of expected) {
    const target = path.join(derived, 'bend2', file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx' });
  }
}
const exists = fs.existsSync(derived);
if (exists) {
  assert.equal(fs.realpathSync(derived), path.resolve(derived), 'derived target is redirected');
  assert.deepEqual(fs.readdirSync(derived), ['bend2'], 'derived target has unexpected content');
  const actual = new Map(sourceFiles(path.join(derived, 'bend2')));
  assert.deepEqual([...actual.keys()], [...expected.keys()], 'derived source inventory changed');
  for (const [file, bytes] of expected) assert.deepEqual(actual.get(file), bytes, `derived bytes differ: ${file}`);
}
cleanTree(scout, release);
cleanTree(canonical, pin);
console.log(JSON.stringify({ schema: 'rift-bend-2035-windows-source-loader/1', upstream: release,
  canonicalPin: pin, preimageSha256: preimage, outputSha256: sha(source),
  inheritedPatchSha256: inheritedHash, changed: ['bend2/bend.ts'], derived,
  comparedDerived: exists, sourceFileCount: expected.size,
  scope: 'exact local-only source-loader transform; no compiler execution, adoption, proof, browser, native or GPU acceptance' }));
