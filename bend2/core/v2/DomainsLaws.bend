import Base
import ../Model.bend as Model
import ../Spec.bend as Spec
import ../MatchSpec.bend as Match
import ../ProofKit.bend as Logic
import ./Domains.bend as Domains
import ./RuleKernel.bend as Kernel
import ./MatchKernel.bend as MatchKernel

law reachable_admissible:
  for +layout_b: Bool
  for trace: List<&2, U32>
  for p: Model.Position
  for witness: Domains.Reachable<layout_b, trace, p>
  Logic.Truth(Spec.valid(p))
law coherent_initial:
  for -initial: Model.Position
  for -policy: Match.DrawPolicy
  for -commands: List<&2, Match.Command>
  for -m: Match.Match
  for witness: Domains.CoherentMatch<initial, policy, commands, m>
  Domains.AdmissibleWitness(initial)
