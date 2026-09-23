import Base
import ../Model.bend as P
import ./RuleKernel.bend as K
law filter_preserves_every_acceptance:
  for +p: P.Position
  for +id: U32
  {K.fast_allowed(p, id) == K.allowed(p, id) : Bool}
