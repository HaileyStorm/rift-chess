# Verification record

The initial core and pixel semantics were frozen only after all five readiness
gates passed on unchanged source. Normal builds verify the semantic hashes and
the exact proved Kernel/witness hashes. The attestation and compact receipts are
under `laws/` and `docs/evidence/laws-v1/`.

| Evidence | Result and scope |
| --- | --- |
| Bend core checker | 13 laws close; exact `All terms check.` with no TODO, unsafe or foreign dependency in the proof cone. |
| Negative probes | Six focused mutations reject with expected diagnostics; every focused unmodified control passes. |
| Reference comparison | Both starts and all 14 reference scenarios/223 successors; 269 checks through public Kernel APIs. |
| Match comparison | 33 checks including stale revisions, undo, offers/agreement, resignation, repetition, legal-effective EP, auto-100 and mate precedence. |
| Pixel checker | 11 sampling and empty/outside-fill laws close. |
| Pixel runtime | 21 boundary checks plus 100 small fills and samples. |
| Projection | All 262,144 floor pixels plus 64 centers agree with independent integer geometry. |
| Browser | Real Chrome pointer moves for both sides, Shift, undo, record reload, captures, underpromotion, terminal recovery, local bot, menu/mobile layout and cold offline play. |
| Host failure checks | Rapid replay/new-match invalidation, bot pause persistence, malformed-record preservation, and an explicitly injected rendering failure/retry. |

Local browser receipts currently live in these ignored, preserved run folders:

```text
.artifacts/bend2/browser/2026-09-22T12-51-33-230Z/
.artifacts/bend2/scenarios/2026-09-22T13-09-55-720Z/
```

The scenario run also checks that a Warm lighting change affects actual pixels
after renderer recovery and that user gestures start actual Web Audio nodes.
This does not certify a listener's speakers or subjective sound quality.

Failures were useful and retained: a Windows import-path defect, expensive proof
normalization and stack exhaustion, fresh-pawn/EP rule errors before freeze,
invalid DOM selectors, a click superseded by hover, stale animation progress,
Undo record decoding, and a test predicate that attempted to parse a deliberately
corrupted save while waiting for its replacement. These were corrected and the
relevant paths rerun. No frozen law was weakened to make the checks pass.

## Separate public preview

[The Bend2 preview](https://haileystorm.github.io/rift-chess-bend2/) was deployed
and play-tested on September 22, 2026. The static build is
`f8cbc16e5ba51a2b9ee5`, from clean source commit
`6d74914a15ce15add5b56c53a0a48dcca42a02bd`; its deployment commit in
`HaileyStorm/rift-chess-bend2` is `5af1a229de8a0817e4aeebe322a1de8f682eb56e`.
Subsequent documentation/test-only commits do not change those application bytes.

- [Publication receipt](evidence/preview-v1/publication.json): every live asset
  returned HTTP 200 and matched the local SHA256. The original site's index and
  precache manifest remain byte-for-byte unchanged.
- [Hosted browser receipt](evidence/preview-v1/browser.json): all ten scenario
  groups passed with no page/console errors, including a real offline move.
- [Inspected rendered frame](evidence/preview-v1/board.png): the live Warm court.

The hosted run loaded the original game first. Both service-worker registrations
and cache namespaces survived, the preview acquired its own controller, and the
original save stayed unchanged. A sibling Pages URL is necessary because the
original offline worker intentionally serves its app shell for unknown nested
navigation routes. The rejected nested staging copy remains only in ignored
local artifacts; nothing was pushed to the production Pages branch.

To repeat the hosted scenario test, set `BEND_TEST_URL` to the preview URL and
`BEND_TEST_ORIGINAL_URL` to `https://haileystorm.github.io/rift-chess/`, then run
`node bend2/tests/historical/browser-scenarios.mjs` on the historical source revision. Use a new `BEND_PLAYTEST_RUN` name to
preserve each receipt. The worker fault injection is explicitly limited to the
renderer recovery scenario; ordinary play uses actual pointer and menu inputs.

The source compiler/runtime and browser adapters remain trusted. Reference
coverage is finite. This is local Chrome exercising the public deployment,
not a cross-device survey. There is no native Bend CPU/GPU benchmark, packaged
Bend desktop release or user aesthetic acceptance claim.

## Camera and open-gap follow-up

Source `a0599ba00e6243f9d4ba4386e2ff8abcbbaa7bf4` adds a shared Bend camera,
projected quads and browser controls. Build `8106a3f0fed5f9274f95` retains the
original semantic and pixel-law hashes; no law or normative dependency changed.
The prior fixed-isometric projection receipt remains historical evidence for
preview-v1, and the current presentation contract is in `PICKING_CONTRACT.md`.

- `tests/picking.ts`: 2,304 finite checks including reversed orientations and
  overlapping sprites. An initial overlap fixture used non-overlapping squares;
  it was corrected, as was a test call passing signed coordinates into a U32 API.
- `tests/camera-render.ts`: 4,640 checks across 48 grounds, including open-gap
  interior masks at shallow/oblique angles and hollow Shift/hover feedback.
- Strict host TypeScript and Bend facade checks pass. The normal build verifies
  both frozen semantic manifests and the previously proved witnesses.
- [Local camera browser receipt](evidence/camera-v1/local-browser.json): seven
  scenario groups pass without browser errors. Review findings about cancelled
  clicks and rewound animations were fixed and exercised with explicitly timed
  pick latency and a camera change during a real move animation.
- The existing capture, promotion, bot, import/recovery and cold-offline browser
  scenarios pass at `.artifacts/bend2/scenarios/2026-09-22T14-08-53-107Z/`.
- [Inspected oblique frame](evidence/camera-v1/oblique.png) shows the background
  through the missing platforms. Camera math and quad rasterization are tested
  presentation code, not new formally proved laws.

The follow-up is live at the same separate preview URL. Deployment commit
`3388c9cebe738736c9404c7e75740da340ff189b` matches the clean source build above.
[Publication hashes](evidence/camera-v1/publication.json) verify all seven live
assets and the unchanged original game's index/precache bytes.
[Hosted camera play-tests](evidence/camera-v1/hosted-browser.json) pass all seven
scenario groups with no browser errors.

[The returning-profile check](evidence/camera-v1/upgrade.json) retains an exact
save created on preview-v1, resumes it with a real overhead-view knight move,
then reloads cold offline and accepts Undo. An ordinary initial navigation used
the browser's cached old app shell; an explicit browser refresh loaded the new
controls. Existing open tabs therefore need a refresh, with no save clearing.

## Whole-application follow-up

The previous sections describe the published hybrid version. Current source puts
the complete application in Bend, with generic browser IO and native Base effects.
The source-law boundary is expanded in `LAWS_V2.md`; the reusable graphics package
has its own source freeze and colocated proofs under `lib/graphics`.

The closed v2 manifest is `laws/semantic-v2.json` (SHA-256
`c8dcce907c3c3a6f70e9dfa12a74966879f30ea338b2734637c9acf4579943bf`).
Its readiness, six positive/negative mutation controls, and independent accepted
review are pinned under `docs/evidence/laws-v2/`. The aggregate checker closes
134 named laws in 19 proof/API and 18 declaration modules, with no open, unsafe
or foreign proof dependency. All 14 canonical reference positions and 223
successors pass. Independent specification of canonical membership/order,
move/Undo ledgers, both actor colors, draw/resignation and adjudication prevents
the six selected regressions from hiding behind an implementation-owned oracle.
Geometry attacks and admissibility remain shared trusted definitions, and a
structurally admissible puzzle is not necessarily opening-reachable.

The final local rendered run is
`.artifacts/bend2/native-ui/whole-app-copy-final/receipt.json`: 17 scenario
groups pass without browser errors. Actual canvas interaction covers both-color
moves, selection toggles, hotseat Undo consent, off-turn actor choice, capture and
underpromotion, Shift, bot play, full menus, mobile overflow, records and
recovery, actual Web Audio starts, and cold offline play. A separate keyboard-only
accessibility-control run starts Web Audio through the same Bend PCM effect.
Inspected desktop, mobile, selected-piece and actor-chooser frames are in that
run folder. Failed attempts remain retained beside passing receipts.

The generic incremental image port was compared against the original full blit
for 28 actual emitted frames (91,750,400 bytes) with exact equality. On build
`f007dd10a4ee3aa67708`, warm Bend camera computation measured 48 ms median and
pixel transport 8.6 ms; end-to-end worker replies measured 60 ms median under
concurrent host load. Cold and p95 times are higher. These results do not promise
a particular frame rate on another device. A 4×4 motion-ground experiment gained
only 1.5 ms while worsening edges, so the existing 2×2 motion pass was retained.

The graphical native source check passes with 32 explicitly unsafe/effect-bound
wrappers, and pure framing, recovery, modifier and audio-capacity tests are
separate evidence. Two bounded 600-second full graphical C-emitter attempts did
not produce C. The smaller text CLI emitted C under the pinned Bun compiler;
the source-bound export manifest and platform execution evidence are recorded in
`NATIVE_CLI.md`. C emission does not certify a linked native binary or graphics/
audio device behavior.

## Whole Bend release

The separate [Bend game](https://haileystorm.github.io/rift-chess-bend2/) now
serves build `393b72283975d6018b1d` from clean source commit
`1a6d7d9c32dad19612327ac3eb3f1fd54a18ca07`. Pages commit
`4061647e997ac34dec01ae8db965cbcfd1a44433` contains only static output,
retained older hashed assets, a source pointer and the content-addressed CLI C.

- [Publication receipt](evidence/whole-app-v2/publication.json): all eight
  build assets, the C file and both original-game baseline assets returned HTTP
  200 with exact SHA-256 matches. The original release bytes remain unchanged.
- [Hosted browser receipt](evidence/whole-app-v2/hosted-browser.json): all 17
  rendered scenario groups pass, with no page errors, including actual PCM Web
  Audio starts, mobile controls and a cold offline move.
- [Returning-profile receipt](evidence/whole-app-v2/upgrade.json): a saved match
  from build `8106a3f0fed5f9274f95` survives the upgrade, real Undo, a cold
  offline reload and a fresh New Match. The test waits for the new app's bounded
  history replay before invoking Undo.
- [Inspected selection](evidence/whole-app-v2/selected.png),
  [off-turn chooser](evidence/whole-app-v2/actor-chooser.png), and
  [mobile destinations](evidence/whole-app-v2/mobile.png) are actual hosted
  frames, not mockups.
- [CLI C manifest](evidence/whole-app-v2/native-cli-export.json) binds the
  frozen law, compiler, complete Bend source closure and exported C SHA-256.

The original Three.js release and its checkout remain unchanged. Supported-host
CLI binary execution, native GUI C emission, native CPU/GPU performance and owner
visual acceptance are outside this evidence.

## Stage-two migration in the main checkout

The Bend adaptation is now under `bend2/` on `codex/visual-overhaul`, beside the
working original TypeScript application. The controller is split into Bend
`State`, `Records`, `Commands`, `Actions` and `Program`; browser code remains an
IO/pixel/audio adapter. Amendments 001–003 document the earlier pin and English
law corrections. [Amendment 004](../laws/amendments/004-base-foreign-paths.json)
binds a Base-only foreign-effect path fix in the frozen loader and strengthens
mutation receipt coverage to the complete v2 frozen input set. Its five
[reviewed receipts](evidence/amendments/004-base-foreign-paths/) passed without
editing a law, proof, rules implementation, fixture or upstream compiler.

The [local stage-two receipt](evidence/stage2-local/receipt.json) binds the full
ignored Playwright summary: 18 rendered scenarios and 787 checks passed with
zero recorded defects, including both bot colors, checkmates, castling, en
passant, underpromotion, platform Shifts, draw endings, Undo, import/recovery,
offline play, keyboard/camera interaction, mobile menus and viewport resizing.
The test replays committed records on the TypeScript reference and saves whole,
regional and detail captures. The inspected [selection](evidence/stage2-local/selected.png)
and [mobile move panel](evidence/stage2-local/mobile.png) are actual local frames.
The normal semantic freeze, v1 proof/conformance suite, v2 aggregate proof and
finite conformance, six positive/negative mutations, graphics-library checks,
non-draft browser build, root 62 tests and root TypeScript check passed.

Stage two is now live at the separate [Bend preview](https://haileystorm.github.io/rift-chess-bend2/).
The clean non-draft asset version `361b9895746876a71757` binds source commit
`78287a12b6b1098657096864b5193420789c249d`; Pages commit
`de4d45eea7c05e433df27392d4508217340d379f` retained older hashed assets.
The [publication receipt](evidence/stage2-hosted/publication.json) confirms all
eight current browser assets, the new content-addressed CLI C source, and the
original game's two baseline files returned HTTP 200 with exact SHA-256 matches.
The [hosted rendered receipt](evidence/stage2-hosted/receipt.json) binds 18
passing scenarios, 787 checks, zero defects and the full ignored Playwright
summary hash. The [hosted selection](evidence/stage2-hosted/selected.png) and
[mobile move panel](evidence/stage2-hosted/mobile.png) were inspected. The
[CLI export manifest](evidence/stage2-hosted/native-cli-export.json) binds the
same clean source revision and v2 semantic hash; it proves C emission, not a
native binary or device run.
An exact three-command saved record from build `8106a3f0fed5f9274f95` was
seeded by [`tests/returning-save.mjs`](../tests/returning-save.mjs) into a fresh
isolated browser profile on the new hosted site. It replayed
without altering its bytes, accepted a real canvas Undo with hotseat consent,
and survived a cold offline reload. The [returning-record receipt](evidence/stage2-hosted/returning-save.json)
and inspected [offline frame](evidence/stage2-hosted/returning-offline.png)
prove record compatibility; seeding into a fresh profile is not a direct test
of an old service worker upgrading in place.

Local move-tick p95 was 608 ms; hosted p95 was 668 ms. Local bot reply medians
were 721 ms (White) and 542 ms (Black). These are measured responsiveness
limits on this host, not native parallel performance or broad-device acceptance.

## Source-bound v2 worker and artwork publication

The newer non-draft browser build `f261f9d623e679d401f7` from clean source
`bfc069dc2b4ebd1bdd96e5111073e3243f642beb` is live at the same separate
[Bend preview](https://haileystorm.github.io/rift-chess-bend2/). The
[publication and hosted receipt](evidence/v2-workers-hosted/README.md) binds
all 21 asset hashes, JavaScript MIME for the static bot modules, 11 passing
rendered scenario groups, a cold offline sprite-helper refinement, and two
online/offline local-opponent replies. The direct helper library's job/result
gate is separate; the hosted bot test proves module loading and completed
replies but does not instrument the helper job counter. Native visual parity,
GPU game performance, and owner visual acceptance remain open.
