# The complete portable application. Platform adapters only transport events,
# present pixels, and execute the explicit IO effects produced here.
import Base
import ./core/Model.bend as Model
import ./graphics/Camera.bend as Camera
import ./graphics/Picking.bend as Picking
import ./graphics/Scene.bend as Scene
import ./ui/Types.bend as T
import ./ui/Layout.bend as Layout
import ./ui/View.bend as View
import ./ui/State.bend as S
import ./ui/Program.bend as Program
import ./ui/Codec.bend as Codec
import ./lib/audio/Synthesis.bend as Synthesis

# The settled ground is cached until the holes, theme, view or the legal Shift
# indicators change.
type Ground is Data:
  Ground{valid: Bool, image: Image, holes: U32, theme: U32, view: Camera.View, shifts: List<&2, U32>}
type Session is Data:
  Session{program: S.State, background: Image, chrome: Image, ground: Ground, image: Image, cameraStyle: U32}
type Presentation is Data:
  Presentation{position: Model.Position, view: Camera.View, revision: U32,
    mobile: Bool, menu: U32, controls: List<&2, T.Control>}
type Packet is Data:
  Packet{session: Session, effects: List<&2, T.Effect>, image: Image,
    controls: List<&2, T.Control>, width: U32, height: U32, dirty: Bool,
    after: U32, summary: String, presentation: Presentation}
type Parts is Data:
  Parts{chrome: Image, image: Image}

# BEGIN GENERATED ACCESSORS: Parts prefix=parts_ getters
def parts_chrome(s: Parts) -> Image:
  match s:
    case Parts{chrome, _}: chrome

def parts_image(s: Parts) -> Image:
  match s:
    case Parts{_, image}: image
# END GENERATED ACCESSORS

def storage_key(slot: U32) -> String:
  match slot:
    case 0: "rift-bend-lab/save-v1"
    case 1: "rift-bend-lab/preferences-v1"
    case _: "rift-bend-lab/recovery-v1"

def max_file_bytes() -> U32:
  Codec.max_file_bytes()

def view_equal(a: Camera.View, b: Camera.View) -> Bool:
  match a b:
    case Camera.View{ay, ap, az} Camera.View{by, bp, bz}:
      Bool.and(U32.is_eq(ay, by), Bool.and(U32.is_eq(ap, bp), U32.is_eq(az, bz)))

def list_equal(a: List<&2, U32>, b: List<&2, U32>) -> Bool:
  match a b:
    case Nil{} Nil{}: True{}
    case x <> xs y <> ys: Bool.and(U32.is_eq(x, y), list_equal(xs, ys))
    case _ _: False{}

def ground_image(g: Ground) -> Image:
  match g:
    case Ground{_, image, _, _, _, _}: image

def ground_matches(g: Ground, +frame: Scene.Frame) -> Bool:
  match g:
    case Ground{valid, _, holes, theme, view, shifts}:
      Bool.and(Bool.and(valid, U32.is_eq(holes, Model.pos_holes(Scene.frame_position(frame)))),
        Bool.and(Bool.and(U32.is_eq(theme, Scene.frame_theme(frame)), view_equal(view, Scene.frame_view(frame))),
          list_equal(shifts, Scene.frame_shifts(frame))))

def animated_shift(+frame: Scene.Frame) -> Bool:
  +action = Scene.frame_lastAction(frame)
  Bool.and(U32.is_ge(action, 20480), Bool.and(U32.is_lt(action, 21760), U32.is_lt(Scene.frame_progress(frame), 16)))

def ground_refresh(keep: Bool, old: Ground, +frame: Scene.Frame, background: Image) -> Ground:
  match keep:
    case True{}: old
    case False{}:
      +position = Scene.frame_position(frame)
      +theme = Scene.frame_theme(frame)
      +view = Scene.frame_view(frame)
      +shifts = Scene.frame_shifts(frame)
      Ground{True{}, Scene.ground_marked(background, position, theme, view, shifts), Model.pos_holes(position), theme, view, shifts}

def board(moving: Bool, shifting: Bool, +frame: Scene.Frame, ground: Ground, background: Image) -> Image:
  match moving shifting:
    case True{} _: Scene.render_on(True{}, background, frame)
    case False{} True{}: Scene.render_on(False{}, background, frame)
    case False{} False{}: Scene.pieces_on(Scene.feedback_on(ground_image(ground), frame), frame)

def chrome_refresh(refresh: Bool, old: Image, snapshot: T.Snapshot, controls: List<&2, T.Control>) -> Image:
  match refresh:
    case False{}: old
    case True{}: View.chrome(snapshot, controls)

def composed(+chrome: Image, board: Image, snapshot: T.Snapshot) -> Parts:
  Parts{chrome, View.compose(snapshot, board, chrome)}

# The chrome and the board share only read-only inputs, so they are rendered as
# two independent branches and joined into the frame.
def render_parts(refresh: Bool, old: Image, +snapshot: T.Snapshot, controls: List<&2, T.Control>,
  moving: Bool, shifting: Bool, +frame: Scene.Frame, ground: Ground, background: Image) -> Parts:
  chrome image = chrome_refresh(refresh, old, snapshot, controls)
    board(moving, shifting, frame, ground, background)
  composed(chrome, image, snapshot)

def camera_style(+view: Camera.View) -> U32:
  U32.add(Bool.to_u32(Layout.is_front_view(view)),
    U32.mul(2, Bool.to_u32(Layout.is_overhead_view(view))))

# The selection is announced with the status so a non-visual user always has
# the selected-piece indicator of rules §10, overlays on or off.
def selection_note(+selected: U32, +tile: U32) -> String:
  Bool.pick(String, U32.is_lt(selected, 64), String.append(String.append("Selected ", Layout.square_name(selected)), ". "),
    Bool.pick(String, U32.is_lt(tile, 16), String.append(String.append("Selected tile ", Layout.tile_name(tile)), ". "), ""))

def summary(+snapshot: T.Snapshot) -> String:
  +frame = T.snapshot_frame(snapshot)
  String.append("Rift Chess. ", String.append(
    View.state_text(T.snapshot_meta(snapshot)),
    String.append(". ", String.append(selection_note(Scene.frame_selected(frame), Scene.frame_tile(frame)),
      View.status_note(snapshot)))))

def presentation(+snapshot: T.Snapshot, controls: List<&2, T.Control>) -> Presentation:
  +frame = T.snapshot_frame(snapshot)
  Presentation{Scene.frame_position(frame), Scene.frame_view(frame),
    T.meta_revision(T.snapshot_meta(snapshot)), T.snapshot_mobile(snapshot),
    T.panels_menu(T.snapshot_panels(snapshot)), controls}

def pack(+session: Session, effects: List<&2, T.Effect>, +image: Image,
  dirty: Bool, after: U32, +snapshot: T.Snapshot, +controls: List<&2, T.Control>) -> Packet:
  +mobile = T.snapshot_mobile(snapshot)
  Packet{session, effects, image, controls, Layout.width(mobile), Layout.height(mobile),
    dirty, after, summary(snapshot), presentation(snapshot, controls)}

def finish.dirty(+redraw: U32, +state: S.State, effects: List<&2, T.Effect>, after: U32,
  +background: Image, chrome: Image, +ground: Ground, style: U32) -> Packet:
  +snap = Program.snapshot(state)
  +controls = Layout.controls(snap)
  +frame = T.snapshot_frame(snap)
  +moving = Bool.or(S.orbiting(state), T.snapshot_moving(snap))
  +shifting = animated_shift(frame)
  +next_ground = ground_refresh(Bool.or(moving, Bool.or(shifting, ground_matches(ground, frame))), ground, frame, background)
  +next_style = camera_style(Scene.frame_view(frame))
  +refresh = Bool.or(U32.is_ge(redraw, 2), U32.is_ne(style, next_style))
  +parts = render_parts(refresh, chrome, snap, controls, moving, shifting, frame, next_ground, background)
  +rendered = parts_image(parts)
  pack(Session{state, background, parts_chrome(parts), next_ground, rendered, next_style}, effects, rendered, True{}, after, snap, controls)

def finish(dirty: Bool, +redraw: U32, +state: S.State, effects: List<&2, T.Effect>, after: U32,
  +background: Image, chrome: Image, +ground: Ground, +old: Image, style: U32) -> Packet:
  match dirty:
    case False{}:
      +snap = Program.snapshot(state)
      pack(Session{state, background, chrome, ground, old, style}, effects, old, False{}, after, snap, Layout.controls(snap))
    case True{}: finish.dirty(redraw, state, effects, after, background, chrome, ground, style)

def apply(u: S.Update, background: Image, chrome: Image, ground: Ground, old: Image, style: U32) -> Packet:
  match u:
    case S.Update{state, effects, +redraw, after}:
      finish(U32.is_ne(redraw, 0), redraw, state, effects, after, background, chrome, ground, old, style)

def has_boot_errors(+errors: List<&2, T.Input>) -> Bool:
  match errors:
    case Nil{}: False{}
    case head <> tail: True{}

def boot_update.for(has_errors: Bool, u: S.Update,
  errors: List<&2, T.Input>) -> S.Update:
  match has_errors u:
    case False{} S.Update{state, effects, redraw, after}:
      S.Update{state, effects, redraw, after}
    case True{} S.Update{state, effects, redraw, after}:
      Program.merge(Program.update(errors, state), effects, redraw)

def boot_update(u: S.Update, +errors: List<&2, T.Input>) -> S.Update:
  +has = has_boot_errors(errors)
  boot_update.for(has, u, errors)

def boot_events(saved: String, prefs: String, width: U32, height: U32,
  errors: List<&2, T.Input>) -> Packet:
  apply(boot_update(Program.start(saved, prefs, width, height), errors), Scene.background(), Pix{0},
    Ground{False{}, Pix{0}, 0, 0, Camera.default_view(), []}, Pix{0}, 0)

def boot(saved: String, prefs: String, width: U32, height: U32) -> Packet:
  boot_events(saved, prefs, width, height, [])

# IO reports only whether each read succeeded. Bend chooses recovery policy.
def boot_reads(saved: String, prefs: String, saved_ok: Bool, prefs_ok: Bool,
  width: U32, height: U32) -> Packet:
  +preference_errors = Bool.pick(List<&2, T.Input>, prefs_ok, [], [T.PortError{9004}])
  +saved_errors = Bool.pick(List<&2, T.Input>, saved_ok, [], [T.PortError{9003}])
  boot_events(saved, prefs, width, height,
    List.append(&2, T.Input, preference_errors, saved_errors))

# Picking uses the presented frame, so a click always means what was on screen.
def select_at(in_board: Bool, +shown: Presentation, x: U32, y: U32) -> T.Input:
  match in_board:
    case False{}: T.Activate{0}
    case True{}:
      match shown:
        case Presentation{position, view, revision, mobile, menu, controls}:
          +bounds = Layout.board_rect(mobile)
          T.SquareInput{Picking.pick(position, U32.sub(x, T.rect_x(bounds)), U32.sub(y, T.rect_y(bounds)), Camera.basis(view)), revision}

def click_at(control: U32, +shown: Presentation, +x: U32, +y: U32) -> T.Input:
  match control:
    case 0:
      match shown:
        case Presentation{position, view, revision, mobile, menu, controls}:
          select_at(Bool.and(U32.is_zero(menu), Layout.in_rect(x, y, Layout.board_rect(mobile))), shown, x, y)
    case _: T.Activate{control}

def event_at(event: T.Input, +shown: Presentation) -> T.Input:
  match event:
    case T.PointerDown{+x, +y, 0, False{}}:
      match shown:
        case Presentation{position, view, revision, mobile, menu, controls}:
          click_at(Layout.hit_controls(x, y, controls), shown, x, y)
    case _: event

def events_at(events: List<&2, T.Input>, +shown: Presentation) -> List<&2, T.Input>:
  match events:
    case Nil{}: []
    case event <> rest: event_at(event, shown) <> events_at(rest, shown)

def dispatch_at(events: List<&2, T.Input>, shown: Presentation, session: Session) -> Packet:
  match session:
    case Session{state, background, chrome, ground, old, style}:
      apply(Program.update(events_at(events, shown), state), background, chrome, ground, old, style)

def dispatch(events: List<&2, T.Input>, session: Session) -> Packet:
  match session:
    case Session{+state, background, chrome, ground, old, style}:
      +snap = Program.snapshot(state)
      apply(Program.update(events_at(events, presentation(snap, Layout.controls(snap))), state), background, chrome, ground, old, style)

def tones(notes: List<&2, T.Note>) -> List<&2, Synthesis.Tone>:
  match notes:
    case Nil{}: []
    case T.Note{f, duration, wave, gain, delay} <> rest:
      Synthesis.Tone{f, duration, wave, gain, delay} <> tones(rest)

def audio_samples(notes: List<&2, T.Note>, rate: U32) -> List<&2, F32>:
  Synthesis.samples(tones(notes), rate)
