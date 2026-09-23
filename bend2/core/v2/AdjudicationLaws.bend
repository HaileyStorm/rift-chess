import Base
import ../Model.bend as P
import ../MatchSpec.bend as T
import ./MatchKernel.bend as M
import ./RuleKernel.bend as K
import ./AdjudicationContracts.bend as C

law effective_ep_exact:
  for +board: List<&2, U32>
  for +ep: U32
  for +ids: List<&2, U32>
  {M.effective_ep(board, ep, ids) == C.effective(board, ep, ids) : U32}
law repetition_key_exact:
  for +p: P.Position
  for +ids: List<&2, U32>
  {M.repetition_key(p, ids) == C.key(p, ids) : T.RepetitionKey}
law canonical_repetition_key_exact:
  for +p: P.Position
  {M.repetition_key(p, K.legal_ids(p)) == C.key(p, K.legal_ids(p)) : T.RepetitionKey}
law repetition_equality_exact:
  for +a: T.RepetitionKey
  for +b: T.RepetitionKey
  {M.key_equal(a, b) == C.key_equal(a, b) : Bool}
law repetition_count_exact:
  for +key: T.RepetitionKey
  for +keys: List<&2, T.RepetitionKey>
  {M.count_key(key, keys) == C.count(key, keys) : Nat}
law only_bare_kings_material:
  for +p: P.Position
  {M.is_bare_kings(p) == C.bare(p) : Bool}
law board_outcome_exact:
  for +p: P.Position
  for +keys: List<&2, T.RepetitionKey>
  for +policy: T.DrawPolicy
  for +ids: List<&2, U32>
  {M.board_outcome(p, keys, policy, ids) == C.board(p, keys, policy, ids) : Maybe<T.Outcome>}
law full_outcome_exact:
  for +p: P.Position
  for +keys: List<&2, T.RepetitionKey>
  for +policy: T.DrawPolicy
  for +forced: T.Override
  {M.outcome.forced(p, keys, policy, forced) == C.expected(p, keys, policy, forced) : Maybe<T.Outcome>}
law actual_live_exact:
  for +m: T.Match
  {M.live(m) == C.live(m) : Bool}
law actual_outcome_exact:
  for +m: T.Match
  {M.outcome(m) == C.outcome(m) : Maybe<T.Outcome>}
