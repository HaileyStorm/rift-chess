import Base
import ../Model.bend as P
import ../MatchSpec.bend as T
import ../ProofKit.bend as L
import ./MatchKernel.bend as M
import ./Domains.bend as D
import ./History.bend as H
law commands_preserve_admissible_history:
  for +m: T.Match
  for +c: T.Command
  for +good: H.Good(m)
  H.Good(M.result_state(M.step(m, c)))
law coherent_history_admissible:
  for -initial: P.Position
  for -policy: T.DrawPolicy
  for -commands: List<&2, T.Command>
  for -m: T.Match
  for witness: D.CoherentMatch<initial, policy, commands, m>
  H.Good(m)
