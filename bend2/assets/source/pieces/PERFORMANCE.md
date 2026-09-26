# Piece sprite quality and performance notes

The browser build packages three interactive RGA2 pages: four 64×64 sprites per
128×128 page, 196,623 bytes total. The original standard 128×128 candidate
remains source-bound and reproducible but is no longer sent to the browser.
At the actual 512-pixel board presentation the smaller pages were visually
close to the standard pages, while the transfer and decode payload fell by
75%. The transparent cutouts preserve the existing ivory/navy art, antialias
edges, distinct piece silhouettes, and one shared baseline. They are fixed
front-facing sprites rather than 3D models, so large camera rotations will show
their limitation.

The optional 256-pixel tier totals 3,145,743 bytes (3 MiB). It retains finer
details, but adds four times the page payload. In a side-by-side flat-board
comparison, it gave more delicate edges/details but did not change the overall
piece identity or composition enough to justify loading it by default. Keep it
as a recipe and generated evidence, not a shipped/pre-cached tier, until a
browser comparison demonstrates a visible benefit at the actual board size.

## Bounded Bend-JavaScript probe

The original isolated benchmark was compiled from Bend to JavaScript and run in Node on
Windows. It decodes the three *standard* RGA2 pages, retains a board containing
31 pieces, then draws one moving pawn over that retained image. Every timed
sample includes walking the complete output image tree so the lazy Bend image
result is forced. Ten samples were taken per mode; p50 is the midpoint of the
two central samples and p90 is the nearest-rank maximum for this small sample.

| Canvas and draw mode | p50 | p90 | Output image tree |
| --- | ---: | ---: | ---: |
| 512², affine linear | 17.38 ms | 18.35 ms | about 179,600 nodes |
| 512², affine nearest | 14.34 ms | 15.47 ms | about 179,600 nodes |
| 1024², affine linear | 125.24 ms | 129.80 ms | about 709,000 nodes |
| 1024², affine nearest | 86.65 ms | 98.38 ms | about 709,000 nodes |
| 1024², exact 1:1 clipped stamp | 21.71 ms | 24.60 ms | about 690,200 nodes |

Decoding and preparing all twelve reusable textures took 432 ms and produced
106,976 texture-tree nodes. Building and walking the retained 31-piece base
took 570 ms / 173,629 nodes at 512² and 3.52 s / 685,885 nodes at 1024². These
startup/base costs make full-board redraw or rebuilding the piece layer on
hover/selection unsuitable. Retain the occupancy image and render only the
moving piece or damaged squares. At 1024², a stamp is fast when sprite pixels
already match the board tile; at 512² the 128-pixel source has to be resampled
to a 64-pixel tile, so the exact same-size stamp test does not apply.

These historical numbers are useful for relative comparison only: they measure the
compiled JavaScript on this Windows/Node environment, not a browser, WebWorker,
GPU, packaged native executable, or end-to-end frame presentation. Browser
decode, messaging, canvas transfer, and screen refresh still need measurement
after game integration. The 1024² retained-base cost in particular is a warning
to investigate persistent tree/cache costs before increasing detail.

## Browser helper checkpoint

The production-shaped draft packages the interactive pages and a static,
source-bound sprite module worker. Bend renders a proxy frame immediately;
the helper builds the detailed 512² scene and returns one immutable Bend Image.
The main Bend controller rechecks placement/revision and supplies a pure
refinement packet; the host only presents its pixels. Pointer selection reuses
that image. A camera move requires a new scene, so the proxy remains visible
until the helper completes. In local headless Chrome, one later-page run measured
0.48 s sprite-page decoding, 0.42 s detailed ground, 1.03 s 30-piece drawing,
and 2.33 s round trip on cold refinement; the camera refinement was 3.50 s
round trip under the same loaded conditions. Another run varied substantially.
These are **not** an interactive frame budget or GPU results. Main-worker drag
frames with the original 256px motion board had measured p90 around 178–183 ms.
The subsequent 128px ground/256px silhouette motion preview measured pixel
preparation p90 around 57 ms in one local Chrome run; end-to-end reply p90 was
126 ms, and the temporary board edges are visibly coarse during drag. The final
art is fixed-facing, and the court is still a visual design checkpoint rather
than owner WOW acceptance. The high-detail tier stays unshipped.
