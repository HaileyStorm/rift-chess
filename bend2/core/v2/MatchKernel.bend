# Additive v2 match controller, initially derived from immutable v1.
# Every board action and repetition/outcome enumeration uses the v2 relation.
import Base
import ../Model.bend as Model
import ./BoardSpec.bend as Spec
import ../MatchSpec.bend as Types

# Types.Match state is the pure session layer above a validated board position.  The
# host may supply identity, transport and timestamps, but it cannot choose the
# next board or adjudication result: those are derived here from Spec.

def same_side(a: Bool, b: Bool) -> Bool:
  match a b:
    case True{} True{}:
      True{}
    case False{} False{}:
      True{}
    case _ _:
      False{}

def board_equal(a: List<&2, U32>, b: List<&2, U32>) -> Bool:
  match a b:
    case Nil{} Nil{}:
      True{}
    case ah <> at bh <> bt:
      Bool.and(U32.is_eq(ah, bh), board_equal(at, bt))
    case _ _:
      False{}

def key_equal(a: Types.RepetitionKey, b: Types.RepetitionKey) -> Bool:
  match a b:
    case Types.RepKey{ab, ah, a_side, ar, ae, ap} Types.RepKey{bb, bh, b_side, br, be, bp}:
      Bool.and(board_equal(ab, bb),
        Bool.and(U32.is_eq(ah, bh),
          Bool.and(same_side(a_side, b_side),
            Bool.and(U32.is_eq(ar, br),
              Bool.and(U32.is_eq(ae, be), U32.is_eq(ap, bp))))))

def count_key(+key: Types.RepetitionKey, keys: List<&2, Types.RepetitionKey>) -> Nat:
  match keys:
    case Nil{}:
      0n
    case +h <> t:
      Nat.add(U32.to_nat(Bool.to_u32(key_equal(key, h))), count_key(key, t))

def append_u32(xs: List<&2, U32>, x: U32) -> List<&2, U32>:
  List.append(&2, U32, xs, x <> Nil{})

def append_position(xs: List<&2, Model.Position>, x: Model.Position) -> List<&2, Model.Position>:
  List.append(&2, Model.Position, xs, x <> Nil{})

def append_key(xs: List<&2, Types.RepetitionKey>, x: Types.RepetitionKey) -> List<&2, Types.RepetitionKey>:
  List.append(&2, Types.RepetitionKey, xs, x <> Nil{})

def drop_last_u32(xs: List<&2, U32>) -> List<&2, U32>:
  match xs:
    case Nil{}:
      Nil{}
    case h <> Nil{}:
      Nil{}
    case h <> t:
      h <> drop_last_u32(t)

def drop_last_positions(xs: List<&2, Model.Position>) -> List<&2, Model.Position>:
  match xs:
    case Nil{}:
      Nil{}
    case h <> Nil{}:
      Nil{}
    case h <> t:
      h <> drop_last_positions(t)

def drop_last_keys(xs: List<&2, Types.RepetitionKey>) -> List<&2, Types.RepetitionKey>:
  match xs:
    case Nil{}:
      Nil{}
    case h <> Nil{}:
      Nil{}
    case h <> t:
      h <> drop_last_keys(t)

def last_position(xs: List<&2, Model.Position>) -> Maybe<&2, Model.Position>:
  match xs:
    case Nil{}:
      None{}
    case h <> Nil{}:
      Some{h}
    case h <> t:
      last_position(t)

# This helper is split from repetition_key so the EP target is never retained
# without its matching pawn square.  The target 64 is the canonical sentinel.
def ep_pawn_for(epPawn: U32, ep: U32) -> U32:
  Bool.pick(U32, U32.is_eq(ep, Model.none_ep()), Model.none_ep(), epPawn)

def ep_action_id(+board: List<&2, U32>, ep: U32, +id: U32) -> Bool:
  +q = U32.div(id, 5)
  +from = U32.div(q, 64)
  +to = U32.mod(q, 64)
  Bool.and(U32.is_lt(id, 20480),
    Bool.and(U32.is_eq(to, ep),
      U32.is_eq(Model.piece_type(Model.board_get(board, from)), 1)))

def effective_ep.go(+board: List<&2, U32>, +ep: U32, ids: List<&2, U32>) -> U32:
  match ids:
    case Nil{}:
      Model.none_ep()
    case id <> rest:
      Bool.pick(U32, ep_action_id(board, ep, id), ep,
        effective_ep.go(board, ep, rest))

def effective_ep(+board: List<&2, U32>, +ep: U32, ids: List<&2, U32>) -> U32:
  Bool.pick(U32, U32.is_eq(ep, Model.none_ep()), Model.none_ep(),
    effective_ep.go(board, ep, ids))

def repetition_key.parts(+board: List<&2, U32>, holes: U32, side: Bool,
  rights: U32, ep: U32, epPawn: U32, legal: List<&2, U32>) -> Types.RepetitionKey:
  +effective = effective_ep(board, ep, legal)
  Types.RepKey{board, holes, side, rights, effective, ep_pawn_for(epPawn, effective)}

def repetition_key(p: Model.Position, legal: List<&2, U32>) -> Types.RepetitionKey:
  match p:
    case Model.Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      repetition_key.parts(board, holes, side, rights, ep, epPawn, legal)

def is_bare_kings.go(board: List<&2, U32>) -> Bool:
  match board:
    case Nil{}:
      True{}
    case +h <> t:
      Bool.and(Bool.or(U32.is_zero(h), U32.is_eq(Model.piece_type(h), 6)),
        is_bare_kings.go(t))

def is_bare_kings(p: Model.Position) -> Bool:
  match p:
    case Model.Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      is_bare_kings.go(board)

def board_outcome.checked(side: Bool, checked: Bool) -> Maybe<Types.Outcome>:
  match checked:
    case True{}:
      Some{Bool.pick(Types.Outcome, side, Types.BlackCheckmate{}, Types.WhiteCheckmate{})}
    case False{}:
      Some{Types.Stalemate{}}

def board_outcome.auto100(policy: Types.DrawPolicy, quiet: Nat) -> Maybe<Types.Outcome>:
  match policy:
    case Types.Auto100{}:
      Bool.pick(Maybe<Types.Outcome>, Nat.is_le(100n, quiet),
        Some{Types.Progress100{}}, None{})
    case _:
      None{}

def board_outcome.counted(p: Model.Position, +keys: List<&2, Types.RepetitionKey>,
  policy: Types.DrawPolicy, quiet: Nat, +key: Types.RepetitionKey, count: Nat,
  threefold: Bool) -> Maybe<Types.Outcome>:
  Bool.pick(Maybe<Types.Outcome>, threefold, Some{Types.Threefold{}},
    board_outcome.auto100(policy, quiet))

def board_outcome.bare(p: Model.Position, +keys: List<&2, Types.RepetitionKey>,
  policy: Types.DrawPolicy, quiet: Nat, +key: Types.RepetitionKey, bare: Bool) -> Maybe<Types.Outcome>:
  match bare:
    case True{}:
      Some{Types.BareKings{}}
    case False{}:
      board_outcome.counted(p, keys, policy, quiet, key,
        count_key(key, keys), Nat.is_ge(count_key(key, keys), 3n))

def board_outcome.empty(+p: Model.Position, keys: List<&2, Types.RepetitionKey>,
  policy: Types.DrawPolicy, legal: List<&2, U32>, +side: Bool, quiet: Nat,
  empty: Bool) -> Maybe<Types.Outcome>:
  match empty:
    case True{}:
      board_outcome.checked(side, Spec.in_check(p, side))
    case False{}:
      +key = repetition_key(p, legal)
      board_outcome.bare(p, keys, policy, quiet, key, is_bare_kings(p))

def board_outcome(+p: Model.Position, keys: List<&2, Types.RepetitionKey>, policy: Types.DrawPolicy,
  +legal: List<&2, U32>) -> Maybe<Types.Outcome>:
  match p:
    case Model.Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      board_outcome.empty(p, keys, policy, legal, side, quiet,
        List.is_empty(&2, U32, legal))

def outcome.forced(+state: Model.Position, keys: List<&2, Types.RepetitionKey>,
  policy: Types.DrawPolicy, forced: Types.Override) -> Maybe<Types.Outcome>:
  match forced:
    case Types.NoOverride{}:
      board_outcome(state, keys, policy, Spec.legal_ids(state))
    case Types.Agreement{}:
      Some{Types.Agreed{}}
    case Types.WhiteResigned{}:
      Some{Types.WhiteResignedOutcome{}}
    case Types.BlackResigned{}:
      Some{Types.BlackResignedOutcome{}}

def outcome(m: Types.Match) -> Maybe<Types.Outcome>:
  match m:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      outcome.forced(state, keys, policy, forced)

def live.result(result: Maybe<Types.Outcome>) -> Bool:
  match result:
    case None{}:
      True{}
    case Some{value}:
      False{}

def live(m: Types.Match) -> Bool:
  live.result(outcome(m))

def result_state(r: Types.StepResult) -> Types.Match:
  match r:
    case Types.Accepted{next}:
      next
    case Types.Rejected{old}:
      old

def command_expected(c: Types.Command) -> Nat:
  match c:
    case Types.MoveCommand{expected, action}:
      expected
    case Types.UndoCommand{expected}:
      expected
    case Types.OfferCommand{expected, side}:
      expected
    case Types.AcceptCommand{expected, side}:
      expected
    case Types.DeclineCommand{expected, side}:
      expected
    case Types.ResignCommand{expected, side}:
      expected

def revision_ok(m: Types.Match, c: Types.Command) -> Bool:
  match m:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Nat.is_eq(revision, command_expected(c))

def offer_is_none(offer: Types.DrawOffer) -> Bool:
  match offer:
    case Types.NoOffer{}:
      True{}
    case Types.Offered{side}:
      False{}

def offer_from_other(offer: Types.DrawOffer, side: Bool) -> Bool:
  match offer:
    case Types.NoOffer{}:
      False{}
    case Types.Offered{offered}:
      Bool.not(same_side(offered, side))

def apply_move(m: Types.Match, +action: U32) -> Types.Match:
  match m:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      +next = Spec.step(state, action)
      +legal = Spec.legal_ids(next)
      +key = repetition_key(next, legal)
      Types.Match{initial, next, append_u32(actions, action),
        append_position(states, next), append_key(keys, key),
        Nat.add(1n, revision), policy, Types.NoOffer{}, Types.NoOverride{}}

def apply_undo.parts.got(+initial: Model.Position, +actions: List<&2, U32>,
  +states: List<&2, Model.Position>, +keys: List<&2, Types.RepetitionKey>,
  revision: Nat, policy: Types.DrawPolicy,
  got: Maybe<&2, Model.Position>) -> Types.Match:
  match got:
    case None{}:
      Types.Match{initial, initial, actions, states, keys, Nat.add(1n, revision), policy,
        Types.NoOffer{}, Types.NoOverride{}}
    case Some{state}:
      Types.Match{initial, state, actions, states, keys,
        Nat.add(1n, revision), policy, Types.NoOffer{}, Types.NoOverride{}}

def apply_undo.parts(initial: Model.Position, actions: List<&2, U32>,
  +states: List<&2, Model.Position>, keys: List<&2, Types.RepetitionKey>,
  revision: Nat, policy: Types.DrawPolicy) -> Types.Match:
  apply_undo.parts.got(initial, actions, states, keys, revision, policy,
    last_position(states))

def apply_undo(m: Types.Match) -> Types.Match:
  match m:
    case Types.Match{initial, state, actions0, states0, keys0, revision, policy, offer, forced}:
      +states = drop_last_positions(states0)
      +actions = drop_last_u32(actions0)
      +keys = drop_last_keys(keys0)
      apply_undo.parts(initial, actions, states, keys, revision, policy)

def apply_offer(m: Types.Match, side: Bool) -> Types.Match:
  match m:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Types.Match{initial, state, actions, states, keys,
        Nat.add(1n, revision), policy, Types.Offered{side}, forced}

def apply_accept(m: Types.Match) -> Types.Match:
  match m:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Types.Match{initial, state, actions, states, keys,
        Nat.add(1n, revision), policy, Types.NoOffer{}, Types.Agreement{}}

def apply_decline(m: Types.Match) -> Types.Match:
  match m:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Types.Match{initial, state, actions, states, keys,
        Nat.add(1n, revision), policy, Types.NoOffer{}, forced}

def apply_resign(m: Types.Match, side: Bool) -> Types.Match:
  match m side:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced} True{}:
      Types.Match{initial, state, actions, states, keys,
        Nat.add(1n, revision), policy, Types.NoOffer{}, Types.WhiteResigned{}}
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced} False{}:
      Types.Match{initial, state, actions, states, keys,
        Nat.add(1n, revision), policy, Types.NoOffer{}, Types.BlackResigned{}}

def enabled_move(+m: Types.Match, action: U32) -> Bool:
  match m:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Bool.and(live(m), Spec.authorized(state, action))

def enabled_undo.actions(actions: List<&2, U32>) -> Bool:
  match actions:
    case Nil{}:
      False{}
    case _:
      True{}

def enabled_undo(m: Types.Match) -> Bool:
  match m:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      enabled_undo.actions(actions)

def enabled_command.kind(+m: Types.Match, c: Types.Command,
  actions: List<&2, U32>, offer: Types.DrawOffer) -> Bool:
  match c:
    case Types.MoveCommand{expected, action}:
      enabled_move(m, action)
    case Types.UndoCommand{expected}:
      enabled_undo.actions(actions)
    case Types.OfferCommand{expected, side}:
      Bool.and(live(m), offer_is_none(offer))
    case Types.AcceptCommand{expected, side}:
      Bool.and(live(m), offer_from_other(offer, side))
    case Types.DeclineCommand{expected, side}:
      Bool.and(live(m), offer_from_other(offer, side))
    case Types.ResignCommand{expected, side}:
      live(m)

def enabled_command.checked(+m: Types.Match, c: Types.Command,
  actions: List<&2, U32>, offer: Types.DrawOffer, revision_okay: Bool) -> Bool:
  Bool.and(revision_okay, enabled_command.kind(m, c, actions, offer))

def enabled_command(+m: Types.Match, +c: Types.Command) -> Bool:
  match m:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      enabled_command.checked(m, c, actions, offer, revision_ok(m, c))

def enabled(m: Types.Match, c: Types.Command) -> Bool:
  enabled_command(m, c)

def apply_enabled(m: Types.Match, c: Types.Command) -> Types.Match:
  match c:
    case Types.MoveCommand{expected, action}:
      apply_move(m, action)
    case Types.UndoCommand{expected}:
      apply_undo(m)
    case Types.OfferCommand{expected, side}:
      apply_offer(m, side)
    case Types.AcceptCommand{expected, side}:
      apply_accept(m)
    case Types.DeclineCommand{expected, side}:
      apply_decline(m)
    case Types.ResignCommand{expected, side}:
      apply_resign(m, side)

def step.decide(+m: Types.Match, +c: Types.Command, allowed: Bool) -> Types.StepResult:
  match allowed:
    case True{}:
      Types.Accepted{apply_enabled(m, c)}
    case False{}:
      Types.Rejected{m}

def step(+m: Types.Match, +c: Types.Command) -> Types.StepResult:
  step.decide(m, c, enabled(m, c))

def make_match(+p: Model.Position, policy: Types.DrawPolicy) -> Types.Match:
  +key = repetition_key(p, Spec.legal_ids(p))
  Types.Match{p, p, Nil{}, p <> Nil{}, key <> Nil{}, 0n, policy, Types.NoOffer{}, Types.NoOverride{}}

def from_position.checked(p: Model.Position, policy: Types.DrawPolicy,
  valid: Bool) -> Maybe<Types.Match>:
  Bool.pick(Maybe<Types.Match>, valid, Some{make_match(p, policy)}, None{})

def from_position(+p: Model.Position, policy: Types.DrawPolicy) -> Maybe<Types.Match>:
  from_position.checked(p, policy, Spec.valid(p))

def start(layout_b: Bool, policy: Types.DrawPolicy) -> Types.Match:
  make_match(Model.start(layout_b), policy)

def replay.go(commands: List<Types.Command>, m: Types.Match) -> Types.Match:
  match commands:
    case Nil{}:
      m
    case h <> t:
      replay.go(t, result_state(step(m, h)))

def replay(commands: List<Types.Command>, m: Types.Match) -> Types.Match:
  replay.go(commands, m)

def replay_from.checked(commands: List<Types.Command>, maybe: Maybe<Types.Match>) -> Maybe<Types.Match>:
  match maybe:
    case None{}:
      None{}
    case Some{game}:
      Some{replay(commands, game)}

def replay_from(p: Model.Position, policy: Types.DrawPolicy,
  commands: List<Types.Command>) -> Maybe<Types.Match>:
  replay_from.checked(commands, from_position(p, policy))

def state(m: Types.Match) -> Model.Position:
  match m:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: state

def revision(m: Types.Match) -> Nat:
  match m:
    case Types.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: revision

def accepted(result: Types.StepResult) -> Bool:
  match result:
    case Types.Accepted{next}: True{}
    case Types.Rejected{old}: False{}
