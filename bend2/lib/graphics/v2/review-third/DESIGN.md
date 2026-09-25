# Third pass — design review and decision record (DRAFT)

The base is the exact second delivery. Existing Laws, tolerances, compiler pin,
frozen dependencies and game policy remain unchanged. Completion is recorded
separately in THIRD_PASS_REVIEW.md and raw receipts.

## Round 1: application needs rather than more isolated drawing calls

Illustration, diagrams and UI skins need closed paths with holes, alpha gradients,
isolated groups, soft shadows, masks and atlas-safe sampling. Editors/dashboards
need retained scenes, automatic old/new damage, hit regions and explicit buffer
lifetimes. Games and tools both need stable alpha sprites without repeating
coordinate/tree work. Real browser integration needs bounded worker queues,
stale-result rejection, failure handling and complete-frame commits. Demos should
compose those capabilities into useful visuals rather than import attractive art.

## Round 2: challenge costs and semantics

1. Transparent layers require a separate premultiplied RGBA representation.
   Existing RGB Images do NOT gain an alpha byte. Quantization is explicit.
2. Group opacity is applied after an isolated group is composited, never
   distributed among overlapping children. Existing rounded alpha is untouched.
3. Blur filters premultiplied channels with explicit borders/rounding and must
   avoid radius-squared work. Cached glow is not a claim of free per-frame blur.
4. Paths need winding rules, half-open vertex crossings, bounded curves and a
   distinct F32 evidence boundary. Old stroke/facet contracts stay unchanged.
5. Atlas filtering clamps to a selected subrectangle; trim offsets, packing,
   rotation and mip isolation are separate capabilities, not implicit promises.
6. Prepared sprites must amortize: measure preparation, steady redraw, memory
   and break-even against exact old-API pixels, not just a favorable screenshot.
7. Workers must not commit stale generations or partial frames. Cancellation
   discards work; it cannot interrupt synchronous Bend. Bound outstanding jobs.
8. Do not patch the compiler or label browser software execution GPU evidence.
   Keep true serial baselines and explicit, tested fallbacks.

## Round 3: refined priorities and rejection gates

| Priority | Work | Required evidence |
|---|---|---|
| P0 | Preserve input and real compiler baseline | Exact hashes and unchanged existing tests/proofs |
| P0 | Prepared translated/scissored sprites | Independent full pixels, prepare/redraw/storage A/B |
| P1 | Premultiplied RGBA surfaces, masks, group composition | Integer oracle, alpha invariants, overlap controls |
| P1 | Separable blur and glow/shadow preparation | Naive oracle, border cases, radius-scaling measurements |
| P1 | Closed paths and alpha-gradient brushes | Even-odd/nonzero holes, crossings, bounded curves |
| P1 | Atlas-safe views | Neighbor contamination controls and invalid regions |
| P1 | Retained scene damage/hit tests | Move/remove/reorder changes versus complete redraw |
| P1 | Bounded workers and interactive gallery | Real browser pixels, stale/cancel/error/dispose tests |
| P2 | GPU presentation and extra effects | Only with actual evidence; not a checkpoint prerequisite |
| Deferred | General meshes, shaping/bidi, widget hierarchy | Separate contracts/resources; no hollow API |

Implementation can refine the order after profiling. Unsuccessful experiments are
recorded, not enabled by weakening assertions. API.md and DRAFT_CONTRACTS.md name the
public domains and exact finite/formal evidence.

## Round 4: implementation feedback changed the priorities

The initial polygon builder accumulated a left-deep edge tree. The first real
1024-square Aurora browser frame took 37.881 s, exposing a real preparation/query
cost rather than merely a missing visual feature. The final public constructor
uses binary-carry balancing with explicit occupied slots; empty horizontal edges
do not destroy its balance. The first controlled unchanged-edge point sweeps measured
5.02x, 17.53x and 65.94x improvements at 64, 256 and 1024 edges. Independent F32 and
pixel oracles passed without exclusions. The first builder source and initial
browser receipt are retained as historical experiments. Final cold-frame timing
is still expensive and is reported, not replaced by warm-only screenshots.

Prepared sprites succeeded for stable keys, including a native whole-process
benchmark with preparation included. Rebuilding all unaligned caches each frame
was slower. Therefore this remains a separate opt-in cache rather than silently
replacing immediate draw. Running-sum blur controls radius cost, but complete JS
surface conversion/filter/freeze is too expensive to advertise as a generic
per-frame full-screen effect. Local preparation and caching are the default
integration guidance.

Rapid desired-state updates exposed an important transport rule: cancelling a
frame must not discard damage that still separates the last-good image from the
next desired state. The pool now accumulates accepted uncommitted damage until a
successful publication, including superseded/cancelled/failed requests. Real
worker tests cover this rule. Fallback yields between tiles instead of forming an
unbounded microtask chain. Neither change needs a compiler modification.

Native glyph grouping was added after reviewing the effect pipeline: existing
font masks now participate in group opacity, material masking and prepared halos
without rasterizing scaled low-resolution atlases or imposing a shaping engine.
The new glyph oracle checks native placement independently. The sixth visual uses
only locally baked coverage and actual Bend composition; font bytes and reusable
generated glyph data are excluded from the delivery.

## Final disposition

Implemented: all P0/P1 rows above, through 15 new production Bend modules, four
new host modules, an actual interactive workbench, six visual artifacts, eight
new source witnesses, independent pixel references and native/browser execution.
No previous public implementation or contract is changed. Full GPU-device work
remains deferred, not labeled completed through CPU fallback. Detailed API limits
are in API.md and DRAFT_CONTRACTS.md; performance regressions and cold costs are in
PERFORMANCE.md. The new small modules are not a claim of a complete general UI,
text-shaping, 3D or color-management framework.
