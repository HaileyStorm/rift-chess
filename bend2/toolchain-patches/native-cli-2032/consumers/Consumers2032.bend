import Base
import ../Args2032.bend as Args

def program_users(program: Args.ProgramArgs) -> IO(List<String>):
  match program:
    case Args.WithProgram{args}: IO.pure(List<String>, args)
    case Args.MissingProgram{}:
      IO.die(List<String>, 1, "Missing program name in IO.args")
    case Args.EmptyProgram{}:
      IO.die(List<String>, 1, "Empty program name in IO.args")

def users(raw: List<String>) -> IO(List<String>):
  program_users(Args.strip_program(raw))
