# Bend 2.0.28 update assessment (not yet adopted)

The project still pins Bend 2.0.27 at
`d37909174ebd664338ae3194799a9e0899dedd51`. Upstream released
[v2.0.28](https://github.com/bendlang/bend/releases/tag/v2.0.28) at
`bc178404f4778704fa5584a73fcdf72bcdf9f32c` on 2026-09-25. The
[comparison](https://github.com/bendlang/bend/compare/d37909174ebd664338ae3194799a9e0899dedd51...bc178404f4778704fa5584a73fcdf72bcdf9f32c)
contains 22 commits and changes 175 files. This is a candidate review, not a
pin move, amendment, or new proof result. The release's C emitter retains the
255-word arity cap and makes no GPU fork/transfer performance claim, so it
does not supersede the exact 2.0.27 native/GPU work underway.

Two source changes matter to this application. The checker now follows laws
filled by unsafe code through imported files; a new failure must be
investigated without weakening a Law. The loader resolves local and package
names differently, and JS effects register through `io_eff(CID(Name), run,
need)`. The project's Windows path loader, provider-free package guard and
browser effect/worker outputs require actual checks on the new compiler. New
`IO.thread_count()` can report the native pool size but is not device-use or
kernel timing evidence. The `.bend` Node-worker loader registration is also
new, without proving it replaces our Windows adapter.

An isolated checkout at `.artifacts/bend2/toolchain-patches/update-2028/`
contains the exact upstream tag and maintained 001 arity-diagnostics patch.
The experimental 002 layout report was adapted there only: its local-only
guard now runs before `book_file()` and before `name_hash()`. Named/hash imports
and a direct isolated library path failed with `BEND_HUB` set to a loopback
trap; no external provider or package cache was contacted. A focused report
fixture repeated byte-identically, and valid C/JS samples emitted stable
bytes. Those are narrow diagnostics, not a reviewed toolchain variant.

Ordinary 2.0.28 checking of the maintained nested relative-import fixture
fails on Windows because the new loader combines backslash `realpath` output
with POSIX path operations. At this initial assessment, 004 was unapplied: its
`bend.ts` and `main.ts` hunks check, but its `comp.ts` hunk conflicts at the
new JS emitter, and its `name_own`/`eff_name` dependencies were removed by
upstream. Replacing those touches worker wire tags and intrinsic eligibility;
the 107 compiler/HTML and 639 differential gates are prerequisites to pin
acceptance. The isolated 001+adapted-002 source hashes are `bend.ts`
`fd618ad061743b225c471c1a788b149ff86a6c73761fc6499eda696a25e5e5f7`,
`comp.ts` `8e12351e723e295df10f83d625207591ebeb89547cb1261c2be410b7438ecd3f`,
and `main.ts` `07b83741d7333717844a779351d262b731bd2f56dc170675e91a785c78325091`.
The maintained 002 and 004 patch bytes were unchanged. No rebased variant is
accepted yet.

A separate [005 Windows-path candidate](../toolchain-patches/005-windows-import-path/README.md)
now fixes that **one** loader defect in the disposable 2.0.28 checkout by
using native filesystem resolution and slash-normalized Bend module names.
Its first ordinary nested-import check passed on Windows. Independent review
then found symlinked `BEND_LIB` local-only bypass, same-inode case-variant
module splitting, cross-volume ambiguity, and weak replay binding. The revised
[005 receipt](../toolchain-patches/005-windows-import-path/LOCAL_RECEIPT.md)
records focused tests for those boundaries, including an isolated cached named
package with zero network requests, and a full expected source-stack hash.
Root reverse/forward-replayed the final patch in a separately saved,
LF-normalized pre-005 candidate state with ordinary `git apply` and the
repeated fixture. That reconstructed state's source hashes differ from the
earlier adapted-002 snapshot, so the full ordered stack still needs a fresh
reconciliation and replay.
The cross-volume check is synthetic rather than a real cross-drive junction.
Independent final review, fresh full-stack replay, valid remote package fetch,
Linux behavior, full 004 worker migration and frozen proof/browser gates remain
untested for 005. This is still a candidate, not acceptance of 005.
The pinned 2.0.27 toolchain remains unchanged.

To adopt the release, follow [Updating the Bend toolchain](LOCAL_BEND_GUIDE.md#updating-the-bend-toolchain)
as a separate reviewed amendment. Rebase 001/002/004 one at a time with
source hashes, valid C/JS byte comparisons and negative provider guards; rerun
004's 107 compiler/HTML checks, 639 differential fixtures, static module
worker/browser/offline gates, v1/v2 and graphics proof suites, six mutation
controls, native source/C gates and root application checks. Preserve the
2.0.27 receipts. Only a successful review changes `TOOLCHAIN.json`, the
graphics compiler history, source-bound worker artifacts, docs, and the
frozen dependency amendment. Until then, the published browser build and
Linux device requests remain bound to clean 2.0.27.

The [004 after-005 candidate](../toolchain-patches/004-web-workers/rebase-2028/README.md)
now carries the adapted compiler files and unchanged worker runtime. The
disposable stage-two gate passed 59/59. The combined gate first passed 106/107;
its only failure was the old 2.0.27 JS/C oracle pin. A separate 2.0.28
ten-fixture oracle from the pre-004 005 baseline matched the candidate, and
the adapted combined gate then passed **107/107** with no skips. It included
a positive nested static module-worker run in local Chrome, narrower than the
full browser/offline matrix. Root's patch reverse/forward replay reached the
LF-normalized final-005 text but did not reconcile
the entire fresh ordered stack. A copied 647-case matrix against a separately
reconstructed 005 baseline then had zero check/JS/C differences; comparison
against pristine Windows 2.0.28 had only its 105 path-resolution failures.
A preliminary `term_force` error was a probe mistake
(`book_valid(book, n0)` on a fresh book) and was withdrawn after all
twelve roots emitted with `book_valid(book, 0)`. Static relocated packaging,
browser/offline execution, a fresh-stack cross-host differential and oracle replay,
frozen proofs and full game gates are not yet complete.

**Fresh replay on 2026-09-26:** A new disposable checkout at the exact public
tag applied maintained 001, [rebased 002](../toolchain-patches/002-layout/rebase-2028/README.md),
candidate 005, and candidate 004 in ordinary patch order. Its intermediate
source hashes now reconcile the previously unexplained pre-005 difference;
the final LF-normalized compiler/resource files match the prior candidate.
The intermediate 002 fixture passed its deterministic layout, negative local
import and unchanged JS/C gates; the 005 provider-trap/path fixture passed;
the fresh 004 stack passed 107/107 worker tests, and a nested static module
worker demo passed 19/19 functional and six negative/lifecycle checks in both
installed Chrome and Edge. A fresh 647-fixture compiler differential against
the final-005 source baseline found no check or normalized JS/C difference.
The 002-only canonical library junction gap is
closed by 005. The [receipt](../toolchain-patches/002-layout/rebase-2028/LOCAL_RECEIPT.md)
binds exact source and local browser evidence. The same generated demo later
passed the scenario in Firefox and WebKit, with WebKit's documented wrong-MIME
tolerance. A relocated compiler resource copy also emitted the worker package.
This resolves ordered **Windows source replay and local cross-engine worker
behavior**, but not Linux parity, offline application hosting, frozen proofs,
native execution, or full game acceptance.

**Disposition on 2026-09-26:** defer the pin change. Root owns the rebase and
amendment. Ordered Windows replay, focused nested-import/provider guards,
107 worker checks, and two Chromium-family browser engines are now positive.
Linux source parity, offline hosting, full frozen proof and game gates,
native emission/link,
measurements, and independent final review remain. Switching now would also
invalidate the published source-bound worker artifacts and the in-flight
2.0.27 native package pilot. Remove the old pin only through the guide's
reviewed amendment and a clean, reproducible replacement build.

**Successor local candidate gate on 2026-09-27:** upstream's 2.0.28 alias
guard falsely rejects unchanged frozen `ArithmeticLaws.bend` when a sibling
import alias and its canonical module key are identical. Unadopted
[patch 006](../toolchain-patches/006-alias-equality/README.md) adds only a
`q !== k` condition; eight candidate fixtures pass, including the positive
value `7` and preserved genuine alias/function/constructor collision
negatives. Independent source review found no blocking ambiguity in this
one-key exception. Under that disposable stack the full 1,584-term v2
aggregate passed ownership and the unsafe/foreign walk with zero holes or
tainted roots, using a finalized unchanged-input runner and no network
fetches. A candidate-only 2.0.28 tag bridge then passed all 14 canonical
positions and 223 independent reference successors while the frozen
semantic-v2 manifest and loaded source closure matched exact bytes. These
are source proof and finite differential evidence, **not** browser,
native, GPU, runtime parity or pin-amendment acceptance. The original
2.0.27 pin and in-flight older-source Linux package request stay intact.
Six candidate-only mutation controls subsequently passed with clean positive
proofs and deliberately wrong rules rejected; the immutable run receipt is
bound in the patch 006 notes. This is a negative-control check, not a new
native or browser result under 2.0.28.
Eight graphics/grid8 proof entry points and the 5,874-case core library
reference passed against the candidate with the frozen v1 graphics manifest
verified. The unmodified TypeScript test initially exposed changed constructor
tags at the JS boundary; a candidate-only exact tag bridge restored the
unchanged pixel oracle, including 1,088 annulus samples. The patch 006 notes
bind the final receipt and explain why cross-book/application ABI parity is
still open. No production host or frozen specification was altered for this
candidate check.
The production-facing controller has a separate observed ABI counterexample:
unchanged host `Activate` is ignored by candidate `ApplicationControl`, whose
emitted input constructor is `ui/Types.Activate`. An exact tagged diagnostic
opens the View menu, but the actual browser host still sends the old bare
tag. The patch 006 receipt binds that contrast; a systematic host and
cross-book compatibility rule plus rendered game tests are required before
any pin move.
Keep the host queue's exact bare-tag `PointerMove` coalescing semantics when
choosing the translation boundary; at this checkpoint a worker-dispatch
adapter was a hypothesis, not yet tested or adopted. The subsequent isolated
trial below exercises that boundary without changing the production host.
A disposable adapter now passes a source-bound selected-book diagnostic across
the eleven host input names, effect envelopes, Controller→BoardScene/MenuAA
values, separate asset responses and BotAdapter's position constructor table.
The patch 006 notes bind the repaired receipt and review-found history/key
safety fixes. The production host still sends bare tags; no browser or bot
acceptance follows from this selected-book diagnostic alone.

**Isolated candidate browser trial on 2026-09-27:** a new nonce-private
driver copied the candidate compiler, applied exact 006 only to the copy,
emitted Controller/BoardScene/MenuAA, and used source-hash/unique-anchor
in-memory transforms at the browser worker and sprite-helper ABI seams.
The candidate draft is not the pinned or published bundle and explicitly
omits BotAdapter. Its successful build binds 96 source inputs and 16 static
files. A first real Chrome hotseat smoke passed four groups with zero recorded
page/console errors: boot and asset-backed sprite refinement, menu input,
e2–e4 turn advance and post-move refinement. Independent review found an
initial smoke provenance gap; the promoted repeat verifies the build receipt
and all static file hashes before and after, binds the smoke script, and
preserves the earlier receipts. See the
[bounded evidence](evidence/browser-2028-candidate/README.md). This does not
replay the full ordered compiler patch stack independently or close all
input/effect paths, native/GPU, performance or pin-amendment gates.
A subsequent hotseat run passed 13 local Chrome groups including offline
play, PCM, import and portrait. Another nonce-private candidate emitted the
actual BotAdapter worker library and passed a Node worker/serial comparison.
Review caught a false-pass in an initial browser bot run: a saved bot reply
could have come from serial fallback even though modules loaded. A corrected,
source-bound diagnostic bundle instrumented the route and required ordered
session-ready/choose/applied events, positive remote-work counters and zero
fallback online and after cold offline reload. Both phases passed with the
legal worker choice applied at revision 1→2; the final dist removed unused
predecessor host/worker bundles. The
[candidate evidence](evidence/browser-2028-candidate/README.md) binds the
receipts and limits. This is an instrumented local probe, not the unchanged
production host or full migration acceptance.

The final published visual source also passed a new nonce-private 2.0.28
candidate build with the actual BotAdapter bundle, the full 13-group local
Chrome hotseat matrix, and a strict instrumented online/offline bot route.
Default, 330°, Front and migrated-old-default screenshots were byte-identical
to the pinned 2.0.27 render at those four sampled views. Its
[current-source receipts](evidence/browser-2028-candidate/README.md#current-published-visual-source-trial)
remain local candidate evidence. They do not establish an unchanged
production ABI, native CPU/GPU compatibility, complete patch-stack replay,
or authorization to move the pinned compiler.

The later [published piece/wall visual source](evidence/browser-2028-candidate/README.md#current-published-piecewall-visual-source-trial)
also passed an isolated candidate build, a 13-group local Chrome matrix and
strict instrumented online/cold-offline bot routing. Five sampled frames
matched the public 2.0.27 version byte-for-byte. A separate source-only
[Linux feasibility request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5862769649)
asked for exact 2.0.28+006 patch application/native preflight; its result is
recorded below and does not establish a native candidate, device, host parity
or pin acceptance.

The [Linux source-only result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5863035581)
for published source `041932b` reports clean seven-patch LF replay and a
bounded NativeV2 check-only exit 0 in 8.82 seconds (3,339,084 KB peak RSS),
with 29 definitions relying on unsafe or foreign code. The apparent 27-vs-28
count differs only in categories on Windows: the reviewed replay has 27
changed paths but records 28 final compiler/test inputs, including unchanged
`bend2/base.bend` (SHA-256 `722a76eaa91732b3c50299f91769ae6ba97ad80705013209b816f5204536aebb`).
The [Linux clarification](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5863194840)
asks that host to verify the same distinction; this local explanation is not
cross-host byte parity. No C, ELF, GUI, PCM, restart or
GPU execution follows from a source check. The separate
[CPU-only candidate package request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5863172636)
requires a fresh claim, exact source/compiler closure, an 88 GiB two-sample
memory admission and one bounded emission/link before runtime probes. Its
request is not execution evidence or approval to move the pin.

The [CPU request's Linux reply](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5863271416)
stopped at its first MemAvailable observation: 72.538 GiB, below the 88 GiB
floor by 15.462 GiB. It performed no source/asset binding, C emission, ELF,
X.Org, PCM, or restart test; the claim was released. No native candidate is
accepted, and a fresh source-bound request would need fresh headroom and a
separately reviewed attempt. The [path-count clarification](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5863349323)
reconciles the 27 changed paths with 28 final input entries including
unchanged Base; it does not close host parity. A later compact UI fix changes
`ApplicationControl.bend` after the candidate browser/source-only checks, so
those receipts cannot be transferred to the newer source.

The newer [match-status/resume source trial](evidence/browser-2028-candidate/README.md#published-match-statusresume-source-trial)
re-established a nonce-private 2.0.28+006 build, 13 real-Chrome groups,
focused resignation/RESUME play, five sampled PNG matches to the pinned
hosted build, and strict instrumented online/offline bot dispatch. It still
does not supply a new-source Linux C/ELF/device result or the reviewed pin
amendment. A [read-only Linux headroom observation](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865659311)
was requested after the prior 72.538 GiB stop; even a passing observation
does not authorize a build or lower the 88 GiB floor.

The [Linux read-only reply](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865876967)
sampled 110,814,109,696 bytes (103.204 GiB) MemAvailable at 08:00:04 UTC,
15.204 GiB above the floor. Visible nonroot cgroup ancestors were unlimited
along the observer's path; that is not proof of a future emission process's
path or headroom. A [separate exact-source CPU-only candidate request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865910914)
for public source `c30d312` requires fresh admission initially and just
before one bounded C/ELF attempt, preserving the old failed sample. Its
Windows final-replay SHA suffix was transcribed incorrectly in the request;
the [append-only correction](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865920136)
gives the independently rehashed exact receipt
`a71ce32941c74abef1762bebb30d8526f115fc905bbb084722b3d6a4b2d7af01`.
Neither the headroom observation nor the corrected request is native
execution evidence or pin acceptance.

A separate [Windows source/asset closure probe](evidence/v2-native-candidate-preflight/README.md)
validated the current NativeV2 imports and manifests against the disposable
2.0.28+006 compiler copy without running Bend's checker. The local memory
observation was only 5.085 GiB free, so no local heavy native attempt was
made. That subset map cannot prove Linux byte parity or replace the guarded
CPU candidate receipt.

The [Linux exact-source CPU candidate result](evidence/native-2028-cpu/README.md)
subsequently reported a passing one-attempt 2.0.28+006 source check, C/ELF
package, real original-cadence X.Org input/orbit, routed PCM and saved-state
relaunch on public `c30d312`, with both fresh 88 GiB admissions passing.
This closes that **host-local CPU candidate** gate as reported by its owner;
it is not a GPU/device gate, independent Windows receipt replay, physical
audio, owner visual/performance acceptance, or permission to move the pin.
Independent final stack/ABI/native evidence review remains outstanding, and
the normal amendment path is blocked as detailed below.

### Canonical pin gate: blocked under the current frozen contract

The candidate results above do not make a standard 2.0.28 pin amendment
possible. The **pristine** upstream 2.0.28 checkout rejects the unchanged
`ArithmeticLaws.bend` identity-alias reference; patch 006 fixes that only in a
separate candidate. Independently, frozen `bend2/core/v2/node-check.mjs`
imports the compiler at the canonical pinned path and calls
`Comp.book_owned(book, Comp.SYNTH)`, an interface removed in 2.0.28. Redirecting
the wrapper cannot change that direct import. The v2 checker is frozen and is
not a substitutable file in the existing amendment procedure. Putting a
patched or derived compiler at `.artifacts/toolchains/bend` would conflict with
the project rule never to patch that upstream checkout and the guide's clean
upstream pin procedure. No canonical five-receipt amendment or pin move has
been attempted on these incompatible inputs.

Keep 2.0.27 pinned and preserve all candidate receipts. A reviewed new
semantic/proof-authority version could retain every v2 Law and old evidence
byte while introducing a versioned checker and an explicit, separately bound
compiler variant. Alternatively, a pristine upstream successor can be
assessed for both the alias and checker interface (with its own versioned
checker migration if necessary). Either path changes the authorized pin
strategy and needs the owner's choice; neither makes the candidate's browser,
CPU or finite proof receipts canonical or closes the separate GPU and visual
acceptance gates.

The [exact-tag 2.0.32 source check](evidence/toolchain-2032-scout/README.md#exact-tag-alias-and-proof-interface-check-2026-09-28)
now narrows that alternative: upstream has the `q !== k` identity-alias fix,
but `book_owned` remains private and `SYNTH` absent. A versioned proof-authority
migration is required for 2.0.32 too; its clean tag does not make the frozen
v2 checker or present five-receipt amendment pass. The remaining owner choice
is which compiler target to assess through that reviewed migration, not
whether proof authority can be silently skipped.

The subsequent [current-source CUDA pilot](evidence/native-2028-gpu/README.md)
proved an actual leased RTX 5090 process but **failed** the original 250 ms
GPU-on deselection, while CPU/off passed. Its lease and host claim were
closed. The requested observer-only timing diagnostic remains separate from
acceptance; it cannot cure the canonical pin incompatibility above.
