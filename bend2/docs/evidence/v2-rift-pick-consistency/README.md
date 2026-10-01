# Rift-tile sprite/pick consistency, clean preview and hosted check

Clean source `45d7041ea1e11db48017db96b886b24b60d501d3` changes the
legacy `Scene.pieces` renderer and `Picking.pick` together: an occupied board
entry beneath a missing macro no longer draws a legacy piece or wins a sprite
hit. The detailed v2 sprite layer already suppressed pieces under holes.
This is defensive behavior for an invalid or in-flight position; legal game
positions cannot contain a piece on a missing tile. It does not change the
frozen Laws, published TypeScript app, retained 65° Front/default 67° camera,
sprite atlas, or .22/.17 detailed-piece base/shadow placement.

The actual pinned Bend/Bun `bend2/tests/picking.ts` run passed 2,523 checks.
Three views (yaw 0°/180° at pitch 35° and default 345°/67°) each supplied a
distinguishing opaque legacy-sprite pixel: the normal piece overrode a
different board-square fallback, while the same occupied entry under a rift
returned that fallback and the legacy renderer emitted no sprite pixel.
Depth overlap, transparency and camera projection checks remained green.
`Application.bend` and `ApplicationControl.bend` source checks passed. An
ancillary direct `ApplicationV2.bend --check-only` invocation failed at its
unchanged line 137 with a parser diagnostic; it was not used as a positive
gate or attributed to this edit. The active browser controller is
`ApplicationControl`, and a separately built, actually interacted browser
app is the positive runtime evidence below.

Selected controller and scene modules were re-emitted from the changed
source. The clean non-draft 2.0.27 preview build is
`8235c81a27d4030e143b`; its `build.json` SHA-256 is
`2a69d431f89373b19dc294100237ff1a9a7b7451ac7e29ac5f1572d6761c8a7d`.
The exact local ground/package binding passed. A separate real Chrome
selection/move/orbit/refinement/mobile/menu smoke exited 0 with no page
errors, bound to that same build. Its ignored captures are in
`.artifacts/bend2/v2-preview/rift-pick-clean-20261001/`.

The uninterrupted, served-build-bound local real-Chrome matrix passed all
24 scenarios and **689 checks**, zero defects. It exercised moves, both
sides, special moves, Shift, promotion, bot, long draw imports, Undo,
persistence, mobile, camera, menus and error recovery. The ignored summary
`.artifacts/bend2/playtest-stage2/rift-pick-clean-20261001/summary.json`
has SHA-256
`eab649d35944c175ecc23759f20e0f97dea34bc464c378f9083c69a2d9c9811c`.
This is local browser interaction, not a native/device performance bound.

The separate [Bend Pages preview](https://haileystorm.github.io/rift-chess-bend2/)
received commit `81e8725d4f4b4089e4a979c90f81054049856129`, which Pages
reported built. The live verifier matched `build.json`, all 23 listed Bend
files and module MIME types to the clean local build and Pages checkout, plus
both unchanged original-site baselines: receipt SHA-256
`b7f07fec36b856329c8b0c34ce42742214562781d13d5bde74af10f2b899955b`.
The exact-build hosted extended Chrome run then passed 13 checks, zero page
errors, including detailed refinement, selection/moves, both themes,
record import/promotion, finite PCM synthesis, service-worker-controlled
offline reload/move, Shift/Undo, persistence and portrait controls. Its
ignored `rift-pick-hosted-20261001/receipt.json` SHA-256 is
`e4f88a7a7fdfa59b205c435ce7fd5e75a80a6a1dacc418f41448d7140c93c02c`.
The warm-court capture was visually inspected. Old content-hashed Pages
assets were retained; the clean checkout and its owner claim closed.

This scoped release does not resolve atlas-alpha versus legacy 24×36 picking,
the owner's base/edge/shadow judgment, physical audibility, native current-
source GUI/PCM/restart, GPU speed or a reviewed 2.0.32 pin. A discarded
pitch-interpolated lower-base trial produced a new wrong-square foot at
yaw 26°/pitch 41°/zoom 75; a capped geometry-only sweep removed new
foot-center misses but did not establish atlas hit parity. No lower-base
change was shipped. The current preview does not replace the original game.
