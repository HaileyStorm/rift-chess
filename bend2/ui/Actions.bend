# Player intents from the board and the controls. Every action is checked
# against the cached legal list and the match-control guards before it reaches
# the kernel through Commands.
import Base
import ../core/Model.bend as Model
import ../core/MatchSpec.bend as Match
import ../graphics/Camera.bend as Camera
import ./Types.bend as Types
import ./Layout.bend as Layout
import ./State.bend as S
import ./Records.bend as R
import ./Commands.bend as C

def menu_id(+s: S.State) -> U32:
  Types.panels_menu(S.panels(s))

def side_name(side: Bool) -> String:
  Bool.pick(String, side, "White", "Black")

# Undo: a bot game rewinds at once and pauses the bot; hotseat asks the other
# player to agree first.
def undo_request_text(requester_white: Bool) -> String:
  String.append(side_name(requester_white), " requested undo. Other player must agree.")

def undo_request(+s: S.State) -> S.State:
  +requester_white = Bool.not(Types.meta_turn(S.meta(s)))
  +requester = Bool.pick(U32, requester_white, 1, 2)
  S.set_panels(s, Types.set_panels_notice(Types.set_panels_page(Types.set_panels_menu(S.panels(s), 8), requester), undo_request_text(requester_white)))

def undo_other_turn(+s: S.State) -> Bool:
  +requester_white = U32.is_eq(Types.panels_page(S.panels(s)), 1)
  Bool.xor(requester_white, Types.meta_turn(S.meta(s)))

def undo_accept_allowed(+s: S.State) -> Bool:
  Bool.and(Bool.and(Bool.and(U32.is_eq(menu_id(s), 8),
      U32.is_zero(S.mode(s))), Types.meta_canUndo(S.meta(s))),
    Bool.and(undo_other_turn(s), Bool.not(Bool.or(Bool.or(S.moving(s), S.staged(s)), S.replaying(s)))))

def undo_ready(+s: S.State) -> Bool:
  Bool.and(Bool.and(Types.meta_canUndo(S.meta(s)),
      Bool.not(Bool.or(Bool.or(S.moving(s), S.staged(s)), S.replaying(s)))),
    U32.is_zero(menu_id(s)))

def undo_activate.allowed(hotseat: Bool, +s: S.State) -> S.Update:
  match hotseat:
    case True{}: S.redrawn(undo_request(s))
    case False{}: C.command(S.pause(s, True{}), Match.UndoCommand{S.revision(s)})

def undo_activate.for(hotseat: Bool, allowed: Bool, +s: S.State) -> S.Update:
  match allowed:
    case False{}: S.unchanged(s)
    case True{}: undo_activate.allowed(hotseat, s)

def undo_activate(+s: S.State) -> S.Update:
  undo_activate.for(U32.is_zero(S.mode(s)), undo_ready(s), s)

def undo_accept.for(allowed: Bool, +s: S.State) -> S.Update:
  match allowed:
    case True{}: C.command(s, Match.UndoCommand{S.revision(s)})
    case False{}: S.unchanged(s)

def undo_accept(+s: S.State) -> S.Update:
  undo_accept.for(undo_accept_allowed(s), s)

# Moves. A chosen move is staged first so its frame is shown before the kernel
# commit; the next Tick commits it through request_move.
def move_allowed(ok: Bool, +s: S.State, +id: U32) -> S.Update:
  match ok:
    case False{}: S.unchanged(s)
    case True{}: C.command(S.pause(s, False{}), Match.MoveCommand{S.revision(s), id})

def request_move(+s: S.State, +id: U32) -> S.Update:
  move_allowed(Bool.and(Bool.and(S.interactive(s), U32.is_ne(menu_id(s), 8)),
    S.contains(S.legal(s), id)), s, id)

def stage_allowed(ok: Bool, +s: S.State, +id: U32) -> S.Update:
  match ok:
    case False{}: S.unchanged(s)
    case True{}: S.redrawn(S.set_intent(S.menu(s, 0), id))

def stage_move(+s: S.State, +id: U32) -> S.Update:
  stage_allowed(Bool.and(Bool.and(S.selectable(s), U32.is_ne(menu_id(s), 8)),
    S.contains(S.legal(s), id)), s, id)

def promotion_or_move(promote: Bool, +s: S.State, +id: U32) -> S.Update:
  match promote:
    case True{}: S.redrawn(S.menu(S.set_pending(s, U32.mul(U32.div(id, 5), 5)), 4))
    case False{}: stage_move(s, id)

def destination.for(ok: Bool, +s: S.State, +id: U32) -> S.Update:
  match ok:
    case False{}: S.unchanged(s)
    case True{}: promotion_or_move(U32.is_ne(U32.mod(id, 5), 0), s, id)

def destination(+s: S.State, +id: U32) -> S.Update:
  destination.for(Bool.and(S.selectable(s), S.contains(S.legal(s), id)), s, id)

def promote(+s: S.State, +piece: U32) -> S.Update:
  stage_move(s, U32.add(S.pending(s), piece))

# Selection: an own piece, or a tile that can Shift. Anything else (an enemy,
# a hole, a tile with no legal Shift) clears the selection.
def select_square(+s: S.State, +square: U32) -> S.State:
  +own = Model.same_side(Model.board_get(Model.pos_board(S.pos(s)), square), Model.pos_side(S.pos(s)))
  +shiftable = Bool.and(Bool.not(own), Layout.shift_source(S.legal(s), Model.macro_of(square)))
  S.set_focus(S.set_tile(S.set_selected(S.clear(s), Bool.pick(U32, own, square, 64)), Bool.pick(U32, shiftable, Model.macro_of(square), 16)), square)

def board_toggle(deferred: Bool, +s: S.State, +square: U32) -> S.Update:
  match deferred:
    case True{}: S.unchanged(S.pressed(s, square, True{}))
    case False{}: S.redrawn(S.clear(s))

def board_choice(toggle: Bool, has_dest: Bool, +deferred: Bool, +s: S.State, +square: U32, +id: U32) -> S.Update:
  match toggle has_dest:
    case True{} _: board_toggle(deferred, s, square)
    case _ True{}: destination(s, id)
    case _ _: S.redrawn(S.pressed(select_square(s, square), Bool.pick(U32, deferred, square, 64), False{}))

def board_allowed(ok: Bool, +deferred: Bool, +s: S.State, +square: U32) -> S.Update:
  match ok:
    case False{}: S.unchanged(s)
    case True{}:
      +id = S.destination_at(S.selection_ids(S.legal(s), s), square)
      +toggle = Bool.or(U32.is_eq(S.selected(s), square), U32.is_eq(S.tile(s), Model.macro_of(square)))
      board_choice(toggle, U32.is_lt(id, 21760), deferred, s, square, id)

# A board press or keyboard activation. A pointer press on the current
# selection defers its toggle to release, so the press can start a drag.
def board(+deferred: Bool, +s: S.State, +square: U32) -> S.Update:
  board_allowed(Bool.and(S.selectable(s), Bool.and(U32.is_lt(square, 64), U32.is_zero(menu_id(s)))), deferred, s, square)

def release_drop(found: Bool, +s: S.State, +id: U32) -> S.Update:
  match found:
    case True{}: destination(s, id)
    case False{}: S.unchanged(s)

def release_toggle(toggle: Bool, +s: S.State) -> S.Update:
  match toggle:
    case True{}: S.redrawn(S.clear(s))
    case False{}: S.unchanged(s)

def release_choice(dragged: Bool, toggle: Bool, +s: S.State, +square: U32) -> S.Update:
  match dragged:
    case True{}:
      +id = S.destination_at(S.selection_ids(S.legal(s), s), square)
      release_drop(U32.is_lt(id, 21760), s, id)
    case False{}: release_toggle(toggle, s)

# Releasing on another square drops the selection there (drag-to-move);
# releasing where the press began completes a deferred toggle.
def release(+s: S.State, +square: U32) -> S.Update:
  +p = S.pointer(s)
  +press = S.pointer_press(p)
  release_choice(Bool.and(U32.is_lt(press, 64), U32.is_ne(press, square)), S.pointer_toggle(p), S.pressed(s, 64, False{}), square)

def shift_selected.for(ok: Bool, +s: S.State) -> S.Update:
  match ok:
    case False{}: S.unchanged(s)
    case True{}: S.redrawn(S.set_tile(S.set_selected(s, 64), Model.macro_of(S.selected(s))))

def shift_selected(+s: S.State) -> S.Update:
  +selected = S.selected(s)
  shift_selected.for(Bool.and(Bool.and(S.selectable(s), U32.is_lt(selected, 64)),
    Layout.shift_source(S.legal(s), Model.macro_of(selected))), s)

# Draw offers and resignation. Either side may offer off-turn in hotseat; bot
# mode acts only for the human side.
def side_action(allowed: Bool, resignation: Bool, +s: S.State, side: Bool) -> S.Update:
  match allowed:
    case False{}: S.unchanged(s)
    case True{}:
      match resignation:
        case True{}: C.command(s, Match.ResignCommand{S.revision(s), side})
        case False{}: C.command(s, Match.OfferCommand{S.revision(s), side})

def draw_menu_allowed(allowed: Bool, hotseat: Bool, +s: S.State) -> S.Update:
  match allowed:
    case True{}:
      match hotseat:
        case True{}: S.redrawn(S.menu(s, 9))
        case False{}:
          +white = U32.is_eq(S.mode(s), 1)
          side_action(S.actor_is_human(S.mode(s), white), False{}, s, white)
    case False{}: S.unchanged(s)

def draw_menu(+s: S.State) -> S.Update:
  draw_menu_allowed(Bool.and(S.match_controls_live(s), U32.is_zero(Types.meta_offer(S.meta(s)))), U32.is_zero(S.mode(s)), s)

def resign_notice(side: Bool) -> String:
  String.append(side_name(side), " will resign. Confirm to end the match.")

def resign_menu_allowed(allowed: Bool, +hotseat: Bool, +s: S.State) -> S.Update:
  match allowed:
    case True{}:
      +white = U32.is_eq(S.mode(s), 1)
      +page = Bool.pick(U32, hotseat, 0, Bool.pick(U32, white, 1, 2))
      +text = Bool.pick(String, hotseat, "", resign_notice(white))
      S.redrawn(S.set_panels(s, Types.set_panels_notice(Types.set_panels_page(Types.set_panels_menu(S.panels(s), 5), page), text)))
    case False{}: S.unchanged(s)

def resign_menu(+s: S.State) -> S.Update:
  resign_menu_allowed(S.match_controls_live(s), U32.is_zero(S.mode(s)), s)

def resign_choice_allowed(allowed: Bool, +side: Bool, +s: S.State) -> S.Update:
  match allowed:
    case False{}: S.unchanged(s)
    case True{}:
      S.redrawn(S.set_panels(s, Types.set_panels_notice(Types.set_panels_page(S.panels(s), Bool.pick(U32, side, 1, 2)), resign_notice(side))))

def resign_choice(+side: Bool, +s: S.State) -> S.Update:
  +allowed = Bool.and(Bool.and(Bool.and(U32.is_eq(menu_id(s), 5), U32.is_zero(S.mode(s))), S.match_controls_live(s)), S.actor_is_human(S.mode(s), side))
  resign_choice_allowed(allowed, side, s)

def offer_choice(+side: Bool, +s: S.State) -> S.Update:
  +open = Bool.and(Bool.and(U32.is_eq(menu_id(s), 9), U32.is_zero(S.mode(s))), S.match_controls_live(s))
  side_action(Bool.and(Bool.and(open, U32.is_zero(Types.meta_offer(S.meta(s)))), S.actor_is_human(S.mode(s), side)), False{}, s, side)

def confirm_resign.page(page: U32, +s: S.State) -> S.Update:
  match page:
    case 1:
      side_action(Bool.and(U32.is_eq(menu_id(s), 5), Bool.and(S.match_controls_live(s), S.actor_is_human(S.mode(s), True{}))), True{}, s, True{})
    case 2:
      side_action(Bool.and(U32.is_eq(menu_id(s), 5), Bool.and(S.match_controls_live(s), S.actor_is_human(S.mode(s), False{}))), True{}, s, False{})
    case _: S.unchanged(s)

def confirm_resign(+s: S.State) -> S.Update:
  confirm_resign.page(Types.panels_page(S.panels(s)), s)

# The player who did not offer answers; a decline is reported in the notice.
def offer_answer.by(accept: Bool, +side: Bool, +s: S.State) -> S.Update:
  match accept:
    case True{}: C.command(s, Match.AcceptCommand{S.revision(s), side})
    case False{}: C.with_notice(C.command(s, Match.DeclineCommand{S.revision(s), side}), Types.meta_revision(S.meta(s)), String.append(side_name(side), " declines the draw offer."))

def offer_answer(accept: Bool, +s: S.State) -> S.Update:
  offer_answer.by(accept, Bool.not(U32.is_eq(Types.meta_offer(S.meta(s)), 1)), s)

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

def activate_other(dest: Bool, +id: U32, +s: S.State) -> S.Update:
  match dest:
    case True{}: destination(s, U32.sub(id, 1000))
    case False{}: C.camera(s, camera_control(id, S.view(s)), 2)

def preference(+s: S.State, p: Types.Preferences) -> S.Update:
  C.pref_result(S.set_prefs(s, p), 2)

def history_count(+s: S.State) -> U32:
  U32.from_nat(List.length(&2, String, S.history(s)))

def history_page(+s: S.State, +next: Bool) -> S.Update:
  +page = Types.panels_page(S.panels(s))
  +last = Layout.history_last_page(history_count(s))
  S.redrawn(S.page(s, Bool.pick(U32, next, U32.min(U32.add(page, 1), last), U32.sub(U32.max(page, 1), 1))))

def draft_with(+s: S.State, m: U32, l: Bool, p: U32) -> S.Update:
  S.redrawn(C.draft(s, m, l, p))

def activate.with(id: U32, +s: S.State, +p: Types.Preferences, +d: Types.Panels) -> S.Update:
  match id:
    case 0: S.unchanged(s)
    case 1: S.redrawn(S.menu(s, 2))
    case 2: draft_with(S.set_replay(s, None{}), S.mode(s), Types.preferences_layout(p), Types.preferences_policy(p))
    case 3: undo_activate(s)
    case 4: S.redrawn(S.clear(s))
    case 5: shift_selected(s)
    case 6: draw_menu(s)
    case 7: resign_menu(s)
    case 8: offer_answer(True{}, s)
    case 9: offer_answer(False{}, s)
    case 10: C.pref_result(S.pause(s, False{}), 2)
    case 20: S.result(s, [Types.Download{"rift-chess-record.json", R.record_text(s)}], 0)
    case 21: S.result(S.notice(S.set_replay(S.pause(s, U32.is_ne(S.mode(s), 0)), None{}), ""), [Types.PickFile{}], 2)
    case 22: preference(s, Types.set_preferences_theme(p, 0))
    case 23: preference(s, Types.set_preferences_theme(p, 1))
    case 24: preference(s, Types.set_preferences_sound(p, Bool.not(Types.preferences_sound(p))))
    case 25: preference(s, Types.set_preferences_volume(p, U32.min(100, U32.add(Types.preferences_volume(p), 5))))
    case 26: preference(s, Types.set_preferences_volume(p, U32.sub(U32.max(5, Types.preferences_volume(p)), 5)))
    case 27: S.redrawn(S.menu(s, 3))
    case 28: S.redrawn(S.clear(S.menu(s, 0)))
    case 29: C.new_match(s)
    case 30: draft_with(s, 0, Types.panels_draftLayout(d), Types.panels_draftPolicy(d))
    case 31: draft_with(s, 1, Types.panels_draftLayout(d), Types.panels_draftPolicy(d))
    case 32: draft_with(s, 2, Types.panels_draftLayout(d), Types.panels_draftPolicy(d))
    case 33: draft_with(s, Types.panels_draftMode(d), True{}, Types.panels_draftPolicy(d))
    case 34: draft_with(s, Types.panels_draftMode(d), False{}, Types.panels_draftPolicy(d))
    case 35: draft_with(s, Types.panels_draftMode(d), Types.panels_draftLayout(d), 0)
    case 36: draft_with(s, Types.panels_draftMode(d), Types.panels_draftLayout(d), 1)
    case 37: draft_with(s, Types.panels_draftMode(d), Types.panels_draftLayout(d), 2)
    case 38: promote(s, 1)
    case 39: promote(s, 2)
    case 40: promote(s, 3)
    case 41: promote(s, 4)
    case 42: confirm_resign(s)
    case 43: S.result(s, [Types.Download{"rift-chess-recovery.json", S.raw(s)}], 0)
    case 44: S.result(s, [Types.OpenUrl{"https://haileystorm.github.io/rift-chess/"}], 0)
    case 45: history_page(s, False{})
    case 46: history_page(s, True{})
    case 47: S.redrawn(S.menu(s, 7))
    case 48: undo_accept(s)
    case 49: offer_choice(True{}, s)
    case 50: offer_choice(False{}, s)
    case 51: resign_choice(True{}, s)
    case 52: resign_choice(False{}, s)
    case 53: preference(s, Types.set_preferences_showMoves(p, Bool.not(Types.preferences_showMoves(p))))
    case 54: preference(s, Types.set_preferences_showShifts(p, Bool.not(Types.preferences_showShifts(p))))
    case 55: S.redrawn(S.page(S.menu(s, 10), Layout.history_last_page(history_count(s))))
    case +other: activate_other(U32.is_ge(other, 1000), other, s)

def activate(id: U32, +s: S.State) -> S.Update:
  activate.with(id, s, S.prefs(s), S.panels(s))
