import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';
import { readSource, sha256, outputRoot } from './binding.mjs';
import { artifactLimitBytes, validateSafeOutput } from './contracts.mjs';

export function outputIdentity(file) {
  assert.equal(fs.realpathSync(file), file);
  const st = fs.lstatSync(file, { bigint: true });
  assert.ok(st.isFile() && !st.isSymbolicLink());
  assert.ok(st.size > 0n && st.size <= BigInt(artifactLimitBytes), 'BendTT output size differs');
  const bytes = readSource(file);
  assert.equal(BigInt(bytes.length), st.size);
  return { path: file, bytes: bytes.length, sha256: sha256(bytes), dev: String(st.dev), ino: String(st.ino) };
}

// safe_emit's public API writes one path with default overwrite semantics.
// Constrain that ESM builtin write to our fresh private file and require wx.
// Safe.safe_check/run_read/kernel_bin are never called by this consumer.
export function emitExclusive(Safe, book, out) {
  const relative = path.relative(outputRoot, out);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  assert.equal(fs.realpathSync(path.dirname(out)), path.dirname(out));
  assert.equal(fs.existsSync(out), false, 'refuse existing BendTT output');
  const original = fs.writeFileSync;
  let writes = 0;
  let oos;
  fs.writeFileSync = (file, bytes, options) => {
    assert.equal(file, out, 'Safe attempted an unowned write');
    assert.equal(++writes, 1, 'Safe attempted multiple writes');
    assert.ok(options === undefined, 'Safe write contract changed');
    const buffer = Buffer.from(bytes);
    assert.ok(buffer.length > 0 && buffer.length <= artifactLimitBytes, 'Safe output is empty or oversized');
    original(out, buffer, { flag: 'wx', mode: 0o600 });
  };
  syncBuiltinESMExports();
  try { oos = Safe.safe_emit(book, out); }
  finally { fs.writeFileSync = original; syncBuiltinESMExports(); }
  assert.equal(writes, 1, 'Safe did not produce exactly one file');
  const bytes = readSource(out);
  return { ...validateSafeOutput(oos, bytes), file: outputIdentity(out), oos };
}
