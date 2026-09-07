# Rift Chess — engine, local AI, API and delivery

This specification is **stack-agnostic**. The selected implementation may use a different language or renderer, provided it preserves the contracts and acceptance tests. The [product design](03_PRODUCT_DESIGN.md) is equally part of the release target.

## 1. Separate truth from presentation

Use five boundaries:

```text
Human input / local bot / trusted local agent
                    |
          versioned command boundary
                    |
        match controller + history ledger
                    |
      pure position rules + legal generator
                    |
          committed state + event record
             /                    \
   3D presenter / UI          saves / replay / tests
```

The pure rules layer has no canvas, scene graph, timers, audio, DOM, network or GPU dependency. It generates legal actions and returns a new state. The match controller owns draw policy, full repetition history, offers, resignation and undo. The presenter consumes committed changes; it never decides legality from collisions, mesh positions or a physics engine.

A search worker receives an immutable match snapshot. Its answer is advisory until the controller validates game identity, revision and current legality. Rendering, changing theme, toggling assistance and moving the camera do not alter the position.

Do not treat an orthodox chess library as a complete engine: holes, transported first-move rights, Shifts and terrain-sensitive check invalidate many stock assumptions. Such a library can still be an independent oracle for **zero-hole orthodox regression tests**.

## 2. Included implementation and its boundaries

`reference/sliding_chess_sim.py` is the supplied research generator, preserved unchanged for provenance. It contains ordinary moves, terrain attacks, Shift generation/reduction and old experimental agents.

**Use `reference/rift_core.py` as the final-rules entry point.** It adds checked actions, final draw policies, effective-en-passant repetition, validated imports, match history, replay, draw offers and a bounded offline search opponent. `reference/rift_cli.py` exposes it through local newline-delimited JSON. Both use Python's standard library at runtime.

The legacy `terminal_status()` and `play_game()` force the old 100-action ending and must not be used as the finished game's adjudicator. Raw `apply_action()` assumes an already legal action and must not be exposed to untrusted callers. The old unrestricted experimental variants are not shipping settings.

The reference is useful executable evidence, **not a fully optimized, independently certified or hardened production engine**. Porting to another language is encouraged when that makes shipping cleaner. Players must not need Python merely because the handoff reference uses it.

## 3. Position and match data

### Position

The reference board is an integer array of shape **[64]**, indexed `rank * 8 + file`, with `a1=0`, `h8=63`. Positive pieces are White; negative pieces are Black.

| Absolute code | Meaning |
|---:|---|
| 0 | Empty present square, or unused storage under a hole |
| 1 | Pawn whose initial two-square right has been consumed |
| 2 / 3 / 4 / 5 / 6 | Knight / bishop / rook / queen / king |
| 7 | Pawn retaining its initial two-square right |

A separate 16-bit `holes` mask identifies the two missing macro-cells. Macro indexing is `macro_rank * 4 + macro_file`, with A1=0 and D4=15. All four board slots below each hole must be zero.

Additional fields: `side` (+1/-1), four castling-right bits, `ep_target`, `ep_pawn` (-1 when absent), `halfmove` (variant quiet-action counter), and `fullmove` (display numbering). The macro mask, not the tile meshes, determines square presence.

A production implementation may use typed arrays, bitboards or structs instead. It must preserve fresh-pawn rights and the exact meaning of every field when exchanging records.

### Match

Store initial position, action history, repetition ledger, rules version, action-encoding version, draw policy, terminal result/reason, pending draw offer and a monotonically increasing session revision. A new/reset/imported match gets a new session/game identifier, even when its initial board matches an old one.

Cosmetic physical tile IDs are allowed in renderer state to animate a persistent mesh. They are **not** part of rule identity. Replays reconstruct tile movement from source/destination actions without requiring those IDs in the canonical position.

### Validation

Reject missing/duplicate kings, wrong hole count, pieces under holes, invalid piece codes, incoherent en-passant geometry, fresh pawns off their starting rank, and impossible castling-right placement. A pawn on its own back rank is valid; on its promotion rank it must already be promoted. Reject a position with the previous mover's king in check.

Position validation is not a proof of historical reachability. Imported puzzle castling flags assert original-rook identity. Full game imports should therefore use replay records, not untrusted arbitrary board snapshots masquerading as completed game history.

## 4. Legal actions and atomic updates

Generate ordinary pseudo-moves with terrain-aware rays, pawn paths, en passant and orthodox castling. Generate adjacent-hole Shifts satisfying occupancy and king-anchor rules. Expand every legal promotion into four distinct choices. Apply each candidate to a temporary state and reject it if the mover's king is attacked afterward.

For a Shift, clear the source macro-cell, translate at most one passenger by exactly two ranks/files, consume movement rights, promote if appropriate, replace the hole mask, expire en passant, update the progress counter and alternate side. All are one atomic update.

Generate castling with intermediate king-square checks, not merely final-position safety. Do not define attacked squares by asking whether the opponent has a legal capturing move; that mishandles pinned attacks and can recurse through check validation.

A public command selects a member of the current legal-action list. It cannot directly supply trusted `castle`, `en_passant`, capture-victim or promotion effects. Return structured rejection reasons and leave state untouched after any rejected command.

## 5. Stable action encoding and masks

The reference exposes version `rift-action/1`, with a sparse integer space of shape **[21760]**. Promotion index `p` is 0 for none, 1 queen, 2 rook, 3 bishop, 4 knight.

```text
ordinary move ID = 5 * (64 * source_square + destination_square) + p
Shift ID         = 20480 + 5 * (16 * source_macro + destination_macro) + p
```

IDs encode intent, not permission. Many combinations are impossible; legality comes from the engine. A dense Boolean mask of length 21,760 or a sorted sparse list of legal IDs can be provided to future agents. The current CLI returns the sparse list with readable metadata. Castling and en passant are inferred from the legal move's current state.

Example: ID 20825 is Shift A2 → B2. ID 3980 is an ordinary e2 → e4 intent; it is legal in the B opening but not the C opening, where e3 is absent. Underpromotions have different IDs. Reserve a new encoding version before changing the mapping.

Draw offer/accept/decline, undo and resignation are separate match commands, not artificial board moves inside this policy action space.

## 6. Versioned API: local by default

Required operations are new/reset, observe, legal actions, checked step, export/load record, result, and local bot suggestion. Practice adds undo. Match controls add offer/accept/decline draw and resign. An asynchronous search API needs cancellation or safely discarded stale replies.

Every asynchronous mutating request should identify `game_id` and `expected revision`. A returned move must match both when committed. Position hashes are useful diagnostics but are **not sufficient**: an identical board can have a different repetition history or progress count.

The included process adapter accepts these commands as NDJSON on stdin and writes exactly one JSON reply per input line on stdout. Diagnostics belong on stderr. It requires no port, HTTP server or internet access. See [reference instructions](../reference/README.md) for live examples.

The production engine can expose an in-process module and a worker message protocol with the same semantics. A future native adapter can add trusted local subprocess stdio. Local HTTP/WebSocket is an optional later convenience, not a hosted service or a launch requirement; bind loopback only, use authentication/origin controls and never enable unrestricted execution from a web page.

An external local AI binary has the user's privileges. Require explicit selection/approval, constrain allowed commands, bound message size and resource use, and never run an executable merely because a game record names it. The supplied CLI's input cap is 1 MiB per line; record replays additionally bound action count. Future larger training exchanges should use an explicitly versioned streaming format rather than silently removing limits.

## 7. Repetition, hashes and saves

Canonical repetition identity contains rules version, board codes, holes, side, castling rights and **effective** en-passant metadata. Ignore en passant if no legal immediate capture exists, including the pinned-pawn case. Fresh-pawn information is already encoded in the board.

The reference `position_hash` is SHA-256 of that canonical JSON identity. It deliberately excludes progress count, move number, draw policy, history and cosmetics. **Do not use it alone as a transposition-table or training-state key.** Search adjudication must also account for progress/draw policy and path repetition. A cache may reuse geometry-only legal actions, but not blindly reuse a terminal result from another history.

`rift-record/1` stores the initial position, full ordered action IDs, rules/action versions, policy, pending offer, any agreement/resignation result, and final position hash. Loading replays every action to rebuild rights and repetitions and rejects an invalid sequence or inconsistent hash. The reference verifies terminal overrides against allowed metadata; it is a local replay format, not a cryptographically authenticated competition record.

Production saves should be atomic: write a temporary file, flush as supported, replace, and keep a small recovery copy. Autosave after every committed action. Local settings and cosmetic preferences belong in a separate schema. Saving a preview or mid-animation mesh transform instead of the committed match is incorrect.

Replays can animate past actions, but reviewing them must not mutate the live match until the user explicitly branches into practice. Store version and layout visibly; reject unsupported rules versions instead of silently interpreting them as current.

## 8. Local bot at launch

Ship a real, legal offline opponent rather than a disabled “AI coming soon” button. A search worker can port the included `suggest()` implementation: iterative deepening, full-width alpha-beta, terminal checks, bounded nodes, seeded tie-breaking and a legal fallback when interrupted.

The reference evaluates material and modest piece-square/king-safety terms inherited from chess. These are initialization heuristics, not trained Rift values. It includes every legal Shift and promotion; ordinary chess engines cannot be substituted without adding terrain and Shift semantics.

Default to a quick beginner setting with a documented node budget. A second budget setting can provide a more deliberate opponent without claiming an Elo rating. Never freeze the renderer while it thinks. Show a quiet thinking indicator and keep camera/settings responsive. Returning the last completed search iteration is preferable to committing a half-evaluated illegal/stale suggestion.

The new audit's bounded two-ply challenger won 8/8 against the noisy one-ply baseline. That supports including a small search opponent; it does **not** measure strength against humans or strong engines. No neural model or paid API is required.

Future improvements can add mobility, terrain-aware king escape, promotion access and ordering. Treat orthodox quiescence assumptions cautiously: an empty Shift can create check or answer it. Never prune all Shifts as “quiet and irrelevant,” or stand-pat while in check.

## 9. Training compatibility without building a training platform now

Keep deterministic seeded reset, a renderer-free step, a legal-action mask, complete versioned replay and explicit terminal reasons. Make batch/vector environments possible through independent match instances, not shared mutable UI state. Avoid global random state in the engine.

A future neural observation could use **[16, 8, 8]** planes: twelve piece/color planes, two fresh-pawn planes, present-square mask, and side-to-act plane; plus castling, effective en passant, progress and policy metadata. This is a suggested representation, **not an implemented neural model**. Those planes alone are not fully Markov for repetition. Supply the necessary history/ledger, or explicitly define and disclose a different training environment.

Use two-player zero-sum semantics. Record the absolute winner as +1 White, -1 Black or 0 draw, then convert reward to the learner's perspective explicitly. Do not inadvertently flip reward according to the post-move side. Keep meta draw offers outside the initial training policy unless deliberately modeled.

Distinguish `terminated` (checkmate, agreed draw, automatic draw, resignation) from `truncated` (episode/time/compute cap). An unfinished training episode must not be labeled a chess draw. Bootstrapping at truncation depends on the algorithm; the environment must preserve the distinction. See [S10](RESEARCH_SOURCES.md#s10-training-termination-and-truncation).

Later local neural inference should be an optional adapter with explicit model/license selection and locally available weights. No automatic online model retrieval, telemetry, subscription or hosted inference is required. Human play must continue working when that adapter is absent.

## 10. Test and play-test contract

Start by running the included 67 tests. Reproduce the zero-hole opening perft series 20, 400, 8,902 and 197,281. Then port the **14 fixture positions and all 223 expected successors**, comparing legal IDs, board data, hole mask, rights, counters and results—not only piece locations.

The golden fixtures are generated by the reference and test cross-language parity, not independent mathematical truth. Add independent hand-constructed edge cases and, where practical, an orthodox-library differential suite. Retain tests for effective en passant, king-exposing Shifts, two destination holes, loaded castling-right loss, backward-own-rank pawn transport, every promotion choice, checkmate precedence, repetition after save/load and immutable rejection.

Random legal play must preserve exactly fourteen tiles, one king per side, no pieces in holes and no self-check by the previous mover. Color exchange plus rank reflection must preserve legal action sets. The included suite checks 256 such positions and 1,000 random committed actions.

Replay all 120 fresh experiment histories; the included verifier checks 14,290 actions. A UI port should replay the same traces without depending on animation timing.

Beyond unit tests, the release requires real rendered interaction tests and manual/agent visual inspection. Playwright snapshots are useful, but rendering varies across environments; document the browser, OS and GPU. A screenshot-golden failure should be inspected, not accepted automatically. See [S11](RESEARCH_SOURCES.md#s11-browser-playtesting).

## 11. Offline sharing and desktop delivery

The **player workflow** is download a release, install or unpack, launch and play. No local development command, CDN, account, server registration, Python installation or package manager is acceptable as the only player workflow.

Development may use a local browser preview and build-time internet downloads. Those are not hosted gameplay. GitHub may host the repository and release binaries because the user explicitly wants distribution there; no game session or AI depends on GitHub after download. Do not deploy GitHub Pages or another public game host without changing the approved no-hosting decision.

Bundle all runtime assets, fonts, sounds, shaders and bot code. Test an actual release with network access disabled, including first launch and save/load. A standard modular web build opened with `file://` is not automatically a reliable offline deliverable; Three.js's installation guidance discusses the need for a server in ordinary development. Package a runtime or explicitly verify a standalone alternative. See [S5](RESEARCH_SOURCES.md#s5-three-dimensional-rendering).

Tauri can package a web-rendered application but relies on platform webviews. On Windows, select and test an offline WebView2 installation strategy rather than a network bootstrapper when claiming fresh-machine offline installation. Electron embeds Chromium/Node and trades a larger runtime for a more uniform browser environment. The implementing agent decides; see [S8](RESEARCH_SOURCES.md#s8-desktop-packaging).

Claim support only for builds actually produced and smoke-tested. Windows, macOS and Linux differ in packaging, libraries, signing and warning dialogs. Cross-platform source is not equivalent to three tested installers. Code signing/notarization and store publication can introduce costs or credential requirements; do not promise warning-free distribution on every OS for zero publisher cost. Paid stores and hosted services are not required. Record unsigned-build limitations candidly.

## 12. GitHub, funding and repository hygiene

After the confirmation gate, create or use the approved repository and branch. Resolve the authenticated owner through the available GitHub connection or CLI; do not guess it. Suggested name `rift-chess` remains provisional. Never overwrite an unrelated existing repository. Decide public/private visibility and the original-code license explicitly before publication.

The finished README must contain: a real rendered hero screenshot; concise hook; actual install/play commands; release downloads for tested platforms; offline/privacy statement; rules and controls; links to the decision narrative and analysis; engine/API examples; source/asset credits; local-AI limitations; donation link; and honest current status.

Propose MIT for original code. Maintain an asset/dependency ledger with source URL, author, license and bundled location. Link to the xkcd origin rather than bundling/relicensing the cartoon. Reference sources and inherited experiments must retain provenance.

A configured donation URL appears in About and the title-screen/footer, not as a blocking dialog or mid-game nag. Also add it to the README and, where supported, `.github/FUNDING.yml` using the exact provided URL. Validate the URL scheme and open it only after an explicit user click. Hide it when unset; do not invent a destination. See [S9](RESEARCH_SOURCES.md#s9-github-distribution-and-donations).

Use tagged releases, a lockfile, reproducible build instructions and checksums. Keep secrets out of source, logs and screenshots. If GitHub authentication or a platform toolchain is unavailable, preserve the complete local repository/build and report the blocker; do not claim a push, release or signed installer happened.
