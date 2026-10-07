import Base
import ../../../../bend2/core/Model.bend as P
import ../../../../bend2/core/MatchSpec.bend as T
import ../../../../bend2/core/v2/Facade.bend as F
import ../../../../bend2/core/v3/prepared-match/Match.bend as E
import ../../../../bend2/core/v3/prepared-match/CHECK.bend as Checked

def command(m: T.Match, c: T.Command) -> E.Evaluation:
  E.command(m, c)

def erase(value: E.Evaluation) -> T.StepResult:
  E.erase(value)

def carried(value: E.Evaluation) -> Maybe<&2, List<&2, U32>>:
  E.carried(value)

def frozen(m: T.Match, c: T.Command) -> T.StepResult:
  F.command(m, c)

def start(layout: Bool, policy: T.DrawPolicy) -> T.Match:
  F.start(layout, policy)

def from_position(p: P.Position, policy: T.DrawPolicy) -> Maybe<T.Match>:
  F.from_position(p, policy)

def legal(p: P.Position) -> List<&2, U32>:
  F.legal_ids(p)
