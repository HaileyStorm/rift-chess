// Derived Bend 2.0.32 *source-checker* screen of the six unchanged frozen v2
// semantic mutations. This is not a BendTT kernel verdict or pin amendment.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { requiredMutations, verifyV2 } from '../../../tools/freeze-v2.mjs';
import { proofVerdict } from '../proof-authority.mjs';
import { bindCompilerBaseEol, bindCompilerEol } from
  '../../../toolchain-patches/2032/preview/compiler-eol.mjs';
import { finalizeOwnedManifest, settleWorker } from
  '../../../toolchain-patches/2032/preview/lifecycle.mjs';
import { assertExactLoadedClosure, effectiveFreeBytes, expectedCheckClosure,
  runLeasedWorker } from './aggregate-safety.mjs';
import { typeMismatchEvidence } from './mutation-verdict.mjs';

process.env.BEND_NO_TELEMETRY = '1';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const self = fileURLToPath(import.meta.url);
const derived = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2032');
const scout = path.join(root, '.artifacts/toolchains/bend-2.0.32-scout');
const canonical = path.join(root, '.artifacts/toolchains/bend');
const base = path.join(derived, 'bend2/base.bend');
const release = '573002f01ec6c52416d44489543f69a9625facf8';
const pin = 'd37909174ebd664338ae3194799a9e0899dedd51';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = file => sha(fs.readFileSync(file));
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).replace(/\r\n/g, '\n').trimEnd();
const cases = [
  { name: 'reject_all', proof: 'PROOF.bend', target: 'RuleKernel.bend',
    from: 'case True{}: Accepted{id, proposed(p, id)}', to: 'case True{}: Rejected{p}' },
  { name: 'wrong_successor', proof: 'PROOF.bend', target: 'RuleKernel.bend',
    from: 'case True{}: Accepted{id, proposed(p, id)}',
    to: 'case True{}: Accepted{id, M.start(True{})}' },
  { name: 'hide_all_moves', proof: 'CanonicalProof.bend', target: 'RuleKernel.bend',
    from: 'legal_tree(5n, p, 0, 21760)', to: '[]' },
  { name: 'omit_repetition_key', proof: 'MatchControlProof.bend', target: 'MatchKernel.bend',
    from: 'append_position(states, next), append_key(keys, key)',
    to: 'append_position(states, next), keys' },
  { name: 'wrong_resignation', proof: 'MatchControlProof.bend', target: 'MatchKernel.bend',
    from: 'policy, Types.NoOffer{}, Types.WhiteResigned{}',
    to: 'policy, Types.NoOffer{}, Types.BlackResigned{}' },
  { name: 'ignore_draw_agreement', proof: 'AdjudicationProof.bend', target: 'MatchKernel.bend',
    from: 'Some{Types.Agreed{}}', to: 'None{}' },
];
assert.deepEqual(cases.map(c => c.name), requiredMutations,
  '2.0.32 case names/order differ from frozen six-mutation gate');
const patchHashes = [
  ['bend2/toolchain-patches/001-arity/rebase-2032/0001-arity-diagnostics.patch',
    '98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db'],
  ['bend2/toolchain-patches/002-layout/rebase-2032/0002-after-001-2.0.32.patch',
    '2ed566176148cc1e064d2dae4c806c7912d557e38570ecfa5f47ddd0d78d395d'],
  ['bend2/toolchain-patches/005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch',
    '99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4'],
  ['bend2/toolchain-patches/004-web-workers/rebase-2032/phase2/0004-parser-plan-after-005-2.0.32.patch',
    'bfdd64270c7714376c64a0306a58892d8a872d96f9d4bace0be091bf894fdb13'],
];
const stages = ['binding', 'load', 'closure', 'typecheck', 'namespace-guard',
  'promise-screen', 'post-binding', 'result'];

function binding() {
  const frozen = verifyV2();
  assert.equal(git(root, 'status', '--porcelain', '--untracked-files=all'), '',
    'mutation runner requires a clean source checkout');
  assert.equal(git(derived, 'rev-parse', 'HEAD'), release);
  assert.equal(git(derived, 'status', '--porcelain', '--untracked-files=all'),
    ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts');
  assert.equal(git(scout, 'rev-parse', 'HEAD'), release);
  assert.equal(git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
  assert.equal(git(canonical, 'rev-parse', 'HEAD'), pin);
  assert.equal(git(canonical, 'status', '--porcelain', '--untracked-files=all'), '');
  assert.deepEqual(process.execArgv, [], 'mutation Worker requires no inherited Node flags');
  assert.equal(process.env.NODE_OPTIONS ?? '', '', 'mutation Worker requires no NODE_OPTIONS');
  assert.match(process.version, /^v24\./, 'mutation Worker requires reviewed Node 24');
  const compilerEol = bindCompilerEol(relative => fs.readFileSync(path.join(derived, relative)));
  const compilerBase = bindCompilerBaseEol(fs.readFileSync(base), compilerEol.eol);
  const pinnedFiles = [
    ['bend2/core/v3/proof-authority.mjs', '3737c455d542f2dc7ff1799bfc579969c42739814411a8494189eb1b56a74013'],
    ['bend2/toolchain-patches/2032/preview/compiler-eol.mjs', 'cb1cbb64e07e32c30cb9199424ec84e87cfcc516427c035a51fa6f7a84eacc27'],
    ['bend2/toolchain-patches/2032/preview/lifecycle.mjs', '91d8b5c325a48602d0d6860624ab0abf9d5428d374a12d85988cb866a732fbc8'],
  ];
  for (const [relative, expected] of [...pinnedFiles, ...patchHashes])
    assert.equal(fileHash(path.join(root, relative)), expected, `migration input drift: ${relative}`);
  const sourceCommit = git(root, 'rev-parse', 'HEAD');
  const sourceTree = git(root, 'show', '-s', '--format=%T', 'HEAD');
  return { frozenSha256: frozen.sha256, frozenFiles: frozen.manifest.files,
    sourceCommit, sourceTree, compilerEol, compilerBase,
    patchHashes: patchHashes.map(([file, hash]) => ({ file, hash })),
    scriptSha256: fileHash(self), safetySha256: fileHash(path.join(root,
      'bend2/core/v3/2032/aggregate-safety.mjs')),
    verdictSha256: fileHash(path.join(root, 'bend2/core/v3/2032/mutation-verdict.mjs')),
    runtime: { version: process.version, executableSha256: fileHash(process.execPath),
      platform: process.platform, arch: process.arch } };
}

function sourceCone(spec, before) {
  const proof = path.join(root, 'bend2/core/v2', spec.proof);
  const source = path.join(root, 'bend2/core/v2', spec.target);
  const expected = expectedCheckClosure(root, proof, before.frozenFiles, base);
  assert.ok(expected.includes(source), `mutation target not in ${spec.proof} cone`);
  const original = fs.readFileSync(source, 'utf8');
  assert.equal(original.split(spec.from).length, 2, `mutation anchor is not unique: ${spec.name}`);
  const mutated = Buffer.from(original.replace(spec.from, spec.to));
  return { expected: expected.filter(file => file !== fs.realpathSync(base))
    .map(file => path.relative(root, file).replaceAll('\\', '/')).sort(),
  target: path.relative(root, source).replaceAll('\\', '/'),
  mutatedSha256: sha(mutated), mutated };
}

function copyCone(directory, cone) {
  for (const relative of cone.expected) {
    const destination = path.join(directory, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(root, relative), destination, fs.constants.COPYFILE_EXCL);
  }
}

function loadedClosure(seen, caseDir, cone, before, variant) {
  const names = [], hashes = {};
  for (const file of seen.keys()) {
    const real = fs.realpathSync(file);
    assert.equal(real, file, `noncanonical loaded source: ${file}`);
    if (real === fs.realpathSync(base)) {
      names.push('<derived>/bend2/base.bend');
      assert.equal(fileHash(real), before.compilerBase.sha256);
      continue;
    }
    const relative = path.relative(caseDir, real).replaceAll('\\', '/');
    assert.ok(relative && !relative.startsWith('../') && !path.isAbsolute(relative),
      `loaded source escaped case: ${relative}`);
    const expectedHash = variant === 'negative' && relative === cone.target
      ? cone.mutatedSha256 : before.frozenFiles[relative];
    assert.equal(fileHash(real), expectedHash, `loaded mutation source drift: ${relative}`);
    names.push(relative); hashes[relative] = expectedHash;
  }
  assertExactLoadedClosure([...cone.expected, '<derived>/bend2/base.bend'], names);
  return { files: names.length, digest: sha(JSON.stringify(Object.entries(hashes).sort())) };
}

if (!isMainThread) {
  const { caseName, variant, caseDir, cone, expectedBinding, progress } = workerData;
  const mark = name => Atomics.store(new Int32Array(progress), 0, stages.indexOf(name));
  let Bend;
  try {
    assert.ok(cases.some(c => c.name === caseName));
    assert.ok(variant === 'positive' || variant === 'negative');
    mark('binding');
    const before = binding();
    assert.deepEqual(before, expectedBinding, 'parent/Worker source binding differs');
    let fetches = 0;
    globalThis.fetch = async () => { fetches++; throw Error('network denied in mutation Worker'); };
    Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')).href);
    const book = Bend.book_nil(), seen = new Map();
    mark('load');
    await Bend.book_load(book, path.join(caseDir, 'bend2/core/v2',
      cases.find(c => c.name === caseName).proof).replaceAll('\\', '/'), '', seen);
    mark('closure');
    const closure = loadedClosure(seen, caseDir, cone, before, variant);
    assert.equal(fetches, 0);
    mark('typecheck');
    if (variant === 'negative') {
      let mismatch;
      try { Bend.book_valid(book); }
      catch (error) {
        mismatch = typeMismatchEvidence(error, item => Bend.err_show(item));
      }
      assert.ok(mismatch, 'semantic mutation passed source typechecking');
      assert.equal(fetches, 0);
      mark('post-binding');
      assert.deepEqual(binding(), before);
      mark('result');
      parentPort.postMessage({ ok: true, variant, caseName, ...mismatch,
        closure, definitions: book.order.length, fetches,
        scope: 'derived 2.0.32 source-type mutation rejection only; no BendTT' });
    } else {
      Bend.book_valid(book);
      assert.equal(book.hols, 0);
      assert.equal(Object.hasOwn(book, 'open'), false);
      mark('namespace-guard');
      const Comp = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')).href);
      const originalOrder = book.order, view = { ...book, order: [] };
      assert.strictEqual(view.tlds, book.tlds);
      assert.strictEqual(view.ctrs, book.ctrs);
      assert.ok(Comp.js_lib(view, true).length > 0);
      assert.strictEqual(book.order, originalOrder);
      assert.equal(view.order.length, 0);
      mark('promise-screen');
      const verdict = proofVerdict(Bend, { ...book, open: 0 });
      assert.equal(fetches, 0);
      mark('post-binding');
      assert.deepEqual(binding(), before);
      mark('result');
      parentPort.postMessage({ ok: true, variant, caseName, closure,
        definitions: book.order.length, owned: verdict.own.length, holes: book.hols,
        fetches, scope: 'derived 2.0.32 source/type/namespace/promise positive only; no BendTT' });
    }
  } catch (error) {
    parentPort.postMessage({ ok: false, variant, caseName,
      stage: stages[Atomics.load(new Int32Array(progress), 0)],
      error: String(error?.$ === 'Err' && Bend ? Bend.err_show(error)
        : error?.message ?? error).slice(0, 1600) });
  }
} else {
  const preflight = process.argv.length === 3 && process.argv[2] === '--preflight-only';
  const only = process.argv.length === 4 && process.argv[2] === '--only'
    ? cases.find(c => c.name === process.argv[3]) : undefined;
  assert.ok(process.argv.length === 2 || preflight || only,
    'usage: mutations.mjs [--preflight-only | --only <frozen-case>]');
  const before = binding();
  const cones = Object.fromEntries(cases.map(spec => [spec.name, sourceCone(spec, before)]));
  if (preflight) {
    console.log(JSON.stringify({ schema: 'rift-v2-mutations-2032-preflight/1', ok: true,
      sourceCommit: before.sourceCommit, sourceTree: before.sourceTree,
      frozenSha256: before.frozenSha256, compilerEol: before.compilerEol,
      compilerBase: before.compilerBase, patchHashes: before.patchHashes,
      scriptSha256: before.scriptSha256, safetySha256: before.safetySha256,
      verdictSha256: before.verdictSha256,
      runtime: before.runtime, cases: cases.map(c => ({ name: c.name,
        proof: c.proof, target: cones[c.name].target,
        loadedFiles: cones[c.name].expected.length + 1,
        mutatedSha256: cones[c.name].mutatedSha256 })),
      scope: 'read-only six-anchor/source/compiler binding; no mutation Worker or BendTT' }));
    process.exit(0);
  }
  const outputParent = path.join(root, '.artifacts/bend2');
  assert.equal(fs.realpathSync(outputParent), outputParent);
  const outputRoot = path.join(outputParent, '2032-mutations');
  execFileSync('git', ['check-ignore', '--quiet', path.relative(root, outputRoot)], { cwd: root });
  if (!fs.existsSync(outputRoot)) fs.mkdirSync(outputRoot);
  const rootStat = fs.lstatSync(outputRoot);
  assert.ok(rootStat.isDirectory() && !rootStat.isSymbolicLink());
  assert.equal(fs.realpathSync(outputRoot), outputRoot,
    'mutation output root is redirected');
  const lockPath = path.join(outputRoot, 'mutations.lock');
  const runDir = path.join(outputRoot, `run-${Date.now()}-${process.pid}-${randomUUID()}`);
  const selected = only ? [only] : cases;
  const results = [];
  let committed = false;
  try {
    await runLeasedWorker(lockPath, JSON.stringify({ schema: 'rift-v2-mutations-2032-lease/1',
      sourceCommit: before.sourceCommit, parentPid: process.pid,
      startedAt: new Date().toISOString(), workerMayBeLive: true }) + '\n', async () => {
      fs.mkdirSync(runDir);
      for (const spec of selected) {
        const cone = cones[spec.name];
        const caseDir = path.join(runDir, spec.name);
        fs.mkdirSync(caseDir);
        copyCone(caseDir, cone);
        const check = async variant => {
          const heapMiB = spec.proof === 'CanonicalProof.bend' ? 1024 : 512;
          const timeoutMs = spec.proof === 'CanonicalProof.bend' ? 360_000
            : spec.proof === 'PROOF.bend' ? 240_000 : 120_000;
          const freeBefore = effectiveFreeBytes({ hostFree: os.freemem() });
          assert.ok(freeBefore >= 4 * 1024 ** 3,
            `stop before mutation Worker: effective free RAM ${freeBefore} B below 4 GiB`);
          const progress = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
          const started = Date.now();
          let result, stage = 'admission', exitObserved = false;
          try {
            stage = 'worker-start';
            const worker = new Worker(new URL(import.meta.url), { type: 'module',
              workerData: { caseName: spec.name, variant, caseDir,
                cone: { expected: cone.expected, target: cone.target,
                  mutatedSha256: cone.mutatedSha256 }, expectedBinding: before,
                progress: progress.buffer },
              resourceLimits: { stackSizeMb: 64, maxOldGenerationSizeMb: heapMiB } });
            stage = 'worker-exit';
            result = await settleWorker(worker, { timeoutMs });
            exitObserved = true;
            assert.equal(result.ok, true);
            assert.equal(result.caseName, spec.name);
            assert.equal(result.variant, variant);
            const record = { ...result, heapMiB, timeoutMs, freeBefore };
            stage = 'success-record';
            fs.writeFileSync(path.join(caseDir, `${variant}.json`),
              JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
            return record;
          }
          catch (error) {
            const workerStage = stages[Atomics.load(progress, 0)];
            const failure = { schema: 'rift-v2-mutation-attempt-failure/1',
              accepted: false, finalReceipt: false, sourceCommit: before.sourceCommit,
              scriptSha256: before.scriptSha256, case: spec.name, variant,
              parentStage: stage, workerStage, elapsedMs: Date.now() - started,
              heapMiB, timeoutMs, freeBefore,
              timedOut: error?.timedOut === true,
              workerMayBeLive: error?.workerMayBeLive === true,
              exitObserved: exitObserved ? true
                : error?.name === 'WorkerLifecycleError'
                  ? error.workerMayBeLive !== true : null,
              reason: String(error?.message ?? error).slice(0, 1600) };
            let failureWriteError;
            try { fs.writeFileSync(path.join(caseDir, `${variant}.failure.json`),
              JSON.stringify(failure, null, 2) + '\n', { flag: 'wx' }); }
            catch (writeError) { failureWriteError = String(writeError); }
            const wrapped = new Error(`${spec.name}/${variant} stopped at `
              + `${workerStage}: ${error?.message ?? String(error)}`
              + (failureWriteError ? `; failure record write failed: ${failureWriteError.slice(0, 300)}` : ''),
            { cause: error });
            if (failureWriteError) wrapped.failureWriteError = failureWriteError;
            throw wrapped;
          }
        };
        const positive = await check('positive');
        const target = path.join(caseDir, cone.target);
        const targetStat = fs.lstatSync(target);
        assert.ok(targetStat.isFile() && !targetStat.isSymbolicLink(),
          'refuse to mutate a non-regular copied source');
        assert.equal(fs.realpathSync(target), target, 'copied mutation target is redirected');
        assert.equal(fileHash(target), before.frozenFiles[cone.target]);
        const source = fs.readFileSync(target, 'utf8');
        assert.equal(source.split(spec.from).length, 2);
        fs.writeFileSync(target, source.replace(spec.from, spec.to));
        assert.equal(fileHash(target), cone.mutatedSha256);
        const negative = await check('negative');
        results.push({ name: spec.name, proof: spec.proof, target: cone.target,
          mutatedSha256: cone.mutatedSha256, positive, negative });
        console.log(JSON.stringify({ case: spec.name, positive: true, rejected: true,
          rejection: negative.rejection.slice(0, 160),
          positiveLoaded: positive.closure.files, negativeLoaded: negative.closure.files }));
      }
      assert.deepEqual(binding(), before);
      const receipt = { schema: 'rift-v2-mutations-2032-source/1',
        passed: selected.length === cases.length, selectedPassed: selected.length === 1,
        sourceCommit: before.sourceCommit, sourceTree: before.sourceTree,
        frozenSha256: before.frozenSha256, scriptSha256: before.scriptSha256,
        safetySha256: before.safetySha256, verdictSha256: before.verdictSha256,
        compilerEol: before.compilerEol,
        compilerBase: before.compilerBase, patchHashes: before.patchHashes,
        runtime: before.runtime, results,
        scope: 'derived 2.0.32 six frozen semantic mutations at source-type stage only; no aggregate CHECK, BendTT kernel, conformance, native/browser/GPU or pin amendment' };
      const bytes = Buffer.from(JSON.stringify(receipt, null, 2) + '\n');
      finalizeOwnedManifest(path.join(runDir, 'receipt.pending'),
        path.join(runDir, 'receipt.json'), bytes,
        { beforeCommit: () => assert.deepEqual(binding(), before) });
      committed = true;
      console.log(JSON.stringify({ output: path.relative(root, runDir).replaceAll('\\', '/'),
        receiptSha256: sha(bytes), passed: receipt.passed,
        selectedPassed: receipt.selectedPassed, cases: results.map(r => r.name),
        scope: receipt.scope }));
    });
  } catch (error) {
    if (error?.lockPreserved) console.error(JSON.stringify({ workerMayBeLive: true,
      lockPreserved: path.relative(root, error.lockPreserved).replaceAll('\\', '/'),
      output: path.relative(root, runDir).replaceAll('\\', '/'), reason: error.message }));
    throw error;
  }
  assert.equal(committed, true);
}
