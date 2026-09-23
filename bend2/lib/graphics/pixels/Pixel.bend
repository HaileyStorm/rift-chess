# Small, pure image-tree primitives used by the Bend game experiment.
import Base

# A path names the four children of an Image node.  Image itself is the
# immutable Pix/Qua datatype from Base.
type Quadrant is Data:
  NorthWest{}
  NorthEast{}
  SouthWest{}
  SouthEast{}

# Rectangle edges are half-open: left <= x < right and top <= y < bottom.
type Rect is Data:
  Rect{left: U32, top: U32, right: U32, bottom: U32}

def solid(color: U32) -> Image:
  Pix{color}

# A short path is an invalid sample of a non-uniform image and returns zero.
# A Pix is uniform, so it accepts every path without inspecting it.
def sample_path(path: List<&2, Quadrant>, image: Image) -> U32:
  match path:
    case Nil{}:
      match image:
        case Pix{color}:
          color
        case Qua{tl, tr, bl, br}:
          0
    case NorthWest{} <> rest:
      match image:
        case Pix{color}:
          color
        case Qua{tl, tr, bl, br}:
          sample_path(rest, tl)
    case NorthEast{} <> rest:
      match image:
        case Pix{color}:
          color
        case Qua{tl, tr, bl, br}:
          sample_path(rest, tr)
    case SouthWest{} <> rest:
      match image:
        case Pix{color}:
          color
        case Qua{tl, tr, bl, br}:
          sample_path(rest, bl)
    case SouthEast{} <> rest:
      match image:
        case Pix{color}:
          color
        case Qua{tl, tr, bl, br}:
          sample_path(rest, br)

# Sample an image at integer coordinates in a 2^depth square.  Coordinates
# outside that square are outside this MVP contract; U32 arithmetic wraps.
def sample_xy(+depth: Nat, +x: U32, +y: U32, image: Image) -> U32:
  match depth image:
    case 0n Pix{color}:
      color
    case 0n Qua{tl, tr, bl, br}:
      0
    case 1n+rest Pix{color}:
      color
    case 1n+rest Qua{tl, tr, bl, br}:
      +half = U32.shln(1, rest)
      +horizontal = U32.is_ge(x, half)
      +vertical = U32.is_ge(y, half)
      +top = Bool.pick(Image, horizontal, tr, tl)
      +bottom = Bool.pick(Image, horizontal, br, bl)
      +child = Bool.pick(Image, vertical, bottom, top)
      +next_x = Bool.pick(U32, horizontal, U32.sub(x, half), x)
      +next_y = Bool.pick(U32, vertical, U32.sub(y, half), y)
      sample_xy(rest, next_x, next_y, child)

def rect_empty_parts(left: U32, top: U32, right: U32, bottom: U32) -> Bool:
  Bool.or(U32.is_ge(left, right), U32.is_ge(top, bottom))

def rect_empty(rect: Rect) -> Bool:
  match rect:
    case Rect{+left, +top, +right, +bottom}:
      rect_empty_parts(left, top, right, bottom)

def rect_outside_parts(left: U32, top: U32, right: U32, bottom: U32) -> Bool:
  Bool.or(Bool.or(U32.is_ge(left, 512), U32.is_le(right, 0)),
    Bool.or(U32.is_ge(top, 512), U32.is_le(bottom, 0)))

def rect_outside_root(rect: Rect) -> Bool:
  match rect:
    case Rect{+left, +top, +right, +bottom}:
      rect_outside_parts(left, top, right, bottom)

def rect_cell_outside(+depth: Nat, +x: U32, +y: U32, rect: Rect) -> Bool:
  match rect:
    case Rect{+left, +top, +right, +bottom}:
      +size = U32.shln(1, depth)
      Bool.or(Bool.or(U32.is_ge(x, right), U32.is_ge(left, U32.add(x, size))),
        Bool.or(U32.is_ge(y, bottom), U32.is_ge(top, U32.add(y, size))))

def rect_cell_inside(+depth: Nat, +x: U32, +y: U32, rect: Rect) -> Bool:
  match rect:
    case Rect{+left, +top, +right, +bottom}:
      +size = U32.shln(1, depth)
      Bool.and(Bool.and(U32.is_le(left, x), U32.is_le(U32.add(x, size), right)),
        Bool.and(U32.is_le(top, y), U32.is_le(U32.add(y, size), bottom)))

def fill_rect.at(
  +depth: Nat, empty: Bool, outside: Bool, inside: Bool,
  +x: U32, +y: U32, +rect: Rect, +color: U32, +image: Image
) -> Image:
  match depth empty outside inside:
    case 0n True{} _ _:
      image
    case 0n False{} True{} _:
      image
    case 0n False{} False{} _:
      Pix{color}
    case 1n+rest True{} _ _:
      image
    case 1n+rest False{} True{} _:
      image
    case 1n+rest False{} False{} True{}:
      Pix{color}
    case 1n+rest False{} False{} False{}:
      match image:
        case Pix{+base}:
              +half = U32.shln(1, rest)
              a b c d = fill_rect.at(rest, False{}, rect_cell_outside(rest, x, y, rect),
                  rect_cell_inside(rest, x, y, rect), x, y, rect, color, Pix{base})
                fill_rect.at(rest, False{}, rect_cell_outside(rest, U32.add(x, half), y, rect),
                  rect_cell_inside(rest, U32.add(x, half), y, rect), U32.add(x, half), y,
                  rect, color, Pix{base})
                fill_rect.at(rest, False{}, rect_cell_outside(rest, x, U32.add(y, half), rect),
                  rect_cell_inside(rest, x, U32.add(y, half), rect), x, U32.add(y, half),
                  rect, color, Pix{base})
                fill_rect.at(rest, False{}, rect_cell_outside(rest, U32.add(x, half), U32.add(y, half), rect),
                  rect_cell_inside(rest, U32.add(x, half), U32.add(y, half), rect),
                  U32.add(x, half), U32.add(y, half), rect, color, Pix{base})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
              a b c d = fill_rect.at(rest, False{}, rect_cell_outside(rest, x, y, rect),
                  rect_cell_inside(rest, x, y, rect), x, y, rect, color, tl)
                fill_rect.at(rest, False{}, rect_cell_outside(rest, U32.add(x, U32.shln(1, rest)), y, rect),
                  rect_cell_inside(rest, U32.add(x, U32.shln(1, rest)), y, rect),
                  U32.add(x, U32.shln(1, rest)), y, rect, color, tr)
                fill_rect.at(rest, False{}, rect_cell_outside(rest, x, U32.add(y, U32.shln(1, rest)), rect),
                  rect_cell_inside(rest, x, U32.add(y, U32.shln(1, rest)), rect),
                  x, U32.add(y, U32.shln(1, rest)), rect, color, bl)
                fill_rect.at(rest, False{}, rect_cell_outside(rest, U32.add(x, U32.shln(1, rest)),
                    U32.add(y, U32.shln(1, rest)), rect),
                  rect_cell_inside(rest, U32.add(x, U32.shln(1, rest)), U32.add(y, U32.shln(1, rest)), rect),
                  U32.add(x, U32.shln(1, rest)), U32.add(y, U32.shln(1, rest)), rect, color, br)
          Qua{a, b, c, d}

def fill_rect.root(+rect: Rect, +color: U32, +image: Image, empty: Bool,
  outside: Bool) -> Image:
  match empty outside:
    case True{} _:
      image
    case False{} True{}:
      image
    case False{} False{}:
      fill_rect.at(9n, False{}, False{}, rect_cell_inside(9n, 0, 0, rect),
        0, 0, rect, color, image)

# Fill the half-open rectangle in a fixed 512 by 512 image tree.
def fill_rect(+rect: Rect, +color: U32, image: Image) -> Image:
  fill_rect.root(rect, color, image, rect_empty(rect), rect_outside_root(rect))
