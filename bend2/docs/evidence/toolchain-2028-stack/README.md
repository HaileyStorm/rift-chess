# Isolated Bend 2.0.28 ordered patch replay

The pinned application compiler remains Bend 2.0.27 at
`d37909174ebd664338ae3194799a9e0899dedd51`. The tracked
[`replay-2028-stack.mjs`](../../../toolchain-patches/replay-2028-stack.mjs)
locally clones exact upstream 2.0.28 HEAD
`bc178404f4778704fa5584a73fcdf72bcdf9f32c` (tree
`71328f11e629467db41034257b668d9cc6a932ce`) from an ignored source
checkout. It does not alter the pinned compiler. Seven hash-pinned patch
inputs are copied into a unique ignored run directory and applied in order:
001, adapted 002, 005, adapted 004 compiler, the filtered maintained 004
worker fixtures, the adapted 004 test adapter, and 006. Each application
has `git apply --check`, exact target-set checks, canonical source hashes,
and a whitespace check. Git's global config and hooks are disabled,
`core.autocrlf=true` binds the Windows CRLF fixture oracle, Git transport
is file-only, and the clone's remote is removed before replay.

The successful 2026-09-27 run receipt is ignored local evidence at
`.artifacts/bend2/toolchain-patches/replay-2028-stack/2026-09-27T22-06-39-801Z-28608-fa355796-dd12-424a-8ed9-eabeb7ba84ed/receipt.json`;
SHA-256 `a71ce32941c74abef1762bebb30d8526f115fc905bbb084722b3d6a4b2d7af01`.
It records eight source stages, seven unchanged frozen patch inputs, the
final compiler/test/fixture file hashes before and after the gate, and
107/107 worker checks with zero failures or skips. The gate clears inherited
`BUN_BIN`, `CHROME_BIN`, and `NODE_OPTIONS`, sets the local Bun 1.4.2 and
installed Chrome executable paths, and records their exact SHA-256 plus
the Node runtime SHA-256, rechecking all three after the gate. An earlier receipt failed on a Windows Chrome
`--version` subprocess timeout before the worker gate; the successful run
uses the Chrome executable hash instead. An independent read-only review
confirmed the previous patch/gate provenance findings were closed, then
identified the executable-override gap that this final run addressed.

This is a local compiler composition and worker test result. The declared
zero-direct-provider command path is not network instrumentation. It does
not establish the full frozen proof, graphics, browser, native CPU/GPU,
owner, or pin-amendment gates. The later 2.0.32 release has material JS and
proof changes and requires a new, separate replay and review.

## Final-stack proof attempt and 647-case differential

The candidate proof runner now accepts an exact final replay receipt SHA and
verifies the reviewed unique clone, patch/gate logs and inputs, pinned
semantic-v2 manifest, exact 56-file import set and unchanged source bytes.
The strengthened preflight-only mode passes, but does not invoke a proof.
Its first final-clone attempt, before those later preflight hardenings
(ignored receipt
`.artifacts/bend2/toolchain-patches/candidate-v2-proof-2028/receipt-1790549693571.json`,
SHA-256 `29825fce3a47856d1c4281fd0be17547c9297932baf3c6abab1c9001a7e69759`)
loaded all 1,584 terms, then exceeded the 900-second validation bound before
a checker verdict. The replay receipt, compiler, frozen inputs and runner
remained unchanged. This is a failed timing sample, not a Law counterexample
or a passing proof. An earlier source-equivalent, shorter-path candidate
copy passed its aggregate check in 410.5 seconds, but its receipt cannot
silently replace this failed final-clone run.

The final replay's full 95-file `bend2` source tree was subsequently copied
into a canonical, nonce-private short-path snapshot. The runner now rejects
symlinks/special entries and pins its sorted path-and-byte-hash manifest to
`2ac802f1c362e80ba1198cb9a98dc867e28a4750f2e284edfa5af99c15e92c46`;
it compares the snapshot against the exact reviewed replay clone before and
after checking, in addition to the immutable frozen 56-source closure. A
pre-hardening attempt passed in 391,405 ms (ignored receipt
`receipt-1790556264434.json`, SHA-256
`89e5cc27493e91912263f24e78ca19f48010f5d8ba047a3932fc1e9206cc6223`),
but that runner had not yet pinned the entire tree and could omit a specially
named file. The hardened repeat passed with 1,584 terms, zero holes, zero
tainted terms and zero denied fetches in 495,064 ms. Its ignored receipt is
`.artifacts/bend2/toolchain-patches/candidate-v2-proof-2028/receipt-1790556899370.json`,
SHA-256 `9e7cf3c066b3f2513f0941f4ad597f83ee07763ca36e74a084958d33a2d9e359`;
source, compiler, runner and replay/snapshot bindings remained unchanged.
This is a candidate aggregate proof on the isolated final 2.0.28+006 stack,
not the canonical pinned proof, native/browser acceptance or a pin amendment.

The original final-clone 647-case matrix command also hit its 120-second
baseline-child bound; it saved an empty diagnostic log but no report. Root
then ran the same unchanged matrix source
(`regression_matrix.mjs` SHA-256
`f8013d71eb1987bee945d990bb1720abd54811f92ada19592e04c303d9d770ee`)
as two separately supervised lanes against the exact 005 baseline and final
replay clone. Both completed with 647 unique files in parse/check/compile/
proof/show/comptime; their saved JSON files are byte-identical, SHA-256
`0b1476052255c11fe11633c80ab08491d3c01c0f97d393c3d1ccd547b7112fa5`.
They and their per-file progress logs are ignored under
`.artifacts/bend2/toolchain-patches/matrix-final-2028-20260927T170413718/`.
The baseline's three compiler canonical hashes matched the recorded 005
stage, and all 28 final compiler/test files still matched the final replay
receipt after the run. This is a zero-difference observation in a finite
parser/checker/normalized JS+C emission matrix. The saved lane JSON and
path-only progress logs do not independently bind runtime, fixture bytes,
compiler bytes or invocation at execution time; a source-bound supervised
repeat was needed before promotion. The matrix executes no fixture program
and does not cure the aggregate proof timeout or prove native/GPU parity.

The subsequent [source-bound wrapper](../../../toolchain-patches/verify-final-matrix-2028.mjs)
ran those two unchanged clone-local matrix lanes separately, with fresh
Node processes, sanitized local-only configuration, 300-second bounds,
progress and immutable unique logs/receipt. The successful ignored receipt
is `.artifacts/bend2/toolchain-patches/final-matrix-2028/2026-09-27T23-42-27-116Z-38732-0d6d5dfc-5238-4197-83cf-00ae46db63db/receipt.json`,
SHA-256 `ed6a609d14a09f1b9f34a9c1c7b5d9f3f9f34ecea967c2e9f80846e58fc73c08`.
It pins the final replay receipt, upstream commit/tree, 28 final compiler/
test files, canonical 005 baseline compiler, exact 647 fixture paths and
byte hashes, matrix script and Node executable. Baseline and final lanes
exited 0 in 116,613 and 109,915 ms respectively, each reached 647/647
progress rows, and all 647 serialized rows were byte-identical. Inputs and
fixture bytes matched their pre-run hashes after both lanes. No provider
network monitor was used: the wrapper sets a loopback-only hub and invokes
no provider command. This is a finite compiler differential, not a proof
verdict, execution of fixture programs, native device or release acceptance.

## Proof-authority migration guard, 2026-09-28

The exact final 2.0.28+006 snapshot still has no exported `Comp.SYNTH` or
`Comp.book_owned`; frozen `core/v2/node-check.mjs` calls both, so the 2.0.27
proof receipt cannot be relabeled a canonical 2.0.28 proof. The prior
source-bound candidate check above did pass 1,584 frozen aggregate terms with
zero holes, zero unsafe/foreign taint and zero denied fetches. It reaches the
private candidate ownership guard through an empty selected JS emit, then
performs the whole-book checks separately. That is isolated candidate evidence.

The reproducible `bend2/toolchain-patches/proof-guard-2028.test.mjs` now binds
the reviewed final snapshot's complete 95-file Bend tree and canonical
`bend.ts` and `comp.ts` hashes and
tests that same empty selected emit on three synthetic books. The empty book
passes; a non-Base `IO` declaration fails with the reserved-name verdict;
and a foreign def colliding with a constructor fails with the distinct
foreign-constructor verdict. `node` exit 0, three checks passed. No frozen
file, canonical compiler, Law, browser build or native source changed.

Independent read-only invariant review found that `node-check.mjs` and
`proof-runtime.json` are protected in the v2 semantic manifest, not
substitutable by the tool-only amendment contract. A migration must preserve
their old bytes and evidence, create a reviewed versioned proof authority,
bind the current compiler and full frozen Law closure, and retain whole-book
TODO, unsafe and foreign rejection. Distinct negative controls for each of
those failures and the six existing law mutations are required; a generic
nonzero error is insufficient. `tools/loader.ts`, `tools/native-c-emitter.mjs`
and `lib/graphics/v2/tools/actual_compiler.mjs` also call the removed exports
and must be migrated or explicitly handled before a 2.0.28 pin. The new
synthetic guard check is necessary but not sufficient for that migration;
pin amendment and native/GPU/browser acceptance remain open.

## Candidate proof rejection controls on a real Bend book

The candidate verifier's whole-book TODO/unsafe/foreign verdict is now a
shared export used by its aggregate worker and by the small tracked
`proof-negative-2028.test.mjs` fixture. That test first binds the same exact
95-file compiler tree as the ownership-guard test, then loads, validates and
empty-emits `fixtures/proof-authority-negative-2028.bend` under the isolated
candidate. The fixture's SHA-256 is
`06d304ddeb723aca439615ba45d81322ce0d60142136e8c567ccf98b01f49e64`.
Its 497-term book has `caller()` depending on `leaf()`. The unmodified book
passes with zero holes/taint; temporary in-memory mutations independently
add a TODO, mark `leaf` unsafe and mark it foreign. The TODO must fail with
its hole count; unsafe and foreign must fail with distinct verdicts naming
the reachable `caller`. The original book
is restored and rechecked. `node` exited 0, all three negative controls
passed, and zero fetch attempts were made. No source fixture or frozen term
was mutated on disk.

This improves the candidate proof-authority diagnostic, not the canonical
proof or pin. The prior 1,584-term pass is bound to the **previous** runner
hash and cannot certify the revised verifier. The full source-bound
aggregate repeat is pending: the Windows host had about 6.0–6.3 GiB free
physical memory when checked, below prudent headroom for the prior
eight-minute proof worker with an 8 GiB old-generation cap. A fresh resource
check and full receipt are required before promoting this candidate verdict.

The checked verdict and its negative-control helper now live in a **draft**
`core/v3/proof-authority.mjs` instead of inside the disposable runner. The
candidate verifier binds its SHA-256
`3737c455d542f2dc7ff1799bfc579969c42739814411a8494189eb1b56a74013`
before worker import, passes the expected hash to the worker, and checks the
module again after completion. The small-book test imports the same module
after installing telemetry/fetch denial and passes again; the 56-source
candidate preflight also passed with that authority hash. This is a reusable
piece of a future versioned checker, not a frozen v3 manifest, canonical
node-checker, full aggregate proof or reviewed pin amendment.

The same source-bound verifier then ran its `--fixture-only` worker mode on
the exact replay snapshot. Ignored receipt
`.artifacts/bend2/toolchain-patches/candidate-v2-proof-2028/receipt-1790618236566.json`
has SHA-256
`5b060a7a566fc5882f9c017969178bfc7b1096082b6c3e0e7abaa3e5dd1176b4`.
It records 497 loaded/validated terms, an empty selected emit, zero holes,
zero taint, all three negative controls, zero denied fetches, and unchanged
fixture/input, runner, authority, compiler and replay bindings. This is an
actual worker-import/source-binding smoke, deliberately **not** a frozen
1,584-term aggregate run or a pin amendment.
