import Base
import ../Model.bend as P
import ../Geometry.bend as G
import ../MatchSpec.bend as T
import ./MatchKernel.bend as M
import ./RuleKernel.bend as K
import ./AdjudicationContracts.bend as C
import ./AdjudicationLaws.bend as Laws

def board_equal_exact(+a: List<&2, U32>, +b: List<&2, U32>)
  -> {M.board_equal(a, b) == C.board_equal(a, b) : Bool}:
  match a b:
    case Nil{} Nil{}: {==}
    case ah <> at bh <> bt:
      Equal.cong(Bool, Bool, x => Bool.and(U32.is_eq(ah, bh), x),
        M.board_equal(at, bt), C.board_equal(at, bt), board_equal_exact(at, bt))
    case Nil{} bh <> bt: {==}
    case ah <> at Nil{}: {==}

def side_exact(a: Bool, b: Bool) -> {M.same_side(a, b) == C.same_side(a, b) : Bool}:
  match a b:
    case True{} True{}: {==}
    case True{} False{}: {==}
    case False{} True{}: {==}
    case False{} False{}: {==}

def and_exact(+a: Bool, +b: Bool, +c: Bool, +d: Bool, ab: {a == b : Bool}, cd: {c == d : Bool})
  -> {Bool.and(a, c) == Bool.and(b, d) : Bool}:
  Equal.trans(Bool, Bool.and(a, c), Bool.and(b, c), Bool.and(b, d),
    Equal.cong(Bool, Bool, x => Bool.and(x, c), a, b, ab),
    Equal.cong(Bool, Bool, x => Bool.and(b, x), c, d, cd))

def Laws.repetition_equality_exact(a, b):
  match a b:
    case T.RepKey{ab, ah, aside, ar, ae, ap} T.RepKey{bb, bh, bside, br, be, bp}:
      and_exact(M.board_equal(ab, bb), C.board_equal(ab, bb),
        Bool.and(U32.is_eq(ah, bh), Bool.and(M.same_side(aside, bside), Bool.and(U32.is_eq(ar, br), Bool.and(U32.is_eq(ae, be), U32.is_eq(ap, bp))))),
        Bool.and(U32.is_eq(ah, bh), Bool.and(C.same_side(aside, bside), Bool.and(U32.is_eq(ar, br), Bool.and(U32.is_eq(ae, be), U32.is_eq(ap, bp))))),
        board_equal_exact(ab, bb),
        Equal.cong(Bool, Bool, side => Bool.and(U32.is_eq(ah, bh), Bool.and(side, Bool.and(U32.is_eq(ar, br), Bool.and(U32.is_eq(ae, be), U32.is_eq(ap, bp))))),
          M.same_side(aside, bside), C.same_side(aside, bside), side_exact(aside, bside)))

def Laws.repetition_count_exact(key, keys):
  match keys:
    case []: {==}
    case +h <> t:
      Equal.trans(Nat, M.count_key(key, h <> t),
        Nat.add(U32.to_nat(Bool.to_u32(C.key_equal(key, h))), M.count_key(key, t)), C.count(key, h <> t),
        Equal.cong(Bool, Nat, same => Nat.add(U32.to_nat(Bool.to_u32(same)), M.count_key(key, t)),
          M.key_equal(key, h), C.key_equal(key, h), Laws.repetition_equality_exact(key, h)),
        Equal.cong(Nat, Nat, tail => Nat.add(U32.to_nat(Bool.to_u32(C.key_equal(key, h))), tail),
          M.count_key(key, t), C.count(key, t), Laws.repetition_count_exact(key, t)))

def pick_or(a: Bool, +b: Bool, +yes: U32, +no: U32)
  -> {Bool.pick(U32, a, yes, Bool.pick(U32, b, yes, no)) == Bool.pick(U32, Bool.or(a, b), yes, no) : U32}:
  match a:
    case False{}: {==}
    case True{}: {==}

def ep_go(+board: List<&2, U32>, +ep: U32, +ids: List<&2, U32>)
  -> {M.effective_ep.go(board, ep, ids) == Bool.pick(U32, C.any_ep(board, ep, ids), ep, P.none_ep()) : U32}:
  match ids:
    case []: {==}
    case id <> rest:
      Equal.trans(U32, M.effective_ep.go(board, ep, id <> rest),
        Bool.pick(U32, C.ep_capture(board, ep, id), ep, Bool.pick(U32, C.any_ep(board, ep, rest), ep, P.none_ep())),
        Bool.pick(U32, C.any_ep(board, ep, id <> rest), ep, P.none_ep()),
        Equal.cong(U32, U32, tail => Bool.pick(U32, C.ep_capture(board, ep, id), ep, tail),
          M.effective_ep.go(board, ep, rest), Bool.pick(U32, C.any_ep(board, ep, rest), ep, P.none_ep()), ep_go(board, ep, rest)),
        pick_or(C.ep_capture(board, ep, id), C.any_ep(board, ep, rest), ep, P.none_ep()))

def Laws.effective_ep_exact(board, ep, ids):
  Equal.cong(U32, U32, target => Bool.pick(U32, U32.is_eq(ep, P.none_ep()), P.none_ep(), target),
    M.effective_ep.go(board, ep, ids), Bool.pick(U32, C.any_ep(board, ep, ids), ep, P.none_ep()), ep_go(board, ep, ids))

def Laws.repetition_key_exact(p, ids):
  match p:
    case P.Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      Equal.cong(U32, T.RepetitionKey, +target => T.RepKey{board, holes, side, rights, target, C.victim(epPawn, target)},
        M.effective_ep(board, ep, ids), C.effective(board, ep, ids), Laws.effective_ep_exact(board, ep, ids))

def Laws.canonical_repetition_key_exact(p):
  Laws.repetition_key_exact(p, K.legal_ids(p))

def bare_exact(+board: List<&2, U32>) -> {M.is_bare_kings.go(board) == C.bare_board(board) : Bool}:
  match board:
    case []: {==}
    case +h <> t:
      Equal.cong(Bool, Bool, rest => Bool.and(Bool.or(U32.is_zero(h), U32.is_eq(P.piece_type(h), 6)), rest),
        M.is_bare_kings.go(t), C.bare_board(t), bare_exact(t))

def Laws.only_bare_kings_material(p):
  match p:
    case P.Pos{board, holes, side, rights, ep, epPawn, quiet, full}: bare_exact(board)

def progress_exact(policy: T.DrawPolicy, +quiet: Nat)
  -> {M.board_outcome.auto100(policy, quiet) == C.progress(policy, quiet) : Maybe<T.Outcome>}:
  match policy:
    case T.Auto100{}: {==}
    case T.Prompt{}: {==}
    case T.Off{}: {==}

def checked_exact(+side: Bool, check: Bool)
  -> {M.board_outcome.checked(side, check) == C.checked(side, check) : Maybe<T.Outcome>}:
  match check:
    case True{}: {==}
    case False{}: {==}

def draws_exact(+p: P.Position, +keys: List<&2, T.RepetitionKey>, +policy: T.DrawPolicy,
  +quiet: Nat, +key: T.RepetitionKey, bare: Bool)
  -> {M.board_outcome.bare(p, keys, policy, quiet, key, bare) == C.draws(policy, quiet, C.count(key, keys), bare) : Maybe<T.Outcome>}:
  match bare:
    case True{}: {==}
    case False{}:
      Equal.trans(Maybe<T.Outcome>, M.board_outcome.bare(p, keys, policy, quiet, key, False{}),
        Bool.pick(Maybe<T.Outcome>, Nat.is_ge(M.count_key(key, keys), 3n), Some{T.Threefold{}}, C.progress(policy, quiet)),
        C.draws(policy, quiet, C.count(key, keys), False{}),
        Equal.cong(Maybe<T.Outcome>, Maybe<T.Outcome>, progress => Bool.pick(Maybe<T.Outcome>, Nat.is_ge(M.count_key(key, keys), 3n), Some{T.Threefold{}}, progress),
          M.board_outcome.auto100(policy, quiet), C.progress(policy, quiet), progress_exact(policy, quiet)),
        Equal.cong(Nat, Maybe<T.Outcome>, count => Bool.pick(Maybe<T.Outcome>, Nat.is_ge(count, 3n), Some{T.Threefold{}}, C.progress(policy, quiet)),
          M.count_key(key, keys), C.count(key, keys), Laws.repetition_count_exact(key, keys)))

def empty_exact(+p: P.Position, +keys: List<&2, T.RepetitionKey>, +policy: T.DrawPolicy,
  +ids: List<&2, U32>, +side: Bool, +quiet: Nat, empty: Bool)
  -> {M.board_outcome.empty(p, keys, policy, ids, side, quiet, empty) == C.board.empty(p, keys, policy, ids, side, quiet, empty) : Maybe<T.Outcome>}:
  match empty:
    case True{}: checked_exact(side, G.in_check(p, side))
    case False{}:
      Equal.trans(Maybe<T.Outcome>, M.board_outcome.empty(p, keys, policy, ids, side, quiet, False{}),
        C.draws(policy, quiet, C.count(M.repetition_key(p, ids), keys), M.is_bare_kings(p)),
        C.board.empty(p, keys, policy, ids, side, quiet, False{}),
        draws_exact(p, keys, policy, quiet, M.repetition_key(p, ids), M.is_bare_kings(p)),
        Equal.trans(Maybe<T.Outcome>, C.draws(policy, quiet, C.count(M.repetition_key(p, ids), keys), M.is_bare_kings(p)),
          C.draws(policy, quiet, C.count(C.key(p, ids), keys), M.is_bare_kings(p)),
          C.draws(policy, quiet, C.count(C.key(p, ids), keys), C.bare(p)),
          Equal.cong(T.RepetitionKey, Maybe<T.Outcome>, key => C.draws(policy, quiet, C.count(key, keys), M.is_bare_kings(p)),
            M.repetition_key(p, ids), C.key(p, ids), Laws.repetition_key_exact(p, ids)),
          Equal.cong(Bool, Maybe<T.Outcome>, bare => C.draws(policy, quiet, C.count(C.key(p, ids), keys), bare),
            M.is_bare_kings(p), C.bare(p), Laws.only_bare_kings_material(p))))

def Laws.board_outcome_exact(p, keys, policy, ids):
  match p:
    case P.Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      empty_exact(p, keys, policy, ids, side, quiet, List.is_empty(&2, U32, ids))

def Laws.full_outcome_exact(p, keys, policy, forced):
  match forced:
    case T.NoOverride{}: Laws.board_outcome_exact(p, keys, policy, K.legal_ids(p))
    case T.Agreement{}: {==}
    case T.WhiteResigned{}: {==}
    case T.BlackResigned{}: {==}

def active_exact(result: Maybe<T.Outcome>) -> {M.live.result(result) == C.active(result) : Bool}:
  match result:
    case None{}: {==}
    case Some{value}: {==}

def Laws.actual_outcome_exact(m):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Laws.full_outcome_exact(state, keys, policy, forced)

def Laws.actual_live_exact(m):
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Equal.trans(Bool, M.live.result(M.outcome.forced(state, keys, policy, forced)),
        C.active(M.outcome.forced(state, keys, policy, forced)), C.active(C.expected(state, keys, policy, forced)),
        active_exact(M.outcome.forced(state, keys, policy, forced)),
        Equal.cong(Maybe<T.Outcome>, Bool, C.active,
          M.outcome.forced(state, keys, policy, forced), C.expected(state, keys, policy, forced),
          Laws.full_outcome_exact(state, keys, policy, forced)))
