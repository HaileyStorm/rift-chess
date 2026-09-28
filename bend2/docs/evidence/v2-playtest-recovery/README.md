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

A follow-up exact-build-bound hosted Chrome run exercised the named **Front**
view after a second genuine sprite refinement, then closed View and completed
the original layout-C checks. All checks passed with zero defects. Its ignored
`front-refined-final-20260928/summary.json` is SHA-256
`812eda0882af68a7e621b07d1250e3015c22bd0a7d96c7cd8a113ab7bf261b0a`;
the scenario result is
`968486360f8783a8de6000ab9ff1276e22d1bbc616244b4c70cb0701750604cf`.
The visually inspected `03-front-refined-L1.png` is SHA-256
`7937bb85a00dae3925e2681c3f3d7dc0f566e6bf8b99daacc9d07635c54bed9b`.
It shows both ranks and the exposed court edges, but the tall screen-facing
back-rank art still occupies some of the adjacent pawn rank in this preset.
The front-view refinement followed its last first-pass frame by 3,352.2 ms
in this sample. These captures support a precise visual adjustment trial;
they are not owner acceptance or a frame-budget pass.

## Full bot games and terminal artwork on published proportions

The clean hosted `817dfa63932dd6ccf4b4` preview ran the two bot-game
scenarios independently with exact served `build.json` binding and a reset
human-choice seed. White-bot reached a natural threefold draw after 52 bot
replies (161 checks, zero defects; summary SHA-256
`185a635075d8ab848377036da43eae1eb9a3e73416b4f9720114e0d5dabd3556`).
Black-bot reached a natural White checkmate after 45 replies (140 checks,
zero defects; summary SHA-256
`24acc2852564e4ab7cb391f2dc84da22dd8f680bf727ed7d0b2041a568e17100`).
Reference positions, journals, status and rendered input were checked along
both games. Bot-reply frame p95 was about 2,356 and 1,819 ms respectively;
these are not a responsiveness pass. The immediate final screenshots still
sampled the transient proxy tier, so they alone could not establish the
detailed terminal appearance.

The focused hosted Fool's Mate path now waits for a `refinement` packet at
the **terminal revision 4**, then captures the final art separately. It
passed with zero defects using playtest driver SHA-256
`450beeb57a205c95d133fba3af959b4f9542ceca994b14f564755d070bce05f9`
(summary SHA-256
`af1ce3de03d4e20a42fa06f7ee70cc48aeab9e85a090c648f8ade1bdefefd463`).
The proxy terminal PNG SHA-256 is
`c3e4d2652a8997629c276eaaa84f9fd0c3f8d63bcbc56fed0e5be836ff767ca`;
the visually inspected detailed terminal PNG is
`aa8063514e8323bf18850aa1db33eafe4712830cbb849bdfc3878f9c6082aa97`.
This confirms that a terminal board can refine rather than being permanently
stuck at proxies. It does not measure a universal refinement bound or prove
that every bot terminal packet was captured after refinement. At this
checkpoint the new-source 20-name union and long 304-action imports were
still open; their later results and failure boundary follow below.

## Current published-source matrix union and mobile chooser anomaly

All 20 current rendered-playtest scenario names now have at least one passing
sample against the exact clean hosted version `817dfa63932dd6ccf4b4` and
served `build.json` SHA-256
`40a49368c1bebaec3882b61e131dca99bf517da11735fcf1dcb320440449dfea`.
This is a union of bounded runs, **not** one uninterrupted 20-scenario pass:

| Ignored run under `.artifacts/bend2/playtest-stage2/` | Passing names | Summary SHA-256 |
| --- | --- | --- |
| `shorter-piece-hosted-20260928` | desktop-start | `097d3ddfb30557de2bd3bd80e79c4e37b112b85cf9507329e2147ff8633d4f32` |
| `piece-proportion-bot-white-20260928` | bot-white | `185a635075d8ab848377036da43eae1eb9a3e73416b4f9720114e0d5dabd3556` |
| `piece-proportion-bot-black-20260928` | bot-black | `24acc2852564e4ab7cb391f2dc84da22dd8f680bf727ed7d0b2041a568e17100` |
| `piece-proportion-draw-terminals-20260928` | draw-terminals | `b6c27139b782b244b8b2387ac5629e281a90ef128749a7b1698924c9bbbb04a0` |
| `piece-proportion-draw-prompt-20260928` | draw-prompt | `6d24af19a1ce2ea0898ff9210558d7aff7c6dcc18d197b5872a53e2e8eb784af` |
| `terminal-sprite-refinement-20260928` | hotseat-black-mates | `af1ce3de03d4e20a42fa06f7ee70cc48aeab9e85a090c648f8ade1bdefefd463` |
| `piece-proportion-matrix-a-20260928` | defaults, selection, hotseat-white-mates, castle-en-passant, promotion, shift | `9c5c633605d7d5ed3db838e948ce16088fc96cdcb7bdcdbba5026f3a8fb8529b` |
| `piece-proportion-matrix-b-20260928` | draw-actions, undo, camera, menus, persistence, resize | `ccb963a320ef15af06984e72db87258768d053aeb6b713c0c89f3db509c4b095` |
| `piece-proportion-mobile-repeat-20260928` | mobile | `1b90704678856990b9ed9da251953a6daf6d28bd988a06701c41917624cf3ea7` |
| `piece-proportion-hosted-perf-20260928` | perf | `d71b64768c6348814427fb354ffc422ac3164ec5ffc8490feb5c77c2f8997790` |

The two 304-action draw-policy imports passed separately: draw-terminals
covered threefold, stalemate, bare kings, progress100 and checkmate in
550.3 seconds (30 checks, zero defects); draw-prompt stayed nonterminal
at 100 quiet actions and paged its history in 332.4 seconds (eight checks,
zero defects). These are finite browser/reference checks, not a speed or
universal rules proof.

The raw matrix-B run above was **red** overall: its mobile scenario imported
and underpromoted successfully, then timed out waiting 30 seconds for the
second browser file chooser. The failure capture showed Preferences with
IMPORT visible, but that version of the test did not record whether Bend
emitted `PickFile` or whether `input.click()` had user activation. Preserve
the raw failure; the six other scenarios in that run passed. Five later
standalone mobile samples passed, including three with a diagnostic hook and
one with a positive route receipt (summary SHA-256
`36ada0ef5eadd1bda6a48c1743c56fd1856d18a3097b73ec7fca2701720d86b5`).
That positive run saw both `PickFile` effects and two file-input clicks with
transient activation active; it does **not** diagnose or erase the failure.
The playtest driver now records bounded effect/click/activation state if the
chooser times out (current driver SHA-256
`5aa36a7170d957db64bb2edbe5249ba488847233bd2f39ccdb5b176c37d2a21e`).
This intermittent import boundary remains open. Passing names across runs
do not establish reliable portrait import, human acceptance, native/GPU
parity, a frame budget, or the reviewed compiler pin.

## Gesture-bound Import draft and controlled delay

A separate *controlled* Chrome reproduction against the exact hosted
`817dfa63932dd6ccf4b4` build delayed the second queued worker input by
6,000 ms. Bend still returned `PickFile`, but the browser file-input click
had `navigator.userActivation.isActive === false` and no chooser opened.
The retained failed summary is
`.artifacts/bend2/playtest-stage2/mobile-activation-delay-6000-20260928/summary.json`
(SHA-256 `9816182f7451747cdb7d06ebd6918d84cac1ea63725f9a379d4fa25f4ead0b92`).
This demonstrates one causal timing hazard; it does **not** retrospectively
diagnose the earlier uninstrumented intermittent mobile failure.

The browser-host draft now opens a provisional chooser during a currently
presented enabled IMPORT gesture (mouse down, touch/pen release or accessible
button click), associates it with the queued input and exact worker reply,
and reads/delivers the selected file only if that reply contains Bend's
`PickFile`. Unmatched/faulted/teardown selections are discarded; a newer
Import invalidates an earlier asynchronous read. The existing Bend `FileText`
validation and browser pre-read size limit remain in force. There is no
effect-time duplicate chooser fallback. No chess Law or Bend compiler input
was changed.

The first local v2 draft (`6923de7ae7dd2b60a741`) passed the intentionally
delayed two-import mobile route on mouse, touch and keyboard separately,
with zero defects. The second provisional chooser clicked with activation
active about 6.35, 6.49 and 6.34 seconds respectively before its matching
`PickFile` effect. Summary SHA-256 values are respectively
`f5bb6e33b0c58ae75a4367f274715d5d21d277e305d61a2ea0f9df813a34b791`,
`7551f1984e12d83479cdacc74e9482095fa7849a3776f4150447f0804111a90d`,
and `c4c3aa1aaf4047df8991051de35573ac0e3ffdc2e67a6d6293cbc669500f55a9`.
They are ignored local draft runs under `.artifacts/bend2/playtest-stage2/`;
they are not hosted publication or a reliability bound. On the later draft
`0259b8b0cac093e21d0a`, defaults, menus, persistence and mobile also
passed undelayed (summary SHA-256
`1c0792d00ed6803f998c7557047291b091e25ebe4ae5d44a5fd4909f992b4841`).
A deterministic port test passed selection before/after authorization,
discard, cancellation, size rejection, supersession, fault invalidation and
unmatched-effect no-duplicate-click. A focused real Chrome cancel/retry and
stale-bounds scenario on draft `ce7e6ff0a2f0f79222dd` passed (summary SHA-256
`38d2a0785110a8b75e9ae0c2dc76586ebf8d725312c5084d727c925256cb03f2`).
Its first script run expected CLOSE after import had already closed Preferences;
the raw red script summary is retained separately. That draft also
passed all 13 extended Chrome groups with an exact served build-manifest
binding, zero page errors and `ok: true`; retained receipt
`.artifacts/bend2/v2-preview/scenarios/import-gesture-extended-draft-20260928/receipt.json`
is SHA-256 `7be472279ad66cd57a50085f4c9966b0bfa1f7dfd071d7f6ac32e2750d0dd45a`.

Independent review then found a touch hold/reflow edge: a release after a
new presented frame could preopen a chooser unrelated to the held press.
The host now binds a held touch/pen Import press to its presentation and
requires the same presented Import bounds at release, otherwise discarding
the gesture without a stray pointer-up. A first attempted reflow test went
red because it checked the frame only *after* release; it did not establish
that resize completed before the release and is retained as test-ordering
evidence (summary SHA-256
`31078d7149d7577cd0104d353b0565b533c51f25b4b630c8815e3bb86f0132c1`).
The corrected scenario waits for a completed Resize frame between a trusted
touch down and up. Three bounded runs on draft `c7056b49df1aa08b4048`
passed with zero provisional clicks and zero `PickFile` effects, summary
SHA-256 values `88e02b6af811b0c836715e4c68d2ee4b13ffb14248911a3af24023a8de12c48c`,
`e8a2be8334762ec51dd755ca50c3bfa26d151a0a43e40756e7897f32c3552b33`,
and `d50641d9aeb8b1146563f26539caf8e761029033cbda5252b84fac33ff4c580a`.
An ordinary two-import touch scenario with the six-second second-input delay
still passed after the guard (summary SHA-256
`edb0c993ffab202c3b1094deccc8763fd133cdfe674e7ec6f8f39be424ab974a`).
The 13-group draft receipt above predates only this small touch guard; the
clean final-source browser gate remains open.

Clean build/publication and owner acceptance remain to be assessed. A
passing controlled delay and finite regression matrix do not establish a
reliability bound on all users' browsers or explain the original failure.
