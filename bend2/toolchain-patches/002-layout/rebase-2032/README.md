# Bend 2.0.32 layout-report rebase candidate

This is an isolated candidate for patch 002, applied after the separately
versioned 001 arity-diagnostic candidate. It targets pristine upstream Bend
2.0.32 commit `573002f01ec6c52416d44489543f69a9625facf8`, followed by the
reviewed 001 candidate patch
`98282500926c0df0baa531bc04e3516111ecf997c409b9a910bc4173e0c5b9db`.
It is not a pin change. The clean 2.0.32 scout and the canonical 2.0.27 pin
remain untouched.

The rebase adapts to 2.0.32's `Lay` representation (`arms` keyed by
constructor), its `Fun` interface (`live`, `lays`, `ret`), and typed traversal
through `file_book`, `fun_of`, `term_any`, and `term_spine`. Constructor field
offsets are cumulative 64-bit slots in the constructor's own node layout.
The report remains a structural interface view, not an emitted-segment map,
runtime task count, performance estimate, or native/GPU claim. The CLI first
checks the source book and preserves the ordinary check-only unsafe/foreign
dependency gate; a passing report writes JSON only, with no success banner.

`--explain-layout` is recognized only as a parsed CLI option. Only that parsed
mode skips the daily version check; a spelling after `--` or consumed as an
`-o` filename follows ordinary CLI behavior. In report mode, `book_load`
propagates a local-only flag independently of 2.0.32's existing `root`
argument. It permits `Base` and local relative imports, and rejects absolute,
backslash, named-package, and hash-package imports before `name_hash` or
`book_file` can perform package lookup. It also fences both lexical and
resolved paths under `BEND_LIB`. Rejections use generic diagnostics without
echoing the rejected path. This mode does not claim that Bun itself has no
host-side transpiler cache.

The candidate source hashes are:

| File | SHA-256 |
| --- | --- |
| `bend2/bend.ts` | `dcae4da6b687c96e3a2bd6c7e98ee00140857ef41cdce68c8bd16c887b9e592f` |
| `bend2/comp.ts` | `0108bf3a080d1cfbb987a5d95fb5b1e7acae91da85efb419eed7e06dd75334a7` |
| `bend2/main.ts` | `df8839e6f77d657f67e7f47022ac5c8f2ca90dc4cd7bae9af0982c574267bd9e` |

Patch `0002-after-001-2.0.32.patch` is SHA-256
`2ed566176148cc1e064d2dae4c806c7912d557e38570ecfa5f47ddd0d78d395d`.
`test.mjs` binds the exact 2.0.32 commit, the 001 input patch, and all three
candidate source hashes. It reconstructs 2.0.32+001 in OS temporary storage,
checks and applies 002 there, and verifies that result against the derived
candidate. Its gates cover deterministic schema/layout/site output,
path-independent standalone names, unchanged fixture bytes, invalid
source/option rejection, loopback-trapped provider and version-check requests,
no Bend package/version-cache writes, parsed-mode telemetry behavior, and
successful C/JS byte parity against the 2.0.32+001 intermediate.
Windows relative-import report positives and stable imported namespace names
are deferred to the separately rebased 005 gate; pristine 2.0.32 still
resolves even a sibling `./module.bend` against the wrong Windows path.
The source propagates the local-only flag through recursion, but recursive
forbidden-import negatives also await 005 so the child can actually load.

Root ran `node bend2/toolchain-patches/002-layout/rebase-2032/test.mjs` on
2026-09-29 after mechanically regenerating the context-bearing patch from
the exact 001 index/source delta. Independent review found a pre-fence
`book_file` fetch path for a relative import aimed at `BEND_LIB`. Root added
pre-lookup checks for both the actual target and native-relative target, then
reran the bound gate with that exact relative-import negative: zero loopback
requests and no package cache. The final passing test SHA-256 is
`68d5ac52abe61e82ea95f8381693d1a1c276689e9667f155ac160fa63e9ef320`;
successful JavaScript output was unchanged at SHA-256
`c1131ea18354e09153a507fdf4c554e8b9cade5b7f9817a63cbf997016e6a2cb`,
and C output unchanged at
`ac6d700fa79ac0b428fbfdc21cd9c457c765962c610b121edbb4471c3b09f1bd`.
The ordinary-option test allowed only a loopback version-check request;
report mode made zero loopback requests and no package/version-cache writes.

The independent source review's remaining gap is nested and junction/symlink
import behavior, which requires 005's Windows path fix and a combined gate.
This isolated 001→002 result is not full compiler acceptance. No full compiler
matrix, proof/BendTT, Windows
nested-import compatibility, browser, native CPU, GPU, or pin-adoption claim
is made. Patch 005 remains a separate follow-on for the 2.0.32 path defect;
apply it only after this 001+002 candidate has passed root's exact replay gate.
