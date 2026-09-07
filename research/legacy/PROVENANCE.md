# Inherited evidence boundary

The three CSV files in this directory were supplied with the prior response. They are preserved unchanged. They contain 19 rows reporting 240 games each, for 4,560 reported games. The corresponding old per-game histories were **not** supplied and are not reconstructed or invented here.

`rules_summary.csv` describes six candidate configurations, `layouts_summary.csv` seven labeled layout rows, and `tuning_summary.csv` six special-rule variants. The labels `edge_diagonals` and `opposite_flank_diagonal` refer to the same pair of geometries in the supplied source, not distinct layouts.

Interpret `result_draw_maxplies` as simulation truncation. Its inclusion in the old `draw_pct` does not make it a real chess draw. Old `avg_first_slide_ply` values are zero-based; add one for a player-facing action index, while respecting that games with no Shift are omitted from that average.

The unrestricted rule configuration simultaneously changes occupancy permission, king anchoring and whether transport consumes movement rights. It is not a clean isolated test of passenger count. These agents are shallow heuristic screens; their values and result frequencies are not human ratings or statistical estimates of long-term enjoyment.

The original generator is retained unchanged at `reference/sliding_chess_sim.py`. The original runners and test file are retained under `reference/legacy/`. The active copy at `tests/test_legacy_generator.py` corrects one invalid inherited invariant: a pawn can legally ride onto its **own** back rank, but must promote on the opposite back rank. Targeted final tests cover that case for both colors.

Use `rift_core.py` for final draw policy and canonical repetition, not the legacy forced-100 game loop. The new runner, records and receipts live separately in `research/fresh/`.
