// Isolated 2.0.32 source-checker candidate for synthetic controls only.
// Bend.book_valid is the source type/affine-ownership check. The separate
// proof-authority pass screens holes and reachable unsafe/foreign promises;
// neither result is a BendTT kernel verdict.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const CANDIDATE = path.join(ROOT, '.artifacts/toolchains/bend-2.0.32-scout');
const CANONICAL = path.join(ROOT, '.artifacts/toolchains/bend');
const PIN_FILE = path.join(ROOT, 'bend2/TOOLCHAIN.json');
const PROOF_AUTHORITY = path.join(ROOT, 'bend2/core/v3/proof-authority.mjs');
const FIXTURE_DIR = path.join(ROOT, 'bend2/core/v3/2032/fixtures');
const RELEASE = '573002f01ec6c52416d44489543f69a9625facf8';
const RELEASE_TREE = '0ecfc84c5f19bbae2c0c10735129749adf7d49e8';
const CANONICAL_COMMIT = 'd37909174ebd664338ae3194799a9e0899dedd51';
const SCOUT_FILES = {
  'bend2/bend.ts': 'e342b14666c6fefbff988e985d3672f99d22bed5e33fbc0ad9e2d8d980b3c9d6',
  'bend2/comp.ts': '84a657f11d94ed6462bfc71710fef9f798e3bb4b6b345636e30dd3c6f4e4fffc',
  'bend2/main.ts': 'dfc58318166dc2720e626dfc46edaae38f8a0a7a8b3753cad7a48619896b94fb',
  'bend2/base.bend': 'a548d71e16e3e1b19f08ab187c1b04afabb7a3cf5fefa067004b77b6eaca9ba0',
};
const AUTHORITY_SHA256 = '3737c455d542f2dc7ff1799bfc579969c42739814411a8494189eb1b56a74013';
const PIN_SHA256 = '17419db1617fece38c72dba9136463a313db43bf2c61f657334d9fdce0ae51a6';
const BUN_SHA256 = '15277c59ccd6c6c20f8dc9716c2b59c1776320d606b6a8658f70be8799519ca4';
const FIXTURES = {
  positive: ['positive.bend', '2c1fd9a325f671fd2525cb9a2f29315e014c5652222ed68a252ef38f1172f2ad'],
  todo: ['todo.bend', 'b4d27ca79c6cff228b03939621b815835ff97c65db6f2d2f4f44937527dd7bec'],
  unsafe: ['unsafe.bend', 'bc4d7fba5dcef6ea715065c3b33200242777ecbc73087b9fab648be49936651a'],
  foreign: ['foreign.bend', '2d33ba35d9a7d405d31d2bb7dba48c7749bdafc4276a2e761af276796d246d74'],
  compilerOwned: ['compiler-owned.bend', 'd103ff1658e4434e1fb41cf49545c1ddd3d7ab3a027997217224803bdfb42bd9'],
};
const FOREIGN_JS_SHA256 = 'df7fd8377468935fa77d221417b42f82eee1e282b9b84bc1b0c2f7152cd644c0';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const sourcePath = (relative) => path.join(CANDIDATE, relative);
let stage = 'runtime-and-version-guards';

function cleanGitTree(dir) {
  return git(dir, 'status', '--porcelain=v1', '--untracked-files=all') === '';
}

function localClosure(file, found = new Set()) {
  const real = fs.realpathSync(file);
  const rootReal = fs.realpathSync(ROOT) + path.sep;
  if (!real.startsWith(rootReal) || !real.endsWith('.bend'))
    throw Error(`Synthetic proof source escaped the local project: ${real}`);
  if (found.has(real)) return found;
  found.add(real);
  const text = fs.readFileSync(real, 'utf8');
  let imports = true;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (!imports) break;
    const match = line.match(/^import[ \t]+([^ \t#]+)(?:[ \t]+as[ \t]+[A-Za-z_][A-Za-z0-9_]*)?[ \t]*(?:#.*)?$/);
    if (!match) { imports = false; break; }
    if (match[1] === 'Base') continue;
    if (!match[1].startsWith('./') && !match[1].startsWith('../'))
      throw Error(`Non-local synthetic import denied: ${real} -> ${match[1]}`);
    localClosure(path.resolve(path.dirname(real), match[1]), found);
  }
  return found;
}

async function main() {
  assert.equal(process.env.BEND_NO_TELEMETRY, '1', 'Telemetry must be disabled.');
  assert.equal(Bun.version, '1.4.2', 'Candidate must run under the pinned local Bun.');
  assert.equal(sha(fs.readFileSync(process.execPath)), BUN_SHA256,
    'Local Bun binary hash differs from this candidate receipt.');
  assert.equal(sha(fs.readFileSync(PIN_FILE)), PIN_SHA256,
    'Canonical TOOLCHAIN.json changed.');
  const pin = JSON.parse(fs.readFileSync(PIN_FILE, 'utf8'));
  assert.equal(pin.bendVersion, '2.0.27');
  assert.equal(pin.bendCommit, CANONICAL_COMMIT);
  assert.equal(git(CANONICAL, 'rev-parse', 'HEAD'), CANONICAL_COMMIT);
  assert.ok(cleanGitTree(CANONICAL), 'Canonical compiler tree must remain clean.');
  assert.equal(git(CANDIDATE, 'rev-parse', 'HEAD'), RELEASE);
  assert.equal(git(CANDIDATE, 'show', '-s', '--format=%T', 'HEAD'), RELEASE_TREE);
  assert.ok(cleanGitTree(CANDIDATE), '2.0.32 scout must remain clean.');
  for (const [relative, expected] of Object.entries(SCOUT_FILES))
    assert.equal(sha(fs.readFileSync(sourcePath(relative))), expected,
      `2.0.32 source changed: ${relative}`);
  assert.equal(sha(fs.readFileSync(PROOF_AUTHORITY)), AUTHORITY_SHA256,
    'Shared v3 proof-authority changed.');

  const control = process.argv[2];
  assert.ok(Object.hasOwn(FIXTURES, control),
    'Choose exactly one local synthetic control: positive, todo, unsafe, or foreign.');
  const [fixture, expectedHash] = FIXTURES[control];
  const entry = path.join(FIXTURE_DIR, fixture);
  const foreignJs = path.join(FIXTURE_DIR, 'foreign.js');
  assert.equal(sha(fs.readFileSync(entry)), expectedHash,
    `Synthetic fixture changed: ${fixture}`);
  assert.equal(sha(fs.readFileSync(foreignJs)), FOREIGN_JS_SHA256,
    'Synthetic foreign body changed.');
  const expectedSources = [fs.realpathSync(entry)];
  const importsBase = fs.readFileSync(entry, 'utf8').split('\n')
    .some(line => line.trim() === 'import Base');
  const expectedLoaded = [...expectedSources,
    ...(importsBase ? [fs.realpathSync(path.join(CANDIDATE, 'bend2/base.bend'))] : [])].sort();
  stage = 'synthetic-source-guards';
  assert.deepEqual([...localClosure(entry)].sort(), expectedSources,
    'Synthetic fixture sources must remain local and standalone apart from Base.');

  let fetchAttempts = 0;
  globalThis.fetch = async () => {
    fetchAttempts++;
    throw Error('Network fetch denied by the 2.0.32 synthetic checker.');
  };
  const Bend = await import(pathToFileURL(sourcePath('bend2/bend.ts')).href);
  const Comp = await import(pathToFileURL(sourcePath('bend2/comp.ts')).href);
  const { proofVerdict } = await import(pathToFileURL(PROOF_AUTHORITY).href);
  const seen = new Map();
  const book = Bend.book_nil();
  stage = 'book-load';
  await Bend.book_load(book, entry.replaceAll('\\', '/'), '', seen);
  const loaded = [...seen.keys()].map(name => fs.realpathSync(name)).sort();
  assert.deepEqual(loaded, expectedLoaded,
    'Actual loaded import closure differs from the hash-bound synthetic closure.');
  assert.equal(book.tlds.main, undefined,
    'Synthetic controls must remain main-free so js_lib reaches only its namespace guard.');

  stage = 'type-and-affine-ownership';
  Bend.book_valid(book);
  stage = 'proof-authority';
  assert.equal(Object.hasOwn(book, 'open'), false,
    '2.0.32 Book shape drifted: review the shared v3 hole-count adapter.');
  assert.ok(Number.isSafeInteger(book.hols) && book.hols >= 0,
    '2.0.32 TODO counter is not a nonnegative safe integer.');
  // v3 proof-authority predates 2.0.32 and reads both `hols` and `open`.
  // This release has only `hols`; supply open=0 without mutating the parsed book
  // so each TODO is counted exactly once by the unchanged shared authority.
  stage = 'compiler-book-owned-guard';
  const generated = Comp.js_lib(book);
  assert.equal(typeof generated, 'string', 'Comp.js_lib did not return source text.');
  stage = 'proof-authority';
  const authority = proofVerdict(Bend, { ...book, open: 0 });
  assert.equal(fetchAttempts, 0, 'Network fetch was attempted.');
  process.stdout.write(JSON.stringify({
    schema: 'rift-bend-v3-proof-checker-2032-synthetic/1',
    ok: true,
    control,
    compiler: { version: '2.0.32', commit: RELEASE, tree: RELEASE_TREE },
    sourceChecker: 'Bend.book_valid passed (type and affine-ownership check)',
    compilerNamespace: 'Comp.js_lib invoked; private book_owned guard passed; returned source discarded, not executed or persisted',
    promiseScreen: 'passed (no TODO/open, reachable unsafe, or reachable foreign promise)',
    bendTT: 'NOT RUN; this result is not a BendTT kernel verdict',
    todoCount: book.hols,
    generatedSourceCodeUnits: generated.length,
    loadedLocalSources: loaded.map(name => path.relative(ROOT, name).replaceAll('\\', '/')),
    nonBaseDefinitions: authority.own.length,
    networkFetches: fetchAttempts,
  }) + '\n');
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  const control = process.argv[2] ?? null;
  process.stderr.write(JSON.stringify({
    schema: 'rift-bend-v3-proof-checker-2032-synthetic/1',
    ok: false,
    control,
    stage,
    reason: message,
    bendTT: 'NOT RUN',
  }) + '\n');
  process.exitCode = 1;
});
