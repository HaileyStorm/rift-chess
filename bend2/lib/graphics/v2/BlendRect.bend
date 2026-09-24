# Clipped half-open rectangle with one source-over operation per touched pixel.
# Used by antialiased font rows and reusable translucency panels.
import Base
import ./Shapes.bend as Shapes

def outside(+x: U32, +y: U32, +size: U32, +left: U32, +top: U32,
  +right: U32, +bottom: U32) -> Bool:
  Bool.or(Bool.or(U32.is_ge(x, right), U32.is_le(U32.add(x, size), left)),
    Bool.or(U32.is_ge(y, bottom), U32.is_le(U32.add(y, size), top)))

def inside(+x: U32, +y: U32, +size: U32, +left: U32, +top: U32,
  +right: U32, +bottom: U32) -> Bool:
  Bool.and(Bool.and(U32.is_le(left, x), U32.is_le(U32.add(x, size), right)),
    Bool.and(U32.is_le(top, y), U32.is_le(U32.add(y, size), bottom)))

def tree(+depth: Nat, +size: U32, excluded: Bool, full: Bool,
  +x: U32, +y: U32, +left: U32, +top: U32,
  +right: U32, +bottom: U32, +color: U32, +opacity: U32,
  image: Image) -> Image:
  match depth excluded full:
    case 0n True{} _: image
    case 0n False{} _: Shapes.paint_leaf(4, opacity, color, image)
    case 1n+rest True{} _: image
    case 1n+rest False{} True{}: Shapes.full_disk(depth, opacity, color, image)
    case 1n+rest False{} False{}:
      match image:
        case Pix{+background}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, half, outside(x, y, half, left, top, right, bottom), inside(x, y, half, left, top, right, bottom), x, y, left, top, right, bottom, color, opacity, Pix{background})
            tree(rest, half, outside(xx, y, half, left, top, right, bottom), inside(xx, y, half, left, top, right, bottom), xx, y, left, top, right, bottom, color, opacity, Pix{background})
            tree(rest, half, outside(x, yy, half, left, top, right, bottom), inside(x, yy, half, left, top, right, bottom), x, yy, left, top, right, bottom, color, opacity, Pix{background})
            tree(rest, half, outside(xx, yy, half, left, top, right, bottom), inside(xx, yy, half, left, top, right, bottom), xx, yy, left, top, right, bottom, color, opacity, Pix{background})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, half, outside(x, y, half, left, top, right, bottom), inside(x, y, half, left, top, right, bottom), x, y, left, top, right, bottom, color, opacity, tl)
            tree(rest, half, outside(xx, y, half, left, top, right, bottom), inside(xx, y, half, left, top, right, bottom), xx, y, left, top, right, bottom, color, opacity, tr)
            tree(rest, half, outside(x, yy, half, left, top, right, bottom), inside(x, yy, half, left, top, right, bottom), x, yy, left, top, right, bottom, color, opacity, bl)
            tree(rest, half, outside(xx, yy, half, left, top, right, bottom), inside(xx, yy, half, left, top, right, bottom), xx, yy, left, top, right, bottom, color, opacity, br)
          Qua{a, b, c, d}

def fill_valid(valid: Bool, +depth: Nat, +size: U32, +left: U32, +top: U32,
  +right: U32, +bottom: U32, +color: U32, +opacity: U32,
  image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      tree(depth, size, outside(0, 0, size, left, top, right, bottom),
        inside(0, 0, size, left, top, right, bottom), 0, 0, left, top,
        right, bottom, color, opacity, image)

def fill(+depth: Nat, +size: U32, +left: U32, +top: U32,
  +right: U32, +bottom: U32, +color: U32, +opacity: U32,
  image: Image) -> Image:
  fill_valid(Bool.and(Bool.and(U32.is_lt(left, right), U32.is_lt(top, bottom)),
    U32.is_ne(opacity, 0)), depth, size, left, top, right, bottom,
    color, opacity, image)
