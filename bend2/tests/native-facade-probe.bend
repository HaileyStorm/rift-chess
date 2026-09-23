import Base
import ../core/v2/Facade.bend as Rules
import ../core/MatchSpec.bend as MatchTypes

def main() -> IO(Unit):
  do IO<Unit>:
    initial : MatchTypes.Match = Rules.start(False{}, MatchTypes.Prompt{})
    moved : MatchTypes.StepResult = Rules.command(initial,
      MatchTypes.MoveCommand{0n, 3980})
    IO.print("v2 rules facade compiled to native C")
