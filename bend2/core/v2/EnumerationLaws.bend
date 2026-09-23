import Base
import ../Model.bend as Model
import ../ProofKit.bend as Logic
import ./RuleKernel.bend as Kernel

# A constructive membership witness for an emitted action ID.  The head
# equality is oriented from the generated ID to the queried ID so a proof can
# transport Kernel.fast_allowed through it.
def Member(id: U32, xs: List<&2, U32>) -> Type:
  match xs:
    case []:
      Empty
    case h <> t:
      Or({h == id : U32}, Member(id, t))

# A queried ID lies in the finite window traversed by legal_range.  This is a
# proposition over the same U32 successor sequence, so completeness cannot
# silently admit an ID outside the requested range.
def InRange(n: Nat, start: U32, id: U32) -> Type:
  match n:
    case 0n:
      Empty
    case 1n+rest:
      Or({start == id : U32}, InRange(rest, U32.add(start, 1), id))

# The balanced legal_tree witness mirrors RuleKernel's fixed-depth split.  It
# carries the finite-window assumption explicitly; no theorem here equates an
# arbitrary wrapped U32 range with a mathematical interval.
def TreeRange(depth: Nat, start: U32, width: U32, id: U32) -> Type:
  match depth:
    case 0n:
      InRange(U32.to_nat(width), start, id)
    case 1n++rest:
      Or(TreeRange(rest, start, U32.div(width, 2), id),
        TreeRange(rest, U32.add(start, U32.div(width, 2)), U32.div(width, 2), id))


law range_member_sound:
  for +n: Nat
  for +p: Model.Position
  for +start: U32
  for +id: U32
  for w: Member(id, Kernel.legal_range(n, p, start))
  Logic.Truth(Kernel.fast_allowed(p, id))

law range_member_complete:
  for +n: Nat
  for +p: Model.Position
  for +start: U32
  for +id: U32
  for in_range: InRange(n, start, id)
  for w: Logic.Truth(Kernel.fast_allowed(p, id))
  Member(id, Kernel.legal_range(n, p, start))

law tree_member_sound:
  for +depth: Nat
  for +p: Model.Position
  for +start: U32
  for +width: U32
  for +id: U32
  for w: Member(id, Kernel.legal_tree(depth, p, start, width))
  Logic.Truth(Kernel.fast_allowed(p, id))

law tree_member_complete:
  for +depth: Nat
  for +p: Model.Position
  for +start: U32
  for +width: U32
  for +id: U32
  for in_tree: TreeRange(depth, start, width, id)
  for w: Logic.Truth(Kernel.fast_allowed(p, id))
  Member(id, Kernel.legal_tree(depth, p, start, width))
