# Application integration facade; existing v1 wire types remain unchanged.
import Base
import ../Model.bend as P
import ../Kernel.bend as Old
import ../MatchSpec.bend as Types
import ./RuleKernel.bend as K
import ./MatchKernel.bend as M

def step_result(result: K.StepResult) -> Old.StepResult:
  match result:
    case K.Accepted{id, q}: Old.Accepted{id, q}
    case K.Rejected{p}: Old.Rejected{p}
def step(p: P.Position, id: U32) -> Old.StepResult:
  step_result(K.step(p, id))
def legal_ids(p: P.Position) -> List<&2, U32>:
  K.legal_ids(p)
def command(m: Types.Match, c: Types.Command) -> Types.StepResult:
  M.step(m, c)
def replay(ids: List<&2, U32>, p: P.Position) -> P.Position:
  K.replay(ids, p)
def replay_commands(commands: List<&2, Types.Command>, m: Types.Match) -> Types.Match:
  match commands:
    case []: m
    case c <> rest: replay_commands(rest, Types.result_state(command(m, c)))
def start(layout: Bool, policy: Types.DrawPolicy) -> Types.Match:
  M.start(layout, policy)
def from_position(p: P.Position, policy: Types.DrawPolicy) -> Maybe<Types.Match>:
  M.from_position(p, policy)
def outcome(m: Types.Match) -> Maybe<Types.Outcome>:
  M.outcome(m)
def board_outcome(p: P.Position, keys: List<&2, Types.RepetitionKey>, policy: Types.DrawPolicy, legal: List<&2, U32>) -> Maybe<Types.Outcome>:
  M.board_outcome(p, keys, policy, legal)
def same_side(a: Bool, b: Bool) -> Bool:
  M.same_side(a, b)
