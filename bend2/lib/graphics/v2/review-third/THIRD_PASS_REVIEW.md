# Graphics v2 — third improvement pass

> Local relocation: this overview now lives inside the reusable graphics
> package with its API, evidence and DRAFT contracts. Historical packet paths
> below describe the Pro delivery. See [local integration](../INTEGRATION.md).

**Review candidate, not a frozen release.** This pass adds 15 production Bend
modules, four host modules, a real interactive browser workbench and six rendered
visual artifacts. All **767 files from the second delivery remain byte-for-byte
unchanged**, including frozen v1, grid8, the compiler pin, historical contracts,
failed proof candidates and receipts. No game/chess/camera policy was added to the
library. The root commit provenance remains the user's library checkpoint
`436313f9c2bb68c29ce097a5e28e4dd2d9cabb0e`; these are uncommitted review additions,
not a claim to have published a new upstream commit.

## Start here

Run `python review-third/demo/serve.py` and open the printed local address to
inspect **PRISM / Graphics Laboratory**. Its compiled Bend modules are included;
no compiler is required to inspect the delivered demo. Use the three scenes,
worker selector, timeline, dynamic-layer toggle and PNG export. Normal HTTP/CSP
loading needs a local integration check; actual browser execution in this
container used policy-compatible in-memory module imports as documented below.

For code review, read `review-third/API.md`, then `DRAFT_CONTRACTS.md`,
`PERFORMANCE.md` and `BACKENDS.md`. The four design/refinement rounds are in
`DESIGN.md`. `REPRODUCE.md` gives exact runnable gates. The incremental
`review-third/third-code.patch` is against the **second delivery**, while this ZIP
already contains the full integrated tree. `PATCH_REVIEW.md` inventories the patch
and its application test. `python verify_third_delivery.py` checks the separate
third-pass payload manifest.

## Implemented library additions

| Area | What is now available |
|---|---|
| Stable alpha sprites | Explicit prepared translated/scissored patches with aligned immutable trees, zero-coverage pruning and exact legacy blend compatibility. Existing planner integration; preparation remains optional. |
| Texture reuse | Validated rectangular atlas views with per-tap edge isolation and alpha-weighted filtering. No neighboring item contamination at the view boundary. |
| Transparent composition | Separate canonical encoded-space PMA surfaces, eight blend modes, explicit mask/texture conversion and true isolated group opacity. No reinterpretation of old RGB Images. |
| Filled vectors | Closed polygons and compound holes, even-odd/nonzero winding, checked bounded curves, balanced edge hierarchies, rounded boxes/ellipses, and sample-level boolean geometry. |
| Alpha materials | Solid/linear/radial PMA brushes, validated Q16 stops and pad/repeat/reflect extension, independently specified coverage and color sampling. |
| Soft effects | Owned Morton-order preparation buffers, exact running-sum box blur, explicit border modes, repeated softening, tint/silhouette, integer shifts and prepared halos/shadows. |
| Native text layers | A bridge from existing signed-bearing native glyph masks to isolated PMA groups, allowing native-resolution gradient ink, material masks, group opacity and soft effects without scaling a tiny atlas. |
| Retained rendering | Stable IDs/revisions, persistent radix indexing, conservative move/removal/order damage and broad-phase picking; existing RenderPlan integration. |
| Portable scheduling | True serial PMA tile rendering, bounded coarse native forks, ordered command filtering, source offload request with explicit CPU fallback evidence. |
| Browser integration | Real module-worker pool, bounded queues, stale-result rejection, damage carried through supersession/cancellation/failure, timeout/quarantine/retry/fallback, private last-good frames and dirty-span Canvas uploads. |

Every new API is opt-in. The existing nearest/affine sampler, legacy sprite
rounding, font atlas, text layout, game policy and compiler implementation are
unchanged. Low-level typed helpers retain explicit well-formed-data preconditions;
this is not a general safe binary deserializer or a complete GUI framework.

## Measured changes, including regressions

On the final native CPU benchmark, 32 stable-pose soft-alpha sprites on a 512²
canvas ran through 24 render/checksum rounds, including process startup and cache
preparation. The medians were **0.221054 s immediate**, **0.086181 s serial cached**
and **0.047246 s cached with four workers**: **2.57×** and **4.68×** versus immediate.
These are whole-process timings on the documented 4-core-quota container, not
frame latency, GPU results or predictions for the user's hardware.

Emitted-JS 512² full redraw of stable unaligned sprites improved from **86.990 to
3.472 ms opaque** and **110.986 to 17.678 ms soft-alpha**. Rebuilding those same
patches every frame instead was **36.8% / 39.3% slower** than immediate drawing.
Prepared storage grows substantially for unaligned sprites. The cache therefore
has explicit ownership and invalidation guidance instead of becoming a hidden
mandatory path.

Balanced polygon queries in the final controlled 256² sweeps measured **3.34×,
17.33× and 65.87×** improvements for 64/256/1024-edge convex contours; the hierarchy
depths fell from 64/256/1024 to 7/9/11. Every grid point was compared individually
outside timing. Arbitrary path distributions do not inherit those speedups.

The real 1024² browser workbench is functional, but **cold Aurora construction
still took 10.245 s**. Its cached 28-tile strip updates took 75.4–150.8 ms in three
recorded integration samples. These are distinct workloads, not a 60 Hz claim.
Full-pipeline JS 256² box filtering remains roughly 176–207 ms across the tested
radii: local effect preparation/caching is useful, full-screen per-frame blur is
not yet a fast path. Raw samples, old/initial runs, memory proxies and precise
measurement boundaries are all retained in `review-third/PERFORMANCE.md`.

## Exact validation receipts

| Evidence | Result and boundary |
|---|---|
| Unchanged preceding suite | **85/85 gates pass** with actual pinned compiler under Node. `receipts/baseline/`. |
| Final new source and syntax | **24 Bend closure checks**, including all 15 production modules and the new proof file; **19 JS syntax checks**. No new unsafe/foreign promises in checked closures. `receipts/final-verification/`. |
| New source witnesses | **Eight checked DRAFT laws**, including structural Paint serial/coarse-fork refinement; exact quantified scope is in `contracts/third/`. Not a proof of the whole rendering system. |
| PMA/cache/atlas reference tests | **590,165 arithmetic checks**, **925,351 pixel comparisons**, **16,000 atlas samples**. All alpha pairs across eight modes with seeded valid RGB values—not all RGB combinations. |
| Geometry/effects references | **2,158,592 point queries**, **312,320 coverage checks**, **66,578 gradient checks**, **305,408 pixel comparisons**. Finite F32/integer evidence, not real-number proofs. |
| Retained rendering | **250 frames**, **1,032,192 pixels**, **5,000 picks** versus full redraw/reference state. Missing-revision behavior is an explicit invalid-caller negative control. |
| Native glyph groups | **960 positioned glyphs**, **491,520 pixel comparisons**, including signed bearings, overlap and clipping. Does not prove shaping or font quality. |
| Deliberate code mutations | Wrong alpha rounding and wrong path boundary comparison both fail through **unchanged oracle assertions**, not parser/checker errors. Mutations run only in copied ignored storage. |
| Cached sprite benchmark | **1,966,080 exact full-pixel comparisons**, separate from measured redraw/preparation timing. |
| Path benchmark | **196,608 individually compared grid points** outside timing, plus matching inside counts in all timed sweeps. |
| Native execution | **6,144 complete pixels** across serial/CPU/offload-request variants at one/four workers. Actual compiler → C → clang. Explicit offload ran with `--gpu off`. `receipts/native-final/`. |
| Real browser execution | **12 protocol groups**, **86,016 compared RGBA bytes**, plus the complete **1,024-pixel Bend/native fixture** through both one and four real module workers. Real Canvas2D readback, fault injection and responsive DOM. `receipts/browser/`. |

The four main new JS suites account for **2,754,471 pixel comparisons**; other
benchmark/native/browser counts above are separate and should not be mistaken for
unique test cases. Earlier finite exclusions and both historical **unfilled F32
proof candidates** remain unchanged. No test, tolerance or law was weakened to
obtain a passing result.

## Visual artifacts

`review-third/visuals/` contains six PNGs: the desktop PRISM workbench; native
1024² Aurora, Topology and Signal Room canvases; a responsive narrow workbench;
and the native-type/effects study. The three application canvases are rendered by
actual compiled Bend geometry/coverage/brush/compositing calls. DOM labels and
controls are ordinary host UI; the sixth plate's labels and glyph ink are also
composed by Bend from locally baked native coverage. No imported reference art or
image-generator output is used as a substitute renderer.

The sixth plate's font provenance, mask-generation parameters and final render
hash are recorded. **No font binaries or reusable newly generated font-data
modules are shipped.** Reproduction takes a caller-supplied local font. Visual
inspection is qualitative evidence, not a test of every glyph or color pipeline.

## Remaining gates and deliberate limits

Bun 1.4.2 was unavailable. The unmodified pinned compiler ran under Node v22.16.0
with TypeScript stripping; the normal pinned-Bun wrapper remains unvalidated.
No GPU-device execution or benchmark was performed. Chromium blocked every URL
navigation by policy, so browser tests rebased import locations into about:blank
and data-URL **real module workers** without changing browser policy or library
logic. HTTP/CSP/module-cache deployment must still be tested locally. The host
integration does not promise task interruption during synchronous Bend code.

PMA is encoded eight-bit color, not linear-light/HDR. Blur is repeated exact boxes,
not an analytic Gaussian. Curve sampling is a bounded fixed subdivision, not an
error-tolerance guarantee. Atlas views do not allocate/pack sprites or repair
already contaminated mip levels. Retained IDs require correct revisions and
explicit background damage. Text shaping/bidi/grapheme handling, general mesh
rendering and application widget/input policy remain outside this checkpoint.

This ZIP excludes compiler checkouts, native binaries, generated C, temporary
coverage and ignored scratch builds. Compiled demo JavaScript is intentionally
included as a reproducible review artifact with source-closure hashes. Historical
manifests remain historical; the new manifest is the authority for this delivery.
