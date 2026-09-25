# Reusable graphics expansion — three design rounds (DRAFT)

This is an application-library exercise, not a chess redesign. Existing contracts
and their evidence remain intact. The old review is preserved in REVIEW.md and
review/. This document records candidate features and the refined implementation
scope; execution receipts determine completion, not this initial list.

## Round 1 — breadth: what would graphical applications actually need?

| Family | Candidate capabilities | Examples beyond games |
|---|---|---|
| Composition | Ordered command buffers, coarse spatial bins, exact scissor clips, prepared immutable render plans, empty-tile reuse, conservative occlusion pruning | Dashboards, diagram canvases, timeline editors |
| Incremental drawing | Dirty rectangles, old/new object bounds, retained background restoration, tile-local repaint, damage visualization | Text editing, moving windows, oscilloscope traces |
| Sprites | Signed clipping, prepared masks, tint, scale/rotation/shear, nearest and alpha-weighted bilinear, atlas regions, nine-slice skins | Icon browsers, slide editors, instrumentation panels |
| Materials | Explicit mip selection, alpha-weighted filters, procedural ramps, color modulation, repeating textures, color-space-labelled operations | Maps, document backgrounds, scientific heatmaps |
| Vectors | Antialiased segments/capsules, quadratic curves, polylines, dashes, convex fills, stroke bounds | Charts, connection diagrams, handwriting |
| Typography | Native masks, kerning-ready runs, wrapping, tabs/newlines, ellipsis, measuring, caret hit testing, selection geometry, accessible host text | Code editors, subtitles, forms |
| Layout | Insets, alignment, aspect fit/cover, integer distributed spans, scroll math, coordinate transforms | Resizable panes and data visualization |
| Motion | Clamped easing, repeat/ping-pong timing, bounded fixed-step clocks, deterministic animation state | Transitions, progress feedback, signal playback |
| Effects | Coverage algebra, soft masks, shadows, morphology, blur, color transforms | Focus rings, overlays, disabled controls |
| Backend design | Actual compiler checks, root-only exports, C/JS equivalence, configurable coarse forks, narrow captures, source-bound caches | Portable desktop/web visual tools |
| Future 3D | Reusable mesh/UV/material/depth model, clipping, perspective interpolation, transparent sorting | CAD/model inspection, later continuous-view sprites |
| Host boundary | Canvas upload spans, workers, GPU adapters, input normalization, accessibility, DPI adaptation | All interactive applications |

## Round 2 — challenge the obvious designs

1. Do not put the entire scene behind every pixel. Prepare bounded tile-local
   lists once; retain painter order and immutable images. Cull only proven
   outside commands and earlier commands hidden by a fully opaque rectangle.
2. Do not equate `parallel` syntax with speed. Keep a true serial path, explicit
   fork budget, and benchmark preparation separately from repeated rendering.
3. Rounded alpha is not associative. Never regroup overlapping operations or
   blend subpixel coverage twice. Dirty redraw starts from the background, not
   from a previously composited foreground.
4. Bilinear interpolation of straight RGB causes hidden-color halos. Accumulate
   RGB weighted by alpha, round coverage once, and specify the encoded-channel
   space. Do not rename that operation linear-light filtering.
5. Nine-slice corners must not stretch. Reject invalid margins/undersized targets
   rather than inventing overlap policy. Texture atlas filtering needs bounds
   isolation before it can be safely added.
6. Text layout is useful without pretending to solve shaping. Consume explicit
   glyph/advance/kerning information, preserve source indices, and make caret
   and wrapping behavior deterministic. Leave bidi, ligatures and host semantic
   accessibility explicit, not silently approximated.
7. Vector paths should combine coverage before compositing, avoiding dark seams
   where segments overlap. A bounded quadratic subdivision is preferable to an
   unbounded recursive tolerance algorithm in safe Bend.
8. A large mesh API would absorb the pass without proving a usable 2D foundation.
   Record its necessary boundaries, but do not make it a dependency.

## Round 3 — refined priorities and acceptance tests

| Priority | Selected work | Acceptance / cost gate |
|---|---|---|
| P0 | Actual pinned-source Node checker/emitter harness | Whole-closure type/ownership/termination checks; no Bun-pin claim |
| P0 | Rectangles, scissor composition, clipped sprites | Exact independent pixel references and invalid/empty endpoints |
| P0 | Prepared DrawList/RenderPlan with bounded forks | Exact serial/partition identity, painter order, preparation vs redraw timings |
| P0 | Tile-conservative damage repaint | Full-redraw equality after move/removal; unchanged-tile preservation |
| P0 | Resolve unaligned opaque regression | Real-emitter A/B; keep losses visible; no surrogate performance claim |
| P1 | RGBA nearest/bilinear sampling and transformed drawing | Independent integer filter oracle, hidden-color controls, F32-limited raster tests |
| P1 | Nine-slice skin | Corner preservation, center mapping, invalid-margin no-op |
| P1 | Native glyph run layout and caret metrics | Explicit overflow/wrap/newline rules; placement and source-index checks |
| P1 | Segment/quadratic coverage | Independent scalar quarter-sample reference; overlapping path coverage once |
| P1 | Layout and animation helpers | Exhaustive bounded integer rules and numeric endpoint tests |
| P1 | Color/mask processing and gradient ramps | Exact channel/coverage oracles; explicit preparation-only cost |
| P1 | Game-neutral application specimen | Pixels from actual emitted Bend; no concept-art substitution |
| P2 | Atlas packing, tiled addressing, blur/shadow, advanced widgets | Defer unless earlier gates complete; avoid an incoherent partial API |
| P2 | Linear-light filtering, arbitrary paths, shaping, mesh rendering | Requires larger semantics/backend work; not silently promised |
| P2 | Workers/WebGPU/platform accessibility adapters | Host-owned or separately reviewed backend capability |

API boundaries: the library receives geometry, clips, source images, glyph metrics,
commands, fork/partition budgets and damage. It does not choose camera limits,
application UI layout, cache lifetimes, quality tiers, chess rules or piece policy.

Final implementation status and measured revisions to this plan are recorded in
EXPANSION_REVIEW.md and API.md. This document is intentionally preserved as the
pre-implementation proposal rather than retrospectively rewritten as a success list.

## Round 4 — implementation evidence changes the recommendation

The original three rounds above remain the design record. The measured/refined
outcome is broader than the selected table, but intentionally stops short of
unvalidated platform/3D promises.

| Candidate family | Delivered | Decision after testing |
|---|---|---|
| Composition and incremental drawing | Half-open regions, exact clips, sequential tile kernels, ordered commands, coarse preparation, conservative occlusion, damage restoration | Keep opt-in. Prepared full redraw regresses on two unaligned cases; real small-change repaint gives the large practical benefit. |
| Portable scheduling | Serial path, bounded four-way native CPU forks, root offload boundary, CPU fallback | Source induction + finite native pixels pass. Four-worker mapped workload improves; GPU/worker transport remains unvalidated. |
| RGBA usability | Prepared transforms, nearest/alpha-weighted linear filtering, shared-prefix gather, nine-slice commands | Exact integer and scalar-F32 references; measured native gather gain. Existing sampler/alpha rules untouched. |
| Typography | Generic metric layout, source indices/affinity, wrap, tabs, selection, hit testing, atlas adapter, native glyph example | Useful editor foundation. No invented shaping/bidi/grapheme/fallback rules; native type remains separate from the old atlas. |
| Vector drawing | Capsules, disks, balanced quadratic/cubic paths, geometric sample union, clipped planner commands | Keep fixed resource budget. General path fills, analytic curves, dashes/miter rules need separate contracts. |
| Materials/effects | Exact stop ramps, explicit LUTs, periodic integer multioctave fields, RGB effects, coverage algebra | Preparation-only, color-space-labelled. No physical material/lighting claim or hidden per-frame bake. |
| Application math | Integer tracks/grids/insets/fit, easing, repeat/ping-pong, conserving bounded fixed steps | Finite references include full-byte operations, U32 boundaries and random layout inputs. No widget framework added. |
| Host integration | Reusable RGBA staging buffer and narrow Canvas upload adapter | Mock context and byte packing pass. Input/IME/accessibility/browser/device latency remain app/backend work. |
| Uniform-mask auto optimization | Prototype and source patch retained only as experiment | Reject enabling it after a measured regression. Do not trade exact semantics for a better benchmark. |
| Formal coverage | 62 completed source declarations total, including the previous 12 now actually checked | Two F32 candidates stay unfilled. Stronger prose properties retain finite evidence rather than fabricated proofs. |

### Next priority order after this checkpoint

1. Integrate one real non-game/editor scene and one game scene with the existing
   host. Measure input-to-present, scene mutation rates and damage distribution;
   compare immediate, prepared-full and prepared-damage paths without defaults
   biased toward the best specimen.
2. Profile unaligned sprite allocation/cursor work; test integer atlas-region
   views plus filter gutters, source preparation reuse and tighter tile bounds.
   Any replacement keeps the existing exact-alpha reference suite and benchmarks
   both winners and losers.
3. Add a versioned host pixel/command transport with explicit ownership, failure
   and cancellation behavior. Reuse the full-pixel fixture across actual Workers,
   target native OSes and a selected GPU backend before claiming portability.
4. Expand typography through a separately specified shaping/source-map adapter,
   font fallback and accessible host semantics. Then consider ellipsis, richer
   inline runs and paragraph caching; do not conflate them with Latin codepoints.
5. Add vector fills/dashes, blur/morphology/shadows and atlas regions only with
   clear coverage/color-space laws, cost budgets and meaningful app examples.
6. Prototype a small mesh/depth/clip/UV backend as a separate experimental package
   with a triangle raster reference. Camera/game policy stays external. Nothing
   in the shipped 2D checkpoint depends on a large mesh API.

The deferred list remains deliberate, not implemented stubs hidden behind public
names. See API.md for implemented entrypoints and PERFORMANCE.md for exact results.
