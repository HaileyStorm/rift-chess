# Orbit-wall classification culling

The current Chrome worker diagnostic separated the slow active-orbit Bend
scene-construction phase from `PixelPort.render`. Its uncapped CPU profile
sampled Quad/Facet geometry heavily, while garbage collection was present
but not the dominant sampled category. The exact clean predecessor build
`e788562833af84fd6840` has `build.json` SHA-256
`85c194ad428b32874e978bd1389fb3e69c67dc3377a72aa8f273e76f22287996`.
The new `browser-v2-worker-heap.mjs` uses a real right-button drag and queries
the Bend scene worker's between-frame V8 heap through Chrome DevTools. Its
128-MiB flag constrains V8 old generation, **not** physical RAM or total
browser/GPU memory; sampling and optional CPU profiling can perturb latency.

`MotionWall.child_cell` now returns an excluded cell before the eager affine
board classification and inside-quad test when a conservative wall-bound test
already excludes that quadtree cell. For intersecting cells, the same inverse,
mask, coordinate conversion, palette and wall Fill/Skip/Split behavior remain;
Skip still draws a wall, and Fill still preserves the present top. This is a
game-specific orbit renderer edit, not a change to frozen laws, parallelism,
the accepted Front 65°/default 67° views, or the published TypeScript app.
An independent source review found no output-contract counterexample; the
checker and runtime tests below are separate evidence.

Before the edit, `browser-v2-motion-extent.mjs` hashed the 30 complete composed
frames (five views including Front 65°, three layouts, two themes; 152,043,520
compared bytes) to
`181009caa54d7a2f42afaad2c9fcde98703ba930fb8df98552f54626477be528`.
After source-bound selected-scene emission, the aggregate hash was identical
and the compact versus explicit expansion equality passed. The four complete
256×256 orbit hashes from `browser-v2-motion-phases.mjs` also remained the
same. `MotionWall.bend --check-only` reported `All terms check.` The
`BEND_MOTION_SWEEP=1` BoardEdgesTest passed its 288-view wall/top sweep with
zero sampled spills, plus 160 variants and 27,260 absolute top centers.
These are finite JS/browser-side and checker checks, not a universal F32 or
native/GPU pixel proof.

Two adjacent Chrome ABBA comparisons each sent 17 dirty PointerMove frames
per build against the same local baseline and a source-dirty candidate,
sampling worker heap between frames. At the 128-MiB V8 flag, the scene P90
values in run order were baseline 108.3, candidate 71.6, candidate 60.0,
baseline 75.3 ms. Without that flag they were baseline 40.7, candidate 56.2,
candidate 64.5, baseline 126.2 ms. The uncapped order is mixed, and these
small, host-load-sensitive samples do not establish a portable speedup or
constrained-device acceptance. All eight runs had zero page errors. The
candidate draft `988f939eebec9643895c` was served with `build.json` SHA-256
`66285b0f74ed6f15c1a45c786ee8a6883fee52532b4f03e9970dc069a7bbedaf`.

The exact draft build's uninterrupted real-Chrome playtest matrix passed
24 scenarios, 685 checks, zero defects, including camera, Shift, menus,
promotion, bot, persistence, audio and offline cases. Its ignored summary is
`.artifacts/bend2/playtest-stage2/motion-wall-cull-draft-20260929/summary.json`,
SHA-256 `ce49646da1245833ce3a6ab2ff164ba52ced593afc79aa3712e71b365718cfde`.
The unchanged TypeScript application passed 62 tests and its production build;
graphics-v1 and semantic-v2 freezes and the library-v2 verification passed.

Clean source commit `fc11252d09400f52e9b1d33a44d3689b6850f153` records
`MotionWall.bend` SHA-256
`4bb29afc2824f3583c2c402afd2fe8d038ae06d5bc42bef2f4ae579408b8a1cc`.
Its non-draft local build is `e2ced02d5cf5cb05a332`, with `build.json`
SHA-256 `3a072e4d990a33e58272ed09fdcfd3a8980bb037969c303b98b42a74a450214c`.
Its separately executed, uninterrupted clean-build real-Chrome matrix passed
24 scenarios and 685 checks with zero defects, with served-manifest byte
binding. The ignored summary is
`.artifacts/bend2/playtest-stage2/motion-wall-cull-clean-fc11252-20260929/summary.json`,
SHA-256 `6c13d0e418ec192dafe8495058769803fa62806c96990a203caef79153328981`.
Do not promote these local browser and diagnostic P90 results into native,
GPU, constrained-device, hosted release, physical audio or owner visual
acceptance. The changed `MotionWall.bend` remains in the NativeV2 source
closure; previous Linux CPU/GUI/PCM/restart evidence is not a new-source
native verdict.
