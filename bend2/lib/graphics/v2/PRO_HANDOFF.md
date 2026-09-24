> **Portable review addendum (2026-09-24):** the original document below is
> retained as checkpoint history. Current changes and 12 UNCHECKED candidate
> extension witnesses are described in [DRAFT_CHANGE_PROPOSAL.md](DRAFT_CHANGE_PROPOSAL.md).
> No pinned Bend, native, GPU or browser verification was performed for this
> changed source closure. See the root `REVIEW.md` and `review/` receipts.

# Graphics v2 → GPT-6 Pro checkpoint (2026-09-24)

This is a **DRAFT**, reusable pure Bend library, not an accepted WOW or GPU
release. Root owns Git, browser/game integration, tier policy and final
freeze. This lane owns `bend2/lib/graphics/v2/**` and `bend2/lib/grid8/**`;
the separate RGA1 codec writer owns `graphics/v2/assets/**`. No frozen v1
graphics, upstream pinned compiler or game files were changed by this lane.
Read [core Laws](LAWS.md), [core proof source](contracts/PROOF.bend),
[grid Laws](../../grid8/LAWS.md) and [migration](../../grid8/LAW_MIGRATION.md)
before contract work. Propose every new/changed Law and Proof to root for
review before editing/freeze; never weaken the existing meanings.

## Verified boundaries

- Pinned Bend2.0.27 `d37909174ebd664338ae3194799a9e0899dedd51`,
  `BEND_NO_TELEMETRY=1`, local wrapper. **24 core DRAFT proofs** and eight
  grid8 DRAFT proofs checked in separate runs; no unsafe/foreign proof.
- Core finite checks: original library5,874; Grain356,615 exact pixels;
  Texture pool96 full structural/125,616 scalar pixels; AffineGrain246,994
  exact with1,801 F32 tie-band exclusions; AffineTexture112,008 exact with
  538 tie-band exclusions; latest MaskedStamp65,540 exact scalar
  red-alpha/clip/overlap comparisons. These are emitted-JS finite evidence,
  not a general F32/native/GPU theorem. Grid8 prior integration48,021
  checks and six camera captures remain historical source-bound receipts.
- Current `MaskedStamp` uses separate packed-RGB color and mask Images;
  `Color.red(maskPixel)` is alpha, other mask channels ignored. Negative
  coordinates use the established 4096 bias; outside quadrants are pruned
  before `x-sx,y-sy`. Zero opacity/uniform zero mask exact-target proofs pass.
  It does **not** yet optimize interior zero-mask subtrees or aligned opaque
  source reuse. The key-color Stamp path remains for hard-edged assets.
- Pure emitted-JS 32-piece benchmark (prebuilt synthetic Images; three
  settled samples): at512/source32 MaskedStamp construction
  141.78/112.17/113.37ms and serial blit7.57/4.81/4.34ms; at1024/source64
  670.24/604.69/604.25ms and blit25.45/26.10/20.23ms. Hard-key Stamp
  context was ~57–73ms at512 and~93–111ms at1024, with different visual
  semantics. **Never use the 32 masked pieces on drag**; cache them for an
  idle settled layer, keep existing cheap Bend proxies for camera motion.
  Real atlas decoding, browser paint and native costs remain unmeasured.
- `AffineTexture` accepts any immutable well-formed RGB Image such as one
  decoded RGA1 tile, maps pixel-center UV, and uses Facet quarters only for
  geometry. It made stone continuous in the game-neutral A/B, but 8/12
  top faces at1024 cost ~645–968/~1,254–1,602ms versus flat
  ~72–184/~136–193ms; too slow for full-board/default interaction.
  `AffineGrain` object-anchored integer hash is cheaper but produces regular
  square flecks and was rejected visually as WOW.
- Procedural A (`reference/affine-hall-1024-v1.png` in the Pro archive)
  took1,594.28ms Bend construction; RGA1 stone B
  (`reference/affine-hall-texture-1024-v1.png` in the archive)
  took3,844.03ms construction +80.56ms blit, with byte-list7.61ms and
  Bend decode272.14ms separately. B materially improves surface texture,
  but the stage remains diagrammatic. Original 1254² ImageGen source and
  deterministic256² RGA1, hashes/prompt/MIT provenance are in
  `examples/materials/PROVENANCE.md`. Root's sculpted RGBA atlas is
  game-owned under `bend2/assets/source/`; no sprite assets were imported.
- WSL2 Clang18 native CPU whole-tree Texture control: exact checksum
  `360651397` across 204 ext4-local executions. True serial median
  52.0/55.5/53.8ms at threads1/4/8; bounded top3 pool
  85.1/103.1/124.4ms; fine4^7 pool98.1/116.7/133.8ms. The convenience
  CPU pool API was rejected; `serial_tree` and generic `pool_top` remain
  DRAFT with no speed claim. Exact C/ELF/source SHA and raw samples are in
  host-local ignored `.artifacts/bend2/graphics-v2/native-texture-cpu-20260924/RECEIPT.md`;
  that receipt is **not portable unless root explicitly includes it** in
  the Pro archive.
  **No GPU device build or execution**; Linux coordinator grant is separate.

## Pro priorities after root checkpoint

1. Judge actual integrated browser UI, camera orbit/picking and 512→1024/2048
   retained-layer input-to-paint, not isolated specimen screenshots. A prior
   live snapshot found PixelPort8–20ms, cached Chrome compose100–170ms and
   full camera400–500ms; newer B512 motion worker measured~29–35ms. Root
   owns the current build and can give fresh receipts. Prefer existing
   `Upscale.Frame`, `Canvas.embed`, cached chrome shell and dirty blit before
   adding another public layer API. Bend retains tier policy; CPU fallback.
2. Make asset-backed surfaces selective and cached (8–12 focal slabs) or
   optimize immutable UV sampling with exact pixel differential. The
   current 256 source lookup per output leaf is expensive. Do not use a
   full64-cell textured redraw on every move. Keep source/decode/cache
   separate from composition and measure complete host paint.
3. For sculpture pieces, test 32px@512 and64px@1024 **game-owned** atlas
   derivatives against the generic `MaskedStamp` at actual rendered scale.
   Preserve alpha edges and aspect; plan angle-selected turntable sprites as
   game data. Optimize uniform-zero mask subtrees/tile batching only with a
   measured win and reviewed new Law. Do not create a mesh API now.
4. Review the cached chrome text: current DM Sans atlas is24×24 two-bit
   alpha and scale2 repeats source pixels into 2×2 blocks, visibly jagged
   at1024. A native-size/4-bit cached-shell tier might help, but measure
   construction and browser paint before changing its contract. This was
   read-only assessment; no font files changed in this checkpoint.

## Focused commands

Set `$env:BEND_NO_TELEMETRY='1'` in PowerShell, then use the pinned wrapper:

```text
node bend2/tools/bend.mjs bend2/lib/graphics/v2/contracts/PROOF.bend --check-only
node bend2/tools/bend.mjs bend2/lib/grid8/contracts/PROOF.bend --check-only
node bend2/tools/bend.mjs --run bend2/lib/graphics/v2/tests/affine-texture.ts
node bend2/tools/bend.mjs --run bend2/lib/graphics/v2/tests/masked-stamp.ts
node bend2/tools/bend.mjs --run bend2/lib/graphics/v2/tests/masked-stamp-bench.ts 512 3
node bend2/tools/bend.mjs --run bend2/lib/graphics/v2/tests/masked-stamp-bench.ts 1024 3
node bend2/tools/bend.mjs --run bend2/lib/graphics/v2/tests/render-affine-hall.ts 1024 texture v1
```

All contracts are unfrozen; independent package manifests/verifiers and
native/device evidence remain pending. Root will do one focused checkpoint
review, commit/push, then this lane releases only its host-local sentinel
claim. Pause further local library edits for Pro rather than broadening the
API from this partial success.
