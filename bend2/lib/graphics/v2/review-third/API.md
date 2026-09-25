# Third-pass API guide — DRAFT

This is an opt-in extension of graphics v2, not a replacement specification. The
new Bend modules live in `bend2/lib/graphics/v2/third/`; the host transport modules
live in `bend2/lib/graphics/v2/host/`. Existing public files, source laws, proof
attempts, reference tests and pixel formulas are unchanged. Start with
`THIRD_PASS_REVIEW.md`, `PERFORMANCE.md` and `DRAFT_CONTRACTS.md` at this checkpoint.

## 1. Choose the representation before choosing an effect

The earlier renderer uses opaque RGB `Image` trees and independent red-byte alpha
masks. Keep `DrawList`/`RenderPlan`/`Damage` when exact compatibility with that path
matters. `PreparedSprite` and `AtlasRegion` extend that path directly.

The new transparent-layer path uses **canonical encoded-space premultiplied RGBA**
(PMA), packed as `0xAARRGGBB` in an `Image`. Each RGB byte is at most its alpha byte;
alpha zero means the exact zero word. The `Surface` wrapper distinguishes this
meaning, but Bend's underlying `Image` does not enforce it automatically. Passing
PMA words to a legacy RGB API is a caller error. Likewise, a high byte in an old RGB
image is not automatically opacity. Do not silently reinterpret either format.

`Premul.straight(rgb, alpha)` makes a canonical word. `Surface.from_texture` converts
an existing straight-alpha texture, `Surface.masked` turns a red-alpha mask into
colored ink, and `Surface.texture` explicitly returns the old texture format.
Unpremultiplication is lossy at low alpha. `Surface.flatten(surface, background)`
composites PMA onto an opaque RGB background with the **new PMA rounding**, not a
promise to reproduce every legacy round-trip blend.

All square image APIs require well-formed quadtree metadata: `depth <= 12`,
`size = 2^depth`, no branching deeper than depth, and the documented pixel domain.
A uniform `Pix` may terminate above leaf depth. Exported low-level helpers are not
safe deserializers. Validate host-created data; use smart constructors for shapes,
brushes, atlas views and snapshots. The browser transport validates its byte and
job boundaries, not arbitrary internal Bend data.

## 2. Stable legacy sprites: prepare once, draw repeatedly

`PreparedSprite.prepare(depth, size, source_depth, source_size, left, top,
colors, mask, clip)` fixes a source, integer signed translation, square canvas,
and half-open clip. It returns a `Patch` containing canvas-aligned immutable color
and mask trees plus tight bounds. It removes transparent work and reuses aligned
source subtrees when possible. `draw(patch, opacity, target)` uses the unchanged
legacy rounded blend; `command(patch, opacity)` works with the existing planner.

Use a cache key covering **source version, source metadata, integer x/y, canvas
metadata and clip**. Opacity and destination/background are draw-time values and
need not invalidate a patch. Changing any key requires preparation again. Zero
opacity returns the exact target tree. Invalid signed coordinates or an empty
clip produce an inert patch within the stated well-formed metadata domain.

This is particularly useful for UI sprites, stationary decorative layers and
assets that are blended repeatedly over changing backgrounds. It is not an
unconditional animation optimization. The measured 512-square unaligned cache-miss
cases are slower than direct drawing; see the preparation/redraw columns in
`PERFORMANCE.md`. Cache storage also grows: object-node counts are reported, not
misrepresented as native bytes. Bound caches by application lifetime and a memory
budget. Retain the old immediate path for rapidly changing poses.

## 3. Atlas-safe views

`AtlasRegion.make(texture, box)` returns `Some(View)` only for a nonempty rectangle
inside the valid source texture. `nearest(view, x, y)`, `linear(view, x, y, fx, fy)`
and `uv(filter, view, u, v)` sample relative to the selected view. Each bilinear tap
clamps independently to the view, so an adjacent atlas item cannot contaminate a
border. Alpha-weighted reduction keeps transparent hidden RGB from forming fringes.
The U32 bilinear fractions use the existing 0..255 Q8 sampling domain.

A view is not a packing engine. Trim offsets, rotated storage, atlas allocation,
padding/extrusion and per-region mip chains are application/preparation concerns.
In particular, making a view of a globally filtered atlas does not reverse color
bleeding that was already baked into its mip levels. Validate each intended mip
region independently.

## 4. Isolated groups, masks and blend modes

`Surface.blank(depth)` creates transparent storage. `Surface.merge(mode, source,
destination)` preserves painter order and returns `None` for mismatched sizes.
Both inputs must still satisfy their internal depth/size invariants. `opacity`
scales the **finished group**, with exact identity at values >=255 and an exact
transparent root at zero. Applying opacity separately to overlapping children is
not equivalent. No associativity/distributivity claim is introduced.

`Premul.Mode` has `Over`, `Multiply`, `Screen`, `Plus`, `SourceIn`, `SourceOut`,
`Atop` and `Xor`. The source in `SourceIn` supplies the color and the destination
supplies the mask. `Plus` is saturated addition, not unbounded HDR radiance. All
modes operate on **encoded** eight-bit channels, not linear-light values. The
integer equations, one-product half-up division and canonical final clamp in
`Premul.bend` define their exact meaning. The exhaustive alpha-pair test combines
these modes with seeded valid RGB samples; it is not all possible RGB pairs.

The complete effect/type example is `review-third/demo/effects-plate.mjs`. Its
material text uses a prepared native glyph group as the destination of source-in;
its group-opacity sample composites children first and scales once afterward.

## 5. Filled geometry and brushes

`PathFill.polygon(points)` validates the entire list (at most 1024 points), closes
the contour and returns prepared edge geometry. `join` combines contours. Use
`EvenOdd` for parity or `NonZero` for winding; a nonzero hole generally needs the
opposite orientation. The library does not infer “hole policy” from nesting.
Crossings are evaluated with the documented F32 expression, low-y inclusive and
high-y exclusive, with the strict cross-product comparison. Bounds culling does
not substitute a real-arithmetic predicate.

Public polygon preparation uses a **binary-carry edge hierarchy**, preserving
original edges and crossing arithmetic. The old left-accumulating helper remains
available for controlled comparison. Horizontal edges retain occupancy in the
preparation forest even when their ray contribution is empty. Worst-case query
work can still be linear; balanced depth alone is not a universal logarithmic
point-in-polygon claim.

`checked_quadratic` and `checked_cubic` reject invalid controls or subdivision
levels above eight. Levels are a fixed subdivision budget, not a screen-space
error tolerance. The lower-level recursive constructors require a valid, bounded
caller budget. Multiple contours must be joined with a bounded application-owned
structure; joining an unbounded sequence into another left-deep tree defeats the
purpose of preparation.

`Shape` supplies smart constructors for rounded boxes, ellipses, closed paths and
existing round-stroke geometry, plus union/intersection/subtraction. Boolean
operations combine membership **at each sample** before coverage is quantized.
`Center`, `Four` and `Sixteen` use 1x1, 2x2 and 4x4 grids respectively. Coverage is
`floor(255 * hits / sample_count)`. Thin features can miss every sample; no hidden
heuristic changes the specified grid. Hit queries require nonnegative finite
screen coordinates. Geometry coordinates are finite within [-4096,4096]. Ellipse
radii are at least 1/256; rounded radii must fit the rectangle rather than being
silently clamped.

`Brush.stops` validates up to 32 sorted Q16 positions, canonical PMA colors and
right-continuous duplicate stops. `linear`/`radial` prepare reciprocals; solid
brushes carry a canonical word. `Pad`, `Repeat` and `Reflect` specify extension.
Linear axis length and radial radii must be at least 1/256 pixel. Extremely short
axes are rejected before reciprocal preparation. Color is sampled at the pixel
center independently of shape coverage; this is not joint supersampling of a
high-frequency material. Dithering, texture brushes and color-managed linear-light
pipelines remain future work.

## 6. Render once or prepare tile-local work

`Paint.fill(surface, shape, brush, quality, forks, clip)` fills one shape with
explicit sampling, clipping and coarse native fork budget. `forks=0n` uses the
true sequential kernel. Zero coverage avoids brush sampling and preserves the
target. `Raster.command` captures bounds; `Raster.render` executes an ordered list,
partitioning disjoint pixel regions rather than reordering alpha operations.
`Raster.select(commands, tile_box)` prepares a tile-local list. Stable browser
scenes can cache that list and/or the rendered static tile.

`Raster.serial(commands, depth, span, x, y, target)` operates on an explicitly
located square tile. Its image is local to the tile, while shape and brush
coordinates remain in application/world screen space. This makes the serial
kernel reusable in the browser worker adapter without serializing full image
trees across the boundary. The demo uses exactly this arrangement.

`Raster.offload` is a source-level request. Its source-refinement witness and
native CPU-fallback pixel test are **not GPU-device evidence**. Details and future
device gates are in `BACKENDS.md`.

## 7. Blur, soft effects and native glyph groups

`Blur.box(surface, radius, border)` returns an optional surface, rejecting radius
above 128. It performs horizontal then vertical running-sum box filtering with
rounding after **each axis**. `Transparent` keeps zero samples in the fixed
denominator; `Clamp` repeats edge pixels. Radius zero returns the exact input.
`PixelBuffer` conversion uses owned **Morton-order**, not row-major, U32 arrays.
Buffers are not shared mutable objects inside parallel branches.

`Effects.soften` repeats zero to three box passes. This approximates a family of
soft kernels, not an analytic Gaussian. `halo` extracts/recolors alpha, filters,
scales and integer-translates it. `recolor` distinguishes silhouette replacement
from tint modulation. `ImageShift` translates exact U32 words and fills outside
with zero; it introduces no blending or alpha rounding.

Pad a surface deliberately when a shadow/glow needs support beyond its current
edges. Repeated filters and offsets can clip at the square boundary. No implicit
allocation changes the extent. Whole-frame JS blur is still expensive; prepare
and cache an effect, preferably at its local extent, rather than hiding it inside
every draw. Large-radius timing is radius-stable relative to naive neighborhood
work, but measured 256-square full-pipeline times are still roughly 176–207 ms.

`GlyphLayer.prepare(placed_glyphs, depth, color, clip)` consumes the existing
native `Glyph.Placed`/`Glyph.Mask` metrics and red-alpha masks, preserving signed
bearings, baseline origins, order and clip. It creates an isolated group suitable
for group opacity, recoloring, material masking and halos. It does not shape text,
choose a font, infer baselines, provide bidi/grapheme layout or upscale a tiny
atlas. The earlier text-layout modules remain separate. The effects plate uses a
caller-supplied local font at native output resolution; only its final PNG and
provenance are distributed, never font data.

## 8. Retained metadata and damage

`Retained.Item` contains a U32 stable ID, revision, existing `DrawList.Command`, and
an interactive flag. `snapshot(items)` rejects duplicates and more than 1024
items. Its immutable 32-bit radix index supports bounded lookup without scanning
all other items. `damage(old, current)` includes old/new bounds for moves, removals,
insertions, revision changes and painter-order changes. It is conservative, not
minimal or automatically deduplicated. `prepare` bridges into the existing render
planner. `pick` returns the last interactive bounding-box hit in painter order.

The caller must update revisions for changes not expressed by bounds/order:
source pixels, material, opacity, glyph content, clip changes within the same
bounds, and so forth. Background changes require explicit full damage. The test
suite deliberately shows that omitting a revision leaves a same-bounds color edit
undetected; this is an invalid protocol, not an excuse to silently weaken damage
correctness. For precise hits, follow a broad-phase ID with shape/alpha queries.
No focus, capture, drag, widget or game policy is imposed.

## 9. Real browser module workers and presentation

`FrameWorkers` takes square frame/tile sizes, 1..8 workers, an application task
module URL, initialization data, a 100..300000 ms timeout and an optional explicit
fallback. At most 4096 tiles are allowed. The task exports `setup(init)` and
`render(state, input, tile)` returning exactly `tile.size * tile.size * 4` **straight
RGBA bytes**. `review-third/demo/task.mjs` is the complete compiled-Bend example;
`tests/third/worker-task.mjs` is the independent scalar transport oracle.

Initialization data is cloned once to each worker. Frame input is captured once
at submission for snapshot correctness, then that small captured input is posted
with each tile job; postMessage still serializes per-job metadata. Avoid placing
large static assets in frame input. Output ArrayBuffers are transferred. A worker
runs at most one tile; fallback runs at most one tile and yields a host turn
between tiles. This keeps queueing bounded, but it does not interrupt synchronous
Bend computation inside a tile. Bound tile work and total cache size.

Only the complete newest generation publishes. Superseded/cancelled requests
resolve with `committed:false`; failures reject without replacing the private
last-good bytes. Dirty tiles from **every accepted but uncommitted** request carry
forward until publication, including cancellations and failures. This permits
conservative deltas between successive desired states without forgetting the
footprint of the actually committed state. An input rejected before acceptance
(clone/validation failure) does not add damage. A first partial request still
reconstructs the whole frame. Caller mutations of returned bytes cannot corrupt
the private next-frame background.

Failed workers are quarantined, and a current tile is retried at most once.
Explicit fallback is used when no live/initializing worker remains. There is no
automatic worker replacement or successful-frame guarantee after arbitrary task
failure. Dispose terminates workers and settles pending publication. Applications
should listen to readiness/failure diagnostics rather than assume a worker count.

`TilePresenter` maintains one ImageData, forces a complete first upload, then
copies only dirty row spans and merges adjacent tile uploads. It consumes
committed frame objects, never incomplete stages. The application must present
its chosen committed generations in order and keep the canvas dimensions fixed.
The pool's `totalMs` starts after input validation/capture and dirty-union selection,
then includes stage allocation, queued work, transfers and private publication;
it excludes Canvas upload/display and module-load time before the request. The
presenter reports upload time separately. No timing is a GPU or display-scanout
claim.

## 10. Complete examples and evidence

Run `python review-third/demo/serve.py` and open the printed loopback address.
Compiled modules are included; compiler installation is not needed to inspect the
showcase. Three scenes exercise compound contours, alpha gradients, constructive
geometry, instrumentation and incremental timeline updates. The host page owns
all styling, camera-free geometry, UI placement and event meaning. The library
contains none of that policy.

Use `REPRODUCE.md` for compiler validation, independent pixel tests, mutation
controls, native benchmarks, actual browser faults and the optional local-font
plate. Browser navigation was blocked by this container's policy; tests used real
module workers with in-memory import-location rebasing, without changing browser
policy. Ordinary HTTP/CSP deployment still needs a local integration check.
