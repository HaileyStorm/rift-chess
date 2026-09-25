# Performance — actual compiler, explicit scope (DRAFT)

Final results below supersede exploratory timing estimates for this source closure. Raw samples, exact source/C/binary hashes and commands are retained; no performance threshold was used to hide a regression. These measurements are from the execution container, **not Hailey’s workstation or GPU**.

## Native CPU: shared source traversal and bounded scheduling

The workload prepares 64 affine-mapped, linearly filtered RGBA images on a 512² canvas, then executes 16 render/whole-image-checksum rounds. The two sampler variants differ only in `RgbaSample.bend`; the before file is retained under `experiments/`. Inputs, command geometry, plan, compiler and build flags are otherwise held constant. The source colors come from a prebuilt 32² procedural texture, with constant source alpha 200 and command opacity 220.

Host: AMD EPYC 9V74 80-Core Processor; clang version 17.0.0 (https://github.com/swiftlang/llvm-project.git 10999b6d034fe318f3d56c83bddb6572593a8bb0); four selected CPUs; cgroup quota `400000 100000`; memory limit `4294967296` bytes. `--gpu off`, no fast-math or architecture-specific compiler flags. These CPU/model strings identify the benchmark environment, not a general hardware requirement.

| Configuration | Threads | Median wall seconds / complete process |
|---|---:|---:|
| Four independent root walks, serial | 1 | 1.424977 |
| Shared-prefix Gather, serial | 1 | 1.065833 |
| Gather, fork budget 1 | 1 | 1.074145 |
| Gather, fork budget 1 | 4 | 0.693150 |
| Gather, fork budget 2 | 4 | 0.719524 |
| Gather, fork budget 3 | 4 | 0.688466 |

On this workload, Gather lowers the serial median by **25.20%**. Fork budget 3 with four workers lowers it another **35.41%**, or **2.07×** overall relative to the original four-walk implementation. Fork budgets 1 and 3 are close; this small sample does not establish that budget 3 is generally preferable. A low fork budget is a sensible first candidate to measure, not a library-wide default.

Method: one warmup and five samples per configuration; measured order rotates/reverses across rounds. Wall time includes process startup, preparation, all 16 render/checksum rounds and output. This is **not** isolated render-kernel timing or input-to-paint latency. The observed sublinear thread scaling has not been profiled into allocator, checksum, scheduler and useful-work components. No native memory-bandwidth or GPU utilization claim follows.

All warmup/measured checksums are `2162379048`. A checksum is not collision-free proof of frame identity. Separately, a 64² mixed-command fixture checks every pixel against emitted JS for serial, four-way CPU and explicit-offload/CPU-fallback entrypoints, each at one and four threads: **24,576 native pixel comparisons**. The fixture includes affine F32 mapping, alpha filtering, skins, clipped sprites, vector curves and integer procedural materials. This finite fixture is not an all-input F32/backend theorem.

Receipts: `receipts/native-final/summary.json` plus its per-build/output streams. The earlier `native-benchmark.json` used an earlier source closure and grouped measurement order; it remains historical, not the headline final result.

## Prepared versus retained immediate sprite API (emitted JS)

The retained immediate `MaskedStamp` source is unchanged from the previous delivered ZIP. Each case has 32 sprites, 64² sources, a 512² target, and one sprite moved by (13,4). A prepared plan has cuts=3 and forks=0. “Aligned grid” describes the starting pose; after movement one sprite is unaligned. Full-raster output equality is checked for all compared results.

| Case | Immediate full ms | Prepared full ms | Prepared damage ms | Prepare + damage ms | Plan preparation alone ms |
|---|---:|---:|---:|---:|---:|
| Opaque aligned grid, one moved | 3.594 | 2.859 | 2.725 | 2.789 | 0.761 |
| Opaque unaligned | 68.732 | 73.964 | 5.380 | 5.783 | 0.228 |
| Soft-alpha unaligned | 79.173 | 82.222 | 6.012 | 6.373 | 0.123 |

Seven samples after three warmups, rotating/reversing execution order. Source textures and command objects are prepared outside timing; target-tree allocation is included. “Prepare + damage” adds bin preparation, not source generation, font baking or application scene construction. Readback is reported separately in the JSON. Canvas upload is unmeasured.

**Full redraw is not a blanket win.** The unaligned opaque prepared full case is 7.61% slower than immediate drawing; soft-alpha is 3.85% slower. Conversely, prepare-plus-damage is 11.89× and 12.42× faster for those particular one-sprite changes. This is a conditional benefit from reusing unchanged work, not an intrinsic 12× faster blend operation.

If most tiles are damaged, most commands overlap, the scene changes wholesale, or preparation dominates a tiny frame, these gains can disappear. Keep immediate rendering available and benchmark the actual scene. The planner remains opt-in. Global order changes and background changes still require conservative damage.

There are 3,145,728 exact output-pixel comparisons in this API benchmark. The source hashes and every timing sample are in `receipts/prepared-api.json`. The rendering tests separately exercise random overlap, clipping, multiple partition/fork choices and removal.

## Rejected optimization and failed exploratory evidence

An automatic uniform-mask specialization was implemented and tested, then **removed from production after an actual-emitter slowdown**. `MaskedStamp.bend` was restored byte-for-byte to the previous delivery. The candidate source and patch remain under `experiments/`; the exploratory benchmark streams remain in `receipts/benchmark.*`.

The exploratory `opaque-aligned` pose generator used `% (size-63)`, so its row label was wrong. Do not use those rows as alignment evidence. Other rows did demonstrate regressions and were enough to reject enabling the specialization. The final prepared-API benchmark fixes the placement issue and explicitly identifies the moved sprite. The earlier surrogate-only 35% regression is not converted into a native claim or declared solved by these unrelated numbers.

The initial broad scan of historical files also ran the unchanged `grid8/tests/delta.ts` benchmark. Its loader worker ran out of heap in the 4-GiB container. The original failed stream remains in `receipts/final-gates/`; no timing is fabricated. It is an optional historical demo benchmark, not one of the new correctness tests. Required checks now leave it behind an explicit flag. No frozen grid8 source or test assertions were edited.

## Preparation and host costs

`Ramp`/`Field`, mips, mask compaction, native glyph baking and text flow are explicit preparation work. Their outputs are immutable Data. A GPU path must account for flattening, transfer, upload and cache lifetime; the pure source signature alone does not make those costs disappear.

The five visual specimens measure construction, typed-array readback and PNG encoding separately. They are single captures, and example construction includes material/scene setup. They are not steady-state performance tests. `ImageBuffer` uses uniform-node row fills and reusable staging memory, but actual Canvas/device presentation has only a mocked contract test in this environment.

## Next profiling decisions

First measure one real app’s input-to-present path and damaged-area distribution. Separate scene preparation, rendering, readback and display upload. Test cuts=2/3 and low native fork budgets with both sparse and overlapping commands. Prefer reducing unnecessary redraws before making every tiny kernel parallel. Then investigate allocation/cursor costs in unaligned full redraws with exact pixel controls. Do not deploy a GPU or Worker backend without the same full-pixel fixture, failure/lifetime tests and end-to-end transfer measurements.
