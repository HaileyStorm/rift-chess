# Rift Chess — learn, play, improve

**The whole idea:** on your turn, move a chess piece **or** slide an eligible 2×2 tile into a neighboring hole. Your king must be safe afterward.

Read [the full rules](01_RULES.md) for edge cases. This guide describes the shipped 3D client.

## Start a first game

Use the Gallery environment, Classic pieces, the White camera, and **Prompted agreement** for draws. Start a hotseat match or play against the local bot. Turn on **Show moves** for your first game, then try a game without ordinary-move hints. Legal Shift handles stay visible.

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

## Controls

| Task | Mouse / touch | Keyboard alternative |
|---|---|---|
| Ordinary move | **Move** is selected by default. Select a piece, then a legal destination. | Focus the board, use arrows to move focus, then press Enter to select the source and destination. |
| Shift an empty tile | Select **Shift**, choose a tile with a visible legal handle, choose a highlighted neighboring hole, then choose **Confirm Shift**. | Press **S** for Shift, then use arrows and Enter for the tile and hole. |
| Shift a passenger | Select your piece on a Shiftable tile, choose **Shift this tile**, choose the neighboring hole preview, then choose **Confirm Shift**. If the passenger reaches the back rank, choose queen, rook, bishop, or knight in the promotion dialog. | Use **S**, arrows, and Enter for the same selection sequence. |
| Cancel a selection | Choose **Cancel**. | Press Escape. |
| See ordinary legal moves | Choose **Show moves**. | Hold **H** while the board has focus. |
| Camera presets | Use the visible White, Black, Overview, or Top buttons in **Match & view**. | Press **1** through **4**. |
| Free camera | Right-drag to orbit; use the wheel, middle-drag, or two-finger touch gestures to adjust the view. | Use the visible camera buttons in **Match & view**. |

Legal Shift handles remain visible even when ordinary move hints are off. A handle means the tile has at least one fully legal Shift now. Selecting it shows valid neighboring holes; choosing a hole opens the preview. The action does not commit until **Confirm Shift** (and, when needed, a promotion choice). Board shortcuts require board focus, and arrow navigation follows files and ranks regardless of the camera angle.

## Visual comfort, match controls, and draws

Use the Top camera when you need the clearest board geometry. Free camera movement changes only the view and cannot commit a chess action.

Open **Atelier** to choose world, piece, material, and quality settings, and to turn on high contrast or reduced motion. High contrast strengthens the interface contrast. Reduced motion preserves the same legal position and outcome while shortening or skipping camera and board-transition movement.

The quiet counter is not an automatic draw in a **Prompted agreement** match. At 100 quiet actions, choose whether to offer a draw; in hotseat play, the interface asks which player is acting, and the other player can accept or decline. A local bot declines an offer. **Automatic at 100** applies the automatic quiet-action draw; **Continue without a reminder** disables that prompt and automatic limit. Other ending rules still apply.

Practice matches enable **Undo**. In hotseat, both players confirm the Undo dialog before the prior action is restored. Against the local bot, practice Undo returns to your previous turn. For a fair rematch, exchange colors and keep the same opening layout. Use four games to compare both B-rift and C-rift without coupling layout to color.

## Four-lesson tutorial

The lessons cover an ordinary move around a hole, an empty-tile Shift, carrying one passenger, and removing a checking ray segment. Entering a lesson preserves the match you were playing and its autosave. The lessons share one backup, so moving between lessons does not replace that preserved match.

Use **Return to match** to restore the preserved game. Reloading during a lesson opens the preserved match directly when local storage is available. Choosing **New match** or importing a save intentionally replaces it. **Export** downloads the currently open table, so return first when you want to export your match rather than a lesson. If the app reports that saving is unavailable, export your match before closing it. The [tutorial research](RESEARCH_SOURCES.md#s4-teaching-and-observation) motivates guided examples; it does not establish an ideal lesson length for this game.
