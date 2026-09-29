import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Exact working-file bytes for the same reviewed Git postimages. The 2.0.32
// patch stack is unchanged; only checkout EOL conversion differs by host.
export const compilerSourceHashes = Object.freeze({
  'bend2/bend.ts': Object.freeze({
    crlf: '2def95c26e150c5a66a1a8ba3e5dd6ec5de3a8dd822627976f606a273b0cea88',
    lf: '02ab7c61a2b0a6ba15eb350234760c2dd46e8b4f315eec071edbcab2ea4e1d6a',
  }),
  'bend2/comp.ts': Object.freeze({
    crlf: '4f420f4a9b9efadfb5708fa2e20703fbc44e130365805c4b1be09f3c276e39b1',
    lf: '940bb742a4facb77a883e4f1a5916254f31428859040a7c17f52f55e0a8c687f',
  }),
  'bend2/main.ts': Object.freeze({
    crlf: 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
    lf: '91c032a8e908a7ffe4fb38e98589cbf9719788fdc9407b36bea8930694c51c51',
  }),
});
export const compilerBaseHashes = Object.freeze({
  crlf: 'a548d71e16e3e1b19f08ab187c1b04afabb7a3cf5fefa067004b77b6eaca9ba0',
  lf: '485705690d8927389bd156f18e42653176a5e139afe363a7e9bc217eb6f5e716',
});
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function bindCompilerBaseEol(bytes, mode) {
  assert.ok(Buffer.isBuffer(bytes), 'compiler Base reader did not return bytes');
  assert.ok(mode === 'crlf' || mode === 'lf', 'unknown compiler EOL mode');
  const text = bytes.toString('utf8');
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const bareLf = (text.match(/(?<!\r)\n/g) ?? []).length;
  assert.ok((crlf > 0) !== (bareLf > 0), 'mixed or absent Base line endings');
  assert.equal(crlf ? 'crlf' : 'lf', mode, 'Base/compiler EOL modes differ');
  const actual = sha256(bytes);
  assert.equal(actual, compilerBaseHashes[mode], 'derived compiler Base changed');
  const normalized = sha256(Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8'));
  assert.equal(normalized, compilerBaseHashes.lf, 'Git/LF Base postimage changed');
  return { path: 'bend2/base.bend', sha256: actual, normalizedSha256: normalized };
}

export function bindCompilerEol(readBytes) {
  const files = [];
  const modes = new Set();
  for (const [relative, expected] of Object.entries(compilerSourceHashes)) {
    const bytes = readBytes(relative);
    assert.ok(Buffer.isBuffer(bytes), `compiler reader did not return bytes: ${relative}`);
    const text = bytes.toString('utf8');
    const crlf = (text.match(/\r\n/g) ?? []).length;
    const bareLf = (text.match(/(?<!\r)\n/g) ?? []).length;
    assert.ok((crlf > 0) !== (bareLf > 0), `mixed or absent line endings: ${relative}`);
    const eol = crlf ? 'crlf' : 'lf';
    const actual = sha256(bytes);
    assert.equal(actual, expected[eol], `derived compiler source changed: ${relative}`);
    const normalized = sha256(Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8'));
    assert.equal(normalized, expected.lf, `Git/LF postimage changed: ${relative}`);
    modes.add(eol);
    files.push({ path: relative, sha256: actual, normalizedSha256: normalized });
  }
  assert.equal(modes.size, 1, 'derived compiler files have inconsistent EOL modes');
  return { eol: [...modes][0], files };
}
