# Rule-law audit and additive v2 amendment

The v1 proofs remain valid for their actual statements. Their scope does not
equal universal chess-rule correctness. V1 has thirteen refinement, invariant,
and replay laws. Pawn geometry, castling, EP, Shift transport and outcomes are
implemented in normative helpers, but are not individually stated/proved laws.

The semantic freeze should include the true rule authorities:
`docs/01_RULES.md`, `reference/README.md`, `reference/rift_core.py`,
`reference/sliding_chess_sim.py`, `reference/rift_cli.py`, and
`reference/verify_package.py`. These were not all covered by v1. Do not rewrite
v1: a separately reviewed v2 manifest must bind its exact normative dependency
closure, source translation, implementation proof receipt, and compiler pin.

## Domain correction

The reference explicitly permits structurally admissible puzzle imports without
an opening reachability proof. Calling `Spec.valid` a proof of all historical
chess legality would change this contract and be false. Separate Admissible,
Reachable, and CoherentMatch domains preserve this behavior.

An arbitrary typed Match can contain nonempty actions and empty states. V1's undo
guard accepts the nonempty actions, while its malformed-history update fallback
returns the original match without increasing revision. Thus “every accepted
command increases revision” requires coherent histories, or a stronger ingress
guard; it is false over all typed Match constructors. Existing v1 refinement
proofs do not establish coherence.

## Early development evidence (historical)

The proposed independent relation and evaluator are under `bend2/core/v2/`.
`RuleContracts.bend` and `RuleKernel.bend` passed the pinned check-only compiler.
The first proof attempt exceeded a 30-second bound. A 180-second bounded retry
closed the initial twelve declared laws with `All terms check.`; output is
retained in `.artifacts/bend2/v2-laws/proof-attempt-2.txt`.

Finite reference validation found a real defect in the first segment predicate:
an orthogonal corner beside a diagonal was treated as an intermediate diagonal
square. `mate_over_auto100`, action 14985, exposed it. The intended collinearity
requirement was added to the independent path relation before any freeze;
the failed run remains in `conformance-attempt-1.txt`. This is a corrected draft
implementation of the unchanged rule “check the diagonal sequence itself.”

After the collinearity correction, all 14 fixture positions and 223 supplied
successors passed both independent relation validation and v2 successor equality
(`conformance-attempt-2.txt`). The then-current predicate also re-passed all twelve
closed laws (`proof-after-collinearity.txt`). These are separate kinds of evidence.

See LAWS_V2.md for exact closed-law scope and open universal requirements. The application now uses the v2 facade; its rendered acceptance is tracked
separately. A passing finite suite does not close the universal rule laws.

## Expanded staged evidence (historical)

The expanded board declaration has 29 closed actual-result laws, checked in
`proof-29-families.txt`. `filter-proof.txt` closes universal preservation of
acceptance by the input-intent filter. `match-proof-outcomes.txt` closes thirteen
match/adjudication laws, including actual accepted MoveCommand contract
preservation and actual empty legal-list precedence. `facade-check-2.txt`
checks the compatible integration facade.

V2 MatchKernel imports and reuses the original MatchSpec datatypes. It changes
the malformed-undo fallback to increment revision, so the revision theorem now
holds over every typed input whose command is accepted. It remains necessary
to distinguish that counter guarantee from coherent history correctness.

## Independent expectation and history strengthening

The normative successor constructor now lives in RuleContracts.expected, and
RuleContracts.legal contains only the independent normative rule relation. The
complete-acceptance law no longer refers to an implementation-owned candidate
in its premise or required result; exact_independent_rules adds the universal
tagged-result equality. RuleContracts imports only Model and Geometry besides
Base, so it no longer transitively imports v1 Transitions via Spec.valid.
Geometry.valid is definitionally the same admissibility predicate.

HistoryProof closes two stronger invariants: every command preserves admissible
initial/current/stored positions, and every CoherentMatch endpoint has that
invariant. This includes undo's restored snapshot and rejected commands. The
proof is constructive list append/drop/last reasoning, not an added acceptance
guard. The later MatchControl laws below additionally close exact per-command stack/ledger effects.

The generic enumeration range and balanced-tree soundness/completeness proofs
are closed. Public canonical numeric membership, order, and uniqueness then required
the scalar arithmetic bridge; a 300-second direct canonical proof timeout
is preserved in canonical-sound-300.txt. ArithmeticProof now contains closed
word-comparison reflexivity and nonmaximum-word increment strictness lemmas.

## Canonical membership and proof runtime

The canonical soundness and completeness laws now close over the actual v2
legal list. Completeness assumes only the independent legal predicate. The
constructive bridge includes bit-vector/Nat roundtrip, legal-ID bound, offset
membership, and a certified cover of all 21760 canonical IDs. Numeric ascending order
and uniqueness are now closed over the actual canonical list as well.

The ordinary Bun checker hit its call-stack bound on the fixed cover. The same
pinned compiler APIs close it under Node v24.12.0 with a 64 MiB worker stack;
no compiler source, prelude, law, or axiom changed. proof-runtime.json binds the
Node binary and worker options; node-check.mjs verifies those and the compiler
pin. Browser/native generation remains on the original pinned Bun toolchain.
The passed canonical-complete-node64.txt and range-bridge-node64.txt receipts
and all preceding failures remain under the ignored v2-laws evidence folder.

## Exact adjudication strengthening

AdjudicationContracts states the complete outcome relation without importing
MatchKernel. Ten closed laws bind effective EP, actual canonical repetition
keys, key equality/count, the bare-only material test, complete board outcomes,
all overrides, and the actual live gate to that independent relation.
`adjudication-ten-closed.txt` records the pinned Bun `All terms check.` result.
Earlier selector-level laws remain useful local lemmas, but no longer stand in
for an exact complete outcome statement. The relation shares Geometry attacks
and the certified canonical list; it is not a separate chess-legality oracle.

## Exact command and ledger strengthening

Independent MatchControlContracts and 24 closed command/initialization laws now bind the
complete effects and guards of Move, Undo, Offer, Accept, Decline and Resign.
Move appends the normative successor and its independent canonical repetition
key exactly once. Undo drops precisely one action, state and key, restores the
last remaining state or initial state, and clears offer/override. Whole-match
equality also preserves all other fields. Exact tagged-result laws establish
both guard directions, so rejecting all commands cannot satisfy the package.
The actual-live equality from AdjudicationProof closes the shared live input
used by offer/reply/resignation guards. Earlier history-admissibility laws now
have these additional exact per-command ledger guarantees.

The constructor laws additionally bind zero revision, empty action history,
singleton initial state and canonical repetition-key histories, typed admissibility ingress,
and both opening layouts. This supplies the concrete coherent-history base
case as well as the complete command effects.

## Final source-law boundary

OrderingProof closes flat-range sortedness, transfer to the actual balanced
enumerator, canonical ascending order, and canonical uniqueness without caller
range/order witnesses. Generic ordering and the concrete window also passed
independent isolated diagnostic checks; those do not replace the full-file
Node64 pass. The final package has 134 named laws, including the constructive
arithmetic, range, history and reflection support statements.

check.mjs binds the complete 37-module declaration/witness/API entry, the exact
mandatory public symbols, finite conformance, unchanged source hashes and
pinned proof runtime. Its passing aggregate receipt is the source-readiness
record. Rule laws remain relative to the independent formal contracts and
shared Geometry authority; independent English-rule validation, semantic
freeze, and browser/native acceptance are distinct evidence.
