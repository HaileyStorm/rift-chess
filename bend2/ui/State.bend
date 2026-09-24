# Controller state and the pure predicates derived from it. Legality and
# adjudication are cached answers from the frozen kernel, never recomputed here.
import Base
import ../core/Model.bend as Model
import ../core/v2/BoardSpec.bend as Spec
import ../core/v2/Facade.bend as Kernel
import ../core/MatchSpec.bend as Match
import ../graphics/Camera.bend as Camera
import ./Types.bend as Types
import ./Codec.bend as Codec

type Reminder is Data:
  Reminder{white: Bool, black: Bool}

type Replay is Data:
  Replay{candidate: Match.Match, remaining: List<&2, Match.Command>, record: Codec.Record, text: String, imported: Bool, done: U32, total: U32, preferenceFallback: Bool, reminded: Reminder}

# A gesture in progress: a camera orbit, or a board press that may end as a
# drag-and-drop move. `toggle` defers deselecting a re-pressed piece to release.
type Pointer is Data:
  Pointer{orbiting: Bool, x: U32, y: U32, view: Camera.View, press: U32, toggle: Bool}

# `pending` is a promotion awaiting its piece choice; `intent` is an accepted
# click whose kernel command runs on the next Tick, after its frame is shown.
type State is Data:
  State{game: Match.Match, pos: Model.Position, legal: List<&2, U32>, meta: Types.Meta, prefs: Types.Preferences, panels: Types.Panels, journal: List<&2, Match.Command>, history: List<&2, String>, previous: Model.Position, last: U32, elapsed: U32, selected: U32, tile: U32, hover: U32, focus: U32, width: U32, height: U32, pointer: Pointer, pending: U32, intent: U32, raw: String, replay: Maybe<&2, Replay>, reminded: Reminder}

type Update is Data:
  Update{state: State, effects: List<&2, Types.Effect>, redraw: U32, after: U32}

# BEGIN GENERATED ACCESSORS: State replay=replay_state
def game(s: State) -> Match.Match:
  match s:
    case State{game, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: game

def set_game(s: State, v: Match.Match) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{v, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def pos(s: State) -> Model.Position:
  match s:
    case State{_, pos, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: pos

def set_pos(s: State, v: Model.Position) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, v, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def legal(s: State) -> List<&2, U32>:
  match s:
    case State{_, _, legal, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: legal

def set_legal(s: State, v: List<&2, U32>) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, v, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def meta(s: State) -> Types.Meta:
  match s:
    case State{_, _, _, meta, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: meta

def set_meta(s: State, v: Types.Meta) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, v, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def prefs(s: State) -> Types.Preferences:
  match s:
    case State{_, _, _, _, prefs, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: prefs

def set_prefs(s: State, v: Types.Preferences) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, v, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def panels(s: State) -> Types.Panels:
  match s:
    case State{_, _, _, _, _, panels, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: panels

def set_panels(s: State, v: Types.Panels) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, v, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def journal(s: State) -> List<&2, Match.Command>:
  match s:
    case State{_, _, _, _, _, _, journal, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: journal

def set_journal(s: State, v: List<&2, Match.Command>) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, v, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def history(s: State) -> List<&2, String>:
  match s:
    case State{_, _, _, _, _, _, _, history, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: history

def set_history(s: State, v: List<&2, String>) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, v, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def previous(s: State) -> Model.Position:
  match s:
    case State{_, _, _, _, _, _, _, _, previous, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: previous

def set_previous(s: State, v: Model.Position) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, v, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def last(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, last, _, _, _, _, _, _, _, _, _, _, _, _, _}: last

def set_last(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, v, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def elapsed(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, elapsed, _, _, _, _, _, _, _, _, _, _, _, _}: elapsed

def set_elapsed(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, v, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def selected(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, selected, _, _, _, _, _, _, _, _, _, _, _}: selected

def set_selected(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, v, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def tile(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, tile, _, _, _, _, _, _, _, _, _, _}: tile

def set_tile(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, v, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def hover(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, hover, _, _, _, _, _, _, _, _, _}: hover

def set_hover(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, v, focus, width, height, pointer, pending, intent, raw, replay, reminded}

def focus(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, focus, _, _, _, _, _, _, _, _}: focus

def set_focus(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, v, width, height, pointer, pending, intent, raw, replay, reminded}

def width(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, width, _, _, _, _, _, _, _}: width

def set_width(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, v, height, pointer, pending, intent, raw, replay, reminded}

def height(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, height, _, _, _, _, _, _}: height

def set_height(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, v, pointer, pending, intent, raw, replay, reminded}

def pointer(s: State) -> Pointer:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, pointer, _, _, _, _, _}: pointer

def set_pointer(s: State, v: Pointer) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, v, pending, intent, raw, replay, reminded}

def pending(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, pending, _, _, _, _}: pending

def set_pending(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, v, intent, raw, replay, reminded}

def intent(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, intent, _, _, _}: intent

def set_intent(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, v, raw, replay, reminded}

def raw(s: State) -> String:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, raw, _, _}: raw

def set_raw(s: State, v: String) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, v, replay, reminded}

def replay_state(s: State) -> Maybe<&2, Replay>:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, replay, _}: replay

def set_replay(s: State, v: Maybe<&2, Replay>) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, v, reminded}

def reminded(s: State) -> Reminder:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, reminded}: reminded

def set_reminded(s: State, v: Reminder) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, pointer, pending, intent, raw, replay, v}
# END GENERATED ACCESSORS

# BEGIN GENERATED ACCESSORS: Pointer prefix=pointer_ getters
def pointer_orbiting(s: Pointer) -> Bool:
  match s:
    case Pointer{orbiting, _, _, _, _, _}: orbiting

def pointer_x(s: Pointer) -> U32:
  match s:
    case Pointer{_, x, _, _, _, _}: x

def pointer_y(s: Pointer) -> U32:
  match s:
    case Pointer{_, _, y, _, _, _}: y

def pointer_view(s: Pointer) -> Camera.View:
  match s:
    case Pointer{_, _, _, view, _, _}: view

def pointer_press(s: Pointer) -> U32:
  match s:
    case Pointer{_, _, _, _, press, _}: press

def pointer_toggle(s: Pointer) -> Bool:
  match s:
    case Pointer{_, _, _, _, _, toggle}: toggle
# END GENERATED ACCESSORS

def released(+x: U32, +y: U32, +view: Camera.View) -> Pointer:
  Pointer{False{}, x, y, view, 64, False{}}

def orbiting(s: State) -> Bool:
  pointer_orbiting(pointer(s))

def reminder_seen(r: Reminder, side: Bool) -> Bool:
  match r:
    case Reminder{white, black}: Bool.pick(Bool, side, white, black)

def reminder_flags(r: Reminder, quiet: Nat, +prompt: Bool, +side: Bool) -> Reminder:
  match r:
    case Reminder{white, black}:
      Bool.pick(Reminder, Nat.is_lt(quiet, 100n), Reminder{False{}, False{}}, Reminder{Bool.or(white, Bool.and(prompt, side)), Bool.or(black, Bool.and(prompt, Bool.not(side)))})

def reminder_policy(r: Reminder, +p: Model.Position, pol: Match.DrawPolicy) -> Reminder:
  match pol:
    case Match.Prompt{}: reminder_flags(r, Model.pos_quiet(p), True{}, Model.pos_side(p))
    case _: reminder_flags(r, Model.pos_quiet(p), False{}, Model.pos_side(p))

def reminder_match(r: Reminder, g: Match.Match) -> Reminder:
  match g:
    case Match.Match{_, p, _, _, _, _, pol, _, _}:
      reminder_policy(r, p, pol)

def has_replay(r: Maybe<&2, Replay>) -> Bool:
  match r:
    case None{}: False{}
    case Some{_}: True{}

def replaying(s: State) -> Bool:
  has_replay(replay_state(s))

def policy(v: U32) -> Match.DrawPolicy:
  match v:
    case 1: Match.Auto100{}
    case 2: Match.Off{}
    case _: Match.Prompt{}

def outcome(v: Maybe<Match.Outcome>) -> U32:
  match v:
    case None{}: 0
    case Some{Match.WhiteCheckmate{}}: 1
    case Some{Match.BlackCheckmate{}}: 2
    case Some{Match.Stalemate{}}: 3
    case Some{Match.BareKings{}}: 4
    case Some{Match.Threefold{}}: 5
    case Some{Match.Progress100{}}: 6
    case Some{Match.Agreed{}}: 7
    case Some{Match.WhiteResignedOutcome{}}: 8
    case Some{Match.BlackResignedOutcome{}}: 9

def end_code(f: Match.Override, +p: Model.Position, keys: List<&2, Match.RepetitionKey>, pol: Match.DrawPolicy, ids: List<&2, U32>) -> U32:
  match f:
    case Match.NoOverride{}: outcome(Kernel.board_outcome(p, keys, pol, ids))
    case Match.Agreement{}: 7
    case Match.WhiteResigned{}: 8
    case Match.BlackResigned{}: 9

def offer_code(o: Match.DrawOffer) -> U32:
  match o:
    case Match.NoOffer{}: 0
    case Match.Offered{side}: Bool.pick(U32, side, 1, 2)

def refreshed.with_ids(+s: State, +g: Match.Match, +ids: List<&2, U32>) -> State:
  match g:
    case Match.Match{initial, +p, actions, states, keys, rev, pol, offer, forced}:
      +end = end_code(forced, p, keys, pol, ids)
      +m = meta(s)
      set_meta(set_legal(set_pos(set_game(s, g), p), Bool.pick(List<&2, U32>, U32.is_eq(end, 0), ids, [])), Types.Meta{U32.from_nat(rev), Model.pos_side(p), Spec.in_check(p, Model.pos_side(p)), end, offer_code(offer), Bool.not(List.is_empty(&2, U32, actions)), Types.meta_botPaused(m), Types.meta_recovery(m)})

# The full refresh is required whenever the position may have changed. The
# balanced ID enumeration is inert on JavaScript and can offload natively.
def refreshed(+s: State, +g: Match.Match) -> State:
  match g:
    case Match.Match{initial, +p, actions, states, keys, rev, pol, offer, forced}:
      +ids = Kernel.legal_ids!(p)
      refreshed.with_ids(s, g, ids)

# Caller contract: only use after an accepted Offer/Accept/Decline/Resign.
# MatchKernel preserves the position, action history and repetition keys for
# those commands, so the state's legal cache is still the answer for `p`.
# Outcome, offer, revision and all presentation metadata are still recomputed
# from the accepted Match; terminal states still clear the cached legal IDs.
def refreshed_same_position(+s: State, +g: Match.Match) -> State:
  refreshed.with_ids(s, g, legal(s))

def revision(s: State) -> Nat:
  U32.to_nat(Types.meta_revision(meta(s)))

def mode(s: State) -> U32:
  Types.preferences_mode(prefs(s))

def view(s: State) -> Camera.View:
  Types.preferences_view(prefs(s))

# Portrait layout is chosen only when it would draw the application larger.
def mobile(+s: State) -> Bool:
  +w = U32.to_f32(width(s))
  +h = U32.to_f32(height(s))
  F32.is_gt(F32.min(F32.div(w, 512.0), F32.div(h, 1024.0)), F32.min(F32.div(w, 1024.0), F32.div(h, 800.0)))

def moving(+s: State) -> Bool:
  U32.is_lt(elapsed(s), 240)

def staged(+s: State) -> Bool:
  U32.is_lt(intent(s), 21760)

def outcome_code(+s: State) -> U32:
  Types.meta_outcome(meta(s))

def bot_turn(+s: State) -> Bool:
  Bool.and(Bool.not(U32.is_eq(mode(s), 0)), Bool.not(Kernel.same_side(Model.pos_side(pos(s)), U32.is_eq(mode(s), 1))))

def bot_ready(+s: State) -> Bool:
  Bool.and(Bool.and(bot_turn(s), U32.is_lt(Types.meta_revision(meta(s)), 20000)), Bool.and(Bool.not(Types.meta_botPaused(meta(s))), Bool.and(Bool.not(Types.meta_recovery(meta(s))), Bool.and(U32.is_eq(outcome_code(s), 0), U32.is_eq(Types.panels_menu(panels(s)), 0)))))

def bot_offer(+s: State) -> Bool:
  Bool.and(Bool.and(Bool.not(U32.is_eq(mode(s), 0)), U32.is_lt(Types.meta_revision(meta(s)), 20000)), Bool.and(Bool.not(U32.is_eq(Types.meta_offer(meta(s)), 0)), Bool.and(Bool.not(Types.meta_recovery(meta(s))), Bool.not(moving(s)))))

def after(+s: State) -> U32:
  Bool.pick(U32, Bool.or(Bool.or(replaying(s), staged(s)), Bool.or(moving(s), Bool.or(bot_ready(s), bot_offer(s)))), 16, 0)

def result(+s: State, effects: List<&2, Types.Effect>, redraw: U32) -> Update:
  Update{s, effects, redraw, after(s)}

def unchanged(+s: State) -> Update:
  result(s, [], 0)

def redrawn(+s: State) -> Update:
  result(s, [], 2)

def menu(+s: State, id: U32) -> State:
  set_panels(s, Types.set_panels_notice(Types.set_panels_menu(panels(s), id), ""))

def notice(+s: State, text: String) -> State:
  set_panels(s, Types.set_panels_notice(panels(s), text))

def page(+s: State, n: U32) -> State:
  set_panels(s, Types.set_panels_page(panels(s), n))

def pause(+s: State, b: Bool) -> State:
  set_meta(s, Types.set_meta_botPaused(meta(s), b))

def recovery(+s: State, b: Bool) -> State:
  set_meta(s, Types.set_meta_recovery(meta(s), b))

def clear(s: State) -> State:
  set_intent(set_pending(set_tile(set_selected(s, 64), 16), 21760), 21760)

def pointer_pressed(p: Pointer, +square: U32, +toggle: Bool) -> Pointer:
  match p:
    case Pointer{orbiting, x, y, view, _, _}: Pointer{orbiting, x, y, view, square, toggle}

def pressed(+s: State, +square: U32, +toggle: Bool) -> State:
  set_pointer(s, pointer_pressed(pointer(s), square, toggle))

def action(+id: U32) -> Model.Action:
  Bool.pick(Model.Action, U32.is_lt(id, 20480), Model.decode_move(id), Model.decode_shift(id))

def contains(xs: List<&2, U32>, +id: U32) -> Bool:
  match xs:
    case []: False{}
    case h <> t: Bool.or(U32.is_eq(h, id), contains(t, id))

def selected_id(+s: State, +id: U32) -> Bool:
  +a = action(id)
  Bool.pick(Bool, Model.is_move(a), U32.is_eq(Model.action_from(a), selected(s)), U32.is_eq(Model.action_from(a), tile(s)))

# Legal ids that start at the selected piece or selected tile.
def selection_ids(xs: List<&2, U32>, +s: State) -> List<&2, U32>:
  match xs:
    case []: []
    case +h <> t: List.append(&2, U32, Bool.pick(List<&2, U32>, selected_id(s, h), [h], []), selection_ids(t, s))

# Move targets (squares) or Shift targets (holes) of the given ids.
def targets(xs: List<&2, U32>, +shift: Bool) -> List<&2, U32>:
  match xs:
    case []: []
    case h <> t:
      +a = action(h)
      List.append(&2, U32, Bool.pick(List<&2, U32>, Kernel.same_side(Bool.not(Model.is_move(a)), shift), [Model.action_to(a)], []), targets(t, shift))

# The selection's legal id that lands on `square` (a Shift lands on its hole).
def destination_at(xs: List<&2, U32>, +square: U32) -> U32:
  match xs:
    case []: 21760
    case +h <> t:
      +a = action(h)
      Bool.pick(U32, U32.is_eq(Model.action_to(a), Bool.pick(U32, Model.is_move(a), square, Model.macro_of(square))), h, destination_at(t, square))

def live(+s: State) -> Bool:
  Bool.and(Bool.not(replaying(s)), Bool.and(Bool.not(Types.meta_recovery(meta(s))), U32.is_eq(outcome_code(s), 0)))

# Selection may continue while a move animates; commits wait for the Tick.
def selectable(+s: State) -> Bool:
  Bool.and(Bool.and(live(s), Bool.not(staged(s))), Bool.not(bot_turn(s)))

def interactive(+s: State) -> Bool:
  Bool.and(selectable(s), Bool.not(moving(s)))

def match_controls_live(+s: State) -> Bool:
  Bool.and(U32.is_lt(Types.meta_revision(meta(s)), 20000),
    Bool.and(live(s), Bool.and(Bool.not(moving(s)), Bool.not(staged(s)))))

def actor_is_human(+mode: U32, +side: Bool) -> Bool:
  Bool.or(U32.is_zero(mode),
    Bool.or(Bool.and(U32.is_eq(mode, 1), side),
      Bool.and(U32.is_eq(mode, 2), Bool.not(side))))

def set_view(+s: State, v: Camera.View) -> State:
  set_prefs(s, Types.set_preferences_view(prefs(s), Camera.normalize(v)))

def blank(+w: U32, h: U32) -> State:
  +p = Model.start(True{})
  State{Kernel.start(True{}, Match.Prompt{}), p, [], Types.Meta{0, True{}, False{}, 0, 0, False{}, False{}, False{}}, Types.default_preferences(), Types.Panels{0, 0, "", 0, True{}, 0}, [], [], p, 21760, 240, 64, 16, 64, 0, w, h, released(0, 0, Camera.default_view()), 21760, 21760, "", None{}, Reminder{False{}, False{}}}
