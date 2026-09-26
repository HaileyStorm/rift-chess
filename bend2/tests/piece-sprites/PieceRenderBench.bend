# Isolated component benchmark; the host bridge only loads exact local assets.
import Base
import ../../graphics/v2game/PieceSprites.bend as Sprites
import ../../lib/graphics/v2/RgbaSample.bend as Sample
import ../../lib/graphics/v2/Color.bend as Color
import ../../lib/graphics/v2/Rect.bend as Rect
import ../../lib/graphics/v2/Transform2D.bend as Transform
import ../../lib/graphics/v2/RgbaAffine.bend as Affine
import ../../lib/graphics/v2/ClippedStamp.bend as ClippedStamp
import ../../lib/graphics/v2/ImageView.bend as ImageView
import ../../lib/graphics/v2/Shapes.bend as Shapes

type RawPages is Data:
  RawPages{first: List<&2, U32>, second: List<&2, U32>, third: List<&2, U32>}

def piece_read_pages(path0: String, path1: String, path2: String) -> IO(RawPages):
  import "./piece_read_pages.js"

def piece_clock(force: Nat) -> IO(U32):
  import "./piece_read_pages.js"

def decoded_pages(first: Maybe<&2, Sprites.Page>, second: Maybe<&2, Sprites.Page>,
  third: Maybe<&2, Sprites.Page>) -> Maybe<&2, Sprites.Pieces>:
  match first second third:
    case Some{page0} Some{page1} Some{page2}:
      Some{Sprites.prepare(page0, page1, page2)}
    case _ _ _: None{}

def decode_pages(+depth: U32, raw: RawPages) -> Maybe<&2, Sprites.Pieces>:
  match raw:
    case RawPages{first, second, third}:
      decoded_pages(Sprites.decode_page(first, depth),
        Sprites.decode_page(second, depth), Sprites.decode_page(third, depth))

def image_nodes(depth: Nat, image: Image) -> Nat:
  match depth image:
    case 0n Pix{color}: 1n
    case 0n Qua{tl, tr, bl, br}: 1n
    case 1n++rest Pix{color}: 1n
    case 1n++rest Qua{tl, tr, bl, br}:
      Nat.add(1n, Nat.add(image_nodes(rest, tl),
        Nat.add(image_nodes(rest, tr),
          Nat.add(image_nodes(rest, bl), image_nodes(rest, br)))))

def texture_nodes(texture: Sample.Texture) -> Nat:
  match texture:
    case Sample.Texture{+depth, size, colors, mask}:
      Nat.add(image_nodes(depth, colors), image_nodes(depth, mask))

def piece_set_nodes(pieces: Sprites.Pieces) -> Nat:
  match pieces:
    case Sprites.Pieces{ivory_pawn, ivory_knight, ivory_bishop, ivory_rook,
      ivory_queen, ivory_king, navy_pawn, navy_knight, navy_bishop,
      navy_rook, navy_queen, navy_king}:
      Nat.add(texture_nodes(ivory_pawn), Nat.add(texture_nodes(ivory_knight),
        Nat.add(texture_nodes(ivory_bishop), Nat.add(texture_nodes(ivory_rook),
          Nat.add(texture_nodes(ivory_queen), Nat.add(texture_nodes(ivory_king),
            Nat.add(texture_nodes(navy_pawn), Nat.add(texture_nodes(navy_knight),
              Nat.add(texture_nodes(navy_bishop), Nat.add(texture_nodes(navy_rook),
                Nat.add(texture_nodes(navy_queen), texture_nodes(navy_king))))))))))))

def decoded_nodes(decoded: Maybe<&2, Sprites.Pieces>) -> Nat:
  match decoded:
    case Some{pieces}: piece_set_nodes(pieces)
    case None{}: 0n

def back_kind(index: U32) -> Sprites.PieceKind:
  match index:
    case 0: Sprites.Rook{}
    case 1: Sprites.Knight{}
    case 2: Sprites.Bishop{}
    case 3: Sprites.Queen{}
    case 4: Sprites.King{}
    case 5: Sprites.Bishop{}
    case 6: Sprites.Knight{}
    case _: Sprites.Rook{}

def kind_at(+index: U32) -> Sprites.PieceKind:
  Bool.pick(Sprites.PieceKind,
    Bool.or(U32.is_lt(index, 8), U32.is_ge(index, 24)),
    back_kind(U32.mod(index, 8)), Sprites.Pawn{})

def side_at(index: U32) -> Sprites.Side:
  Bool.pick(Sprites.Side, U32.is_lt(index, 16),
    Sprites.Ivory{}, Sprites.Navy{})

def row_choice(front: Bool, +index: U32) -> U32:
  match front:
    case True{}: U32.div(index, 8)
    case False{}: U32.add(6, U32.div(U32.sub(index, 16), 8))

def row_at(+index: U32) -> U32:
  row_choice(U32.is_lt(index, 16), index)

def draw_affine_at(+target_depth: Nat, +target_size: U32,
  +pieces: Sprites.Pieces, side: Sprites.Side, kind: Sprites.PieceKind,
  +column: U32, +board_row: U32, filter: Sample.Filter,
  target: Image) -> Image:
  +square = U32.div(target_size, 8)
  +left = U32.mul(column, square)
  +top = U32.mul(board_row, square)
  +matrix: Transform.Matrix = Transform.Matrix{U32.to_f32(square), 0.0,
    0.0, U32.to_f32(square), U32.to_f32(left), U32.to_f32(top)}
  +texture = Sprites.texture(pieces, side, kind)
  Affine.draw(target_depth, target_size, Affine.prepare(matrix), texture,
    filter, 255, Rect.screen(target_size), target)

def draw_piece(+target_depth: Nat, +target_size: U32, +pieces: Sprites.Pieces,
  +index: U32, target: Image) -> Image:
  draw_affine_at(target_depth, target_size, pieces, side_at(index),
    kind_at(index), U32.mod(index, 8), row_at(index), Sample.Linear{}, target)

def draw_remaining(+remaining: Nat, +index: U32, +target_depth: Nat,
  +target_size: U32, +pieces: Sprites.Pieces, target: Image) -> Image:
  match remaining:
    case 0n: target
    case 1n++rest:
      +next = U32.add(index, 1)
      +placed = draw_piece(target_depth, target_size, pieces, index, target)
      draw_remaining(rest, next, target_depth, target_size, pieces, placed)

def draw_31(+target_depth: Nat, +target_size: U32,
  +pieces: Sprites.Pieces) -> Image:
  +other_back_rank = draw_remaining(8n, 0, target_depth, target_size,
    pieces, Pix{Color.rgb(31, 47, 50)})
  draw_remaining(23n, 9, target_depth, target_size, pieces, other_back_rank)

def stamp_texture(+target_depth: Nat, +target_size: U32,
  +texture: Sample.Texture, +column: U32, +board_row: U32,
  target: Image) -> Image:
  match texture:
    case Sample.Texture{depth, size, colors, mask}:
      +square = U32.div(target_size, 8)
      +left = U32.mul(column, square)
      +top = U32.mul(board_row, square)
      +right = U32.add(left, size)
      +bottom = U32.add(top, size)
      +clip: Rect.Box = Rect.Box{left, top, right, bottom}
      +sx = Shapes.biased(Shapes.Pos{left})
      +sy = Shapes.biased(Shapes.Pos{top})
      +color_view: ImageView.View = ImageView.View{depth, size, sx, sy, colors}
      +mask_view: ImageView.View = ImageView.View{depth, size, sx, sy, mask}
      ClippedStamp.start_zero(U32.is_zero(255), target_depth, target_size,
        clip, color_view, mask_view, 255, target)

def stamp_at(+target_depth: Nat, +target_size: U32,
  +pieces: Sprites.Pieces, side: Sprites.Side, kind: Sprites.PieceKind,
  +column: U32, +board_row: U32, target: Image) -> Image:
  stamp_texture(target_depth, target_size,
    Sprites.texture(pieces, side, kind), column, board_row, target)

def draw_moving_linear(+target_depth: Nat, +target_size: U32,
  +pieces: Sprites.Pieces, +move_index: U32, target: Image) -> Image:
  +column = U32.mod(move_index, 8)
  +board_row = U32.add(2, U32.div(move_index, 8))
  draw_affine_at(target_depth, target_size, pieces, Sprites.Ivory{},
    Sprites.Pawn{}, column, board_row, Sample.Linear{}, target)

def draw_moving_nearest(+target_depth: Nat, +target_size: U32,
  +pieces: Sprites.Pieces, +move_index: U32, target: Image) -> Image:
  +column = U32.mod(move_index, 8)
  +board_row = U32.add(2, U32.div(move_index, 8))
  draw_affine_at(target_depth, target_size, pieces, Sprites.Ivory{},
    Sprites.Pawn{}, column, board_row, Sample.Nearest{}, target)

def draw_moving_stamp(+target_depth: Nat, +target_size: U32,
  +pieces: Sprites.Pieces, +move_index: U32, target: Image) -> Image:
  +column = U32.mod(move_index, 8)
  +board_row = U32.add(2, U32.div(move_index, 8))
  stamp_at(target_depth, target_size, pieces, Sprites.Ivory{},
    Sprites.Pawn{}, column, board_row, target)

def draw_moving(+mode: U32, +target_depth: Nat, +target_size: U32,
  +pieces: Sprites.Pieces, +move_index: U32, target: Image) -> Image:
  match mode:
    case 0:
      draw_moving_linear(target_depth, target_size, pieces, move_index, target)
    case 1:
      draw_moving_nearest(target_depth, target_size, pieces, move_index, target)
    case _:
      draw_moving_stamp(target_depth, target_size, pieces, move_index, target)

def moving_trials(+mode: U32, +remaining: Nat, +move_index: U32,
  +target_depth: Nat, +target_size: U32, +pieces: Sprites.Pieces,
  +base: Image) -> IO(Unit):
  match remaining:
    case 0n: IO.print("MOVE_TRIALS_DONE")
    case 1n++rest:
      IO.bind(U32, Unit, piece_clock(0n),
        start =>
          +frame: Image = draw_moving(mode, target_depth, target_size,
            pieces, move_index, base)
          +nodes: Nat = image_nodes(target_depth, frame)
          IO.bind(U32, Unit, piece_clock(nodes),
            end =>
              +elapsed = U32.sub(end, start)
              IO.bind(Unit, Unit, IO.print("MOVE_US"),
                _ => IO.bind(Unit, Unit,
                  IO.print(Nat.show(U32.to_nat(elapsed))),
                  _ => IO.bind(Unit, Unit, IO.print("MOVE_OUTPUT_TREE_NODES"),
                    _ => IO.bind(Unit, Unit, IO.print(Nat.show(nodes)),
                      _ => moving_trials(mode, rest,
                        U32.add(move_index, 1), target_depth,
                        target_size, pieces, base)))))))

def move_mode(label: String, mode: U32, +target_depth: Nat,
  +target_size: U32, +pieces: Sprites.Pieces, +base: Image) -> IO(Unit):
  IO.bind(Unit, Unit, IO.print(label),
    _ => moving_trials(mode, 10n, 0, target_depth, target_size, pieces, base))

def optional_stamp(enabled: Bool, +target_depth: Nat, +target_size: U32,
  +pieces: Sprites.Pieces, +base: Image) -> IO(Unit):
  match enabled:
    case False{}:
      IO.print("CLIPPED_STAMP_SKIPPED: sprite tile exceeds a 512 board square")
    case True{}:
      move_mode("CLIPPED_NEAREST_STAMP", 2, target_depth,
        target_size, pieces, base)

def moving_modes(stamp_enabled: Bool, +target_depth: Nat, +target_size: U32,
  +pieces: Sprites.Pieces, +base: Image) -> IO(Unit):
  IO.bind(Unit, Unit,
    move_mode("AFFINE_LINEAR", 0, target_depth, target_size, pieces, base),
    _ => IO.bind(Unit, Unit,
      move_mode("AFFINE_NEAREST", 1, target_depth, target_size, pieces, base),
      _ => optional_stamp(stamp_enabled, target_depth, target_size, pieces, base)))

def report_base(start: U32, end: U32, nodes: Nat,
  +pieces: Sprites.Pieces, +target_depth: Nat, +target_size: U32,
  +base: Image) -> IO(Unit):
  +elapsed = U32.sub(end, start)
  IO.bind(Unit, Unit, IO.print("RETAINED_31_BASE_PREPARE_AND_WALK_US"),
    _ => IO.bind(Unit, Unit, IO.print(Nat.show(U32.to_nat(elapsed))),
      _ => IO.bind(Unit, Unit, IO.print("RETAINED_BASE_TREE_NODES"),
        _ => IO.bind(Unit, Unit, IO.print(Nat.show(nodes)),
          _ => moving_modes(U32.is_ge(target_size, 1024), target_depth,
            target_size, pieces, base)))))

def after_base(start: U32, +pieces: Sprites.Pieces,
  +target_depth: Nat, +target_size: U32) -> IO(Unit):
  +base: Image = draw_31(target_depth, target_size, pieces)
  +nodes: Nat = image_nodes(target_depth, base)
  IO.bind(U32, Unit, piece_clock(nodes),
    end => report_base(start, end, nodes, pieces, target_depth, target_size, base))

def after_warmup(+pieces: Sprites.Pieces, +target_depth: Nat,
  +target_size: U32) -> IO(Unit):
  IO.bind(U32, Unit, piece_clock(0n),
    start => after_base(start, pieces, target_depth, target_size))

def report_decode(start: U32, end: U32, nodes: Nat,
  decoded: Maybe<&2, Sprites.Pieces>, +target_depth: Nat,
  +target_size: U32) -> IO(Unit):
  match decoded:
    case None{}: IO.die(Unit, 1, "PieceSprites could not decode the three pages")
    case Some{+pieces}:
      +elapsed = U32.sub(end, start)
      IO.bind(Unit, Unit, IO.print("DECODE_PREPARE_TREE_US"),
        _ => IO.bind(Unit, Unit, IO.print(Nat.show(U32.to_nat(elapsed))),
          _ => IO.bind(Unit, Unit, IO.print("DECODED_TEXTURE_TREE_NODES"),
            _ => IO.bind(Unit, Unit, IO.print(Nat.show(nodes)),
              _ => IO.bind(U32, Unit, piece_clock(0n),
                _ => after_warmup(pieces, target_depth, target_size))))))

def decode_timed(start: U32, +raw: RawPages, +page_depth: U32,
  +target_depth: Nat, +target_size: U32) -> IO(Unit):
  +decoded: Maybe<&2, Sprites.Pieces> = decode_pages(page_depth, raw)
  +nodes: Nat = decoded_nodes(decoded)
  IO.bind(U32, Unit, piece_clock(nodes),
    end => report_decode(start, end, nodes, decoded, target_depth, target_size))

def benchmark(+raw: RawPages, +page_depth: U32,
  +target_depth: Nat, +target_size: U32) -> IO(Unit):
  IO.bind(U32, Unit, piece_clock(0n),
    start => decode_timed(start, raw, page_depth, target_depth, target_size))

def config_values(path0: String, path1: String, path2: String,
  page_depth: Maybe<&2, Nat>, target_depth: Maybe<&2, Nat>,
  target_size: Maybe<&2, Nat>) -> IO(Unit):
  match page_depth target_depth target_size:
    case Some{page_depth} Some{target_depth} Some{target_size}:
      IO.bind(RawPages, Unit, piece_read_pages(path0, path1, path2),
        raw => benchmark(raw, U32.from_nat(page_depth), target_depth,
          U32.from_nat(target_size)))
    case _ _ _: IO.die(Unit, 1, "Expected page depth, target depth and canvas size")

def config(path0: String, path1: String, path2: String,
  page_depth: String, target_depth: String, target_size: String) -> IO(Unit):
  +page_depth_nat = Nat.read(page_depth)
  +target_depth_nat = Nat.read(target_depth)
  +target_size_nat = Nat.read(target_size)
  config_values(path0, path1, path2, page_depth_nat, target_depth_nat,
    target_size_nat)

def with_args(args: List<&1, String>) -> IO(Unit):
  match args:
    case Con{path0, Con{path1, Con{path2,
      Con{page_depth, Con{target_depth, Con{target_size, rest}}}}}}:
      config(path0, path1, path2, page_depth, target_depth, target_size)
    case _: IO.die(Unit, 1,
      "Pass three page paths, sprite depth, canvas depth and canvas size after --")

def main() -> IO(Unit):
  IO.bind(List<&1, String>, Unit, IO.args(), with_args)
