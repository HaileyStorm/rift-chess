import Base
import ./Model.bend as Model
import ./Spec.bend as Spec

# Match state is the pure session layer above a validated board position.  The
# host may supply identity, transport and timestamps, but it cannot choose the
# next board or adjudication result: those are derived here from Spec.

type DrawPolicy is Data:
  Prompt{}
  Auto100{}
  Off{}

type DrawOffer is Data:
  NoOffer{}
  Offered{side: Bool}

type Override is Data:
  NoOverride{}
  Agreement{}
  WhiteResigned{}
  BlackResigned{}

type Outcome is Data:
  WhiteCheckmate{}
  BlackCheckmate{}
  Stalemate{}
  BareKings{}
  Threefold{}
  Progress100{}
  Agreed{}
  WhiteResignedOutcome{}
  BlackResignedOutcome{}

# The key deliberately excludes quiet/full counters.  An en-passant target is
# retained only when the current legal action set contains that capture; a
# pinned or otherwise unavailable EP target therefore does not split a draw
# repetition.  The board list remains in canonical a1..h8 order.
type RepetitionKey is Data:
  RepKey{board: List<&2, U32>, holes: U32, side: Bool, rights: U32,
    ep: U32, epPawn: U32}

# Commands carry an optimistic-concurrency revision.  A rejected command is
# exactly inert, including revision, offer, override, and all history fields.
type Command is Data:
  MoveCommand{expected: Nat, action: U32}
  UndoCommand{expected: Nat}
  OfferCommand{expected: Nat, side: Bool}
  AcceptCommand{expected: Nat, side: Bool}
  DeclineCommand{expected: Nat, side: Bool}
  ResignCommand{expected: Nat, side: Bool}

type Match is Data:
  Match{initial: Model.Position, state: Model.Position,
    actions: List<&2, U32>, states: List<&2, Model.Position>,
    keys: List<&2, RepetitionKey>, revision: Nat, policy: DrawPolicy,
    offer: DrawOffer, forced: Override}

type StepResult is Data:
  Accepted{next: Match}
  Rejected{old: Match}

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

def key_equal(a: RepetitionKey, b: RepetitionKey) -> Bool:
  match a b:
    case RepKey{ab, ah, a_side, ar, ae, ap} RepKey{bb, bh, b_side, br, be, bp}:
      Bool.and(board_equal(ab, bb),
        Bool.and(U32.is_eq(ah, bh),
          Bool.and(same_side(a_side, b_side),
            Bool.and(U32.is_eq(ar, br),
              Bool.and(U32.is_eq(ae, be), U32.is_eq(ap, bp))))))

def count_key(+key: RepetitionKey, keys: List<&2, RepetitionKey>) -> Nat:
  match keys:
    case Nil{}:
      0n
    case +h <> t:
      Nat.add(U32.to_nat(Bool.to_u32(key_equal(key, h))), count_key(key, t))

def append_u32(xs: List<&2, U32>, x: U32) -> List<&2, U32>:
  List.append(&2, U32, xs, x <> Nil{})

def append_position(xs: List<&2, Model.Position>, x: Model.Position) -> List<&2, Model.Position>:
  List.append(&2, Model.Position, xs, x <> Nil{})

def append_key(xs: List<&2, RepetitionKey>, x: RepetitionKey) -> List<&2, RepetitionKey>:
  List.append(&2, RepetitionKey, xs, x <> Nil{})

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

def drop_last_keys(xs: List<&2, RepetitionKey>) -> List<&2, RepetitionKey>:
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
  rights: U32, ep: U32, epPawn: U32, legal: List<&2, U32>) -> RepetitionKey:
  +effective = effective_ep(board, ep, legal)
  RepKey{board, holes, side, rights, effective, ep_pawn_for(epPawn, effective)}

def repetition_key(p: Model.Position, legal: List<&2, U32>) -> RepetitionKey:
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

def board_outcome.checked(side: Bool, checked: Bool) -> Maybe<Outcome>:
  match checked:
    case True{}:
      Some{Bool.pick(Outcome, side, BlackCheckmate{}, WhiteCheckmate{})}
    case False{}:
      Some{Stalemate{}}

def board_outcome.auto100(policy: DrawPolicy, quiet: Nat) -> Maybe<Outcome>:
  match policy:
    case Auto100{}:
      Bool.pick(Maybe<Outcome>, Nat.is_le(100n, quiet),
        Some{Progress100{}}, None{})
    case _:
      None{}

def board_outcome.counted(p: Model.Position, +keys: List<&2, RepetitionKey>,
  policy: DrawPolicy, quiet: Nat, +key: RepetitionKey, count: Nat,
  threefold: Bool) -> Maybe<Outcome>:
  Bool.pick(Maybe<Outcome>, threefold, Some{Threefold{}},
    board_outcome.auto100(policy, quiet))

def board_outcome.bare(p: Model.Position, +keys: List<&2, RepetitionKey>,
  policy: DrawPolicy, quiet: Nat, +key: RepetitionKey, bare: Bool) -> Maybe<Outcome>:
  match bare:
    case True{}:
      Some{BareKings{}}
    case False{}:
      board_outcome.counted(p, keys, policy, quiet, key,
        count_key(key, keys), Nat.is_ge(count_key(key, keys), 3n))

def board_outcome.empty(+p: Model.Position, keys: List<&2, RepetitionKey>,
  policy: DrawPolicy, legal: List<&2, U32>, +side: Bool, quiet: Nat,
  empty: Bool) -> Maybe<Outcome>:
  match empty:
    case True{}:
      board_outcome.checked(side, Spec.in_check(p, side))
    case False{}:
      +key = repetition_key(p, legal)
      board_outcome.bare(p, keys, policy, quiet, key, is_bare_kings(p))

def board_outcome(+p: Model.Position, keys: List<&2, RepetitionKey>, policy: DrawPolicy,
  +legal: List<&2, U32>) -> Maybe<Outcome>:
  match p:
    case Model.Pos{board, holes, side, rights, ep, epPawn, quiet, full}:
      board_outcome.empty(p, keys, policy, legal, side, quiet,
        List.is_empty(&2, U32, legal))

def outcome.forced(+state: Model.Position, keys: List<&2, RepetitionKey>,
  policy: DrawPolicy, forced: Override) -> Maybe<Outcome>:
  match forced:
    case NoOverride{}:
      board_outcome(state, keys, policy, Spec.legal_ids(state))
    case Agreement{}:
      Some{Agreed{}}
    case WhiteResigned{}:
      Some{WhiteResignedOutcome{}}
    case BlackResigned{}:
      Some{BlackResignedOutcome{}}

def outcome(m: Match) -> Maybe<Outcome>:
  match m:
    case Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      outcome.forced(state, keys, policy, forced)

def live.result(result: Maybe<Outcome>) -> Bool:
  match result:
    case None{}:
      True{}
    case Some{value}:
      False{}

def live(m: Match) -> Bool:
  live.result(outcome(m))

def result_state(r: StepResult) -> Match:
  match r:
    case Accepted{next}:
      next
    case Rejected{old}:
      old

def command_expected(c: Command) -> Nat:
  match c:
    case MoveCommand{expected, action}:
      expected
    case UndoCommand{expected}:
      expected
    case OfferCommand{expected, side}:
      expected
    case AcceptCommand{expected, side}:
      expected
    case DeclineCommand{expected, side}:
      expected
    case ResignCommand{expected, side}:
      expected

def revision_ok(m: Match, c: Command) -> Bool:
  match m:
    case Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Nat.is_eq(revision, command_expected(c))

def offer_is_none(offer: DrawOffer) -> Bool:
  match offer:
    case NoOffer{}:
      True{}
    case Offered{side}:
      False{}

def offer_from_other(offer: DrawOffer, side: Bool) -> Bool:
  match offer:
    case NoOffer{}:
      False{}
    case Offered{offered}:
      Bool.not(same_side(offered, side))

def apply_move(m: Match, +action: U32) -> Match:
  match m:
    case Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      +next = Spec.step(state, action)
      +legal = Spec.legal_ids(next)
      +key = repetition_key(next, legal)
      Match{initial, next, append_u32(actions, action),
        append_position(states, next), append_key(keys, key),
        Nat.add(1n, revision), policy, NoOffer{}, NoOverride{}}

def apply_undo.parts.got(+initial: Model.Position, +actions: List<&2, U32>,
  +states: List<&2, Model.Position>, +keys: List<&2, RepetitionKey>,
  revision: Nat, policy: DrawPolicy,
  got: Maybe<&2, Model.Position>) -> Match:
  match got:
    case None{}:
      Match{initial, initial, actions, states, keys, revision, policy,
        NoOffer{}, NoOverride{}}
    case Some{state}:
      Match{initial, state, actions, states, keys,
        Nat.add(1n, revision), policy, NoOffer{}, NoOverride{}}

def apply_undo.parts(initial: Model.Position, actions: List<&2, U32>,
  +states: List<&2, Model.Position>, keys: List<&2, RepetitionKey>,
  revision: Nat, policy: DrawPolicy) -> Match:
  apply_undo.parts.got(initial, actions, states, keys, revision, policy,
    last_position(states))

def apply_undo(m: Match) -> Match:
  match m:
    case Match{initial, state, actions0, states0, keys0, revision, policy, offer, forced}:
      +states = drop_last_positions(states0)
      +actions = drop_last_u32(actions0)
      +keys = drop_last_keys(keys0)
      apply_undo.parts(initial, actions, states, keys, revision, policy)

def apply_offer(m: Match, side: Bool) -> Match:
  match m:
    case Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Match{initial, state, actions, states, keys,
        Nat.add(1n, revision), policy, Offered{side}, forced}

def apply_accept(m: Match) -> Match:
  match m:
    case Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Match{initial, state, actions, states, keys,
        Nat.add(1n, revision), policy, NoOffer{}, Agreement{}}

def apply_decline(m: Match) -> Match:
  match m:
    case Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Match{initial, state, actions, states, keys,
        Nat.add(1n, revision), policy, NoOffer{}, forced}

def apply_resign(m: Match, side: Bool) -> Match:
  match m side:
    case Match{initial, state, actions, states, keys, revision, policy, offer, forced} True{}:
      Match{initial, state, actions, states, keys,
        Nat.add(1n, revision), policy, NoOffer{}, WhiteResigned{}}
    case Match{initial, state, actions, states, keys, revision, policy, offer, forced} False{}:
      Match{initial, state, actions, states, keys,
        Nat.add(1n, revision), policy, NoOffer{}, BlackResigned{}}

def enabled_move(+m: Match, action: U32) -> Bool:
  match m:
    case Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Bool.and(live(m), Spec.authorized(state, action))

def enabled_undo.actions(actions: List<&2, U32>) -> Bool:
  match actions:
    case Nil{}:
      False{}
    case _:
      True{}

def enabled_undo(m: Match) -> Bool:
  match m:
    case Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      enabled_undo.actions(actions)

def enabled_command.kind(+m: Match, c: Command,
  actions: List<&2, U32>, offer: DrawOffer) -> Bool:
  match c:
    case MoveCommand{expected, action}:
      enabled_move(m, action)
    case UndoCommand{expected}:
      enabled_undo.actions(actions)
    case OfferCommand{expected, side}:
      Bool.and(live(m), offer_is_none(offer))
    case AcceptCommand{expected, side}:
      Bool.and(live(m), offer_from_other(offer, side))
    case DeclineCommand{expected, side}:
      Bool.and(live(m), offer_from_other(offer, side))
    case ResignCommand{expected, side}:
      live(m)

def enabled_command.checked(+m: Match, c: Command,
  actions: List<&2, U32>, offer: DrawOffer, revision_okay: Bool) -> Bool:
  Bool.and(revision_okay, enabled_command.kind(m, c, actions, offer))

def enabled_command(+m: Match, +c: Command) -> Bool:
  match m:
    case Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      enabled_command.checked(m, c, actions, offer, revision_ok(m, c))

def enabled(m: Match, c: Command) -> Bool:
  enabled_command(m, c)

def apply_enabled(m: Match, c: Command) -> Match:
  match c:
    case MoveCommand{expected, action}:
      apply_move(m, action)
    case UndoCommand{expected}:
      apply_undo(m)
    case OfferCommand{expected, side}:
      apply_offer(m, side)
    case AcceptCommand{expected, side}:
      apply_accept(m)
    case DeclineCommand{expected, side}:
      apply_decline(m)
    case ResignCommand{expected, side}:
      apply_resign(m, side)

def step.decide(+m: Match, +c: Command, allowed: Bool) -> StepResult:
  match allowed:
    case True{}:
      Accepted{apply_enabled(m, c)}
    case False{}:
      Rejected{m}

def step(+m: Match, +c: Command) -> StepResult:
  step.decide(m, c, enabled(m, c))

def make_match(+p: Model.Position, policy: DrawPolicy) -> Match:
  +key = repetition_key(p, Spec.legal_ids(p))
  Match{p, p, Nil{}, p <> Nil{}, key <> Nil{}, 0n, policy, NoOffer{}, NoOverride{}}

def from_position.checked(p: Model.Position, policy: DrawPolicy,
  valid: Bool) -> Maybe<Match>:
  Bool.pick(Maybe<Match>, valid, Some{make_match(p, policy)}, None{})

def from_position(+p: Model.Position, policy: DrawPolicy) -> Maybe<Match>:
  from_position.checked(p, policy, Spec.valid(p))

def start(layout_b: Bool, policy: DrawPolicy) -> Match:
  make_match(Model.start(layout_b), policy)

def replay.go(commands: List<Command>, m: Match) -> Match:
  match commands:
    case Nil{}:
      m
    case h <> t:
      replay.go(t, result_state(step(m, h)))

def replay(commands: List<Command>, m: Match) -> Match:
  replay.go(commands, m)

def replay_from.checked(commands: List<Command>, maybe: Maybe<Match>) -> Maybe<Match>:
  match maybe:
    case None{}:
      None{}
    case Some{game}:
      Some{replay(commands, game)}

def replay_from(p: Model.Position, policy: DrawPolicy,
  commands: List<Command>) -> Maybe<Match>:
  replay_from.checked(commands, from_position(p, policy))
