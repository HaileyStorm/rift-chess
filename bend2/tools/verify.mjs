import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, digest, verifyFreeze } from './freeze.mjs';

const draft = process.argv.includes('--draft');
if (!draft) { verifyFreeze(); verifyFreeze('graphics'); }
const out = path.join(root, '.artifacts/bend2/verification', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(out, { recursive: true });
const sourceFiles = [...fs.readdirSync(path.join(root, 'bend2/core')).filter((name) => name.endsWith('.bend')).map((name) => `bend2/core/${name}`),
  'bend2/TOOLCHAIN.json', 'bend2/docs/LAWS_V1.md', 'bend2/docs/LAW_CHANGE_POLICY.md',
  'bend2/tests/conformance.ts', 'bend2/tests/interop.ts', 'bend2/tests/pixels.ts',
  'bend2/graphics/Pixel.bend', 'bend2/graphics/LAWS.bend', 'bend2/graphics/PROOF.bend',
  'bend2/docs/GRAPHICS_LAWS_V1.md', 'fixtures/conformance.json'];
const files = Object.fromEntries(sourceFiles.map((name) => [name, digest(fs.readFileSync(path.join(root, name)))]));
const results = [];
for (const [name, args] of [
  ['proofs', ['bend2/tools/prove.mjs', ...(draft ? ['--draft'] : []), '--negative']],
  ['conformance', ['bend2/tools/bend.mjs', '--run', 'bend2/tests/conformance.ts']],
  ['match', ['bend2/tools/bend.mjs', '--run', 'bend2/tests/interop.ts']],
  ['graphics-proof', ['bend2/tools/bend.mjs', 'bend2/graphics/PROOF.bend', '--check-only']],
  ['pixels', ['bend2/tools/bend.mjs', '--run', 'bend2/tests/pixels.ts']],
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: name === 'proofs' ? 2400000 : 320000, maxBuffer: 12e6 });
  const output = (result.stdout || '') + (result.stderr || '');
  fs.writeFileSync(path.join(out, `${name}.txt`), output);
  const exit = name === 'graphics-proof' && output.trim() !== 'All terms check.' ? 1 : result.status;
  results.push({ name, exit, error: result.error?.message ?? null, outputSha256: digest(output) });
  console.log(`${name}: ${result.status === 0 ? 'PASS' : 'FAIL'} (${path.join(out, `${name}.txt`)})`);
  if (exit !== 0) break;
}
const unchanged = Object.entries(files).every(([name, hash]) => digest(fs.readFileSync(path.join(root, name))) === hash);
const passed = unchanged && results.length === 5 && results.every((result) => result.exit === 0);
const receipt = { schema: 'rift-bend-readiness/1', at: new Date().toISOString(), draft, passed, unchanged, files, results };
fs.writeFileSync(path.join(out, 'readiness.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(`Readiness: ${path.join(out, 'readiness.json')}`);
if (!passed) process.exitCode = 1;
