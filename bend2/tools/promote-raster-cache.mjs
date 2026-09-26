// One-time adoption of an independently emitted, source-bound Bend raster JS
// artifact into the modular browser cache. Future builds may instead run
// emit-selected.ts chrome; no compiler source or generated JS is patched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, cacheDir, currentBinding, moduleSpecs, sha256 } from './selected-modules.mjs';

const sourceDir = path.resolve(process.argv[2] ?? '');
const within = path.relative(path.join(root, '.artifacts/bend2'), sourceDir);
assert.ok(within && !within.startsWith('..') && !path.isAbsolute(within),
  'Pass an existing ignored .artifacts/bend2 raster directory');
const manifestPath = path.join(sourceDir, 'chrome-raster-cache.manifest.json');
const sourcePath = path.join(sourceDir, 'chrome-raster-cache.js');
const manifestBytes = fs.readFileSync(manifestPath);
const sourceBytes = fs.readFileSync(sourcePath);
const upstream = JSON.parse(manifestBytes.toString('utf8'));
const binding = currentBinding('chrome');
assert.equal(upstream.binding.compilerCommit, binding.compilerCommit);
assert.equal(upstream.binding.bunVersion, binding.bunVersion);
assert.deepEqual(upstream.exports, moduleSpecs.chrome.exports);
assert.equal(upstream.generated.path, 'chrome-raster-cache.js');
assert.equal(upstream.generated.bytes, sourceBytes.length);
assert.equal(upstream.generated.sha256, sha256(sourceBytes));
const upstreamFiles = new Map();
for (const item of upstream.binding.sourceFiles) {
  const file = path.resolve(root, item.path);
  const relative = path.relative(root, file);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative),
    `Source-bound raster path escaped workspace: ${item.path}`);
  assert.equal(sha256(fs.readFileSync(file)), item.sha256,
    `Raster source changed since emission: ${item.path}`);
  upstreamFiles.set(item.path, item.sha256);
}
for (const item of binding.sourceFiles) {
  if (item.path.startsWith('bend2/ui/v2/') || item.path.startsWith('.artifacts/toolchains/bend/bend2/')) {
    assert.equal(upstreamFiles.get(item.path), item.sha256,
      `Raster entry/compiler closure not independently bound: ${item.path}`);
  }
}
fs.mkdirSync(cacheDir, { recursive: true });
const target = path.join(cacheDir, 'chrome.js');
const receipt = path.join(cacheDir, 'chrome.manifest.json');
assert.ok(!fs.existsSync(target) && !fs.existsSync(receipt), 'Refuse to overwrite a selected-module cache');
fs.copyFileSync(sourcePath, target, fs.constants.COPYFILE_EXCL);
fs.writeFileSync(receipt, JSON.stringify({ binding,
  output: { file: 'chrome.js', bytes: sourceBytes.length, sha256: sha256(sourceBytes) },
  provenance: { kind: 'independent source-bound Bend ChromeRaster emission',
    manifestSha256: sha256(manifestBytes), cacheSha256: sha256(sourceBytes),
    sourceDirectory: path.relative(root, sourceDir).replaceAll('\\', '/') } }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ selectedCache: target, bytes: sourceBytes.length,
  sha256: sha256(sourceBytes), upstreamManifestSha256: sha256(manifestBytes) }));
