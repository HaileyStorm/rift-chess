import Base
import ../Model.bend as P
import ../ProofKit.bend as L
import ./RuleContracts.bend as R
import ./BoundsLaws.bend as Laws

def bound_case(b: Bool, +p: P.Position, +id: U32,
  w: L.Truth(R.contract_decoded(p, R.expected(p, id), P.decode.in_range(id, b)))) -> L.Truth(b):
  match b:
    case True{}: Unit{}
    case False{}: w
def Laws.every_legal_id_is_canonical(p, id, w):
  bound_case(U32.is_lt(id, 21760), p, id, w)
