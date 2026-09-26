# Board-first Rift Observatory presentation. This is game UI, not a generic
# graphics primitive. All hit rectangles come from ChromePlan; no host text,
# CSS controls, or browser font participate in the visible game surface.
import Base
import ../../lib/graphics/Canvas.bend as Canvas
import ../../lib/graphics/v2/BlendRect.bend as Blend
import ../../lib/graphics/v2/Gradient.bend as Gradient
import ../../lib/graphics/v2/Ring.bend as Ring
import ../../lib/graphics/v2/Shapes.bend as Shapes
import ../../lib/graphics/v2/Widgets.bend as Widgets
import ./ChromeData.bend as Data
import ./ChromePlan.bend as Plan
import ./MenuAAFont.bend as Font
import ./fonts/FontPack.bend as FontPack

def font_path() -> String:
  FontPack.asset_path()

def font_byte_cap() -> U32:
  FontPack.byte_cap()

def play(data: Data.Presentation) -> Bool:
  U32.is_zero(Data.menu(data))

def load_font(bytes: Array<U32>,used: U32) -> Maybe<FontPack.Book>:
  FontPack.decode(bytes,used)

def px(+size: U32,+n: U32) -> U32:
  U32.div(U32.mul(size,n),1024)

def bg(+theme: U32) -> U32:
  Bool.pick(U32,U32.is_eq(theme,1),1585719,397591)

def surface(+theme: U32) -> U32:
  Bool.pick(U32,U32.is_eq(theme,1),2700858,793377)

def raised(+theme: U32) -> U32:
  Bool.pick(U32,U32.is_eq(theme,1),3560928,1058603)

def line(+theme: U32) -> U32:
  Bool.pick(U32,U32.is_eq(theme,1),8161107,2180688)

def ink(+theme: U32) -> U32:
  Bool.pick(U32,U32.is_eq(theme,1),16113609,15590866)

def muted(+theme: U32) -> U32:
  Bool.pick(U32,U32.is_eq(theme,1),12109246,8297373)

def accent(+theme: U32) -> U32:
  Bool.pick(U32,U32.is_eq(theme,1),14068591,7331024)

def danger(+theme: U32) -> U32:
  Bool.pick(U32,U32.is_eq(theme,1),12083800,12083800)

def paint_label(+depth: Nat,+size: U32,+text: String,+x: U32,+y: U32,
  +color: U32,+fonts: FontPack.Book,image: Image) -> Image:
  Font.body(depth,size,text,px(size,x),px(size,y),color,fonts,image)

def paint_heading(+depth: Nat,+size: U32,+text: String,+x: U32,+y: U32,
  +color: U32,+fonts: FontPack.Book,image: Image) -> Image:
  Font.heading(depth,size,text,px(size,x),px(size,y),color,fonts,image)

def panel(+depth: Nat,+size: U32,+x: U32,+y: U32,+w: U32,+h: U32,
  +radius: U32,+face: U32,+border: U32,image: Image) -> Image:
  Widgets.panel(depth,size,px(size,x),px(size,y),px(size,w),px(size,h),
    px(size,radius),face,border,image)

def rule(+depth: Nat,+size: U32,+x: U32,+y: U32,+w: U32,
  +color: U32,+alpha: U32,image: Image) -> Image:
  Blend.fill(depth,size,px(size,x),px(size,y),px(size,U32.add(x,w)),
    px(size,U32.add(y,1)),color,alpha,image)

def atmosphere(+depth: Nat,+size: U32,+theme: U32) -> Image:
  +base = Gradient.vertical(depth,size,px(size,16),0,
    px(size,640),surface(theme),bg(theme))
  +north = Ring.draw(depth,size,Shapes.Pos{px(size,512)},Shapes.Pos{px(size,325)},
    px(size,313),px(size,314),accent(theme),34,base)
  +south = Ring.draw(depth,size,Shapes.Pos{px(size,512)},Shapes.Pos{px(size,325)},
    px(size,344),px(size,345),muted(theme),28,north)
  +header = Blend.fill(depth,size,0,0,px(size,1024),px(size,56),
    bg(theme),220,south)
  +footer = Blend.fill(depth,size,0,px(size,582),px(size,1024),
    px(size,640),bg(theme),235,header)
  +top_line = rule(depth,size,24,55,976,accent(theme),110,footer)
  rule(depth,size,24,582,976,accent(theme),92,top_line)

def board_frame(+depth: Nat,+size: U32,+theme: U32,+plan: Plan.Plan,
  image: Image) -> Image:
  +r = Plan.plan_stage(plan)
  +scale = U32.max(1,U32.div(size,1024))
  +x = U32.div(Plan.rect_x(r),scale)
  +y = U32.div(Plan.rect_y(r),scale)
  +w = U32.div(Plan.rect_width(r),scale)
  +h = U32.div(Plan.rect_height(r),scale)
  panel(depth,size,x,y,w,h,14,raised(theme),line(theme),image)

def embed(+depth: Nat,+plan: Plan.Plan,board_image: Image,image: Image) -> Image:
  +board = Plan.plan_board(plan)
  Canvas.embed_at(depth,board_image,Plan.plan_board_depth(plan),
    Plan.rect_x(board),Plan.rect_y(board),image)

def selection_text(text: String) -> String:
  match text:
    case "Select a piece or an open tile": "Choose a piece"
    case _: text

def header.desktop.static(+depth: Nat,+size: U32,+theme: U32,
  +fonts: FontPack.Book,image: Image) -> Image:
  +brand = paint_heading(depth,size,"RIFT CHESS",28,12,ink(theme),fonts,image)
  +subtitle = paint_label(depth,size,"THE OBSERVATORY",240,19,muted(theme),fonts,brand)
  Shapes.disk(depth,size,Shapes.Pos{px(size,480)},
    Shapes.Pos{px(size,30)},px(size,3),accent(theme),240,subtitle)

def header.desktop.dynamic(+depth: Nat,+size: U32,+data: Data.Presentation,
  +theme: U32,+fonts: FontPack.Book,image: Image) -> Image:
  paint_label(depth,size,Data.status(data),496,17,ink(theme),fonts,image)

def header.mobile.static(+depth: Nat,+size: U32,+theme: U32,
  +fonts: FontPack.Book,image: Image) -> Image:
  +brand = paint_heading(depth,size,"RIFT CHESS",18,10,ink(theme),fonts,image)
  rule(depth,size,18,70,476,accent(theme),160,brand)

def header.mobile.dynamic(+depth: Nat,+size: U32,+data: Data.Presentation,
  +theme: U32,+fonts: FontPack.Book,image: Image) -> Image:
  +status = paint_label(depth,size,Data.status(data),20,80,ink(theme),fonts,image)
  paint_label(depth,size,selection_text(Data.selection(data)),220,80,muted(theme),fonts,status)

def footer.desktop.dynamic(+depth: Nat,+size: U32,+data: Data.Presentation,
  +theme: U32,+fonts: FontPack.Book,image: Image) -> Image:
  +eyebrow = paint_label(depth,size,"SELECTED",28,582,accent(theme),fonts,image)
  paint_label(depth,size,selection_text(Data.selection(data)),28,606,ink(theme),fonts,eyebrow)

def mobile_guide(+depth: Nat,+size: U32,+data: Data.Presentation,
  +theme: U32,+fonts: FontPack.Book,image: Image) -> Image:
  +well = panel(depth,size,12,778,488,228,18,surface(theme),line(theme),image)
  +orbit = Ring.draw(depth,size,Shapes.Pos{px(size,416)},
    Shapes.Pos{px(size,912)},px(size,76),px(size,78),accent(theme),83,well)
  +inner = Ring.draw(depth,size,Shapes.Pos{px(size,416)},
    Shapes.Pos{px(size,912)},px(size,49),px(size,50),muted(theme),64,orbit)
  +star = Shapes.disk(depth,size,Shapes.Pos{px(size,416)},
    Shapes.Pos{px(size,912)},px(size,3),accent(theme),220,inner)
  +heading = paint_heading(depth,size,"THE BOARD IS YOUR MAP",28,800,ink(theme),fonts,star)
  +rule_a = rule(depth,size,28,840,264,accent(theme),158,heading)
  +turn = paint_label(depth,size,"Drag to orbit",28,858,ink(theme),fonts,rule_a)
  +view = paint_label(depth,size,"Tap View for camera",28,890,muted(theme),fonts,turn)
  +mode = paint_label(depth,size,Data.mode(data),28,966,accent(theme),fonts,view)
  rule(depth,size,28,952,232,line(theme),176,mode)

def footer.mobile(+depth: Nat,+size: U32,+data: Data.Presentation,
  +theme: U32,+fonts: FontPack.Book,image: Image) -> Image:
  panel(depth,size,8,640,496,114,16,surface(theme),line(theme),image)

def shell.desktop(+depth: Nat,+size: U32,+data: Data.Presentation,
  +theme: U32,+plan: Plan.Plan,+fonts: FontPack.Book) -> Image:
  +base = atmosphere(depth,size,theme)
  +frame = board_frame(depth,size,theme,plan,base)
  header.desktop.static(depth,size,theme,fonts,frame)

def shell.mobile(+depth: Nat,+size: U32,+data: Data.Presentation,
  +theme: U32,+plan: Plan.Plan,+fonts: FontPack.Book) -> Image:
  +base = atmosphere(depth,size,theme)
  +frame = board_frame(depth,size,theme,plan,base)
  +head = header.mobile.static(depth,size,theme,fonts,frame)
  footer.mobile(depth,size,data,theme,fonts,head)

def shell_for(mobile: Bool,+depth: Nat,+size: U32,+data: Data.Presentation,
  +theme: U32,+plan: Plan.Plan,+fonts: FontPack.Book) -> Image:
  match mobile:
    case True{}: shell.mobile(depth,size,data,theme,plan,fonts)
    case False{}: shell.desktop(depth,size,data,theme,plan,fonts)

def has_destinations.go(controls: List<&2,Plan.Control>) -> Bool:
  match controls:
    case Nil{}: False{}
    case Con{head,tail}:
      Bool.or(Plan.dest_id(Plan.control_id(head)),has_destinations.go(tail))

def has_destinations(plan: Plan.Plan) -> Bool:
  has_destinations.go(Plan.plan_controls(plan))

def desktop_selection(has_choices: Bool,+depth: Nat,+size: U32,
  +data: Data.Presentation,+theme: U32,+fonts: FontPack.Book,
  image: Image) -> Image:
  match has_choices:
    case False{}: footer.desktop.dynamic(depth,size,data,theme,fonts,image)
    case True{}:
      +eyebrow = paint_label(depth,size,"SELECTED",28,94,accent(theme),fonts,image)
      paint_label(depth,size,selection_text(Data.selection(data)),28,123,ink(theme),fonts,eyebrow)

def no_history(items: List<&2,String>) -> Bool:
  match items:
    case Nil{}: True{}
    case Con{head,tail}: False{}

def context_hint(+depth: Nat,+size: U32,+data: Data.Presentation,
  +theme: U32,+fonts: FontPack.Book,image: Image) -> Image:
  +card = panel(depth,size,12,780,488,76,14,surface(theme),line(theme),image)
  +accent_rule = rule(depth,size,28,798,72,accent(theme),155,card)
  paint_label(depth,size,Data.context(data),28,811,ink(theme),fonts,accent_rule)

def guide_for(initial: Bool,+depth: Nat,+size: U32,+data: Data.Presentation,
  +theme: U32,+fonts: FontPack.Book,image: Image) -> Image:
  match initial:
    case True{}: mobile_guide(depth,size,data,theme,fonts,image)
    case False{}: context_hint(depth,size,data,theme,fonts,image)

def dynamic_mobile(+depth: Nat,+size: U32,+data: Data.Presentation,
  +theme: U32,+fonts: FontPack.Book,image: Image) -> Image:
  +status = header.mobile.dynamic(depth,size,data,theme,fonts,image)
  +initial = Bool.and(String.eq(Data.selection(data),"Select a piece or an open tile"),
    no_history(Data.history(data)))
  guide_for(initial,depth,size,data,theme,fonts,status)

def dynamic_for(mobile: Bool,+depth: Nat,+size: U32,+data: Data.Presentation,
  +theme: U32,+plan: Plan.Plan,+fonts: FontPack.Book,image: Image) -> Image:
  match mobile:
    case True{}: dynamic_mobile(depth,size,data,theme,fonts,image)
    case False{}:
      +turn = header.desktop.dynamic(depth,size,data,theme,fonts,image)
      desktop_selection(has_destinations(plan),depth,size,data,theme,fonts,turn)

def title(+menu: U32) -> String:
  match menu:
    case 1: "NEW MATCH"
    case 2: "PREFERENCES"
    case 3: "CHOOSE ACTION"
    case 4: "PROMOTE PAWN"
    case 5: "RESIGN MATCH"
    case 6: "RECOVER MATCH"
    case 7: "CHOOSE DESTINATION"
    case 8: "UNDO REQUEST"
    case 9: "CHOOSE A SIDE"
    case 10: "MOVE HISTORY"
    case 11: "CAMERA VIEW"
    case 12: "MATCH ACTIONS"
    case _: "RIFT CHESS"

def subtitle(+menu: U32) -> String:
  match menu:
    case 1: "Set your seat, board and match policy"
    case 2: "Tune the observatory to your liking"
    case 3: "Move a piece or shift its platform"
    case 4: "Choose the new piece"
    case 5: "Your opponent will win this match"
    case 6: "Continue the saved position"
    case 7: "Choose a highlighted destination"
    case 8: "Return to the previous position"
    case 9: "Choose which side will move"
    case 10: "The moves that led us here"
    case 11: "See the board your way"
    case 12: "Requests and match decisions"
    case _: "Choose an action"

def contextual(+menu: U32) -> Bool:
  Bool.or(U32.is_eq(menu,3),U32.is_eq(menu,7))

def modal_box(+mobile: Bool,+menu: U32) -> Plan.Rect:
  match mobile menu:
    case False{} 4: Plan.Rect{248,94,528,300}
    case False{} 2: Plan.Rect{248,94,528,350}
    case False{} 11: Plan.Rect{248,94,528,338}
    case False{} 12: Plan.Rect{248,94,528,338}
    case False{} _: Plan.Rect{248,94,528,350}
    case True{} 4: Plan.Rect{12,636,488,280}
    case True{} 11: Plan.Rect{12,636,488,328}
    case True{} 12: Plan.Rect{12,636,488,328}
    case True{} _: Plan.Rect{12,636,488,328}

def scrim(+depth: Nat,+size: U32,+plan: Plan.Plan,image: Image) -> Image:
  Blend.fill(depth,size,0,0,Plan.plan_width(plan),Plan.plan_height(plan),
    397591,187,image)

def modal(+depth: Nat,+size: U32,+menu: U32,+theme: U32,
  +plan: Plan.Plan,+fonts: FontPack.Book,image: Image) -> Image:
  +mobile = Plan.plan_mobile(plan)
  +r = modal_box(mobile,menu)
  +scale = U32.max(1,U32.div(size,1024))
  +x = U32.div(Plan.rect_x(r),scale)
  +y = U32.div(Plan.rect_y(r),scale)
  +w = U32.div(Plan.rect_width(r),scale)
  +h = U32.div(Plan.rect_height(r),scale)
  +dim = scrim(depth,size,plan,image)
  +shadow = panel(depth,size,U32.add(x,5),U32.add(y,8),w,h,22,bg(theme),bg(theme),dim)
  +card = panel(depth,size,x,y,w,h,18,raised(theme),line(theme),shadow)
  +accent_rule = rule(depth,size,U32.add(x,28),U32.add(y,78),U32.sub(w,56),accent(theme),176,card)
  +heading = paint_heading(depth,size,title(menu),U32.add(x,28),U32.add(y,22),ink(theme),fonts,accent_rule)
  paint_label(depth,size,subtitle(menu),U32.add(x,28),U32.sub(U32.add(y,h),46),muted(theme),fonts,heading)

def context_bar(+depth: Nat,+size: U32,+menu: U32,+theme: U32,
  +mobile: Bool,+fonts: FontPack.Book,image: Image) -> Image:
  +y = Bool.pick(U32,mobile,752,526)
  +x = Bool.pick(U32,mobile,12,242)
  +w = Bool.pick(U32,mobile,488,540)
  +bar = panel(depth,size,x,y,w,50,15,raised(theme),line(theme),image)
  paint_label(depth,size,title(menu),U32.add(x,20),U32.add(y,12),ink(theme),fonts,bar)

def panel_for(+menu: U32,+depth: Nat,+size: U32,+theme: U32,
  +plan: Plan.Plan,+fonts: FontPack.Book,image: Image) -> Image:
  match menu:
    case 0: image
    case 3: context_bar(depth,size,menu,theme,Plan.plan_mobile(plan),fonts,image)
    case 7: context_bar(depth,size,menu,theme,Plan.plan_mobile(plan),fonts,image)
    case _: modal(depth,size,menu,theme,plan,fonts,image)

def action_label(+id: U32,+original: String) -> String:
  match id:
    case 1: "Prefs"
    case 2: "New"
    case 27: "Help"
    case 28: "Close"
    case 56: "View"
    case 57: "Match"
    case 53: "Move hints"
    case 54: "Shift hints"
    case _: original

def button_face(+theme: U32,+enabled: Bool,+active: Bool) -> U32:
  match enabled active:
    case False{} _: surface(theme)
    case True{} True{}: accent(theme)
    case True{} False{}: raised(theme)

def button_edge(+theme: U32,+active: Bool) -> U32:
  match active:
    case True{}: accent(theme)
    case False{}: line(theme)

def visible_control(+menu: U32,+id: U32) -> Bool:
  match menu:
    case 0: True{}
    case _:
      Bool.and(Bool.and(U32.is_ne(id,1),U32.is_ne(id,2)),U32.is_ne(id,27))

def button_background(destination: Bool,+depth: Nat,+size: U32,
  +x: U32,+y: U32,+w: U32,+h: U32,+theme: U32,
  +enabled: Bool,+active: Bool,image: Image) -> Image:
  match destination:
    case False{}:
      Widgets.panel(depth,size,x,y,w,h,U32.min(14,U32.div(h,2)),
        button_face(theme,enabled,active),button_edge(theme,active),image)
    case True{}:
      +face = Blend.fill(depth,size,x,y,U32.add(x,w),U32.add(y,h),
        button_face(theme,enabled,active),245,image)
      Blend.fill(depth,size,x,U32.sub(U32.add(y,h),2),U32.add(x,w),
        U32.add(y,h),accent(theme),195,face)

def paint_button(+depth: Nat,+size: U32,+theme: U32,+fonts: FontPack.Book,
  +control: Plan.Control,image: Image) -> Image:
  +r = Plan.control_bounds(control)
  +x = Plan.rect_x(r)
  +y = Plan.rect_y(r)
  +w = Plan.rect_width(r)
  +h = Plan.rect_height(r)
  +id = Plan.control_id(control)
  +enabled = Plan.control_enabled(control)
  +active = Plan.control_active(control)
  +face = button_background(Plan.dest_id(id),depth,size,x,y,w,h,
    theme,enabled,active,image)
  +label = action_label(id,Plan.control_label(control))
  +width = Font.body_width(size,label,fonts)
  +start = U32.add(x,U32.div(U32.sub(w,U32.min(w,width)),2))
  +top = U32.add(y,U32.div(U32.sub(h,U32.min(h,px(size,21))),2))
  +color = Bool.pick(U32,enabled,ink(theme),muted(theme))
  Font.body(depth,size,label,start,top,color,fonts,face)

def paint_control_if(show: Bool,+depth: Nat,+size: U32,+theme: U32,
  +fonts: FontPack.Book,
  control: Plan.Control,image: Image) -> Image:
  match show:
    case True{}: paint_button(depth,size,theme,fonts,control,image)
    case False{}: image

def paint_controls(+depth: Nat,+size: U32,+theme: U32,+menu: U32,
  +fonts: FontPack.Book,
  controls: List<&2,Plan.Control>,image: Image) -> Image:
  match controls:
    case Nil{}: image
    case +head <> tail:
      +id = Plan.control_id(head)
      +shown = visible_control(menu,id)
      +next = paint_control_if(shown,depth,size,theme,fonts,head,image)
      paint_controls(depth,size,theme,menu,fonts,tail,next)

def same_bool(a: Bool,b: Bool) -> Bool:
  Bool.not(Bool.xor(a,b))

def same_rect(a: Plan.Rect,b: Plan.Rect) -> Bool:
  match a b:
    case Plan.Rect{ax,ay,aw,ah} Plan.Rect{bx,by,bw,bh}:
      Bool.and(Bool.and(U32.is_eq(ax,bx),U32.is_eq(ay,by)),
        Bool.and(U32.is_eq(aw,bw),U32.is_eq(ah,bh)))

def same_control(a: Plan.Control,b: Plan.Control) -> Bool:
  match a b:
    case Plan.Control{aid,alabel,arect,aenabled,aactive}
      Plan.Control{bid,blabel,brect,benabled,bactive}:
      Bool.and(Bool.and(U32.is_eq(aid,bid),String.eq(alabel,blabel)),
        Bool.and(same_rect(arect,brect),
          Bool.and(same_bool(aenabled,benabled),same_bool(aactive,bactive))))

def same_controls(a: List<&2,Plan.Control>,b: List<&2,Plan.Control>) -> Bool:
  match a b:
    case Nil{} Nil{}: True{}
    case Con{head_a,tail_a} Con{head_b,tail_b}:
      Bool.and(same_control(head_a,head_b),same_controls(tail_a,tail_b))
    case _ _: False{}

def same_plan(a: Plan.Plan,b: Plan.Plan) -> Bool:
  match a b:
    case Plan.Plan{aw,ah,as,ad,am,astage,aboard,acontrols}
      Plan.Plan{bw,bh,bs,bd,bm,bstage,bboard,bcontrols}:
      Bool.and(Bool.and(Bool.and(U32.is_eq(aw,bw),U32.is_eq(ah,bh)),
        Bool.and(U32.is_eq(as,bs),Nat.is_eq(ad,bd))),
        Bool.and(Bool.and(same_bool(am,bm),same_rect(astage,bstage)),
          Bool.and(same_rect(aboard,bboard),same_controls(acontrols,bcontrols))))

def same_geometry(a: Plan.Plan,b: Plan.Plan) -> Bool:
  match a b:
    case Plan.Plan{aw,ah,as,ad,am,astage,aboard,acontrols}
      Plan.Plan{bw,bh,bs,bd,bm,bstage,bboard,bcontrols}:
      Bool.and(Bool.and(Bool.and(U32.is_eq(aw,bw),U32.is_eq(ah,bh)),
        Bool.and(U32.is_eq(as,bs),Nat.is_eq(ad,bd))),
        Bool.and(same_bool(am,bm),
          Bool.and(same_rect(astage,bstage),same_rect(aboard,bboard))))

# The first layer has no control or selected-square dependency. A menu/control
# transition may reuse it even when same_static correctly rejects button reuse.
def same_base(+old: Data.Presentation,+old_plan: Plan.Plan,
  +current: Data.Presentation,+current_plan: Plan.Plan) -> Bool:
  Bool.and(Bool.and(U32.is_eq(Data.theme(old),Data.theme(current)),
    String.eq(Data.mode(old),Data.mode(current))),
    same_geometry(old_plan,current_plan))

# Bend owns the exact reuse predicate; the host compares old/current source
# values through this function before retaining a static canvas. Turn and
# selection text are deliberately absent, as dynamic_chrome repaints them.
def same_static(+old: Data.Presentation,+old_plan: Plan.Plan,
  +current: Data.Presentation,+current_plan: Plan.Plan) -> Bool:
  Bool.and(Bool.and(U32.is_eq(Data.theme(old),Data.theme(current)),
    U32.is_eq(Data.menu(old),Data.menu(current))),
    Bool.and(String.eq(Data.mode(old),Data.mode(current)),
      Bool.and(same_bool(Data.sound_on(old),Data.sound_on(current)),
        same_plan(old_plan,current_plan))))

def chrome_controls(menu: U32,+depth: Nat,+size: U32,+theme: U32,
  +plan: Plan.Plan,+fonts: FontPack.Book,image: Image) -> Image:
  match menu:
    case 0: paint_controls(depth,size,theme,menu,fonts,Plan.plan_controls(plan),image)
    case _: image

# Static base excludes controls, status and selection. It can outlive a menu
# change or destination-list replacement when same_base returns True.
def base_chrome(+depth: Nat,+size: U32,+data: Data.Presentation,
  +plan: Plan.Plan,+fonts: FontPack.Book) -> Image:
  shell_for(Plan.plan_mobile(plan),depth,size,data,Data.theme(data),plan,fonts)

def controls_chrome(+depth: Nat,+size: U32,+data: Data.Presentation,
  +plan: Plan.Plan,+fonts: FontPack.Book,base_image: Image) -> Image:
  chrome_controls(Data.menu(data),depth,size,Data.theme(data),plan,fonts,base_image)

# This layer adds controls to an immutable base, but excludes turn/selection.
def static_chrome(+depth: Nat,+size: U32,+data: Data.Presentation,
  +plan: Plan.Plan,+fonts: FontPack.Book) -> Image:
  +base = base_chrome(depth,size,data,plan,fonts)
  controls_chrome(depth,size,data,plan,fonts,base)

# Paint only the current turn and selected-piece text over a retained static
# canvas. The same static canvas is the erasure source for each new selection.
def dynamic_chrome(+depth: Nat,+size: U32,+data: Data.Presentation,
  +plan: Plan.Plan,+fonts: FontPack.Book,static_image: Image) -> Image:
  dynamic_for(Plan.plan_mobile(plan),depth,size,data,Data.theme(data),plan,fonts,static_image)

# Cache full chrome when Bend RenderPlan.chrome is clean. In gameplay the board
# rectangle remains clear, so camera/pointer redraws only call compose().
def chrome(+depth: Nat,+size: U32,+data: Data.Presentation,
  +plan: Plan.Plan,+fonts: FontPack.Book) -> Image:
  +static = static_chrome(depth,size,data,plan,fonts)
  dynamic_chrome(depth,size,data,plan,fonts,static)

# Cheap path: aligned board embedding into a prepared, immutable chrome image.
def compose(+depth: Nat,+plan: Plan.Plan,board_image: Image,prepared: Image) -> Image:
  embed(depth,plan,board_image,prepared)

# Uncached convenience path for menus, screenshots, and diagnostics. During
# gameplay the host caches chrome() and calls compose() for board-only changes.
def render(+depth: Nat,+size: U32,+data: Data.Presentation,
  +plan: Plan.Plan,+fonts: FontPack.Book,board_image: Image) -> Image:
  +theme = Data.theme(data)
  +menu = Data.menu(data)
  +shell = shell_for(Plan.plan_mobile(plan),depth,size,data,theme,plan,fonts)
  +dynamic = dynamic_chrome(depth,size,data,plan,fonts,shell)
  +board = compose(depth,plan,board_image,dynamic)
  +panel = panel_for(menu,depth,size,theme,plan,fonts,board)
  paint_controls(depth,size,theme,menu,fonts,Plan.plan_controls(plan),panel)
