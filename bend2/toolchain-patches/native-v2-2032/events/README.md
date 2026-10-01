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
preflight remains pending; this script is not a portable cross-host gate.

It binds the exact current `NativeV2.bend`, UI input type/wheel function and browser host,
plus `base.bend` and `effs/window.c` from pristine Bend 2.0.32 commit
`573002f01ec6c52416d44489543f69a9625facf8` under
`.artifacts/toolchains/bend-2.0.32-scout`. It verifies patch bytes and added
lines and the scout's clean Git state, then runs `git apply --check` without changing the working tree. Its
pure controls exercise the event-to-input mapping and zoom direction; they do
not execute Bend or claim typechecking, compiler emission, GUI interaction, or
native behavior.

Remaining evidence includes applying this patch in the isolated 2.0.32
application candidate, source/type checking that candidate, and the supported
Linux C emission/build and GUI-input, PCM, and restart gates. No full NativeV2
check/emission, native build, GPU run, provider contact, or toolchain/pin
change is part of this preflight.
