# Reusable Bend graphics library contract

This directory contains the reusable image-tree renderer used by the Bend2
application. The historical 512-square pixel implementation is copied under
`pixels/` byte-for-byte from `bend2/graphics/`; `VERIFICATION.json` binds each
active copy to its original source hash and the pinned compiler.

`Canvas.rect_at` fills a clipped half-open rectangle in a `2^depth` image.
`Canvas.frame_at` paints a filled panel with a one-pixel outer border. Its
`border` argument is the outer colour and `color` is the inset face colour.
`Canvas.embed_at` translates a source image of `2^sourceDepth` pixels into a
target image while preserving source pixels, reusing aligned source subtrees
and descending only where source and target boundaries do not align. `rect`,
`frame`, and `embed` are convenience wrappers for the depth-10 1024-square
application canvas.

`Font.draw_at` uses an authored 5-by-7 bitmap alphabet for printable ASCII
characters, groups lit cells into horizontal runs, and scales each run with
`Canvas.rect_at`. Unsupported characters use a question-mark replacement.
`Font.width` reports the fixed six-cell advance per character, `line_height`
reports eight scaled cells, and `wrap` performs bounded word wrapping with
single spaces. The depth-10 `draw` function is the application convenience
wrapper.

The closed contracts in `contracts/` cover empty text drawing, empty-text
width, zero-width rectangle inertness, source-depth-aware subtree selection,
and the exact aligned identity embed. They do not prove complete rectangle or
general embed coverage, subtree sharing cost, glyph aesthetics, kerning,
international text shaping, antialiasing, generated JavaScript, native CPU or
GPU execution, or browser/native presentation. Those boundaries require
separate finite, runtime, and rendered checks.
