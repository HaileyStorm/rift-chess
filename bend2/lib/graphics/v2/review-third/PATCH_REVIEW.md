# Incremental patch review

**62 added text files**, no changes to the 767 prior files. The
patch is against `graphics-v2-expansion-review-436313f9.zip`, the second delivery.
It includes production modules, tests, benchmark drivers, host adapters, demo
sources, verification tools and updated third-pass DRAFT guides. The complete
integrated tree is already present in this ZIP.

Receipts, compiled JavaScript, PNGs, the preserved experiment and the new
manifest are accompanying payload, not text hunks. Rebuild the demo modules
with the supplied tool after applying a source-only patch elsewhere. The
delivery verifier requires the full delivery manifest, not just this patch.

`git apply --check` succeeded on a fresh extracted copy of the second
delivery. Applying the patch then reproduced every selected file byte for
byte. Raw commands, exit codes, patch/source archive hashes and preservation
checks are in `receipts/patch-and-preservation.json`.

## Paths

- `THIRD_PASS_REVIEW.md`
- `bend2/lib/graphics/v2/bench/third/CachedCpu.bend`
- `bend2/lib/graphics/v2/bench/third/CachedSerial.bend`
- `bend2/lib/graphics/v2/bench/third/Immediate.bend`
- `bend2/lib/graphics/v2/bench/third/PathTraversal.bend`
- `bend2/lib/graphics/v2/bench/third/StableSprites.bend`
- `bend2/lib/graphics/v2/bench/third-path.mjs`
- `bend2/lib/graphics/v2/bench/third.mjs`
- `bend2/lib/graphics/v2/contracts/third/LAWS.bend`
- `bend2/lib/graphics/v2/contracts/third/PROOF.bend`
- `bend2/lib/graphics/v2/host/FrameWorkers.mjs`
- `bend2/lib/graphics/v2/host/TileDamage.mjs`
- `bend2/lib/graphics/v2/host/TilePresenter.mjs`
- `bend2/lib/graphics/v2/host/frame-worker.mjs`
- `bend2/lib/graphics/v2/tests/third/NativePixels.bend`
- `bend2/lib/graphics/v2/tests/third/NativePixelsCpu.bend`
- `bend2/lib/graphics/v2/tests/third/NativePixelsOffload.bend`
- `bend2/lib/graphics/v2/tests/third/browser.mjs`
- `bend2/lib/graphics/v2/tests/third/core.mjs`
- `bend2/lib/graphics/v2/tests/third/glyph-layer.mjs`
- `bend2/lib/graphics/v2/tests/third/native-pixels.mjs`
- `bend2/lib/graphics/v2/tests/third/retained.mjs`
- `bend2/lib/graphics/v2/tests/third/vectors.mjs`
- `bend2/lib/graphics/v2/tests/third/worker-bad-identity.mjs`
- `bend2/lib/graphics/v2/tests/third/worker-bend.mjs`
- `bend2/lib/graphics/v2/tests/third/worker-task.mjs`
- `bend2/lib/graphics/v2/third/AtlasRegion.bend`
- `bend2/lib/graphics/v2/third/Blur.bend`
- `bend2/lib/graphics/v2/third/Brush.bend`
- `bend2/lib/graphics/v2/third/Effects.bend`
- `bend2/lib/graphics/v2/third/GlyphLayer.bend`
- `bend2/lib/graphics/v2/third/ImageShift.bend`
- `bend2/lib/graphics/v2/third/Paint.bend`
- `bend2/lib/graphics/v2/third/PathFill.bend`
- `bend2/lib/graphics/v2/third/PixelBuffer.bend`
- `bend2/lib/graphics/v2/third/Premul.bend`
- `bend2/lib/graphics/v2/third/PreparedSprite.bend`
- `bend2/lib/graphics/v2/third/README.md`
- `bend2/lib/graphics/v2/third/Raster.bend`
- `bend2/lib/graphics/v2/third/Retained.bend`
- `bend2/lib/graphics/v2/third/Shape.bend`
- `bend2/lib/graphics/v2/third/Surface.bend`
- `bend2/lib/graphics/v2/tools/browser_fixture.py`
- `bend2/lib/graphics/v2/tools/browser_third.py`
- `bend2/lib/graphics/v2/tools/build_third_demo.py`
- `bend2/lib/graphics/v2/tools/native_third.py`
- `bend2/lib/graphics/v2/tools/render_third_plate.py`
- `bend2/lib/graphics/v2/tools/verify_third.py`
- `review-third/API.md`
- `review-third/BACKENDS.md`
- `review-third/DESIGN.md`
- `review-third/DRAFT_CONTRACTS.md`
- `review-third/PERFORMANCE.md`
- `review-third/REPRODUCE.md`
- `review-third/demo/app.mjs`
- `review-third/demo/effects-plate.mjs`
- `review-third/demo/index.html`
- `review-third/demo/scene.mjs`
- `review-third/demo/serve.py`
- `review-third/demo/style.css`
- `review-third/demo/task.mjs`
- `verify_third_delivery.py`
