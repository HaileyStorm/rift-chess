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
network attempts. It does not prove that the patched full entry checks or
runs under 2.0.32. The whole-entry check has not been run, and this is not a native C,
GUI, PCM, or Linux acceptance test.

Root repaired the hunk context and `preflight.mjs` now passes both the exact
source hash and `git apply --check` against unchanged `NativeCLI.bend`.
Independent read-only review found no exact-one-drop defect. This is still an
integration draft: the patch has not been applied to a separate 2.0.32
application source closure, and the full entry has not been type-checked or
run as a native executable. Unknown-command dispatch and snapshot behavior
need a version-bound CLI matrix after that integration; a pure list test does
not establish them. The canonical source and Git index remain unchanged.

The [separately versioned five-consumer candidate](consumers/README.md)
covers the other `IO.args()` entrypoints without editing their original
sources. Its exact-hash preflight and pure list controls pass, and the small
shared helper typechecks under the exact derived 2.0.32 source compiler. The
zero-context patch is not yet applied or tested as a five-entry application
closure or native command path.

Keep the historical 2.0.27 CLI source and its Linux receipt
`bend2/docs/evidence/native-cli-linux-2-0-27/receipt.json` unchanged. Remove
this migration adapter/patch only after a reviewed 2.0.32 CLI source has
integrated the behavior, its exact-source check and supported-target CLI
acceptance are recorded, and the migration evidence identifies this adapter's
replacement. The 2.0.27 receipt remains historical provenance, not evidence
for the 2.0.32 executable.
