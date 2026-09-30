import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { root } from '../../../tools/selected-modules.mjs';
import { assertLocalBunRuntime } from './runtime.mjs';

const localRuntime = path.join(root, '.artifacts/toolchains/runtime');
const localBun = path.join(localRuntime,
  'node_modules/@oven/bun-windows-x64/bin/bun.exe');
if (process.platform === 'win32')
  assert.equal(assertLocalBunRuntime(root, localRuntime, localBun),
    fs.realpathSync.native(localBun));
const parent = fs.realpathSync.native(os.tmpdir());
const fixture = fs.mkdtempSync(path.join(parent, 'bend2032-local-runtime-'));
try {
  const repo = path.join(fixture, 'repo');
  const outside = path.join(fixture, 'outside');
  fs.mkdirSync(repo);
  fs.mkdirSync(outside);
  const exe = path.join(outside, 'bun');
  fs.writeFileSync(exe, 'synthetic executable\n', { flag: 'wx' });
  const redirected = path.join(repo, 'runtime');
  try {
    fs.symlinkSync(outside, redirected, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => assertLocalBunRuntime(repo, redirected, exe),
      /reparse path|repository-local runtime/);
    console.log('ok - redirected repository runtime rejected');
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP', 'UNKNOWN'].includes(error?.code)) throw error;
    console.log('skip - OS denied temporary runtime symlink fixture');
  }
} finally {
  const exact = fs.realpathSync.native(fixture);
  assert.equal(path.dirname(exact), parent);
  assert.match(path.basename(exact), /^bend2032-local-runtime-[^\\/]+$/);
  const stat = fs.lstatSync(fixture);
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink());
  fs.rmSync(fixture, { recursive: true, force: true });
}
