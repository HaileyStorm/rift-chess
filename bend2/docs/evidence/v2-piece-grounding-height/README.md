# Settled-piece height and grounding comparison

The owner observed pieces sitting high on squares and perhaps appearing too
tall, while rejecting a 75° Front view. This isolated 2.0.27 visual trial keeps
the default yaw 345°/pitch 67°, Front yaw 0°/pitch 65°, artwork bytes, board
geometry, frozen Laws and pinned compiler unchanged. It compares one variable
at a time in the settled authored-sprite path, not the cold/motion proxy.

All four real-Chrome `desktop-start` captures used the same 1280×1050 viewport,
waited for detailed refinement, and passed 9 scenario checks with no defects.
Their ignored captures are under `.artifacts/bend2/playtest-stage2/` using the
run names below. The hosted baseline was exact clean source `9d4a532` and
build `e788562833af84fd6840`; the three local builds were draft/source-dirty
at controller commit `c32b750`, with source-bound selected scene emission.

| Run | Height / base / shadow, in pitch or sprite width | Build version | Default board PNG SHA-256 | Front65 board PNG SHA-256 |
| --- | --- | --- | --- | --- |
| `foot-shift-hosted-baseline-20261001` | 1.04 / .22 / .17 | `e788562833af84fd6840` | `db847b1c4db4eabcd942003c076c08aaeb2277abd8362aa2403bfb50c1576bdd` | `1abf3aa6d73f7f173f7eda18a8faa80eec23de302ca4951a2a1ced33f8e2ce0d` |
| `foot-shift-draft-20261001` | 1.04 / .26 / .21 | `9e01f0af7dc6e2786293` | `5786c46f3e3c2ab0ebaac336f5ec0bce0601e0ae80a6286a4b3dfd4719204147` | `78c86e3fe3a3de61287164af7aa47a1642475ba12e3e02b2b74d4bca9777e009` |
| `height-short-draft-20261001` | 1.00 / .22 / .17 | `da8013ed39be761d1671` | `21a8517713e1c92a1302cc44f57d9bd67f0b375a065875a4cb7f4c070d0aa1e1` | `291141d175d33874c26d2c581d164aff695d212c8d07de38362da7d6e90cad1f` |
| `foot-height-combined-draft-20261001` | 1.00 / .26 / .21 | `a833e68286d224c4a4db` | `6b9fb6cd6ed96fdb8e8b5455374644f031d8eef10afe8537484110c96a4c5151` | `a8fba3a46851556900569c5779e4c942298a4d226f14eb64395cdf3112630439` |

The default and Front screenshots were visually inspected at native board
resolution. Lowering the whole piece makes its contact more apparent but moves
the matrix foot to `.26 × 1.16 = .3016` rank pitch below center. At the
allowed yaw 0°/pitch 35°, the adjacent-square boundary is only
`0.5 × sin(35°) ≈ .2868` pitch. The controller still uses the legacy 24×36
silhouette, not the decoded atlas mask, so a visible base could be picked as
the neighboring square. An independent review therefore rejected both
lower-base variants even though the combined draft completed the exact-build
local 24-scenario/689-check matrix with zero reported defects (ignored summary
SHA-256 `0312eac459f873448f1199b4c9e8e7b340e5c00281646f31fb1d1c3cd8e5c11e`).
That matrix clicks ordinary board/sprite points; it does not assert an opaque
base click at minimum pitch. A green broad matrix does not negate the pick
boundary.

The retained candidate shortens only the detailed sprite quad from 1.04 to
1.00 projected pitch, leaving its base and shadow at .22/.17 width. The
`BoardSceneSpriteTest.bend` source check now requires height ≤1.01 pitch at
Front65 and default67, checks its retained base band, and proves the matrix
foot maps to the same central square at pitch35 from yaw0 and yaw180. All seven
focused controls passed with `BEND_NO_TELEMETRY=1`. Its selected scene JS
SHA-256 `27515c02c88f5da93e8de2074862bf5edd502465603253ac017b1a5a474ff172`
was reproduced byte-for-byte after the discarded combined draft. The local
height-only draft `da8013ed39be761d1671` passed the uninterrupted local
24-scenario/689-check real-Chrome matrix with zero defects. Its exact served
`build.json` SHA-256 was
`852779792e857cfec5034fd958bd5edf019a2560e333b6608a030d5339a028b7`;
the ignored `height-only-full-20261001/summary.json` SHA-256 is
`e412d4e314cb1e7969064e89c4fe730f6f1f9b16f69a10247030c358d7149c08`.
This is not a clean publication, native CPU/GPU retest, 2.0.32 bundle,
full-orbit atlas-picking proof, device performance result or owner visual
acceptance. In particular, menu frames in one ordinary-host performance
sample took hundreds of milliseconds; a green interaction matrix is not a
frame-budget guarantee.

The sound follow-up for a lower base is a presentation-bound immutable hit
representation derived from the same decoded atlas alpha and shared sprite
placement, installed with the matching settled refinement. Do not widen the
old `Sprites.alpha` silhouette or move the base without testing opaque and
transparent pixels, rifts, overlaps, every supported view, and stale frames.
