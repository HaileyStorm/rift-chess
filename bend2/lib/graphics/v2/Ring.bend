# Antialiased annuli from exact quarter-sample disk set difference.
# Useful for outlines, orbit guides, selection halos and hollow platforms.
import Base
import ./Shapes.bend as Shapes

def outside(+x: U32, +y: U32, +size: U32,
  +cx: U32, +cy: U32, +inner: U32, +outer: U32) -> Bool:
  Bool.or(Shapes.outside_disk(x, y, size, cx, cy, outer),
    Shapes.inside_disk(x, y, size, cx, cy, inner))

def inside(+x: U32, +y: U32, +size: U32,
  +cx: U32, +cy: U32, +inner: U32, +outer: U32) -> Bool:
  Bool.and(Shapes.inside_disk(x, y, size, cx, cy, outer),
    Shapes.outside_disk(x, y, size, cx, cy, inner))

def coverage(+x: U32, +y: U32, +cx: U32, +cy: U32,
  +inner: U32, +outer: U32) -> U32:
  U32.sub(Shapes.disk_coverage(x, y, cx, cy, outer),
    Shapes.disk_coverage(x, y, cx, cy, inner))

def tree(+depth: Nat, +size: U32, excluded: Bool, full: Bool,
  +x: U32, +y: U32, +cx: U32, +cy: U32, +inner: U32, +outer: U32,
  +color: U32, +opacity: U32, image: Image) -> Image:
  match depth excluded full:
    case 0n True{} _: image
    case 0n False{} _:
      Shapes.paint_leaf(coverage(x, y, cx, cy, inner, outer),
        opacity, color, image)
    case 1n+rest True{} _: image
    case 1n+rest False{} True{}:
      Shapes.full_disk(depth, opacity, color, image)
    case 1n+rest False{} False{}:
      match image:
        case Pix{+background}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, half, outside(x, y, half, cx, cy, inner, outer), inside(x, y, half, cx, cy, inner, outer), x, y, cx, cy, inner, outer, color, opacity, Pix{background})
            tree(rest, half, outside(xx, y, half, cx, cy, inner, outer), inside(xx, y, half, cx, cy, inner, outer), xx, y, cx, cy, inner, outer, color, opacity, Pix{background})
            tree(rest, half, outside(x, yy, half, cx, cy, inner, outer), inside(x, yy, half, cx, cy, inner, outer), x, yy, cx, cy, inner, outer, color, opacity, Pix{background})
            tree(rest, half, outside(xx, yy, half, cx, cy, inner, outer), inside(xx, yy, half, cx, cy, inner, outer), xx, yy, cx, cy, inner, outer, color, opacity, Pix{background})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, half, outside(x, y, half, cx, cy, inner, outer), inside(x, y, half, cx, cy, inner, outer), x, y, cx, cy, inner, outer, color, opacity, tl)
            tree(rest, half, outside(xx, y, half, cx, cy, inner, outer), inside(xx, y, half, cx, cy, inner, outer), xx, y, cx, cy, inner, outer, color, opacity, tr)
            tree(rest, half, outside(x, yy, half, cx, cy, inner, outer), inside(x, yy, half, cx, cy, inner, outer), x, yy, cx, cy, inner, outer, color, opacity, bl)
            tree(rest, half, outside(xx, yy, half, cx, cy, inner, outer), inside(xx, yy, half, cx, cy, inner, outer), xx, yy, cx, cy, inner, outer, color, opacity, br)
          Qua{a, b, c, d}

def draw_valid(valid: Bool, +depth: Nat, +size: U32,
  cx: Shapes.Coord, cy: Shapes.Coord, +inner: U32, +outer: U32,
  color: U32, opacity: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      +x = Shapes.biased(cx)
      +y = Shapes.biased(cy)
      tree(depth, size, outside(4096, 4096, size, x, y, inner, outer),
        inside(4096, 4096, size, x, y, inner, outer),
        4096, 4096, x, y, inner, outer, color, opacity, image)

def draw(depth: Nat, size: U32, +cx: Shapes.Coord, +cy: Shapes.Coord,
  +inner: U32, +outer: U32, color: U32, +opacity: U32,
  image: Image) -> Image:
  draw_valid(Bool.and(U32.is_lt(inner, outer),
      Bool.and(U32.is_le(outer, 4096),
        Bool.and(Bool.and(Shapes.valid_coord(cx), Shapes.valid_coord(cy)),
          U32.is_ne(opacity, 0)))), depth, size, cx, cy, inner, outer,
    color, opacity, image)
