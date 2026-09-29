# Isolated Bend 2.0.32 carry-forward ledger

This directory tracks the owner's direct-2.0.32 migration preference. The
published application, clean canonical 2.0.27 pin, every frozen Law, and the
older versioned 2.0.27/2.0.28 patch receipts remain unchanged. The pristine
2.0.32 scout is commit `573002f01ec6c52416d44489543f69a9625facf8`.

| Order | Downstream item | 2.0.32 status |
| --- | --- | --- |
| 001 | [Arity diagnostics](../001-arity/rebase-2032/README.md) | Rebased; bounded FID rejection, CID constructor boundary and successful-byte comparison passed. Extreme CID overflow is unproved. |
| 002 | [Layout reporting](../002-layout/rebase-2032/README.md) | Rebased; exact layout, local-only direct denials and successful C/JS parity passed. Recursive import fence is combined with 005 below. |
| 005 | [Windows imports/identity](../005-windows-import-path/rebase-2032/README.md) | Rebased; native nested paths, recursive denial, identity/cycle, junction, package assembly including foreign parent JS, and synthetic cross-volume gates passed on Windows. |
| 004 | [Web Worker backend](../004-web-workers/rebase-2032/README.md) | Reviewed selected-root adapter and [parser/static planner](../004-web-workers/rebase-2032/phase2/README.md) pass bounded gates. A [coarse selected-root runtime](../004-web-workers/rebase-2032/phase3/README.md) dispatches through Bun's Node Worker compatibility, with policy and cleanup negatives. The original per-call scheduler/browser backend is **not rebased**; old 107-test receipt cannot transfer. |
| 006 | Alias equality | 2.0.32 already has the alias-shadow distinction; do not replay 2.0.28's corrective patch. Retain its historical receipt. |
| 003 | Join-capture boxing | Experimental and not in the reviewed main stack; no silent inclusion. |

Run `node bend2/toolchain-patches/2032/replay-001-002-005.mjs` to reconstruct
the exact first three patches from pristine source in owned OS temporary
storage. Pass `--compare-derived` only when the derived checkout is still at
001→002→005; it now also carries phase-two 004 source. The phase-two
[focused gate](../004-web-workers/rebase-2032/phase2/README.md) applies its
separate parser/planner patch after that preimage and compares the final
`bend.ts`, `comp.ts`, and `main.ts` bytes with the derived candidate. The
original source-only replay passed on Windows after the 005
foreign-path review fix; final patch SHA-256 values are bound in that script.
The independent 005 review found and prompted that `pkg_files` fix. Run the
versioned 001, 002 and 005 tests separately for their bounded behavior gates.
No full compiler/worker matrix follows merely from this replay.

The [synthetic 2.0.32 checker](../../core/v3/2032/README.md) rejects distinct
TODO/unsafe/foreign and compiler-owned-name controls without BendTT. After
005, `probe-derived-worker.mjs ArithmeticProof.bend` passed source type and
promise screens on 7 loaded files/543 definitions, with three synthetic
negative controls and zero network attempts. The broader
`probe-derived-worker.mjs CHECK.bend` loaded but did not yield a type-check
verdict within a 120-second bound or the subsequent 300-second/64-MiB worker
bound. These are local source probes, not mathematical/BendTT proofs or the
six frozen-Law mutation suite. The 300-second bound terminated its owned
worker; no Law counterexample is inferred.

The 001, 002, and 005 fixture scripts, and the first 004 selected-root test,
bind intermediate compiler hashes and are historical stage receipts on the
current shared derived checkout. The phase-two test reconstructs the exact
preimage, applies its own patch, checks final source bytes, and compares
no-suffix C/JS output. The phase-three and current-stack build-adapter tests
then exercise separate runtime/export seams. A green old-stage fixture is
not required on the advanced checkout, and a failing old-stage input guard
is not a regression. A unified final-stack gate is still required before pin
adoption.

The [current-stack selected browser-library adapter](build-adapter/README.md)
passes a before/after source-bound local Bun gate on `MenuAA.font_byte_cap`,
emitting only `font_cap` and evaluating 262144. It repeats selected-root
key/order/invalid-root and compiler collision controls on the phase-two
compiler and matches no-suffix JavaScript bytes against an independent stack
replay. It has not replaced `emit-selected.ts`, the cache binding, or
`build.ts`; exact 2.0.32 browser build/render evidence remains open.

The [separate 2.0.32 menu preview emitter](preview/README.md) stopped on
Windows after source load/type-check when free RAM fell to 1.97 GiB, below
its 2.5 GiB pre-emission floor. No JS or final manifest was produced. Its
subsequent lifecycle-only failure tests pass after independent review, but
the repaired emitter has not been run on a higher-memory host; controller,
scene and chrome emission remain unattempted.
The first Linux menu handoff stopped before compiler execution because the
pristine 2.0.32 Git object was absent. A separate one-shot acquisition
verified and retained the official tag in an isolated scout, but stopped at
the next source gate: the host's partial Rift clone lacks 63 objects from
exact 8096edc, including a patch blob. Neither handoff produced JS or a
manifest. A third bounded request permits a complete isolated Rift source
checkout, then one menu-only attempt after exact host-local preflight; it is
pending and does not authorize pin movement, GPU or publication.

The [phase-four browser fixture](../004-web-workers/rebase-2032/phase4-browser/README.md)
passes one real Chrome module-Worker `require` call and one local `never`
call from exact selected roots on the derived 001→002→005→phase2 compiler.
The blocked required policy is rejected in phase-three pre-dispatch; it is
not an independent browser scheduler negative. Its source, patches and
generated modules are hash-bound, with zero outside requests and exact
temporary-output cleanup. This is not a production browser build or the
complete 004/107-case acceptance gate.

The [NativeCLI IO.args migration](../native-cli-2032/README.md) and its
[five additional consumers](../native-cli-2032/consumers/README.md) remain
separate versioned source candidates. The latter passes exact-hash patch
preflight, pure list controls, and a small helper-only 2.0.32 source check.
All six patched argv entries also pass source `book_load`/`book_valid` in a
separate isolated candidate with zero holes/network. No native CLI scenario
has been accepted under 2.0.32.
The isolated NativeCLI source then emitted C bytes in memory under a bounded,
source-checked child, with no artifact, link or native runtime test; the
[receipt](../native-cli-2032/consumers/C_EMISSION_RECEIPT.json) remains a
compiler-emission result only.
A [separate C artifact](../native-cli-2032/consumers/C_ARTIFACT_RECEIPT.json)
matches those emitted bytes and has a bound manifest. A Windows clang syntax
probe failed on missing POSIX `sys/mman.h`; Linux native build/argv acceptance
has not run.

Still required before any pin amendment: finish and review 004 and compiler
adapters, resolve the full frozen proof closure and BendTT authority without
installing anything implicitly, run the complete mutation/conformance and
exact-candidate browser/native CPU/GUI/PCM/restart gates, review device/GPU
evidence, and follow the Local Bend Guide's separate reviewed amendment.
