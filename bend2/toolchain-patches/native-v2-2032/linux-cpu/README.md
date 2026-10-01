# Bend 2.0.32 NativeV2 Linux CPU candidate

`build.mjs` is a separate, Linux-only source-to-ELF/package path for the exact
event-patched NativeV2 candidate. Its closed registry retains
`legacy-216567d9` as the default for existing invocations and adds the explicit
`current-visual-45d7041e` profile for the newer board/picking sources. The
current-visual profile pins commit `45d7041ea1e11db48017db96b886b24b60d501d3`,
tree `5fe960b1ccbedf97c2460c4b7c2a63a124a3ce24`, and exactly 303 tracked Bend
files; the legacy profile remains commit
`216567d9cdc927cf0b4e00632a80260f9901f4fa`, tree
`4fa21705820578137a6c2cb7dfaa41b413c23567`, and 284 files. No caller-provided
hashes or fallback profile selection are accepted. Both profiles require the
same exact NativeV2 original/postimage and events patch, and verify all other
tracked source bytes against their selected Git tree. It does not use or alter
the canonical 2.0.27 compiler pin, the upstream checkout, frozen Laws, or the
published app. It requires a committed clean caller checkout and the isolated
candidate with only the exact events patch working-tree change.

The default remains the legacy profile for old callers. To select the exact
current-visual candidate, pass its registry ID explicitly:

```sh
BEND_NO_TELEMETRY=1 node bend2/toolchain-patches/native-v2-2032/linux-cpu/build.mjs --candidate /absolute/path/to/current-visual-event-patched-candidate --profile current-visual-45d7041e
```

The selected profile ID, source commit/tree, and tracked-file count are bound
in the build plan, source/Worker results, and package receipt. A profile
mismatch stops before emission; an omitted profile never upgrades a
current-visual candidate implicitly.

The harness checks the selected profile's full Bend source set against its
Git tree plus the bound NativeV2 patch postimage; it binds the clean 2.0.32
scout, LF-derived compiler/Base, and clean 2.0.27 pin; source-loads and
`book_valid`s that isolated entry; blocks `fetch`; and rechecks the bindings
around emission. It requires at least 88 GiB headroom from both host
`MemAvailable` and every visible cgroup-v2 ancestor, sampled once at
preflight and again immediately before C emission. Unreadable accounting is
retained with phase/time/error evidence and stops the build; every visible
cgroup ancestor must be readable. The Bend source check and compiler emission
run inside [`emit-worker.mjs`](emit-worker.mjs), an ESM Node Worker created with
`resourceLimits.stackSizeMb: 64`. The supervisor retains its original thread ID,
requires an observed successful exit, and records the configured stack limit.
It probes installed Clang 14+ for X11/ALSA headers and link libraries, emits LF
C, links an x86-64 ELF, validates the ELF identity, validates manifest-bound
runtime assets/licenses, and stages them into a unique package directory.

Every generated file lives below an ignored, unique
`.artifacts/bend2/native-v2-2032-linux/run-*` directory. No previous output is
reused or overwritten. The supervised Node process has a 10-minute bound;
the 64-MiB source/emission thread has a shorter deadline and termination grace.
Clang children are separately supervised. On failure, partial outputs,
process output and failure receipts are retained. Only the owned live child
leader is signaled; an ambiguous process group remains an owner-recovery issue
and must not be reclaimed from elapsed time alone.

Run the non-emitting gates first (from the repository root):

```sh
BEND_NO_TELEMETRY=1 node --check bend2/toolchain-patches/native-v2-2032/linux-cpu/common.mjs
BEND_NO_TELEMETRY=1 node --check bend2/toolchain-patches/native-v2-2032/linux-cpu/build.mjs
BEND_NO_TELEMETRY=1 node --check bend2/toolchain-patches/native-v2-2032/linux-cpu/emit-worker.mjs
BEND_NO_TELEMETRY=1 node bend2/toolchain-patches/native-v2-2032/linux-cpu/test.mjs
BEND_NO_TELEMETRY=1 node bend2/toolchain-patches/native-v2-2032/linux-cpu/lifecycle.test.mjs
```

Then, once on the prepared Linux host under the owner supervisor:

```sh
BEND_NO_TELEMETRY=1 node bend2/toolchain-patches/native-v2-2032/linux-cpu/build.mjs --candidate /absolute/path/to/legacy-event-patched-candidate
```

The output records a source-check result, C bytes/hash, Clang dependency/link
receipts, x86-64 ELF hash, staged asset hashes, and package receipt. Do not
re-run over that output. This path intentionally does **not** launch the app:
GUI framing/input, PCM/audio, persistence/restart, GPU, visual acceptance,
frozen proof completion, pin amendment, and release remain separate gates.
The existing 2.0.27 builder and its historical emitted-C hash are not used as
acceptance evidence for this 2.0.32 candidate.

The separate [Linux interactive gate](interactive/README.md) consumes only a
completed, hash-bound package from this builder. It checks a real X11 frame,
move/orbit/wheel input, rotating save/preferences slots, graceful close and
same-data-dir restart. Routed PCM requires an explicit existing capture route;
without it the GUI/restart result is partial and exits nonzero. Its portable
contracts pass, but no 2.0.32 package or live X11/ALSA run has passed yet.
