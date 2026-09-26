# Rift Chess piece sprite pages

The canonical artwork remains
[`../chess-piece-atlas.png`](../chess-piece-atlas.png): a generated 1536×1024
RGBA atlas, with the six ivory pieces in row one and six navy pieces in row
two. Its recorded SHA-256 is
`e7e4dd458e02d098c5daa3db2d6a4dc903f10d2f55da33684932ecc2b9dad923`. The
atlas already has genuine antialiased alpha; brown seen in some previews is a
viewer composite behind transparent pixels. The original PNG and
`chess-piece-atlas-initial.png` remain unchanged. The art is project artwork
generated for Rift Chess, with no third-party pieces incorporated.

`prepare.py` verifies the source hash and dimensions, finds each piece within
its existing 256×512 cell using alpha ≥4, expands the crop by two source
pixels (clamped to the cell edge), and places it in a square transparent tile.
The navy knight's mane reaches the right edge of its original cell; that edge
is retained, not clipped further. The same source-to-output
scale is used for all twelve pieces, so the pawn stays shorter than the king;
bases align to one shared baseline. Lanczos resampling preserves alpha, and
fully transparent gutters remain clear. Piece order is pawn, knight, bishop,
rook, queen, king for each side.

The browser interactive tier stores four 64×64 sprites in each 128×128 RGA2
page at `runtime/pieces/pieces-fast-{0,1,2}.rga`. Its three files total
**196,623 bytes** and are packaged and precached as `assets/pieces-fast-*.rga`.
The retained standard candidate stores four 128×128 sprites in each 256×256
RGA2 page at `runtime/pieces/pieces-std-{0,1,2}.rga`; its three files total
**786,447 bytes** (0.75 MiB), including 5-byte RGA2 headers. The optional high-detail
tier stores four 256×256 sprites in each 512×512 RGA2 page at
`runtime/pieces/pieces-hi-{0,1,2}.rga` and totals **3,145,743 bytes** (3.00
MiB). All are straight-alpha RGBA; page depths are 7, 8, and 9 respectively.
The Bend-owned `PieceAssets.bend` supplies request paths, byte caps, order and
decoding, while the browser only carries the bytes. Exact source/output hashes and extraction metadata are recorded in
[`manifest.json`](manifest.json). Performance measurements and their browser
limitations are in [`PERFORMANCE.md`](PERFORMANCE.md). Build with:

```powershell
python bend2/assets/source/pieces/prepare.py --tier standard
python bend2/assets/source/pieces/prepare.py --tier interactive
python bend2/assets/source/pieces/prepare.py --tier high-detail
```

By default output goes to `bend2/assets/runtime/pieces/`. The source and the
runtime pages are separate from the reusable graphics library. `PieceSprites.bend` owns piece-to-page mapping, alpha texture
views, and transformed rendering. Piece sprites face one fixed direction.
The renderer must not use them as if they were a 3D model when the camera
rotates far from that view.
