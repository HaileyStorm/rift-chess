import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, digest, verifyFreeze } from './freeze.mjs';
const destination = path.join(root, 'bend2/laws/proof-v1.json');

export function verifyAttestation() {
  const value = JSON.parse(fs.readFileSync(destination));
  if (value.schema !== 'rift-bend-proof-attestation/1' || value.semanticSha256 !== verifyFreeze().sha256
    || value.pixelSemanticSha256 !== verifyFreeze('graphics').sha256) throw new Error('Proof attestation differs from the frozen semantics.');
  for (const [file, hash] of Object.entries(value.witnesses)) {
    if (digest(fs.readFileSync(path.join(root, file))) !== hash) throw new Error(`Implementation/proof changed after verification: ${file}`);
  }
  return value;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (fs.existsSync(destination)) throw new Error('Attestation already exists; preserve this version before recording a new proof.');
  const [proofPath, readinessPath] = process.argv.slice(2);
  if (!proofPath || !readinessPath) throw new Error('Usage: node attest.mjs proof-receipt.json readiness.json');
  const proofBytes = fs.readFileSync(path.resolve(proofPath));
  const readinessBytes = fs.readFileSync(path.resolve(readinessPath));
  const proof = JSON.parse(proofBytes), readiness = JSON.parse(readinessBytes);
  if (!proof.positive.clean || proof.negatives.length !== 6 || proof.negatives.some(p => !p.rejected || !p.control.clean) || !readiness.passed) throw new Error('Required evidence did not pass.');
  for (const [file, hash] of Object.entries(readiness.files)) {
    if (digest(fs.readFileSync(path.join(root, file))) !== hash) throw new Error(`Stale readiness: ${file}`);
  }
  const witnesses = Object.fromEntries(['bend2/core/Kernel.bend', 'bend2/core/PROOF.bend', 'bend2/graphics/PROOF.bend'].map(file => [file, readiness.files[file]]));
  const value = { schema: 'rift-bend-proof-attestation/1', at: new Date().toISOString(), semanticSha256: verifyFreeze().sha256,
    pixelSemanticSha256: verifyFreeze('graphics').sha256, proofReceiptSha256: digest(proofBytes), readinessReceiptSha256: digest(readinessBytes), witnesses };
  fs.writeFileSync(destination, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
  const evidence = path.join(root, 'bend2/docs/evidence/laws-v1');
  fs.mkdirSync(evidence, { recursive: true });
  fs.writeFileSync(path.join(evidence, 'proof.json'), proofBytes, { flag: 'wx' });
  fs.writeFileSync(path.join(evidence, 'readiness.json'), readinessBytes, { flag: 'wx' });
  console.log(JSON.stringify(verifyAttestation(), null, 2));
}
