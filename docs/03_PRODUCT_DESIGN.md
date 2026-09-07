# Rift Chess — 3D product and interaction design

**Companion:** [engine and delivery](04_ENGINE_AND_DELIVERY.md).  
**Authority:** [rules 1.0](01_RULES.md).  
**Implementation status:** specification, not screenshots or performance measurements from a built client.

## 1. Product decision

Build a small, complete, **beautiful 3D board game**, not a large live-service product and not a flat prototype with a promise of later graphics. The first playable delivery must combine correct chess, clearly moving terrain, convincing sculptural pieces, comfortable camera control, a local opponent, and offline persistence.

The visual signature is a precisely made object in an atmospheric space: fourteen substantial platforms sliding through two genuine voids. Motion should explain the mechanic. Ornament should frame it.

Launch scope is deliberately concentrated: local two-player, local heuristic opponent, four short tutorial puzzles, replay/save, visual customization and a reliable desktop distribution. Accounts, chat, online matchmaking, monetized cosmetics, leaderboards, cloud saves, model downloads and a campaign are excluded. There is no hosted gameplay dependency.

The architecture is platform-neutral. The implementing agent selects its renderer, UI framework and packaging system after inspecting the actual environment. Platform suggestions are in the [build prompt](06_BUILD_AGENT_PROMPT.md), not prerequisites of these designs.

## 2. Art direction: a crafted kinetic chess table

### The board

Each 2×2 tile is one clearly distinct platform with believable thickness, softened edges, a chess-square surface and a subtly different side material. Physical tile seams must be distinguishable from the finer internal square boundaries. Make the two gaps visibly deep and empty; do not render them like additional playable black squares.

Use a restrained outer frame or thin coordinate rails to preserve the fixed 8×8 geometry while tiles move. Coordinates stay with that frame. Floating tile numbers, decorative decals or engravings must never masquerade as coordinates that move with a tile.

Keep the playing plane in focus. The board must not disappear into glossy reflections, fog, depth-of-field blur, bloom or the background. Contact shadows and edge highlights should ground pieces and tiles without hiding square colors.

### Three environment presets, included offline

| Preset | Character | Readability constraint |
|---|---|---|
| **Gallery — default** | Dark architectural studio; softly lit stone/ceramic playing surface; quiet metallic trim. | The armies and both square colors remain immediately distinct. |
| **Nocturne** | Restrained celestial or architectural void, with sparse distant light and cool illumination. | No moving starfield, bright nebula or particle curtain behind the playing plane by default. |
| **Daylight** | Warm wood, pale ceramic, broad daylight and soft environmental reflections. | Light pieces remain separated from light squares through shape, base trim and shadow. |

These should be coherent lighting/material/environment combinations, not three wallpaper images behind an unchanged scene. Background animation is optional and off by default. All shaders, environment data, fonts, textures and geometry must be locally bundled or generated locally.

### At least two piece geometry families

**Classic:** refined Staunton-inspired silhouettes. A proper rook crown, recognizable bishop cut, queen crown, king finial and unmistakable knight profile. Avoid unrelated primitive stacks or text labels as the main method of recognition.

**Faceted:** a genuinely different sculptural family with cleaner planar geometry, but preserved functional silhouette cues. A change of color alone does not count as a second piece style.

Provide at least three coordinated material treatments, for example ivory/graphite ceramic, brushed metal, and warm wood. Side identity must remain robust under every lighting/style combination. Test all twelve piece identities—six types for each army—from every preset camera. A flat icon or label is an optional accessibility aid, not a substitute for finished geometry.

Use original procedural/custom assets or properly licensed local assets. Record provenance. No remote asset hotlinks, unlicensed game-rips, hidden model downloads or placeholder art in a claimed finished release.

### Rendering discipline

Require physically plausible materials, consistent exposure, antialiasing and correct texture/output color handling. Use bounded shadows and restrained ambient occlusion where the selected renderer performs well. Do not mistake uniformly mirror-like surfaces for premium materials.

For Three.js, its official color-management and disposal documentation are relevant implementation references; these are engineering requirements rather than promises that any particular effect is free. See [sources S5–S6](RESEARCH_SOURCES.md#s5-three-dimensional-rendering).

## 3. Camera and selection are separate systems

Ship **White, Black, Overview and Top** presets, plus constrained free orbit. White/Black views should be useful playing positions, not low-angle promotional shots. Top may use orthographic projection; the scene remains genuinely 3D.

Free orbit preserves world up, cannot pass below the playing surface, and uses zoom/pan bounds that keep the board recoverable. A permanent Home-view button restores a useful framing. Presets fit the board to viewport dimensions and UI occupancy. Optional auto-flip is off by default; it must not spin between every hotseat turn without explicit selection.

Recommended controls: left click selects a piece or destination; right-drag or a dedicated camera gesture orbits; wheel zooms. Touch uses a separate two-finger camera gesture and tap-to-select play. Keyboard users have camera preset buttons and incremental camera controls.

Do not bind ordinary left-drag to both orbit and piece movement. Define a drag threshold, pointer capture and click suppression after a camera gesture. Testing must include clicks on piece bases, crowns and tile edges at oblique angles. The picked object resolves to stable logical square/tile identifiers, never to a guessed world-space rule.

During camera travel and board animation, the committed logical state remains authoritative. Camera motion alone cannot change turns, select a hidden destination or commit an action.

## 4. A readable interface, not a cockpit

Show current side, check status, selected object, move history and the central action controls. Keep the board dominant. Settings and detailed explanations belong in unobtrusive panels, not persistent floating labels over every piece.

### Ordinary-move assistance: off by default

The initial selection ring and coordinate readout are always available. Legal destination markers are **off** initially. A visible Eye/“Show moves” toggle enables them persistently; holding H reveals them temporarily. Touch has an equivalent readily accessible reveal control. The user should not need to navigate a settings tree each time.

Turning move assistance off must actually remove destination hints. Do not leak them through hover-only dots while claiming the feature is off. Check warnings and a rejected-move explanation still remain available.

### Legal Shift visualization: on by default

Subtly outline each tile with at least one **fully legal** Shift for the current side. Draw small directional marks toward each legal hole. A tile that is occupancy-eligible but would expose its king must not look available.

Use occupancy and adjacency to explain failures, and the complete legal-action list to mark successes. Inspecting an unavailable tile gives a short reason: “King anchors this tile,” “Enemy piece aboard,” “Two pieces aboard,” “No adjacent hole,” or “Would leave your king in check.” Multiple reasons can be available in expanded help; the primary reason should be stable.

Shift mode is explicit: a toolbar control or S, then tile selection and destination. A tile-edge handle can be an additional shortcut. Selecting a passenger normally should not unexpectedly select its entire tile. Two legal hole destinations get separate arrows. Previewing a Shift shows the departing tile footprint and arriving footprint together.

Empty-hole selection can reveal neighboring candidates, but **does not consume a turn**. No action occurs until one legal source/destination is confirmed.

### Accessible state

Use outlines, chevrons, symbols and text in addition to color. Support keyboard board navigation, a focusable action list and meaningful announcements such as “White Shift A2 to B2; Black to move.” This also gives browser tests a semantic inspection surface.

Provide a high-contrast mode and an optional simple top-view assistance layer. Keep the default game 3D. Reduced-motion support must cover renderer-driven movement as well as CSS; see [S7](RESEARCH_SOURCES.md#s7-accessibility-and-motion).

## 5. Motion and capture direction

Animation is deliberately authored, short and deterministic. The following durations are starting design budgets, to be revised after actual playtesting—not measured ideals:

| Action | Initial target | Direction |
|---|---:|---|
| Ordinary piece move | 180–280 ms | Deliberate glide or small lift; precise landing. |
| Knight move | 260–340 ms | A readable single arc, no exaggerated acrobatics. |
| Tile Shift | 420–550 ms | Subtle release/lift, horizontal slide, settled landing. Passenger remains rigidly attached. |
| Capture | 300–500 ms | A short authored tilt/collapse or restrained material dissolution, then removal. |
| Promotion | 180–300 ms after choice | Clear transformation into the selected piece family. |
| Camera preset | 250–400 ms | Smooth orientation change without orbiting through pieces. |
| Reduced motion | Instant or ≤100 ms fade | No travel, collapse, camera sweep or particles. |

A capture is not an extended battle scene. No gore, screen shake, fullscreen sparks or long unskippable death sequence. Decorative physics may affect debris only; they never determine chess outcomes or leave collidable objects on the board. Captured pieces may appear in a quiet side tray after the effect.

En passant animates the removal of the pawn from its actual square, not the landing square. Castling moves the king and rook as one action. Promotion offers Q/R/B/N before commit; no provisional queen may be accidentally committed while the chooser is open.

The reducer commits once, then an animation transaction renders the old-to-new transition. Lock board-action input while that transaction plays; keep camera, settings and Skip available. At completion or cancellation, snap exactly to the authoritative state. A second click, tab suspension, undo, theme switch or late bot response must not duplicate the action.

Optional quiet local sound can reinforce tile release, travel and landing. Provide mute and independent volume. No music or external audio dependency is required. A sound effect should never be the only indication of check or completion.

## 6. Draw policy presentation

The new-game screen offers Prompted agreement, Automatic at 100 and No reminder, with one-sentence explanations. Record the choice permanently for that match.

In Prompted/Automatic mode show a compact “Quiet actions: 42 / 100” counter. At approximately 80 and 95, strengthen the label/icon modestly without flashing. At 100, Prompted says “Offer a draw?” and continues play; Automatic ends only after checking for checkmate. In No reminder mode, the counter may remain in match details rather than the main HUD.

A prompt is nonmodal and dismissible. Show it at most once to each player per uninterrupted 100+ episode. Draw-offer and accept/decline controls remain available independently of the counter. Never auto-accept an offer on behalf of a human. The bot's agreement policy should be documented; rejecting offers in its initial version is acceptable and more honest than an unexplained hidden evaluator.

## 7. Performance and robustness targets

Record the machine, GPU, OS, renderer/backend, resolution and quality preset with every performance claim. A screenshot does not demonstrate stable frame pacing.

Target a responsive 1080p/60 Hz experience on the measured development machine, then test an integrated-GPU or constrained configuration where available. Report median and p95 frame times for idle orbit, a loaded Shift, capture, and a bot thinking in the background. If 60 fps is not sustainable on a weaker system, provide a smooth 30 fps Low preset; it must still use real 3D geometry and preserve all move/state clarity.

Prefer a small number of lights, bounded shadow maps, shared geometry/materials, practical texture sizes and limited particle counts. A compressed art budget around 40 MB is a useful initial target, excluding a desktop runtime; the measured result, not the target, belongs in the README. Do not sacrifice recognizability to meet an arbitrary polygon number.

Low/Balanced/High presets change shadow resolution, environment complexity, postprocessing and pixel ratio. They do not change rules, indicators or piece identity. Background bot work belongs off the render thread.

Run at least twenty restart/style-switch cycles and inspect CPU/GPU memory trends. Dispose replaced meshes, textures, render targets and listeners. Test minimized/resumed windows, resize, high-DPI scaling, interrupted animation, corrupt save rejection and late AI responses.

## 8. Launch quality gate

The first claimed playable release must include the two play modes, both layouts, every normative rule, both help-visibility defaults, four camera presets and orbit, three environments, two actual piece geometry families, movement/capture/Shift/promotion animation, reduced motion, save/load/replay, legal local AI, and offline installation/play for each claimed supported platform.

Validation has three independent parts:

**Mechanical:** reference tests, cross-language action/child-state fixtures, adjudication, replay and illegal-input rejection.

**Interaction:** actual clicks/gestures on the rendered 3D scene, keyboard play, camera conflicts, hidden/revealed assistance, promotions and draw prompts. Calling the reducer directly is not a substitute.

**Visual:** inspect real screenshots at multiple sizes and all themes/cameras; identify and fix overlap, clipping, glare, muddy pieces, jagged edges, distracting motion and confusing holes. Aesthetic inspection is additional to screenshot regression tests.

Save a short evidence record of each iteration: observed problem, change, retest, remaining issue. Never fabricate user feedback or describe an unbuilt scene as tested.

## 9. What remains a player-research question

The existing tests support building this ruleset; they do not establish durable fun. During real play, watch for stalled central pawns, empty-tile shuffling, promotion elevators, misunderstanding of restored attack rays, and whether the one-passenger rule feels intuitive rather than arbitrary.

Ask players to explain their last Shift and whether they saw the opponent's reply. Log time to first legal Shift, attempted illegal actions and reasons, voluntary rematches, and whether help is repeatedly needed. Do not use “number of Shifts” alone as a fun score.

The developer can make cosmetic/interaction improvements without changing rules. Substantive rule changes require a new version, updated fixtures and a short explanation to Hailey before treating them as the main game.
