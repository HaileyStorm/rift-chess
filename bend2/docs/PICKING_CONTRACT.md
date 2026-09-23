# Camera, gaps and rendered input

This is the tested presentation contract, separate from the frozen rules and
pixel-sampling laws. Camera math and convex-quad rasterization use Bend's F32
operations; they are not presented as formally proved floating-point geometry.

The 512 by 512 image has an orthographic camera. The default faces White's side
directly, at a 65-degree elevation. Rotation covers 360 degrees, tilt covers
35–90 degrees, and zoom covers 75–115 percent. Overhead sets 90-degree elevation.
The controls are visible below the board. Right-drag or Alt-left-drag rotates and
tilts; scrolling zooms only after the board has focus or deliberate engagement.
Hovering the board alone leaves normal page scrolling intact.

`Camera.bend` supplies both projection and inverse picking. For file `f`,
displayed row `r = 7 - rank`, rotation `a`, elevation `p`, and zoom `z`:

```text
s = 45 * z/100 / (abs(cos(a)) + abs(sin(a)))
x = 256 + s * (cos(a)*(f-3.5) - sin(a)*(r-3.5))
y = 274 + s * sin(p) * (sin(a)*(f-3.5) + cos(a)*(r-3.5))
```

Coordinates above are continuous. Piece feet are rounded to canvas pixels.
Inverse floor picking uses half-open cells centered on 0–7: the continuous file
and row must each lie in `[-0.5,7.5)`. Outside the board or image returns sentinel
64. The browser scales/floors pointer coordinates before passing them to Bend.

Pieces remain upright sprites. Opaque pixels take priority over the floor;
transparent pixels pass through. Both painting and picking traverse ascending
rounded foot height, breaking ties by ascending square ID. The last opaque
sprite wins. A nearer piece can therefore cover another piece's base; coordinate
buttons still provide access to covered legal destinations.

A missing platform contributes no top, wall, bottom slab or center symbol.
The existing background remains visible through its footprint. Hover and Shift
destination feedback draw outlines only; they never fill the gap. Present 2x2
platforms retain visible side walls, which shrink to zero in overhead view.
Shift animation transports the existing platform and its passenger together.

Camera changes clear stale hover requests and wait for pending clicks to resolve
against the view where they were made. The browser keeps one camera
render in flight and one latest pending frame, and blocks board actions until
the latest view is drawn. Rendering, picking and ground-cache keys all carry the
same view. Camera preferences persist separately from accepted game commands;
rotating, tilting, zooming or reloading cannot alter a game record.

`tests/picking.ts` passes 2,304 checks across camera extremes, all 64 centers,
inverse mapping, painter ordering, opaque/transparent pixels and overlapping
sprites in opposite orientations. `tests/camera-render.ts` passes another 4,640
checks over 48 rendered grounds across both layouts: real tiles have surfaces,
missing cells preserve background, hover/Shift outlines leave gap centers open,
and multi-point interior masks remain open at oblique and minimum-tilt views.
At shallow angles a neighboring platform's side wall can cover part of an edge.
These are finite runtime checks, not universal geometry proofs.

The historical `tests/historical/browser-camera.mjs` exercises real top-down and reversed-board moves,
Shift into a visible gap, undo, rapid rotation input, orbit dragging without a
move, persisted camera settings, guarded wheel zoom and mobile controls. A
deliberately delayed real pick response checks that rotating cannot cancel a
destination click; a precisely timed rotation checks animation never rewinds. The
earlier fixed-isometric pixel formulas are obsolete; immutable preview-v1
receipts remain evidence for that original version only.
