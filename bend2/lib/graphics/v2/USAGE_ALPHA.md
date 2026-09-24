# Alpha, material and native glyph workflow — DRAFT

The reusable pipeline is **prepare → decode → cache → compose**. Asset IDs,
view selection, projected locations, occlusion order, font choice, tier
selection and UI layout stay with callers. No chess, camera limit or mesh
policy is introduced here.

## Choose the correct mask representation

`MaskedStamp`, `MaskedLayer`, `Mask`, `Mip`, `Glyph` and RGA2 store alpha in the
red byte: half coverage is `Pix{8388608}` (0x800000), NOT Pix{128}.
The pre-existing `Alpha.apply` uses a raw 0..255 mask. These are intentionally
not interchangeable; the old API is not reinterpreted.

`MaskedStamp.draw` keeps its existing signature. Color is straight packed RGB,
not premultiplied. RGB and mask are equal-depth square Images; source side is
1..512, target side 1..4096, both consistent powers of two. Transparent pixels
need no arbitrary key color. Every opacity application retains the existing
rounded integer rule, including opacity>=255 clamping.

For decoded RGA2 masks the ignored bytes are already zero. For a custom mask
with irrelevant noisy G/B values, run `Mask.prepare(depth, mask)` once and
cache it. Canonicalization preserves red coverage and enables zero-region
pruning. Calling it per frame is not an optimization. Colors need not be
rewritten merely to clear hidden RGB. See `examples/AlphaPreparation.bend`.

## Explicit mip levels, not automatic filtering

`Mip.level(requested, sourceDepth, sourceSize, colors, mask)` returns a
`Mip.Level{depth,size,colors,mask}`; zero request preserves originals, requests
past depth stop at 1x1. Store the returned level outside the frame loop.
`AffineTexture.draw` still samples that selected opaque RGB source at its
single center UV. It neither reads alpha nor selects a mip. For an opaque
material pass `Pix{16711680}` as the mip mask; pass the selected level's
colors/depth/size to AffineTexture. Do NOT pass translucent colors to opaque
AffineTexture expecting alpha support. Transformed alpha-textured quads are
not added by this pass; integer-positioned sprites use MaskedStamp.

Mip RGB is alpha-weighted in encoded channel space. This removes hidden-color
halos and reduces minification aliasing, but it is not gamma-correct rendering,
anisotropic filtering or an artistic roughness/lighting model. Coarse levels
lose detail intentionally; they are not always prettier. Choose, cache and
visually evaluate levels at actual display scale in the consuming app.

## Native-resolution text without changing AtlasText

```
python bend2/lib/graphics/v2/tools/bake_font_native.py YOUR_FONT.ttf Native40.bend --sha256 YOUR_EXACT_SOURCE_SHA256 --px 40 --alpha-bits 4
```

The tool never downloads a font. It verifies source bytes first, records
Pillow/NumPy versions and axes, and emits deterministic output for a fixed
font + rasterizer environment. The source font and its license remain the
caller's responsibility. FreeType variation/hinting and different rasterizer
versions need not produce the same bytes; pin the bake environment too.
A font baked with old/new tools is not automatically approved to redistribute.

`Glyph.Mask{advance,left,top,depth,size,coverage}` holds native-size red-alpha
coverage. `Glyph.draw` adds signed bearings to an explicit baseline anchor.
`draw_run` accepts positioned glyphs for caller-supplied shaping. Cache glyphs
or the composed retained text layer; do not magnify an old low-resolution
bitmap and expect new edge information. Glyph has no scale argument.

The generated simple `draw_line`/`width` helpers use codepoint advances and a
question-mark fallback. They are **not** replacements for the shipped atlas's
kerning or for Unicode shaping. No bidi, ligatures, kerning, multiline layout,
font fallback graph, semantic text accessibility, or glyph cache ownership is
invented here. The generated source (including helpers) still requires the
pinned checker. The review render exercised generated glyph lookup plus
Glyph.draw, not the full generated String helpers.

## Portable execution boundary

All production operations return immutable Images/records. Source cursors
retain existing subtrees and distinct draw calls preserve painter order.
Disjoint quadrants expose balanced plain-call forks, while unresolved sprite
regions of side<=8 execute sequentially. Host asset IO, decoded-value caches,
GPU ownership and presentation remain outside these functions.

This shape is a candidate for CPU/multicore/GPU lowering, not a speed guarantee.
Aligned partial-alpha `Layer.over`, mask preparation and mip preparation can
still expose fine-grained recursive work. Native reference-counting, captures,
fork arity, allocations and scheduling need inspection of actual emitted C.
The historical native Texture pool regression is retained and not overridden.
No new bang, foreign backend, mutable shared framebuffer, or mesh API is added.

After restoring the exact toolchain, run `tools/run_review.py --pinned`, then
actual build/paint measurements on the intended host. Review performance by
construction, decode/preparation, packing/blit and input-to-paint separately.
Do not translate the portable source-subset timing table into FPS or RTX 5090
claims. More detailed evidence and known limits are in the root `REVIEW.md`.
