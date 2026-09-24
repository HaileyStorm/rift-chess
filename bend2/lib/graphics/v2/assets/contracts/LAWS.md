# Raw Graphics Asset codec laws — DRAFT

This package is a generic graphics asset codec. `RGA1` means **Raw Graphics
Asset version 1**; it does not name or encode any game. The runtime decoder
accepts a linked `List<U32>` of bytes and returns either an immutable Base
`Image` with its depth or a typed rejection.

## Wire format and bounds

The first four bytes are the ASCII bytes `RGA1`, followed by one raw numeric
depth byte. Depths 0 through 9 are accepted so that small images and small
proof fixtures use the same format; production artwork is expected to use 256
or 512 square pixels (depth 8 or 9). The remaining bytes are exactly three
bytes per pixel, red then green then blue, in row-major order. A triplet becomes
packed `0xRRGGBB`. Thus the complete required length is `5 + 3 * 4^depth`.
There is no metadata, alpha channel, palette, padding, or trailing data. The
largest accepted input is 786,437 bytes and the largest image has 262,144
pixels. The decoder never traverses beyond that depth-derived payload plus
one list-cell check for trailing input.

The browser adapter should reject an `ArrayBuffer` above 786,437 bytes before
allocating a Bend `List<U32>`. A native caller should bound `File.read_bytes`
to 786,438 bytes (one byte over the maximum distinguishes oversized input)
before passing the resulting list. The library itself remains pure: it does
not open files, fetch resources, allocate host buffers, or depend on a game.

## Error precedence

1. If fewer than five header bytes are present, reject as `BadLength`, before
   inspecting the values that were present.
2. Once all five header cells exist, any header `U32` above 255 is
   `NonByte`.
3. A byte-valued header with a wrong four-byte magic is `BadMagic`.
4. With the correct magic, a depth byte outside 0..9 is `BadDepth`.
5. For an accepted depth, consume exactly the expected RGB payload. A missing
   payload byte is `BadLength`; a consumed payload value above 255 is
   `NonByte`; any unconsumed trailing cell is `BadLength`. A trailing cell is
   not inspected for byte range because its existence already makes the
   complete input invalid.

This order is observable and deterministic. No rejected input produces an
`Image`; the entire payload and end-of-input condition are checked before the
row-major pixels are assembled into a quadtree.

## DRAFT semantic laws

The colocated Bend signatures check six narrow claims: a depth-zero exact
pixel, one 2×2 row-major placement case, and explicit rejection of bad magic,
trailing data, an invalid depth, and a non-byte payload element. They are
endpoint/error examples only. The general claim that every accepted payload
maps all row-major RGB triplets to all `Image` pixels is checked by an
independent finite emitted-JavaScript differential suite, not claimed as a
closed theorem here.

`PROOF.bend` closes only these six displayed signatures. Checker completion
does not prove generated-JS/native equivalence, maximum-size performance,
host allocation safety, file transport, or artwork quality. Those are
separate gates recorded in the package README and test receipt.
