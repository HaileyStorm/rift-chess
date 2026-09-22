# Rift Chess — the Bend2 experiment

[Play the Bend2 preview](https://haileystorm.github.io/rift-chess-bend2/) ·
[Play the original game](https://haileystorm.github.io/rift-chess/)

This is a separate, playable adaptation of Rift Chess. It does not replace the
published Three.js/Electron game. The rules, match history and adjudication,
opponent scoring, projection, picking, sprites and immutable pixel renderer are
written in Bend 2. The browser host supplies DOM controls, input, a worker,
Canvas image blitting, Web Audio and local storage.

## Start here

- [Local Bend guide](docs/LOCAL_BEND_GUIDE.md): language, proof, runtime and browser
  notes gathered from the pinned compiler, standard library and many examples.
- [Source catalog](docs/SOURCE_CATALOG.md): primary documentation and example map.
- [Rules laws in plain English](docs/LAWS_V1.md) and
  [graphics laws](docs/GRAPHICS_LAWS_V1.md): exact promises and limits.
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

## Build and verify

The compiler is pinned in `TOOLCHAIN.json`. The local layout expects the upstream
checkout at `.artifacts/toolchains/bend`, at the exact recorded commit, and a
portable Bun 1.4.2. `BUN_BIN` can point to that runtime. The Windows development
setup uses the official `@oven/bun-windows-x64@1.4.2` package in the ignored
`.artifacts/toolchains/runtime` directory. Browser players need neither tool.

Run these from the **repository root**, not from `bend2/`:

```text
node bend2/tools/verify.mjs
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
bounded five-minute child timeout and retains diagnostics; timeout is failure.

The wrapper verifies compiler commit, tracked cleanliness and Bun version. It
sets `BEND_NO_TELEMETRY=1`. A small local loader normalizes Windows paths while
using the unchanged compiler's load, type, ownership and emit functions. The
upstream checkout is never patched and no Bend publishing service is used.

## Play and controls

Click a piece, then a highlighted square or its coordinate button. Empty
platforms select themselves for a Shift; a selected piece also offers **Shift
its platform** when legal. No Piece/Tile mode switch is required. Click the
visible body of a piece: nearer sprites can physically cover the floor behind
them in the isometric view. Coordinate buttons also reach covered destinations.

The menu contains table lighting, sound, imports/exports and a short rules guide.
New matches support hotseat or a local opponent, either human color, layouts B/C
and the original quiet-draw policies. Arrows/Enter select cells; Escape clears
selection and U undoes an action. After undo in a bot game the opponent pauses,
so another undo can restore your own move; **Resume opponent** resumes it.

The record format `rift-bend-record/1` stores layout, draw policy and accepted
commands, including undo and draw/resignation commands. Loading reconstructs a
fresh Bend match and rejects any command the kernel refuses. It never accepts a
serialized Match or adjudication result. Portable imports enter hotseat for
inspection; browser-local opponent and sound preferences are stored separately.
Invalid saves retain a recovery copy and are not silently overwritten.

## What parallelism means here

`Kernel.legal_ids` joins four independent canonical ID ranges in fixed order.
The laws prove exact list parity with the frozen sequential specification. The
pixel library splits independent image quadrants; the opponent scores balanced
candidate groups and resolves ties by canonical ID. None uses shared mutable
pixel buffers or unsafe array aliases. Input and match transitions remain serial.

The JavaScript target executes Bend fork/join expressions sequentially. A Web
Worker keeps that work off the UI thread; it does not turn the generated Bend
program into a native parallel runtime. Native CPU/GPU speed has not been
measured in this sprint. The pure command boundary is useful for future peer
verification, but no multiplayer, consensus or cheat-prevention protocol is
implemented here.

## Rendering and evidence boundaries

The picture is a 512-square `Pix`/`Qua` tree generated by Bend. JavaScript only
expands colored leaves into RGBA bytes. Static scenery and platform ground are
cached; hover, selection and animated pieces remain live. Animation detail
adapts to measured rendering cost. Ordinary moves hop, platform moves transport
their passengers, and captured pieces flash and break apart.

The formal pixel contract covers sampling and inert empty/outside fills.
Projection centers, edges, opaque-piece picking, browser event handling, sound,
saves, service-worker caching and actual rendered play are separate tests. The
compiler, generated runtime and browser adapters remain trusted components.
Source law proofs do not certify those devices or replace visual play-testing.

See [third-party notices](THIRD_PARTY_NOTICES.txt) for the pinned Bend Apache-2.0
library/runtime license. Sprites are project-authored and audio is synthesized.
