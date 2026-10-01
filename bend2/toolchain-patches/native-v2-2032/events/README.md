# Bend 2.0.32 NativeV2 event adapter

`0001-native-v2-events.patch` adds only the `Look` and `Scroll` cases to
`NativeV2.events_go`. It is a separately versioned source candidate for a
2.0.32 application closure; do not apply it to the canonical 2.0.27 source or
toolchain. Its exact patch SHA-256 is
`28ec36660b3d78c2373b5ff0591385e7a6cc39e6fd33cb9a2a1732d0a01ad2fa`.

`Look` is explicitly ignored because NativeV2 never calls `Window.grab` and
there is no game input for look motion. `Scroll` becomes `T.Wheel` using only
vertical `dy`; horizontal `dx` has no game/UI analog and is ignored. The
adapter maps `dy` to `-100 * dy`: in the hash-bound 2.0.32 X11 `window.c`,
wheel button 4 emits `dy = +1` (up) and button 5 emits `dy = -1` (down).
The browser host forwards `WheelEvent.deltaY`, where up is negative. This sign
therefore matches the browser input convention. The scale maps one X11 notch
to a conventional 100-unit wheel delta. `Program.wheel_view` applies
`zoom - delta * 0.025` and clamps zoom to 75–130; the existing UI bounds the
effective camera zoom for large input.
This scale is a **Linux X11 candidate**: the same upstream window effect also
passes raw macOS scrolling deltas, whose magnitude need not be one X11 notch.
Do not adopt this mapping for macOS without a separate native-device review
and input-unit calibration.

Run the source and pure-mapping preflight from the repository root:

```powershell
node bend2/toolchain-patches/native-v2-2032/events/preflight.mjs
```

This is a Windows-only raw-byte gate: the 2.0.32 source pins bind the checked
Windows checkout's CRLF bytes. A separate Linux LF/CRLF-aware exact-source
check now lives in `source-check.mjs`; this Windows preflight is not that gate.

It binds the exact current `NativeV2.bend`, UI input type/wheel function and browser host,
plus `base.bend` and `effs/window.c` from pristine Bend 2.0.32 commit
`573002f01ec6c52416d44489543f69a9625facf8` under
`.artifacts/toolchains/bend-2.0.32-scout`. It verifies patch bytes and added
lines and the scout's clean Git state, then runs `git apply --check` without changing the working tree. Its
pure controls exercise the event-to-input mapping and zoom direction; they do
not execute Bend or claim typechecking, compiler emission, GUI interaction, or
native behavior.

The isolated 2.0.32 application candidate now has this patch applied. Its
initial Linux source-load attempt reached the main-thread loader and failed
with `Maximum call stack size exceeded` before C emission. Remaining evidence
includes rerunning the source/type check with the bounded worker and the
supported Linux C emission/build and GUI-input, PCM, and restart gates. No
full NativeV2 check/emission, native build, GPU run, provider contact, or
toolchain/pin change is part of this preflight.

The original Linux `source-check.mjs` is retained for the historical
pre-height/pre-rift-pick candidate. For the current 303-source visual tree at
`45d7041ea1e11db48017db96b886b24b60d501d3`, use the separately pinned
[`current-visual` gate](current-visual/README.md) in an isolated candidate.
Neither the older PASS nor the new portable controls establish a current-source
Linux result.

The original Linux `source-check.mjs` accepts only an absolute, isolated Git
candidate at commit `216567d9cdc927cf0b4e00632a80260f9901f4fa` with
this exact patch applied to `NativeV2.bend` and no other changes. It binds
the postimage SHA-256
`9fe46e219123e3f59958de98c6f9b65fc618cca85ca0325740dffc30e8aef292`,
every tracked Bend source against that Git tree, the clean 2.0.27 pin,
pristine 2.0.32 scout, LF derived compiler/Base, exact Node 22.23.1 runtime,
the actual loaded import closure, and the hashes of both gate scripts. The
compiler import, `book_load`, and `book_valid` run in
`source-check-worker.mjs` configured with requested `resourceLimits` of a 64 MiB
thread stack and an 8192 MiB old-generation heap, a 120-second owned timeout,
and an observed exit/result pair. The parent’s exact
`--max-old-space-size=8192` flag is not forwarded as Worker `execArgv` (Node
rejects that V8 flag there); the worker receives an empty `execArgv`. The
receipt labels these as configured requests only; it does not claim an
independent measurement of effective heap under the parent flag. The worker
environment is an explicit
allowlist containing only `BEND_NO_TELEMETRY=1`. Portable controls launch a
child Node process with the parent heap flag and canary values for
`NODE_OPTIONS`, `NODE_PATH`, `PATH`, `BEND_LIB`, `BEND_HUB`, `HOME`, and a
synthetic secret, then require a synthetic source Worker to start and finish
without inheriting those values. A separate lifecycle control verifies that
an invalid timeout is rejected only after the worker has been terminated and
its exit observed.
The parent still checks the exact closure and repeats all source/compiler/patch
identity checks after worker exit. If Node rejects worker termination before an exit event is observed,
the gate fails with exit state explicitly unknown and retains its exit
observer; that is not treated as worker quiescence. With
`BEND_NO_TELEMETRY=1`, run it only on Linux under a separate owner supervisor
and source/memory admission:

```sh
BEND_NO_TELEMETRY=1 node --max-old-space-size=8192 bend2/toolchain-patches/native-v2-2032/events/source-check.mjs /absolute/isolated/event-patched-checkout
```

Portable worker lifecycle controls can run on Windows or Linux without
emitting C or touching the toolchain:

```sh
node bend2/toolchain-patches/native-v2-2032/events/source-check.test.mjs
```

The one-file `materialization.test.mjs` checks the patch postimage in a
fresh ignored directory and cleans only its own verified files on success.
It passed on Windows; Linux has not run it. The earlier Linux source check
reached the main-thread loader but failed with `Maximum call stack size
exceeded` before C emission. A later bounded-worker attempt failed before
loading source because Node rejected the parent's `--max-old-space-size=1024`
when it was forwarded as Worker `execArgv` (`ERR_WORKER_INVALID_EXEC_ARGV`).
Keep both failed receipts as historical evidence. The exec-argv correction
and explicit Worker limits have a portable child-process regression. A distinct
Linux one-shot reached the repaired Worker but stopped at its 1024 MiB requested
old-generation limit with an observed `ERR_WORKER_OUT_OF_MEMORY` exit in 7.111 s,
before producing a source/type receipt. This 8192 MiB revision retains the same
Worker lifecycle and strict source/closure bindings. Its
[distinct Linux result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5933439172)
passed one observed source/type Worker after two host/effective-cgroup
admissions over 24 GiB: 82 loaded files, 3,060 definitions, zero holes/fetches,
and no C emission. That pass does not validate C emission,
the new 2.0.32 Window/Audio effect ABIs, GUI input, PCM routing, restart,
GPU, frozen proofs or a pin amendment.
