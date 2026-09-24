# Graphics v2 — draft integration library

This is a reusable pure Bend image-tree package. Its public primitives are
independent of chess rules and host APIs. The existing `../` library remains
frozen; v2 imports its Canvas without changing its bytes.
The eight-by-eight grid, projected platform traversal and spatial specimens
are in the separate [grid8 package](../../grid8/README.md). The dependency
flows from grid8 into this package, never the reverse. Neither DRAFT package
is frozen; reviewed law versions and verification manifests will follow.

## Surface model

- `Color.bend`: packed RGB `0xRRGGBB`; opacity is clamped to 0..255. For a
  partial blend each output channel is
  `floor((src*alpha + dst*(255-alpha) + 127)/255)`. Exact zero and full
  opacity preserve destination and source values, including their Image tree
  identities in `Layer.over`. Colors should be in 0..0xFFFFFF.
- `Layer.bend`: aligned whole-tree source-over and saturating additive blend.
  Uniform `Pix` pairs blend once, and opaque/transparent operations avoid
  descent. Interior work is immutable four-way parallel calls.
- `Shapes.bend` and `Rounded.bend`: disk and rounded-rectangle clipping with
  exact 2x2 quarter-pixel area samples at `(x+.25,y+.25)`, `(x+.75,y+.25)`,
  `(x+.25,y+.75)`, `(x+.75,y+.75)`. The sample count scales opacity by
  `floor(alpha*count/4)`, then uses `Color.over` once. Region bounds are
  classified before descent. Rounded rectangles have half-open bounds and
  reject invalid radius/extent; intersections and offscreen portions clip.
- `Ring.bend`: exact quarter-sample annulus coverage, useful for orbits,
  selection halos and hollow highlights.
- `Facet.bend`: clipped convex projected quads at any supported canvas depth,
  with quarter-sample edge coverage. The existing v1 F32 edge equations are
  reused; projection/F32 arithmetic is presentation-only and does not claim
  exact cross-target bits.
- `Grain.bend`: optional material fill on a clipped convex face. A bounded
  integer hash chooses one of three packed colors per 4/8/16/32-pixel aligned
  block; quarter-sample edge coverage and alpha remain identical to Facet.
  Fully covered blocks share image subtrees. The pattern is anchored to screen
  pixels and can change during camera motion, so retain it for settled/static
  surfaces and use the plain face in drag previews. Two narrow endpoint
  signatures have DRAFT checker receipts; 356,615 independent emitted-JS
  scalar samples passed, including a sparse 4096-edge case. F32/native/GPU
  bit equality and visual material realism are separate questions.
- `RaisedFacet.bend`: reusable convex four-corner projected extrusion with
  a cast shadow, side faces, top and bevel. It accepts any supplied corners,
  F32 extrusion and Surface; no 8×8 mask, camera or game policy is embedded.
  The absent-cell branch returns the exact input Image before F32 work. An
  opt-in grained variant substitutes only the top face while keeping the same
  six-face order; `Grain.Palette.base` replaces `Surface.top` on that path.
- `Gradient.bend`: horizontal and vertical fixed-point ramps, rendered at a
  caller-selected power-of-two band width. Each band is uniform; the two
  independent child computations share their horizontal or vertical twins.
- `Alpha.bend` / `BlendRect.bend`: reusable pure alpha-image compositing and
  clipped translucent rectangles; uniform transparent/opaque regions prune.
- `Stamp.bend`: cached immutable small sprite Image with one transparent key,
  signed clipping and aligned subtree reuse. Its pixel replacement rule and
  later-stamp ordering have independent finite tests; the uniform transparent
  source has a draft formal exact-identity law.
- `MaskedStamp.bend` (DRAFT, checked): separate immutable RGB
  and red-channel alpha Images support soft-edged cached sprites. It keeps
  signed clipping and caller painter order; zero opacity or a uniform zero
  mask preserves the exact target tree. The game chooses angle/art and caches
  source Images; this library supplies no chess piece data, camera logic or
  depth test. Two early identity proofs and 65,540 independent emitted-JS
  scalar clip/alpha/overlap comparisons passed. Prebuilt 32-piece settled
  construction was ~112–142ms at512/source32 and~604–670ms at1024/source64,
  with serial blit measured separately; no real-atlas/browser/GPU claim.
  Drag preview should retain its cheaper proxies.
- `AffineGrain.bend` and `AffineTexture.bend` (DRAFT): object-anchored affine
  top-face fill from integer palette texels or an immutable decoded RGB Image.
  The latter samples one source pixel at each output center while Facet's
  quarter samples clip the geometry. All 24 core DRAFT endpoint signatures
  now check, with independent scalar pixel gates. Asset-backed material
  improved visual stone continuity in the game-neutral specimen but cost
  ~1.25–1.60 seconds for just 12 top faces at1024 in noisy JS samples; use
  only for a retained idle detail path after integration timing, not drag.
- `Texture.bend`: deterministic integer grain and diagonal hatch materials.
  `coarse` has 4^4 leaves, `detailed` 4^5 leaves, and opt-in
  `fine_on_pool` marks a 4^7 leaf offload for a native CPU pool or GPU.
  The latter is an architectural route, not a measured GPU optimization.
- `AtlasText.bend` / `FontData.bend`: proportional mixed-case text at 14–28px
  equivalent sizes, packed two-bit coverage, clipped alpha-run composition,
  real advance widths and selected kerning pairs. The font is baked from a
  pinned OFL source into Bend data; no runtime font service or canvas text
  drawing is involved. `tools/bake_font.py` reproduces the table from the
  pinned source checksum, and `OFL.txt` carries its required notice.
- `Widgets.bend`: rounded panels, chips, rules, and the new Bend text renderer.
- `Detail.bend`: a pure Economy/Balanced/Ultra selector from the physical
  viewport edge, full scene-and-presentation p90 times, measured GPU path,
  known memory headroom or a successful allocation probe, and maximum output
  texture size. Unknown capacity conservatively selects Economy. The host owns
  timing collection and tier hysteresis; mere WebGPU availability is insufficient.
- `Upscale.bend`: reusable nearest-neighbor `Frame` interpretation. A 512
  logical image can be displayed at 1024 or 2048 by incrementing its quadtree
  depth and extent while retaining the exact same immutable pixel tree. The
  generic output blitter reads this Bend-returned frame; no host-side board
  transform or independent game coordinate system is involved. This retains
  nearest-neighbor preview edges, so the high-detail pass must settle later.

Geometry uses `Shapes.Coord` (`Pos{value}` or `Neg{magnitude}`), avoiding an
ambiguous wrapped-U32 public signed coordinate. Positions/edges must be in
[-4096,4096], size must be exactly `2^depth` in [1,4096], and radii at most
4096 (a rounded rectangle also requires radius <= half both extents).
Out-of-domain geometry is inert rather than silently wrapping. The internal
positive 4096 bias keeps the quarter-sample squared-distance sum in U32.
Rendering beyond 4096 requires separate aligned tiles or wider arithmetic.

The full-canvas gradient and scene are for static or change-driven frames;
callers should keep a previous Image until the requested scene or visual state
changes. The quadtree host should blit joined pixels serially. JS executes
parallel lets serially, while native C can fork independent calls. A GPU offload
is opt-in and should only be enabled after device build, execution, and frame
timing justify its launch/transfer costs; the scene's compositing is not
automatically shipped to the GPU.

## Detail tiers and measurement

The three [grid8 specimens](../../grid8/README.md) accept `(10,1024)`,
`(11,2048)` and `(12,4096)`; their coordinates, font strokes, radii,
gradient bands and board scale together.
An integrating host supplies two distinct budgets to Bend. `Detail.choose`
selects a **settled** tier using measured warm full scene construction plus
host presentation p90 against a separate idle rebuild budget (for example,
several seconds), viewport physical edge, capacity probe and texture limit.
`Detail.interactive` caps the continuous camera/hover tier using measured
camera-plus-piece-overlay-plus-host-transfer p90 against an interaction budget
(for example, 100ms). It can choose 1024 while a 2048 scene remains the
requested settled tier. GPU availability alone never promotes either tier;
the supplied GPU timing must include Bend CPU construction and presentation,
so a quick upload cannot conceal a slow scene build.
`Detail.interactive_with_preview` can select a measured 512 logical Preview
when even a complete 1024 camera frame misses the drag budget. Render all
camera geometry and simplified piece silhouettes at depth 9 with the same
camera/picking basis, then use `Upscale.twice` to return a 1024 output frame
without recomputing the board. On release, retain the preview frame while the
settled renderer produces the requested high-detail frame. The 512 p90 must
include game work, Bend render, output copying and browser presentation; a
compute-only microbenchmark cannot qualify the tier. An unmeasured preview
is never selected automatically.

When browser memory reports `null`, the host may explicitly probe a candidate
physical output size by allocating its pixel buffer/texture, rendering and
presenting several representative frames while retaining the current frame.
`Capacity.Probed{max_successful_edge}` is only set after that entire pass
completes without context loss/allocation failure; absent evidence remains
`Unknown`. Collect several warmed full-scene times and pass the p90 with its
`*_measured` flag; include all Bend scene work and host presentation. Promote
only after three consecutive qualifying windows while input is idle, and
downgrade after an allocation/context failure or three windows above a 20%
slower bound. Reprobe on material viewport/DPR or device changes. The host
keeps the previous completed frame installed and performs candidate building
in a separate worker with generation-based cancellation; new input invalidates
an obsolete candidate rather than waiting on a stale multi-second render.
An active drag uses the measured interaction tier and settles only after input
has been quiet. Picking/commands use the shared Bend camera basis independently
of presentation pixel density.
For example a 2048 settled scene with a 113ms measured drag p90 and a
100ms interaction budget uses the 1024 Bend image during drag, then rebuilds
the detailed 2048 scene after the gesture settles. This policy never promotes
an unmeasured tier and does not alter game coordinates or picking.
The grid8 package records isolated preview timings separately. Full
browser-visible input-to-paint latency remains unmeasured.

The font source is the DM Sans variable TTF at Google Fonts commit
`b5efa9c32e8f9b63005f5cdb1ad5527a77d2cd04`, file
`ofl/dmsans/DMSans[opsz,wght].ttf`, SHA-256
`8cd08d97e89c24d0aa92edd2f0f4c8ee6195eee9b7c9f154865a58b02f0c1c0d`.
The byte-pinned source is an ignored development input. The distributed Bend
glyph data is named Rift Atlas Sans and includes its derivative font notice
and SIL OFL-1.1 license in this directory. The checked-in table used Pillow
12.3.0 and FreeType 2.14.3, but the generator does not enforce those
rasterizer versions; a different version may produce different bytes despite
the pinned TTF. Compare regenerated `FontData.bend` byte-for-byte before
replacement. The generator uses 20px optical size and weight 650,
baseline 18 in a 24×24 cell, quantizes coverage to four levels, and packs
24-bit row planes into printable six-bit characters. This is a Latin printable
ASCII atlas with a question-mark replacement for unsupported code points;
it does not perform Unicode shaping or bidirectional layout.

Run source checks and finite tests via the local wrapper after the toolchain
pin is ready:

```text
node bend2/tools/bend.mjs bend2/lib/graphics/v2/RaisedFacet.bend --check-only
node bend2/tools/bend.mjs bend2/lib/graphics/v2/contracts/PROOF.bend --check-only
node bend2/tools/bend.mjs --run bend2/lib/graphics/v2/tests/library.ts
```

Core finite checks cover partial coverage, offscreen clipping, compositing,
fractional facets, generic extrusion, signed Stamp clipping and Image frame
upsampling. Grid-specific tests/renders live under grid8 and still exercise
this package through imports. Neither suite proves native/device speed,
browser presentation or aesthetics. Any new formal law needs review before
its source/English contract freezes.
