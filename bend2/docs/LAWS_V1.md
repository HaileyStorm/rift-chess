# Rift Chess in Bend — rules laws, version 1

**Draft until `laws/semantic-v1.json` is created.** The game remains a separate
experiment. The user delegated the initial law choice, with special caution
about subsequent amendments. See `LAW_CHANGE_POLICY.md`.

## Meaning and scope

The laws bind the actual exported Bend kernel to a small, frozen executable
specification of Rift Chess 1.0. They protect the acceptance boundary, state
invariants and deterministic replay. They do not establish that our translation
of the English rules is perfect. Independent comparison with the existing game
and its immutable fixtures addresses that different question.

`Model` fixes the data and canonical action encoding. `Geometry` and `Transitions`
define the board predicates and action effects; `Spec` composes them into board
authorization and enumeration. `MatchSpec` fixes game history, terminal results, draw
offers, resignation and stale-command rejection. These are normative law
dependencies, hashed with this document and the formal declarations. Changing a
helper cannot quietly change a law's meaning.

`Kernel` is the implementation. It may be optimized, but the same laws must
still typecheck against the unchanged specification. `PROOF.bend` contains the
constructive witnesses. A separate proof receipt binds those exact implementation
and proof bytes to the semantic freeze and pinned compiler.

## Data and boundary assumptions

- A board has 64 fixed cells in a1 through h8 order. Four neighboring cells form
  one of 16 tiles; exactly two tiles are holes. White codes are 1–7, black 9–15,
  zero is empty. Code 7/15 denotes a pawn that retains its initial double step.
- White to move is `True`, Black `False`. The castling bits are White king side
  1, White queen side 2, Black king side 4, Black queen side 8. EP sentinel 64
  means absent. Quiet and full-move counters are natural numbers, not wrapping
  machine integers. Full-move advances after Black, not after every action.
- A canonical action ID in 0–21759 carries only move/Shift endpoints and one of
  four promotion choices. The kernel derives castling and en-passant details.
  No browser-supplied special-move flag has authority.
- Host decoding validates the JSON shape and numeric ranges before constructing
  Bend values. A JavaScript object is not automatically a well-typed Bend value.
  A loaded match is reconstructed from its initial state and command history;
  arbitrary host-supplied history, adjudication or repetition counts are rejected.
- The browser uses the match API to play. The position-only API exists for
  conformance and search, and must not bypass a completed match.

The v1 match proofs apply to typed values and faithfully enforce the specification
even for those values, but do not prove that an arbitrary forged Match has a
coherent history. The application's supported history starts with `Match.start`
or a validated initial position and is advanced by commands. Save decoding and
replay round-trips receive separate integration checks; no arbitrary-state import
correctness theorem is claimed here.

## Laws and what their proofs establish

| Formal law | Plain-English promise | Proof kind |
| --- | --- | --- |
| `step_refines` | Every position request returns exactly the frozen specification's tagged result: `Accepted` with the canonical ID and prescribed successor, or `Rejected` with the original state. | Definitional refinement, checked for every typed input. |
| `rejected_inert` | A prohibited request leaves the entire position unchanged, including turn, rights, EP and counters. | Boolean elimination, not a comparison of board arrays. |
| `accepted_result` | Authorization yields the prescribed accepted result, never a silent no-op or a different action. | Boolean elimination. |
| `accepted_valid` | An accepted successor satisfies the concrete `Spec.valid` predicate. | Constructive extraction from the checked guard and binding to the returned state. |
| `accepted_post` | An accepted successor satisfies `Spec.post`, including the specified action effects and metadata. | Constructive extraction from the checked guard and binding to the returned state. |
| `preserves_valid` | Starting with a valid position, either outcome leaves a valid position. | Case analysis: rejected input retains the old validity witness; accepted input supplies the new one. |
| `start_valid` | Both published B and C starting layouts satisfy the invariant. | Closed computation for the two layouts. |
| `enumeration_refines` | The runtime legal-ID list is exactly the frozen enumerator's list, in the same order with the same multiplicity. Independent parallel chunks cannot reorder, omit or duplicate entries. | Refinement; the sequential and fork/join expressions have the same pure meaning. |
| `replay_composes` | Replaying two concatenated action lists equals replaying the first and then the second. | Structural induction on the first list. |
| `match_refines` | Every match command uses the frozen revision, live-game, draw-offer and move guards and exact prescribed state update. | Definitional refinement for every typed match/command. |
| `match_rejected_inert` | A rejected match command changes nothing: board, history, revision, offers and terminal result all remain intact. | Boolean elimination. |
| `match_accepted_result` | An enabled command returns exactly the specification's match update. | Boolean elimination. |
| `match_replay_composes` | Command replay composes, including stale or rejected commands, without depending on clocks or animation. | Structural induction. |

The acceptance invariant is deliberately enforced at runtime as well as proved:
the old state, action eligibility, candidate state and postconditions are checked.
This is a small verified gate around a reviewed executable specification, not a
claim that we derived all of chess from axioms. Enumeration refinement is not a
separate mathematical theorem that the English rules admit no other moves.

## Concrete rules protected by the specification

Validity includes board shape, legal codes, two holes with no occupants, one king
per side, pawn rank/freshness constraints, coherent castling/EP metadata and the
previous mover's king safety. Eligibility checks geometry, ownership, paths,
special moves, promotion choice and the moving king's safety.

An ordinary move changes its source and destination, plus the captured pawn's
cell for EP or the rook's two cells for castling. A Shift moves one tile into an
orthogonally adjacent hole; it may carry at most one friendly non-king piece.
Transport consumes a pawn's initial double step and a rook's relevant castling
right. A non-promoting Shift increments the quiet counter even when carrying a
pawn; a promoting Shift resets it. Every Shift clears EP. Ordinary pawn moves or
captures reset quiet; other ordinary moves increment it. Side flips once and
full-move increments only after Black.

Match adjudication considers no-legal-action mate/stalemate first, then bare
kings, threefold repetition, then the optional automatic 100-quiet-action draw.
Repetition ignores move counters and retains an EP target only when the capture
is actually legal, including king safety. Terminal matches reject further play;
an explicit undo may reopen them. Every accepted command advances revision once;
a board action appends exactly one state/action/key, while undo removes the last
board action and clears offers/overrides. Draw offers, response and resignation
are pure match commands.

## Evidence that is deliberately separate from proofs

The conformance gate compares all legal IDs and all 223 recorded successors of
14 immutable reference positions, then targeted special-rule and match cases.
Positive moves, loaded and empty Shifts, captures, castling, EP and promotions
prevent a reject-everything implementation from looking safe. Those examples
are finite evidence, not universal theorems.

Freeze creation requires an unchanged-source readiness receipt from both the
proof gate and the full reference-conformance gate. A proof-only receipt cannot
authorize the initial freeze. The negative probes also check that a missing law,
an always-rejecting runtime or a match-guard bypass produces the expected checker
diagnostic, rather than counting an unrelated process or import failure as proof.

The proof gate rejects unfilled laws, TODOs, unsafe definitions and foreign
assumptions in the proof cone. Deliberate mutations in disposable copies must
fail. The emitted JavaScript, host decoder, Canvas, audio, storage and browser
devices require their own integration tests. The compiler/prelude are pinned
trusted components; their checker is not claimed to be independently verified.

Graphics and picking have their own later frozen contract and tests. Native
parallel speed is an empirical question; a JS browser run executes sequentially.
Multiplayer, consensus, cryptographic fairness and blockchain are outside this
sprint's claims.
