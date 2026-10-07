# Shared artwork placement and immutable displayed motion metadata.
import Base
import ../../core/Model.bend as Model
import ../Camera.bend as Camera
import ../Scene.bend as Scene
import ../../lib/graphics/Ortho.bend as Ortho
import ../../lib/graphics/Quad.bend as Quad
import ./SpritePlacement.bend as Placement

type Pose is Data:
  Pose{previousBoard: List<&2, U32>, victim: U32, action: U32, progress: U32}

def captured_square(decoded: Maybe<Model.Action>, +previous: Model.Position) -> U32:
  match decoded:
    case None{}: 64
    case Some{action}:
      match action:
        case Model.ShiftAction{from, to, promotion}: 64
        case Model.MoveAction{+from, +to, promotion}:
          +board = Model.pos_board(previous)
          +ep = Bool.and(U32.is_eq(to, Model.pos_ep(previous)),
            Model.is_pawn(Model.board_get(board, from)))
          Bool.pick(U32, Model.occupied(Model.board_get(board, to)), to,
            Bool.pick(U32, ep, Model.pos_ep_pawn(previous), 64))

def from_frame(+frame: Scene.Frame) -> Pose:
  +previous = Scene.frame_previous(frame)
  +action = Scene.frame_lastAction(frame)
  Pose{Model.pos_board(previous), captured_square(Model.decode(action), previous),
    action, U32.min(Scene.frame_progress(frame), 16)}

def stationary(position: Model.Position) -> Pose:
  Pose{Model.pos_board(position), 64, 0, 16}

def pose_previous_board(pose: Pose) -> List<&2, U32>:
  match pose:
    case Pose{previousBoard, _, _, _}: previousBoard

def pose_victim(pose: Pose) -> U32:
  match pose:
    case Pose{_, victim, _, _}: victim

def pose_action(pose: Pose) -> U32:
  match pose:
    case Pose{_, _, action, _}: action

def pose_progress(pose: Pose) -> U32:
  match pose:
    case Pose{_, _, _, progress}: progress

def source.action(action: Model.Action, +square: U32) -> U32:
  match action:
    case Model.MoveAction{from, to, promotion}:
      Bool.pick(U32, U32.is_eq(square, to), from, square)
    case Model.ShiftAction{from, to, promotion}:
      Bool.pick(U32, U32.is_eq(Model.macro_of(square), to),
        Model.square_in_macro(from, U32.add(U32.mod(Model.file_of(square), 2),
          U32.mul(U32.mod(Model.rank_of(square), 2), 2))), square)

def source(decoded: Maybe<Model.Action>, +square: U32) -> U32:
  match decoded:
    case None{}: square
    case Some{action}: source.action(action, square)

def point_x(point: Quad.Point) -> F32:
  match point:
    case Quad.Point{x, y}: x

def point_y(point: Quad.Point) -> F32:
  match point:
    case Quad.Point{x, y}: y

def scaled(size: U32, value: U32) -> U32:
  U32.div(U32.mul(size, value), 512)

def interpolated_point(+size: U32, +basis: Camera.Basis, +from_square: U32,
  +to_square: U32, +amount: U32) -> Quad.Point:
  +from = Placement.center(size, basis, from_square)
  +to = Placement.center(size, basis, to_square)
  +t = F32.div(U32.to_f32(amount), 16.0)
  +lift = Bool.pick(U32, U32.is_ne(from_square, to_square),
    scaled(size, U32.div(U32.mul(amount, U32.sub(16, amount)), 4)), 0)
  Quad.Point{F32.lerp(point_x(from), point_x(to), t),
    F32.sub(F32.lerp(point_y(from), point_y(to), t), U32.to_f32(lift))}

# Completion uses the exact destination center, avoiding lerp rounding drift.
def center_at(complete: Bool, +size: U32, +basis: Camera.Basis,
  from_square: U32, +square: U32, amount: U32) -> Quad.Point:
  match complete:
    case True{}: Placement.center(size, basis, square)
    case False{}: interpolated_point(size, basis, from_square, square, amount)

def center(+pose: Pose, +size: U32, basis: Camera.Basis,
  +square: U32) -> Quad.Point:
  +amount = pose_progress(pose)
  center_at(U32.is_eq(amount, 16), size, basis,
    source(Model.decode(pose_action(pose)), square), square, amount)

def dying_center(+size: U32, +basis: Camera.Basis, square: U32,
  +age: U32) -> Quad.Point:
  +point = Placement.center(size, basis, square)
  +x = Ortho.pixel(point_x(point))
  +y = Ortho.pixel(point_y(point))
  +drift = scaled(size, U32.div(age, 2))
  +lift = scaled(size, age)
  +dead_x = Bool.pick(U32, U32.is_even(age), U32.add(x, drift), U32.sub(x, drift))
  Quad.Point{U32.to_f32(dead_x), U32.to_f32(U32.sub(y, lift))}

def opacity(age: U32) -> U32:
  U32.sub(255, U32.mul(U32.min(age, 7), 32))

def dying_visible(+pose: Pose, +square: U32) -> Bool:
  Bool.and(U32.is_eq(square, pose_victim(pose)),
    Bool.and(U32.is_lt(pose_progress(pose), 8),
      Model.occupied(Model.board_get(pose_previous_board(pose), square))))
