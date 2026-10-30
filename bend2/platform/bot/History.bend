# Nonsemantic projection of a certified match for bot adapters. The complete
# accepted action list is retained so a consumer can reconstruct repetition.
import Base
import ../../core/Model.bend as Model
import ../../core/MatchSpec.bend as Match
import ../../core/canonical/Match.bend as Prepared

type Context is Data:
  Context{initial: Model.Position, position: Model.Position,
    actions: List<&2, U32>, policy: Match.DrawPolicy, legal: List<&2, U32>}

def from_match(m: Match.Match, ids: List<&2, U32>) -> Context:
  match m:
    case Match.Match{initial, state, actions, _, _, _, policy, _, _}:
      Context{initial, state, actions, policy, ids}

def from_ready(+ready: Prepared.Ready) -> Context:
  from_match(Prepared.game(ready), Prepared.ids(ready))
