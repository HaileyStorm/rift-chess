# Pure clipped half-open rectangles with explicit numeric cell sizes.
# Public fill requires size == 2^depth and non-wrapping U32 coordinates.
import Base

def cell_outside(+x: U32, +y: U32, +size: U32, left: U32, top: U32, right: U32, bottom: U32) -> Bool:
  Bool.or(Bool.or(U32.is_ge(x, right), U32.is_ge(left, U32.add(x, size))),
    Bool.or(U32.is_ge(y, bottom), U32.is_ge(top, U32.add(y, size))))

# The De Morgan form avoids allocating Bool.and trampolines per image node
# in the pinned JS compiler. The traversal consumes the partial flag directly.
def cell_partial(+x: U32, +y: U32, +size: U32, left: U32, top: U32, right: U32, bottom: U32) -> Bool:
  Bool.or(Bool.or(U32.is_gt(left, x), U32.is_gt(U32.add(x, size), right)),
    Bool.or(U32.is_gt(top, y), U32.is_gt(U32.add(y, size), bottom)))

def cell_inside(x: U32, y: U32, size: U32, left: U32, top: U32, right: U32, bottom: U32) -> Bool:
  Bool.not(cell_partial(x, y, size, left, top, right, bottom))

def tree(+depth: Nat, +size: U32, outside: Bool, partial: Bool, +x: U32, +y: U32,
  +left: U32, +top: U32, +right: U32, +bottom: U32, +color: U32, image: Image) -> Image:
  match depth outside partial:
    case 0n True{} _: image
    case 0n False{} _: Pix{color}
    case 1n+rest True{} _: image
    case 1n+rest False{} False{}: Pix{color}
    case 1n+rest False{} True{}:
      match image:
        case Pix{+base}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, half, cell_outside(x, y, half, left, top, right, bottom), cell_partial(x, y, half, left, top, right, bottom), x, y, left, top, right, bottom, color, Pix{base})
            tree(rest, half, cell_outside(xx, y, half, left, top, right, bottom), cell_partial(xx, y, half, left, top, right, bottom), xx, y, left, top, right, bottom, color, Pix{base})
            tree(rest, half, cell_outside(x, yy, half, left, top, right, bottom), cell_partial(x, yy, half, left, top, right, bottom), x, yy, left, top, right, bottom, color, Pix{base})
            tree(rest, half, cell_outside(xx, yy, half, left, top, right, bottom), cell_partial(xx, yy, half, left, top, right, bottom), xx, yy, left, top, right, bottom, color, Pix{base})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, half, cell_outside(x, y, half, left, top, right, bottom), cell_partial(x, y, half, left, top, right, bottom), x, y, left, top, right, bottom, color, tl)
            tree(rest, half, cell_outside(xx, y, half, left, top, right, bottom), cell_partial(xx, y, half, left, top, right, bottom), xx, y, left, top, right, bottom, color, tr)
            tree(rest, half, cell_outside(x, yy, half, left, top, right, bottom), cell_partial(x, yy, half, left, top, right, bottom), x, yy, left, top, right, bottom, color, bl)
            tree(rest, half, cell_outside(xx, yy, half, left, top, right, bottom), cell_partial(xx, yy, half, left, top, right, bottom), xx, yy, left, top, right, bottom, color, br)
          Qua{a, b, c, d}

def fill.valid(valid: Bool, +depth: Nat, +size: U32, +left: U32, +top: U32,
  +right: U32, +bottom: U32, color: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      tree(depth, size, cell_outside(0, 0, size, left, top, right, bottom),
        cell_partial(0, 0, size, left, top, right, bottom), 0, 0, left, top, right, bottom, color, image)

def fill(depth: Nat, size: U32, +left: U32, +top: U32, +right: U32, +bottom: U32,
  color: U32, image: Image) -> Image:
  fill.valid(Bool.and(U32.is_lt(left, right), U32.is_lt(top, bottom)), depth, size, left, top, right, bottom, color, image)

