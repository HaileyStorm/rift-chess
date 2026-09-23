import Base
import ../Model.bend as P
import ../ProofKit.bend as L
import ./RuleContracts.bend as R
law every_legal_id_is_canonical:
  for +p: P.Position
  for +id: U32
  for w: L.Truth(R.legal(p, id))
  L.Truth(U32.is_lt(id, 21760))
