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
recording clean preimages and conflicts; rerun the full frozen proof,
conformance, mutation, library, browser and native gates. Move the pin only
through `LOCAL_BEND_GUIDE.md`'s reviewed amendment procedure. No upstream
publish, toolchain overwrite, installation or GPU lease follows from this
triage.
