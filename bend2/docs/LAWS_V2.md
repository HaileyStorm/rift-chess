# Rule laws v2

The mandatory universal source laws are closed relative to the independent
formal contracts below. The v2 facade is integrated into the isolated Bend
application. V1 and its manifest remain immutable historical evidence. The
aggregate readiness receipt, v2 semantic manifest, mutation results, and browser/
native acceptance are separate records; source proofs do not replace them.

The target is every legal Rift Chess 1.0 position, both colors, both starting
layouts, all ordinary and special moves, all legal histories, and all specified
endings. A finite fixture suite cannot meet that universal target.

## Domains

Admissible means `Spec.valid`: a playable structural puzzle with coherent board,
kings, rights, EP, and previous-mover safety. It does not mean opening-reachable.
Reachable additionally requires a position-level legal board-action trace from
one of the two opening layouts. Match terminal policies and controls belong to
CoherentMatch, which requires an admissible initial state and an
accepted command history from the canonical match constructor. Typed/kernel puzzle starts remain supported without a false reachability
assertion. The ordinary browser/native record format contains opening layout
and commands; its imports replay the canonical opening, not arbitrary positions. See the separately
checked `v2/Domains.bend` definitions for the precise history relation and the
kernel version currently used by those definitions.

## Independent relational rules

`RuleContracts.bend` does not import Transitions and never calls
`Spec.authorized`, `Transitions.eligible`, or an implementation candidate.
It defines an input intent predicate and an independent relation on each of the
64 successor squares. Slider paths use collinear-segment membership, whereas v1
walks directional rays. Castling rights are evaluated independently for each
original entitlement, whereas v1 clears a sequence of bits. The relation covers:

* Pawns: one step, fresh starting-rank double step with both squares empty and
  present, diagonal enemy capture, en passant victim, and promotion tags 1–4.
* Knight, bishop, rook, queen, and king geometry; source ownership, present
  endpoints, blocked or missing path squares, friendly targets, and king capture.
* Both colors and wings of orthodox castling: home endpoints, retained original
  rights, correct rook, all intervening squares, and unattacked king path.
* Empty or one-friendly-nonking-passenger Shifts; adjacent source/hole topology;
  offset-preserving relocation; immediate reverse Shifts remain allowed.
* Exact cells enforce captures, EP removal, rook movement, unchanged squares,
  no Shift capture, pawn freshness consumption and ordinary/Shift promotions.
* Exact holes, rights, EP creation/expiry, quiet progress, side flip, fullmove,
  successor admissibility, and complete-action moving-king survival.

Shared dependencies are explicit: Model encodings/accessors, Geometry attacks
(including pinned-piece attacks), and Geometry.valid (definitionally Spec.valid). This is independent of v1's
transition generator, **not** an independent attack or admissibility oracle.

`RuleContracts.expected` constructs the normative successor directly from the
relation's per-cell function and field expectations. `RuleContracts.legal` applies
the full independent relation to that normative successor. `RuleKernel.bend`
implements these fixed meanings. It does not intersect v1 acceptance with the
new contract. It accepts exactly when the new contract accepts its proposed
successor. Its exhaustive canonical enumerator is integrated into the application
as 32 leaves of 680 IDs. Rendered responsiveness and performance measurements
are application evidence owned separately from these source proofs.

## Checked universal laws

For every typed position and action ID, an actual Accepted v2 result satisfies:

| Law | Consequence |
|---|---|
| admissible_old | Input is admissible. |
| admissible_new | Returned state is admissible. |
| legal_intent | Decoded intent satisfies the independent piece/Shift rule predicate. |
| exact_cells | Every returned square has its independently prescribed occupant. |
| exact_topology | Exactly the prescribed holes remain. |
| exact_rights | Each retained entitlement survives its explicit movement/capture rule. |
| ep_creation_expiry_victim | EP is created only by a double pawn move, otherwise cleared, with exact victim. |
| progress_counter | Pawn moves/captures/promotions reset; nonpromoting Shifts increment. |
| turn_fullmove | Side flips once; fullmove advances after Black only. |
| king_survival | Moving king is safe after the entire action. |
| acceptance_complete | Every independently legal intent is Accepted with exactly the independent normative expected state. |
| exact_independent_rules | Every result equals the independent legal predicate's prescribed Accepted/Rejected result for all typed positions and IDs. |
| rejected_inert | Every actual Rejected result contains the original complete position. |

These proofs are constructive **runtime guard extraction**. Acceptance
completeness is relative to the complete executable relational contract. It is
not a closed derivation that an English-legal move always passes successor
admissibility and all relational checks. No reject-everything implementation can
satisfy completeness without also changing the normative relation; positive
reference successor tests check that the current relation actually admits play.

## Additional closed rule-family and match laws

The board proof now closes 30 laws. Seventeen additional individually named
accepted-result predicates cover pawn single step, fresh double step, diagonal
capture; knight, bishop, rook, queen and king geometry; ownership/presence/no
king capture; each castling wing and its exact rook/king effect; EP removal and
self-check; ordinary promotion/freshness; Shift adjacency, zero/one friendly
nonking load, exact passenger offsets/no capture/freshness, and Shift promotion.
All quantify over arbitrary typed positions/IDs and the actual Accepted result.
They are redundant runtime checks with constructive extraction, not examples.

`FilterProof.bend` closes a separate universal equality between the cheap input
intent filter and complete acceptance, so enumeration pruning cannot discard
an accepted action. CanonicalProof separately proves exact membership; OrderingProof proves strict numeric ascending order and uniqueness.

`MatchKernel.bend` reuses the immutable v1 MatchSpec datatypes, but all board
commits, legal lists, repetition and outcome computation use v2. `Facade.bend`
provides compatible application exports. These are checked source APIs; root has integrated the facade into the
application and owns the separate browser acceptance evidence.

`MatchProof.bend` closes thirteen laws: every applied and accepted command
advances revision exactly once; actual rejection is inert; every accepted
MoveCommand satisfies the entire independent board contract on its actual
returned state; Prompt/Off never cause an automatic progress draw; exact Auto100
threshold; no-actions mate/stalemate; actual empty legal-list precedence over
all draw rules; bare-kings precedence; and threefold count before progress.
Some adjudication laws concern the selector's explicit predicates; the
`no_actions_precede_all_draws` law binds the actual v2 enumerator.

`AdjudicationProof.bend` adds ten closed exact laws against a separate
`AdjudicationContracts.bend` that never calls MatchKernel. It specifies the
bare-kings-only material test; an EP target retained precisely when the supplied
legal list contains a pawn action to it, with the matching victim retained or
both sentinels cleared; all repetition-key fields, equality and occurrence
count; and the complete outcome order. The canonical-key theorem supplies the
actual v2 legal list. Thus king-exposing pseudo-EP captures do not enter the key.
No-actions mate/stalemate precede bare kings, automatic threefold, and the
configured quiet-100 rule. Exact override routing covers agreed draws and both
resignations. `actual_live_exact` binds the actual command liveness gate to
absence of that independently specified outcome. Shared dependencies remain
Model encodings, Geometry attacks, and the certified canonical legal list.

V2 additionally corrects the malformed-undo defensive fallback to increment
revision. This does not alter coherent matches and is recorded in the audit.

`MatchControlProof.bend` closes 24 exact command/initialization laws over arbitrary typed
matches, revisions and both side values. Independent whole-match expectations
bind Undo's dropped action/state/key entries and restored prior position;
offers, opposite-side acceptance/decline, agreed draws and both resignations;
and Move's exact normative successor plus one appended action, snapshot and
canonical repetition key. Guard and complete tagged-result laws prevent a
reject-everything implementation from satisfying effects vacuously. Every
unmentioned field is preserved by whole-value equality. Control guards share
the actual live predicate, which the separate exact adjudication law binds to
its independent meaning. The Move guard uses the independent meaning directly. Three constructor laws
bind zero revision, empty action history, singleton initial state and
repetition-key histories, admissible typed puzzle ingress, and both canonical
opening layouts.

## Closed boundary and final evidence

The reviewed essential boundary is an independent normative expected/legal
relation, exact kernel acceptance/completeness, individually named rule-family
laws quantified over arbitrary typed positions (therefore both sides),
Reachable implying Admissible, and actual enumerator membership iff independent
legality. The complete package additionally binds match initialization, command
guards/effects and ledgers, and actual adjudication/live results to independent
expectations. No fixture count substitutes for those universal statements.

The exact canonical membership theorem is closed: an ID occurs in the actual
legal list if and only if the independent relation declares it legal. The
completeness premise contains no range witness supplied by the caller. Closed
bit-vector/Nat conversion, bounded-ID, and fixed-cover proofs supply that
bridge. Strict numeric ascending order and uniqueness are also closed for the
actual canonical list, with no caller-supplied range or ordering witness.
The runtime tree has 32 leaves of 680 IDs; this structure avoids deep browser
recursion without replacing the exhaustive canonical range.

CoherentMatch is defined by accepted v2 command histories from an admissible
initial position, preserving arbitrary puzzle starts. Reachable uses the actual
v2 kernel and has a closed admissibility theorem. HistoryProof closes preservation of admissible initial/current/all stored
states through arbitrary commands, including undo, and derives that invariant
for every CoherentMatch witness. MatchControl laws additionally prove exact
per-command append/drop/restore effects on the state and repetition ledgers.
These guarantees do not classify every arbitrary typed Match as coherent.

`CHECK.bend` imports the exact declaration/witness/API inventory. `check.mjs`
requires the mandatory public symbols, a closed aggregate proof, finite oracle
conformance, and unchanged hashes covering source, fixtures, runtime metadata,
authorities and gate scripts. Its passing receipt is the source-readiness
record. Independent review, mutation rejection, semantic v2 manifest and
application acceptance remain distinct evidence. V1 is never regenerated.

## Research extensions distinguished from user acceptance

A smaller-premise derivation that old admissibility + piece/Shift intent + king
safety entails every redundant successor check would permit removing runtime
checks. It is useful additional assurance, not needed to establish exact
acceptance of the independent frozen full rule relation. The acceptance premise
and expected successor now refer only to RuleContracts, never K.proposed: an
implementation cannot change its candidate to shrink the law's premise.

Full color/rank reflection equivalence of validity, effects, and outcomes is
additional assurance, not required to quantify existing laws over both colors.
Six closed reflection infrastructure laws prove Word/U32 XOR, square, tile,
action and outcome involution. The position transformation is provided for
further work. Fullmove remains color-asymmetric; any later effect-symmetry theorem
must separate its tick instead of asserting raw counter equality.

Neither extension is claimed proved. The semantic freeze and application
completion claims depend on their separate exact-source evidence.
