# Lazy board material classification, 2026-10-11

The production Worker profile identified `BoardScene.top_region` among rendering
costs. Previously every filled square-region computed all four bevel predicates
and traversed the tile material table, including regions that subsequently split.
The classifier now branches on the existing interior predicate first and looks up
a material only after selecting a whole interior or bevel face. Split regions
return directly. The old eager classification helper is replaced.

The four edge predicates, interior bounds, upper/right/lower/left priority,
square index, colors, outside and hole handling, inverse guard, geometry, picking
and four balanced recursive branches retain their meaning. Shared graphics
samplers, frozen Laws, compiler sources, accepted 2.0.27 pin and TypeScript app
are unchanged. This is an application optimization, not a formal equivalence proof.

The candidate passed whole-book source validation with zero holes and emitted
Scene JavaScript `ad579ee1583a3b7c3b63ca378b6b535eb66db6e0702f08882b1be1bc34d31293`.
The emitted JavaScript places table lookup inside the selected Fill branches and
bevel predicates inside the non-interior branch. The actual production browser
package is version `37da0ed0e070779fc0dd`, build manifest SHA256
`5141a383cefa6a12024334527621f3218dd1e70188019b15adc188b9181a6ac6`.
Its default BPG1 ground remains byte-identical (`ee87a10d51304eeadfe05a2c6fce8645768d4a250d6dbd502654bb95c46a1881`).

One actual portrait journey started the application, selected the visible g1
knight edge, right-dragged the board, held the orbit, then released into current
refinement. Portrait start, selection, held orbit and settled orbit PNGs all match
the previous `8ae9fbd` implementation byte for byte. The actual selected square,
camera change, refinement and error-free application observations passed. Original
Node/Chrome handles, output streams, loopback server and nonkill Job closed;
there was no forced cleanup or uncertain execution. No unit/integration tests,
new scenario matrix or repeated broad campaign was added.

The single instrumented held-frame tree observation was 250.2 ms, versus 243.2 ms
in the previous run. Sampled GC was 7.618 ms versus 60.784 ms, but sample duration,
idle time and unrelated runtime work also differ. These observations support no
stable or causal speedup claim. Retention is based on removing known unnecessary
work with unchanged finite rendered evidence; responsiveness, tails, memory and
physical-device acceptance remain open.

Exact original private receipts are retained under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`:
`lazy-material-emission-supervisor-r1/terminal.json`,
`lazy-material-build-supervisor-r1/terminal.json`,
`lazy-material-supervisor-r1/terminal.json`,
`lazy-material-journey-r1/result.json`, its `held-worker.cpuprofile`,
`lazy-material-comparison-r1.json` and `lazy-material-disposition-r1.json`.
They remain local. These are finite browser/source observations, not kernel,
Safe, BendTT, native/GPU/PCM, exhaustive-camera or version-adoption acceptance.
