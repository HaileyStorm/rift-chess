# Overhaul progress — 2026-09-07

**Overall: approximately 15%. Goal active. No replacement release is approved or published.** The full contract is [OVERHAUL_PLAN.md](OVERHAUL_PLAN.md), including the owner's correction that substantial WOW factor is mandatory beyond geometry/UI repair.

## Evidence from this iteration

- Reproduced the reported Shift failure class on the public v1 release and a frozen matching local build: clicking the legal lone passenger in ordinary mode produces the movable-piece warning; explicitly switching mode selects the platform. This is a reproduced interaction defect, not reconstruction of the owner's exact saved game. Local evidence: `.artifacts/overhaul/baseline/`.
- Rebuilt piece assets as closed, inspectable components with volumetric knight forms and differentiated Classic/Faceted profiles. Components merge into one draw call per piece while retaining audit metadata. Three new topology/material tests pass. Visual sculpture quality is still under review.
- Replaced the busy dual-rail UI with a board-focused layout, action dock, contextual passenger action, explicit Shift preview/confirmation, and secondary drawers. Preserved local modes, save/replay, both hotseat actors, tutorials and keyboard controls. Added legal-action caching and animation-epoch guards. The public release is unchanged.
- Added distinct world builders, a deep mechanical understructure, an opening/exploration camera, shared geometry/material reuse, controlled bloom and new Shift/capture/promotion choreography. Reduced motion and skip paths remain. These are implemented candidates, not proof of premium quality.
- Type-check/production build and all **38 tests in five files** passed during integration. Existing rules/reference fixtures are unchanged. These tests do not constitute visual or complete-product acceptance.
- `scripts/overhaul-smoke.mjs` passed the actual rendered blocked-passenger route: visible contextual action, source selection, hole preview, explicit confirmation, knight promotion before atomic commitment, and direct passenger selection in explicit Shift mode. Inactive replay controls are hidden. Screenshots/video/receipt: `.artifacts/overhaul/integrated-slice/`. This is a narrow intermediate check, not the 18-session matrix.

## Visual review: first slice failed

An independent reviewer inspected the actual initial entrance/Gallery/Nocturne/Daylight captures and marked the slice **FAIL** against the WOW requirements. The main thread agreed. Findings:

1. Worlds read as the same arena with scattered primitive props and color changes, without coherent architectural silhouettes.
2. The rift read as a black rectangle with rings/disc decoration rather than convincing depth and machinery.
3. The large entrance headline obscured the board; cropped background forms distracted from it.
4. Large poles/loops lacked visible connections and a clear architectural purpose.
5. Tile/material craft and lighting remained too generic, with weak ivory/dark detail separation.

Subsequent changes rebuilt Gallery as a connected vaulted chamber with an aisle, terraces, oculus and grounded structural components; replaced the bright cavity disc with layered mechanism; adjusted light/material response; and added movement effects. Actual new captures were inspected, but **the experiential gate is still unproven and substantial art-direction iteration remains**. Nocturne and Daylight particularly need comparable authored-world work. A fixed mesh, new backdrop, bloom or more polygons is not enough.

## Inspection reliability

`scripts/inspection/index.html` is a development-only actual-asset viewer served by Vite, with all six types/both sides, orthographic views, neutral/material/normal/depth/wireframe modes and shadow A/B controls. It is not part of the player build.

The first 64-sheet run was not accepted: the viewer requested an absent favicon, and visual inspection found cached floor shadows in a supposedly shadow-disabled sheet. The harness now explicitly disables light casting and mesh receiving/casting and invalidates the affected shader programs. The two-sheet neutral three-quarter shadow A/B recheck passed with zero console/page errors; both images were opened and the disabled case has no cast shadows. The original failed run is retained under `.artifacts/overhaul/piece-inspection/`. The corrected full run under `.artifacts/overhaul/piece-inspection-2/` captured all 64 sheets with zero console/page errors. Full visual review is still pending; no initial sheet is relabeled as corrected evidence.

## Required next work

1. Continue the Gallery vertical slice and all six flagship experiences until actual in-game review supports the intended dramatic quality. Rework entrance composition and complete Nocturne/Daylight architecture; inspect motion footage rather than accepting source descriptions.
2. Review corrected isolated asset sheets at full resolution. Improve sculpture/material defects they expose, including thin/slab-like silhouettes and any harsh joins, then repeat affected views. Add near/detail and complete board/application zoom/scaling matrices.
3. Only after the visual/experiential gate, run the complete 18-session mode/layout/policy matrix, six complete real-UI games, tutorials, special rules/endings and recovery/interruption scenarios. Update legacy harness assumptions to the new visible UI instead of bypassing it.
4. Profile full-frame cost and input latency with scene, shadows and postprocessing counted. Current construction/capture samples are not controlled performance acceptance evidence.
5. Verify existing-save/service-worker upgrades, final offline Windows packaging and public-origin behavior; publish a new tagged artifact only after all acceptance gates pass. Preserve v1 as historical evidence.
