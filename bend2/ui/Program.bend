# Pure application controller. IO adapters execute effects; they do not choose game transitions.
import Base
import ../core/Model.bend as Model
import ../core/v2/BoardSpec.bend as Spec
import ../core/v2/Facade.bend as Kernel
import ../core/MatchSpec.bend as Match
import ../core/AI.bend as AI
import ../graphics/Camera.bend as Camera
import ../graphics/Picking.bend as Picking
import ../graphics/Scene.bend as Scene
import ./Types.bend as Types
import ./Layout.bend as Layout
import ./Json.bend as Json
import ./Codec.bend as Codec

type Reminder is Data:
  Reminder{white: Bool, black: Bool}

type Replay is Data:
  Replay{candidate: Match.Match, remaining: List<&2, Match.Command>, record: Codec.Record, text: String, imported: Bool, done: U32, total: U32, preferenceFallback: Bool, reminded: Reminder}

type State is Data:
  State{game: Match.Match, pos: Model.Position, legal: List<&2, U32>, meta: Types.Meta, prefs: Types.Preferences, panels: Types.Panels, journal: List<&2, Match.Command>, history: List<&2, String>, previous: Model.Position, last: U32, elapsed: U32, selected: U32, tile: U32, hover: U32, focus: U32, width: U32, height: U32, drag: Bool, dx: U32, dy: U32, dragview: Camera.View, pending: U32, raw: String, replay: Maybe<&2, Replay>, reminded: Reminder}

type Update is Data:
  Update{state: State, effects: List<&2, Types.Effect>, redraw: U32, after: U32}

def game(s: State) -> Match.Match:
  match s:
    case State{game, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: game

def set_game(s: State, v: Match.Match) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{v, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def pos(s: State) -> Model.Position:
  match s:
    case State{_, pos, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: pos

def set_pos(s: State, v: Model.Position) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, v, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def legal(s: State) -> List<&2, U32>:
  match s:
    case State{_, _, legal, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: legal

def set_legal(s: State, v: List<&2, U32>) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, v, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def meta(s: State) -> Types.Meta:
  match s:
    case State{_, _, _, meta, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: meta

def set_meta(s: State, v: Types.Meta) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, v, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def prefs(s: State) -> Types.Preferences:
  match s:
    case State{_, _, _, _, prefs, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: prefs

def set_prefs(s: State, v: Types.Preferences) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, v, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def panels(s: State) -> Types.Panels:
  match s:
    case State{_, _, _, _, _, panels, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: panels

def set_panels(s: State, v: Types.Panels) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, v, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def journal(s: State) -> List<&2, Match.Command>:
  match s:
    case State{_, _, _, _, _, _, journal, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: journal

def set_journal(s: State, v: List<&2, Match.Command>) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, v, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def history(s: State) -> List<&2, String>:
  match s:
    case State{_, _, _, _, _, _, _, history, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: history

def set_history(s: State, v: List<&2, String>) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, v, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def previous(s: State) -> Model.Position:
  match s:
    case State{_, _, _, _, _, _, _, _, previous, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: previous

def set_previous(s: State, v: Model.Position) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, v, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def last(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, last, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: last

def set_last(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, v, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def elapsed(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, elapsed, _, _, _, _, _, _, _, _, _, _, _, _, _, _}: elapsed

def set_elapsed(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, v, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def selected(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, selected, _, _, _, _, _, _, _, _, _, _, _, _, _}: selected

def set_selected(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, v, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def tile(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, tile, _, _, _, _, _, _, _, _, _, _, _, _}: tile

def set_tile(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, v, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def hover(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, hover, _, _, _, _, _, _, _, _, _, _, _}: hover

def set_hover(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, v, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def focus(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, focus, _, _, _, _, _, _, _, _, _, _}: focus

def set_focus(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, v, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def width(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, width, _, _, _, _, _, _, _, _, _}: width

def set_width(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, v, height, drag, dx, dy, dragview, pending, raw, replay, reminded}

def height(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, height, _, _, _, _, _, _, _, _}: height

def set_height(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, v, drag, dx, dy, dragview, pending, raw, replay, reminded}

def drag(s: State) -> Bool:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, drag, _, _, _, _, _, _, _}: drag

def set_drag(s: State, v: Bool) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, v, dx, dy, dragview, pending, raw, replay, reminded}

def dx(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, dx, _, _, _, _, _, _}: dx

def set_dx(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, v, dy, dragview, pending, raw, replay, reminded}

def dy(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, dy, _, _, _, _, _}: dy

def set_dy(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, v, dragview, pending, raw, replay, reminded}

def dragview(s: State) -> Camera.View:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, dragview, _, _, _, _}: dragview

def set_dragview(s: State, v: Camera.View) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, v, pending, raw, replay, reminded}

def pending(s: State) -> U32:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, pending, _, _, _}: pending

def set_pending(s: State, v: U32) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, v, raw, replay, reminded}

def raw(s: State) -> String:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, raw, _, _}: raw

def set_raw(s: State, v: String) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, v, replay, reminded}

def replay_state(s: State) -> Maybe<&2, Replay>:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, replay, _}: replay

def set_replay(s: State, v: Maybe<&2, Replay>) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, reminded}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, v, reminded}

def reminded(s: State) -> Reminder:
  match s:
    case State{_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, r}: r

def set_reminded(s: State, v: Reminder) -> State:
  match s:
    case State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, r}: State{game, pos, legal, meta, prefs, panels, journal, history, previous, last, elapsed, selected, tile, hover, focus, width, height, drag, dx, dy, dragview, pending, raw, replay, v}

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

def refreshed(+s: State, +g: Match.Match) -> State:
  match g:
    case Match.Match{initial, +p, actions, states, keys, rev, pol, offer, forced}:
      +ids = Kernel.legal_ids(p)
      +end = end_code(forced, p, keys, pol, ids)
      set_meta(set_legal(set_pos(set_game(s, g), p), Bool.pick(List<&2, U32>, U32.is_eq(end, 0), ids, [])), Types.Meta{U32.from_nat(rev), Model.pos_side(p), Spec.in_check(p, Model.pos_side(p)), end, offer_code(offer), Bool.not(List.is_empty(&2, U32, actions)), Types.meta_botPaused(meta(s)), Types.meta_recovery(meta(s))})

def revision(s: State) -> Nat:
  U32.to_nat(Types.meta_revision(meta(s)))

def mode(s: State) -> U32:
  Types.preferences_mode(prefs(s))

def view(s: State) -> Camera.View:
  Types.preferences_view(prefs(s))

def moving(+s: State) -> Bool:
  U32.is_lt(elapsed(s), 240)

def bot_turn(+s: State) -> Bool:
  Bool.and(Bool.not(U32.is_eq(mode(s), 0)), Bool.not(Kernel.same_side(Model.pos_side(pos(s)), U32.is_eq(mode(s), 1))))

def bot_ready(+s: State) -> Bool:
  Bool.and(Bool.and(bot_turn(s), U32.is_lt(Types.meta_revision(meta(s)), 20000)), Bool.and(Bool.not(Types.meta_botPaused(meta(s))), Bool.and(Bool.not(Types.meta_recovery(meta(s))), Bool.and(U32.is_eq(Types.meta_outcome(meta(s)), 0), U32.is_eq(Types.panels_menu(panels(s)), 0)))))

def bot_offer(+s: State) -> Bool:
  Bool.and(Bool.and(Bool.not(U32.is_eq(mode(s), 0)), U32.is_lt(Types.meta_revision(meta(s)), 20000)), Bool.and(Bool.not(U32.is_eq(Types.meta_offer(meta(s)), 0)), Bool.and(Bool.not(Types.meta_recovery(meta(s))), Bool.not(moving(s)))))

def after(+s: State) -> U32:
  Bool.pick(U32, Bool.or(replaying(s), Bool.or(moving(s), Bool.or(bot_ready(s), bot_offer(s)))), 16, 0)

def result(+s: State, effects: List<&2, Types.Effect>, redraw: U32) -> Update:
  Update{s, effects, redraw, after(s)}

def menu(+s: State, id: U32) -> State:
  set_panels(s, Types.Panels{id, Types.panels_page(panels(s)), "", Types.panels_draftMode(panels(s)), Types.panels_draftLayout(panels(s)), Types.panels_draftPolicy(panels(s))})

def notice(+s: State, text: String) -> State:
  set_panels(s, Types.Panels{Types.panels_menu(panels(s)), Types.panels_page(panels(s)), text, Types.panels_draftMode(panels(s)), Types.panels_draftLayout(panels(s)), Types.panels_draftPolicy(panels(s))})

def quiet_reminder(+s: State) -> State:
  +due = Bool.and(U32.is_eq(Types.preferences_policy(prefs(s)), 0), Bool.and(Nat.is_ge(Model.pos_quiet(pos(s)), 100n), Bool.and(U32.is_eq(Types.meta_outcome(meta(s)), 0), Bool.not(reminder_seen(reminded(s), Model.pos_side(pos(s)))))))
  +next = set_reminded(s, reminder_match(reminded(s), game(s)))
  Bool.pick(State, due, notice(next, String.append(Bool.pick(String, Model.pos_side(pos(s)), "White", "Black"), ": 100 quiet actions. Play on or offer a draw for agreement.")), next)

def pause(+s: State, b: Bool) -> State:
  +m = meta(s)
  set_meta(s, Types.Meta{Types.meta_revision(m), Types.meta_turn(m), Types.meta_inCheck(m), Types.meta_outcome(m), Types.meta_offer(m), Types.meta_canUndo(m), b, Types.meta_recovery(m)})

def recovery(+s: State, b: Bool) -> State:
  +m = meta(s)
  set_meta(s, Types.Meta{Types.meta_revision(m), Types.meta_turn(m), Types.meta_inCheck(m), Types.meta_outcome(m), Types.meta_offer(m), Types.meta_canUndo(m), Types.meta_botPaused(m), b})

def clear(s: State) -> State:
  set_pending(set_tile(set_selected(s, 64), 16), 21760)

def action(+id: U32) -> Model.Action:
  Bool.pick(Model.Action, U32.is_lt(id, 20480), Model.decode_move(id), Model.decode_shift(id))

def selected_id(+s: State, +id: U32) -> Bool:
  +a = action(id)
  Bool.pick(Bool, Model.is_move(a), U32.is_eq(Model.action_from(a), selected(s)), U32.is_eq(Model.action_from(a), tile(s)))

def selection_ids(xs: List<&2, U32>, +s: State) -> List<&2, U32>:
  match xs:
    case []: []
    case +h <> t: List.append(&2, U32, Bool.pick(List<&2, U32>, selected_id(s, h), [h], []), selection_ids(t, s))

def targets(xs: List<&2, U32>, +shift: Bool) -> List<&2, U32>:
  match xs:
    case []: []
    case h <> t:
      +a = action(h)
      List.append(&2, U32, Bool.pick(List<&2, U32>, Kernel.same_side(Bool.not(Model.is_move(a)), shift), [Model.action_to(a)], []), targets(t, shift))

def snapshot(+s: State) -> Types.Snapshot:
  +ids = selection_ids(legal(s), s)
  Types.Snapshot{Scene.Frame{pos(s), previous(s), selected(s), hover(s), targets(ids, False{}), tile(s), targets(ids, True{}), last(s), U32.min(16, U32.div(U32.mul(elapsed(s), 16), 240)), Types.preferences_theme(prefs(s)), view(s)}, prefs(s), meta(s), panels(s), legal(s), history(s), U32.is_lt(width(s), 900), focus(s), moving(s), replaying(s)}

def number(n: U32) -> Json.Value:
  Codec.number(n)

def view_json(v: Camera.View) -> Json.Value:
  match v:
    case Camera.View{yaw, pitch, zoom}: Json.Object{[Json.Field{"yaw", number(yaw)}, Json.Field{"pitch", number(pitch)}, Json.Field{"zoom", number(zoom)}]}

def preferences_text(+s: State) -> String:
  +p = prefs(s)
  Json.stringify(Json.Object{[Json.Field{"mode", Json.Text{Bool.pick(String, U32.is_eq(mode(s), 0), "hotseat", "bot")}}, Json.Field{"humanWhite", Json.Boolean{Bool.not(U32.is_eq(mode(s), 2))}}, Json.Field{"botPaused", Json.Boolean{Types.meta_botPaused(meta(s))}}, Json.Field{"theme", number(Types.preferences_theme(p))}, Json.Field{"sound", Json.Boolean{Types.preferences_sound(p)}}, Json.Field{"volume", Json.Number{F32.div(U32.to_f32(Types.preferences_volume(p)), 100.0), ""}}, Json.Field{"view", view_json(view(s))}]})

def record_text(+s: State) -> String:
  Codec.encode(Codec.Record{Types.preferences_layout(prefs(s)), Types.preferences_policy(prefs(s)), journal(s)})

def pref_result(+s: State, redraw: U32) -> Update:
  result(s, [Types.Store{1, preferences_text(s)}], redraw)

def pref_set(+s: State, mode: U32, theme: U32, sound: Bool, volume: U32, v: Camera.View) -> State:
  set_prefs(s, Types.Preferences{mode, Types.preferences_layout(prefs(s)), Types.preferences_policy(prefs(s)), theme, sound, volume, Camera.normalize(v)})

def camera(+s: State, v: Camera.View, redraw: U32) -> Update:
  +p = prefs(s)
  pref_result(pref_set(s, mode(s), Types.preferences_theme(p), Types.preferences_sound(p), Types.preferences_volume(p), v), redraw)

def sound_effect(+before: State, +s: State, +id: U32) -> List<&2, Types.Effect>:
  +terminal = Bool.not(U32.is_eq(Types.meta_outcome(meta(s)), 0))
  +capture = Model.occupied(Model.board_get(Model.pos_board(pos(before)), Model.action_to(action(id))))
  +frequency = Bool.pick(F32, terminal, 330.0, Bool.pick(F32, Types.meta_inCheck(meta(s)), 740.0, Bool.pick(F32, Bool.not(U32.is_eq(U32.mod(id, 5), 0)), 880.0, Bool.pick(F32, U32.is_ge(id, 20480), 196.0, Bool.pick(F32, capture, 180.0, 440.0)))))
  Bool.pick(List<&2, Types.Effect>, Types.preferences_sound(prefs(s)), [Types.Sound{[Types.Note{frequency, 90, 0, F32.div(U32.to_f32(Types.preferences_volume(prefs(s))), 180.0), 0}, Types.Note{F32.mul(frequency, 1.5), Bool.pick(U32, terminal, 300, 110), 0, F32.div(U32.to_f32(Types.preferences_volume(prefs(s))), 300.0), 65}]}], [])

def command_action(c: Match.Command) -> U32:
  match c:
    case Match.MoveCommand{_, id}: id
    case _: 21760

def file_name(file: U32) -> String:
  match file:
    case 0: "a"
    case 1: "b"
    case 2: "c"
    case 3: "d"
    case 4: "e"
    case 5: "f"
    case 6: "g"
    case _: "h"

def square_name(+square: U32) -> String:
  String.append(file_name(Model.file_of(square)), U32.show(U32.add(Model.rank_of(square), 1)))

def promotion_name(p: U32) -> String:
  match p:
    case 1: " = Queen"
    case 2: " = Rook"
    case 3: " = Bishop"
    case 4: " = Knight"
    case _: ""

def action_label(a: Model.Action) -> String:
  match a:
    case Model.MoveAction{from, to, promotion}: String.append(square_name(from), String.append(" -> ", String.append(square_name(to), promotion_name(promotion))))
    case Model.ShiftAction{from, to, promotion}: String.append("Platform ", String.append(U32.show(U32.add(from, 1)), String.append(" -> ", String.append(U32.show(U32.add(to, 1)), promotion_name(promotion)))))
def command_label(c: Match.Command) -> String:
  match c:
    case Match.MoveCommand{_, id}: action_label(action(id))
    case Match.UndoCommand{_}: "Undo"
    case Match.OfferCommand{_, _}: "Draw offered"
    case Match.AcceptCommand{_, _}: "Draw accepted"
    case Match.DeclineCommand{_, _}: "Draw declined"
    case Match.ResignCommand{_, _}: "Resignation"

def command_result(r: Match.StepResult, +s: State, +c: Match.Command) -> Update:
  match r:
    case Match.Rejected{_}: result(notice(s, "That command is unavailable."), [], 2)
    case Match.Accepted{g}:
      +id = command_action(c)
      +next = set_elapsed(set_last(set_previous(set_history(set_journal(clear(menu(refreshed(s, g), 0)), List.append(&2, Match.Command, journal(s), [c])), List.append(&2, String, history(s), [command_label(c)])), pos(s)), id), Bool.pick(U32, U32.is_lt(id, 21760), 1, 240))
      result(quiet_reminder(next), List.append(&2, Types.Effect, [Types.Store{0, record_text(next)}, Types.Store{1, preferences_text(next)}], Bool.pick(List<&2, Types.Effect>, Bool.or(U32.is_lt(id, 21760), Bool.not(U32.is_eq(Types.meta_outcome(meta(next)), 0))), sound_effect(s, next, id), [])), 2)

def command_guard(locked: Bool, +s: State, +c: Match.Command) -> Update:
  match locked:
    case True{}: result(s, [], 0)
    case False{}: command_result(Kernel.command(game(s), c), s, c)

def command_limit(full: Bool, +s: State, c: Match.Command) -> Update:
  match full:
    case True{}: result(notice(s, "Record limit reached. Export this record and start a new match."), [], 2)
    case False{}: command_guard(Bool.or(replaying(s), Bool.or(Types.meta_recovery(meta(s)), moving(s))), s, c)

def command(+s: State, +c: Match.Command) -> Update:
  command_limit(U32.is_ge(Types.meta_revision(meta(s)), 20000), s, c)

def undo_request_text(requester_white: Bool) -> String:
  String.append(Bool.pick(String, requester_white, "White", "Black"),
    " requested undo. Other player must agree.")

def undo_request(+s: State) -> State:
  +requester_white = Bool.not(Types.meta_turn(meta(s)))
  +requester = Bool.pick(U32, requester_white, 1, 2)
  set_panels(s, Types.Panels{8, requester, undo_request_text(requester_white),
    Types.panels_draftMode(panels(s)), Types.panels_draftLayout(panels(s)),
    Types.panels_draftPolicy(panels(s))})

def undo_other_turn(+s: State) -> Bool:
  +requester_white = U32.is_eq(Types.panels_page(panels(s)), 1)
  Bool.xor(requester_white, Types.meta_turn(meta(s)))

def undo_accept_allowed(+s: State) -> Bool:
  Bool.and(Bool.and(Bool.and(U32.is_eq(Types.panels_menu(panels(s)), 8),
      U32.is_zero(mode(s))), Types.meta_canUndo(meta(s))),
    Bool.and(undo_other_turn(s), Bool.not(Bool.or(moving(s), replaying(s)))))

def undo_ready(+s: State) -> Bool:
  Bool.and(Bool.and(Types.meta_canUndo(meta(s)),
      Bool.not(Bool.or(moving(s), replaying(s)))),
    U32.is_zero(Types.panels_menu(panels(s))))

def undo_activate.hotseat(allowed: Bool, +s: State) -> Update:
  match allowed:
    case True{}:
      result(undo_request(s), [], 2)
    case False{}:
      result(s, [], 0)

def undo_activate.allowed(hotseat: Bool, +s: State) -> Update:
  match hotseat:
    case True{}:
      undo_activate.hotseat(True{}, s)
    case False{}:
      command(pause(s, True{}), Match.UndoCommand{revision(s)})

def undo_activate.for(hotseat: Bool, allowed: Bool, +s: State) -> Update:
  match allowed:
    case False{}:
      result(s, [], 0)
    case True{}:
      undo_activate.allowed(hotseat, s)

def undo_activate(+s: State) -> Update:
  undo_activate.for(U32.is_zero(mode(s)), undo_ready(s), s)

def undo_accept.for(allowed: Bool, +s: State) -> Update:
  match allowed:
    case True{}:
      command(s, Match.UndoCommand{revision(s)})
    case False{}:
      result(s, [], 0)

def undo_accept(+s: State) -> Update:
  undo_accept.for(undo_accept_allowed(s), s)

def contains(xs: List<&2, U32>, +id: U32) -> Bool:
  match xs:
    case []: False{}
    case h <> t: Bool.or(U32.is_eq(h, id), contains(t, id))

def interactive(+s: State) -> Bool:
  Bool.and(Bool.not(Bool.or(replaying(s), moving(s))), Bool.and(Bool.not(Types.meta_recovery(meta(s))), Bool.and(Bool.not(bot_turn(s)), U32.is_eq(Types.meta_outcome(meta(s)), 0))))

def move_allowed(ok: Bool, +s: State, +id: U32) -> Update:
  match ok:
    case False{}: result(s, [], 0)
    case True{}: command(pause(s, False{}), Match.MoveCommand{revision(s), id})

def request_move(+s: State, +id: U32) -> Update:
  move_allowed(Bool.and(Bool.and(interactive(s),
      Bool.not(U32.is_eq(Types.panels_menu(panels(s)), 8))),
    contains(legal(s), id)), s, id)

def promotion_or_move(promote: Bool, +s: State, id: U32) -> Update:
  match promote:
    case True{}: result(menu(set_pending(s, U32.mul(U32.div(id, 5), 5)), 4), [], 2)
    case False{}: request_move(s, id)

def destination(+s: State, +id: U32) -> Update:
  promotion_or_move(Bool.and(contains(legal(s), id), Bool.not(U32.is_eq(U32.mod(id, 5), 0))), s, id)

def destination_at(xs: List<&2, U32>, +square: U32) -> U32:
  match xs:
    case []: 21760
    case +h <> t:
      +a = action(h)
      Bool.pick(U32, U32.is_eq(Model.action_to(a), Bool.pick(U32, Model.is_move(a), square, Model.macro_of(square))), h, destination_at(t, square))

def select_square(+s: State, +square: U32) -> State:
  +own = Model.same_side(Model.board_get(Model.pos_board(pos(s)), square), Model.pos_side(pos(s)))
  set_focus(set_tile(set_selected(clear(s), Bool.pick(U32, own, square, 64)), Bool.pick(U32, own, 16, Model.macro_of(square))), square)

def click_choice(toggle: Bool, has_dest: Bool, +s: State, square: U32, id: U32) -> Update:
  match toggle has_dest:
    case True{} _: result(clear(s), [], 2)
    case _ True{}: destination(s, id)
    case _ _: result(select_square(s, square), [], 2)

def click_allowed(ok: Bool, +s: State, +square: U32) -> Update:
  match ok:
    case False{}: result(s, [], 0)
    case True{}:
      +id = destination_at(selection_ids(legal(s), s), square)
      click_choice(Bool.or(U32.is_eq(selected(s), square), U32.is_eq(tile(s), Model.macro_of(square))), U32.is_lt(id, 21760), s, square, id)

def click_square(+s: State, +square: U32) -> Update:
  click_allowed(Bool.and(interactive(s), Bool.and(U32.is_lt(square, 64), U32.is_eq(Types.panels_menu(panels(s)), 0))), s, square)
def get_num(v: Maybe<&2, Json.Value>, fallback: U32) -> U32:
  match v:
    case Some{Json.Number{value, _}}: F32.to_u32(F32.max(0.0, value))
    case _: fallback

def get_bool(v: Maybe<&2, Json.Value>, fallback: Bool) -> Bool:
  match v:
    case Some{Json.Boolean{value}}: value
    case _: fallback

def get_volume(v: Maybe<&2, Json.Value>) -> U32:
  match v:
    case Some{Json.Number{value, _}}: U32.min(100, F32.to_u32(F32.round(F32.max(0.0, F32.mul(value, 100.0)))))
    case _: 28

def wrap_degrees(+x: F32) -> F32:
  F32.sub(x, F32.mul(F32.floor(F32.div(x, 360.0)), 360.0))

def get_angle(v: Maybe<&2, Json.Value>) -> U32:
  match v:
    case Some{Json.Number{value, _}}: F32.to_u32(wrap_degrees(value))
    case _: 0

def get_view(v: Maybe<&2, Json.Value>) -> Camera.View:
  match v:
    case Some{+j}: Camera.normalize(Camera.View{get_angle(Json.field(j, "yaw")), get_num(Json.field(j, "pitch"), 65), get_num(Json.field(j, "zoom"), 100)})
    case _: Camera.default_view()

def load_preferences(v: Maybe<&2, Json.Value>, +s: State) -> State:
  match v:
    case None{}: s
    case Some{+j}:
      +m = Bool.pick(U32, Codec.text_is(Json.field(j, "mode"), "bot"), Bool.pick(U32, get_bool(Json.field(j, "humanWhite"), True{}), 1, 2), 0)
      pause(pref_set(s, m, U32.min(1, get_num(Json.field(j, "theme"), 0)), get_bool(Json.field(j, "sound"), True{}), get_volume(Json.field(j, "volume")), get_view(Json.field(j, "view"))), get_bool(Json.field(j, "botPaused"), False{}))

def blank(+w: U32, h: U32) -> State:
  +p = Model.start(True{})
  State{Kernel.start(True{}, Match.Prompt{}), p, [], Types.Meta{0, True{}, False{}, 0, 0, False{}, False{}, False{}}, Types.Preferences{0, True{}, 0, 0, True{}, 28, Camera.default_view()}, Types.Panels{0, 0, "", 0, True{}, 0}, [], [], p, 21760, 240, 64, 16, 64, 0, w, h, False{}, 0, 0, Camera.default_view(), 21760, "", None{}, Reminder{False{}, False{}}}

def labels_go(cs: List<&2, Match.Command>, acc: List<&2, String>) -> List<&2, String>:
  match cs:
    case []: List.reverse(&2, String, acc)
    case c <> t: labels_go(t, command_label(c) <> acc)

def labels(cs: List<&2, Match.Command>) -> List<&2, String>:
  labels_go(cs, [])

def invalid_record(+s: State, +text: String) -> Update:
  result(notice(menu(recovery(set_raw(set_replay(s, None{}), text), True{}), 6), "Record rejected. Original text retained; download recovery or start a new match."), [Types.Store{2, text}], 2)

def install_record(g: Maybe<&2, Match.Match>, +s: State, +text: String, +r: Codec.Record, +imported: Bool) -> Update:
  match g r:
    case None{} _: invalid_record(s, text)
    case Some{m} Codec.Record{layout, pol, +cs}:
      +p = prefs(s)
      +next = refreshed(set_history(set_journal(set_prefs(recovery(pause(clear(menu(set_last(set_elapsed(set_replay(s, None{}), 240), 21760), 0)), Bool.pick(Bool, imported, False{}, Types.meta_botPaused(meta(s)))), False{}), Types.Preferences{Bool.pick(U32, imported, 0, mode(s)), layout, pol, Types.preferences_theme(p), Types.preferences_sound(p), Types.preferences_volume(p), view(s)}), cs), labels(cs)), m)
      result(next, [Types.Store{0, record_text(next)}, Types.Store{1, preferences_text(next)}], 2)

def reset_page(+s: State) -> State:
  +p = panels(s)
  set_panels(s, Types.Panels{Types.panels_menu(p), 0, Types.panels_notice(p), Types.panels_draftMode(p), Types.panels_draftLayout(p), Types.panels_draftPolicy(p)})

def load_record(r: Maybe<&2, Codec.Record>, +s: State, text: String, imported: Bool) -> Update:
  match r:
    case None{}: invalid_record(s, text)
    case Some{+record}:
      match record:
        case Codec.Record{layout, pol, +cs}:
          result(notice(set_replay(clear(reset_page(s)), Some{Replay{Kernel.start(layout, policy(pol)), cs, record, text, imported, 0, U32.from_nat(List.length(&2, Match.Command, cs)), False{}, Reminder{False{}, False{}}}}), "Validating record. New Match or Import cancels validation."), [], 2)

# One accepted command per scheduled Tick. Candidate state never enters the
# accepted journal until the complete record has validated.
def replay_progress(+s: State, r: Replay) -> Update:
  match r:
    case Replay{g, cs, record, text, imported, +done, +total, +warning, r}:
      result(notice(set_replay(s, Some{Replay{g, cs, record, text, imported, done, total, warning, r}}), String.append(Bool.pick(String, warning, "Preferences could not be read; defaults are in use. ", ""), String.append("Validating record: ", String.append(U32.show(done), String.append(" / ", String.append(U32.show(total), ". New Match or Import cancels.")))))), [], 2)

def replay_accepted(step: Match.StepResult, s: State, cs: List<&2, Match.Command>, record: Codec.Record, text: String, imported: Bool, done: U32, total: U32, warning: Bool, r: Reminder) -> Update:
  match step:
    case Match.Rejected{_}: invalid_record(s, text)
    case Match.Accepted{+g}: replay_progress(s, Replay{g, cs, record, text, imported, U32.add(done, 1), total, warning, reminder_match(r, g)})

def replay_finished(u: Update, warning: Bool, r: Reminder) -> Update:
  match u warning:
    case Update{s, effects, redraw, delay} True{}: Update{notice(set_reminded(s, r), "Preferences could not be read; defaults are in use."), effects, redraw, delay}
    case Update{s, effects, redraw, delay} False{}: Update{set_reminded(s, r), effects, redraw, delay}

def replay_tick(r: Maybe<&2, Replay>, s: State) -> Update:
  match r:
    case None{}: result(s, [], 0)
    case Some{Replay{g, cs, record, text, imported, done, total, warning, r}}:
      match cs:
        case []: replay_finished(install_record(Some{g}, s, text, record, imported), warning, r)
        case c <> tail: replay_accepted(Kernel.command(g, c), s, tail, record, text, imported, done, total, warning, r)

def saved(empty: Bool, +s: State, +text: String) -> Update:
  match empty:
    case True{}: result(s, [], 2)
    case False{}: load_record(Codec.decode(text), s, text, False{})

def start(+saved_text: String, preferences: String, width: U32, height: U32) -> Update:
  +s = load_preferences(Json.parse(preferences), blank(width, height))
  saved(String.is_empty(saved_text), refreshed(s, game(s)), saved_text)

def draft(+s: State, m: U32, l: Bool, p: U32) -> State:
  set_panels(s, Types.Panels{1, 0, "", m, l, p})

def new_match(+s: State) -> Update:
  +d = panels(s)
  +p = prefs(s)
  +l = Types.panels_draftLayout(d)
  +pol = Types.panels_draftPolicy(d)
  +next = refreshed(set_elapsed(set_history(set_journal(set_prefs(recovery(pause(clear(menu(set_last(set_reminded(set_replay(s, None{}), Reminder{False{}, False{}}), 21760), 0)), False{}), False{}), Types.Preferences{Types.panels_draftMode(d), l, pol, Types.preferences_theme(p), Types.preferences_sound(p), Types.preferences_volume(p), view(s)}), []), []), 240), Kernel.start(l, policy(pol)))
  result(next, [Types.Store{0, record_text(next)}, Types.Store{1, preferences_text(next)}], 2)

def camera_control(id: U32, v: Camera.View) -> Camera.View:
  match id v:
    case 11 Camera.View{_, _, z}: Camera.View{0, 65, z}
    case 12 Camera.View{y, _, z}: Camera.View{y, 90, z}
    case 13 Camera.View{y, p, z}: Camera.View{U32.mod(U32.add(y, 345), 360), p, z}
    case 14 Camera.View{y, p, z}: Camera.View{U32.mod(U32.add(y, 15), 360), p, z}
    case 15 Camera.View{y, p, z}: Camera.View{y, U32.add(p, 5), z}
    case 16 Camera.View{y, p, z}: Camera.View{y, U32.sub(U32.max(40, p), 5), z}
    case 17 Camera.View{y, p, z}: Camera.View{y, p, U32.add(z, 5)}
    case 18 Camera.View{y, p, z}: Camera.View{y, p, U32.sub(U32.max(z, 80), 5)}
    case 19 _: Camera.default_view()
    case _ _: v

def activate_other(dest: Bool, +id: U32, +s: State) -> Update:
  match dest:
    case True{}: destination(s, U32.sub(id, 1000))
    case False{}: camera(s, camera_control(id, view(s)), 2)
def match_controls_live(+s: State) -> Bool:
  Bool.and(U32.is_lt(Types.meta_revision(meta(s)), 20000),
    Bool.and(U32.is_eq(Types.meta_outcome(meta(s)), 0),
      Bool.and(Bool.not(Types.meta_recovery(meta(s))),
        Bool.and(Bool.not(moving(s)), Bool.not(replaying(s))))))

def actor_is_human(+mode: U32, +side: Bool) -> Bool:
  Bool.or(U32.is_zero(mode),
    Bool.or(Bool.and(U32.is_eq(mode, 1), side),
      Bool.and(U32.is_eq(mode, 2), Bool.not(side))))

def side_control_allowed(ready: Bool, human: Bool) -> Bool:
  Bool.and(ready, human)

def offer_actor(ready: Bool, no_offer: Bool, human: Bool) -> Bool:
  Bool.and(Bool.and(ready, no_offer), human)

def side_action(allowed: Bool, resignation: Bool, +s: State, side: Bool) -> Update:
  match allowed:
    case False{}: result(s, [], 0)
    case True{}:
      match resignation:
        case True{}: command(s, Match.ResignCommand{revision(s), side})
        case False{}: command(s, Match.OfferCommand{revision(s), side})

def draw_menu_allowed(allowed: Bool, hotseat: Bool, +s: State) -> Update:
  match allowed:
    case True{}:
      match hotseat:
        case True{}: result(menu(s, 9), [], 2)
        case False{}:
          +white = U32.is_eq(mode(s), 1)
          side_action(actor_is_human(mode(s), white), False{}, s, white)
    case False{}: result(s, [], 0)

def draw_menu(+s: State) -> Update:
  draw_menu_allowed(Bool.and(match_controls_live(s), U32.is_zero(Types.meta_offer(meta(s)))), U32.is_zero(mode(s)), s)

def resign_menu_allowed(allowed: Bool, +hotseat: Bool, +s: State) -> Update:
  match allowed:
    case True{}:
      +p = panels(s)
      +white = U32.is_eq(mode(s), 1)
      +page = Bool.pick(U32, hotseat, 0, Bool.pick(U32, white, 1, 2))
      +name = Bool.pick(String, white, "White", "Black")
      +notice = Bool.pick(String, hotseat, "", String.append(name, " will resign. Confirm to end the match."))
      result(set_panels(s, Types.Panels{5, page, notice, Types.panels_draftMode(p), Types.panels_draftLayout(p), Types.panels_draftPolicy(p)}), [], 2)
    case False{}: result(s, [], 0)

def resign_menu(+s: State) -> Update:
  resign_menu_allowed(match_controls_live(s), U32.is_zero(mode(s)), s)

def resign_choice_allowed(allowed: Bool, +side: Bool, +s: State) -> Update:
  match allowed:
    case False{}: result(s, [], 0)
    case True{}:
      +p = panels(s)
      +name = Bool.pick(String, side, "White", "Black")
      +page = Bool.pick(U32, side, 1, 2)
      result(set_panels(s, Types.Panels{5, page, String.append(name, " will resign. Confirm to end the match."), Types.panels_draftMode(p), Types.panels_draftLayout(p), Types.panels_draftPolicy(p)}), [], 2)

def resign_choice(menu_open: Bool, hotseat: Bool, ready: Bool, human: Bool, side: Bool, +s: State) -> Update:
  resign_choice_allowed(Bool.and(Bool.and(Bool.and(menu_open, hotseat), ready), human), side, s)

def offer_choice(menu_open: Bool, hotseat: Bool, ready: Bool, no_offer: Bool, human: Bool, side: Bool, +s: State) -> Update:
  side_action(offer_actor(Bool.and(Bool.and(menu_open, hotseat), ready), no_offer, human), False{}, s, side)

def confirm_resign.page(page: U32, +s: State) -> Update:
  match page:
    case 1:
      side_action(Bool.and(U32.is_eq(Types.panels_menu(panels(s)), 5), side_control_allowed(match_controls_live(s), actor_is_human(mode(s), True{}))), True{}, s, True{})
    case 2:
      side_action(Bool.and(U32.is_eq(Types.panels_menu(panels(s)), 5), side_control_allowed(match_controls_live(s), actor_is_human(mode(s), False{}))), True{}, s, False{})
    case _: result(s, [], 0)

def confirm_resign(+s: State) -> Update:
  confirm_resign.page(Types.panels_page(panels(s)), s)

def activate(id: U32, +s: State) -> Update:
  match id:
    case 0: result(s, [], 0)
    case 1: result(menu(s, 2), [], 2)
    case 2: result(draft(set_replay(s, None{}), mode(s), Types.preferences_layout(prefs(s)), Types.preferences_policy(prefs(s))), [], 2)
    case 3: undo_activate(s)
    case 4: result(clear(s), [], 2)
    case 5: result(set_tile(set_selected(s, 64), Model.macro_of(selected(s))), [], 2)
    case 6: draw_menu(s)
    case 7: resign_menu(s)
    case 8: command(s, Match.AcceptCommand{revision(s), Bool.not(U32.is_eq(Types.meta_offer(meta(s)), 1))})
    case 9: command(s, Match.DeclineCommand{revision(s), Bool.not(U32.is_eq(Types.meta_offer(meta(s)), 1))})
    case 10: pref_result(pause(s, False{}), 2)
    case 20: result(s, [Types.Download{"rift-chess-record.json", record_text(s)}], 0)
    case 21: result(notice(set_replay(pause(s, Bool.not(U32.is_eq(mode(s), 0))), None{}), ""), [Types.PickFile{}], 2)
    case 22: pref_result(pref_set(s, mode(s), 0, Types.preferences_sound(prefs(s)), Types.preferences_volume(prefs(s)), view(s)), 2)
    case 23: pref_result(pref_set(s, mode(s), 1, Types.preferences_sound(prefs(s)), Types.preferences_volume(prefs(s)), view(s)), 2)
    case 24: pref_result(pref_set(s, mode(s), Types.preferences_theme(prefs(s)), Bool.not(Types.preferences_sound(prefs(s))), Types.preferences_volume(prefs(s)), view(s)), 2)
    case 25: pref_result(pref_set(s, mode(s), Types.preferences_theme(prefs(s)), Types.preferences_sound(prefs(s)), U32.min(100, U32.add(Types.preferences_volume(prefs(s)), 5)), view(s)), 2)
    case 26: pref_result(pref_set(s, mode(s), Types.preferences_theme(prefs(s)), Types.preferences_sound(prefs(s)), U32.sub(U32.max(5, Types.preferences_volume(prefs(s))), 5), view(s)), 2)
    case 27: result(menu(s, 3), [], 2)
    case 28: result(clear(menu(s, 0)), [], 2)
    case 29: new_match(s)
    case 30: result(draft(s, 0, Types.panels_draftLayout(panels(s)), Types.panels_draftPolicy(panels(s))), [], 2)
    case 31: result(draft(s, 1, Types.panels_draftLayout(panels(s)), Types.panels_draftPolicy(panels(s))), [], 2)
    case 32: result(draft(s, 2, Types.panels_draftLayout(panels(s)), Types.panels_draftPolicy(panels(s))), [], 2)
    case 33: result(draft(s, Types.panels_draftMode(panels(s)), True{}, Types.panels_draftPolicy(panels(s))), [], 2)
    case 34: result(draft(s, Types.panels_draftMode(panels(s)), False{}, Types.panels_draftPolicy(panels(s))), [], 2)
    case 35: result(draft(s, Types.panels_draftMode(panels(s)), Types.panels_draftLayout(panels(s)), 0), [], 2)
    case 36: result(draft(s, Types.panels_draftMode(panels(s)), Types.panels_draftLayout(panels(s)), 1), [], 2)
    case 37: result(draft(s, Types.panels_draftMode(panels(s)), Types.panels_draftLayout(panels(s)), 2), [], 2)
    case 38: request_move(s, U32.add(pending(s), 1))
    case 39: request_move(s, U32.add(pending(s), 2))
    case 40: request_move(s, U32.add(pending(s), 3))
    case 41: request_move(s, U32.add(pending(s), 4))
    case 42: confirm_resign(s)
    case 43: result(s, [Types.Download{"rift-chess-recovery.json", raw(s)}], 0)
    case 44: result(s, [Types.OpenUrl{"https://haileystorm.github.io/rift-chess/"}], 0)
    case 47: result(menu(s, 7), [], 2)
    case 48: undo_accept(s)
    case 49: offer_choice(U32.is_eq(Types.panels_menu(panels(s)), 9), U32.is_zero(mode(s)), match_controls_live(s), U32.is_zero(Types.meta_offer(meta(s))), actor_is_human(mode(s), True{}), True{}, s)
    case 50: offer_choice(U32.is_eq(Types.panels_menu(panels(s)), 9), U32.is_zero(mode(s)), match_controls_live(s), U32.is_zero(Types.meta_offer(meta(s))), actor_is_human(mode(s), False{}), False{}, s)
    case 51: resign_choice(U32.is_eq(Types.panels_menu(panels(s)), 5), U32.is_zero(mode(s)), match_controls_live(s), actor_is_human(mode(s), True{}), True{}, s)
    case 52: resign_choice(U32.is_eq(Types.panels_menu(panels(s)), 5), U32.is_zero(mode(s)), match_controls_live(s), actor_is_human(mode(s), False{}), False{}, s)
    case 45: result(set_panels(s, Types.Panels{Types.panels_menu(panels(s)), U32.sub(U32.max(1, Types.panels_page(panels(s))), 1), "", Types.panels_draftMode(panels(s)), Types.panels_draftLayout(panels(s)), Types.panels_draftPolicy(panels(s))}), [], 2)
    case 46: result(set_panels(s, Types.Panels{Types.panels_menu(panels(s)), U32.min(U32.add(Types.panels_page(panels(s)), 1), U32.div(U32.sub(U32.max(1, U32.from_nat(List.length(&2, String, history(s)))), 1), 5)), "", Types.panels_draftMode(panels(s)), Types.panels_draftLayout(panels(s)), Types.panels_draftPolicy(panels(s))}), [], 2)
    case +other: activate_other(U32.is_ge(other, 1000), other, s)

def board_square(+s: State, +x: U32, +y: U32) -> U32:
  +rect = Layout.board_rect(U32.is_lt(width(s), 900))
  Picking.pick(pos(s), U32.sub(x, Types.rect_x(rect)), U32.sub(y, Types.rect_y(rect)), Camera.basis(view(s)))

def pointer_click(control: U32, +s: State, x: U32, y: U32) -> Update:
  match control:
    case 0: click_square(s, board_square(s, x, y))
    case id: activate(id, s)

def pointer_primary(primary: Bool, +s: State, +x: U32, +y: U32) -> Update:
  match primary:
    case True{}: pointer_click(Layout.hit(snapshot(s), x, y), s, x, y)
    case False{}: result(s, [], 0)

def pointer_down(orbit: Bool, +s: State, +x: U32, +y: U32, button: U32) -> Update:
  match orbit:
    case True{}: result(set_dragview(set_dy(set_dx(set_drag(s, True{}), x), y), view(s)), [], 0)
    case False{}: pointer_primary(U32.is_eq(button, 0), s, x, y)

def drag_view(v: Camera.View, x: U32, y: U32, dx: U32, dy: U32) -> Camera.View:
  match v:
    case Camera.View{yaw, pitch, zoom}:
      Camera.View{F32.to_u32(wrap_degrees(F32.sub(U32.to_f32(yaw), F32.mul(F32.sub(U32.to_f32(x), U32.to_f32(dx)), 0.55)))), F32.to_u32(F32.clamp(F32.add(U32.to_f32(pitch), F32.mul(F32.sub(U32.to_f32(y), U32.to_f32(dy)), 0.25)), 35.0, 90.0)), zoom}

def pointer_move(dragging: Bool, +s: State, +x: U32, +y: U32) -> Update:
  match dragging:
    case True{}:
      result(pref_set(s, mode(s), Types.preferences_theme(prefs(s)), Types.preferences_sound(prefs(s)),
        Types.preferences_volume(prefs(s)), drag_view(dragview(s), x, y, dx(s), dy(s))), [], 1)
    case False{}:
      +square = board_square(s, x, y)
      result(set_hover(s, square), [], Bool.pick(U32, U32.is_eq(square, hover(s)), 0, 1))

def wheel_view(v: Camera.View, delta: F32) -> Camera.View:
  match v:
    case Camera.View{yaw, pitch, zoom}: Camera.View{yaw, pitch, F32.to_u32(F32.clamp(F32.sub(U32.to_f32(zoom), F32.mul(delta, 0.025)), 75.0, 115.0))}

def key_arrow(alt: Bool, s: State, control: U32, +square: U32) -> Update:
  match alt:
    case True{}: activate(control, s)
    case False{}: result(set_hover(set_focus(s, square), square), [], 1)

def key_undo.for(menu_zero: Bool, +s: State) -> Update:
  match menu_zero:
    case True{}: activate(3, s)
    case False{}: result(s, [], 0)

def key_undo(+s: State) -> Update:
  key_undo.for(U32.is_zero(Types.panels_menu(panels(s))), s)

def key_plain(down: Bool, code: U32, +s: State, alt: Bool) -> Update:
  match down code:
    case False{} _: result(s, [], 0)
    case True{} 13: click_square(s, focus(s))
    case True{} 32: click_square(s, focus(s))
    case True{} 27: result(clear(menu(s, 0)), [], 2)
    case True{} 85: key_undo(s)
    case True{} 83: activate(5, s)
    case True{} 78: activate(2, s)
    case True{} 77: activate(1, s)
    case True{} 72: activate(27, s)
    case True{} 37: key_arrow(alt, s, 13, Bool.pick(U32, U32.is_gt(Model.file_of(focus(s)), 0), U32.sub(focus(s), 1), focus(s)))
    case True{} 39: key_arrow(alt, s, 14, Bool.pick(U32, U32.is_lt(Model.file_of(focus(s)), 7), U32.add(focus(s), 1), focus(s)))
    case True{} 38: key_arrow(alt, s, 15, Bool.pick(U32, U32.is_lt(Model.rank_of(focus(s)), 7), U32.add(focus(s), 8), focus(s)))
    case True{} 40: key_arrow(alt, s, 16, Bool.pick(U32, U32.is_gt(Model.rank_of(focus(s)), 0), U32.sub(focus(s), 8), focus(s)))
    case True{} 187: activate(17, s)
    case True{} 189: activate(18, s)
    case _ _: result(s, [], 0)

def key_blocked(blocked: Bool, down: Bool, code: U32, s: State, alt: Bool) -> Update:
  match blocked:
    case True{}: result(s, [], 0)
    case False{}: key_plain(down, code, s, alt)

def key(down: Bool, +code: U32, s: State, +alt: Bool, ctrl: Bool) -> Update:
  key_blocked(Bool.or(ctrl, Bool.and(alt, Bool.and(U32.is_ge(code, 65), U32.is_le(code, 90)))), down, code, s, alt)

def pointer_up(dragging: Bool, s: State) -> Update:
  match dragging:
    case True{}: pref_result(set_drag(s, False{}), 2)
    case False{}: result(s, [], 0)

def tick_choice(anim: Bool, bot: Bool, +s: State, +ms: U32) -> Update:
  match anim bot:
    case True{} _: result(set_elapsed(s, U32.min(240, U32.add(elapsed(s), U32.min(ms, 240)))), [], Bool.pick(U32, U32.is_ge(U32.add(elapsed(s), U32.min(ms, 240)), 240), 2, 1))
    case _ True{}: command(s, Match.MoveCommand{revision(s), AI.choose(pos(s), legal(s))})
    case _ _: result(s, [], 0)

def square_input(fresh: Bool, s: State, square: U32) -> Update:
  match fresh:
    case True{}: click_square(s, square)
    case False{}: result(s, [], 0)

def tick_offer(offer: Bool, +s: State, ms: U32) -> Update:
  match offer:
    case True{}: command(s, Match.DeclineCommand{revision(s), Bool.not(U32.is_eq(Types.meta_offer(meta(s)), 1))})
    case False{}: tick_choice(moving(s), bot_ready(s), s, ms)

def tick(replay: Bool, +s: State, ms: U32) -> Update:
  match replay:
    case True{}: replay_tick(replay_state(s), s)
    case False{}: tick_offer(bot_offer(s), s, ms)

def error_text(+kind: U32) -> String:
  match kind:
    case 9001: "Record exceeds 2 MiB. Current game is unchanged."
    case 9002: "Saved data is damaged. Use recovery or start a new match."
    case 9003: "Cannot read saved data. Existing files were kept."
    case 9004: "Preferences could not be read; defaults are in use."
    case _: String.append("IO operation failed: ", U32.show(kind))

def candidate_text(r: Maybe<&2, Replay>, fallback: String) -> String:
  match r:
    case None{}: fallback
    case Some{Replay{_, _, _, text, _, _, _, _, _}}: text

def corrupt_storage(recovering: Bool, +s: State) -> Update:
  match recovering:
    case True{}: result(notice(s, error_text(9002)), [], 2)
    case False{}: invalid_record(s, candidate_text(replay_state(s), raw(s)))

def replay_preference_warning(r: Maybe<&2, Replay>) -> Maybe<&2, Replay>:
  match r:
    case None{}: None{}
    case Some{Replay{g, cs, record, text, imported, done, total, _, r}}:
      Some{Replay{g, cs, record, text, imported, done, total, True{}, r}}

def port_error(+kind: U32, +s: State) -> Update:
  match kind:
    case 9002: corrupt_storage(Types.meta_recovery(meta(s)), s)
    case 9003:
      +text = candidate_text(replay_state(s), raw(s))
      +stopped = set_raw(set_replay(recovery(pause(clear(menu(s, 6)), True{}), True{}), None{}), text)
      result(notice(stopped, error_text(kind)), [], 2)
    case 9004: result(notice(set_replay(s, replay_preference_warning(replay_state(s))), error_text(kind)), [], 2)
    case _: result(notice(pause(s, True{}), error_text(kind)), [], 2)

def input(e: Types.Input, +s: State) -> Update:
  match e:
    case Types.PointerDown{x, y, +button, alt}: pointer_down(Bool.or(U32.is_eq(button, 2), Bool.and(U32.is_eq(button, 0), alt)), s, x, y, button)
    case Types.PointerMove{x, y}: pointer_move(drag(s), s, x, y)
    case Types.PointerUp{x, y, button}: pointer_up(drag(s), s)
    case Types.Wheel{x, y, delta}: camera(s, wheel_view(view(s), delta), 1)
    case Types.KeyInput{code, down, alt, ctrl, shift}: key(down, code, s, alt, ctrl)
    case Types.Activate{id}: activate(id, s)
    case Types.SquareInput{square, expected}: square_input(U32.is_eq(expected, Types.meta_revision(meta(s))), s, square)
    case Types.Tick{ms}: tick(replaying(s), s, ms)
    case Types.Resize{w, h}: result(set_height(set_width(s, w), h), [], 2)
    case Types.FileText{+text}: load_record(Codec.decode(text), s, text, True{})
    case Types.PortError{kind}: port_error(kind, s)

def merge(u: Update, before: List<&2, Types.Effect>, old_redraw: U32) -> Update:
  match u:
    case Update{s, effects, redraw, after}: Update{s, List.append(&2, Types.Effect, before, effects), U32.max(old_redraw, redraw), after}

def is_tick(e: Types.Input) -> Bool:
  match e:
    case Types.Tick{_}: True{}
    case _: False{}

def budget_input(skip: Bool, e: Types.Input, s: State) -> Update:
  match skip:
    case True{}: result(s, [], 0)
    case False{}: input(e, s)

def update_go(events: List<&2, Types.Input>, u: Update, +spent: Bool) -> Update:
  match events u:
    case [] _: u
    case +e <> tail Update{+s, effects, redraw, delay}:
      +replay_tick = Bool.and(is_tick(e), replaying(s))
      update_go(tail, merge(budget_input(Bool.and(spent, replay_tick), e, s), effects, redraw), Bool.or(spent, replay_tick))

def update(events: List<&2, Types.Input>, s: State) -> Update:
  update_go(events, result(s, [], 0), False{})

def update_state(u: Update) -> State:
  match u:
    case Update{s, _, _, _}: s

def update_effects(u: Update) -> List<&2, Types.Effect>:
  match u:
    case Update{_, effects, _, _}: effects

def update_redraw(u: Update) -> U32:
  match u:
    case Update{_, _, redraw, _}: redraw

def update_after(u: Update) -> U32:
  match u:
    case Update{_, _, _, after}: after

def application_status(+s: State) -> U32:
  Types.meta_outcome(meta(s))


