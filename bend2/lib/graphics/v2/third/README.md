# Graphics v2, third review pass — DRAFT

Local relocation and verification details: [INTEGRATION.md](../INTEGRATION.md).

Fifteen opt-in production modules. Existing v2 files and contracts are unchanged.
The library's [THIRD_PASS_REVIEW.md](../review-third/THIRD_PASS_REVIEW.md) is the delivery entry point.

- `PreparedSprite`, `AtlasRegion`: exact extensions of the existing legacy sprite
  and straight-alpha texture path.
- `Premul`, `Surface`, `GlyphLayer`: explicit PMA layers, groups and native glyph ink.
- `Brush`, `PathFill`, `Shape`, `Paint`, `Raster`: prepared materials, filled paths,
  sample-level boolean geometry and bounded ordered rendering.
- `PixelBuffer`, `Blur`, `ImageShift`, `Effects`: owned preparation buffers and
  exact integer filters, transforms and cached soft effects.
- `Retained`: stable-ID metadata, conservative damage and broad-phase picking.

Detailed API/domain guide: [review-third/API.md](../review-third/API.md).
Contracts and evidence: [review-third/DRAFT_CONTRACTS.md](../review-third/DRAFT_CONTRACTS.md),
`../contracts/third/` and `../tests/third/`. The matching real-worker host modules
are in `../host/`.

PMA Image words are not legacy RGB Image words. Keep conversion explicit. Build
cache keys from all pixel-affecting input versions and bounds. Neither source
`offload` nor native CPU fallback is proof of GPU execution.
