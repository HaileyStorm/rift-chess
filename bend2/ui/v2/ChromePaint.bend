# Rift Observatory paint and presentation composition.
import Base
import ../../lib/graphics/Canvas.bend as Canvas
import ../../lib/graphics/v2/AtlasText.bend as AtlasText
import ../../lib/graphics/v2/Gradient.bend as Gradient
import ../../lib/graphics/v2/Ring.bend as Ring
import ../../lib/graphics/v2/Rounded.bend as Rounded
import ../../lib/graphics/v2/Shapes.bend as Shapes
import ../../lib/graphics/v2/Widgets.bend as Widgets
import ./ChromePlan.bend as ChromePlan
import ./ChromeData.bend as ChromeData

def bg_top(theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), 2827294, 263431)

def bg_bottom(theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), 5850931, 1124151)

def surface(theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), 3351325, 792617)

def surface_lift(theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), 3877153, 1715236)

def edge(theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), 9398344, 3034210)

def ink(theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), 16312774, 16181716)

def muted(theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), 14333048, 7968935)

def accent(theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), 15059089, 6608860)

def selection_focus(theme: U32, selected: Bool) -> U32:
  Bool.pick(U32, selected, 15908687, accent(theme))

def danger(theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), 15911055, 15911055)

def tile_name(+tile: U32) -> String:
  String.append(Char.show(Char.from_u32(U32.add(65, U32.mod(tile, 4)))),
    U32.show(U32.add(U32.div(tile, 4), 1)))

def px(+size: U32, +value: U32) -> U32:
  U32.div(U32.mul(size, value), 1024)

def panel(+depth: Nat, +size: U32, +x: U32, +y: U32,
  +width: U32, +height: U32, +radius: U32, +face: U32,
  +border: U32, image: Image) -> Image:
  Widgets.panel(depth, size, px(size, x), px(size, y), px(size, width),
    px(size, height), px(size, radius), face, border, image)

def rule(+depth: Nat, +size: U32, +x: U32, +y: U32, +width: U32,
  +highlight: U32, image: Image) -> Image:
  Widgets.rule(depth, px(size, x), px(size, y), px(size, width), highlight, image)

def rounded(+depth: Nat, +size: U32, +left: U32, +top: U32,
  +right: U32, +bottom: U32, +radius: U32, +color: U32,
  +opacity: U32, image: Image) -> Image:
  Rounded.draw(depth, size, Shapes.Pos{px(size, left)}, Shapes.Pos{px(size, top)},
    Shapes.Pos{px(size, right)}, Shapes.Pos{px(size, bottom)},
    px(size, radius), color, opacity, image)

def ring(+depth: Nat, +size: U32, +x: U32, +y: U32,
  +inner: U32, +outer: U32, +color: U32, +opacity: U32, image: Image) -> Image:
  Ring.draw(depth, size, Shapes.Pos{px(size, x)}, Shapes.Pos{px(size, y)},
    px(size, inner), px(size, outer), color, opacity, image)

def disk(+depth: Nat, +size: U32, +x: U32, +y: U32,
  +radius: U32, +color: U32, +opacity: U32, image: Image) -> Image:
  Shapes.disk(depth, size, Shapes.Pos{px(size, x)}, Shapes.Pos{px(size, y)},
    px(size, radius), color, opacity, image)

def text_valid(show: Bool, +depth: Nat, +size: U32, +words: String,
  +x: U32, +y: U32, +scale: U32, +color: U32, image: Image) -> Image:
  AtlasText.draw_valid(show, depth, size, words, px(size, x), px(size, y),
    px(size, scale), color, image)

def text(+depth: Nat, +size: U32, +words: String, +x: U32, +y: U32,
  +scale: U32, +color: U32, image: Image) -> Image:
  AtlasText.draw(depth, size, words, px(size, x), px(size, y),
    px(size, scale), color, image)

def background(+depth: Nat, +size: U32, +theme: U32) -> Image:
  +sky = Gradient.vertical(depth, size, px(size, 16), 0, size,
    bg_top(theme), bg_bottom(theme))
  +outer = ring(depth, size, 818, 260, 386, 390, accent(theme), 38, sky)
  +inner = ring(depth, size, 818, 260, 318, 320, ink(theme), 25, outer)
  +left = ring(depth, size, 224, 742, 250, 252, accent(theme), 29, inner)
  +star_a = disk(depth, size, 78, 92, 2, ink(theme), 115, left)
  +star_b = disk(depth, size, 920, 128, 2, ink(theme), 105, star_a)
  disk(depth, size, 948, 526, 2, accent(theme), 108, star_b)

def board_frame.draw(+depth: Nat, +size: U32, +theme: U32,
  +x: U32, +y: U32, +w: U32, +h: U32, image: Image) -> Image:
  +outer = panel(depth, size, x, y, w, h,
    20, surface(theme), edge(theme), image)
  rounded(depth, size, U32.add(x, 6), U32.add(y, 6),
    U32.sub(U32.add(x, w), 6), U32.sub(U32.add(y, h), 6),
    16, accent(theme), 76, outer)

def board_frame.marks(+depth: Nat, +size: U32, +theme: U32,
  +x: U32, +y: U32, +w: U32, +h: U32, image: Image) -> Image:
  +mark_y = U32.add(y, 12)
  +mark_a = rounded(depth, size, U32.add(x, 10), mark_y,
    U32.add(x, 30), U32.add(mark_y, 2), 1, accent(theme), 170, image)
  +mark_b = rounded(depth, size, U32.sub(U32.add(x, w), 30), mark_y,
    U32.sub(U32.add(x, w), 10), U32.add(mark_y, 2),
    1, accent(theme), 170, mark_a)
  +bottom_y = U32.sub(U32.add(y, h), 14)
  +mark_c = rounded(depth, size, U32.add(x, 10), bottom_y,
    U32.add(x, 30), U32.add(bottom_y, 2), 1, accent(theme), 170, mark_b)
  rounded(depth, size, U32.sub(U32.add(x, w), 30), bottom_y,
    U32.sub(U32.add(x, w), 10), U32.add(bottom_y, 2),
    1, accent(theme), 170, mark_c)

def board_frame(+depth: Nat, +size: U32, mobile: Bool,
  +theme: U32, image: Image) -> Image:
  match mobile:
    case True{}:
      +stage = ChromePlan.stage_rect(True{})
      +x = ChromePlan.rect_x(stage)
      +y = ChromePlan.rect_y(stage)
      +w = ChromePlan.rect_width(stage)
      +h = ChromePlan.rect_height(stage)
      board_frame.draw(depth, size, theme, x, y, w, h, image)
    case False{}:
      +stage = ChromePlan.stage_rect(False{})
      +x = ChromePlan.rect_x(stage)
      +y = ChromePlan.rect_y(stage)
      +w = ChromePlan.rect_width(stage)
      +h = ChromePlan.rect_height(stage)
      +frame = board_frame.draw(depth, size, theme, x, y, w, h, image)
      board_frame.marks(depth, size, theme, x, y, w, h, frame)

def desktop_rail(+depth: Nat, +size: U32, +theme: U32, image: Image) -> Image:
  +shell = panel(depth, size, 594, 70, 300, 560, 18,
    surface(theme), edge(theme), image)
  +turn_rule = rule(depth, size, 610, 124, 268, accent(theme), shell)
  +selection = panel(depth, size, 610, 128, 268, 48, 12,
    surface_lift(theme), accent(theme), turn_rule)
  +destinations = panel(depth, size, 602, 204, 284, 138, 12,
    surface_lift(theme), edge(theme), selection)
  +game_rule = rule(depth, size, 610, 346, 268, accent(theme), destinations)
  +actions = panel(depth, size, 602, 350, 284, 136, 12,
    surface_lift(theme), edge(theme), game_rule)
  +history_rule = rule(depth, size, 610, 488, 268, accent(theme), actions)
  +camera_rule = rule(depth, size, 610, 536, 268, accent(theme), history_rule)
  +camera = panel(depth, size, 602, 542, 284, 88, 12,
    surface_lift(theme), edge(theme), camera_rule)
  rounded(depth, size, 889, 144, 891, 618, 1,
    accent(theme), 48, camera)

def portrait_dock(+depth: Nat, +size: U32, +theme: U32, image: Image) -> Image:
  +base = panel(depth, size, 8, 584, 496, 432, 16,
    surface(theme), edge(theme), image)
  +status_rule = rule(depth, size, 16, 630, 480, accent(theme), base)
  +selection = panel(depth, size, 16, 634, 480, 50,
    12, surface_lift(theme), accent(theme), status_rule)
  +move_rule = rule(depth, size, 16, 688, 480, accent(theme), selection)
  +action_rule = rule(depth, size, 16, 762, 480, accent(theme), move_rule)
  rule(depth, size, 16, 918, 480, accent(theme), action_rule)

def selection_card.desktop(+depth: Nat, +size: U32, +theme: U32,
  +selected: Bool, image: Image) -> Image:
  panel(depth, size, 610, 128, 268, 48, 12,
    surface_lift(theme), selection_focus(theme, selected), image)

def selection_card.mobile(+depth: Nat, +size: U32, +theme: U32,
  +selected: Bool, image: Image) -> Image:
  panel(depth, size, 16, 634, 480, 50, 12,
    surface_lift(theme), selection_focus(theme, selected), image)

def menu_title(+menu: U32) -> String:
  match menu:
    case 1: "New"
    case 2: "Settings"
    case 3: "Guide"
    case 4: "Promote"
    case 5: "Resign"
    case 6: "Recovery"
    case 7: "Move list"
    case 8: "Undo"
    case 9: "Offer"
    case 10: "History"
    case _: "Play"

def menu_title.mobile(+menu: U32) -> String:
  match menu:
    case 1: "New match"
    case 2: "Settings"
    case 3: "How to play"
    case 4: "Promotion"
    case 5: "Resign"
    case 6: "Recovery"
    case 7: "Available moves"
    case 8: "Undo request"
    case 9: "Draw offer"
    case 10: "Move history"
    case _: "Play"

def history_count(+data: ChromeData.Presentation) -> U32:
  U32.from_nat(List.length(&2, String, ChromeData.history(data)))

def history_draw.go(+depth: Nat, +size: U32, entries: List<&2, String>,
  +index: U32, +start: U32, +count: U32, +x: U32, +y: U32,
  +ink: U32, image: Image) -> Image:
  match entries:
    case Nil{}: image
    case head <> tail:
      +row = U32.sub(index, start)
      +visible = Bool.and(U32.is_ge(index, start), U32.is_lt(row, count))
      +line_y = U32.add(y, U32.mul(row, 28))
      +painted = text_valid(visible, depth, size, head, x, line_y,
        1, ink, image)
      history_draw.go(depth, size, tail, U32.add(index, 1), start, count,
        x, y, ink, painted)

def recent_history(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +mobile: Bool, +theme: U32, image: Image) -> Image:
  +entries = ChromeData.history(data)
  +total = history_count(data)
  +start = U32.sub(total, U32.min(total, 1))
  +x = Bool.pick(U32, mobile, 20, 612)
  +y = U32.add(492, 18)
  +ink_color = muted(theme)
  +empty = text_valid(U32.is_zero(total), depth, size,
    "No moves yet", x, y, 1, ink_color, image)
  history_draw.go(depth, size, entries, 0, start, 1, x, y, ink_color, empty)

def short_context(context: String) -> String:
  match context:
    case "Move and Shift choices": "Choose a destination"
    case "Shift options": "Choose a Shift destination"
    case "Move or Shift choose a source": "Choose a source"
    case _: context

def selection_is_empty(selection: String) -> Bool:
  match selection:
    case "Select a piece or an open tile": True{}
    case _: False{}

def selection_heading(selection: String) -> String:
  Bool.pick(String, selection_is_empty(selection), "Choose a source", "Selected")

def selection_identity(selection: String) -> String:
  match selection:
    case "Select a piece or an open tile": "Piece or open tile"
    case _: selection

def selection_identity.mobile(selection: String) -> String:
  match selection:
    case "Select a piece or an open tile": "No selection"
    case _: selection

def selection_tag(selection: String) -> String:
  Bool.pick(String, selection_is_empty(selection), "READY", "FOCUS")

def mode_label.mobile(mode: String) -> String:
  match mode:
    case "Local you are White": "Seat W"
    case "Local you are Black": "Seat B"
    case _: "Hotseat"

def empty_choice_hint(selection: String) -> String:
  Bool.pick(String, selection_is_empty(selection), "Tap a piece", "No choices now")

def contains_control.go(controls: List<&2, ChromePlan.Control>, +id: U32) -> Bool:
  match controls:
    case Nil{}: False{}
    case +head <> tail:
      Bool.or(U32.is_eq(ChromePlan.control_id(head), id),
        contains_control.go(tail, id))

def contains_control(plan: ChromePlan.Plan, +id: U32) -> Bool:
  contains_control.go(ChromePlan.plan_controls(plan), id)

def show_empty_choices.go(controls: List<&2, ChromePlan.Control>) -> Bool:
  match controls:
    case Nil{}: True{}
    case +head <> tail:
      +id = ChromePlan.control_id(head)
      +has_choice = Bool.or(ChromePlan.dest_id(id), U32.is_eq(id, 47))
      Bool.and(Bool.not(has_choice), show_empty_choices.go(tail))

def show_empty_choices(plan: ChromePlan.Plan) -> Bool:
  show_empty_choices.go(ChromePlan.plan_controls(plan))

def destination_reticle(show: Bool, +depth: Nat, +size: U32,
  +theme: U32, image: Image) -> Image:
  match show:
    case True{}:
      +outer = ring(depth, size, 744, 300, 17, 19, accent(theme), 82, image)
      +inner = ring(depth, size, 744, 300, 8, 10, ink(theme), 64, outer)
      +top = rounded(depth, size, 743, 275, 745, 282, 1,
        accent(theme), 125, inner)
      +bottom = rounded(depth, size, 743, 318, 745, 325, 1,
        accent(theme), 125, top)
      +left = rounded(depth, size, 716, 299, 723, 301, 1,
        accent(theme), 125, bottom)
      +right = rounded(depth, size, 765, 299, 772, 301, 1,
        accent(theme), 125, left)
      disk(depth, size, 744, 300, 2, selection_focus(theme, True{}), 220, right)
    case False{}: image

def play_text.desktop(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +theme: U32, +plan: ChromePlan.Plan, image: Image) -> Image:
  +status_orbit = ring(depth, size, 600, 90, 5, 6, accent(theme), 115, image)
  +status_mark = disk(depth, size, 600, 90, 2, selection_focus(theme, True{}),
    255, status_orbit)
  +turn = text(depth, size, ChromeData.status(data), 610, 78, 1, ink(theme), status_mark)
  +mode = text(depth, size, ChromeData.mode(data), 610, 102, 1, muted(theme), turn)
  +selection = ChromeData.selection(data)
  +selected_head = text(depth, size, selection_heading(selection), 624, 132,
    1, selection_focus(theme, Bool.not(selection_is_empty(selection))), mode)
  +identity = text(depth, size, selection_identity(selection), 624, 152,
    1, selection_focus(theme, Bool.not(selection_is_empty(selection))), selected_head)
  +context = text_valid(Bool.not(selection_is_empty(selection)), depth, size,
    short_context(ChromeData.context(data)), 610, 180, 1, accent(theme), identity)
  +choices = text(depth, size, "Move / Shift", 610, 212, 1, ink(theme), context)
  +empty = show_empty_choices(plan)
  +reticle = destination_reticle(empty, depth, size, theme, choices)
  +empty_choices = text_valid(empty, depth, size,
    empty_choice_hint(selection), 668, 246, 1, muted(theme), reticle)
  +game = text(depth, size, "Match actions", 610, 356, 1, muted(theme), empty_choices)
  +history = text(depth, size, "Recent", 610, 490, 1, muted(theme), game)
  +latest = recent_history(depth, size, data, False{}, theme, history)
  text_valid(contains_control(plan, 11), depth, size, "Camera", 610, 540,
    1, muted(theme), latest)

def play_text.mobile(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +theme: U32, +plan: ChromePlan.Plan, image: Image) -> Image:
  +turn = text(depth, size, ChromeData.status(data), 20, 588, 2, ink(theme), image)
  +selection = ChromeData.selection(data)
  +selected = Bool.not(selection_is_empty(selection))
  +focus = selection_focus(theme, selected)
  +orbital = ring(depth, size, 32, 661, 5, 7, focus, 180, turn)
  +core = disk(depth, size, 32, 661, 2, focus, 255, orbital)
  +tag = text(depth, size, selection_tag(selection), 48, 646, 1, muted(theme), core)
  +identity = text(depth, size, selection_identity.mobile(selection), 128, 642, 2,
    focus, tag)
  +choices = text(depth, size, "Move / Shift", 20, 690, 1,
    accent(theme), identity)
  +empty_choices = text_valid(show_empty_choices(plan), depth, size,
    empty_choice_hint(selection), 20, 712, 1, muted(theme), choices)
  +game = text(depth, size, "Match actions", 20, 764, 1, muted(theme), empty_choices)
  text_valid(contains_control(plan, 11), depth, size, "Camera", 20, 922,
    1, muted(theme), game)

def play_text(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +mobile: Bool, +theme: U32, +plan: ChromePlan.Plan, image: Image) -> Image:
  match mobile:
    case True{}: play_text.mobile(depth, size, data, theme, plan, image)
    case False{}: play_text.desktop(depth, size, data, theme, plan, image)

def setting_value_color(value: String, theme: U32) -> U32:
  match value:
    case "Unavailable": muted(theme)
    case _: accent(theme)

def read_only_setting.desktop(+depth: Nat, +size: U32, +theme: U32,
  +label: String, +value: String, +y: U32, image: Image) -> Image:
  +card = panel(depth, size, 610, y, 268, 48, 9,
    surface_lift(theme), edge(theme), image)
  +rail = rounded(depth, size, 617, U32.add(y, 8),
    620, U32.add(y, 40), 2, accent(theme), 180, card)
  +name = text(depth, size, label, 622, U32.add(y, 5),
    1, muted(theme), rail)
  +value_color = setting_value_color(value, theme)
  text(depth, size, value, 622, U32.add(y, 26),
    1, value_color, name)

def read_only_setting.mobile(+depth: Nat, +size: U32, +theme: U32,
  +label: String, +value: String, +y: U32, image: Image) -> Image:
  +card = panel(depth, size, 16, y, 480, 34, 9,
    surface_lift(theme), edge(theme), image)
  +rail = rounded(depth, size, 23, U32.add(y, 8),
    26, U32.sub(U32.add(y, 34), 8), 2,
    accent(theme), 180, card)
  +name = text(depth, size, label, 28, U32.add(y, 10),
    1, muted(theme), rail)
  +value_width = AtlasText.width(value, 1)
  +value_x = U32.sub(496, U32.add(12, value_width))
  +value_color = setting_value_color(value, theme)
  text(depth, size, value, value_x, U32.add(y, 10), 1, value_color, name)

def read_only_setting.for(mobile: Bool, +depth: Nat, +size: U32,
  +theme: U32, +label: String, +value: String, +y: U32, image: Image) -> Image:
  match mobile:
    case True{}: read_only_setting.mobile(depth, size, theme, label, value, y, image)
    case False{}: read_only_setting.desktop(depth, size, theme, label, value, y, image)

def read_only_setting(+depth: Nat, +size: U32, +mobile: Bool,
  +theme: U32, +label: String, +value: String, +y: U32, image: Image) -> Image:
  read_only_setting.for(mobile, depth, size, theme, label, value, y, image)

def detail_status(plan: ChromePlan.Plan) -> String:
  Bool.pick(String, U32.is_ge(ChromePlan.plan_scale(plan), 2),
    "Enhanced", "Standard")

def settings_text(+depth: Nat, +size: U32, +mobile: Bool,
  +theme: U32, +data: ChromeData.Presentation, image: Image) -> Image:
  +x = Bool.pick(U32, mobile, 20, 610)
  +title_y = Bool.pick(U32, mobile, 584, 92)
  +title_size = Bool.pick(U32, mobile, 2, 2)
  +section_size = Bool.pick(U32, mobile, 2, 1)
  +title = text(depth, size, "Settings", x, title_y, title_size, ink(theme), image)
  +palette_y = Bool.pick(U32, mobile, 628, 140)
  +sound_y = Bool.pick(U32, mobile, 716, 200)
  +marker_y = Bool.pick(U32, mobile, 760, 260)
  +data_y = Bool.pick(U32, mobile, 844, 320)
  +palettes = text(depth, size, "Palettes", x, palette_y, section_size, muted(theme), title)
  +sound_value = text_valid(Bool.not(mobile), depth, size,
    String.append("Sound is ", Bool.pick(String,
      ChromeData.sound_on(data), "On", "Off")),
    x, sound_y, section_size, accent(theme), palettes)
  +markers = text(depth, size, "Move markers", x, marker_y,
    section_size, muted(theme), sound_value)
  text(depth, size, "Match data", x, data_y, section_size, muted(theme), markers)

def history_text(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +mobile: Bool, +theme: U32, image: Image) -> Image:
  +x = Bool.pick(U32, mobile, 20, 610)
  +y = Bool.pick(U32, mobile, 590, 92)
  +heading = Bool.pick(String, mobile, "Move history", "History")
  +title = text(depth, size, heading, x, y, 2, ink(theme), image)
  +entries = ChromeData.history(data)
  +total = history_count(data)
  +page = ChromeData.page(data)
  +start = U32.mul(page, 10)
  +empty = text_valid(U32.is_zero(total), depth, size,
    "No moves yet", x, Bool.pick(U32, mobile, 650, 148), 1, muted(theme), title)
  history_draw.go(depth, size, entries, 0, start, 10, x,
    Bool.pick(U32, mobile, 650, 148), ink(theme), empty)

def menu_hint(menu: U32) -> String:
  match menu:
    case 1: "Set seat, layout, policy"
    case 3: "Move or Shift a tile"
    case 4: "Choose a piece"
    case 5: "Confirm resignation"
    case 6: "Review recovered match"
    case 7: "Choose a destination"
    case 8: "Review undo request"
    case 9: "Choose a side"
    case _: "Choose an action"

def menu_hint.mobile(menu: U32) -> String:
  match menu:
    case 1: "Choose your setup"
    case 6: "Review recovery"
    case _: menu_hint(menu)

def generic_menu_text(+depth: Nat, +size: U32,
  +mobile: Bool, +menu: U32, +theme: U32, image: Image) -> Image:
  +x = Bool.pick(U32, mobile, 20, 610)
  +y = Bool.pick(U32, mobile, 590, 92)
  +title_size = Bool.pick(U32, mobile, 2, 2)
  +heading = Bool.pick(String, mobile, menu_title.mobile(menu), menu_title(menu))
  +title = text(depth, size, heading, x, y, title_size, ink(theme), image)
  +hint = Bool.pick(String, mobile, menu_hint.mobile(menu), menu_hint(menu))
  +hint_size = Bool.pick(U32, mobile, 2, 1)
  text(depth, size, hint, x,
    Bool.pick(U32, mobile, 644, 140), hint_size, muted(theme), title)

def new_match_text(+depth: Nat, +size: U32, +mobile: Bool,
  +theme: U32, image: Image) -> Image:
  +x = Bool.pick(U32, mobile, 20, 610)
  +title_y = Bool.pick(U32, mobile, 596, 92)
  +title_size = Bool.pick(U32, mobile, 2, 2)
  +heading = Bool.pick(String, mobile, "New match", "New")
  +title = text(depth, size, heading, x, title_y, title_size, ink(theme), image)
  +hint_text = Bool.pick(String, mobile, menu_hint.mobile(1), menu_hint(1))
  +hint_y = Bool.pick(U32, mobile, 636, 140)
  +hint_size = Bool.pick(U32, mobile, 2, 1)
  +hint = text(depth, size, hint_text, x, hint_y, hint_size, muted(theme), title)
  +section_size = Bool.pick(U32, mobile, 2, 1)
  +seat = text(depth, size, "Seat", x,
    Bool.pick(U32, mobile, 718, 214), section_size, muted(theme), hint)
  +layout = text(depth, size, "Board layout",
    x, Bool.pick(U32, mobile, 800, 276), section_size, muted(theme), seat)
  text(depth, size, "Play policy", x,
    Bool.pick(U32, mobile, 882, 338), section_size, muted(theme), layout)

def control_label.action(+id: U32, +label: String) -> String:
  match id:
    case 1: "Prefs"
    case 2: "New"
    case 3: "Undo"
    case 4: "Clear"
    case 5: "Shift"
    case 6: "Draw"
    case 7: "Resign"
    case 8: "Accept"
    case 9: "Decline"
    case 10: "Resume"
    case 11: "Front"
    case 12: "Top"
    case 13: "Left"
    case 14: "Right"
    case 15: "Tilt+"
    case 16: "Tilt-"
    case 17: "Zoom+"
    case 18: "Zoom-"
    case 19: "Reset"
    case 20: "Export"
    case 21: "Import"
    case 22: "Astral"
    case 23: "Warm"
    case 24: "Sound"
    case 25: "Vol+"
    case 26: "Vol-"
    case 27: "Help"
    case 28: "Close"
    case 29: "Start"
    case 30: "Hotseat"
    case 31: "White"
    case 32: "Black"
    case 33: "Layout B"
    case 34: "Layout C"
    case 35: "Prompt"
    case 36: "Auto"
    case 37: "Off"
    case 38: "Queen"
    case 39: "Rook"
    case 40: "Bishop"
    case 41: "Knight"
    case 42: "Confirm"
    case 43: "Recover"
    case 44: "Original"
    case 45: "Prev"
    case 46: "Next"
    case 47: "Moves"
    case 48: "Agree"
    case 49: "White"
    case 50: "Black"
    case 51: "White"
    case 52: "Black"
    case 53: "Move"
    case 54: "Shift"
    case 55: "History"
    case _: label

def shift_destination(+id: U32) -> Bool:
  Bool.and(U32.is_ge(id, 21480), U32.is_lt(id, 22760))

def control_label.destination(is_destination: Bool, is_shift: Bool,
  +id: U32, +label: String) -> String:
  match is_destination:
    case True{}:
      match is_shift:
        case True{}: String.drop(label, 3n)
        case False{}: label
    case False{}: control_label.action(id, label)

def control_label(+id: U32, +label: String) -> String:
  +is_destination = ChromePlan.dest_id(id)
  +is_shift = shift_destination(id)
  control_label.destination(is_destination, is_shift, id, label)

def button_fill(+theme: U32, +id: U32, +enabled: Bool, +active: Bool) -> U32:
  match enabled active:
    case False{} _: surface(theme)
    case True{} True{}: Bool.pick(U32, U32.is_eq(id, 7), danger(theme), accent(theme))
    case True{} False{}:
      Bool.pick(U32, U32.is_eq(id, 7), surface_lift(theme), surface_lift(theme))

def move_accent(theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), 2922471, 3987501)

def button_edge(+theme: U32, +id: U32, +active: Bool, +enabled: Bool) -> U32:
  match active enabled:
    case True{} _: accent(theme)
    case False{} False{}: edge(theme)
    case False{} True{}:
      Bool.pick(U32, U32.is_eq(id, 7), danger(theme),
        Bool.pick(U32, shift_destination(id), accent(theme),
          Bool.pick(U32, ChromePlan.dest_id(id), move_accent(theme), edge(theme))))

def mobile_large_button(+id: U32) -> Bool:
  match id:
    case 3: True{}
    case 4: True{}
    case 5: True{}
    case 6: True{}
    case 7: True{}
    case 8: True{}
    case 9: True{}
    case 22: True{}
    case 23: True{}
    case 24: True{}
    case 25: True{}
    case 26: True{}
    case 29: True{}
    case 31: True{}
    case 32: True{}
    case 36: True{}
    case 37: True{}
    case 39: True{}
    case 42: True{}
    case 45: True{}
    case 46: True{}
    case 49: True{}
    case 50: True{}
    case 51: True{}
    case 52: True{}
    case 53: True{}
    case 54: True{}
    case 55: True{}
    case _: False{}

def paint_control(+depth: Nat, +size: U32, +theme: U32,
  +mobile: Bool, +control: ChromePlan.Control, image: Image) -> Image:
  +bounds = ChromePlan.control_bounds(control)
  +id = ChromePlan.control_id(control)
  +x = ChromePlan.rect_x(bounds)
  +y = ChromePlan.rect_y(bounds)
  +w = ChromePlan.rect_width(bounds)
  +h = ChromePlan.rect_height(bounds)
  +enabled = ChromePlan.control_enabled(control)
  +active = ChromePlan.control_active(control)
  +fill = button_fill(theme, id, enabled, active)
  +rim = button_edge(theme, id, active, enabled)
  +radius = U32.min(12, U32.div(h, 2))
  +face = Widgets.panel(depth, size, x, y, w, h, radius, fill, rim, image)
  +label = control_label(id, ChromePlan.control_label(control))
  +base_font = U32.div(size, 1024)
  +large_font = U32.mul(base_font, 2)
  +large_width = AtlasText.width(label, large_font)
  +large_allowed = Bool.and(mobile, mobile_large_button(id))
  +large_fit = Bool.and(large_allowed, U32.is_le(large_width, w))
  +font = Bool.pick(U32, large_fit, large_font, base_font)
  +label_width = AtlasText.width(label, font)
  +label_x = U32.add(x, U32.div(U32.sub(w, U32.min(w, label_width)), 2))
  +text_height = U32.min(h, U32.mul(24, font))
  +normal_y = U32.add(y, U32.div(U32.sub(h, text_height), 2))
  +large_y = U32.sub(y, U32.mul(6, base_font))
  +camera_id = Bool.and(U32.is_ge(id, 11), U32.is_lt(id, 20))
  +camera_adjust = Bool.and(Bool.not(mobile), camera_id)
  +camera_y = U32.sub(y, U32.mul(3, base_font))
  +small_y = Bool.pick(U32, camera_adjust, camera_y, normal_y)
  +label_y = Bool.pick(U32, large_fit, large_y, small_y)
  +color = Bool.pick(U32, enabled, ink(theme), muted(theme))
  AtlasText.draw(depth, size, label, label_x, label_y, font, color, face)

def paint_controls.go(+depth: Nat, +size: U32, +theme: U32, +mobile: Bool,
  controls: List<&2, ChromePlan.Control>, image: Image) -> Image:
  match controls:
    case Nil{}: image
    case +head <> tail:
      +painted = paint_control(depth, size, theme, mobile, head, image)
      paint_controls.go(depth, size, theme, mobile, tail, painted)

def settings_extras(+depth: Nat, +size: U32, +mobile: Bool,
  +theme: U32, +plan: ChromePlan.Plan, image: Image) -> Image:
  +detail_y = Bool.pick(U32, mobile, 930, 396)
  +motion_y = Bool.pick(U32, mobile, 972, 448)
  +a = read_only_setting(depth, size, mobile, theme,
    "Auto detail", detail_status(plan), detail_y, image)
  read_only_setting(depth, size, mobile, theme,
    "Reduced motion", "Unavailable", motion_y, a)

def menu_extras(menu: U32, +depth: Nat, +size: U32,
  +mobile: Bool, +theme: U32, +plan: ChromePlan.Plan, image: Image) -> Image:
  match menu:
    case 2: settings_extras(depth, size, mobile, theme, plan, image)
    case _: image

def menu_panel.desktop(menu: U32, +depth: Nat, +size: U32,
  +data: ChromeData.Presentation, +theme: U32,
  +plan: ChromePlan.Plan, image: Image) -> Image:
  match menu:
    case 0: play_text.desktop(depth, size, data, theme, plan, image)
    case 1: new_match_text(depth, size, False{}, theme, image)
    case 2:
      +sheet = panel(depth, size, 602, 76, 284, 540, 14,
        surface_lift(theme), edge(theme), image)
      settings_text(depth, size, False{}, theme, data, sheet)
    case 10:
      +sheet = panel(depth, size, 602, 76, 284, 540, 14,
        surface_lift(theme), edge(theme), image)
      history_text(depth, size, data, False{}, theme, sheet)
    case _:
      +sheet = panel(depth, size, 602, 76, 284, 540, 14,
        surface_lift(theme), edge(theme), image)
      generic_menu_text(depth, size, False{}, menu, theme, sheet)

def menu_panel.mobile(menu: U32, +depth: Nat, +size: U32,
  +data: ChromeData.Presentation, +theme: U32,
  +plan: ChromePlan.Plan, image: Image) -> Image:
  match menu:
    case 0: play_text.mobile(depth, size, data, theme, plan, image)
    case 1: new_match_text(depth, size, True{}, theme, image)
    case 2: settings_text(depth, size, True{}, theme, data, image)
    case 10: history_text(depth, size, data, True{}, theme, image)
    case _: generic_menu_text(depth, size, True{}, menu, theme, image)

def menu_base.mobile(menu: U32, +depth: Nat, +size: U32,
  +theme: U32, image: Image) -> Image:
  match menu:
    case 0: image
    case _:
      panel(depth, size, 8, 584, 496, 432, 16,
        surface_lift(theme), edge(theme), image)

def desktop_shell(+depth: Nat, +size: U32, +theme: U32) -> Image:
  +base = background(depth, size, theme)
  +frame = board_frame(depth, size, False{}, theme, base)
  +rail = desktop_rail(depth, size, theme, frame)
  +head = text(depth, size, "Rift Chess", 52, 8, 2, ink(theme), rail)
  +sub_x = U32.add(U32.add(52, AtlasText.width("Rift Chess", 2)), 16)
  +sub = text(depth, size, "The Observatory", sub_x, 20, 1, muted(theme), head)
  +brand_rule = rounded(depth, size, 52, 57, 172, 59, 1,
    accent(theme), 150, sub)
  +sigil_outer = ring(depth, size, 936, 34, 10, 12, accent(theme), 100, brand_rule)
  +sigil_inner = ring(depth, size, 936, 34, 4, 5, ink(theme), 80, sigil_outer)
  disk(depth, size, 936, 34, 2, selection_focus(theme, True{}), 230, sigil_inner)

def mobile_shell(+depth: Nat, +size: U32, +theme: U32) -> Image:
  +base = background(depth, size, theme)
  +frame = board_frame(depth, size, True{}, theme, base)
  +dock = portrait_dock(depth, size, theme, frame)
  +head = text(depth, size, "Rift Chess", 16, 8, 1, ink(theme), dock)
  +bezel = ring(depth, size, 140, 26, 5, 6, accent(theme), 100, head)
  disk(depth, size, 140, 26, 2, selection_focus(theme, True{}), 215, bezel)

def shell.for(mobile: Bool, +depth: Nat, +size: U32,
  +theme: U32, +plan: ChromePlan.Plan) -> Image:
  match mobile:
    case True{}: mobile_shell(depth, size, theme)
    case False{}: desktop_shell(depth, size, theme)

def shell(+depth: Nat, +size: U32, +theme: U32,
  +plan: ChromePlan.Plan) -> Image:
  shell.for(ChromePlan.plan_mobile(plan), depth, size, theme, plan)

def overlay.desktop(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +plan: ChromePlan.Plan, image: Image) -> Image:
  +theme = ChromeData.theme(data)
  +selection = ChromeData.selection(data)
  +selected = Bool.not(selection_is_empty(selection))
  +focus = selection_card.desktop(depth, size, theme, selected, image)
  +controls = ChromePlan.plan_controls(plan)
  +menu = ChromeData.menu(data)
  +panel_content = menu_panel.desktop(menu, depth, size, data, theme, plan, focus)
  +with_extras = menu_extras(menu, depth, size, False{}, theme, plan, panel_content)
  paint_controls.go(depth, size, theme, False{}, controls, with_extras)

def overlay.mobile(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +plan: ChromePlan.Plan, image: Image) -> Image:
  +theme = ChromeData.theme(data)
  +selection = ChromeData.selection(data)
  +selected = Bool.not(selection_is_empty(selection))
  +focus = selection_card.mobile(depth, size, theme, selected, image)
  +controls = ChromePlan.plan_controls(plan)
  +menu = ChromeData.menu(data)
  +play = menu_base.mobile(menu, depth, size, theme, focus)
  +panel_content = menu_panel.mobile(menu, depth, size, data, theme, plan, play)
  +with_extras = menu_extras(menu, depth, size, True{}, theme, plan, panel_content)
  +mode = text(depth, size, mode_label.mobile(ChromeData.mode(data)), 156, 8,
    1, muted(theme), with_extras)
  paint_controls.go(depth, size, theme, True{}, controls, mode)

def overlay.for(mobile: Bool, +depth: Nat, +size: U32,
  +data: ChromeData.Presentation, +plan: ChromePlan.Plan,
  shell_image: Image) -> Image:
  match mobile:
    case True{}: overlay.mobile(depth, size, data, plan, shell_image)
    case False{}: overlay.desktop(depth, size, data, plan, shell_image)

def overlay(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +plan: ChromePlan.Plan, shell_image: Image) -> Image:
  overlay.for(ChromePlan.plan_mobile(plan), depth, size, data, plan, shell_image)

# Paint the HUD/layout into a full-canvas image without the board. A host may
# retain the shell across camera/status changes and update only the overlay.
def chrome_only.for(+mobile: Bool, +depth: Nat, +size: U32,
  +data: ChromeData.Presentation, +plan: ChromePlan.Plan) -> Image:
  +theme = ChromeData.theme(data)
  +static = shell.for(mobile, depth, size, theme, plan)
  overlay.for(mobile, depth, size, data, plan, static)

def chrome_only(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +plan: ChromePlan.Plan) -> Image:
  chrome_only.for(ChromePlan.plan_mobile(plan), depth, size, data, plan)

# Embed the board-only quadtree over the cacheable chrome. Its source side must
# be 2^boardDepth; its rect is the exact planned board hit/presentation region.
def compose(+depth: Nat, +boardDepth: Nat, +plan: ChromePlan.Plan,
  board_image: Image, chrome_image: Image) -> Image:
  +board = ChromePlan.plan_board(plan)
  Canvas.embed_at(depth, board_image, boardDepth,
    ChromePlan.rect_x(board), ChromePlan.rect_y(board), chrome_image)

# `board_image` is board-only, with side length 2^plan.boardDepth. A full-canvas
# specimen or precomposed Dome.screen must not cross this seam.
def render(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +plan: ChromePlan.Plan, board_image: Image) -> Image:
  +chrome = chrome_only(depth, size, data, plan)
  compose(depth, ChromePlan.plan_board_depth(plan), plan, board_image, chrome)


