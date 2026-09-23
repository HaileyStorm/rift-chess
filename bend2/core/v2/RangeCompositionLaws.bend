import Base
import ../Model.bend as P
import ./RuleKernel.bend as K
import ./Iteration.bend as I
import ./RangeBridgeLaws.bend as RB
law range_composes:
  for +left: Nat
  for +right: Nat
  for +p: P.Position
  for +start: U32
  {K.legal_range(Nat.add(left, right), p, start) == List.append(&2, U32, K.legal_range(left, p, start), K.legal_range(right, p, I.advance(left, start))) : List<&2, U32>}
law planned_tree_flat:
  for +depth: Nat
  for +p: P.Position
  for +start: U32
  for +width: U32
  for plan: RB.Plan(depth, start, width)
  {K.legal_tree(depth, p, start, width) == K.legal_range(U32.to_nat(width), p, start) : List<&2, U32>}
