# Rift Chess: visual and interaction overhaul

Status: planned; implementation and acceptance are pending. This plan is the completion contract for the requested persistent Goal.

## Why the previous release failed

The owner rejected v1.0.0: insufficient visual ambition, apparent missing/transparent/clipping patches on pieces, poor UI/UX, and a loaded tile that could not be Shifted through the attempted interaction, with no visible movability indication. These are release-quality failures. The earlier visual sign-off is superseded by this feedback. Historical receipts remain unchanged as evidence of what was actually tested; they do not establish satisfactory usability or visual quality.

Source inspection already identifies open-ended lathed piece bodies; Shift input gated behind a separate mode despite the default instruction to select a piece or tile; and visual tests that captured camera presets and checked overflow/resource counts without inspecting piece topology or varying camera zoom. These are facts or plausible failure mechanisms, not yet a complete reproduction of the owner's session.

The independent interaction audit confirms that the ordinary piece-selection warning is reachable when Shift mode is false, despite Shift-oriented guidance. Shift visibility is separately gated by a persisted preference. Existing tests preselect the correct mode and click a known tile coordinate, bypassing first-use discovery, passenger clicking and the tutorial entry route. These gaps must be repaired in the acceptance harness as well as in the product.

## Objective and preserved constraints

Deliver a substantial visual and interaction redesign that makes the moving board the defining feature, eliminates rendering defects, makes legal Shifts obvious and reliable, and passes hierarchical visual review followed by comprehensive real-UI playthroughs. Finish with verified free browser and offline Windows releases, source, actual evidence, and honest remaining limitations.

Preserve rules `rift-chess/1.0`, action IDs, checked replay/API semantics, full repetition history, B/C layouts, all three progress policies, default prompted agreement, hotseat and both bot colors, four tutorials, saves/replay, accessibility, offline local search, three environments, two genuinely distinct piece families and material options. Preserve optional ordinary-move hints, temporary reveal, default fully legal Shift indicators, constrained orbit, four camera presets, reduced motion and a fully 3D Low preset. No gameplay accounts, analytics, paid inference, remote runtime assets or model downloads. Future multiplayer remains architectural provision, not added scope.

Work on `codex/visual-overhaul` without a Git worktree. Preserve v1.0.0/tag/artifacts and the original handoff. Record source/build identities for every new acceptance run. Do not overwrite the public release during design iteration.

## 1. Establish reproductions and a defect inventory

1. Reproduce from a fresh browser profile and an existing save, on the public v1 build and a matching frozen local build. Record renderer, viewport, scaling, mode, layout, preferences, camera and input sequence. Distinguish geometric holes, inverted faces, overlapping surfaces, shadow artifacts and camera clipping using targeted inspection.
2. Exercise loaded and empty Shifts without hidden test knowledge: default entry, piece click, tile surface/edge click, keyboard selection, mode switching, turn transitions and tutorial entry. Include clicking the passenger itself, both players, adjacent holes, loaded promotions and a piece whose ordinary moves are blocked but whose tile can legally Shift.
3. Compare rendered feedback with the legal-action set. When illegal, identify the exact rule: passenger count, enemy passenger, anchored king, missing adjacent hole, or king exposure. Never dismiss the reported failure as an illegal action without a reproduced state.
4. Record first-use friction: visual hierarchy, scroll-dependent controls, wrong/stale status, ambiguous toggles, selection cancellation/reselection, replay/live confusion and inaccessible focus. Save before captures and concise traces.
5. Inspect storage before large capture/package runs. Keep evidence bounded and task-owned. Reuse existing runtime tooling; no unrelated cache cleanup, paid assets or dependency overhaul merely for convenience.

Exit: a prioritized reproducible defect list with evidence, owners and regression cases. User-reported symptoms remain acceptance requirements even if their exact original state is unavailable.

## 2. Establish a coherent art direction in the actual renderer

Direction: a precision-built kinetic chess instrument with sculptural pieces, a substantial mechanical frame, layered floating platforms and a visibly deep rift. The board must look striking at first launch and clear at playing distance.

- Rebuild the board's proportions, framing, macro-tile construction, bevels, inlays, undersides and cavity. Tile movement should reveal convincing depth and guided mechanical motion. Use restrained light within the rift to make its form legible, while maintaining clear square/piece contrast.
- Replace the flat backdrop/color-swap treatment with three composed environments: a warm sculptural gallery, a dark observatory, and a bright architectural stone setting. Keep their geometry, lighting and atmosphere cohesive and the active board unobscured.
- Rebuild both piece families as deliberate sculpture: flowing turned forms and dimensional sculpted knights for Classic; distinct planar, architectural forms for Faceted. Require unmistakable pawn/rook/knight/bishop/queen/king silhouettes from both sides and above. A low-sided copy of the same silhouette alone is insufficient differentiation.
- Tune physically plausible ceramic, metal and wood finishes, exposure, broad key/fill/rim lighting, reflections and contact shadows. Material contrast must survive every environment. Avoid glare that erases ivory detail or crushed blacks that hide geometry.
- Author responsive ordinary, knight, capture, promotion and loaded/empty Shift motion. The Shift should be the signature animation, with passenger stability and readable origin/destination. Reduced motion must preserve the same state and clarity.

Build one vertical slice first: a complete board, all six piece types in both colors, one environment, normal play and one loaded Shift. Inspect it at multiple scales before multiplying themes. Use installed modeling tools only after checking their availability; use original closed geometry/assets with explicit provenance. Never accept a concept render or generated illustration as proof of the actual game.

Exit: a materially redesigned playable scene with coherent composition, strong silhouettes and a readable moving-board identity. Main-thread and independent visual review must inspect actual captures and record concrete defects. No self-assigned aesthetic score can substitute for that review; user dissatisfaction is not overruled by technical checks.

## 3. Rebuild interaction and information hierarchy

- Make the board dominant. Replace the two permanently busy side rails with a compact turn/match bar, concise action guidance near the board, a slim history area, and secondary settings/match actions in well-organized panels. Essential move/Shift controls remain visible at supported desktop sizes and Windows scaling.
- Design one explicit interaction state model: idle, piece selected, tile selected, destination preview, promotion, animating, bot thinking, replay and ended. Use one source of truth for mode, highlights, cursor, instructions and accessibility announcements.
- Support direct tile selection through a visible tile affordance, plus an always-accessible Move/Shift control. Selecting a passenger must offer an unambiguous route to moving its tile. A piece click must never silently start a Shift. Highlight the entire eligible macro-tile, its allowed direction(s), and the selected destination hole, using outlines/shapes as well as color.
- Show legal Shift availability from the full king-safe action set for the active side. Make source, selected source, target hole and unavailable tile visually distinct. On invalid selection, explain the precise reason in context. Permit easy reselection and Escape/cancel; do not trap the player in a dead selection.
- Preview passenger transport and destination before commitment. Commit only on deliberate destination action, with promotion selection before the atomic transition. Camera gestures, hover and previews cannot commit moves.
- Redesign new-match setup, guided tutorials, promotion, draw/undo consent, check/game-over feedback, save/import/export and replay as clear flows. Fix stale New game text and keyboard focus loss from rebuilding controls. Explain the selected mode and player's color without an actor dropdown dominating normal play.
- Retain keyboard and non-drag paths, visible focus, contrast and reduced motion. Test touch emulation separately from physical-device claims. Ordinary legal destinations remain hidden by default; this must not hide Shift affordances.

Exit: a user can discover, select, preview, commit, cancel and repeat a loaded Shift through the visible UI, without injected actions or knowledge of implementation-only controls. Mouse and keyboard workflows pass, both armies are identifiable, and status/selection/highlight state agree.

## 4. Diagnose and eliminate geometry/rendering defects

The independent source audit confirms uncapped lathe bodies, triangle-buffer concatenation rather than surface joining, and tiny gaps at some crown attachments. Self-shadowing is a competing explanation for triangular patches in the existing captures. Do not assume that one fix explains every symptom.

- Check finite positions/normals, winding, degeneracy, unintended boundary edges, cap coverage, attachment continuity and coplanar overlaps for all six piece types in both families. Intentional crown openings and bishop cuts need explicit expected geometry; do not fill designed holes indiscriminately.
- Build an isolated piece inspection scene using the actual shipped assets: neutral opaque material, fixed orthographic front/side/three-quarter/top views, 360-degree orbit, wireframe, normals and depth diagnostics. Compare shadows disabled/enabled on identical geometry to separate topology from shadow acne.
- Correct topology and assembly at the source. Do not hide defects with global double-sided materials, bloom, dark exposure, camera restrictions, reduced detail or a flat fallback. Multiple closed components are acceptable when their interfaces are intentional and stable.
- Inspect contact shadow bias/resolution, tone mapping, depth precision and material settings at all supported quality levels. Ensure Low's simplification cannot introduce holes, broken silhouettes or missing Shift indicators.

Exit: no unexplained missing/transparent triangular patches, unintended openings, detached attachments, coplanar flicker, clipped crowns or broken silhouettes across the supported views. A renderer returning no JavaScript errors is insufficient evidence.

## 5. Hierarchical screenshot review, correction and retest

Perform this review before full playthrough acceptance. The hierarchy covers both camera distance and browser/OS scaling; they are different tests.

| Level | Coverage | What must be inspected |
| --- | --- | --- |
| Asset | Six types, two families, both armies; orthographic views and orbit; neutral and final materials | Caps, crowns, mitres, knight anatomy, normals, overlaps, material defects, side/type recognition |
| Detail | One tile, loaded tile, tile seams, cavity, board/frame corners; near camera limit | Bevels, texture scale, contact, depth, passenger grounding, indicator visibility and picking |
| Play | All three environments x two families x three materials x four camera presets, at near/normal/far permitted zoom | 216 primary composition cases; readability, occlusion, glare, holes, clipping, selected/idle/check states |
| Application | 1280x720, 1600x1000 and 1920x1080; browser zoom 80/100/125/150%; native Windows scaling | Board fit, essential controls, panel behavior, focus, dialogs, overflow, history and contextual feedback |
| Narrow/accessibility | 390x844 and tablet landscape; keyboard, high contrast, reduced motion; Low/Balanced/High samples | Usable responsive flows, non-color cues, persistent 3D clarity, no unreachable controls |
| Motion | Ordinary, knight, capture, castling, each promotion class, empty/loaded Shift; sampled start/middle/end and interactive observation | No transient clipping, passenger drift, disconnected parts, stale overlays or mismatched logical state |

Use contact sheets for breadth, then open every suspicious region at original resolution. Cropping/downsampling existing pictures alone does not test a different camera zoom: capture the actual renderer at each required distance. Include both a normal game's populated board and sparse edge-case boards. Inspect both colors on light/dark squares.

Every defect gets a capture, reproduction state, severity, owning file and correction. Re-run the affected asset/detail tests and representative full-board views after each fix. Changes to geometry, lighting, materials, camera or UI invalidate the dependent visual rows; regenerate the final matrix on the final build. Keep a reviewer separate from the implementation writer for final visual critique. No unread screenshot folder, image count, generated mockup or green overflow assertion constitutes visual acceptance.

Exit: every planned row is inspected, all critical/major visual defects are fixed and retested, and no known user-reported render defect is left open. Publish actual before/after examples and review notes. The aesthetic review must explain the improvements in composition, sculpture, material and moving-board identity without claiming objective proof of taste.

## 6. Full real-UI playthroughs after the visual gate

1. Run the 18-session product matrix: hotseat / human White vs bot / human Black vs bot x B/C x prompt/auto100/off. Exercise visible new-match setup, ordinary moves and empty/loaded Shifts, select/cancel/reselect, camera movement, check feedback, settings, save/import/export/replay, and recovery. Use real rendered input for every committed action; setup injection is allowed only for separately labeled edge-case scenarios.
2. Complete at least six uninterrupted real-UI games: four bot games covering each human color and layout, plus hotseat in B and C. Spread progress policies across these games. Play to a real terminal result; planned resignation, agreement or a fabricated terminal setup cannot substitute for these complete games. A run that reaches an action/time budget remains unfinished and must continue from its record or be explicitly replaced. Retain full records and action traces. Automated play is not human usability or Elo evidence.
3. Complete all four tutorials through their visible entry and interactions. Test mouse and keyboard routes; include a novice-style Shift attempt that does not pre-toggle a hidden mode through the automation harness. Verify that visible controls guide the player to a legal loaded Shift.
4. Repeat the full special-rule/ending scenarios: ordinary and Shift Q/R/B/N promotion, loaded/empty Shift, cutting/restoring check, rejected king exposure, king anchoring, passenger-count and enemy restrictions, rook-transport castling loss, pawn transport, en passant and empty-Shift expiry, threefold after save/reload, all policies at 100, mate precedence, stalemate, bare kings, draw acceptance/decline, resignation and approved practice undo.
5. Exercise interruption/state transitions: undo/new game/replay/import while a real worker response is delayed; draw interaction during search; canceled promotion; browser focus loss, resize and background/resume; semantic corruption and unavailable storage. No stale bot action or animation may mutate another game.
6. Re-run deterministic original-reference and TypeScript conformance: all 14 fixtures/223 successors, action-mask/API contracts, history/adjudication tests and relevant new regressions. Preserve immutable original fixtures. Investigate disagreements rather than weakening checks or rules.

Exit: the full mode matrix passes; six complete game records exist; all tutorial and special-rule paths pass through the redesigned UI; and each reported interaction failure has a regression that reproduces its cause. If play exposes another visual defect, return to the visual loop and repeat affected playthroughs after correction.

## 7. Performance, accessibility and distribution gates

- Measure actual frame pacing during idle, orbit, zoom, selected/highlighted board, loaded Shift, captures and bot turns. Record median/p95/p99/max, frame counts, input-to-feedback latency, renderer, viewport, pixel ratio, build identity and activity. Profile main-thread traces to separate search, legality recomputation, DOM work, shader compilation, allocations and GPU cost.
- Target stable 60 fps for Balanced normal play on the measured Iris Xe host and a usable 30-fps floor for Low. Investigate the prior 166-250 ms bot-turn tails. These are engineering targets, not predeclared results: failure requires profiling, optimization and retest or an explicitly unresolved release gate. Preserve art and correctness while removing unnecessary repeated work.
- Exercise repeated restart/theme/material/piece-family cycles, resizing and several games without unbounded resource growth or stuck state. Test keyboard focus order, modal escape/return, readable status announcements, high contrast and reduced motion. Report emulation separately from physical-device evidence.
- Build a new versioned Windows ZIP from the final tested source. Verify all bundled files and runtime licenses, checksum, unpack/launch workflow, fresh offline profile, both bot colors, loaded Shift, save/restart/replay/export/corruption, native scaling and stale-worker behavior. Reuse runtime bytes only with exact artifact correspondence. Do not claim Linux/macOS support.
- Publish the new static build only after acceptance, verify every live asset hash, and repeat public-origin cold offline restart plus actual loaded Shift and bot play. Test upgrade from the existing v1 service worker/save without silently dropping history or preferences.
- Tag and publish the tested replacement release and checksum; verify GitHub's asset digest and exact source tag. Update README, screenshots, playtest evidence and narrative addendum. Preserve the prior release as historical evidence and describe what changed honestly.

Exit: the actual public build and actual downloadable Windows artifact both pass. A local development server or screenshot is not a release.

## Ownership, progress and completion

Use bounded parallel lanes for geometry/assets, renderer/environment, UI/interaction and independent review when independent work is available. Reserve files before writes; root owns cross-cutting interaction contracts, integration, acceptance and publishing. Existing rules/match/API behavior stays under deterministic regression checks. Avoid duplicating the same test or expensive screenshot sweep across agents.

Progress milestones are evidence-based: baseline/reproduction 10%; accepted vertical slice 25%; integrated art and interaction redesign 50%; completed hierarchical visual loop 70%; mode matrix/full games 85%; final native/public release proof 100%. Writing this plan or generating a mockup does not advance implementation to those milestones.

Before completion, audit and remove replaced geometry builders, redundant mode/state representations, stale instructions, obsolete visual tests, temporary diagnostic paths and old app screenshots used as current marketing. Preserve immutable original research and previous-release evidence with clear historical labels. Keep only named compatibility obligations for saves/API, not duplicate UI implementations.

Do not mark the Goal complete because time, tokens or a screenshot batch ran out, because a reviewer liked one image, or because unit tests passed. Completion requires the visual redesign, geometry fixes, visible reliable Shift interaction, complete screenshot/retest hierarchy, full real-UI playthrough matrix, and verified new public/Windows releases. Surface blockers precisely and continue independent work; do not lower the requested standard silently.
