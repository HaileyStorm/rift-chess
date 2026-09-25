# Additive reusable graphics expansion — DRAFT

Local relocation and verification details: [INTEGRATION.md](INTEGRATION.md).

This package now includes an opt-in ordered draw/plan path, clipped/damage-aware
composition, filtered/transformed RGBA images, nine-slice skins, vector strokes,
text preparation/hit testing, layout/timing arithmetic, prepared ramps/fields and
a narrow host ImageBuffer. The earlier README, handoff and core Laws remain
historical and unchanged; they do not describe all new modules.

Start at the colocated [EXPANSION_REVIEW.md](review-expansion/EXPANSION_REVIEW.md).
The full [API guide](review-expansion/API.md),
[design rounds](review-expansion/BRAINSTORM.md),
[performance report](review-expansion/PERFORMANCE.md) and
[DRAFT proposal ledger](review-expansion/DRAFT_PROPOSALS.md) are here.

New formal declarations live in `contracts/expansion/`; the separate
`presentation/LAWS.bend` retains two unfilled F32 candidates. Do not interpret
source checking or finite native parity as a GPU-device proof. The opt-in plan
path does not replace the existing immediate APIs, frozen v1 or grid8.

Tests are under `tests/expansion/`; the real-compiler validation entry is
`tools/verify_expansion.py`. Native/negative-control/visual reproduction commands
are in the [reproduction guide](review-expansion/REPRODUCE.md).
