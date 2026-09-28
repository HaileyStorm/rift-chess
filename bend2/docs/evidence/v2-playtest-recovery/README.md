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
