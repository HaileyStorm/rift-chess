# Grid8 — draft reusable eight-by-eight image library

This pure Bend package owns an eight-by-eight cell lattice, a two-word
presence mask, prebuilt cell materials, a projected platform traversal and a
fast affine top-face drag pass. It has no chess rules or browser API. It
depends on [graphics v2](../graphics/v2/README.md) for signed coordinates,
color/alpha, texture, F32 facets, generic `RaisedFacet.Surface`/extrusion,
typography and Image compositing; graphics v2 never imports grid8.
All laws/proofs here remain DRAFT. The exact 23-signature structural split
is documented in [LAW_MIGRATION.md](LAW_MIGRATION.md).

`Board.bend` builds a balanced checker and paints only present mask cells,
preserving lower scenery through absent cells. `TileSurface.bend` builds
light/dark/void cell Images once and reuses them in a balanced grid tree.
`SpatialBoard.bend` projects cells from an integer 8×8 preset, selects
`RaisedFacet.Surface` colors and optional integer-distance `Light`, and
skips all geometry for absent cells. The generic arbitrary-corner extrusion
it formerly contained is now `../graphics/v2/RaisedFacet.bend` and can be
called directly with a free camera's projected corners. `SpatialFast.bend`
inverse-maps the same 8×8 mask to a flat top-face Image during interaction;
it omits side faces, shadows, antialias and detailed tokens. F32 boundary
behavior is qualified precisely in [LAWS.md](LAWS.md).

`examples/Showcase.bend` is a flat astral dashboard,
`examples/StoneCourt.bend` a warm carved-stone court, and
`examples/Dome.bend` a spatial observatory with lit raised platforms,
real openings, vaulted optics and a foreground telescope. These are
game-independent specimens, not a locked game camera. Dome exposes
`settled_base`, `settled_board`, `settled_tokens` for retained immutable
layers and `fast_base`, `fast_hud`, `fast_frame`, `fast_preview` for camera
drag. Its cached HUD is stamped last over moving boards; the 512 logical
preview is interpreted at 1024 and shares a full-resolution Bend HUD, so
preview typography remains legible. Camera/picking and game state remain
external. The grid8 examples support 1024/2048/4096 settled scenes; 512 is
an interaction preview, not a full-detail physical tier.

After relocation, the pinned 2.0.27 checker closed all 15 graphics core
and eight grid8 DRAFT proof signatures; core and grid finite suites passed
5,874 and 48,021 independent checks. SpatialFast tests passed 154,588
pixel comparisons with 28 ±0.00001 F32 near-line samples qualified as
ambiguous. A 1024 Dome specimen regenerated from the new paths built in
2.963s plus75ms serial blit; a 2048 earlier variant took 9–17s, too
costly for interaction. These are local JS construction, not browser
input-to-paint or native CPU/GPU measurements. A measured tier policy in
graphics v2 never upgrades merely because a GPU exists.

After the local wrapper's `BEND_NO_TELEMETRY=1` pin is stable, focused gates:

```text
node bend2/tools/bend.mjs bend2/lib/grid8/examples/Dome.bend --check-only
node bend2/tools/bend.mjs bend2/lib/grid8/contracts/PROOF.bend --check-only
node bend2/tools/bend.mjs --run bend2/lib/grid8/tests/library.ts
node bend2/tools/bend.mjs --run bend2/lib/grid8/tests/spatial-fast.ts
node bend2/tools/bend.mjs --run bend2/lib/grid8/tests/camera-sequence.ts 1024
node bend2/tools/bend.mjs --run bend2/lib/grid8/tests/render.ts 1024 dome
```

Renders under `.artifacts/bend2/graphics-v2/` are ignored local visual
evidence; pre-migration PNGs remain historical and must not be relabeled.
Actual browser playtesting, native parallel CPU, authorized GPU execution,
cross-target F32 edge differentials and owner visual acceptance remain
separate gates.
