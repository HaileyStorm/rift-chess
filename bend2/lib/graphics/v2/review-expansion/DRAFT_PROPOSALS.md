# DRAFT expansion proposals — no replacement of prior contracts

These are proposed additions, not retroactive interpretations of the core Laws.
The original core `LAWS.md`, `contracts/LAWS.bend`, `contracts/PROOF.bend`, existing
finite-test exclusions, grid8 laws and previous extension evidence remain intact.
New formal witnesses go in a separate sibling-LAWS/PROOF package. A compiler check
is evidence about those particular witnesses, not a claim that all listed prose
properties have been proved.

1. **Region algebra.** Half-open nonnegative screen rectangles; empty/reversed
   bounds are empty. Intersection does not invent an inclusive last pixel.
   Signed sprite placement is validated and clipped before removing the bias.
2. **Ordered rendering.** On well-formed images, translating an alpha sprite with
   a scissor changes exactly the intersection of its footprint, clip and canvas.
   Command lists have front-to-back *execution* order (earlier items painted first).
   Spatial filtering preserves that order. Only a later full-opacity fill covering
   the complete tile certifies that earlier commands may be discarded.
3. **Partition and scheduling refinement.** Rendering a prepared plan denotes the
   same pixels as the ordered command list. Fork budget changes evaluation strategy,
   not painter order. An explicit sequential kernel under each tile removes hidden
   nested parallel work; prepared plans contain immutable Data, not mutable handles.
4. **Conservative repaint.** Callers supply damage covering every changed old/new
   footprint and every changed background region. Each touched prepared tile is
   rebuilt from the current background and current ordered commands; untouched
   tiles preserve the prior image. Removing the final command restores background.
   Damage is conservative, not a promise of minimum repaint area or automatic tracking.
5. **Uniform-mask specialization.** A Pix mask denotes constant red-channel alpha
   throughout its declared source footprint. Computing its effective alpha once and
   skipping mask lookups preserves the old MaskedStamp integer rule, including
   clipping, alpha/opacity rounding and exact zero/full endpoints. This is an
   implementation refinement; no old alpha meaning or domain changes.
6. **Filtered RGBA.** A separately named opt-in sampler uses 8-bit bilinear fractions
   with weights summing to 65536. It accumulates encoded RGB weighted by alpha,
   rounds coverage, then unweights once; zero rounded coverage has canonical RGB=0.
   This does not assert linear-light correctness, HDR support, an sRGB transfer
   function, or a change to existing AffineTexture nearest-center semantics.
7. **Prepared affine images.** A finite nonsingular unit-square transform is prepared
   once, then sampled at pixel centers with the existing four quarter-pixel geometry
   samples. Geometry coverage and rounded effective alpha compose in the stated
   order. Explicit clipping and filter choice are part of this new API. F32
   presentation is not a cross-backend bit-identity promise.
8. **Nine-slice.** Corners retain their source-pixel extent; edges scale one axis,
   center scales both, using integer nearest-center mapping. A target smaller than
   opposing margins is rejected as an exact no-op, rather than silently adopting a
   UI shrink policy. Source center must have positive width and height.
9. **Vector strokes.** Round-ended capsules combine by OR-ing their quarter samples
   before one source-over operation per pixel. Overlap at joins does not apply
   opacity twice. Fixed subdivision depth explicitly bounds curve approximation;
   it is not a tolerance-controlled analytic Bézier renderer.
10. **Text preparation.** Layout consumes explicit metrics and caller-supplied source
    indices. Wrapping, tabs, line breaks, truncation, kerning reset and caret placement
    have independently testable integer meanings. No assertion of Unicode shaping,
    bidi, grapheme segmentation or font fallback is hidden inside scalar layout.
11. **Reusable application arithmetic.** Layout allocations, motion stepping and
    image preparation are pure calculations with stated bounded domains, explicit
    endpoint behavior and independent host oracles. They do not choose application
    camera policy, game geometry, theme, widget hierarchy or event routing.

## What is *not* weakened

The original red-mask convention, rounded `/255` blend, malformed/out-of-domain
exclusions, AffineTexture's existing F32 tie bands, frozen v1 dependency, compiler
pin and old proof statements retain their prior meaning. New tests will not widen
old exclusions to excuse an implementation bug. If a new proposal fails validation,
its implementation or new witness must be repaired, or the feature labelled unready;
that does not rewrite old evidence as passing.

## Additional refined proposals and final status

12. **Shared-prefix gather.** Looking up the four clamped adjacent texels through
    their common quadtree prefix returns the same four packed values as four
    ordinary root lookups. Uniform nodes can terminate immediately. This changes
    traversal cost, not coordinates, sample count, filtering precision or alpha.
    Status: implemented; 24,000 independent finite gathers and downstream exact
    filtering tests; controlled native performance evidence. No general gather
    source theorem is claimed.
13. **Ramps and periodic fields.** A validated 1..16-stop gradient uses sorted
    16-bit positions with right-continuous duplicates and exact encoded-channel
    interpolation. Its prepared LUT is an explicitly approximate nearest table.
    A seeded integer q8 field repeats at a stated lattice period, with bounded
    octave weights and preparation depth. Status: implemented and independently
    finite-tested, including 24,000 periodic translations. These are not physical
    materials, seamless first/last-pixel equality, or a new color-space claim.
14. **Host framebuffer boundary.** A valid opaque RGB Image written through the
    host adapter updates exactly the supplied clipped output region, with alpha
    255 and unchanged source Data. A first Canvas presentation initializes all
    pixels; later empty damage performs no upload. Status: typed-array/reference
    and mock-Canvas tests. Actual browser/device behavior and upload speed are
    not asserted from the mock.

Proposal 5 (automatic uniform-mask dispatch) remains a **rejected implementation
experiment**, not an enabled optimization. Its intended old alpha meaning was
never changed, and `MaskedStamp.bend` is restored to the previous delivery bytes.
The candidate and failing performance evidence are retained under `experiments/`
and `receipts/`. Rejection did not relax a contract.

### Completed source witnesses versus unfilled candidates

All 50 original declarations now check under the exact supplied compiler via
Node: 24 core graphics, 12 previous-review extensions, six RGA1 asset laws, and
eight grid8 laws. Their files and old historical evidence are unchanged. Twelve
new declarations check in `contracts/expansion/PROOF.bend`:

| New declaration | Exact scope of the checked statement |
|---|---|
| `scheduling_refinement` | Structural equality of `pool` and `serial` for every fork budget/tree/depth; proved by induction, not just example reflexivity |
| `offload_source_refinement` | Equality at source after the explicit offload annotation; not a GPU/runtime theorem |
| `no_damage` | Empty damage preserves the previous Image exactly |
| `removed_tile_restores_background` | A touched Keep node restores the background |
| `empty_commands` | Empty command list is target identity |
| `empty_texture` | A zero-size texture samples transparent canonical zero |
| `clipped_zero` | Zero-opacity clipped stamping is target identity |
| `nine_slice_zero` | Zero-opacity skin drawing is target identity |
| `zero_tick_interval` | Zero interval returns InvalidInterval |
| `hidden_rgb_filter_regression` | One exact closed hidden-RGB/alpha reduction discriminator |
| `empty_layout_regression` | One exact closed empty-layout result |
| `tick_conservation_regression` | One exact closed stepping/drop/remainder discriminator |

The stronger prose claims about general planner binning, scalar geometry,
gradient interpolation, text wrapping and timing conservation **are not all
formalized by these twelve declarations**. Their broader evidence is independent
finite references, and their public domains remain explicit. A checked regression
witness must not be described as an all-input proof of the subsystem.

Two attempted F32 witnesses did not check. The checker does not reduce the
relevant F32 intrinsics even for the included literal discriminator. Both
original meanings—zero-radius strokes are empty, and the identity transform maps
origin to origin—remain unchanged in
`contracts/expansion/presentation/LAWS.bend`, **unfilled and DRAFT**. The attempted
reflexivity witnesses and failure logs are retained. Runtime finite tests are
not passed off as their source proofs. No unsafe axiom or weakened replacement
was introduced to make the proof gate green.
