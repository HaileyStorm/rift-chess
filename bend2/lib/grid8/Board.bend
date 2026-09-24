# Reusable power-of-two checkered tile surface, independent of chess rules.
# A 2^(depth) source has eight cells per side (cell size = size/8).
import Base

type Mask is Data:
  Mask{low: U32, high: U32}

def present_case(first: Bool, +index: U32, +low: U32, +high: U32) -> Bool:
  match first:
    case True{}:
      U32.is_ne(U32.and(low, U32.shln(1, U32.to_nat(index))), 0)
    case False{}:
      U32.is_ne(U32.and(high, U32.shln(1, U32.to_nat(U32.sub(index, 32)))), 0)

def present(mask: Mask, +index: U32) -> Bool:
  match mask:
    case Mask{low, high}:
      present_case(U32.is_lt(index, 32), index, low, high)

def tile_case(even: Bool, light: U32, dark: U32) -> Image:
  match even:
    case True{}: Pix{light}
    case False{}: Pix{dark}

def tile(+x: U32, +y: U32, +cell: U32, +light: U32, +dark: U32) -> Image:
  tile_case(U32.is_zero(U32.mod(U32.add(U32.div(x, cell), U32.div(y, cell)), 2)),
    light, dark)

def tree(+depth: Nat, +size: U32, +x: U32, +y: U32, +cell: U32,
  leaf: Bool, +light: U32, +dark: U32) -> Image:
  match depth leaf:
    case 0n _: tile(x, y, cell, light, dark)
    case 1n+rest True{}: tile(x, y, cell, light, dark)
    case 1n+rest False{}:
      +half = U32.div(size, 2)
      a b c d = tree(rest, half, x, y, cell, U32.is_le(half, cell), light, dark)
        tree(rest, half, U32.add(x, half), y, cell, U32.is_le(half, cell), light, dark)
        tree(rest, half, x, U32.add(y, half), cell, U32.is_le(half, cell), light, dark)
        tree(rest, half, U32.add(x, half), U32.add(y, half), cell, U32.is_le(half, cell), light, dark)
      Qua{a, b, c, d}

def make_valid(valid: Bool, +depth: Nat, +size: U32,
  +light: U32, +dark: U32) -> Image:
  match valid:
    case False{}: Pix{light}
    case True{}:
      tree(depth, size, 0, 0, U32.div(size, 8), False{}, light, dark)

def make(+depth: Nat, +size: U32, +light: U32, +dark: U32) -> Image:
  make_valid(Bool.and(U32.is_ge(size, 8), U32.is_zero(U32.mod(size, 8))),
    depth, size, light, dark)

def tile_mask(visible: Bool, even: Bool, +light: U32, +dark: U32,
  image: Image) -> Image:
  match visible even:
    case False{} _: image
    case True{} True{}: Pix{light}
    case True{} False{}: Pix{dark}

def paint_tree(+depth: Nat, +size: U32, +x: U32, +y: U32, +cell: U32,
  leaf: Bool, +mask: Mask, +light: U32, +dark: U32, image: Image) -> Image:
  match depth leaf:
    case 0n _:
      +column = U32.div(x, cell)
      +row = U32.div(y, cell)
      tile_mask(present(mask, U32.add(column, U32.mul(row, 8))),
        U32.is_zero(U32.mod(U32.add(column, row), 2)), light, dark, image)
    case 1n+rest True{}:
      +column = U32.div(x, cell)
      +row = U32.div(y, cell)
      tile_mask(present(mask, U32.add(column, U32.mul(row, 8))),
        U32.is_zero(U32.mod(U32.add(column, row), 2)), light, dark, image)
    case 1n+rest False{}:
      match image:
        case Pix{+background}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = paint_tree(rest, half, x, y, cell, U32.is_le(half, cell), mask, light, dark, Pix{background})
            paint_tree(rest, half, xx, y, cell, U32.is_le(half, cell), mask, light, dark, Pix{background})
            paint_tree(rest, half, x, yy, cell, U32.is_le(half, cell), mask, light, dark, Pix{background})
            paint_tree(rest, half, xx, yy, cell, U32.is_le(half, cell), mask, light, dark, Pix{background})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = paint_tree(rest, half, x, y, cell, U32.is_le(half, cell), mask, light, dark, tl)
            paint_tree(rest, half, xx, y, cell, U32.is_le(half, cell), mask, light, dark, tr)
            paint_tree(rest, half, x, yy, cell, U32.is_le(half, cell), mask, light, dark, bl)
            paint_tree(rest, half, xx, yy, cell, U32.is_le(half, cell), mask, light, dark, br)
          Qua{a, b, c, d}

def paint_valid(valid: Bool, depth: Nat, +size: U32, mask: Mask,
  light: U32, dark: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      paint_tree(depth, size, 0, 0, U32.div(size, 8), False{}, mask,
        light, dark, image)

def empty_mask(mask: Mask) -> Bool:
  match mask:
    case Mask{low, high}:
      Bool.and(U32.is_zero(low), U32.is_zero(high))

def paint_nonempty(empty: Bool, +depth: Nat, +size: U32, +mask: Mask,
  +light: U32, +dark: U32, image: Image) -> Image:
  match empty:
    case True{}: image
    case False{}:
      paint_valid(Bool.and(U32.is_ge(size, 8), U32.is_zero(U32.mod(size, 8))),
        depth, size, mask, light, dark, image)

# A zero mask leaves an arbitrary existing image unchanged at every square.
# Missing cells preserve their original subtree; the caller can render a void,
# gradient, image, or live scene behind them.
def paint_masked(+depth: Nat, +size: U32, +mask: Mask,
  +light: U32, +dark: U32, image: Image) -> Image:
  paint_nonempty(empty_mask(mask), depth, size, mask, light, dark, image)
