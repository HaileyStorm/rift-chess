# Limestone material study v1

`limestone-v1-source.png` is original game-neutral material art generated
with the built-in ImageGen tool on 2026-09-24 for this project. It was not
copied from a supplied or third-party image. The output is RGB 1254×1254,
3,369,909 bytes, SHA-256
`13DA6C531EE0A831ACEF967FB93BC08D1314AE8D7F2859547412CC48E00451E3`.
The original generated artifact remains in the local Codex generated-images
directory; this workspace copy is the project source asset. Distribution
follows this repository's MIT `LICENSE`; there is no separate external
image license or attribution. An edge-seamless result was requested but has
not been mathematically verified. The graphic contains no game rules,
board, pieces, text, or interface elements.

Built-in ImageGen prompt (verbatim):

> Use case: stylized-concept. Create one seamless square game-material texture tile for a stone observatory platform. Exact asset: top-down orthographic 512×512 neutral warm gray limestone surface, fine irregular mineral grain, thin weathered veins and a few hairline cracks at multiple scales, subtle worn chisel marks and natural porous variation. Physically believable matte stone with restrained warm/cool value variation; strong local detail but no directional light, cast shadow, vignette, bevel, borders, masonry blocks, checkerboard, symbols, chess pieces, architecture, text, logos, or objects. All four edges must tile seamlessly with no visible seam. The tile is meant to be repeated or UV sampled on projected quads in a stylized high-resolution strategy game. Keep hue within neutral limestone grays and soft beige, avoiding pink, green, purple, saturated color or regular square flecks. Deliver a single square bitmap texture.

The built-in tool returned 1254×1254 despite the requested 512×512.
`build_limestone.py` resamples the preserved original to 256×256 RGB using
Pillow 12.3.0 LANCZOS and calls the checked-in RGA1 encoder. The ignored
intermediate raw RGB SHA-256 is
`3E6275DF3B40F966C8EE422173E7AB3FE68F723B2F16D6C4B98824B7F64CBEDD`.
The versioned `limestone-v1-256.rga` is 196,613 bytes, SHA-256
`C2EAB9A4302332706D31384D5786BCA2A27A49CF3DDBDCB18FF07815A80D25D1`.
It has not been consumed by a released game. Rebuilds under a different
rasterizer/version must compare exact bytes before replacing it.
