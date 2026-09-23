import Base
import ../Model.bend as P
import ../Geometry.bend as G
import ../MatchSpec.bend as T
import ./MatchKernel.bend as M
import ./MatchControlContracts.bend as C
import ./MatchControlLaws.bend as Laws
import ../ProofKit.bend as L
import ./RuleContracts.bend as R
import ./RuleKernel.bend as K
import ./AdjudicationContracts.bend as A
import ./AdjudicationLaws.bend as AL
import ./AdjudicationProof.bend as AP

def drop_last_u32(+xs: List<&2, U32>) -> {M.drop_last_u32(xs) == C.without_last(U32, xs) : List<&2, U32>}:
  match xs:
    case []: {==}
    case +h <> +t:
      match t:
        case []: {==}
        case k <> rest: Equal.cong(List<&2, U32>, List<&2, U32>, ys => h <> ys, M.drop_last_u32(t), C.without_last(U32, t), drop_last_u32(t))

def drop_last_positions(+xs: List<&2, P.Position>) -> {M.drop_last_positions(xs) == C.without_last(P.Position, xs) : List<&2, P.Position>}:
  match xs:
    case []: {==}
    case +h <> +t:
      match t:
        case []: {==}
        case k <> rest: Equal.cong(List<&2, P.Position>, List<&2, P.Position>, ys => h <> ys, M.drop_last_positions(t), C.without_last(P.Position, t), drop_last_positions(t))

def drop_last_keys(+xs: List<&2, T.RepetitionKey>) -> {M.drop_last_keys(xs) == C.without_last(T.RepetitionKey, xs) : List<&2, T.RepetitionKey>}:
  match xs:
    case []: {==}
    case +h <> +t:
      match t:
        case []: {==}
        case k <> rest: Equal.cong(List<&2, T.RepetitionKey>, List<&2, T.RepetitionKey>, ys => h <> ys, M.drop_last_keys(t), C.without_last(T.RepetitionKey, t), drop_last_keys(t))

def last_position(+xs: List<&2, P.Position>) -> {M.last_position(xs) == C.final_position(xs) : Maybe<&2, P.Position>}:
  match xs:
    case []: {==}
    case h <> +t:
      match t:
        case []: {==}
        case k <> rest: last_position(t)

def undo_got(+initial: P.Position, +actions: List<&2, U32>, +states: List<&2, P.Position>, +keys: List<&2, T.RepetitionKey>, +revision: Nat, +policy: T.DrawPolicy, +got: Maybe<&2, P.Position>)
  -> {M.apply_undo.parts.got(initial, actions, states, keys, revision, policy, got) == C.undo_finish(initial, actions, states, keys, revision, policy, got) : T.Match}:
  match got:
    case None{}: {==}
    case Some{p}: {==}

def undo_parts(+initial: P.Position, +actions: List<&2, U32>, +states: List<&2, P.Position>, +keys: List<&2, T.RepetitionKey>, +revision: Nat, +policy: T.DrawPolicy)
  -> {M.apply_undo.parts(initial, actions, states, keys, revision, policy) == C.undo_finish(initial, actions, states, keys, revision, policy, C.final_position(states)) : T.Match}:
  Equal.trans(T.Match, M.apply_undo.parts(initial, actions, states, keys, revision, policy), C.undo_finish(initial, actions, states, keys, revision, policy, M.last_position(states)), C.undo_finish(initial, actions, states, keys, revision, policy, C.final_position(states)),
    undo_got(initial, actions, states, keys, revision, policy, M.last_position(states)),
    Equal.cong(Maybe<&2, P.Position>, T.Match, got => C.undo_finish(initial, actions, states, keys, revision, policy, got), M.last_position(states), C.final_position(states), last_position(states)))

def Laws.undo_effect(m):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      %L.sym(List<&2, U32>, M.drop_last_u32(actions), C.without_last(U32, actions), drop_last_u32(actions)) : {M.apply_undo.parts(initial, _, M.drop_last_positions(states), M.drop_last_keys(keys), revision, policy) == C.undo(m) : T.Match}
      %L.sym(List<&2, P.Position>, M.drop_last_positions(states), C.without_last(P.Position, states), drop_last_positions(states)) : {M.apply_undo.parts(initial, C.without_last(U32, actions), _, M.drop_last_keys(keys), revision, policy) == C.undo(m) : T.Match}
      %L.sym(List<&2, T.RepetitionKey>, M.drop_last_keys(keys), C.without_last(T.RepetitionKey, keys), drop_last_keys(keys)) : {M.apply_undo.parts(initial, C.without_last(U32, actions), C.without_last(P.Position, states), _, revision, policy) == C.undo(m) : T.Match}
      undo_parts(initial, C.without_last(U32, actions), C.without_last(P.Position, states), C.without_last(T.RepetitionKey, keys), revision, policy)


def nonempty_guard(+actions: List<&2, U32>) -> {M.enabled_undo.actions(actions) == C.nonempty(actions) : Bool}:
  match actions:
    case []: {==}
    case h <> t: {==}

def no_offer_guard(+offer: T.DrawOffer) -> {M.offer_is_none(offer) == C.no_offer(offer) : Bool}:
  match offer:
    case T.NoOffer{}: {==}
    case T.Offered{side}: {==}

def other_offer_guard(+offer: T.DrawOffer, +side: Bool) -> {M.offer_from_other(offer, side) == C.other_offer(offer, side) : Bool}:
  match offer side:
    case T.NoOffer{} _: {==}
    case T.Offered{True{}} True{}: {==}
    case T.Offered{True{}} False{}: {==}
    case T.Offered{False{}} True{}: {==}
    case T.Offered{False{}} False{}: {==}

def Laws.undo_guard(m, expected):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: Equal.cong(Bool, Bool, b => Bool.and(Nat.is_eq(revision, expected), b), M.enabled_undo.actions(actions), C.nonempty(actions), nonempty_guard(actions))

def Laws.offer_effect(m, side):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: {==}

def Laws.offer_guard(m, expected, side):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: Equal.cong(Bool, Bool, b => Bool.and(Nat.is_eq(revision, expected), Bool.and(M.live(m), b)), M.offer_is_none(offer), C.no_offer(offer), no_offer_guard(offer))

def Laws.accept_effect(m, side):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: {==}

def Laws.accept_guard(m, expected, side):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: Equal.cong(Bool, Bool, b => Bool.and(Nat.is_eq(revision, expected), Bool.and(M.live(m), b)), M.offer_from_other(offer, side), C.other_offer(offer, side), other_offer_guard(offer, side))

def Laws.decline_effect(m, side):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: {==}

def Laws.decline_guard(m, expected, side):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: Equal.cong(Bool, Bool, b => Bool.and(Nat.is_eq(revision, expected), Bool.and(M.live(m), b)), M.offer_from_other(offer, side), C.other_offer(offer, side), other_offer_guard(offer, side))

def Laws.resign_effect(m, side):
  match m side:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} True{}: {==}
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} False{}: {==}

def Laws.resign_guard(m, expected, side):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: {==}

def decide_effect(b: Bool, +m: T.Match, +c: T.Command, +next: T.Match, equal: {M.apply_enabled(m, c) == next : T.Match})
  -> {M.step.decide(m, c, b) == C.choose(b, m, next) : T.StepResult}:
  match b:
    case False{}: {==}
    case True{}: Equal.cong(T.Match, T.StepResult, n => T.Accepted{n}, M.apply_enabled(m, c), next, equal)

def Laws.undo_step(m, expected):
  Equal.trans(T.StepResult, M.step(m, T.UndoCommand{expected}), M.step.decide(m, T.UndoCommand{expected}, C.undo_guard(m, expected)), C.choose(C.undo_guard(m, expected), m, C.undo(m)),
    Equal.cong(Bool, T.StepResult, b => M.step.decide(m, T.UndoCommand{expected}, b), M.enabled(m, T.UndoCommand{expected}), C.undo_guard(m, expected), Laws.undo_guard(m, expected)),
    decide_effect(C.undo_guard(m, expected), m, T.UndoCommand{expected}, C.undo(m), Laws.undo_effect(m)))

def Laws.offer_step(m, expected, side):
  Equal.trans(T.StepResult, M.step(m, T.OfferCommand{expected, side}), M.step.decide(m, T.OfferCommand{expected, side}, C.offer_guard(m, expected, M.live(m))), C.choose(C.offer_guard(m, expected, M.live(m)), m, C.offer(m, side)),
    Equal.cong(Bool, T.StepResult, b => M.step.decide(m, T.OfferCommand{expected, side}, b), M.enabled(m, T.OfferCommand{expected, side}), C.offer_guard(m, expected, M.live(m)), Laws.offer_guard(m, expected, side)),
    decide_effect(C.offer_guard(m, expected, M.live(m)), m, T.OfferCommand{expected, side}, C.offer(m, side), Laws.offer_effect(m, side)))

def Laws.accept_step(m, expected, side):
  Equal.trans(T.StepResult, M.step(m, T.AcceptCommand{expected, side}), M.step.decide(m, T.AcceptCommand{expected, side}, C.reply_guard(m, expected, side, M.live(m))), C.choose(C.reply_guard(m, expected, side, M.live(m)), m, C.accept(m)),
    Equal.cong(Bool, T.StepResult, b => M.step.decide(m, T.AcceptCommand{expected, side}, b), M.enabled(m, T.AcceptCommand{expected, side}), C.reply_guard(m, expected, side, M.live(m)), Laws.accept_guard(m, expected, side)),
    decide_effect(C.reply_guard(m, expected, side, M.live(m)), m, T.AcceptCommand{expected, side}, C.accept(m), Laws.accept_effect(m, side)))

def Laws.decline_step(m, expected, side):
  Equal.trans(T.StepResult, M.step(m, T.DeclineCommand{expected, side}), M.step.decide(m, T.DeclineCommand{expected, side}, C.reply_guard(m, expected, side, M.live(m))), C.choose(C.reply_guard(m, expected, side, M.live(m)), m, C.decline(m)),
    Equal.cong(Bool, T.StepResult, b => M.step.decide(m, T.DeclineCommand{expected, side}, b), M.enabled(m, T.DeclineCommand{expected, side}), C.reply_guard(m, expected, side, M.live(m)), Laws.decline_guard(m, expected, side)),
    decide_effect(C.reply_guard(m, expected, side, M.live(m)), m, T.DeclineCommand{expected, side}, C.decline(m), Laws.decline_effect(m, side)))

def Laws.resign_step(m, expected, side):
  Equal.trans(T.StepResult, M.step(m, T.ResignCommand{expected, side}), M.step.decide(m, T.ResignCommand{expected, side}, C.resign_guard(m, expected, M.live(m))), C.choose(C.resign_guard(m, expected, M.live(m)), m, C.resign(m, side)),
    Equal.cong(Bool, T.StepResult, b => M.step.decide(m, T.ResignCommand{expected, side}, b), M.enabled(m, T.ResignCommand{expected, side}), C.resign_guard(m, expected, M.live(m)), Laws.resign_guard(m, expected, side)),
    decide_effect(C.resign_guard(m, expected, M.live(m)), m, T.ResignCommand{expected, side}, C.resign(m, side), Laws.resign_effect(m, side)))

def Laws.resign_outcome(m, side):
  match m side:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} True{}: {==}
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} False{}: {==}

def Laws.accept_outcome(m):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: {==}

def board_next_case(b: Bool, +p: P.Position, +id: U32, w: L.Truth(b))
  -> {K.position(K.decide(b, p, id)) == R.expected(p, id) : P.Position}:
  match b:
    case True{}: {==}
    case False{}: Empty.absurd({p == R.expected(p, id) : P.Position}, w)

def move_key_exact(+m: T.Match, +id: U32, +next: P.Position)
  -> {C.move_finish(m, id, next, M.repetition_key(next, K.legal_ids(next))) == C.move_at(m, id, next) : T.Match}:
  Equal.cong(T.RepetitionKey, T.Match, key => C.move_finish(m, id, next, key),
    M.repetition_key(next, K.legal_ids(next)), A.key(next, K.legal_ids(next)),
    AL.repetition_key_exact(next, K.legal_ids(next)))

def Laws.move_effect(m, id, allowed):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      %L.sym(P.Position, K.position(K.step(state, id)), R.expected(state, id), board_next_case(K.allowed(state, id), state, id, allowed)) :
        {C.move_finish(m, id, _, M.repetition_key(_, K.legal_ids(_))) == C.move(m, id) : T.Match}
      move_key_exact(m, id, R.expected(state, id))

def enabled_of_accepted(b: Bool, +m: T.Match, +c: T.Command,
  w: L.Truth(M.accepted(M.step.decide(m, c, b)))) -> L.Truth(b):
  match b:
    case True{}: Unit{}
    case False{}: w

def move_legal(+m: T.Match, +expected: Nat, +id: U32,
  w: L.Truth(M.enabled(m, T.MoveCommand{expected, id}))) -> L.Truth(R.legal(M.state(m), id)):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      L.and_right(M.live(m), K.allowed(state, id),
        L.and_right(M.revision_ok(m, T.MoveCommand{expected, id}), M.enabled_move(m, id), w))

def accepted_move_case(b: Bool, +m: T.Match, +expected: Nat, +id: U32,
  w: L.Truth(M.accepted(M.step.decide(m, T.MoveCommand{expected, id}, b))),
  allowed: L.Truth(R.legal(M.state(m), id)))
  -> {M.step.decide(m, T.MoveCommand{expected, id}, b) == T.Accepted{C.move(m, id)} : T.StepResult}:
  match b:
    case False{}: Empty.absurd({T.Rejected{m} == T.Accepted{C.move(m, id)} : T.StepResult}, w)
    case True{}: Equal.cong(T.Match, T.StepResult, next => T.Accepted{next}, M.apply_move(m, id), C.move(m, id), Laws.move_effect(m, id, allowed))

def Laws.accepted_move_exact_match(m, expected, id, accepted):
  accepted_move_case(M.enabled(m, T.MoveCommand{expected, id}), m, expected, id, accepted,
    move_legal(m, expected, id, enabled_of_accepted(M.enabled(m, T.MoveCommand{expected, id}), m, T.MoveCommand{expected, id}, accepted)))

def Laws.move_guard(m, expected, id):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Equal.cong(Bool, Bool, live => Bool.and(Nat.is_eq(revision, expected), Bool.and(live, R.legal(state, id))), M.live(m), A.live(m), AL.actual_live_exact(m))

def move_guard_legal(+m: T.Match, +expected: Nat, +id: U32,
  w: L.Truth(C.move_guard(m, expected, id))) -> L.Truth(R.legal(M.state(m), id)):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      L.and_right(A.live(m), R.legal(state, id),
        L.and_right(Nat.is_eq(revision, expected), Bool.and(A.live(m), R.legal(state, id)), w))

def move_decide(b: Bool, +m: T.Match, +expected: Nat, +id: U32,
  legal: L.Truth(b) -> L.Truth(R.legal(M.state(m), id)))
  -> {M.step.decide(m, T.MoveCommand{expected, id}, b) == C.choose(b, m, C.move(m, id)) : T.StepResult}:
  match b:
    case False{}: {==}
    case True{}: Equal.cong(T.Match, T.StepResult, next => T.Accepted{next}, M.apply_move(m, id), C.move(m, id), Laws.move_effect(m, id, legal(Unit{})))

def Laws.move_step(m, expected, id):
  Equal.trans(T.StepResult, M.step(m, T.MoveCommand{expected, id}), M.step.decide(m, T.MoveCommand{expected, id}, C.move_guard(m, expected, id)), C.choose(C.move_guard(m, expected, id), m, C.move(m, id)),
    Equal.cong(Bool, T.StepResult, b => M.step.decide(m, T.MoveCommand{expected, id}, b), M.enabled(m, T.MoveCommand{expected, id}), C.move_guard(m, expected, id), Laws.move_guard(m, expected, id)),
    move_decide(C.move_guard(m, expected, id), m, expected, id, yes => move_guard_legal(m, expected, id, yes)))

def Laws.make_match_exact(p, policy):
  Equal.cong(T.RepetitionKey, T.Match,
    key => T.Match{p, p, [], [p], [key], 0n, policy, T.NoOffer{}, T.NoOverride{}},
    M.repetition_key(p, K.legal_ids(p)), A.key(p, K.legal_ids(p)),
    AL.repetition_key_exact(p, K.legal_ids(p)))

def Laws.from_position_exact(p, policy):
  Equal.cong(T.Match, Maybe<T.Match>, m => Bool.pick(Maybe<T.Match>, G.valid(p), Some{m}, None{}),
    M.make_match(p, policy), C.initial(p, policy), Laws.make_match_exact(p, policy))

def Laws.start_exact(layout, policy):
  Laws.make_match_exact(P.start(layout), policy)
