import Base
import ../core/Model.bend as Model
import ./Sprites.bend as Sprites

# Projection is shared by rendering and picking. Top and left edges belong
# to each half-open square; the bottom and right perimeter are outside.
def row(square: U32) -> U32:
  U32.sub(7, Model.rank_of(square))

def depth(+square: U32) -> U32:
  U32.add(Model.file_of(square), row(square))

def center_x(+square: U32) -> U32:
  U32.sub(U32.add(256, U32.mul(24, Model.file_of(square))), U32.mul(24, row(square)))

def center_y(square: U32) -> U32:
  U32.add(148, U32.mul(12, depth(square)))

def square_at.parts(+u: U32, +v: U32) -> U32:
  Bool.pick(U32, Bool.and(U32.is_lt(u, 384), U32.is_lt(v, 384)),
    Model.sq(U32.div(u, 48), U32.sub(7, U32.div(v, 48))), 64)

def square_at(+x: U32, +y: U32) -> U32:
  square_at.parts(U32.sub(U32.add(x, U32.mul(2, y)), 528),
    U32.sub(U32.sub(U32.mul(2, y), x), 16))

def pick.go(n: Nat, +square: U32, +board: List<&2, U32>, +x: U32, +y: U32,
  +best: U32, +best_depth: U32) -> U32:
  match n:
    case 0n:
      best
    case 1n+p:
      +hit = Sprites.alpha(Model.board_get(board, square),
        U32.sub(x, U32.sub(center_x(square), 12)),
        U32.sub(y, U32.sub(center_y(square), 32)))
      +d = U32.add(depth(square), 1)
      +front = Bool.and(hit, U32.is_ge(d, best_depth))
      pick.go(p, U32.add(square, 1), board, x, y,
        Bool.pick(U32, front, square, best), Bool.pick(U32, front, d, best_depth))

def pick(position: Model.Position, +x: U32, +y: U32) -> U32:
  pick.go(64n, 0, Model.pos_board(position), x, y, square_at(x, y), 0)
