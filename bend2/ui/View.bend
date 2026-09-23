# Pixel UI composition for the Bend game.  The board is supplied by Scene and
# is embedded only after this module paints the surrounding chrome, so menus
# never cover board pixels.
import Base
import ./Types.bend as Types
import ./Layout.bend as Layout
import ../core/Model.bend as Model
import ../graphics/Scene.bend as Scene
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

def note_fill() -> U32:
  1509919

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

# All drawn text is upper case: the pinned font draws 'g' and 'q' alike.
def text(words: String, x: U32, y: U32, scale: U32, color: U32, image: Image) -> Image:
  Font.draw(String.to_upper(words), x, y, scale, color, image)

# Portrait buttons are narrower, so some labels are abbreviated.
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
        case 44: "ORIG"
        case 53: "MOVES"
        case 54: "TILES"
        case 55: "LOG"
        case _: Layout.label(id)

def display_label(+mobile: Bool, +id: U32, label: String) -> String:
  Bool.pick(String, U32.is_ge(id, 1000), label, display_fixed(mobile, id))

def text_if(show: Bool, words: String, x: U32, y: U32, color: U32, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: text(words, x, y, 2, color, image)

def menu(snapshot: Types.Snapshot) -> U32:
  Types.panels_menu(Types.snapshot_panels(snapshot))

def theme(snapshot: Types.Snapshot) -> U32:
  Types.preferences_theme(Types.snapshot_preferences(snapshot))

def mobile(snapshot: Types.Snapshot) -> Bool:
  Types.snapshot_mobile(snapshot)

def pane_height(+mobile: Bool) -> U32:
  U32.sub(Layout.height(mobile), U32.add(Layout.pane_y(mobile), 12))

def pane_bottom(+mobile: Bool) -> U32:
  U32.add(Layout.pane_y(mobile), pane_height(mobile))

def text_x(+mobile: Bool) -> U32:
  U32.add(Layout.pane_x(mobile), 14)

def text_width(+mobile: Bool) -> U32:
  U32.sub(Layout.pane_width(mobile), 28)

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

def side_word(side: Bool) -> String:
  Bool.pick(String, side, "WHITE", "BLACK")

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
      String.append(side_word(Types.meta_turn(meta)),
        Bool.pick(String, Types.meta_inCheck(meta), " TO MOVE - CHECK", " TO MOVE"))

def state_text(+meta: Types.Meta) -> String:
  state_text.for(Types.meta_outcome(meta), meta)

def bot_status(+meta: Types.Meta, +human_white: Bool) -> String:
  +bot_turn = Bool.xor(Types.meta_turn(meta), human_white)
  +live = Bool.and(U32.is_zero(Types.meta_outcome(meta)), Bool.not(Types.meta_recovery(meta)))
  Bool.pick(String, Types.meta_botPaused(meta), " - BOT PAUSED",
    Bool.pick(String, Bool.and(bot_turn, live), " - BOT THINKING", " - LOCAL BOT"))

def mode_text.for(+mode: U32, +meta: Types.Meta) -> String:
  match mode:
    case 1: String.append("YOU ARE WHITE", bot_status(meta, True{}))
    case 2: String.append("YOU ARE BLACK", bot_status(meta, False{}))
    case _: "LOCAL HOTSEAT"

def mode_text(+snapshot: Types.Snapshot) -> String:
  mode_text.for(Types.preferences_mode(Types.snapshot_preferences(snapshot)), Types.snapshot_meta(snapshot))

def quiet_text.for(policy: U32, count: Nat) -> String:
  match policy:
    case 2: "QUIET DRAW OFF"
    case 1: String.append("QUIET ", String.append(Nat.show(count), "/100 - AUTO"))
    case _: String.append("QUIET ", String.append(Nat.show(count), "/100 - BY AGREEMENT"))

def quiet_text(+snapshot: Types.Snapshot) -> String:
  quiet_text.for(Types.preferences_policy(Types.snapshot_preferences(snapshot)),
    Model.pos_quiet(Scene.frame_position(Types.snapshot_frame(snapshot))))

def menu_title(+id: U32) -> String:
  match id:
    case 1: "NEW MATCH"
    case 2: "SETTINGS"
    case 3: "HELP"
    case 4: "PROMOTION"
    case 5: "RESIGN"
    case 6: "RECOVERY"
    case 7: "LEGAL MOVES"
    case 8: "UNDO REQUEST"
    case 9: "OFFER DRAW"
    case 10: "HISTORY"
    case _: "PLAY"

def offer_note(+offer: U32) -> String:
  match offer:
    case 1: "White offers a draw. Black may accept or decline."
    case 2: "Black offers a draw. White may accept or decline."
    case _: ""

# The notice, or the pending draw offer when there is no notice.
def status_note(+snapshot: Types.Snapshot) -> String:
  +notice = Types.panels_notice(Types.snapshot_panels(snapshot))
  Bool.pick(String, String.is_empty(notice), offer_note(Types.meta_offer(Types.snapshot_meta(snapshot))), notice)

def headings(+snapshot: Types.Snapshot, +image: Image) -> Image:
  +is_mobile = mobile(snapshot)
  +x = text_x(is_mobile)
  +y = U32.add(Layout.pane_y(is_mobile), 10)
  +title_scale = Bool.pick(U32, is_mobile, 3, 2)
  +state_y = Bool.pick(U32, is_mobile, U32.add(y, 26), U32.add(y, 20))
  +mode_y = Bool.pick(U32, is_mobile, U32.add(y, 50), U32.add(y, 40))
  +quiet_y = Bool.pick(U32, is_mobile, U32.add(y, 68), U32.add(y, 58))
  +a = text(menu_title(menu(snapshot)), x, y, title_scale, cyan(), image)
  +b = text(state_text(Types.snapshot_meta(snapshot)), x, state_y, title_scale, ink(), a)
  +c = text(mode_text(snapshot), x, mode_y, 2, muted(), b)
  text(quiet_text(snapshot), x, quiet_y, 2, muted(), c)

# Wrapped paragraphs flow down the pane and stop at `limit`.
type Written is Data:
  Written{y: U32, image: Image}

def write_lines(lines: List<&2, String>, +x: U32, +y: U32, +limit: U32, +color: U32, image: Image) -> Written:
  match lines:
    case Nil{}: Written{y, image}
    case h <> t:
      write_lines(t, x, U32.add(y, 18), limit, color, text_if(U32.is_le(U32.add(y, 14), limit), h, x, y, color, image))

def spaced(w: Written) -> Written:
  match w:
    case Written{y, image}: Written{U32.add(y, 6), image}

def write(w: Written, words: String, +x: U32, +width: U32, +limit: U32, +color: U32) -> Written:
  match w:
    case Written{y, image}: spaced(write_lines(Font.wrap(String.to_upper(words), width, 2), x, y, limit, color, image))

def written_image(w: Written) -> Image:
  match w:
    case Written{_, image}: image

def resign_page_copy(+page: U32) -> String:
  match page:
    case 1: "White will resign. Confirm to end the match."
    case 2: "Black will resign. Confirm to end the match."
    case _: "Choose the side that resigns, then confirm."

def sound_line(+preferences: Types.Preferences) -> String:
  String.append(Bool.pick(String, Types.preferences_sound(preferences), "Sound on", "Sound off"),
    String.append(", volume ", String.append(U32.show(Types.preferences_volume(preferences)), "%.")))

def switch_line(+label: String, on: Bool, detail: String) -> String:
  String.append(label, String.append(Bool.pick(String, on, " on - ", " off - "), detail))

def history_count(+snapshot: Types.Snapshot) -> U32:
  U32.from_nat(List.length(&2, String, Types.snapshot_history(snapshot)))

def history_line(show: Bool, +index: U32, entry: String, x: U32, y: U32, color: U32, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: text(String.append(U32.show(U32.add(index, 1)), String.append(". ", entry)), x, y, 2, color, image)

# Draws entries [start, start + count) of the history, one per line.
def history_lines(entries: List<&2, String>, +index: U32, +start: U32, +count: U32,
  +x: U32, +y: U32, +limit: U32, image: Image) -> Image:
  match entries:
    case Nil{}: image
    case h <> t:
      +row = U32.sub(index, start)
      +line_y = U32.add(y, U32.mul(row, 20))
      +show = Bool.and(Bool.and(U32.is_ge(index, start), U32.is_lt(row, count)), U32.is_le(U32.add(line_y, 14), limit))
      history_lines(t, U32.add(index, 1), start, count, x, y, limit, history_line(show, index, h, x, line_y, muted(), image))

def history_page(+snapshot: Types.Snapshot, +x: U32, +top: U32, +limit: U32, image: Image) -> Image:
  +total = history_count(snapshot)
  +start = U32.mul(Types.panels_page(Types.snapshot_panels(snapshot)), 10)
  +last = U32.min(total, U32.add(start, 10))
  +title = Bool.pick(String, U32.is_zero(total), "No moves yet.", String.append("Moves ", String.append(U32.show(U32.add(start, 1)), String.append("-", String.append(U32.show(last), String.append(" of ", U32.show(total)))))))
  +titled = text(title, x, top, 2, cyan(), image)
  history_lines(Types.snapshot_history(snapshot), 0, start, 10, x, U32.add(top, 22), limit, titled)

# Desktop only: the latest actions under the play controls.
def recent_moves(show: Bool, +snapshot: Types.Snapshot, +x: U32, +top: U32, +limit: U32, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}:
      +total = history_count(snapshot)
      +titled = text("Recent", x, top, 2, cyan(), image)
      history_lines(Types.snapshot_history(snapshot), 0, U32.sub(U32.max(total, 6), 6), 6, x, U32.add(top, 22), limit, titled)

def help_page(+x: U32, +top: U32, +width: U32, +limit: U32, image: Image) -> Image:
  +a = write(Written{top, image}, "Each turn, move one piece or Shift one tile into an adjacent hole.", x, width, limit, ink())
  +b = write(a, "Move: click your piece, then its square, or drag the piece there.", x, width, limit, muted())
  +c = write(b, "Shift: click an empty square of a tile marked with arrows, then the hole. To Shift a tile carrying your piece, select the piece and press SHIFT.", x, width, limit, muted())
  +d = write(c, "Orbit: right-drag or Alt-drag. Zoom: mouse wheel.", x, width, limit, muted())
  +e = write(d, "Keys: arrows focus, Enter selects, Esc clears, S Shift, U undo.", x, width, limit, muted())
  written_image(write(e, "Settings: TARGETS marks legal destinations; SHIFTS marks legal Shifts.", x, width, limit, muted()))

def settings_page(+snapshot: Types.Snapshot, +x: U32, +top: U32, +width: U32, +limit: U32, image: Image) -> Image:
  +p = Types.snapshot_preferences(snapshot)
  +is_mobile = mobile(snapshot)
  +a = write(Written{top, image}, sound_line(p), x, width, limit, gold())
  +b = write(a, switch_line(display_fixed(is_mobile, 53), Types.preferences_showMoves(p), "legal destinations."), x, width, limit, muted())
  +c = write(b, switch_line(display_fixed(is_mobile, 54), Types.preferences_showShifts(p), "legal Shift arrows."), x, width, limit, muted())
  written_image(write(c, "EXPORT saves this match record; IMPORT loads one.", x, width, limit, muted()))

def undo_page_copy(+page: U32) -> String:
  Bool.pick(String, U32.is_eq(page, 1), "Black may AGREE to undo, or CLOSE to refuse.", "White may AGREE to undo, or CLOSE to refuse.")

def page_text.for(+menu_id: U32, +snapshot: Types.Snapshot, +x: U32, +top: U32, +width: U32, +limit: U32, image: Image) -> Image:
  match menu_id:
    case 0: recent_moves(Bool.not(mobile(snapshot)), snapshot, x, top, limit, image)
    case 1: written_image(write(Written{top, image}, "Mode, layout and quiet-draw policy apply to the new match. START replaces the current game; EXPORT it first to keep it.", x, width, limit, muted()))
    case 2: settings_page(snapshot, x, top, width, limit, image)
    case 3: help_page(x, top, width, limit, image)
    case 4: written_image(write(Written{top, image}, "Choose the piece the pawn becomes.", x, width, limit, ink()))
    case 5: written_image(write(Written{top, image}, resign_page_copy(Types.panels_page(Types.snapshot_panels(snapshot))), x, width, limit, gold()))
    case 6:
      +a = write(Written{top, image}, "Invalid or incomplete record.", x, width, limit, danger())
      written_image(write(a, "RECOV downloads the original text; NEW MATCH starts over.", x, width, limit, gold()))
    case 8: written_image(write(Written{top, image}, undo_page_copy(Types.panels_page(Types.snapshot_panels(snapshot))), x, width, limit, ink()))
    case 9:
      +a = write(Written{top, image}, "Choose who is offering the draw.", x, width, limit, ink())
      written_image(write(a, "Either side may offer, even off-turn.", x, width, limit, muted()))
    case 10: history_page(snapshot, x, top, limit, image)
    case _: image

def controls_bottom(controls: List<&2, Types.Control>, +acc: U32) -> U32:
  match controls:
    case Nil{}: acc
    case h <> t:
      +r = Types.control_bounds(h)
      controls_bottom(t, U32.max(acc, U32.add(Types.rect_y(r), Types.rect_height(r))))

def note_lines(+snapshot: Types.Snapshot) -> List<&2, String>:
  +note = status_note(snapshot)
  Bool.pick(List<&2, String>, String.is_empty(note), [], Font.wrap(String.to_upper(note), U32.sub(text_width(mobile(snapshot)), 4), 2))

def note_height(+count: U32) -> U32:
  Bool.pick(U32, U32.is_zero(count), 0, U32.add(U32.mul(U32.min(count, 4), 18), 10))

def note_frame(show: Bool, +mobile: Bool, +top: U32, +height: U32, image: Image) -> Image:
  match show:
    case False{}: image
    case True{}: Canvas.frame(U32.add(Layout.pane_x(mobile), 8), top, U32.sub(Layout.pane_width(mobile), 16), height, gold(), note_fill(), image)

# The notice box sits at the bottom of the pane; page text stops above it.
def notice_box(+mobile: Bool, lines: List<&2, String>, +height: U32, image: Image) -> Image:
  +top = U32.sub(U32.sub(pane_bottom(mobile), 8), height)
  +boxed = note_frame(U32.is_ne(height, 0), mobile, top, height, image)
  written_image(write_lines(lines, text_x(mobile), U32.add(top, 7), U32.sub(pane_bottom(mobile), 8), gold(), boxed))

def control_border(+snapshot: Types.Snapshot, +control: Types.Control) -> U32:
  Bool.pick(U32, Types.control_active(control), gold(), theme_edge(theme(snapshot)))

def control_fill(+snapshot: Types.Snapshot, +control: Types.Control) -> U32:
  Bool.pick(U32, Types.control_enabled(control),
    theme_button(theme(snapshot), Types.control_active(control)),
    button_disabled())

def control_text(control: Types.Control) -> U32:
  Bool.pick(U32, Types.control_enabled(control), ink(), disabled_ink())

def paint_control(+snapshot: Types.Snapshot, +control: Types.Control, image: Image) -> Image:
  +bounds = Types.control_bounds(control)
  +x = Types.rect_x(bounds)
  +y = Types.rect_y(bounds)
  +w = Types.rect_width(bounds)
  +h = Types.rect_height(bounds)
  +panel = Canvas.frame(x, y, w, h, control_border(snapshot, control), control_fill(snapshot, control), image)
  +label = display_label(mobile(snapshot), Types.control_id(control), Types.control_label(control))
  +label_x = U32.add(x, U32.div(U32.sub(w, U32.min(w, Font.width(label, 2))), 2))
  text(label, label_x, U32.add(y, U32.div(U32.sub(h, 14), 2)), 2, control_text(control), panel)

def paint_controls(controls: List<&2, Types.Control>, +snapshot: Types.Snapshot, image: Image) -> Image:
  match controls:
    case Nil{}: image
    case h <> t: paint_controls(t, snapshot, paint_control(snapshot, h, image))

def chrome(+snapshot: Types.Snapshot, +controls: List<&2, Types.Control>) -> Image:
  +is_mobile = mobile(snapshot)
  +base = Canvas.solid(theme_bg(theme(snapshot)))
  +shell = draw_shell(is_mobile, theme(snapshot), base)
  +title = text("RIFT CHESS", 16, 5, 2, ink(), shell)
  +headed = headings(snapshot, title)
  +lines = note_lines(snapshot)
  +note = note_height(U32.from_nat(List.length(&2, String, lines)))
  +limit = U32.sub(U32.sub(pane_bottom(is_mobile), 16), note)
  +top = U32.add(controls_bottom(controls, U32.add(Layout.pane_y(is_mobile), 80)), 16)
  +paged = page_text.for(menu(snapshot), snapshot, text_x(is_mobile), top, text_width(is_mobile), limit, headed)
  paint_controls(controls, snapshot, notice_box(is_mobile, lines, note, paged))

def hover_copy.for(+hovered: U32, +selected: U32, +tile: U32) -> String:
  Bool.pick(String, U32.is_lt(hovered, 64),
    String.append("FOCUS ", Layout.square_name(hovered)),
    Bool.pick(String, U32.is_lt(selected, 64),
      String.append("SELECTED ", Layout.square_name(selected)),
      Bool.pick(String, U32.is_lt(tile, 16), String.append("SELECTED TILE ", Layout.tile_name(tile)), "FOCUS BOARD")))

def hover_copy(+snapshot: Types.Snapshot) -> String:
  +frame = Types.snapshot_frame(snapshot)
  hover_copy.for(Scene.frame_hovered(frame), Scene.frame_selected(frame), Scene.frame_tile(frame))

def compose(+snapshot: Types.Snapshot, board: Image, chrome_image: Image) -> Image:
  +r = Layout.board_rect(mobile(snapshot))
  +embedded = Canvas.embed(board, 9n, Types.rect_x(r), Types.rect_y(r), chrome_image)
  text(hover_copy(snapshot), U32.add(Types.rect_x(r), 8), U32.add(Types.rect_y(r), 518), 2, cyan(), embedded)
