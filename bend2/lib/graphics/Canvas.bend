# General power-of-two canvas primitives for Bend Image trees.
#
# The renderer keeps Image immutable.  A fill or embed only descends into
# quadrants touched by the requested rectangle and returns untouched subtrees
# unchanged.  This keeps board-sized embeds cheap while still accepting small
# crops at arbitrary coordinates.  `*_at` functions accept a target depth;
# convenience wrappers use the 1024-square depth-10 canvas.
import Base

type Rect is Data:
  Rect{left: U32, top: U32, right: U32, bottom: U32}

def solid(color: U32) -> Image:
  Pix{color}

def limit(depth: Nat) -> U32:
  U32.shln(1, depth)

def edge(depth: Nat, +x: U32, +extent: U32) -> U32:
  +bound = limit(depth)
  +room = U32.sub(bound, x)
  Bool.pick(U32, Bool.or(U32.is_ge(x, bound), U32.is_gt(extent, room)),
    bound, U32.add(x, extent))

def make_rect(+depth: Nat, +x: U32, +y: U32, +width: U32, +height: U32) -> Rect:
  +bound = limit(depth)
  Rect{U32.min(x, bound), U32.min(y, bound), edge(depth, x, width), edge(depth, y, height)}

def empty(r: Rect) -> Bool:
  match r:
    case Rect{left, top, right, bottom}:
      Bool.or(U32.is_ge(left, right), U32.is_ge(top, bottom))

def outside_root(depth: Nat, r: Rect) -> Bool:
  match r:
    case Rect{left, top, right, bottom}:
      +bound = limit(depth)
      Bool.or(Bool.or(U32.is_ge(left, bound), U32.is_le(right, 0)),
        Bool.or(U32.is_ge(top, bound), U32.is_le(bottom, 0)))

def cell_outside(depth: Nat, +x: U32, +y: U32, r: Rect) -> Bool:
  match r:
    case Rect{left, top, right, bottom}:
      +size = U32.shln(1, depth)
      Bool.or(Bool.or(U32.is_ge(x, right), U32.is_ge(left, U32.add(x, size))),
        Bool.or(U32.is_ge(y, bottom), U32.is_ge(top, U32.add(y, size))))

def cell_inside(depth: Nat, +x: U32, +y: U32, r: Rect) -> Bool:
  match r:
    case Rect{left, top, right, bottom}:
      +size = U32.shln(1, depth)
      Bool.and(Bool.and(U32.is_le(left, x), U32.is_le(U32.add(x, size), right)),
        Bool.and(U32.is_le(top, y), U32.is_le(U32.add(y, size), bottom)))

def fill_at(+depth: Nat, outside: Bool, inside: Bool, +x: U32, +y: U32,
  +r: Rect, +color: U32, +image: Image) -> Image:
  match depth outside inside:
    case 0n True{} _:
      image
    case 0n False{} _:
      Pix{color}
    case 1n+rest True{} _:
      image
    case 1n+rest False{} True{}:
      Pix{color}
    case 1n+rest False{} False{}:
      match image:
        case Pix{+base}:
          +half = U32.shln(1, rest)
          a b c d = fill_at(rest, cell_outside(rest, x, y, r),
              cell_inside(rest, x, y, r), x, y, r, color, Pix{base})
            fill_at(rest, cell_outside(rest, U32.add(x, half), y, r),
              cell_inside(rest, U32.add(x, half), y, r), U32.add(x, half), y,
              r, color, Pix{base})
            fill_at(rest, cell_outside(rest, x, U32.add(y, half), r),
              cell_inside(rest, x, U32.add(y, half), r), x, U32.add(y, half),
              r, color, Pix{base})
            fill_at(rest, cell_outside(rest, U32.add(x, half), U32.add(y, half), r),
              cell_inside(rest, U32.add(x, half), U32.add(y, half), r),
              U32.add(x, half), U32.add(y, half), r, color, Pix{base}
            )
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.shln(1, rest)
          a b c d = fill_at(rest, cell_outside(rest, x, y, r),
              cell_inside(rest, x, y, r), x, y, r, color, tl)
            fill_at(rest, cell_outside(rest, U32.add(x, half), y, r),
              cell_inside(rest, U32.add(x, half), y, r), U32.add(x, half), y,
              r, color, tr)
            fill_at(rest, cell_outside(rest, x, U32.add(y, half), r),
              cell_inside(rest, x, U32.add(y, half), r), x, U32.add(y, half),
              r, color, bl)
            fill_at(rest, cell_outside(rest, U32.add(x, half), U32.add(y, half), r),
              cell_inside(rest, U32.add(x, half), U32.add(y, half), r),
              U32.add(x, half), U32.add(y, half), r, color, br)
          Qua{a, b, c, d}

def fill_root(+depth: Nat, +r: Rect, +color: U32, image: Image, is_empty: Bool,
  is_outside: Bool) -> Image:
  match is_empty is_outside:
    case True{} _:
      image
    case False{} True{}:
      image
    case False{} False{}:
      fill_at(depth, False{}, cell_inside(depth, 0, 0, r), 0, 0, r, color, image)

def rect_on(+depth: Nat, +x: U32, +y: U32, +width: U32, +height: U32, +color: U32,
  image: Image) -> Image:
  +r = make_rect(depth, x, y, width, height)
  fill_root(depth, r, color, image, empty(r), outside_root(depth, r))

def rect_at_case(width_zero: Bool, height_zero: Bool, +depth: Nat,
  +x: U32, +y: U32, +width: U32, +height: U32, +color: U32,
  +image: Image) -> Image:
  match width_zero height_zero:
    case True{} _:
      image
    case False{} True{}:
      image
    case False{} False{}:
      rect_on(depth, x, y, width, height, color, image)

def rect_at(depth: Nat, x: U32, y: U32, +width: U32, +height: U32, color: U32,
  image: Image) -> Image:
  rect_at_case(U32.is_zero(width), U32.is_zero(height), depth, x, y, width,
    height, color, image)

def rect(x: U32, y: U32, width: U32, height: U32, color: U32,
  image: Image) -> Image:
  rect_at(10n, x, y, width, height, color, image)

# Draw a filled panel with a one-pixel border.  The outer rectangle uses the
# border colour; the inner rectangle is the face colour when both dimensions
# leave room for it.
def frame_fill(+depth: Nat, interior: Bool, +x: U32, +y: U32, +width: U32,
  +height: U32, +color: U32, image: Image) -> Image:
  match interior:
    case False{}:
      image
    case True{}:
      rect_on(depth, U32.add(x, 1), U32.add(y, 1), U32.sub(width, 2),
        U32.sub(height, 2), color, image)

def frame_nonempty(+depth: Nat, +width: U32, +height: U32, +x: U32, +y: U32,
  +border: U32, +color: U32, +image: Image) -> Image:
  +outer = rect_on(depth, x, y, width, height, border, image)
  frame_fill(depth, Bool.and(U32.is_gt(width, 2), U32.is_gt(height, 2)),
    x, y, width, height, color, outer)

def frame_at(+depth: Nat, +x: U32, +y: U32, +width: U32, +height: U32, border: U32,
  +color: U32, +image: Image) -> Image:
  +nonempty = Bool.and(U32.is_ne(width, 0), U32.is_ne(height, 0))
  Bool.pick(Image, nonempty, frame_nonempty(depth, width, height, x, y, border, color, image), image)

def frame(+x: U32, +y: U32, +width: U32, +height: U32, border: U32,
  +color: U32, +image: Image) -> Image:
  frame_at(10n, x, y, width, height, border, color, image)

def source_size(depth: Nat) -> U32:
  U32.shln(1, depth)

def source_outside(depth: Nat, +sx: U32, +sy: U32, +x: U32, +y: U32,
  +size: U32) -> Bool:
  +source_size_value = source_size(depth)
  Bool.or(Bool.or(U32.is_ge(x, U32.add(sx, source_size_value)), U32.is_ge(sx, U32.add(x, size))),
    Bool.or(U32.is_ge(y, U32.add(sy, source_size_value)), U32.is_ge(sy, U32.add(y, size))))

def source_contains(+depth: Nat, +sx: U32, +sy: U32, +x: U32, +y: U32,
  +size: U32) -> Bool:
  Bool.and(Bool.and(U32.is_le(sx, x), U32.is_le(U32.add(x, size), U32.add(sx, source_size(depth)))),
    Bool.and(U32.is_le(sy, y), U32.is_le(U32.add(y, size), U32.add(sy, source_size(depth)))))

def source_contains_aligned(source_depth: Nat, dst_depth: Nat, +sx: U32,
  +sy: U32, +x: U32, +y: U32, +size: U32) -> Bool:
  +contained = source_contains(source_depth, sx, sy, x, y, size)
  +grid = U32.shln(1, dst_depth)
  Bool.and(contained, Bool.and(U32.is_zero(U32.mod(U32.sub(x, sx), grid)),
    U32.is_zero(U32.mod(U32.sub(y, sy), grid))))

# Select the source subtree corresponding to a destination cell.  This is the
# aligned fast path used when an entire destination cell lies in the source.
def source_subtree(+levels: Nat, +source_depth: Nat, +dx: U32, +dy: U32,
  source: Image) -> Image:
  match levels:
    case 0n:
      source
    case 1n+rest:
      match source:
        case Pix{color}:
          Pix{color}
        case Qua{tl, tr, bl, br}:
          +half = U32.shln(1, Nat.sub(source_depth, 1n))
          +right = U32.is_ge(dx, half)
          +down = U32.is_ge(dy, half)
          +top = Bool.pick(Image, right, tr, tl)
          +bottom = Bool.pick(Image, right, br, bl)
          +child = Bool.pick(Image, down, bottom, top)
          +next_x = Bool.pick(U32, right, U32.sub(dx, half), dx)
          +next_y = Bool.pick(U32, down, U32.sub(dy, half), dy)
          source_subtree(rest, Nat.sub(source_depth, 1n), next_x, next_y, child)

def embed_tree(+dst_depth: Nat, outside: Bool, contained: Bool,
  +sx: U32, +sy: U32, +source_depth: Nat, +source: Image, +x: U32, +y: U32,
  +image: Image) -> Image:
  match dst_depth outside contained:
    case 0n True{} _:
      image
    case 0n False{} _:
      source_subtree(source_depth, source_depth, U32.sub(x, sx), U32.sub(y, sy), source)
    case 1n+rest True{} _:
      image
    case 1n+rest False{} True{}:
      source_subtree(Nat.sub(source_depth, dst_depth), source_depth,
        U32.sub(x, sx), U32.sub(y, sy), source)
    case 1n+rest False{} False{}:
      match image:
        case Pix{+base}:
          +half = U32.shln(1, rest)
          a b c d = embed_tree(rest,
              source_outside(source_depth, sx, sy, x, y, U32.shln(1, rest)),
              source_contains_aligned(source_depth, rest, sx, sy, x, y, U32.shln(1, rest)),
              sx, sy, source_depth, source, x, y, Pix{base})
            embed_tree(rest,
              source_outside(source_depth, sx, sy, U32.add(x, half), y, U32.shln(1, rest)),
              source_contains_aligned(source_depth, rest, sx, sy, U32.add(x, half), y, U32.shln(1, rest)),
              sx, sy, source_depth, source, U32.add(x, half), y, Pix{base})
            embed_tree(rest,
              source_outside(source_depth, sx, sy, x, U32.add(y, half), U32.shln(1, rest)),
              source_contains_aligned(source_depth, rest, sx, sy, x, U32.add(y, half), U32.shln(1, rest)),
              sx, sy, source_depth, source, x, U32.add(y, half), Pix{base})
            embed_tree(rest,
              source_outside(source_depth, sx, sy, U32.add(x, half), U32.add(y, half), U32.shln(1, rest)),
              source_contains_aligned(source_depth, rest, sx, sy, U32.add(x, half), U32.add(y, half), U32.shln(1, rest)),
              sx, sy, source_depth, source, U32.add(x, half), U32.add(y, half), Pix{base})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.shln(1, rest)
          a b c d = embed_tree(rest,
              source_outside(source_depth, sx, sy, x, y, U32.shln(1, rest)),
              source_contains_aligned(source_depth, rest, sx, sy, x, y, U32.shln(1, rest)),
              sx, sy, source_depth, source, x, y, tl)
            embed_tree(rest,
              source_outside(source_depth, sx, sy, U32.add(x, half), y, U32.shln(1, rest)),
              source_contains_aligned(source_depth, rest, sx, sy, U32.add(x, half), y, U32.shln(1, rest)),
              sx, sy, source_depth, source, U32.add(x, half), y, tr)
            embed_tree(rest,
              source_outside(source_depth, sx, sy, x, U32.add(y, half), U32.shln(1, rest)),
              source_contains_aligned(source_depth, rest, sx, sy, x, U32.add(y, half), U32.shln(1, rest)),
              sx, sy, source_depth, source, x, U32.add(y, half), bl)
            embed_tree(rest,
              source_outside(source_depth, sx, sy, U32.add(x, half), U32.add(y, half), U32.shln(1, rest)),
              source_contains_aligned(source_depth, rest, sx, sy, U32.add(x, half), U32.add(y, half), U32.shln(1, rest)),
              sx, sy, source_depth, source, U32.add(x, half), U32.add(y, half), br)
          Qua{a, b, c, d}

def embed_at(+target_depth: Nat, source: Image, +source_depth: Nat,
  +x: U32, +y: U32, image: Image) -> Image:
  +size = limit(target_depth)
  embed_tree(target_depth, source_outside(source_depth, x, y, 0, 0, size),
    source_contains_aligned(source_depth, target_depth, x, y, 0, 0, size),
    x, y, source_depth, source, 0, 0, image)

def embed(source: Image, source_depth: Nat, x: U32, y: U32, image: Image) -> Image:
  embed_at(10n, source, source_depth, x, y, image)
