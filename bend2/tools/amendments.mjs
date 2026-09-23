// Recorded, reviewed substitutions for frozen non-semantic authorities (the
// compiler pin, gate tooling, English law documents). Frozen manifests are never
// rewritten; a manifest hash is resolved through this chain before comparison.
// Law, proof, implementation, test, fixture and reference bytes cannot be
// substituted here: changing them requires a new semantic version.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const amendmentDir = path.join(root, 'bend2/laws/amendments');
export const amendmentTools = ['bend2/tools/amendments.mjs', 'bend2/tools/amend.mjs'];
export const lawManifests = ['semantic-v1', 'pixels-v1', 'proof-v1', 'semantic-v2'].map((n) => `bend2/laws/${n}.json`);
export const receiptKeys = ['v1', 'v2', 'mutations', 'library', 'build'];
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const sha = (file) => digest(fs.readFileSync(path.join(root, file)));
const HEX = /^[0-9a-f]{64}$/;

// The change policy itself is never substitutable.
export function substitutable(file) {
  return file === 'bend2/TOOLCHAIN.json'
    || /^bend2\/tools\/[A-Za-z0-9_.-]+\.(mjs|ts)$/.test(file)
    || /^bend2\/docs\/[A-Za-z0-9_.-]+\.md$/.test(file) && file !== 'bend2/docs/LAW_CHANGE_POLICY.md';
}

// Each amendment carries exactly its receipts and a review binding them.
export function evidenceFiles(stem) {
  const dir = `bend2/docs/evidence/amendments/${stem}`;
  return [...receiptKeys.map((k) => `${dir}/${k}.json`), `${dir}/review.md`];
}

export function reviewBinds(review, hashes) {
  if (!/^Review disposition: accepted\r?$/m.test(review)) return false;
  return Object.entries(hashes).every(([key, hash]) => new RegExp(`^${key} SHA256: ${hash}\\r?$`, 'm').test(review));
}

let cache = null;
// A new amendment may itself revise the amendment tooling, so creation reads the
// chain without the tooling binding; every verification checks it.
export function loadAmendments(checkTools = true) {
  if (cache && checkTools) return cache;
  const names = fs.existsSync(amendmentDir) ? fs.readdirSync(amendmentDir).filter((n) => n.endsWith('.json')).sort() : [];
  const chain = [];
  let parent = null;
  for (const [i, name] of names.entries()) {
    if (!/^\d{3}-[a-z0-9-]+\.json$/.test(name) || Number(name.slice(0, 3)) !== i + 1) throw new Error(`Invalid amendment name: ${name}`);
    const file = `bend2/laws/amendments/${name}`;
    const bytes = fs.readFileSync(path.join(root, file));
    const value = JSON.parse(bytes);
    if (value.schema !== 'rift-bend-amendment/1' || value.sequence !== i + 1 || value.parentSha256 !== parent) throw new Error(`Broken amendment chain at ${file}`);
    if (value.semanticMeaning !== 'unchanged') throw new Error(`Amendment claims a semantic change: ${file}`);
    const records = value.records ?? {};
    if (JSON.stringify(Object.keys(records).sort()) !== JSON.stringify([...lawManifests].sort())
      || lawManifests.some((m) => sha(m) !== records[m])) throw new Error(`Amendment does not bind the frozen manifests: ${file}`);
    const subs = Object.entries(value.substitutions ?? {});
    if (subs.length === 0) throw new Error(`Amendment substitutes nothing: ${file}`);
    for (const [target, s] of subs) {
      if (!substitutable(target)) throw new Error(`Amendment substitutes a protected file: ${target}`);
      if (!HEX.test(s.from) || !HEX.test(s.to) || s.from === s.to || !s.reason) throw new Error(`Invalid substitution for ${target} in ${file}`);
      if (target.endsWith('.md') && !Object.values(value.preserved ?? {}).includes(target)) throw new Error(`Frozen document lacks a preserved copy: ${target}`);
    }
    for (const [copy, original] of Object.entries(value.preserved ?? {})) {
      const s = value.substitutions?.[original];
      if (!s || sha(copy) !== s.from) throw new Error(`Preserved copy does not match the frozen bytes: ${copy}`);
    }
    const evidence = value.evidence ?? {};
    const required = evidenceFiles(name.slice(0, -5));
    if (JSON.stringify(Object.keys(evidence).sort()) !== JSON.stringify([...required].sort())) throw new Error(`Amendment evidence set is incomplete: ${file}`);
    for (const [item, hash] of Object.entries(evidence)) {
      if (sha(item) !== hash) throw new Error(`Amendment evidence changed: ${item}`);
    }
    const review = fs.readFileSync(path.join(root, required.at(-1)), 'utf8');
    if (!reviewBinds(review, Object.fromEntries(receiptKeys.map((k, j) => [k, evidence[required[j]]])))) throw new Error(`Amendment review does not accept and bind its receipts: ${file}`);
    chain.push({ file, sha256: digest(bytes), value });
    parent = digest(bytes);
  }
  if (!checkTools) return chain;
  const last = chain.at(-1);
  if (last) {
    for (const tool of amendmentTools) {
      if (last.value.tools?.[tool] !== sha(tool)) throw new Error(`Amendment tooling changed after ${last.file}: ${tool}`);
    }
  }
  cache = chain;
  return chain;
}

// The bytes a frozen record now expects for `file`, after recorded amendments.
export function resolveFrozen(file, recorded, chain = loadAmendments()) {
  let hash = recorded;
  for (const { value } of chain) {
    const s = value.substitutions?.[file];
    if (s && s.from === hash) hash = s.to;
  }
  return hash;
}

export function matchesFrozen(file, recorded) {
  return sha(file) === resolveFrozen(file, recorded);
}
