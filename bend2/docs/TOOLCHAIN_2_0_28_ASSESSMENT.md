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
with POSIX path operations. The 004 WebWorker patch is still unapplied: its
`bend.ts` and `main.ts` hunks check, but its `comp.ts` hunk conflicts at the
new JS emitter, and its `name_own`/`eff_name` dependencies were removed by
upstream. Replacing those touches worker wire tags and intrinsic eligibility;
the 107 compiler/HTML and 639 differential gates are prerequisites to any
replay claim. The isolated 001+adapted-002 source hashes are `bend.ts`
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
Linux behavior, 004 worker migration and frozen proof/browser gates remain
untested. This is still a candidate, not acceptance of 005.
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

**Disposition on 2026-09-26:** defer the pin change. Root owns the rebase and
amendment. The Windows nested-import regression has an isolated, unaccepted
candidate fix with focused edge-case coverage; the 004 worker/compiler API
migration, fresh full-variant replay and independent final review remain
blockers. Switching now would invalidate the
published source-bound worker artifacts and in-flight 2.0.27 native/GPU
measurements. Recheck after those exact device/layout gates return and after a
disposable 2.0.28 variant passes the nested no-provider, worker, differential,
proof and browser suites. Remove the 2.0.27 pin only through the guide's
reviewed amendment and a clean, reproducible replacement build.
