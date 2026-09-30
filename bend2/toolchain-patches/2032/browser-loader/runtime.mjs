import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export function assertLocalBunRuntime(repo, runtimeDirectory, executable) {
  const root = path.resolve(repo);
  const runtime = path.resolve(runtimeDirectory);
  assert.equal(fs.realpathSync.native(root), root,
    'bundle repository root is a reparse path');
  assert.ok(runtime.startsWith(root + path.sep),
    'Bun runtime must be inside the repository');
  assert.equal(fs.realpathSync.native(runtime), runtime,
    'Bun runtime directory is a reparse path');
  const bunExe = fs.realpathSync.native(executable);
  assert.ok(bunExe.startsWith(runtime + path.sep),
    'Bun executable must be inside the repository-local runtime');
  return bunExe;
}
