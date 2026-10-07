import Base
import ../../MatchSpec.bend as T
import ../../v2/MatchKernel.bend as M
import ./Match.bend as E
import ./LAWS.bend as L

def L.apply_exact(m, id):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: {==}

def L.carried_canonical(m, id):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: {==}

def erased_move_case(b: Bool, +m: T.Match, +expected: Nat, +id: U32)
  -> {E.erase(E.decide(m, id, b)) == M.step.decide(m, T.MoveCommand{expected, id}, b) : T.StepResult}:
  match b:
    case False{}: {==}
    case True{}: L.apply_exact(m, id)

def L.erased_step(m, c):
  match c:
    case T.MoveCommand{expected, id}: erased_move_case(M.enabled(m, c), m, expected, id)
    case T.UndoCommand{expected}: {==}
    case T.OfferCommand{expected, side}: {==}
    case T.AcceptCommand{expected, side}: {==}
    case T.DeclineCommand{expected, side}: {==}
    case T.ResignCommand{expected, side}: {==}
