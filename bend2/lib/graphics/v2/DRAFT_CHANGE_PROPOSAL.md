# Additive graphics review proposal — DRAFT, not frozen

## Authority and preservation

This is a proposal for root review, not an accepted amendment or proof receipt.
The user authorized improvement of the reusable library. No game geometry,
piece/view selection, camera bounds, layout, mesh schema, frozen v1 source,
compiler pin, wrapper or grid8 source is changed. Existing core
`contracts/LAWS.bend` and `contracts/PROOF.bend`, and both RGA1 contract source
files, are byte-identical to the supplied snapshot. The 24 core / 8 grid8 /
6 RGA1 historical proof claims remain historical and source-bound; the
original Pro delivery had not checked the changed dependency closure with pinned
Bend. The local adoption check is recorded separately in `LOCAL_PRO_REVIEW.md`.
The supplied original prose and receipts are retained, not replaced by this
review's experimental execution results.

**No existing pixel law is relaxed.** In particular, core laws 6, 15 and 16
keep their prior meanings. No F32 ambiguity band is expanded. Neither better
speed nor a failing test licenses changing an expected pixel. This review
adds opt-in operations; it does not silently turn nearest sampling into a
filter or switch the old font atlas to another format.

## R1 — MaskedStamp implementation refinement (old law 16 unchanged)

`MaskedStamp.draw` retains every argument and its early zero-opacity,
uniform-transparent-mask and invalid-coordinate guard order. `draw_valid`
routes to the new internal cursor kernel. Local adoption removed the old
`leaf`/`tree` helpers after finding no callers; the original source remains
under `tests/review/baseline/` and in the supplied archive for A/B provenance.
Inside the translated half-open source square the pixel remains exactly
`Color.over(source, old, floor((red(mask)*min(opacity,255)+127)/255))`.
Outside it, the old pixel remains. Source and target trees remain immutable.
Malformed images and mismatched sizes remain preconditions, exactly as before.

The proposed implementation can retain an unchanged target subtree without
reading color data when its mask region is uniform red zero. It can use
`MaskedLayer.over` when both narrowed source cursors denote the whole target
region. Cursors are existing ancestors: no filtered or reconstructed source
pixel enters the draw. Full opaque aligned regions can return the exact
source subtree through `Layer.over`; this is an additional narrow aligned
endpoint, not a structural-identity promise for arbitrary translated images.
A target square at most 8 pixels wide uses a sequential scalar leaf region
when not aligned. The cutoff changes work partitioning, not samples.

Independent finite integer tests and before/after full-raster comparisons are
provided. They do NOT prove the general cursor invariant or all schedules.
The existing two MaskedStamp witnesses are preserved unchanged and must be
rechecked through the pin. No new general refinement theorem is claimed.

## R2 — Explicit red-alpha preparation (new opt-in behavior)

For a well-formed image of depth 0..9, `Mask.prepare(d, mask)` denotes
`red(sample(mask)) << 16` at every coordinate. Other channels/bits become zero.
Four equal immediate Pix children may compact to a Pix. Red samples are
preserved; the operation is idempotent for valid trees, and using the prepared
mask in `MaskedStamp.draw` has the same output pixels as using the original.
This is a prepare-once operation, not a hidden per-draw traversal.

This does not reinterpret `Alpha.apply`: that older API uses raw 0..255 mask
values, whereas MaskedStamp, Glyph and RGA2 use alpha in the red byte. A mask
value `Pix{128}` is NOT half coverage in the new pipeline.

`mask_zero_depth` is only the definitional one-leaf signature. General
red-sample preservation and idempotence are finite-test obligations here,
not a checked induction. `masked_layer_zero` and `masked_layer_full` propose
exact tree identities for zero opacity and uniform red255 / opacity255.

## R3 — AffineTexture dead-work elimination (old law 15 unchanged)

A depth-zero tree ignores its fill flag. `fill_test(0n,...)` now returns False
before running an inside test and four source-UV corner queries which that
leaf would discard. A leaf with coverage count zero returns its old image
before source lookup. All live center-UV operations, source index rounding,
quarter geometry samples, determinant handling, blending and guard endpoints
are unchanged. This is not multisampling, bilinear sampling, linear-light
filtering, or a changed F32 tie policy. Old proof witnesses remain unchanged.
The general preservation argument is an implementation review plus finite
exact A/B evidence, not a new checked floating-point theorem.

## R4 — RGA2 is a separate straight-alpha codec

See [the complete RGA2 proposal](assets/RGA2.md). RGA1 magic, layout, error
precedence and proofs remain unchanged. RGA2 preserves RGB even at alpha zero
and decodes alpha to the mask's red byte. Decode failure exposes no partial
Image. Host byte caps and pure-decoder caps are separate responsibilities.
Four narrow signatures propose empty, transparent-red, non-byte-alpha and
trailing-byte outcomes. They are not a general decoder theorem.

## R5 — Explicit alpha-weighted mip reduction

Input colors/mask must be well-formed at the supplied equal depth 0..9;
colors are packed encoded RGB and coverage is the mask's red channel.
For each 2x2 footprint, let `W=a0+a1+a2+a3` and
`A=floor((W+2)/4)`. If A is zero, output `(RGB=0, alpha=0)`; otherwise each
channel is `floor((sum(ci*ai)+floor(W/2))/W)` and the output mask is `A<<16`.
The largest weighted channel sum is 260,100, safely below U32 overflow.
This is a straight-alpha output of an alpha-weighted box operation in encoded
channel space. It is NOT gamma-correct/linear-light, HDR, premultiplied input,
or a claim of ideal reconstruction. Transparent hidden colors cannot bleed
into a positive-alpha reduced pixel. Quantization may make tiny coverage zero.

`Mip.half(0n,...)` preserves both inputs exactly, including hidden RGB.
`Mip.level(0n,d,size,...)` preserves both original trees and metadata exactly.
For positive requests, repeatedly reduce one level, divide size by two, and
stop at depth zero. Requests beyond the source depth clamp at 1x1. This
successive rounded mip chain is NOT required to equal a one-shot resize to
the same final size. The caller chooses/caches a level; the library does not
choose camera/tier/LOD policy or mix neighboring levels.

The Python `area_resize` tool generalizes the same weighting to exact integer
area overlaps. Same-size input is byte-preserving; other output pixels with
rounded alpha zero are canonical RGB zero. Its formula has an independent
Fraction-based oracle. That oracle is not used by production preparation.

The `mip_level_zero`, `mip_half_zero` and fixed `mip_hidden_blue` witness
proposals are narrow. General box semantics are finite-tested, not proved.

## R6 — Native-resolution glyph coverage, not an atlas amendment

`Glyph.Mask` stores advance, signed left/top bearings, source depth/size and
red-alpha coverage. For a valid mask and anchor, draw it at anchor+bearing in
a constant ink color through MaskedStamp. An invalid input coordinate or
translated coordinate beyond [-4096,4096] is inert, not wrapped. Zero opacity
returns the exact target. `draw_run` composes explicit positioned glyphs in
list order; an empty run returns the exact target. It does not shape text.

The optional baker emits one explicitly hash-pinned font at one native size,
with 4- or 8-bit alpha. Four-bit quantization maps a byte a to
`17*floor((15*a+127)/255)`; maximum byte error over all 256 a is 8. That
finite numerical fact is NOT an aesthetic or accessibility theorem.
The old 24px/two-bit FontData/AtlasText and law6 remain unchanged. The new
baker's simple line helper has explicit codepoint advances and fallback,
without kerning, bidi, ligatures or language shaping. For shaped text, callers
supply positioned glyphs via `draw_run`; they choose fonts, sizes and layout.
`width` requires the sum of advances to fit U32; it is not a multiline measure.

`glyph_zero` and `glyph_empty` are proposed endpoint signatures only. Glyph
outline fidelity, native-size visual quality and font licensing need their
own evidence. Temporary system-font-derived data used for the review PNGs is
not bundled or proposed as shipped game font data.

## Candidate proof map and acceptance

`contracts/extensions/{LAWS,PROOF}.bend` contains **12 candidate** signatures
and witness bodies: mask_zero_depth; masked_layer_zero/full;
mip_level_zero/half_zero/hidden_blue; glyph_zero/empty; rgba_empty/hidden_rgb/
non_byte/trailing. They have NOT been checked, counted as passing, or frozen.
Most are proposed definitional reductions. The full aligned layer identity
has an explicit depth case split rather than assuming a stuck match reduces.

Root should first review these English meanings, run the unchanged core,
grid8 and RGA1 proof entrypoints plus the extension entrypoint through the
exact pin, inspect warnings and run the same independent pixel tests through
the real loader. Repair implementation/witnesses without relaxing domains or
expected results. Preserve this proposal and the existing evidence when
recording a later accepted amendment; do not overwrite a frozen manifest.
