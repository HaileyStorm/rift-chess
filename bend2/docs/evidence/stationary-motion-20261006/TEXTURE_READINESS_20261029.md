# Canvas texture readiness, 29 October 2026

The browser prepares Canvas textures from the exact accepted stationary helper
pose before offering its authored refinement. The first orbit reuses those
textures. Preparation remains optional: failure preserves the authored painter
and the existing on-demand Canvas fallback. Held-orbit acceptance keeps its
existing path. Geometry, picking, quality tiers, rules and native inputs did not
change.

Ordinary frame replies now report Worker callback arrival, serialized handler
start and the boundary immediately before `postMessage`, with that Worker's
`performance.timeOrigin`. Refinements carry no request timing. Response cloning
and delivery occur after the publication boundary; existing timing fields keep
their meanings.

One actual Windows Chrome 156.0.8078.79 journey used the unchanged 96 trusted,
joined mouse moves over 192 CSS pixels at 1280×800, DPR 1. No tier was forced.
The first motion frame reused all textures and took 27.1 ms from input to draw;
preparation cost 5.2 ms before the initial detailed view. The previous package's
first frame took 289 ms with texture conversion inside it. These uncontrolled
sequential observations do not establish a stable improvement magnitude.

The new run delivered 94 fresh frames and 76 changed-view sequence frames.
Changed-view cadence was 93.5 ms at p95; input-to-draw was 75 ms. The 33.3 ms
motion target remains unestablished, and higher resolution remains disabled.
The largest 803.9 ms input-to-draw interval included 797.8 ms between the event
timestamp and its passive callback. Its Worker queue span was 0.2 ms and handler
span 4.5 ms. This locates that delay before the callback without identifying a
browser, OS, automation or load cause. No input-queue policy change follows.

Initial, held and settled PNGs exactly match the previous package at the same
views. There were no runtime errors, failed requests or Canvas fallbacks. The
original Node/Chrome episode exited zero; streams, handles, server and Job closed.
No compiler, native device, GPU or proof acceptance was added.

Retained private originals under `canvas-texture-ready-20261029-r1`:

- Package: `59d27de5178eaea2d698be2cdd5b5caaabb70f29e03552420c39657b539a9cd8`.
- Closure: `6f44fb1dbd39950e2d3b089f4f421e1fcea8ebf8e7bd1637f2ba7b7ae35d0d90`.
- Owning review: `8ccd47b5ff33403000e7b79dfa661b33f5506b273e8c3f14d525897c8162f030`.

The package remains a local candidate. Prior receipts retain their original
source and scope; this journey does not replace broader functional, native or
production-adoption evidence. No unchanged timing rerun is required.
