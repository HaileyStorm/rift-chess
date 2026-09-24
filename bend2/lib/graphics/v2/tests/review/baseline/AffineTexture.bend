# Object-anchored immutable Image sampling on a projected parallelogram.
# The source can be decoded RGA1 or any well-formed Image of valid depth.
# Pixel centers pick one nearest source texel; Facet quarters clip the edge.
# F32 projection/UV ties are finite evidence, not cross-target bit claims.
import Base
import ../Quad.bend as Quad
import ../pixels/Pixel.bend as Pixel
import ./Facet.bend as Facet
import ./Shapes.bend as Shapes

type Basis is Data:
  Basis{ux: F32, uy: F32, vx: F32, vy: F32, ox: F32, oy: F32}

type Index is Data:
  Index{u: U32, v: U32}

def point_x(point: Quad.Point) -> F32:
  match point:
    case Quad.Point{x, y}: x

def point_y(point: Quad.Point) -> F32:
  match point:
    case Quad.Point{x, y}: y

def valid_source_size(+source_size: U32) -> Bool:
  U32.is_ne(source_size, 0)

def texel_case(low: Bool, high: Bool, +value: F32, +source_size: U32) -> U32:
  match low high:
    case True{} _: 0
    case False{} True{}: U32.sub(source_size, 1)
    case False{} False{}: F32.to_u32(F32.mul(value, U32.to_f32(source_size)))

def texel(+value: F32, +source_size: U32) -> U32:
  texel_case(Bool.not(F32.is_gt(value, 0.0)),
    Bool.not(F32.is_lt(value, 1.0)), value, source_size)

def index_at(basis: Basis, +x: U32, +y: U32, +source_size: U32) -> Index:
  match basis:
    case Basis{ux, uy, vx, vy, ox, oy}:
      +dx = F32.sub(F32.add(U32.to_f32(x), 0.5), ox)
      +dy = F32.sub(F32.add(U32.to_f32(y), 0.5), oy)
      +u = F32.add(F32.mul(ux, dx), F32.mul(uy, dy))
      +v = F32.add(F32.mul(vx, dx), F32.mul(vy, dy))
      Index{texel(u, source_size), texel(v, source_size)}

def color_index(index: Index, +source: Image, +source_depth: Nat) -> U32:
  match index:
    case Index{u, v}: Pixel.sample_xy(source_depth, u, v, source)

def color_at(+basis: Basis, +x: U32, +y: U32,
  +source: Image, +source_depth: Nat, +source_size: U32) -> U32:
  color_index(index_at(basis, x, y, source_size), source, source_depth)

def same_index(a: Index, b: Index) -> Bool:
  match a b:
    case Index{au, av} Index{bu, bv}:
      Bool.and(U32.is_eq(au, bu), U32.is_eq(av, bv))

# Affine UV extrema over a pixel-center rectangle occur at its four corners.
# All four quantized corners equal => every center in this aligned subtree
# has that texel, outside F32 rounding ties covered by finite evidence.
def one_texel(+basis: Basis, +x: U32, +y: U32,
  +size: U32, +source_size: U32) -> Bool:
  +xx = U32.sub(U32.add(x, size), 1)
  +yy = U32.sub(U32.add(y, size), 1)
  +a = index_at(basis, x, y, source_size)
  +b = index_at(basis, xx, y, source_size)
  +c = index_at(basis, x, yy, source_size)
  +d = index_at(basis, xx, yy, source_size)
  Bool.and(Bool.and(same_index(a, b), same_index(a, c)),
    same_index(a, d))

def can_fill(inside: Bool, +basis: Basis, +x: U32, +y: U32,
  +size: U32, +source_size: U32) -> Bool:
  match inside:
    case False{}: False{}
    case True{}: one_texel(basis, x, y, size, source_size)

def tree(+depth: Nat, +size: U32, outside: Bool, fill: Bool,
  +x: U32, +y: U32, +q: Quad.Shape, +basis: Basis,
  +source: Image, +source_depth: Nat, +source_size: U32,
  +opacity: U32, image: Image) -> Image:
  match depth outside fill:
    case 0n True{} _: image
    case 0n False{} _:
      Shapes.paint_leaf(Facet.coverage(q, U32.to_f32(x), U32.to_f32(y)),
        opacity, color_at(basis, x, y, source, source_depth, source_size), image)
    case 1n+rest True{} _: image
    case 1n+rest False{} True{}:
      Shapes.full_disk(depth, opacity,
        color_at(basis, x, y, source, source_depth, source_size), image)
    case 1n+rest False{} False{}:
      match image:
        case Pix{+background}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(x), U32.to_f32(y), half),
              can_fill(Facet.inside_pixels(q, U32.to_f32(x), U32.to_f32(y), half),
                basis, x, y, half, source_size),
              x, y, q, basis, source, source_depth, source_size, opacity, Pix{background})
            tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(xx), U32.to_f32(y), half),
              can_fill(Facet.inside_pixels(q, U32.to_f32(xx), U32.to_f32(y), half),
                basis, xx, y, half, source_size),
              xx, y, q, basis, source, source_depth, source_size, opacity, Pix{background})
            tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(x), U32.to_f32(yy), half),
              can_fill(Facet.inside_pixels(q, U32.to_f32(x), U32.to_f32(yy), half),
                basis, x, yy, half, source_size),
              x, yy, q, basis, source, source_depth, source_size, opacity, Pix{background})
            tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(xx), U32.to_f32(yy), half),
              can_fill(Facet.inside_pixels(q, U32.to_f32(xx), U32.to_f32(yy), half),
                basis, xx, yy, half, source_size),
              xx, yy, q, basis, source, source_depth, source_size, opacity, Pix{background})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(x), U32.to_f32(y), half),
              can_fill(Facet.inside_pixels(q, U32.to_f32(x), U32.to_f32(y), half),
                basis, x, y, half, source_size),
              x, y, q, basis, source, source_depth, source_size, opacity, tl)
            tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(xx), U32.to_f32(y), half),
              can_fill(Facet.inside_pixels(q, U32.to_f32(xx), U32.to_f32(y), half),
                basis, xx, y, half, source_size),
              xx, y, q, basis, source, source_depth, source_size, opacity, tr)
            tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(x), U32.to_f32(yy), half),
              can_fill(Facet.inside_pixels(q, U32.to_f32(x), U32.to_f32(yy), half),
                basis, x, yy, half, source_size),
              x, yy, q, basis, source, source_depth, source_size, opacity, bl)
            tree(rest, half,
              Facet.outside_pixels(q, U32.to_f32(xx), U32.to_f32(yy), half),
              can_fill(Facet.inside_pixels(q, U32.to_f32(xx), U32.to_f32(yy), half),
                basis, xx, yy, half, source_size),
              xx, yy, q, basis, source, source_depth, source_size, opacity, br)
          Qua{a, b, c, d}

def draw_valid(valid: Bool, +depth: Nat, +size: U32, +q: Quad.Shape,
  +basis: Basis, +source: Image, +source_depth: Nat,
  +source_size: U32, +opacity: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      tree(depth, size,
        Facet.outside_pixels(q, 0.0, 0.0, size),
        can_fill(Facet.inside_pixels(q, 0.0, 0.0, size),
          basis, 0, 0, size, source_size),
        0, 0, q, basis, source, source_depth, source_size, opacity, image)

# Division/inverse work is reachable only with a nondegenerate basis.
def draw_basis(valid: Bool, +depth: Nat, +size: U32, +q: Quad.Shape,
  +x0: F32, +y0: F32, +du_x: F32, +du_y: F32,
  +dv_x: F32, +dv_y: F32, +det: F32,
  +source: Image, +source_depth: Nat, +source_size: U32,
  +opacity: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      +inverse = F32.div(1.0, det)
      +basis = {Basis{F32.mul(dv_y, inverse),
        F32.mul(F32.sub(0.0, dv_x), inverse),
        F32.mul(F32.sub(0.0, du_y), inverse),
        F32.mul(du_x, inverse), x0, y0} : Basis}
      draw_valid(True{}, depth, size, q, basis, source,
        source_depth, source_size, opacity, image)

def draw_shape(+q: Quad.Shape, +depth: Nat, +size: U32,
  +x0: F32, +y0: F32, +du_x: F32, +du_y: F32,
  +dv_x: F32, +dv_y: F32, +det: F32,
  +source: Image, +source_depth: Nat, +source_size: U32,
  +opacity: U32, image: Image) -> Image:
  match q:
    case Quad.Shape{ab, bc, cd, da, area}:
      draw_basis(Bool.and((F32.abs(det) > 0.1 : F32),
        (area > 0.1 : F32)), depth, size, q,
        x0, y0, du_x, du_y, dv_x, dv_y, det,
        source, source_depth, source_size, opacity, image)

def draw_geometry(+depth: Nat, +size: U32,
  +p00: Quad.Point, +p10: Quad.Point, +p01: Quad.Point,
  +source: Image, +source_depth: Nat, +source_size: U32,
  +opacity: U32, image: Image) -> Image:
  +x0 = point_x(p00)
  +y0 = point_y(p00)
  +du_x = F32.sub(point_x(p10), x0)
  +du_y = F32.sub(point_y(p10), y0)
  +dv_x = F32.sub(point_x(p01), x0)
  +dv_y = F32.sub(point_y(p01), y0)
  +det = F32.sub(F32.mul(du_x, dv_y), F32.mul(du_y, dv_x))
  +p11 = {Quad.Point{F32.add(x0, F32.add(du_x, dv_x)),
    F32.add(y0, F32.add(du_y, dv_y))} : Quad.Point}
  draw_shape(Quad.make(p00, p10, p11, p01), depth, size,
    x0, y0, du_x, du_y, dv_x, dv_y, det,
    source, source_depth, source_size, opacity, image)

def draw_config(valid: Bool, +depth: Nat, +size: U32,
  +p00: Quad.Point, +p10: Quad.Point, +p01: Quad.Point,
  +source: Image, +source_depth: Nat, +source_size: U32,
  +opacity: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      draw_geometry(depth, size, p00, p10, p01,
        source, source_depth, source_size, opacity, image)

def draw_zero(zero: Bool, +depth: Nat, +size: U32,
  +p00: Quad.Point, +p10: Quad.Point, +p01: Quad.Point,
  +source: Image, +source_depth: Nat, +source_size: U32,
  +opacity: U32, image: Image) -> Image:
  match zero:
    case True{}: image
    case False{}:
      draw_config(valid_source_size(source_size),
        depth, size, p00, p10, p01, source, source_depth, source_size,
        opacity, image)

def draw(+depth: Nat, +size: U32,
  +p00: Quad.Point, +p10: Quad.Point, +p01: Quad.Point,
  +source_depth: Nat, +source_size: U32, +source: Image,
  +opacity: U32, image: Image) -> Image:
  draw_zero(U32.is_zero(opacity), depth, size, p00, p10, p01,
    source, source_depth, source_size, opacity, image)
