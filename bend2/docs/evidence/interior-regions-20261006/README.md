# Skip redundant quad tests inside image regions

The draft RGBA renderer now propagates the existing conservative
`Facet.inside_pixels` result through its sequential quadtree traversal. Once a
cell is fully inside its prepared quad, its descendants need no further quad
exclusion or quarter-coverage tests. Every child still checks clipping, and
every surviving pixel retains the original center transform, bilinear sample,
alpha/opacity calculation, background paint and target-tree descent.

`Geometry`, `prepare`, `draw` and `excluded` retain their interfaces. Atlas
picking still calls the original `excluded`. The one-pixel inset and existing
finite prepared-geometry/screen domain remain unchanged. No compiler, frozen
law, normative dependency or runtime parallelism change accompanies this work.

## Evidence and package identity

Private records are retained under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`. The tested candidate
is `browser-8Fwx9D`, version `4a4f53bf35402f7d8bdd`, build SHA-256
`dc4488e95e45da66824d74244e43e89b209d0f8a8584f7dcc6e9e4e1a176c673`.
Its metadata records source revision `98d530b236edeaeac590d5a9f6fe93d0f640e0be`,
`sourceDirty: true`, draft and unadopted. Publication does not retag that package.
The compiler candidate is the independently checked 2.0.35 source; the accepted
2.0.27 pin remains unchanged.

| Check | Result and boundary |
| --- | --- |
| Private whole-book check/emission | PASS. Original `RgbaAffine` retained as the reference; no product interposition at this stage. |
| Independent finite renderer differential | All 66 existing `axis-clip.ts` inputs plus 22 quarter-boundary, faint-alpha, reversed-clip and 4096-domain cases matched every output pixel. Original emitted draw/region/leaf/exclusion/prepare bodies were checked against the retained scene. All 92,750 inherited-full leaves had original quarter coverage 4. Finite evidence, not a proof or cross-target verdict. |
| Fresh product emissions | Scene and controller both passed whole-book checking and exact selected emission. Both source closures changed; unchanged menu and Chrome caches were reused under their existing binding/registry checks. |
| Actual emitted product scene | 40 full-RGBA pairs matched: four views, five synthetic motion stages, 256/512px, 6,553,600 pixels. Actual generated-controller e2-e4 action/revision, identical source assets/poses and retained default-view ground used as the background. No runtime interposition. This does not qualify every view's ground or a naturally observed animation phase. |
| Exact draft browser build | PASS, 21.396s. Package and selected sources stayed equal before/after. |
| Installed Chrome canvas comparison | Default and low-pitch desktop views matched every fully refined canvas pixel against `browser-KAysrI`. Four actual captures, no page errors or external requests. Root inspected both candidate captures. |
| Installed Chrome picking | Four source-derived opaque Knight regions selected b1; the transparent frame corner rejected it. Raised hits distinguished atlas picking from board fallback. Same-Worker right-drag/refinement also passed. |
| Installed Chrome queued-mask race | PASS. A click retained the displayed A mask while B's real frame/refinement was queued; stale B refinement was discarded and the expected Knight selected. |

All successful supervised episodes observed the original child's exit, closed
its checked native handle, verified that the native Job contained only the
supervisor, closed that Job, and verified unchanged bound source bytes. No
process signaling or ambiguous resend occurred.

## Diagnostic cost

A separate private paired experiment substituted the checked trial's raw draw
function into a copy of the retained emitted scene. It preserved scene function
bodies and compared final full-RGBA pixels. One warmup and eight measured rounds
alternated original/candidate order on one committed e2-e4 frame at synthetic
progress 8/default camera.

| Occupancy-only composition | Original median | Trial median | Change |
| --- | ---: | ---: | ---: |
| 512px sprites | 88.904ms | 66.466ms | 25.24% lower |
| 256px sprites | 28.498ms | 24.663ms | 13.46% lower |

These are variable-load Node/V8 diagnostics. Ground construction, feedback,
pixel traversal/transfer, Worker scheduling, browser presentation and physical
display are excluded. Earlier unpaired originals were slower; those episodes
do not establish a stable regression baseline. This result does not establish
the 33.3ms motion budget, tail latency, memory neutrality or device acceptance.
The browser's motion path still uses proxies; full artwork continuity remains
open.

## Immutable record hashes

| Private record | SHA-256 |
| --- | --- |
| `region-emission-r2/manifest.json` | `56a74f1823e68e22b93b3d49b8f857fc0b363e9ec9ef9f4c0719ad6927e5f33f` |
| `region-differential-r2/result.json` | `9bab95da3e12d477ba91da6011128887e75dccd8ac47aa0ad33a86e9ab71dcc9` |
| `region-cost-r1/result.json` | `ab7a24b869b8d206c241d43b426a698a6cb316f3d1590527ac9f8a8344a374c9` |
| `product-interior-pixels-r1/result.json` | `b3a8d13b0f71eecaf348833ef5708ec209b152a18b01b0b5ce84371896c8e651` |
| `browser-interior-pairs-r1/result.json` | `1316542d4761b30d537e3c232510bf7140878ed7af5e0bb27f0805b665a46c5c` |
| `focused-interior-r1/result.json` | `c9b9ab5ca3e1dd3b90f438b684a5aab31f92af822d4d067916f305b0055cb175` |
| `browser-interior-race-supervisor-r1/terminal.json` | `c3b4c1175eb23163f9370cd069f19d77ea7c49fe9e708ecaf2afb021be63403c` |

The first private emitter rejected a legitimate quoted Base effect import
before compilation. A later differential stopped on an unqualified synthetic
Texture constructor before any pixel mismatch. Both actual failed episodes,
their checked closure/source records and corrected later episodes are retained.
The claim acquisition succeeded at the tool-selected `bend2/.working`; the
launcher's initial root-sentinel readback assertion failed, and the exact
receipt was verified without repeating acquisition.

The original traversal is removed from active product code and retained in
named pre-change source/emitted references for differential provenance.
Private probes add no active product gate or public registry entry. Full
[sprint](../../../SPRINT.md) and [review](../../REVIEW_2026-10-05.md) acceptance,
including proof/native/GPU and owner visual requirements, remains open.
