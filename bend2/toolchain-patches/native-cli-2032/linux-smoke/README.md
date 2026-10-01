# Bend 2.0.32 Linux NativeCLI candidate

This is a separate CPU-only executable/argv gate. It never copies the
Windows-generated C artifact, edits the published app or canonical 2.0.27
pin, installs a toolchain, or adopts 2.0.32. The historical
[`consumers` C receipt](../consumers/README.md) remains a distinct Windows
emission result.

`export-c.mjs` requires a clean pristine 2.0.32 scout, clean canonical
2.0.27 pin, and the exact ignored derived 001→002→005→phase-two compiler.
The LF/CRLF compiler postimages are bound by the existing EOL helper. It
reads the exact Git Bend-source blobs at application commit `3080ad5`,
materializes them in a fresh ignored directory, and applies the two pinned
NativeCLI/consumer argument patches there. It checks all source bytes and
the actual loaded import cone before locally emitting C. The reviewed Linux
LF output must be exactly 2,189,657 bytes/SHA-256
`e5bfb78237720399ff8222844e6bf0f4385f0d817d43bc4eaf03c057542421d4`,
with no carriage returns, **before** any C file is written. The earlier
Windows CRLF output remains separately pinned at 2,189,927 bytes/SHA-256
`373f735cd13c42b2a2f307646bfd08931c93e0fc599c362a12676ffdc4a77281`.
The retained Windows artifact has exactly 270 CRLF pairs and no lone CR;
replacing those pairs with LF gives exactly the Linux-reported length and
digest. This was checked from the actual retained Windows artifact with
`BEND_REVIEW_WINDOWS_C=<absolute path to NativeCLI.c> node .../test.mjs`,
not from a synthetic approximation. The first
[Linux export attempt](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5922864402)
stopped at the older Windows-CRLF-only gate before writing C; its failure
artifacts remain historical. The newly pinned Linux LF source-export and
native executable tests subsequently ran once. Any other output
or mixed EOL remains a terminal diagnostic, not authority to reuse bytes.

The second phase requires an explicit already-installed Clang 18+ path on
the same Linux host. It rebinds the source receipt, compiler and C bytes,
uses one CPU thread and fixed C11/O2/pthread/math flags, verifies ELF target,
then runs isolated program-only, `help`, runtime `-- help` (exactly compared
with direct `help`), runtime `-- --help`, and
`new B prompt` → `move 3980` → new-process `show` cases. Rotating save-slot
sequences and hashes are recorded. Each subprocess has a bounded output and
deadline. A leader is signaled only through its live child handle before an
observed `exit`; an ambiguous descendant/group is **not** killed by numeric
PID and stops the run for owner-reviewed recovery. No run or artifact is
silently retried or overwritten.

From a clean Linux source checkout with the exact toolchains present, first
run the source-only tests and a separately supervised lifecycle fixture:

```sh
BEND_NO_TELEMETRY=1 node --check bend2/toolchain-patches/native-cli-2032/linux-smoke/export-c.mjs
BEND_NO_TELEMETRY=1 node --check bend2/toolchain-patches/native-cli-2032/linux-smoke/native-smoke.mjs
BEND_NO_TELEMETRY=1 node bend2/toolchain-patches/native-cli-2032/linux-smoke/test.mjs
BEND_NO_TELEMETRY=1 node bend2/toolchain-patches/native-cli-2032/linux-smoke/materialization.test.mjs
BEND_NO_TELEMETRY=1 node bend2/toolchain-patches/native-cli-2032/linux-smoke/lifecycle.test.mjs
```

Only after exact host/process/resource admission and those gates pass, run
`node bend2/toolchain-patches/native-cli-2032/linux-smoke/export-c.mjs` once
under an owner supervisor. It prints a unique absolute ignored `runDirectory`.
Recheck the produced source/C receipt, then run
`node bend2/toolchain-patches/native-cli-2032/linux-smoke/native-smoke.mjs
<runDirectory> --clang <absolute-Clang-path> --clang-sha256 <independent-hash>`
once. The exact Linux Node v22.23.1 executable bytes and absence of inherited
Node flags/preloads are required; a different runtime needs separate review.
The Clang query, compile and application subprocesses retain bounded outputs,
exit states, hashes and partial failure artifacts. Host-level supervision
must preserve uncertain child/descendant state and the exact claim; do not
reclaim a claim or delete an output merely because a timeout elapsed.

The [fresh Linux result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5924048963)
passed the LF C export and Clang18 link: exact local C was 2,189,657 bytes,
and the x86-64 ELF was 1,831,568 bytes/SHA-256
`91fe043c4d428f1b4e1321a66b28954bee73d79ad25391f1daae27408c604350`.
Program-only and `help` passed. The `-- --help` process exited 0 but the
smoke stopped at an exact stderr oracle mismatch: `Unknown command.\n\n`
versus one expected LF. `NativeCLI.bend` supplies an LF to `IO.print_err`,
and the pinned and derived C `io_errs` effects append another LF. The
versioned harness now requires exactly two LFs and rejects the old one-LF
oracle in its pure test. The stopped run, ELF, and failure receipts are
retained; write/restart has **not** run. A new isolated export/compile/smoke
one-shot is needed; the prior run may not be overwritten or silently resumed.
The added `-- help` case tests the separator with a distinct valid command;
the unknown-command output alone cannot prove the identity of the `--help`
operand. The source-literal test reads the exact `3080ad5` Git blob, not the
current application working file.
Even a full pass proves only
this 2.0.32 CPU CLI/argv/restart slice, not native GUI, PCM, GPU,
mathematical/BendTT proof, browser, pin amendment or release acceptance.
