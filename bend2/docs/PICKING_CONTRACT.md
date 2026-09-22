# Rendered input contract and evidence

The board uses a 512 by 512 pixel image. A square's file is 0–7 and its displayed
row is `7 - rank`. Its center is:

```text
x = 256 + 24 * (file - row)
y = 148 + 12 * (file + row)
```

Floor picking uses half-open cells. For a pointer pixel `(x,y)`, form
`u = x + 2*y - 528` and `v = 2*y - x - 16`. Both must lie in `[0,384)`.
The file is `floor(u/48)` and the rank is `7 - floor(v/48)`. Otherwise the result
is sentinel 64. The browser floors its scaled pointer coordinate before passing
it to Bend; it does not round across a cell boundary.

Opaque piece pixels take priority over the floor. Where pieces overlap, the
greatest isometric depth (`file + displayed row`) wins, matching the painter's
order. A nearer piece can therefore cover a square or another piece's base.
Clicking the visible body selects that piece. Legal-destination coordinate
buttons provide a second way to reach covered floor cells. Selection also has a
whole-piece cyan outline, a name and a coordinate; hovering has a lavender rim.

`tests/picking.ts` checks every one of the 262,144 canvas pixels against the
independent integer formula above and all 64 projected centers: 262,208 checks.
The scene probes and rendered play-tests exercise silhouettes, overlaps and
actual pointer events. This is finite exhaustive floor evidence and sampled
scene evidence, not a formal theorem for every arrangement of sprites.

The formal graphics laws remain the separate `graphics/LAWS.bend` sampling and
clipping contract. The source snapshot and browser receipts record exactly what
was rendered; changing presentation does not amend the frozen chess rules.
