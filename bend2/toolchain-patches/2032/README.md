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
| 004 | [Web Worker backend](../004-web-workers/rebase-2032/README.md) | Parser/static planner, coarse selected-root Node/Bun and browser runtimes, and a [strict one-call `U32` compiler-emitted browser slice](../004-web-workers/rebase-2032/phase5-percall/README.md) pass separate bounded gates. Full scheduling, eligibility, 107-test matrix and game integration are **not rebased**; old receipts cannot transfer. |
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
checkout. Its [result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5896318403)
verified exact 8096edc source and the pristine 2.0.32 scout, then stopped
after patch 001 because the Linux LF working SHA differed from the Windows
CRLF expectation despite the exact Git postimage. No later patch or Bun worker
ran. The [portable preview binding](preview/README.md#exact-lfcrlf-source-binding-after-linux-preflight-stop)
now accepts only the two exact EOL postimages. The subsequent
[Linux one-shot](preview/README.md#exact-lfcrlf-source-binding-after-linux-preflight-stop)
passed preflight and emitted the full MenuAA selected cache at source `202c0eb`;
this is not a pin, browser, GPU or publication result.
The [versioned one-module cache preview](preview/README.md#one-module-cache-integration-candidate)
subsequently generalized the historical menu-only script to accept one
explicit menu/controller/scene/chrome export set at a time. This is a source
candidate, not a produced same-revision four-cache set or a production
loader/build change at that checkpoint. Its own four Windows preflights
passed but no full module had then been emitted from that revision.
The later [Linux CPU-only result](preview/README.md#four-selected-modules-emitted-on-linux)
emitted all four from exact clean `6c795db` with checked outputs/manifests
and zero reported network calls. Consumer-set validation, browser bundling,
rendered interactions, pin review, native and GPU gates remain open.
The [versioned four-cache verifier](cache-set/README.md) and
[cache-only browser loader](browser-loader/README.md) now pass synthetic
consistency, tamper/path/runtime negatives, and a real Bun two-Worker bundle
using synthetic selected JS. The real bundle entrypoint pins all four raw
Linux manifest/output digests and their paths to the independent host report.
At that initial checkpoint it had not consumed the Linux files. The later
[real-cache Worker bundle](browser-loader/README.md) on Linux succeeded with
two byte-bound JS outputs; no browser was served or played. The 2.0.27
production builder and prepared-ground path remain unchanged.
The [separate local static-preview packer](browser-preview/README.md) passes
synthetic path, manifest, asset and revision assertions. It consumed the real
Linux bundle and produced a byte-bound 16-file static package without touching
`build.ts` or publishing. A cached Chromium 140 browser smoke navigated that
package but timed out before the first ready frame; a later diagnostic attempt
stopped at an isolated-checkout unit-test dependency before launch. The
source-only test dependency was removed. The next diagnostic launched and
captured a first-frame
Worker fault on root-dependent `Scene.Frame` constructor tags. The
[source-bound two-library reproduction](tag-identity/README.md) demonstrates
the same 2.0.32 tag mismatch and a stable-dependency preload that retains
bare public exports. The [Linux stable-tag result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5924179844)
emitted four same-source `2032-2` caches with independently rehashed output
and manifest bytes. The reviewed receipt is pinned, but real v2 cache-set
verification and the corrected Worker/static bundle have not run. No rendered
browser acceptance is established.

The [phase-four browser fixture](../004-web-workers/rebase-2032/phase4-browser/README.md)
passes one real Chrome module-Worker `require` call and one local `never`
call from exact selected roots on the derived 001→002→005→phase2 compiler.
The blocked required policy is rejected in phase-three pre-dispatch; it is
not an independent browser scheduler negative. Its source, patches and
generated modules are hash-bound, with zero outside requests and exact
temporary-output cleanup. This is not a production browser build or the
complete 004/107-case acceptance gate.
The [phase-five per-call fixture](../004-web-workers/rebase-2032/phase5-percall/README.md)
separately exercises an actual compiler-emitted required call in Chrome, with
resumption, local `never`, protocol/timeout/termination negatives and late
no-suffix C/JS byte parity. It supersedes phase four as the direction for a
per-call backend, but does not make the coarse-root runtime or old 004 tests
current-stack acceptance. Retain their receipts as stage provenance.

## Active acceptance matrix

| Evidence class | Current 2.0.32 gate | Acceptance still missing |
| --- | --- | --- |
| Frozen proof authority | [Individual shard diagnostics, source-only aggregate preflight and guarded Linux memory-admission candidate](../../core/v3/2032/README.md) | Complete `CHECK.bend` aggregate Worker, BendTT kernel and six actual mutation Workers. The canonical 2.0.27 gates remain in force. |
| Compiler/Worker | Exact 001→002→005→004 phase-two replay; phase-three coarse runtime, phase-five unary per-call and phase-six narrow binary-U32 per-call fixtures | Full 004 scheduler/eligibility and migrated 107-case matrix. Historical pre-phase-two selected-root and phase-four coarse browser receipts are not peer final gates. |
| Native | Six patched argv entries source-check; exact LF C export and linked Linux CLI ELF; program-only and `help` passed. NativeV2 Linux process lifecycle controls passed, but main-thread source load stopped on stack overflow; a 64-MiB Worker source gate passes portable synthetic tests only. | Full exact argv/write/restart receipt; successful NativeV2 source/type check, C/ELF/package, GUI, PCM and GPU/device checks. |
| Browser | Corrected same-source four-cache codegen and pinned host readback; phase-five isolated browser Worker. The old `2032-1` bundle/static package is historical. | Real `2032-2` cache verifier and Worker bundle after a missing host-local Bun prerequisite; then static package, first frame, hotseat/orbit/mobile, offline, production build and hosted/device evidence. |
| Adoption | Current 2.0.27 pin and Laws unchanged | Reviewed pin amendment only after the full proof, mutation, runtime and visual gates. |

Run source-only preflights as preflights, not acceptance substitutes. The
historical [pre-phase-two selected-root fixture](../004-web-workers/rebase-2032/README.md)
intentionally fails its compiler-byte guard on the current derived checkout;
do not put it in the active final-stack run list. Individual shard runs are
diagnostics for resource and source attribution, not an additional mandatory
aggregate pass. Phase four and phase five test different implementations;
carry useful browser-origin and cleanup controls into the eventual per-call
matrix rather than counting both as interchangeable final gates.
The [phase-six two-U32 per-call slice](../004-web-workers/rebase-2032/phase6-two-u32/README.md)
passed a source-bound replay and local Chrome Worker witness with dense-index
validation, unary carry-forward and late no-suffix JS/C parity. It does not
establish first-slot value fidelity for arbitrary binary leaves, general
eligibility/scheduling, or the old 107-case matrix on 2.0.32.
The [first real `2032-2` verifier/bundle attempt](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5925213267)
stopped before source transition or Node tests because the four-cache clone
lacked its own ignored Bun runtime. The older Bun recovery belonged to a
different checkout. A [new no-overwrite host-local placement and bundle request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5925342479)
is queued after the corrected CLI lane; it is not a bundle result.

The [NativeCLI IO.args migration](../native-cli-2032/README.md) and its
[five additional consumers](../native-cli-2032/consumers/README.md) remain
separate versioned source candidates. The latter passes exact-hash patch
preflight, pure list controls, and a small helper-only 2.0.32 source check.
All six patched argv entries also pass source `book_load`/`book_valid` in a
separate isolated candidate with zero holes/network. A Linux 2.0.32 CLI ELF
has since passed program-only and `help`; complete argv/restart remains open.
The isolated NativeCLI source then emitted C bytes in memory under a bounded,
source-checked child, with no artifact, link or native runtime test; the
[receipt](../native-cli-2032/consumers/C_EMISSION_RECEIPT.json) remains a
compiler-emission result only.
A [separate C artifact](../native-cli-2032/consumers/C_ARTIFACT_RECEIPT.json)
matches those emitted bytes and has a bound manifest. A Windows clang syntax
probe failed on missing POSIX `sys/mman.h`; it is not a Linux build verdict.
The [Linux-local CPU CLI smoke candidate](../native-cli-2032/linux-smoke/README.md)
passed exact LF C emission and Clang18 linking on Linux. Program-only and
`help` passed; the `-- --help` process exited 0 but the harness stopped on a
one-LF versus two-LF stderr oracle before write/restart. The new exact oracle
and `-- help` comparison pass pure tests; a fresh Linux native run remains
pending. The [terminal source-pin stop](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5925191062)
preceded all CLI tests in the first fresh attempt: its fetch command had an
extra SHA character absent from the original 40-character mailbox pin. A
[distinct corrected request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5925336497)
is queued after the NativeV2 source/lifecycle one-shot; no CLI restart pass is
claimed. The separate
[NativeV2 event adapter](../native-v2-2032/events/README.md) adds only the
2.0.32 `Look`/`Scroll` match arms in a versioned X11 candidate. Its Windows
exact-source and pure wheel-direction preflight passed; this is not an actual
NativeV2 source check, GUI/PCM run or macOS input policy.
The [separate NativeV2 2.0.32 Linux CPU harness](../native-v2-2032/linux-cpu/README.md)
binds the event-patched source, derived compiler, cgroup memory admission,
Clang/X11/ALSA preflight and package assets. Its deterministic tests and
independent source review passed on Windows. Its Linux process-lifecycle
controls passed separately; actual C emission, ELF/package, GUI, PCM and
restart remain unrun.
The [Linux source/lifecycle reply](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5925374006)
passed source/candidate/compiler byte preflights and owned normal/timeout/
output-limit process controls, but `book_load` on the old main-thread source
gate raised `Maximum call stack size exceeded` before a source receipt.
The [bounded 64-MiB Worker source gate](../native-v2-2032/events/README.md)
now passes portable lifecycle tests and independent review; it still requires
one fresh exact Linux source-check result before any C/ELF request.

Still required before any pin amendment: finish and review 004 and compiler
adapters, resolve the full frozen proof closure and BendTT authority without
installing anything implicitly, run the complete mutation/conformance and
exact-candidate browser/native CPU/GUI/PCM/restart gates, review device/GPU
evidence, and follow the Local Bend Guide's separate reviewed amendment.
