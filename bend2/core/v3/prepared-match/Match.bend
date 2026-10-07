# Meaning-preserving prepared command evaluation. Frozen v2 remains authority.
import Base
import ../../MatchSpec.bend as T
import ../../v2/BoardSpec.bend as S
import ../../v2/MatchKernel.bend as M
import ../../v2/Facade.bend as F

type Evaluation is Data:
  Ordinary{result: T.StepResult}
  MoveAccepted{game: T.Match, ids: List<&2, U32>}

def erase(value: Evaluation) -> T.StepResult:
  match value:
    case Ordinary{result}: result
    case MoveAccepted{game, _}: T.Accepted{game}

def carried(value: Evaluation) -> Maybe<&2, List<&2, U32>>:
  match value:
    case Ordinary{_}: None{}
    case MoveAccepted{_, ids}: Some{ids}

# As in frozen M.apply_move, the caller supplies the authorization guard.
# The same canonical successor IDs feed the repetition key and the UI refresh.
def apply_move(m: T.Match, +action: U32) -> Evaluation:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      +next = S.step(state, action)
      +ids = S.legal_ids(next)
      +key = M.repetition_key(next, ids)
      MoveAccepted{T.Match{initial, next, M.append_u32(actions, action),
        M.append_position(states, next), M.append_key(keys, key),
        Nat.add(1n, revision), policy, T.NoOffer{}, T.NoOverride{}}, ids}

def decide(+m: T.Match, +id: U32, allowed: Bool) -> Evaluation:
  match allowed:
    case False{}: Ordinary{T.Rejected{m}}
    case True{}: apply_move(m, id)

def command(+m: T.Match, +c: T.Command) -> Evaluation:
  match c:
    case T.MoveCommand{expected, id}: decide(m, id, M.enabled(m, c))
    case _: Ordinary{F.command(m, c)}
