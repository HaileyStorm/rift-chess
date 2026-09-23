# Pure application controller. IO adapters execute effects; they do not choose
# game transitions. State lives in State.bend, persistence and replay in
# Commands.bend, player intents in Actions.bend.
import Base
import ../core/Model.bend as Model
import ../core/MatchSpec.bend as Match
import ../core/AI.bend as AI
import ../graphics/Camera.bend as Camera
import ../graphics/Picking.bend as Picking
import ../graphics/Scene.bend as Scene
import ./Types.bend as Types
import ./Layout.bend as Layout
import ./Codec.bend as Codec
import ./State.bend as S
import ./Records.bend as R
import ./Commands.bend as C
import ./Actions.bend as A

# Legal Shifts as deduplicated from*16+to pairs (promotion variants share one).
def shift_pairs(ids: List<&2, U32>, +acc: List<&2, U32>) -> List<&2, U32>:
  match ids:
    case Nil{}: acc
    case +h <> t:
      +pair = U32.div(U32.sub(h, 20480), 5)
      +keep = Bool.and(U32.is_ge(h, 20480), Bool.not(S.contains(acc, pair)))
      shift_pairs(t, Bool.pick(List<&2, U32>, keep, pair <> acc, acc))

def find_code(board: List<&2, U32>, +code: U32, +index: U32) -> U32:
  match board:
    case Nil{}: 64
    case +h <> t: Bool.pick(U32, U32.is_eq(h, code), index, find_code(t, code, U32.add(index, 1)))

def checked_king(in_check: Bool, +p: Model.Position) -> U32:
  match in_check:
    case False{}: 64
    case True{}: find_code(Model.pos_board(p), Bool.pick(U32, Model.pos_side(p), 6, 14), 0)

def shown(show: Bool, xs: List<&2, U32>) -> List<&2, U32>:
  match show:
    case True{}: xs
    case False{}: []

# A staged move shows only its own destination until the kernel commits it.
def staged_targets(staged: Bool, +shift: Bool, +intent: U32, show: Bool, ids: List<&2, U32>) -> List<&2, U32>:
  match staged:
    case True{}: S.targets([intent], shift)
    case False{}: shown(show, S.targets(ids, shift))

def snapshot(+s: S.State) -> Types.Snapshot:
  +p = S.prefs(s)
  +ids = S.selection_ids(S.legal(s), s)
  +staged = S.staged(s)
  +intent = S.intent(s)
  +targets = staged_targets(staged, False{}, intent, Types.preferences_showMoves(p), ids)
  +holes = staged_targets(staged, True{}, intent, Types.preferences_showShifts(p), ids)
  +shifts = shown(Types.preferences_showShifts(p), shift_pairs(S.legal(s), []))
  +check = checked_king(Types.meta_inCheck(S.meta(s)), S.pos(s))
  +progress = U32.min(16, U32.div(U32.mul(S.elapsed(s), 16), 240))
  +frame : Scene.Frame = Scene.Frame{S.pos(s), S.previous(s), S.selected(s), S.hover(s), targets, S.tile(s), holes, S.last(s), progress, Types.preferences_theme(p), S.view(s), shifts, check}
  Types.Snapshot{frame, p, S.meta(s), S.panels(s), S.legal(s), S.history(s), S.mobile(s), S.focus(s), S.moving(s), S.replaying(s), staged}

def board_square.at(inside: Bool, +s: S.State, +x: U32, +y: U32) -> U32:
  match inside:
    case False{}: 64
    case True{}:
      +rect = Layout.board_rect(S.mobile(s))
      Picking.pick(S.pos(s), U32.sub(x, Types.rect_x(rect)), U32.sub(y, Types.rect_y(rect)), Camera.basis(S.view(s)))

# The square under a pointer, or 64 off the board or behind an open menu.
def board_square(+s: S.State, +x: U32, +y: U32) -> U32:
  board_square.at(Bool.and(U32.is_zero(Types.panels_menu(S.panels(s))), Layout.in_rect(x, y, Layout.board_rect(S.mobile(s)))), s, x, y)

def drag_view(v: Camera.View, x: U32, y: U32, dx: U32, dy: U32) -> Camera.View:
  match v:
    case Camera.View{yaw, pitch, zoom}:
      Camera.View{F32.to_u32(R.wrap_degrees(F32.sub(U32.to_f32(yaw), F32.mul(F32.sub(U32.to_f32(x), U32.to_f32(dx)), 0.55)))), F32.to_u32(F32.clamp(F32.add(U32.to_f32(pitch), F32.mul(F32.sub(U32.to_f32(y), U32.to_f32(dy)), 0.25)), 35.0, 90.0)), zoom}

def orbit_view(p: S.Pointer, x: U32, y: U32) -> Camera.View:
  match p:
    case S.Pointer{_, dx, dy, view, _, _}: drag_view(view, x, y, dx, dy)

# Primary presses on the board arrive as SquareInput or Activate (Application
# translates them against the presented frame); only orbit presses land here.
def pointer_down(orbit: Bool, +s: S.State, +x: U32, +y: U32) -> S.Update:
  match orbit:
    case True{}: S.unchanged(S.set_pointer(s, S.Pointer{True{}, x, y, S.view(s), 64, False{}}))
    case False{}: S.unchanged(s)

def pointer_move(orbiting: Bool, +s: S.State, +x: U32, +y: U32) -> S.Update:
  match orbiting:
    case True{}: S.result(S.set_view(s, orbit_view(S.pointer(s), x, y)), [], 1)
    case False{}:
      +square = board_square(s, x, y)
      S.result(S.set_hover(s, square), [], Bool.pick(U32, U32.is_eq(square, S.hover(s)), 0, 1))

def pointer_up.primary(primary: Bool, +s: S.State, +x: U32, +y: U32) -> S.Update:
  match primary:
    case True{}: A.release(s, board_square(s, x, y))
    case False{}: S.unchanged(s)

def pointer_up(orbiting: Bool, +s: S.State, +x: U32, +y: U32, +button: U32) -> S.Update:
  match orbiting:
    case True{}: C.pref_result(S.set_pointer(s, S.released(x, y, S.view(s))), 2)
    case False{}: pointer_up.primary(U32.is_zero(button), s, x, y)

def wheel_view(v: Camera.View, delta: F32) -> Camera.View:
  match v:
    case Camera.View{yaw, pitch, zoom}: Camera.View{yaw, pitch, F32.to_u32(F32.clamp(F32.sub(U32.to_f32(zoom), F32.mul(delta, 0.025)), 75.0, 115.0))}

def key_arrow(alt: Bool, +s: S.State, control: U32, +square: U32) -> S.Update:
  match alt:
    case True{}: A.activate(control, s)
    case False{}: S.result(S.set_hover(S.set_focus(s, square), square), [], 1)

def key_undo.for(menu_zero: Bool, +s: S.State) -> S.Update:
  match menu_zero:
    case True{}: A.activate(3, s)
    case False{}: S.unchanged(s)

def key_undo(+s: S.State) -> S.Update:
  key_undo.for(U32.is_zero(Types.panels_menu(S.panels(s))), s)

def key_plain(down: Bool, code: U32, +s: S.State, alt: Bool) -> S.Update:
  match down code:
    case False{} _: S.unchanged(s)
    case True{} 13: A.board(False{}, s, S.focus(s))
    case True{} 32: A.board(False{}, s, S.focus(s))
    case True{} 27: S.redrawn(S.clear(S.menu(s, 0)))
    case True{} 85: key_undo(s)
    case True{} 83: A.activate(5, s)
    case True{} 78: A.activate(2, s)
    case True{} 77: A.activate(1, s)
    case True{} 72: A.activate(27, s)
    case True{} 37: key_arrow(alt, s, 13, Bool.pick(U32, U32.is_gt(Model.file_of(S.focus(s)), 0), U32.sub(S.focus(s), 1), S.focus(s)))
    case True{} 39: key_arrow(alt, s, 14, Bool.pick(U32, U32.is_lt(Model.file_of(S.focus(s)), 7), U32.add(S.focus(s), 1), S.focus(s)))
    case True{} 38: key_arrow(alt, s, 15, Bool.pick(U32, U32.is_lt(Model.rank_of(S.focus(s)), 7), U32.add(S.focus(s), 8), S.focus(s)))
    case True{} 40: key_arrow(alt, s, 16, Bool.pick(U32, U32.is_gt(Model.rank_of(S.focus(s)), 0), U32.sub(S.focus(s), 8), S.focus(s)))
    case True{} 187: A.activate(17, s)
    case True{} 189: A.activate(18, s)
    case _ _: S.unchanged(s)

def key_blocked(blocked: Bool, down: Bool, code: U32, +s: S.State, alt: Bool) -> S.Update:
  match blocked:
    case True{}: S.unchanged(s)
    case False{}: key_plain(down, code, s, alt)

def key(down: Bool, +code: U32, +s: S.State, +alt: Bool, ctrl: Bool) -> S.Update:
  key_blocked(Bool.or(ctrl, Bool.and(alt, Bool.and(U32.is_ge(code, 65), U32.is_le(code, 90)))), down, code, s, alt)

# One scheduled step: validate a record, answer a bot-mode draw offer, advance
# the animation, commit a staged move, then let the bot choose.
def tick_bot(bot: Bool, +s: S.State) -> S.Update:
  match bot:
    case True{}:
      +id = AI.choose!(S.pos(s), S.legal(s))
      C.command(s, Match.MoveCommand{S.revision(s), id})
    case False{}: S.unchanged(s)

def tick_staged(staged: Bool, +s: S.State) -> S.Update:
  match staged:
    case True{}: A.request_move(S.set_intent(s, 21760), S.intent(s))
    case False{}: tick_bot(S.bot_ready(s), s)

def tick_anim(anim: Bool, +s: S.State, +ms: U32) -> S.Update:
  match anim:
    case True{}:
      +elapsed = U32.min(240, U32.add(S.elapsed(s), U32.min(ms, 240)))
      S.result(S.set_elapsed(s, elapsed), [], Bool.pick(U32, U32.is_ge(elapsed, 240), 2, 1))
    case False{}: tick_staged(S.staged(s), s)

def tick_offer(offer: Bool, +s: S.State, +ms: U32) -> S.Update:
  match offer:
    case True{}:
      +side = Bool.not(U32.is_eq(Types.meta_offer(S.meta(s)), 1))
      C.with_notice(C.command(s, Match.DeclineCommand{S.revision(s), side}), Types.meta_revision(S.meta(s)), "The local bot declines draw offers.")
    case False{}: tick_anim(S.moving(s), s, ms)

def tick(replay: Bool, +s: S.State, +ms: U32) -> S.Update:
  match replay:
    case True{}: C.replay_tick(S.replay_state(s), s)
    case False{}: tick_offer(S.bot_offer(s), s, ms)

def merge(u: S.Update, before: List<&2, Types.Effect>, old_redraw: U32) -> S.Update:
  match u:
    case S.Update{s, effects, redraw, after}: S.Update{s, List.append(&2, Types.Effect, before, effects), U32.max(old_redraw, redraw), after}

def square_input(fresh: Bool, +s: S.State, +square: U32) -> S.Update:
  match fresh:
    case True{}: A.board(True{}, s, square)
    case False{}: A.stale_press(s, square)

def commit_staged(ready: Bool, +s: S.State) -> S.Update:
  match ready:
    case True{}: A.request_move(S.set_intent(s, 21760), S.intent(s))
    case False{}: S.unchanged(s)

def square_after(u: S.Update, +square: U32, +expected: U32) -> S.Update:
  match u:
    case S.Update{+s, effects, redraw, after}:
      merge(square_input(U32.is_eq(expected, Types.meta_revision(S.meta(s))), s, square), effects, redraw)

# A press that arrives while a chosen move waits for its tick commits that
# move first, so the press applies to the board the player will see next.
def square_press(+s: S.State, +square: U32, +expected: U32) -> S.Update:
  square_after(commit_staged(Bool.and(S.staged(s), Bool.not(S.moving(s))), s), square, expected)

def input(e: Types.Input, +s: S.State) -> S.Update:
  match e:
    case Types.PointerDown{x, y, +button, alt}: pointer_down(Bool.or(U32.is_eq(button, 2), Bool.and(U32.is_eq(button, 0), alt)), s, x, y)
    case Types.PointerMove{x, y}: pointer_move(S.orbiting(s), s, x, y)
    case Types.PointerUp{x, y, button}: pointer_up(S.orbiting(s), s, x, y, button)
    case Types.Wheel{x, y, delta}: C.camera(s, wheel_view(S.view(s), delta), 1)
    case Types.KeyInput{code, down, alt, ctrl, shift}: key(down, code, s, alt, ctrl)
    case Types.Activate{id}: A.activate(id, s)
    case Types.SquareInput{square, expected}: square_press(s, square, expected)
    case Types.Tick{ms}: tick(S.replaying(s), s, ms)
    case Types.Resize{w, h}: S.redrawn(S.set_height(S.set_width(s, w), h))
    case Types.FileText{+text}: C.load_record(Codec.decode(text), s, text, True{})
    case Types.PortError{kind}: C.port_error(kind, s)

def is_tick(e: Types.Input) -> Bool:
  match e:
    case Types.Tick{_}: True{}
    case _: False{}

def budget_input(skip: Bool, e: Types.Input, +s: S.State) -> S.Update:
  match skip:
    case True{}: S.unchanged(s)
    case False{}: input(e, s)

# A batch may carry several Ticks; record validation takes at most one step.
def update_go(events: List<&2, Types.Input>, u: S.Update, +spent: Bool) -> S.Update:
  match events u:
    case [] _: u
    case +e <> tail S.Update{+s, effects, redraw, delay}:
      +replay_tick = Bool.and(is_tick(e), S.replaying(s))
      update_go(tail, merge(budget_input(Bool.and(spent, replay_tick), e, s), effects, redraw), Bool.or(spent, replay_tick))

def update(events: List<&2, Types.Input>, +s: S.State) -> S.Update:
  update_go(events, S.unchanged(s), False{})

def start(+saved: String, preferences: String, width: U32, height: U32) -> S.Update:
  C.start(saved, preferences, width, height)
