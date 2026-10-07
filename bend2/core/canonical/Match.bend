# Canonical Match carrier. Every Ready binds its IDs to the frozen v2 state.
# Proof fields erase at runtime; only the trusted controller constructs Ready.
import Base
import ../Model.bend as P
import ../MatchSpec.bend as T
import ../v2/BoardSpec.bend as S
import ../v2/MatchKernel.bend as M

type Ready is Data:
  Ready{game: T.Match, ids: List<&2, U32>, certificate: {ids == S.legal_ids(M.state(game)) : List<&2, U32>}}

type Reply is Data:
  Accepted{next: Ready}
  Rejected{old: Ready}

def game(r: Ready) -> T.Match:
  match r:
    case Ready{m, _, _}: m

def ids(r: Ready) -> List<&2, U32>:
  match r:
    case Ready{_, legal, _}: legal

def certified(+r: Ready) -> {ids(r) == S.legal_ids(M.state(game(r))) : List<&2, U32>}:
  match r:
    case Ready{m, legal, certificate}: certificate

def prepare(+m: T.Match) -> Ready:
  legal = S.legal_ids(M.state(m))
  Ready{m, legal, {==}}

def prepare_exact(+m: T.Match) -> {game(prepare(m)) == m : T.Match}:
  {==}

def prepare_canonical(+m: T.Match) -> {ids(prepare(m)) == S.legal_ids(M.state(m)) : List<&2, U32>}:
  {==}

def outcome.forced(+state: P.Position, keys: List<&2, T.RepetitionKey>, policy: T.DrawPolicy, forced: T.Override, legal: List<&2, U32>) -> Maybe<T.Outcome>:
  match forced:
    case T.NoOverride{}: M.board_outcome(state, keys, policy, legal)
    case T.Agreement{}: Some{T.Agreed{}}
    case T.WhiteResigned{}: Some{T.WhiteResignedOutcome{}}
    case T.BlackResigned{}: Some{T.BlackResignedOutcome{}}

def outcome.game(m: T.Match, legal: List<&2, U32>) -> Maybe<T.Outcome>:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      outcome.forced(state, keys, policy, forced, legal)

def outcome(r: Ready) -> Maybe<T.Outcome>:
  match r:
    case Ready{m, legal, _}: outcome.game(m, legal)

def outcome_exact.forced(+state: P.Position, +keys: List<&2, T.RepetitionKey>, +policy: T.DrawPolicy, +forced: T.Override, +legal: List<&2, U32>, certificate: {legal == S.legal_ids(state) : List<&2, U32>}) -> {outcome.forced(state, keys, policy, forced, legal) == M.outcome.forced(state, keys, policy, forced) : Maybe<T.Outcome>}:
  match forced:
    case T.NoOverride{}:
      Equal.cong(List<&2, U32>, Maybe<T.Outcome>, values => M.board_outcome(state, keys, policy, values), legal, S.legal_ids(state), certificate)
    case T.Agreement{}: {==}
    case T.WhiteResigned{}: {==}
    case T.BlackResigned{}: {==}

def outcome_exact.game(+m: T.Match, +legal: List<&2, U32>, certificate: {legal == S.legal_ids(M.state(m)) : List<&2, U32>}) -> {outcome.game(m, legal) == M.outcome(m) : Maybe<T.Outcome>}:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      outcome_exact.forced(state, keys, policy, forced, legal, certificate)

def outcome_exact(+r: Ready) -> {outcome(r) == M.outcome(game(r)) : Maybe<T.Outcome>}:
  match r:
    case Ready{m, legal, certificate}: outcome_exact.game(m, legal, certificate)

def enabled.kind(+m: T.Match, c: T.Command, actions: List<&2, U32>, offer: T.DrawOffer, +live: Bool) -> Bool:
  match c:
    case T.MoveCommand{expected, action}: Bool.and(live, S.authorized(M.state(m), action))
    case T.UndoCommand{expected}: M.enabled_undo.actions(actions)
    case T.OfferCommand{expected, side}: Bool.and(live, M.offer_is_none(offer))
    case T.AcceptCommand{expected, side}: Bool.and(live, M.offer_from_other(offer, side))
    case T.DeclineCommand{expected, side}: Bool.and(live, M.offer_from_other(offer, side))
    case T.ResignCommand{expected, side}: live

def enabled.game(+m: T.Match, +c: T.Command, live: Bool) -> Bool:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      Bool.and(M.revision_ok(m, c), enabled.kind(m, c, actions, offer, live))

def enabled(+r: Ready, c: T.Command) -> Bool:
  enabled.game(game(r), c, M.live.result(outcome(r)))

def enabled_exact.game(+m: T.Match, +c: T.Command, +legal: List<&2, U32>, certificate: {legal == S.legal_ids(M.state(m)) : List<&2, U32>}) -> {enabled.game(m, c, M.live.result(outcome.game(m, legal))) == M.enabled(m, c) : Bool}:
  match m c:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.MoveCommand{expected, action}:
      Equal.cong(Maybe<T.Outcome>, Bool, o => Bool.and(M.revision_ok(m, c), Bool.and(M.live.result(o), S.authorized(state, action))), outcome.game(m, legal), M.outcome(m), outcome_exact.game(m, legal, certificate))
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.UndoCommand{expected}: {==}
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.OfferCommand{expected, side}:
      Equal.cong(Maybe<T.Outcome>, Bool, o => Bool.and(M.revision_ok(m, c), Bool.and(M.live.result(o), M.offer_is_none(offer))), outcome.game(m, legal), M.outcome(m), outcome_exact.game(m, legal, certificate))
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.AcceptCommand{expected, side}:
      Equal.cong(Maybe<T.Outcome>, Bool, o => Bool.and(M.revision_ok(m, c), Bool.and(M.live.result(o), M.offer_from_other(offer, side))), outcome.game(m, legal), M.outcome(m), outcome_exact.game(m, legal, certificate))
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.DeclineCommand{expected, side}:
      Equal.cong(Maybe<T.Outcome>, Bool, o => Bool.and(M.revision_ok(m, c), Bool.and(M.live.result(o), M.offer_from_other(offer, side))), outcome.game(m, legal), M.outcome(m), outcome_exact.game(m, legal, certificate))
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.ResignCommand{expected, side}:
      Equal.cong(Maybe<T.Outcome>, Bool, o => Bool.and(M.revision_ok(m, c), M.live.result(o)), outcome.game(m, legal), M.outcome(m), outcome_exact.game(m, legal, certificate))

def enabled_exact(+r: Ready, +c: T.Command) -> {enabled(r, c) == M.enabled(game(r), c) : Bool}:
  match r:
    case Ready{m, legal, certificate}: enabled_exact.game(m, c, legal, certificate)

def apply_move(m: T.Match, +action: U32) -> Ready:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}:
      +next = S.step(state, action)
      +legal = S.legal_ids(next)
      +key = M.repetition_key(next, legal)
      next_game: T.Match = T.Match{initial, next, M.append_u32(actions, action), M.append_position(states, next), M.append_key(keys, key), Nat.add(1n, revision), policy, T.NoOffer{}, T.NoOverride{}}
      Ready{next_game, legal, {==}}

def apply_move_exact(+m: T.Match, +action: U32) -> {game(apply_move(m, action)) == M.apply_move(m, action) : T.Match}:
  match m:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced}: {==}

def resign(+m: T.Match, side: Bool, +legal: List<&2, U32>, +certificate: {legal == S.legal_ids(M.state(m)) : List<&2, U32>}) -> Ready:
  match m side:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} True{}: Ready{M.apply_resign(m, True{}), legal, certificate}
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} False{}: Ready{M.apply_resign(m, False{}), legal, certificate}

def resign_exact(+m: T.Match, +side: Bool, +legal: List<&2, U32>, +certificate: {legal == S.legal_ids(M.state(m)) : List<&2, U32>}) -> {game(resign(m, side, legal, certificate)) == M.apply_resign(m, side) : T.Match}:
  match m side:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} True{}: {==}
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} False{}: {==}

def apply_enabled.game(+m: T.Match, c: T.Command, +legal: List<&2, U32>, +certificate: {legal == S.legal_ids(M.state(m)) : List<&2, U32>}) -> Ready:
  match m c:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.MoveCommand{expected, action}: apply_move(m, action)
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.UndoCommand{expected}: prepare(M.apply_undo(m))
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.OfferCommand{expected, side}: Ready{M.apply_offer(m, side), legal, certificate}
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.AcceptCommand{expected, side}: Ready{M.apply_accept(m), legal, certificate}
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.DeclineCommand{expected, side}: Ready{M.apply_decline(m), legal, certificate}
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.ResignCommand{expected, side}:
      resign(m, side, legal, certificate)

def apply_enabled(r: Ready, c: T.Command) -> Ready:
  match r:
    case Ready{m, legal, certificate}: apply_enabled.game(m, c, legal, certificate)

def apply_enabled_exact.game(+m: T.Match, +c: T.Command, +legal: List<&2, U32>, +certificate: {legal == S.legal_ids(M.state(m)) : List<&2, U32>}) -> {game(apply_enabled.game(m, c, legal, certificate)) == M.apply_enabled(m, c) : T.Match}:
  match m c:
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.MoveCommand{expected, action}: apply_move_exact(m, action)
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.UndoCommand{expected}: {==}
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.OfferCommand{expected, side}: {==}
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.AcceptCommand{expected, side}: {==}
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.DeclineCommand{expected, side}: {==}
    case T.Match{initial, state, actions, states, keys, revision, policy, offer, forced} T.ResignCommand{expected, side}: resign_exact(m, side, legal, certificate)

def apply_enabled_exact(+r: Ready, +c: T.Command) -> {game(apply_enabled(r, c)) == M.apply_enabled(game(r), c) : T.Match}:
  match r:
    case Ready{m, legal, certificate}: apply_enabled_exact.game(m, c, legal, certificate)

def erase(reply: Reply) -> T.StepResult:
  match reply:
    case Accepted{next}: T.Accepted{game(next)}
    case Rejected{old}: T.Rejected{game(old)}

def decide(+r: Ready, +c: T.Command, allowed: Bool) -> Reply:
  match allowed:
    case False{}: Rejected{r}
    case True{}: Accepted{apply_enabled(r, c)}

def decide_exact(allowed: Bool, +r: Ready, +c: T.Command) -> {erase(decide(r, c, allowed)) == M.step.decide(game(r), c, allowed) : T.StepResult}:
  match allowed:
    case False{}: {==}
    case True{}: Equal.cong(T.Match, T.StepResult, next => T.Accepted{next}, game(apply_enabled(r, c)), M.apply_enabled(game(r), c), apply_enabled_exact(r, c))

def command(+r: Ready, +c: T.Command) -> Reply:
  decide(r, c, enabled(r, c))

def command_exact(+r: Ready, +c: T.Command) -> {erase(command(r, c)) == M.step(game(r), c) : T.StepResult}:
  Equal.trans(T.StepResult, erase(command(r, c)), M.step.decide(game(r), c, enabled(r, c)), M.step(game(r), c), decide_exact(enabled(r, c), r, c), Equal.cong(Bool, T.StepResult, allowed => M.step.decide(game(r), c, allowed), enabled(r, c), M.enabled(game(r), c), enabled_exact(r, c)))

def rejected_exact(+r: Ready, +c: T.Command) -> {decide(r, c, False{}) == Rejected{r} : Reply}:
  {==}

def make_match(+p: P.Position, policy: T.DrawPolicy) -> Ready:
  +legal = S.legal_ids(p)
  key = M.repetition_key(p, legal)
  m: T.Match = T.Match{p, p, [], [p], [key], 0n, policy, T.NoOffer{}, T.NoOverride{}}
  Ready{m, legal, {==}}

def make_match_exact(+p: P.Position, +policy: T.DrawPolicy) -> {game(make_match(p, policy)) == M.make_match(p, policy) : T.Match}:
  {==}

def start(layout: Bool, policy: T.DrawPolicy) -> Ready:
  make_match(P.start(layout), policy)

def start_exact(+layout: Bool, +policy: T.DrawPolicy) -> {game(start(layout, policy)) == M.start(layout, policy) : T.Match}:
  make_match_exact(P.start(layout), policy)
