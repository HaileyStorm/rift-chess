# The complete portable application. Platform adapters only transport events,
# present pixels, and execute the explicit IO effects produced here.
import Base
import ./core/Model.bend as Model
import ./graphics/Camera.bend as Camera
import ./graphics/Picking.bend as Picking
import ./graphics/Scene.bend as Scene
import ./graphics/v2game/BoardScene.bend as BoardScene
import ./ui/Types.bend as T
import ./ui/Layout.bend as Layout
import ./ui/v2/Chrome.bend as Chrome
import ./ui/v2/ChromePlan.bend as ChromePlan
import ./ui/State.bend as S
import ./ui/Program.bend as Program
import ./ui/Codec.bend as Codec
import ./lib/audio/Synthesis.bend as Synthesis

# The settled ground is cached until the holes, theme, view or the legal Shift
# indicators change.
type Ground is Data:
  Ground{valid: Bool, image: Image, holes: U32, theme: U32, view: Camera.View, shifts: List<&2, U32>}
type Session is Data:
  Session{program: S.State, background: Image, chrome: Image, ground: Ground,
    prepared: Image, image: Image, cameraStyle: U32}
type Presentation is Data:
  Presentation{position: Model.Position, view: Camera.View, revision: U32,
    mobile: Bool, menu: U32, plan: ChromePlan.Plan}
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

def background_matches(g: Ground, +frame: Scene.Frame) -> Bool:
  match g:
    case Ground{valid, image, holes, theme, view, shifts}:
      Bool.and(valid, U32.is_eq(theme, Scene.frame_theme(frame)))

def animated_shift(+frame: Scene.Frame) -> Bool:
  +action = Scene.frame_lastAction(frame)
  Bool.and(U32.is_ge(action, 20480), Bool.and(U32.is_lt(action, 21760), U32.is_lt(Scene.frame_progress(frame), 16)))

def background_refresh(keep: Bool, old: Image, +frame: Scene.Frame) -> Image:
  match keep:
    case True{}: old
    case False{}: BoardScene.underlay512_theme(Scene.frame_theme(frame))

def ground_refresh(keep: Bool, old: Ground, +frame: Scene.Frame, background: Image) -> Ground:
  match keep:
    case True{}: old
    case False{}:
      +position = Scene.frame_position(frame)
      +theme = Scene.frame_theme(frame)
      +view = Scene.frame_view(frame)
      +shifts = Scene.frame_shifts(frame)
      Ground{True{}, BoardScene.fast_ground512(frame, background), Model.pos_holes(position), theme, view, shifts}

def prepared_refresh(keep: Bool, old: Image, +frame: Scene.Frame,
  ground: Ground) -> Image:
  match keep:
    case True{}: old
    case False{}: BoardScene.fast_prepare512(frame, ground_image(ground))

def board(+frame: Scene.Frame, prepared: Image) -> Image:
  BoardScene.fast_pointer512(frame, prepared)

def chrome_refresh(refresh: Bool, old: Image, snapshot: T.Snapshot,
  plan: ChromePlan.Plan) -> Image:
  match refresh:
    case False{}: old
    case True{}: Chrome.chrome_only(10n, 1024, snapshot, plan)

def composed(+chrome: Image, board: Image, plan: ChromePlan.Plan) -> Parts:
  Parts{chrome, Chrome.compose(10n, 9n, plan, board, chrome)}

# The chrome and the board share only read-only inputs, so they are rendered as
# two independent branches and joined into the frame.
def render_parts(refresh: Bool, old: Image, +snapshot: T.Snapshot, +plan: ChromePlan.Plan,
  +frame: Scene.Frame, prepared: Image) -> Parts:
  chrome image = chrome_refresh(refresh, old, snapshot, plan)
    board(frame, prepared)
  composed(chrome, image, plan)

def camera_style(+view: Camera.View) -> U32:
  U32.add(Bool.to_u32(Layout.is_front_view(view)),
    U32.mul(2, Bool.to_u32(Layout.is_overhead_view(view))))

def summary(+snapshot: T.Snapshot) -> String:
  String.append("Rift Chess. ", String.append(
    Chrome.result_text(T.snapshot_meta(snapshot)),
    String.append(". ", String.append(Chrome.selected_text(snapshot),
      String.append(". ",
      Chrome.selection_hint(snapshot)))))

def presentation(+snapshot: T.Snapshot, +plan: ChromePlan.Plan) -> Presentation:
  +frame = T.snapshot_frame(snapshot)
  Presentation{Scene.frame_position(frame), Scene.frame_view(frame),
    T.meta_revision(T.snapshot_meta(snapshot)), T.snapshot_mobile(snapshot),
    T.panels_menu(T.snapshot_panels(snapshot)), plan}

def pack(+session: Session, effects: List<&2, T.Effect>, +image: Image,
  dirty: Bool, after: U32, +snapshot: T.Snapshot, +plan: ChromePlan.Plan) -> Packet:
  Packet{session, effects, image, Chrome.controls(plan),
    Chrome.plan_width(plan), Chrome.plan_height(plan), dirty, after,
    summary(snapshot), presentation(snapshot, plan)}

def finish.dirty(+redraw: U32, +state: S.State, effects: List<&2, T.Effect>, after: U32,
  +background: Image, chrome: Image, +ground: Ground,
  prepared: Image, style: U32) -> Packet:
  +snap = Program.snapshot(state)
  +plan = Chrome.plan(snap, Layout.controls(snap))
  +frame = T.snapshot_frame(snap)
  +moving = Bool.or(S.orbiting(state), T.snapshot_moving(snap))
  +shifting = animated_shift(frame)
  +next_background = background_refresh(background_matches(ground, frame), background, frame)
  +keep_ground = Bool.and(Bool.not(moving), Bool.and(Bool.not(shifting),
    ground_matches(ground, frame)))
  +next_ground = ground_refresh(keep_ground, ground, frame, next_background)
  +next_prepared = prepared_refresh(Bool.and(keep_ground, U32.is_lt(redraw, 2)),
    prepared, frame, next_ground)
  +next_style = camera_style(Scene.frame_view(frame))
  +refresh = Bool.or(U32.is_ge(redraw, 2), U32.is_ne(style, next_style))
  +parts = render_parts(refresh, chrome, snap, plan, frame, next_prepared)
  +rendered = parts_image(parts)
  pack(Session{state, next_background, parts_chrome(parts), next_ground,
    next_prepared, rendered, next_style}, effects, rendered, True{}, after, snap, plan)

def finish(dirty: Bool, +redraw: U32, +state: S.State, effects: List<&2, T.Effect>, after: U32,
  +background: Image, chrome: Image, +ground: Ground,
  prepared: Image, +old: Image, style: U32) -> Packet:
  match dirty:
    case False{}:
      +snap = Program.snapshot(state)
      pack(Session{state, background, chrome, ground, prepared, old, style}, effects, old,
        False{}, after, snap, Chrome.plan(snap, Layout.controls(snap)))
    case True{}: finish.dirty(redraw, state, effects, after, background, chrome,
      ground, prepared, style)

def apply(u: S.Update, background: Image, chrome: Image, ground: Ground,
  prepared: Image, old: Image, style: U32) -> Packet:
  match u:
    case S.Update{state, effects, +redraw, after}:
      finish(U32.is_ne(redraw, 0), redraw, state, effects, after,
        background, chrome, ground, prepared, old, style)

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
  apply(boot_update(Program.start(saved, prefs, width, height), errors), Pix{0}, Pix{0},
    Ground{False{}, Pix{0}, 0, 0, Camera.default_view(), []}, Pix{0}, Pix{0}, 0)

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
def presented_square.on(inside: Bool, +position: Model.Position,
  +view: Camera.View, +bounds: T.Rect, +scale: U32,
  +x: U32, +y: U32) -> U32:
  match inside:
    case False{}: 64
    case True{}:
      Picking.pick(position,
        U32.div(U32.sub(x, T.rect_x(bounds)), scale),
        U32.div(U32.sub(y, T.rect_y(bounds)), scale), Camera.basis(view))

def presented_square(+shown: Presentation, +x: U32, +y: U32) -> U32:
  match shown:
    case Presentation{position, view, revision, mobile, menu, +plan}:
      +bounds = Chrome.plan_board(plan)
      presented_square.on(Bool.and(U32.is_zero(menu), Layout.in_rect(x, y, bounds)),
        position, view, bounds, Chrome.plan_scale(plan), x, y)

def select_at(in_board: Bool, +shown: Presentation, x: U32, y: U32) -> T.Input:
  match in_board:
    case False{}: T.Activate{0}
    case True{}:
      match shown:
        case Presentation{position, view, revision, mobile, menu, +plan}:
          +bounds = Chrome.plan_board(plan)
          +scale = Chrome.plan_scale(plan)
          T.SquareInput{Picking.pick(position,
            U32.div(U32.sub(x, T.rect_x(bounds)), scale),
            U32.div(U32.sub(y, T.rect_y(bounds)), scale), Camera.basis(view)), revision}

def click_at(control: U32, +shown: Presentation, +x: U32, +y: U32) -> T.Input:
  match control:
    case 0:
      match shown:
        case Presentation{position, view, revision, mobile, menu, +plan}:
          select_at(Bool.and(U32.is_zero(menu), Layout.in_rect(x, y,
            Chrome.plan_board(plan))), shown, x, y)
    case _: T.Activate{control}

def event_at(event: T.Input, +shown: Presentation) -> T.Input:
  match event:
    case T.PointerDown{+x, +y, 0, False{}}:
      match shown:
        case Presentation{position, view, revision, mobile, menu, +plan}:
          click_at(Chrome.hit(plan, x, y), shown, x, y)
    case T.PointerMove{+x, +y}:
      T.PresentedMove{x, y, presented_square(shown, x, y)}
    case T.PointerUp{+x, +y, button}:
      T.PresentedUp{x, y, button, presented_square(shown, x, y)}
    case _: event

def events_at(events: List<&2, T.Input>, +shown: Presentation) -> List<&2, T.Input>:
  match events:
    case Nil{}: []
    case event <> rest: event_at(event, shown) <> events_at(rest, shown)

def dispatch_at(events: List<&2, T.Input>, shown: Presentation, session: Session) -> Packet:
  match session:
    case Session{state, background, chrome, ground, prepared, old, style}:
      apply(Program.update(events_at(events, shown), state),
        background, chrome, ground, prepared, old, style)

def dispatch(events: List<&2, T.Input>, session: Session) -> Packet:
  match session:
    case Session{+state, background, chrome, ground, prepared, old, style}:
      +snap = Program.snapshot(state)
      apply(Program.update(events_at(events,
        presentation(snap, Chrome.plan(snap, Layout.controls(snap)))), state),
        background, chrome, ground, prepared, old, style)

def tones(notes: List<&2, T.Note>) -> List<&2, Synthesis.Tone>:
  match notes:
    case Nil{}: []
    case T.Note{f, duration, wave, gain, delay} <> rest:
      Synthesis.Tone{f, duration, wave, gain, delay} <> tones(rest)

def audio_samples(notes: List<&2, T.Note>, rate: U32) -> List<&2, F32>:
  Synthesis.samples(tones(notes), rate)
