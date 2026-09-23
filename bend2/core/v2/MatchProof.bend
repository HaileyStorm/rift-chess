import Base
import ../Model.bend as P
import ../ProofKit.bend as L
import ./MatchKernel.bend as M
import ./RuleKernel.bend as K
import ./RuleContracts.bend as R
import ../Geometry.bend as G
import ../MatchSpec.bend as Types
import ./MatchLaws.bend as Laws

def undo_revision(+initial: P.Position, +actions: List<&2, U32>, +states: List<&2, P.Position>,
  +keys: List<&2, Types.RepetitionKey>, +revision: Nat, +policy: Types.DrawPolicy, got: Maybe<&2, P.Position>)
  -> {M.revision(M.apply_undo.parts.got(initial, actions, states, keys, revision, policy, got)) == Nat.add(1n, revision) : Nat}:
  match got:
    case None{}: {==}
    case Some{state}: {==}

def resign_revision(initial: P.Position, state: P.Position, actions: List<&2, U32>, states: List<&2, P.Position>, keys: List<&2, Types.RepetitionKey>, +revision: Nat, policy: Types.DrawPolicy, offer: Types.DrawOffer, forced: Types.Override, side: Bool)
  -> {M.revision(M.apply_resign(Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}, side)) == Nat.add(1n, revision) : Nat}:
  match side:
    case True{}: {==}
    case False{}: {==}

def Laws.every_command_revision(m, c):
  match m c:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced} Types.MoveCommand{expected, action}: {==}
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced} Types.UndoCommand{expected}:
      undo_revision(initial, M.drop_last_u32(actions), M.drop_last_positions(states), M.drop_last_keys(keys), revision, policy, M.last_position(M.drop_last_positions(states)))
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced} Types.OfferCommand{expected, side}: {==}
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced} Types.AcceptCommand{expected, side}: {==}
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced} Types.DeclineCommand{expected, side}: {==}
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced} Types.ResignCommand{expected, side}:
      resign_revision(initial, state, actions, states, keys, revision, policy, offer, forced, side)

def accepted_revision_case(b: Bool, +m: Types.Match, +c: Types.Command, w: L.Truth(M.accepted(M.step.decide(m, c, b))))
  -> {M.revision(M.result_state(M.step.decide(m, c, b))) == Nat.add(1n, M.revision(m)) : Nat}:
  match b:
    case True{}: Laws.every_command_revision(m, c)
    case False{}: Empty.absurd({M.revision(m) == Nat.add(1n, M.revision(m)) : Nat}, w)
def Laws.accepted_revision(m, c, w):
  accepted_revision_case(M.enabled(m, c), m, c, w)
def rejected_case(b: Bool, +m: Types.Match, +c: Types.Command, w: L.Truth(Bool.not(M.accepted(M.step.decide(m, c, b)))))
  -> {M.step.decide(m, c, b) == Types.Rejected{m} : Types.StepResult}:
  match b:
    case False{}: {==}
    case True{}: Empty.absurd({Types.Accepted{M.apply_enabled(m, c)} == Types.Rejected{m} : Types.StepResult}, w)
def Laws.rejected_inert(m, c, w):
  rejected_case(M.enabled(m, c), m, c, w)
def Laws.prompt_never_automatic_progress(quiet): {==}
def Laws.off_never_automatic_progress(quiet): {==}
def Laws.checked_no_actions_mate(side): {==}
def Laws.unchecked_no_actions_stalemate(side): {==}
def Laws.bare_before_repetition_progress(p, keys, policy, quiet, key): {==}
def Laws.threefold_before_progress(p, keys, policy, quiet, key, count): {==}

def enabled_from_accepted(b: Bool, +m: Types.Match, +c: Types.Command,
  w: L.Truth(M.accepted(M.step.decide(m, c, b)))) -> L.Truth(b):
  match b:
    case True{}: Unit{}
    case False{}: w

def move_allowed(+m: Types.Match, +expected: Nat, +id: U32,
  w: L.Truth(M.enabled(m, Types.MoveCommand{expected, id}))) -> L.Truth(K.allowed(M.state(m), id)):
  match m:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      L.and_right(M.live(m), K.allowed(state, id),
        L.and_right(M.revision_ok(m, Types.MoveCommand{expected, id}), M.enabled_move(m, id), w))

def board_contract_case(b: Bool, +p: P.Position, +id: U32,
  w: L.Truth(b), contract: L.Truth(b) -> L.Truth(R.contract(p, id, K.proposed(p, id))))
  -> L.Truth(R.contract(p, id, K.position(K.decide(b, p, id)))):
  match b:
    case True{}: contract(w)
    case False{}: Empty.absurd(L.Truth(R.contract(p, id, p)), w)

def apply_move_contract(+m: Types.Match, +id: U32, w: L.Truth(K.allowed(M.state(m), id)))
  -> L.Truth(R.contract(M.state(m), id, M.state(M.apply_move(m, id)))):
  match m:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      board_contract_case(K.allowed(state, id), state, id, w, yes => yes)

def command_move_contract_case(b: Bool, +m: Types.Match, +expected: Nat, +id: U32,
  w: L.Truth(M.accepted(M.step.decide(m, Types.MoveCommand{expected, id}, b))),
  allowed: L.Truth(K.allowed(M.state(m), id)))
  -> L.Truth(R.contract(M.state(m), id, M.state(M.result_state(M.step.decide(m, Types.MoveCommand{expected, id}, b))))):
  match b:
    case True{}: apply_move_contract(m, id, allowed)
    case False{}: Empty.absurd(L.Truth(R.contract(M.state(m), id, M.state(m))), w)

def Laws.accepted_move_rule_contract(m, expected, id, w):
  command_move_contract_case(M.enabled(m, Types.MoveCommand{expected, id}), m, expected, id, w,
    move_allowed(m, expected, id, enabled_from_accepted(M.enabled(m, Types.MoveCommand{expected, id}), m, Types.MoveCommand{expected, id}, w)))

def no_actions_outcome(+p: P.Position, keys: List<&2, Types.RepetitionKey>, policy: Types.DrawPolicy)
  -> {M.board_outcome(p, keys, policy, []) == M.board_outcome.checked(P.pos_side(p), G.in_check(p, P.pos_side(p))) : Maybe<Types.Outcome>}:
  match p:
    case P.Pos{board, holes, side, rights, ep, epPawn, quiet, full}: {==}
def Laws.no_actions_precede_all_draws(p, keys, policy, no_actions):
  Equal.trans(Maybe<Types.Outcome>, M.outcome.forced(p, keys, policy, Types.NoOverride{}),
    M.board_outcome(p, keys, policy, []), M.board_outcome.checked(P.pos_side(p), G.in_check(p, P.pos_side(p))),
    Equal.cong(List<&2, U32>, Maybe<Types.Outcome>, ids => M.board_outcome(p, keys, policy, ids), K.legal_ids(p), [], no_actions),
    no_actions_outcome(p, keys, policy))
def Laws.automatic_progress_threshold(quiet): {==}
def Laws.nonbare_uses_threefold_count(p, keys, policy, quiet, key): {==}
