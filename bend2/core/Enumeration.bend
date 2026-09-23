import Base
import ./Model.bend as M

# Enumerate a complete superset of legal IDs in ascending order. Every legal
# ordinary move starts on a present friendly piece and ends on a present square.
# Its only possible promotion tags are zero, or 1..4 for a pawn reaching its
# own last rank. Every legal Shift exchanges a present tile with an orthogonally
# adjacent hole. We emit all five Shift tags and leave occupancy, promotion,
# movement geometry and king safety to the unchanged specification guard.
# Range exclusion occurs before destination scans and before Shift topology.

def in_range(+id: U32, start: U32, end: Nat) -> Bool:
  Bool.and(U32.is_ge(id, start), Nat.is_lt(U32.to_nat(id), end))

def overlaps(+base: U32, width: U32, start: U32, end: Nat) -> Bool:
  Bool.and(U32.is_lt(start, U32.add(base, width)), Nat.is_gt(end, U32.to_nat(base)))

def add_if(ok: Bool, id: U32, acc: List<&2, U32>) -> List<&2, U32>:
  match ok:
    case False{}: acc
    case True{}: id <> acc

def tags(n: Nat, +id: U32, +start: U32, +end: Nat, acc: List<&2, U32>) -> List<&2, U32>:
  match n:
    case 0n: acc
    case 1n+rest:
      tags(rest, U32.add(id, 1), start, end, add_if(in_range(id, start, end), id, acc))

def destination(ok: Bool, promotes: Bool, +base: U32, start: U32, end: Nat,
  acc: List<&2, U32>) -> List<&2, U32>:
  match ok:
    case False{}: acc
    case True{}:
      match promotes:
        case False{}: tags(1n, base, start, end, acc)
        case True{}: tags(4n, U32.add(base, 1), start, end, acc)

def destinations(n: Nat, +p: M.Position, +source: U32, +is_pawn: Bool,
  +to: U32, +start: U32, +end: Nat, acc: List<&2, U32>) -> List<&2, U32>:
  match n:
    case 0n: acc
    case 1n+rest:
      +base = U32.mul(5, U32.add(U32.mul(64, source), to))
      +promotes = Bool.and(is_pawn, U32.is_eq(M.rank_of(to), Bool.pick(U32, M.pos_side(p), 7, 0)))
      next = destination(Bool.and(overlaps(base, 5, start, end),
        Bool.and(U32.is_ne(source, to), M.present(M.pos_holes(p), to))), promotes, base, start, end, acc)
      destinations(rest, p, source, is_pawn, U32.add(to, 1), start, end, next)

def source(ok: Bool, p: M.Position, source: U32, is_pawn: Bool,
  start: U32, end: Nat, acc: List<&2, U32>) -> List<&2, U32>:
  match ok:
    case False{}: acc
    case True{}: destinations(64n, p, source, is_pawn, 0, start, end, acc)

def moves(board: List<&2, U32>, +p: M.Position, +index: U32,
  +start: U32, +end: Nat, acc: List<&2, U32>) -> List<&2, U32>:
  match board:
    case Nil{}: acc
    case +code <> rest:
      +ok = Bool.and(U32.is_lt(index, 64),
        Bool.and(overlaps(U32.mul(320, index), 320, start, end),
          Bool.and(M.present(M.pos_holes(p), index), M.same_side(code, M.pos_side(p)))))
      next = source(ok, p, index, M.is_pawn(code), start, end, acc)
      moves(rest, p, U32.add(index, 1), start, end, next)

def abs_diff(+a: U32, +b: U32) -> U32:
  Bool.pick(U32, U32.is_ge(a, b), U32.sub(a, b), U32.sub(b, a))

# This helper emits all tags only after the cheap topology guard succeeds.
def shift_tags(ok: Bool, base: U32, start: U32, end: Nat,
  acc: List<&2, U32>) -> List<&2, U32>:
  match ok:
    case False{}: acc
    case True{}: tags(5n, base, start, end, acc)

def shift_topology(ok: Bool, +p: M.Position, +from: U32, +to: U32,
  base: U32, start: U32, end: Nat, acc: List<&2, U32>) -> List<&2, U32>:
  match ok:
    case False{}: acc
    case True{}:
      +neighbor = U32.is_eq(U32.add(abs_diff(M.macro_file(from), M.macro_file(to)),
        abs_diff(M.macro_rank(from), M.macro_rank(to))), 1)
      +present = U32.is_zero(U32.and(M.pos_holes(p), M.macro_mask(from)))
      +hole = U32.is_ne(U32.and(M.pos_holes(p), M.macro_mask(to)), 0)
      shift_tags(Bool.and(neighbor, Bool.and(present, hole)), base, start, end, acc)

def shifts(n: Nat, +p: M.Position, +pair: U32, +start: U32, +end: Nat,
  acc: List<&2, U32>) -> List<&2, U32>:
  match n:
    case 0n: acc
    case 1n+rest:
      +base = U32.add(20480, U32.mul(5, pair))
      next = shift_topology(overlaps(base, 5, start, end), p, U32.div(pair, 16), U32.mod(pair, 16), base, start, end, acc)
      shifts(rest, p, U32.add(pair, 1), start, end, next)

def range(n: Nat, +start: U32, +p: M.Position) -> List<&2, U32>:
  +end = Nat.add(U32.to_nat(start), n)
  ordinary = moves(M.pos_board(p), p, 0, start, end, Nil{})
  List.reverse(&2, U32, shifts(256n, p, 0, start, end, ordinary))
