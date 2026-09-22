import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, digest, verifyFreeze } from './freeze.mjs';

const draft = process.argv.includes('--draft');
const semantic = draft ? null : verifyFreeze();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = path.join(root, '.artifacts/bend2/proofs', stamp);
fs.mkdirSync(out, { recursive: true });
function check(file, label) {
  const result = spawnSync(process.execPath, [path.join(root, 'bend2/tools/bend.mjs'), file, '--check-only'], { cwd: root, env: { ...process.env, BEND_TIMEOUT_MS: '300000' }, encoding: 'utf8', timeout: 320000, maxBuffer: 8e6 });
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  fs.writeFileSync(path.join(out, `${label}.txt`), stdout + stderr);
  const output = stdout + stderr;
  const diagnostic = /TODOs? found/.test(output) ? 'unfilled-law'
    : /Error:[\s\S]*expected\s*:[\s\S]*observed\s*:[\s\S]*Location:/.test(output) ? 'type-equality'
      : result.status === 0 ? 'checked' : 'other-failure';
  return { exit: result.status, clean: result.status === 0 && stdout.trim() === 'All terms check.' && !stderr.trim(), diagnostic, outputSha256: digest(output), error: result.error?.message ?? null };
}
const source = path.join(root, 'bend2/core');
const files = Object.fromEntries(fs.readdirSync(source).filter((name) => name.endsWith('.bend')).sort().map((name) => [`bend2/core/${name}`, digest(fs.readFileSync(path.join(source, name)))]));
const positive = check(path.join(source, 'PROOF.bend'), 'positive');
const negatives = [];
function declarations(source, keyword) {
  const hits = [...source.matchAll(new RegExp(`^${keyword} ([A-Za-z0-9_.]+)`, 'gm'))];
  return { header: source.slice(0, hits[0]?.index ?? source.length), blocks: hits.map((hit, i) => ({ name: hit[1], text: source.slice(hit.index, hits[i + 1]?.index ?? source.length) })) };
}
function focus(dir, lawName) {
  // The full positive checks every law. Each mutation then gets a clean control
  // for the exact target law and unchanged witnesses, avoiding repeated costly
  // normalization of unrelated predicates in this young checker.
  const laws = declarations(fs.readFileSync(path.join(dir, 'LAWS.bend'), 'utf8'), 'law');
  const proof = declarations(fs.readFileSync(path.join(dir, 'PROOF.bend'), 'utf8'), 'def');
  const wanted = new Set([`Laws.${lawName}`]);
  let added = true;
  while (added) {
    added = false;
    for (const block of proof.blocks.filter((block) => wanted.has(block.name))) {
      for (const candidate of proof.blocks) {
        const escaped = candidate.name.replaceAll('.', '\\.');
        if (!wanted.has(candidate.name) && new RegExp(`(?<![A-Za-z0-9_.])${escaped}\\s*\\(`).test(block.text)) {
          wanted.add(candidate.name); added = true;
        }
      }
    }
  }
  const law = laws.blocks.find((block) => block.name === lawName);
  if (!law || !proof.blocks.some((block) => block.name === `Laws.${lawName}`)) throw new Error(`Missing focused law: ${lawName}`);
  fs.writeFileSync(path.join(dir, 'LAWS.bend'), laws.header + law.text);
  fs.writeFileSync(path.join(dir, 'PROOF.bend'), proof.header + proof.blocks.filter((block) => wanted.has(block.name)).map((block) => block.text).join(''));
}
if (positive.clean && process.argv.includes('--negative')) {
  // Deliberately alter only copies. Never touch frozen inputs or overwrite an
  // earlier failed sample. A mutation must actually occur and must be rejected.
  const probes = [
    ['unfilled-law', 'PROOF.bend', /def Laws\.step_refines\(p, id\):\r?\n[^\n]+/, '', 'unfilled-law'],
    ['reject-everything', 'Kernel.bend', /decide\(Spec\.authorized\(p, id\), p, id\)/, 'decide(False{}, p, id)', 'type-equality'],
    ['match-bypass', 'Kernel.bend', /Match\.step\(m, c\)/, 'Match.Accepted{Match.apply_enabled(m, c)}', 'type-equality'],
    ['omit-chunk', 'Kernel.bend', /List\.append\(&2, U32, a, List\.append\(&2, U32, b, List\.append\(&2, U32, c, d\)\)\)/,
      'List.append(&2, U32, b, List.append(&2, U32, c, d))', 'type-equality'],
    ['duplicate-chunk', 'Kernel.bend', /List\.append\(&2, U32, a, List\.append\(&2, U32, b, List\.append\(&2, U32, c, d\)\)\)/,
      'List.append(&2, U32, a, List.append(&2, U32, b, List.append(&2, U32, c, Spec.legal_range(5440n, 10880, p))))', 'type-equality'],
    ['reorder-chunks', 'Kernel.bend', /List\.append\(&2, U32, a, List\.append\(&2, U32, b, List\.append\(&2, U32, c, d\)\)\)/,
      'List.append(&2, U32, b, List.append(&2, U32, a, List.append(&2, U32, c, d)))', 'type-equality'],
  ];
  for (const [name, file, pattern, replacement, expectedDiagnostic] of probes) {
    const dir = path.join(out, name);
    fs.cpSync(source, dir, { recursive: true });
    const targetLaw = name === 'match-bypass' ? 'match_refines'
      : name.endsWith('chunk') || name.endsWith('chunks') ? 'enumeration_refines' : 'step_refines';
    focus(dir, targetLaw);
    const control = check(path.join(dir, 'PROOF.bend'), `${name}-control`);
    if (!control.clean) throw new Error(`Focused positive control failed for ${name}; see ${out}`);
    const input = path.join(dir, file);
    const before = fs.readFileSync(input, 'utf8');
    const after = before.replace(pattern, replacement);
    if (after === before) throw new Error(`Negative probe no longer matches: ${name}`);
    fs.writeFileSync(input, after);
    const result = check(path.join(dir, 'PROOF.bend'), name);
    negatives.push({ name, targetLaw, control, file, beforeSha256: digest(before), afterSha256: digest(after), replacement, expectedDiagnostic, ...result,
      rejected: result.exit !== 0 && result.exit !== null && result.diagnostic === expectedDiagnostic });
  }
}
const receipt = { schema: 'rift-bend-proof/1', at: new Date().toISOString(), draft, semanticSha256: semantic?.sha256 ?? null, toolchain: JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json'))), files, positive, negatives };
fs.writeFileSync(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ out, ...receipt }, null, 2));
if (!positive.clean || negatives.some((probe) => !probe.rejected)) process.exitCode = 1;
