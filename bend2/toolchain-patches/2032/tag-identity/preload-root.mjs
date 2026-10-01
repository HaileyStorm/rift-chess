import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const segment = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const within = (base, file) => {
  const relative = path.relative(base, file);
  return relative !== '' && relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
const regularPath = file => {
  const absolute = path.resolve(file);
  const stat = fs.lstatSync(absolute);
  assert.ok(stat.isFile() && !stat.isSymbolicLink(), `selected Bend source is not regular: ${absolute}`);
  assert.equal(fs.realpathSync(absolute), absolute, `selected Bend source path is redirected: ${absolute}`);
  return absolute;
};

export function stableDirectImports(entryPath, projectBendRoot) {
  const base = fs.realpathSync(projectBendRoot);
  assert.equal(base, path.resolve(projectBendRoot), 'Bend project source root is redirected');
  assert.ok(fs.lstatSync(base).isDirectory() && !fs.lstatSync(base).isSymbolicLink());
  const entry = regularPath(entryPath);
  assert.ok(within(base, entry), 'entry is outside the Bend project source root');
  const imports = [];
  const source = fs.readFileSync(entry, 'utf8');
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (!/^import(?:\s|$)/.test(trimmed)) break;
    if (/^import Base(?:\s+#.*)?$/.test(trimmed)) continue;
    const match = /^import\s+(\.\.?\/[^\s]+\.bend)\s+as\s+([A-Za-z_]\w*)\s*(?:#.*)?$/.exec(trimmed);
    assert.ok(match, `selected entry has unsupported import: ${trimmed}`);
    const file = regularPath(path.resolve(path.dirname(entry), match[1]));
    assert.ok(within(base, file),
      `selected import escaped the Bend project source root: ${match[1]}`);
    const relative = path.relative(base, file).split(path.sep).join('/');
    assert.ok(relative.endsWith('.bend'));
    const namespace = relative.slice(0, -5);
    assert.ok(namespace.split('/').every(part => segment.test(part)),
      `selected import has an invalid namespace: ${namespace}`);
    imports.push({ file, relative, namespace });
  }
  return { entry, imports };
}

// Preload each direct dependency with a common project-root namespace.
// Bend recursively assigns the same convention to its transitive imports.
// The selected entry remains an empty-namespace root with its public keys.
export async function loadWithStableImports(bend, book, entryPath, projectBendRoot) {
  const { entry, imports } = stableDirectImports(entryPath, projectBendRoot);
  const seen = new Map();
  const preloaded = [];
  for (const { file, relative, namespace } of imports) {
    await bend.book_load(book, file, namespace, seen);
    assert.equal(seen.get(file), namespace, `selected import namespace changed: ${relative}`);
    preloaded.push([relative, namespace]);
    assert.ok(!seen.has(entry), 'a dependency loaded the selected root before its empty-namespace entry');
  }
  await bend.book_load(book, entry, '', seen);
  assert.equal(seen.get(entry), '', 'selected root lost its public empty namespace');
  return { seen, preloaded };
}
