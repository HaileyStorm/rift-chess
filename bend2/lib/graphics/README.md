# Reusable image-tree graphics

All runtime modules in this directory depend on Bend Base or other library
modules. They have no chess Model, rules, application state, browser or native
window dependency. Callers provide immutable Image trees; the host presents them.

The authored library is MIT licensed (see `LICENSE`). Bend Base/compiler/runtime
retain their upstream Apache-2.0 license; copy the applicable notices when bundling
them. `examples/TypeSheet.bend` is a pure, portable 512-square font specimen with no
application dependency. Copy this directory into another Bend project and import
the modules directly; the project build wrapper is only a development convenience.

- `pixels/Pixel.bend` is the byte-identical frozen 512-square implementation.
  Its colocated historical laws/proofs remain unchanged. `VERIFICATION.json`
  records the copy provenance; migration of runtime imports is not a new proof.
- `Quad.bend` rasterizes a nondegenerate convex projected quad into a 512-square
  image. It supports solid faces or outline-only composition and keeps untouched
  background subtrees. This is the original implementation moved without changes.
- `RectRaster.bend` exposes `fill(depth, size, left, top, right, bottom, color,
  image)` for clipped half-open rectangles. The caller supplies `size == 2^depth`,
  with non-wrapping U32 coordinates and representable root extent. Empty or reversed
  rectangles are inert. Numeric size is carried through recursion, avoiding
  repeated Nat shifts. `Canvas.bend` retains its established depth-based canvas
  API; this scalar kernel is used by bitmap sprite composition.
- `Ortho.bend` contains scalar orthographic projection, inverse rotation, degree
  conversion, and nonnegative pixel rounding. Callers supply world-relative
  coordinates, normalized trigonometric values, scale and screen center. For a
  projection inverse, callers first subtract the screen center and divide by
  scale (and vertical pitch factor), which must be nonzero. Board offsets,
  allowed camera angles, zoom limits, board extent, and square ordering belong
  to the game adapter in `graphics/Camera.bend`.
- `Canvas.bend` and `Font.bend` provide composition, text and arbitrary-depth
  image embedding. Their contracts and finite tests are described in `LAWS.md`.

`tests/raster.ts` checks rectangle coverage over complete small images, quad
face/outline samples, and finite scalar projection round trips. It imports only
library modules. Run with:

```text
node bend2/tools/bend.mjs --run bend2/lib/graphics/tests/raster.ts
```

The extraction adds no new formal raster or floating-point proof. Existing
closed pixel/canvas contracts cover only their stated propositions. Finite
compiled-JavaScript equality checks, source type checks, native execution,
parallel performance, browser presentation and human visual acceptance remain
separate evidence. In particular, concurrent CPU timing is not an absolute
frame-budget acceptance result.
