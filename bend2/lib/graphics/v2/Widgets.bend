# Composable pixels-first UI primitives. All geometry and typography stay in Bend.
import Base
import ../Canvas.bend as Canvas
import ./AtlasText.bend as AtlasText
import ./Rounded.bend as Rounded
import ./Shapes.bend as Shapes

def panel(+depth: Nat, +size: U32, +x: U32, +y: U32, +width: U32, +height: U32,
  +radius: U32, +face: U32, +border: U32, image: Image) -> Image:
  +shadow = Rounded.draw(depth, size, Shapes.Pos{U32.add(x, 4)}, Shapes.Pos{U32.add(y, 8)},
    Shapes.Pos{U32.add(x, U32.add(width, 4))}, Shapes.Pos{U32.add(y, U32.add(height, 8))},
    radius, 198419, 175, image)
  +rim = Rounded.draw(depth, size, Shapes.Pos{x}, Shapes.Pos{y},
    Shapes.Pos{U32.add(x, width)}, Shapes.Pos{U32.add(y, height)}, radius,
    border, 255, shadow)
  Rounded.draw(depth, size, Shapes.Pos{U32.add(x, 2)}, Shapes.Pos{U32.add(y, 2)},
    Shapes.Pos{U32.sub(U32.add(x, width), 2)},
    Shapes.Pos{U32.sub(U32.add(y, height), 2)}, U32.sub(radius, 2), face, 255, rim)

def label(+depth: Nat, +text: String, +x: U32, +y: U32, +scale: U32,
  +ink: U32, +shadow: U32, image: Image) -> Image:
  +size = U32.shln(1, depth)
  +font_scale = U32.min(4, U32.max(1, U32.div(U32.add(scale, 1), 2)))
  AtlasText.draw(depth, size, text, x, y, font_scale, ink, image)

def chip(+depth: Nat, +size: U32, text: String, +x: U32, +y: U32,
  +width: U32, +height: U32, +scale: U32, +face: U32,
  +rim: U32, +ink: U32, image: Image) -> Image:
  +pill = panel(depth, size, x, y, width, height, U32.div(height, 2), face, rim, image)
  label(depth, text, U32.add(x, U32.mul(scale, 5)),
    U32.add(y, U32.div(U32.sub(height, U32.mul(scale, 7)), 2)),
    scale, ink, 329999, pill)

def rule(+depth: Nat, +x: U32, +y: U32, +width: U32,
  +highlight: U32, image: Image) -> Image:
  +dark = Canvas.rect_at(depth, x, y, width, 2, 1055787, image)
  Canvas.rect_at(depth, x, y, U32.div(width, 3), 1, highlight, dark)
