# Rift Chess — learn, play, improve

**The whole idea:** on your turn, move a chess piece **or** slide an eligible 2×2 tile into a neighboring hole. Your king must be safe afterward.

Read [the full rules](01_RULES.md) for edge cases. This guide describes the intended finished application's controls; the supplied package currently contains the rules and a headless reference, not the 3D client.

## Start a first game

Use the Gallery environment, Classic pieces, the White camera, and **Prompted agreement** for draws. Start with a local opponent or the beginner bot. Turn on move destinations for your first game, then try a game without them. Legal Shift indicators stay on.

The missing central tiles are intentional. In B-rift, your c- and d-pawns initially face missing squares; in C-rift, your e- and f-pawns do. You can develop on the open part of the board or spend a turn changing that obstruction. Both sides face the same rank-reflected starting geometry.

At the initial position there are fifteen ordinary moves and four empty-tile Shifts. An opening Shift is available, not compulsory.

## A two-minute rules card

| Remember | What it means |
|---|---|
| One turn, one action | Move a piece **or** Shift one tile. |
| Empty or one of yours | A Shiftable tile contains nothing, or one friendly non-king. |
| Kings anchor | A king's current tile cannot move. |
| Holes stop rays | Rooks, bishops and queens cannot see through a hole. Knights can jump it. |
| Passengers ride rigidly | The piece moves two squares with its tile. No capture occurs. |
| Final king safety | A Shift can answer check, give check, or illegally expose your king. |
| Pawns remember | Riding consumes a pawn's initial two-step; it does not create en passant. |
| Three repeats end it | Quiet-action 100 only prompts agreement unless Auto100 was selected. |

## Four useful examples

### 1. Ride, don't jump

Put a White knight on `a3`, alone on tile A2, with B2 empty of terrain. Shifting **A2 → B2** carries the knight to `c3`. This is legal transport, even though it is not a knight move. It consumes the turn. The hole moves to A2.

### 2. Cut a checking line

White king `e1`, Black rook `e8`, Black king `h8`; the e-file is otherwise clear. Let B2 and D3 be holes. White is in check. The empty tile **C2 → B2** removes `e3:f4`, cutting the rook's ray. That Shift is a valid defense.

This exact scenario is in `fixtures/conformance.json`, named `cut_check_ray`.

### 3. Reconnect an attack

White rook `e1`, White king `a1`, Black king `e8`; let C2 and D3 be holes. Shift the empty **B2 → C2**. Restoring `e3:f4` reconnects the rook's e-file attack and gives check.

Before committing a tile move, look at **both** changes: the four squares that reappear and the four that disappear.

### 4. Promote by elevator

A White pawn alone on `c6`, tile B3, can ride **B3 → B4** when B4 is a hole. It arrives on `c8` and promotes immediately. Choose queen, rook, bishop or knight before committing. Your opponent can disrupt this plan by changing the terrain, occupying the relevant tile, or creating a threat you must answer.

Fixture: `shift_promotion`.

## How to think about a move

First check immediate king safety and captures. Then ask whether a Shift changes a line or transports a useful passenger. Finally compare that benefit with the ordinary move you are giving up.

**Opening:** develop through present squares. A tile packed with your army is immovable; moving pieces off it can create future transport. Avoid spending multiple early turns rearranging terrain without improving threats or development.

**Middlegame:** inspect the source hole as carefully as the destination tile. Removing cover can defend your king; restoring a path can expose it. A knight's ordinary jumps often connect regions that sliding pieces cannot reach directly.

**Tile control:** a second friendly piece anchors a tile, and any enemy occupant denies you the Shift. This can stabilize terrain you want to keep or spoil a planned ride. Anchoring also costs flexibility, so it is not automatically good.

**Endgame:** watch pawn elevators, king escape squares and repetition. The local bot is a practice opponent, not a source of proven piece values. A standard “winning” endgame intuition may need reconsideration when the terrain can move.

These are strategic hypotheses and lessons suggested by the mechanics, not solved opening theory. Automated tests found that always Shifting was exploitable by the supplied baseline, but did not establish that avoiding Shifts is losing.

## Intended controls

| Task | Mouse / touch | Keyboard alternative |
|---|---|---|
| Ordinary move | Select a piece, then a destination | Board arrows and Enter |
| Shift a tile | Shift tool; select tile, then destination arrow | S enters Shift mode; arrows and Enter |
| Cancel selection | Empty UI area or Cancel | Escape |
| See legal piece moves | Eye button toggles; touch-accessible Reveal button | Hold H for a temporary reveal |
| Camera presets | White, Black, Overview, Top buttons | 1–4 |
| Free camera | Right-drag orbit; wheel zoom; two-finger touch orbit | Camera panel controls |
| Reset camera | Home-view button | Home, when focus is on the board |
| Draw / undo / settings | Clearly labeled toolbar or match menu | Focusable buttons |

The implementing agent may adjust exact bindings after testing conflicts. It must retain a non-drag path, a keyboard path, and visible camera controls. Camera movement must not accidentally commit a move.

Bright tile edges indicate **a legal Shift for the current player**. Direction marks identify legal destinations. Inspecting an unavailable tile explains why: king anchor, enemy occupant, too many pieces, no adjacent hole, or king exposure. Shape and text accompany color.

## Visual comfort and fairness

Use the fixed Top camera when you need maximal geometry clarity. Free orbit is for choosing a comfortable view, not a required skill. Auto-flip is optional and off by default. Backgrounds must never hide holes or make armies hard to distinguish.

Animations can be shortened or disabled. Reduced-motion mode keeps the same game, with instant or short-fade transitions instead of travel, collapse and camera interpolation.

The counter says what will happen. **“100 quiet actions — offer a draw?”** is not a forced ending. An opponent can decline. An Auto100 match instead shows an explicit automatic-draw countdown.

For a fair rematch, exchange colors and keep the same opening layout. Use four games to compare both B-rift and C-rift without coupling layout to color.

## Optional four-lesson tutorial

The launch tutorial should take only a few minutes and be skippable: make an ordinary move around a hole; Shift an empty tile; carry one passenger; answer check by removing a ray segment. Finish with a free game, not a long mandatory rules slideshow.

Each lesson highlights one task, offers an explanation after a mistake, and accepts every legal equivalent solution. The [tutorial research](RESEARCH_SOURCES.md#s4-teaching-and-observation) motivates testing this approach; it does not establish an ideal lesson length for this game.
