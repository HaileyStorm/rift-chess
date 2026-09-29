# Bend 2.0.32 NativeCLI argument adapter

Bend 2.0.32 changes `IO.args()` so the first item is the invoked program; the
user's arguments begin at index one. `Args2032.bend` removes exactly that one
item only when it is nonempty. It does not inspect, classify, or skip any later
argument. A program-only invocation is valid and yields an empty user list;
missing or empty program items are rejected. The versioned patch makes the CLI
fail explicitly for either malformed shape.

`0001-adapt-io-args-2032.patch` is bound to the unchanged 2.0.27
`bend2/NativeCLI.bend` bytes, SHA-256
`bf055f12bac835a71b561a401def07f4fcfaa0d6dc775e6a82438e91158d7779`.
The repaired patch SHA-256 is
`c104cde276ef3890552c84ae6cb1518c73fe4555440503da648e365c6715c3eb`.
It is intended to apply to a separate 2.0.32 candidate source tree only; do not
apply it to the canonical 2.0.27 source or pin. The current test exercises the
adapter's actual Bend definitions through the local pinned loader:

```powershell
$env:BEND_NO_TELEMETRY = '1'
node bend2/tools/bend.mjs --run bend2/toolchain-patches/native-cli-2032/test.mjs
node bend2/tools/bend.mjs --run bend2/toolchain-patches/native-cli-2032/preflight.mjs
& .artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe run bend2/toolchain-patches/native-cli-2032/test-source-2032.mjs
```

The pure adapter test passes under the repository's pinned 2.0.27 loader;
it also preserves an unknown first user command for the existing error path.
The separate exact-derived-2.0.32 source-only test loaded Base plus
`Args2032.bend` (491 definitions), type-checked with zero holes and zero
network attempts. This small check alone does not prove the patched full
entry; a separate isolated entry-source check is recorded below. Neither is
a native C, GUI, PCM, or Linux acceptance test.

Root repaired the hunk context and `preflight.mjs` now passes both the exact
source hash and `git apply --check` against unchanged `NativeCLI.bend`.
Independent read-only review found no exact-one-drop defect. The patch was
applied only in a separate 2.0.32 application-source candidate, where the
full entry passed source typechecking; it has not run as a native executable.
Unknown-command dispatch and snapshot behavior need a version-bound CLI
matrix; source checking and a pure list test do not establish them. The
canonical source and main Git index remain unchanged.

The [separately versioned five-consumer candidate](consumers/README.md)
covers the other `IO.args()` entrypoints without editing their original
sources. Its exact-hash preflight and pure list controls pass, and the small
shared helper typechecks under the exact derived 2.0.32 source compiler. Both
versioned patches were then applied in a separate isolated source candidate;
all six patched entries passed `book_load`/`book_valid` with zero holes and
network attempts. No native command/argv matrix has run under 2.0.32.
The same isolated NativeCLI entry also passed a source-bound in-memory C
emission; see the [bounded receipt](consumers/C_EMISSION_RECEIPT.json). No C
artifact, binary or native runtime was produced by that probe.

Keep the historical 2.0.27 CLI source and its Linux receipt
`bend2/docs/evidence/native-cli-linux-2-0-27/receipt.json` unchanged. Remove
this migration adapter/patch only after a reviewed 2.0.32 CLI source has
integrated the behavior, its exact-source check and supported-target CLI
acceptance are recorded, and the migration evidence identifies this adapter's
replacement. The 2.0.27 receipt remains historical provenance, not evidence
for the 2.0.32 executable.
