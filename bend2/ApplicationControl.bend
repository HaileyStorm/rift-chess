# Bend-owned application policy for a separately compiled browser presentation.
# The generic host executes RenderPlan requests with Bend BoardScene and
# ChromeRaster modules. No game rule, picking, UI or detail decision lives there.
import Base
import ./core/Model.bend as Model
import ./graphics/Camera.bend as Camera
import ./graphics/Picking.bend as Picking
import ./graphics/Scene.bend as Scene
import ./ui/Types.bend as T
import ./ui/Layout.bend as Layout
import ./ui/v2/ChromePlan.bend as ChromePlan
import ./ui/v2/ChromePlanCompact.bend as Compact
import ./ui/v2/ChromeData.bend as ChromeData
import ./ui/v2/ChromeModel.bend as ChromeModel
import ./ui/v2/Quality.bend as Quality
import ./ui/State.bend as S
import ./ui/Program.bend as Program
import ./ui/Codec.bend as Codec
import ./lib/audio/Synthesis.bend as Synthesis

type GroundKey is Data:
  GroundKey{valid: Bool, holes: U32, theme: U32,
    view: Camera.View, shifts: List<&2, U32>}

type ShellKey is Data:
  ShellKey{valid: Bool, theme: U32, width: U32, height: U32}

type Session is Data:
  Session{program: S.State, ground: GroundKey, cameraStyle: U32,
    quality: Quality.State, shell: ShellKey}

type Presentation is Data:
  Presentation{position: Model.Position, view: Camera.View, revision: U32,
    menu: U32, plan: ChromePlan.Plan}

# Worker input is only a Bend-approved bot position and its current legal IDs.
# `eligible` may be true during the move animation so computation overlaps it;
# `canApply` remains false until the same revision is settled.
type BotJob is Data:
  BotJob{eligible: Bool, canApply: Bool, revision: U32,
    position: Model.Position, ids: List<&2, U32>}

# A closed set of pure rendering requests. The host holds immutable Image
# handles; it never decides which game/UI layer has become stale.
type RenderPlan is Data:
  RenderPlan{background: Bool, ground: Bool, prepared: Bool,
    chrome: Bool, frame: Bool, theme: U32,
    size: U32, boardSize: U32, depth: Nat, boardDepth: Nat,
    shell: Bool, motion: Bool}

type Packet is Data:
  Packet{session: Session, effects: List<&2, T.Effect>,
    snapshot: T.Snapshot, chromeData: ChromeData.Presentation,
    plan: ChromePlan.Plan, render: RenderPlan,
    controls: List<&2, T.Control>, width: U32, height: U32,
    dirty: Bool, after: U32, summary: String,
    presentation: Presentation}

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

def ground_matches(key: GroundKey, +frame: Scene.Frame) -> Bool:
  match key:
    case GroundKey{valid, holes, theme, view, shifts}:
      Bool.and(Bool.and(valid, U32.is_eq(holes,
        Model.pos_holes(Scene.frame_position(frame)))),
        Bool.and(Bool.and(U32.is_eq(theme, Scene.frame_theme(frame)),
          view_equal(view, Scene.frame_view(frame))),
          list_equal(shifts, Scene.frame_shifts(frame))))

def background_matches(key: GroundKey, +frame: Scene.Frame) -> Bool:
  match key:
    case GroundKey{valid, holes, theme, view, shifts}:
      Bool.and(valid, U32.is_eq(theme, Scene.frame_theme(frame)))

def shell_matches(key: ShellKey, +theme: U32,
  +width: U32, +height: U32) -> Bool:
  match key:
    case ShellKey{valid, old_theme, old_width, old_height}:
      Bool.and(valid, Bool.and(U32.is_eq(theme, old_theme),
        Bool.and(U32.is_eq(width, old_width), U32.is_eq(height, old_height))))

def next_shell_key(theme: U32, width: U32, height: U32) -> ShellKey:
  ShellKey{True{}, theme, width, height}

def shell_key_after(keep: Bool, old: ShellKey,
  theme: U32, width: U32, height: U32) -> ShellKey:
  match keep:
    case True{}: old
    case False{}: next_shell_key(theme, width, height)

def next_ground_key(+frame: Scene.Frame) -> GroundKey:
  GroundKey{True{}, Model.pos_holes(Scene.frame_position(frame)),
    Scene.frame_theme(frame), Scene.frame_view(frame), Scene.frame_shifts(frame)}

def ground_key_after(keep: Bool, old: GroundKey,
  +frame: Scene.Frame) -> GroundKey:
  match keep:
    case True{}: old
    case False{}: next_ground_key(frame)

def camera_style(+view: Camera.View) -> U32:
  U32.add(Bool.to_u32(Layout.is_front_view(view)),
    U32.mul(2, Bool.to_u32(Layout.is_overhead_view(view))))

def animated_shift(+frame: Scene.Frame) -> Bool:
  +action = Scene.frame_lastAction(frame)
  Bool.and(U32.is_ge(action, 20480),
    Bool.and(U32.is_lt(action, 21760), U32.is_lt(Scene.frame_progress(frame), 16)))

def summary(+snapshot: T.Snapshot) -> String:
  String.append("Rift Chess. ", String.append(
    ChromeModel.result_text(T.snapshot_meta(snapshot)),
    String.append(". ", String.append(ChromeModel.selected_text(snapshot),
      String.append(". ", ChromeModel.selection_hint(snapshot))))))

def presentation(+snapshot: T.Snapshot,
  +plan: ChromePlan.Plan) -> Presentation:
  +frame = T.snapshot_frame(snapshot)
  Presentation{Scene.frame_position(frame), Scene.frame_view(frame),
    T.meta_revision(T.snapshot_meta(snapshot)),
    T.panels_menu(T.snapshot_panels(snapshot)), plan}

def pack(+session: Session, effects: List<&2, T.Effect>,
  +snapshot: T.Snapshot, +plan: ChromePlan.Plan,
  +request: RenderPlan, dirty: Bool, after: U32) -> Packet:
  Packet{session, effects, snapshot, ChromeModel.presentation(snapshot),
    plan, request, ChromeModel.controls(plan),
    ChromeModel.plan_width(plan), ChromeModel.plan_height(plan),
    dirty, after, summary(snapshot), presentation(snapshot, plan)}

def viewport(+scale: U32, +board_depth: Nat, mobile: Bool) -> ChromePlan.Viewport:
  Bool.pick(ChromePlan.Viewport, mobile,
    ChromePlan.Viewport{512, 1024, scale, board_depth},
    ChromePlan.Viewport{1024, 640, scale, board_depth})

def compact.top(+id: U32) -> Bool:
  Bool.or(U32.is_eq(id,1),Bool.or(U32.is_eq(id,2),U32.is_eq(id,27)))

def compact.play(+id: U32, +has_destinations: Bool) -> Bool:
  Bool.or(compact.top(id),Bool.or(ChromePlan.dest_id(id),
    Bool.and(Bool.not(has_destinations),
      Bool.or(U32.is_eq(id,3),Bool.or(U32.is_eq(id,5),U32.is_eq(id,55))))))

def compact.show(+menu: U32, +id: U32, +has_destinations: Bool) -> Bool:
  Bool.pick(Bool,U32.is_zero(menu),compact.play(id,has_destinations),
    Bool.pick(Bool,Bool.or(U32.is_eq(menu,3),U32.is_eq(menu,7)),
      True{},Bool.not(compact.top(id))))

def compact.include(show: Bool, head: T.Control,
  rest: List<&2,T.Control>) -> List<&2,T.Control>:
  match show:
    case True{}: head <> rest
    case False{}: rest

def compact.filter(controls: List<&2,T.Control>, +menu: U32,
  +has_destinations: Bool) -> List<&2,T.Control>:
  match controls:
    case Nil{}: []
    case +head <> tail:
      +id = T.control_id(head)
      +rest = compact.filter(tail,menu,has_destinations)
      compact.include(compact.show(menu,id,has_destinations),
        T.Control{id,T.control_label(head),T.control_bounds(head),
          T.control_enabled(head),T.control_active(head)},rest)

def compact.openers(has_destinations: Bool, +snapshot: T.Snapshot) -> List<&2,T.Control>:
  match has_destinations:
    case True{}: []
    case False{}:
      [Layout.control(47,T.Rect{0,0,1,1},snapshot,False{}),
        T.Control{56,"VIEW",T.Rect{0,0,1,1},True{},False{}},
        T.Control{57,"MATCH",T.Rect{0,0,1,1},True{},False{}}]

def compact.ids(ids: List<&2,U32>, +snapshot: T.Snapshot) -> List<&2,T.Control>:
  match ids:
    case Nil{}: []
    case id <> tail:
      Layout.control(id,T.Rect{0,0,1,1},snapshot,False{}) <>
        compact.ids(tail,snapshot)

def compact.controls.for(menu: U32, +snapshot: T.Snapshot) -> List<&2,T.Control>:
  match menu:
    case 11: compact.ids([28,11,12,13,14,15,16,17,18,19],snapshot)
    case 12: compact.ids([28,3,4,6,7,8,9,10],snapshot)
    case 0:
      +has_destinations = U32.is_ne(Layout.destination_count(snapshot),0)
      List.append(&2,T.Control,
        compact.filter(Layout.controls(snapshot),menu,has_destinations),
        compact.openers(has_destinations,snapshot))
    case _:
      compact.filter(Layout.controls(snapshot),menu,False{})

def compact.controls(+snapshot: T.Snapshot) -> List<&2,T.Control>:
  compact.controls.for(T.panels_menu(T.snapshot_panels(snapshot)),snapshot)

def planned(+snapshot: T.Snapshot, +scale: U32,
  +board_depth: Nat) -> ChromePlan.Plan:
  +view = viewport(scale,board_depth,T.snapshot_mobile(snapshot))
  +base = ChromeModel.plan_for(snapshot,compact.controls(snapshot),view)
  Compact.plan_for(T.panels_menu(T.snapshot_panels(snapshot)),
    ChromePlan.plan_controls(base),view)

def finish.dirty(+redraw: U32, +state: S.State,
  effects: List<&2, T.Effect>, after: U32,
  +ground: GroundKey, +style: U32, +quality: Quality.State,
  +shell: ShellKey,
  +scale: U32, board_size: U32, depth: Nat, +board_depth: Nat,
  +tier_changed: Bool) -> Packet:
  +snapshot = Program.snapshot(state)
  +plan = planned(snapshot, scale, board_depth)
  +frame = T.snapshot_frame(snapshot)
  +orbiting = S.orbiting(state)
  +moving = Bool.or(orbiting, T.snapshot_moving(snapshot))
  +shifting = animated_shift(frame)
  +keep_ground = Bool.or(orbiting, Bool.and(Bool.not(tier_changed),
    Bool.and(Bool.not(moving), Bool.and(Bool.not(shifting),
      ground_matches(ground, frame)))))
  +keep_prepared = Bool.or(orbiting,
    Bool.and(keep_ground, U32.is_lt(redraw, 2)))
  +next_style = camera_style(Scene.frame_view(frame))
  +theme = Scene.frame_theme(frame)
  +width = ChromeModel.plan_width(plan)
  +height = ChromeModel.plan_height(plan)
  +shell_dirty = Bool.and(Bool.not(orbiting),
    Bool.not(shell_matches(shell, theme, width, height)))
  # The chrome has no continuously changing camera readout. While orbiting,
  # defer active-preset changes until release so a drag only rebuilds the board.
  +chrome_dirty = Bool.and(Bool.not(orbiting),
    Bool.or(shell_dirty, Bool.or(tier_changed,
      Bool.or(U32.is_ne(style, next_style), U32.is_ge(redraw, 2)))))
  +request : RenderPlan = RenderPlan{Bool.or(tier_changed,
    Bool.not(background_matches(ground, frame))),
    Bool.not(keep_ground), Bool.not(keep_prepared),
    chrome_dirty,
    True{}, theme, U32.mul(1024, scale), board_size,
    depth, board_depth, shell_dirty, orbiting}
  pack(Session{state, ground_key_after(keep_ground, ground, frame),
    Bool.pick(U32, chrome_dirty, next_style, style),
    quality, shell_key_after(Bool.not(shell_dirty), shell, theme, width, height)},
    effects, snapshot, plan, request, True{}, after)

def finish(clean: Bool, +redraw: U32, +state: S.State,
  effects: List<&2, T.Effect>, after: U32,
  +ground: GroundKey, style: U32, +quality: Quality.State,
  shell: ShellKey,
  +scale: U32, board_size: U32, depth: Nat, +board_depth: Nat,
  tier_changed: Bool) -> Packet:
  match clean:
    case True{}:
      +snapshot = Program.snapshot(state)
      +plan = planned(snapshot, scale, board_depth)
      +request : RenderPlan = RenderPlan{False{}, False{}, False{}, False{}, False{},
        Scene.frame_theme(T.snapshot_frame(snapshot)), U32.mul(1024, scale),
        board_size, depth, board_depth, False{}, False{}}
      pack(Session{state, ground, style, quality, shell}, effects, snapshot, plan,
        request, False{}, after)
    case False{}: finish.dirty(redraw, state, effects, after, ground, style,
      quality, shell, scale, board_size, depth, board_depth, tier_changed)

def quality_for(probe: Maybe<&2, Quality.Probe>, old: Quality.State,
  mobile: Bool) -> Quality.Decision:
  match probe:
    case None{}: Quality.current(old, mobile)
    case Some{Quality.Probe{_, physicalEdge, timingValid, sampleCount,
        measuredScale, mainP90Us, workerP90Us}}:
      Quality.choose(old, Quality.Probe{mobile, physicalEdge, timingValid,
        sampleCount, measuredScale, mainP90Us, workerP90Us})

def apply.decision(+state: S.State, effects: List<&2, T.Effect>,
  +redraw: U32, after: U32, ground: GroundKey, style: U32,
  +old_quality: Quality.State, shell: ShellKey,
  decision: Quality.Decision) -> Packet:
  match decision:
    case Quality.Decision{+next, scale, _, _, boardSize, depth,
        boardDepth, _, _}:
      +changed = Quality.decision_changed(old_quality, next)
      finish(Bool.and(U32.is_zero(redraw), Bool.not(changed)), redraw,
        state, effects, after, ground, style, next, shell,
        scale, boardSize, depth, boardDepth, changed)

def apply(u: S.Update, ground: GroundKey, style: U32,
  +old_quality: Quality.State, shell: ShellKey,
  probe: Maybe<&2, Quality.Probe>) -> Packet:
  match u:
    case S.Update{+state, effects, redraw, after}:
      +snapshot = Program.snapshot(state)
      apply.decision(state, effects, redraw, after, ground, style, old_quality,
        shell,
        quality_for(probe, old_quality, T.snapshot_mobile(snapshot)))

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
  apply(boot_update(Program.start(saved, prefs, width, height), errors),
    GroundKey{False{}, 0, 0, Camera.default_view(), []}, 0,
    Quality.initial_state(), ShellKey{False{}, 0, 0, 0}, None{})

def boot_reads(saved: String, prefs: String, saved_ok: Bool, prefs_ok: Bool,
  width: U32, height: U32) -> Packet:
  +preference_errors = Bool.pick(List<&2, T.Input>, prefs_ok, [], [T.PortError{9004}])
  +saved_errors = Bool.pick(List<&2, T.Input>, saved_ok, [], [T.PortError{9003}])
  boot_events(saved, prefs, width, height,
    List.append(&2, T.Input, preference_errors, saved_errors))

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
    case Presentation{position, view, revision, menu, +plan}:
      +bounds = ChromeModel.plan_board(plan)
      presented_square.on(Bool.and(U32.is_zero(menu), Layout.in_rect(x, y, bounds)),
        position, view, bounds, ChromeModel.plan_scale(plan), x, y)

def select_at(in_board: Bool, +shown: Presentation, x: U32, y: U32) -> T.Input:
  match in_board:
    case False{}: T.Activate{0}
    case True{}:
      match shown:
        case Presentation{position, view, revision, menu, +plan}:
          +bounds = ChromeModel.plan_board(plan)
          +scale = ChromeModel.plan_scale(plan)
          T.SquareInput{Picking.pick(position,
            U32.div(U32.sub(x, T.rect_x(bounds)), scale),
            U32.div(U32.sub(y, T.rect_y(bounds)), scale), Camera.basis(view)), revision}

def click_at(control: U32, +shown: Presentation, +x: U32, +y: U32) -> T.Input:
  match control:
    case 0:
      match shown:
        case Presentation{position, view, revision, menu, +plan}:
          select_at(Bool.and(U32.is_zero(menu), Layout.in_rect(x, y,
            ChromeModel.plan_board(plan))), shown, x, y)
    case _: T.Activate{control}

def event_at(event: T.Input, +shown: Presentation) -> T.Input:
  match event:
    case T.PointerDown{+x, +y, 0, False{}}:
      match shown:
        case Presentation{position, view, revision, menu, +plan}:
          click_at(ChromeModel.hit(plan, x, y), shown, x, y)
    case T.PointerMove{+x, +y}:
      T.PresentedMove{x, y, presented_square(shown, x, y)}
    case T.PointerUp{+x, +y, button}:
      T.PresentedUp{x, y, button, presented_square(shown, x, y)}
    case _: event

def events_at(events: List<&2, T.Input>, +shown: Presentation) -> List<&2, T.Input>:
  match events:
    case Nil{}: []
    case event <> rest: event_at(event, shown) <> events_at(rest, shown)

def latest_probe(events: List<&2, T.Input>,
  previous: Maybe<&2, Quality.Probe>) -> Maybe<&2, Quality.Probe>:
  match events:
    case Nil{}: previous
    case event <> rest:
      match event:
        case T.QualityProbe{portrait, physicalEdge, timingValid,
            sampleCount, measuredScale, mainP90Us, workerP90Us}:
          latest_probe(rest, Some{Quality.Probe{portrait, physicalEdge,
            timingValid, sampleCount, measuredScale, mainP90Us, workerP90Us}})
        case _: latest_probe(rest, previous)

def dispatch_at(+events: List<&2, T.Input>, shown: Presentation,
  session: Session) -> Packet:
  match session:
    case Session{state, ground, style, quality, shell}:
      +translated = events_at(events, shown)
      apply(Program.update(translated, state), ground, style,
        quality, shell, latest_probe(events, None{}))

# This browser-only controller variant defers just bot choice to the separately
# compiled WebWorker library. NativeV2 continues calling dispatch_at above.
def dispatch_at_web(+events: List<&2, T.Input>, shown: Presentation,
  session: Session) -> Packet:
  match session:
    case Session{state, ground, style, quality, shell}:
      +translated = events_at(events, shown)
      apply(Program.update_web(translated, state), ground, style,
        quality, shell, latest_probe(events, None{}))

# A background-render worker can return an immutable, fully authored Bend
# board image after the fast preview has been presented. This asks Bend to
# repaint the current snapshot without advancing rules, clocks, storage or
# audio. The browser still must reject stale worker results first.
def refine.decision(+state: S.State, ground: GroundKey, style: U32,
  quality: Quality.State, shell: ShellKey, decision: Quality.Decision) -> Packet:
  match decision:
    case Quality.Decision{_, scale, _, _, boardSize, depth, boardDepth, _, _}:
      finish.dirty(2,state,[],0,ground,style,quality,shell,
        scale,boardSize,depth,boardDepth,False{})

def refine(session: Session) -> Packet:
  match session:
    case Session{+state,ground,style,+quality,shell}:
      +snapshot = Program.snapshot(state)
      refine.decision(state,ground,style,quality,shell,
        Quality.current(quality,T.snapshot_mobile(snapshot)))

def bot_job(session: Session) -> BotJob:
  match session:
    case Session{+state, _, _, _, _}:
      +revision = T.meta_revision(S.meta(state))
      BotJob{Program.bot_work_ready(state),
        Program.bot_apply_ready(revision, state), revision,
        S.pos(state), S.legal(state)}

def bot_apply_at(revision: U32, id: U32, session: Session) -> Packet:
  match session:
    case Session{state, ground, style, quality, shell}:
      apply(Program.bot_apply(revision, id, state), ground, style,
        quality, shell, None{})

def bot_fallback_at(revision: U32, session: Session) -> Packet:
  match session:
    case Session{state, ground, style, quality, shell}:
      apply(Program.bot_fallback_at(revision, state), ground, style,
        quality, shell, None{})

def dispatch.decision(+events: List<&2, T.Input>, +state: S.State,
  ground: GroundKey, style: U32, quality: Quality.State, shell: ShellKey,
  +snapshot: T.Snapshot, decision: Quality.Decision) -> Packet:
  match decision:
    case Quality.Decision{_, scale, _, _, _, _, boardDepth, _, _}:
      +translated = events_at(events,
        presentation(snapshot, planned(snapshot, scale, boardDepth)))
      apply(Program.update(translated, state), ground, style,
        quality, shell, latest_probe(events, None{}))

def dispatch(+events: List<&2, T.Input>, session: Session) -> Packet:
  match session:
    case Session{+state, ground, style, +quality, shell}:
      +snapshot = Program.snapshot(state)
      dispatch.decision(events, state, ground, style, quality, shell, snapshot,
        Quality.current(quality, T.snapshot_mobile(snapshot)))

def tones(notes: List<&2, T.Note>) -> List<&2, Synthesis.Tone>:
  match notes:
    case Nil{}: []
    case T.Note{f, duration, wave, gain, delay} <> rest:
      Synthesis.Tone{f, duration, wave, gain, delay} <> tones(rest)

def audio_samples(notes: List<&2, T.Note>, rate: U32) -> List<&2, F32>:
  Synthesis.samples(tones(notes), rate)
