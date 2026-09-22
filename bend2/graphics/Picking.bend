import Base
import ../core/Model.bend as Model
import ./Camera.bend as Camera
import ./Sprites.bend as Sprites

def center_x(+square: U32, basis: Camera.Basis) -> U32:
  Camera.center_x(square, basis)

def center_y(+square: U32, basis: Camera.Basis) -> U32:
  Camera.center_y(square, basis)

def square_at(+x: U32, +y: U32, basis: Camera.Basis) -> U32:
  Camera.square_at(x, y, basis)

def pick.go(order: List<&2, U32>, +board: List<&2, U32>, +x: U32, +y: U32,
  +basis: Camera.Basis, +best: U32) -> U32:
  match order:
    case Nil{}:
      best
    case +square <> rest:
      +code = Model.board_get(board, square)
      +center = Camera.center_x(square, basis)
      +floor = Camera.center_y(square, basis)
      +hit = Sprites.alpha(code,
        U32.sub(x, U32.sub(center, 12)),
        U32.sub(y, U32.sub(floor, 32)))
      +next = Bool.pick(U32, hit, square, best)
      pick.go(rest, board, x, y, basis, next)

def pick(position: Model.Position, +x: U32, +y: U32, +basis: Camera.Basis) -> U32:
  +floor = Camera.square_at(x, y, basis)
  pick.go(Camera.depth_order(basis), Model.pos_board(position), x, y, basis, floor)
