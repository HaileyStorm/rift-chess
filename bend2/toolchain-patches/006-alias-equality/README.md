# Bend 2.0.28 identity-alias correction candidate

This is an **unadopted** one-line patch after the reviewed-order 001 → 002 →
005 → 004 candidate stack at upstream tag
`bc178404f4778704fa5584a73fcdf72bcdf9f32c`. It never touches the clean
2.0.27 compiler pin or a frozen Rift Chess Law. The exact patch is
[`006-after-004-2.0.28.patch`](006-after-004-2.0.28.patch), SHA-256
`a558b9b53cb46667659dc52036ad13a64da4e026ca8cf51dbd1ede9468fa8344`.
`git apply --check` succeeds on the fresh 2.0.28 stack.

Upstream's new alias-shadow guard rejects a reference when both the resolved
key `q` and written key `k` exist. A sibling import such as
`import ./Iteration.bend as Iteration` can legitimately make
`q === k === "Iteration.advance"`; there is only one key, so this is not a
shadow collision. The unmodified 2.0.28 candidate rejects unchanged frozen
`ArithmeticLaws.bend` at that reference before proof checking. Patch 006
requires `q !== k` for the collision branch while keeping distinct-key
ambiguities rejected. It does not change name resolution, any generated
program or any project specification. An independent source review found no
blocking issue with the equality-only condition; review of the complete pin
is still outstanding.

The [bounded fixture gate](test.mjs) checks the old false rejection, then
evaluates the positive identity-alias/constructor example to `7` and checks
its imported Law. It preserves upstream `alias_shadow`, `alias_decl` and
`alias_twice` rejection and separately rejects a genuine constructor
collision. All eight cases passed against the disposable trial copy, with
`BEND_NO_TELEMETRY=1`, a loopback-only hub setting and local source inputs.
Ignored receipt: `.artifacts/bend2/toolchain-patches/alias-equality-2028-fixtures/receipt.json`.
The current rerun receipt SHA-256 is
`0d67108b0320332e6413cb18a56d014448b5e38fa1ab7642c5d5934b020fd46a`.
The trial's canonical-LF `bend.ts` SHA-256 is
`359543edcf8060817f68e1ae6aeaad79888a20de511e676d065abab271657dd8`;
the other compiler/resource files are byte-identical to the fresh baseline.

The [candidate aggregate probe](../verify-v2-candidate-2028.mjs) binds the
disposable compiler and unchanged project import closure, denies network
fetches, and uses the pinned Node 24.12/64 MiB worker stack. Without 006 it
fails immediately at the frozen alias. A first trial validated all 1,584 v2
terms in 552.8 seconds, then stopped at the removed `Comp.book_owned` export.
The revised runner invokes the public empty selected emitter, which calls
2.0.28's private global ownership/collision guard, before the explicit
unsafe/foreign dependency walk. Independent source review found this
substitution appropriate for a source proof check; it skips program emission,
not ownership. The finalized, hash-bound repeat passed in 410.5 seconds:
1,584 terms, zero holes, zero tainted roots, zero denied fetches, and unchanged
runner/compiler/input hashes. Ignored receipt SHA-256
`d98f4fcc052e328492f0316e2664467259bf8633fc24a399eaab8f407cd2e7ee` at
`.artifacts/bend2/toolchain-patches/candidate-v2-proof-2028/receipt-1790476570954.json`.
A prior 600-second validation timeout and the private-API stop are preserved;
neither was a Law counterexample.

The [candidate-only finite conformance](conformance.mjs) uses an exact
`../Model.Pos` tag bridge while delegating every field, board and successor
comparison to the unchanged independent TypeScript interop/oracle. The
14-position/223-successor differential passed with zero stderr. Its receipt
binds the frozen semantic-v2 manifest SHA-256
`c8dcce907c3c3a6f70e9dfa12a74966879f30ea338b2734637c9acf4579943bf`,
57 loaded source files, compiler/resource bytes, upstream tag, patch and
fixture receipt, with all inputs unchanged afterward. Ignored conformance
receipt SHA-256
`fe8335c0ac3cac032ec2ba364bb4beabbe8d9380415c53eed37428e9d7c0b993`.
An earlier successful receipt accidentally replaced its explicit compiler hash
map with the compiler-stack label because of a duplicate JSON key. Its bytes
remain preserved at ignored
`.artifacts/bend2/toolchain-patches/alias-equality-2028-conformance/receipt-pre-compiler-field-20260927.json`
(SHA-256 `6893613fb000e1fab44a477211bf80e22dd2c658d3dbb3d2832b01d1a9a3b575`).
The corrected repeat reports both fields distinctly, with all inputs
unchanged and the same 14/223 verdict. A subsequent source-identical rerun
preserved that corrected receipt as
`receipt-db2e8cd5091bc1779cf362ae95cd04a0858dff994d78ae94395491fc5b27bdf3.json`.
Both fixture and conformance scripts now archive any previous convenience
`receipt.json` bytes under their SHA-256 before writing a repeat. The first
fixture receipt from before this safeguard was overwritten during an earlier
rerun; its prior hash was logged, but its original bytes are unavailable.

The [six mutation controls](mutations.mjs) ran on disposable copies of the
frozen core under the same candidate compiler. Each unmodified proof checked,
then each deliberately wrong rule was rejected by a concrete checker mismatch:
reject-all, wrong successor, hidden legal moves, omitted repetition key,
wrong resignation and ignored draw agreement. The clean canonical positive
and negative took 157.4 and 120.6 seconds in the hardened repeat; the other
controls completed within their bounds. Zero network fetches were attempted.
Independent review of the first full receipt confirmed the six mismatches but
found weak fixture/Base binding and overbroad negative-error matching. The
runner now binds exact candidate parser, Base, patch and compiler bytes,
requires the specific Law/proof location and expected/observed mismatch for
each negative, and distinguishes a one-case smoke from the complete gate.
The repeated full receipt reports `complete: true`, six passing cases and
unchanged source/compiler/runner/fixture bytes: SHA-256
`5a3b6400f73492c758f9162d5a600436f81bc94f72bc231e942d999d16ad0b01`
at `.artifacts/bend2/toolchain-patches/alias-equality-2028-mutations/2026-09-27T03-43-19-863Z-cfe0190a-aa6a-4059-ac80-0f50284e164a/receipt.json`.
The earlier full receipt remains preserved at its original run directory
(SHA-256 `23e80c8a637bf17edeff3eaebba3719e351b7dc0a45e7bc9c324ad1c2216ad6f`)
but is not the promoted mutation gate.
The original 2.0.27 interop and frozen fixtures were not edited.

Do not move `TOOLCHAIN.json` on this evidence. Required next gates include
graphics library proof/test checks, the current application
build/browser/offline matrix, Linux native source/C/ELF/window/PCM/restart
parity, measured runtime behavior and independent final review. Any pin move
must use the Local Bend Guide's frozen-dependency amendment, preserving old
bytes and receipts.
