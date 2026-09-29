// Read-only source probe on exact derived 2.0.32+001+002+005; no BendTT.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { workerData } from 'node:worker_threads';
import { proofVerdict, proofNegativeControls } from '../../core/v3/proof-authority.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const scout = path.join(root, '.artifacts/toolchains/bend-2.0.32-scout');
const canonical = path.join(root, '.artifacts/toolchains/bend');
const release = '573002f01ec6c52416d44489543f69a9625facf8';
const oldPin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const expected = {
  'bend2/bend.ts': '2c3953bb4fcb12aa97d4ce8cd041ef0ce8324c724fd0adc9b0352fff4c0f5c09',
  'bend2/comp.ts': '0108bf3a080d1cfbb987a5d95fb5b1e7acae91da85efb419eed7e06dd75334a7',
  'bend2/main.ts': 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
};
const inputs = {
  'ArithmeticProof.bend': '149f4a311b6da1ef8e45a2eb2b62626f5d24804ba4091f3e15ee422ee18602a8',
  'CHECK.bend': 'e6718d4a1784b5b45c06974f23660c9b117f7723e55bc19d809434dee7ba2b76',
};
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const git = (dir: string, ...args: string[]) => execFileSync('git', ['-C', dir, ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
let stage = 'exact-input-guards';
const name = workerData?.entry ?? process.argv[2] ?? 'ArithmeticProof.bend';
assert.ok(Object.hasOwn(inputs, name), 'Choose ArithmeticProof.bend or CHECK.bend');
assert.equal(process.env.BEND_NO_TELEMETRY, '1');
assert.equal(git(scout, 'rev-parse', 'HEAD'), release);
assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(git(derived, 'rev-parse', 'HEAD'), release);
assert.equal(git(derived, 'diff', '--cached', '--name-only'), '');
assert.equal(git(canonical, 'rev-parse', 'HEAD'), oldPin);
assert.equal(git(canonical, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8')).bendCommit, oldPin);
for (const [file, hash] of Object.entries(expected))
  assert.equal(sha(path.join(derived, file)), hash, `${file} differs from reviewed derived stack`);
assert.equal(sha(path.join(root, 'bend2/core/v3/proof-authority.mjs')),
  '3737c455d542f2dc7ff1799bfc579969c42739814411a8494189eb1b56a74013');
const entry = path.join(root, 'bend2/core/v2', name);
assert.equal(sha(entry), inputs[name]);
let attempts = 0;
globalThis.fetch = async () => { attempts++; throw Error('Network fetch denied in derived source probe'); };
let Bend;
try {
  Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
  const book = Bend.book_nil();
  const seen = new Map<string, string | null>();
  stage = 'load';
  await Bend.book_load(book, entry, '', seen);
  stage = 'type-check';
  Bend.book_valid(book);
  assert.equal(Object.hasOwn(book, 'open'), false, '2.0.32 Book shape changed');
  assert.ok(Number.isSafeInteger(book.hols) && book.hols >= 0);
  const view = { ...book, open: 0 };
  stage = 'promise-screen';
  const authority = proofVerdict(Bend, view);
  stage = 'synthetic-negative-controls';
  const controls = proofNegativeControls(Bend, view);
  assert.equal(attempts, 0, 'Source probe attempted provider contact');
  assert.equal(sha(entry), inputs[name], 'Frozen entry changed during probe');
  console.log(JSON.stringify({ schema: 'rift-bend-2032-derived-source-probe/1', ok: true,
    release, entry: name, entrySha256: inputs[name], loadedFiles: seen.size,
    definitions: book.order.length, owned: authority.own.length, controls,
    networkFetches: attempts,
    scope: 'derived source type/promise checks only; no BendTT, full mutation suite, native, browser, GPU or pin acceptance' }));
} catch (error) {
  const diagnostic = Bend && error && typeof error === 'object' && '$' in error && error.$ === 'Err'
    ? Bend.err_show(error as typeof Bend.Err) : String(error);
  console.error(JSON.stringify({ schema: 'rift-bend-2032-derived-source-probe/1', ok: false,
    release, entry: name, stage, diagnostic: diagnostic.slice(0, 1200),
    networkFetches: attempts, scope: 'source-only failed probe; no BendTT or pin change' }));
  process.exitCode = 1;
}
