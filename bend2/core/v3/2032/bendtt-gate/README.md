# Bend 2.0.32 full CHECK / BendTT candidate

This is a Linux-only, separately versioned candidate for the frozen v2
`CHECK.bend` mathematical verdict. It invokes the derived compiler's official
`main.ts <absolute CHECK.bend> --verdict` command and accepts only the exact
stdout line `ALL PROOFS CHECK\n`, empty stderr, exit status zero, and an observed
quiescent owned process group. It does not change the canonical 2.0.27 pin or
any frozen Law.

Both approvals in [`approvals.mjs`](approvals.mjs) are intentionally `null`.
No command-line argument or environment variable can supply or override an
aggregate receipt hash, kernel hash, or provenance record. The entrypoint must
stop before creating a run or launching a process until both source-controlled
approval objects are populated after independent review. This checkout has no
approved aggregate receipt or reviewed prebuilt kernel; do not run the live
entrypoint yet.

## Deterministic tests

From the repository root, on Windows or Linux:

```sh
node bend2/core/v3/2032/bendtt-gate/test.mjs
```

The test injects synthetic approval records, a fake process-group runner and
full-ancestry memory snapshots. It checks approval shape/hash/provenance,
exact success output, two memory admissions, the official command arguments,
source rebinds, and failed/uncertain lock retention. A competing invocation
must fail on the same fixed host-local lock before either memory admission or
process launch, while each attempt keeps its own no-overwrite output directory.
The second memory sample follows source rebinding and immediately precedes the
verdict spawn. These tests do not execute Bun, Lean, BendTT, or any Linux host
process and are not proof evidence.

## Approval prerequisites

The independent full CHECK receipt must be the raw JSON output from the
2.0.32-2 aggregate Worker (`rift-v2-aggregate-2032-source/1`), retained at an
absolute path in ignored `.artifacts/bend2/`. Its review and the approval module
must bind the exact raw-file SHA-256, source commit/tree, frozen-v2 SHA-256,
zero holes, zero fetches, full expected/loaded import count, LF compiler and
Base hashes, patch hashes, aggregate/safety runner hashes, and Linux Node
22.23.1 executable identity. The source commit must be an ancestor of the
current clean checkout. All frozen-v2 manifest files, TOOLCHAIN pin, freeze
authority, CHECK aggregate/safety/proof-authority, compiler EOL helper, patch
stack, and their other listed critical inputs are compared byte-for-byte with
the aggregate commit. Later commits are accepted only for additive 2032
runner/tooling/documentation/evidence work, the reviewed approval update, and
modifications to only `bend2/SPRINT.md`, `bend2/core/v3/2032/README.md`, and
`bend2/toolchain-patches/2032/README.md`; critical inputs must remain
identical. This avoids requiring the receipt to include the commit that later
records approval of that same receipt.

`approvedAggregateReceipt` has exactly `schema`, `path`, `sha256`,
`sourceCommit`, `sourceTree`, `frozenSha256`, `holes`, `fetches`, and `review`
fields. The `review` object has `disposition`, `path`, and `sha256`; its raw
review file must include `Review disposition: accepted`, the exact aggregate
receipt SHA-256, and source commit/tree lines. Both receipt and review must be
regular ignored files in the current checkout.

The kernel approval must bind a regular, canonical, executable prebuilt file
and exact binary SHA-256. Its provenance must identify the pristine scout's
`bend2/bendtt.lean` commit/tree, Git blob
`047ff907c8754ca3917ff341974aea18fab4720b`, source SHA-256
`7f6ef51c9f75d7de91c15f790fb3385189b1129e7bc13812c9d8aa30a2c73dec`
over the 179,752 LF Git-blob bytes, exact
Lean 4.34.0 and `leanc` version outputs/executable hashes, and build commands
`lean -c bendtt.c bendtt.lean` and
`leanc -O3 -DNDEBUG bendtt.c -o bendtt`. A separate accepted review must bind
the binary SHA and source Git blob, plus the exact one-line Lean/leanc versions,
both tool executable hashes, and JSON-formatted build command arrays. The
derived verdict implementation is also pinned to scout `safe.ts` Git blob
`a0b6fd07573c7fbf547ccdecb42ffa167bee6ba9`, LF SHA-256
`0409d451415fbac0cd596aadb107f95244961a2b8847acf3d380ffdbbfb5c6ea`; the
derived working file must match those LF bytes. Alongside the accepted
disposition, the review file must include:

```text
BendTT kernel SHA256: <approved binary SHA-256>
BendTT source Git blob: 047ff907c8754ca3917ff341974aea18fab4720b
BendTT source commit: 573002f01ec6c52416d44489543f69a9625facf8
BendTT source tree: 0ecfc84c5f19bbae2c0c10735129749adf7d49e8
BendTT source SHA256: 7f6ef51c9f75d7de91c15f790fb3385189b1129e7bc13812c9d8aa30a2c73dec
BendTT safe.ts Git blob: a0b6fd07573c7fbf547ccdecb42ffa167bee6ba9
BendTT safe.ts SHA256: 0409d451415fbac0cd596aadb107f95244961a2b8847acf3d380ffdbbfb5c6ea
Lean exact version: <exact `lean --version` output>
Lean executable SHA256: <exact executable SHA-256>
leanc exact version: <exact `leanc --version` output>
leanc executable SHA256: <exact executable SHA-256>
Lean build command: ["/absolute/lean", "-c", "bendtt.c", "bendtt.lean"]
leanc build command: ["/absolute/leanc", "-O3", "-DNDEBUG", "bendtt.c", "-o", "bendtt"]
```

The kernel `review` object in `approvals.mjs` pins the review file path and
raw SHA-256. There is no automatic Lean build, profile cache, or fallback path.

The pinned Linux Bun identity is version 1.4.2 and SHA-256
`a83d263767d839e4d2649ca8e35d07159c7afc99afdc96d731ced29e056dda0c`. Set
`BUN_BIN` to its explicit absolute path. The candidate checks that it is a
regular canonical executable with those bytes and observes `bun --version`
through the owned process-group API before the proof launch. `BENDTT` is set
internally to the reviewed path and rehashed before and after the verdict; an
unset or alternate kernel can never trigger the compiler's auto-build path.

## Live Linux invocation (only after both approvals)

The Linux process must run under Node 22.23.1 with no inherited flags or
`NODE_OPTIONS`, from an exact clean Rift checkout. After the approval module is
independently reviewed and committed:

```sh
export BEND_NO_TELEMETRY=1
export BUN_BIN=/absolute/path/to/approved/bun-1.4.2
node bend2/core/v3/2032/bendtt-gate/run.mjs
```

The runner re-verifies the frozen v2 manifest and exact CHECK import cone,
pristine 2.0.32 scout, LF derived compiler/postimages, canonical 2.0.27 pin and
reviewed patch stack. It requires two 32-GiB memory admissions using the
full-ancestry Linux cgroup-v2 guard, then runs the checker within an isolated
HOME/TMP/output directory under a unique ignored run path. One fixed exclusive
host-local lease at `.artifacts/bend2/2032-bendtt-verdict/active-verdict.lock`
serializes every verdict attempt and is acquired before either memory sample or
any child process; a competing invocation records its own
partial failure and stops before admission/spawn. The second 32-GiB sample is
the last synchronous operation before starting the `--verdict` process group.
The fixed lease is released only after terminal status and group quiescence are
observed. Any failed attempt retains it for owner-reviewed recovery; there is
no automatic stale-lock reclamation. Telemetry is disabled;
the import cone admits only frozen local `.bend` sources and Base, and HTTP(S)
proxy variables point to a loopback sink. This is not an OS network namespace
or an egress trace.

The 1,800-second owned group must exit with status 0, exact stdout
`ALL PROOFS CHECK\n`, empty stderr, and confirmed process-group quiescence. The
runner rebinds the source and binaries after execution and writes its final
receipt last with no-overwrite semantics. Any failed attempt retains a partial
failure record and its lease; an uncertain process group is not killed or
retried by this checker. Review process/host state before another attempt.

A successful receipt would establish the 2.0.32 derived full frozen CHECK
verdict on that Linux source/runtime/kernel binding only. It would not establish
the six semantic mutations, conformance, native CPU/GUI/PCM/restart, browser,
GPU, pin amendment, release readiness, or owner visual acceptance.
