# Rounded rectangles are a Minkowski sum of an inner rectangle and a disk.
# Rectangles and their corner masks share one exact quarter-sample predicate,
# so translucent overlaps are composited once per pixel, not repeatedly.
import Base
import ./Shapes.bend as Shapes

def gap_case(below: Bool, above: Bool,
  +lo: U32, +hi: U32, +inner_lo: U32, +inner_hi: U32) -> U32:
  match below above:
    case True{} _: U32.sub(inner_lo, hi)
    case False{} True{}: U32.sub(lo, inner_hi)
    case False{} False{}: 0

def gap(+lo: U32, +hi: U32, +inner_lo: U32, +inner_hi: U32) -> U32:
  gap_case(U32.is_lt(hi, inner_lo), U32.is_gt(lo, inner_hi),
    lo, hi, inner_lo, inner_hi)

def far(+lo: U32, +hi: U32, +inner_lo: U32, +inner_hi: U32) -> U32:
  U32.max(Shapes.near(inner_lo, inner_hi, lo),
    Shapes.near(inner_lo, inner_hi, hi))

def outside(+x: U32, +y: U32, +size: U32,
  +left: U32, +top: U32, +right: U32, +bottom: U32, +radius: U32) -> Bool:
  +edge = Bool.or(Bool.or(U32.is_ge(x, right), U32.is_le(U32.add(x, size), left)),
    Bool.or(U32.is_ge(y, bottom), U32.is_le(U32.add(y, size), top)))
  +lx = U32.add(U32.mul(x, 4), 1)
  +ly = U32.add(U32.mul(y, 4), 1)
  +hx = U32.add(U32.mul(U32.sub(U32.add(x, size), 1), 4), 3)
  +hy = U32.add(U32.mul(U32.sub(U32.add(y, size), 1), 4), 3)
  +dx = gap(lx, hx, U32.mul(U32.add(left, radius), 4), U32.mul(U32.sub(right, radius), 4))
  +dy = gap(ly, hy, U32.mul(U32.add(top, radius), 4), U32.mul(U32.sub(bottom, radius), 4))
  Bool.or(edge, U32.is_gt(U32.add(Shapes.square(dx), Shapes.square(dy)),
    Shapes.square(U32.mul(radius, 4))))

def inside(+x: U32, +y: U32, +size: U32,
  +left: U32, +top: U32, +right: U32, +bottom: U32, +radius: U32) -> Bool:
  +within = Bool.and(Bool.and(U32.is_le(left, x), U32.is_le(U32.add(x, size), right)),
    Bool.and(U32.is_le(top, y), U32.is_le(U32.add(y, size), bottom)))
  +lx = U32.add(U32.mul(x, 4), 1)
  +ly = U32.add(U32.mul(y, 4), 1)
  +hx = U32.add(U32.mul(U32.sub(U32.add(x, size), 1), 4), 3)
  +hy = U32.add(U32.mul(U32.sub(U32.add(y, size), 1), 4), 3)
  +dx = far(lx, hx, U32.mul(U32.add(left, radius), 4), U32.mul(U32.sub(right, radius), 4))
  +dy = far(ly, hy, U32.mul(U32.add(top, radius), 4), U32.mul(U32.sub(bottom, radius), 4))
  Bool.and(within, U32.is_le(U32.add(Shapes.square(dx), Shapes.square(dy)),
    Shapes.square(U32.mul(radius, 4))))

def covered(+xx: U32, +yy: U32, +left: U32, +top: U32,
  +right: U32, +bottom: U32, +radius: U32) -> Bool:
  +bounds = Bool.and(Bool.and(U32.is_ge(xx, U32.mul(left, 4)),
      U32.is_lt(xx, U32.mul(right, 4))),
    Bool.and(U32.is_ge(yy, U32.mul(top, 4)),
      U32.is_lt(yy, U32.mul(bottom, 4))))
  +dx = Shapes.near(U32.mul(U32.add(left, radius), 4),
    U32.mul(U32.sub(right, radius), 4), xx)
  +dy = Shapes.near(U32.mul(U32.add(top, radius), 4),
    U32.mul(U32.sub(bottom, radius), 4), yy)
  Bool.and(bounds, U32.is_le(U32.add(Shapes.square(dx), Shapes.square(dy)),
    Shapes.square(U32.mul(radius, 4))))

def coverage(+x: U32, +y: U32, +left: U32, +top: U32,
  +right: U32, +bottom: U32, +radius: U32) -> U32:
  +xx = U32.mul(x, 4)
  +yy = U32.mul(y, 4)
  U32.add(U32.add(Shapes.bit(covered(U32.add(xx, 1), U32.add(yy, 1), left, top, right, bottom, radius)),
    Shapes.bit(covered(U32.add(xx, 3), U32.add(yy, 1), left, top, right, bottom, radius))),
    U32.add(Shapes.bit(covered(U32.add(xx, 1), U32.add(yy, 3), left, top, right, bottom, radius)),
      Shapes.bit(covered(U32.add(xx, 3), U32.add(yy, 3), left, top, right, bottom, radius))))

def tree(+depth: Nat, +size: U32, excluded: Bool, filled: Bool,
  +x: U32, +y: U32, +left: U32, +top: U32, +right: U32, +bottom: U32,
  +radius: U32, +color: U32, +opacity: U32, image: Image) -> Image:
  match depth excluded filled:
    case 0n True{} _: image
    case 0n False{} _:
      Shapes.paint_leaf(coverage(x, y, left, top, right, bottom, radius), opacity, color, image)
    case 1n+rest True{} _: image
    case 1n+rest False{} True{}:
      Shapes.full_disk(depth, opacity, color, image)
    case 1n+rest False{} False{}:
      match image:
        case Pix{+background}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, half, outside(x, y, half, left, top, right, bottom, radius), inside(x, y, half, left, top, right, bottom, radius), x, y, left, top, right, bottom, radius, color, opacity, Pix{background})
            tree(rest, half, outside(xx, y, half, left, top, right, bottom, radius), inside(xx, y, half, left, top, right, bottom, radius), xx, y, left, top, right, bottom, radius, color, opacity, Pix{background})
            tree(rest, half, outside(x, yy, half, left, top, right, bottom, radius), inside(x, yy, half, left, top, right, bottom, radius), x, yy, left, top, right, bottom, radius, color, opacity, Pix{background})
            tree(rest, half, outside(xx, yy, half, left, top, right, bottom, radius), inside(xx, yy, half, left, top, right, bottom, radius), xx, yy, left, top, right, bottom, radius, color, opacity, Pix{background})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, half, outside(x, y, half, left, top, right, bottom, radius), inside(x, y, half, left, top, right, bottom, radius), x, y, left, top, right, bottom, radius, color, opacity, tl)
            tree(rest, half, outside(xx, y, half, left, top, right, bottom, radius), inside(xx, y, half, left, top, right, bottom, radius), xx, y, left, top, right, bottom, radius, color, opacity, tr)
            tree(rest, half, outside(x, yy, half, left, top, right, bottom, radius), inside(x, yy, half, left, top, right, bottom, radius), x, yy, left, top, right, bottom, radius, color, opacity, bl)
            tree(rest, half, outside(xx, yy, half, left, top, right, bottom, radius), inside(xx, yy, half, left, top, right, bottom, radius), xx, yy, left, top, right, bottom, radius, color, opacity, br)
          Qua{a, b, c, d}

def valid(+left: Shapes.Coord, +top: Shapes.Coord, +right: Shapes.Coord,
  +bottom: Shapes.Coord, +radius: U32, +opacity: U32) -> Bool:
  +l = Shapes.biased(left)
  +t = Shapes.biased(top)
  +r = Shapes.biased(right)
  +b = Shapes.biased(bottom)
  Bool.and(Bool.and(Bool.and(Shapes.valid_coord(left), Shapes.valid_coord(top)),
      Bool.and(Shapes.valid_coord(right), Shapes.valid_coord(bottom))),
    Bool.and(Bool.and(U32.is_lt(l, r), U32.is_lt(t, b)),
      Bool.and(Bool.and(U32.is_le(radius, U32.div(U32.sub(r, l), 2)),
        U32.is_le(radius, U32.div(U32.sub(b, t), 2))), U32.is_ne(opacity, 0))))

def draw_valid(is_valid: Bool, depth: Nat, +size: U32,
  left: Shapes.Coord, top: Shapes.Coord, right: Shapes.Coord, bottom: Shapes.Coord,
  +radius: U32, color: U32, opacity: U32, image: Image) -> Image:
  match is_valid:
    case False{}: image
    case True{}:
      +l = Shapes.biased(left)
      +t = Shapes.biased(top)
      +r = Shapes.biased(right)
      +b = Shapes.biased(bottom)
      tree(depth, size, outside(4096, 4096, size, l, t, r, b, radius),
        inside(4096, 4096, size, l, t, r, b, radius),
        4096, 4096, l, t, r, b, radius, color, opacity, image)

def draw(depth: Nat, size: U32,
  +left: Shapes.Coord, +top: Shapes.Coord, +right: Shapes.Coord, +bottom: Shapes.Coord,
  +radius: U32, color: U32, +opacity: U32, image: Image) -> Image:
  draw_valid(valid(left, top, right, bottom, radius, opacity), depth, size,
    left, top, right, bottom, radius, color, opacity, image)
