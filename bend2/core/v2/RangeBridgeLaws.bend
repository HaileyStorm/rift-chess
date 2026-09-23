import Base
import ../ProofKit.bend as L
import ./EnumerationLaws.bend as E
import ./Iteration.bend as I

def advance(n: Nat, start: U32) -> U32:
  I.advance(n, start)

law offset_member:
  for +n: Nat
  for +start: U32
  for +offset: Nat
  for bound: L.Truth(Nat.is_lt(offset, n))
  E.InRange(n, start, advance(offset, start))
law range_split:
  for +left: Nat
  for +right: Nat
  for +start: U32
  for +id: U32
  for member: E.InRange(Nat.add(left, right), start, id)
  Or(E.InRange(left, start, id), E.InRange(right, advance(left, start), id))
law range_join:
  for +left: Nat
  for +right: Nat
  for +start: U32
  for +id: U32
  for member: Or(E.InRange(left, start, id), E.InRange(right, advance(left, start), id))
  E.InRange(Nat.add(left, right), start, id)
law advance_680:
  {advance(680n, 0) == 680 : U32}

def Plan(depth: Nat, +start: U32, +width: U32) -> Type:
  match depth:
    case 0n: Unit
    case 1n++rest:
      {Nat.is_eq(U32.to_nat(width), Nat.add(U32.to_nat(U32.div(width, 2)), U32.to_nat(U32.div(width, 2)))) == True{} : Bool} &
      ({advance(U32.to_nat(U32.div(width, 2)), start) == U32.add(start, U32.div(width, 2)) : U32} &
        (Plan(rest, start, U32.div(width, 2)) & Plan(rest, U32.add(start, U32.div(width, 2)), U32.div(width, 2))))
law planned_range_to_tree:
  for +depth: Nat
  for +start: U32
  for +width: U32
  for +id: U32
  for plan: Plan(depth, start, width)
  for member: E.InRange(U32.to_nat(width), start, id)
  E.TreeRange(depth, start, width, id)
# Query-index barrier: definitionally the same interval proposition, without
# eagerly expanding a 21760-deep Or type while the queried ID is abstract.
def QueryRange(+n: Nat, +start: U32, id: U32) -> Type:
  match id:
    case U32{bits}: E.InRange(n, start, U32{bits})

law canonical_range_to_tree:
  for +id: U32
  for member: QueryRange(U32.to_nat(21760), 0, id)
  E.TreeRange(5n, 0, 21760, id)
law advance_successor:
  for +n: Nat
  for +start: U32
  {advance(n, U32.add(start, 1)) == U32.add(advance(n, start), 1) : U32}
