# Normative control effects. No MatchKernel/control implementation import;
# shared certified board relation/enumerator supplies board successors and IDs.
# Whole-value expectations preserve every unmentioned Match field.
import Base
import ../Model.bend as P
import ../MatchSpec.bend as T
import ./RuleContracts.bend as R
import ./RuleKernel.bend as K
import ./AdjudicationContracts.bend as A

def without_last(-A: Data, xs: List<&2, A>) -> List<&2, A>:
  match xs:
    case []: []
    case h <> []: []
    case h <> t: h <> without_last(A, t)

def final_position(xs: List<&2, P.Position>) -> Maybe<&2, P.Position>:
  match xs:
    case []: None{}
    case h <> []: Some{h}
    case h <> t: final_position(t)

def undo_finish(+initial: P.Position, actions: List<&2, U32>, states: List<&2, P.Position>, keys: List<&2, T.RepetitionKey>, revision: Nat, policy: T.DrawPolicy, prior: Maybe<&2, P.Position>) -> T.Match:
  match prior:
    case None{}: T.Match{initial, initial, actions, states, keys, Nat.add(1n, revision), policy, T.NoOffer{}, T.NoOverride{}}
    case Some{p}: T.Match{initial, p, actions, states, keys, Nat.add(1n, revision), policy, T.NoOffer{}, T.NoOverride{}}

def undo(m: T.Match) -> T.Match:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      +prior = without_last(P.Position, states)
      undo_finish(initial, without_last(U32, actions), prior, without_last(T.RepetitionKey, keys), revision, policy, final_position(prior))

def offer(m: T.Match, side: Bool) -> T.Match:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, old, forced}:
      T.Match{initial, state, actions, states, keys, Nat.add(1n, revision), policy, T.Offered{side}, forced}

def accept(m: T.Match) -> T.Match:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, old, forced}:
      T.Match{initial, state, actions, states, keys, Nat.add(1n, revision), policy, T.NoOffer{}, T.Agreement{}}

def decline(m: T.Match) -> T.Match:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, old, forced}:
      T.Match{initial, state, actions, states, keys, Nat.add(1n, revision), policy, T.NoOffer{}, forced}

def resignation(side: Bool) -> T.Override:
  match side:
    case True{}: T.WhiteResigned{}
    case False{}: T.BlackResigned{}

def resignation_outcome(side: Bool) -> T.Outcome:
  match side:
    case True{}: T.WhiteResignedOutcome{}
    case False{}: T.BlackResignedOutcome{}

def resign(m: T.Match, side: Bool) -> T.Match:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, old, forced}:
      T.Match{initial, state, actions, states, keys, Nat.add(1n, revision), policy, T.NoOffer{}, resignation(side)}

def nonempty(actions: List<&2, U32>) -> Bool:
  match actions:
    case []: False{}
    case _: True{}

def no_offer(o: T.DrawOffer) -> Bool:
  match o:
    case T.NoOffer{}: True{}
    case T.Offered{_}: False{}

def equal_side(a: Bool, b: Bool) -> Bool:
  match a b:
    case True{} True{}: True{}
    case False{} False{}: True{}
    case _ _: False{}

def other_offer(o: T.DrawOffer, side: Bool) -> Bool:
  match o:
    case T.NoOffer{}: False{}
    case T.Offered{who}: Bool.not(equal_side(who, side))

def undo_guard(m: T.Match, expected: Nat) -> Bool:
  match m:
    case T.Match{_, _, actions, _, _, revision, _, _, _}: Bool.and(Nat.is_eq(revision, expected), nonempty(actions))

def offer_guard(m: T.Match, expected: Nat, live: Bool) -> Bool:
  match m:
    case T.Match{_, _, _, _, _, revision, _, o, _}: Bool.and(Nat.is_eq(revision, expected), Bool.and(live, no_offer(o)))

def reply_guard(m: T.Match, expected: Nat, side: Bool, live: Bool) -> Bool:
  match m:
    case T.Match{_, _, _, _, _, revision, _, o, _}: Bool.and(Nat.is_eq(revision, expected), Bool.and(live, other_offer(o, side)))

def resign_guard(m: T.Match, expected: Nat, live: Bool) -> Bool:
  match m:
    case T.Match{_, _, _, _, _, revision, _, _, _}: Bool.and(Nat.is_eq(revision, expected), live)

def choose(allowed: Bool, old: T.Match, next: T.Match) -> T.StepResult:
  match allowed:
    case True{}: T.Accepted{next}
    case False{}: T.Rejected{old}

# A board action appends exactly one canonical action, successor and occurrence.
# The successor comes from the normative rules; the key is the shared normative
# adjudication key over the certified legal list, not MatchKernel.apply_move.
def move_finish(m: T.Match, id: U32, +next: P.Position, key: T.RepetitionKey) -> T.Match:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      T.Match{initial, next, List.append(&2, U32, actions, [id]),
        List.append(&2, P.Position, states, [next]), List.append(&2, T.RepetitionKey, keys, [key]),
        Nat.add(1n, revision), policy, T.NoOffer{}, T.NoOverride{}}

def move_at(m: T.Match, id: U32, +next: P.Position) -> T.Match:
  move_finish(m, id, next, A.key(next, K.legal_ids(next)))

def move(+m: T.Match, +id: U32) -> T.Match:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      move_at(m, id, R.expected(state, id))

def move_guard(+m: T.Match, expected: Nat, id: U32) -> Bool:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Bool.and(Nat.is_eq(revision, expected), Bool.and(A.live(m), R.legal(state, id)))

# Match initialization is the base case for every subsequent history transition.
def initial(+p: P.Position, policy: T.DrawPolicy) -> T.Match:
  T.Match{p, p, [], [p], [A.key(p, K.legal_ids(p))], 0n, policy, T.NoOffer{}, T.NoOverride{}}
