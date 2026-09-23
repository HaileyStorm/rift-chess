import Base
import ../Model.bend as Model
import ../Spec.bend as Spec
import ./RuleKernel.bend as Kernel
import ../MatchSpec.bend as Match
import ../ProofKit.bend as Logic
import ./MatchKernel.bend as MatchKernel

# v2 domain witnesses are layered on the frozen model/admissibility and independent v2 kernel.  The
# aliases below keep the boundary explicit: a position is admissible exactly
# when the public specification accepts it.
def Admissible(p: Model.Position) -> Bool:
  Spec.valid(p)

def AdmissibleWitness(p: Model.Position) -> Data:
  Logic.Truth(Admissible(p))

# Reachable is an indexed, dependent witness.  A trace is stored newest-first:
# `action <> rest` extends the history at its head, while Kernel.replay's
# chronological input remains a separate API.  The two equality fields are
# intentional: they pin both the trace constructor and the exact endpoint,
# so a caller cannot fabricate a history by supplying an unrelated position.
# Every extension carries Truth(Kernel.allowed(...)); rejected kernel steps
# therefore have no inhabitant here.
type Reachable<-layout_b: Bool, -trace: List<&2, U32>, -p: Model.Position> is Type:
  ReachBase{trace_eq: {[] == trace : List<&2, U32>},
    endpoint_eq: {Model.start(layout_b) == p : Model.Position}}
  ReachStep{prev: Model.Position, action: U32, rest: List<&2, U32>,
    prior: Reachable<layout_b, rest, prev>,
    accepted: Logic.Truth(Kernel.allowed(prev, action)),
    trace_eq: {action <> rest == trace : List<&2, U32>},
    endpoint_eq: {Kernel.position(Kernel.step(prev, action)) == p : Model.Position}}

# CoherentMatch lifts the same shape to MatchSpec.  Commands use the same
# newest-first trace convention.  Its base is an admissible
# arbitrary initial position passed through Match.make_match; each command is
# required to be enabled before its exact MatchSpec result becomes the next
# indexed match state.
type CoherentMatch<-initial: Model.Position, -policy: Match.DrawPolicy,
  -commands: List<&2, Match.Command>, -m: Match.Match> is Type:
  MatchBase{initial_ok: AdmissibleWitness(initial),
    trace_eq: {[] == commands : List<&2, Match.Command>},
    endpoint_eq: {MatchKernel.make_match(initial, policy) == m : Match.Match}}
  MatchStep{prev: Match.Match, command: Match.Command,
    rest: List<&2, Match.Command>,
    prior: CoherentMatch<initial, policy, rest, prev>,
    accepted: Logic.Truth(MatchKernel.enabled(prev, command)),
    trace_eq: {command <> rest == commands : List<&2, Match.Command>},
    endpoint_eq: {MatchKernel.result_state(MatchKernel.step(prev, command)) == m : Match.Match}}
