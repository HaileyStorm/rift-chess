# Sculpted Knight integration — 2026-10-06

The settled Knight now uses a closed 118-face horse, dark eye components and a
brass base. The renderer chooses the winning face at each of four quarter-pixel
samples before averaging occupied RGB samples and deriving alpha. This removes
the diagonal transparency seams seen when triangulated faces were independently
blended. Black is represented as occupied color rather than an empty sample.
Conservative clipping retains balanced immutable four-way image construction.
Centroid painter sorting remains approximate; this is not a depth buffer.

The public frame and texture interface are preserved. Rendering and atlas picking
use the same mask. Superseded Facet painting, lighting and straight-alpha helpers
were removed. Scene and controller selections were regenerated through the local
wrapper; pristine accepted 2.0.27, the isolated 2.0.35 compiler and frozen Laws were
not changed. The TypeScript application is unchanged.

## Evidence

All paths below are relative to `.artifacts/bend2/2035-preview/`. Ignored receipts
are retained locally; this document does not imply those bytes are Git-published.

| Check | Result and retained evidence |
| --- | --- |
| Geometry | `knight-sculpted-triangles-20261006`: finite 242-camera audit, directed edge incidence and identical vertex set passed. Triangulation removed the bowed quad failures. This is finite evidence, not a geometric proof. |
| Compositor | `knight-sculpted-samples-20261006/mask-audit-r1/result.json`: independent unfiltered barycentric reference, 60 textures / 1,313,872 quarter samples / 59,694 full pixels, zero mask/RGB differences. SHA256 `cbfa5f1032f7fd5276eae677ef42d2ac30fd4b716367d60a3a4951b998089289`. |
| Current-source scene/controller | `knight-sculpted-integration-20261006/emissions-r2/{scene,controller}/terminal.json`: whole-book check/emission passed, observed exit0, exited native handle and owned Job closed, source unchanged during execution, network calls0. Scene terminal SHA256 `483d9f0d379e694b1708803e15420edddc079197314b17f761ddad6880440e93`; controller `2077a1a68c72bf0c9622e575bac846232f8e7be69ba3971a3e3f3eeb6f547455`. |
| Browser package | `knight-sculpted-integration-20261006/browser-HO80lZ/build.json`, SHA256 `3b0be0856b97ac020e79e6d591c8889a7382f1ffa219d22b079bb65a7107dae7`; build terminal `e57ee5352c45a6711e613eb67d87820c31a630e1b9f6b22d9631c4a2dd429931`. Truthfully built at source revision `6fa493a81610bf0a72ce15d37774d591b6a0fd0b` with `sourceDirty:true`, draft/unadopted. A later source commit does not retag this package. |
| Actual browser appearance | `knight-sculpted-integration-20261006/visual-r1/result.json`, SHA256 `110cdb2284a27a231ffe5c5457ef626447cc544f3269c5e42ec685e72e6e46e6`: four settled Chrome captures, desktop Warm345/67,345/35,90/35 and portrait Astral345/67, zoom115. Both colors visible; exact refinement/view, persisted preferences, atlas-ready state, no external requests or browser errors passed. Root viewed all four. This receipt binds the prior comment-only source binding; regenerated scene/controller JS are byte-identical. |
| Queued picking race | `knight-sculpted-integration-20261006/atlas-race-supervisor-r1/terminal.json`, SHA256 `c741418edde97b044c1999c542a183213eba341bfa518b3ace23bec60468d5e1`: actual A-mask click selected White Knight b1 while a different pose B was queued, with one deferred and one discarded request. Observed exit0 and native closure; same byte-identical code caveat as the captures. |
| Actual focused picking/redraw | `knight-sculpted-integration-20261006/focused-r4/result.json`, SHA256 `270d7c85a044553822d3c469f54f45ec922a98bf47a5f21acd69003549ea043e`: current package, real pointer-downs at muzzle, neck, dark eye region and brass base selected b1 using the presented mask/offer. First three distinguish neighboring board-only fallback squares. A transparent frame corner did not select b1. Real right-drag changed to90/90 in the same Worker and completed refinement. Supervisor SHA256 `1605b05474e924ca0d2163cdf7aa95418d7533f1a7a16fb6eaef71cdfe798037`, observed exit0/native closure/source unchanged. |

The eye spans quarter samples within two 64px texels: its displayed RGB blends
with the pale cheek while alpha remains occupied. Three failed witness attempts
are retained: incomplete Frame fixture, overstrict exact-eye RGB expectation and
uncanonical pointer tag. These were witness defects, not product failures.

## Cost and acceptance limits

The same-runtime paired texture diagnostic in
`knight-sculpted-samples-20261006/smooth-r1/current-cost-r1/result.json`
(SHA256 `de140251e0f52aeef961ab5a9bc6b7fe18f86f34a257314bfe37b4978dbf19da`)
used 36 samples per version: median old1.739ms, selected118-face4.229ms,
smooth202-face5.490ms. The more complex rounded/smooth candidate produced little
gain at board scale and remains a retained private diagnostic.

The focused browser's single cold low-view refinement round trip was2097ms;
same-Worker camera refinement was1355ms after the separate450ms quiet window, with
2047ms from gesture start to final readback. These variable-load samples are
diagnostic, not stable latency percentiles or a native/physical-device benchmark.
Responsiveness acceptance remains open. Broad24-scenario/689-reference behavior
and eight-mask retention receipts from the preceding product are historical
evidence and were not repeated or claimed as new-source full acceptance here.

Independent source review found no blocking defect; its frame-margin comment
correction was applied and affected source bindings regenerated. Root judges this
an incremental navy/body/base improvement. It remains faceted beside the other
pieces: owner visual/WOW acceptance is still HOLD. Full camera/overlap coverage,
motion artwork, proof/BendTT/kernel, native GUI/PCM/restart, original GPU250ms and
formal toolchain adoption require their own evidence. The full sprint Goal remains
active; this integration does not close those obligations.
