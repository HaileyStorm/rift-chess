# Experimental graphical Native entrypoint

This document's `Native.bend` behavior and 2026-09-23 emitter attempt are
historical evidence for the first graphical adapter. They do not describe a
working full-game native binary. The newer `NativeV2.bend` is an unreleased
`App.run` composition of the Bend controller, `BoardScene`, and the same
`MenuAA`/`FontPack` source used by the browser worker. Its native platform
adapter remains unverified: no NativeV2 C or game ELF has been produced in this
continuation. The pinned 2.0.27 toolchain has built and run a separate WSLg X11
smoke ELF; WSL Clang 18 and X11 development headers are available. Neither the
smoke nor the text CLI proves NativeV2's game, Audio/File effects, rendering
parity, or idle CPU cost.

## 2026-09-25 NativeV2 continuation

The checker exposed and the source was corrected for repeated affine values,
forward references to `tick`, `read_import_choice`, and `runtime_exit`, a
repeated `slot` and `theme` use, and a typed `TickNext` construction. A later
check then found duplicated `effect_inputs` in `tick_continue`; that binder was
made reusable, but this last source fix has not been checked. The current
MenuAA/font/sprite adapter edits below were not checked on Windows.

The four recent whole-book checks reached peaks of 7.22, 7.17, 7.98, and 7.16
GiB; their minimum free physical-memory readings were 0.03, 0.13, 0.37, and
0.01 GiB on this 16 GiB Windows host. Logs and telemetry are in the ignored
`.artifacts/bend2/native/2026-09-25/` directory. Do not rerun a whole NativeV2
check or emit its C on this host without a different memory strategy. The
previous NativeV2 C-emission attempt exceeded 480 seconds and produced no
artifact; it predates these source fixes and the MenuAA adapter.

On the larger Linux host, the exact `c6c2910` whole-book check exited 1 after
7.339 seconds with its first diagnostic at `menu_chrome`: `size` was passed to
both `MenuAA.controls_chrome` and `MenuAA.dynamic_chrome` without a reusable
binder. Peak process-tree use was 7.00 GiB with about 99.38 GiB available. The
working source now marks both repeated `depth` and `size` reusable in that
helper. A source-only affine audit also marked `sprite_file_size_result`'s
`max_bytes` reusable because it feeds both the size comparison and bounded
read path. No post-fix check or C emission has run yet.

The pinned Bend 2.0.27 native C compiler emits one book-local executable and does
not support separately checked Bend C modules linked into one game binary, so
every imported definition remains in the source-check closure. The first
source-closure candidate is to separate the RGA2 sprite cluster from
`BoardScene`: the `PieceSprites`/`PieceAssets` imports, sprite renderer and
placement helpers around `fast_sprite_pieces512` / `fast_sprite_feedback_*`,
and the page request/decode exports. A game-owned sibling module can hold that
cluster with both the browser helper and NativeV2 importing the same source.
Because parity keeps this cluster in the native source closure, the extraction
alone is not a final memory reduction; a legacy-renderer split or larger-host
check still needs measured evidence.
An in-tree Bend2 call-site scan found no callers beyond their declarations for
`BoardScene.render512`, `render1024`, `render512_asset`, `render1024_asset`,
`fast_overlay512/1024`, or `fast512/fast1024`. Those public wrappers are the
first candidate set for a separate optional/legacy renderer module, pending an
external-compatibility review; shared helpers stay in place until their call
graph is mapped. This is a source search, not a proof of no external consumer.
An earlier WSL query during memory pressure failed with Windows error
`0x800705aa`, which is contention evidence rather than a source defect.

The read-only WSL capability probe found Ubuntu 24.04 x86_64 and Clang 18.1.3,
but no `libasound2-dev`, ALSA header/library, or `pkg-config`. No package was
installed. NativeV2 reaches Base `Audio.open`, whose pinned Linux effect uses
ALSA; revisit that dependency only after a checked C artifact makes an ELF
build practical. The older NativeSmoke ELF only exercises Window/X11.

`NativeMini.bend` remains a diagnostic, not a parity target. Its prior WSLg
capture shows a 256×256 flat top-down board with holes and piece silhouettes;
the retained image is
`.artifacts/bend2/native/2026-09-25/native-mini-after-white-shift.png`. The old
ELF proved White d2–d4, Black d7–d5, a White hole shift, and Escape-to-zero
exit, but it predates the source title change to “Rift Chess Experimental
Native Mini.” Rebuild it before using that label as visible-window evidence.

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

## NativeV2 asset and recovery boundary

`NativeV2.bend` composes the same Bend controller, `BoardScene`, `MenuAA`,
`ChromeData`, `ChromePlan`, and `FontPack` used by the browser worker through
Base `App.run`. It keeps separate board, motion-preview, base, control/dynamic
chrome, and output images; the controller's presented input path owns square
selection, while the native host forwards untransformed pointer coordinates
for orbit. `MenuAA.base_chrome`, `controls_chrome`, `dynamic_chrome`, and
`compose` now replace the older `ChromeRaster` calls. Native cache reuse calls
the same `MenuAA.same_base` and `same_static` predicates as the browser worker;
non-play modes route through `MenuAA.render` as the browser does. At startup the
adapter reads the game-owned font path with a one-byte overlength sentinel, pads up to
the decoder's 262,144-byte bound as a power-of-two `Array`, and calls the same
Bend `MenuAA.load_font` decoder as the browser. Missing/rejected font bytes use
the renderer's empty-font fallback and log a diagnostic.

The native cache also retains the theme plate returned by the game-owned
`Assets.asset_ids(theme)` request. It opens that request's `path` verbatim with
Base `File.open` and reads `max_bytes` through `File.read_bytes`; the request
bound includes the codec's overlength sentinel. Native code does not map theme
IDs to filenames. If a plate is absent, unreadable, or rejected by the Bend
decoder, the scene uses its procedural fallback and logs a nonfatal diagnostic.
Both image and font paths are relative to the working directory containing the
packaged `assets/` directory.

The Bend2 v2 draft packager copies the requested runtime plates to
`.artifacts/bend2/v2-preview/dist/assets/`. Launch the native executable with
that `dist` directory as its current working directory so the unchanged
`assets/...` request paths resolve. The ELF may live elsewhere and be launched
by absolute path. This is the exact repository draft output path; another
packaged output must likewise be the working directory containing its `assets`
directory. Initial plate reading and decode are synchronous before the window
opens, and a theme change performs one synchronous file read after closing
Audio, then reopens Audio while preserving queued PCM. Startup and theme-switch
latency have not yet been measured.

NativeV2 also uses the alternating, sequence-framed `.b` journal for Save,
Preferences, and Recovery. Its new `tests/native-v2-journal.mjs` gate exercises
the Bend parser and target selection with a complete old record and an
incomplete newer record, missing versus empty slots, retained damaged bytes,
read errors, and slot rotation. That is a pure emitted-JS fixture: it does not
kill a native process during `File.write`, verify a native restart, or test an
OS-level read failure. Those native interruption/read-error cases remain a
separate ELF gate and must run in an isolated `RIFT_CHESS_DATA_DIR` after the
graphical binary exists.

NativeV2 now has a source path for the same three RGA2 fast-piece pages used by
the browser: it takes `BoardScene.sprite_asset_ids()`, checks each file size
against the game request, reads with one extra rejection byte, and calls
`BoardScene.load_sprite_pages()`. When all pages decode, the settled board
preparation makes a 512px underlay plus `settled_ground512`, then calls
`fast_sprite_pieces512` and `fast_sprite_feedback_static512`; the 1024 tier
uses the same `nearest2` upsampling of that completed 512px layer as the
browser. Camera motion uses the browser's 128px underlay and
`fast_camera512` preview path; any missing or rejected page set falls back to
`fast_prepare*`. Native loading is synchronous at startup while the browser
helper is asynchronous, so startup latency and transition timing still differ.
This is source-level path reuse only: the adapter changes have not passed a
whole-book check, emitted C, or run on WSLg, so no rendered parity claim is
established. A checked source closure and practical C-emission result are
prerequisites to the ELF and real-input gates before NativeV2 can be called a
native game. Base X11 `Window.frame` traverses the visible pixel
surface at its frame cadence even when a packet is unchanged, so actual native
idle-CPU and pointer-latency measurements are required before any responsiveness
claim. The older adapter below remains as compatibility and provenance until
the replacement is executable and its recovery behavior is verified.

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
