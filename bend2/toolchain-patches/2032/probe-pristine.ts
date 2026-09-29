// Bounded source-only Bend 2.0.32 proof-load probe. It neither changes the
// canonical 2.0.27 pin nor invokes BendTT (which may install into the profile).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as Bend from '../../../.artifacts/toolchains/bend-2.0.32-scout/bend2/bend.ts';
import { proofVerdict, proofNegativeControls } from '../../core/v3/proof-authority.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const candidate = path.join(root, '.artifacts/toolchains/bend-2.0.32-scout');
const pinned = path.join(root, '.artifacts/toolchains/bend');
const release = '573002f01ec6c52416d44489543f69a9625facf8';
const canonical = 'd37909174ebd664338ae3194799a9e0899dedd51';
const git = (dir: string, ...args: string[]) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
const sha = (file: string) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(process.env.BEND_NO_TELEMETRY, '1');
assert.equal(git(candidate, 'rev-parse', 'HEAD'), release);
assert.equal(git(candidate, 'status', '--porcelain', '--untracked-files=no'), '');
assert.equal(git(pinned, 'rev-parse', 'HEAD'), canonical);
assert.equal(git(pinned, 'status', '--porcelain', '--untracked-files=no'), '');
assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'), 'utf8')).bendCommit, canonical);
const name = process.argv[2] || 'ArithmeticProof.bend';
assert.ok(['ArithmeticProof.bend', 'CHECK.bend'].includes(name), 'Choose a bounded frozen proof entry');
const entry = path.join(root, 'bend2/core/v2', name);
const before = sha(entry);
globalThis.fetch = async () => { throw new Error('Network fetch denied in 2.0.32 proof-load probe'); };
let stage = 'load';
try {
  const book = Bend.book_nil();
  await Bend.book_load(book, entry.replaceAll('\\', '/'), '', new Map());
  stage = 'valid';
  Bend.book_valid(book);
  stage = 'promise-authority';
  const authority = proofVerdict(Bend, book);
  stage = 'negative-controls';
  const controls = proofNegativeControls(Bend, book);
  assert.equal(sha(entry), before, 'Frozen entry changed during probe');
  assert.equal(git(candidate, 'status', '--porcelain', '--untracked-files=no'), '');
  console.log(JSON.stringify({ ok: true, release, entry: name, entrySha256: before,
    definitions: book.order.length, owned: authority.own.length,
    controls, scope: '2.0.32 source checker and synthetic promise negatives only; no BendTT verdict, law amendment, native or pin acceptance' }));
} catch (error) {
  const diagnostic = error && typeof error === 'object' && '$' in error && error.$ === 'Err'
    ? Bend.err_show(error as Bend.Err) : String(error);
  console.error(JSON.stringify({ ok: false, release, entry: name, entrySha256: before,
    stage, diagnostic: diagnostic.slice(0, 1200),
    scope: '2.0.32 source-only failed probe; canonical pin and frozen entry remain unchanged' }));
  process.exitCode = 1;
}
