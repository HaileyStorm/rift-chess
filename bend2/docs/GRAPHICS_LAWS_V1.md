# Bend pixel graphics: draft law and API contract

This document describes the first immutable graphics slice for the Bend2
experiment. The source is `bend2/graphics/Pixel.bend`; the closed proofs are
in `bend2/graphics/PROOF.bend`, and the claims they fill are in
`bend2/graphics/LAWS.bend`.

The contract is deliberately small. It gives the game a deterministic image
value that can be sampled and transformed without shared mutable buffers. It
does not claim that a browser Canvas, a native window, a channel swizzle, a
GPU scheduler, a sound device, or a general polygon rasterizer is correct.
Those remain host boundaries and need their own tests.

## Image representation

Bend's `Base.Image` is a persistent quadtree:

* `Pix{color}` is a square whose every sample has one packed `U32` color.
* `Qua{tl,tr,bl,br}` divides a square into northwest, northeast, southwest,
  and southeast child squares.

The color value is the source's packed `0x00RRGGBB` convention. The browser
adapter must expand it explicitly to RGBA bytes; it must not alias a packed
word as a platform-endian pixel buffer.

`Pixel.solid(c)` constructs a uniform image. `Pixel.sample_path(path,image)`
follows `NorthWest`, `NorthEast`, `SouthWest`, or `SouthEast` steps. A `Pix`
returns its color for every path. A path that ends at a `Qua` returns zero;
callers that want a meaningful sample provide one direction per subdivision.

`Pixel.sample_xy(depth,x,y,image)` samples an integer coordinate in a
`2^depth` square. At a `Pix` it returns that color. At a `Qua` it selects the
child from the high bit of each coordinate and subtracts the selected half
before recurring. The MVP contract assumes `0 <= x,y < 2^depth`; the
implementation uses wrapping `U32` arithmetic outside that range.

## Rectangle operation

`Pixel.Rect{left,top,right,bottom}` uses half-open edges. A pixel at `(x,y)`
is covered when `left <= x < right` and `top <= y < bottom`. `left >= right`
or `top >= bottom` makes a zero-area rectangle.

`Pixel.fill_rect(rect,color,image)` treats `image` as a fixed 512 by 512 root
(`depth = 9`). It returns a new immutable tree:

* an empty rectangle or a rectangle wholly outside the root returns the exact
  original tree;
* a cell wholly inside the rectangle becomes `Pix{color}`;
* a partially intersecting cell subdivides, clips each child independently,
  and reuses an untouched child when it is outside;
* a one-pixel partial cell becomes the requested color.

The recursive worker classifies `empty`, `outside`, and `inside` before
matching the image or making child calls. This preserves the important
quadtree property that a miss does not walk the entire 512-square tree. Four
partial children are independent pure calls and are written in Bend's
parallel-let shape where a later renderer needs native parallel scheduling.

The current operation intentionally fills axis-aligned rectangles only. It
does not claim exact coverage for diamonds, circles, antialiased edges, or
arbitrary polygons. Those should be a separate module with separate laws.

## Closed laws in v1

The checker proves the following source-level facts:

1. `Pix` sampling is color-preserving for the empty path and for every one of
   the four possible first path steps. These five cases exhaust a path's
   outer shape, so callers may use them as the constructive uniform-pixel
   theorem.
2. Each first path step through `Qua` selects the corresponding child, for
   all remaining paths and all child images.
3. If `rect_outside_root(rect)` is true, `fill_rect` returns the original image
   exactly. The proof rewrites only that guard and then case-splits the
   independent empty guard.
4. If `rect_empty(rect)` is true, `fill_rect` returns the original image
   exactly. The proof case-splits the independent outside guard.

The laws intentionally do not state “all pixels in an arbitrary rectangle
are colored” as a universal theorem yet. That claim needs a formal coverage
predicate and an induction over the fixed-depth tree. Before adding it, pair
the proof with boundary probes for a one-pixel rectangle, a quadrant edge,
the root edge, a miss, and a pre-subdivided input tree.

## Verification

From the Rift Chess worktree, with the pinned local wrapper:

```powershell
node bend2/tools/bend.mjs bend2/graphics/Pixel.bend --check-only
node bend2/tools/bend.mjs bend2/graphics/PROOF.bend --check-only
```

Both commands must print exactly `All terms check.`. A checker pass covers the
pure Bend source term and its proof cone. It does not establish native C/GPU
parallel behavior, generated JavaScript correctness, Canvas output, or game
owner acceptance.

## Change discipline

Treat `LAWS.bend` and this document as a semantic contract. A change to a law
requires a matching plain-English explanation, a new or updated proof, and
fresh boundary probes. Keep implementation optimizations in `Pixel.bend`
behind the same API; do not silently weaken a law to make a proof compile.
The root task owns the eventual semantic freeze and manifest after independent
review.
