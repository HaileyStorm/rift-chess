import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../..');
const source = readFileSync(resolve(root, 'bend2/NativeCLI.bend'));
assert.equal(createHash('sha256').update(source).digest('hex'),
  'bf055f12bac835a71b561a401def07f4fcfaa0d6dc775e6a82438e91158d7779',
  'the migration patch is bound to the reviewed 2.0.27 NativeCLI input');
execFileSync('git', ['apply', '--check',
  resolve(directory, '0001-adapt-io-args-2032.patch')],
{ cwd: root, stdio: 'inherit' });
console.log('native-cli-2032 preflight: exact source binding and patch context passed');
