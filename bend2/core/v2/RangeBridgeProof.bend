import Base
import ../ProofKit.bend as L
import ./EnumerationLaws.bend as E
import ./EnumerationProof.bend as EP
import ./RangeBridgeLaws.bend as Laws

def not_lt_zero(n: Nat, w: L.Truth(Nat.is_lt(n, 0n))) -> Empty:
  match n:
    case 0n: w
    case 1n+rest: w

def Laws.offset_member(n, start, offset, bound):
  match n:
    case 0n: Empty.absurd(E.InRange(0n, start, Laws.advance(offset, start)), not_lt_zero(offset, bound))
    case 1n+rest:
      match offset:
        case 0n: Inl{{==}}
        case 1n+k: Inr{Laws.offset_member(rest, U32.add(start, 1), k, bound)}

def split_cons(+left: Nat, +right: Nat, +start: U32, +id: U32,
  result: Or(E.InRange(left, U32.add(start, 1), id), E.InRange(right, Laws.advance(left, U32.add(start, 1)), id)))
  -> Or(E.InRange(1n+left, start, id), E.InRange(right, Laws.advance(1n+left, start), id)):
  match result:
    case Inl{w}: Inl{Inr{w}}
    case Inr{w}: Inr{w}

def Laws.range_split(left, right, start, id, member):
  match left:
    case 0n: Inr{member}
    case 1n+rest:
      match member:
        case Inl{eq}: Inl{Inl{eq}}
        case Inr{tail}: split_cons(rest, right, start, id, Laws.range_split(rest, right, U32.add(start, 1), id, tail))

def Laws.range_join(left, right, start, id, member):
  match left:
    case 0n:
      match member:
        case Inl{bad}: Empty.absurd(E.InRange(right, start, id), bad)
        case Inr{tail}: tail
    case 1n+rest:
      match member:
        case Inl{here}:
          match here:
            case Inl{eq}: Inl{eq}
            case Inr{tail}: Inr{Laws.range_join(rest, right, U32.add(start, 1), id, Inl{tail})}
        case Inr{tail}: Inr{Laws.range_join(rest, right, U32.add(start, 1), id, Inr{tail})}

def Laws.advance_680(): {==}


def range_transport(+n: Nat, +a: U32, +b: U32, +id: U32, e: {a == b : U32}, member: E.InRange(n, a, id)) -> E.InRange(n, b, id):
  %e : E.InRange(n, _, id)
  member

def range_size_transport(+a: Nat, +b: Nat, +start: U32, +id: U32, e: {a == b : Nat}, member: E.InRange(a, start, id)) -> E.InRange(b, start, id):
  %e : E.InRange(_, start, id)
  member

def false_true(e: {False{} == True{} : Bool}) -> Empty:
  %e : Bool.pick(Type, _, Empty, Unit)
  Unit{}

def nat_equality(+a: Nat, +b: Nat, e: {Nat.is_eq(a, b) == True{} : Bool}) -> {a == b : Nat}:
  match a b:
    case 0n 0n: {==}
    case 0n 1n+bp: Empty.absurd({0n == 1n+bp : Nat}, false_true(e))
    case 1n+ap 0n: Empty.absurd({1n+ap == 0n : Nat}, false_true(e))
    case 1n++ap 1n++bp:
      Equal.cong(Nat, Nat, n => 1n+n, ap, bp, nat_equality(ap, bp, e))
def map_or(-A: Type, -B: Type, -C: Type, -D: Type, value: Or(A, B), left: A -> C, right: B -> D) -> Or(C, D):
  match value:
    case Inl{x}: Inl{left(x)}
    case Inr{x}: Inr{right(x)}
def Laws.planned_range_to_tree(depth, start, width, id, plan, member):
  match depth:
    case 0n: member
    case 1n++rest:
      match plan:
        case Tuple{size, Tuple{mid, Tuple{left, right}}}:
          map_or(E.InRange(U32.to_nat(U32.div(width, 2)), start, id),
            E.InRange(U32.to_nat(U32.div(width, 2)), Laws.advance(U32.to_nat(U32.div(width, 2)), start), id),
            E.TreeRange(rest, start, U32.div(width, 2), id),
            E.TreeRange(rest, U32.add(start, U32.div(width, 2)), U32.div(width, 2), id),
            Laws.range_split(U32.to_nat(U32.div(width, 2)), U32.to_nat(U32.div(width, 2)), start, id,
              range_size_transport(U32.to_nat(width), Nat.add(U32.to_nat(U32.div(width, 2)), U32.to_nat(U32.div(width, 2))), start, id, nat_equality(U32.to_nat(width), Nat.add(U32.to_nat(U32.div(width, 2)), U32.to_nat(U32.div(width, 2))), size), member)),
            l => Laws.planned_range_to_tree(rest, start, U32.div(width, 2), id, left, l),
            r => Laws.planned_range_to_tree(rest, U32.add(start, U32.div(width, 2)), U32.div(width, 2), id, right,
              range_transport(U32.to_nat(U32.div(width, 2)), Laws.advance(U32.to_nat(U32.div(width, 2)), start), U32.add(start, U32.div(width, 2)), id, mid, r)))

def canonical_plan() -> Laws.Plan(5n, 0, 21760):
  ({==}, ({==}, (({==}, ({==}, (({==}, ({==}, (({==}, ({==}, (({==}, ({==}, (Unit{}, Unit{}))), ({==}, ({==}, (Unit{}, Unit{})))))), ({==}, ({==}, (({==}, ({==}, (Unit{}, Unit{}))), ({==}, ({==}, (Unit{}, Unit{}))))))))), ({==}, ({==}, (({==}, ({==}, (({==}, ({==}, (Unit{}, Unit{}))), ({==}, ({==}, (Unit{}, Unit{})))))), ({==}, ({==}, (({==}, ({==}, (Unit{}, Unit{}))), ({==}, ({==}, (Unit{}, Unit{})))))))))))), ({==}, ({==}, (({==}, ({==}, (({==}, ({==}, (({==}, ({==}, (Unit{}, Unit{}))), ({==}, ({==}, (Unit{}, Unit{})))))), ({==}, ({==}, (({==}, ({==}, (Unit{}, Unit{}))), ({==}, ({==}, (Unit{}, Unit{}))))))))), ({==}, ({==}, (({==}, ({==}, (({==}, ({==}, (Unit{}, Unit{}))), ({==}, ({==}, (Unit{}, Unit{})))))), ({==}, ({==}, (({==}, ({==}, (Unit{}, Unit{}))), ({==}, ({==}, (Unit{}, Unit{})))))))))))))))

def query_pack(+n: Nat, +start: U32, +id: U32, member: E.InRange(n, start, id)) -> Laws.QueryRange(n, start, id):
  match id:
    case U32{bits}: member
def query_unpack(+n: Nat, +start: U32, +id: U32, member: Laws.QueryRange(n, start, id)) -> E.InRange(n, start, id):
  match id:
    case U32{bits}: member

def Laws.canonical_range_to_tree(id, member):
  Laws.planned_range_to_tree(5n, 0, 21760, id, canonical_plan(), query_unpack(U32.to_nat(21760), 0, id, member))
def Laws.advance_successor(n, start):
  match n:
    case 0n: {==}
    case 1n+rest: Laws.advance_successor(rest, U32.add(start, 1))
