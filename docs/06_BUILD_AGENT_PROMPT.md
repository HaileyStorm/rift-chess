# One-shot build prompt — Rift Chess

Use this entire document as the prompt, with the complete handoff package available to the agent. The prompt intentionally contains an initial confirmation gate before implementation and publication.

---

You are building **Rift Chess**, a complete, visually exceptional offline 3D chess variant, from the attached handoff package. You have a desktop/Codex-style development environment and should use its actual available browser/computer-use tools to play-test and iterate. This is an implementation assignment, not a request for another proposal or a graphics-minimal MVP.

## First: decide, present, and pause for confirmation

Before writing application code, creating a GitHub repository or publishing anything, read the package and inspect the local environment/tool capabilities. Make the decisions yourself. Do not ask the user to select a technology stack from a menu.

Read in this order:

1. `README.md`, `docs/01_RULES.md`, `docs/02_PLAY_GUIDE.md`.
2. `docs/03_PRODUCT_DESIGN.md` and `docs/04_ENGINE_AND_DELIVERY.md`.
3. `docs/05_DECISION_NARRATIVE.md`, `report/RIFT_CHESS_ANALYSIS.md`, and `docs/RESEARCH_SOURCES.md`.
4. `reference/README.md`, the final API/generator/search code, tests and `fixtures/conformance.json`. Read the analysis PDF/HTML when useful for its diagrams.

Inspect the real OS, available build tools, GPU/browser runtime, existing working directory, and GitHub authentication without making remote changes. Resolve an authenticated repository owner through available connected tools or the local CLI when possible. Do not assume a path, account, credential, plugin or browser capability that is not present. Use available browser/desktop skills according to their actual instructions.

Choose a platform, language, renderer, UI approach, local-bot integration, desktop packaging, first tested release target, asset strategy, repository name/visibility and license proposal. Keep unresolved user-specific information separate from technical choices.

### Recommendations, not requirements

**Option A — recommended starting point:** TypeScript + Three.js + Vite, a lightweight accessible HTML UI, a pure headless engine and worker-based bot, packaged with Tauri 2. This keeps the actual game inspectable in a browser while providing a desktop player workflow and local files. Validate the real webview and fully offline installer path; do not assume Tauri means a tiny, dependency-free fresh-machine installer on every OS.

**Option B:** the same browser-rendered application packaged with Electron when bundled Chromium consistency, offline runtime availability or local toolchain simplicity outweigh installer size. Apply proper sandbox/context-isolation and narrow native boundaries; do not expose unrestricted Node APIs to renderer content.

These are suggestions. Choose another stack only when it better satisfies the same 3D, offline, local-AI, accessibility, shareability and actual playtesting requirements. Do not turn “no hosting” into a public web deployment, and do not replace 3D with a flat SVG board to simplify testing.

Present a compact decision summary with your selected stack and justification, first supported/tested OS, release format, local-AI approach, art plan, repository owner/name/visibility, proposed original-code license, and accepted rules/draw defaults. Recommend a public `rift-chess` repository and MIT for original code unless the environment or existing project provides a concrete reason otherwise; verify name availability before claiming it is available.

Then ask for **confirmation of your decisions**, not for the user to make them. Request the exact donation-page URL in the same message. Ask for repository-owner information only if it could not be resolved from tools. Explain any real signing/toolchain cost or credential blocker. Do not invent a donation URL or publish an empty funding link.

**Stop at this gate until the user confirms.** After confirmation, execute the rest of this prompt without repeatedly returning routine implementation choices to the user.

## What you are shipping

Ship a small, complete game with correct rules and premium presentation from the first claimed playable delivery. No hosted game server, accounts, analytics, paid inference, API keys, remote assets or runtime model downloads. GitHub is for source and release downloads; the game and its AI work without it after download.

The selected rules are `rift-chess/1.0`: B/C central two-hole openings; a turn is an ordinary move or one orthogonal tile Shift; empty tiles or one friendly non-king passenger; king anchoring; absent-square attack geometry; orthodox castling with consumed transport rights; exact en passant; all ordinary/Shift underpromotions; automatic threefold; and pre-game `prompt`, `auto100`, `off` progress policies. **Prompted agreement is default.** The normative rules file takes precedence over old research functions.

At launch include untimed local two-player, a genuine local heuristic/search opponent, both layouts, save/load/replay, four short optional tutorial scenarios, keyboard and non-drag paths, clear move history, check feedback, and draw/resign/approved-practice-undo controls.

The presentation must include three cohesive environments, two genuine geometry families of recognizable pieces, coordinated material options, White/Black/Overview/Top camera presets plus constrained free orbit, and authored ordinary-move, knight, tile, capture and promotion animation. Legal piece destinations are off by default with a visible toggle and temporary reveal. Fully legal Shift indicators are on by default and tied to the side to move. Include reduced motion, mute where sound is present, and a lower-cost rendering preset that remains fully 3D.

Make the board feel like a beautifully crafted kinetic object. Use convincing silhouettes, bevels, lighting, contact shadows, materials, antialiasing and restrained atmosphere. Do not use labeled primitive placeholders, muddy indistinguishable armies, excessive bloom, an obscuring background, a low camera that hides pieces, or long capture cutscenes. Actual playability takes priority over decorative effects when the two conflict; solve that through art direction, not by stripping out the 3D ambition.

## Implement with a correctness boundary

Separate pure rules, match history/adjudication, local AI, persistence and rendering. Keep physical tile mesh IDs cosmetic. The rules use fixed board coordinates and atomic transitions. Never derive legality or attacks from world transforms, physics or current animation frames.

Include the supplied move generator and final reference in the repository, with provenance. Run their tests first. Port the final API semantics into the chosen runtime when appropriate; Python is not a required player dependency. Never expose the inherited raw reducer as a public validated API, or accidentally use its old forced-100 adjudicator.

Preserve the versioned action IDs and replay format or supply an explicit tested adapter. Compare all 14 fixtures and 223 successor states. Add focused tests for any discovered ambiguity or defect. The reference is not infallible: investigate disagreements rather than blindly modifying either side to make tests green. Document actual corrections and update versioned fixtures deliberately.

Expose an in-process/headless API and a worker/process-friendly command boundary for future local training and opponents. Include reset, observe, legal actions/mask, checked step, result, export/load and bot suggestion. Guard stale AI responses with game identity and revision. Keep complete repetition history, effective en passant, draw policy and quiet-action state in the adjudication/search model. A board hash alone is not a full match-state key.

Ship a legal, responsive offline bot using the supplied bounded search or a tested improvement. Do not claim Elo or human strength without evidence. Avoid UI-thread search. A future external local agent may use an explicitly trusted adapter; no cloud integration is necessary now.

## Build, play, inspect, improve

Use a local browser preview of the actual implementation wherever the selected stack permits it. Browser/desktop tooling must interact with the rendered game, not just inject actions into the reducer. Programmatic state loading is appropriate for edge-case setup, but actual selection, camera, prompts and commits must then be exercised through the UI.

Run at least three concrete improvement passes:

**Pass 1 — mechanics and interaction.** Play ordinary and Shift moves through the 3D board; switch sides and layouts; test precise picking, camera-vs-play gestures, check evasion, illegal Shift reasons, promotion choice, en passant, castling, undo and replay. Verify the latest logical position rather than trusting animation appearance.

**Pass 2 — visual quality and comfort.** Inspect real captures from all environments, both piece families, all four camera presets and at least two viewport sizes. Inspect piece readability, tile seams, actual holes, glare, shadows, jagged edges, UI overlap, coordinates and focus. Fix what looks unfinished. Exercise reduced motion and low quality. Screenshot regression is useful but not a substitute for looking at the result.

**Pass 3 — complete-game and distribution behavior.** Play at least one complete real-UI game against the local bot and exercise both sides across additional games; cover B and C openings. Use focused scenarios to reach every ending and special-rule path rather than relying on luck. Test the packaged release offline, first launch, save/reload, corrupt save rejection, restart, and stale bot results after undo/new game. Test repeated theme/restart cycles and measure frame pacing while the bot thinks.

For every pass, record what you actually did, the observed failures, the changes and the retest. Include actual screenshots and concise traces. Browser-agent play is not a human usability study; label it correctly. Do not fabricate matches, screenshots, performance numbers, feedback or completed tests. A game stopped at a time/action budget is unfinished, not automatically drawn.

Minimum scenario evidence includes: a loaded Shift; a Shift that cuts check; one that restores an attack; a king-exposing Shift rejected; ordinary and Shift promotion with underpromotion; castling-right loss from rook transport; en-passant expiry on an empty Shift; threefold after save/reload; all three progress policies at 100; checkmate precedence at 100; and correct draw-offer acceptance/decline. Confirm hidden move hints really are hidden, Shift availability respects full king safety, and camera control never commits an action.

When play reveals a balance concern, distinguish a UI misunderstanding, bot weakness and genuine rule issue. Improve presentation and the bot directly. Substantive rule changes require explaining the evidence and obtaining approval before replacing rules 1.0. Keep experiments versioned; do not silently loosen Shift eligibility to make a demo easier.

## Make it shareable and publish it correctly

After the initial approval, create or use the approved GitHub repository without overwriting unrelated work. Initialize a sensible source structure, tests, lockfile, source/asset license ledger, ignore rules and reproducible commands. Never commit secrets, large unrelated personal files or inherited private context.

The release player workflow must be download → install/unpack → launch. A development server command is not a substitute for a usable release. Bundle every gameplay dependency. On Windows, verify the selected offline WebView2 strategy if using Tauri; on each claimed OS, test the actual artifact and document unsigned-build warnings or platform limitations. Do not claim cross-platform release support merely because the source can theoretically compile elsewhere.

Create a useful README with a **real rendered** hero screenshot, concise premise, download/install/play instructions, tested platforms, controls, offline/privacy statement, local bot/API documentation, rule links, and honest status. Prominently link `docs/05_DECISION_NARRATIVE.md` and the analysis report. Preserve the narrative's distinction between inherited summary-only data and fresh replayable tests; append your implementation findings rather than rewriting history into a success story.

Credit xkcd #3139 and relevant sources. Do not bundle the cartoon under the project's original-code license. Show original art provenance and third-party licenses. Describe Astra's role factually; no benchmark claims or implied official OpenAI endorsement.

Put the confirmed donation URL in the README, title-screen/About footer and GitHub funding configuration where supported. The link is optional, quiet and user-activated. No nags, feature gates or invented destinations. If the URL remains missing, leave configuration unset and the UI link hidden, and report that one unresolved item.

Produce a tagged release with the tested artifacts and checksums when authentication and approved publication permissions permit. If an actual connection/toolchain failure prevents publishing or a platform build, retain the complete local repository and artifacts, identify the specific blocker, and do not claim the external action succeeded.

## Definition of done and final response

Completion means the full launch scope works, the game is visually polished, real rendered playtests and iterations occurred, the rules/API conformance checks pass, the local opponent works without network access, and a real offline player artifact has been tested for every platform you claim.

Do not stop after a scaffold, a pretty screenshot, passing unit tests alone, or a flat fallback. Do not leave placeholders or partially implemented methods in delivered launch features. Use complete functions/classes with docstrings and appropriate state/tensor dimensions; comment non-obvious logic rather than narrating trivial statements.

Finish with the actual repository/release links or local artifact paths, exact tested install/run commands, a few real screenshots, concise test/performance/playtest evidence, the approved decisions, remaining limitations and any external blocker. Be explicit about what is implemented versus future local-AI extension work. Never present a proposed feature, unrun test or unsupported platform as finished.
