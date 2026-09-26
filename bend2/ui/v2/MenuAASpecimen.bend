# Standalone image witnesses for the new application-owned menu renderer.
# This schematic board is a layout specimen, not a chess position proof.
import Base
import ./MenuAA.bend as Menu
import ./ChromePlan.bend as Plan
import ./ChromePlanCompact.bend as Compact
import ./ChromeData.bend as Data
import ./fonts/FontPack.bend as FontPack

def play.desktop() -> List<&2,Plan.Control>:
  [Plan.Control{1,"Prefs",Plan.Rect{738,12,78,36},True{},False{}},
   Plan.Control{2,"New",Plan.Rect{824,12,78,36},True{},False{}},
   Plan.Control{27,"Help",Plan.Rect{910,12,78,36},True{},False{}},
   Plan.Control{3,"Undo",Plan.Rect{260,592,100,38},True{},False{}},
   Plan.Control{5,"Shift",Plan.Rect{368,592,100,38},True{},False{}},
   Plan.Control{47,"Moves",Plan.Rect{476,592,100,38},True{},False{}},
   Plan.Control{55,"History",Plan.Rect{584,592,100,38},True{},False{}},
   Plan.Control{56,"View",Plan.Rect{692,592,96,38},True{},False{}},
   Plan.Control{57,"Match",Plan.Rect{796,592,96,38},True{},False{}}]

def destinations() -> List<&2,Plan.Control>:
  [Plan.Control{1000,"e4",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{1001,"d4",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{1002,"c4",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{1003,"f4",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{1004,"e5",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{1005,"d5",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{1006,"c5",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{1007,"f5",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{1008,"a3",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{1009,"b3",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{1010,"g3",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{1011,"h3",Plan.Rect{0,0,1,1},True{},False{}}]

def prefs.desktop() -> List<&2,Plan.Control>:
  [Plan.Control{28,"Close",Plan.Rect{666,114,80,38},True{},False{}},
   Plan.Control{22,"Astral",Plan.Rect{280,222,208,40},True{},True{}},
   Plan.Control{23,"Warm",Plan.Rect{504,222,208,40},True{},False{}},
   Plan.Control{24,"Sound",Plan.Rect{280,274,208,40},True{},True{}},
   Plan.Control{25,"Volume +",Plan.Rect{504,274,100,40},True{},False{}},
   Plan.Control{26,"Volume -",Plan.Rect{612,274,100,40},True{},False{}},
   Plan.Control{53,"Move",Plan.Rect{280,326,208,40},True{},True{}},
   Plan.Control{54,"Shift",Plan.Rect{504,326,208,40},True{},False{}},
   Plan.Control{20,"Export",Plan.Rect{280,398,208,40},True{},False{}},
   Plan.Control{21,"Import",Plan.Rect{504,398,208,40},True{},False{}}]

def play.mobile() -> List<&2,Plan.Control>:
  [Plan.Control{1,"Prefs",Plan.Rect{226,12,86,38},True{},False{}},
   Plan.Control{2,"New",Plan.Rect{318,12,86,38},True{},False{}},
   Plan.Control{27,"Help",Plan.Rect{410,12,86,38},True{},False{}},
   Plan.Control{3,"Undo",Plan.Rect{16,650,152,42},True{},False{}},
   Plan.Control{5,"Shift",Plan.Rect{176,650,152,42},True{},False{}},
   Plan.Control{47,"Moves",Plan.Rect{336,650,160,42},True{},False{}},
   Plan.Control{55,"History",Plan.Rect{16,700,152,42},True{},False{}},
   Plan.Control{56,"View",Plan.Rect{176,700,152,42},True{},False{}},
   Plan.Control{57,"Match",Plan.Rect{336,700,160,42},True{},False{}}]

def data(menu: U32) -> Data.Presentation:
  Data.Presentation{0,menu,"White to move","Local hotseat",
    "White Knight f3","Choose a legal square",Nil{},0,True{}}

def data_empty() -> Data.Presentation:
  Data.Presentation{0,0,"White to move","Local hotseat",
    "Select a piece or an open tile","Move or Shift choose a source",Nil{},0,True{}}

def demo_board() -> Image:
  Qua{Pix{4417635},Pix{2839402},Pix{2839402},Pix{4417635}}

def decoded(bytes: Array<U32>,used: U32) -> Maybe<FontPack.Book>:
  Menu.load_font(bytes,used)

def desktop(fonts: FontPack.Book) -> Image:
  +plan: Plan.Plan = Plan.Plan{1024,640,1,9n,False{},
    Plan.Rect{246,54,532,532},Plan.Rect{256,64,512,512},play.desktop()}
  Menu.render(10n,1024,data(0),plan,fonts,demo_board())

def prepared(fonts: FontPack.Book) -> Image:
  +plan: Plan.Plan = Plan.Plan{1024,640,1,9n,False{},
    Plan.Rect{246,54,532,532},Plan.Rect{256,64,512,512},play.desktop()}
  Menu.chrome(10n,1024,data(0),plan,fonts)

def static_prepared(fonts: FontPack.Book) -> Image:
  +plan: Plan.Plan = Plan.Plan{1024,640,1,9n,False{},
    Plan.Rect{246,54,532,532},Plan.Rect{256,64,512,512},play.desktop()}
  Menu.static_chrome(10n,1024,data(0),plan,fonts)

def base_prepared(fonts: FontPack.Book) -> Image:
  +plan: Plan.Plan = Plan.Plan{1024,640,1,9n,False{},
    Plan.Rect{246,54,532,532},Plan.Rect{256,64,512,512},play.desktop()}
  Menu.base_chrome(10n,1024,data(0),plan,fonts)

def controls_from_base(fonts: FontPack.Book,base: Image) -> Image:
  +plan: Plan.Plan = Plan.Plan{1024,640,1,9n,False{},
    Plan.Rect{246,54,532,532},Plan.Rect{256,64,512,512},play.desktop()}
  Menu.controls_chrome(10n,1024,data(0),plan,fonts,base)

def destinations_from_base(fonts: FontPack.Book,base: Image) -> Image:
  +plan = Compact.plan_for(0,destinations(),Plan.Viewport{1024,640,1,9n})
  Menu.controls_chrome(10n,1024,data(0),plan,fonts,base)

def destination_selected(fonts: FontPack.Book,controls_image: Image) -> Image:
  +plan = Compact.plan_for(0,destinations(),Plan.Viewport{1024,640,1,9n})
  Menu.dynamic_chrome(10n,1024,data(0),plan,fonts,controls_image)

def selected_dynamic(fonts: FontPack.Book,static_image: Image) -> Image:
  +plan: Plan.Plan = Plan.Plan{1024,640,1,9n,False{},
    Plan.Rect{246,54,532,532},Plan.Rect{256,64,512,512},play.desktop()}
  Menu.dynamic_chrome(10n,1024,data(0),plan,fonts,static_image)

def empty_dynamic(fonts: FontPack.Book,static_image: Image) -> Image:
  +plan: Plan.Plan = Plan.Plan{1024,640,1,9n,False{},
    Plan.Rect{246,54,532,532},Plan.Rect{256,64,512,512},play.desktop()}
  Menu.dynamic_chrome(10n,1024,data_empty(),plan,fonts,static_image)

def reuse_on_text_change() -> Bool:
  +plan: Plan.Plan = Plan.Plan{1024,640,1,9n,False{},
    Plan.Rect{246,54,532,532},Plan.Rect{256,64,512,512},play.desktop()}
  Menu.same_static(data(0),plan,data_empty(),plan)

def reuse_base_on_destination_change() -> Bool:
  +ordinary: Plan.Plan = Plan.Plan{1024,640,1,9n,False{},
    Plan.Rect{246,54,532,532},Plan.Rect{256,64,512,512},play.desktop()}
  +choice_plan = Compact.plan_for(0,destinations(),Plan.Viewport{1024,640,1,9n})
  Bool.and(Menu.same_base(data(0),ordinary,data(0),choice_plan),
    Bool.not(Menu.same_static(data(0),ordinary,data(0),choice_plan)))

def composed(chrome: Image) -> Image:
  +plan: Plan.Plan = Plan.Plan{1024,640,1,9n,False{},
    Plan.Rect{246,54,532,532},Plan.Rect{256,64,512,512},play.desktop()}
  Menu.compose(10n,plan,demo_board(),chrome)

def preferences(fonts: FontPack.Book) -> Image:
  +plan = Compact.plan_for(2,prefs.desktop(),Plan.Viewport{1024,640,1,9n})
  Menu.render(10n,1024,data(2),plan,fonts,demo_board())

def mobile(fonts: FontPack.Book) -> Image:
  +plan: Plan.Plan = Plan.Plan{512,1024,1,9n,True{},
    Plan.Rect{0,106,512,524},Plan.Rect{0,112,512,512},play.mobile()}
  Menu.render(10n,1024,data_empty(),plan,fonts,demo_board())

def view_controls() -> List<&2,Plan.Control>:
  [Plan.Control{28,"Close",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{11,"Front",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{12,"Top",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{13,"Left",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{14,"Right",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{15,"Tilt +",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{16,"Tilt -",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{17,"Zoom +",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{18,"Zoom -",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{19,"Reset",Plan.Rect{0,0,1,1},True{},False{}}]

def match_controls() -> List<&2,Plan.Control>:
  [Plan.Control{28,"Close",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{3,"Undo",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{4,"Clear",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{6,"Draw",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{7,"Resign",Plan.Rect{0,0,1,1},True{},False{}},
   Plan.Control{8,"Accept",Plan.Rect{0,0,1,1},False{},False{}},
   Plan.Control{9,"Decline",Plan.Rect{0,0,1,1},False{},False{}},
   Plan.Control{10,"Resume",Plan.Rect{0,0,1,1},False{},False{}}]

def view(fonts: FontPack.Book) -> Image:
  +plan = Compact.plan_for(11,view_controls(),Plan.Viewport{1024,640,1,9n})
  Menu.render(10n,1024,data(11),plan,fonts,demo_board())

def match_actions(fonts: FontPack.Book) -> Image:
  +plan = Compact.plan_for(12,match_controls(),Plan.Viewport{1024,640,1,9n})
  Menu.render(10n,1024,data(12),plan,fonts,demo_board())
