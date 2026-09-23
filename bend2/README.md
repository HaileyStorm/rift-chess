# Rift Chess — the Bend2 experiment

[Play the Bend2 preview](https://haileystorm.github.io/rift-chess-bend2/) ·
[Play the original game](https://haileystorm.github.io/rift-chess/)

This is a separate, playable adaptation of Rift Chess. It does not replace the
published Three.js/Electron game. The rules, match history and adjudication,
opponent scoring, projection, picking, sprites, menus, bitmap fonts, input policy,
record codec and audio synthesis are written in Bend 2. The browser adapter only
transports events and explicit IO effects, copies Bend pixels to Canvas and Bend
PCM samples to Web Audio, and mirrors Bend controls for assistive technology.
`Native.bend` expresses the same pixel application with Base Window, Audio and
File effects, but its full C emission exceeded the bounded local run. The smaller
`NativeCLI.bend` is a browser-independent text game over the same Bend rules and
record codec; it emits C through the pinned compiler.

## Start here

- [Local Bend guide](docs/LOCAL_BEND_GUIDE.md): language, proof, runtime and browser
  notes gathered from the pinned compiler, standard library and many examples.
- [Source catalog](docs/SOURCE_CATALOG.md): primary documentation and example map.
- [Closed v2 rule laws](docs/LAWS_V2.md), with explicit proof limits, and the
  [preserved v1 laws](docs/LAWS_V1.md).
- [Reusable graphics](lib/graphics/README.md), including its colocated
  [laws and proof limits](lib/graphics/LAWS.md).
- [Browser-independent CLI export](docs/NATIVE_CLI.md) and
  [graphical native experiment](docs/NATIVE.md): distinct source and acceptance evidence.
- [Application and IO boundary](docs/PORTABLE_APPLICATION.md): which code runs in
  Bend, browser/native adapter responsibilities, and interruption-safe replay.
- [Law change policy](docs/LAW_CHANGE_POLICY.md): preserve the initial contract;
  fix implementation or proofs before considering a semantic amendment.
- [Frozen semantics](laws/semantic-v1.json), [pixel contract](laws/pixels-v1.json)
  and [proof attestation](laws/proof-v1.json).
- [Preserved verification](docs/evidence/laws-v1/readiness.json) and
  [proof/mutation receipt](docs/evidence/laws-v1/proof.json).

The initial gate passes 13 core laws, 11 image laws, all 14 reference positions
and 223 recorded successors, 33 match checks, and 21 pixel boundary checks.
Six deliberately broken copies fail the expected checker diagnostics after
their focused positive controls pass. These are source proofs and finite
reference comparisons, not a universal claim that chess, the compiler or the
browser is bug-free.

The later v2 freeze closes 134 named source laws for complete canonical legal
action enumeration, both colors, match commands, history and adjudication. It
passed 14 reference positions, 223 successors and six v2 mutation controls.
The frozen manifest and independent review receipts are in
[`laws/semantic-v2.json`](laws/semantic-v2.json) and
[`docs/evidence/laws-v2/`](docs/evidence/laws-v2/).

## Build and verify

The compiler is pinned in `TOOLCHAIN.json`. The local layout expects the upstream
checkout at `.artifacts/toolchains/bend`, at the exact recorded commit, and a
portable Bun 1.4.2. `BUN_BIN` can point to that runtime. The Windows development
setup uses the official `@oven/bun-windows-x64@1.4.2` package in the ignored
`.artifacts/toolchains/runtime` directory. Browser players need neither tool.

Run these from the **repository root**, not from `bend2/`:

```text
node bend2/tools/verify.mjs
node bend2/core/v2/check.mjs
node bend2/tools/verify-library.mjs --check
node bend2/tools/bend.mjs --run bend2/tools/build.ts
node bend2/tools/serve.mjs 4184
```

The preview is then `http://127.0.0.1:4184/`. The browser distribution is
`bend2/dist/`. Its scripts and stylesheet have content-based names, and its own
scoped service worker caches the complete application for subsequent offline
loads. Production hosting needs only static files. The existing root npm scripts
continue to build the original app; they do not build this experiment.

The preview uses a separate GitHub Pages repository and sibling URL. The original
game's offline navigation fallback would intercept an experimental subdirectory,
so nesting the preview beneath `/rift-chess/` is deliberately avoided. Its
deployment repository contains only generated files and a source link.

The normal build checks both semantic freezes and the exact proved Kernel and
proof witnesses. `--draft` is for local iteration before a new reviewed
attestation, not for a published acceptance claim. Full proof normalization can
take a couple of minutes with the pinned young checker. The proof runner uses a
bounded ten-minute child timeout for the combined v2 proof entry and retains
diagnostics; timeout is failure. The same pinned checker runs in a pinned Node
worker with a 64 MiB stack for that proof entry; application generation remains
on the pinned Bun runtime. See `core/v2/proof-runtime.json`.

The wrapper verifies compiler commit, tracked cleanliness and Bun version. It
sets `BEND_NO_TELEMETRY=1`. A small local loader normalizes Windows paths while
using the unchanged compiler's load, type, ownership and emit functions. The
upstream checkout is never patched and no Bend publishing service is used.

## Play and controls

Click a piece, then a highlighted square or its coordinate button. Empty
platforms select themselves for a Shift; a selected piece also offers **Shift
its platform** when legal. No Piece/Tile mode switch is required. Click the
visible body of a piece: nearer sprites can physically cover the floor behind
them at lower viewing angles. Coordinate buttons also reach covered destinations.

Use **Front**, **Overhead**, rotation, tilt and zoom in the play panel to choose
your view. Right-drag or Alt-drag rotates and tilts; click the board to focus it
before scrolling to zoom. The view is remembered separately from your game.
Missing platforms are open gaps, including while highlighted for a Shift.

Clicking the selected piece or platform again clears it. The menu contains table
lighting, sound, imports/exports and a short rules guide.
New matches support hotseat or a local opponent, either human color, layouts B/C
and the original quiet-draw policies. Arrows/Enter select cells; Escape clears
selection and U undoes an action. After undo in a bot game the opponent pauses,
so another undo can restore your own move; **Resume opponent** resumes it.

Hotseat Undo first requests the other player's agreement. **Agree** commits the
rewind; **Cancel** keeps the match unchanged. Local play relies on the people at
the shared device to honor the displayed roles; this is not network identity or
multiplayer authentication.

In hotseat, **Offer draw** and **Resign** let either player choose White or Black,
even when it is the other player's turn. In a bot match, those actions belong to
the human color. The opposite side may accept or decline an outstanding offer.

The record format `rift-bend-record/1` stores layout, draw policy and accepted
commands, including undo and draw/resignation commands. Loading reconstructs a
fresh Bend match and rejects any command the kernel refuses. It never accepts a
serialized Match or adjudication result. Portable imports enter hotseat for
inspection; browser-local opponent and sound preferences are stored separately.
Invalid saves retain a recovery copy and are not silently overwritten.

## What parallelism means here

The v2 move enumerator joins a balanced tree of independent canonical ID ranges
in fixed order; short leaves also respect browser recursion limits. Its exact
proof status is recorded in the v2 law document. The pixel library splits
independent image quadrants; the opponent scores balanced
candidate groups and resolves ties by canonical ID. None uses shared mutable
pixel buffers or unsafe array aliases. Input and match transitions remain serial.

The JavaScript target executes Bend fork/join expressions sequentially. A Web
Worker keeps that work off the UI thread; it does not turn the generated Bend
program into a native parallel runtime. Native CPU/GPU speed has not been
measured in this sprint. The pure command boundary is useful for future peer
verification, but no multiplayer, consensus or cheat-prevention protocol is
implemented here.

## Rendering and evidence boundaries

The complete screen is a `Pix`/`Qua` tree generated by Bend, with a 512-square
board embedded in a responsive pixel UI. JavaScript only expands colored leaves
into RGBA bytes. Static scenery, UI chrome and platform ground are cached;
camera motion uses a cheaper ground pass and restores full detail on release.
Hover, selection and animated pieces remain live. Ordinary moves hop, platform moves transport
their passengers, and captured pieces flash and break apart.

The formal pixel contract covers sampling and inert empty/outside fills.
Projection centers, edges, opaque-piece picking, browser event handling, sound,
saves, service-worker caching and actual rendered play are separate tests. The
compiler, generated runtime and browser adapters remain trusted components.
Source law proofs do not certify those devices or replace visual play-testing.

See [third-party notices](THIRD_PARTY_NOTICES.txt) for the pinned Bend Apache-2.0
library/runtime license. Sprites are project-authored and audio is synthesized.
