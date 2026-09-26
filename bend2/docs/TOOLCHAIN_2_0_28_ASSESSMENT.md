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
contains the exact upstream tag and only the maintained 001 arity-diagnostics
patch applied. Its application check passed. The exact 002 layout patch does
not apply to `bend.ts` and `comp.ts`; the 004 worker patch also overlaps
upstream compiler/CLI changes. The experimental rebase is restricted to that
ignored checkout. In particular, 2.0.28's new `book_file()` can reach package
lookup before the old local-only guard: negative named/hash import fixtures
must reject *before* any network access. No rebased variant is accepted yet.

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
