# Moving atlas picking — 2026-10-06

A click on detailed artwork now uses the motion pose that was displayed when
the host queued that click. Previously the Worker disabled atlas picking during
motion, leaving the procedural picker to interpret moving artwork. The immutable
presentation carries previous-board, captured-square, action and progress data.
`SpriteMotion.bend` supplies the existing renderer's placement and fade formulas
to both rendering and picking. The picker follows paint order, including dying
pieces that obscure earlier live pieces, and applies the actual opacity before
the sampler's coverage truncation. Settled picking retains its public entry point.
The Worker reuses the matching view's existing alpha mask during sprite motion;
offer lifetime and queued-presentation guards still apply.

The candidate remains **2.0.35, unadopted**. Accepted pristine 2.0.27, frozen
Laws, upstream compiler files, balanced rendering and the TypeScript application
are unchanged. The build is
`.artifacts/bend2/2035-preview/moving-atlas-picking-20261006/browser-zz5hDv`,
version `d57458e11c9f0db5b538`, build SHA256
`528f106dfa8c139eed05639f9cf17863d20a407667a98cb8c7f3e3c4a490d04e`.
Its metadata truthfully records parent `469815f`, dirty draft sources and
`adopted:false`; publication does not retag the tested package.

Receipts below are under that private experiment's parent directory. These are
finite, emitted-runtime and real Chrome checks, not mathematical proofs or
native CPU/GPU/GUI/PCM acceptance.

| Check | Actual result | Terminal SHA256 |
| --- | --- | --- |
| Current scene whole-book check and selected emission | PASS | `3fbbd3a34f46c28bd8597cf6333e7b850eb3b47b0a6920560be1731175a7c9d7` |
| Current controller whole-book check and selected emission | PASS | `e0a70ccc45d62d16978732ab386fe2891aae049ac839573c2eea4ecb565cc1bd` |
| Integrated current browser build | PASS | `e02fff5761864bb12115c336ef3722d8937f3ed28664c16edf6720d8e80da0f4` |
| Candidate independent raster checks | PASS | `ad9ba3619ccbef7acbda813770ddf64b9246377c998d9c6989031a4910663aa7` |
| Accepted 2.0.27 raster compatibility | PASS | `ff3b4f21283dd1a45733566323634edf15d17e17beaeac3a9e817cf1de8948e7` |
| Retained baseline versus current full/clipped RGBA | PASS; 45 pairs, 11,796,480 pixels | `05a2182fa67cc1a46a7eb796cc5ab2cdd842ee3e0e8dadb19ad4ea38c10cbbaa` |
| Unchanged-bundle natural Chrome witness | PASS; three moves, mask retirement, orbit round trip | `1b6817ac4ee32e6971be067befe00bd22e4840b618525e4e37932f5dde725f91` |
| Controlled queued clicks, scale 1 | PASS, with helper-input inventory limitation below | `ae1ecc9baf10d132e723e23b2d064d83a2d587665399d74cf7bac4c4b7e68517` |
| Controlled queued clicks, scale 2 | PASS | `0407880c7463864d4df609b62f3a6446cf44f1acc7b27f8c525b55859d0540e9` |
| Current Chrome TypeScript-reference selection and Shift | PASS; two scenarios, 39 checks, zero defects | `19f08efbbbc8176d00ca57cd9368ae591f6716e7658d53f131550d56cbe801eb` |
| Paired settled Chrome canvas PNGs | PASS; initial, e2–e4 and Front byte-identical | `9c9ead02b0c1f08d96bcd3fda1f8da1da92a3538e07b3910107631753115f8b8` |

Service-worker install/reload and e2–e4 play offline passed, with identical online
and offline initial PNGs. That subgate finished inside a combined run whose
later parity step failed with `RangeError: Array buffer allocation failed`.
The failed aggregate retains actual native closure and unchanged inputs; it is
not a successful aggregate receipt. `offline-partial-reconciliation-r3.json`
SHA256 `25eb1e575c2e25b06a425271300192044de402f369dd94345f8ed23613315ff3`
binds the logged successful subgate to that failed terminal and result. The
offline gate was not rerun after this failure.

The successful paired-image check uses the unchanged canonical assertions and
one explicit completion-predicate adapter: where the current presentation has
a pose, require progress 16 before the moved screenshot. The retained baseline
has no pose field and keeps its previous atlas-eligibility condition. Current
atlas eligibility alone no longer means motion is complete. The allocation
failure's precise cause is not established by the subsequent pass.

Both compiler raster runs cover 27,952 settled pixels, 1,280 fade pixels and
157,324 motion comparisons. Distinct controls include 117 moving-support
witnesses, seven dying pieces occluding painted earlier live layers, two pixels
that become clear specifically through fading, transparent pixels, feet, holes,
overlap and alpha-1 coverage. Fixtures cover ordinary move, capture, en passant,
promotion and castling at progress 0/1/7/8/15/16. The independent white-on-black
renderer establishes painted support; shared placement alone does not establish
preservation of the old formulas. The separate baseline RGBA check covers five
real committed controller fixtures and three detailed grounds at boundary phases
0/7/8/15/16, with exact full/clipped equality and transfer-detachment controls.

The queued-click witnesses append a private readback observer to the original
Worker bytes. It invokes the original Bend dispatch and attaches its actual
snapshot to an existing reply; it does not substitute a picker result or add an
acknowledgement. At board point `(301,344)`, a queued presentation with progress
0 is processed at current progress 8 and selects Pawn e4 (square 28). A click
captured at progress 8 at the same point selects empty e2 (square 12). Both use
mask 1, distinct offers and one helper refinement before/after. The harness uses
controlled delays and Tick duration normalization: mixed batches use 1 ms; held
releases use 1/120/240 ms. This establishes historical-pose hover/focus, not legal
next-move staging during animation. Opaque/clear support is from isolated Node
rendering; Chrome canvas pixel colors are not asserted by this queue check.

Scale 2 uses three explicitly synthetic QualityProbe telemetry windows to select
the actual quality-policy, nearest2 and coordinate-conversion path. It establishes
functional behavior at that scale, not natural telemetry or physical capacity.
Its expectation modules and manifests are verified against their emission
receipts before import and included in the supervisor's before/after inventory.
The scale-1 receipt omitted those expectation files from its historical inventory;
their emission receipts and later readback corroborate retained bytes but cannot
retroactively supply a missing before measurement. Keep that limitation with R2.
The separate natural witness uses the unchanged browser bundle.

Successful supervisors observed the same retained child exit, closed its handle,
verified that the qualified Job contained only the supervisor, closed the Job and
checked unchanged monitored inputs before parsing results. Strict TypeScript
checking passed. Independent source/evidence review found no product defect or
picker-result substitution and accepted the scope above.

Failed preparation/runs remain retained: missing private launcher before compiler
contact; candidate checker rejection of a forward helper; adapter namespace
wiring; obsolete Knight test placement; queue R1's mixed-batch wait; reference
R1's comment encoding mismatch before Chrome launch. The latter was corrected
with explicit UTF-8 source reads. Offline R2 passed its subgate before a JavaScript
path setup error; R3 passed that subgate before the allocation failure described
above. No failed or intermediate aggregate receipt is promoted
to current acceptance.

Stable latency/tails, first-playable time, memory and constrained physical devices,
owner visual acceptance, current native targets, BendTT/kernel, original GPU
250 ms criterion and reviewed toolchain adoption remain part of the full sprint.
