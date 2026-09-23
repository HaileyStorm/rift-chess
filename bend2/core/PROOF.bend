import Base
import ./Model.bend as Model
import ./Spec.bend as Spec
import ./MatchSpec.bend as Match
import ./ProofKit.bend as Logic
import ./Kernel.bend as Kernel
import ./LAWS.bend as Laws

def reject_case(b: Bool, +p: Model.Position, +id: U32,
  w: Logic.Truth(Bool.not(b))) -> {Kernel.decide(b, p, id) == Kernel.Rejected{p} : Kernel.StepResult}:
  match b:
    case False{}: {==}
    case True{}: Empty.absurd({Kernel.Accepted{id, Spec.candidate(p, id)} == Kernel.Rejected{p} : Kernel.StepResult}, w)

def accept_case(b: Bool, +p: Model.Position, +id: U32,
  w: Logic.Truth(b)) -> {Kernel.decide(b, p, id) == Kernel.Accepted{id, Spec.candidate(p, id)} : Kernel.StepResult}:
  match b:
    case True{}: {==}
    case False{}: Empty.absurd({Kernel.Rejected{p} == Kernel.Accepted{id, Spec.candidate(p, id)} : Kernel.StepResult}, w)

# Authorization includes each of these concrete predicates, with the candidate
# validated independently of the old position. The extraction is constructive;
# it does not assume that a guard is true without a witness.
def guard_valid(+a: Bool, +b: Bool, +c: Bool, -d: Bool,
  w: Logic.Truth(a && (b && (c && d)))) -> Logic.Truth(c):
  Logic.and_left(c, d, Logic.and_right(b, c && d, Logic.and_right(a, b && (c && d), w)))

def guard_post(+a: Bool, +b: Bool, +c: Bool, -d: Bool,
  w: Logic.Truth(a && (b && (c && d)))) -> Logic.Truth(d):
  Logic.and_right(c, d, Logic.and_right(b, c && d, Logic.and_right(a, b && (c && d), w)))

def authorized_valid(+p: Model.Position, +id: U32, w: Logic.Truth(Spec.authorized(p, id)))
  -> Logic.Truth(Spec.valid(Spec.candidate(p, id))):
  guard_valid(Spec.valid(p), Spec.eligible(p, id), Spec.valid(Spec.candidate(p, id)),
    Spec.post(p, id, Spec.candidate(p, id)), w)

def authorized_post(+p: Model.Position, +id: U32, w: Logic.Truth(Spec.authorized(p, id)))
  -> Logic.Truth(Spec.post(p, id, Spec.candidate(p, id))):
  guard_post(Spec.valid(p), Spec.eligible(p, id), Spec.valid(Spec.candidate(p, id)),
    Spec.post(p, id, Spec.candidate(p, id)), w)

def valid_case(b: Bool, +p: Model.Position, +id: U32,
  old: Logic.Truth(Spec.valid(p)),
  next: Logic.Truth(b) -> Logic.Truth(Spec.valid(Spec.candidate(p, id))))
  -> Logic.Truth(Spec.valid(Kernel.position(Kernel.decide(b, p, id)))):
  match b:
    case True{}: next(Unit{})
    case False{}: old

def accepted_predicate(-P: Model.Position -> Data, b: Bool, +p: Model.Position, +id: U32,
  w: Logic.Truth(b), next: Logic.Truth(b) -> P(Spec.candidate(p, id)))
  -> P(Kernel.position(Kernel.decide(b, p, id))):
  match b:
    case True{}: next(w)
    case False{}: Empty.absurd(P(p), w)

def step_refines_case(b: Bool, +p: Model.Position, +id: U32)
  -> {Kernel.decide(b, p, id) == Bool.pick(Kernel.StepResult, b,
    Kernel.Accepted{id, Spec.candidate(p, id)}, Kernel.Rejected{p}) : Kernel.StepResult}:
  match b:
    case True{}: {==}
    case False{}: {==}

def Laws.step_refines(p, id):
  step_refines_case(Spec.authorized(p, id), p, id)

def Laws.rejected_inert(p, id, w):
  reject_case(Spec.authorized(p, id), p, id, w)

def Laws.accepted_result(p, id, w):
  accept_case(Spec.authorized(p, id), p, id, w)

def Laws.accepted_valid(p, id, w):
  accepted_predicate(q => Logic.Truth(Spec.valid(q)), Spec.authorized(p, id), p, id, w,
    yes => authorized_valid(p, id, yes))

def Laws.accepted_post(p, id, w):
  accepted_predicate(q => Logic.Truth(Spec.post(p, id, q)), Spec.authorized(p, id), p, id, w,
    yes => authorized_post(p, id, yes))

def Laws.preserves_valid(p, id, w):
  valid_case(Spec.authorized(p, id), p, id, w, yes => authorized_valid(p, id, yes))

def Laws.start_valid(layout_b):
  match layout_b:
    case True{}: Unit{}
    case False{}: Unit{}

def Laws.enumeration_refines(p):
  {==}

def Laws.replay_composes(xs, ys, p):
  match xs:
    case []: {==}
    case id <> rest:
      Laws.replay_composes(rest, ys, Kernel.position(Kernel.step(p, id)))

def match_reject_case(b: Bool, +m: Match.Match, +c: Match.Command,
  w: Logic.Truth(Bool.not(b)))
  -> {Match.step.decide(m, c, b) == Match.Rejected{m} : Match.StepResult}:
  match b:
    case False{}: {==}
    case True{}: Empty.absurd({Match.Accepted{Match.apply_enabled(m, c)} == Match.Rejected{m} : Match.StepResult}, w)

def match_accept_case(b: Bool, +m: Match.Match, +c: Match.Command,
  w: Logic.Truth(b))
  -> {Match.step.decide(m, c, b) == Match.Accepted{Match.apply_enabled(m, c)} : Match.StepResult}:
  match b:
    case True{}: {==}
    case False{}: Empty.absurd({Match.Rejected{m} == Match.Accepted{Match.apply_enabled(m, c)} : Match.StepResult}, w)

def match_refines_case(b: Bool, +m: Match.Match, +c: Match.Command)
  -> {Match.step.decide(m, c, b) == Bool.pick(Match.StepResult, b,
    Match.Accepted{Match.apply_enabled(m, c)}, Match.Rejected{m}) : Match.StepResult}:
  match b:
    case True{}: {==}
    case False{}: {==}

def Laws.match_refines(m, c):
  match_refines_case(Match.enabled(m, c), m, c)

def Laws.match_rejected_inert(m, c, w):
  match_reject_case(Match.enabled(m, c), m, c, w)

def Laws.match_accepted_result(m, c, w):
  match_accept_case(Match.enabled(m, c), m, c, w)

def Laws.match_replay_composes(xs, ys, m):
  match xs:
    case []: {==}
    case c <> rest:
      Laws.match_replay_composes(rest, ys, Match.result_state(Kernel.command(m, c)))
