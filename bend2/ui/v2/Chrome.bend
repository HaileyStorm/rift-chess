# Compatibility facade over the Bend model and raster boundaries.
import Base
import ../Types.bend as Types
import ./ChromePlan.bend as ChromePlan
import ./ChromeModel.bend as ChromeModel
import ./ChromeRaster.bend as ChromeRaster
import ./ChromeData.bend as ChromeData

def plan_for(+snapshot: Types.Snapshot, controls: List<&2, Types.Control>,
  +viewport: ChromePlan.Viewport) -> ChromePlan.Plan:
  ChromeModel.plan_for(snapshot, controls, viewport)

def plan(+snapshot: Types.Snapshot, controls: List<&2, Types.Control>) -> ChromePlan.Plan:
  ChromeModel.plan(snapshot, controls)

def plan_width(plan: ChromePlan.Plan) -> U32:
  ChromeModel.plan_width(plan)

def plan_height(plan: ChromePlan.Plan) -> U32:
  ChromeModel.plan_height(plan)

def plan_scale(plan: ChromePlan.Plan) -> U32:
  ChromeModel.plan_scale(plan)

def plan_board_depth(plan: ChromePlan.Plan) -> Nat:
  ChromeModel.plan_board_depth(plan)

def plan_mobile(plan: ChromePlan.Plan) -> Bool:
  ChromeModel.plan_mobile(plan)

def plan_stage(plan: ChromePlan.Plan) -> Types.Rect:
  ChromeModel.plan_stage(plan)

def plan_board(plan: ChromePlan.Plan) -> Types.Rect:
  ChromeModel.plan_board(plan)

def controls(plan: ChromePlan.Plan) -> List<&2, Types.Control>:
  ChromeModel.controls(plan)

def hit(plan: ChromePlan.Plan, +x: U32, +y: U32) -> U32:
  ChromeModel.hit(plan, x, y)

def rect_for_plan(+r: ChromePlan.Rect) -> Types.Rect:
  ChromeModel.rect_for_plan(r)

def square_name(+square: U32) -> String:
  ChromeModel.square_name(square)

def tile_name(+tile: U32) -> String:
  ChromeModel.tile_name(tile)

def result_text.for(outcome: U32, +meta: Types.Meta) -> String:
  ChromeModel.result_text.for(outcome, meta)

def result_text(+meta: Types.Meta) -> String:
  ChromeModel.result_text(meta)

def selected_text(+snapshot: Types.Snapshot) -> String:
  ChromeModel.selected_text(snapshot)

def selected_text.for(has_selected: Bool, has_tile: Bool, +selected: U32,
  +tile: U32, +piece: U32) -> String:
  ChromeModel.selected_text.for(has_selected, has_tile, selected, tile, piece)

def match_mode(+preferences: Types.Preferences) -> String:
  ChromeModel.match_mode(preferences)

def piece_word.for(kind: U32) -> String:
  ChromeModel.piece_word.for(kind)

def selection_hint(+snapshot: Types.Snapshot) -> String:
  ChromeModel.selection_hint(snapshot)

def selection_hint.for(has_selected: Bool, has_tile: Bool) -> String:
  ChromeModel.selection_hint.for(has_selected, has_tile)

def presentation(+snapshot: Types.Snapshot) -> ChromeData.Presentation:
  ChromeModel.presentation(snapshot)

def chrome_only(+depth: Nat, +size: U32, +snapshot: Types.Snapshot,
  +plan: ChromePlan.Plan) -> Image:
  ChromeRaster.chrome_only(depth, size, ChromeModel.presentation(snapshot), plan)

def compose(+depth: Nat, +boardDepth: Nat, +plan: ChromePlan.Plan,
  board_image: Image, chrome_image: Image) -> Image:
  ChromeRaster.compose(depth, boardDepth, plan, board_image, chrome_image)

def render(+depth: Nat, +size: U32, +snapshot: Types.Snapshot,
  +plan: ChromePlan.Plan, board_image: Image) -> Image:
  ChromeRaster.render(depth, size, ChromeModel.presentation(snapshot), plan, board_image)
