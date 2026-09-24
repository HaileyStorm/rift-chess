# Grid8 contract proposal — DRAFT, not frozen

This package maps an eight-by-eight cell lattice to pure graphics Images. It
contains no chess rules. It imports the separate graphics v2 primitives and
does not alter any frozen v1 law. The prior combined English contract is
preserved in ignored `pre-grid8-LAWS.md` under the graphics-v2 artifact folder;
`LAW_MIGRATION.md` maps every old source law to its new package.

An Image at depth `d` denotes a `2^d` square as in graphics v2. Valid grid
canvas size is `size=2^depth` with `3<=depth<=12`, except `Board.make` returns
uniform light for size<8 or nondivisibility by8. All source Images must be
well-formed at the declared depth. A mask `Mask{low,high}` maps bit
`row*8+column`: bits0..31 in low and32..63 in high, least-significant bit
first. A zero bit means absent; it preserves existing scenery or chooses a
void material where a constructed `TileSurface` requires a complete Image.

1. `Board.make` has `cell=size/8`, samples light iff the sum of its cell row
   and column indices is even. `Board.paint_masked` paints that checker only
   for one bits; zero bits preserve existing background subtrees. All-zero
   mask returns the exact input Image.
2. `TileSurface.make` requires the valid grid canvas and origin `(0,0)`.
   It builds one Image each for raised light, raised dark and unraised void
   material at depth `depth-3`, then assembles a balanced 8×8 tree. For pixel
   `(x,y)`, `column=floor(x/cell)`, `row=floor(y/cell)`. Zero mask bit chooses
   void; one chooses light for even `(row+column)`, dark otherwise. Selector
   returns and reuses a cell subtree in source structure; cross-target
   physical pointer/JS identity and reference-count cost are not semantic
   claims. Light/dark materials add deterministic seeded grain to quantized
   gradients with seeds differing by one. Observational pixel equality with
   independently sampled cell Images is the general finite obligation.
3. `SpatialBoard.draw` takes integer screen-space `Projection` origin,
   file step right/up, rank step right/down and positive thickness. Cell
   `(file,rank)` in0..7 uses corners `(file,rank)`, `(file+1,rank)`,
   `(file+1,rank+1)`, `(file,rank+1)` with
   `x=originX+file*fileDx+rank*rankDx`,
   `y=originY+rank*rankDown-file*fileUp`. Caller requires U32 arithmetic
   nonwrap/nonunderflow and representable positive thickness before F32
   conversion. `RaisedFacet.paint_corners` draws cast shadow, front/right
   sides, top and bevel from back row to front. Absent cells add no own
   geometry, showing the lower scene, though neighboring side/shadow may
   occlude their footprint. All-zero mask returns exact original tree.
   F32 projected interior/gap evidence is finite/rendered, not a general
   integer-exact coverage theorem. Fixed Projection is one visual preset;
   free yaw/orbit and picking remain external camera responsibilities.
4. Optional `SpatialBoard.draw_lit` keeps the same mask, geometry, ordering
   and projection preconditions. For each present cell `(f,r)` in0..7 and
   packed-RGB `Light{ink,strength,file,rank}`, clamp light origin file/rank
   independently to7. Let `d=|f-originFile|+|r-originRank|` in0..14,
   `weight=15-d` in1..15 and
   `alpha=floor(min(strength,255)*weight/15)`. From parity-selected
   `RaisedFacet.Surface`, lit top=`Color.over(ink,top,alpha)` and lit
   side=`Color.over(ink,side,floor(alpha/3))`; edge/shadow/glint unchanged.
   It adds no facets. Absent bits add no geometry; zero mask returns exact
   input. Strength0 samples as `draw` at valid pixels, a finite comparison
   unless a general theorem closes. The valid packed-color domain and F32
   coverage limits are those of graphics v2.
5. `SpatialFast.draw` takes nonzero-determinant affine F32 basis and the
   same two-word mask. It inverse-maps destination pixel centers, classifies
   whole quadtree regions, returns original outside/absent subtrees and
   paints flat top colors for present cells. Continuous reference cells are
   half-open `[file,file+1)×[rank,rank+1)`; integral ties belong to the next
   cell. Implementation adds +0.00001 board units before F32 floor. The JS
   finite oracle admits either neighbor only within ±0.00001 of an integer
   line; outside that band it requires exact unbiased scalar color. This
   tolerance is not a theorem or native/GPU bitwise claim. Drag pass omits
   antialias, sides, shadows and art; full rendering settles after input.
   An all-zero mask returns exact input before inverse arithmetic.

Eight relocated formal signatures are `masked_none`, `tile_absent`,
`tile_even`, `tile_odd`, `spatial_empty`, `spatial_lit_empty`,
`spatial_illuminate_zero` and `spatial_fast_empty`. Their meanings are
unchanged. The pinned 2.0.27 checker closed all eight after relocation on
2026-09-24; they remain DRAFT and are not yet frozen. Full per-pixel, F32 camera,
browser, native CPU and GPU performance remain separate evidence.
