# Camera-facing wall bands during active orbit: local draft

The [published composition checkpoint](../v2-composition/README.md) has
settled topology-aware walls, but its 128px active-orbit ground is flat.
This source-dirty Bend 2.0.27 draft adds only camera-facing exposed wall
facets during orbit, at the outer perimeter and rifts. It keeps the
existing one-pass `SpatialFast` tile tops. A dedicated
[`MotionWall.bend`](../../../graphics/v2game/MotionWall.bend) clips each
projected wall to the same inverse affine/presence mask used by the tops;
present tile pixels are not overwritten. Full wall coverage at oblique
angles replaces a rejected endpoint-trim/one-tile-repair heuristic that
spilled at other pitches and zooms. The frozen laws, generic graphics
primitives, runtime parallelism and original TypeScript site are unchanged.

The strengthened BoardEdgesTest checks facing edge colors at nine yaws,
sampled rift and perimeter top masks at 128px and 512px, and a 288-view
camera sweep (24 yaws × four pitches × three zooms) with zero sampled
spills. An independent review found that opened-vs-closed image comparison
could hide common perimeter overdraw. Absolute palette top-center checks
now cover all present squares: 27,260 centers across that sweep plus 160
near-cardinal/alternate-hole/two-theme variant views, all passing. These
are finite selected-JS pixel checks, not a geometry proof or native device
differential. The pinned checker reports `All terms check.`

The local draft browser build is `4ac79468f49425b6fec3` from a dirty
checkout, with BoardScene SHA-256
`4dd35c46c8e0e6310f91979628163f70e0117641d5cb3cf26740909be35c4150`
and MotionWall SHA-256
`bc5e059d021327596e32b9f1ce8449fc1085dfbb1229a428ae49990003558f86`.
A real Chrome held-pointer drag passed, with eight input events, ten rendered
frames, zero page errors and a sampled 47.9 ms pixel p90 in the drag reply.
The ignored local motion capture
`.artifacts/bend2/v2-preview/orbit-mask-4ac-20260927/browser-v2-orbit-motion.png`
was visually compared with the old flat capture; its SHA-256 is
`e6e8ea3dac15d354844fca7998f27b6adeae1e5cacbb0e3319856995eff01831`.
The board has visible dark outer/rift bands during drag but still uses
intentionally coarse proxy sprites until the settled refinement. The
local settled desktop PNG remains byte-identical to the published
composition capture (`e0f4f125954f6dee919cbe735141254c9ce718ffe71949d09f39a44e1b85cf93`). The
extended local Chrome scenario bound served `build.json` and passed all
13 groups with zero errors, including offline, audio, themes, Shift,
promotion and portrait. Its ignored receipt is
`.artifacts/bend2/v2-preview/scenarios/orbit-mask-4ac-20260927/receipt.json`,
SHA-256 `7e06e0802c1015095db2d9a2731b88918e632c87d32e098924180fe64f77633e`.
The compact-vs-expanded composed image gate matched 60,817,408 bytes;
root TypeScript checking and 62/62 original app tests passed.

This draft has not been published, run on Linux native CPU/GPU, or approved
by the owner. One warm selected-JS 128px ground-construction sample had
median 33.16 ms and p90 50.23 ms across 25 iterations; it is not a stable
browser frame budget. The exact earlier Linux result applies only to the
older published composition source `4f6e52f`.
