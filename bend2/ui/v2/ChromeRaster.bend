# Raster boundary for the Rift Observatory. This module has no game-rule imports.
import Base
import ./ChromePlan.bend as ChromePlan
import ./ChromePaint.bend as ChromePaint
import ./ChromeData.bend as ChromeData

def shell(+depth: Nat, +size: U32, +theme: U32,
  +plan: ChromePlan.Plan) -> Image:
  ChromePaint.shell(depth, size, theme, plan)

def overlay(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +plan: ChromePlan.Plan, shell_image: Image) -> Image:
  ChromePaint.overlay(depth, size, data, plan, shell_image)

def chrome_only(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +plan: ChromePlan.Plan) -> Image:
  ChromePaint.chrome_only(depth, size, data, plan)

def compose(+depth: Nat, +boardDepth: Nat, +plan: ChromePlan.Plan,
  board_image: Image, chrome_image: Image) -> Image:
  ChromePaint.compose(depth, boardDepth, plan, board_image, chrome_image)

def render(+depth: Nat, +size: U32, +data: ChromeData.Presentation,
  +plan: ChromePlan.Plan, board_image: Image) -> Image:
  ChromePaint.render(depth, size, data, plan, board_image)
