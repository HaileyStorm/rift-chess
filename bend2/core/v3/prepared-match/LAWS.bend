# Additive bridge obligations; no frozen v2 declaration is replaced.
import Base
import ../../MatchSpec.bend as T
import ../../v2/RuleKernel.bend as K
import ../../v2/MatchKernel.bend as M
import ./Match.bend as E

law apply_exact:
  for +m: T.Match
  for +id: U32
  {E.erase(E.apply_move(m, id)) == T.Accepted{M.apply_move(m, id)} : T.StepResult}

law carried_canonical:
  for +m: T.Match
  for +id: U32
  {E.carried(E.apply_move(m, id)) == Some{K.legal_ids(M.state(M.apply_move(m, id)))} : Maybe<&2, List<&2, U32>>}

law erased_step:
  for +m: T.Match
  for +c: T.Command
  {E.erase(E.command(m, c)) == M.step(m, c) : T.StepResult}
