# A generic projected quadrilateral with cast shadow, side faces and bevel.
# No grid size, mask, chess position or camera policy is built into the face.
# A caller supplies convex visible corners and an extrusion vector; F32
# rasterization remains presentation evidence rather than an integer theorem.
import Base
import ../Quad.bend as Quad
import ./Facet.bend as Facet
import ./Grain.bend as Grain

type Surface is Data:
  Surface{top: U32, side: U32, edge: U32, shadow: U32, glint: U32}

def point_x(p: Quad.Point) -> F32:
  match p:
    case Quad.Point{x, y}: x

def point_y(p: Quad.Point) -> F32:
  match p:
    case Quad.Point{x, y}: y

def offset(p: Quad.Point, dx: F32, dy: F32) -> Quad.Point:
  match p:
    case Quad.Point{x, y}:
      Quad.Point{F32.add(x, dx), F32.add(y, dy)}

def paint_corners(+depth: Nat, +size: U32, +p00: Quad.Point,
  +p10: Quad.Point, +p11: Quad.Point, +p01: Quad.Point,
  +extrude_x: F32, +extrude_y: F32, style: Surface,
  image: Image) -> Image:
  match style:
    case Surface{top, side, edge, +shadow, glint}:
      +shade = Facet.draw(depth, size,
        Quad.make(offset(p00, extrude_x, F32.add(extrude_y, 7.0)),
          offset(p10, extrude_x, F32.add(extrude_y, 7.0)),
          offset(p11, extrude_x, F32.add(extrude_y, 7.0)),
          offset(p01, extrude_x, F32.add(extrude_y, 7.0))),
        shadow, 92, image)
      +front = Facet.draw(depth, size,
        Quad.make(p01, p11, offset(p11, extrude_x, extrude_y),
          offset(p01, extrude_x, extrude_y)),
        side, 255, shade)
      +right = Facet.draw(depth, size,
        Quad.make(p10, p11, offset(p11, extrude_x, extrude_y),
          offset(p10, extrude_x, extrude_y)),
        shadow, 255, front)
      +face = Facet.draw(depth, size,
        Quad.make(p00, p10, p11, p01), top, 255, right)
      +lip = Facet.draw(depth, size,
        Quad.make(p00, p10, offset(p10, 0.0, 2.0), offset(p00, 0.0, 2.0)),
        edge, 148, face)
      Facet.draw(depth, size,
        Quad.make(p00, p01, Quad.Point{F32.add(point_x(p01), 2.0), point_y(p01)},
          Quad.Point{F32.add(point_x(p00), 2.0), point_y(p00)}),
        glint, 116, lip)

def draw_cell(visible: Bool, +depth: Nat, +size: U32,
  +p00: Quad.Point, +p10: Quad.Point, +p11: Quad.Point, +p01: Quad.Point,
  +extrude_x: F32, +extrude_y: F32, +style: Surface,
  image: Image) -> Image:
  match visible:
    case False{}: image
    case True{}:
      paint_corners(depth, size, p00, p10, p11, p01,
        extrude_x, extrude_y, style, image)

# Opt-in retained material: the top uses Grain's packed palette, while the
# old Surface supplies side, shadow, edge and glint. The Surface.top channel
# remains used by paint_corners/draw_cell; it is ignored on this path.
def paint_corners_grained(+depth: Nat, +size: U32, +p00: Quad.Point,
  +p10: Quad.Point, +p11: Quad.Point, +p01: Quad.Point,
  +extrude_x: F32, +extrude_y: F32, style: Surface,
  +grain: Grain.Palette, +seed: U32, +grain_size: U32,
  image: Image) -> Image:
  match style:
    case Surface{top, side, edge, +shadow, glint}:
      +shade = Facet.draw(depth, size,
        Quad.make(offset(p00, extrude_x, F32.add(extrude_y, 7.0)),
          offset(p10, extrude_x, F32.add(extrude_y, 7.0)),
          offset(p11, extrude_x, F32.add(extrude_y, 7.0)),
          offset(p01, extrude_x, F32.add(extrude_y, 7.0))),
        shadow, 92, image)
      +front = Facet.draw(depth, size,
        Quad.make(p01, p11, offset(p11, extrude_x, extrude_y),
          offset(p01, extrude_x, extrude_y)),
        side, 255, shade)
      +right = Facet.draw(depth, size,
        Quad.make(p10, p11, offset(p11, extrude_x, extrude_y),
          offset(p10, extrude_x, extrude_y)),
        shadow, 255, front)
      +face = Grain.draw(depth, size,
        Quad.make(p00, p10, p11, p01), grain, seed, grain_size, 255, right)
      +lip = Facet.draw(depth, size,
        Quad.make(p00, p10, offset(p10, 0.0, 2.0), offset(p00, 0.0, 2.0)),
        edge, 148, face)
      Facet.draw(depth, size,
        Quad.make(p00, p01, Quad.Point{F32.add(point_x(p01), 2.0), point_y(p01)},
          Quad.Point{F32.add(point_x(p00), 2.0), point_y(p00)}),
        glint, 116, lip)

def draw_cell_grained(visible: Bool, +depth: Nat, +size: U32,
  +p00: Quad.Point, +p10: Quad.Point, +p11: Quad.Point, +p01: Quad.Point,
  +extrude_x: F32, +extrude_y: F32, +style: Surface,
  +grain: Grain.Palette, +seed: U32, +grain_size: U32,
  image: Image) -> Image:
  match visible:
    case False{}: image
    case True{}:
      paint_corners_grained(depth, size, p00, p10, p11, p01,
        extrude_x, extrude_y, style, grain, seed, grain_size, image)
