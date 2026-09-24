> **Additive DRAFT:** [RGA2.md](RGA2.md) describes the new, separate
> straight-alpha codec and offline PNG/crop/mip tool. Everything below still
> describes RGA1; RGA1 source and formal contracts are unchanged.

# Raw Graphics Asset codec

`RGA1` is a small, generic **Raw Graphics Asset** format. It carries opaque
RGB artwork into Base `Image` without adding image-file parsing, browser APIs,
or game semantics to this library. `RgbImage.bend` is pure Bend and only
imports Base. Decoding returns an immutable `Image` quadtree and its depth.

The bytes are:

```text
52 47 41 31 | depth | R G B | R G B | ...
  "RGA1"      0..9    row-major RGB triplets
```

The depth is one **numeric** byte, not the ASCII digit. The side is `2^depth`;
the exact input length is `5 + 3 * side * side`. The accepted depth range is
0..9, giving at most 512×512 pixels and 786,437 bytes. Depths 0..7 are useful
for tests and small reusable assets; the intended artwork sizes are 256 or
512 square. Each triplet is preserved as packed `0xRRGGBB`. There is no alpha,
palette, metadata, color conversion, padding, or trailing data.

Pixels are supplied row by row. The decoder builds quadtree children in
`TL, TR, BL, BR` order, preserving row-major meaning (for a 2×2 image, the
first two pixels are the top row). Uniform regions are compacted to one `Pix`
where their four immediate children are identical uniform colors. The source
list and returned tree are immutable values; no mutable buffer is retained.

`RgbImage.decode_bytes` accepts `List<&2,U32>`, matching Base `File.read_bytes`
and a generic host conversion from `Uint8Array`. It reads no more than the
depth-derived payload (at most `max_bytes()`) and one list cell to reject
trailing input.

The game sets Bend's `AssetRequest.max_bytes` to `RgbImage.max_bytes()+1`
(786,438). That one-byte margin is a bounded probe: an otherwise complete
maximum-size file plus one trailing byte reaches Bend and is rejected as
`BadLength`. A response longer than the request cap is cancelled/rejected by
the browser bridge before it constructs a Bend list; Bend receives a failed
response with no bytes. Native callers should similarly bound
`File.read_bytes` to `max_bytes()+1` when they want the same trailing-byte
diagnostic. A stricter browser adapter may reject anything above
`max_bytes()` before list construction, at the cost of reporting the host's
generic failure instead of the decoder's typed `BadLength`. Never build an
unbounded Bend list from an external file or response.

The browser's generic transport conversion is only a byte-list bridge; it does
not parse or interpret pixels:

```js
function toBendBytes(view) {
  let tail = { $: 'Nil' };
  for (let i = view.length - 1; i >= 0; i -= 1)
    tail = { $: 'Con', head: view[i], tail };
  return tail;
}
```

After checking the buffer against the chosen transport cap (the current game
uses `RgbImage.max_bytes()+1`), call
`RgbImage.decode_bytes(toBendBytes(new Uint8Array(buffer)))`. Native Base
`File.read_bytes(file, max_bytes()+1)` already returns the same linked
`List<U32>` shape; inspect its `Result` and pass the bytes value to the pure
decoder.

The typed errors and their order are part of the DRAFT contract in
[`contracts/LAWS.md`](contracts/LAWS.md). A rejected value never contains an
image. The complete payload and absence of trailing bytes are validated before
the final quadtree is assembled. The six narrow endpoint/error signatures
and reflexivity proofs live in `contracts/LAWS.bend` and `contracts/PROOF.bend`;
they do not claim the general decoder theorem. The standalone emitted-JS test
checks every pixel at each depth against an independent scalar row-major
reference and exercises malformed input.

## Offline encoder

`tools/encode_rgb.py` converts a headerless raw RGB byte file into canonical
RGA1 bytes. This is intentionally a byte-preserving packaging tool, not an
image editor or game asset loader:

```text
python bend2/lib/graphics/v2/assets/tools/encode_rgb.py 9 artwork.rgb artwork.rga
```

The source must contain exactly `3 * 2^depth * 2^depth` bytes. The encoder
prepends only the fixed magic and numeric depth; repeated runs produce
byte-identical output. Keep original source art and its license alongside the
runtime asset. The codec has no bundled artwork or license obligation.

## Verification

```text
node bend2/tools/bend.mjs bend2/lib/graphics/v2/assets/contracts/PROOF.bend --check-only
node bend2/tools/bend.mjs --run bend2/lib/graphics/v2/assets/tests/rgb-image.ts
python bend2/lib/graphics/v2/assets/tools/test_encode_rgb.py
```

Checker proofs, finite reference checks, depth-9 decode/list-build timings, and
observed process RSS are separate evidence. No test here establishes native C
behavior, multicore speed, GPU use, browser transport safety, or aesthetic
quality.
