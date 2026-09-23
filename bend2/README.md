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

This experiment lives in the main Rift Chess checkout, beside the original
TypeScript game (branch `codex/visual-overhaul`). The compiler is pinned in
`TOOLCHAIN.json` (Bend 2.0.26 at `6a77e12`). The local layout expects the
upstream checkout at `.artifacts/toolchains/bend`, at the exact recorded commit
with no tracked changes, and a portable Bun 1.4.2. `BUN_BIN` can point to that
runtime. The Windows development setup uses the official
`@oven/bun-windows-x64@1.4.2` package in the ignored
`.artifacts/toolchains/runtime` directory. Browser players need neither tool.
On a fresh checkout:

```powershell
git clone https://github.com/bendlang/bend .artifacts/toolchains/bend
git -C .artifacts/toolchains/bend checkout 6a77e1246c351055cb15031267a7c76c87036cbc
npm install --prefix .artifacts/toolchains/runtime @oven/bun-windows-x64@1.4.2
```

Run these from the **repository root**, not from `bend2/`:

```text
node bend2/tools/amend.mjs
node bend2/tools/freeze-v2.mjs
node bend2/tools/verify.mjs
node bend2/core/v2/check.mjs
node bend2/tools/mutate-v2.mjs
node bend2/tools/verify-library.mjs --check
node bend2/tools/bend.mjs --run bend2/tools/build.ts
node bend2/tools/serve.mjs 4184
```

`amend.mjs` verifies the reviewed amendment chain in `laws/amendments/`. Frozen
manifests are never rewritten; a compiler pin move, a change to a frozen tool
under `tools/` or a prose correction to a frozen document (other than the change
policy) is recorded there with its own receipts and
review, and the freeze checks resolve recorded hashes through it. Amendment 001
moved the compiler from `a495242` to `ff7a40c`; amendment 002 is revision 2.1
of `docs/LAWS_V2.md` (the 2.0 text is preserved in `docs/history/`); amendment
003 moved the compiler to `6a77e12` (Bend 2.0.26). Law,
proof, implementation, fixture and reference bytes cannot be amended; they need
a new semantic version under the change policy. To move the compiler, follow
"Updating the Bend toolchain" in the local guide. The root `npm test` excludes
`bend2/**` and `.artifacts/**`.

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

Click one of your pieces, then its destination square, or drag the piece there.
Legal destination markers and coordinate buttons appear when **TARGETS** is on in
**SETTINGS** (off by default, as in the original game). Platforms that can Shift
carry arrow indicators toward their hole (**SHIFTS**, on by default). Click an
empty square of such a platform, then the hole; to Shift a platform carrying your
piece, select the piece and press **SHIFT**. No Piece/Tile mode switch is
required. Click the visible body of a piece: nearer sprites can physically cover
the floor behind them at lower viewing angles; keyboard focus reaches every
square, and with TARGETS on coordinate buttons reach covered destinations.

Use **FRONT**, **OVERHEAD**, **LEFT**/**RIGHT**, **UP**/**DOWN**, **ZOOM+**/
**ZOOM-** and **RESET** in the play panel to choose your view. Right-drag or
Alt-drag rotates and tilts; click the board to focus it before scrolling to zoom.
The view is remembered separately from your game. Missing platforms are open
gaps, including while highlighted for a Shift.

Clicking the selected piece or platform again, **CLEAR**, or clicking a hole or an
opponent piece clears the selection. **HISTORY** pages through the recorded
actions. **SETTINGS** holds table lighting (**ASTRAL**/**WARM**), sound and volume,
the overlay toggles, and **EXPORT**/**IMPORT**; **HELP** has a short rules guide.
New matches support hotseat or a local opponent, either human color, layouts B/C
and the original quiet-draw policies. Arrows/Enter select cells; Escape clears
selection and U undoes an action. After undo in a bot game the opponent pauses,
so another undo can restore your own move; **RESUME** resumes it.

Hotseat **UNDO** first requests the other player's agreement. **AGREE** commits
the rewind; **CLOSE** keeps the match unchanged. Local play relies on the people at
the shared device to honor the displayed roles; this is not network identity or
multiplayer authentication.

In hotseat, **DRAW** and **RESIGN** let either player choose White or Black,
even when it is the other player's turn. In a bot match, those actions belong to
the human color. The opposite side may **ACCEPT** or **DECLINE** an outstanding
offer; the local opponent declines draw offers, and a notice says so.

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
