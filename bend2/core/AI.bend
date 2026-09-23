# A small deterministic local opponent. It scores only the supplied legal list;
# every chosen intent still passes the public match command guard. This is a
# sprint opponent, not a claim of strong chess play or a solved game.
import Base
import ./Model.bend as M
import ./v2/RuleContracts.bend as S
import ./Geometry.bend as G

type Choice is Data:
  Choice{score: U32, id: U32}

type Split is Data:
  Split{left: List<&2, U32>, right: List<&2, U32>}

def weight(kind: U32) -> U32:
  match kind:
    case 1: 100
    case 7: 100
    case 2: 320
    case 3: 335
    case 4: 510
    case 5: 930
    case _: 0

def center(+coordinate: U32) -> U32:
  Bool.pick(U32, U32.is_lt(coordinate, 4), coordinate, U32.sub(7, coordinate))

def piece_score(+code: U32, +square: U32) -> U32:
  +kind = M.piece_type(code)
  +central = U32.add(center(M.file_of(square)), center(M.rank_of(square)))
  +advance = Bool.pick(U32, M.is_white(code), M.rank_of(square), U32.sub(7, M.rank_of(square)))
  U32.add(weight(kind), Bool.pick(U32, M.is_pawn(code), U32.add(U32.mul(advance, 5), central),
    Bool.pick(U32, U32.is_eq(kind, 6), 0, U32.mul(central, 5))))

def board_score(xs: List<&2, U32>, +side: Bool, +index: U32, +score: U32) -> U32:
  match xs:
    case []: score
    case +code <> rest:
      +points = Bool.pick(U32, M.occupied(code), piece_score(code, index), 0)
      +next = Bool.pick(U32, M.same_side(code, side), U32.add(score, points), U32.sub(score, points))
      board_score(rest, side, U32.add(index, 1), next)

def hanging_at(+next: M.Position, +to: U32, threatened: Bool) -> U32:
  match threatened:
    case False{}: 0
    case True{}: U32.div(weight(M.piece_type(M.board_get(M.pos_board(next), to))), 3)

def hanging_action(+next: M.Position, action: M.Action) -> U32:
  match action:
    case M.MoveAction{from, +to, promotion}:
      hanging_at(next, to, G.attacked(next, to, M.pos_side(next)))
    case M.ShiftAction{from, to, promotion}: 0

def hanging_decoded(next: M.Position, action: Maybe<M.Action>) -> U32:
  match action:
    case None{}: 0
    case Some{value}: hanging_action(next, value)

def score(+p: M.Position, +id: U32) -> U32:
  +next = S.expected(p, id)
  +base = board_score(M.pos_board(next), M.pos_side(p), 0, 100000)
  +check = Bool.pick(U32, G.in_check(next, M.pos_side(next)), 35, 0)
  U32.sub(U32.add(base, check), hanging_decoded(next, M.decode(id)))

def better(+a: Choice, +b: Choice) -> Choice:
  match a b:
    case Choice{+sa, +ia} Choice{+sb, +ib}:
      Bool.pick(Choice, Bool.or(U32.is_gt(sa, sb), Bool.and(U32.is_eq(sa, sb), U32.is_lt(ia, ib))), a, b)

def sequential(ids: List<&2, U32>, +p: M.Position, best: Choice) -> Choice:
  match ids:
    case []: best
    case +id <> rest: sequential(rest, p, better(best, Choice{score(p, id), id}))

# Alternating split balances by candidate count, not by board location. Tie
# breaking always chooses the smaller canonical ID, independent of join order.
def split_join(id: U32, pair: Split) -> Split:
  match pair:
    case Split{a, b}: Split{id <> b, a}

def split(ids: List<&2, U32>) -> Split:
  match ids:
    case []: Split{[], []}
    case id <> rest: split_join(id, split(rest))

def left(pair: Split) -> List<&2, U32>:
  match pair:
    case Split{a, b}: a

def right(pair: Split) -> List<&2, U32>:
  match pair:
    case Split{a, b}: b

def parallel(depth: Nat, ids: List<&2, U32>, +p: M.Position) -> Choice:
  match depth:
    case 0n: sequential(ids, p, Choice{0, 21760})
    case 1n++rest:
      +parts = split(ids)
      a b = parallel(rest, left(parts), p) parallel(rest, right(parts), p)
      better(a, b)

def choice_id(choice: Choice) -> U32:
  match choice:
    case Choice{score, id}: id

def choose(p: M.Position, ids: List<&2, U32>) -> U32:
  choice_id(parallel(2n, ids, p))
