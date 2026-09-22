import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
export const manifestPath = path.join(root, 'bend2/laws/semantic-v1.json');
const normative = [
  'bend2/TOOLCHAIN.json', 'bend2/core/Model.bend', 'bend2/core/Geometry.bend',
  'bend2/core/Transitions.bend', 'bend2/core/Enumeration.bend', 'bend2/core/Spec.bend',
  'bend2/core/MatchSpec.bend', 'bend2/core/ProofKit.bend', 'bend2/core/LAWS.bend',
  'bend2/docs/LAWS_V1.md', 'bend2/docs/LAW_CHANGE_POLICY.md',
];
const pixelNormative = ['bend2/TOOLCHAIN.json', 'bend2/graphics/Pixel.bend', 'bend2/graphics/LAWS.bend', 'bend2/docs/GRAPHICS_LAWS_V1.md'];
function contract(kind) {
  return kind === 'graphics'
    ? { path: path.join(root, 'bend2/laws/pixels-v1.json'), schema: 'rift-bend-pixels/1', files: pixelNormative }
    : { path: manifestPath, schema: 'rift-bend-semantic/1', files: normative };
}

export function verifyFreeze(kind = 'core') {
  const spec = contract(kind);
  const bytes = fs.readFileSync(spec.path);
  const manifest = JSON.parse(bytes);
  if (manifest.schema !== spec.schema) throw new Error('Unknown semantic manifest.');
  if (JSON.stringify(Object.keys(manifest.files).sort()) !== JSON.stringify([...spec.files].sort())) {
    throw new Error('Normative file list changed. A reviewed new law version is required.');
  }
  for (const [name, hash] of Object.entries(manifest.files)) {
    if (digest(fs.readFileSync(path.join(root, name))) !== hash) throw new Error(`Frozen law dependency changed: ${name}`);
  }
  return { manifest, sha256: digest(bytes) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const kind = process.argv.includes('--graphics') ? 'graphics' : 'core';
  const spec = contract(kind);
  if (process.argv.includes('--create')) {
    if (fs.existsSync(spec.path)) throw new Error('Existing law freeze is immutable. See LAW_CHANGE_POLICY.md.');
    const receiptArg = process.argv.indexOf('--receipt');
    if (receiptArg < 0 || !process.argv[receiptArg + 1]) throw new Error('Freeze requires --receipt from tools/verify.mjs --draft (proofs plus reference conformance).');
    const readinessBytes = fs.readFileSync(path.resolve(process.argv[receiptArg + 1]));
    const readiness = JSON.parse(readinessBytes);
    const requiredGates = ['proofs', 'conformance', 'match', 'graphics-proof', 'pixels'];
    if (readiness.schema !== 'rift-bend-readiness/1' || readiness.passed !== true
      || !requiredGates.every((name) => readiness.results.some((result) => result.name === name && result.exit === 0))) throw new Error('Readiness gate did not pass.');
    for (const [name, hash] of Object.entries(readiness.files)) {
      if (digest(fs.readFileSync(path.join(root, name))) !== hash) throw new Error(`Readiness is stale: ${name}`);
    }
    if (!spec.files.every((name) => readiness.files[name])) throw new Error('Readiness omits normative files.');
    const files = Object.fromEntries(spec.files.map((name) => [name, digest(fs.readFileSync(path.join(root, name)))]));
    fs.mkdirSync(path.dirname(spec.path), { recursive: true });
    fs.writeFileSync(spec.path, JSON.stringify({ schema: spec.schema, version: 1, frozenAt: new Date().toISOString(), readinessSha256: digest(readinessBytes), files }, null, 2) + '\n', { flag: 'wx' });
  }
  const checked = verifyFreeze(kind);
  console.log(`${kind} semantic v1 verified: ${checked.sha256}`);
}
