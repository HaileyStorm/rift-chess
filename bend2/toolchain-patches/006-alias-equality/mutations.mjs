// Candidate-only negative controls: mutate disposable copies of frozen v2
// dependencies, never the source Laws or the clean pinned compiler.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { verifyV2 } from '../../tools/freeze-v2.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const here = path.dirname(fileURLToPath(import.meta.url));
const candidate = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028/bend2');
const baseline = path.join(root, '.artifacts/bend2/toolchain-patches/fresh-2028-stack');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const cases = [
  { name: 'reject_all', proof: 'PROOF.bend', location: 'accepted_property', from: 'case True{}: Accepted{id, proposed(p, id)}', to: 'case True{}: Rejected{p}' },
  { name: 'wrong_successor', proof: 'PROOF.bend', location: 'accepted_property', from: 'case True{}: Accepted{id, proposed(p, id)}', to: 'case True{}: Accepted{id, M.start(True{})}' },
  { name: 'hide_all_moves', proof: 'CanonicalProof.bend', location: 'CanonicalLaws.canonical_member_sound', from: 'legal_tree(5n, p, 0, 21760)', to: '[]' },
  { name: 'omit_repetition_key', proof: 'MatchControlProof.bend', target: 'MatchKernel.bend', location: 'MatchControlLaws.move_effect', from: 'append_position(states, next), append_key(keys, key)', to: 'append_position(states, next), keys' },
  { name: 'wrong_resignation', proof: 'MatchControlProof.bend', target: 'MatchKernel.bend', location: 'MatchControlLaws.resign_effect', from: 'policy, Types.NoOffer{}, Types.WhiteResigned{}', to: 'policy, Types.NoOffer{}, Types.BlackResigned{}' },
  { name: 'ignore_draw_agreement', proof: 'AdjudicationProof.bend', target: 'MatchKernel.bend', location: 'AdjudicationLaws.full_outcome_exact', from: 'Some{Types.Agreed{}}', to: 'None{}' },
];

if (isMainThread) {
  process.env.BEND_NO_TELEMETRY = '1';
  process.env.BEND_HUB = 'http://127.0.0.1:9';
  const chosen = process.argv[2] === '--case' ? cases.filter(item => item.name === process.argv[3]) : cases;
  assert.ok(chosen.length && (process.argv.length === 2 ||
    (process.argv.length === 4 && process.argv[2] === '--case')), 'Unknown mutation case');
  const semantic = verifyV2();
  const runtime = JSON.parse(fs.readFileSync(path.join(root, 'bend2/core/v2/proof-runtime.json')));
  assert.equal(process.version, runtime.runtime.version);
  assert.equal(process.platform, runtime.runtime.platform);
  assert.equal(process.arch, runtime.runtime.arch);
  assert.equal(sha(fs.readFileSync(process.execPath)), runtime.runtime.sha256);
  const tag = execFileSync('git', ['-C', baseline, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(tag, 'bc178404f4778704fa5584a73fcdf72bcdf9f32c');
  execFileSync('git', ['-C', baseline, 'diff', '--check']);
  const patchSha256 = sha(fs.readFileSync(path.join(here, '006-after-004-2.0.28.patch')));
  assert.equal(patchSha256, 'a558b9b53cb46667659dc52036ad13a64da4e026ca8cf51dbd1ede9468fa8344');
  const fixture = JSON.parse(fs.readFileSync(path.join(root,
    '.artifacts/bend2/toolchain-patches/alias-equality-2028-fixtures/receipt.json'), 'utf8'));
  assert.equal(fixture.passed, true);
  assert.equal(fixture.patchSha256, patchSha256);
  assert.equal(fixture.baselineTag, tag);
  const fixtureSha256 = sha(fs.readFileSync(path.join(root,
    '.artifacts/bend2/toolchain-patches/alias-equality-2028-fixtures/receipt.json')));
  const compiler = Object.fromEntries(['bend.ts', 'comp.ts', 'main.ts', 'base.bend', 'web_runtime.js']
    .map(name => [name, sha(fs.readFileSync(path.join(candidate, name)))]));
  const canonical = name => sha(fs.readFileSync(path.join(candidate, name), 'utf8')
    .replace(/\r\n/g, '\n'));
  assert.equal(canonical('bend.ts'), fixture.patchedBendCanonicalSha256);
  assert.equal(canonical('bend.ts'), '359543edcf8060817f68e1ae6aeaad79888a20de511e676d065abab271657dd8');
  assert.equal(canonical('comp.ts'), '49c40305ef96f91187cc5eb8fceac02cbf2c4992cbdee4819ec7c0fd3ee8887b');
  assert.equal(canonical('main.ts'), '5303e55d5b240d173f78c6c2f0b2e626a276482541a5d80fd1a22e986d1ab430');
  assert.equal(canonical('web_runtime.js'), '5def0b7c33be027416c869adbf16a26cc98a0008461b11c2e49453c955ad97d6');
  assert.equal(compiler['base.bend'], '722a76eaa91732b3c50299f91769ae6ba97ad80705013209b816f5204536aebb');
  assert.equal(compiler['base.bend'], sha(fs.readFileSync(path.join(baseline, 'bend2/base.bend'))));
  const original = fs.readFileSync(path.join(baseline, 'bend2/bend.ts'), 'utf8');
  const guard = 'if ((q in p.book.tlds || q in p.book.ctrs) && (k in p.book.tlds || k in p.book.ctrs)) {';
  assert.equal(original.split(guard).length, 2);
  const patched = original.replace(guard,
    'if (q !== k && (q in p.book.tlds || q in p.book.ctrs) && (k in p.book.tlds || k in p.book.ctrs)) {');
  assert.equal(canonical('bend.ts'), sha(patched.replace(/\r\n/g, '\n')));
  const runnerSha256 = sha(fs.readFileSync(fileURLToPath(import.meta.url)));
  const parent = path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028-mutations');
  fs.mkdirSync(parent, { recursive: true });
  const out = path.join(parent, `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID()}`);
  fs.mkdirSync(out);
  const results = [];

  async function check(entry) {
    const start = Date.now();
    return new Promise(resolve => {
      const worker = new Worker(new URL(import.meta.url), {
        workerData: { entry, candidate },
        resourceLimits: { stackSizeMb: runtime.worker.stackSizeMb, maxOldGenerationSizeMb: 8192 },
        execArgv: runtime.worker.execArgv,
      });
      let result = null;
      const timer = setTimeout(() => { result = { ok: false, error: '900-second mutation check timed out' };
        void worker.terminate(); }, 900000);
      worker.on('message', message => { result = message; });
      worker.on('error', error => { result = { ok: false, error: error.stack || String(error) }; });
      worker.on('exit', code => {
        clearTimeout(timer);
        result ??= { ok: false, error: `Mutation worker exited ${code} without verdict` };
        if (code !== 0) result = { ...result, ok: false, workerExit: code };
        resolve({ ...result, elapsedMs: Date.now() - start });
      });
    });
  }
  try {
    for (const item of chosen) {
      const directory = path.join(out, item.name);
      fs.mkdirSync(directory);
      fs.cpSync(path.join(root, 'bend2/core'), path.join(directory, 'core'), { recursive: true });
      const entry = path.join(directory, 'core/v2', item.proof);
      const positive = await check(entry);
      const target = path.join(directory, 'core/v2', item.target || 'RuleKernel.bend');
      const source = fs.readFileSync(target, 'utf8');
      assert.equal(source.split(item.from).length, 2, `Mutation anchor not unique: ${item.name}`);
      fs.writeFileSync(target, source.replace(item.from, item.to));
      const negative = positive.ok ? await check(entry) : { ok: false, error: 'Positive control failed' };
      const rejected = positive.ok && !negative.ok && !negative.workerExit &&
        negative.deniedFetches === 0 && !/timed out|RangeError|stack size|heap|out of memory/i.test(negative.error || '') &&
        (negative.error || '').startsWith('Error:\n- expected : ') &&
        (negative.error || '').includes('\n- observed : ') &&
        (negative.error || '').includes(`\nLocation: ${item.location}\n`);
      const result = { name: item.name, positive, negative, rejected,
        originalSha256: sha(source), mutatedSha256: sha(fs.readFileSync(target)) };
      results.push(result);
      console.log(JSON.stringify({ name: item.name, positive: positive.ok, rejected,
        positiveMs: positive.elapsedMs, negativeMs: negative.elapsedMs,
        negativeError: (negative.error || '').slice(0, 300) }));
      if (!positive.ok || !rejected) break;
    }
  } finally {
    const unchanged = verifyV2().sha256 === semantic.sha256 &&
      Object.entries(compiler).every(([name, hash]) =>
        sha(fs.readFileSync(path.join(candidate, name))) === hash) &&
      sha(fs.readFileSync(path.join(here, '006-after-004-2.0.28.patch'))) === patchSha256 &&
      sha(fs.readFileSync(path.join(root,
        '.artifacts/bend2/toolchain-patches/alias-equality-2028-fixtures/receipt.json'))) === fixtureSha256 &&
      sha(fs.readFileSync(path.join(baseline, 'bend2/base.bend'))) === compiler['base.bend'] &&
      sha(fs.readFileSync(path.join(baseline, 'bend2/bend.ts'))) === sha(original) &&
      sha(fs.readFileSync(fileURLToPath(import.meta.url))) === runnerSha256;
    const selectedPassed = unchanged && results.length === chosen.length && results.every(result => result.rejected);
    const passed = chosen.length === cases.length && selectedPassed;
    const receipt = { schema: 'rift-bend-2028-candidate-v2-mutations/1', at: new Date().toISOString(),
      sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      complete: chosen.length === cases.length, semanticSha256: semantic.sha256,
      compiler, tag, patchSha256, fixtureSha256, runnerSha256,
      runtimeSha256: runtime.runtime.sha256, results, unchanged, selectedPassed, passed,
      scope: 'Disposable v2 Law mutation controls on candidate 2.0.28; not pin adoption or native/browser proof' };
    const file = path.join(out, 'receipt.json');
    fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify({ file, complete: receipt.complete, passed, unchanged }));
    if (!selectedPassed) process.exitCode = 1;
  }
} else {
  let Bend;
  let deniedFetches = 0;
  globalThis.fetch = async () => { deniedFetches++; throw Error('Mutation worker network fetch denied'); };
  try {
    const entry = path.resolve(workerData.entry);
    assert.ok(entry.startsWith(path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028-mutations') + path.sep));
    Bend = await import(pathToFileURL(path.join(workerData.candidate, 'bend.ts')).href);
    const Comp = await import(pathToFileURL(path.join(workerData.candidate, 'comp.ts')).href);
    const book = Bend.book_nil();
    await Bend.book_load(book, entry.replaceAll('\\', '/'), '', new Map());
    Bend.book_valid(book);
    Comp.js_lib(book, [], [], { internal: true });
    const holes = book.hols + book.open;
    if (holes) throw Error(`${holes} TODO/open proof holes`);
    const own = [...new Set(book.order.filter(key => book.tlds[key]?.b !== true))];
    const bad = new Set(Object.keys(book.tlds).filter(key => {
      const term = book.tlds[key];
      return term.u === true || (term.i !== undefined && term.b !== true);
    }));
    const uses = Object.create(null), visited = new Set();
    function refs(term, out) {
      if (typeof term !== 'object' || term === null) return;
      if ((term.$ === 'Ref' || term.$ === 'ADT') && term.k !== undefined) out.add(term.k);
      for (const [field, value] of Object.entries(term)) if (field !== 's') refs(value, out);
    }
    for (const queue = bad.size ? own.slice() : []; queue.length;) {
      const key = queue.pop(), term = book.tlds[key];
      if (!term || visited.has(key)) continue;
      visited.add(key);
      const names = new Set();
      for (const body of term.$ === 'ADT' ? term.c : [term]) refs(Bend.term_lower(body.T), names);
      refs(term.$ === 'Def' ? term.e : undefined, names);
      for (const ref of names) { (uses[ref] ??= []).push(key); queue.push(ref); }
    }
    for (const key of bad) uses[key]?.forEach(ref => bad.add(ref));
    const tainted = own.filter(key => bad.has(key));
    if (tainted.length) throw Error(`Proof depends on unsafe/foreign code: ${tainted.join(', ')}`);
    if (deniedFetches) throw Error(`${deniedFetches} remote fetch attempts denied`);
    parentPort.postMessage({ ok: true, terms: book.order.length, holes, deniedFetches });
  } catch (error) {
    parentPort.postMessage({ ok: false, deniedFetches,
      error: error?.$ === 'Err' && Bend ? Bend.err_show(error) : error?.stack || String(error) });
  }
}
