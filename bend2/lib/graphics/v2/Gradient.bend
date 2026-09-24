# Fixed-point axial gradients. The quantized bands deliberately preserve large
# uniform Image subtrees; `band` must be a power of two dividing `size`.
# The two child calls can become a native fork, and horizontal twins share one
# immutable subtree instead of allocating four copies.
import Base
import ./Color.bend as Color

def fraction_case(reversed: Bool, below: Bool, above: Bool,
  +value: U32, +start: U32, +finish: U32) -> U32:
  match reversed below above:
    case True{} _ _: 255
    case False{} True{} _: 0
    case False{} False{} True{}: 255
    case False{} False{} False{}:
      U32.div(U32.mul(U32.sub(value, start), 255), U32.sub(finish, start))

def fraction(+value: U32, +start: U32, +finish: U32) -> U32:
  fraction_case(U32.is_le(finish, start), U32.is_le(value, start),
    U32.is_ge(value, finish), value, start, finish)

def at(value: U32, start: U32, finish: U32, first: U32, last: U32) -> U32:
  Color.over(last, first, fraction(value, start, finish))

def vertical_tree(+depth: Nat, +size: U32, +y: U32, leaf: Bool,
  +band: U32, +start: U32, +finish: U32, +first: U32, +last: U32) -> Image:
  match depth leaf:
    case 0n _: Pix{at(y, start, finish, first, last)}
    case 1n+rest True{}: Pix{at(y, start, finish, first, last)}
    case 1n+rest False{}:
      +half = U32.div(size, 2)
      top bottom = vertical_tree(rest, half, y, U32.is_le(half, band), band,
          start, finish, first, last)
        vertical_tree(rest, half, U32.add(y, half), U32.is_le(half, band), band,
          start, finish, first, last)
      +upper = top
      +lower = bottom
      Qua{upper, upper, lower, lower}

def vertical(+depth: Nat, +size: U32, +band: U32,
  +start: U32, +finish: U32, +first: U32, +last: U32) -> Image:
  vertical_tree(depth, size, 0, U32.is_le(size, band), band,
    start, finish, first, last)

def horizontal_tree(+depth: Nat, +size: U32, +x: U32, leaf: Bool,
  +band: U32, +start: U32, +finish: U32, +first: U32, +last: U32) -> Image:
  match depth leaf:
    case 0n _: Pix{at(x, start, finish, first, last)}
    case 1n+rest True{}: Pix{at(x, start, finish, first, last)}
    case 1n+rest False{}:
      +half = U32.div(size, 2)
      left right = horizontal_tree(rest, half, x, U32.is_le(half, band), band,
          start, finish, first, last)
        horizontal_tree(rest, half, U32.add(x, half), U32.is_le(half, band), band,
          start, finish, first, last)
      +west = left
      +east = right
      Qua{west, east, west, east}

def horizontal(+depth: Nat, +size: U32, +band: U32,
  +start: U32, +finish: U32, +first: U32, +last: U32) -> Image:
  horizontal_tree(depth, size, 0, U32.is_le(size, band), band,
    start, finish, first, last)
