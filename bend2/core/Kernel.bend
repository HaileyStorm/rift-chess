import Base
import ./Model.bend as Model
import ./Spec.bend as Spec
import ./MatchSpec.bend as Match

# This is the public rules boundary used by the application. Acceptance is a
# tagged result, never inferred by comparing two boards. Special-move flags are
# derived inside Spec from the canonical integer action ID.
type StepResult is Data:
  Accepted{id: U32, next: Model.Position}
  Rejected{old: Model.Position}

def decide(allowed: Bool, +p: Model.Position, +id: U32) -> StepResult:
  match allowed:
    case True{}: Accepted{id, Spec.candidate(p, id)}
    case False{}: Rejected{p}

def step(+p: Model.Position, +id: U32) -> StepResult:
  decide(Spec.authorized(p, id), p, id)

def position(result: StepResult) -> Model.Position:
  match result:
    case Accepted{id, next}: next
    case Rejected{old}: old

def accepted(result: StepResult) -> Bool:
  match result:
    case Accepted{id, next}: True{}
    case Rejected{old}: False{}

def legal_ids(+p: Model.Position) -> List<&2, U32>:
  a b c d = Spec.legal_range(5440n, 0, p) Spec.legal_range(5440n, 5440, p)
    Spec.legal_range(5440n, 10880, p) Spec.legal_range(5440n, 16320, p)
  List.append(&2, U32, a, List.append(&2, U32, b, List.append(&2, U32, c, d)))

def replay(ids: List<&2, U32>, p: Model.Position) -> Model.Position:
  match ids:
    case []: p
    case id <> rest: replay(rest, position(step(p, id)))

# A complete game uses this match boundary, including draws, repetition, stale
# revisions, resignation and undo. The lower position API is useful for search
# and conformance tests, not for bypassing terminal match rules.
def command(m: Match.Match, c: Match.Command) -> Match.StepResult:
  Match.step(m, c)

def replay_commands(commands: List<&2, Match.Command>, m: Match.Match) -> Match.Match:
  match commands:
    case []: m
    case c <> rest: replay_commands(rest, Match.result_state(command(m, c)))
