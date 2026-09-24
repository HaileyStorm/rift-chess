# RGA2 straight-alpha asset proposal — DRAFT

`RgbaImage.bend` adds a pure codec alongside, not inside, RGA1. Its exact wire
format is `52 47 41 32 | depth | R G B A | R G B A | ...`, where depth is one
numeric byte 0..9 and side is 2^depth. Payload is row-major, straight
(unassociated) RGBA, one byte per component. The exact length is
`5 + 4*side*side`, at most **1,048,581** bytes. No profiles, dimensions beyond
the depth, palette, compression, metadata, gamma conversion, padding or
trailing bytes are accepted. RGA1 input is BadMagic, not silently upgraded.

On success `Decoded{depth:U32, colors:Image, mask:Image}` contains packed
`0xRRGGBB` and `alpha<<16`, respectively. Hidden RGB under alpha zero is
preserved by decode; masking/filtering is a separate operation. Quad children
are TL/TR/BL/BR. Immediate equal uniform children can compact. Returned data
is immutable. Rejected values carry a typed reason, never a partial Image.
The decoder reuses unchanged RGA1 row-to-tree assembly, not its wire parser.

## Exact error precedence

A header shorter than five list cells is BadLength. A complete header with
any component above 255 is NonByte before magic/depth checks. Otherwise wrong
magic is BadMagic; otherwise depth above 9 is BadDepth. Within payload,
an incomplete four-cell pixel is BadLength. A complete pixel with any value
above 255 is NonByte, checked before consuming the next pixel. After the
expected complete payload, ANY additional list cell is BadLength, regardless
of that trailing cell's value. U32 values cannot represent a negative byte;
malformed JS objects/non-U32 numbers are outside the typed decoder domain.

The decoder consumes at most the depth-derived payload plus one presence
probe for trailing input. RGB/mask images are assembled only after complete
validation. A host must cap external input BEFORE constructing the linked
list: use at most `max_bytes()+1` (1,048,582) bytes to permit the trailing-byte
diagnostic, or reject above max_bytes at transport level. This library does
not make an unbounded fetch safe or provide browser/network IO.

## Preparation and use

```
python bend2/lib/graphics/v2/assets/tools/prepare_rgba.py source.png prepared --side 128
python bend2/lib/graphics/v2/assets/tools/prepare_rgba.py atlas.png prepared --side 64 --crop 0 0 300 500
```

Crop is explicit source x,y,width,height; the tool does not infer a silhouette
or atlas policy. It preserves aspect ratio to nearest integer dimensions,
centers transparent padding in the selected power-of-two square, and does not
upscale unless --allow-upscale is supplied. Exact integer area weights use
alpha-weighted encoded RGB; mip levels are successively halved, not separately
resized from the original. Same-size resize preserves all bytes. A manifest
records source/content hashes, crop, content rectangle, level sizes and
filter semantics. Neither licensing nor an ICC/linear-light transform is
inferred. Pillow/NumPy are offline dependencies only. Input is a single-frame PNG, bounded to 128 MiB encoded bytes and
16,777,216 pixels. The exact decoded source byte snapshot is hashed. Native/Bend runtime imports neither dependency.

Outputs are explicit asset files, not automatically installed library assets.
Use a fresh output directory: the tool does not delete stale extra files from
an older bake and multi-file writes are not atomic. Font and artwork licenses
must be retained/reviewed by the caller. The loaded byte snapshot is immutable during a bake. Keep input files stable
while that bounded initial read takes place; it is not a filesystem snapshot.

After typed success, pass colors and mask to `MaskedStamp.draw`. Depth returned
by decode is U32, while rendering expects `U32.to_nat(depth)`. The source side
is `U32.shln(1,U32.to_nat(depth))`. Cache decoded results; do not build a byte
list or mip chain on every draw. Select explicit levels in caller code. Alpha
is in RED, unlike `Alpha.apply`'s older raw-byte mask convention.

Candidate endpoint laws/proofs are in `../contracts/extensions/`. New finite
tests are `../tests/review/rgba-codec.ts`; Python preparation tests are in
`../tests/review/offline_tools.py`. The portable-review execution harness is
not a Bend compiler/proof/backend result. See `../DRAFT_CHANGE_PROPOSAL.md`.
