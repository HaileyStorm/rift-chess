import Base
import ../Model.bend as P
import ../ProofKit.bend as L
import ./RuleKernel.bend as K
import ./RuleContracts.bend as R
import ./FilterLaws.bend as Laws

def intent_from_contract(+p: P.Position, +q: P.Position, decoded: Maybe<P.Action>, w: L.Truth(R.contract_decoded(p, q, decoded)))
  -> L.Truth(K.input_intent_decoded(p, decoded)):
  match decoded:
    case None{}: w
    case Some{+a}:
      L.and_left(R.legal_intent(p, a, q), R.clause_3(p, a, q),
        L.and_right(R.admissible_new(p, a, q), R.clause_2(p, a, q),
          L.and_right(R.admissible_old(p, a, q), R.clause_1(p, a, q), w)))

def false_from_impossible(a: Bool, impossible: L.Truth(a) -> Empty) -> {False{} == a : Bool}:
  match a:
    case False{}: {==}
    case True{}: Empty.absurd({False{} == True{} : Bool}, impossible(Unit{}))

def filter_case(b: Bool, +p: P.Position, +id: U32,
  why: L.Truth(K.allowed(p, id)) -> L.Truth(b))
  -> {K.fast_decide(b, p, id) == K.allowed(p, id) : Bool}:
  match b:
    case True{}: {==}
    case False{}: false_from_impossible(K.allowed(p, id), why)

def Laws.filter_preserves_every_acceptance(p, id):
  filter_case(K.input_intent(p, id), p, id,
    yes => intent_from_contract(p, K.proposed(p, id), P.decode(id), yes))
