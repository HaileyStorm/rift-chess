import Base
import ../Model.bend as P
import ../Spec.bend as S
import ../MatchSpec.bend as T
import ../ProofKit.bend as L
import ./RuleKernel.bend as K
import ./MatchKernel.bend as M
import ./Domains.bend as D
import ./DomainsProof.bend as DP
import ./MatchProof.bend as MP
import ./History.bend as H
import ./HistoryLaws.bend as Laws

def append_valid(xs: List<&2, P.Position>, +p: P.Position, all: H.AllValid(xs), +valid: L.Truth(S.valid(p)))
  -> H.AllValid(M.append_position(xs, p)):
  match xs:
    case []: H.Both{valid, Unit{}}
    case h <> rest:
      match all:
        case H.Both{head, tail}: H.Both{head, append_valid(rest, p, tail, valid)}
def drop_valid(xs: List<&2, P.Position>, all: H.AllValid(xs)) -> H.AllValid(M.drop_last_positions(xs)):
  match xs:
    case []: Unit{}
    case h <> []: Unit{}
    case h <> (next <> rest):
      match all:
        case H.Both{head, tail}: H.Both{head, drop_valid(next <> rest, tail)}
def LastValid(last: Maybe<&2, P.Position>) -> Data:
  match last:
    case None{}: Unit
    case Some{p}: L.Truth(S.valid(p))
def last_valid(xs: List<&2, P.Position>, all: H.AllValid(xs)) -> LastValid(M.last_position(xs)):
  match xs:
    case []: Unit{}
    case h <> []:
      match all:
        case H.Both{head, tail}: head
    case h <> (next <> rest):
      match all:
        case H.Both{head, tail}: last_valid(next <> rest, tail)

def move_good(+m: T.Match, +id: U32, w: L.Truth(K.allowed(M.state(m), id)), good: H.Good(m))
  -> H.Good(M.apply_move(m, id)):
  match m:
    case T.Match{initial, +state, actions, +states, keys, revision, policy, offer, forced}:
      match good:
        case H.Both{iv, H.Both{sv, all}}:
          +nv = DP.accepted_valid(state, id, w)
          H.Both{iv, H.Both{nv, append_valid(states, K.position(K.step(state, id)), all, nv)}}

def undo_got_good(+initial: P.Position, actions: List<&2, U32>, +states: List<&2, P.Position>, keys: List<&2, T.RepetitionKey>, revision: Nat, policy: T.DrawPolicy,
  got: Maybe<&2, P.Position>, +iv: L.Truth(S.valid(initial)), all: H.AllValid(states), last: LastValid(got))
  -> H.Good(M.apply_undo.parts.got(initial, actions, states, keys, revision, policy, got)):
  match got:
    case None{}: H.Both{iv, H.Both{iv, all}}
    case Some{p}: H.Both{iv, H.Both{last, all}}
def undo_good(+m: T.Match, good: H.Good(m)) -> H.Good(M.apply_undo(m)):
  match m:
    case T.Match{initial, state, actions, +states, keys, revision, policy, offer, forced}:
      match good:
        case H.Both{iv, H.Both{sv, all}}:
          +dv = drop_valid(states, all)
          undo_got_good(initial, M.drop_last_u32(actions), M.drop_last_positions(states), M.drop_last_keys(keys), revision, policy,
            M.last_position(M.drop_last_positions(states)), iv, dv, last_valid(M.drop_last_positions(states), dv))

def resign_good(+m: T.Match, side: Bool, good: H.Good(m)) -> H.Good(M.apply_resign(m, side)):
  match m side:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} True{}: good
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} False{}: good

def offer_good(+m: T.Match, side: Bool, good: H.Good(m)) -> H.Good(M.apply_offer(m, side)):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: good

def accept_good(+m: T.Match, good: H.Good(m)) -> H.Good(M.apply_accept(m)):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: good

def decline_good(+m: T.Match, good: H.Good(m)) -> H.Good(M.apply_decline(m)):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: good

def apply_good(+m: T.Match, +c: T.Command, w: L.Truth(M.enabled(m, c)), good: H.Good(m)) -> H.Good(M.apply_enabled(m, c)):
  match c:
    case T.MoveCommand{expected, +id}: move_good(m, id, MP.move_allowed(m, expected, id, w), good)
    case T.UndoCommand{expected}: undo_good(m, good)
    case T.OfferCommand{expected, side}: offer_good(m, side, good)
    case T.AcceptCommand{expected, side}: accept_good(m, good)
    case T.DeclineCommand{expected, side}: decline_good(m, good)
    case T.ResignCommand{expected, side}: resign_good(m, side, good)

def step_good(b: Bool, +m: T.Match, +c: T.Command, good: H.Good(m),
  next: L.Truth(b) -> H.Good(M.apply_enabled(m, c))) -> H.Good(M.result_state(M.step.decide(m, c, b))):
  match b:
    case False{}: good
    case True{}: next(Unit{})
def Laws.commands_preserve_admissible_history(m, c, good):
  step_good(M.enabled(m, c), m, c, good, yes => apply_good(m, c, yes, good))

def good_transport(-a: T.Match, -b: T.Match, e: {a == b : T.Match}, good: H.Good(a)) -> H.Good(b):
  %e : H.Good(_)
  good

def Laws.coherent_history_admissible(initial, policy, commands, m, witness):
  match witness:
    case D.MatchBase{+initial_ok, trace_eq, endpoint_eq}:
      good_transport(M.make_match(initial, policy), m, endpoint_eq, H.Both{initial_ok, H.Both{initial_ok, H.Both{initial_ok, Unit{}}}})
    case D.MatchStep{+prev, +command, rest, prior, accepted, trace_eq, endpoint_eq}:
      good_transport(M.result_state(M.step(prev, command)), m, endpoint_eq,
        Laws.commands_preserve_admissible_history(prev, command, Laws.coherent_history_admissible(initial, policy, rest, prev, prior)))
