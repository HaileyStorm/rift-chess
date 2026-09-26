import Base
import ../../core/Model.bend as Model
import ../../graphics/Camera.bend as Camera
import ../../graphics/Scene.bend as Scene
import ../../graphics/v2game/BoardScene.bend as BoardScene
import ../../graphics/v2game/PieceSprites.bend as PieceSprites
import ../../lib/graphics/Quad.bend as Quad
import ../../lib/graphics/Ortho.bend as Ortho
import ../../lib/graphics/v2/Color.bend as Color
import ../../lib/graphics/pixels/Pixel.bend as Pixel

def quad4(a: Image, b: Image, c: Image, d: Image) -> Image:
  Qua{a, b, c, d}

def colors(a: U32, b: U32, c: U32, d: U32) -> Image:
  quad4(Pix{Color.rgb(a, 0, 0)}, Pix{Color.rgb(b, 0, 0)},
    Pix{Color.rgb(c, 0, 0)}, Pix{Color.rgb(d, 0, 0)})

def synthetic_pieces() -> PieceSprites.Pieces:
  +mask: Image = Pix{Color.rgb(255, 0, 0)}
  +p0: PieceSprites.Page = PieceSprites.Page{2n, 4,
    colors(11, 12, 13, 14), mask}
  +p1: PieceSprites.Page = PieceSprites.Page{2n, 4,
    colors(21, 22, 23, 24), mask}
  +p2: PieceSprites.Page = PieceSprites.Page{2n, 4,
    colors(31, 32, 33, 34), mask}
  PieceSprites.prepare(p0, p1, p2)

def clear_board(remaining: Nat, +square: U32,
  +board: List<&2, U32>) -> List<&2, U32>:
  match remaining:
    case 0n: board
    case 1n+rest:
      +cleared = Model.board_set(board, square, 0)
      clear_board(rest, U32.add(square, 1), cleared)

def frame_for(+square: U32, +selected: U32, +hovered: U32,
  +holes: U32, +progress: U32, +action: U32) -> Scene.Frame:
  +board = Model.board_set(clear_board(64n, 0, Model.start_board()),
    square, 10)
  +position: Model.Position = Model.Pos{board, holes, True{}, 0,
    64, 64, 0n, 1n}
  Scene.Frame{position, position, selected, hovered, Nil{}, 64, Nil{},
    action, progress, 0, Camera.default_view(), Nil{}, 64}

def board_center(+square: U32, camera: Camera.Basis) -> Quad.Point:
  BoardScene.projected_square(512, camera, square)

def center_x(square: U32, camera: Camera.Basis) -> U32:
  Ortho.pixel(BoardScene.point_x(board_center(square, camera)))

def center_y(square: U32, camera: Camera.Basis) -> U32:
  Ortho.pixel(BoardScene.point_y(board_center(square, camera)))

def sprite_mid_y(+square: U32, +camera: Camera.Basis) -> U32:
  +center = board_center(square, camera)
  Ortho.pixel(F32.sub(BoardScene.point_y(center),
    F32.div(BoardScene.sprite_height(512, camera), 2.0)))

def rendered(frame: Scene.Frame, +background: Image) -> Image:
  BoardScene.fast_sprite_pieces512(frame, synthetic_pieces(), background)

def knight_pixel(+frame: Scene.Frame, +square: U32) -> U32:
  +camera = Camera.basis(Scene.frame_view(frame))
  +image = rendered(frame, Pix{Color.rgb(1, 2, 3)})
  Pixel.sample_xy(9n, center_x(square, camera), sprite_mid_y(square, camera), image)

def black_knight_side_kind_map_is_visible() -> Bool:
  +square: U32 = 18
  +frame = frame_for(square, 64, 64, 0, 0, 21760)
  U32.is_eq(knight_pixel(frame, square), Color.rgb(24, 0, 0))

def hole_suppresses_piece_sprite() -> Bool:
  +square: U32 = 18
  +holes = Model.macro_mask(Model.macro_of(square))
  +frame = frame_for(square, 64, 64, holes, 0, 21760)
  U32.is_eq(knight_pixel(frame, square), Color.rgb(1, 2, 3))

def selected_focus_is_lit() -> Bool:
  +square: U32 = 18
  +frame = frame_for(square, square, 64, 0, 0, 21760)
  +camera = Camera.basis(Scene.frame_view(frame))
  +image = BoardScene.fast_feedback_on_pieces512(frame,
    rendered(frame, Pix{Color.rgb(1, 2, 3)}))
  +sample = Pixel.sample_xy(9n,
    U32.add(center_x(square, camera), 22), center_y(square, camera), image)
  U32.is_ne(sample, Color.rgb(1, 2, 3))

def hovered_focus_is_lit() -> Bool:
  +square: U32 = 18
  +frame = frame_for(square, 64, square, 0, 0, 21760)
  +camera = Camera.basis(Scene.frame_view(frame))
  +image = BoardScene.fast_feedback_on_pieces512(frame,
    rendered(frame, Pix{Color.rgb(1, 2, 3)}))
  +sample = Pixel.sample_xy(9n,
    U32.add(center_x(square, camera), 18),
    U32.sub(center_y(square, camera), 1), image)
  U32.is_ne(sample, Color.rgb(1, 2, 3))

def report(check: Bool, +pass: String, +fail: String) -> IO(Unit):
  match check:
    case True{}: IO.print(pass)
    case False{}: IO.die(Unit, 1, fail)

def main() -> IO(Unit):
  IO.bind(Unit, Unit,
    report(black_knight_side_kind_map_is_visible(),
      "PASS: model side/kind selects the expected front-facing sprite",
      "Model side/kind sprite mapping or projected pixel failed"),
    _ => IO.bind(Unit, Unit,
      report(hole_suppresses_piece_sprite(),
        "PASS: missing rift tile suppresses its sprite",
        "A sprite rendered on a missing rift tile"),
      _ => IO.bind(Unit, Unit,
        report(selected_focus_is_lit(),
          "PASS: selected piece receives an always-on gold plinth halo",
          "Selected piece halo did not change its expected pixel"),
        _ => report(hovered_focus_is_lit(),
          "PASS: hovered piece receives a distinct focus rim",
          "Hovered piece focus rim did not change its expected pixel"))))
