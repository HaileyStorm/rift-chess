# Bend-owned control plan and Snapshot-to-Presentation adapter.
# This module contains no image/raster dependency so controllers can compile it
# independently from ChromeRaster.
# Integration seam:
#   plan(snapshot, controls) -> Plan at the standard logical desktop/portrait tier
#   plan_for(snapshot, controls, Viewport{w,h,scale,boardDepth}) -> explicit tier
#   controls(plan) -> canonical Types.Control values with the exact painted bounds
#   hit(plan,x,y) -> matching enabled control id
#   presentation(snapshot) -> ChromeData.Presentation for ChromeRaster
import Base
import ../Types.bend as Types
import ../../core/Model.bend as Model
import ../../graphics/Scene.bend as Scene
import ./ChromePlan.bend as ChromePlan
import ./ChromeData.bend as ChromeData

def to_plan_controls.go(controls: List<&2, Types.Control>) -> List<&2, ChromePlan.Control>:
  match controls:
    case Nil{}: []
    case +head <> tail:
      +bounds = Types.control_bounds(head)
      +rest = to_plan_controls.go(tail)
      ChromePlan.Control{Types.control_id(head), Types.control_label(head),
        ChromePlan.Rect{Types.rect_x(bounds), Types.rect_y(bounds),
          Types.rect_width(bounds), Types.rect_height(bounds)},
        Types.control_enabled(head), Types.control_active(head)} <> rest

def from_plan_controls.go(controls: List<&2, ChromePlan.Control>) -> List<&2, Types.Control>:
  match controls:
    case Nil{}: []
    case +head <> tail:
      +bounds = ChromePlan.control_bounds(head)
      +rest = from_plan_controls.go(tail)
      Types.Control{ChromePlan.control_id(head), ChromePlan.control_label(head),
        Types.Rect{ChromePlan.rect_x(bounds), ChromePlan.rect_y(bounds),
          ChromePlan.rect_width(bounds), ChromePlan.rect_height(bounds)},
        ChromePlan.control_enabled(head), ChromePlan.control_active(head)} <> rest

def plan_for(+snapshot: Types.Snapshot, controls: List<&2, Types.Control>,
  +viewport: ChromePlan.Viewport) -> ChromePlan.Plan:
  +menu = Types.panels_menu(Types.snapshot_panels(snapshot))
  ChromePlan.plan_for(menu, to_plan_controls.go(controls), viewport)

def plan(+snapshot: Types.Snapshot, controls: List<&2, Types.Control>) -> ChromePlan.Plan:
  +mobile = Types.snapshot_mobile(snapshot)
  +viewport = Bool.pick(ChromePlan.Viewport, mobile,
    ChromePlan.Viewport{512, 1024, 1, 9n}, ChromePlan.Viewport{1024, 640, 1, 9n})
  plan_for(snapshot, controls, viewport)

def plan_width(plan: ChromePlan.Plan) -> U32:
  ChromePlan.plan_width(plan)

def plan_height(plan: ChromePlan.Plan) -> U32:
  ChromePlan.plan_height(plan)

def plan_scale(plan: ChromePlan.Plan) -> U32:
  ChromePlan.plan_scale(plan)

def plan_board_depth(plan: ChromePlan.Plan) -> Nat:
  ChromePlan.plan_board_depth(plan)

def plan_mobile(plan: ChromePlan.Plan) -> Bool:
  ChromePlan.plan_mobile(plan)

def rect_for_plan(+r: ChromePlan.Rect) -> Types.Rect:
  Types.Rect{ChromePlan.rect_x(r), ChromePlan.rect_y(r),
    ChromePlan.rect_width(r), ChromePlan.rect_height(r)}

def plan_stage(plan: ChromePlan.Plan) -> Types.Rect:
  rect_for_plan(ChromePlan.plan_stage(plan))

def plan_board(plan: ChromePlan.Plan) -> Types.Rect:
  rect_for_plan(ChromePlan.plan_board(plan))

def controls(plan: ChromePlan.Plan) -> List<&2, Types.Control>:
  from_plan_controls.go(ChromePlan.plan_controls(plan))

def hit(plan: ChromePlan.Plan, +x: U32, +y: U32) -> U32:
  ChromePlan.hit(plan, x, y)

def square_name(+square: U32) -> String:
  String.append(Char.show(Char.from_u32(U32.add(97, Model.file_of(square)))),
    U32.show(U32.add(Model.rank_of(square), 1)))

def tile_name(+tile: U32) -> String:
  String.append(Char.show(Char.from_u32(U32.add(65, U32.mod(tile, 4)))),
    U32.show(U32.add(U32.div(tile, 4), 1)))

def result_text.for(outcome: U32, +meta: Types.Meta) -> String:
  match outcome:
    case 1: "White wins"
    case 2: "Black wins"
    case 3: "Stalemate"
    case 4: "Draw bare kings"
    case 5: "Draw repetition"
    case 6: "Draw quiet moves"
    case 7: "Draw agreed"
    case 8: "Black resigned"
    case 9: "White resigned"
    case _:
      String.append(Bool.pick(String, Types.meta_turn(meta), "White", "Black"),
        Bool.pick(String, Types.meta_inCheck(meta), " to move check", " to move"))

def result_text(+meta: Types.Meta) -> String:
  result_text.for(Types.meta_outcome(meta), meta)

def match_mode.for(mode: U32) -> String:
  match mode:
    case 1: "Local you are White"
    case 2: "Local you are Black"
    case _: "Local hotseat"

def match_mode(+preferences: Types.Preferences) -> String:
  match_mode.for(Types.preferences_mode(preferences))

def piece_word.for(kind: U32) -> String:
  match kind:
    case 1: "Pawn"
    case 2: "Knight"
    case 3: "Bishop"
    case 4: "Rook"
    case 5: "Queen"
    case 6: "King"
    case 7: "Pawn"
    case _: "Piece"

def selected_text.for(has_selected: Bool, has_tile: Bool, +selected: U32,
  +tile: U32, +piece: U32) -> String:
  match has_selected has_tile:
    case True{} _:
      String.append(String.append(Bool.pick(String, Model.is_white(piece), "White ", "Black "),
        piece_word.for(Model.piece_type(piece))), String.append(" ", square_name(selected)))
    case False{} True{}:
      String.append("Selected tile ", tile_name(tile))
    case False{} False{}:
      "Select a piece or an open tile"

def selected_text(+snapshot: Types.Snapshot) -> String:
  +frame = Types.snapshot_frame(snapshot)
  +position = Scene.frame_position(frame)
  +selected = Scene.frame_selected(frame)
  +tile = Scene.frame_tile(frame)
  +piece = Model.board_get(Model.pos_board(position), selected)
  selected_text.for(U32.is_lt(selected, 64), U32.is_lt(tile, 16),
    selected, tile, piece)

def selection_hint.for(has_selected: Bool, has_tile: Bool) -> String:
  match has_selected has_tile:
    case True{} _: "Move and Shift choices"
    case False{} True{}: "Shift options"
    case False{} False{}:
      "Move or Shift choose a source"

def selection_hint(+snapshot: Types.Snapshot) -> String:
  +frame = Types.snapshot_frame(snapshot)
  selection_hint.for(U32.is_lt(Scene.frame_selected(frame), 64),
    U32.is_lt(Scene.frame_tile(frame), 16))

def presentation(+snapshot: Types.Snapshot) -> ChromeData.Presentation:
  +preferences = Types.snapshot_preferences(snapshot)
  +meta = Types.snapshot_meta(snapshot)
  +panels = Types.snapshot_panels(snapshot)
  ChromeData.Presentation{Types.preferences_theme(preferences), Types.panels_menu(panels),
    result_text(meta), match_mode(preferences), selected_text(snapshot),
    selection_hint(snapshot), Types.snapshot_history(snapshot),
    Types.panels_page(panels), Types.preferences_sound(preferences)}

