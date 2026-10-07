# Retain sprite artwork through ordinary moves

The candidate browser now redraws an ordinary move's affected rectangle with
the original Bend sprite traversal. Stationary pieces retain their artwork;
completion promotes the new occupancy image immediately. A same-view move no
longer needs another helper render to restore detailed pieces after animation.
Camera orbit, Shift, incompatible views/themes/holes and unavailable caches keep
their existing fallback paths.

`ImageOps.replace_rect` preserves immutable subtrees outside a half-open integer
rectangle. Bend computes conservative source/destination, capture and intermediate
motion bounds, restores the exact detailed helper ground inside them, and redraws
all intersecting sprites in the original painter order. Original sampling,
quarter coverage, contact shadows and rounded shadow geometry are retained.
This also retains the original castling-rook jump and other existing animation
semantics; it does not introduce a new animation model.

The helper transfers one current RGB pose and its exact settled ground using
explicit Uint32 node tags. All U32 values, including `0xffffffff`, and the
compiler's `6n` texture-depth representation survive. The port checks exact
constructor fields, texture sizes, depths, spans, node counts and trailing
tokens. A helper-local ground identity requires a resend after rebuilding even
when the recipient requested omission. Cache publication rechecks the actual
helper and generation inside the serialized acceptance queue. Historical alpha
masks remain separately bounded at eight; RGB poses are not retained per mask.

Completion reuses the existing same-view alpha mask with a new presentation
offer. Its picking position comes from the displayed presentation. Moving
artwork still uses procedural picking and does not advertise settled atlas
picking. Full animation-time alpha alignment remains an open sprint item.

## Exact candidate and evidence

Private immutable records are under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`.
The tested package is `browser-4G1uzM`, version `190418dfdfe590659bd0`, build
SHA-256 `2f284391e1296e858fccec17bc474c1c1b8fbf423f0ccd83c869c28de9301071`.
Its source revision remains `fe01be11acf796b72b3087e3b22c7bfc1948e9fe`,
`sourceDirty: true`, draft and unadopted. A later commit does not retag it.
The compiler candidate is 2.0.35 at
`79df8d9c40722ee9507a1e253f283b51025f9d6c`; the accepted 2.0.27 pin stays intact.

| Check | Actual result and boundary |
| --- | --- |
| Fresh selected emissions | Whole-book scene/controller/menu checks and emissions passed, with exact source/runtime bindings. Scene includes 43 Bend files; controller 63; menu 25. |
| Product finite differential | 153 complete 512px RGBA comparisons, 40,108,032 pixels: five real controller transitions (move, capture, castle, en passant, promotion), all 17 phases, default camera plus low and overhead capture/castle views. Current full and partial renderers matched the immutable prior full renderer; every outside pixel retained its old value. Finite evidence, not a proof or all-view result. |
| Codec and transfer | Actual emitted poses and three detailed grounds preserved exact trees and metadata. Real structured-clone transfer detached the sender's copied pose buffer. Full-U32 collision witness passed. |
| Current browser build and strict TypeScript | Passed. All bound build sources stayed equal across the supervised episode. |
| Installed Chrome ordinary moves | Actual game/module Workers completed e2-e4, e7-e5 and g1-f3. Moving frames invoked the sprite redraw; root inspected a naturally drawn artwork capture. All completions reused mask 1 with offers 6, 12 and 18, with only the initial helper refinement. Retiring its old offer did not lose the current mask; clicking Black Pawn e5 selected that destination piece. No page errors or external requests. |
| Real Node Worker protocol/cache checks | Three existing suites passed. Source/theme rejection, duplicate IDs, superseded loads, older-generation plate rejection, supplied-plate invalidation and prepared-ground digest/fallback behavior remain covered. Added omission and ground-ID resend checks exercise the actual transport. Rendering fixtures are synthetic; this is independent protocol/cache evidence. |
| Current rendered reference and queued-mask race | Four actual Chrome scenarios passed 120 TypeScript-reference checks with zero defects. The existing queued atlas-mask race also passed on this package. |
| Current offline and paired canvas checks | Corrected suffix passed: real service-worker install/cache, offline reload with prepared ground and identical initial canvas, and an offline e2-e4 move. Separate original/current detailed start, e2-e4 completion and changed Front-view canvases matched exactly. Changed-camera ground invalidation passed. |

Successful supervised episodes observed the original child exit, closed its
checked native handle, verified that the native Job contained only the
supervisor, closed the Job, and compared frozen source bytes before/after.

## Cost and retained failures

This implementation establishes artwork continuity, not the 33.3ms motion
budget, stable tail latency or memory neutrality. The real browser still
rebuilds procedural ground/prepared layers before choosing the artwork branch.
Observed sprite work varied substantially (including cold/JIT cost); diagnostic
draw observers and screenshots add overhead. The current default pose transfers
267,564 bytes and its detailed ground 1,770,504 bytes. One current RGB pose and
ground remain cached in each Worker, with bounded encoding scratch space.
Physical-device, memory and complete interaction measurements remain open.

An unused ChromeRaster emission timed out after its internal 300-second bound.
The exact owned parent and inherited Job closed, and the raw owned lease was
preserved before releasing only that lock. No successful Chrome emission is
claimed. The active browser consumes scene/controller/menu; its obsolete Chrome
cache prerequisite and registry compatibility waiver were removed. Historical
Chrome source and emitted provenance remain available for their named routes.

Earlier finite attempts stopped on a test harness TypeScript API mismatch and
then the real `6n` codec incompatibility. Browser R1 lost its original diagnostic
to a BigInt JSON error; R2 exposed a wrong hover-label expectation. Browser R3
passed completion/picking assertions but its captured motion frame revealed
proxy artwork: `RenderPlan.motion` means orbit, whereas piece animation lives
in `Snapshot.moving`. The corrected R4 asserts actual moving sprite work and
captures detailed artwork. These original attempts remain immutable.

The broader acceptance prefix passed reference/race checks, then an old offline
harness asserted a schema-2-only `v2Preview` field absent from the candidate
manifest. Its corrected suffix first stopped on a mistaken retained-failure
filename assertion. Neither attempt is a complete offline result, and the
successful prefix was not rerun to repair the suffix.

## Immutable record hashes

| Record | SHA-256 |
| --- | --- |
| `product-motion-finite-r3/result.json` | `9ce0595a8fe6060f7bcc6b8cb55b944adc09222001da48a60dfb51b1cbccf682` |
| `preview-motion-integration-build-r2/terminal.json` | `b82b6f7cb2e1074e3a99b5b4c84c75440f46b4a6a49ae6869faec42717b10334` |
| `product-motion-browser-r4/result.json` | `1738b933d4d5e54267d551836430eef6c71d49ed56fdc7924c4495c043df7c9d` |
| `product-motion-browser-supervisor-r4/terminal.json` | `f9d2a451310dcc1220354e4976f4e43679b893404f41e9a0ee5481e1809859f6` |
| `product-motion-helper-supervisor-r1/terminal.json` | `0350f32577bb53328f9ba5d15154582625b5ba467d15efbd40fc444c42981462` |
| `browser-product-acceptance-supervisor-r1/terminal.json` | `ecab88b98fe1fc07a2abfa1aa4af15ee4a6fefcbcf757ae82ac9556ae5edf31e` |
| `browser-product-acceptance-r3/result.json` | `ddbc7ba99e2b33d4dc4dd117ee96e5da74789f665f6da303d47457fbe4c1021a` |
| `browser-product-acceptance-supervisor-r3/terminal.json` | `ba122f4cd4e316ee3ac33b715a82f10b04cbf5fcb76e0570a921337e5b85b8b4` |

The original full renderer and failed/trial emissions are retained for
differential and recovery provenance. No copied alternate renderer remains in
active product code. Frozen Laws, normative dependencies, upstream compiler
source, balanced runtime parallelism and the original TypeScript application
are unchanged. Full [sprint](../../../SPRINT.md) and
[review](../../REVIEW_2026-10-05.md) acceptance remains open, including
proof/BendTT/mutations, native CPU/GUI/PCM/restart, original GPU, hosted/current
source, device responsiveness and owner visual approval.
