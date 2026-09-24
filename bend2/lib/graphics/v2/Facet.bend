# Scalable projected convex quads with quarter-sample edge coverage.
# F32 projection is presentation-only; no cross-target bit equality claimed.
# Bounds are conservative, so untouched Image quadrants remain shared.
import Base
import ../Quad.bend as Quad
import ./Shapes.bend as Shapes

def covered(q: Quad.Shape, x: F32, y: F32) -> Bool:
  Bool.not(Quad.outside(q, x, y, 0.0))

def coverage(+q: Quad.Shape, +x: F32, +y: F32) -> U32:
  U32.add(U32.add(Shapes.bit(covered(q, F32.add(x, 0.25), F32.add(y, 0.25))),
    Shapes.bit(covered(q, F32.add(x, 0.75), F32.add(y, 0.25)))),
    U32.add(Shapes.bit(covered(q, F32.add(x, 0.25), F32.add(y, 0.75))),
      Shapes.bit(covered(q, F32.add(x, 0.75), F32.add(y, 0.75)))))

# Quad.outside/inside expect a square's minimum point and span. A subtree's
# quarter samples range from pixel origin +.25 to its far pixel +.75; testing
# only integer pixel origins drops thin faces inside the last pixel. Extending
# over the full pixel square is conservative at both F32 boundaries.
def outside_pixels(+q: Quad.Shape, +x: F32, +y: F32, +size: U32) -> Bool:
  Quad.outside(q, x, y, U32.to_f32(size))

def inside_pixels(+q: Quad.Shape, +x: F32, +y: F32, +size: U32) -> Bool:
  Quad.inside(q, x, y, U32.to_f32(size))

def tree(+depth: Nat, +size: U32, excluded: Bool, full: Bool,
  +x: F32, +y: F32, +q: Quad.Shape, +color: U32, +opacity: U32,
  image: Image) -> Image:
  match depth excluded full:
    case 0n True{} _: image
    case 0n False{} _:
      Shapes.paint_leaf(coverage(q, x, y), opacity, color, image)
    case 1n+rest True{} _: image
    case 1n+rest False{} True{}:
      Shapes.full_disk(depth, opacity, color, image)
    case 1n+rest False{} False{}:
      match image:
        case Pix{+background}:
          +half = U32.div(size, 2)
          +delta = U32.to_f32(half)
          +xx = F32.add(x, delta)
          +yy = F32.add(y, delta)
          a b c d = tree(rest, half, outside_pixels(q, x, y, half), inside_pixels(q, x, y, half), x, y, q, color, opacity, Pix{background})
            tree(rest, half, outside_pixels(q, xx, y, half), inside_pixels(q, xx, y, half), xx, y, q, color, opacity, Pix{background})
            tree(rest, half, outside_pixels(q, x, yy, half), inside_pixels(q, x, yy, half), x, yy, q, color, opacity, Pix{background})
            tree(rest, half, outside_pixels(q, xx, yy, half), inside_pixels(q, xx, yy, half), xx, yy, q, color, opacity, Pix{background})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.div(size, 2)
          +delta = U32.to_f32(half)
          +xx = F32.add(x, delta)
          +yy = F32.add(y, delta)
          a b c d = tree(rest, half, outside_pixels(q, x, y, half), inside_pixels(q, x, y, half), x, y, q, color, opacity, tl)
            tree(rest, half, outside_pixels(q, xx, y, half), inside_pixels(q, xx, y, half), xx, y, q, color, opacity, tr)
            tree(rest, half, outside_pixels(q, x, yy, half), inside_pixels(q, x, yy, half), x, yy, q, color, opacity, bl)
            tree(rest, half, outside_pixels(q, xx, yy, half), inside_pixels(q, xx, yy, half), xx, yy, q, color, opacity, br)
          Qua{a, b, c, d}

def draw_valid(valid: Bool, +depth: Nat, +size: U32, +q: Quad.Shape,
  color: U32, opacity: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      tree(depth, size, outside_pixels(q, 0.0, 0.0, size),
        inside_pixels(q, 0.0, 0.0, size),
        0.0, 0.0, q, color, opacity, image)

def draw(+depth: Nat, +size: U32, +q: Quad.Shape,
  color: U32, +opacity: U32, image: Image) -> Image:
  match q:
    case Quad.Shape{ab, bc, cd, da, area}:
      draw_valid(Bool.and((area > 0.1 : F32), U32.is_ne(opacity, 0)),
        depth, size, q, color, opacity, image)
