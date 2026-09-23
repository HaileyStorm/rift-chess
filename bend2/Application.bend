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
import ./ui/Program.bend as Program
import ./ui/Codec.bend as Codec
import ./lib/audio/Synthesis.bend as Synthesis

type Ground is Data:
  Ground{valid: Bool, image: Image, holes: U32, theme: U32, view: Camera.View}
type Session is Data:
  Session{program: Program.State, background: Image, chrome: Image, ground: Ground, image: Image, cameraStyle: U32}
type Presentation is Data:
  Presentation{position: Model.Position, view: Camera.View, revision: U32,
    mobile: Bool, menu: U32, controls: List<&2, T.Control>}
type Packet is Data:
  Packet{session: Session, effects: List<&2, T.Effect>, image: Image,
    controls: List<&2, T.Control>, width: U32, height: U32, dirty: Bool,
    after: U32, summary: String, presentation: Presentation}

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

def ground_image(g: Ground) -> Image:
  match g:
    case Ground{_, image, _, _, _}: image

def ground_matches(g: Ground, +frame: Scene.Frame) -> Bool:
  match g:
    case Ground{valid, _, holes, theme, view}:
      Bool.and(valid, Bool.and(U32.is_eq(holes, Model.pos_holes(T.frame_position(frame))),
        Bool.and(U32.is_eq(theme, T.frame_theme(frame)), view_equal(view, T.frame_view(frame)))))

def animated_shift(+frame: Scene.Frame) -> Bool:
  Bool.and(U32.is_ge(T.frame_lastAction(frame), 20480), Bool.and(
    U32.is_lt(T.frame_lastAction(frame), 21760), U32.is_lt(T.frame_progress(frame), 16)))

def ground_refresh(keep: Bool, old: Ground, +frame: Scene.Frame, background: Image) -> Ground:
  match keep:
    case True{}: old
    case False{}:
      Ground{True{}, Scene.ground_base(background, T.frame_position(frame), T.frame_theme(frame), T.frame_view(frame)),
        Model.pos_holes(T.frame_position(frame)), T.frame_theme(frame), T.frame_view(frame)}

def board(moving: Bool, shifting: Bool, +frame: Scene.Frame, ground: Ground, background: Image) -> Image:
  match moving shifting:
    case True{} _: Scene.render_on(True{}, background, frame)
    case False{} True{}: Scene.render_on(False{}, background, frame)
    case False{} False{}: Scene.pieces_on(Scene.feedback_on(ground_image(ground), frame), frame)

def chrome_refresh(refresh: Bool, old: Image, snapshot: T.Snapshot) -> Image:
  match refresh:
    case False{}: old
    case True{}: View.chrome(snapshot)

def camera_style(+view: Camera.View) -> U32:
  U32.add(Bool.to_u32(Layout.is_front_view(view)),
    U32.mul(2, Bool.to_u32(Layout.is_overhead_view(view))))

def summary(+snapshot: T.Snapshot) -> String:
  String.append("Rift Chess. ", String.append(
    View.state_text(T.snapshot_meta(snapshot)),
    String.append(". ", T.panels_notice(T.snapshot_panels(snapshot)))))

def presentation(+snapshot: T.Snapshot, controls: List<&2, T.Control>) -> Presentation:
  Presentation{T.frame_position(T.snapshot_frame(snapshot)), T.frame_view(T.snapshot_frame(snapshot)),
    T.meta_revision(T.snapshot_meta(snapshot)), T.snapshot_mobile(snapshot),
    T.panels_menu(T.snapshot_panels(snapshot)), controls}

def pack(+session: Session, effects: List<&2, T.Effect>, +image: Image,
  dirty: Bool, after: U32, +snapshot: T.Snapshot) -> Packet:
  +controls = Layout.controls(snapshot)
  Packet{session, effects, image, controls, Layout.width(T.snapshot_mobile(snapshot)),
    Layout.height(T.snapshot_mobile(snapshot)), dirty, after, summary(snapshot), presentation(snapshot, controls)}

def finish(dirty: Bool, +redraw: U32, +state: Program.State, effects: List<&2, T.Effect>, after: U32,
  +background: Image, chrome: Image, +ground: Ground, +old: Image, style: U32) -> Packet:
  match dirty:
    case False{}:
      pack(Session{state, background, chrome, ground, old, style}, effects, old, False{}, after, Program.snapshot(state))
    case True{}:
      +snap = Program.snapshot(state)
      +frame = T.snapshot_frame(snap)
      +moving = Bool.or(Program.drag(state), T.snapshot_moving(snap))
      +shifting = animated_shift(frame)
      +next_ground = ground_refresh(Bool.or(moving, Bool.or(shifting, ground_matches(ground, frame))), ground, frame, background)
      +next_style = camera_style(T.frame_view(frame))
      +next_chrome = chrome_refresh(Bool.or(U32.is_ge(redraw, 2), U32.is_ne(style, next_style)), chrome, snap)
      +rendered = View.compose(snap, board(moving, shifting, frame, next_ground, background), next_chrome)
      pack(Session{state, background, next_chrome, next_ground, rendered, next_style}, effects, rendered, True{}, after, snap)

def apply(u: Program.Update, background: Image, chrome: Image, ground: Ground, old: Image, style: U32) -> Packet:
  match u:
    case Program.Update{state, effects, +redraw, after}:
      finish(U32.is_ne(redraw, 0), redraw, state, effects, after, background, chrome, ground, old, style)

def boot_update(u: Program.Update, errors: List<&2, T.Input>) -> Program.Update:
  match u:
    case Program.Update{state, effects, redraw, after}:
      match errors:
        case []: Program.Update{state, effects, redraw, after}
        case h <> rest:
          Program.merge(Program.update(h <> rest, state), effects, redraw)

def boot_events(saved: String, prefs: String, width: U32, height: U32,
  errors: List<&2, T.Input>) -> Packet:
  apply(boot_update(Program.start(saved, prefs, width, height), errors), Scene.background(), Pix{0},
    Ground{False{}, Pix{0}, 0, 0, Camera.default_view()}, Pix{0}, 0)

def boot(saved: String, prefs: String, width: U32, height: U32) -> Packet:
  boot_events(saved, prefs, width, height, [])

# IO reports only whether each read succeeded. Bend chooses recovery policy.
def boot_reads(saved: String, prefs: String, saved_ok: Bool, prefs_ok: Bool,
  width: U32, height: U32) -> Packet:
  +preference_errors = Bool.pick(List<&2, T.Input>, prefs_ok, [], [T.PortError{9004}])
  +saved_errors = Bool.pick(List<&2, T.Input>, saved_ok, [], [T.PortError{9003}])
  boot_events(saved, prefs, width, height,
    List.append(&2, T.Input, preference_errors, saved_errors))

def contains(rect: T.Rect, +x: U32, +y: U32) -> Bool:
  match rect:
    case T.Rect{+left, +top, width, height}:
      Bool.and(Bool.and(U32.is_ge(x, left), U32.is_ge(y, top)),
        Bool.and(U32.is_lt(U32.sub(x, left), width), U32.is_lt(U32.sub(y, top), height)))

def hit(controls: List<&2, T.Control>, +x: U32, +y: U32, best: U32) -> U32:
  match controls:
    case Nil{}: best
    case +c <> rest:
      hit(rest, x, y, Bool.pick(U32, Bool.and(T.control_enabled(c), contains(T.control_bounds(c), x, y)), T.control_id(c), best))

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
          select_at(Bool.and(U32.is_zero(menu), contains(Layout.board_rect(mobile), x, y)), shown, x, y)
    case _: T.Activate{control}

def event_at(event: T.Input, +shown: Presentation) -> T.Input:
  match event:
    case T.PointerDown{+x, +y, 0, False{}}:
      match shown:
        case Presentation{position, view, revision, mobile, menu, controls}:
          click_at(hit(controls, x, y, 0), shown, x, y)
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

def inspect(session: Session) -> T.Snapshot:
  match session:
    case Session{state, _, _, _, _, _}: Program.snapshot(state)

def packet_session(p: Packet) -> Session:
  match p:
    case Packet{s, _, _, _, _, _, _, _, _, _}: s
def packet_effects(p: Packet) -> List<&2, T.Effect>:
  match p:
    case Packet{_, e, _, _, _, _, _, _, _, _}: e
def packet_image(p: Packet) -> Image:
  match p:
    case Packet{_, _, i, _, _, _, _, _, _, _}: i
def packet_after(p: Packet) -> U32:
  match p:
    case Packet{_, _, _, _, _, _, _, a, _, _}: a

def tones(notes: List<&2, T.Note>) -> List<&2, Synthesis.Tone>:
  match notes:
    case Nil{}: []
    case T.Note{f, duration, wave, gain, delay} <> rest:
      Synthesis.Tone{f, duration, wave, gain, delay} <> tones(rest)

def audio_samples(notes: List<&2, T.Note>, rate: U32) -> List<&2, F32>:
  Synthesis.samples(tones(notes), rate)
