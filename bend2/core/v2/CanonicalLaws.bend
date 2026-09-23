import Base
import ../Model.bend as P
import ../ProofKit.bend as L
import ./RuleKernel.bend as K
import ./RuleContracts.bend as R
import ./EnumerationLaws.bend as E
law canonical_member_sound:
  for +p: P.Position
  for +id: U32
  for member: E.Member(id, K.legal_ids(p))
  L.Truth(R.legal(p, id))

law canonical_member_complete:
  for +p: P.Position
  for +id: U32
  for +legal: L.Truth(R.legal(p, id))
  E.Member(id, K.legal_ids(p))
