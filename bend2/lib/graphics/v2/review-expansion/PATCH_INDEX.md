# Review order and patch map

The incremental patch is against the **previous delivered portable tree**, not
against upstream Bend or the initial game branch. Every prior delivery file is
unchanged; this pass is additive. The full ZIP carries old history plus the new
code, receipts and images.

## Review in six areas

| Area | Primary production files | Closest evidence |
|---|---|---|
| 1. Regions, scheduling and invalidation | `Rect`, `Clip`, `ClippedStamp`, `TileRaster`, `Damage`, `DrawList`, `RenderPlan` | `tests/expansion/batch.mjs`; inductive scheduling witness; prepared/immediate benchmark |
| 2. Filtered images and skins | `Gather`, `RgbaSample`, `Transform2D`, `RgbaAffine`, `NineSlice` | `sampling.mjs`, BigInt filter oracle, native final comparison |
| 3. Vector presentation | `Stroke`; command integration in `DrawList` | `stroke.mjs`, mixed-command native fixture, unfilled F32 candidate explicitly separate |
| 4. Text and application math | `TextLayout`, `TextHit`, `AtlasParagraph`, `Layout2D`, `Motion` | `text.mjs`, `utilities.mjs`, actual native-font example |
| 5. Prepared materials and coverage | `Ramp`, `Field`, `ColorFx`, `Coverage` | `materials.mjs`, `utilities.mjs`, material/skin visual |
| 6. Host and validation tools | `host/ImageBuffer.mjs`, `tools/actual_compiler.mjs`, native/negative/gate runners | `host.mjs`, 85 required gates, 24,576 native complete-pixel comparisons, two mutation controls |

All production Bend filenames in this table are relative to
`bend2/lib/graphics/v2/`. New source comments state domains and intentional
rounding/cost decisions. The DRAFT contract package is
`contracts/expansion/{LAWS,PROOF}.bend`; the two unfilled F32 meanings live in
`contracts/expansion/presentation/LAWS.bend`, not in the completed proof entrypoint.

## Patch contents and exclusions

`expansion-code.patch` includes all new library code, tests, tools, examples,
contracts, the top-level integrity verifier and review documentation. It retains
rejected implementation candidates as **text experiments**, not runtime imports.
Generated raw receipt streams, PNGs and font-provenance files are supplied in the
full tree rather than expanded into this code patch. There is no compiler patch,
old-core rewrite, source-generated native-font module or binary build artifact.

`receipts/packaging.json` records every patch payload path/hash, `git apply --check`
and an exact byte comparison after applying to a disposable previous tree.
`EXPANSION_MANIFEST.json` independently inventories the complete delivered tree.
Use `python verify_expansion_delivery.py --strict` after extraction. The manifest
is integrity evidence, not an externally signed authenticity certificate.

## New source inventory

This pass adds **22 production Bend modules** and **51 library code/test/tool files**, totalling **2,998 source lines**. Counts include tests, benchmarks and validation tooling, not just runtime code.

- `bend2/lib/graphics/v2/AtlasParagraph.bend`
- `bend2/lib/graphics/v2/Clip.bend`
- `bend2/lib/graphics/v2/ClippedStamp.bend`
- `bend2/lib/graphics/v2/ColorFx.bend`
- `bend2/lib/graphics/v2/Coverage.bend`
- `bend2/lib/graphics/v2/Damage.bend`
- `bend2/lib/graphics/v2/DrawList.bend`
- `bend2/lib/graphics/v2/Field.bend`
- `bend2/lib/graphics/v2/Gather.bend`
- `bend2/lib/graphics/v2/Layout2D.bend`
- `bend2/lib/graphics/v2/Motion.bend`
- `bend2/lib/graphics/v2/NineSlice.bend`
- `bend2/lib/graphics/v2/Ramp.bend`
- `bend2/lib/graphics/v2/Rect.bend`
- `bend2/lib/graphics/v2/RenderPlan.bend`
- `bend2/lib/graphics/v2/RgbaAffine.bend`
- `bend2/lib/graphics/v2/RgbaSample.bend`
- `bend2/lib/graphics/v2/Stroke.bend`
- `bend2/lib/graphics/v2/TextHit.bend`
- `bend2/lib/graphics/v2/TextLayout.bend`
- `bend2/lib/graphics/v2/TileRaster.bend`
- `bend2/lib/graphics/v2/Transform2D.bend`
- `bend2/lib/graphics/v2/bench/NativePlanCpu1.bend`
- `bend2/lib/graphics/v2/bench/NativePlanCpu2.bend`
- `bend2/lib/graphics/v2/bench/NativePlanCpu3.bend`
- `bend2/lib/graphics/v2/bench/NativePlanSerial.bend`
- `bend2/lib/graphics/v2/bench/NativePlanWork.bend`
- `bend2/lib/graphics/v2/bench/expansion.mjs`
- `bend2/lib/graphics/v2/bench/prepared-vs-immediate.mjs`
- `bend2/lib/graphics/v2/contracts/expansion/LAWS.bend`
- `bend2/lib/graphics/v2/contracts/expansion/PROOF.bend`
- `bend2/lib/graphics/v2/contracts/expansion/presentation/LAWS.bend`
- `bend2/lib/graphics/v2/examples/render-expansion.mjs`
- `bend2/lib/graphics/v2/host/ImageBuffer.mjs`
- `bend2/lib/graphics/v2/tests/expansion/NativePixels.bend`
- `bend2/lib/graphics/v2/tests/expansion/NativePixelsCpu.bend`
- `bend2/lib/graphics/v2/tests/expansion/NativePixelsOffload.bend`
- `bend2/lib/graphics/v2/tests/expansion/batch.mjs`
- `bend2/lib/graphics/v2/tests/expansion/host.mjs`
- `bend2/lib/graphics/v2/tests/expansion/materials.mjs`
- `bend2/lib/graphics/v2/tests/expansion/native-pixels.mjs`
- `bend2/lib/graphics/v2/tests/expansion/sampling.mjs`
- `bend2/lib/graphics/v2/tests/expansion/stroke.mjs`
- `bend2/lib/graphics/v2/tests/expansion/support.mjs`
- `bend2/lib/graphics/v2/tests/expansion/text.mjs`
- `bend2/lib/graphics/v2/tests/expansion/utilities.mjs`
- `bend2/lib/graphics/v2/tools/actual_compiler.mjs`
- `bend2/lib/graphics/v2/tools/native_expansion.py`
- `bend2/lib/graphics/v2/tools/negative_expansion.py`
- `bend2/lib/graphics/v2/tools/png.mjs`
- `bend2/lib/graphics/v2/tools/verify_expansion.py`
