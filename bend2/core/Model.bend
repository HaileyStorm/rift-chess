import Base

# The rules model uses unsigned codes so it can cross the Bend/JS boundary
# without a signed-number convention. White pieces are 1..7, black pieces are
# 9..15, and zero is empty. Code seven is a pawn that still has its first
# two-square move; code one is a pawn after that right was consumed.
type Position is Data:
  Pos{board: List<&2, U32>, holes: U32, side: Bool, rights: U32,
    ep: U32, epPawn: U32, quiet: Nat, full: Nat}

# Promotion is encoded in action IDs as 0 (none), 1 (queen), 2 (rook),
# 3 (bishop), or 4 (knight). The same value is carried by an Action.
type Action is Data:
  MoveAction{from: U32, to: U32, promotion: U32}
  ShiftAction{from: U32, to: U32, promotion: U32}

def none_ep() -> U32:
  64

def sq(file: U32, rank: U32) -> U32:
  (U32.add(U32.mul(rank, 8), file))

def file_of(square: U32) -> U32:
  U32.mod(square, 8)

def rank_of(square: U32) -> U32:
  U32.div(square, 8)

def macro_of(+square: U32) -> U32:
  U32.add(U32.mul(U32.div(rank_of(square), 2), 4), U32.div(file_of(square), 2))

def macro_file(macro: U32) -> U32:
  U32.mod(macro, 4)

def macro_rank(macro: U32) -> U32:
  U32.div(macro, 4)

def macro_mask(macro: U32) -> U32:
  U32.shln(1, U32.to_nat(macro))

def present.in_range(+holes: U32, +square: U32, in_range: Bool) -> Bool:
  match in_range:
    case False{}:
      False{}
    case True{}:
      U32.is_zero(U32.and(holes, macro_mask(macro_of(square))))

def present(+holes: U32, +square: U32) -> Bool:
  present.in_range(holes, square, U32.is_lt(square, 64))

def square_in_macro(+macro: U32, +offset: U32) -> U32:
  +file = U32.add(U32.mul(macro_file(macro), 2), U32.mod(offset, 2))
  +rank = U32.add(U32.mul(macro_rank(macro), 2), U32.div(offset, 2))
  sq(file, rank)

def piece_type(+code: U32) -> U32:
  Bool.pick(U32, U32.is_zero(code), 0,
    Bool.pick(U32, U32.is_lt(code, 8), code, U32.sub(code, 8)))

def is_pawn(+code: U32) -> Bool:
  Bool.or(U32.is_eq(piece_type(code), 1), U32.is_eq(piece_type(code), 7))

def is_white(+code: U32) -> Bool:
  Bool.and(U32.is_ge(code, 1), U32.is_lt(code, 8))

def is_black(code: U32) -> Bool:
  U32.is_ge(code, 9)

def occupied(code: U32) -> Bool:
  U32.is_ne(code, 0)

def same_side(code: U32, side: Bool) -> Bool:
  match side:
    case True{}:
      is_white(code)
    case False{}:
      is_black(code)

def opponent_side(side: Bool) -> Bool:
  Bool.not(side)

def encode_piece(side: Bool, +kind: U32) -> U32:
  Bool.pick(U32, side, kind, U32.add(kind, 8))

def board_get.go(board: List<&2, U32>, +index: U32, zero: Bool) -> U32:
  match board:
    case Nil{}:
      0
    case h <> t:
      match zero:
        case True{}:
          h
        case False{}:
          +next = U32.sub(index, 1)
          board_get.go(t, next, U32.is_zero(next))

def board_get(board: List<&2, U32>, +index: U32) -> U32:
  board_get.go(board, index, U32.is_zero(index))

def board_set.go(board: List<&2, U32>, +index: U32, value: U32,
  zero: Bool) -> List<&2, U32>:
  match board:
    case Nil{}:
      Nil{}
    case h <> t:
      match zero:
        case True{}:
          value <> t
        case False{}:
          +next = U32.sub(index, 1)
          h <> board_set.go(t, next, value, U32.is_zero(next))

def board_set(board: List<&2, U32>, +index: U32, value: U32) -> List<&2, U32>:
  board_set.go(board, index, value, U32.is_zero(index))

def board_len(board: List<&2, U32>) -> Nat:
  List.length(&2, U32, board)

def action_id(action: Action) -> U32:
  match action:
    case MoveAction{from, to, promotion}:
      U32.add(U32.mul(5, U32.add(U32.mul(64, from), to)), promotion)
    case ShiftAction{from, to, promotion}:
      U32.add(20480, U32.add(U32.mul(5, U32.add(U32.mul(16, from), to)), promotion))

def action_promotion(action: Action) -> U32:
  match action:
    case MoveAction{from, to, promotion}:
      promotion
    case ShiftAction{from, to, promotion}:
      promotion

def action_from(action: Action) -> U32:
  match action:
    case MoveAction{from, to, promotion}:
      from
    case ShiftAction{from, to, promotion}:
      from

def action_to(action: Action) -> U32:
  match action:
    case MoveAction{from, to, promotion}:
      to
    case ShiftAction{from, to, promotion}:
      to

def is_move(action: Action) -> Bool:
  match action:
    case MoveAction{from, to, promotion}:
      True{}
    case ShiftAction{from, to, promotion}:
      False{}

def decode_promotion(id: U32) -> U32:
  U32.mod(id, 5)

def decode_move(+id: U32) -> Action:
  +q = U32.div(id, 5)
  MoveAction{U32.div(q, 64), U32.mod(q, 64), decode_promotion(id)}

def decode_shift(+id: U32) -> Action:
  +q = U32.div(U32.sub(id, 20480), 5)
  ShiftAction{U32.div(q, 16), U32.mod(q, 16), decode_promotion(id)}

def decode.in_range(+id: U32, in_range: Bool) -> Maybe<Action>:
  match in_range:
    case False{}:
      None{}
    case True{}:
      Some{Bool.pick(Action, U32.is_lt(id, 20480), decode_move(id), decode_shift(id))}

def decode(+id: U32) -> Maybe<Action>:
  decode.in_range(id, U32.is_lt(id, 21760))

def valid_promotion(promotion: U32) -> Bool:
  U32.is_le(promotion, 4)

def bit_count.go(n: Nat, +value: U32, count: Nat) -> Nat:
  match n:
    case 0n:
      count
    case 1n+p:
      bit_count.go(p, U32.shr(value), Nat.add(count, U32.to_nat(U32.and(value, 1))))

def bit_count(value: U32) -> Nat:
  bit_count.go(32n, value, 0n)

def exact_two_holes(+holes: U32) -> Bool:
  Bool.and(U32.is_lt(holes, 65536), Nat.is_eq(bit_count(holes), 2n))

def clear_rook_right(+rights: U32, +square: U32) -> U32:
  Bool.pick(U32, U32.is_eq(square, 0), U32.and(rights, U32.not(2)),
    Bool.pick(U32, U32.is_eq(square, 7), U32.and(rights, U32.not(1)),
      Bool.pick(U32, U32.is_eq(square, 56), U32.and(rights, U32.not(8)),
        Bool.pick(U32, U32.is_eq(square, 63), U32.and(rights, U32.not(4)), rights))))

def start_board() -> List<&2, U32>:
  [4, 2, 3, 5, 6, 3, 2, 4,
    7, 7, 7, 7, 7, 7, 7, 7,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    15, 15, 15, 15, 15, 15, 15, 15,
    12, 10, 11, 13, 14, 11, 10, 12]

def start(layout_b: Bool) -> Position:
  +holes = Bool.pick(U32, layout_b,
    U32.or(macro_mask(5), macro_mask(9)),
    U32.or(macro_mask(6), macro_mask(10)))
  Pos{start_board(), holes, True{}, 15, none_ep(), none_ep(), 0n, 1n}

def pos_board(p: Position) -> List<&2, U32>:
  match p:
    case Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      board

def pos_holes(p: Position) -> U32:
  match p:
    case Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      holes

def pos_side(p: Position) -> Bool:
  match p:
    case Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      side

def pos_rights(p: Position) -> U32:
  match p:
    case Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      rights

def pos_ep(p: Position) -> U32:
  match p:
    case Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      ep

def pos_ep_pawn(p: Position) -> U32:
  match p:
    case Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      epPawn

def pos_quiet(p: Position) -> Nat:
  match p:
    case Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      quiet

def pos_full(p: Position) -> Nat:
  match p:
    case Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      full
