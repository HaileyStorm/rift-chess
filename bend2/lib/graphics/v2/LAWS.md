# Graphics v2 contract proposal — DRAFT, not frozen

This document is a proposal for review. It is not a manifest, accepted law
version, or evidence that a proof has closed. No existing v1 law is changed.

## Values and coordinates

An `Image` at depth `d` denotes a `2^d` square. `Pix{c}` is uniform, and
`Qua{nw,ne,sw,se}` denotes four equal squares. The independent pixel meaning
`sample(d,image,x,y)` selects the quadrant determined by the high bits of
`x,y`, subtracts that quadrant's origin, and repeats; a `Pix` returns its
color at any remaining depth. It is defined only for a structurally well-formed
tree and `0 <= x,y < 2^d`. Invalid `Qua` at depth zero is outside the contract.

Public geometry coordinates are `Pos{value}` or `Neg{magnitude}` with canonical
zero `Pos{0}`. Values and magnitudes are at most 4096. A valid canvas has
`0 <= d <= 12` and `size=2^d`. A disk radius is at most 4096. Rounded bounds
are half-open `[left,right) × [top,bottom)`, ordered, with radius no greater
than half either extent. Out-of-range geometry means an invalid Coord,
radius >4096, or invalid rounded extent/radius; those cases are inert.
Canvas `size/depth` mismatch is a caller precondition, not a tested invalid
geometry case. An input Image at the
given depth is a precondition, not a runtime type test.

Quarter samples of pixel `(x,y)` are exactly `(4x+1,4y+1)`, `(4x+3,4y+1)`,
`(4x+1,4y+3)`, `(4x+3,4y+3)` in quarter-pixel integer coordinates. A disk
sample is covered iff its squared distance to `(4cx,4cy)` is at most
`(4radius)^2`. A rounded-rectangle sample is inside its half-open bounds
and its distance to the nearest point in inner rectangle
`[left+radius,right-radius] × [top+radius,bottom-radius]` is at most radius.
The canvas only samples its own pixels; shape positions can be negative and
can extend beyond it. `N` is the number of covered quarter samples (0..4).
The implementation maps valid signed Coord values to U32 by adding a 4096
bias, so the translated canvas interval is [4096,8192]; no signed value is
cast from a wrapped U32. Quarter coordinates are at most 32767; with valid
centers, each axis delta is at most 32767, and the squared-distance sum is
less than 2,147,483,648, below U32 overflow. Invalid coordinates can wrap
in a cheap validation calculation, but cannot reach a squared-distance path.

## Proposed semantic laws

1. `Color.over(src,dst,a)` is packed RGB source-over. For `a=0`, it is `dst`
   exactly; for `a>=255`, it is `src` exactly. For `0<a<255`, each 8-bit
   channel is `floor((s*a+d*(255-a)+127)/255)` and repacked. Inputs for the
   channel law are in `[0,0xFFFFFF]`; high bits are not alpha. Rounded alpha
   composition is not asserted associative.
2. `Layer.over(d,source,0,target)` returns the exact target tree and
   `Layer.over(d,source,a,target)` for `a>=255` returns the exact source tree.
   For `0<a<255`, at every valid `(x,y)`, its sample equals
   `Color.over(sample(d,source,x,y),sample(d,target,x,y),a)`.
3. `Shapes.disk` and `Rounded.draw` leave each pixel with `N=0` unchanged,
   and return `Color.over(color,old,floor(min(opacity,255)*N/4))` at each
   pixel with `N>0`. Their source trees are not observably mutated. A disk
   whose nearest possible quarter sample is outside the radius leaves the
   exact input Image tree; an empty/reversed/out-of-range rounded rectangle
   is inert.
4. `Gradient.vertical/horizontal` at valid power-of-two `band` dividing
   `size` samples the fixed-point ramp at band origin
   `q=floor(coordinate/band)*band`. If `finish<=start`, its fraction is 255
   for every q. Otherwise the fraction is 0 for `q<=start`, 255 for
   `q>=finish`, and `floor((q-start)*255/(finish-start))` in between. The
   output is `Color.over(last,first,fraction)`, including that function's
   per-channel rounding. For the numeric numerator to fit U32,
   `size,start,finish <= 4096`; `band>=1`.
5. Partition/join: independently rendering the four correctly offset child
   quadrants and assembling `Qua` produces the same pixel sample as a
   sequential reference shader at every valid `(x,y)`. The equality must
   hold for every scheduling order and is stated against an independently
   written scalar pixel specification, not by invoking the production tree
   implementation as its own expected answer.
6. The baked glyph data denotes 24-pixel rows of two-bit alpha levels.
   For a lit run of level `v` in 1..3, text draws a clipped half-open
   rectangle with alpha `85*v` over the current Image; 0 is inert. Advance
   widths and named kerning pairs govern positioning, while unrecognized
   characters use the replacement glyph. The exact font outlines and
   aesthetics are data/visual evidence, not a formal typography theorem.
7. `Ring.draw` requires the same valid Coord/depth/size domain as `Shapes.disk`,
   with `0<=inner<outer<=4096`. A quarter sample is covered iff its squared
   distance is `<= (4*outer)^2` and `> (4*inner)^2` (the inner disk includes
   its boundary). `N=outerCount-innerCount` is in 0..4; output is
   `Color.over(color,old,floor(min(opacity,255)*N/4))` once per pixel.
   `inner>=outer`, an outer radius >4096, invalid Coord, or zero opacity
   leaves the exact input tree. General valid-range pixel coverage is an
   independent differential obligation, not yet a formal theorem.
8. `Facet.draw` retains the existing F32 convex-edge semantics and samples
   projected face coverage at four quarter-pixel positions. Its source
   checking and finite visual/raster checks are separate from the integer
   exactness claims above; F32 edge arithmetic is axiomatic at the Bend
   checker boundary, and no native/browser bitwise equivalence is asserted.
9. `RaisedFacet.draw_cell(False{},...)` takes arbitrary externally projected
   convex four corners, an extrusion vector and `Surface`, but returns the
   exact input Image before F32 rasterization. When True, the caller supplies
   corners in visible convex winding and chooses the near/right sides and
   draw order. `paint_corners` draws the same cast shadow, front/right side,
   top face and bevel that the former `SpatialBoard` primitive drew. F32
   coverage/occlusion remain finite and rendered evidence, not formal
   integer-exact geometry proofs; camera and picking policy belong to callers.
10. `Stamp.draw` overlays a power-of-two source Image at an explicit signed
    Coord origin, treating one U32 key color as transparent. For valid
    source/target depth/size and each target pixel, an in-bounds source pixel
    with a non-key color replaces the destination; a key pixel or out-of-bounds
    sample preserves the destination color. A uniform Pix of key color
    returns the exact original tree before descent. Arbitrary offsets,
    negative clipping and later-stamp overlap are independent finite
    differential obligations; physical subtree aliasing is not claimed.
11. `Grain.draw` is an optional generic filled convex face. Its caller
    supplies a well-formed Image at `size=2^depth` with `32<=size<=4096`,
    finite corners in the visible convex winding accepted by `Quad.make`,
    packed RGB palette channels, and `opacity` in 0..255. Valid `grain_size`
    is exactly one of 4, 8, 16, 32, and `seed` is 0..255. For a canvas pixel
    `(x,y)`, set `bx=floor(x/grain_size)`, `by=floor(y/grain_size)` and
    `h=(73*bx+151*by+seed+((bx*by) mod 251)) mod 256`; choose `spark` when
    `h<12`, `shade` when `12<=h<36`, otherwise `base`. With the stated size
    and grain bounds, `bx,by<=1023`, `bx*by<=1,046,529` and the hash sum is
    at most 229,657, so no U32 intermediate wraps. Its face coverage uses
    precisely `Facet.coverage` at quarter-pixel positions `(x+.25,y+.25)`,
    `(x+.75,y+.25)`, `(x+.25,y+.75)`, `(x+.75,y+.75)`. For count `N` in
    0..4, the pixel is `Color.over(chosen,old,
    floor(min(opacity,255)*N/4))`; N=0 preserves that pixel. A fully covered
    aligned block of at most `grain_size` pixels may share a subtree, with
    the same per-pixel meaning; no general structural identity is asserted.
    Area `<=0.1f32`, zero opacity, invalid grain size or seed>255 returns
    the exact input tree before raster descent. F32 edge ties remain finite
    evidence with the existing tolerance, never an exact cross-target theorem.
12. `RaisedFacet.paint_corners_grained` keeps the same six-face shadow,
    front/right, top, lip, glint painter order as `paint_corners`, replacing
    only the top `Facet.draw` with `Grain.draw(...,opacity=255)`. The top color
    is the grain palette; `Surface.top` is ignored on this opt-in path, while
    `Surface.side/edge/shadow/glint` keep their existing roles. Its visible
    corner/extrusion preconditions are the same as `paint_corners`.
    `draw_cell_grained(False{},...)` returns the exact input tree before any
    F32 projection or material hash, regardless of its unused style/points.
    This does not imply that an invalid grain input makes every side inert.
13. `Texture.serial_tree(levels,size,x,y,material)` uses four sequential
    child calls at each level, placing `Texture.leaf` in immutable
    TL/TR/BL/BR order. `Texture.pool_top(forks,levels,size,x,y,material)`
    delegates exactly its first `forks` levels to balanced four-child
    parallel calls and builds the rest with `serial_tree`. A valid call has
    `0<=forks<=levels<=7`, nonzero `size` divisible by `2^levels`, and
    nonwrapping `x+size`, `y+size` within the supported 4096 canvas domain.
    Both produce exactly the same entire Qua/Pix structure and U32 leaf
    colors as existing `Texture.tree(levels,size,x,y,material)` regardless
    of scheduling; Grain hash wrapping is the existing U32 bitwise semantic,
    Hatch period zero keeps its existing base-color behavior. No runtime
    behavior is asserted for invalid size/origin/forks. `pool_top(0n,...)`
    returns `serial_tree(...)` exactly before any task fork; that endpoint
    is the narrow formal proof. General arbitrary-level structure and
    pixels remain an independent finite differential until an inductive
    theorem actually closes. At `forks=3,levels=7`, the valid `pool_top`
    shape has 64 branches of 256 leaves (16,384 total), but WSL2 Clang18
    measurements on this cheap material were slower than `serial_tree` at
    threads1/4/8. Scheduling choice is a caller-measured decision, not a
    library speed claim. Existing `fine_on_pool` retains its 4^7
    GPU-oriented bang route unchanged and lacks device timing. Existing
    `tree` has a four-way parallel let and must not be called strictly serial.
14. `AffineGrain.draw` is a generic object-anchored fill for a projected
    affine parallelogram. Its public arguments are `depth,size,p00,p10,p01,
    palette,seed,texels,opacity,image`. A valid call has a well-formed Image,
    `size=2^depth<=4096`, finite input points and derived fourth corner in
    [-4096,4096], either sign of the affine determinant, both
    `abs(det)>0.1f32` and `Quad.make(...).area>0.1f32`, texels exactly
    8/16/32, seed in 0..255 and packed RGB palette channels. Let
    `du=p10-p00`, `dv=p01-p00`, `det=du.x*dv.y-du.y*dv.x`, and derive
    `p11=p00+(du+dv)` componentwise in that F32 operation order. For each pixel center
    `(x+.5,y+.5)`, compute `inv=1/det`, `ux=dv.y*inv`,
    `uy=(-dv.x)*inv`, `vx=(-du.y)*inv`, `vy=du.x*inv`,
    `dx=x+.5-p00.x`, `dy=y+.5-p00.y`, then local coordinates are
    `u=ux*dx+uy*dy`, `v=vx*dx+vy*dy`, in that F32 operation order. Quantize each
    coordinate to 0 for `t<=0`, to `texels-1` for `t>=1`, otherwise to
    `floor(t*texels)`, obtaining `(i,j)`. This selection is from the **pixel
    center even if a texture boundary crosses that pixel**. Choose palette
    color with `h=(73*i+151*j+seed+((i*j) mod 251)) mod 256`: `spark` when
    `h<12`, `shade` when `12<=h<36`, otherwise `base`. Here `i,j<=31` and
    the hash sum is at most 7,449, below U32 overflow. Coverage `N` is the
    four quarter samples of the derived `Quad.make(p00,p10,p11,p01)` using
    precisely `Facet.coverage`; the output sample is
    `Color.over(chosen,old,floor(min(opacity,255)*N/4))`, so N=0 leaves that
    pixel unchanged. When a quadtree region is fully inside the face *and*
    all its pixel centers have the same quantized affine UV texel, it may
    reuse one filled subtree; no arbitrary Image structural identity is
    asserted. Opacity zero, invalid texel count or seed>255 returns the
    exact input before any F32 work. Degenerate determinant/Quad area returns
    the exact input after finite F32 classification but before inverse
    division or raster descent. Nonfinite/out-of-range points, invalid
    depth/size and malformed Images remain caller preconditions. F32 edge
    ties within ±1e-5 pixel distance and local UV boundaries within ±1e-5
    scaled texel units have finite ambiguity; require exact independent
    pixel agreement outside those bands. The checker proofs cover only the
    zero-opacity and zero-texel early identities, not general raster, native
    or GPU bitwise equivalence.
15. `AffineTexture.draw` maps an immutable opaque RGB source Image onto a
    projected affine parallelogram. It accepts `depth,size,p00,p10,p01,
    source_depth,source_size,source,opacity,target` in that order. A
    `source_size=0` sentinel returns the exact target tree at every opacity
    before any F32 work. Otherwise a valid source has
    `source_size=2^source_depth`, `0<=source_depth<=9`, side1..512 and a
    structurally well-formed Image at that depth. Nonzero mismatched size or
    malformed source is a caller precondition, not an invalid-input theorem.
    The target Image/canvas, corner bounds, derived p11, determinant signs,
    area threshold and F32 inverse/UV operation order are exactly law14.
    For each output pixel, compute UV at its **single center** `(x+.5,y+.5)`.
    For each `t=u,v`, choose source index 0 if `t<=0`, `source_size-1` if
    `t>=1`, otherwise `floor(t*source_size)`; an exact interior integer
    boundary `k` maps to texel `k` on the right/bottom. Its opaque color is
    one `Pixel.sample_xy(source_depth,i,j,source)`. The four quarter-pixel
    positions determine only the geometric coverage count `N` of the
    derived Quad, never four texture colors. A source texel boundary may
    cross the output pixel and still has this deterministic center-nearest
    color. The output is `Color.over(sampled,old,
    floor(min(opacity,255)*N/4))`; N=0 preserves the pixel. A fully covered
    subtree may share one filled color only if every pixel center in it
    quantizes to the same source texel; no arbitrary-tree identity is
    asserted. Opacity0 or source_size0 returns the exact target before F32.
    Degenerate determinant/Quad area returns the exact target after F32
    classification but before inverse division/raster. F32 edge ties within
    ±1e-5 pixel distance and UV boundaries within ±1e-5 scaled source-pixel
    units remain finite ambiguity; independent scalar pixel equality is
    required outside those bands. Native/GPU bitwise and speed claims require
    separate execution. Only the two early identities are formal signatures.
16. `MaskedStamp.draw(target_depth,target_size,source_depth,source_size,
    left,top,colors,mask,opacity,target)` composes a small immutable RGB
    sprite with a separate immutable alpha Image. A valid call has
    `target_size=2^target_depth<=4096`, `source_size=2^source_depth`,
    `0<=source_depth<=9`, side1..512, and structurally well-formed color,
    mask and target Images at their stated depths. `left` and `top` are
    canonical signed `Shapes.Coord` in [-4096,4096]. The mask alpha at a
    sampled source pixel is exactly `Color.red(maskColor)` in 0..255; its
    green/blue channels are ignored even if unequal. Outside the half-open
    translated source square, each target pixel remains unchanged. Inside,
    sample color and mask at the same integer source coordinate
    `(targetX-left,targetY-top)`, compute
    `effective=floor((alpha*min(opacity,255)+127)/255)`, then apply
    `Color.over(sourceColor,old,effective)` once. For negative origins,
    coordinates first receive the same 4096 bias as `Shapes`; subtree
    overlap is classified before source subtraction, so `x-sx,y-sy` never
    underflow in a live leaf and additions stay below 8704. Clipped source
    pixels outside the target make no change. `opacity=0` or a uniform mask
    `Pix{0}` returns the **exact target tree** before signed geometry/descent
    for structurally valid inputs; no malformed-tree theorem is asserted.
    Correctly aligned fully red (`Color.red(mask Pix)=255`) at opacity255
    may reuse a color source subtree when available, but the contract only
    requires observational pixel equality. Sequential calls have caller
    painter order: later sprites blend over prior output, without automatic
    depth test or camera policy. General negative clipping and overlapping
    partial alpha remain independent scalar finite obligations; only the
    two exact early identities are formal signatures. CPU/GPU timing and
    a game-owned turntable/angle selection are separate evidence.

## Proposed formal proofs and independent gates

All **24 core graphics DRAFT signatures** in `contracts/LAWS.bend` and
`PROOF.bend` closed under pinned 2.0.27 on 2026-09-24 without unsafe or
foreign evidence, including two AffineTexture and two MaskedStamp early
identities. The latter's independent emitted-JS scalar gate passed 65,540
clip/alpha/overlap comparisons; its 32-piece settled construction was
~112–142ms at512 with32px sources and~604–670ms at1024 with64px sources,
plus separate serial blit. Neither is a drag/browser/native/GPU speed claim.
The other eight DRAFT signatures moved to
`../../grid8/contracts/` unchanged in meaning and also rechecked.
[The exact 23-law migration table](../../grid8/LAW_MIGRATION.md) binds both.
This set establishes
endpoint/inert identities,
selected concrete quarter coverage, one-level and arbitrary-depth Qua
partition structure for a fixed alpha, and absent-cell/empty-mask cases.
This is a checker receipt for a DRAFT source, not an accepted frozen law set.
General pixel-level coverage, compositing under every well-formed Image,
rounded clipping, gradients and F32 projected geometry remain independent
finite/reference obligations. Do not promote those to formal theorems without
a general proof that retains their exact semantics.

The tests compare actual emitted JS to independently coded integer references
for clipped partial disks/rounded panels/Rings, negative positions,
per-channel blends, translated samples, gradient bands, tile cells and
fractional Facet quarter samples. The tester samples whole small images and
representative 1024/2048 projected camera edges with explicit F32 near-line
ambiguity. This does not establish native or GPU bitwise equality.
Rendered PNG inspection and single-core frame timing are separate gates.
Selected Texture C emission and WSL2 native CPU1/4/8 timings are recorded
separately in `PRO_HANDOFF.md` and found parallel fanout slower than serial
for that workload. GPU build/execution, browser WebGPU measurement and owner
visual acceptance remain separate, absent evidence.
