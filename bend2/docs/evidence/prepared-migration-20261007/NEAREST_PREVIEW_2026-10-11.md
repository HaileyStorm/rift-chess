# Higher-resolution pieces during camera rotation

The owner asked for sharper rotating graphics if responsiveness permits it;
settled graphics looked good except for the mismatched knights. The separate
atlas-knight change restores the matching artwork. This change draws that atlas
at 512 pixels with nearest sampling during camera rotation, over the existing
256-pixel ground. Selection feedback also uses 512 pixels. Settled pieces retain
their existing linear sampling and pixels.

The displayed alpha mask carries its sampling filter and raster size. Picking
uses the same nearest texel, pixel centre, placement, coverage, opacity and
painter order as the preview. Existing view/frame/offer and retirement checks
remain active. Linear picking entry points remain for their existing callers;
the superseded authored 256-pixel camera-piece/feedback exports are removed.
Procedural/native rendering, artwork, frozen laws and parallelism are unchanged.

Keep this as provisional local graphics progress, not performance acceptance.
The captured moving views show sharper piece contours and detail. Two orders of
one actual browser journey selected g1, moved the camera through three pointer
positions, released, selected b1 through the displayed preview mask, and waited
for settled refinement. Selection, history, revision and camera state matched
the atlas baseline. Initial and settled canvas pixels were identical; moving
pixels intentionally changed. The second order reused the same journey and
produced no duplicate screenshots. No unit/integration suite or scenario matrix
ran. Browser, server and original Job/process handles closed normally.

Local Chrome measurements used a 1280x800 viewport, device scale 1, fresh contexts
and local assets on Windows. Power/background load were not controlled. Times
below are request dispatch to canvas draw completion, not physical input-to-present:

| Order | Build | Startup ms | Three moving frames ms |
| --- | --- | ---: | --- |
| Baseline first | Baseline | 1144.5 | 198.0 / 160.2 / 90.9 |
| Baseline first | Candidate | 1281.6 | 213.4 / 79.9 / 66.0 |
| Candidate first | Candidate | 1355.7 | 169.9 / 182.9 / 90.9 |
| Candidate first | Baseline | 1291.7 | 152.0 / 90.5 / 85.1 |

The first order improved warm frames; the reverse order did not establish a
consistent latency benefit. The six candidate moving frames total 803.0 ms
versus 776.7 ms for the baseline. These finite samples do not meet the reviewed
30% interim performance criterion or establish p95, memory stability, continuous
motion/shimmer, physical-device suitability or owner WOW approval. Startup
variation and the slower reverse-order frame remain evidence, not discarded
outliers. Main-page heap snapshots do not establish Worker memory costs. Further
responsiveness and actual device/motion work remain part of the full sprint.

Fresh affected Scene and Controller source/type emissions passed. Exact current
31-source expansion draft proof inputs, compiler/runtime hashes and preloads
match the original closed `channel-flow` proof run; its zero-hole source CHECK
is reused. A later `sprite-axes` proof receipt belongs to a rejected sampler and
is not reused. No proof was rerun or weakened. Source CHECK is distinct from
kernel/BendTT acceptance and from a universal rendering/picking proof.

Candidate package build SHA256:
`fa63e1ca62aa9cc24838b859b1e0411d9293247b7883685d08bee3f0ac3aeac9`.
Baseline build SHA256:
`7e92a3e0af001903aa031306c55c2cebe824e85da9940b2d8e4ca52a8d3b83c9`.
Both preserve the same decoded artwork. Private evidence remains under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`:
`nearest-preview-source-r1.json`, `nearest-preview-proof-reuse-r1.json`,
`nearest-preview-emission-supervisor-r1/terminal.json`,
`nearest-preview-build-supervisor-r1/terminal.json`,
`nearest-preview-pair-supervisor-r1/terminal.json`,
`nearest-preview-pair-supervisor-r2/terminal.json`, both pair `result.json` files,
the three first-order moving screenshots and `nearest-preview-disposition-r1.json`.
Original bytes and failed metadata/claim attempts are retained for provenance.
This records a local source increment only; public upload, compiler adoption,
native acceptance and full sprint completion are not claimed.
