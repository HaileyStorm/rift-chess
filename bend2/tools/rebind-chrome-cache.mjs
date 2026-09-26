// One-time, narrow cache attestation after adding only controller exports to
// selected-modules.mjs. The 8 GiB supervised Chrome emitter cap was reached;
// no generated JavaScript is changed or accepted on a broad trust exception.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { root, cacheDir, currentBinding, sha256 } from './selected-modules.mjs';

const oldSpec = "exports: ['boot_reads', 'dispatch_at', 'storage_key', 'max_file_bytes', 'audio_samples']";
const newSpec = "exports: ['boot_reads', 'dispatch_at', 'dispatch_at_web', 'bot_job',\n      'bot_apply_at', 'bot_fallback_at', 'storage_key', 'max_file_bytes', 'audio_samples']";
const specPath = 'bend2/tools/selected-modules.mjs';
const source = fs.readFileSync(path.join(root, specPath), 'utf8');
assert.equal(source.split(newSpec).length, 2, 'Expected exactly one controller-only spec edit');
const previousSpecHash = sha256(source.replace(newSpec, oldSpec));
const currentSpecHash = sha256(source);
const file = path.join(cacheDir, 'chrome.manifest.json');
const backup = path.join(cacheDir, 'chrome.manifest.pre-bot-exports.json');
const generated = path.join(cacheDir, 'chrome.js');
assert.equal(path.relative(root, cacheDir).replaceAll('\\', '/'), '.artifacts/bend2/v2-preview/selected-js');
assert.ok(!fs.existsSync(backup), 'Chrome cache has already been re-attested');
const oldBytes = fs.readFileSync(file);
const old = JSON.parse(oldBytes.toString('utf8'));
const current = currentBinding('chrome');
const { sourceFiles: oldFiles, ...oldMeta } = old.binding;
const { sourceFiles: currentFiles, ...currentMeta } = current;
assert.deepEqual(oldMeta, currentMeta, 'Chrome module/export/compiler identity changed');
assert.deepEqual(oldFiles.map(({ path }) => path), currentFiles.map(({ path }) => path));
const changed = currentFiles.filter((item, index) => item.sha256 !== oldFiles[index].sha256);
assert.deepEqual(changed, [{ path: specPath, sha256: currentSpecHash }],
  'Any Chrome dependency change requires real re-emission');
assert.equal(oldFiles.find(item => item.path === specPath)?.sha256, previousSpecHash,
  'Prior binding was not made from the same source with only controller exports changed');
assert.equal(old.output.file, 'chrome.js');
const bytes = fs.readFileSync(generated);
assert.equal(old.output.sha256, sha256(bytes));
assert.equal(old.output.bytes, bytes.length);
const amended = { ...old, binding: current, provenance: {
  ...old.provenance, reattestation: 'Unrelated controller exports only; exact old source reconstructed',
  priorManifestSha256: sha256(oldBytes), previousSpecHash, currentSpecHash,
  generatedSha256: sha256(bytes), unchangedClosureFiles: currentFiles.length - 1 } };
const pending = path.join(cacheDir, `chrome.manifest.rebind-${process.pid}.pending.json`);
fs.writeFileSync(pending, JSON.stringify(amended, null, 2) + '\n', { flag: 'wx' });
fs.renameSync(file, backup);
try { fs.renameSync(pending, file); }
catch (error) { fs.renameSync(backup, file); throw error; }
console.log(JSON.stringify({ cache: generated, bytes: bytes.length,
  sha256: sha256(bytes), oldManifestSha256: sha256(oldBytes),
  newManifestSha256: sha256(fs.readFileSync(file)), changed: specPath }));
