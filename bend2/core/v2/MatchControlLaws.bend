import Base
import ../Model.bend as P
import ../Geometry.bend as G
import ../MatchSpec.bend as T
import ./MatchKernel.bend as M
import ./MatchControlContracts.bend as C
import ./RuleContracts.bend as R
import ../ProofKit.bend as L

# Guard live input is the actual board/forced outcome predicate; adjudication
# laws independently bind that predicate. No control-side/turn assumption.

law undo_effect:
  for +m: T.Match
  {M.apply_undo(m) == C.undo(m) : T.Match}

law undo_guard:
  for +m: T.Match
  for +expected: Nat
  {M.enabled(m, T.UndoCommand{expected}) == C.undo_guard(m, expected) : Bool}

law undo_step:
  for +m: T.Match
  for +expected: Nat
  {M.step(m, T.UndoCommand{expected}) == C.choose(C.undo_guard(m, expected), m, C.undo(m)) : T.StepResult}

law offer_effect:
  for +m: T.Match
  for +side: Bool
  {M.apply_offer(m, side) == C.offer(m, side) : T.Match}

law offer_guard:
  for +m: T.Match
  for +expected: Nat
  for +side: Bool
  {M.enabled(m, T.OfferCommand{expected, side}) == C.offer_guard(m, expected, M.live(m)) : Bool}

law offer_step:
  for +m: T.Match
  for +expected: Nat
  for +side: Bool
  {M.step(m, T.OfferCommand{expected, side}) == C.choose(C.offer_guard(m, expected, M.live(m)), m, C.offer(m, side)) : T.StepResult}

law accept_effect:
  for +m: T.Match
  for +side: Bool
  {M.apply_accept(m) == C.accept(m) : T.Match}

law accept_guard:
  for +m: T.Match
  for +expected: Nat
  for +side: Bool
  {M.enabled(m, T.AcceptCommand{expected, side}) == C.reply_guard(m, expected, side, M.live(m)) : Bool}

law accept_step:
  for +m: T.Match
  for +expected: Nat
  for +side: Bool
  {M.step(m, T.AcceptCommand{expected, side}) == C.choose(C.reply_guard(m, expected, side, M.live(m)), m, C.accept(m)) : T.StepResult}

law decline_effect:
  for +m: T.Match
  for +side: Bool
  {M.apply_decline(m) == C.decline(m) : T.Match}

law decline_guard:
  for +m: T.Match
  for +expected: Nat
  for +side: Bool
  {M.enabled(m, T.DeclineCommand{expected, side}) == C.reply_guard(m, expected, side, M.live(m)) : Bool}

law decline_step:
  for +m: T.Match
  for +expected: Nat
  for +side: Bool
  {M.step(m, T.DeclineCommand{expected, side}) == C.choose(C.reply_guard(m, expected, side, M.live(m)), m, C.decline(m)) : T.StepResult}

law resign_effect:
  for +m: T.Match
  for +side: Bool
  {M.apply_resign(m, side) == C.resign(m, side) : T.Match}

law resign_guard:
  for +m: T.Match
  for +expected: Nat
  for +side: Bool
  {M.enabled(m, T.ResignCommand{expected, side}) == C.resign_guard(m, expected, M.live(m)) : Bool}

law resign_step:
  for +m: T.Match
  for +expected: Nat
  for +side: Bool
  {M.step(m, T.ResignCommand{expected, side}) == C.choose(C.resign_guard(m, expected, M.live(m)), m, C.resign(m, side)) : T.StepResult}

law resign_outcome:
  for +m: T.Match
  for +side: Bool
  {M.outcome(M.apply_resign(m, side)) == Some{C.resignation_outcome(side)} : Maybe<T.Outcome>}
law accept_outcome:
  for +m: T.Match
  {M.outcome(M.apply_accept(m)) == Some{T.Agreed{}} : Maybe<T.Outcome>}

# All typed histories, provided the actual board action is legal. Whole-value
# equality binds every ledger entry and all retained/reset control fields.
law move_effect:
  for +m: T.Match
  for +id: U32
  for allowed: L.Truth(R.legal(M.state(m), id))
  {M.apply_move(m, id) == C.move(m, id) : T.Match}

law accepted_move_exact_match:
  for +m: T.Match
  for +expected: Nat
  for +id: U32
  for +accepted: L.Truth(M.accepted(M.step(m, T.MoveCommand{expected, id})))
  {M.step(m, T.MoveCommand{expected, id}) == T.Accepted{C.move(m, id)} : T.StepResult}

law move_guard:
  for +m: T.Match
  for +expected: Nat
  for +id: U32
  {M.enabled(m, T.MoveCommand{expected, id}) == C.move_guard(m, expected, id) : Bool}

law move_step:
  for +m: T.Match
  for +expected: Nat
  for +id: U32
  {M.step(m, T.MoveCommand{expected, id}) == C.choose(C.move_guard(m, expected, id), m, C.move(m, id)) : T.StepResult}

law make_match_exact:
  for +p: P.Position
  for +policy: T.DrawPolicy
  {M.make_match(p, policy) == C.initial(p, policy) : T.Match}

law from_position_exact:
  for +p: P.Position
  for +policy: T.DrawPolicy
  {M.from_position(p, policy) == Bool.pick(Maybe<T.Match>, G.valid(p), Some{C.initial(p, policy)}, None{}) : Maybe<T.Match>}

law start_exact:
  for +layout: Bool
  for +policy: T.DrawPolicy
  {M.start(layout, policy) == C.initial(P.start(layout), policy) : T.Match}
