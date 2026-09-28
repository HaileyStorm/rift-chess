# Stage-two rendered playtest recovery and match-status repairs

The previous stage-two matrix assumed the old board origin, CLEAR and direct
camera/match buttons, and uppercase accessibility status. A bound run against
the published `8ed3bdbb4ba1d72a9497` browser build preserved those failures
before the driver was updated. The repair uses `shown.plan` for square picking,
board/motion crops and regions, drives Escape and the visible View/Match rails,
and keeps every committed journal checked against the TypeScript reference.
The 304-action draw fixtures were separated from short match-control actions
so each expensive replay has its own result; none of the historical failed
receipts were discarded.

Two product defects were then exposed by the corrected interactions:

- `State.outcome` codes 8/9 mean White/Black resigned, respectively, but
  `ChromeModel.result_text` announced the opposite side. The initial
  `full-matrix-b2-8ed3b-20260928/summary.json` (ignored SHA-256
  `1d425f11e90fe579b23c11cf92fa9155ddc82fd2c67bb35f2deeb69da277f3d2`)
  retained both mismatches. The explicit status regression now checks both
  codes without altering the reference expectation.
- RESUME in the compact Match rail unpaused the bot while leaving menu 12
  open. `State.bot_ready` requires menu 0, so the bot never replied. The same
  failed receipt retains the 120-second wait timeout. RESUME now closes that
  rail before scheduling the bot; the focused source test checks the state,
  eligibility and next-frame request.

The source-dirty local 2.0.27 draft `0e09e1d0e901b91b3d5f` has served
`build.json` SHA-256
`0bf920be43fe4a5dedc86121e5923cc8b12ae11671d222f98b878a797825417a`.
The following ignored `summary.json` files all bind those exact served bytes.
Together they execute all 20 current matrix scenario names with zero defects,
but they are six bounded runs rather than a single uninterrupted all-scenario
process:

| Run under `.artifacts/bend2/playtest-stage2/` | Scenarios | SHA-256 |
| --- | ---: | --- |
| `status-resume-draft-0e09e-20260928` | 2 (draw-actions, undo) | `82abefb0f29e661c4d0acc733e317ccc65f7cd8dd6d4198f1dffd20aa4d6697d` |
| `interaction-camera-draft-0e09e-20260928` | 4 (selection, Shift, camera, mobile) | `7f9f29c8c49e5aa49516d2fcf2627ce67841e898f4c2f31329e5df664dbe4617` |
| `full-matrix-bot-white-0e09e-20260928` | 1 (bot-white) | `8e47f7677c7dd222eda54a76fd0af45992c57524668d31da3b433bfcafd26571` |
| `full-matrix-bot-black-0e09e-20260928` | 1 (bot-black) | `5768fc43387b8ff6bebcb95f1592e14f6e98cde3d26cf9afa431761ca7247ca8` |
| `draw-reference-draft-0e09e-20260928` | 2 (draw-terminals, draw-prompt) | `a2857b1c538c5b929f8899cca8605a21993be57c062490b21048f77ab4a59e59` |
| `matrix-remainder-draft-0e09e-20260928` | 10 (start/defaults, both mates, castling/EP, promotion, menus, persistence, resize, perf) | `0568856440f2bc4ac98b70a5e7cd748217e73700bf6e32b177b1ac22a92c80e2` |

The two full bot games ended in threefold and checkmate after 52 and 45
measured bot replies, with zero reference defects. Their bot-reply frame
median/p95 were about 1701/2417 ms and 1600/1956 ms. The final finite
interaction sample had a 1303 ms p95 post-move worker tick and a 1035 ms p95
menu transport phase. These are diagnostic samples, emphatically **not** a
responsive frame-budget pass. The bot runs preceded the final capture-region
edit; the game assertions are unchanged, but their older L2 crops are not
evidence of the corrected capture geometry. A later board/motion crop was
visually inspected under the live plan.

The separate bound 13-group local Chrome suite passed offline play, both
themes, promotion, Shift/Undo, portrait and finite browser PCM with no
page/console errors. Its ignored receipt is
`.artifacts/bend2/v2-preview/scenarios/status-resume-draft-0e09e-20260928/receipt.json`,
SHA-256 `3bbb6d57dd8437f948864c240ba51628311316f8ff716075a8fd3c5cecce26da`.
Source checks, finite browser play, subjective capture inspection, native CPU,
native GPU, host audio and owner acceptance remain different evidence classes.
This section is a draft checkpoint, not publication or native parity.

## Clean build and hosted preview

Source commit `c30d312727a56f6b66b501dddf8038d317dfd946` reproduced the
same content version under clean pinned Bend 2.0.27 with `sourceDirty: false`
and `draft: false`. Clean `build.json` SHA-256 is
`9300df6bd209c2f4c89e44f44d5e2b7282927ddf79653f9f1d7822569c89f29f`.
The bound local draw-actions/undo rerun passed with zero defects (summary
SHA-256 `c58123b8cc211227bd9dbfaa1a9f69ab786732acb16312e641c46160aa77fa6c`),
as did all 13 extended local Chrome groups (receipt SHA-256
`214897d7504d83db1ce605c1d36aff15d03806c19c4ea4438debc9e04fc625a1`).
The original TypeScript application again passed 62/62 tests and built.

The separate [Bend browser preview](https://haileystorm.github.io/rift-chess-bend2/)
advanced to Pages commit `42ba051a760aef6f296c2c8e29054efa43d7da6c`.
After Pages reported `built`, the ignored
`.artifacts/bend2/publication/2026-09-28T07-39-48-908Z-669cd4c2/receipt.json`
(SHA-256 `6d32dd773aaca84e53df39a49410d0c71de9aa9912565bb53e0c2c7096437f08`)
matched all 22 live Bend files and the two unchanged original-site baselines.
The hosted draw-actions/undo matrix passed both repaired paths (summary
SHA-256 `5f0257b0552b67099025f60268ec266d7dfbeb7d08841a5a84ba01abf460ca2c`).
The hosted extended Chrome suite passed all 13 groups, including offline play,
PCM, promotion, Shift/Undo, themes and portrait, with zero page/console errors
(receipt SHA-256 `ffba5c0041ec14a0b2854289905b98c53902ced022b342400aff6b97116ac0dd`).
The full 20-scenario union above is local draft evidence on the same content
bytes; the hosted checks are narrower. None of this establishes native CPU,
GPU, physical audio, a 2.0.28 pin amendment, a responsive frame budget, or
owner visual acceptance.

The bot-game driver previously shared one mutable human-choice seed across
sequential scenarios. In a later candidate run that made Black's choices
depend on whether White ran first; the Black game hit the 180-ply cap and
the test's cleanup resignation was incorrectly accepted as a terminal game.
The driver now resets the seed per game, records `naturalOutcome`, and treats
a cap as a defect before cleanup. The source-bound [candidate follow-up](../browser-2028-candidate/README.md#deep-candidate-browser-replay)
retains the misleading sample and a fresh-seed natural-checkmate rerun.

## Initial fallback versus detailed sprite refinement

The original `desktop-start` matrix capture sampled the first playable frame,
which still uses Bend's fast proxy silhouettes. It was not a visual check of
the authored chess artwork. The test now captures that frame separately,
waits for a real `refinement` worker packet with a transferred image and
finite sprite-render timing, then captures the detailed result. A fresh hosted
Chrome run bound the exact served `build.json` to the local clean non-draft
bytes (SHA-256
`9300df6bd209c2f4c89e44f44d5e2b7282927ddf79653f9f1d7822569c89f29f`,
content version `0e09e1d0e901b91b3d5f`, source `c30d312`) and passed the
`desktop-start` scenario with zero defects. Its ignored
`.artifacts/bend2/playtest-stage2/sprite-refinement-bound-20260928/summary.json`
is SHA-256 `991532bcd0b40cde8862ea40639e7dd6a521db5b4eff5329226f73a78d0f10fd`;
the scenario result is
`1299b133b7e37f4be4b02b0fc16c4fd02ae677849180068cba6b5c724189498d`.

The initial and refined full-canvas PNGs were visually inspected. Their
respective SHA-256 values are
`b0d205996f70477e61374df41e8c9237c49d2d36f6982c1cf85b75054c3387b9`
and `b438ce62054b4579473856873d70f3ca0bb2b40980f4a66fff4246d7966b033d`.
The detailed pieces and board rim do appear; they are not absent assets.
In this one cold hosted sample the detailed packet arrived **4,677.9 ms
after the first frame** (sprite worker 4,217.8 ms, including 1,410.6 ms decode
and 1,624.2 ms sprite drawing). This is a conspicuous placeholder interval,
not a responsive-startup pass or a distribution/owner visual verdict. The
new assertion is a narrow regression gate; the full matrix was not rerun on
the changed test driver.
