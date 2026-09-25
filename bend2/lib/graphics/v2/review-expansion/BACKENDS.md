# Portable execution boundaries — DRAFT

## The seam that exists now

A scene is prepared into immutable Bend Data: images, coverage trees, geometry,
ordered commands and spatial plan nodes. Application clocks, event routing,
cameras, selection policy and cache lifetime are outside this representation.
Rendering consumes a target/background Image and returns an Image. The only
mutable presentation code introduced here is `host/ImageBuffer.mjs`.

A sequential tile kernel prevents accidental renderer forks inside each leaf.
`RenderPlan` owns a separately bounded CPU fork budget. Binning depth and fork
budget have different roles and should not be tied together: the first selects
reuse/culling granularity; the second bounds eligible scheduling work. `forks=0`
means no hidden *renderer* forks under the plan, not that the compiler's runtime
or host process has no internal threads.

The root-only explicit offload entrypoint uses the existing compiler mechanism.
Its source equality is checked, and CPU fallback executes exact finite fixtures.
That does not establish GPU compilation, device execution, memory behavior or
speed. The compiler and toolchain pins remain unchanged.

## Evidence matrix

| Path | Evidence here | Not established |
|---|---|---|
| Emitted JavaScript under Node | Real loader/checker/emitter; independent finite references; API benchmark | Browser event loop, bundled app, Worker scheduling |
| Native CPU, one worker | Real generated C, clang build, complete fixture pixels and controlled timings | Other CPU/platform/compiler configurations |
| Native CPU, four workers | Complete fixture pixels, bounded plan forks and controlled timings | Arbitrary thread counts, general F32 identity, all-scene speedup |
| Explicit offload with GPU disabled | Source witness and complete CPU-fallback fixture pixels | Any GPU device/backend |
| RGBA staging buffer | Independent bytes, dirty-region and endian-safe writing tests | Device transfer cost or atomic handling of malformed Data |
| Canvas adapter | Initialization/dirty upload calls against a mock | Actual browser compatibility, display color/scale, GPU upload timing |
| Windows/macOS | Backend-neutral pure library design | Execution or packaging validation on those systems |

## Cost/lifetime model for application integration

Measure five boundaries separately: (1) asset/text/material preparation; (2)
command/plan preparation; (3) full or damaged rendering; (4) Image-to-byte staging;
(5) presentation/upload. The benchmark includes or excludes each explicitly.
Holding references to an old and a new immutable frame can keep both sets of
changed nodes live. Retain only the history the application needs; source sharing
does not make retained output free.

A 512² RGBA staging array alone is 1 MiB. At 1024² it is 4 MiB. That is only a
single byte buffer, not total renderer memory. Quadtree nodes, list bins, generated
runtime allocation, source assets, font data, old frames and Canvas/ImageData
storage add costs. A list-based binning scheme can duplicate command references
across tiles; larger cuts are not automatically better. This pass does not claim
a bounded peak-RSS or allocation rate.

Damage must include old and new footprints, opacity/material/clip changes,
removals, changed ordering and background changes. Repaint reconstructs touched
tiles from background/current commands; it does not repeatedly blend onto old
foreground. Use full damage when those dependencies are unclear. Reuse of a plan
is valid only while its source/geometry/order/clip inputs remain valid.

## Worker or GPU implementation acceptance gate

Do not serialize trees into workers for every frame without measuring the cost.
A future adapter should give prepared assets stable application-owned IDs, state
an explicit message/version format, distinguish clone from transfer, and define
ownership for returned buffers. Cancellation/stale results must not replace a
newer committed frame. Failed workers and device loss require a tested fallback
that preserves last-good output or performs an explicit full reconstruction.
These are proposed host requirements, **not an implemented protocol**.

A future GPU representation will likely need flattened or packed buffers rather
than host object graphs. It must preserve painter order, clipping, alpha rounding,
source indexing and explicit filter choices, with documented precision limits.
Test complete small frames before relying on checksums of large ones. If device
F32 sampling differs, keep that distinction explicit; do not widen old sampler
tie exclusions or change legacy contracts to obtain parity.

The first portability milestone is one native and one browser app exercising the
same mixed-command fixture, conservative movement/removal damage, cancellation,
asset lifetime and real upload. Only after end-to-end measurement should the
adapter choose CPU workers or device dispatch thresholds. None of these host
requirements needs a general 3D mesh API.
