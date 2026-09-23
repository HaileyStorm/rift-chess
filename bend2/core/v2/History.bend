import Base
import ../Model.bend as P
import ../Spec.bend as S
import ../MatchSpec.bend as T
import ../ProofKit.bend as L

type Both<-A: Data, -B: Data> is Data:
  Both{left: A, right: B}
def AllValid(xs: List<&2, P.Position>) -> Data:
  match xs:
    case []: Unit
    case p <> rest: Both<L.Truth(S.valid(p)), AllValid(rest)>
def Good(m: T.Match) -> Data:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Both<L.Truth(S.valid(initial)), Both<L.Truth(S.valid(state)), AllValid(states)>>
