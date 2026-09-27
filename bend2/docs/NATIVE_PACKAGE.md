# NativeV2 Linux package workflow

This workflow produces a fresh, source-bound Linux package from the existing
NativeV2 Bend entrypoint. CPU is the default. It never installs packages, edits
the pinned compiler, changes the browser build, modifies laws or proofs, or
launches the game as part of packaging.

## Prerequisites and preflight

Run from the Rift Chess checkout on Linux x86-64. The clean compiler checkout
must match Bend 2.0.27 and the commit recorded in TOOLCHAIN.json. The project
wrapper also requires the pinned Bun 1.4.2 runtime. The Linux wrapper's default
Bun path names the Windows package, so point BUN_BIN at an already available
Linux Bun 1.4.2 executable. The script sets BEND_NO_TELEMETRY=1 for every
compiler command.

The earlier 32.22 GiB estimate is superseded for admission purposes. Linux
report comment `5858004336` measured a 72,346,644 KiB CPU C-emission peak
(about 68.995 GiB) for source revision `f8a7fbf`. That is historical evidence
for a different source, not a measurement of this package or a prediction of
the next run. Pending a fresh measurement for the current source, the interim
admission floor is 88 GiB: at least 1.25 times that reported peak, rounded up
with additional headroom.

A build samples host `MemAvailable` and every visible finite limit in the
process's cgroup v2 ancestor chain before packaging, then samples again after
the source check and exact source verification immediately before C emission.
Both samples must show at least 88 GiB under the minimum of host availability
and visible cgroup headroom. The build fails closed if `/proc`, the process's
cgroup-v2 path, or required ancestor accounting is unreadable. The sample
records its phase, UTC timestamp, host bytes, cgroup ancestor limits/current
usage, computed minimum, and limiting source in the `emissionMemoryAdmission`
object in preflight JSON and in the package receipt. If the second sample is
below the floor, `failure.json` retains its measured values; if accounting is
unreadable, it retains a structured failed-attempt record with phase, time,
floor, and error alongside the initial admission evidence.

A read-only Linux `--preflight` reports its current sample and whether the
floor is met, but does not reject the diagnostic preflight solely for low
headroom. Windows `--preflight` cannot sample Linux memory. A cgroup namespace
may hide a stricter parent outside its visible hierarchy, so this local check
alone cannot certify that ancestor's headroom; the Linux host must report its
actual mount and process-cgroup topology for the pilot. This is a protective
floor, not a guarantee that other processes will not consume memory after the
sample.
The actual [cgroup v2 root has no `memory.max` file](https://cdn.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html#memory-interface-files).
The guard treats only that verified controller root as unlimited; unreadable
non-root ancestors still fail closed, and host `MemAvailable` always applies.

The read-only preflight verifies the exact Bend import closure, the compiler
pin and wrapper version, asset manifests and bytes, a suitable Clang, and a
small X11/ALSA compile-and-link probe. It does not source-check NativeV2 or emit
C. On Windows it validates the pin, source closure, and assets, reports that
building is unavailable, and makes no output directory.

The Linux dependency probe defines `_GNU_SOURCE` before including X11/ALSA,
matching the pinned Bend-generated C. Without that feature-test macro, a
strict-C probe could spuriously redeclare `timespec` in ALSA headers even
though the real generated program links on the same host.

~~~sh
python3 bend2/tools/build-native-v2.py --preflight
~~~

## CPU package

Use a new output name each time. Relative output paths resolve from the
repository root, and every output must remain below the ignored
.artifacts/bend2/native-v2 directory. Existing output paths are rejected and
never replaced.

~~~sh
export BUN_BIN=/path/to/existing/bun-1.4.2
export BEND_NO_TELEMETRY=1
python3 bend2/tools/build-native-v2.py \
  --output .artifacts/bend2/native-v2/cpu-review-01
~~~

The script checks the source, emits C from bend2/NativeV2.bend through the
project wrapper, and records the exact emitted bytes and SHA-256 in the
receipt. It also reports whether they match the earlier clean-pin Linux
checkpoint (14,331,202 bytes,
35ab959363d2464dacb89ffe52f962d2e50daf04853cd0cd861a333b2cb0c796).
Source edits legitimately change C, so a mismatch is visible evidence rather
than a build failure. The verified import closure, compiler pin, generated C,
and linked ELF are bound in one receipt; a new build still requires its own
GUI, audio, and persistence checks.

Clang 14 or newer links the CPU ELF with the pinned Linux runtime flags:

~~~text
-std=c11 -O3 NativeV2.c -lpthread -lm -lX11 -lasound -o bin/rift-chess-native-v2
~~~

The build verifies a 64-bit little-endian x86-64 ELF. It records compiler and
source identities, every Bend import and Base effect source hash, asset
manifest hashes, commands, logs, and generated output hashes in receipt.json.
runtime-assets.json lists the exact staged asset bytes.

NativeV2 requests six runtime files: the two observatory plates, three fast
piece pages, and the font pack. The package also carries the artwork
LICENSES.md beside those files, matching the browser packager's seven-file
assets set. The font source TTF and original artwork sources are hash-checked
but are not staged. Bend, font, and third-party notices are copied into the
package's licenses directory.

The generated run-native-v2.sh changes cwd to the package so its assets/
requests resolve, and sets RIFT_CHESS_DATA_DIR to the package-local data/
directory by default. That directory is created on first launch and persists
between launches. Set RIFT_CHESS_DATA_DIR to an absolute path to keep saves
elsewhere; a relative override is resolved under the package. The launcher
starts with --gpu off. A CPU package rejects RIFT_CHESS_GPU=on.

~~~sh
cd .artifacts/bend2/native-v2/cpu-review-01
./run-native-v2.sh
~~~

The ELF dynamically links to Linux X11 and ALSA. Those development headers and
link libraries must already be available on the build host; the workflow does
not install them. CPU packaging does not run the executable or claim graphical,
audio, persistence, or human acceptance.

## Explicit CUDA-capable package

CUDA is an opt-in build mode. It requires an existing CUDA toolkit with
nvrtc.h and libnvrtc.so under CUDA_HOME, Clang 19 or newer, an accessible
CUDA device/driver, and an active external GPU-coordinator lease. The script
requires the lease identifier but cannot independently verify the grant; the
Linux operator must acquire, monitor and release it. No package or driver
installation is attempted.

~~~sh
export CUDA_HOME=/existing/cuda/toolkit
python3 bend2/tools/build-native-v2.py \
  --cuda \
  --gpu-grant-id "$ACTIVE_GPU_LEASE_ID" \
  --cc clang-19 \
  --output .artifacts/bend2/native-v2/cuda-review-01
~~~

The CUDA link follows the pinned compiler's flags: -DBEND_CUDA=1, the
CUDA_HOME include, lib64, and lib directories, the same pthread/math/X11/ALSA
libraries as CPU mode, and -lcuda -lnvrtc. It then invokes the binary's
--gpu-build mode and requires a nonempty sibling .gpu sidecar. **That command
probes a CUDA device, compiles for its observed architecture and loads the
module in its GPU context.** It is a device operation under the active grant,
though it does not run the game loop. The sidecar may not work on another GPU
architecture; build/test anew on the actual target host before claiming use.

The CUDA-capable launcher's default remains GPU off. To explicitly request the
device path for a later game run, use RIFT_CHESS_GPU=on. The sidecar build
does interact with a device under the grant, but does not prove game-frame
execution or player input on that device. A recorded external lease ID is a
binding supplied by the operator,
not proof from this script that the lease was valid or continuously held.
The sidecar build supplies CUDA_HOME/lib64 and lib to its own loader environment.
When launching a CUDA package, provide an existing CUDA toolkit through
RIFT_CHESS_CUDA_HOME or CUDA_HOME (default /usr/local/cuda); the launcher
checks libnvrtc.so and adds those directories to LD_LIBRARY_PATH for the child.
CUDA driver libraries must also be available on that host. No toolkit libraries
are copied into the package.

## Evidence boundary

The package receipt binds the files produced by this workflow; it does not
promise byte-identical ELF output across different Clang or system-library
builds. Its memory-admission samples establish only that the configured host
and visible cgroup sources met the floor at those two instants; they do not
turn the historical peak into current-run evidence or guarantee memory will
remain available. The historical C checkpoint comparison is diagnostic; the
import closure and emitted C hashes bind this package to its actual source.
The previous Linux NativeV2 CPU window, move, save/restart, and routed nonzero
PCM results are recorded in NATIVE.md. They remain separate from any package
build: rerun the bounded Linux interaction and audio checks against the
receipt-bound package before claiming that this package passed those gates.
No Windows native target is supported by the pinned compiler.
