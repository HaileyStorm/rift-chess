# Nearest atlas coordinate reuse

Moving nearest-filter atlas composition now prepares exact texel coordinates
once per diagonal axis and reuses them through the clipped image tree. It keeps
the original transform arithmetic, coverage, alpha, opacity, painter order and
target subdivision. Unsupported transforms use the original nearest path.
Settled linear rendering and the alpha picker remain unchanged.

The independent source review found no concrete semantic defect within the
existing image-coordinate/depth preconditions. Fresh affected expansion CHECK
passed with zero holes. The first Scene emission failed because Bend requires a
match before local bindings; moving the same prepare/clip expressions inside
each filter branch repaired that syntax. Fresh Scene and Controller CHECK and
emission then passed; Controller bytes matched the baseline. The original
successful proof unit was reused after verifying unchanged proof sources. The
failed first pipeline remains recorded as failed. This is source/type CHECK,
not kernel, BendTT or a universal renderer proof; frozen laws are unchanged.

The same actual knight selection, three-pointer-move rotation, release and
preview selection journey ran once per fresh context in both package orders.
All observed initial, moving, held and settled pixels matched, as did picking,
view, state and history. No browser errors or failed requests occurred. All
original process/browser/server handles and Jobs closed. No unit/integration
tests, new scenario matrix, screenshots or compiler copies were added.

| Order | Moving completion total, baseline / candidate ms | Preview paint total ms | Atlas pieces total ms |
| --- | ---: | ---: | ---: |
| Baseline first | 430.9 / 253.6 | 316.7 / 189.6 | 217.4 / 113.4 |
| Candidate first | 319.0 / 320.4 | 237.1 / 231.6 | 150.6 / 130.4 |

Across these six finite frames, request-to-canvas completion improved about
23%, preview paint24%, and atlas composition34%. The first order showed41%
completion improvement; reverse order was essentially flat. Neither startup
frame nor detailed startup worsened materially across these two observations,
but ordinary Windows load and startup variation were uncontrolled. Retain the
implementation as a limited local improvement, without claiming the interim30%
requirement, stable p95, physical presentation or constrained-device acceptance.
Native CPU/GUI/PCM/restart, originalGPU250ms, kernel and adoption remain open.

Private exact sources, rejected/preparation prefixes, proof reuse, result
packets and original terminal receipts remain under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`:
`nearest-axes-source-r2.json`, `nearest-axes-proof-reuse-r2.json`,
`nearest-axes-disposition-r1.json`, both `nearest-axes-pair-r*/result.json`,
and the five `nearest-axes-*-supervisor-r*/terminal.json` receipts.
