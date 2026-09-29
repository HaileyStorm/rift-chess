# Bend 2.0.32 release triage, 2026-09-27

The owner flagged Bend 2.0.32. The [official changelog](https://github.com/bendlang/bend/blob/main/CHANGELOG.md)
lists 2.0.29–32, and `git ls-remote` on the official Bend origin resolved
`refs/tags/v2.0.32` to `573002f01ec6c52416d44489543f69a9625facf8`.
This is a source-only release triage; no 2.0.32 checkout, binary, package,
proof, native/GPU run or pin move has been made. The running application
remains pinned to reviewed 2.0.27. The isolated 2.0.28 ordered patch replay
is a historical stepping stone, not evidence that any patch applies to 2.0.32.

Material migration deltas to test rather than assume:

- 2.0.29 changes JS `Nat` to a Number under a 2^48−1 cap with BigInt at the
  host boundary, and changes direct-call/tail-cycle emission. Recheck the
  worker host bridge, serialization, oracles and hot paths rather than
  transferring 2.0.28 byte/pixel results.
- 2.0.30 introduces the proven BendTT kernel; 2.0.32 makes the ordinary
  proof verdict `ALL PROOFS CHECK`/`SOME PROOFS FAIL` and renames `--safe`
  to `--verdict`. Local `core/v2/check.mjs`, `tools/prove.mjs`,
  `tools/verify.mjs`, `tools/mutate-v2.mjs`, `tools/amend.mjs` and several
  patch gates currently require the exact older `All terms check.` string.
  Acceptance must validate the new proof semantics, not merely replace a
  string in a frozen receipt.
- `IO.args()` now includes the invoked program at index 0; inspect
  `NativeCLI.bend` and benchmark entry points before native use. TCP/UDP
  bind signatures also changed, though no project call site was found in
  this bounded search.
- Windows input gains cursor grab and richer scroll events; Linux X11
  drawing changes, and F32 text rounding is aligned across lanes. Recheck
  native event/PCM/restart and graphics differential evidence on the exact
  candidate, without inferring them from the current 2.0.27 host result.

The next candidate should start in a separate ignored checkout at the
exact 2.0.32 source. Rebase only still-needed patches one at a time,
recording clean preimages and conflicts; design a versioned proof gate that
preserves the old frozen inputs, then rerun conformance, mutations, library,
browser and native gates. Move the pin only through a reviewed procedure
consistent with `LOCAL_BEND_GUIDE.md`. No upstream
publish, toolchain overwrite, installation or GPU lease follows from this
triage.

## Exact-tag alias and proof-interface check, 2026-09-28

The official `v2.0.32` ref was rechecked at the same
`573002f01ec6c52416d44489543f69a9625facf8` commit. Its
[`parse_reso`](https://github.com/bendlang/bend/blob/573002f01ec6c52416d44489543f69a9625facf8/bend2/bend.ts#L1667-L1677)
explicitly requires `q !== k` before reporting an alias-shadow collision.
That is the identity-alias distinction supplied by candidate patch 006 on
2.0.28; a 2.0.32 trial must verify the unchanged frozen source but should
not blindly reapply 006. The
[`book_owned` definition](https://github.com/bendlang/bend/blob/573002f01ec6c52416d44489543f69a9625facf8/bend2/comp.ts#L1439-L1450)
is still private and takes one argument; the 2.0.32 source has no exported
`SYNTH` marker. Frozen `bend2/core/v2/node-check.mjs` still imports the
compiler directly from the canonical pinned path and calls
`Comp.book_owned(book, Comp.SYNTH)`. Its exact bytes cannot be substituted by
the current amendment contract. The CLI's newer verdict does not silently
replace that frozen proof authority.

Thus pristine 2.0.32 plausibly removes the **alias** blocker but not the
**checker-interface** blocker. A reviewed, versioned proof-authority migration
that preserves v2 Law/evidence bytes is required even if the owner chooses to
assess 2.0.32 next. The current frozen `node-check.mjs` cannot be assumed to
run unchanged on that release. This is source inspection only:
no checkout, proof, mutation, browser, native or device gate was executed.

## Pristine exact-tag checkout and migration call sites, 2026-09-28

A separate ignored, detached checkout at
`.artifacts/toolchains/bend-2.0.32-scout` now resolves `v2.0.32` to the same
commit `573002f01ec6c52416d44489543f69a9625facf8`, tree
`0ecfc84c5f19bbae2c0c10735129749adf7d49e8`, with no tracked changes.
The canonical `.artifacts/toolchains/bend` remains clean at pinned 2.0.27
`d37909174ebd664338ae3194799a9e0899dedd51`. This is source inventory,
not a wrapper-invoked Bend proof, native build or pin movement. Exact tag
SHA-256 values for `bend2/bend.ts`, `comp.ts`, `main.ts` and `base.bend` are
respectively `e342b14666c6fefbff988e985d3672f99d22bed5e33fbc0ad9e2d8d980b3c9d6`,
`84a657f11d94ed6462bfc71710fef9f798e3bb4b6b345636e30dd3c6f4e4fffc`,
`dfc58318166dc2720e626dfc46edaae38f8a0a7a8b3753cad7a48619896b94fb`,
and `a548d71e16e3e1b19f08ab187c1b04afabb7a3cf5fefa067004b77b6eaca9ba0`.

The exact checkout's `bend2/bend.ts:1672` has `q !== k` in `parse_reso`.
`bend2/comp.ts:1439` defines **private** `book_owned(src)`; `file_book` calls
it internally at line 1362, but the module exports neither `book_owned` nor
`SYNTH`. The frozen `bend2/core/v2/node-check.mjs:42` calls both through the
canonical compiler import. Those are source-level observations, not a test
that the unchanged Law now checks successfully on 2.0.32.

There is a proof-semantics distinction beyond changing a success string.
The new `main.ts:711` `cli_verdict(book, kernel)` checks unsafe/foreign
dependency promises on `--check-only`, then runs `Safe.safe_check(book)`
only when `--verdict` sets `kernel=true`. Its success text is
`ALL PROOFS CHECK` (line 77); `--check-only` also prints a hint to use
`--verdict`. The current frozen `core/v2/check.mjs:34` and other older gates
require exactly `All terms check.`. A versioned proof-authority migration
must decide and review the correct 2.0.32 mathematical verdict, not simply
replace that string and call it the same proof.

The new Base contract at `base.bend:176-179` returns the invoked program as
the first `IO.args()` entry; `main.ts:305` passes `[file, ...argv]` to a run.
`bend2/NativeCLI.bend:930` currently gives that entire list to
`dispatch`, whose first word is interpreted as the user's command. Without a
version-specific adapter or equivalent reviewed command boundary, a 2.0.32
native CLI launch would treat its program path as an unknown command. The
native GUI entry does not use `IO.args()` in the bounded current call-site
search. This is a concrete compatibility risk from source, not a witnessed
2.0.32 binary failure.

No official 2.0.32 package, Bun/Windows path-adapter evaluation, frozen Law
check, mutation gate, browser build, CPU native or GPU run was performed.
Keep the 2.0.27 pin and old immutable proof evidence. At this source-inventory
checkpoint, the 2.0.28 versus 2.0.32 target was still the owner's decision.

## Owner target and first pristine source probe, 2026-09-29

The owner now prefers a versioned checker and all applicable downstream
patches carried directly to 2.0.32, if feasible. Patch 001 (arity), 002
(layout), 005 (Windows paths), and 004 (worker backend) each require a fresh
rebase and own regression gate; experimental 003 was outside the reviewed
main stack and the 006 alias distinction is already in pristine 2.0.32.
None of the 2.0.28 patch receipts transfers to this target.

The clean exact-tag scout remains at
`573002f01ec6c52416d44489543f69a9625facf8`; a separate ignored
`derived-2032` checkout was created at that same commit. The canonical
2.0.27 compiler remains clean and unmoved. The bounded source-only
`toolchain-patches/2032/probe-pristine.ts` (SHA-256
`a3a9beb1ddcc61e17716373f3bb5b83e756df405b4f4b07d381f2e9a27856dfd`)
checked exact Git identities, disabled telemetry/network fetch, and tried
the unchanged frozen `ArithmeticProof.bend` (SHA-256
`149f4a311b6da1ef8e45a2eb2b62626f5d24804ba4091f3e15ee422ee18602a8`).
Pristine 2.0.32 stopped at `book_load`: its nested `../ProofKit.bend` import
resolved to `/Users/Haile/OneDrive/Documents/ChatGPT/ProofKit.bend` on this
Windows host. No checker, promise negatives or BendTT verdict ran. This is a
concrete 005-style path migration need, not a Law counterexample; do not
weaken the frozen source or paper over it with copied files.

The 2.0.32 BendTT verdict would build a kernel under the user profile when
`BENDTT` is unset. This host currently exposes neither `BENDTT` nor
`lean`/`leanc`; the source probe intentionally does not call `Safe.safe_check`
or install anything. A kernel-specific mathematical verdict still needs an
explicitly staged, reviewed runtime and separate evidence after source/checker
compatibility. No proof, native, GPU, browser or pin-amendment pass follows
from this stopped probe.
