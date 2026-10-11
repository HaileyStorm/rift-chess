# Prepared orbit artwork

Preview textures now carry twelve small alpha-support boxes prepared once from
those exact immutable textures. Repeated piece placements reuse the boxes through
the existing Linear sampler, margins, coverage and invalid-input fallback.
The 64-pixel knight textures and 256-pixel preview raster are unchanged.
Settled callers retain the original drawing API.

The worker retains occupancy-only preview artwork and repaints feedback on each
frame. Bend compares view, current and previous board/hole placement, theme,
action, clamped progress and derived capture victim. The victim comparison covers
previous en-passant fields omitted by board equality. Each preview owns its exact
pieces/supports; changing the underlay also invalidates its artwork. Settled pose,
ground, helper replacement and bounded mask ownership remain separate.

One completed real browser journey observed startup, right-drag from yaw 345 /
pitch 67 to yaw 314 / pitch 70 at zoom 115, release, a trusted click at logical
(663,346) on the visible g1 knight edge, and settled replacement. It selected
White Knight g1 using preview mask 2, then accepted helper mask 3 at the same view.
Initial, held and settled PNG bytes exactly match the prior c19113c journey.
The root inspected the current held and settled screenshots.

The held tree took 89.1 ms: pose 34.1 ms, support 3.2 ms, artwork 50.2 ms.
Release and selection reused the artwork (previewPaint 0); their tree times were
3.4 ms and 4.2 ms, with 0.5 ms and 0.8 ms feedback paint. The real primary press reached
its selection canvas in 30.9 ms. Earlier c19113c observations were 233.5 ms held
and 165.4 ms primary selection. These are individual observations on separate runs,
with a manual screenshot-inspection pause; they are not a controlled causal
benchmark or acceptance of continuous dragging, tails, devices or memory use.
No timing gate or component/scenario matrix was added.

Fresh exact-source Scene and Controller books passed with zero holes, and their
pure JS emissions passed source fences. The narrow worker/helper/pose-port TS
check passed. The 4,988,856-byte package reused unchanged Menu, BPG1, bot, assets
and host logic. Frozen laws, proof obligations, compiler pin and runtime
parallelism were untouched. Kernel/native/device/GPU/adoption acceptance remains open.

The first source check rejected an optional Supports annotation; its original
process closed and its failed receipt was retained before correction. The first
browser attempt built the package but failed Node fetch before any server request.
All original handles/streams/Job closed; a fresh attempt with local network access
reused that exact package without rebuilding. Final Scene Bun 26304, Controller
Bun 38824, package Bun 37196, browser Node 39660 and Chrome 39604 exited 0 with retained
original handles. Streams reached EOF, inputs stayed unchanged, the server closed,
and all recorded supervised Jobs closed with known ownership. No forced cleanup ran.
These receipts do not resolve older unknown executions.

Private original evidence under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`:

- emission: `prepared-orbit-emission-supervisor-r2/terminal.json` / `127109094c12d6bf8247b5cff6c7824c115d6f26251036276a9b612e25e8a3fa`.
- scene: `prepared-orbit-scene-emission-r2/scene.mjs` / `02b881b30ceaff5a615015f489ba039bc420b82a2021d785f3aa99e54016e1bd`.
- controller: `prepared-orbit-controller-emission-r2/controller.mjs` / `c47f84c8eb3032700bc2fadb7e30a754f59d9d6490000f73366b06c29361f8f2`.
- package: `prepared-orbit-host-r1/build.json` / `2f4d3cfcf836e7b2d4255f5521097d1a27849c01618e55fb5db40f637496a0c8`.
- journey: `prepared-orbit-journey-r2/result.json` / `fe7a0c881ac18c5f2a260f0dfd46f3bd46ac286a71215ff5b4c7c8de2c036ce3`.
- browserClosure: `prepared-orbit-supervisor-r2/terminal.json` / `95180c08ff8a32d4da36eba6120ba35396e7fcc8b015628ee43deb04595e66d5`.
- failedTypeCheck: `prepared-orbit-emission-supervisor-r1/terminal.json` / `af556a26e89346e4fa9a18c96e7db1a193a8389ff304a26fc44675e7f9cf4f38`.
- failedLoopback: `prepared-orbit-supervisor-r1/terminal.json` / `022d86410df6bb279f9d84f46979991eceff40a20dc9ed50c865270daf704bf9`.

Source memory disposition: reasoned skip. These are transient implementation and
finite execution observations, with no new durable user correction or policy.
The canonical strict test-value policy and existing historical memory checkpoint
remain applicable. Git and the private disposition preserve exact source and
failed/successful evidence limits. The full nine-group sprint Goal remains open.
