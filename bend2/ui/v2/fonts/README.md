# Rift menu type

The one packed data file carries 8-bit antialiased coverage at 20/30px and
separately rasterized 40/60px sizes for the 2× tier. The app owns its type
scale; the reusable graphics library knows neither this font nor Rift's UI.

The source is vendored at `bend2/assets/source/fonts/dm-sans-pinned.ttf`, SHA-256
`8cd08d97e89c24d0aa92edd2f0f4c8ee6195eee9b7c9f154865a58b02f0c1c0d`,
from Google Fonts' `googlefonts/dm-fonts` commit
`b5efa9c32e8f9b63005f5cdb1ad5527a77d2cd04`. Its SIL Open Font License
1.1 and attribution are copied beside it at `bend2/assets/source/fonts/OFL.txt`.
The derivative is called *Rift Observatory Sans*, not the original font name.
The TTF is not loaded in the browser.

Run `python bend2/ui/v2/fonts/bake_pack.py` to regenerate with Pillow 12.3.0
and NumPy 2.4.2. It verifies the pinned source hash, rejects out-of-domain
metrics and node complexity, writes
`bend2/assets/runtime/rift-observatory-font.rga`, and records exact hashes in
`packed-manifest.json`. The output is 151,343 bytes for 242 records. The
40/60px masks come directly from outlines, never enlargement. Characters
outside baked ASCII coverage fall back to a blank or question mark; Unicode,
shaping, and kerning are future work.

`FontPack.decode(Array<U32>,used)` checks RFNT magic/version, count, sorted
tier/code, byte ranges, metric bounds, tree tags, consumption and a 16,384-step
per-glyph limit, returning `None` on malformed data. The backing array must
be power-of-two, at least `used`, and no more than 262,144 bytes; the decoder
checks those conditions. The host fetches bytes and supplies a padded
`Uint8Array`, proven against pinned Bend's actual JavaScript ABI by
`bend2/tests/menu-aa-array-abi.mjs`. Direct opaque labels use the library's
8-bit masked glyph stamping; PMA glyph grouping is reserved for translucent
overlapping effects. Cache the rendered chrome across board-only frames.

The superseded inline-Image trial generated about 0.94 MiB of Bend source.
Although its source checked, its selected JS emission passed 5.9 GiB RSS
without output after 36 seconds. It was removed. The pack checks in under a
second and decoded 242 glyphs in roughly 86–704 ms across differently loaded
local Node emitted-JS runs; this is
not a browser frame budget. One browser-oriented specimen with the initial
PMA text path emitted in 99.97 s at ~3.15 GiB RSS and rendered the chrome in
274–541 ms before cache. The narrower opaque glyph path is measured separately
in the same test.
