# Rift Chess — rules 1.0

**Rules identifier:** `rift-chess/1.0`  
**Status:** selected implementation rules; mechanically tested, not certified human-balanced.  
**Default match:** two local players or a local bot; untimed; prompted draw agreement.

Rift Chess is chess on fourteen sliding platforms. On your turn, **move a piece or Shift one tile**. The missing parts of the board move with your decisions.

This document is authoritative for the proposed game. The [play guide](02_PLAY_GUIDE.md) teaches it; the [engine specification](04_ENGINE_AND_DELIVERY.md) defines serialization and integration. An inherited research function with different behavior does not override these rules.

## 1. Board, coordinates and setup

Use a fixed 8×8 coordinate frame, `a1` through `h8`, with White's home rank at rank 1. Divide it into sixteen 2×2 **tile positions**, named `A1` through `D4`. Capital letters denote tile positions, not chess files.

| Macro row | A | B | C | D |
|---|---|---|---|---|
| 4 | a7:b8 | c7:d8 | e7:f8 | g7:h8 |
| 3 | a5:b6 | c5:d6 | e5:f6 | g5:h6 |
| 2 | a3:b4 | c3:d4 | e3:f4 | g3:h4 |
| 1 | a1:b2 | c1:d2 | e1:f2 | g1:h2 |

There are **fourteen tiles and two holes**, leaving 56 present squares. A hole is an absent 2×2 tile, not a dark square, wall, or square a piece can occupy. Start with all 32 chessmen in their orthodox positions. White acts first.

Choose one starting layout before play:

```text
B-rift                          C-rift
      A   B   C   D                    A   B   C   D
 4   [·] [·] [·] [·]              4   [·] [·] [·] [·]
 3   [·] [ ] [·] [·]              3   [·] [·] [ ] [·]
 2   [·] [ ] [·] [·]              2   [·] [·] [ ] [·]
 1   [·] [·] [·] [·]              1   [·] [·] [·] [·]

Missing B2 and B3                 Missing C2 and C3
Missing c3:d6                    Missing e3:f6
```

A new casual game selects B or C with equal probability, records the choice, and shows it before the first action. Practice may select a layout explicitly. No randomness occurs during play.

For a two-game match, use the **same layout and exchange colors**. For a four-game match, play both colors on each layout. Alternating layout and color together in only two games does not isolate either effect.

Coordinates remain attached to the frame. They do not travel with the physical tile. Tiles never rotate or flip, and their individual identities and decorations have no rules significance.

## 2. Your turn

Choose exactly one of these actions:

**Piece move:** make an ordinary chess move on the squares that currently exist, with the changes described below. Ordinary castling remains a single action even though it moves two pieces.

**Shift:** slide one whole tile orthogonally into an immediately adjacent hole. The old tile position becomes the new hole. A Shift spends your entire turn.

There are no free Shifts, combined piece-and-tile turns, diagonal Shifts, whole-row slides, chain slides, rotations, or passes. Any otherwise legal immediate reverse Shift is allowed; repetition, not a special reversal ban, handles loops.

## 3. Which tiles can Shift?

A tile must meet **all** of the following conditions:

1. It is present and orthogonally adjacent to a hole.
2. It is empty, **or it contains exactly one of your pieces and that piece is not your king**.
3. The completed Shift leaves your king out of check.

Consequently, a tile containing an enemy piece, two or more pieces, or either king cannot Shift. A completely empty tile may be Shifted by either player. Ownership is determined afresh on each turn; tiles are not permanently owned.

A tile may have two adjacent holes. Each destination is a separate possible Shift, and one can be legal while the other is not. “Can Shift” in the interface means **at least one fully legal destination**, not merely that the tile has the right number of passengers.

A king anchors only the tile it currently occupies. After the king leaves by an ordinary move, that tile may become Shiftable.

## 4. Riding a tile

A passenger keeps its exact position within its 2×2 tile. A Shift therefore carries it exactly two ranks or two files. It does not use the passenger's ordinary movement pattern.

A pawn can ride sideways or backward. A knight can ride two squares orthogonally. Every passenger remains on its previous square color, so bishops retain their color-bound identity.

A Shift **never captures**: its destination was a hole and cannot contain a piece. It cannot carry, swap, crush, or throw an opposing piece. The king is never a passenger.

Transport counts as movement for pawn first-move eligibility and original-rook castling rights. Carrying a piece back to its former square does not restore a lost right.

## 5. Moving and attacking around holes

Ordinary chess geometry remains fixed to the board coordinates.

| Piece or operation | Interaction with absent squares |
|---|---|
| Rook, bishop, queen | Its ray stops at the first absent square. It cannot cross the hole. |
| Knight | It may jump over missing intervening squares, but its destination must exist. |
| King | Its destination must exist. It must obey ordinary attack restrictions. |
| Pawn forward move | Every square traversed must exist and be empty. |
| Pawn capture | The diagonal destination must exist and contain a capturable enemy, except legal en passant. |

For a diagonal move, check the diagonal sequence itself. Do not invent an extra restriction based on the two squares beside a diagonal corner.

A piece is not attacked merely because it could be reached by a future Shift followed by a capture. **Shifts are actions, not an additional attack pattern.** Kings are never captured; checkmate ends the game. As in orthodox chess, a pinned piece still attacks the squares defined by its capture geometry for king-safety purposes. See the [orthodox rules source](RESEARCH_SOURCES.md#s3-orthodox-chess).

## 6. Check and checkmate

Your completed action must leave your king on a present, unattacked square. You may Shift while in check, including to remove a tile from an attacking ray and create a protective hole.

A Shift can give check by carrying a checking piece or by filling a gap and reconnecting an attack. It can be illegal because it fills a protective gap, even if the Shifted tile is empty.

Evaluate the full, completed action atomically. The continuously moving 3D model is an animation, not a sequence of intermediate chess positions. There is no opportunity to capture during transit or to interrupt a Shift.

**Checkmate:** the side to act is in check and has no legal piece move **and no legal Shift**. The other side wins.

**Stalemate:** the side to act is not in check and has neither kind of legal action. The game is drawn.

## 7. Pawns and promotion

A pawn's normal forward direction never changes: White increases rank, Black decreases rank.

An ordinary initial two-square move is available only to a pawn that has never moved or ridden a tile, is still on its starting rank, and has both required squares present and empty. A Shift permanently consumes this initial-move eligibility.

A pawn arriving on its opponent's back rank by an ordinary move **or a Shift** immediately promotes to a queen, rook, bishop, or knight. Choose the piece as part of that action. Underpromotion is allowed, and promotion cannot be postponed. A promoting Shift is not committed until the choice is made.

A pawn carried backward onto **its own** back rank remains a pawn. For example, a White pawn can ride from `a3` to `a1`, then later move normally toward rank 8. It does not gain another initial two-square move.

### En passant

Only an ordinary initial two-square pawn move creates an en-passant opportunity. A Shift never creates one, even when it transports a pawn two ranks.

An en-passant opportunity lasts for the opponent's immediately following action. Any other reply—including an empty Shift—expires it. An en-passant capture must also leave the capturing player's king safe after the captured pawn is removed.

## 8. Castling

Only orthodox castling exists:

- White king: `e1 → g1` with `h1 → f1`, or `e1 → c1` with `a1 → d1`.
- Black king: `e8 → g8` with `h8 → f8`, or `e8 → c8` with `a8 → d8`.

The original king and participating rook must retain their rights. All squares between them must be present and empty. The king may not castle out of, through, or into check. The rook's path is not itself subject to the king's attacked-square restriction.

An original rook loses its castling right when it moves normally, rides a Shift, or is captured. The king loses both rights when it moves normally. Restoring a tile or returning a piece does not restore a right.

There is no sideways-to-a-new-rank, reverse, vertical, or relocated castling.

## 9. Repetition, progress and draw agreements

### Automatic threefold repetition

The game ends in a draw when the same legal position occurs for the third time, not necessarily consecutively. Include the initial position when counting.

Position identity includes piece locations and types, pawn first-move eligibility, both hole locations, side to act, castling rights, and an en-passant opportunity **only if a legal en-passant capture is actually available**. A geometrically possible but king-exposing en-passant capture does not count as available.

Ignore the progress counter, move number, physical tile identity, camera, theme, animation state and UI selections. Loading a saved game must restore its history; a board snapshot alone cannot preserve repetition adjudication.

### Progress counter

Count consecutive **board actions** without progress. Reset to zero after any capture, an ordinary pawn move, or any promotion. Otherwise add one. A non-promoting pawn Shift does **not** reset it.

This is a variant-specific counter, not a claim of full FIDE draw-rule compliance. It discourages long quiet sequences but is not a mathematical bound on game length: backward pawn transport followed by ordinary pawn movement can reset it.

Select one policy before the first action and store it with the match:

| Policy | At 100 quiet actions | Default |
|---|---|---|
| **Prompted agreement** (`prompt`) | Suggest offering a draw. Play continues unless both players agree. No unilateral claim. | **Yes** |
| **Automatic at 100** (`auto100`) | End the game in a draw automatically. | No |
| **No reminder** (`off`) | Do not prompt or automatically end for this counter. | No |

All three policies retain automatic threefold repetition, stalemate and bare-kings draws. A checkmating action wins before a same-action automatic draw threshold is evaluated.

The interface displays the counter in Prompted and Automatic modes and labels its consequence accurately. In Prompted mode, notify each player at most once per uninterrupted 100+ episode. A reset starts a new episode. Do not repeatedly interrupt every move above 100.

### Agreement and resignation

Either player may offer a draw at any ongoing position, without spending an action. Only the other player may accept or decline it. The next committed board action cancels an outstanding offer. An accepted offer ends the game by agreement.

Either player may resign. Draw controls and resignation are match controls: they do not change the board, increment the progress counter, or add a repetition occurrence.

### Material-only endings

Automatically draw when only the two kings remain. Version 1.0 deliberately does not implement a broader insufficient-material table or a general dead-position solver. Do not assume standard endgame tables apply unchanged, and do not claim that a particular minor-piece mate is possible without a valid position proving it. Players can agree to a draw in other unproductive endings.

## 10. Match integrity and optional assistance

Legal destination overlays are optional and off by default. Legal Shift indicators are on by default. Neither setting changes the available actions. Check warnings, turn identification and a selected-piece indicator are always available.

Practice may provide undo. In a two-player match, undo requires mutual agreement or is disabled. Rewind restores all board rights, the progress counter and the repetition history, not merely the visible pieces.

Version 1.0's required play modes are untimed local two-player and human-versus-local-bot. Online matchmaking, hosted AI, accounts and network dependence are not part of these rules or launch requirements.
