# Rule laws v2

The mandatory universal source laws are closed relative to the independent
formal contracts below. The v2 facade is integrated into the isolated Bend
application. V1 and its manifest remain immutable historical evidence. The
aggregate readiness receipt, v2 semantic manifest, mutation results, and browser/
native acceptance are separate records; source proofs do not replace them.

The target is every legal Rift Chess 1.0 position, both colors, both starting
layouts, all ordinary and special moves, all legal histories, and all specified
endings. A finite fixture suite cannot meet that universal target.

This is revision 2.1 of this document. It corrects imprecise prose and adds a
law index, proof limits and maintenance guidance. No law, proof, contract,
implementation, fixture or reference byte changed; the frozen 2.0 text is
preserved byte-for-byte in `history/LAWS_V2.0.md`, and the revision record at
the end lists each correction.

## Domains

Admissible means `Spec.valid` (`Geometry.valid_position`): a structural
position with exactly two holes; 64 legal cell codes, with pieces only on
present squares; no pawn on its promotion rank and fresh pawns only on their
starting rank; exactly one king per side; a rights mask at most 15 with each
right backed by its home king and rook; fullmove at least 1; either no EP pair
or a geometrically coherent one with a zero progress counter; and the side
that just moved not in check. It does not mean playable (an admissible position may have
no legal action) or opening-reachable. Reachable additionally requires a
position-level legal board-action trace from one of the two opening layouts.
Match terminal policies and controls belong to CoherentMatch, which requires an
admissible initial state and an accepted command history from the canonical
match constructor. Typed/kernel puzzle starts remain supported without a false
reachability assertion. The ordinary browser/native record format contains the
opening layout, draw policy and commands; its imports replay the canonical
opening, not arbitrary positions. See the separately checked `v2/Domains.bend`
definitions for the precise history relation and the kernel version currently
used by those definitions.

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
  rights, correct rook, all intervening squares, not starting in check, and an
  unattacked king path.
* Empty or one-friendly-nonking-passenger Shifts; adjacent source/hole topology;
  offset-preserving relocation; immediate reverse Shifts remain allowed.
* The per-cell function prescribes captures, EP removal, rook movement,
  unchanged squares, pawn freshness consumption and ordinary/Shift promotions.
  Shift destinations are separately required to be empty, so a Shift never
  captures.
* Exact holes, rights, EP creation/expiry, quiet progress, side flip, fullmove,
  successor admissibility, and that the mover's king is not in check after the
  complete action.

Shared dependencies are explicit: Model encodings and accessors; Geometry's
attack relation (including pinned-piece attacks); its one-step king predicate
`king_geometry` (also used by the v1 transition generator) and the `abs_diff`
helper; and `Geometry.valid` (definitionally `Spec.valid`). This is independent
of v1's transition generator, **not** an independent attack, king-step or
admissibility oracle.

`RuleContracts.expected` constructs the normative successor directly from the
relation's per-cell function and field expectations. `RuleContracts.legal`
applies the full independent relation to that normative successor.
`RuleKernel.bend` implements these fixed meanings: `K.proposed` is literally
`R.expected`, and `K.allowed` is the contract applied to it, so the board laws
below hold by definitional extraction. The kernel does not intersect v1
acceptance with the new contract. It accepts exactly when the new contract
accepts its proposed successor. Its exhaustive canonical enumerator is
integrated into the application as 32 leaves of 680 IDs. Rendered
responsiveness and performance measurements are application evidence owned
separately from these source proofs.

## Checked universal laws

For every typed position `p` and action ID, an actual Accepted v2 result `q`
satisfies the following ten laws. Each also implies that the ID decodes
(`id < 21760`), because every `_id` predicate is false for an undecodable ID.

| Law | Consequence |
|---|---|
| admissible_old | Input is admissible. |
| admissible_new | Returned state is admissible. |
| legal_intent | Decoded intent satisfies the independent piece/Shift rule predicate. |
| exact_cells | Every returned square has its independently prescribed occupant. |
| exact_topology | Exactly the prescribed holes remain. |
| exact_rights | Returned rights equal the old rights minus exactly those cleared by a king move, a home-rook move or capture, or a Shift of the tile holding a rook on its home square. |
| ep_creation_expiry_victim | EP is created only by a double pawn move, otherwise cleared, with exact victim. |
| progress_counter | Pawn moves, captures (including EP) and promoting Shifts reset the counter; every other action adds 1. |
| turn_fullmove | Side flips once; fullmove advances after Black only. |
| king_survival | The mover's king is not in check in the returned state. |

Three exactness laws relate the whole step to the independent relation:

| Law | Consequence |
|---|---|
| acceptance_complete | Every ID satisfying the complete independent relation `R.legal` is Accepted with exactly the independent normative expected state. |
| exact_independent_rules | For all typed positions and IDs, with no premise, the step equals Accepted with `R.expected` when `R.legal` holds and Rejected with the original position otherwise. |
| rejected_inert | Every actual Rejected result contains the original complete position. |

These proofs are constructive **runtime guard extraction**. Acceptance
completeness is relative to the complete executable relational contract. It is
not a closed derivation that an English-legal move always passes successor
admissibility and all relational checks. No reject-everything implementation can
satisfy completeness without also changing the normative relation; positive
reference successor tests check that the current relation actually admits play.

## Additional closed rule-family and match laws

The board proof closes 30 laws: the 13 above and seventeen individually named
accepted-result predicates covering pawn single step, fresh double step,
diagonal capture; knight, bishop, rook, queen and king geometry;
ownership/presence/no king capture; each castling wing and its exact rook/king
effect; EP removal and self-check; ordinary promotion/freshness; Shift
adjacency, zero/one friendly nonking load, exact passenger offsets/no
capture/freshness, and Shift promotion. All quantify over arbitrary typed
positions/IDs and the actual Accepted result. They are redundant runtime checks
with constructive extraction, not examples.

`FilterProof.bend` closes a separate universal equality between the cheap input
intent filter and complete acceptance, so enumeration pruning cannot discard
an accepted action. CanonicalProof separately proves exact membership;
OrderingProof proves strict numeric ascending order and uniqueness.

`MatchKernel.bend` reuses the immutable v1 MatchSpec datatypes, but all board
commits, legal lists, repetition and outcome computation use v2. `Facade.bend`
provides compatible application exports. These are checked source APIs; root
has integrated the facade into the application and owns the separate browser
acceptance evidence.

`MatchProof.bend` closes thirteen laws: every applied and accepted command
advances revision exactly once; actual rejection is inert; every accepted
MoveCommand satisfies the entire independent board contract on its actual
returned state; and actual empty legal-list precedence over all draw rules
(with no override). The other eight are facts about the outcome selector's
helper functions with literal arguments: its Prompt/Off selectors never produce
an automatic progress draw, its no-actions selector yields mate or stalemate,
bare kings precede repetition and progress, threefold precedes progress, the
Auto100 selector's threshold is exactly 100, and the non-bare selector routes to
the threefold count. The corresponding statements about actual
match outcomes follow from `full_outcome_exact` below; the
`no_actions_precede_all_draws` law binds the actual v2 enumerator.

`AdjudicationProof.bend` adds ten closed exact laws against a separate
`AdjudicationContracts.bend` that never calls MatchKernel. It specifies the
bare-kings-only material test; an EP target retained precisely when the
supplied legal list contains an ordinary-move ID to the target whose source
holds a non-fresh pawn (on admissible positions, exactly a pawn action to it),
with the matching victim retained or both sentinels cleared; all repetition-key
fields, equality and occurrence count; and the complete outcome order. The
canonical-key theorem supplies the actual v2 legal list. It follows from
canonical membership (no single law states it) that king-exposing pseudo-EP
captures do not enter the key. No-actions mate/stalemate precede bare kings,
automatic threefold, and the configured quiet-100 rule. Exact override routing
covers agreed draws and both resignations. `actual_live_exact` binds the actual
command liveness gate to absence of that independently specified outcome.
Shared dependencies remain Model encodings, Geometry attacks, and the certified
canonical legal list.

V2 additionally corrects the malformed-undo defensive fallback to increment
revision. That branch is unreachable in coherent matches, which always hold one
more state than actions; this length invariant is argued informally and has no
law. The change is recorded in the audit.

`MatchControlProof.bend` closes 24 exact command/initialization laws over
arbitrary typed matches, revisions and both side values. Independent
whole-match expectations bind Undo's dropped action/state/key entries and
restored prior position; offers, opposite-side acceptance/decline, agreed draws
and both resignations; and Move's exact normative successor plus one appended
action, snapshot and canonical repetition key. Guard and complete tagged-result
laws prevent a reject-everything implementation from satisfying effects
vacuously. Every unmentioned field is preserved by whole-value equality. The
Offer, Accept, Decline and Resign guards use the implementation's `M.live`,
which the separate exact adjudication law `actual_live_exact` binds to its
independent meaning. The Move guard uses the independent `A.live` and
`R.legal` directly. Three constructor laws bind zero revision, empty action
history, singleton initial state and repetition-key histories, admissible typed
puzzle ingress, and both canonical opening layouts.

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
Together, membership, order and uniqueness determine the list exactly, which is
why both contracts may use the implementation enumerator `K.legal_ids`. The
runtime tree has 32 leaves of 680 IDs; this structure avoids deep browser
recursion without replacing the exhaustive canonical range.

CoherentMatch is defined by accepted v2 command histories from an admissible
initial position, preserving arbitrary puzzle starts. Reachable uses the actual
v2 kernel and has a closed admissibility theorem. HistoryProof closes
preservation of admissible initial/current/all stored states through arbitrary
commands, including undo, and derives that invariant for every CoherentMatch
witness. MatchControl laws additionally prove exact per-command
append/drop/restore effects on the state and repetition ledgers. These
guarantees do not classify every arbitrary typed Match as coherent.

`CHECK.bend` imports the exact declaration/witness/API inventory. `check.mjs`
requires that `CHECK.bend` imports exactly the proof, law and facade modules
present, that 22 named mandatory laws and their proofs exist, that the aggregate
proof is closed with no holes and no unsafe or foreign dependency under the
pinned Node runtime and compiler, that finite oracle conformance passes (14
positions, 223 successors), and that none of its hashed inputs (source,
fixtures, runtime metadata, authorities and gate scripts) changes during the
run. Its passing receipt is the source-readiness record. Comparison with the
frozen manifest is done by `freeze-v2.mjs`. Independent review, mutation
rejection, semantic v2 manifest and application acceptance remain distinct
evidence. V1 is never regenerated.

## Proof limits

These limits do not make any law false; they say what a closed law does and does
not establish.

1. **Board laws hold by definition.** Because the kernel's proposed successor is
   `R.expected`, six conjuncts of `R.legal` (cells, topology, rights, EP,
   progress, turn/fullmove) are true of it by construction. The remaining
   checks are decoding, old and new admissibility, intent, king safety and the
   17 rule-family conjuncts; that the rule-family conjuncts follow from the
   others is plausible but not proved (see Research extensions). The assurance
   therefore rests on the normative definitions being
   right, which is checked by review, the 14-position/223-successor
   conformance suite and the six mutation controls.
2. **`coherent_initial` projects a field** the CoherentMatch base constructor
   already requires. It is not vacuous (CoherentMatch is inhabited).
3. **Eight MatchLaws are `{==}` identities** about selector helpers: the six
   literal-flag selector laws above plus `automatic_progress_threshold` and
   `nonbare_uses_threefold_count`.
4. **Four control guards depend on `M.live`** and are independent only together
   with `actual_live_exact`.
5. **AdjudicationContracts closely restates** MatchKernel's adjudication code;
   the EP fold differs and the draw selectors are factored differently (one
   `C.draws` versus the kernel's `bare`/`counted` helpers), with identical
   meaning. "Independent" means separately stated, not a different algorithm.
6. **The EP key test uses the non-fresh pawn type** and relies on admissibility.
   No law directly states that the key keeps EP exactly when a legal EP capture
   exists.
7. **Unproved informal claims:** the undo-fallback unreachability (no length
   invariant law) and the king-exposing pseudo-EP inference (derived, not a
   named law).
8. **Unmodeled rules:** two-player Undo consent (`docs/01_RULES.md`) is a UI
   responsibility; Undo has no actor field and is allowed after the game ends,
   where it also clears resignations and agreements.
9. **Duplicated statements:** `advance_successor` appears in both
   ArithmeticLaws and RangeBridgeLaws with the same meaning, and
   `rejected_inert` names different laws in LAWS and MatchLaws, so the 134
   declarations contain 133 distinct statements.
10. **`enumeration-check.ts`** is hashed but no gate runs it.

## Law index

134 laws in 18 declaration modules under `bend2/core/v2`. Each is filled by a
`def Laws.<name>(...)` in the paired proof module; the numbers are the law's
line and the proof's line. `R` is RuleContracts, `K` RuleKernel, `M`
MatchKernel, `C` the matching contracts module, `q` the returned position.

### LAWS.bend → PROOF.bend (30)

The first 27 are accepted-result laws: for all `p` and `id`, if
`K.step(p, id)` is Accepted then `R.<name>_id(p, id, q)` holds.

| Law | Lines | Statement |
|---|---|---|
| admissible_old | 7 → 27 | `G.valid(p)`. |
| admissible_new | 13 → 40 | `G.valid(q)`. |
| legal_intent | 19 → 53 | Move: ownership, presence, target, tag and piece geometry; Shift: topology, passenger and tag. |
| exact_cells | 25 → 66 | Every one of the 64 squares of `q` equals `R.cell(p, a, s)`. |
| exact_topology | 31 → 79 | Move: holes unchanged; Shift: holes XOR both tile masks. |
| exact_rights | 37 → 92 | Rights equal the old rights masked by survival (king move, home rook moved or captured, home-rook tile shifted). |
| ep_creation_expiry_victim | 43 → 105 | A two-rank pawn move sets EP to the midpoint and the victim to the destination; otherwise both are 64. |
| progress_counter | 49 → 118 | Move: 0 after a pawn move, capture or EP, else +1. Shift: 0 when promoting, else +1. |
| turn_fullmove | 55 → 131 | Side flips; fullmove +1 exactly when Black moved. |
| king_survival | 61 → 144 | The mover is not in check in `q`. |
| pawn_single_step | 67 → 157 | A one-step forward pawn move has a present, empty target. |
| pawn_double_step_freshness | 73 → 170 | A two-step pawn move is by a fresh pawn on its start rank, with target and midpoint present and empty. |
| pawn_diagonal_capture | 79 → 183 | A file-changing pawn move is one diagonal step onto an enemy piece, or EP onto an empty target with an enemy pawn victim. |
| knight_geometry | 85 → 196 | File/rank distances are {1, 2}. |
| bishop_geometry_path | 91 → 209 | Diagonal, with every intermediate square present and empty. |
| rook_geometry_path | 97 → 222 | Same file or rank, clear path. |
| queen_geometry_path | 103 → 235 | Aligned, clear path. |
| king_geometry_castle | 109 → 248 | One king step, or `R.castle`. |
| ownership_presence_no_king_capture | 115 → 261 | Own source piece, distinct present squares, target neither own nor a king, valid promotion tag. |
| castling_kingside | 121 → 274 | A two-file king move to the g-file satisfies `castle`; king on g, rook on f, origin squares empty. |
| castling_queenside | 127 → 287 | The same for the c-file with the rook from a to d. |
| en_passant_capture | 133 → 300 | An EP capture empties the victim square and leaves the mover out of check. |
| ordinary_promotion_freshness | 139 → 313 | A pawn move has tag 1–4 exactly on the last rank; the target holds the promoted piece or a non-fresh pawn. |
| shift_adjacent_hole | 145 → 326 | Tiles `a, b < 16`, orthogonally adjacent, `a` present, `b` a hole. |
| shift_zero_or_one_friendly_nonking | 151 → 339 | At most one occupant, which is the mover's non-king piece. |
| shift_offset_no_capture_pawn_freshness | 157 → 352 | For each of four offsets: destination empty before, source empty after, destination holds the transported piece. |
| shift_promotion_all_four | 163 → 362 | Tag 1–4 exactly when a pawn lands on its last rank, with the Shift cell relation. |
| acceptance_complete | 169 → 371 | `R.legal(p, id)` implies `K.step(p, id) = Accepted{id, R.expected(p, id)}`. |
| rejected_inert | 175 → 379 | Not accepted implies `K.step(p, id) = Rejected{p}`. |
| exact_independent_rules | 181 → 387 | `K.step(p, id)` is Accepted with `R.expected` if `R.legal`, else Rejected with `p`; no premise. |

### Enumeration, filter, bounds, domains and history (16)

| Module: law | Lines | Statement |
|---|---|---|
| Filter: filter_preserves_every_acceptance | 4 → 29 | `K.fast_allowed(p, id) = K.allowed(p, id)`. |
| Canonical: canonical_member_sound | 7 → 24 | Membership in `K.legal_ids(p)` implies `R.legal(p, id)`. |
| Canonical: canonical_member_complete | 13 → 40 | `R.legal(p, id)` implies membership in `K.legal_ids(p)`. |
| Ordering: flat_range_sorted | 39 → 258 | Within the ID window, `legal_range` is strictly increasing. |
| Ordering: planned_tree_sorted | 46 → 307 | Given a plan and the window bound, `legal_tree` is strictly increasing. |
| Ordering: canonical_ascending | 55 → 320 | `K.legal_ids(p)` is strictly increasing. |
| Ordering: canonical_unique | 59 → 323 | `K.legal_ids(p)` has no duplicates. |
| Enumeration: range_member_sound | 38 → 63 | Membership in `legal_range` implies `fast_allowed`. |
| Enumeration: range_member_complete | 46 → 131 | In range and `fast_allowed` implies membership in `legal_range`. |
| Enumeration: tree_member_sound | 55 → 350 | Membership in `legal_tree` implies `fast_allowed`. |
| Enumeration: tree_member_complete | 64 → 353 | In the tree range and `fast_allowed` implies membership in `legal_tree`. |
| Bounds: every_legal_id_is_canonical | 5 → 12 | `R.legal(p, id)` implies `id < 21760`. |
| Domains: reachable_admissible | 10 → 57 | Reachable implies `Spec.valid`. |
| Domains: coherent_initial | 16 → 80 | A CoherentMatch has an admissible initial position. |
| History: commands_preserve_admissible_history | 8 → 97 | Admissible initial, current and stored states are preserved by any command. |
| History: coherent_history_admissible | 13 → 104 | Every CoherentMatch has an admissible history. |

Support lemmas used by these: Arithmetic (10), NoWrap (5), WordNat (4),
RangeBridge (7), RangeComposition (2) and Roundtrip (7), listed below. The
Reflection lemmas (6), also listed below, are infrastructure for further work;
no current proof uses them.

### MatchLaws.bend → MatchProof.bend (13)

| Law | Lines | Statement |
|---|---|---|
| every_command_revision | 10 → 24 | `revision(apply_enabled(m, c)) = 1 + revision(m)`. |
| accepted_revision | 14 → 40 | An accepted step's result has revision `1 + revision(m)`. |
| rejected_inert | 19 → 47 | A rejected step is `Rejected{m}`. |
| prompt_never_automatic_progress | 24 → 49 | Selector: `auto100(Prompt, quiet) = None`. |
| off_never_automatic_progress | 27 → 50 | Selector: `auto100(Off, quiet) = None`. |
| checked_no_actions_mate | 30 → 51 | Selector: no actions in check is checkmate for the side not to move. |
| unchecked_no_actions_stalemate | 33 → 52 | Selector: no actions out of check is stalemate. |
| bare_before_repetition_progress | 36 → 53 | Selector: bare kings gives BareKings. |
| threefold_before_progress | 43 → 54 | Selector: a counted repetition gives Threefold (the count argument is unused). |
| accepted_move_rule_contract | 52 → 90 | An accepted MoveCommand's result satisfies `R.contract` on the match state. |
| no_actions_precede_all_draws | 59 → 98 | With no override, an empty `K.legal_ids(p)` makes the forced outcome the checked mate/stalemate selector. |
| automatic_progress_threshold | 65 → 103 | `auto100(Auto100, q)` is Progress100 exactly when `q ≥ 100`. |
| nonbare_uses_threefold_count | 68 → 104 | Without bare kings, a key count of at least 3 is Threefold, else the progress selector. |

### AdjudicationLaws.bend → AdjudicationProof.bend (10)

Each equates a MatchKernel function with its AdjudicationContracts meaning.

| Law | Lines | Statement |
|---|---|---|
| effective_ep_exact | 8 → 72 | `M.effective_ep = C.effective` for any board, EP and ID list. |
| repetition_key_exact | 13 → 76 | `M.repetition_key(p, ids) = C.key(p, ids)`. |
| canonical_repetition_key_exact | 17 → 82 | The same with `ids = K.legal_ids(p)`. |
| repetition_equality_exact | 20 → 33 | `M.key_equal = C.key_equal`. |
| repetition_count_exact | 24 → 43 | `M.count_key = C.count`. |
| only_bare_kings_material | 28 → 92 | `M.is_bare_kings = C.bare`. |
| board_outcome_exact | 31 → 141 | `M.board_outcome = C.board` for any ID list. |
| full_outcome_exact | 37 → 146 | `M.outcome.forced = C.expected` for any override. |
| actual_live_exact | 43 → 163 | `M.live(m) = C.live(m)`. |
| actual_outcome_exact | 46 → 158 | `M.outcome(m) = C.outcome(m)`. |

### MatchControlLaws.bend → MatchControlProof.bend (24)

| Law | Lines | Statement |
|---|---|---|
| undo_effect | 13 → 59 | `apply_undo(m) = C.undo(m)`. |
| undo_guard | 17 → 86 | Undo is enabled exactly when the revision matches and there is an action. |
| undo_step | 22 → 129 | The step is the tagged choice of the guard and `C.undo(m)`. |
| offer_effect | 27 → 90 | `apply_offer = C.offer`. |
| offer_guard | 32 → 94 | Enabled exactly when the revision matches, `M.live(m)`, and no offer is outstanding. |
| offer_step | 38 → 134 | Tagged choice between rejection and `C.offer`. |
| accept_effect | 44 → 98 | `apply_accept = C.accept`. |
| accept_guard | 49 → 102 | Enabled exactly when the revision matches, `M.live(m)`, and the offer came from the other side. |
| accept_step | 55 → 139 | Tagged choice. |
| decline_effect | 61 → 106 | `apply_decline = C.decline`. |
| decline_guard | 66 → 110 | The same guard as accept. |
| decline_step | 72 → 144 | Tagged choice. |
| resign_effect | 78 → 114 | `apply_resign = C.resign`. |
| resign_guard | 83 → 119 | Enabled exactly when the revision matches and `M.live(m)`. |
| resign_step | 89 → 149 | Tagged choice. |
| resign_outcome | 95 → 154 | The outcome after resigning is that side's resignation. |
| accept_outcome | 99 → 159 | The outcome after accepting is Agreed. |
| move_effect | 105 → 175 | `R.legal(state, id)` implies `apply_move(m, id) = C.move(m, id)`. |
| accepted_move_exact_match | 111 → 203 | An accepted Move steps to `Accepted{C.move(m, id)}`. |
| move_guard | 118 → 207 | Enabled exactly when the revision matches, `A.live(m)` and `R.legal(state, id)`. |
| move_step | 124 → 226 | Tagged choice between rejection and `C.move`. |
| make_match_exact | 130 → 231 | `make_match(p, policy) = C.initial(p, policy)`. |
| from_position_exact | 135 → 237 | `from_position` is `Some(C.initial)` exactly for admissible `p`, else None. |
| start_exact | 140 → 241 | `start(layout, policy) = C.initial(Model.start(layout), policy)`. |

### Support lemmas (41)

| Module: law | Lines | Statement |
|---|---|---|
| Arithmetic: nat_lt_trans | 5 → 29 | `a < b` and `b < c` imply `a < c` on Nat. |
| Arithmetic: u32_lt_trans | 13 → 95 | The same on U32. |
| Arithmetic: word_cmp_eq | 21 → 80 | `Word.cmp = EQ` implies equality. |
| Arithmetic: u32_cmp_eq | 28 → 89 | `U32.cmp = EQ` implies equality. |
| Arithmetic: word_cmp_refl | 50 → 129 | `Word.cmp(w, w) = EQ`. |
| Arithmetic: word_inc_strict | 55 → 178 | A word that is not all ones is below its increment. |
| Arithmetic: word_add_one | 61 → 208 | `add(w, 1) = inc(w)`. |
| Arithmetic: u32_add_one | 66 → 223 | `x + 1 = U32.inc(x)`. |
| Arithmetic: advance_successor | 70 → 230 | `advance(n, s + 1) = advance(n, s) + 1`. |
| Arithmetic: advance_from_zero | 76 → 237 | `advance(n, 0) = from_nat(n)`. |
| NoWrap: word_inc_count | 5 → 28 | Not all ones implies `to_nat(inc w) = 1 + to_nat(w)`. |
| NoWrap: u32_inc_count | 11 → 31 | The same for U32. |
| NoWrap: from_nat_count | 16 → 165 | `n < 21760` implies `to_nat(from_nat n) = n`. |
| NoWrap: from_nat_injective | 21 → 174 | `from_nat` is injective below 21760. |
| NoWrap: from_nat_lt | 29 → 226 | `from_nat` preserves `<` below 21760. |
| WordNat: digit_cmp | 8 → 5 | Comparing `2n + bit` values reduces to `Word.cmp.fin`. |
| WordNat: word_cmp_nat | 14 → 31 | `Word.cmp` equals `Nat.cmp` of the values. |
| WordNat: u32_cmp_nat | 19 → 45 | The same for U32. |
| WordNat: canonical_nat_bound | 23 → 48 | `id < 21760` as U32 implies the Nat bound. |
| RangeBridge: offset_member | 9 → 12 | `off < n` implies `InRange(n, s, advance(off, s))`. |
| RangeBridge: range_split | 15 → 27 | `InRange(l + r)` implies the left or the right part. |
| RangeBridge: range_join | 22 → 35 | The converse of range_split. |
| RangeBridge: advance_680 | 29 → 49 | `advance(680, 0) = 680`. |
| RangeBridge: planned_range_to_tree | 39 → 75 | A plan and `InRange` imply `TreeRange`. |
| RangeBridge: canonical_range_to_tree | 53 → 101 | `QueryRange(21760, 0, id)` implies `TreeRange(5, 0, 21760, id)`. |
| RangeBridge: advance_successor | 57 → 103 | Same statement as the Arithmetic law. |
| RangeComposition: range_composes | 6 → 14 | `legal_range(l + r)` is `legal_range(l)` followed by `legal_range(r)` from `advance(l, start)`. |
| RangeComposition: planned_tree_flat | 12 → 71 | Under a plan, `legal_tree = legal_range(width)`. |
| Roundtrip: word_inc_dec | 21 → 18 | `inc(dec w) = w`. |
| Roundtrip: word_zero_count | 25 → 28 | A zero word has value 0. |
| Roundtrip: word_count_zero | 30 → 36 | Value 0 implies the zero word. |
| Roundtrip: word_dec_count | 35 → 47 | Nonzero implies `to_nat w = 1 + to_nat(dec w)`. |
| Roundtrip: from_nat_value | 40 → 82 | `to_nat id = n` implies `from_nat n = id`. |
| Roundtrip: u32_nat_roundtrip | 45 → 89 | `from_nat(to_nat id) = id`. |
| Roundtrip: advance_value_roundtrip | 48 → 91 | `advance(to_nat id, 0) = id`. |
| Reflection: word_xor_involution | 5 → 7 | `(a XOR m) XOR m = a` for n-bit words. |
| Reflection: u32_xor_involution | 10 → 27 | The same for U32. |
| Reflection: square_involution | 14 → 31 | `square(square s) = s` (rank flip, XOR 56). |
| Reflection: tile_involution | 17 → 33 | `tile(tile t) = t` (tile-row flip, XOR 12). |
| Reflection: action_involution | 20 → 35 | `action(action a) = a`. |
| Reflection: outcome_involution | 24 → 50 | `outcome(outcome o) = o`. |

Counts: 30 board; 16 filter, canonical, ordering, enumeration, bounds, domains
and history (1 + 2 + 4 + 4 + 1 + 2 + 2); 13 match; 10 adjudication; 24 control;
41 support lemmas (Arithmetic 10, NoWrap 5, WordNat 4, RangeBridge 7,
RangeComposition 2, Roundtrip 7, Reflection 6). Total 134.

## Re-verifying and extending

Run from the repository root with the pinned toolchain (`bend2/TOOLCHAIN.json`,
checkout clean at `.artifacts/toolchains/bend`) and the Node binary recorded in
`bend2/core/v2/proof-runtime.json`:

1. `node bend2/tools/amend.mjs` and `node bend2/tools/freeze-v2.mjs`: cheap.
   They check the amendment chain, v1 lineage, required inputs, frozen hashes
   (through reviewed amendments) and evidence hashes.
2. `node bend2/core/v2/check.mjs`: the aggregate proof (up to 10 minutes) plus
   conformance; writes `.artifacts/bend2/v2-laws/<stamp>/receipt.json`.
3. `node bend2/tools/mutate-v2.mjs`: the six mutation controls, each with a
   positive control and a rejected mutant.
4. Focused checks: `node bend2/core/v2/node-check.mjs bend2/core/v2/XProof.bend`
   (Canonical and RangeBridge need this runner), or
   `node bend2/tools/bend.mjs <file> --check-only`.

To add a law:

1. Declare `law name:` in a `*Laws.bend` module (or `LAWS.bend`) and fill it
   with `def Laws.name(...)` in the paired `*Proof.bend` (or `PROOF.bend`,
   which must import `./LAWS.bend`).
2. A new module pair must be added to `CHECK.bend`; `check.mjs` requires its
   imports to equal the directory's proof, law and facade modules exactly.
3. Add mandatory laws to `requiredLaws` in `check.mjs`; enumeration-critical
   laws are also listed in `freeze-v2.mjs`.
4. Keep `@unsafe`, holes and foreign code out of the proof cone and import
   nothing from outside the repository.
5. Any change to law, proof, implementation, test, fixture or reference bytes is
   a new semantic version under `LAW_CHANGE_POLICY.md` (preserve v2, record the
   defect, review, new proofs and controls, a new manifest linked to the old).
   `freeze-v2.mjs --create` cannot overwrite `semantic-v2.json`, so this needs a
   new destination and tooling. Update this document, `RULE_LAW_AUDIT.md` and
   the counts in the README, SPRINT and VERIFICATION records.

Prose-only corrections to this document, compiler pin moves and changes to
tools under `bend2/tools/` are recorded as reviewed amendments in
`bend2/laws/amendments/` (`bend2/tools/amend.mjs`), which leave every frozen
manifest byte-identical. The v2 gate itself (`bend2/core/v2/check.mjs`,
`node-check.mjs`, `proof-runtime.json`) is protected: changing it requires a
new semantic version.
See "Updating the Bend toolchain" in `LOCAL_BEND_GUIDE.md`.

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

## Revision record

Revision 2.1 (amendment 002) changes prose only. No correction strengthens or
weakens a law; the formal statements are untouched. The exact byte diff
against `history/LAWS_V2.0.md` is `history/LAWS_V2.1.diff`. The 2.0 file mixed
CRLF and LF line endings; 2.1 uses LF throughout, so
`history/LAWS_V2.1.prose.diff` repeats the diff ignoring carriage returns.

Principal corrections (smaller rewordings, such as the `exact_independent_rules`
row and the "30 laws" sentence, clarify without correcting):

| 2.0 text | Defect | Correction |
|---|---|---|
| "Admissible means `Spec.valid`: a playable structural puzzle ..." | Admissible positions may have no legal action; the list omitted holes, fullmove, the rights bound, the EP progress condition and pawn-rank conditions. | Every `Geometry.valid_position` conjunct; "not playable" stated. |
| "record format contains opening layout and commands" | The record also stores the draw policy. | Draw policy added. |
| "Exact cells enforce ... no Shift capture" | The cell function prescribes rather than checks; no-capture comes from the empty-destination requirement. | Split into prescription and the separate empty-destination rule. |
| "unattacked king path" (castling) | Omitted the not-in-check-at-start condition present in the relation. | Added. |
| "complete-action moving-king survival", "Moving king is safe" | The check concerns the mover's king, not the moved piece. | "The mover's king is not in check". |
| Shared-dependency list | Omitted `king_geometry` (shared with v1) and `abs_diff`. | Listed; "not an independent king-step oracle". |
| "`RuleKernel.bend` implements these fixed meanings" | Did not disclose definitional extraction. | States `K.proposed = R.expected`. |
| Table header "an actual Accepted v2 result satisfies" | Three rows are not accepted-result laws; the undecodable-ID consequence was implicit. | Split into two tables; decoding stated. |
| `exact_rights` row | The law is an equality and covers Shifts. | Exact survival rule. |
| `progress_counter` row | Omitted ordinary quiet moves. | Reset/increment rule for every action. |
| `acceptance_complete` row "independently legal intent" | The premise is full `R.legal`, not intent. | Premise stated. |
| MatchProof "Prompt/Off never cause ..." | These are selector-level facts. | Disclosed; the actual-outcome route named. |
| "a pawn action to it" (EP key) | The test is an ordinary-move ID from a non-fresh pawn; equivalence needs admissibility. | Exact test stated. |
| "Thus king-exposing pseudo-EP captures do not enter the key." | A derived inference, not a named law. | Marked as derived. |
| "This does not alter coherent matches." | True but not proved. | Marked informal. |
| Control guards "share the actual live predicate" | Four guards use `M.live`; the Move guard uses `A.live`. | Stated per guard. |
| `check.mjs` "unchanged hashes covering ..." | It compares hashes within one run; manifest comparison is `freeze-v2.mjs`. | Exact requirements listed. |

Added: the law index, proof limits and re-verification guidance. Not changed:
`RULE_LAW_AUDIT.md`, which is frozen historical evidence; its "29 closed
actual-result laws" reflects an earlier stage (the current board count is 27
accepted-result laws plus 3 exactness laws).

No semantic defect was found: every law agrees with `docs/01_RULES.md`, and
the 134 declarations each have a closed proof.
