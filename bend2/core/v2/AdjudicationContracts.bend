# Normative match adjudication, independently stated from MatchKernel selectors.
# Model encoding, Geometry attacks, and the certified canonical legal list are
# shared inputs. No MatchKernel or v1 match algorithm is imported here.
import Base
import ../Model.bend as P
import ../Geometry.bend as G
import ../MatchSpec.bend as T
import ./RuleKernel.bend as K

def same_side(a: Bool, b: Bool) -> Bool:
  match a b:
    case True{} True{}: True{}
    case False{} False{}: True{}
    case _ _: False{}

def board_equal(a: List<&2, U32>, b: List<&2, U32>) -> Bool:
  match a b:
    case Nil{} Nil{}: True{}
    case ah <> at bh <> bt: Bool.and(U32.is_eq(ah, bh), board_equal(at, bt))
    case _ _: False{}

def key_equal(a: T.RepetitionKey, b: T.RepetitionKey) -> Bool:
  match a b:
    case T.RepKey{ab, ah, aside, ar, ae, ap} T.RepKey{bb, bh, bside, br, be, bp}:
      Bool.and(board_equal(ab, bb), Bool.and(U32.is_eq(ah, bh),
        Bool.and(same_side(aside, bside), Bool.and(U32.is_eq(ar, br),
          Bool.and(U32.is_eq(ae, be), U32.is_eq(ap, bp))))))

def count(+key: T.RepetitionKey, keys: List<&2, T.RepetitionKey>) -> Nat:
  match keys:
    case []: 0n
    case +h <> t:
      Nat.add(U32.to_nat(Bool.to_u32(key_equal(key, h))), count(key, t))

# On the certified legal list, a pawn action to the EP target is precisely an
# available en-passant capture; king-exposing pseudo-captures are absent.
def ep_capture(+board: List<&2, U32>, ep: U32, +id: U32) -> Bool:
  +q = U32.div(id, 5)
  Bool.and(U32.is_lt(id, 20480), Bool.and(U32.is_eq(U32.mod(q, 64), ep),
    U32.is_eq(P.piece_type(P.board_get(board, U32.div(q, 64))), 1)))

def any_ep(+board: List<&2, U32>, +ep: U32, ids: List<&2, U32>) -> Bool:
  match ids:
    case []: False{}
    case id <> rest: Bool.or(ep_capture(board, ep, id), any_ep(board, ep, rest))

def effective(+board: List<&2, U32>, +ep: U32, ids: List<&2, U32>) -> U32:
  Bool.pick(U32, U32.is_eq(ep, P.none_ep()), P.none_ep(),
    Bool.pick(U32, any_ep(board, ep, ids), ep, P.none_ep()))

def victim(epPawn: U32, ep: U32) -> U32:
  Bool.pick(U32, U32.is_eq(ep, P.none_ep()), P.none_ep(), epPawn)

def key.parts(+board: List<&2, U32>, holes: U32, side: Bool, rights: U32,
  ep: U32, epPawn: U32, legal: List<&2, U32>) -> T.RepetitionKey:
  +target = effective(board, ep, legal)
  T.RepKey{board, holes, side, rights, target, victim(epPawn, target)}

def key(p: P.Position, legal: List<&2, U32>) -> T.RepetitionKey:
  match p:
    case P.Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      key.parts(board, holes, side, rights, ep, epPawn, legal)

def bare_board(board: List<&2, U32>) -> Bool:
  match board:
    case []: True{}
    case +h <> t:
      Bool.and(Bool.or(U32.is_zero(h), U32.is_eq(P.piece_type(h), 6)), bare_board(t))

def bare(p: P.Position) -> Bool:
  match p:
    case P.Pos{board, holes, side, rights, ep, epPawn, quiet, full}: bare_board(board)

def checked(side: Bool, check: Bool) -> Maybe<T.Outcome>:
  match check:
    case True{}: Some{Bool.pick(T.Outcome, side, T.BlackCheckmate{}, T.WhiteCheckmate{})}
    case False{}: Some{T.Stalemate{}}

def progress(policy: T.DrawPolicy, quiet: Nat) -> Maybe<T.Outcome>:
  match policy:
    case T.Auto100{}:
      Bool.pick(Maybe<T.Outcome>, Nat.is_le(100n, quiet), Some{T.Progress100{}}, None{})
    case _: None{}

def draws(policy: T.DrawPolicy, quiet: Nat, count: Nat, bare: Bool) -> Maybe<T.Outcome>:
  match bare:
    case True{}: Some{T.BareKings{}}
    case False{}:
      Bool.pick(Maybe<T.Outcome>, Nat.is_ge(count, 3n), Some{T.Threefold{}}, progress(policy, quiet))

def board.empty(+p: P.Position, keys: List<&2, T.RepetitionKey>, policy: T.DrawPolicy,
  legal: List<&2, U32>, +side: Bool, quiet: Nat, empty: Bool) -> Maybe<T.Outcome>:
  match empty:
    case True{}: checked(side, G.in_check(p, side))
    case False{}: draws(policy, quiet, count(key(p, legal), keys), bare(p))

def board(+p: P.Position, keys: List<&2, T.RepetitionKey>, policy: T.DrawPolicy,
  +legal: List<&2, U32>) -> Maybe<T.Outcome>:
  match p:
    case P.Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      board.empty(p, keys, policy, legal, side, quiet, List.is_empty(&2, U32, legal))

def expected(+p: P.Position, keys: List<&2, T.RepetitionKey>, policy: T.DrawPolicy,
  forced: T.Override) -> Maybe<T.Outcome>:
  match forced:
    case T.NoOverride{}: board(p, keys, policy, K.legal_ids(p))
    case T.Agreement{}: Some{T.Agreed{}}
    case T.WhiteResigned{}: Some{T.WhiteResignedOutcome{}}
    case T.BlackResigned{}: Some{T.BlackResignedOutcome{}}

def active(result: Maybe<T.Outcome>) -> Bool:
  match result:
    case None{}: True{}
    case Some{value}: False{}

def outcome(m: T.Match) -> Maybe<T.Outcome>:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      expected(state, keys, policy, forced)

def live(m: T.Match) -> Bool:
  active(outcome(m))
