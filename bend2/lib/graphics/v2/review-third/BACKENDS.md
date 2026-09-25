# Portable execution design and next backend gates — DRAFT

## Implemented boundaries

The reference path is pure immutable Bend data and a genuinely sequential tile
kernel. Native `Paint.pool` and `Raster.pool` add bounded coarse forks over
**disjoint output regions**. They do not parallelize painter order, share mutation,
or place a fork around every pixel/command. `PixelBuffer` is preparation-owned
mutable array storage under Bend's ownership checks; it is frozen back to an Image
before publication. Full pixel comparison covers native serial, CPU parallel and
explicit-offload/CPU-fallback variants of one nontrivial fixture.

The browser path uses that same compiled Bend tile work in real CPU module workers.
An application task owns prepared assets and caches in each worker. Immutable
shape/brush commands retain application coordinates; each worker receives a tile
rectangle and small frame input and returns row-major straight RGBA bytes. The
pool owns bounded dispatch, current-generation publication, retries, failure
quarantine and last-good storage. Canvas presentation is a separate host adapter.
No shared-memory browser heap, WebGL/WebGPU shader or GPU command queue is hidden
inside this contract.

These are complementary implementations, not transparent interchangeable heaps.
The C runtime schedules language forks. The browser pool dispatches application
serial tile calls through message passing. Native memory/ownership, JavaScript
object costs and browser transfer/setup costs are measured separately. `forks=0n`
remains a useful serial baseline even in a worker task; adding an inner scheduler
inside every browser job risks oversubscription without benefit.

## Current evidence boundary

Source equality proves the stated Bend expressions, not compiler correctness or
device execution. The universal Paint scheduling witness is stronger than a
single scene fixture, but has no floating-point reassociation license. The native
fixture compared every output pixel at one and four workers. The explicit offload
fixture ran with `--gpu off`; it is CPU fallback evidence only. The browser test
runs real Chromium module workers, actual compiled Bend, transferable output and
Canvas2D readback. No GPU-device test was attempted or authorized implicitly by a
visual screenshot.

Pinned Bun 1.4.2 is still unavailable here. The unchanged compiler checkout is the
pinned commit and ran through Node's TypeScript stripping. Browser policy prevents
all URL navigation; the browser fixture rebases static import locations to data
URLs within about:blank. The normal HTTP server, CSP/module fetch behavior and
production hosting must still be validated on the user's environment. Do not
patch browser policy or pretend that this test covers deployment.

## Prioritized continuation, without hollow APIs

**First: reduce real preparation and transfer costs.** The 1024-square Aurora
cold frame remains about ten seconds in this environment; cached partial updates
are substantially cheaper but still well short of a guaranteed 60 Hz. Keep
immutable source topology separate from frame input, prewarm/cache static tiles,
bound each worker's cache, and use a smaller local extent for blur/effects. Measure
when prepared sprite keys churn, not only stable frames. A compact command/data
serialization format and selected buffer accessors can be justified by actual
profiles; no broad scene ABI is frozen here.

**Next: tile reuse and bounded scheduling.** Avoid rebuilding a full native render
plan when only a few stable IDs change. Consider persistent per-tile command
indices and a damage rectangle coalescing threshold. Profile the crossover against
full redraw, including plan maintenance and uploads. Keep current damage carry
semantics through cancellation and worker failure. A replacement worker policy
needs an explicit retry/init budget and tests for repeated crashes; none is
silently enabled now.

**Then: a real GPU lane.** Start with presentation and a narrow raster/blend kernel,
not an unproved general mesh scene graph. Use explicit device buffers and an
owned staging/upload boundary; decide whether canonical PMA bytes or a new
linear-light format is the authoritative input. For exact-byte kernels, compare
every pixel against the current oracle across alpha endpoints, clipping, winding
vertices, group overlap, border modes and arbitrary tile partitions. If native
F32 execution differs from a proposed shader, specify a new approximate contract
rather than adding exclusions to the old one. Record GPU model, driver, compiler,
backend, transfers, warmup, synchronized device time, wall time and failure paths.
CPU fallback must be surfaced distinctly from successful device work.

General meshes, perspective interpolation/depth, shaping/bidi, general fill-path
stroke joins, analytic or tolerance-driven curve flattening, full image codecs,
linear-light/HDR, texture-atlas packing and automatic widget policy are not part
of this checkpoint. Existing optional mesh direction remains a separate proposal,
not a dependency that blocks these 2D improvements.
