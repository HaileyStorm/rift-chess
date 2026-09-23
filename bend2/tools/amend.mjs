// Records one reviewed amendment of frozen non-semantic authorities, or verifies
// the chain. See LOCAL_BEND_GUIDE.md "Updating the Bend toolchain".
//
//   node bend2/tools/amend.mjs --create --spec spec.json --v1 readiness.json
//     --v2 receipt.json --mutations receipt.json --library library.json
//     --build build.json --review review.md
//   node bend2/tools/amend.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { root, amendmentDir, amendmentTools, lawManifests, receiptKeys, substitutable, evidenceFiles, reviewBinds, loadAmendments, resolveFrozen } from './amendments.mjs';

const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sha = (file) => digest(fs.readFileSync(path.join(root, file)));
const json = (file) => JSON.parse(fs.readFileSync(path.join(root, file)));

// Every hash-frozen record whose bytes an amendment may resolve.
export function frozenRecords() {
  const v1 = json('bend2/laws/semantic-v1.json'), px = json('bend2/laws/pixels-v1.json');
  const v2 = json('bend2/laws/semantic-v2.json'), att = json('bend2/laws/proof-v1.json');
  return [['semantic-v1', v1.files], ['pixels-v1', px.files], ['semantic-v2', v2.files], ['proof-v1 witnesses', att.witnesses]];
}

function drift(chain) {
  const found = new Map();
  for (const [record, files] of frozenRecords()) {
    for (const [file, recorded] of Object.entries(files)) {
      const expected = resolveFrozen(file, recorded, chain);
      if (sha(file) === expected) continue;
      const seen = found.get(file);
      if (seen && seen.from !== expected) throw new Error(`Frozen records disagree about ${file}`);
      found.set(file, { from: expected, records: [...(seen?.records ?? []), record] });
    }
  }
  return found;
}

// A receipt is current when each recorded hash is the present byte hash, except
// that a substituted English document may still carry its frozen bytes.
function current(hashes, subs, label, required) {
  const missing = required.filter((file) => !(file in hashes));
  if (missing.length) throw new Error(`${label} does not cover ${missing.join(', ')}`);
  for (const [file, hash] of Object.entries(hashes)) {
    const doc = subs[file] && file.endsWith('.md') && hash === subs[file].from;
    if (!doc && sha(file) !== hash) throw new Error(`${label} is stale for ${file}`);
  }
}

function readReceipt(file) {
  const bytes = fs.readFileSync(file);
  if (bytes[0] === 0xef || bytes[0] === 0xff || bytes[0] === 0xfe) throw new Error(`Receipt must be UTF-8 JSON without a byte-order mark: ${file}`);
  return JSON.parse(bytes);
}

function create(args) {
  const arg = (name) => { const i = args.indexOf(name); if (i < 0 || !args[i + 1]) throw new Error(`Missing ${name}`); return path.resolve(args[i + 1]); };
  const chain = loadAmendments(false);
  const spec = JSON.parse(fs.readFileSync(arg('--spec')));
  if (!/^[a-z0-9-]+$/.test(spec.slug ?? '') || !spec.kind || !spec.rationale || !spec.files) throw new Error('Spec needs slug, kind, rationale and files.');
  const found = drift(chain);
  const listed = Object.keys(spec.files).sort(), drifted = [...found.keys()].sort();
  if (JSON.stringify(listed) !== JSON.stringify(drifted)) throw new Error(`Spec files ${JSON.stringify(listed)} differ from frozen drift ${JSON.stringify(drifted)}`);
  const substitutions = {};
  for (const file of listed) {
    if (!substitutable(file)) throw new Error(`Protected file changed; a new semantic version is required: ${file}`);
    substitutions[file] = { from: found.get(file).from, to: sha(file), records: found.get(file).records, reason: spec.files[file] };
  }
  const preserved = spec.preserved ?? {};
  for (const [file, s] of Object.entries(substitutions)) {
    if (file.endsWith('.md') && !Object.entries(preserved).some(([copy, original]) => original === file && sha(copy) === s.from)) {
      throw new Error(`A frozen document needs a byte-identical preserved copy: ${file}`);
    }
  }
  const receipts = Object.fromEntries(receiptKeys.map((k) => [k, arg(`--${k}`)]));
  const { v1, v2, mutations, library, build } = Object.fromEntries(receiptKeys.map((k) => [k, readReceipt(receipts[k])]));
  const pin = json('bend2/TOOLCHAIN.json');
  const [semantic, pixels, frozenV2, attest] = frozenRecords().map(([, files]) => Object.keys(files));
  const gates = ['proofs', 'conformance', 'match', 'graphics-proof', 'pixels'];
  if (v1.schema !== 'rift-bend-readiness/1' || !v1.passed || !v1.unchanged || JSON.stringify(v1.results.map((r) => r.name)) !== JSON.stringify(gates)
    || v1.results.some((r) => r.exit !== 0 || r.error)) throw new Error('V1 readiness did not pass.');
  current(v1.files, substitutions, 'V1 readiness', [...new Set([...semantic, ...pixels, ...attest])]);
  const dir = path.join(root, 'bend2/core/v2');
  const modules = fs.readdirSync(dir).filter((n) => n === 'PROOF.bend' || n.endsWith('Proof.bend') || n === 'Facade.bend').sort();
  const declarations = fs.readdirSync(dir).filter((n) => n === 'LAWS.bend' || n.endsWith('Laws.bend')).sort();
  const aggregate = v2.results?.find((r) => r.file === 'CHECK.bend' && r.ok);
  if (v2.schema !== 'rift-v2-staged-check/1' || !v2.passed || !v2.unchanged || !aggregate || v2.missingRequired.length !== 0
    || JSON.stringify(aggregate.modules) !== JSON.stringify(modules) || JSON.stringify(aggregate.declarations) !== JSON.stringify(declarations)
    || !v2.results.some((r) => r.file === 'conformance.ts' && r.ok)) throw new Error('V2 readiness did not pass.');
  current(v2.hashes, substitutions, 'V2 readiness', frozenV2);
  const required = ['reject_all', 'wrong_successor', 'hide_all_moves', 'omit_repetition_key', 'wrong_resignation', 'ignore_draw_agreement'];
  if (!mutations.passed || !mutations.unchanged || !required.every((n) => mutations.results.some((r) => r.name === n && r.positive && r.rejected))) throw new Error('V2 mutation controls did not pass.');
  current(mutations.hashes, substitutions, 'Mutation receipt', Object.keys(substitutions).filter((f) => frozenV2.includes(f) && !f.endsWith('.md')));
  if (!library.ok || !library.checked || library.checks.length !== 4 || library.compiler.bendCommit !== pin.bendCommit
    || library.checks.slice(0, 2).some((c) => c.output !== 'All terms check.')) throw new Error('Library verification did not pass.');
  if (build.toolchain?.bendCommit !== pin.bendCommit || build.schema !== 'rift-bend-browser/2') throw new Error('Browser build receipt does not use the current compiler.');
  const review = fs.readFileSync(arg('--review'), 'utf8');
  if (!reviewBinds(review, Object.fromEntries(receiptKeys.map((k) => [k, digest(fs.readFileSync(receipts[k]))])))) throw new Error('The review must accept and bind every receipt.');
  const sequence = chain.length + 1, name = `${String(sequence).padStart(3, '0')}-${spec.slug}`;
  const targets = evidenceFiles(name);
  for (const target of targets) if (fs.existsSync(path.join(root, target))) throw new Error(`Evidence already exists: ${target}`);
  fs.mkdirSync(path.join(root, path.dirname(targets[0])), { recursive: true });
  const evidence = {};
  for (const [i, source] of [...receiptKeys.map((k) => receipts[k]), arg('--review')].entries()) {
    fs.writeFileSync(path.join(root, targets[i]), fs.readFileSync(source), { flag: 'wx' });
    evidence[targets[i]] = sha(targets[i]);
  }
  const records = Object.fromEntries(lawManifests.map((m) => [m, sha(m)]));
  const value = { schema: 'rift-bend-amendment/1', sequence, parentSha256: chain.at(-1)?.sha256 ?? null, createdAt: new Date().toISOString(),
    kind: spec.kind, semanticMeaning: 'unchanged', rationale: spec.rationale, toolchain: pin, records, substitutions, preserved, evidence,
    tools: Object.fromEntries(amendmentTools.map((t) => [t, sha(t)])) };
  fs.mkdirSync(amendmentDir, { recursive: true });
  fs.writeFileSync(path.join(amendmentDir, `${name}.json`), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--create')) create(process.argv.slice(2));
  const chain = loadAmendments();
  const open = drift(chain);
  if (open.size) throw new Error(`Frozen bytes drift without an amendment: ${[...open.keys()].join(', ')}`);
  console.log(JSON.stringify({ amendments: chain.map(({ file, sha256, value }) => ({ file, sha256, kind: value.kind, files: Object.keys(value.substitutions) })) }));
}
