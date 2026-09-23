# Deterministic 1024-square UI geometry and the accessibility/control model.
# The board always occupies a 512-square rectangle; every other control lives
# in the top bar or the pane beside/below it.
import Base
import ../core/Model.bend as Model
import ../graphics/Camera.bend as Camera
import ../graphics/Scene.bend as Scene
import ./Types.bend as Types

def width(mobile: Bool) -> U32:
  Bool.pick(U32, mobile, 512, 1024)

def height(mobile: Bool) -> U32:
  Bool.pick(U32, mobile, 1024, 800)

def board_rect(mobile: Bool) -> Types.Rect:
  Bool.pick(Types.Rect, mobile, Types.Rect{0, 64, 512, 512},
    Types.Rect{0, 128, 512, 512})

def pane_x(mobile: Bool) -> U32:
  Bool.pick(U32, mobile, 16, 560)

def pane_y(mobile: Bool) -> U32:
  Bool.pick(U32, mobile, 608, 128)

def pane_width(mobile: Bool) -> U32:
  Bool.pick(U32, mobile, 480, 440)

def top_x(+mobile: Bool, slot: U32) -> U32:
  +gap = Bool.pick(U32, mobile, 8, 6)
  +button = Bool.pick(U32, mobile, 148, 132)
  U32.add(U32.add(pane_x(mobile), U32.mul(slot, U32.add(button, gap))), 0)

def top_rect(+mobile: Bool, slot: U32) -> Types.Rect:
  +button = Bool.pick(U32, mobile, 148, 132)
  +y = Bool.pick(U32, mobile, 20, 28)
  +height = Bool.pick(U32, mobile, 40, 36)
  Types.Rect{top_x(mobile, slot), y, button, height}

def grid_columns(mobile: Bool) -> U32:
  Bool.pick(U32, mobile, 6, 4)

def grid_gap(mobile: Bool) -> U32:
  Bool.pick(U32, mobile, 4, 8)

# Buttons sit inside the pane frame, clear of its border.
def grid_inset() -> U32:
  8

def grid_width(+mobile: Bool) -> U32:
  +columns = grid_columns(mobile)
  +gaps = U32.mul(U32.sub(columns, 1), grid_gap(mobile))
  U32.div(U32.sub(U32.sub(pane_width(mobile), U32.mul(2, grid_inset())), gaps), columns)

def grid_height(mobile: Bool) -> U32:
  Bool.pick(U32, mobile, 48, 32)

def grid_step(+mobile: Bool) -> U32:
  U32.add(grid_height(mobile), grid_gap(mobile))

def grid_offset(mobile: Bool) -> U32:
  Bool.pick(U32, mobile, 108, 96)

def grid_rect(+mobile: Bool, +ordinal: U32, offset: U32) -> Types.Rect:
  +gap = grid_gap(mobile)
  +button = grid_width(mobile)
  +columns = grid_columns(mobile)
  +column = U32.mod(ordinal, columns)
  +row = U32.div(ordinal, columns)
  +x = U32.add(U32.add(pane_x(mobile), grid_inset()), U32.mul(column, U32.add(button, gap)))
  +y = U32.add(U32.add(pane_y(mobile), offset), U32.mul(row, grid_step(mobile)))
  Types.Rect{x, y, button, grid_height(mobile)}

def in_rect(+x: U32, +y: U32, +r: Types.Rect) -> Bool:
  +inside_x = Bool.and(U32.is_ge(x, Types.rect_x(r)),
    U32.is_lt(x, U32.add(Types.rect_x(r), Types.rect_width(r))))
  +inside_y = Bool.and(U32.is_ge(y, Types.rect_y(r)),
    U32.is_lt(y, U32.add(Types.rect_y(r), Types.rect_height(r))))
  Bool.and(inside_x, inside_y)

def square_name(+square: U32) -> String:
  String.append(Char.show(Char.from_u32(U32.add(97, Model.file_of(square)))),
    U32.show(U32.add(Model.rank_of(square), 1)))

# Tile positions A1..D4 (rules §1): the letter is the macro file.
def tile_name(+tile: U32) -> String:
  String.append(Char.show(Char.from_u32(U32.add(65, U32.mod(tile, 4)))),
    U32.show(U32.add(U32.div(tile, 4), 1)))

# "Can Shift" means at least one fully legal destination (rules §3).
def shift_source(ids: List<&2, U32>, +macro: U32) -> Bool:
  match ids:
    case Nil{}:
      False{}
    case +h <> t:
      Bool.or(Bool.and(U32.is_ge(h, 20480), U32.is_eq(Model.action_from(Model.decode_shift(h)), macro)),
        shift_source(t, macro))

def history_last_page(+count: U32) -> U32:
  U32.div(U32.sub(U32.max(count, 1), 1), 10)

def destination_group(id: U32) -> U32:
  U32.div(id, 5)

def group_seen(+groups: List<&2, U32>, +group: U32) -> Bool:
  match groups:
    case Nil{}:
      False{}
    case +h <> t:
      Bool.or(U32.is_eq(h, group), group_seen(t, group))

def selected_action(action: Model.Action, +selected: U32, +tile: U32) -> Bool:
  match action:
    case Model.MoveAction{from, to, promotion}:
      Bool.and(U32.is_lt(selected, 64), U32.is_eq(from, selected))
    case Model.ShiftAction{from, to, promotion}:
      Bool.and(U32.is_lt(tile, 16), U32.is_eq(from, tile))

def action_label(action: Model.Action, selected: U32, tile: U32) -> String:
  match action:
    case Model.MoveAction{from, to, promotion}:
      square_name(to)
    case Model.ShiftAction{from, to, promotion}:
      String.append("TO ", tile_name(to))

def action_for.decoded(decoded: Maybe<Model.Action>) -> Model.Action:
  match decoded:
    case None{}:
      Model.MoveAction{64, 64, 0}
    case Some{action}:
      action

def action_for(+id: U32) -> Model.Action:
  action_for.decoded(Model.decode(id))

def human_turn.for(+mode: U32, +turn: Bool) -> Bool:
  match mode turn:
    case 0 _: True{}
    case 1 True{}: True{}
    case 2 False{}: True{}
    case _ _: False{}

def human_turn(meta: Types.Meta, preferences: Types.Preferences) -> Bool:
  human_turn.for(Types.preferences_mode(preferences), Types.meta_turn(meta))

def live(+snapshot: Types.Snapshot) -> Bool:
  +meta = Types.snapshot_meta(snapshot)
  +busy = Bool.or(Types.snapshot_staged(snapshot),
    Bool.or(Types.snapshot_moving(snapshot), Types.snapshot_checking(snapshot)))
  Bool.and(Bool.and(U32.is_zero(Types.meta_outcome(meta)),
      Bool.not(Types.meta_recovery(meta))), Bool.not(busy))

def destination_enabled(+snapshot: Types.Snapshot) -> Bool:
  Bool.and(live(snapshot), human_turn(Types.snapshot_meta(snapshot), Types.snapshot_preferences(snapshot)))

# Destination buttons follow the overlay preferences (rules §10); the board
# itself accepts every legal action either way.
def offered.go(ids: List<&2, U32>, +moves: Bool, +shifts: Bool) -> List<&2, U32>:
  match ids:
    case Nil{}:
      Nil{}
    case +h <> t:
      +keep = Bool.pick(Bool, U32.is_lt(h, 20480), moves, shifts)
      +rest = offered.go(t, moves, shifts)
      Bool.pick(List<&2, U32>, keep, h <> rest, rest)

def offered(+snapshot: Types.Snapshot) -> List<&2, U32>:
  +preferences = Types.snapshot_preferences(snapshot)
  offered.go(Types.snapshot_legal(snapshot), Types.preferences_showMoves(preferences),
    Types.preferences_showShifts(preferences))

def destination_controls.prepend(keep: Bool, action: Model.Action, +id: U32,
  +selected: U32, +tile: U32, +ordinal: U32, +mobile: Bool,
  +offset: U32, +snapshot: Types.Snapshot, +rest: List<&2, Types.Control>) ->
  List<&2, Types.Control>:
  match keep:
    case False{}:
      rest
    case True{}:
      Types.Control{U32.add(1000, id), action_label(action, selected, tile),
        grid_rect(mobile, ordinal, offset), destination_enabled(snapshot), False{}} <> rest

def destination_count.go(ids: List<&2, U32>, +selected: U32, +tile: U32,
  +groups: List<&2, U32>, count: U32) -> U32:
  match ids:
    case Nil{}:
      count
    case +h <> t:
      +action = action_for(h)
      +candidate = selected_action(action, selected, tile)
      +group = destination_group(h)
      +fresh = Bool.not(group_seen(groups, group))
      +keep = Bool.and(candidate, fresh)
      +next_groups = Bool.pick(List<&2, U32>, keep, group <> groups, groups)
      +next_count = U32.add(count, Bool.to_u32(keep))
      destination_count.go(t, selected, tile, next_groups, next_count)

def destination_count(+snapshot: Types.Snapshot) -> U32:
  +frame = Types.snapshot_frame(snapshot)
  destination_count.go(offered(snapshot), Scene.frame_selected(frame),
    Scene.frame_tile(frame), Nil{}, 0)

def destination_overflow.for(+mobile: Bool, +count: U32) -> Bool:
  U32.is_gt(count, Bool.pick(U32, mobile, 6, 12))

def destination_overflow(+snapshot: Types.Snapshot) -> Bool:
  destination_overflow.for(Types.snapshot_mobile(snapshot), destination_count(snapshot))

def destination_controls.go(ids: List<&2, U32>, +selected: U32, +tile: U32,
  +groups: List<&2, U32>, +ordinal: U32, +mobile: Bool,
  +offset: U32, +snapshot: Types.Snapshot) -> List<&2, Types.Control>:
  match ids:
    case Nil{}:
      Nil{}
    case +h <> t:
      +action = action_for(h)
      +candidate = selected_action(action, selected, tile)
      +group = destination_group(h)
      +fresh = Bool.not(group_seen(groups, group))
      +keep = Bool.and(candidate, fresh)
      +next_groups = Bool.pick(List<&2, U32>, keep, group <> groups, groups)
      +next_ordinal = U32.add(ordinal, Bool.to_u32(keep))
      +rest = destination_controls.go(t, selected, tile, next_groups,
        next_ordinal, mobile, offset, snapshot)
      destination_controls.prepend(keep, action, h, selected, tile, ordinal,
        mobile, offset, snapshot, rest)

def destination_controls.at(+snapshot: Types.Snapshot, +offset: U32,
  +ordinal: U32) -> List<&2, Types.Control>:
  +frame = Types.snapshot_frame(snapshot)
  destination_controls.go(offered(snapshot), Scene.frame_selected(frame),
    Scene.frame_tile(frame), Nil{}, ordinal, Types.snapshot_mobile(snapshot),
    offset, snapshot)

def destination_controls(+snapshot: Types.Snapshot) -> List<&2, Types.Control>:
  destination_controls.at(snapshot, grid_offset(Types.snapshot_mobile(snapshot)), 0)

def mode(snapshot: Types.Snapshot) -> U32:
  Types.preferences_mode(Types.snapshot_preferences(snapshot))

def label(+id: U32) -> String:
  match id:
    case 1: "SETTINGS"
    case 2: "NEW MATCH"
    case 3: "UNDO"
    case 4: "CLEAR"
    case 5: "SHIFT"
    case 6: "DRAW"
    case 7: "RESIGN"
    case 8: "ACCEPT"
    case 9: "DECLINE"
    case 10: "RESUME"
    case 11: "FRONT"
    case 12: "OVERHEAD"
    case 13: "LEFT"
    case 14: "RIGHT"
    case 15: "UP"
    case 16: "DOWN"
    case 17: "ZOOM+"
    case 18: "ZOOM-"
    case 19: "RESET"
    case 20: "EXPORT"
    case 21: "IMPORT"
    case 22: "ASTRAL"
    case 23: "WARM"
    case 24: "SOUND"
    case 25: "VOL+"
    case 26: "VOL-"
    case 27: "HELP"
    case 28: "CLOSE"
    case 29: "START"
    case 30: "HOTSEAT"
    case 31: "WHITE"
    case 32: "BLACK"
    case 33: "LAYOUT B"
    case 34: "LAYOUT C"
    case 35: "PROMPT"
    case 36: "AUTO"
    case 37: "OFF"
    case 38: "QUEEN"
    case 39: "ROOK"
    case 40: "BISHOP"
    case 41: "KNIGHT"
    case 42: "CONFIRM"
    case 43: "RECOV"
    case 44: "ORIGINAL"
    case 45: "PREV"
    case 46: "NEXT"
    case 47: "MOVES"
    case 48: "AGREE"
    case 49: "WHITE"
    case 50: "BLACK"
    case 51: "WHITE"
    case 52: "BLACK"
    case 53: "TARGETS"
    case 54: "SHIFTS"
    case 55: "HISTORY"
    case _: "ACTION"

def enabled_for(+id: U32, +meta: Types.Meta, is_live: Bool,
  can_play: Bool, has_selection: Bool, can_shift: Bool, can_prev: Bool,
  can_next: Bool, not_moving: Bool, dynamic: Bool, can_control: Bool,
  white_actor: Bool, black_actor: Bool, can_confirm_resign: Bool) -> Bool:
  match id:
    case 1: True{}
    case 2: True{}
    case 27: True{}
    case 3: Bool.and(not_moving, Bool.and(Bool.not(Types.meta_recovery(meta)), Types.meta_canUndo(meta)))
    case 4: Bool.and(can_play, has_selection)
    case 5: Bool.and(can_play, can_shift)
    case 6: Bool.and(can_control, U32.is_zero(Types.meta_offer(meta)))
    case 7: can_control
    case 8: Bool.and(can_play, U32.is_ne(Types.meta_offer(meta), 0))
    case 9: Bool.and(can_play, U32.is_ne(Types.meta_offer(meta), 0))
    case 10: Bool.and(is_live, Types.meta_botPaused(meta))
    case 11: True{}
    case 12: True{}
    case 13: True{}
    case 14: True{}
    case 15: True{}
    case 16: True{}
    case 17: True{}
    case 18: True{}
    case 19: True{}
    case 20: Bool.not(Types.meta_recovery(meta))
    case 21: True{}
    case 22: True{}
    case 23: True{}
    case 24: True{}
    case 25: True{}
    case 26: True{}
    case 28: True{}
    case 29: True{}
    case 30: True{}
    case 31: True{}
    case 32: True{}
    case 33: True{}
    case 34: True{}
    case 35: True{}
    case 36: True{}
    case 37: True{}
    case 38: can_play
    case 39: can_play
    case 40: can_play
    case 41: can_play
    case 42: can_confirm_resign
    case 43: Types.meta_recovery(meta)
    case 44: True{}
    case 45: can_prev
    case 46: can_next
    case 47: is_live
    case 48: False{}
    case 49: Bool.and(can_control, white_actor)
    case 50: Bool.and(can_control, black_actor)
    case 51: Bool.and(can_control, white_actor)
    case 52: Bool.and(can_control, black_actor)
    case 53: True{}
    case 54: True{}
    case 55: True{}
    case _: Bool.and(dynamic, can_play)

def resign_actor_allowed(+page: U32, white_actor: Bool, black_actor: Bool) -> Bool:
  match page:
    case 1: white_actor
    case 2: black_actor
    case _: False{}

def undo_agree_enabled(+snapshot: Types.Snapshot) -> Bool:
  +meta = Types.snapshot_meta(snapshot)
  +panels = Types.snapshot_panels(snapshot)
  +preferences = Types.snapshot_preferences(snapshot)
  +requester_white = U32.is_eq(Types.panels_page(panels), 1)
  +other_turn = Bool.xor(requester_white, Types.meta_turn(meta))
  Bool.and(Bool.and(Bool.and(U32.is_eq(Types.panels_menu(panels), 8),
      U32.is_zero(Types.preferences_mode(preferences))), Types.meta_canUndo(meta)),
    Bool.and(other_turn, Bool.not(Bool.or(Types.snapshot_moving(snapshot),
      Types.snapshot_checking(snapshot)))))

def enabled(+id: U32, +snapshot: Types.Snapshot, dynamic: Bool) -> Bool:
  +meta = Types.snapshot_meta(snapshot)
  +preferences = Types.snapshot_preferences(snapshot)
  +is_live = live(snapshot)
  +can_play = Bool.and(is_live, human_turn(meta, preferences))
  +frame = Types.snapshot_frame(snapshot)
  +selected = Scene.frame_selected(frame)
  +has_selection = Bool.or(U32.is_lt(selected, 64), U32.is_lt(Scene.frame_tile(frame), 16))
  +can_shift = Bool.and(U32.is_lt(selected, 64),
    shift_source(Types.snapshot_legal(snapshot), Model.macro_of(selected)))
  +not_moving = Bool.not(Bool.or(Types.snapshot_moving(snapshot), Types.snapshot_checking(snapshot)))
  +mode = Types.preferences_mode(preferences)
  +can_control = Bool.and(Bool.and(is_live, not_moving), U32.is_lt(Types.meta_revision(meta), 20000))
  +white_actor = Bool.or(U32.is_zero(mode), U32.is_eq(mode, 1))
  +black_actor = Bool.or(U32.is_zero(mode), U32.is_eq(mode, 2))
  +panels = Types.snapshot_panels(snapshot)
  +page = Types.panels_page(panels)
  +last_page = history_last_page(U32.from_nat(List.length(&2, String, Types.snapshot_history(snapshot))))
  +can_confirm_resign = Bool.and(Bool.and(can_control, U32.is_eq(Types.panels_menu(panels), 5)),
    resign_actor_allowed(page, white_actor, black_actor))
  +base = enabled_for(id, meta, is_live, can_play, has_selection, can_shift,
    U32.is_gt(page, 0), U32.is_lt(page, last_page), not_moving, dynamic,
    can_control, white_actor, black_actor, can_confirm_resign)
  Bool.pick(Bool, U32.is_eq(id, 48), undo_agree_enabled(snapshot), base)

def is_front_view(view: Camera.View) -> Bool:
  match view:
    case Camera.View{yaw, pitch, zoom}:
      Bool.and(U32.is_zero(yaw), U32.is_eq(pitch, 65))

def is_overhead_view(view: Camera.View) -> Bool:
  match view:
    case Camera.View{yaw, pitch, zoom}:
      U32.is_eq(pitch, 90)

def active_for(+id: U32, +preferences: Types.Preferences, +panels: Types.Panels,
  +view: Camera.View) -> Bool:
  match id:
    case 22: U32.is_zero(Types.preferences_theme(preferences))
    case 23: U32.is_eq(Types.preferences_theme(preferences), 1)
    case 24: Types.preferences_sound(preferences)
    case 30: U32.is_eq(Types.panels_draftMode(panels), 0)
    case 31: U32.is_eq(Types.panels_draftMode(panels), 1)
    case 32: U32.is_eq(Types.panels_draftMode(panels), 2)
    case 33: Types.panels_draftLayout(panels)
    case 34: Bool.not(Types.panels_draftLayout(panels))
    case 35: U32.is_zero(Types.panels_draftPolicy(panels))
    case 36: U32.is_eq(Types.panels_draftPolicy(panels), 1)
    case 37: U32.is_eq(Types.panels_draftPolicy(panels), 2)
    case 51: Bool.and(U32.is_eq(Types.panels_menu(panels), 5), U32.is_eq(Types.panels_page(panels), 1))
    case 52: Bool.and(U32.is_eq(Types.panels_menu(panels), 5), U32.is_eq(Types.panels_page(panels), 2))
    case 53: Types.preferences_showMoves(preferences)
    case 54: Types.preferences_showShifts(preferences)
    case 11: is_front_view(view)
    case 12: is_overhead_view(view)
    case _: False{}

def active(+id: U32, +snapshot: Types.Snapshot) -> Bool:
  +preferences = Types.snapshot_preferences(snapshot)
  +panels = Types.snapshot_panels(snapshot)
  +view = Scene.frame_view(Types.snapshot_frame(snapshot))
  active_for(id, preferences, panels, view)

def control(+id: U32, bounds: Types.Rect, +snapshot: Types.Snapshot,
  dynamic: Bool) -> Types.Control:
  Types.Control{id, label(id), bounds, enabled(id, snapshot, dynamic), active(id, snapshot)}

def top_controls.go(+ids: List<&2, U32>, +slot: U32, +mobile: Bool,
  +snapshot: Types.Snapshot) -> List<&2, Types.Control>:
  match ids:
    case Nil{}:
      Nil{}
    case +h <> t:
      control(h, top_rect(mobile, slot), snapshot, False{}) <>
        top_controls.go(t, U32.add(slot, 1), mobile, snapshot)

def top_controls(+snapshot: Types.Snapshot) -> List<&2, Types.Control>:
  +mobile = Types.snapshot_mobile(snapshot)
  top_controls.go([1, 2, 27], 0, mobile, snapshot)

def play_ids() -> List<&2, U32>:
  [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 55]

def play_ids.for(+mobile: Bool, +has_destinations: Bool) -> List<&2, U32>:
  match mobile has_destinations:
    case True{} True{}:
      [3, 4, 5]
    case _ _:
      play_ids()

def play_ids.overflow(+mobile: Bool) -> List<&2, U32>:
  match mobile:
    case True{}:
      [3, 4, 5, 47]
    case False{}:
      List.append(&2, U32, play_ids(), [47])

def menu_ids(menu: U32, mode: U32) -> List<&2, U32>:
  match menu:
    case 1: [28, 29, 30, 31, 32, 33, 34, 35, 36, 37]
    case 2: [28, 22, 23, 24, 25, 26, 53, 54, 20, 21]
    case 3: [28, 44]
    case 4: [28, 38, 39, 40, 41]
    case 5: Bool.pick(List<&2, U32>, U32.is_zero(mode), [51, 52, 42, 28], [42, 28])
    case 6: [28, 43, 44]
    case 9: Bool.pick(List<&2, U32>, U32.is_zero(mode), [49, 50, 28], [])
    case 8: [28, 48]
    case 10: [28, 45, 46]
    case _: []

def static_controls.go(+ids: List<&2, U32>, +ordinal: U32, +offset: U32,
  +mobile: Bool, +snapshot: Types.Snapshot) -> List<&2, Types.Control>:
  match ids:
    case Nil{}:
      Nil{}
    case h <> t:
      control(h, grid_rect(mobile, ordinal, offset), snapshot, False{}) <>
        static_controls.go(t, U32.add(ordinal, 1), offset, mobile, snapshot)

def static_controls(ids: List<&2, U32>, offset: U32,
  +snapshot: Types.Snapshot) -> List<&2, Types.Control>:
  static_controls.go(ids, 0, offset, Types.snapshot_mobile(snapshot), snapshot)

def legal_menu_controls(+snapshot: Types.Snapshot) -> List<&2, Types.Control>:
  +mobile = Types.snapshot_mobile(snapshot)
  +close = static_controls([28], grid_offset(mobile), snapshot)
  +moves = destination_controls.at(snapshot, grid_offset(mobile), 1)
  List.append(&2, Types.Control, close, moves)

def play_menu_controls(+overflow: Bool, +destinations: List<&2, Types.Control>,
  +mobile: Bool, +count: U32, +offset: U32,
  +snapshot: Types.Snapshot) -> List<&2, Types.Control>:
  match overflow:
    case True{}:
      static_controls(play_ids.overflow(mobile), grid_offset(mobile), snapshot)
    case False{}:
      List.append(&2, Types.Control, destinations,
        static_controls(play_ids.for(mobile, U32.is_ne(count, 0)), offset, snapshot))

def menu_controls.for(+menu: U32, +snapshot: Types.Snapshot) -> List<&2, Types.Control>:
  match menu:
    case 0:
      +destinations = destination_controls(snapshot)
      +mobile = Types.snapshot_mobile(snapshot)
      +count = destination_count(snapshot)
      +overflow = destination_overflow.for(mobile, count)
      +offset = U32.add(grid_offset(mobile), U32.mul(
        U32.div(U32.add(count, U32.sub(grid_columns(mobile), 1)), grid_columns(mobile)),
        grid_step(mobile)))
      play_menu_controls(overflow, destinations, mobile, count, offset, snapshot)
    case 7:
      legal_menu_controls(snapshot)
    case _:
      static_controls(menu_ids(menu, mode(snapshot)), grid_offset(Types.snapshot_mobile(snapshot)), snapshot)

def menu_controls(+snapshot: Types.Snapshot) -> List<&2, Types.Control>:
  menu_controls.for(Types.panels_menu(Types.snapshot_panels(snapshot)), snapshot)

def controls(+snapshot: Types.Snapshot) -> List<&2, Types.Control>:
  List.append(&2, Types.Control, top_controls(snapshot), menu_controls(snapshot))

def hit_controls(+x: U32, +y: U32,
  controls: List<&2, Types.Control>) -> U32:
  match controls:
    case Nil{}:
      0
    case +h <> t:
      +inside = in_rect(x, y, Types.control_bounds(h))
      +enabled_control = Types.control_enabled(h)
      +hit = Bool.and(inside, enabled_control)
      Bool.pick(U32, hit, Types.control_id(h), hit_controls(x, y, t))

def hit(snapshot: Types.Snapshot, x: U32, y: U32) -> U32:
  hit_controls(x, y, controls(snapshot))
