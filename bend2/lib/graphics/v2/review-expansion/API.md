# Reusable graphics expansion — API and integration guide (DRAFT)

The package remains `bend2/lib/graphics/v2`. All modules introduced in this pass
are additive. Existing `MaskedStamp`, `AffineTexture`, `AtlasText`, v1 graphics,
grid8 and the toolchain pin keep their previous definitions. This guide describes
new interfaces; it does not amend the old sampler, font or alpha contracts.

## 1. Data model and public-domain rules

A Bend `Image` is a square quadtree: `Pix{color}` denotes a uniform square at the
current declared depth; `Qua{tl,tr,bl,br}` divides it into four equal squares.
Packed colors are `0xRRGGBB`. Alpha textures remain a **separate Image whose red
byte is coverage**. An `Image` is not an RGBA framebuffer. Supplied depth/size must
agree (`size = 2^depth`), and a `Qua` must not occur below depth zero. Preparing
source/mask pairs once and retaining immutable references is the intended path.

Unless a module states a narrower domain, screen dimensions are powers of two up
to 4096, depth is at most 12, and screen coordinates/extents stay within 0..4096.
Signed sprite coordinates use existing `Shapes.Pos`/`Shapes.Neg` and the 4096 bias;
`Rect.Box` is **unbiased, half-open, nonnegative**. F32 geometry must be finite,
with coordinates in -4096..4096. NaN/infinity behavior is not a public promise.
No runtime validator walks every supplied Image: these are pure typed-library
interfaces, not untrusted-file decoders. Use the existing RGA1/RGA2 boundaries for
external bytes; use `Ramp.build` rather than constructing unchecked stop data.

Many internal helpers are exported by Bend's current module mechanism. The named
entrypoints below are the intended integration surface. Calling internal kernels
with invalid sizes, inconsistent images or unvalidated gradient data is outside
the contract. This is not a semver-frozen API.

## 2. Ordered commands, clipping and prepared plans

### Regions and direct composition

`Rect.Box{left,top,right,bottom}` gives ordinary half-open geometry. `intersect`,
`union`, `contains`, `overlaps`, `point`, `width`, `height`, `is_empty`, `screen`
and `sprite` implement the bounded integer helpers. Empty/reversed boxes do not
turn into giant unsigned rectangles. `sprite` handles the existing signed origin.

`Clip.replace(depth,size,clip,source,target)` selects source pixels inside a clip
and old target pixels outside; it does **not** blend the source. `Clip.fill` is a
direct convenience wrapper. `ClippedStamp.draw(depth,size,source_depth,source_size,
left,top,colors,mask,opacity,clip,target)` is the clipped-alpha drawing entrypoint.
It uses source cursors, transparent pruning and exact existing alpha rounding.

`TileRaster` contains deliberately sequential blend/mask/fill kernels. These are
used under prepared tiles so that `forks=0` really avoids hidden renderer forks.
It does not rewrite the older library's parallel behavior. Prefer the command API
rather than manually assembling its region-level helper calls.

### Command constructors

`DrawList` exposes these constructors, all returning immutable `Command` Data:

| Entry | Inputs after the namespace | Purpose |
|---|---|---|
| `fill` | `bounds, color, opacity` | Solid clipped rectangle |
| `sprite` | `canvas_size, source_depth, source_size, left, top, colors, mask, opacity, clip` | Integer translated RGBA sprite |
| `mapped` | `geometry, texture, filter, opacity, clip` | Prepared affine RGBA image |
| `skin` | `rect, texture, insets, opacity, clip` | Nine-slice skin, with validation |
| `stroke` | `path, ink, opacity, clip` | Prepared union-coverage vector stroke |

Empty, wholly clipped, zero-opacity or invalid constructor requests become
`Noop` where specified. No command contains a host callback, mutable pixel handle,
font selector, camera rule or game identity. Constructor bounds are conservative
screen bounds, not a minimum dirty region. Cached text and complex static widgets
can be presented as ordinary sprite commands.

`DrawList.render(commands,depth,size,x,y,target)` paints commands **in list
order: the first command is painted first**. Alpha draws must not be reordered.
Only a later full-opacity solid fill covering an entire tile certifies that an
earlier command can be discarded. Texture opacity is not guessed from a sample.

### Prepared execution and scheduling

```bend
import Base
import ./RenderPlan.bend as Plan
import ./DrawList.bend as Draw
import ./Rect.bend as Rect

# Commands and viewport geometry belong to the application.
def frame(commands: List<&2,Draw.Command>, background: Image) -> Image:
  +prepared = Plan.prepare(3n,9n,512,commands)
  Plan.render(prepared,0n,background)
```

`prepare(cuts,depth,size,commands) -> Frame` builds balanced spatial bins. Cuts
clamp at canvas depth; each additional cut gives four times as many potential
tiles. At a 512 canvas, cuts=3 means 64x64-pixel tiles. The constructor filters
commands conservatively and preserves order; empty nodes become `Keep`. Binning
and reverse occlusion analysis allocate immutable lists **during preparation**.

`render(frame,forks,target)` paints a prepared scene. `forks=0` executes the
sequential tile kernel. Positive fork budgets introduce bounded four-way CPU
parallel calls above that kernel. Cuts and forks are independent: a useful tile
size need not be a useful scheduling granularity. A plan may be reused with a new
background only when its geometry, sources, opacity, clipping and command order
remain valid. There is no implicit source-identity cache or invalidation policy.

`render_offload(frame,forks,target)` introduces one explicit root offload request.
It expresses an existing compiler boundary, not an implemented WebGPU backend.
CPU fallback was compiled/executed and compared pixel-for-pixel. A GPU device
build, device allocation behavior, transfer cost and device pixel equivalence
remain unmeasured. Do not advertise GPU support from the source proof alone.

Initial operating points to **measure**, not defaults to freeze: cuts=2 or 3,
forks=0 on JS, forks=1..3 on native CPU, and command lists in the tens/hundreds.
Prefer at most about 1024 commands per straightforward list-based plan until a
scene-specific preparation benchmark justifies more. There is no automatic
scheduler, adaptive quality policy or million-object scene index in this pass.

## 3. Incremental rendering and host presentation

`Damage.moved(old_bounds,new_bounds)` retains both footprints. `touches` checks
whether a list overlaps a tile; `bounds` conservatively encloses a list; `add`
skips empty entries. Damage is application-owned: moves, removals, changes to
opacity/material/order/clips and changed background pixels all need coverage.

`RenderPlan.repaint(frame,damage,background,previous)` re-renders each touched
tile from **background plus the current commands**. It never composites a new
foreground over an already-composited old foreground. Unaffected tiles preserve
prior output, and an empty current scene restores background in damaged tiles.
It is correct to enlarge damage, but not to omit a changed old footprint. When
preparation/camera/viewport changes make local damage reasoning unreliable, send
full-canvas damage or use a full render. No minimum-area guarantee is claimed.

`host/ImageBuffer.mjs` is the narrow mutable host boundary:

```javascript
import {ImageBuffer, CanvasPresenter} from './host/ImageBuffer.mjs';
const buffer = new ImageBuffer(512);    // size×size×4 RGBA staging bytes
const counts = buffer.write(image);   // uniform-node row fills; output alpha=255
const presenter = new CanvasPresenter(context2d, 512);
presenter.present(image);             // first call always initializes all pixels
presenter.present(nextImage, dirtyRectangles);
```

The application sizes its canvas and owns event routing, device-pixel ratio,
cache lifetime and display color settings. `write` validates visited host Data
and integer rectangle fields; malformed visited nodes can throw after partial
writes. It is not an atomic untrusted-Image parser. Alpha is always 255 because
the input framebuffer is opaque RGB. The buffer never mutates a source tree.
`CanvasPresenter` keeps one ImageData, copies only changed row spans and calls
`putImageData` for each supplied rectangle. Overlapping rectangles may upload
twice. Tests cover byte order and a mock context; actual browser/device upload
latency and accessibility integration are not measured.

## 4. RGBA filtering, transforms, skins and mips

`RgbaSample.Texture{depth,size,colors,mask}` describes an immutable source pair.
`Nearest{}` and `Linear{}` are explicit filter choices. `nearest(texture,x,y)`
clamps integer texels; `linear(texture,x,y,fx,fy)` clamps texel origins and uses
fraction weights in 0..255. `uv(filter,texture,u,v)` provides normalized-UV
sampling with texel centers at `(i+0.5)/size`.

Linear filtering uses 8-bit fractions whose four weights sum to 65536. It
accumulates encoded RGB *weighted by alpha*, rounds alpha, and unweights RGB once.
When rounded alpha is zero the returned RGB is canonical zero. This avoids
hidden-color fringes. It is **not linear-light or HDR filtering**. Intermediate
integer maxima fit U32 on the stated domain, including rounding. The independent
filter oracle uses BigInt, so it does not silently reproduce a U32 overflow.

`Gather.neighbors(depth,size,x,y,image)` retrieves four adjacent texels by
walking their common quadtree prefix once. Uniform nodes terminate immediately;
after divergence, remaining lookups retain the same exact texel semantics. This
is a source-tree optimization, not a lower-quality filter or reduced sample count.

`Transform2D.Matrix{a,b,c,d,tx,ty}` is a 2D affine map. `point` applies it;
`compose(outer,inner)` applies the inner map first; `inverse(matrix,epsilon)`
returns `Maybe<Matrix>` rather than dividing a singular transform. Translation,
scale, rotation and identity are helpers. All F32 inputs must be finite.

`RgbaAffine.prepare(matrix)` prepares a unit-square image transform;
`prepare_points(p00,p10,p01)` is an equivalent geometry convenience.
`draw(depth,size,geometry,texture,filter,opacity,clip,target)` combines prepared
geometry, nearest/linear sampling, existing quarter-pixel geometric coverage and
source-over in the documented order. The preparation rejects tiny/singular
surfaces at its 0.1 determinant threshold. This threshold is a **new** affine-RGBA
API choice; it does not alter `AffineTexture`. Presentation floating arithmetic
has exact operation-order finite references but no universal cross-backend proof.

`NineSlice.Insets{left,top,right,bottom}` chooses unscaled source margins.
`NineSlice.draw(depth,size,rect,texture,insets,opacity,clip,target)` preserves
corner dimensions, stretches edges in one direction and the center in two.
Sources are at most 512 square; destination extents at most 4096. Source centers
must be positive. Opposing margins may exactly consume a target extent, in which
case there is no center destination area. An undersized target is an exact no-op,
not a request to collapse or overlap corners. Nine-slice uses nearest-center
sampling, not the affine linear sampler.

Existing `Mip.level(requested,depth,size,colors,mask)` remains the explicit mip
choice. Select once before a command, not per target pixel. Mips preserve the
alpha-weighted encoded-channel rule; very coarse alpha mips intentionally cannot
retain detailed silhouettes. No automatic mip selection, trilinear filtering,
texture-atlas gutters or cropped-atlas addressing is promised.

## 5. Vector strokes

`Stroke.line(a,b,radius)` prepares a round-ended capsule. A positive-radius
zero-length line is a disk; radius zero is empty. Radius is in 0..512. `join`
builds an immutable path union, with per-node bounds. `quadratic(levels,a,c,b,r)`
and `cubic(levels,a,c1,c2,b,r)` build balanced fixed-depth de Casteljau
approximations; **levels<=8 is the resource precondition**. The number of line
segments is exactly 2^levels, not an unbounded tolerance loop.

`Stroke.draw(depth,size,path,ink,opacity,clip,target)` evaluates all four existing
quarter samples and ORs path coverage before blending. Overlapping segments do
not darken their common pixels. This is an important distinction from drawing
individual translucent line primitives. Neither arbitrary polygon winding/fill
rules, analytic curve coverage, bevel/miter joins, dashes nor adaptive curve
flattening is supplied. For charts/diagrams, prepare a balanced reusable path
and set clipping explicitly. Changing a path means updating its plan/damage.

## 6. Text flow, source mapping and layout arithmetic

`TextLayout` deliberately separates source text processing from pixel drawing.
A supplied `Item` is one atomic logical text unit:

* `Glyph{source,end,key,advance,kern}` has an application glyph key and signed
  pair adjustment; `Space{source,end,advance}` supplies an explicit width.
* `Tab{source,end}` advances to the next explicit tab stop.
* `Break{source,end}` introduces a hard line boundary.

`Settings{width,line_height,max_lines,tab_size,word_wrap}` bounds work/output.
Width clamps at 4096; line height/tab size clamp to 1..4096; line count also
clamps so total layout height remains within 4096. A soft wrap consumes no glyph
until it fits the next line. Whitespace that causes a wrap is consumed without
indentation. Glyph advances and signed kerning magnitudes are within 0..4096. Pair kerning resets at a line start. Overlong words fall back to
character wrapping; one oversized glyph may exceed width at an empty line so
layout always progresses. Clip ink separately. Reaching the line budget produces
explicit truncation; unplaced content is not silently reported as consumed.

`layout(items,settings) -> Layout{glyphs,carets,metrics}` yields positioned glyphs
and leading/trailing caret affinity. Metrics include maximum advance, height,
line count, **consumed item count** and truncation. Source coordinates are chosen
by the caller, and are distinct from that item count. Empty input has zero lines.
The caret may have two visual positions at a soft wrap. Tests cover tabs, hard
breaks, pair adjustments, overlong words and line-budget truncation.

`TextHit.hit(carets,x,y,line_height)` chooses a logical line first, then horizontal
distance; exact ties prefer leading affinity, remaining ties preserve list order.
Empty runs return None. `selection(carets,start,end,line_height)` covers atomic
source cells and unions boxes on the same line. It does not split ligature or
cluster cells supplied as atomic units. **Monotonic logical source ordering** is
a precondition; this is not a bidi visual-order algorithm. Hard breaks carry no
ink cell. Higher-level editor movement, IME, normalization and accessibility are
outside this graphics package.

`AtlasParagraph.prepare(text,scale,settings)` is an adapter for the unchanged
packaged 24px atlas, with scale 1..4 and explicit CR/LF/CRLF behavior. Its source
indices count Unicode scalar values; CRLF consumes two scalars and one break.
`draw(layout,depth,size,x,y,scale,ink,target)` preserves the existing atlas pixels.
A native-size font supplies glyph metrics directly to TextLayout and draws the
placements with existing `Glyph.draw_run`. The visual example does exactly that.
No font files are included; optional local-font baking is hash-pinned.

`Layout2D` provides integer insets, start/center/end alignment, aspect contain-fit,
exact-sum equal tracks and direct indexed grid cells. `track(total,count,gap,index)`
returns None for impossible gaps/counts rather than silently shrinking them. The
first remainder tracks receive one extra pixel. `grid_cell` supports virtualized
views without allocating every cell. `fit` rounds the dependent dimension down.
All rectangle/track extents, counts and gaps must remain within the documented
4096 domain; these are arithmetic helpers, not a widget/layout tree or constraints
solver. The application owns pane positions, theme, scrolling and focus.

## 7. Animation and prepare-time material processing

`Motion` provides linear, smoothstep, smootherstep, cubic-in and cubic-out easing;
`ease` clamps its unit input, and `lerp` has explicit endpoints. `phase` and
`triangle` avoid overflowing a doubled U32 period. `ticks(delta,carry,interval,
max_steps)` is a bounded fixed-step accumulator. A zero interval returns
`InvalidInterval`; otherwise `Ticks{steps,remainder,dropped}` satisfies exact
integer conservation with a Nat `dropped` count. Dropped is time, not step count.
There is no clock IO or implicit catch-up/simulation policy.

`ColorFx.map(depth,effect,image)` applies prepare-once tint, grayscale, duotone
or invert to RGB only; alpha stays in its separate unchanged mask. Uniform nodes
stay efficient and matching children compact. Grayscale uses stated encoded
integer weights, not a claim about photometric luminance.

`Coverage.combine(depth,operation,a,b)` supplies red-alpha product, probabilistic
union, subtract, min and max, with byte rounding and compaction. Probabilistic
union is **not** geometric OR of subpixel hits; use Stroke's sample union for
joined geometric strokes. These are mask algebra primitives, not blur, signed
distance fields, morphology or an automatic shadow engine.

`Ramp.build(stops)` validates 1..16 sorted `Stop{position,color}` values, positions
in 0..65535 and packed 24-bit colors. Equal positions are right-continuous: the
last stop at a position wins. Direct `sample` performs exact integer encoded-RGB
interpolation and clamps endpoints. `bake(levels,gradient)` creates 1..1024
prepared entries (levels clamps at 10); `lookup(table,position)` uses an explicit
nearest-entry approximation. Depth zero samples the first endpoint; larger
bakes preserve both endpoints. A baked LUT's quality is not identical to direct
sampling between entries. Stop scanning short-circuits at the first larger knot;
per-pixel materials should use the bounded lookup table rather than stop lists.

`Field.Recipe{seed,period,octaves}` supplies deterministic tileable value-noise
materials. Coordinates are unsigned **q8 lattice units**, not pixel coordinates;
period clamps 1..256 and octaves 1..8. Integer cubic fade and interpolation avoid
F32 drift in this stage. `sample(recipe,x,y)` is periodic at `period*256` where
coordinate addition fits U32; weights 128..1 keep accumulation bounded.
`bake(levels,recipe,ramp_table)` samples centers across one fundamental period and
builds a reusable Image, clamping depth at 9 (512²). The first and last **pixel
centers** are not required to be identical; wrapping the continuous field is the
periodicity contract. Use mips before significant minification. These are smooth
procedural color fields, not physically based materials, microfacet lighting,
normal maps or a replacement for authored assets.

## 8. Practical recipes and boundaries

For an editor: lay out text and strokes when content changes, cache static glyph
pixels, construct ordered commands, prepare bins, track conservative old/new
bounds and repaint. Send only changed output rectangles to the host presenter.
Keep selection state, source editing, event routing and accessibility in the app.

For a visualization: prepare scalar data-to-screen geometry in the application,
use a Ramp to color the data, build bounded Stroke paths, clip to plot bounds,
and keep static axes/labels separate from frequently changed curves. The library
does not choose chart scales or downsample scientific data for you.

For a game: prepare sprite masks/mips/transform geometry at a selected tier, use
integer sprite commands where possible, and measure full versus damaged redraws.
Use native fork budgets only when the frame has enough work. Piece policy,
chess geometry, camera constraints and UI layout stay outside the package.

Read `PERFORMANCE.md`, `DRAFT_PROPOSALS.md`, `REPRODUCE.md` and the source
signatures before adoption. The examples demonstrate composition, not a published
application or a promised frame rate.
