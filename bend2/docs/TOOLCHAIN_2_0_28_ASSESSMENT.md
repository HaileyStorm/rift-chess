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
are source proof and finite differential evidence, **not** mutation, browser,
native, GPU, runtime parity or pin-amendment acceptance. The original
2.0.27 pin and in-flight older-source Linux package request stay intact.
