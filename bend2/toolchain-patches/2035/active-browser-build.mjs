import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveActive } from '../../tools/active-toolchain.mjs';

const self = fileURLToPath(import.meta.url);

export async function buildActivePreview2035({ selection, inputRef, outputDirectory }) {
  const active = resolveActive({ ...selection, purpose: 'browserBuild' });
  assert.equal(active.adapterRef.base, 'repository');
  assert.equal(path.resolve(active.repositoryRoot, active.adapterRef.path), self,
    'selected browser adapter is not this executing module');
  assert.ok(inputRef && typeof inputRef === 'object');
  assert.deepEqual(Object.keys(inputRef).sort(), ['base', 'bytes', 'path', 'sha256']);
  const matches = active.inputRefs.filter(reference => reference.base === inputRef.base
    && reference.path === inputRef.path && reference.bytes === inputRef.bytes
    && reference.sha256 === inputRef.sha256);
  assert.equal(matches.length, 1, 'package input must be an exact unique selected purpose input');
  const bound = matches[0], inputRoot = bound.base === 'repository'
    ? active.repositoryRoot : active.packetRoot;
  const { buildPreview2035 } = await import('./build-preview.mjs');
  return buildPreview2035({ inputPath: path.resolve(inputRoot, bound.path),
    inputSha256: bound.sha256, artifactRoot: active.packetRoot, outputDirectory });
}

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  throw Error('use owning reviewed launcher');
}
