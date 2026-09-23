import Base
import ./Model.bend as M

# Geometry and structural validity are kept independent from transition rules.
# Action effects consume this module's fixed-coordinate predicates.

def side_code(side: Bool, kind: U32) -> U32:
  M.encode_piece(side, kind)

def opposite(side: Bool) -> Bool:
  Bool.not(side)

def occupied(code: U32) -> Bool:
  M.occupied(code)

def board_get(board: List<&2, U32>, index: U32) -> U32:
  M.board_get(board, index)

def board_set(board: List<&2, U32>, index: U32, value: U32) -> List<&2, U32>:
  M.board_set(board, index, value)

def rank_is(square: U32, rank: U32) -> Bool:
  U32.is_eq(M.rank_of(square), rank)

def file_is(square: U32, file: U32) -> Bool:
  U32.is_eq(M.file_of(square), file)

def square_in_range(square: U32) -> Bool:
  U32.is_lt(square, 64)

def macro_in_range(macro: U32) -> Bool:
  U32.is_lt(macro, 16)

def code_legal(+code: U32) -> Bool:
  Bool.or(U32.is_zero(code),
    Bool.or(Bool.and(U32.is_ge(code, 1), U32.is_le(code, 7)),
      Bool.and(U32.is_ge(code, 9), U32.is_le(code, 15))))

def count_code.go(xs: List<&2, U32>, +code: U32, count: Nat) -> Nat:
  match xs:
    case Nil{}:
      count
    case +h <> t:
      count_code.go(t, code, Nat.add(count, U32.to_nat(Bool.to_u32(U32.is_eq(h, code)))))

def count_code(board: List<&2, U32>, +code: U32) -> Nat:
  count_code.go(board, code, 0n)

def pawn_rank_ok(square: U32, +code: U32) -> Bool:
  +kind = M.piece_type(code)
  +rank = M.rank_of(square)
  +pawn = M.is_pawn(code)
  +fresh = U32.is_eq(kind, 7)
  +white = M.is_white(code)
  Bool.and(Bool.or(Bool.not(pawn),
      U32.is_ne(rank, Bool.pick(U32, white, 7, 0))),
    Bool.or(Bool.not(fresh),
      U32.is_eq(rank, Bool.pick(U32, white, 1, 6))))

def valid_piece_at(+square: U32, +code: U32, holes: U32) -> Bool:
  +present = M.present(holes, square)
  +legal = code_legal(code)
  +zero = U32.is_zero(code)
  Bool.and(legal,
    Bool.or(zero, Bool.and(present, pawn_rank_ok(square, code))))

def valid_board.go(xs: List<&2, U32>, +index: U32, +holes: U32, ok: Bool) -> Bool:
  match xs:
    case Nil{}:
      Bool.and(ok, U32.is_eq(index, 64))
    case h <> t:
      valid_board.go(t, U32.add(index, 1), holes,
        Bool.and(ok, valid_piece_at(index, h, holes)))

def valid_board(board: List<&2, U32>, +holes: U32) -> Bool:
  valid_board.go(board, 0, holes, True{})

def right_present(rights: U32, bit: U32) -> Bool:
  U32.is_ne(U32.and(rights, bit), 0)

def castling_piece_ok(+p: M.Position, right: U32, +king: U32, +rook: U32,
  king_code: U32, rook_code: U32) -> Bool:
  Bool.or(Bool.not(right_present(M.pos_rights(p), right)),
    Bool.and(U32.is_eq(board_get(M.pos_board(p), king), king_code),
      Bool.and(U32.is_eq(board_get(M.pos_board(p), rook), rook_code),
        Bool.and(M.present(M.pos_holes(p), king), M.present(M.pos_holes(p), rook)))))

def ep_pair_empty(+p: M.Position, +target: U32, +pawn: U32, +source: U32,
  pawn_code: U32) -> Bool:
  Bool.and(M.present(M.pos_holes(p), target),
    Bool.and(M.present(M.pos_holes(p), pawn),
      Bool.and(M.present(M.pos_holes(p), source),
        Bool.and(U32.is_zero(board_get(M.pos_board(p), target)),
          Bool.and(U32.is_zero(board_get(M.pos_board(p), source)),
            U32.is_eq(board_get(M.pos_board(p), pawn), pawn_code))))))

def ep_geometry(+p: M.Position, target_rank: U32, pawn_rank: U32,
  source_rank: U32, pawn_code: U32) -> Bool:
  +target = M.pos_ep(p)
  +pawn = M.pos_ep_pawn(p)
  +same_file = U32.is_eq(M.file_of(target), M.file_of(pawn))
  Bool.and(Bool.and(square_in_range(target), square_in_range(pawn)),
    Bool.and(Bool.and(rank_is(target, target_rank), rank_is(pawn, pawn_rank)),
      Bool.and(same_file,
        ep_pair_empty(p, target, pawn, M.sq(M.file_of(pawn), source_rank), pawn_code))))

def ep_valid(+p: M.Position) -> Bool:
  +none_target = U32.is_eq(M.pos_ep(p), M.none_ep())
  +none_pawn = U32.is_eq(M.pos_ep_pawn(p), M.none_ep())
  Bool.or(Bool.and(none_target, none_pawn),
    Bool.and(Bool.and(Bool.not(none_target), Bool.not(none_pawn)),
      Bool.and(Nat.is_eq(M.pos_quiet(p), 0n),
        Bool.pick(Bool, M.pos_side(p),
          ep_geometry(p, 5, 4, 6, 9),
          ep_geometry(p, 2, 3, 1, 1)))))

def full_valid(full: Nat) -> Bool:
  Nat.is_ge(full, 1n)

# Eight adjacent directions. 64 is the out-of-board sentinel; present holes
# are checked separately by ray traversal.
def neighbor_case(d0: U32, +file: U32, +rank: U32) -> U32:
  match d0:
    case 0:
      Bool.pick(U32, Bool.and(U32.is_lt(file, 7), U32.is_lt(rank, 7)),
        M.sq(U32.add(file, 1), U32.add(rank, 1)), 64)
    case 1:
      Bool.pick(U32, Bool.and(U32.is_lt(file, 7), U32.is_gt(rank, 0)),
        M.sq(U32.add(file, 1), U32.sub(rank, 1)), 64)
    case 2:
      Bool.pick(U32, Bool.and(U32.is_gt(file, 0), U32.is_lt(rank, 7)),
        M.sq(U32.sub(file, 1), U32.add(rank, 1)), 64)
    case 3:
      Bool.pick(U32, Bool.and(U32.is_gt(file, 0), U32.is_gt(rank, 0)),
        M.sq(U32.sub(file, 1), U32.sub(rank, 1)), 64)
    case 4:
      Bool.pick(U32, U32.is_lt(rank, 7), M.sq(file, U32.add(rank, 1)), 64)
    case 5:
      Bool.pick(U32, U32.is_gt(rank, 0), M.sq(file, U32.sub(rank, 1)), 64)
    case 6:
      Bool.pick(U32, U32.is_lt(file, 7), M.sq(U32.add(file, 1), rank), 64)
    case _:
      Bool.pick(U32, U32.is_gt(file, 0), M.sq(U32.sub(file, 1), rank), 64)

def neighbor(+square: U32, d0: U32) -> U32:
  neighbor_case(d0, M.file_of(square), M.rank_of(square))

def square_piece_ok(+p: M.Position, +square: U32, by_side: Bool,
  predicate: U32) -> Bool:
  Bool.and(U32.is_lt(square, 64),
    Bool.and(M.present(M.pos_holes(p), square),
      Bool.and(M.same_side(board_get(M.pos_board(p), square), by_side),
        U32.is_eq(M.piece_type(board_get(M.pos_board(p), square)), predicate))))

def pawn_square_ok(+p: M.Position, +square: U32, by_side: Bool) -> Bool:
  Bool.and(U32.is_lt(square, 64),
    Bool.and(M.present(M.pos_holes(p), square),
      Bool.and(M.same_side(board_get(M.pos_board(p), square), by_side),
        M.is_pawn(board_get(M.pos_board(p), square)))))

def attacked_pawn(+p: M.Position, +target: U32, +by_side: Bool) -> Bool:
  +file = M.file_of(target)
  +rank = M.rank_of(target)
  +source_rank = Bool.pick(U32, by_side, U32.sub(rank, 1), U32.add(rank, 1))
  +left = Bool.pick(U32, U32.is_gt(file, 0), M.sq(U32.sub(file, 1), source_rank), 64)
  +right = Bool.pick(U32, U32.is_lt(file, 7), M.sq(U32.add(file, 1), source_rank), 64)
  Bool.or(pawn_square_ok(p, left, by_side),
    pawn_square_ok(p, right, by_side))

def abs_diff(+a: U32, +b: U32) -> U32:
  Bool.pick(U32, U32.is_ge(a, b), U32.sub(a, b), U32.sub(b, a))

def knight_geometry(+a: U32, +b: U32) -> Bool:
  +df = abs_diff(M.file_of(a), M.file_of(b))
  +dr = abs_diff(M.rank_of(a), M.rank_of(b))
  Bool.or(Bool.and(U32.is_eq(df, 1), U32.is_eq(dr, 2)),
    Bool.and(U32.is_eq(df, 2), U32.is_eq(dr, 1)))

def king_geometry(+a: U32, +b: U32) -> Bool:
  +df = abs_diff(M.file_of(a), M.file_of(b))
  +dr = abs_diff(M.rank_of(a), M.rank_of(b))
  Bool.and(U32.is_le(df, 1), Bool.and(U32.is_le(dr, 1),
    Bool.or(U32.is_eq(df, 1), U32.is_eq(dr, 1))))

def knight_case(d0: U32, +file: U32, +rank: U32) -> U32:
  match d0:
    case 0:
      Bool.pick(U32, Bool.and(U32.is_lt(file, 7), U32.is_lt(rank, 6)),
        M.sq(U32.add(file, 1), U32.add(rank, 2)), 64)
    case 1:
      Bool.pick(U32, Bool.and(U32.is_lt(file, 7), U32.is_gt(rank, 1)),
        M.sq(U32.add(file, 1), U32.sub(rank, 2)), 64)
    case 2:
      Bool.pick(U32, Bool.and(U32.is_gt(file, 0), U32.is_lt(rank, 6)),
        M.sq(U32.sub(file, 1), U32.add(rank, 2)), 64)
    case 3:
      Bool.pick(U32, Bool.and(U32.is_gt(file, 0), U32.is_gt(rank, 1)),
        M.sq(U32.sub(file, 1), U32.sub(rank, 2)), 64)
    case 4:
      Bool.pick(U32, Bool.and(U32.is_lt(file, 6), U32.is_lt(rank, 7)),
        M.sq(U32.add(file, 2), U32.add(rank, 1)), 64)
    case 5:
      Bool.pick(U32, Bool.and(U32.is_lt(file, 6), U32.is_gt(rank, 0)),
        M.sq(U32.add(file, 2), U32.sub(rank, 1)), 64)
    case 6:
      Bool.pick(U32, Bool.and(U32.is_gt(file, 1), U32.is_lt(rank, 7)),
        M.sq(U32.sub(file, 2), U32.add(rank, 1)), 64)
    case _:
      Bool.pick(U32, Bool.and(U32.is_gt(file, 1), U32.is_gt(rank, 0)),
        M.sq(U32.sub(file, 2), U32.sub(rank, 1)), 64)

def knight_source(+target: U32, d0: U32) -> U32:
  knight_case(d0, M.file_of(target), M.rank_of(target))

def scan_knight.go(fuel: Nat, +p: M.Position, +target: U32,
  +by_side: Bool, +dir: U32, any: Bool) -> Bool:
  match fuel:
    case 0n:
      any
    case 1n+rest:
      scan_knight.go(rest, p, target, by_side, U32.add(dir, 1),
        Bool.or(any, square_piece_ok(p, knight_source(target, dir), by_side, 2)))

def scan_knight(+p: M.Position, +target: U32, +by_side: Bool) -> Bool:
  scan_knight.go(8n, p, target, by_side, 0, False{})

def scan_king.go(fuel: Nat, +p: M.Position, +target: U32,
  +by_side: Bool, +dir: U32, any: Bool) -> Bool:
  match fuel:
    case 0n:
      any
    case 1n+rest:
      scan_king.go(rest, p, target, by_side, U32.add(dir, 1),
        Bool.or(any, square_piece_ok(p, neighbor(target, dir), by_side, 6)))

def scan_king(+p: M.Position, +target: U32, +by_side: Bool) -> Bool:
  scan_king.go(8n, p, target, by_side, 0, False{})

def ray.go(fuel: Nat, +p: M.Position, +target: U32, +by_side: Bool,
  +dir: U32, +diagonal: Bool, +next: U32) -> Bool:
  match fuel:
    case 0n:
      False{}
    case 1n+rest:
      match next:
        case 64:
          False{}
        case _:
          +present = M.present(M.pos_holes(p), next)
          +code = board_get(M.pos_board(p), next)
          +empty = U32.is_zero(code)
          +kind = M.piece_type(code)
          +diag_piece = Bool.or(U32.is_eq(kind, 3), U32.is_eq(kind, 5))
          +orth_piece = Bool.or(U32.is_eq(kind, 4), U32.is_eq(kind, 5))
          Bool.and(present,
            Bool.pick(Bool, empty,
              ray.go(rest, p, next, by_side, dir, diagonal,
                neighbor(next, dir)),
              Bool.and(M.same_side(code, by_side),
                Bool.pick(Bool, diagonal, diag_piece, orth_piece))))

def ray(+p: M.Position, +target: U32, +by_side: Bool, +dir: U32,
  +diagonal: Bool) -> Bool:
  ray.go(8n, p, target, by_side, dir, diagonal, neighbor(target, dir))

def rays.go(fuel: Nat, +p: M.Position, +target: U32, +by_side: Bool,
  +diagonal: Bool, +dir: U32, any: Bool) -> Bool:
  match fuel:
    case 0n:
      any
    case 1n+rest:
      rays.go(rest, p, target, by_side, diagonal, U32.add(dir, 1),
        Bool.or(any, ray(p, target, by_side, dir, diagonal)))

def rays(+p: M.Position, +target: U32, +by_side: Bool, +diagonal: Bool) -> Bool:
  Bool.pick(Bool, diagonal,
    rays.go(4n, p, target, by_side, True{}, 0, False{}),
    rays.go(4n, p, target, by_side, False{}, 4, False{}))

def attacked(+p: M.Position, +target: U32, +by_side: Bool) -> Bool:
  Bool.and(M.present(M.pos_holes(p), target),
    Bool.or(attacked_pawn(p, target, by_side),
      Bool.or(scan_knight(p, target, by_side),
        Bool.or(scan_king(p, target, by_side),
          Bool.or(rays(p, target, by_side, True{}),
            rays(p, target, by_side, False{}))))))

def find_king.scan(xs: List<&2, U32>, +index: U32, +side: Bool) -> Maybe<&2, U32>:
  match xs:
    case Nil{}:
      None{}
    case +h <> t:
      Bool.pick(Maybe<&2, U32>,
        Bool.and(M.same_side(h, side), U32.is_eq(M.piece_type(h), 6)),
        Some{index}, find_king.scan(t, U32.add(index, 1), side))

def find_king(p: M.Position, side: Bool) -> Maybe<&2, U32>:
  find_king.scan(M.pos_board(p), 0, side)

def in_check.got(+p: M.Position, +side: Bool, found: Maybe<&2, U32>) -> Bool:
  match found:
    case None{}:
      True{}
    case Some{value}:
      attacked(p, value, opposite(side))

def in_check(+p: M.Position, +side: Bool) -> Bool:
  in_check.got(p, side, find_king(p, side))

def valid_position(+p: M.Position) -> Bool:
  +board_ok = Bool.and(Nat.is_eq(M.board_len(M.pos_board(p)), 64n),
    valid_board(M.pos_board(p), M.pos_holes(p)))
  +kings_ok = Bool.and(Nat.is_eq(count_code(M.pos_board(p), 6), 1n),
    Nat.is_eq(count_code(M.pos_board(p), 14), 1n))
  +rights_ok = Bool.and(U32.is_le(M.pos_rights(p), 15),
    Bool.and(castling_piece_ok(p, 1, 4, 7, 6, 4),
      Bool.and(castling_piece_ok(p, 2, 4, 0, 6, 4),
        Bool.and(castling_piece_ok(p, 4, 60, 63, 14, 12),
          castling_piece_ok(p, 8, 60, 56, 14, 12)))))
  Bool.and(M.exact_two_holes(M.pos_holes(p)),
    Bool.and(board_ok,
      Bool.and(kings_ok,
        Bool.and(rights_ok,
          Bool.and(full_valid(M.pos_full(p)),
            Bool.and(ep_valid(p), Bool.not(in_check(p, opposite(M.pos_side(p))))))))))

def valid(p: M.Position) -> Bool:
  valid_position(p)
