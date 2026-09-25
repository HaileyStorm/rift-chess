# Reusable graphics expansion — review candidate

> Local relocation: this overview now lives inside the reusable graphics
> package with its API, evidence and DRAFT contracts. Historical packet paths
> below describe the Pro delivery. See [local integration](../INTEGRATION.md).

**Starting point:** the previous `graphics-v2-library-review-436313f9.zip`, itself based on the library-only checkpoint `436313f9c2bb68c29ce097a5e28e4dd2d9cabb0e` on `codex/visual-overhaul`. This ZIP is an additive library expansion, not a published game, compiler update or approved frozen specification. All 215 files from the previous portable delivery are preserved byte-for-byte. The old `REVIEW.md`, manifests, patch and receipts are historical; this document describes the new pass.

## What changed

This pass adds **22 production Bend modules**, one narrow JavaScript host adapter, real-compiler validation tools, independent finite references, native benchmarks, examples and a separate DRAFT contract package. It expands from individual drawing primitives into an optional prepared rendering path and reusable application building blocks. Existing production APIs are not replaced. No game identity, board geometry, camera restriction, widget hierarchy or application layout policy is embedded in the library.

The design record is [BRAINSTORM.md](BRAINSTORM.md). Four rounds cover the initial application inventory, consolidation around preparation/execution boundaries, prioritization by reuse and testability, and revision after measured results. The final table distinguishes implemented work, rejected optimization and deferred scope. The plan is not merely an unimplemented feature list.

| Area | Delivered capability | Important boundary |
|---|---|---|
| Ordered rendering | `DrawList`, `RenderPlan`, `Rect`, `Clip`, `ClippedStamp`, `TileRaster` | Painter order is preserved; only certified opaque fills prune earlier draws; tiling is opt-in |
| Incremental work | `Damage` and prepared tile reconstruction | Callers must supply conservative old/new damage; changed tiles restart from background |
| Alpha images | `RgbaSample`, `RgbaAffine`, `Transform2D`, `Gather` | Opt-in alpha-weighted bilinear filtering; finite F32 geometry; old nearest sampler unchanged |
| Reusable skins | `NineSlice` and prepared skin commands | Fixed-size corners, integer stretch, explicit rejection of too-small targets; no UI policy |
| Vector marks | `Stroke` and prepared stroke commands | Antialiased round capsules, disks and subdivided quadratic/cubic curves; no general path fill |
| Text and interaction | `TextLayout`, `TextHit`, `AtlasParagraph` | Wrapping, tabs, kerning inputs, truncation, caret affinity, selection geometry; no shaping or bidi |
| Application arithmetic | `Layout2D`, `Motion` | Exact-sum tracks/grid helpers, containment, easing and bounded fixed-step timing; caller owns clocks/layout |
| Texture preparation | `Ramp`, `Field`, `ColorFx`, `Coverage` | Validated ramps/LUTs, seeded periodic fields, encoded-color transforms and red-mask algebra |
| Host presentation | `host/ImageBuffer.mjs` | Reusable RGBA staging, clipped row fills and a Canvas adapter; real typed-array tests, mock Canvas only |

The previous pass's RGA2 alpha decoder, native glyph baker, explicit mip levels and mask preparation remain available and unchanged. These new modules build on them rather than invent a second incompatible asset format or change their existing contracts.

See [API.md](API.md) for signatures, domains, integration examples and failure behavior. Public image inputs are well-formed quadtree Data, not arbitrary untrusted objects. External assets should still cross the existing validated decoders.

## Performance: useful gains, not a blanket speed claim

There are two different results worth using. The first reduces work inside a filtered texture lookup. The second avoids redoing unchanged scene work. Their baselines and runtimes differ and must not be combined into one universal renderer number.

### Actual native CPU: shared source-tree traversal

A controlled 512² workload prepares 64 affine RGBA images and executes 16 render/checksum rounds per process. The before variant changes only the sampler back to four independent tree walks. The supplied unmodified compiler emits C; clang builds generic optimized native binaries. One warmup and five measured samples use alternating configuration order, four selected CPUs, and `--gpu off`.

| Configuration | Median seconds, complete process |
|---|---:|
| Four-walk sampler, one CPU worker | 1.424977 |
| Shared-prefix Gather, one CPU worker | 1.065833 |
| Gather with fork budget 3, four CPU workers | 0.688466 |

That is **25.20% lower serial wall time**, then **35.41% lower wall time with four workers**, or **2.07× overall** on this workload. Fork budgets 1 and 3 were nearly tied; this does not select a universally best fork budget. Measurements include startup, scene preparation, checksums and output. They are not isolated frame times or measurements on the user's workstation.

### Actual emitted JS: reuse versus full redraw

For 32 sprites on a 512² canvas, moving one unaligned sprite and rebuilding damaged tiles—including preparation of the new plan—was **11.89× faster for opaque sprites** and **12.42× for soft alpha** than the retained immediate full redraw. The benefit depends on small damage and reuse of the previous image.

The prepared **full** redraw was **7.61% slower** for opaque unaligned sprites and **3.85% slower** for soft-alpha unaligned sprites. The immediate path stays available. Whole-scene changes, overlapping draws and preparation costs can erase the reuse benefit. A separate uniform-mask dispatch experiment was rejected after a slowdown; its code and raw evidence are retained, and the old `MaskedStamp` implementation is unchanged.

[PERFORMANCE.md](PERFORMANCE.md) contains the complete tables, methodology, costs included/excluded, unsuccessful experiments and exact receipt locations. There is no GPU, Worker or browser upload speed claim.

## Validation actually performed

The newly supplied compiler is exactly the existing pin, **`d37909174ebd664338ae3194799a9e0899dedd51` (Bend 2.0.27)**. The compiler and runtime pin files were not changed. Bun 1.4.2 is absent; **Node v22.16.0 with experimental TypeScript stripping** invokes the unmodified upstream loader, checker, ownership checker and emitter. These results replace surrogate-only evidence for the checks actually rerun here, but they are not a claim that the pinned-Bun wrapper was executed.

The required suite finishes **85/85 gates**. Its manifest binds the checks to 155 source files; per-command stdout/stderr, compiler closure hashes and exit statuses are supplied. Original tests and old boundary exclusions remain unchanged. Highlights:

| Evidence | Recorded scope |
|---|---|
| Existing finite regressions | Core graphics, grain, texture pools, affine grain/texture, 65,540 MaskedStamp comparisons, RGA1/RGA2, prior extensions and grid8 |
| Ordered plans and damage | 1,669,620 exact pixels across 1,200 frames, plus endpoint checks |
| Filtered images and skins | 267,144 alpha-mix cases; 144,987 stretch-coordinate checks; 317,440 pixels |
| Text preparation | 2,004 flows; 16,000 caret and 16,000 selection checks; 786,432 existing-atlas parity pixels |
| Strokes | 131,072 exact pixels and 16 join-idempotence cases |
| Prepared material utilities | Independent integer ramp, LUT, periodic-noise and full-image references; 24,000 periodic translations |
| Native full pixels | 24,576 exact comparisons across serial, CPU-parallel and explicit-offload/CPU-fallback entrypoints |
| Host boundary | 2,796,320 byte comparisons, 200 clipped regions and two mock Canvas calls |
| Negative controls | Wrong alpha rounding and reversed painter order each trigger the unchanged test assertions |

The native full-pixel fixture is 64² and includes mixed transformed images, skins, clipped alpha sprites, curves and procedural materials. The larger native timing workload also checks its whole-frame checksum, but a checksum is not promoted to collision-free proof. Native F32 parity on these inputs is finite evidence, not an all-input/backend theorem.

Actual Python offline tests include the existing asset encoder tests and seven native-font/alpha pipeline tests with no font-test skips in the recorded run. Font provenance is retained, but font binaries and newly generated font modules are not packaged.

One initial broad scan also attempted the unchanged historical `grid8/tests/delta.ts` demo benchmark. Its Node loader worker exhausted heap in the 4-GiB container. The failed stream remains visible. It is optional behind `--historical-benchmarks`; no frozen source or correctness assertion was edited to turn it green.

See [EVIDENCE_INDEX.json](EVIDENCE_INDEX.json), raw [receipts](receipts/), and [REPRODUCE.md](REPRODUCE.md). The latter gives exact commands and environment requirements, including native builds, mutations and visual regeneration.

## DRAFT Laws and proofs

The source checker accepts **50 existing declarations** unchanged: 24 core graphics, 12 prior-review extensions, six RGA1 asset laws and eight grid8 laws. It additionally accepts **12 new declarations** in the separate expansion package. These include a general inductive scheduling refinement and source equalities/endpoints; several others are deliberately named closed regression witnesses. They do not prove every new subsystem's broader prose contract.

**Two new F32 candidates remain unfilled**: zero-radius stroke emptiness and identity-transform origin preservation. Their exact meanings and failed witnesses are retained. The checker does not normalize the relevant F32 intrinsics for the attempted proofs. Finite runtime tests do not substitute for these missing source witnesses, and no unsafe axiom or weaker replacement was introduced.

[DRAFT_PROPOSALS.md](DRAFT_PROPOSALS.md) states the additions in plain English, preserves old meanings, and maps each completed witness to its actual scope. Old Laws, proof files, boundary exclusions and historical evidence remain byte-for-byte intact.

## Visual artifacts

Five 1024² PNGs are generated by actual emitted Bend library modules, not by an image generator or a substitute host rasterizer:

- [Reusable workbench](visuals/01-reusable-workbench.png): chart strokes, reusable skins, text selection and materials.
- [Alpha and mips](visuals/02-alpha-and-mips.png): transformed filtering, overlap and explicit mip choices.
- [Materials and skins](visuals/03-materials-and-skins.png): periodic fields, ramps, fixed-corner panels and color transforms.
- [Text and native type](visuals/04-text-and-native-type.png): wrapping, caret/selection geometry, old atlas and native-resolution glyphs.
- [Damage reconstruction](visuals/05-damage-reconstruction.png): movement, retained pixels, full redraw reference and removal restoration.

The scenes deliberately own their visual layout outside the library. PNG encoding and host readback are separately timed. These are single captures, not frame-rate benchmarks or browser screenshots. Native-font provenance and the illustrative—not controlled same-font—comparison are explained in the [visual README](visuals/README.md).

## Known limits and recommended next checkpoint

This remains a **DRAFT review candidate**, not release approval. The most valuable next checkpoint is one real application's end-to-end input-to-present measurement and invalidation audit. Integrate the optional command/plan path without deleting the existing immediate path; measure plan preparation, damaged area, render, readback and upload separately. Preserve the exact finite and negative controls while profiling the unaligned full-redraw regression.

There is no executed GPU-device backend, JavaScript Worker transport or actual browser presentation test. An offload annotation and CPU fallback are not device support. Windows/macOS execution, multi-window lifetimes, browser accessibility and input dispatch remain host/application work. [BACKENDS.md](BACKENDS.md) defines the portable seams and the evidence needed before those claims.

Rendering uses opaque encoded-RGB framebuffers plus separate source coverage. There is no linear-light/HDR compositing. Text layout is metric-driven and scalar-indexed, not a shaping engine, grapheme segmenter, bidi implementation, font fallback stack or IME. Strokes are bounded subdivisions of round capsules, not arbitrary filled paths, joins/dashes or an SVG implementation. Prepared materials are color fields, not PBR shading. Blur/shadows, atlas packing/region sampling, tolerance-adaptive paths and meshes remain future work; no mesh API blocks this 2D checkpoint.

## Review and apply

[PATCH_INDEX.md](PATCH_INDEX.md) groups the additions into reviewable areas. `expansion-code.patch` applies to the previous delivery's portable root; it contains code, tests, tools, examples and review documentation, not generated receipt streams or images. The full tree includes those artifacts directly. The patch was dry-run checked, applied to a disposable baseline, and every patched payload byte compared to this tree; see the packaging receipt.

Run `python verify_expansion_delivery.py` after extraction to check `EXPANSION_MANIFEST.json`. The pinned compiler, generated C/binaries, `.git`, caches and temporary native-font modules are deliberately excluded. The provided source and commands regenerate them locally under ignored `.artifacts`.
