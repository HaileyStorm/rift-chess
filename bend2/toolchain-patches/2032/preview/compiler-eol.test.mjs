import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bindCompilerEol, compilerSourceHashes } from './compiler-eol.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const originals = Object.fromEntries(Object.keys(compilerSourceHashes).map((relative) =>
  [relative, fs.readFileSync(path.join(derived, relative))]));
const read = (source) => (relative) => source[relative];
const local = bindCompilerEol(read(originals));
const normalized = Object.fromEntries(Object.entries(originals).map(([relative, bytes]) =>
  [relative, Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'))]));
const crlf = Object.fromEntries(Object.entries(normalized).map(([relative, bytes]) =>
  [relative, Buffer.from(bytes.toString('utf8').replace(/\n/g, '\r\n'))]));
const windows = bindCompilerEol(read(crlf));
assert.equal(windows.eol, 'crlf');
const linux = bindCompilerEol(read(normalized));
assert.equal(linux.eol, 'lf');
assert.deepEqual(local, local.eol === 'crlf' ? windows : linux);
assert.deepEqual(windows.files.map((file) => file.normalizedSha256),
  linux.files.map((file) => file.sha256));
const one = Object.keys(crlf)[0];
assert.throws(() => bindCompilerEol(read({ ...crlf,
  [one]: Buffer.from(crlf[one].toString('utf8').replace('\r\n', '\n')) })),
/mixed or absent line endings/);
assert.throws(() => bindCompilerEol(read({ ...normalized,
  [one]: Buffer.concat([normalized[one], Buffer.from('tampered')]) })),
/derived compiler source changed/);
assert.throws(() => bindCompilerEol(read({ ...crlf, [one]: normalized[one] })),
/inconsistent EOL modes/);
console.log(JSON.stringify({ schema: 'rift-bend-2032-compiler-eol/1', passed: true,
  localEol: local.eol, windows, linux, controls: ['mixed', 'tampered', 'inconsistent'],
  scope: 'exact compiler working-file EOL equivalence only; no source proof, menu emission or pin adoption' }));
