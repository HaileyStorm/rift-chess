# BoardScene fixed-facing sprite stage

This is an opt-in game-scene adapter over the reusable `PieceSprites` and
`RgbaAffine` APIs. It leaves the existing proxy and procedural piece paths
unchanged.

`BoardScene.fast_sprite_pieces512(frame, pieces, ground)` returns the 512-square
board image after drawing occupied pieces from the position, plus a transient
captured piece when a move is animating. `pieces` is the prepared twelve-sprite
set returned by `PieceSprites.prepare` from the three standard transparent RGA2
pages. `ground` must already contain the scene background and board tiles, but
must not contain pixels for the current or previous pieces.

Sprites remain screen-facing at every camera yaw and pitch. Their anchors use
the same projected board centers and interpolated motion points as the proxy
scene; draw order follows `Camera.depth_order`. Each sprite's axis-aligned quad
uses 0.76 of the projected board pitch for width and 1.24 for height. Rift
holes suppress both current and dying sprites. Captured art drifts upward and
fades during the first half of the existing 16-step action transition. The
atlas is fixed-front artwork, so this renderer does not claim true 3D rotation
or perspective.

`BoardScene.fast_feedback_on_pieces512(frame, pieces_image)` is a separate,
cheap UI feedback stage. It adds an outer gold halo and a brighter plinth rim to
an occupied selected piece, and a cyan rim to a different occupied hovered
piece. It then applies the existing recent-move, check, selection-square,
preference-controlled destinations, shift, promotion, hover-square and capture
cues. It does not create legal destination cues when `frame.targets` is empty;
the frozen optional-overlay behavior remains owned by the existing frame
construction and preferences.

For host caching, retain the sprite stage while position occupancy, holes,
camera, or a movement/capture progress point changes; do not rebuild it for a
pointer-only hover update. Recompute the feedback stage whenever selection,
hover, targets, check, shifts, promotion, recent move, or capture progress
changes. `fast_sprite_pieces512` is intentionally 512-only; do not render the
whole board at 1024 with this per-piece affine path. If the host needs a larger
slot, upscale the finished 512 image with the existing nearest-neighbor helper
and evaluate quality at the chosen detail level.

## Verification

Run the focused fixture with the pinned local Bend wrapper:

```powershell
$env:BEND_NO_TELEMETRY = '1'
node bend2/tools/bend.mjs bend2/tests/piece-sprites/BoardSceneSpriteTest.bend
```

The fixture builds tiny uniform-color RGBA pages to make exact pixels
deterministic. It checks Model-side and kind mapping, sprite projection,
hole-suppression, and selected/hovered focus pixels. It does not replace a
visual review with the authored atlas.

Measure the full starting position with the standard 128-pixel sprite pages
and this host's pinned Bun runtime:

```powershell
$env:BEND_NO_TELEMETRY = '1'
$pages = @(
  (Resolve-Path 'bend2/assets/runtime/pieces/pieces-std-0.rga').Path.Replace('\', '/'),
  (Resolve-Path 'bend2/assets/runtime/pieces/pieces-std-1.rga').Path.Replace('\', '/'),
  (Resolve-Path 'bend2/assets/runtime/pieces/pieces-std-2.rga').Path.Replace('\', '/')
)
node bend2/tools/bend.mjs bend2/tests/piece-sprites/BoardSceneSpriteBench.bend -- $pages
```

The benchmark times a fresh 32-piece sprite pass plus a traversal of the
resulting depth-9 image tree. It measures CPU-side Bend evaluation on this
Windows host, not browser presentation, GPU use, or the cached pointer-only
feedback pass. One 10-trial run produced 78,693 output-tree nodes each time.
The median was 1.127 s, nearest-rank p90 was 1.164 s, and maximum was 1.465 s
(µs samples: 1,464,886; 1,130,400; 1,133,001; 1,144,404; 1,162,483; 1,124,123;
1,099,063; 1,110,760; 1,106,879; 1,089,954). This CLI path evaluates checked
Bend in the compiler runtime; it is a cautionary CPU measurement, not a
browser-generated-JS measurement or GPU result. Production adoption still
requires an emitted-browser scene benchmark and UI responsiveness check.
