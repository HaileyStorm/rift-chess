# Current knight picking through extreme-view overlap

One finite Windows browser case passed at yaw **0**, pitch **35**, zoom **130**,
theme 0 and the initial position. Native primary clicks at board pixels
`(109,341)` and `(109,337)` selected **White Knight b1** and **White Pawn b2**,
respectively, with an ordinary Escape selection reset between them. The canvas
accessibility summaries and rendered selection feedback agree. Position and
revision remained unchanged; no move was made.

This closes a specific integration gap: the earlier atlas-picking gate covers
decoded sprite overlap, while this case uses the current view-dependent knight
texture produced by `BoardScene.sprite_pose_pieces`.

## Independent expectation and actual browser observation

Four public `fast_sprite_pieces512` diagnostic renders kept the full initial
occupancy and contact geometry. The zero-mask render was subtracted from white
knight, white pawn and other-artwork renders. Independently projected center Y
established the knight as foreground. Conservative frame exclusions isolated
the target pieces despite shared texture codes; other artwork was excluded.
No picking function selected the expected points.

The fixed view supplied 157 qualifying overlap pixels and 68 exposed-pawn
pixels. The nearest pair is four board pixels apart, with strong painted
support throughout each 3x3 neighborhood. The pawn point has exactly unchanged
knight-raster pixels against the zero-mask layer.

The untouched package booted through ordinary persisted preferences, then one
native right-drag camera transition reached the exact target view. Each native
click was bound to the actual displayed position, view, revision, 512-pixel
board plan and atlas mask/offer. Revision was 0 and mask ID was 2; the two
offers were 5 and 10. Installed Chrome was 154.0.8037.98, headless, with a
540x960 viewport and device scale 1. The displayed board occupied 480 CSS
pixels; coordinates were mapped through the actual canvas bounds.

## Exact retained evidence

Private evidence is under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`, with prefix
`knight-extreme-overlap-20261010-r1-`.

| Input or receipt | SHA256 |
| --- | --- |
| Current package build, version `5ab00748f2a5ff31cebc` | `f293947abbc2c924cf821bb6d7ff69231234c70c23db4381fad268a3a813b054` |
| Scene manifest | `ac601999a5e7e4d47dfdbbcfbd7b113d67b63e949959f1ce297bbd9f3a52e61e` |
| Scene output | `7b8116dfbe7459168758412c2003cd0762bc17bebe9f500c294bf23ed27827e3` |
| Controller manifest | `c9d1a614eeb1c6328c2acc193cc5633768f3f5b75ad5cfb0fdf118d5d61bd8fb` |
| Controller output | `7e77448380fc6879f9f9abe7b34428daef9f53a645165b048b95d76ae4595594` |
| Oracle result | `424ada0a5b97a036c503ca63e8ed723301e13d84f7fbb13314240b0099abc1eb` |
| Original oracle terminal | `a38554b3c4af3a7b5c1ce563fc20befbfda2013fcf1601bfca7f56fa3ba2cd80` |
| Browser result | `89ec7f8c82d77caa27ec22a7b57c84dcd9ccb561e5fc24827d0148544ff838b0` |
| Original browser terminal | `0920f229763e677929b9ba03abe87f4984f4018cd8b6720e1165f90f771ed238` |

The package retains its original revision `682ca6b` / dirty / draft /
`adopted:false` metadata. Current source and executable bytes were checked;
the package was reused without recompilation or revision relabeling. The
existing TypeScript application, selected compiler and production rendering
sources were not changed by this case.

The oracle and browser original processes exited 0. Membership, EOF, original
handle closure and self-only Job closure passed, with no unknown originals.
All 355 oracle and 432 browser fences remained unchanged. Browser, context and
loopback server closed without errors; no external request was recorded.
Observed peak Job commit was 273,281,024 and 875,835,392 bytes, respectively.
Capacity admission used fresh available physical/commit memory and historical
comparators plus 50%; those thresholds are heuristics, not upper bounds or
performance results. Actual raster/browser payloads total about 2.44 MB.

This is finite local browser evidence for the particular current-geometry
overlap boundary. It does not establish exhaustive camera or edge coverage,
natural motion pacing, stable latency, physical-device or native GUI acceptance,
artwork approval, Linux/kernel/GPU results, or compiler adoption. The full
sprint and its remaining acceptance work stay active.
