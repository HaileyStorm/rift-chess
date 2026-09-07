# From a sliding-board joke to Rift Chess

*A public design history, based on the supplied research files, the audited rules and the new recorded tests. This is an account of decisions and evidence, not a transcript of private deliberation or a claim that human playtest sessions occurred.*

## The starting question

The starting image was [xkcd #3139, “Chess Variant”](https://xkcd.com/3139/): chess pieces on a board divided into sliding 2×2 blocks, with one block missing. The joke is immediately legible. The difficult part is deciding what moving the ground means for a game whose rules normally assume that the ground never moves.

Hailey wanted to build it as a small real game, not a large studio project. Her initial ideas already identified the important seams: perhaps two missing tiles for a fairer start, a tile slide as a full turn, restrictions based on its occupants, and careful handling of check, castling and en passant. Later she made the visual ambition explicit: this should launch as a striking, genuinely 3D game, with controlled spectacle, offline distribution and room for local AI.

Sliding-tile chess already has other implementations. For example, [Tommy Malcolm Pickles's version](https://tommymalcolmpickles.github.io/Sliding-Number-Puzzle-Chess/) explores different slide and special-move rules. The project should acknowledge that context. Rift Chess's contribution is this particular combination of rules, presentation and local-engine design—not a claim to have invented the cartoon's premise or every possible implementation.

## 1. Define the experience before adding exceptions

The desired experience was a recognizable chess decision with a new alternative: improve a piece, or change the terrain that makes moves and attacks possible. A Shift needed to feel consequential, but not dominate every turn or require a rules seminar to interpret.

The [MDA framework](RESEARCH_SOURCES.md#s1-mechanics-dynamics-and-experience) provided a useful discipline: examine the rule, the behavior it encourages, and the player experience it is meant to create. That led to a concrete constraint: one whole Shift costs one whole turn. Allowing a free board rearrangement followed by an ordinary move would hide a compound action inside every turn and make threat calculation substantially harder.

Single-tile, orthogonal, one-hole movement also preserved the physical metaphor. Chain slides, diagonal movement, rotations and multi-tile pushes were not necessary to deliver the premise. Removing them kept the branching structure understandable and the animation truthful.

## 2. Make a Shift powerful through terrain, not mass transport

The main rule screen varied which occupied tiles could move. The inherited CSVs describe six candidate configurations, each with 240 shallow-agent games. The candidates included unrestricted loads, exclusively friendly pieces, a two-friendly-piece limit, a one-friendly-piece limit, no empty-tile slides, and friendly piece-count majority.

Two signals were especially useful. Allowing only a single friendly passenger while also forbidding empty Shifts reduced Shift use to about 4.1% of actions in that screen. The new mechanic then became peripheral. Permissive configurations used Shifts much more often, and the fully unrestricted configuration produced 52 repetition endings out of 240 games, compared with nine in the one-passenger configuration.

Those figures did not prove a balance optimum. The unrestricted configuration also allowed king transport and preserved movement status, so it was not a clean one-variable comparison. Nevertheless, they helped identify an attractive design position: **empty tiles can move; loaded tiles carry exactly one friendly non-king**.

That rule needs no piece-value arithmetic and does not let a player forcibly reposition the opponent. It limits passenger relocation to one piece while preserving the more distinctive effect: four squares appear in one place and disappear in another. The inherited selected-row sample had 23.1% Shift actions, with roughly 85.5% of its Shifts empty. Terrain manipulation, rather than ferrying whole armies, was already doing most of the work in those agents' play.

The rule creates a further interaction without adding another subsystem. A second friendly piece anchors a tile. Any opposing piece prevents you from moving it. Players can stabilize or disrupt transport opportunities through normal chess movement.

## 3. Use two holes, but choose their geometry carefully

A second hole offers more terrain arrangements and permits an opening that treats the two armies identically under rank reflection and color exchange. There are 120 ways to place two indistinguishable holes among sixteen macro-cells, compared with sixteen placements of one hole. This is a geometric upper bound, not a claim that every arrangement is reachable with any given pieces on the board.

The supplied layout screen compared several possibilities. Central diagonal gaps were active, but each individual setup gave the armies different geometry. A horizontal central pair similarly favored one rank band over the other. Outer gaps tended to delay engagement with the terrain mechanic.

The selected **vertical central pair** removes B2+B3 or C2+C3. It gives each side the same rank-reflected geometry and leaves all starting pieces present. Both variants have four legal opening Shifts and fifteen ordinary opening moves, verified in the final engine.

This does not eliminate the first-move advantage, nor make B and C strategically identical: queens and kings occupy different files. Accordingly, a fair comparison uses both colors on the **same** layout. A complete comparison across both layouts takes four games. Alternating layout and color together in only two games would confuse the effects.

The audit also found that two differently named rows in the old layout table describe exactly the same outer-diagonal geometry. They should not be presented as two independent design ideas.

## 4. Preserve chess where preservation is coherent

Holes were made genuinely absent. Sliding-piece rays stop at them, knights can jump intervening gaps, and no piece can land on missing terrain. This makes a Shift a tactical edit to attack connectivity, not merely a conveyor belt.

King transport was excluded on clarity grounds. The king can move normally and thereby change which tile it anchors, but it cannot acquire a second movement system through riding. The tests do not prove that king transport is intrinsically unbalanced; the chosen design simply does not need its additional king-safety and castling complexity.

Castling remains on orthodox coordinates, with orthodox path and attack constraints. Moving an original rook by any means consumes its right. Pawns also remember transport: riding consumes their initial two-step and never creates en passant. Every opposing action, including an empty Shift, expires a previous en-passant opportunity.

Shift promotion was retained. It is visible, exciting and gives the terrain system an endgame purpose. A pawn delivered to its promotion rank chooses any of the four ordinary promotion types immediately. An extra audit correction clarified the opposite case: a pawn riding backward onto **its own** back rank remains a pawn. A legacy random-test assertion had incorrectly forbidden pawns on either back rank; the new targeted tests cover both colors correctly.

## 5. Prefer transparent draw policy to hidden anti-loop rules

An immediate-reversal ban was considered, but it adds another remembered state and does not address longer cycles. Automatic threefold repetition is already an understandable way to stop a repeated board situation. It remains in all final match presets.

The first recommendation also forced a draw after 100 non-progress actions. Hailey preferred player choice. The final default is therefore **Prompted agreement**: the counter becomes a suggestion to offer a draw, not a unilateral right to end the game. Automatic at 100 and No reminder are explicit pre-game alternatives.

The progress definition remains deliberately narrow: ordinary pawn moves, captures and promotions reset it; non-promoting pawn rides do not. That prevents a simple back-and-forth pawn ride from indefinitely resetting the clock. It does not prove that every longer pawn-and-terrain cycle is bounded by 100, and the documents say so.

Repetition identity required an engineering correction too. An en-passant target matters only when a **legal** en-passant capture exists. Keeping a useless or pinned en-passant marker in the identity can wrongly miss a repetition. The final API normalizes that case and tests it.

## 6. Audit the evidence before making it look persuasive

The inherited tables describe 4,560 screening runs, but only their aggregate CSVs were supplied. There are no inherited per-game traces in this package. The report preserves the summaries as historical evidence rather than pretending to have independently reproduced all of them.

More importantly, the old aggregation treated games stopped at a simulation cap as “draws.” In the selected rules row, the apparent 82.9% draw rate actually consisted of **190 unfinished capped games and nine true repetition draws**, out of 240. The remaining 41 games were wins. That correction changes how the table should be read.

The old first-Shift metric was zero-indexed; readable timing now adds one or uses explicitly one-indexed values. The old forcing-at-100 adjudicator was separated from the final match API. Unsafe raw state mutation was wrapped in legal-action validation. Restricted agents received an explicit fallback when their preferred action type was unavailable, rather than accidentally treating a legal Shift-only position as a forfeit.

These changes are not glamorous, but they are central to a trustworthy handoff. A polished chart must not turn a bookkeeping mistake into a balance conclusion.

## 7. Run a smaller, auditable final-rules experiment

The new audit ran **120 fully recorded games** under the final rules and Prompted agreement. No agents issued or accepted draw offers. Every action history is included and replay-verified: 14,290 actions in total.

The baseline was noisy one-ply chess guidance. Restricted challengers preferred ordinary moves, required a Shift when available, or received a heuristic bonus for Shifting. A small additional challenger used bounded search targeting two plies. This follows the idea of [restricted-play testing](RESEARCH_SOURCES.md#s2-restricted-play): remove or favor an action and see what that reveals, while recognizing that the result depends on the agents.

The most direct finding was that **always Shift when possible** was not a successful policy against the baseline: zero wins, eleven losses, twenty genuine draws and one unfinished game in 32 color/layout-paired games. Many draws were repetitions. This suggests an ordinary move can punish indiscriminate terrain play.

The ordinary-move-first challenger went 1–1, with thirteen draws and seventeen unfinished games. That does **not** show Shifts are strategically essential. It remains an important player/stronger-agent question. The Shift-seeking challenger went 2–1 with twenty-two draws and seven unfinished games, also far too inconclusive to infer superiority.

The bounded two-ply challenger won all eight of its small tests against the weak baseline. That supports shipping an actual local search opponent instead of a purely random bot. It is not a strength rating and not evidence of balanced play between strong agents.

## 8. Make the engineering demonstrable, then the presentation exceptional

The final package adds a checked headless API, a stable 21,760-slot action encoding, local NDJSON process access, full replay, bounded search, and 14 named cross-language fixtures with 223 successors. The test receipt records 67 passing tests. Additional checks cover 256 color-reflected positions, 1,000 random legal actions, and orthodox perft through depth 4.

This supports a renderer-independent game that can later host local trained opponents. It also gives the implementing agent concrete evidence to compare against rather than only prose.

Hailey's 3D correction changes the delivery standard. The game should launch with three coherent environments, two real piece geometry families, four camera presets plus orbit, readable legal-Shift signals, optional move hints, and authored movement/capture effects. The design now treats those as part of completion, not a decorative backlog. Offline packaging and real rendered playtesting are equally required.

The build-agent prompt starts with decisions and confirmation, then demands implementation, browser interaction, visual inspection and iteration. Its public README must link this narrative, credit the origin, show real screenshots and report only platforms and behaviors actually tested. Donations use Hailey's exact supplied destination; no address is invented.

## The resulting confidence level

The chosen rules are specific, internally coherent and exercised by executable checks. The transport limit, central setup and special-move choices have clear design reasons. The package is ready for a serious implementation pass.

What remains unknown is just as specific: human learning cost, first-player advantage, whether strong players can exploit a repetitive terrain strategy, how often central obstruction feels frustrating, endgame conversion rates, and whether the rendered presentation stays legible and comfortable across hardware.

The next useful iteration is **the real 3D game, played and inspected**, with the reference retained as a correctness tool. More weak self-play alone would not answer those experiential questions.


## Implementation addendum - 2026-09-07

The approved implementation uses TypeScript/Three.js with semantic HTML controls, a pure rules/match API and a bounded worker search opponent. Windows delivery uses sandboxed Electron with its bundled Chromium runtime. The owner subsequently requested a free day-one browser link, superseding the earlier no-public-hosting constraint; GitHub Pages serves only static bundled files. Gameplay and the opponent remain local and require no game server, accounts or paid inference.

The reference was tested before porting. The implementation compares all 14 fixtures and 223 successors, preserves the action encoding and replay schema, and replays the 120 retained histories. Original fixture bytes match the supplied ZIP; regenerated JSON has different serialization bytes but identical semantics. This is cross-language parity and replay evidence, not independent proof that every inherited rule is correct.

Three concrete implementation passes exposed and corrected interaction, material readability, macro-tile/cavity presentation, stale-worker, save-recovery and Windows scaling problems. One actual rendered UI game reached bot checkmate after 30 board actions; a second covered the other color and C opening and ended by planned resignation. They are automated policy-vs-bot games, not human play or evidence of balanced strong play. Earlier budget/timing failures remain unfinished attempts rather than invented draws.

The final Windows runtime was tested with networking disabled at the Electron session, including first launch, a real canvas move and local bot reply, save/restart, export and corrupt-file rejection. A full browser-process cold restart also worked offline from its prior cache. Neither test is an OS-level airplane-mode or fresh physical-machine study. Only Windows 11 x64 is a claimed desktop target.

The original art includes two procedural geometry families, three environments and coordinated materials. Actual matrices were inspected and iterated. Measured frame intervals vary by activity; bot-turn tails still warrant profiling, and no universal frame-rate or bot-strength claim is made. See [the implementation playtest record](PLAYTESTS.md) and [curated evidence](evidence/README.md).

Future peer-to-peer or minimal-relay multiplayer remains an extension, with authenticated seat ownership, signaling/reconnect handling and potentially TURN still required. The transport-independent checked API preserves that route without claiming it is delivered. No substantive rule change was made to make tests or demonstrations easier.
