import Base

type ProgramArgs is Type:
  WithProgram{args: List<String>}
  MissingProgram{}
  EmptyProgram{}

def program_result(empty: Bool, user_args: List<String>) -> ProgramArgs:
  match empty:
    case True{}:
      EmptyProgram{}
    case False{}:
      WithProgram{user_args}

def strip_program(args: List<String>) -> ProgramArgs:
  match args:
    case []:
      MissingProgram{}
    case program <> user_args:
      program_result(String.is_empty(program), user_args)
