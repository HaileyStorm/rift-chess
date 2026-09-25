# Performance, regressions and measurement scope

All numbers below were measured with the actual pinned compiler. They are not
predictions for Hailey's workstation, GPU measurements, isolated device timings,
or universal speed promises. Raw samples, code hashes and commands accompany this
document. Regressions and cold costs are included deliberately.

## Environment and boundaries

Native host: **AMD EPYC 9V74 80-Core Processor**, Linux container, **4-core CPU quota**,
**4 GiB memory limit**, Node v22.16.0, clang 17. Native timings use affinity to four
available CPUs. The pinned Bun 1.4.2 runtime was unavailable. Compiler commit is
`d37909174ebd664338ae3194799a9e0899dedd51`, tracked tree clean. Browser tests used
Chromium 144.0.7559.96, software/CPU paths only. No user GPU was exercised.

## 1. Stable legacy sprites: full redraw and cache misses

Actual emitted JS, 32 sprites, seven samples after two warmups, rotating/reversing
variant order. Exact full-image comparison covers **1,966,080 pixels** outside
measurement. Poses remain stable during cached redraw. Preparation fixes pose and
clip, not opacity/background. Separate prepare-only timing and cache-miss timing
are not expected to sum perfectly because they have different allocation/JIT/GC
contexts. Retain the raw samples rather than overinterpreting the fastest run.

| Canvas | Workload | Immediate (ms) | Cached redraw (ms) | Reprepare + redraw (ms) | Stable speedup |
|---|---|---:|---:|---:|---:|
| 256² | opaque-aligned | 0.882 | 0.189 | 0.877 | 4.67× |
| 256² | opaque-unaligned | 21.161 | 1.351 | 29.062 | 15.66× |
| 256² | soft-unaligned | 23.687 | 6.117 | 38.808 | 3.87× |
| 512² | opaque-aligned | 0.205 | 0.046 | 0.276 | 4.46× |
| 512² | opaque-unaligned | 86.990 | 3.472 | 118.991 | 25.05× |
| 512² | soft-unaligned | 110.986 | 17.678 | 154.570 | 6.28× |

**Important regression:** at 512², rebuilding every unaligned patch each frame
is **36.8% slower for opaque sprites** and **39.3% slower for soft-alpha sprites**
in this measurement. Use the old immediate path when keys churn unless an
application-specific amortization measurement justifies preparation. Stable
opaque aligned microsecond cases are noisy and are not a timing threshold.

| 512² workload | Prepare-only median (ms) | Unique input Image nodes | Unique prepared plane nodes |
|---|---:|---:|---:|
| opaque-aligned | 0.225 | 5,462 | 6,292 |
| opaque-unaligned | 117.033 | 5,462 | 115,776 |
| soft-unaligned | 111.476 | 7,386 | 99,960 |

Node counts use JavaScript object identity across the roots; they are **not**
byte estimates, peak RSS or native allocation counts. Prepared trees may share
nodes, but unaligned caches can still be much larger. The reported two-frame
amortization estimate is a simple model of those medians, not a cache policy or
a guarantee under changing poses/GC. Source and samples: `receipts/performance.json`.

## 2. Native cached full redraw, including preparation

32 soft-alpha unaligned sprites on a 512² canvas; **24 render/checksum rounds**
with varying background. Each complete process includes initialization, sprite
preparation, rendering, checksums and stdout. Five rotated samples after an
untimed process per variant. Checksums match across every benchmark run; complete
pixel fixtures are a separate gate, not a claim that checksum equality proves
all benchmark pixels. These are not per-frame latency or FPS values.

| Configuration | Whole-process median (s) | Speedup versus immediate |
|---|---:|---:|
| Immediate, 1 worker(s) | 0.221054 | 1.00× |
| CachedSerial, 1 worker(s) | 0.086181 | 2.57× |
| CachedCpu, 1 worker(s) | 0.088533 | 2.50× |
| CachedCpu, 4 worker(s) | 0.047246 | 4.68× |

The authoritative final rerun is `receipts/native-final/summary.json`.
The initial run in `receipts/native/summary.json` measured 0.237765 / 0.097661 /
0.095312 / 0.049074 seconds for the same ordered configurations. Both are retained;
the difference illustrates run-to-run noise rather than a second claimed change.

## 3. Balanced polygon traversal

The first third-pass constructor made a left-deep edge tree. Binary-carry
preparation now balances the same original coordinates without changing F32
crossings. A complete 256² grid is swept inside Bend, avoiding a host boundary
in timed per-point work. **196,608 individual points** are also compared between
variants outside timing. Five rotated samples, same convex contour at each size.
Inside-count checks are retained during each timed sweep.

| Edges | Old/new tree depth | Left-deep median (ms) | Balanced median (ms) | Speedup |
|---:|---:|---:|---:|---:|
| 64 | 64 / 7 | 94.768 | 28.381 | 3.34× |
| 256 | 256 / 9 | 432.114 | 24.934 | 17.33× |
| 1024 | 1024 / 11 | 1767.809 | 26.836 | 65.87× |

Final receipt: `receipts/path-performance-final.json`. The earlier measurement
`receipts/path-performance.json` gave 5.02× / 17.53× / 65.94× with a different warmup
context; it is retained, not substituted for the final rerun. The full independent
geometry suite passed unchanged after balancing. Neither balanced depth nor these
convex-contour results promises logarithmic query time or the same speedup on
arbitrary overlapping/self-intersecting paths. The original builder source is
in `experiments/PathFill-left-deep.bend.txt`.

## 4. Complete separable box-filter pipeline

Actual emitted JS, five samples per radius after warmup. Includes Surface → owned
Morton buffers → horizontal/vertical scan → immutable Surface, with allocations
and conversion. Running sums bound radius scaling; there was no older Blur API
for a historical production speed comparison.

| Surface | Radius 1 (ms) | Radius 8 (ms) | Radius 32 (ms) | Radius 128 (ms) |
|---|---:|---:|---:|---:|
| 64² | 10.531 | 11.210 | 13.944 | 19.425 |
| 128² | 40.199 | 41.832 | 45.570 | 58.883 |
| 256² | 176.132 | 186.672 | 187.072 | 206.502 |

**Whole-frame JS blur is still expensive.** Cache local effects; do not read
this as a 60 Hz full-screen bloom implementation. Border modes, after-each-axis
rounding, padding/extent and pass counts are explicit. Native blur pixels are
covered by the complete fixture, but native blur performance was not isolated.

## 5. Real browser showcase: cold versus partial work

Actual Chromium CPU module workers, 1024² output, 64² tiles, four workers.
The environment forbids URL navigation, so imports and task endpoints were
rebased into memory while executing unchanged library logic and real workers.
These are recorded integration samples, **not** a repeated statistically balanced
benchmark. `totalMs` begins after main-thread input validation/capture and dirty
union setup; it includes staged render/transfer/publication, not Canvas upload,
initial worker readiness, HTTP load, display scanout or rendering the DOM.

| Request | Tiles | Commit time (ms) | Canvas upload time (ms) |
|---|---:|---:|---:|
| aurora-cold | 256 | 10245.2 | 3.4 |
| aurora-dirty | 28 | 150.8 | 0.3 |
| aurora-dirty | 28 | 75.4 | 0.2 |
| aurora-dirty | 28 | 111.7 | 0.2 |
| topology-cold | 256 | 2375.3 | 1.2 |
| topology-dirty | 28 | 171.7 | 0.2 |
| instrument-cold | 256 | 4337.0 | 1.0 |
| instrument-dirty | 28 | 168.8 | 0.2 |

The slowest final cold scene took **10.245 s**, not the roughly 75–151 ms
of its cached dirty strip. The latter updates 28 of 256 tiles, transfers 458,752
bytes and uploads 114,688 pixels in two spans; a full frame transfers 4,194,304
bytes. Static tile caches are bounded to 128 entries per worker. Heavy scene
preparation and dynamic vector rasterization remain useful next targets.

The early prototype `receipts/browser-probe.json` recorded a 37.881 s cold Aurora
frame before path balancing. It is a profiling clue, not a controlled browser
A/B benchmark. Final browser sources and rebasing records are in
`receipts/browser/summary.json`. No fixed animation rate or HTTP/CSP deployment
performance is claimed.

## Evidence interpretation

Checked source witnesses, finite independent references, representation
differentials, complete native pixels, real browser protocols, visual inspection
and timing samples are different kinds of evidence. None is a substitute for the
others. No timing regression was “fixed” by altering a pixel oracle, tolerance,
law, proof proposition or compiler flag to weaken correctness. Historical proof
gaps and all original receipt files are preserved.
