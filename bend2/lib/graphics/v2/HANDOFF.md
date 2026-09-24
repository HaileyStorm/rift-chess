# Graphics core v2 active handoff — 2026-09-24

**USER-DIRECTED RESUME, still DRAFT.** Root owns Git/integration and all
user acceptance. The graphics task reacquired an exact host-local claim for
this subtree and `bend2/lib/grid8/**` (`graphics-v2-grid8-resume` under
`bend2/lib/.working`). No graphics compiler process is active. Coordinate
compiler windows with root; no shared build or Git/index/ref mutation here.
Never modify frozen v1 sources or their verification manifest.

The eight-by-eight Board/TileSurface/SpatialBoard/SpatialFast and spatial
specimens moved to [grid8](../../grid8/HANDOFF.md). Core v2 now owns Color,
Layer, Shapes/Coord, Rounded, Ring, Gradient, Facet, generic RaisedFacet
(arbitrary convex four-corner extrusion), Texture, Alpha, BlendRect, Stamp,
Upscale, Detail, AtlasText/FontData, Widgets and the pinned OFL notice.
Dependencies point grid8→graphics/v2; no reverse imports. The old combined
draft contracts are preserved as ignored `pre-grid8-LAWS.md` and
`pre-grid8-HANDOFF.md` under `.artifacts/bend2/graphics-v2/`; the complete
23-row law migration table is [grid8/LAW_MIGRATION.md](../../grid8/LAW_MIGRATION.md).

After relocation, core [contracts/PROOF.bend](contracts/PROOF.bend) reports
`All terms check.` for 15 unchanged-meaning DRAFT signatures. The former
`spatial_cell_absent` is now exactly `RaisedFacet.draw_cell(False)` with
identical F32-free early return. New independent
[tests/library.ts](tests/library.ts) passed 5,874 finite reference checks;
the grid8 integration suite retained all prior 48,021 checks and the
fractional Facet thin-strip regression. Source checks of RaisedFacet and
grid8 Dome passed. This is a source/JS finite receipt, not a native/browser/
GPU speed or owner visual acceptance.

The font derivative comes from the DM Sans variable TTF at Google Fonts
commit `b5efa9c32e8f9b63005f5cdb1ad5527a77d2cd04`, source SHA-256
`8cd08d97e89c24d0aa92edd2f0f4c8ee6195eee9b7c9f154865a58b02f0c1c0d`.
`OFL.txt` remains here. The checked-in atlas used Pillow12.3.0 and
FreeType2.14.3; the generator does not pin them. Root has added a browser
bundle notice copy/HTML license link, but the final distributed build must
verify accessibility.

The opt-in `RaisedFacetFused` experiment checked and matched 215,070
emitted-JS pixels against the six-pass reference, but was rejected: 60-cell
construction medians were 2.65× slower at512 and 2.42× slower at1024.
Its source, tests, hashes and exact samples are preserved under ignored
`.artifacts/bend2/graphics-v2/fused-rejected/RECEIPT.md`; the production
module/tests were removed. The existing six-pass implementation and all
draft laws are unchanged. Native/GPU behavior of the rejected shape was
not tested. Next performance work should avoid repeated full-tree passes
through spatial bins or retained tile/material subtrees, with an independent
finite semantics gate before selecting a new path.

A second origin-aware Facet plus naive 8×8 aligned-bin prototype also
source-checked and matched 327,681 emitted-JS pixels, including thin,
offscreen/rotated and grid-hole cases. It failed the ≥2× gate: at512/1024
its 60-cell construction was essentially equal/slightly slower than the
existing renderer. Source/test hashes and exact samples are preserved in
ignored `.artifacts/bend2/graphics-v2/binned-rejected/RECEIPT.md`; the
draft modules were removed. It rescanned all64 cells for each of64 bins.
Descriptor bucketing was measured in a separate private prototype below.

A subsequent private descriptor-routed bin prototype eliminated the 64-bin
cell rescans but still missed the ≥2× gate: descriptor build ~1–1.5ms,
local six-face raster remained dominant. The exact checker, 327,681-pixel
finite differential, 512/1024 samples and pruned source/test hashes are in
ignored `.artifacts/bend2/graphics-v2/binned2-rejected/RECEIPT.md`. Public
rendering did not change. Further speculative full-scene raster variants are
deferred.

`Grain.bend` and `RaisedFacet.paint_corners_grained` are DRAFT opt-in
generic settled-material paths. Their two new endpoint proof signatures
closed under pinned 2.0.27, bringing core to 17 DRAFT signatures. The
independent scalar test matched 356,615 full-pixel samples (four block sizes,
three opacities, clipped/thin/rotated/offscreen quads, sparse 4096 boundary
and both sides of an F32 edge outside ±1e-5); zero samples needed the
ambiguity exclusion.
Pure emitted-JS 60-cell six-face construction was near parity at512/1024
in two alternating samples, not a native/multicore/GPU result. The
`grid8` Dome example uses Grain only for its settled static architecture and
three focal slab tops; the interaction preview and public grid traversal
remain unchanged. Visual acceptance remains open.

Texture CPU-pool DRAFT review decision (2026-09-24): Law13's first draft
included the sentence “`cpu_on_pool(size,material)` fixes forks=3/levels=7;
64 tasks each compute 256 leaves; it is an opt-in architecture pending native
timing.” Root reviewed exact native negative evidence and approved replacing
that with “At forks=3/levels=7, `pool_top` has 64 branches ×256 leaves, but
WSL2 Clang18 measurements were slower than `serial_tree` at threads1/4/8;
scheduling is caller-measured, not a speed claim.” Only the convenience
`cpu_on_pool` def was removed; `serial_tree`, `pool_top`, existing `tree` and
GPU-candidate `fine_on_pool` retain their semantics. The same narrow formal
`pool_zero` proof stays DRAFT; entire-structure equality is a finite
obligation, never presented as an inductive theorem. Tracked benchmark
`examples/NativeTextureBenchCpu.bend` calls `pool_top` directly and is
labeled a reproducible **rejected CPU default**, with a true sequential
control alongside it. Independent emitted-JS checks before this revision
passed 96 complete structural equalities plus 125,616 scalar leaf samples.
Source-bound C/ELF hashes, raw `/mnt/c` and ext4-local timings, and the
unmodified rejected candidate snapshots are preserved in ignored
`.artifacts/bend2/graphics-v2/native-texture-cpu-20260924/RECEIPT.md`.
The ext4 result (64 whole-tree rounds, 12 samples/case) was serial
52.0/55.5/53.8ms median at threads1/4/8 versus bounded top3
85.1/103.1/124.4ms. The first run's common latency spikes prompted the
justified ext4 rerun. GPU/device execution remains untested. After the
approved DRAFT revision, `Texture.bend` source, all 18 core proof signatures
and the same 96 structural/125,616 scalar finite checks passed again under
the pinned wrapper.

Outstanding: final owner review/freeze of DRAFT English contracts and proof
table; independent versioned manifests/verifiers for core and grid after a
stable candidate; Linux host GPU grant/build/device timing if authorized.
The explicit balanced 4^7 Texture bang is architecture, not measured GPU
acceleration. The native GUI and browser game have separate root-owned work.

`AffineGrain.bend` Law14 is DRAFT but checker-green with the approved pure
Boolean helper proving **arbitrary-opacity** invalid-texel identity; all
20 core signatures closed. An independent double scalar compared 246,994
pixels exactly outside 1,801 documented F32 edge/UV tie-band samples,
including both determinant signs, clipped512/1024 and boundary adversaries.
Pure emitted-JS 8/12 focal top faces at1024 cost ~148–209/~226–272ms,
roughly 3× flat Facet. `examples/AffineHall.bend` v1 rendered at1024 in
1,594.28ms construction +41.35ms blit but its repeated pastel square
flecks were visually rejected by root. No game import or WOW claim.

The DRAFT Law15 candidate `AffineTexture.bend` is a
generic object-anchored nearest-center UV sampler of any well-formed opaque
RGB Image (including a once-decoded RGA1 asset); Facet quarters count only
geometric coverage. Its source_size0 sentinel and opacity0 plus the prior
20 endpoints now make **22 DRAFT core proofs**, all checker-green. The
independent row-major RGB scalar test passed 112,008 exact pixel comparisons
outside 538 stated F32 edge/UV tie-band samples across64/128 full canvases,
clipped512/1024, mirrored signs and endpoints. At1024, 8/12 focal Image
top faces cost ~645–968/~1,254–1,602ms JS vs flat~72–184/~136–193ms;
at512 Image~82–95/~123–164ms. These are construction-only, no browser or
GPU evidence. The original neutral limestone ImageGen tile and its pinned
Pillow12.3.0 depth8 RGA1 conversion, source/output hashes, prompt and MIT
provenance live in `examples/materials/`. `AffineHall` procedural v1 built
in1,594.28ms versus textured v1 built in3,844.03ms with three source-mapped
slabs, list conversion7.61ms, Bend RGA decode272.14ms and blit80.56ms.
Direct image inspection shows much better continuous stone but the stage
remains diagrammatic, and the cost rules out drag/default full-board use.
No game import or WOW claim; all laws remain DRAFT and none were weakened.

The user now requests a **good graphics-library checkpoint** and GPT-6 Pro
handoff before more broad local library work. Minimal DRAFT Law16
`MaskedStamp.bend` source-checked and closed its two exact early identities,
bringing core to **24 DRAFT proofs**. The independent scalar gate passed
65,540 clip/alpha/overlap comparisons. Thirty-two prebuilt settled sprites
cost ~112–142ms construction +4–8ms serial blit at512/source32 and
~604–670ms +20–26ms at1024/source64; keyed Stamp is faster but loses soft
alpha edges. Root's focused review found no blocker under well-formed
preconditions. Stop local library edits for the Pro pass. The game-owned
RGBA atlas remains outside this library and was not imported. No mesh/font/
GPU API work in this checkpoint; root owns Git/browser integration.
