# Persistent text (saved record and preferences) and human-readable labels.
import Base
import ../core/Model.bend as Model
import ../core/MatchSpec.bend as Match
import ../graphics/Camera.bend as Camera
import ./Types.bend as Types
import ./Layout.bend as Layout
import ./Json.bend as Json
import ./Codec.bend as Codec
import ./State.bend as S

def number(n: U32) -> Json.Value:
  Codec.number(n)

def view_json(v: Camera.View) -> Json.Value:
  match v:
    case Camera.View{yaw, pitch, zoom}: Json.Object{[Json.Field{"yaw", number(yaw)}, Json.Field{"pitch", number(pitch)}, Json.Field{"zoom", number(zoom)}]}

def preferences_text(+s: S.State) -> String:
  +p = S.prefs(s)
  +mode = S.mode(s)
  Json.stringify(Json.Object{[
    Json.Field{"mode", Json.Text{Bool.pick(String, U32.is_eq(mode, 0), "hotseat", "bot")}},
    Json.Field{"humanWhite", Json.Boolean{Bool.not(U32.is_eq(mode, 2))}},
    Json.Field{"botPaused", Json.Boolean{Types.meta_botPaused(S.meta(s))}},
    Json.Field{"theme", number(Types.preferences_theme(p))},
    Json.Field{"sound", Json.Boolean{Types.preferences_sound(p)}},
    Json.Field{"volume", Json.Number{F32.div(U32.to_f32(Types.preferences_volume(p)), 100.0), ""}},
    Json.Field{"view", view_json(Types.preferences_view(p))},
    Json.Field{"showMoves", Json.Boolean{Types.preferences_showMoves(p)}},
    Json.Field{"showShifts", Json.Boolean{Types.preferences_showShifts(p)}}]})

def record_text(+s: S.State) -> String:
  Codec.encode(Codec.Record{Types.preferences_layout(S.prefs(s)), Types.preferences_policy(S.prefs(s)), S.journal(s)})

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

# Missing or malformed fields fall back individually; layout and draw policy
# belong to the saved record, never to preferences.
def load_preferences(v: Maybe<&2, Json.Value>, +s: S.State) -> S.State:
  match v:
    case None{}: s
    case Some{+j}:
      +p = S.prefs(s)
      +mode = Bool.pick(U32, Codec.text_is(Json.field(j, "mode"), "bot"), Bool.pick(U32, get_bool(Json.field(j, "humanWhite"), True{}), 1, 2), 0)
      +loaded : Types.Preferences = Types.Preferences{mode, Types.preferences_layout(p), Types.preferences_policy(p),
        U32.min(1, get_num(Json.field(j, "theme"), 0)), get_bool(Json.field(j, "sound"), True{}),
        get_volume(Json.field(j, "volume")), get_view(Json.field(j, "view")),
        get_bool(Json.field(j, "showMoves"), False{}), get_bool(Json.field(j, "showShifts"), True{})}
      S.pause(S.set_prefs(s, loaded), get_bool(Json.field(j, "botPaused"), False{}))

def promotion_name(p: U32) -> String:
  match p:
    case 1: " = Queen"
    case 2: " = Rook"
    case 3: " = Bishop"
    case 4: " = Knight"
    case _: ""

def action_label(a: Model.Action) -> String:
  match a:
    case Model.MoveAction{from, to, promotion}: String.append(Layout.square_name(from), String.append(" -> ", String.append(Layout.square_name(to), promotion_name(promotion))))
    case Model.ShiftAction{from, to, promotion}: String.append("Shift ", String.append(Layout.tile_name(from), String.append(" -> ", String.append(Layout.tile_name(to), promotion_name(promotion)))))

def command_label(c: Match.Command) -> String:
  match c:
    case Match.MoveCommand{_, id}: action_label(S.action(id))
    case Match.UndoCommand{_}: "Undo"
    case Match.OfferCommand{_, side}: String.append(Bool.pick(String, side, "White", "Black"), " offers a draw")
    case Match.AcceptCommand{_, _}: "Draw accepted"
    case Match.DeclineCommand{_, _}: "Draw declined"
    case Match.ResignCommand{_, side}: String.append(Bool.pick(String, side, "White", "Black"), " resigns")

def labels_go(cs: List<&2, Match.Command>, acc: List<&2, String>) -> List<&2, String>:
  match cs:
    case []: List.reverse(&2, String, acc)
    case c <> t: labels_go(t, command_label(c) <> acc)

def labels(cs: List<&2, Match.Command>) -> List<&2, String>:
  labels_go(cs, [])

def error_text(+kind: U32) -> String:
  match kind:
    case 9001: "Record exceeds 2 MiB. Current game is unchanged."
    case 9002: "Saved data is damaged. Use recovery or start a new match."
    case 9003: "Cannot read saved data. Existing files were kept."
    case 9004: "Preferences could not be read; defaults are in use."
    case _: String.append("IO operation failed: ", U32.show(kind))

def candidate_text(r: Maybe<&2, S.Replay>, fallback: String) -> String:
  match r:
    case None{}: fallback
    case Some{S.Replay{_, _, _, text, _, _, _, _, _}}: text
