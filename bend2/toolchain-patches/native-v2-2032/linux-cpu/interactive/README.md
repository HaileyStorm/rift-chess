# Bend 2.0.32 NativeV2 Linux interactive gate

`run.mjs` consumes an already built package from the isolated 2.0.32 CPU path.
It does not build, patch, copy, or otherwise modify the ELF/package, compiler,
candidate, saved inputs, or published TypeScript application. It is intentionally
Linux/X11-only and requires existing `xdotool`, `xwininfo`, `xprop`, and
ImageMagick `import` on `PATH`. There is no headless mode, synthetic-input
fallback, installation, or alternative screen-capture route.

The runner rechecks the supplied package-receipt SHA-256 and the build's
`process-success.json`, the explicitly selected closed candidate profile and
its exact commit/tree/source count, emitted C, x86-64 ELF identity/hash, runtime
manifest and every staged asset before launch and after both sessions. The
legacy `legacy-216567d9` profile remains the default for old invocations and
historical receipts without a profile field. The newer
`current-visual-45d7041e` profile must be selected explicitly; a package, source
receipt, candidate, or count from another profile is rejected. The selected
package receipt hash
must be supplied separately; use the exact hash printed by `build.mjs` (or its
retained `process-success.json`), not a newly generated hash from an unreviewed
replacement receipt.

Run after the source-bound CPU build has passed, from a clean caller checkout on
the Linux X11 desktop that owns the visible session:

```sh
node bend2/toolchain-patches/native-v2-2032/linux-cpu/interactive/test.mjs
BEND_NO_TELEMETRY=1 node bend2/toolchain-patches/native-v2-2032/linux-cpu/interactive/run.mjs \
  --candidate /absolute/path/to/current-visual-event-patched-candidate \
  --package /absolute/path/to/build-run/package/receipt.json \
  --package-sha256 <exact-64-character-package-receipt-sha256> \
  --profile current-visual-45d7041e
```

For the routed PCM gate, configure the game's existing ALSA output route outside
this runner and set `RIFT_CHESS_PCM_DEVICE` to the explicit existing ALSA capture
PCM that observes that route. For example, a preconfigured ALSA loopback capture
device may be named `hw:Loopback,1,0`; that example is not a route recommendation
or a claim that the current host has it. Do not install `snd-aloop`, edit ALSA
configuration, create a monitor, or default to `default`; the gate performs no
routing setup or device discovery. The three-second move capture begins only
after the selected-piece image is retained and immediately before e4 input; the
receipt includes capture-start, input and capture-completion timestamps and
requires the actual input to fall inside the bounded capture interval.

```sh
RIFT_CHESS_PCM_DEVICE='hw:Loopback,1,0' BEND_NO_TELEMETRY=1 \
node bend2/toolchain-patches/native-v2-2032/linux-cpu/interactive/run.mjs \
  --candidate /absolute/path/to/current-visual-event-patched-candidate \
  --package /absolute/path/to/build-run/package/receipt.json \
  --package-sha256 <exact-64-character-package-receipt-sha256> \
  --profile current-visual-45d7041e
```

When configured, the gate requires existing `arecord`, captures two seconds of
idle and three seconds spanning an actual move at 48 kHz stereo S16_LE, and
requires a nonzero move interval whose RMS rises above idle. A capture proves
only routed PCM observation; it does not prove speaker output or physical
audibility. If no explicit route is supplied, the harness still runs the GUI,
move, camera, persistence and restart checks, but writes a partial result,
reports `nativeGuiPcmAcceptance: false`, and exits with status 2. A configured
route that cannot capture or fails the strict idle/move test is a failure, not a
silent skip. If all GUI/restart checks pass without an explicit route, the
runner preserves an `interactive-result.json` with `guiRestartPassed: true` and
`nativeGuiPcmAcceptance: false`, prints `ok: false`, and exits 2. That receipt is
partial evidence, not a passing native GUI+PCM gate.

The GUI path creates one unique ignored directory under
`.artifacts/bend2/native-v2-2032-linux/interactive-run-*` and a fresh
`data/` subdirectory used only through `RIFT_CHESS_DATA_DIR`. It launches the
verified ELF directly with exactly `--gpu off`, checks the live `/proc` ELF,
argv, working directory, data-directory environment and process-group identity,
then exercises:

- visible `Rift Chess Bend2` client at exactly 1024×640 with
  `WM_DELETE_WINDOW` advertised and a nonblank captured first frame;
- a visibly changed e2 selection, e2-e4 and e7-e5 mouse inputs at source-derived
  screen points, with their exact action IDs in the native saved journal;
- a middle-button orbit and X11 wheel buttons 4/5, with direction checked in
  persisted preferences after each step;
- both exact save files and both exact preferences files (`primary` and `.b`),
  each with one complete increasing-sequence frame; a polite window close with
  observed exit code 0, drained child stdio/`close`, and no process-group or
  descendant remainder;
- a second clean launch using the exact same data directory, replayed saved
  moves/preferences, and a stable raster match after PNG decoding except for
  the two source-derived last-move floor-outline bands (`e7`/`e5`), which differ
  because the last-action highlight is not itself persisted. Piece interiors
  and every remaining pixel must match. It then performs a second observed
  graceful close.

Only a known `WM_DELETE_WINDOW` window-close request is used for normal exit.
The runner never kills or restarts an ambiguous app process. If a live child
does not map, close, or quiesce unambiguously, it preserves the run and failure
receipt, leaves the child for owner recovery, and does not treat timeout as
process termination. X11 captures, audio files, logs, data slots and result
receipts are unique and retained for review.

The portable tests are Windows-safe controls only: they do not contact X11 or
ALSA, launch a native binary, or prove Linux acceptance. Even a complete result
does not claim GPU performance, frozen-proof completion, toolchain pin
amendment, owner visual acceptance, physical audibility, or release readiness.
