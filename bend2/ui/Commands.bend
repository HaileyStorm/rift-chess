# Kernel commands, persistence effects and record replay. Every accepted
# transition comes from the frozen kernel; this module only sequences it.
import Base
import ../core/Model.bend as Model
import ../core/v2/Facade.bend as Kernel
import ../core/MatchSpec.bend as Match
import ../graphics/Camera.bend as Camera
import ./Types.bend as Types
import ./Json.bend as Json
import ./Codec.bend as Codec
import ./State.bend as S
import ./Records.bend as R
import ./SoundCues.bend as SoundCues

# The fallback always owns a prior UI state. Its recursive tail makes this a
# compiler-boxed, nonempty handle while the new game's legal IDs are computed.
# Only `NewMatchFallback{state, []}` is constructed here; malformed shapes
# report an error using the old state rather than inventing a replacement.
type NewMatchFallback is Data:
  NewMatchFallback{state: S.State, tail: List<&2, NewMatchFallback>}

def stored(+s: S.State) -> List<&2, Types.Effect>:
  [Types.Store{0, R.record_text(s)}, Types.Store{1, R.preferences_text(s)}]

def pref_result(+s: S.State, redraw: U32) -> S.Update:
  S.result(s, [Types.Store{1, R.preferences_text(s)}], redraw)

def camera(+s: S.State, v: Camera.View, redraw: U32) -> S.Update:
  pref_result(S.set_view(s, v), redraw)

def sound_effect(capture: Bool, +s: S.State, +id: U32) -> List<&2, Types.Effect>:
  +p = S.prefs(s)
  +terminal = Bool.not(U32.is_eq(S.outcome_code(s), 0))
  +shift = Bool.and(U32.is_ge(id, 20480), U32.is_lt(id, 21760))
  Bool.pick(List<&2, Types.Effect>, Types.preferences_sound(p),
    [Types.Sound{SoundCues.notes(terminal, Types.meta_inCheck(S.meta(s)),
      shift, capture, Types.preferences_volume(p))}], [])

def command_action(c: Match.Command) -> U32:
  match c:
    case Match.MoveCommand{_, id}: id
    case _: 21760

# These are the only accepted commands that preserve the match position. Keep
# the fallback on the full refresh: Undo and Move can change it, while New and
# Import enter through their own full-refresh paths below.
def refreshed_command(c: Match.Command, +s: S.State, +g: Match.Match) -> S.State:
  match c:
    case Match.OfferCommand{_, _}: S.refreshed_same_position(s, g)
    case Match.AcceptCommand{_, _}: S.refreshed_same_position(s, g)
    case Match.DeclineCommand{_, _}: S.refreshed_same_position(s, g)
    case Match.ResignCommand{_, _}: S.refreshed_same_position(s, g)
    case _: S.refreshed(s, g)

def quiet_reminder(+s: S.State) -> S.State:
  +due = Bool.and(U32.is_eq(Types.preferences_policy(S.prefs(s)), 0), Bool.and(Nat.is_ge(Model.pos_quiet(S.pos(s)), 100n), Bool.and(U32.is_eq(S.outcome_code(s), 0), Bool.not(S.reminder_seen(S.reminded(s), Model.pos_side(S.pos(s)))))))
  +next = S.set_reminded(s, S.reminder_match(S.reminded(s), S.game(s)))
  Bool.pick(S.State, due, S.notice(next, String.append(Bool.pick(String, Model.pos_side(S.pos(s)), "White", "Black"), ": 100 quiet actions. Play on or offer a draw for agreement.")), next)

def command_result.record(+s: S.State, +c: Match.Command, g: Match.Match) -> S.State:
  +previous = S.pos(s)
  commands = List.append(&2, Match.Command, S.journal(s), [c])
  labels = List.append(&2, String, S.history(s), [R.command_label(c)])
  refreshed = refreshed_command(c, s, g)
  S.set_previous(S.set_history(S.set_journal(S.clear(S.menu(refreshed, 0)), commands), labels), previous)

def command_result.finish(capture: Bool, +id: U32, +recorded: S.State) -> S.Update:
  +next = S.set_elapsed(S.set_last(recorded, id), Bool.pick(U32, U32.is_lt(id, 21760), 1, 240))
  +audible = Bool.or(U32.is_lt(id, 21760), Bool.not(U32.is_eq(S.outcome_code(next), 0)))
  S.result(quiet_reminder(next), List.append(&2, Types.Effect, stored(next), Bool.pick(List<&2, Types.Effect>, audible, sound_effect(capture, next, id), [])), 2)

def command_result(r: Match.StepResult, +s: S.State, +c: Match.Command) -> S.Update:
  match r:
    case Match.Rejected{_}: S.result(S.notice(s, "That command is unavailable."), [], 2)
    case Match.Accepted{g}:
      +id = command_action(c)
      +capture = Model.occupied(Model.board_get(Model.pos_board(S.pos(s)), Model.action_to(S.action(id))))
      recorded = command_result.record(s, c, g)
      command_result.finish(capture, id, recorded)

def command_guard(locked: Bool, +s: S.State, +c: Match.Command) -> S.Update:
  match locked:
    case True{}: S.unchanged(s)
    case False{}: command_result(Kernel.command(S.game(s), c), s, c)

def command_limit(full: Bool, +s: S.State, c: Match.Command) -> S.Update:
  match full:
    case True{}: S.result(S.notice(s, "Record limit reached. Export this record and start a new match."), [], 2)
    case False{}: command_guard(Bool.or(S.replaying(s), Bool.or(Types.meta_recovery(S.meta(s)), S.moving(s))), s, c)

def command(+s: S.State, +c: Match.Command) -> S.Update:
  command_limit(U32.is_ge(Types.meta_revision(S.meta(s)), 20000), s, c)

# Explains an accepted command; a rejected one keeps the kernel's notice.
def with_notice(u: S.Update, +before: U32, text: String) -> S.Update:
  match u:
    case S.Update{+s, effects, +redraw, after}:
      +changed = U32.is_ne(Types.meta_revision(S.meta(s)), before)
      S.Update{Bool.pick(S.State, changed, S.notice(s, text), s), effects, Bool.pick(U32, changed, U32.max(redraw, 2), redraw), after}

def invalid_record(+s: S.State, +text: String) -> S.Update:
  S.result(S.notice(S.menu(S.recovery(S.set_raw(S.set_replay(s, None{}), text), True{}), 6), "Record rejected. Original text retained; download recovery or start a new match."), [Types.Store{2, text}], 2)

def install_record(g: Maybe<&2, Match.Match>, +s: S.State, +text: String, +r: Codec.Record, +imported: Bool) -> S.Update:
  match g r:
    case None{} _: invalid_record(s, text)
    case Some{m} Codec.Record{layout, pol, +cs}:
      +loaded = Types.set_preferences_mode(Types.set_preferences_layout(Types.set_preferences_policy(S.prefs(s), pol), layout), Bool.pick(U32, imported, 0, S.mode(s)))
      +reset = S.recovery(S.pause(S.clear(S.menu(S.set_last(S.set_elapsed(S.set_replay(s, None{}), 240), 21760), 0)), Bool.pick(Bool, imported, False{}, Types.meta_botPaused(S.meta(s)))), False{})
      +next = S.refreshed(S.set_history(S.set_journal(S.set_prefs(reset, loaded), cs), R.labels(cs)), m)
      S.result(next, stored(next), 2)

def load_record(r: Maybe<&2, Codec.Record>, +s: S.State, text: String, imported: Bool) -> S.Update:
  match r:
    case None{}: invalid_record(s, text)
    case Some{+record}:
      match record:
        case Codec.Record{layout, pol, +cs}:
          +replay : S.Replay = S.Replay{Kernel.start(layout, S.policy(pol)), cs, record, text, imported, 0, U32.from_nat(List.length(&2, Match.Command, cs)), False{}, S.Reminder{False{}, False{}}}
          S.redrawn(S.notice(S.set_replay(S.clear(S.page(s, 0)), Some{replay}), "Validating record. New Match or Import cancels validation."))

# One accepted command per scheduled Tick. Candidate state never enters the
# accepted journal until the complete record has validated.
def replay_progress(+s: S.State, r: S.Replay) -> S.Update:
  match r:
    case S.Replay{g, cs, record, text, imported, +done, +total, +warning, r}:
      +status = String.append("Validating record: ", String.append(U32.show(done), String.append(" / ", String.append(U32.show(total), ". New Match or Import cancels."))))
      S.redrawn(S.notice(S.set_replay(s, Some{S.Replay{g, cs, record, text, imported, done, total, warning, r}}), String.append(Bool.pick(String, warning, "Preferences could not be read; defaults are in use. ", ""), status)))

def replay_accepted(step: Match.StepResult, s: S.State, cs: List<&2, Match.Command>, record: Codec.Record, text: String, imported: Bool, done: U32, total: U32, warning: Bool, r: S.Reminder) -> S.Update:
  match step:
    case Match.Rejected{_}: invalid_record(s, text)
    case Match.Accepted{+g}: replay_progress(s, S.Replay{g, cs, record, text, imported, U32.add(done, 1), total, warning, S.reminder_match(r, g)})

def replay_finished(u: S.Update, warning: Bool, r: S.Reminder) -> S.Update:
  match u warning:
    case S.Update{s, effects, redraw, delay} True{}: S.Update{S.notice(S.set_reminded(s, r), "Preferences could not be read; defaults are in use."), effects, redraw, delay}
    case S.Update{s, effects, redraw, delay} False{}: S.Update{S.set_reminded(s, r), effects, redraw, delay}

def replay_tick(r: Maybe<&2, S.Replay>, s: S.State) -> S.Update:
  match r:
    case None{}: S.unchanged(s)
    case Some{S.Replay{g, cs, record, text, imported, done, total, warning, r}}:
      match cs:
        case []: replay_finished(install_record(Some{g}, s, text, record, imported), warning, r)
        case c <> tail: replay_accepted(Kernel.command(g, c), s, tail, record, text, imported, done, total, warning, r)

def saved(empty: Bool, +s: S.State, +text: String) -> S.Update:
  match empty:
    case True{}: S.redrawn(s)
    case False{}: load_record(Codec.decode(text), s, text, False{})

def start(+saved_text: String, preferences: String, width: U32, height: U32) -> S.Update:
  +s = R.load_preferences(Json.parse(preferences), S.blank(width, height))
  saved(String.is_empty(saved_text), S.refreshed(s, S.game(s)), saved_text)

def draft(+s: S.State, m: U32, l: Bool, p: U32) -> S.State:
  S.set_panels(s, Types.Panels{1, 0, "", m, l, p})

def new_match.finish(+next: S.State) -> S.Update:
  S.result(next, stored(next), 2)

def new_match.box_failure(fallback: NewMatchFallback) -> S.Update:
  match fallback:
    case NewMatchFallback{state, tail}:
      +malformed = Bool.not(List.is_empty(&2, NewMatchFallback, tail))
      +message = Bool.pick(String, malformed,
        "New Match state box was malformed; your current game remains unchanged.",
        "New Match could not be prepared; your current game remains unchanged.")
      S.result(S.notice(state, message), [], 2)

def new_match.refreshed_box(+base: S.State, +g: Match.Match,
  +ids: List<&2, U32>) -> List<&2, S.State>:
  [S.refreshed.with_ids(base, g, ids)]

def new_match.after_refresh(next_box: List<&2, S.State>,
  fallback: NewMatchFallback) -> S.Update:
  match next_box:
    case +next <> tail:
      match tail:
        case Nil{}: new_match.finish(next)
        case _: new_match.box_failure(fallback)
    case Nil{}: new_match.box_failure(fallback)

def new_match.after_ids(state_box: List<&2, S.State>, fallback: NewMatchFallback,
  +g: Match.Match, +ids: List<&2, U32>) -> S.Update:
  match state_box:
    case +base <> tail:
      match tail:
        case Nil{}: new_match.after_refresh(new_match.refreshed_box(base, g, ids), fallback)
        case _: new_match.box_failure(fallback)
    case Nil{}: new_match.box_failure(fallback)

def new_match.refresh(state_box: List<&2, S.State>, fallback: NewMatchFallback,
  +g: Match.Match) -> S.Update:
  match g:
    case Match.Match{initial, +p, actions, states, keys, rev, pol, offer, forced}:
      +ids = Kernel.legal_ids!(p)
      new_match.after_ids(state_box, fallback, g, ids)

def new_match(+s: S.State) -> S.Update:
  +d = S.panels(s)
  +l = Types.panels_draftLayout(d)
  +pol = Types.panels_draftPolicy(d)
  +loaded = Types.set_preferences_mode(Types.set_preferences_layout(Types.set_preferences_policy(S.prefs(s), pol), l), Types.panels_draftMode(d))
  fallback: NewMatchFallback = NewMatchFallback{s, []}
  +reset = S.recovery(S.pause(S.clear(S.menu(S.set_last(S.set_reminded(S.set_replay(s, None{}), S.Reminder{False{}, False{}}), 21760), 0)), False{}), False{})
  +base = S.set_elapsed(S.set_history(S.set_journal(S.set_prefs(reset, loaded), []), []), 240)
  state_box: List<&2, S.State> = [base]
  +g = Kernel.start(l, S.policy(pol))
  new_match.refresh(state_box, fallback, g)

def corrupt_storage(recovering: Bool, +s: S.State) -> S.Update:
  match recovering:
    case True{}: S.redrawn(S.notice(s, R.error_text(9002)))
    case False{}: invalid_record(s, R.candidate_text(S.replay_state(s), S.raw(s)))

def replay_preference_warning(r: Maybe<&2, S.Replay>) -> Maybe<&2, S.Replay>:
  match r:
    case None{}: None{}
    case Some{S.Replay{g, cs, record, text, imported, done, total, _, r}}:
      Some{S.Replay{g, cs, record, text, imported, done, total, True{}, r}}

def port_error(+kind: U32, +s: S.State) -> S.Update:
  match kind:
    case 9002: corrupt_storage(Types.meta_recovery(S.meta(s)), s)
    case 9003:
      +text = R.candidate_text(S.replay_state(s), S.raw(s))
      +stopped = S.set_raw(S.set_replay(S.recovery(S.pause(S.clear(S.menu(s, 6)), True{}), True{}), None{}), text)
      S.redrawn(S.notice(stopped, R.error_text(kind)))
    case 9004: S.redrawn(S.notice(S.set_replay(s, replay_preference_warning(S.replay_state(s))), R.error_text(kind)))
    case _: S.redrawn(S.notice(S.pause(s, True{}), R.error_text(kind)))
