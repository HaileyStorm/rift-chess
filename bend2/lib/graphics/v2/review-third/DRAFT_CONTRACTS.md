# Third-pass DRAFT contract proposals

This file proposes **new opt-in contracts only**. Every earlier law, proof witness,
finite oracle, exclusion, and failed/unfilled candidate remains byte-for-byte
unchanged. No prior RGB, straight-alpha sampler, font, grid8, or compiler contract
is replaced. Source equality is not a theorem about compiler correctness, browser
scheduling, floating-point real arithmetic, or GPU hardware.

## Proposed meanings, in plain English

1. **An isolated surface has a new pixel type.** Each word is canonical encoded-space
   premultiplied RGBA `0xAARRGGBB`, with every RGB channel no larger than alpha.
   Old RGB trees and red-alpha masks require explicit conversion. Zero alpha has
   no hidden RGB. Conversion back to straight color is quantized and not invertible.
   The eight documented blend equations and final canonical clamp define this API;
   they do not change legacy blending or promise linear-light/HDR behavior.
2. **Group opacity acts once on the finished group.** Opacity 255 preserves the
   exact input surface, and zero gives a transparent Pix with the same metadata.
   Applying opacity to each child is generally different. No associativity or
   distributivity claim is introduced.
3. **Blur has reproducible integer semantics.** A box pass uses horizontal then
   vertical running sums, radius 0..128, rounding after EACH axis. Transparent
   borders include zero samples in the fixed denominator; clamp repeats the edge.
   Radius zero returns the exact surface. Repeating zero to three box passes is
   explicitly an approximation family, not a Gaussian/tolerance promise. Buffers
   are exclusively owned Morton-order arrays; depth/size/image consistency remains
   a precondition, not a dynamically proven property.
4. **Prepared sprites preserve the earlier sprite meaning.** Preparation fixes
   source, integer translation, canvas size and scissor, while background and
   opacity remain draw-time values. For valid earlier inputs, cached and uncached
   output pixels must agree exactly. A zero-opacity draw returns the exact target.
   Preparation can cost more time/memory than immediate drawing; there is no
   automatic cache-invalidation or speed guarantee.
5. **Shapes and brushes specify their sampling approximation.** Paths use the
   explicit F32, low-inclusive/high-exclusive crossing rule, with even-odd or
   nonzero winding. Antialiasing uses a 1x1, 2x2 or 4x4 sample grid and quantizes
   coverage once. Boolean operations combine membership before quantization.
   Gradients interpolate canonical PMA knots, and sample color at pixel center,
   independently of geometric coverage. Linear axes and radial radii must be at
   least 1/256 pixel; extremely short axes are rejected to prevent reciprocal
   underflow. Checked curve wrappers reject more than eight subdivision levels or
   invalid controls rather than truncate. These are NEW domains, not weakened old
   path/texture contracts.
6. **Paint scheduling does not alter source meaning.** Coarse forks divide disjoint
   pixel regions above exactly the same sequential kernel. Painter order is never
   parallelized. The Paint scheduling witness is structural and universal in its
   typed source arguments; its useful rendering domain still requires well-formed
   image metadata and valid shape/brush constructors. Raster source offload has the
   same source expression as ordinary rendering; device execution needs separate
   evidence. Zero geometric coverage leaves the exact target untouched.
7. **Retained state is explicit metadata, not a semantic scene diff.** Stable IDs
   are unique U32 values (at most 1024 per snapshot). Bounds, ordering, insertion and
   removal generate conservative damage. Callers must increment revisions for
   other pixel-affecting edits; changing the background requires full damage.
   Picking returns the frontmost interactive bounding-box ID, not precise alpha hit
   testing, pointer capture or game policy. Omitted revisions are deliberately
   demonstrated as an invalid caller protocol, not papered over by a test.
8. **Worker publication is atomic and latest-request-wins.** Submission captures
   the input once with structured clone. Tile tasks receive application-owned
   scene data, not implicit library internals. Only complete current generations
   publish; superseded/cancelled/failed generations cannot overwrite the private
   last-good frame. The first frame reconstructs everything. Partial updates require
   conservative OUTPUT damage. Output buffers belong to the caller. Initialization,
   timeouts, malformed results, retries, fallback and disposal have explicit
   outcomes; they are tested runtime protocols, not Bend source proofs.

## Proposed checked witness inventory

`contracts/third/LAWS.bend` and `PROOF.bend` add source witnesses for group opacity
endpoints, zero-radius blur, zero-opacity prepared sprites, empty ordered raster,
zero-coverage identity, Paint serial/coarse-fork refinement and source offload
refinement. Their exact quantified statements are the authority. Broad PMA,
geometry, blur-buffer, atlas, retained-scene and worker claims additionally need
finite independent references and executable integration receipts; they are NOT
represented as proved by these small witnesses.

## Evidence preservation and review status

All proposals remain **DRAFT** until local review. Previous two unfilled F32 proof
candidates remain unfilled, with the same propositions and historical failure
logs. No exclusions are added to make old or new finite comparisons pass. Native
CPU, real browser workers, and optional GPU-device execution must be distinguished
in the final receipt table. A CPU offload fallback is never labeled GPU evidence.

## Additional clarified new meanings from integration review

9. **Polygon acceleration is representation-only.** Binary-carry preparation
   balances the same finite edge set. It must preserve every F32 crossing result
   and resulting coverage sample; the old left-deep constructor is retained for
   differential measurements. No new geometric tolerance or exclusion is allowed.
   Balanced depth does not promise logarithmic point queries for arbitrary shapes.
10. **Native glyph grouping preserves existing glyph inputs.** `GlyphLayer` consumes
    the old Mask/Placed metrics, signed bearings and coverage but explicitly
    converts the result to PMA ink. It preserves placement, clip and order. It does
    not claim that PMA rounding after conversion is identical to all old legacy
    composition sequences, nor that font selection/shaping is solved. The exact
    old glyph meaning remains untouched; the new group reference is independent.
11. **Uncommitted damage survives abandoned generations.** The worker pool unions
    dirty tiles from accepted requests until a successful publication. It carries
    damage from superseded, cancelled and failed work into the next accepted
    generation. Rejected input validation/clone requests add none. Running tile
    work can finish after cancellation but cannot publish stale output. Fallback
    yields between tiles without changing pixel or publication semantics.
12. **Atlas view sampling isolates existing subrectangles.** Valid nonempty views
    clamp every sample tap to their selected rectangle using the existing sampler
    arithmetic. This prevents sampling a neighbor, but cannot repair contamination
    already baked into globally generated mip levels. Atlas allocation/packing and
    per-region mip preparation are not implied contracts.

The final source check accepts all eight new witnesses. The unchanged independent
oracles reject deliberate wrong alpha rounding and non-strict path boundary
mutations through assertion failures, not parser/checker errors. Complete native
and real-worker pixel fixtures are additional finite execution evidence. All
proposals remain DRAFT pending local review; these additions do not fill, rename,
weaken or remove either historical unfinished F32 proof candidate.
