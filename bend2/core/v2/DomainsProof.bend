import Base
import ../Model.bend as Model
import ../Spec.bend as Spec
import ./RuleKernel.bend as Kernel
import ../MatchSpec.bend as Match
import ../ProofKit.bend as Logic
import ./Domains.bend as Domains
import ./DomainsLaws.bend as Laws
import ./RuleContracts.bend as R
import ./MatchKernel.bend as MatchKernel

# Closed constructors for the indexed reachability relation.  The `action <>
# rest` result is newest-first; callers that need chronological replay should
# reverse the trace before passing it to Kernel.replay.
def reachable_base(layout_b: Bool)
  -> Domains.Reachable<layout_b, [], Model.start(layout_b)>:
  Domains.ReachBase{{==}, {==}}

def reachable_extend(layout_b: Bool, rest: List<&2, U32>,
  prev: Model.Position, prior: Domains.Reachable<layout_b, rest, prev>,
  action: U32, accepted: Logic.Truth(Kernel.allowed(prev, action)))
  -> Domains.Reachable<layout_b, action <> rest,
    Kernel.position(Kernel.step(prev, action))>:
  Domains.ReachStep{prev, action, rest, prior, accepted, {==}, {==}}

def start_admissible(layout_b: Bool) -> Logic.Truth(Spec.valid(Model.start(layout_b))):
  match layout_b:
    case True{}: Unit{}
    case False{}: Unit{}

def successor_valid(+p: Model.Position, +q: Model.Position, decoded: Maybe<Model.Action>,
  w: Logic.Truth(R.contract_decoded(p, q, decoded))) -> Logic.Truth(Spec.valid(q)):
  match decoded:
    case None{}: Empty.absurd(Logic.Truth(Spec.valid(q)), w)
    case Some{+a}:
      Logic.and_left(R.admissible_new(p, a, q), R.clause_2(p, a, q),
        Logic.and_right(R.admissible_old(p, a, q), R.clause_1(p, a, q), w))

def accepted_valid_case(b: Bool, +p: Model.Position, +id: U32, w: Logic.Truth(b),
  next: Logic.Truth(b) -> Logic.Truth(Spec.valid(Kernel.proposed(p, id))))
  -> Logic.Truth(Spec.valid(Kernel.position(Kernel.decide(b, p, id)))):
  match b:
    case True{}: next(w)
    case False{}: Empty.absurd(Logic.Truth(Spec.valid(p)), w)

def accepted_valid(+p: Model.Position, +id: U32, w: Logic.Truth(Kernel.allowed(p, id)))
  -> Logic.Truth(Spec.valid(Kernel.position(Kernel.step(p, id)))):
  accepted_valid_case(Kernel.allowed(p, id), p, id, w,
    yes => successor_valid(p, Kernel.proposed(p, id), Model.decode(id), yes))

def transport_valid(+a: Model.Position, +b: Model.Position, e: {a == b : Model.Position},
  w: Logic.Truth(Spec.valid(a))) -> Logic.Truth(Spec.valid(b)):
  Logic.truth_of_eq(Spec.valid(b), Equal.trans(Bool, True{}, Spec.valid(a), Spec.valid(b),
    Equal.sym(Bool, Spec.valid(a), True{}, Logic.truth_eq(Spec.valid(a), w)),
    Equal.cong(Model.Position, Bool, q => Spec.valid(q), a, b, e)))

def Laws.reachable_admissible(layout_b, trace, p, witness):
  match witness:
    case Domains.ReachBase{trace_eq, endpoint_eq}:
      transport_valid(Model.start(layout_b), p, endpoint_eq, start_admissible(layout_b))
    case Domains.ReachStep{+prev, +action, rest, prior, accepted, trace_eq, endpoint_eq}:
      transport_valid(Kernel.position(Kernel.step(prev, action)), p, endpoint_eq, accepted_valid(prev, action, accepted))

# Endpoint parameters keep the checker from normalizing an entire constructed
# match/21760-ID enumeration while checking a dependent constructor.
def coherent_base(initial: Model.Position, policy: Match.DrawPolicy, m: Match.Match,
  initial_ok: Domains.AdmissibleWitness(initial),
  endpoint: {MatchKernel.make_match(initial, policy) == m : Match.Match})
  -> Domains.CoherentMatch<initial, policy, [], m>:
  Domains.MatchBase{initial_ok, {==}, endpoint}

def coherent_extend(initial: Model.Position, policy: Match.DrawPolicy,
  rest: List<&2, Match.Command>, prev: Match.Match,
  prior: Domains.CoherentMatch<initial, policy, rest, prev>,
  command: Match.Command, accepted: Logic.Truth(MatchKernel.enabled(prev, command)),
  m: Match.Match, endpoint: {MatchKernel.result_state(MatchKernel.step(prev, command)) == m : Match.Match})
  -> Domains.CoherentMatch<initial, policy, command <> rest, m>:
  Domains.MatchStep{prev, command, rest, prior, accepted, {==}, endpoint}

def Laws.coherent_initial(initial, policy, commands, m, witness):
  match witness:
    case Domains.MatchBase{initial_ok, trace_eq, endpoint_eq}: initial_ok
    case Domains.MatchStep{prev, command, rest, prior, accepted, trace_eq, endpoint_eq}:
      Laws.coherent_initial(initial, policy, rest, prev, prior)
