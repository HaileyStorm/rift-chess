# Implementation verification and playtesting

These are automated browser/native application checks and visual inspections, not human usability research, strength ratings or a balance study. Original research remains unchanged under `research/` and in the retained handoff ZIP.

## Rules and API

- Original Python suite: **67 passed**, 69.52 seconds on Python 3.14.2.
- Isolated reference verifier: **120 histories / 14,290 actions**, 14 fixtures / 223 successors and orthodox perft **20 / 400 / 8,902 / 197,281** passed. Original fixture bytes still match the ZIP and original manifest. Regenerated JSON is semantically identical; serialization bytes differ.
- TypeScript checks compare every fixture action ID, metadata field, complete successor state, hash and outcome, then replay all 120 histories. Additional tests cover strict imports, unchanged state on rejection, real save/load repetition cycles, stale requests and an interrupted-search legal fallback.

## Pass 1: mechanics and interaction

`scripts/playtest.mjs` drives actual canvas clicks. Fixture loading only establishes an edge-case position. The observed post-click logical state must match the expected result.

The pass exercised ordinary movement, hidden/temporarily revealed hints, loaded and empty Shifts, check cutting/restoration, king-exposing rejection, Shift underpromotion, backward pawn transport, orthodox castling, en passant, prompted/automatic progress policies, checkmate precedence, repetition, draw acceptance/decline and camera gestures that commit no action.

Observed failures and corrections: the early UI exposed inactive replay controls through a CSS display override; they are now genuinely hidden. Temporary reveal was separated from the persistent hint preference. Actor selection, draw-response controls, undo consent and stale bot handling were corrected. Development hot reload invalidated an early automation context, so subsequent acceptance runs used a frozen production build.

`scripts/lifecycle-playtest.mjs` extends these checks to every Q/R/B/N ordinary and Shift promotion, rook-transport castling-right loss, fresh-pawn transport, en-passant expiry on an empty Shift, all three policies at 100, prompt dismissal and undo, repetition after browser reload, stalemate, bare kings, nonmoving-player resignation, replay status, cancelled new-game dialogs, raw-record import and semantic-corruption recovery. An experimental CDP worker-stop step stalled and was replaced with a full browser-process offline restart check; that stalled attempt is not counted as a pass.

## Pass 2: visual quality and comfort

Two matrices each captured **24 environment/family/camera combinations**, plus 1280×800 Low/reduced-motion and 390×844 mobile layouts. Material choices were rotated through ceramic, metal and wood; this is a sampled matrix, not every material/environment Cartesian combination. Both matrices included **20 restart/style cycles** with bounded geometry/texture counts.

Initial captures showed overlit ivory, dark-piece loss of detail, weak macro-tile seams, a shallow-looking gap and ambiguous strict-overhead crowns. Corrections lowered glare, lifted dark-material midtones, added wood grain, deepened the platforms/cavity, widened macro gutters and crown signatures, and gave Top a small pitch. Piece assemblies were merged without removing their geometry: the opening draw-call count fell from **493 to 343** in the recorded comparison. A second inspection found no remaining high-severity visual defect in its sampled corrected views.

Windows' 150% scaling revealed a separate clipping problem. The desktop board now uses the available viewport while side panels scroll independently. Reduced motion preserves the real 3D scene.

## Pass 3: complete games and distribution

`scripts/complete-game.mjs` chooses moves using a simple capture/pawn-advance heuristic with deterministic noise, then commits them through the canvas. The opponent is the actual shipped worker.

- **B-rift, automated player as White:** Black checkmated after **30 board actions**.
- **C-rift, automated player as Black:** coverage ended by deliberately scripted Black resignation after **25 board actions**.
- Both records survived reload; browser reload with networking disabled also passed.

An earlier attempt stopped when the harness clicked before a bot Shift's animation was ready. It is retained as unfinished. Waiting on the real animation-ready state resolved the harness timing issue; no rule or outcome was altered to finish the test.

The initial Windows ZIP was expanded with Windows `Expand-Archive` and launched using its own Electron executable in an isolated profile. Native session offline emulation, a real piece move and local worker reply, normal process close/restart, replay export and corrupt import rejection passed. Browser-only `navigator.onLine` and Playwright download-event assumptions were replaced by the appropriate Electron session/download APIs. Final distribution checks and source/artifact hashes are recorded alongside the release evidence.

## Reproduction and limits

Build with `npm run build`; serve the resulting `dist` using a local static server for browser automation. The scripts accept `RIFT_TEST_URL` where applicable and write real receipts/screenshots under ignored `.artifacts/` directories. They fail rather than turning a budget cutoff into a draw.

The measured development host is Windows 11 Pro x64, Intel Iris Xe, driver 32.0.101.7026. Browser checks use isolated Chrome through ANGLE/Direct3D11; the Electron 44.2.0 artifact embeds Chromium 152.0.7977.76. Timing windows, viewport and quality are part of each measurement. No Linux/macOS execution, human feedback, universal 60-fps guarantee or strong-play balance result is claimed.

## Final v1.0.0 distribution and timing

The final source passed 35 TypeScript tests across four files, type-check/production build, the documented action-20825 API example and a full dependency audit with zero reported vulnerabilities. [Curated receipts and screenshots](evidence/README.md) include both complete-game records and exact build hashes.

The final 158,421,121-byte Windows ZIP has SHA-256 `490948e090e8c324701350777ae39cbeb540442dfbd4874f77ea1ed0de33f692`. Every one of its 74 file entries was streamed and hash-compared with the tested runtime directory. An earlier candidate was physically expanded with Windows `Expand-Archive`; tight local storage made byte-equivalence checking preferable to another runtime copy for the final artifact. The final packaged executable passed all five native checks again, and its actual 150%-scaled window was visually inspected with the complete board visible.

Timing below measures requestAnimationFrame callback intervals on the Intel Iris Xe/D3D11 host at a 1600×1000 CSS viewport (968×815 canvas). Only one project test browser ran; ordinary background desktop activity and ZIP packaging were not suppressed. Each activity window includes actual input, animation and settling. These are descriptive samples, not controlled comparative benchmarks. Low and Balanced samples were sequential and are not a proof that one is always faster.

| Activity | Balanced median / p95 (ms) | Low median / p95 (ms) |
| --- | ---: | ---: |
| Idle, five seconds | 16.7 / 33.4 | 16.7 / 33.5 |
| Right-drag orbit | 16.8 / 33.5 | 32.8 / 33.5 |
| Loaded rook Shift and settle | 16.8 / 50.0 | 16.7 / 49.9 |
| Capture and settle | 33.3 / 66.8 | 16.7 / 33.6 |
| Human move, worker thought and reply | 16.8 / 250.0 | 16.8 / 166.0 |

The worker keeps search outside the UI thread, but the end-to-end bot-turn windows still include substantial stalls. Smooth universal 60-fps operation is not established. Further profiling of commit-time legality/highlight work and frame tails remains useful. All samples and counts are retained in `evidence/performance.json`. An initial performance scenario placed a capture target on an absent square; validation correctly rejected it. The test setup was corrected, then the complete measurement script passed.

The v1.0.0 obsolescence audit removed Forge and its configuration/dependency chain, retained only the manual Electron packager, and kept inherited reducers/research solely as provenance or non-public reference code. Original manifests describe the original package, not later source additions. The original README remains recoverable from the unchanged provenance ZIP. A minor cosmetic limitation remains: the selection/status sentence can retain the preceding action after New game, while the board, turn and history reset correctly.
