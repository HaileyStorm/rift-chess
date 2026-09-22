import Base
import ./Model.bend as M
import ./Geometry.bend as G

# Total proposal and admissibility are separate: an unrecognized action proposes
# the original position, but can never pass eligible.
def at(+p: M.Position, s: U32) -> U32:
  M.board_get(M.pos_board(p), s)

def pawn(+code: U32) -> Bool:
  Bool.or(U32.is_eq(M.piece_type(code), 1), U32.is_eq(M.piece_type(code), 7))

def empty(+p: M.Position, +s: U32) -> Bool:
  Bool.and(U32.is_lt(s, 64), Bool.and(M.present(M.pos_holes(p), s), U32.is_zero(at(p, s))))

def promotion_kind(promo: U32) -> U32:
  match promo:
    case 1: 5
    case 2: 4
    case 3: 3
    case 4: 2
    case _: 1

def promoted(+p: M.Position, +code: U32, promo: U32) -> U32:
  match promo:
    case 0:
      Bool.pick(U32, pawn(code), M.encode_piece(M.pos_side(p), 1), code)
    case _:
      M.encode_piece(M.pos_side(p), promotion_kind(promo))

def last_rank(+p: M.Position, to: U32) -> Bool:
  U32.is_eq(M.rank_of(to), Bool.pick(U32, M.pos_side(p), 7, 0))

def promo_ok(needed: Bool, +promo: U32) -> Bool:
  match needed:
    case True{}: Bool.and(U32.is_ge(promo, 1), U32.is_le(promo, 4))
    case False{}: U32.is_zero(promo)

def is_ep(+p: M.Position, +from: U32, +to: U32) -> Bool:
  Bool.and(pawn(at(p, from)), Bool.and(U32.is_eq(to, M.pos_ep(p)),
    Bool.and(U32.is_lt(M.pos_ep_pawn(p), 64), U32.is_ne(M.file_of(from), M.file_of(to)))))

def is_castle(+p: M.Position, +from: U32, +to: U32) -> Bool:
  Bool.and(U32.is_eq(M.piece_type(at(p, from)), 6), U32.is_eq(G.abs_diff(M.file_of(from), M.file_of(to)), 2))

def castle_rook_from(+p: M.Position, to: U32) -> U32:
  M.sq(Bool.pick(U32, U32.is_eq(M.file_of(to), 6), 7, 0), Bool.pick(U32, M.pos_side(p), 0, 7))

def castle_rook_to(+p: M.Position, to: U32) -> U32:
  M.sq(Bool.pick(U32, U32.is_eq(M.file_of(to), 6), 5, 3), Bool.pick(U32, M.pos_side(p), 0, 7))

def move_rook(castle: Bool, +p: M.Position, +to: U32, board: List<&2, U32>) -> List<&2, U32>:
  match castle:
    case False{}: board
    case True{}:
      +source = castle_rook_from(p, to)
      M.board_set(M.board_set(board, source, 0), castle_rook_to(p, to), at(p, source))

def remove_ep(ep: Bool, p: M.Position, board: List<&2, U32>) -> List<&2, U32>:
  match ep:
    case False{}: board
    case True{}: M.board_set(board, M.pos_ep_pawn(p), 0)

def move_rights(+p: M.Position, +from: U32, +to: U32) -> U32:
  +kind = M.piece_type(at(p, from))
  +r0 = Bool.pick(U32, U32.is_eq(kind, 6),
    U32.and(M.pos_rights(p), U32.not(Bool.pick(U32, M.pos_side(p), 3, 12))), M.pos_rights(p))
  +r1 = Bool.pick(U32, U32.is_eq(kind, 4), M.clear_rook_right(r0, from), r0)
  Bool.pick(U32, U32.is_eq(M.piece_type(at(p, to)), 4), M.clear_rook_right(r1, to), r1)

def next_full(+p: M.Position) -> Nat:
  Nat.add(M.pos_full(p), Bool.pick(Nat, M.pos_side(p), 0n, 1n))

def move(+p: M.Position, +from: U32, +to: U32, promo: U32) -> M.Position:
  +double = Bool.and(pawn(at(p, from)), U32.is_eq(G.abs_diff(M.rank_of(from), M.rank_of(to)), 2))
  +ep = is_ep(p, from, to)
  +reset = Bool.or(pawn(at(p, from)), Bool.or(M.occupied(at(p, to)), ep))
  board = M.board_set(M.pos_board(p), from, 0)
  board = remove_ep(ep, p, board)
  board = move_rook(is_castle(p, from, to), p, to, board)
  board = M.board_set(board, to, promoted(p, at(p, from), promo))
  M.Pos{board, M.pos_holes(p), Bool.not(M.pos_side(p)), move_rights(p, from, to),
    Bool.pick(U32, double, M.sq(M.file_of(from), U32.div(U32.add(M.rank_of(from), M.rank_of(to)), 2)), 64),
    Bool.pick(U32, double, to, 64), Bool.pick(Nat, reset, 0n, Nat.add(M.pos_quiet(p), 1n)), next_full(p)}

# Copy each square to the corresponding offset in the neighboring tile. The
# original board supplies all pieces, so the update has no overwrite ordering.
def shift_board(n: Nat, +p: M.Position, +from: U32, +to: U32, +promo: U32,
  +offset: U32, board: List<&2, U32>) -> List<&2, U32>:
  match n:
    case 0n: board
    case 1n+rest:
      +s = M.square_in_macro(from, offset)
      +d = M.square_in_macro(to, offset)
      +code = at(p, s)
      +promotes = Bool.and(pawn(code), last_rank(p, d))
      +next = Bool.pick(U32, U32.is_zero(code), 0,
        promoted(p, code, Bool.pick(U32, promotes, promo, 0)))
      shift_board(rest, p, from, to, promo, U32.add(offset, 1), M.board_set(M.board_set(board, s, 0), d, next))

def shift_rights(n: Nat, +p: M.Position, +from: U32, +offset: U32, +rights: U32) -> U32:
  match n:
    case 0n: rights
    case 1n+rest:
      +s = M.square_in_macro(from, offset)
      shift_rights(rest, p, from, U32.add(offset, 1),
        Bool.pick(U32, U32.is_eq(M.piece_type(at(p, s)), 4), M.clear_rook_right(rights, s), rights))

def shift(+p: M.Position, +from: U32, +to: U32, +promo: U32) -> M.Position:
  M.Pos{shift_board(4n, p, from, to, promo, 0, M.pos_board(p)),
    U32.or(U32.and(M.pos_holes(p), U32.not(M.macro_mask(to))), M.macro_mask(from)),
    Bool.not(M.pos_side(p)), shift_rights(4n, p, from, 0, M.pos_rights(p)), 64, 64,
    Bool.pick(Nat, U32.is_zero(promo), Nat.add(M.pos_quiet(p), 1n), 0n), next_full(p)}

def candidate_action(p: M.Position, action: M.Action) -> M.Position:
  match action:
    case M.MoveAction{from, to, promotion}: move(p, from, to, promotion)
    case M.ShiftAction{from, to, promotion}: shift(p, from, to, promotion)

def candidate_decoded(p: M.Position, decoded: Maybe<M.Action>) -> M.Position:
  match decoded:
    case None{}: p
    case Some{value}: candidate_action(p, value)

def candidate(+p: M.Position, id: U32) -> M.Position:
  candidate_decoded(p, M.decode(id))

# A slider walks only one of the eight geometrically valid directions. Holes
# and every intervening occupied square terminate its reach.
def walk(n: Nat, +p: M.Position, +current: U32, +to: U32, +dir: U32, alive: Bool, hit: Bool) -> Bool:
  match n:
    case 0n: False{}
    case 1n+rest:
      match alive:
        case False{}: False{}
        case True{}:
          match hit:
            case True{}: True{}
            case False{}:
              +next = G.neighbor(current, dir)
              walk(rest, p, next, to, dir,
                Bool.and(U32.is_zero(at(p, current)), Bool.and(U32.is_lt(next, 64), M.present(M.pos_holes(p), next))), U32.is_eq(next, to))

def slider_if(allowed: Bool, +p: M.Position, +from: U32, +to: U32) -> Bool:
  match allowed:
    case False{}: False{}
    case True{}:
      +right = U32.is_gt(M.file_of(to), M.file_of(from))
      +up = U32.is_gt(M.rank_of(to), M.rank_of(from))
      +dir = Bool.pick(U32, U32.is_eq(M.file_of(from), M.file_of(to)), Bool.pick(U32, up, 4, 5),
        Bool.pick(U32, U32.is_eq(M.rank_of(from), M.rank_of(to)), Bool.pick(U32, right, 6, 7),
          Bool.pick(U32, right, Bool.pick(U32, up, 0, 1), Bool.pick(U32, up, 2, 3))))
      +next = G.neighbor(from, dir)
      walk(8n, p, next, to, dir, Bool.and(U32.is_lt(next, 64), M.present(M.pos_holes(p), next)), U32.is_eq(next, to))

def slider(+p: M.Position, +from: U32, +to: U32, +kind: U32) -> Bool:
  +df = G.abs_diff(M.file_of(from), M.file_of(to))
  +dr = G.abs_diff(M.rank_of(from), M.rank_of(to))
  +diagonal = Bool.and(U32.is_eq(df, dr), U32.is_ne(df, 0))
  +orthogonal = Bool.and(Bool.or(U32.is_zero(df), U32.is_zero(dr)), U32.is_ne(from, to))
  +allowed = Bool.or(Bool.and(diagonal, Bool.or(U32.is_eq(kind, 3), U32.is_eq(kind, 5))),
    Bool.and(orthogonal, Bool.or(U32.is_eq(kind, 4), U32.is_eq(kind, 5))))
  slider_if(allowed, p, from, to)

def pawn_geometry(+p: M.Position, +from: U32, +to: U32) -> Bool:
  +step = Bool.pick(U32, M.pos_side(p), 4, 5)
  +one = G.neighbor(from, step)
  +straight = Bool.or(Bool.and(U32.is_eq(to, one), empty(p, to)),
    Bool.and(U32.is_eq(M.piece_type(at(p, from)), 7),
      Bool.and(U32.is_eq(M.rank_of(from), Bool.pick(U32, M.pos_side(p), 1, 6)),
        Bool.and(empty(p, one), Bool.and(U32.is_eq(to, G.neighbor(one, step)), empty(p, to))))))
  +capture = Bool.and(U32.is_eq(G.abs_diff(M.file_of(from), M.file_of(to)), 1),
    Bool.and(U32.is_eq(M.rank_of(to), M.rank_of(one)),
      Bool.or(M.same_side(at(p, to), Bool.not(M.pos_side(p))),
        Bool.and(is_ep(p, from, to), Bool.and(empty(p, to),
          Bool.and(pawn(at(p, M.pos_ep_pawn(p))), M.same_side(at(p, M.pos_ep_pawn(p)), Bool.not(M.pos_side(p)))))))))
  Bool.or(straight, capture)

def castle_safe(ok: Bool, +p: M.Position, +middle: U32, +to: U32) -> Bool:
  match ok:
    case False{}: False{}
    case True{}:
      Bool.and(Bool.not(G.in_check(p, M.pos_side(p))),
        Bool.and(Bool.not(G.attacked(p, middle, Bool.not(M.pos_side(p)))), Bool.not(G.attacked(p, to, Bool.not(M.pos_side(p))))))

def castle(+p: M.Position, +from: U32, +to: U32) -> Bool:
  +rank = Bool.pick(U32, M.pos_side(p), 0, 7)
  +king_side = U32.is_eq(M.file_of(to), 6)
  +right = Bool.pick(U32, M.pos_side(p), Bool.pick(U32, king_side, 1, 2), Bool.pick(U32, king_side, 4, 8))
  +middle = M.sq(Bool.pick(U32, king_side, 5, 3), rank)
  +rook = M.sq(Bool.pick(U32, king_side, 7, 0), rank)
  +ok = Bool.and(U32.is_eq(from, M.sq(4, rank)),
    Bool.and(U32.is_eq(M.rank_of(to), rank), Bool.and(Bool.or(king_side, U32.is_eq(M.file_of(to), 2)),
      Bool.and(U32.is_ne(U32.and(M.pos_rights(p), right), 0),
        Bool.and(U32.is_eq(at(p, rook), M.encode_piece(M.pos_side(p), 4)),
          Bool.and(M.present(M.pos_holes(p), rook), Bool.and(empty(p, middle), Bool.and(empty(p, to),
            Bool.or(king_side, empty(p, M.sq(1, rank)))))))))))
  castle_safe(ok, p, middle, to)

def geometry(kind: U32, +p: M.Position, +from: U32, +to: U32) -> Bool:
  match kind:
    case 1: pawn_geometry(p, from, to)
    case 7: pawn_geometry(p, from, to)
    case 2: G.knight_geometry(from, to)
    case 6: Bool.or(G.king_geometry(from, to), castle(p, from, to))
    case 3: slider(p, from, to, 3)
    case 4: slider(p, from, to, 4)
    case 5: slider(p, from, to, 5)
    case _: False{}

def move_target(ok: Bool, +p: M.Position, +from: U32, +to: U32, promo: U32, code: U32) -> Bool:
  match ok:
    case False{}: False{}
    case True{}:
      +target = at(p, to)
      Bool.and(Bool.not(M.same_side(target, M.pos_side(p))),
        Bool.and(U32.is_ne(M.piece_type(target), 6), promo_ok(Bool.and(pawn(code), last_rank(p, to)), promo)))

def move_source(ok: Bool, +p: M.Position, +from: U32, +to: U32, promo: U32) -> Bool:
  match ok:
    case False{}: False{}
    case True{}:
      +code = at(p, from)
      move_target(M.same_side(code, M.pos_side(p)), p, from, to, promo, code)

def move_base(+p: M.Position, +from: U32, +to: U32, promo: U32) -> Bool:
  move_source(Bool.and(U32.is_lt(from, 64), Bool.and(U32.is_lt(to, 64), Bool.and(U32.is_ne(from, to),
    Bool.and(M.present(M.pos_holes(p), from), M.present(M.pos_holes(p), to))))), p, from, to, promo)

def move_geometry_if(ok: Bool, +p: M.Position, +from: U32, +to: U32) -> Bool:
  match ok:
    case False{}: False{}
    case True{}: geometry(M.piece_type(at(p, from)), p, from, to)

def move_eligible(+p: M.Position, +from: U32, +to: U32, promo: U32) -> Bool:
  move_geometry_if(move_base(p, from, to, promo), p, from, to)
def shift_count(n: Nat, +p: M.Position, +from: U32, +offset: U32, count: U32) -> U32:
  match n:
    case 0n: count
    case 1n+rest:
      shift_count(rest, p, from, U32.add(offset, 1), U32.add(count, Bool.to_u32(M.occupied(at(p, M.square_in_macro(from, offset))))))

def shift_allowed(n: Nat, +p: M.Position, +from: U32, +offset: U32, ok: Bool) -> Bool:
  match n:
    case 0n: ok
    case 1n+rest:
      +code = at(p, M.square_in_macro(from, offset))
      shift_allowed(rest, p, from, U32.add(offset, 1), Bool.and(ok,
        Bool.or(U32.is_zero(code), Bool.and(M.same_side(code, M.pos_side(p)), U32.is_ne(M.piece_type(code), 6)))))

def shift_promotes(n: Nat, +p: M.Position, +from: U32, +to: U32, +offset: U32, any: Bool) -> Bool:
  match n:
    case 0n: any
    case 1n+rest:
      shift_promotes(rest, p, from, to, U32.add(offset, 1), Bool.or(any,
        Bool.and(pawn(at(p, M.square_in_macro(from, offset))), last_rank(p, M.square_in_macro(to, offset)))))

def shift_occupants(ok: Bool, +p: M.Position, +from: U32, to: U32, promo: U32) -> Bool:
  match ok:
    case False{}: False{}
    case True{}:
      Bool.and(U32.is_le(shift_count(4n, p, from, 0, 0), 1),
        Bool.and(shift_allowed(4n, p, from, 0, True{}), promo_ok(shift_promotes(4n, p, from, to, 0, False{}), promo)))

def shift_eligible(+p: M.Position, +from: U32, +to: U32, promo: U32) -> Bool:
  shift_occupants(Bool.and(U32.is_lt(from, 16), Bool.and(U32.is_lt(to, 16),
    Bool.and(U32.is_eq(U32.add(G.abs_diff(M.macro_file(from), M.macro_file(to)), G.abs_diff(M.macro_rank(from), M.macro_rank(to))), 1),
      Bool.and(U32.is_zero(U32.and(M.pos_holes(p), M.macro_mask(from))),
        U32.is_ne(U32.and(M.pos_holes(p), M.macro_mask(to)), 0))))), p, from, to, promo)

def eligible_action(+p: M.Position, action: M.Action) -> Bool:
  match action:
    case M.MoveAction{from, to, promotion}: move_eligible(p, from, to, promotion)
    case M.ShiftAction{from, to, promotion}: shift_eligible(p, from, to, promotion)

def eligible_safe(ok: Bool, +p: M.Position, id: U32) -> Bool:
  match ok:
    case False{}: False{}
    case True{}: Bool.not(G.in_check(candidate(p, id), M.pos_side(p)))

# Decode only the selected action family. This preserves the same bounded ID
# language while avoiding construction of both action variants during scans.
def eligible_kind(is_move: Bool, +p: M.Position, +id: U32) -> Bool:
  match is_move:
    case True{}:
      +q = U32.div(id, 5)
      eligible_safe(move_eligible(p, U32.div(q, 64), U32.mod(q, 64), U32.mod(id, 5)), p, id)
    case False{}:
      +q = U32.div(U32.sub(id, 20480), 5)
      eligible_safe(shift_eligible(p, U32.div(q, 16), U32.mod(q, 16), U32.mod(id, 5)), p, id)

def eligible_bound(in_range: Bool, +p: M.Position, +id: U32) -> Bool:
  match in_range:
    case False{}: False{}
    case True{}: eligible_kind(U32.is_lt(id, 20480), p, id)

def eligible(+p: M.Position, +id: U32) -> Bool:
  eligible_bound(U32.is_lt(id, 21760), p, id)

# Exact board equality with the proposal enforces locality and material changes;
# every metadata field is checked independently, including unbounded counters.
def board_equal(xs: List<&2, U32>, ys: List<&2, U32>) -> Bool:
  match xs:
    case Nil{}:
      match ys:
        case Nil{}: True{}
        case h <> t: False{}
    case x <> xt:
      match ys:
        case Nil{}: False{}
        case y <> yt: Bool.and(U32.is_eq(x, y), board_equal(xt, yt))

def equal(+a: M.Position, +b: M.Position) -> Bool:
  Bool.and(board_equal(M.pos_board(a), M.pos_board(b)),
    Bool.and(U32.is_eq(M.pos_holes(a), M.pos_holes(b)),
      Bool.and(Bool.not(Bool.xor(M.pos_side(a), M.pos_side(b))),
        Bool.and(U32.is_eq(M.pos_rights(a), M.pos_rights(b)),
          Bool.and(U32.is_eq(M.pos_ep(a), M.pos_ep(b)),
            Bool.and(U32.is_eq(M.pos_ep_pawn(a), M.pos_ep_pawn(b)),
              Bool.and(Nat.is_eq(M.pos_quiet(a), M.pos_quiet(b)), Nat.is_eq(M.pos_full(a), M.pos_full(b)))))))))

# These conservation checks do not compare against the proposal: material may
# only decrease and every square outside the action footprint must be unchanged.
def material(xs: List<&2, U32>) -> Nat:
  match xs:
    case Nil{}: 0n
    case h <> t: Nat.add(U32.to_nat(Bool.to_u32(M.occupied(h))), material(t))

type Footprint is Data:
  Ordinary{from: U32, to: U32, epPawn: U32, rookFrom: U32, rookTo: U32}
  TilePair{from: U32, to: U32}

def footprint(+p: M.Position, action: M.Action) -> Footprint:
  match action:
    case M.MoveAction{+from, +to, promotion}:
      +castle = is_castle(p, from, to)
      Ordinary{from, to, Bool.pick(U32, is_ep(p, from, to), M.pos_ep_pawn(p), 64),
        Bool.pick(U32, castle, castle_rook_from(p, to), 64), Bool.pick(U32, castle, castle_rook_to(p, to), 64)}
    case M.ShiftAction{from, to, promotion}: TilePair{from, to}

def affected(area: Footprint, +s: U32) -> Bool:
  match area:
    case Ordinary{from, to, epPawn, rookFrom, rookTo}:
      Bool.or(U32.is_eq(s, from), Bool.or(U32.is_eq(s, to),
        Bool.or(U32.is_eq(s, epPawn), Bool.or(U32.is_eq(s, rookFrom), U32.is_eq(s, rookTo)))))
    case TilePair{from, to}:
      Bool.or(U32.is_eq(M.macro_of(s), from), U32.is_eq(M.macro_of(s), to))

# Traverse paired lists once and derive the allowed footprint once, rather
# than repeatedly indexing both boards and re-deriving special effects.
def locality(xs: List<&2, U32>, ys: List<&2, U32>, +area: Footprint, +s: U32, ok: Bool) -> Bool:
  match xs:
    case Nil{}:
      match ys:
        case Nil{}: ok
        case h <> t: False{}
    case x <> xt:
      match ys:
        case Nil{}: False{}
        case y <> yt:
          locality(xt, yt, area, U32.add(s, 1), Bool.and(ok, Bool.or(affected(area, s), U32.is_eq(x, y))))

def post_decoded(+p: M.Position, next: M.Position, decoded: Maybe<M.Action>) -> Bool:
  match decoded:
    case None{}: False{}
    case Some{value}: locality(M.pos_board(p), M.pos_board(next), footprint(p, value), 0, True{})

def post(+p: M.Position, +id: U32, +next: M.Position) -> Bool:
  Bool.and(equal(candidate(p, id), next),
    Bool.and(post_decoded(p, next, M.decode(id)),
      Bool.and(Nat.is_le(material(M.pos_board(next)), material(M.pos_board(p))),
        Bool.and(Bool.xor(M.pos_side(p), M.pos_side(next)),
          Bool.and(Nat.is_eq(M.pos_full(next), next_full(p)),
            Bool.and(U32.is_eq(U32.and(M.pos_rights(next), M.pos_rights(p)), M.pos_rights(next)),
              Bool.not(G.in_check(next, M.pos_side(p)))))))))



