import Base
import ../../graphics/v2game/PieceSprites.bend as Sprites

def decoded_page(result: Maybe<&2, Sprites.Page>) -> IO(Unit):
  match result:
    case Some{page}: IO.print("PASS: Bend decoded one piece-sprite RGA2 page")
    case None{}: IO.die(Unit, 1, "PieceSprites rejected the expected RGA2 page")

def read_result(+expected_depth: U32,
  read: File & Result<&1, &1, U32 & String, List<&2, U32>>) -> IO(Unit):
  match read:
    case (file, Done{value}):
      IO.bind(Unit, Unit, File.close(file),
        _ => decoded_page(Sprites.decode_page(value, expected_depth)))
    case (file, Fail{(code, message)}):
      IO.bind(Unit, Unit, File.close(file),
        _ => IO.die(Unit, code, message))

def opened(+expected_depth: U32,
  result: Result<&1, &1, U32 & String, File>) -> IO(Unit):
  match result:
    case Done{value}:
      IO.bind(File & Result<&1, &1, U32 & String, List<&2, U32>>, Unit,
        File.read_bytes(value, 1048581), read_result(expected_depth))
    case Fail{(code, message)}:
      IO.die(Unit, code, message)

def read_path(path: String, +expected_depth: U32) -> IO(Unit):
  IO.bind(Result<&1, &1, U32 & String, File>, Unit,
    File.open(path, "r"), opened(expected_depth))

def with_args(args: List<&1, String>) -> IO(Unit):
  match args:
    case Con{path, tail}: read_path(path, 8)
    case Nil{}: IO.die(Unit, 1, "Pass one RGA2 page path after --")

def main() -> IO(Unit):
  IO.bind(List<&1, String>, Unit, IO.args(), with_args)
