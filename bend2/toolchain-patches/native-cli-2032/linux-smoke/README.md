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
the actual loaded import cone before locally emitting C. The known
2,189,927-byte C SHA-256 `373f735cd13c42b2a2f307646bfd08931c93e0fc599c362a12676ffdc4a77281`
must match **before** any C file is written. A mismatch is a terminal
diagnostic, not authority to reuse Windows bytes or weaken the binding.

The second phase requires an explicit already-installed Clang 18+ path on
the same Linux host. It rebinds the source receipt, compiler and C bytes,
uses one CPU thread and fixed C11/O2/pthread/math flags, verifies ELF target,
then runs isolated program-only, `help`, runtime `-- --help`, and
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

The Windows pure contract, six-entry materialization/patch-postimage gate,
and syntax checks passed; the Linux lifecycle
fixture and both real phases have **not** run. Even a full pass proves only
this 2.0.32 CPU CLI/argv/restart slice, not native GUI, PCM, GPU,
mathematical/BendTT proof, browser, pin amendment or release acceptance.
