import Base
import ../Model.bend as P
import ../ProofKit.bend as L
import ./MatchKernel.bend as M
import ./RuleContracts.bend as R
import ./RuleKernel.bend as K
import ../Geometry.bend as G
import ../MatchSpec.bend as Types

law every_command_revision:
  for +m: Types.Match
  for +c: Types.Command
  {M.revision(M.apply_enabled(m, c)) == Nat.add(1n, M.revision(m)) : Nat}
law accepted_revision:
  for +m: Types.Match
  for +c: Types.Command
  for w: L.Truth(M.accepted(M.step(m, c)))
  {M.revision(M.result_state(M.step(m, c))) == Nat.add(1n, M.revision(m)) : Nat}
law rejected_inert:
  for +m: Types.Match
  for +c: Types.Command
  for w: L.Truth(Bool.not(M.accepted(M.step(m, c))))
  {M.step(m, c) == Types.Rejected{m} : Types.StepResult}
law prompt_never_automatic_progress:
  for quiet: Nat
  {M.board_outcome.auto100(Types.Prompt{}, quiet) == None{} : Maybe<Types.Outcome>}
law off_never_automatic_progress:
  for quiet: Nat
  {M.board_outcome.auto100(Types.Off{}, quiet) == None{} : Maybe<Types.Outcome>}
law checked_no_actions_mate:
  for +side: Bool
  {M.board_outcome.checked(side, True{}) == Some{Bool.pick(Types.Outcome, side, Types.BlackCheckmate{}, Types.WhiteCheckmate{})} : Maybe<Types.Outcome>}
law unchecked_no_actions_stalemate:
  for side: Bool
  {M.board_outcome.checked(side, False{}) == Some{Types.Stalemate{}} : Maybe<Types.Outcome>}
law bare_before_repetition_progress:
  for p: P.Position
  for keys: List<&2, Types.RepetitionKey>
  for policy: Types.DrawPolicy
  for quiet: Nat
  for key: Types.RepetitionKey
  {M.board_outcome.bare(p, keys, policy, quiet, key, True{}) == Some{Types.BareKings{}} : Maybe<Types.Outcome>}
law threefold_before_progress:
  for p: P.Position
  for keys: List<&2, Types.RepetitionKey>
  for policy: Types.DrawPolicy
  for quiet: Nat
  for key: Types.RepetitionKey
  for count: Nat
  {M.board_outcome.counted(p, keys, policy, quiet, key, count, True{}) == Some{Types.Threefold{}} : Maybe<Types.Outcome>}

law accepted_move_rule_contract:
  for +m: Types.Match
  for +expected: Nat
  for +id: U32
  for +w: L.Truth(M.accepted(M.step(m, Types.MoveCommand{expected, id})))
  L.Truth(R.contract(M.state(m), id, M.state(M.result_state(M.step(m, Types.MoveCommand{expected, id})))))

law no_actions_precede_all_draws:
  for +p: P.Position
  for +keys: List<&2, Types.RepetitionKey>
  for +policy: Types.DrawPolicy
  for no_actions: {K.legal_ids(p) == [] : List<&2, U32>}
  {M.outcome.forced(p, keys, policy, Types.NoOverride{}) == M.board_outcome.checked(P.pos_side(p), G.in_check(p, P.pos_side(p))) : Maybe<Types.Outcome>}
law automatic_progress_threshold:
  for +quiet: Nat
  {M.board_outcome.auto100(Types.Auto100{}, quiet) == Bool.pick(Maybe<Types.Outcome>, Nat.is_le(100n, quiet), Some{Types.Progress100{}}, None{}) : Maybe<Types.Outcome>}
law nonbare_uses_threefold_count:
  for +p: P.Position
  for +keys: List<&2, Types.RepetitionKey>
  for +policy: Types.DrawPolicy
  for +quiet: Nat
  for +key: Types.RepetitionKey
  {M.board_outcome.bare(p, keys, policy, quiet, key, False{}) == Bool.pick(Maybe<Types.Outcome>, Nat.is_ge(M.count_key(key, keys), 3n), Some{Types.Threefold{}}, M.board_outcome.auto100(policy, quiet)) : Maybe<Types.Outcome>}
