# Bend 2.0.28 WebWorker rebase candidate

Disposition: candidate only. This is an 004 compiler/API and runtime-resource
rebase in a disposable 2.0.28 checkout. It is not a fresh replay of
the complete upstream + 001 + adapted 002 + 005 stack, a pin adoption, or an
accepted amendment.

The checkout was at Bend 2.0.28 tag commit
`bc178404f4778704fa5584a73fcdf72bcdf9f32c`. Immediately before the 004 edits,
the three source-file hashes were:

| File | Observed pre-004 SHA-256 |
| --- | --- |
| `bend2/bend.ts` | `192e796a9c6730f291da346ed7fae1a2abbb32e1269463ee2199ac3f8ad7a143` |
| `bend2/comp.ts` | `8e12351e723e295df10f83d625207591ebeb89547cb1261c2be410b7438ecd3f` |
| `bend2/main.ts` | `3728489382099dc3faecd64a432147720bc5ebaea3459b2c28331bdadd0b7748` |

Those raw-byte hashes record the observed checkout before the worker edits.
They differ from the separate final-005 receipt, so this receipt does not claim
that the full ordered stack has been reconciled. Root owns that reconciliation.
No Laws, proofs, or pinned 2.0.27 compiler files were changed. Root later
updated this main checkout's guide, assessment and candidate evidence; no
production toolchain pin was moved.

The candidate patch is
[`004-after-005-2.0.28.patch`](004-after-005-2.0.28.patch), SHA-256
`8cdf93ac066391f93638d7a4bacf2efd85624d77271af0ed5a981d6bd5d7207c`.
Root appended the unchanged `bend2/web_runtime.js` new-file hunk from the
maintained 2.0.27 004 patch. The resource SHA-256 in the disposable checkout
is `592f7684a9a87b46c49fc7bf2d75ce0899fbf4bbe844a3de84fec4036a0bbd6d`.
The patch passed `git apply --reverse --check` and `git diff --check`. Final
disposable source hashes before root's replay were:

| File | Candidate SHA-256 |
| --- | --- |
| `bend2/bend.ts` | `f332ad1cb4bed3c7435c4656ae0ee52efb48d66dae3f7a35ac2372744455040c` |
| `bend2/comp.ts` | `ca9304e8b6ea82c119e10c3e9452b803c75835962fe0c40f8a1ca03b54af47b3` |
| `bend2/main.ts` | `989b48cc30f20bac9fa253c03f3772f16a16ddf6e2bbb9bf02eca454c0277b1a` |

Root also performed a reverse/forward replay with a byte-exact backup.
Reversing this patch yielded the **LF-normalized final-005 receipt** source
hashes `9068fe33...` / `950b582d...` / `bd7218bc...`, rather than the raw
pre-004 hashes listed above. Ordinary Windows `git apply` changed CRLF/LF
spelling on forward replay; the post-replay files matched the saved candidate
files after CRLF-to-LF normalization. Root restored their original raw bytes
from the verified backup afterward. This establishes a contextual replay from
the final-005 source text, not raw-byte cross-host reproducibility or the
unreconciled 001+002+005 ordered stack. A fresh stack replay must record both
canonical text hashes and emitted bytes before pin adoption.

The migration keeps the worker suffix grammar intact. `eff_name` was replaced
with 2.0.28's `op_name`, and worker wire tags now use the same full constructor
keys as 2.0.28's JavaScript emitter. The 2.0.28 `js_lib` implementation and
effect registration remain in place; its worker-policy guard is added around
that emitter. The CLI additions preserve the existing 005 path code and resolve
Base effect files from the compiler resource directory.

Focused checks used Node `v24.12.0` with `BEND_NO_TELEMETRY=1` and a local
`BEND_HUB=http://127.0.0.1:1` fetch trap. The harness made zero provider
requests. Canonical suffixes `@(...)`, `@1(...)`, `!@4(...)`, `~(...)`, and
`!~(...)` parsed; fourteen malformed, duplicate, spaced, partial, or invalid-cap
forms and a split-line suffix were rejected. In-memory emission produced the
static worker artifact, embedded the unchanged synchronous serial output, and
used the expected backend manifest. A `U32.add` worker call remained eligible;
the F32 representation and bit-intermediate fixtures remained rejected in
strict mode. A deliberate duplicate constructor tag was rejected, while valid
constructor tags matched the 2.0.28 `ctr.k` values. Loading `image_tree.bend`
under namespace `M` emitted `M.WPix` and `M.WQua` tags for `M.read_image`. An
`IO.print` worker root was rejected as foreign-reachable. The synchronous JS
API warned on explicit require in permissive mode and rejected it in strict
mode.

The 2.0.28 plain JavaScript and C outputs for a no-policy fixture matched the
clean `HEAD:bend2/comp.ts` emitter byte for byte: JS SHA-256
`928adac721ed7ddd0abc729a8fceedbd23826f1b0124fb4b336a2239ed79dde4`, C
SHA-256 `77eedbb0700dd47008af2d688b7710bf0cb2caff50033d781c9adf3e8f526744`.
For the same source, all six worker suffixes (`@`, `@4`, `~`, `!@`, `!@4`,
and `!~`) on the saturated call left C output byte-identical to the plain call.
The targeted emitted worker program hash for `M.read_image` was
`4d1610948ab093b299b2d900de38fe1481ae2307514e493fdcf83a05b75afe9a`.

The first focused compiler-emission checks supplied the existing 004 runtime
through an in-process read hook. Root then added those exact bytes as
`bend2/web_runtime.js` in the disposable checkout and patch. Direct file-based
worker emission now succeeds, and the copied stage-two gate executed real Node
worker threads with that resource. A relocated compiler-resource package and
browser/offline worker execution remain unverified.

Correction: the earlier reported `term_force → term_any → carb_book → js_lib`
TypeError is withdrawn; it was caused by my harness, not Bend 2.0.28 or 004.
The harness incorrectly passed the `n0` returned by `book_load` (506) to
`book_valid` on a fresh book. The CLI validates a fresh book with
`base?.order.length ?? 0`, which is 0; passing 506 skipped checking 506
declarations and left an invalid book for the emitter.

I reran with a fresh `Bend.Book` per root, `book_load`, and `book_valid(book, 0)`.
For `workload_shapes.bend` (SHA-256
`d44714df5044ec2229806c70f52908ba44f896b038393f9fc570cfff90331c7b`), both
pristine 2.0.28 `HEAD:bend2/comp.ts` synchronous emission and candidate worker
emission passed for all twelve roots, in this order: `range`, `required_range`,
`dense_image`, `required_image`, `sum_input`, `required_sum`, `identity_image`,
`sparse_image`, `required_sparse`, `skew`, `required_skew`, `sequential`. Its
nested `image_tree.bend` dependency has SHA-256
`15d9400c20d08da1c4f796493086192dcdf926271c564ec274528d0cad6daa0b`. A fresh
namespace-bound load of that module as `M`, validated with `book_valid(book, 0)`,
also emitted `M.read_image` with schema tags `M.WPix` and `M.WQua`.

The same corrected `book_valid(book, 0)` check against the preserved pre-004 005
`bend.ts` snapshot (`9068fe33367505ba99bfaba3aa99ad66c1dc9e7799c014ec1f042a598ac888a2`)
and clean 2.0.28 `comp.ts` emitted the legacy-bang `image_tree.bend` `exported`
root. Thus the TypeError claim does not reproduce on the preserved snapshot.
Root copied the maintained `gates/workers.mjs` and 21 worker fixtures into the
disposable checkout, removing one obsolete `Comp.book_owned(book, Comp.SYNTH)`
call from the **copied gate only** because 2.0.28 runs its private ownership
pass during emission. The stage-two gate passed **59/59** (local ignored log
SHA-256 `9fcd85dc8c7e7f50d66cedc09efdb87d29f63df21a821c28eabf326543091103`).
The combined Node/HTML gate passed **106/107**, including real worker threads;
the sole failure is the old `oracle_hashes.json` 2.0.27 JS/C byte pin, which
must retain its historical evidence and gain independently generated 2.0.28
oracles (log SHA-256 `95f2fbedbe9268c5e4dd3cf2983b4032507a0d501412867fb9ba1e85c40d266f`).
Its HTML fixture bundled a nested static module worker and executed it in
local Chrome with a positive remote-job count; it is narrower than the full
multi-browser/offline module-worker suite and not a hosted game test.
Root then generated a new ten-fixture [2.0.28 oracle file](ORACLE_2028.json)
from a separate pre-004 005 baseline worktree, SHA-256
`aa394dd312d39a7e4e14b4598207284da17bb6d5b8108911529437b78dfcb599`.
The candidate independently produced identical source, JS and native-C hashes
on all ten. Only the lane checkout absolute root is replaced with `<ROOT>`
before emission hashing; each input source file is byte-pinned separately.
The original 2.0.27 oracle file remains untouched. The test adapter patch
[`004-tests-after-005-2.0.28.patch`](004-tests-after-005-2.0.28.patch), SHA-256
`7f412bb7c2c092380b713d49487f11c1e22ce5d39ac9df4662d49ff87b310402`,
removes the obsolete ownership call from the copied gate, selects the new
oracle file and labels the matrix baseline 2.0.28. Ordinary
`git apply --check` passed against the preserved 2.0.27 test inputs and
`git apply --reverse --check` passed on the adapted disposable tests. With
that adapter, the combined Node/HTML/Chrome gate passed **107/107, zero skips**
(ignored log SHA-256
`9811c37f633d5f966b76b1c912fce4e993e9e37abd3823b0a7e971235dec4399`).
Root also ran the copied matrix over **647** 2.0.28 fixture files in the
parse/check/compile/proof/show/comptime groups. A pristine-tag Windows lane
had 105 differences: 104 compile cases could not resolve its Base effects
directory and one nested-import case failed before the 005 path fix. None was
an otherwise successful JS/C output divergence (diagnostic report SHA-256
`d368df3ed4e39398d8505cc85c683ff4b06196ce84a401e06d714347462115f0`).
Root then reversed 004 into a separate local tag worktree, copied only its
three LF-normalized final-005 compiler source files there, reapplied 004 in the
candidate, and verified the saved four candidate files byte-for-byte. The
same 647-fixture matrix against that exact 005 baseline passed with **zero
differences** in check results and normalized JS/C emission (receipt SHA-256
`1012f356c4586e4ad88b3476b866a8bd03ece8232cf31de0afbfba9233e84142`).
This isolates 004 behavior against 005 on Windows; it is not an independent
fresh replay of 001+002+005 or a cross-host/native proof. Relocated static
packaging, wider browser/offline gates, full frozen-law/proof suite, root
application checks and fresh-stack replay of the local 2.0.28 oracles remain.

Commands/checks run in this lane:

- Read `bend2/docs/LOCAL_BEND_GUIDE.md`, `bend2/SPRINT.md`, the maintained 004
  patch/tests, and `bend2/docs/TOOLCHAIN_2_0_28_ASSESSMENT.md` before editing.
- `git apply --check` on the original patch identified the 2.0.28 emitter and
  loader hunk conflicts; compatible source hunks were adapted in the owned
  disposable files.
- `node --experimental-strip-types --input-type=module -e <inline checks>` ran
  parser, emission, constructor-tag, intrinsic, foreign-guard, provider-trap,
  and clean-emitter comparisons.
- `git apply --reverse --check bend2/toolchain-patches/004-web-workers/rebase-2028/004-after-005-2.0.28.patch`
  and `git diff --check` passed in the disposable checkout.
- `Get-FileHash -Algorithm SHA256` recorded the pre-004 source, final source,
  candidate patch, and runtime hashes above.
- Root's first full gate exposed the removed 2.0.27 `Comp.book_owned` call in
  the copied test adapter; after the one-line adapter change, the copied
  `stage2_test.mjs` and `gates/workers.mjs test` yielded the counts above.
- Root verified four exact candidate source/resource files, reversed the
  amended patch, recorded its LF-normalized preimage, forward-applied it, and
  restored raw bytes from a verified ignored backup after Git's Windows
  line-ending conversion. `git apply --reverse --check` still passes.
