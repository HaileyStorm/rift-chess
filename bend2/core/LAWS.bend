# DRAFT until the semantic-v1 manifest is created. The English meaning and
# limitations are in docs/LAWS_V1.md. No law calls an implementation-owned
# acceptance predicate: the exact normative authorization is Spec.authorized.
import Base
import ./Model.bend as Model
import ./Spec.bend as Spec
import ./MatchSpec.bend as Match
import ./ProofKit.bend as Logic
import ./Kernel.bend as Kernel

law step_refines:
  for +p: Model.Position
  for +id: U32
  {Kernel.step(p, id) == Bool.pick(Kernel.StepResult, Spec.authorized(p, id),
    Kernel.Accepted{id, Spec.candidate(p, id)}, Kernel.Rejected{p}) : Kernel.StepResult}

law rejected_inert:
  for +p: Model.Position
  for +id: U32
  for w: Logic.Truth(Bool.not(Spec.authorized(p, id)))
  {Kernel.step(p, id) == Kernel.Rejected{p} : Kernel.StepResult}

law accepted_result:
  for +p: Model.Position
  for +id: U32
  for w: Logic.Truth(Spec.authorized(p, id))
  {Kernel.step(p, id) == Kernel.Accepted{id, Spec.candidate(p, id)} : Kernel.StepResult}

law accepted_valid:
  for +p: Model.Position
  for +id: U32
  for w: Logic.Truth(Spec.authorized(p, id))
  Logic.Truth(Spec.valid(Kernel.position(Kernel.step(p, id))))

law accepted_post:
  for +p: Model.Position
  for +id: U32
  for w: Logic.Truth(Spec.authorized(p, id))
  Logic.Truth(Spec.post(p, id, Kernel.position(Kernel.step(p, id))))

law preserves_valid:
  for +p: Model.Position
  for +id: U32
  for w: Logic.Truth(Spec.valid(p))
  Logic.Truth(Spec.valid(Kernel.position(Kernel.step(p, id))))

law start_valid:
  for +layout_b: Bool
  Logic.Truth(Spec.valid(Model.start(layout_b)))

law enumeration_refines:
  for +p: Model.Position
  {Kernel.legal_ids(p) == Spec.legal_ids(p) : List<&2, U32>}

law replay_composes:
  for +xs: List<&2, U32>
  for +ys: List<&2, U32>
  for p: Model.Position
  {Kernel.replay(Logic.append(U32, xs, ys), p) ==
    Kernel.replay(ys, Kernel.replay(xs, p)) : Model.Position}

law match_refines:
  for +m: Match.Match
  for +c: Match.Command
  {Kernel.command(m, c) == Bool.pick(Match.StepResult, Match.enabled(m, c),
    Match.Accepted{Match.apply_enabled(m, c)}, Match.Rejected{m}) : Match.StepResult}

law match_rejected_inert:
  for +m: Match.Match
  for +c: Match.Command
  for w: Logic.Truth(Bool.not(Match.enabled(m, c)))
  {Kernel.command(m, c) == Match.Rejected{m} : Match.StepResult}

law match_accepted_result:
  for +m: Match.Match
  for +c: Match.Command
  for w: Logic.Truth(Match.enabled(m, c))
  {Kernel.command(m, c) == Match.Accepted{Match.apply_enabled(m, c)} : Match.StepResult}

law match_replay_composes:
  for +xs: List<&2, Match.Command>
  for +ys: List<&2, Match.Command>
  for m: Match.Match
  {Kernel.replay_commands(Logic.append(Match.Command, xs, ys), m) ==
    Kernel.replay_commands(ys, Kernel.replay_commands(xs, m)) : Match.Match}
