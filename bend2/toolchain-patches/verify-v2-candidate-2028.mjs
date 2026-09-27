// Diagnostic only: check the existing frozen v2 aggregate against the
// disposable, reviewed-order 2.0.28 patch stack without moving TOOLCHAIN.json.
// This is not the canonical proof receipt or a native/browser acceptance gate.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baseline = path.join(root, '.artifacts/bend2/toolchain-patches/fresh-2028-stack');
const aliasTrial = process.argv.includes('--alias-equality-trial');
const candidate = aliasTrial
  ? path.join(root, '.artifacts/bend2/toolchain-patches/alias-equality-2028')
  : baseline;
const entry = path.join(root, 'bend2/core/v2/CHECK.bend');
const expectedTag = 'bc178404f4778704fa5584a73fcdf72bcdf9f32c';
const expectedCanonical = {
  'bend.ts': 'c90ace39dbbbc1b6b4fd7e5bb9604b64968fcf00d0a39c20e46ac8059088ec56',
  'comp.ts': '49c40305ef96f91187cc5eb8fceac02cbf2c4992cbdee4819ec7c0fd3ee8887b',
  'main.ts': '5303e55d5b240d173f78c6c2f0b2e626a276482541a5d80fd1a22e986d1ab430',
  'web_runtime.js': '5def0b7c33be027416c869adbf16a26cc98a0008461b11c2e49453c955ad97d6',
};
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const relative = file => path.relative(root, file).replaceAll('\\', '/');

function inputClosure(file, found = new Set()) {
  file = fs.realpathSync(file);
  assert.ok(file.startsWith(root + path.sep), 'Proof input escaped this project');
  if (found.has(file)) return found;
  found.add(file);
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/^\s*import\s+([^\s]+)(?:\s+as\s+\w+)?\s*(?:#.*)?$/gm)) {
    const spec = match[1];
    if (spec === 'Base') continue;
    assert.ok(spec.startsWith('./') || spec.startsWith('../'),
      `Candidate proof forbids remote/package import: ${relative(file)} -> ${spec}`);
    inputClosure(path.resolve(path.dirname(file), spec), found);
  }
  return found;
}

if (isMainThread) {
  process.env.BEND_NO_TELEMETRY = '1';
  process.env.BEND_HUB = 'http://127.0.0.1:9';
  const runnerSha256 = sha(fs.readFileSync(fileURLToPath(import.meta.url)));
  const runtime = JSON.parse(fs.readFileSync(path.join(root, 'bend2/core/v2/proof-runtime.json')));
  assert.equal(process.version, runtime.runtime.version);
  assert.equal(process.platform, runtime.runtime.platform);
  assert.equal(process.arch, runtime.runtime.arch);
  assert.equal(sha(fs.readFileSync(process.execPath)), runtime.runtime.sha256);
  assert.equal(execFileSync('git', ['-C', baseline, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), expectedTag);
  execFileSync('git', ['-C', baseline, 'diff', '--check']);
  if (aliasTrial) {
    const oldText = fs.readFileSync(path.join(baseline, 'bend2/bend.ts'), 'utf8');
    const oldGuard = 'if ((q in p.book.tlds || q in p.book.ctrs) && (k in p.book.tlds || k in p.book.ctrs)) {';
    assert.equal(oldText.split(oldGuard).length, 2, 'Expected one original alias collision guard');
    const patched = oldText.replace(oldGuard,
      'if (q !== k && (q in p.book.tlds || q in p.book.ctrs) && (k in p.book.tlds || k in p.book.ctrs)) {');
    const canonical = text => text.replace(/\r\n/g, '\n');
    assert.equal(sha(Buffer.from(canonical(fs.readFileSync(path.join(candidate, 'bend2/bend.ts'), 'utf8')))),
      sha(Buffer.from(canonical(patched))),
      'Alias trial must change only the same-name guard modulo line endings');
    for (const name of ['comp.ts', 'main.ts', 'web_runtime.js', 'base.bend'])
      assert.equal(sha(fs.readFileSync(path.join(candidate, 'bend2', name))),
        sha(fs.readFileSync(path.join(baseline, 'bend2', name))),
        `Alias trial copied compiler resource drifted: ${name}`);
    expectedCanonical['bend.ts'] = sha(Buffer.from(canonical(patched)));
  }
  const compiler = {};
  for (const [name, expected] of Object.entries(expectedCanonical)) {
    const bytes = fs.readFileSync(path.join(candidate, 'bend2', name));
    const canonical = sha(bytes.toString('utf8').replace(/\r\n/g, '\n'));
    assert.equal(canonical, expected, `Candidate compiler text drifted: ${name}`);
    compiler[name] = { sha256: sha(bytes), canonicalSha256: canonical };
  }
  const inputs = Object.fromEntries([...inputClosure(entry)].sort()
    .map(file => [relative(file), sha(fs.readFileSync(file))]));
  inputs['candidate/base.bend'] = sha(fs.readFileSync(path.join(candidate, 'bend2/base.bend')));
  const started = Date.now();
  const output = path.join(root, '.artifacts/bend2/toolchain-patches/candidate-v2-proof-2028');
  fs.mkdirSync(output, { recursive: true });
  const worker = new Worker(new URL(import.meta.url), {
    workerData: { candidate, entry },
    resourceLimits: { stackSizeMb: runtime.worker.stackSizeMb, maxOldGenerationSizeMb: 8192 },
    execArgv: runtime.worker.execArgv,
  });
  let result = null, lastPhase = null;
  const timer = setTimeout(() => { result = { ok: false, error: '900-second proof bound expired' };
    void worker.terminate(); }, 900000);
  worker.on('message', message => {
    if (message.phase) {
      lastPhase = message;
      console.log(JSON.stringify(message));
    } else result = message;
  });
  worker.on('error', error => { result = { ok: false, error: error.stack || String(error) }; });
  worker.on('exit', code => {
    clearTimeout(timer);
    result ??= { ok: false, error: `Proof worker exited ${code} without verdict` };
    if (code !== 0) result = { ...result, ok: false, workerExit: code };
    const inputsUnchanged = Object.entries(inputs).every(([name, digest]) =>
      sha(fs.readFileSync(name === 'candidate/base.bend'
        ? path.join(candidate, 'bend2/base.bend') : path.join(root, name))) === digest);
    const compilerUnchanged = Object.entries(compiler).every(([name, record]) =>
      sha(fs.readFileSync(path.join(candidate, 'bend2', name))) === record.sha256);
    const runnerUnchanged = sha(fs.readFileSync(fileURLToPath(import.meta.url))) === runnerSha256;
    if (!inputsUnchanged || !compilerUnchanged || !runnerUnchanged)
      result = { ...result, ok: false, error: 'Proof inputs, compiler or runner changed during the attempt' };
    const receipt = { schema: 'rift-bend-v2-candidate-2028-check/1', aliasEqualityTrial: aliasTrial,
      at: new Date().toISOString(), sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'],
        { cwd: root, encoding: 'utf8' }).trim(), candidateTag: expectedTag,
      compiler, inputs, runtime: runtime.runtime.sha256, runnerSha256,
      inputsUnchanged, compilerUnchanged, runnerUnchanged,
      elapsedMs: Date.now() - started, lastPhase, result,
      scope: 'Frozen v2 aggregate source terms and unsafe/foreign dependency walk on disposable 2.0.28 stack; no semantic amendment, conformance, native or browser claim' };
    const file = path.join(output, `receipt-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify({ file, elapsedMs: receipt.elapsedMs, result }));
    if (!result.ok) process.exitCode = 1;
  });
} else {
  let Bend;
  let deniedFetches = 0;
  globalThis.fetch = async () => { deniedFetches++; throw Error('Candidate proof network fetch denied'); };
  try {
    Bend = await import(pathToFileURL(path.join(workerData.candidate, 'bend2/bend.ts')).href);
    const Comp = await import(pathToFileURL(path.join(workerData.candidate, 'bend2/comp.ts')).href);
    const book = Bend.book_nil(), seen = new Map(), started = Date.now();
    await Bend.book_load(book, workerData.entry.replaceAll('\\', '/'), '', seen);
    parentPort.postMessage({ phase: 'loaded', elapsedMs: Date.now() - started,
      terms: book.order.length });
    Bend.book_valid(book);
    parentPort.postMessage({ phase: 'validated', elapsedMs: Date.now() - started });
    // 2.0.28 moved book_owned behind carb_book. An empty selected JS emit
    // calls that global ownership/collision guard without compiling a proof
    // implementation or making any IO effect reachable.
    Comp.js_lib(book, [], [], { internal: true });
    parentPort.postMessage({ phase: 'owned', elapsedMs: Date.now() - started });
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
    for (const queue = bad.size === 0 ? [] : own.slice(); queue.length;) {
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
    parentPort.postMessage({ ok: true, terms: book.order.length, holes, tainted: 0, deniedFetches });
  } catch (error) {
    parentPort.postMessage({ ok: false, deniedFetches,
      error: error?.$ === 'Err' && Bend ? Bend.err_show(error) : error?.stack || String(error) });
  }
}
