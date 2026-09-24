# Grid8 active handoff — 2026-09-24

**USER-DIRECTED RESUME, still DRAFT.** This reusable eight-by-eight pure
Bend library is being improved under a fresh exact claim shared with graphics
core. Root owns game/Chrome callsites, Git, integration, browser/native
playtests and final WOW judgment. No grid8 compiler process is active;
coordinate all heavy windows with root.

Modules `Board`, `TileSurface`, `SpatialBoard`, `SpatialFast` moved here from
graphics/v2. `SpatialBoard` now calls generic
`../graphics/v2/RaisedFacet.bend`; its former arbitrary-corner `Surface`,
`paint_corners`, `draw_cell` live in graphics core. Grid8 never imports game
rules and graphics core never imports grid8. `examples/Showcase`, `StoneCourt`
and `Dome` and their benchmark/camera/render tests moved here. Root's
v2game and Chrome writers are changing their owned imports only after the
stable path map was announced. `LAW_MIGRATION.md` records every one of the
23 old signatures, exactly 15 core + eight grid8, without semantic weakening.
Old English contract/HANDOFF snapshots are ignored under
`.artifacts/bend2/graphics-v2/`.

After module/path relocation, `contracts/PROOF.bend` reported `All terms
check.` for eight DRAFT grid8 proofs; graphics core's other 15 also closed.
`tests/library.ts` retained 48,021 independent finite checks, including
Color/shape/Facet integration, tile mask, per-cell light arithmetic and
zero-strength 128² pixels. `tests/spatial-fast.ts` passed 154,588 affine
comparisons; 28 pixels within ±0.00001 board units of an integer line admit
either F32 neighbor, all others matched unbiased scalar. The raw preserved
counterexample is affine origin(-80.31,500.17), file(72.27,8.13),
rank(11.91,-55.23), pixel(286,515) at1024: ideal file
4.999998679157726/old cell light11979733; implementation +1e-5 picks
absent cell5/background1186349. This finite tolerance is not a theorem.

Six-view `tests/camera-sequence.ts 1024` reran under grid8 paths and passed
nine hole and marker-center assertions each, plus 1,603 header, 2,207 footer
and side-card overlap assertions with opaque foreground planes. A 1024 Dome
PNG regenerated under grid8 paths at
`.artifacts/bend2/graphics-v2/showcase-dome-1024.png`, construction2962.88ms,
serial blit74.69ms. Visual inspection confirmed same lit vault, side faces,
horse silhouettes and real hole after relocation. Root calls the scene
materially better but still below WOW: center board too uniform, observatory
still diagrammatic and settled construction ~3s. Earlier 2048 full scene
timing ranged 9.23–17.40s; 2048 new art is unmeasured. A later example-only
palette change reduced Light strength100→60, differentiated slate tiles and
filled the inner vault chamber; that specific change needs a fresh PNG and
performance review. The exact prior candidate PNG is preserved as ignored
`.artifacts/bend2/graphics-v2/showcase-dome-before-contrast-1024.png` for
direct before/after review. Historical old
path PNGs remain evidence of their exact pre-migration source, not current.

Preview is 512 logical pixels interpreted at1024 output with a retained
full-resolution Bend HUD stamped after the moving board. A 50-frame local
JS run before relocation measured p90 89.48ms including 13 simplified
markers, Bend keyed overlay and serial dirty copy; 1024 p90 72.73ms and
2048 p90 143.14ms in the same run, with high variance (another 2048 run
was303ms). No browser input-to-paint timing, commands or GPU transport is
included. Root's game scene has 32 full art pieces and an unmeasured proxy
optimization; do not infer game drag speed from this specimen.

The example-only Light60/contrasted palette/filled chamber source checked
and rendered at unique ignored `showcase-dome-1024-contrast-v1.png`, with
construction9,668.56ms, serial blit234.37ms and PNG189.53ms on a
high-variance host run. Direct visual inspection against
`showcase-dome-before-contrast-1024.png` found a clearer chamber and tile
contrast, but still mostly flat/diagrammatic and **below WOW**. The
contrast-v1 2048 build has not been measured; 2048 remains optional idle
settle only after full host calibration. The renderer script accepts a safe
alphanumeric variant suffix to keep visual comparisons independent.

The generic opt-in Grain material API has two reviewed DRAFT endpoint laws,
source/proof checks and finite evidence in core graphics. Root has **not**
accepted WOW quality.
Reassess browser input-to-paint, improve visual/spatial material and retained
interaction, and perform actual game playtesting before acceptance. Native
CPU/GPU evidence, independent package manifests/verifiers and final law
freeze remain separate work. All current 17+8 proofs are only DRAFT checker
receipts. No commit/push in this lane.

Two exact-pixel performance experiments were rejected and preserved in ignored
`.artifacts/bend2/graphics-v2/{fused-rejected,binned-rejected}/RECEIPT.md`:
six-face fused tree was 2.4–2.65× slower at512/1024 despite 215,070 matching
pixels; naive aligned bins matched 327,681 pixels but merely tied the
existing60-cell construction, because each of64 bins rescanned all64 cells.
Neither production path or law changed. A second private descriptor-routed
bin tree source-checked and matched **327,681 exact emitted-JS pixels**, but
60-cell512/1024 construction remained near parity with the existing six-pass
renderer. Descriptor build cost only ~1–1.5ms; local raster dominated.
Exact source/test hashes and alternating samples are preserved in ignored
`.artifacts/bend2/graphics-v2/binned2-rejected/RECEIPT.md`; private modules
and tests were pruned. No public API, Law or Proof changed. Root has stopped
speculative full-scene raster designs for this phase; concentrate on generic
material/light quality and retained scene layers. The earlier
`showcase-dome-1024-contrast-v1.png` predates the aperture change. The
unique `showcase-dome-1024-contrast-grain-v2.png` includes the
receding aperture plus generic grained arch/plinth facets and three focal
tops; source check passed, construction3,650.58ms, serial blit79.86ms and
PNG77.24ms. Inspection found a clearer off-center shaft and visible flecks,
but material remains blocky and the chamber/board mostly flat. This is not
WOW or a browser frame timing. No grid8 material traversal/Law changed.

`showcase-dome-1024-masonry-v3.png` then added room walls, angled ribs and
large side piers. Its 5,141.27ms Bend construction and 95.71ms blit were
contended by a concurrent NativeSmoke WSLg observer, so they are visual
diagnostics only. Inspection found more architectural mass but blunt caps and
piers that cut across the board. A subsequent **unrendered/source-unchecked**
example-only v4 moves piers behind the settled board, shortens/segments
caps/keystone, shifts tile palette to warm ivory/slate and increases the
under-board blue starfield opening. Root has held further full rendering
until the actual integrated browser framing is reviewed. No core or grid8
public API/Law changed in this v4 art pass.
