import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.BEND_NO_TELEMETRY = '1';
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls++; throw new Error('unexpected network access'); };

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../..');
const derived = path.join(repo, '.artifacts/bend2/toolchain-patches/derived-2032');
const scout = path.join(repo, '.artifacts/toolchains/bend-2.0.32-scout');
const pin = path.join(repo, '.artifacts/toolchains/bend');
const Bend = await import(pathToFileURL(path.join(derived, 'bend2/bend.ts')));
const Comp = await import(pathToFileURL(path.join(derived, 'bend2/comp.ts')));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pristine = '573002f01ec6c52416d44489543f69a9625facf8';
const pinCommit = 'd37909174ebd664338ae3194799a9e0899dedd51';
const noSuffixFixture = path.join(repo,
  'bend2/toolchain-patches/004-web-workers/rebase-2032/fixtures/selected-root.bend');
const policyFixture = path.join(here, 'fixtures/policies.bend');
const diamondFixture = path.join(here, 'fixtures/diamonds.bend');
const mixedFixture = path.join(here, 'fixtures/mixed-diamond.bend');
const expectedPolicyFixtureSha256 = '9204db93874b8c2a59ccae988211298e29d7c21945c06bae8452d6addafe9a6d';
const expectedDiamondFixtureSha256 = '72c9f962945e6af9bdf61ccf20a5ad774df5c54063dd9358f26a18ccf536671f';
const expectedMixedFixtureSha256 = 'e03d04963c1e26ea67dc524cd17a28883abf26baa2afdbcef14d10f775c19763';

async function git(dir, ...args) {
  const p = Bun.spawn(['git', '-C', dir, ...args], { stdout: 'pipe', stderr: 'pipe' });
  const [out, err, code] = await Promise.all([
    new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited,
  ]);
  assert.equal(code, 0, err);
  return out.replace(/\r\n/g, '\n').trimEnd();
}
assert.equal(await git(scout, 'rev-parse', 'HEAD'), pristine);
assert.equal(await git(scout, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(await git(pin, 'rev-parse', 'HEAD'), pinCommit);
assert.equal(await git(pin, 'status', '--porcelain', '--untracked-files=all'), '');
assert.equal(await git(derived, 'rev-parse', 'HEAD'), pristine);
assert.equal(await git(derived, 'status', '--porcelain', '--untracked-files=no'),
  ' M bend2/bend.ts\n M bend2/comp.ts\n M bend2/main.ts');

async function load(file) {
  const book = Bend.book_nil();
  try {
    await Bend.book_load(book, file.replaceAll('\\', '/'), '', new Map());
    Bend.book_valid(book);
  } catch (error) {
    throw new Error((error?.$ === 'Err' ? Bend.err_show(error)
      : error?.message ?? String(error)).slice(0, 1600));
  }
  assert.equal(book.hols, 0);
  return book;
}
const noSuffixBook = await load(noSuffixFixture);
const syncJs = Comp.js_lib(noSuffixBook, false);
const syncC = Comp.compile_book(noSuffixBook);
const syncJsSha256 = sha(Buffer.from(syncJs));
const syncCSha256 = sha(Buffer.from(syncC));
assert.equal(syncJsSha256, 'efe64dca089a1922152144681e772e75c59807be07dc0ff892d2b3349a11a874');
assert.equal(syncCSha256, '9cb68b124aa2865f21a3c1cdb633bf691d45d1f06a8eea496869d2585750a009');
const noSuffixJsBytes = Buffer.from(syncJs);
const noSuffixCBytes = Buffer.from(syncC);

const stack = [
  ['001-arity/rebase-2032/0001-arity-diagnostics.patch',
    '98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db'],
  ['002-layout/rebase-2032/0002-after-001-2.0.32.patch',
    '2ed566176148cc1e064d2dae4c806c7912d557e38570ecfa5f47ddd0d78d395d'],
  ['005-windows-import-path/rebase-2032/0005-after-001-002-2.0.32.patch',
    '99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4'],
];
const stackTemp = fs.realpathSync(os.tmpdir());
const stackScratch = fs.mkdtempSync(path.join(stackTemp, 'bend2-prephase2-'));
try {
  const sourceBend2 = path.join(scout, 'bend2');
  const targetBend2 = path.join(stackScratch, 'bend2');
  fs.mkdirSync(targetBend2, { recursive: true });
  for (const file of ['bend.ts', 'comp.ts', 'main.ts', 'base.bend']) {
    fs.copyFileSync(path.join(sourceBend2, file), path.join(targetBend2, file));
  }
  fs.cpSync(path.join(sourceBend2, 'effs'), path.join(targetBend2, 'effs'), { recursive: true });
  for (const [relative, expected] of stack) {
    const patchFile = path.join(repo, 'bend2/toolchain-patches', relative);
    assert.equal(sha(fs.readFileSync(patchFile)), expected, `patch bytes changed: ${relative}`);
    for (const mode of ['--check', '']) {
      const args = ['apply', ...(mode ? [mode] : []), patchFile];
      const p = Bun.spawn(['git', ...args], { cwd: stackScratch, stdout: 'pipe', stderr: 'pipe' });
      const [stdout, stderr, code] = await Promise.all([
        new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited,
      ]);
      assert.equal(code, 0, `${relative}: ${stderr || stdout}`);
    }
  }
  for (const [file, expected] of Object.entries({
    'bend2/bend.ts': '2c3953bb4fcb12aa97d4ce8cd041ef0ce8324c724fd0adc9b0352fff4c0f5c09',
    'bend2/comp.ts': '0108bf3a080d1cfbb987a5d95fb5b1e7acae91da85efb419eed7e06dd75334a7',
    'bend2/main.ts': 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
  })) assert.equal(sha(fs.readFileSync(path.join(stackScratch, file))), expected,
    `pre-phase2 source differs after 001→002→005 replay: ${file}`);
  const baselineBend = await import(pathToFileURL(path.join(targetBend2, 'bend.ts')));
  const baselineComp = await import(pathToFileURL(path.join(targetBend2, 'comp.ts')));
  const baselineBook = baselineBend.book_nil();
  await baselineBend.book_load(baselineBook, noSuffixFixture.replaceAll('\\', '/'), '', new Map());
  baselineBend.book_valid(baselineBook);
  const baselineJs = baselineComp.js_lib(baselineBook, false);
  const baselineC = baselineComp.compile_book(baselineBook);
  assert.deepEqual(Buffer.from(syncJs), Buffer.from(baselineJs),
    'no-suffix JS differs from independently replayed pre-phase2 stack');
  assert.deepEqual(Buffer.from(syncC), Buffer.from(baselineC),
    'no-suffix C differs from independently replayed pre-phase2 stack');
  const phase2Patch = path.join(here, '0004-parser-plan-after-005-2.0.32.patch');
  assert.equal(sha(fs.readFileSync(phase2Patch)),
    'bfdd64270c7714376c64a0306a58892d8a872d96f9d4bace0be091bf894fdb13');
  for (const mode of ['--check', '']) {
    const p = Bun.spawn(['git', 'apply', ...(mode ? [mode] : []), phase2Patch],
      { cwd: stackScratch, stdout: 'pipe', stderr: 'pipe' });
    const [stdout, stderr, code] = await Promise.all([
      new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited,
    ]);
    assert.equal(code, 0, `phase2 patch replay: ${stderr || stdout}`);
  }
  for (const [file, expected] of Object.entries({
    'bend2/bend.ts': '2def95c26e150c5a66a1a8ba3e5dd6ec5de3a8dd822627976f606a273b0cea88',
    'bend2/comp.ts': '4f420f4a9b9efadfb5708fa2e20703fbc44e130365805c4b1be09f3c276e39b1',
    'bend2/main.ts': 'e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae',
  })) {
    const replayed = fs.readFileSync(path.join(stackScratch, file));
    assert.equal(sha(replayed), expected, `phase2 source differs after replay: ${file}`);
    assert.deepEqual(replayed, fs.readFileSync(path.join(derived, file)),
      `phase2 replay differs from derived candidate: ${file}`);
  }
} finally {
  const exact = fs.realpathSync(stackScratch);
  assert.equal(path.dirname(exact), stackTemp);
  assert.match(path.basename(exact), /^bend2-prephase2-[^\\/]+$/);
  fs.rmSync(exact, { recursive: true, force: true });
}

const policyBook = await load(policyFixture);
assert.equal(sha(fs.readFileSync(policyFixture)), expectedPolicyFixtureSha256);
function refs(term, out = [], seen = new WeakSet()) {
  if (typeof term !== 'object' || term === null || seen.has(term)) return out;
  seen.add(term);
  if (term.$ === 'Ref') out.push(term);
  for (const [field, value] of Object.entries(term)) if (field !== 's') refs(value, out, seen);
  return out;
}
const callRef = (name, target) => refs(policyBook.tlds[name].e).find((r) => r.k === target);
assert.equal(callRef('required', 'identity')?.web, 'require');
assert.equal(callRef('capped', 'identity')?.webMax, 2);
assert.equal(callRef('never_call', 'identity')?.web, 'never');
assert.equal(callRef('native_required', 'identity')?.b, true);
assert.equal(callRef('native_required', 'identity')?.web, 'require');
for (const name of ['required', 'capped', 'never_call', 'native_required']) {
  const roundTrip = Bend.term_lower(Bend.term_higher(policyBook.tlds[name].e));
  assert.ok(refs(roundTrip).some((r) => r.k === 'identity' &&
    (r.web !== undefined || r.b === true)), `${name} metadata was lost on lowering`);
}
assert.match(Bend.term_show(policyBook.tlds.capped.e), /identity@2/);

const required = Comp.plan_web_workers(policyBook, ['required']);
assert.equal(required.sourceEligible, true);
assert.deepEqual(required.calls.map((c) => [c.to, c.policy, c.max]), [['identity', 'require', undefined]]);
assert.equal(required.requirements.length, 1);
assert.equal(required.requirements[0].max, undefined);
const capped = Comp.plan_web_workers(policyBook, ['capped']);
assert.deepEqual(capped.requirements.map((r) => r.max), [2]);
const never = Comp.plan_web_workers(policyBook, ['never_call']);
assert.deepEqual(never.calls.map((c) => c.policy), ['never']);
assert.equal(never.requirements.length, 0);
assert.equal(Comp.plan_web_workers(policyBook, ['native_required']).calls[0].native, true);
const conflict = Comp.plan_web_workers(policyBook, ['conflict']);
assert.equal(conflict.sourceEligible, false);
assert.ok(conflict.conflicts.some((c) => c.kind === 'require_under_never'));
assert.deepEqual(conflict.conflicts[0].path, ['conflict', 'hidden_require', 'identity']);
const arithmetic = Comp.plan_web_workers(policyBook, ['arithmetic']);
assert.equal(arithmetic.sourceEligible, false);
assert.ok(arithmetic.functions.find((f) => f.name === 'arithmetic')?.reasons
  .some((r) => r.startsWith('intrinsic_reachable:')));
const requireUnsupported = Comp.plan_web_workers(policyBook, ['required_arithmetic']);
assert.ok(requireUnsupported.conflicts.some((c) => c.kind === 'require_unsupported'));
const diamondBook = await load(diamondFixture);
assert.equal(sha(fs.readFileSync(diamondFixture)), expectedDiamondFixtureSha256);
const diamondStart = performance.now();
const diamondPlan = Comp.plan_web_workers(diamondBook, ['top']);
const diamondMs = performance.now() - diamondStart;
assert.equal(diamondPlan.sourceEligible, false,
  'diamond reducers intentionally use the rejected U32.add intrinsic');
assert.equal(diamondPlan.calls.length, 72);
assert.equal(diamondPlan.calls.filter((call) => call.policy === 'require').length, 2);
assert.equal(diamondPlan.requirements.length, 2,
  'the same two leaf requirements must be visited once each through the diamond DAG');
assert.ok(diamondMs < 5000, `12-diamond traversal exceeded its bound: ${diamondMs}ms`);
const mixedBook = await load(mixedFixture);
assert.equal(sha(fs.readFileSync(mixedFixture)), expectedMixedFixtureSha256);
const mixed = Comp.plan_web_workers(mixedBook, ['top']);
assert.equal(mixed.requirements.length, 1,
  'normal branch must retain one required leaf callsite');
assert.deepEqual(mixed.requirements[0].path, ['top', 'normal', 'shared', 'leaf']);
assert.deepEqual(mixed.conflicts.filter(c => c.kind === 'require_under_never')
  .map(c => c.path), [['top', 'blocked', 'shared', 'leaf']],
'never branch must retain a separate witness at the shared callee');
assert.ok(Comp.plan_web_workers(policyBook, ['float_identity']).functions
  .some((f) => f.name === 'float_identity' && f.reasons.some((r) => r.startsWith('f32_reachable:'))));
assert.ok(Comp.plan_web_workers(policyBook, ['apply_one']).functions
  .some((f) => f.name === 'apply_one' && f.reasons.some((r) => r.startsWith('higher_order_or_dynamic_call:'))));

function mutateDef(book, name, fields) {
  const tlds = Object.assign(Object.create(null), book.tlds);
  tlds[name] = { ...tlds[name], ...fields };
  return { ...book, tlds };
}
for (const [fields, expected] of [
  [{ u: true }, 'unsafe_reachable:identity'],
  [{ i: ['synthetic-host'] }, 'foreign_reachable:identity'],
  [{ v: null }, 'unfilled_reachable:identity'],
]) {
  const plan = Comp.plan_web_workers(mutateDef(policyBook, 'identity', fields), ['required']);
  assert.equal(plan.sourceEligible, false);
  assert.ok(plan.functions.find((f) => f.name === 'required')?.reasons.includes(expected), expected);
}

const tempRoot = fs.realpathSync(os.tmpdir());
const scratch = fs.mkdtempSync(path.join(tempRoot, 'bend2-workers-phase2-'));
try {
  const malformed = [
    ['identity@0(x)', /positive safe decimal worker cap/],
    ['identity@-1(x)', /contiguous argument list/],
    ['identity@1.5(x)', /contiguous argument list/],
    ['identity~@1(x)', /contiguous argument list/],
    ['identity@@(x)', /contiguous argument list/],
    ['pair@(x)', /saturated call/],
    ['identity@(x, x)', /saturated call/],
    ['helper@()', /zero-argument refs are not planner callsites/],
  ];
  for (let i = 0; i < malformed.length; i++) {
    const [expression, expected] = malformed[i];
    const file = path.join(scratch, `bad-${i}.bend`);
    fs.writeFileSync(file, [
      'import Base', '',
      'def identity(x: U32) -> U32:', '  x', '',
      'def pair(x: U32, y: U32) -> U32:', '  x', '',
      'def helper() -> U32:', '  1', '',
      'def bad(x: U32) -> U32:', `  ${expression}`, '',
    ].join('\n'), { flag: 'wx' });
    const book = Bend.book_nil();
    let message = '';
    try {
      await Bend.book_load(book, file.replaceAll('\\', '/'), '', new Map());
      assert.fail(`malformed worker suffix was accepted: ${expression}`);
    } catch (error) {
      message = error?.$ === 'Err' ? Bend.err_show(error) : error?.message ?? String(error);
    }
    assert.match(message, expected, `wrong parse rejection for ${expression}`);
  }

  const postJs = Comp.js_lib(noSuffixBook, false);
  const postC = Comp.compile_book(noSuffixBook);
  assert.deepEqual(Buffer.from(postJs), noSuffixJsBytes,
    'no-suffix JS emission changed after phase-two planning');
  assert.deepEqual(Buffer.from(postC), noSuffixCBytes,
    'no-suffix C emission changed after phase-two planning');
  assert.equal(networkCalls, 0);
  console.log(JSON.stringify({ schema: 'bend-worker-phase2-local/1', passed: true,
    upstream: pristine, syncJsSha256, syncCSha256,
    policyFixtureSha256: sha(fs.readFileSync(policyFixture)),
    diamondFixtureSha256: sha(fs.readFileSync(diamondFixture)),
    mixedFixtureSha256: sha(fs.readFileSync(mixedFixture)),
    diamondCalls: diamondPlan.calls.length, diamondRequirements: diamondPlan.requirements.length,
    mixedRequirements: mixed.requirements.length,
    mixedNeverConflicts: mixed.conflicts.filter(c => c.kind === 'require_under_never').length,
    diamondMs,
    requirements: required.requirements, capped: capped.requirements,
    never: never.calls, conflicts: conflict.conflicts,
    malformedCases: malformed.length, networkCalls,
    scope: 'parser metadata and static source planner only; no worker dispatch/runtime/browser acceptance' }));
} finally {
  const exact = fs.realpathSync(scratch);
  assert.equal(path.dirname(exact), tempRoot);
  assert.match(path.basename(exact), /^bend2-workers-phase2-[^\\/]+$/);
  fs.rmSync(exact, { recursive: true, force: true });
}
