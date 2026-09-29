# Bend 2.0.32 Windows import-path rebase candidate

This is the isolated 2.0.32 rebase candidate for downstream patch 005. It
targets pristine upstream Bend 2.0.32 commit
`573002f01ec6c52416d44489543f69a9625facf8`, after the versioned 001 arity
candidate and 002 layout-report candidate. It is not a toolchain pin change.
The clean scout, canonical 2.0.27 compiler, frozen Laws, and frozen manifests
remain unchanged. Root owns generating and replaying the ordered patch artifact;
the source and test here are the candidate input for that replay.

## Source binding

The exact 001+002 input stack recorded by the 002 candidate is:

| File | SHA-256 before 005 |
| --- | --- |
| `bend2/bend.ts` | `dcae4da6b687c96e3a2bd6c7e98ee00140857ef41cdce68c8bd16c887b9e592f` |
| `bend2/comp.ts` | `0108bf3a080d1cfbb987a5d95fb5b1e7acae91da85efb419eed7e06dd75334a7` |
| `bend2/main.ts` | `df8839e6f77d657f67e7f47022ac5c8f2ca90dc4cd7bae9af0982c574267bd9e` |

The inherited stack hash is `0572237e5d862d3383b25ceccbeeb0c313f0237ee2f5fd97afd6b396dbec3f4e`.
The 005 candidate changes only `bend2/bend.ts` and `bend2/main.ts`; the 001
`comp.ts` bytes are preserved:

| File | SHA-256 with 005 candidate |
| --- | --- |
| `bend2/bend.ts` | `2c3953bb4fcb12aa97d4ce8cd041ef0ce8324c724fd0adc9b0352fff4c0f5c09` |
| `bend2/comp.ts` | `0108bf3a080d1cfbb987a5d95fb5b1e7acae91da85efb419eed7e06dd75334a7` |
| `bend2/main.ts` | `e41167de4f0a5e00a6bc6e2ab3bdcdbb4920ef4edfc60631cd12225a03102cae` |

The candidate stack hash is `49705b27f7fd4171f862fe5addaae2026ec249780dac73ce7e42f726a0fe417e`.
The regenerated 005 patch is SHA-256
`99260ae663488cbff09daa6425e0d745f89917f583626582fda1db17c60c1fe4`.
Root's exact source replay is [versioned separately](../../2032/replay-001-002-005.mjs);
this is source composition, not pin acceptance.

## Behavior and bounded gate

The loader now resolves filesystem paths with the platform-native `path`
operations and converts only Bend module names and package-relative paths to
forward slashes. On Windows, nested `../` imports no longer resolve from the
wrong root. Same-file Windows aliases are tracked in a `WeakMap` keyed by the
existing path-keyed `seen` map, using the file's volume and file ID; aliases
reuse the first module namespace, case-variant cycles remain cycles, and the
identity keys never leak into package assembly. The `PROOF.bend` gate uses that
same identity lookup for a case-variant `LAWS.bend` import.

The 002 report-only boundary is preserved: `localOnly` is recursively carried
without displacing the native `root` argument. Absolute, backslash, named, and
hash imports are refused before package resolution. A local relative import
that resolves into `BEND_LIB` is fenced before `book_file`, and lexical or
canonical `BEND_LIB` paths (including a junction target) are rejected. A normal
CLI load can still use an already cached named package. Package-cache path
construction and the package-file test use native separators while retaining
slash-delimited package names.

Run the candidate gate from the repository root with the local Bun and no
telemetry:

```powershell
$env:BEND_NO_TELEMETRY = '1'
node bend2/toolchain-patches/005-windows-import-path/rebase-2032/test.mjs
```

The test binds upstream HEAD, the inherited 001+002 source hashes, the
candidate source hashes, and the exact changed-file set. Its 2026-09-29
Windows run passed nested imports, stable report names, recursive local-only
named/hash/absolute denials, a relative pre-cache `BEND_LIB` denial, cached
package loading, case-alias reuse and cycle detection, package-file assembly
(including parent and same-directory foreign JS archive keys),
the PROOF/LAWS case check, a BEND_LIB junction, and synthetic different-drive
and different-UNC-share rejection. The loopback BendHub trap ran concurrently
with child processes and observed zero requests. The run-output SHA-256
(excluding its final digest line) was
`ce2e20acc64c37de75cee527cdb0f0764c171447a16a4607abc338fa13270ab2`.
The test source SHA-256 is
`044fce61d62aabaf9a5350b10104567d9eb2b15bb178bf4a3ce6b2180d5c8a4b`.

These are focused Windows path/security and compatibility checks, not a full
compiler matrix, upstream acceptance, package publication, successful remote
download, proof-kernel/BendTT result, browser/native/GPU acceptance, or pin
amendment. Cross-volume behavior was tested with synthetic drive/share roots,
not a mounted second volume or remote share. Identity and junction fixtures
run only on Windows; other hosts report them as skipped. No provider endpoint
outside loopback was used.
The parsed parent-foreign-JS package fixture also currently runs only in the
Windows branch; repeat it on POSIX before claiming cross-host package parity.
