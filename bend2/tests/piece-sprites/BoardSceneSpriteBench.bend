import Base
import ../../core/Model.bend as Model
import ../../graphics/Camera.bend as Camera
import ../../graphics/Scene.bend as Scene
import ../../graphics/v2game/BoardScene.bend as BoardScene
import ../../graphics/v2game/PieceSprites.bend as PieceSprites
import ../../lib/graphics/v2/Color.bend as Color

type RawPages is Data:
  RawPages{first: List<&2, U32>, second: List<&2, U32>, third: List<&2, U32>}

def piece_read_pages(path0: String, path1: String,
  path2: String) -> IO(RawPages):
  import "./piece_read_pages.js"

def piece_clock(force: Nat) -> IO(U32):
  import "./piece_read_pages.js"

def pages(first: Maybe<&2, PieceSprites.Page>,
  second: Maybe<&2, PieceSprites.Page>,
  third: Maybe<&2, PieceSprites.Page>) -> Maybe<&2, PieceSprites.Pieces>:
  match first second third:
    case Some{page0} Some{page1} Some{page2}:
      Some{PieceSprites.prepare(page0, page1, page2)}
    case _ _ _: None{}

def decode(raw: RawPages) -> Maybe<&2, PieceSprites.Pieces>:
  match raw:
    case RawPages{first, second, third}:
      pages(PieceSprites.decode_page(first, 8),
        PieceSprites.decode_page(second, 8),
        PieceSprites.decode_page(third, 8))

def image_nodes(depth: Nat, image: Image) -> Nat:
  match depth image:
    case 0n Pix{color}: 1n
    case 0n Qua{tl, tr, bl, br}: 1n
    case 1n++rest Pix{color}: 1n
    case 1n++rest Qua{tl, tr, bl, br}:
      +a = image_nodes(rest, tl)
      +b = image_nodes(rest, tr)
      +c = image_nodes(rest, bl)
      +d = image_nodes(rest, br)
      Nat.add(1n, Nat.add(a, Nat.add(b, Nat.add(c, d))))

def start_frame() -> Scene.Frame:
  +position: Model.Position = Model.start(False{})
  Scene.Frame{position, position, 64, 64, Nil{}, 64, Nil{},
    21760, 0, 0, Camera.default_view(), Nil{}, 64}

def render_once(+frame: Scene.Frame, +pieces: PieceSprites.Pieces) -> Image:
  BoardScene.fast_sprite_pieces512(frame, pieces,
    Pix{Color.rgb(31, 47, 50)})

def timed_trials(remaining: Nat, +frame: Scene.Frame,
  +pieces: PieceSprites.Pieces) -> IO(Unit):
  match remaining:
    case 0n: IO.print("SPRITE_SCENE_TRIALS_DONE")
    case 1n+rest:
      IO.bind(U32, Unit, piece_clock(0n),
        start =>
          +result = render_once(frame, pieces)
          +nodes = image_nodes(9n, result)
          IO.bind(U32, Unit, piece_clock(nodes),
            end =>
              IO.bind(Unit, Unit, IO.print("SPRITE_SCENE_US"),
                _ => IO.bind(Unit, Unit,
                  IO.print(Nat.show(U32.to_nat(U32.sub(end, start)))),
                  _ => IO.bind(Unit, Unit,
                    IO.print("SPRITE_SCENE_OUTPUT_TREE_NODES"),
                    _ => IO.bind(Unit, Unit,
                      IO.print(Nat.show(nodes)),
                      _ => timed_trials(rest, frame, pieces)))))))

def run(decoded: Maybe<&2, PieceSprites.Pieces>) -> IO(Unit):
  match decoded:
    case None{}:
      IO.die(Unit, 1, "Could not decode the three standard RGA2 pages")
    case Some{+pieces}:
      timed_trials(10n, start_frame(), pieces)

def config(path0: String, path1: String, path2: String) -> IO(Unit):
  IO.bind(RawPages, Unit, piece_read_pages(path0, path1, path2),
    raw => run(decode(raw)))

def with_args(args: List<&1, String>) -> IO(Unit):
  match args:
    case Con{path0, Con{path1, Con{path2, rest}}}:
      config(path0, path1, path2)
    case _:
      IO.die(Unit, 1, "Pass the three standard pieces-std-N.rga paths after --")

def main() -> IO(Unit):
  IO.bind(List<&1, String>, Unit, IO.args(), with_args)
