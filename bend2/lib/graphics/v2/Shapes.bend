# Integer-coordinate disk and rounded panel rasterization with 2x2 subpixel
# coverage on the boundary. Public coordinates are explicit Pos/Neg values in
# [-4096,4096], size <= 4096, radius <= 4096. Internal coordinates add 4096
# before multiplying by four; all squared-distance sums fit U32.
# Pixel area is sampled at quarter positions, with no F32 target drift.
import Base
import ./Color.bend as Color

type Coord is Data:
  Pos{value: U32}
  Neg{magnitude: U32}

def valid_coord(c: Coord) -> Bool:
  match c:
    case Pos{value}: U32.is_le(value, 4096)
    case Neg{magnitude}: U32.is_le(magnitude, 4096)

def biased(c: Coord) -> U32:
  match c:
    case Pos{value}: U32.add(4096, value)
    case Neg{magnitude}: U32.sub(4096, magnitude)

def diff(+a: U32, +b: U32) -> U32:
  U32.sub(U32.max(a, b), U32.min(a, b))

def square(+a: U32) -> U32:
  U32.mul(a, a)

def near_case(low: Bool, high: Bool, +lo: U32, +hi: U32, +center: U32) -> U32:
  match low high:
    case True{} _: U32.sub(lo, center)
    case False{} True{}: U32.sub(center, hi)
    case False{} False{}: 0

def near(+lo: U32, +hi: U32, +center: U32) -> U32:
  near_case(U32.is_lt(center, lo), U32.is_gt(center, hi), lo, hi, center)

def far(+lo: U32, +hi: U32, +center: U32) -> U32:
  U32.max(diff(lo, center), diff(hi, center))

def outside_disk(+x: U32, +y: U32, +size: U32,
  +cx: U32, +cy: U32, +radius: U32) -> Bool:
  +lx = U32.add(U32.mul(x, 4), 1)
  +ly = U32.add(U32.mul(y, 4), 1)
  +hx = U32.add(U32.mul(U32.sub(U32.add(x, size), 1), 4), 3)
  +hy = U32.add(U32.mul(U32.sub(U32.add(y, size), 1), 4), 3)
  +dx = near(lx, hx, U32.mul(cx, 4))
  +dy = near(ly, hy, U32.mul(cy, 4))
  U32.is_gt(U32.add(square(dx), square(dy)), square(U32.mul(radius, 4)))

def inside_disk(+x: U32, +y: U32, +size: U32,
  +cx: U32, +cy: U32, +radius: U32) -> Bool:
  +lx = U32.add(U32.mul(x, 4), 1)
  +ly = U32.add(U32.mul(y, 4), 1)
  +hx = U32.add(U32.mul(U32.sub(U32.add(x, size), 1), 4), 3)
  +hy = U32.add(U32.mul(U32.sub(U32.add(y, size), 1), 4), 3)
  +dx = far(lx, hx, U32.mul(cx, 4))
  +dy = far(ly, hy, U32.mul(cy, 4))
  U32.is_le(U32.add(square(dx), square(dy)), square(U32.mul(radius, 4)))

def bit(inside: Bool) -> U32:
  match inside:
    case False{}: 0
    case True{}: 1

def disk_point(+xx: U32, +yy: U32, +cx: U32, +cy: U32, +radius: U32) -> Bool:
  +dx = diff(xx, U32.mul(cx, 4))
  +dy = diff(yy, U32.mul(cy, 4))
  U32.is_le(U32.add(square(dx), square(dy)), square(U32.mul(radius, 4)))

def disk_coverage(+x: U32, +y: U32, +cx: U32, +cy: U32, +radius: U32) -> U32:
  +xx = U32.mul(x, 4)
  +yy = U32.mul(y, 4)
  U32.add(U32.add(bit(disk_point(U32.add(xx, 1), U32.add(yy, 1), cx, cy, radius)),
    bit(disk_point(U32.add(xx, 3), U32.add(yy, 1), cx, cy, radius))),
    U32.add(bit(disk_point(U32.add(xx, 1), U32.add(yy, 3), cx, cy, radius)),
      bit(disk_point(U32.add(xx, 3), U32.add(yy, 3), cx, cy, radius))))

def paint_leaf(+count: U32, +opacity: U32, +color: U32, image: Image) -> Image:
  match image:
    case Pix{background}:
      Pix{Color.over(color, background, U32.div(U32.mul(U32.min(opacity, 255), count), 4))}
    case Qua{tl, tr, bl, br}:
      # A malformed depth-zero image has no defined pixels.
      Pix{0}

def full_blend(+depth: Nat, +color: U32, +opacity: U32, image: Image) -> Image:
  match depth image:
    case 0n Pix{background}: Pix{Color.over(color, background, opacity)}
    case 0n Qua{tl, tr, bl, br}: Pix{0}
    case 1n+rest Pix{background}: Pix{Color.over(color, background, opacity)}
    case 1n+rest Qua{tl, tr, bl, br}:
      a b c d = full_blend(rest, color, opacity, tl)
        full_blend(rest, color, opacity, tr)
        full_blend(rest, color, opacity, bl)
        full_blend(rest, color, opacity, br)
      Qua{a, b, c, d}

def full_case(full: Bool, +depth: Nat, opacity: U32, color: U32, image: Image) -> Image:
  match full:
    case True{}: Pix{color}
    case False{}: full_blend(depth, color, opacity, image)

def full_disk(+depth: Nat, +opacity: U32, color: U32, image: Image) -> Image:
  full_case(U32.is_ge(opacity, 255), depth, opacity, color, image)

def disk_tree(+depth: Nat, +size: U32, outside: Bool, inside: Bool,
  +x: U32, +y: U32, +cx: U32, +cy: U32, +radius: U32,
  +color: U32, +opacity: U32, image: Image) -> Image:
  match depth outside inside:
    case 0n True{} _: image
    case 0n False{} _:
      paint_leaf(disk_coverage(x, y, cx, cy, radius), opacity, color, image)
    case 1n+rest True{} _: image
    case 1n+rest False{} True{}:
      full_disk(depth, opacity, color, image)
    case 1n+rest False{} False{}:
      match image:
        case Pix{+background}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = disk_tree(rest, half, outside_disk(x, y, half, cx, cy, radius), inside_disk(x, y, half, cx, cy, radius), x, y, cx, cy, radius, color, opacity, Pix{background})
            disk_tree(rest, half, outside_disk(xx, y, half, cx, cy, radius), inside_disk(xx, y, half, cx, cy, radius), xx, y, cx, cy, radius, color, opacity, Pix{background})
            disk_tree(rest, half, outside_disk(x, yy, half, cx, cy, radius), inside_disk(x, yy, half, cx, cy, radius), x, yy, cx, cy, radius, color, opacity, Pix{background})
            disk_tree(rest, half, outside_disk(xx, yy, half, cx, cy, radius), inside_disk(xx, yy, half, cx, cy, radius), xx, yy, cx, cy, radius, color, opacity, Pix{background})
          Qua{a, b, c, d}
        case Qua{tl, tr, bl, br}:
          +half = U32.div(size, 2)
          +xx = U32.add(x, half)
          +yy = U32.add(y, half)
          a b c d = disk_tree(rest, half, outside_disk(x, y, half, cx, cy, radius), inside_disk(x, y, half, cx, cy, radius), x, y, cx, cy, radius, color, opacity, tl)
            disk_tree(rest, half, outside_disk(xx, y, half, cx, cy, radius), inside_disk(xx, y, half, cx, cy, radius), xx, y, cx, cy, radius, color, opacity, tr)
            disk_tree(rest, half, outside_disk(x, yy, half, cx, cy, radius), inside_disk(x, yy, half, cx, cy, radius), x, yy, cx, cy, radius, color, opacity, bl)
            disk_tree(rest, half, outside_disk(xx, yy, half, cx, cy, radius), inside_disk(xx, yy, half, cx, cy, radius), xx, yy, cx, cy, radius, color, opacity, br)
          Qua{a, b, c, d}

def disk_valid(valid: Bool, depth: Nat, +size: U32, cx: Coord, cy: Coord, +radius: U32,
  color: U32, opacity: U32, image: Image) -> Image:
  match valid:
    case False{}: image
    case True{}:
      +shift_x = biased(cx)
      +shift_y = biased(cy)
      disk_tree(depth, size, outside_disk(4096, 4096, size, shift_x, shift_y, radius),
        inside_disk(4096, 4096, size, shift_x, shift_y, radius),
        4096, 4096, shift_x, shift_y, radius,
        color, opacity, image)

def disk_gate(zero_radius: Bool, zero_opacity: Bool,
  depth: Nat, size: U32, +cx: Coord, +cy: Coord, +radius: U32,
  color: U32, opacity: U32, image: Image) -> Image:
  match zero_radius zero_opacity:
    case True{} _: image
    case False{} True{}: image
    case False{} False{}:
      disk_valid(Bool.and(U32.is_le(radius, 4096),
          Bool.and(valid_coord(cx), valid_coord(cy))),
        depth, size, cx, cy, radius, color, opacity, image)

def disk(depth: Nat, size: U32, +cx: Coord, +cy: Coord, +radius: U32,
  color: U32, +opacity: U32, image: Image) -> Image:
  disk_gate(U32.is_zero(radius), U32.is_zero(opacity),
    depth, size, cx, cy, radius, color, opacity, image)
