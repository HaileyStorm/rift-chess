# Native Bend Window checkpoint

`NativeSmoke.bend` uses the pinned Base `App.run` Window loop, returns a uniform
Bend `Image`, and closes on Esc or the window manager's Close event. The exact
source emitted C and built as a Linux x86-64 ELF with WSL Ubuntu Clang 18 and
X11 development headers. A bounded WSLg run found its visible 256×256 window,
captured the expected orange pixel, sent WM_DELETE_WINDOW and observed exit 0.
The [receipt](receipt.json) binds source, C, ELF and [frame](window.png) hashes.

Rebuild from the project root with `BEND_NO_TELEMETRY=1` and the pinned wrapper,
emitting into a fresh ignored directory:

```powershell
node bend2/tools/bend.mjs bend2/NativeSmoke.bend --check-only
node bend2/tools/bend.mjs bend2/NativeSmoke.bend -o .artifacts/bend2/native-smoke-rebuild/native-smoke.c
```

On WSL Ubuntu with `clang-18` and `libx11-dev`, copy the C into a unique ext4
directory, then compile with `clang-18 -std=c11 -O2 -pthread native-smoke.c
-lX11 -lm -o native-smoke`. Run from that directory under WSLg with a bounded
`timeout --signal=INT --kill-after=5s 120s ./native-smoke`; close its window
with Esc or the window manager. The source-bound local build/observer scripts
and raw logs are retained in the ignored artifact paths named by the receipt.

This checkpoint proves the native graphical toolchain and one actual Window
effect on this Windows/WSL host. It does not prove the full `Native.bend` game,
native audio/file effects, GPU use, or distribution packaging. The full GUI C
emitter remains a separate open gate.
