# Browser-only Canvas presentation; original controller values retain their tags.
import Base
import ./ApplicationControl.bend as Control
import ./core/Model.bend as Model
import ./graphics/Camera.bend as Camera
import ./graphics/Scene.bend as Scene
import ./graphics/v2game/PieceSprites.bend as PieceSprites
import ./graphics/v2game/BrowserOrbit.bend as BrowserOrbit
import ./lib/graphics/v2/CanvasPreview.bend as Preview
import ./lib/graphics/v2/CanvasPicking.bend as Picking
import ./lib/graphics/v2/RgbaSample.bend as Sample
import ./ui/Types.bend as T
import ./ui/Layout.bend as Layout
import ./ui/v2/ChromeModel.bend as ChromeModel
import ./ui/Program.bend as Program

def audio_samples(notes: List<&2,T.Note>,rate: U32) -> List<&2,F32>:
  Control.audio_samples(notes,rate)

def boot_reads(saved: String,prefs: String,saved_ok: Bool,prefs_ok: Bool,
  width: U32,height: U32) -> Control.Packet:
  Control.boot_reads(saved,prefs,saved_ok,prefs_ok,width,height)

def bot_apply_at(revision: U32,id: U32,session: Control.Session) -> Control.Packet:
  Control.bot_apply_at(revision,id,session)

def bot_fallback_at(revision: U32,session: Control.Session) -> Control.Packet:
  Control.bot_fallback_at(revision,session)

def bot_job(session: Control.Session) -> Control.BotJob:
  Control.bot_job(session)

def dispatch_at_web_atlas_meta(events: List<&2,T.Input>,shown: Control.Presentation,
  pieces: PieceSprites.Pieces,session: Control.Session) -> Control.WebPacket:
  Control.dispatch_at_web_atlas_meta(events,shown,pieces,session)

def dispatch_at_web_atlas_nearest_preview_meta(events: List<&2,T.Input>,
  shown: Control.Presentation,pieces: PieceSprites.Pieces,
  session: Control.Session) -> Control.WebPacket:
  Control.dispatch_at_web_atlas_nearest_preview_meta(events,shown,pieces,session)

def dispatch_at_web_atlas_preview_meta(events: List<&2,T.Input>,
  shown: Control.Presentation,pieces: PieceSprites.Pieces,
  session: Control.Session) -> Control.WebPacket:
  Control.dispatch_at_web_atlas_preview_meta(events,shown,pieces,session)

def dispatch_at_web_meta(events: List<&2,T.Input>,shown: Control.Presentation,
  session: Control.Session) -> Control.WebPacket:
  Control.dispatch_at_web_meta(events,shown,session)

def max_file_bytes() -> U32:
  Control.max_file_bytes()

def orbiting(session: Control.Session) -> Bool:
  Control.orbiting(session)

def refine(session: Control.Session) -> Control.Packet:
  Control.refine(session)

def storage_key(slot: U32) -> String:
  Control.storage_key(slot)

def canvas_supported(frame: Scene.Frame) -> Bool:
  BrowserOrbit.supported(frame)

def canvas_textures(pieces: PieceSprites.Pieces) -> List<&2,Sample.Texture>:
  BrowserOrbit.textures(pieces)

def canvas_plan(frame: Scene.Frame) -> List<&2,Preview.Command>:
  BrowserOrbit.plan(frame)

def canvas_pick_state(commands: List<&2,Preview.Command>,pieces: PieceSprites.Pieces) ->
  Picking.State:
  Picking.prepare(commands,BrowserOrbit.textures(pieces))

# Zero labels expose ground; missing ground never selects through a board hole.
def canvas_label(+label: U32,position: Model.Position,view: Camera.View,
  x: U32,y: U32) -> U32:
  match label:
    case 0:
      +square = Camera.square_at(x,y,Camera.basis(view))
      Bool.pick(U32,Model.present(Model.pos_holes(position),square),square,64)
    case _:
      Bool.pick(U32,U32.is_lt(label,65),U32.sub(label,1),64)

def canvas_pick.on(inside: Bool,position: Model.Position,view: Camera.View,
  +x: U32,+y: U32,pickState: Picking.State) -> U32:
  match inside:
    case False{}: 64
    case True{}:
      canvas_label(Picking.at(pickState,x,y),position,view,x,y)

def canvas_pick(position: Model.Position,view: Camera.View,+x: U32,+y: U32,
  pickState: Picking.State) -> U32:
  canvas_pick.on(Bool.and(U32.is_lt(x,512),U32.is_lt(y,512)),
    position,view,x,y,pickState)

def canvas_square.on(inside: Bool,position: Model.Position,view: Camera.View,
  +bounds: T.Rect,+scale: U32,x: U32,y: U32,pickState: Picking.State) -> U32:
  match inside:
    case False{}: 64
    case True{}:
      canvas_pick(position,view,
        U32.div(U32.sub(x,T.rect_x(bounds)),scale),
        U32.div(U32.sub(y,T.rect_y(bounds)),scale),pickState)

def canvas_square(shown: Control.Presentation,+x: U32,+y: U32,
  pickState: Picking.State) -> U32:
  match shown:
    case Control.Presentation{position,view,revision,menu,+plan,pose}:
      +bounds = ChromeModel.plan_board(plan)
      canvas_square.on(Bool.and(U32.is_zero(menu),Layout.in_rect(x,y,bounds)),
        position,view,bounds,ChromeModel.plan_scale(plan),x,y,pickState)

def canvas_click(control: U32,+shown: Control.Presentation,+x: U32,+y: U32,
  pickState: Picking.State) -> T.Input:
  match control:
    case 0:
      match shown:
        case Control.Presentation{position,view,revision,menu,plan,pose}:
          +bounds = ChromeModel.plan_board(plan)
          Bool.pick(T.Input,
            Bool.and(U32.is_zero(menu),Layout.in_rect(x,y,bounds)),
            T.SquareInput{canvas_square(shown,x,y,pickState),revision},T.Activate{0})
    case _: T.Activate{control}

def canvas_event_at(event: T.Input,+shown: Control.Presentation,
  pickState: Picking.State) -> T.Input:
  match event:
    case T.PointerDown{+x,+y,0,False{}}:
      match shown:
        case Control.Presentation{position,view,revision,menu,plan,pose}:
          canvas_click(ChromeModel.hit(plan,x,y),shown,x,y,pickState)
    case T.PointerMove{+x,+y}:
      T.PresentedMove{x,y,canvas_square(shown,x,y,pickState)}
    case T.PointerUp{+x,+y,button}:
      T.PresentedUp{x,y,button,canvas_square(shown,x,y,pickState)}
    case _: event

def canvas_events_at(events: List<&2,T.Input>,+shown: Control.Presentation,
  +pickState: Picking.State) -> List<&2,T.Input>:
  match events:
    case Nil{}: []
    case event <> rest:
      canvas_event_at(event,shown,pickState) <> canvas_events_at(rest,shown,pickState)

def canvas_dispatch_meta(+events: List<&2,T.Input>,shown: Control.Presentation,
  pickState: Picking.State,session: Control.Session) -> Control.WebPacket:
  match session:
    case Control.Session{state,ground,style,quality,shell}:
      +translated = canvas_events_at(events,shown,pickState)
      Control.apply_web(Program.update_web_release(translated,state),ground,style,
        quality,shell,Control.latest_probe(events,None{}))
