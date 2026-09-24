# Immutable transparent-key sprite embedding. Existing destination subtrees
# are returned at transparent source cells or outside the translated sprite.
# Source/target are power-of-two Images; coordinates are explicit signed Coord.
import Base
import ../Canvas.bend as Canvas
import ../pixels/Pixel.bend as Pixel
import ./Shapes.bend as Shapes

def outside(+x: U32, +y: U32, +size: U32,
  +sx: U32, +sy: U32, +source_size: U32) -> Bool:
  Bool.or(Bool.or(U32.is_ge(x, U32.add(sx, source_size)),
      U32.is_le(U32.add(x, size), sx)),
    Bool.or(U32.is_ge(y, U32.add(sy, source_size)),
      U32.is_le(U32.add(y, size), sy)))

def aligned(+x: U32, +y: U32, +size: U32,
  +sx: U32, +sy: U32, +source_size: U32) -> Bool:
  +contained = Bool.and(Bool.and(U32.is_le(sx, x),
      U32.is_le(U32.add(x, size), U32.add(sx, source_size))),
    Bool.and(U32.is_le(sy, y),
      U32.is_le(U32.add(y, size), U32.add(sy, source_size))))
  Bool.and(contained, Bool.and(U32.is_zero(U32.mod(U32.sub(x, sx), size)),
    U32.is_zero(U32.mod(U32.sub(y, sy), size))))

def pix_case(empty: Bool, color: U32, image: Image) -> Image:
  match empty:
    case True{}: image
    case False{}: Pix{color}

def apply(+depth: Nat, source: Image, +key: U32, image: Image) -> Image:
  match depth source:
    case 0n Pix{+color}:
      pix_case(U32.is_eq(color, key), color, image)
    case 0n Qua{tl, tr, bl, br}: image
    case 1n+rest Pix{+color}:
      pix_case(U32.is_eq(color, key), color, image)
    case 1n+rest Qua{tl, tr, bl, br}:
      match image:
        case Pix{+background}:
          a b c d = apply(rest, tl, key, Pix{background})
            apply(rest, tr, key, Pix{background})
            apply(rest, bl, key, Pix{background})
            apply(rest, br, key, Pix{background})
          Qua{a, b, c, d}
        case Qua{a, b, c, d}:
          aa bb cc dd = apply(rest, tl, key, a)
            apply(rest, tr, key, b)
            apply(rest, bl, key, c)
            apply(rest, br, key, d)
          Qua{aa, bb, cc, dd}

def leaf(+source_depth: Nat, +x: U32, +y: U32, +sx: U32, +sy: U32,
  +source: Image, +key: U32, image: Image) -> Image:
  +color = Pixel.sample_xy(source_depth, U32.sub(x, sx), U32.sub(y, sy), source)
  pix_case(U32.is_eq(color, key), color, image)

def tree(+depth: Nat, +source_depth: Nat, +size: U32,
  excluded: Bool, whole: Bool, +x: U32, +y: U32, +sx: U32, +sy: U32,
  +source_size: U32, +source: Image, +key: U32, image: Image) -> Image:
  match depth excluded whole:
    case 0n True{} _: image
    case 0n False{} _:
      leaf(source_depth, x, y, sx, sy, source, key, image)
    case 1n+rest True{} _: image
    case 1n+rest False{} True{}:
      +subtree = Canvas.source_subtree(Nat.sub(source_depth, depth),
        source_depth, U32.sub(x, sx), U32.sub(y, sy), source)
      apply(depth, subtree, key, image)
    case 1n+rest False{} False{}:
      match image:
        case Pix{+background}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, source_depth, half, outside(x, y, half, sx, sy, source_size), aligned(x, y, half, sx, sy, source_size), x, y, sx, sy, source_size, source, key, Pix{background})
            tree(rest, source_depth, half, outside(xx, y, half, sx, sy, source_size), aligned(xx, y, half, sx, sy, source_size), xx, y, sx, sy, source_size, source, key, Pix{background})
            tree(rest, source_depth, half, outside(x, yy, half, sx, sy, source_size), aligned(x, yy, half, sx, sy, source_size), x, yy, sx, sy, source_size, source, key, Pix{background})
            tree(rest, source_depth, half, outside(xx, yy, half, sx, sy, source_size), aligned(xx, yy, half, sx, sy, source_size), xx, yy, sx, sy, source_size, source, key, Pix{background})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = tree(rest, source_depth, half, outside(x, y, half, sx, sy, source_size), aligned(x, y, half, sx, sy, source_size), x, y, sx, sy, source_size, source, key, tl)
            tree(rest, source_depth, half, outside(xx, y, half, sx, sy, source_size), aligned(xx, y, half, sx, sy, source_size), xx, y, sx, sy, source_size, source, key, tr)
            tree(rest, source_depth, half, outside(x, yy, half, sx, sy, source_size), aligned(x, yy, half, sx, sy, source_size), x, yy, sx, sy, source_size, source, key, bl)
            tree(rest, source_depth, half, outside(xx, yy, half, sx, sy, source_size), aligned(xx, yy, half, sx, sy, source_size), xx, yy, sx, sy, source_size, source, key, br)
          Qua{a, b, c, d}

def draw_valid(valid: Bool, +target_depth: Nat, +target_size: U32,
  +source_depth: Nat, +source_size: U32, left: Shapes.Coord,
  top: Shapes.Coord, +source: Image, +key: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      +sx = Shapes.biased(left)
      +sy = Shapes.biased(top)
      tree(target_depth, source_depth, target_size,
        outside(4096, 4096, target_size, sx, sy, source_size),
        aligned(4096, 4096, target_size, sx, sy, source_size),
        4096, 4096, sx, sy, source_size, source, key, image)

def transparent(source: Image, key: U32) -> Bool:
  match source:
    case Pix{color}: U32.is_eq(color, key)
    case Qua{tl, tr, bl, br}: False{}

def draw_gate(empty: Bool, +target_depth: Nat, +target_size: U32,
  +source_depth: Nat, +source_size: U32, +left: Shapes.Coord,
  +top: Shapes.Coord, +source: Image, +key: U32, image: Image) -> Image:
  match empty:
    case True{}: image
    case False{}:
      draw_valid(Bool.and(Shapes.valid_coord(left), Shapes.valid_coord(top)),
        target_depth, target_size, source_depth, source_size,
        left, top, source, key, image)

def draw(+target_depth: Nat, +target_size: U32,
  +source_depth: Nat, +source_size: U32, +left: Shapes.Coord,
  +top: Shapes.Coord, +source: Image, +key: U32, image: Image) -> Image:
  draw_gate(transparent(source, key), target_depth, target_size,
    source_depth, source_size, left, top, source, key, image)
