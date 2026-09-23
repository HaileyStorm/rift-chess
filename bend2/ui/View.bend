# Pixel UI composition for the Bend game.  The board is supplied by Scene and
# is embedded only after this module paints the surrounding chrome, so menus
# never cover board pixels.
import Base
import ./Types.bend as Types
import ./Layout.bend as Layout
import ../core/Model.bend as Model
import ../lib/graphics/Canvas.bend as Canvas
import ../lib/graphics/Font.bend as Font

def bg_astral() -> U32:
  330516

def bg_warm() -> U32:
  1576972

def panel_astral() -> U32:
  662570

def panel_warm() -> U32:
  2497559

def edge_warm() -> U32:
  6966069

def button_warm() -> U32:
  3811358

def button_active_warm() -> U32:
  9069373

def panel_edge() -> U32:
  2704466

def button_fill() -> U32:
  1057586

def button_active() -> U32:
  1654864

def button_disabled() -> U32:
  1714484

def ink() -> U32:
  16183519

def muted() -> U32:
  10926015

def disabled_ink() -> U32:
  7438730

def cyan() -> U32:
  7530467

def gold() -> U32:
  15317616

def danger() -> U32:
  15699339

def theme_bg(theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), bg_warm(), bg_astral())

def theme_panel(theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), panel_warm(), panel_astral())

def theme_edge(theme: U32) -> U32:
  Bool.pick(U32, U32.is_eq(theme, 1), edge_warm(), panel_edge())

def theme_button(+theme: U32, active: Bool) -> U32:
  Bool.pick(U32, active, Bool.pick(U32, U32.is_eq(theme, 1),
    button_active_warm(), button_active()),
    Bool.pick(U32, U32.is_eq(theme, 1), button_warm(), button_fill()))

def menu(snapshot: Types.Snapshot) -> U32:
  Types.panels_menu(Types.snapshot_panels(snapshot))

def theme(snapshot: Types.Snapshot) -> U32:
  Types.preferences_theme(Types.snapshot_preferences(snapshot))

def mobile(snapshot: Types.Snapshot) -> Bool:
  Types.snapshot_mobile(snapshot)

def pane_height(+mobile: Bool) -> U32:
  U32.sub(Layout.height(mobile), U32.add(Layout.pane_y(mobile), 12))

def board_rim(+mobile: Bool, +theme: U32, +board: Types.Rect, +image: Image) -> Image:
  +x = Types.rect_x(board)
  +y = Types.rect_y(board)
  +edge = theme_edge(theme)
  +top = Canvas.rect(x, U32.sub(y, 4), 512, 4, edge, image)
  +bottom = Canvas.rect(x, U32.add(y, 512), 512, 4, edge, top)
  +left_x = U32.sub(U32.max(x, 4), 4)
  +left_w = Bool.pick(U32, U32.is_lt(x, 4), 0, 4)
  +left = Canvas.rect(left_x, y, left_w, 512, edge, bottom)
  Canvas.rect(U32.add(x, 512), y, 4, 512, edge, left)

def draw_shell(+mobile: Bool, +theme: U32, +image: Image) -> Image:
  +pane = Canvas.frame(Layout.pane_x(mobile), Layout.pane_y(mobile),
    Layout.pane_width(mobile), pane_height(mobile), theme_edge(theme), theme_panel(theme), image)
  +board = Layout.board_rect(mobile)
  board_rim(mobile, theme, board, pane)

def state_text.for(+outcome: U32, +meta: Types.Meta) -> String:
  match outcome:
    case 1: "WHITE WINS"
    case 2: "BLACK WINS"
    case 3: "STALEMATE"
    case 4: "DRAW - BARE KINGS"
    case 5: "DRAW - THREEFOLD"
    case 6: "DRAW - 100 QUIET"
    case 7: "DRAW AGREED"
    case 8: "BLACK WINS - RESIGNED"
    case 9: "WHITE WINS - RESIGNED"
    case _:
      String.append(Bool.pick(String, Types.meta_turn(meta), "WHITE", "BLACK"),
        Bool.pick(String, Types.meta_inCheck(meta), " TO MOVE - CHECK", " TO MOVE"))

def state_text(+meta: Types.Meta) -> String:
  state_text.for(Types.meta_outcome(meta), meta)

def mode_text.for(+mode: U32) -> String:
  match mode:
    case 1: "YOU ARE WHITE - LOCAL BOT"
    case 2: "YOU ARE BLACK - LOCAL BOT"
    case _: "LOCAL HOTSEAT"

def mode_text(preferences: Types.Preferences) -> String:
  mode_text.for(Types.preferences_mode(preferences))

def policy_text.for(+policy: U32) -> String:
  match policy:
    case 1: "AUTO 100"
    case 2: "QUIET DRAW OFF"
    case _: "PROMPT AT 100"

def policy_text(preferences: Types.Preferences) -> String:
  policy_text.for(Types.preferences_policy(preferences))

def quiet_text.for(policy: U32, count: Nat) -> String:
  match policy:
    case 2: "QUIET DRAW OFF"
    case 1: String.append("QUIET ", String.append(Nat.show(count), "/100 - AUTO"))
    case _: String.append("QUIET ", String.append(Nat.show(count), "/100 - BY AGREEMENT"))

def quiet_text(+snapshot: Types.Snapshot) -> String:
  quiet_text.for(Types.preferences_policy(Types.snapshot_preferences(snapshot)),
    Model.pos_quiet(Types.frame_position(Types.snapshot_frame(snapshot))))

def menu_title(+id: U32) -> String:
  match id:
    case 1: "NEW MATCH"
    case 2: "PREFERENCES"
    case 3: "HELP"
    case 4: "PROMOTION"
    case 5: "RESIGN"
    case 6: "RECOVERY"
    case 7: "LEGAL MOVES"
    case 8: "UNDO REQUEST"
    case 9: "OFFER DRAW"
    case _: "PLAY"

def menu_copy(+id: U32) -> String:
  match id:
    case 1: "Choose a local table and draw policy."
    case 2: "Theme, sound, records, and recovery."
    case 3: "Select a piece, then a lit destination."
    case 4: "Choose the piece that reaches the last rank."
    case 5: "Choose who resigns, then confirm."
    case 6: "The imported record is kept for inspection."
    case 9: "Choose the side making the offer."
    case _: "Orbit the board or choose a control below."

def resign_page_copy(+page: U32) -> String:
  match page:
    case 1: "WHITE WILL RESIGN. CONFIRM TO END."
    case 2: "BLACK WILL RESIGN. CONFIRM TO END."
    case _: "CHOOSE A SIDE, THEN CONFIRM."

def draw_history.go(+xs: List<&2, String>, +index: U32, +origin_x: U32,
  +origin_y: U32, +image: Image) -> Image:
  match xs:
    case Nil{}:
      image
    case +h <> t:
      +y = U32.add(origin_y, U32.mul(index, 16))
      +line = Font.draw(String.append(U32.show(U32.add(index, 1)),
        String.append("  ", h)), origin_x, y, 2, muted(), image)
      Bool.pick(Image, U32.is_lt(index, 5),
        draw_history.go(t, U32.add(index, 1), origin_x, origin_y, line), line)

def draw_history(xs: List<&2, String>, origin_x: U32, origin_y: U32,
  image: Image) -> Image:
  draw_history.go(xs, 0, origin_x, origin_y, image)

def notice(+snapshot: Types.Snapshot, +image: Image) -> Image:
  +text = Types.panels_notice(Types.snapshot_panels(snapshot))
  +is_mobile = mobile(snapshot)
  +y = Bool.pick(U32, is_mobile, U32.add(Layout.pane_y(is_mobile), 94),
    U32.add(Layout.pane_y(is_mobile), 86))
  Font.draw(text, U32.add(Layout.pane_x(is_mobile), 16), y, 1, gold(), image)

def sound_word(+enabled: Bool) -> String:
  Bool.pick(String, enabled, "SOUND ON", "SOUND OFF")

def settings_line.for(+menu_id: U32, +preferences: Types.Preferences,
  +x: U32, +y: U32, +image: Image) -> Image:
  match menu_id:
    case 2:
      Font.draw(String.append(sound_word(Types.preferences_sound(preferences)),
        String.append("  VOLUME ", String.append(U32.show(Types.preferences_volume(preferences)), "%"))),
        x, y, 1, gold(), image)
    case _:
      image

def settings_line(+snapshot: Types.Snapshot, +image: Image) -> Image:
  +is_mobile = mobile(snapshot)
  +preferences = Types.snapshot_preferences(snapshot)
  +panels = Types.snapshot_panels(snapshot)
  +y = Bool.pick(U32, is_mobile, U32.add(Layout.pane_y(is_mobile), 96),
    U32.add(Layout.pane_y(is_mobile), 84))
  settings_line.for(Bool.pick(U32, String.is_empty(Types.panels_notice(panels)), Types.panels_menu(panels), 0), preferences,
    U32.add(Layout.pane_x(is_mobile), 14), y, image)

def headings(+snapshot: Types.Snapshot, +image: Image) -> Image:
  +p = Types.snapshot_preferences(snapshot)
  +m = Types.snapshot_meta(snapshot)
  +panels = Types.snapshot_panels(snapshot)
  +is_mobile = mobile(snapshot)
  +x = U32.add(Layout.pane_x(is_mobile), 14)
  +y = U32.add(Layout.pane_y(is_mobile), 10)
  +title_scale = Bool.pick(U32, is_mobile, 3, 2)
  +body_scale = U32.add(0, 2)
  +state_y = Bool.pick(U32, is_mobile, U32.add(y, 26), U32.add(y, 20))
  +mode_y = Bool.pick(U32, is_mobile, U32.add(y, 50), U32.add(y, 40))
  +draw_y = Bool.pick(U32, is_mobile, U32.add(y, 68), U32.add(y, 58))
  +a = Font.draw(menu_title(Types.panels_menu(panels)), x, y, title_scale, cyan(), image)
  +b = Font.draw(state_text(m), x, state_y, title_scale, ink(), a)
  +c = Font.draw(mode_text(p), x, mode_y, body_scale, muted(), b)
  +d = Font.draw(quiet_text(snapshot), x,
    draw_y, body_scale, muted(), c)
  +e = settings_line(snapshot, d)
  notice(snapshot, e)

def page_text.for(+menu_id: U32, +snapshot: Types.Snapshot, +x: U32,
  +base: U32, image: Image) -> Image:
  match menu_id:
    case 0:
      image
    case 1:
      image
    case 2:
      image
    case 3:
      +a = Font.draw("RIFT CHESS IS CHESS ON TWO HOLES.", x, base, 2, ink(), image)
      +b = Font.draw("CLICK A PIECE, THEN A LIT SQUARE.", x, U32.add(base, 18), 2, muted(), a)
      +c = Font.draw("EMPTY PLATFORMS SELECT A SHIFT.", x, U32.add(base, 36), 2, muted(), b)
      Font.draw("ARROWS MOVE FOCUS; ENTER ACTIVATES.", x, U32.add(base, 54), 2, muted(), c)
    case 4:
      image
    case 5:
      Font.draw(resign_page_copy(Types.panels_page(Types.snapshot_panels(snapshot))), x, base, 2, gold(), image)
    case 6:
      +a = Font.draw("INVALID OR INCOMPLETE RECORD", x, base, 2, danger(), image)
      Font.draw("DOWNLOAD THE RECOVERY COPY.", x, U32.add(base, 20), 2, gold(), a)
    case 9:
      +a = Font.draw("CHOOSE WHO IS OFFERING THE DRAW.", x, base, 2, ink(), image)
      Font.draw("EITHER SIDE MAY OFFER OFF-TURN.", x, U32.add(base, 20), 2, muted(), a)
    case _:
      image

def page_offset(+menu_id: U32, +mobile: Bool) -> U32:
  match menu_id:
    case 5: Bool.pick(U32, mobile, 160, 136)
    case 9: Bool.pick(U32, mobile, 160, 136)
    case _: Bool.pick(U32, mobile, 160, 120)

def page_text(+snapshot: Types.Snapshot, +image: Image) -> Image:
  +is_mobile = mobile(snapshot)
  +x = U32.add(Layout.pane_x(is_mobile), 14)
  +p = Types.snapshot_panels(snapshot)
  +menu_id = Types.panels_menu(p)
  +offset = page_offset(menu_id, is_mobile)
  +base = U32.add(Layout.pane_y(is_mobile), offset)
  page_text.for(menu_id, snapshot, x, base, image)

def control_border(+snapshot: Types.Snapshot, +control: Types.Control) -> U32:
  +active = Types.control_active(control)
  +edge = theme_edge(theme(snapshot))
  Bool.pick(U32, active, gold(), edge)

def control_fill(+snapshot: Types.Snapshot, +control: Types.Control) -> U32:
  +theme_id = theme(snapshot)
  Bool.pick(U32, Types.control_enabled(control),
    theme_button(theme_id, Types.control_active(control)),
    button_disabled())

def control_text(snapshot: Types.Snapshot, control: Types.Control) -> U32:
  Bool.pick(U32, Types.control_enabled(control), ink(), disabled_ink())

def display_fixed(+mobile: Bool, +id: U32) -> String:
  match mobile:
    case False{}:
      match id:
        case 33: "B-RIFT"
        case 34: "C-RIFT"
        case _: Layout.label(id)
    case True{}:
      match id:
        case 1: "SET"
        case 2: "NEW"
        case 7: "END"
        case 8: "ACPT"
        case 9: "DECL"
        case 10: "GO"
        case 11: "FWD"
        case 12: "OVHD"
        case 20: "OUT"
        case 21: "IN"
        case 22: "STAR"
        case 24: "SFX"
        case 30: "HOT"
        case 33: "B"
        case 34: "C"
        case 35: "ASK"
        case 40: "BISH"
        case 41: "KN"
        case 42: "OK"
        case 49: "WHITE"
        case 50: "BLACK"
        case 51: "WHITE"
        case 52: "BLACK"
        case 43: "RECOV"
        case 44: "ORIG"
        case _: Layout.label(id)

def display_label(+mobile: Bool, +id: U32, +label: String) -> String:
  Bool.pick(String, U32.is_ge(id, 1000),
    Bool.pick(String, String.contains(label, "-"), String.drop(label, 2n), label),
    display_fixed(mobile, id))

def control_scale(snapshot: Types.Snapshot, control: Types.Control) -> U32:
  2

def paint_control(+snapshot: Types.Snapshot, +control: Types.Control,
  +image: Image) -> Image:
  +bounds = Types.control_bounds(control)
  +x = Types.rect_x(bounds)
  +y = Types.rect_y(bounds)
  +w = Types.rect_width(bounds)
  +h = Types.rect_height(bounds)
  +panel = Canvas.frame(x, y, w, h, control_border(snapshot, control),
    control_fill(snapshot, control), image)
  +label = display_label(mobile(snapshot), Types.control_id(control), Types.control_label(control))
  Font.draw(label, U32.add(x, 6), U32.add(y, 9), control_scale(snapshot, control),
    control_text(snapshot, control), panel)

def paint_controls.go(+controls: List<&2, Types.Control>,
  +snapshot: Types.Snapshot, +image: Image) -> Image:
  match controls:
    case Nil{}:
      image
    case +h <> t:
      +painted = paint_control(snapshot, h, image)
      paint_controls.go(t, snapshot, painted)

def paint_controls(+snapshot: Types.Snapshot, +image: Image) -> Image:
  paint_controls.go(Layout.controls(snapshot), snapshot, image)

def chrome(+snapshot: Types.Snapshot) -> Image:
  +is_mobile = mobile(snapshot)
  +base = Canvas.solid(theme_bg(theme(snapshot)))
  +shell = draw_shell(is_mobile, theme(snapshot), base)
  +title = Font.draw("RIFT CHESS", 16, 5, 2, ink(), shell)
  +text = headings(snapshot, title)
  +pages = page_text(snapshot, text)
  paint_controls(snapshot, pages)

def hover_copy.for(+hovered: U32, +selected: U32) -> String:
  Bool.pick(String, U32.is_lt(hovered, 64),
    String.append("FOCUS ", Layout.square_name(hovered)),
    Bool.pick(String, U32.is_lt(selected, 64),
      String.append("SELECTED ", Layout.square_name(selected)), "FOCUS BOARD"))

def hover_copy(+snapshot: Types.Snapshot) -> String:
  +frame = Types.snapshot_frame(snapshot)
  hover_copy.for(Types.frame_hovered(frame), Types.frame_selected(frame))

def compose(+snapshot: Types.Snapshot, +board: Image, +chrome_image: Image) -> Image:
  +r = Layout.board_rect(mobile(snapshot))
  +embedded = Canvas.embed(board, 9n, Types.rect_x(r), Types.rect_y(r), chrome_image)
  +footer_y = U32.add(Types.rect_y(r), 518)
  Font.draw(hover_copy(snapshot), U32.add(Types.rect_x(r), 8), footer_y, 2, cyan(), embedded)

def render(+snapshot: Types.Snapshot, +board: Image) -> Image:
  compose(snapshot, board, chrome(snapshot))
