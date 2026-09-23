# Experimental graphical Native entrypoint

`bend2/Native.bend` is an experimental browser-independent graphical host for
the Bend application facade. It uses only the pinned Base effects (`Window`, `File`, `Audio`,
`IO.sleep` and `IO.print`) and the pure `Application.boot`/`dispatch` API. The
window host presents the 1024-square image at a 1024 by 800 logical desktop
size; the renderer may clip the lower part of the square image in the native
window. The application still owns its responsive 512 by 1024 mobile layout
when a smaller size is supplied by another host.

The native adapter translates the pinned `window_frame.c` event stream into
`ui/Types.bend` inputs. Key presses and releases preserve `down`; Enter is 13,
Escape is 27, arrows are normalized to Left 37, Up 38, Right 39 and Down 40,
and ASCII letters are uppercased before dispatch. Alt is tracked across its
press/release pair so the existing camera controls remain available; each
left/right modifier has its own mask bit, so releasing one held key does not
clear its sibling. Pinned Ctrl and Super keycodes are tracked together and set
the `ctrl` field on every translated key input. Mouse coordinates are the
logical frame pixels, with left button 0 and right button 2. A close event
exits after closing audio and the window.

Each frame dispatches a `Tick` from the elapsed `IO.now()` millisecond clock,
clamped to 240 ms so a suspended window cannot jump the animation indefinitely.
`Packet.after` is the requested idle delay and is passed to `IO.sleep` after
effects and presentation have completed. The adapter presents every packet
through `Window.frame`; the packet's `dirty` bit is retained by the facade for
hosts that can skip a redraw.

Effects are deliberately narrow:

- Store slot 0 writes `save.json`, slot 1 writes `prefs.json`, and slot 2 writes
  `recovery.json` through alternating `.b` snapshots. The inactive slot is
  written with a sequence and complete end marker, then closed; boot chooses
  the highest complete sequence and keeps the prior snapshot after a partial
  write. Payloads are escaped behind a data tag so literal begin/end marker
  lines remain data. Canonical records are capped at 2 MiB; escaped journal
  reads allow framing overhead up to 4.2 MB. Missing slots are a clean first
  launch. Format damage (`9002`) in an inactive slot is repairable: a valid
  alternate snapshot loads normally and the damaged slot is the next write
  target. If no valid snapshot exists, the same code preserves the rejected
  bytes and forces recovery without treating the file as a clean first launch
  (`9001` remains the application’s 2 MiB import-limit code). Other non-missing
  read errors preserve their native code for preference diagnostics; a saved
  slot read error is normalized to `Types.PortError{9003}` at boot so the
  application enters blocked recovery without pretending to have a clean
  first launch. Preference-slot read failures are normalized to
  `Types.PortError{9004}` so the application can keep the saved match and use
  default preferences.
- Download writes the requested filename using the same file API.
- PickFile reads `rift-chess-record.json` and dispatches `FileText`; this is a
  documented native convention, not a browser file picker.
- OpenUrl prints the URL for a platform helper or terminal wrapper to handle.
- Sound maps the UI notes into the generic `lib/audio/Synthesis.bend` tones,
  renders mono samples at 48 kHz, queues them at the host boundary, duplicates
  them into interleaved stereo and writes at most 2,048 frames (4,096 float
  values) per frame after querying the pinned ring occupancy. This avoids
  blocking `Window.frame` on long notes and never writes past the 4,096-frame
  ring. Audio opening is best effort: an unavailable device is printed and the
  game remains playable without sound.

No custom C or JavaScript is embedded in this entrypoint. The pinned source
check passes, but full graphical C emission did not finish within the bounded
600-second attempts. There is no emitted graphical C artifact to hand off. Use
the separate [supported text CLI](NATIVE_CLI.md) for the browser-independent C
export. This file remains useful as the source-level graphical adapter and as
preserved evidence for a future rendering-target investigation.

## Graphical emitter evidence

The source check and a small emitter comparison are bounded diagnostics:

```powershell
$env:BEND_NO_TELEMETRY = "1"
node bend2/tools/bend.mjs "$(Resolve-Path bend2/Native.bend)" --check-only
node bend2/tools/native-c-emitter.mjs --compare
```

The Native source check reported 32 unsafe/foreign effect-boundary definitions,
which are the standard Base Window/File/Audio implementation boundary. The
small IO parity probe emitted byte-identical C with the pinned Bun CLI and the
unchanged compiler API in a Node 24.12 worker with a 64 MiB stack. Its receipt
records compiler, Node executable, and C-source hashes. It establishes parity
for that small sample only.

The full Native graphical entrypoint was then attempted through the same pinned
`book_load`, `book_valid`, `book_owned(SYNTH)`, and `compile_book` APIs. The
bounded Node worker timed out after exactly 600,000 ms while computing the
generated C string. Its last observed working set was 3.13 GiB with 1.13 GiB
free physical memory; the process exited and memory recovered. It writes only
after code generation finishes, so no partial `.c` file was left. The retained
failure record is
`.artifacts/bend2/native/2026-09-23T03-20-02-304Z/emit-c.failure.log`.

```powershell
node bend2/tools/export-native.mjs --experimental-gui-c
```

The flag is required to repeat the experimental graphical attempt; invoking
the script without it stops immediately and directs users to the CLI export.
The worker is diagnostic only. Browser and supported native-source generation
remain on pinned Bun, and the frozen compiler and proof sources are unchanged.

The focused pure adapter gate exercises exact marker-looking payloads, partial
trailing snapshots, clean missing slots, corrupt and non-missing-error slots,
100k-character escaping with Unicode/newlines/backslashes, and the stereo
chunk bound. Because the pinned loader resolves its standard effects from its
own directory, run it with that directory as the working directory:

```powershell
$project = (Resolve-Path .).Path
$bun = (Resolve-Path .artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe).Path
Push-Location .artifacts/toolchains/bend/bend2
& $bun --preload "$project/bend2/tools/loader.ts" "$project/bend2/tests/native-helpers.mjs"
& $bun --preload "$project/bend2/tools/loader.ts" "$project/bend2/tests/native-cli.mjs"
Pop-Location
```

The pure CLI gate at `tests/native-cli.mjs` separately checks both layouts,
all three draw policies, empty-hole rendering, legal move and shift labels,
promotion notation, move/Undo replay, off-turn draw offers, and resignation.
It does not substitute for native device playtesting. This Windows environment
has the upstream-supported WSL Ubuntu distribution, but it has no `clang`,
`gcc`, or `cc`; no compiler was installed. The browser-independent CLI C
artifact and its receipt are tracked separately in [NATIVE_CLI.md](NATIVE_CLI.md).
