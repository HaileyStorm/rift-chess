import Base
import ../Model.bend as Model
import ../ProofKit.bend as Logic
import ./RuleKernel.bend as Kernel
import ./RangeBridgeLaws.bend as RB

def AllGreater(base: U32, xs: List<&2, U32>) -> Type:
  match xs:
    case []: Unit
    case h <> t:
      Logic.Truth(U32.is_lt(base, h)) & AllGreater(base, t)

def Sorted(xs: List<&2, U32>) -> Type:
  match xs:
    case []: Unit
    case h <> t:
      AllGreater(h, t) & Sorted(t)

def NoMember(id: U32, xs: List<&2, U32>) -> Type:
  match xs:
    case []: Unit
    case h <> t:
      Logic.Truth(Bool.not(U32.is_eq(id, h))) & NoMember(id, t)

def Unique(xs: List<&2, U32>) -> Type:
  match xs:
    case []: Unit
    case h <> t:
      NoMember(h, t) & Unique(t)

# EndAt advances the ordinal by one for each remaining candidate.  Defining it
# by the remaining count keeps the recursive window proof independent of Nat
# addition associativity and of wrapped U32 arithmetic.
def EndAt(count: Nat, start: Nat) -> Nat:
  match count:
    case 0n: start
    case 1n+rest: EndAt(rest, 1n+start)

law flat_range_sorted:
  for +count: Nat
  for +start: Nat
  for +p: Model.Position
  for window: Logic.Truth(Nat.is_le(EndAt(count, start), 21760n))
  Sorted(Kernel.legal_range(count, p, U32.from_nat(start)))

law planned_tree_sorted:
  for +depth: Nat
  for +start: Nat
  for +p: Model.Position
  for +width: U32
  for plan: RB.Plan(depth, U32.from_nat(start), width)
  for window: Logic.Truth(Nat.is_le(EndAt(U32.to_nat(width), start), 21760n))
  Sorted(Kernel.legal_tree(depth, p, U32.from_nat(start), width))

law canonical_ascending:
  for +p: Model.Position
  Sorted(Kernel.legal_ids(p))

law canonical_unique:
  for +p: Model.Position
  Unique(Kernel.legal_ids(p))
