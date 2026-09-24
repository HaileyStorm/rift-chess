# Optional procedural material pass. CPU/JS callers choose 4^4 or 4^5 coarse
# cells; `fine_on_pool` is an explicit native CPU/GPU offload at 4^7 leaves.
# Each leaf is flat integer work and returns one uniform Pix, while all joins
# are immutable four-way Qua nodes. Device performance is not presumed.
import Base
import ./Color.bend as Color

type Material is Data:
  Grain{base: U32, ink: U32, strength: U32, seed: U32}
  Hatch{base: U32, ink: U32, period: U32, strength: U32}

def hash(+x: U32, +y: U32, +seed: U32) -> U32:
  +a = U32.xor(U32.add(U32.mul(x, 374761393), U32.mul(y, 668265263)), seed)
  +b = U32.mul(U32.xor(a, U32.shrn(a, 13n)), 1274126177)
  U32.xor(b, U32.shrn(b, 16n))

def hatch_case(zero: Bool, +x: U32, +y: U32, +size: U32,
  +base: U32, +ink: U32, +period: U32, +strength: U32) -> Image:
  match zero:
    case True{}: Pix{base}
    case False{}:
      +diagonal = U32.mod(U32.add(U32.div(x, size), U32.div(y, size)), period)
      Pix{Color.over(ink, base, U32.div(U32.mul(U32.sub(period, diagonal),
        U32.min(strength, 255)), period))}

def leaf(+x: U32, +y: U32, +size: U32, material: Material) -> Image:
  match material:
    case Grain{base, ink, strength, seed}:
      +noise = U32.and(hash(U32.div(x, size), U32.div(y, size), seed), 255)
      Pix{Color.over(ink, base, U32.div(U32.mul(noise, U32.min(strength, 255)), 255))}
    case Hatch{base, ink, +period, strength}:
      hatch_case(U32.is_zero(period), x, y, size, base, ink, period, strength)

def tree(+levels: Nat, +size: U32, +x: U32, +y: U32,
  +material: Material) -> Image:
  match levels:
    case 0n: leaf(x, y, size, material)
    case 1n+rest:
      +half = U32.div(size, 2)
      +xx = U32.add(x, half)
      +yy = U32.add(y, half)
      a b c d = tree(rest, half, x, y, material)
        tree(rest, half, xx, y, material)
        tree(rest, half, x, yy, material)
        tree(rest, half, xx, yy, material)
      Qua{a, b, c, d}

# Serial child evaluation keeps the same leaf colors and TL/TR/BL/BR tree.
# It is an explicit single-core reference for bounded CPU pool scheduling.
def serial_tree(+levels: Nat, +size: U32, +x: U32, +y: U32,
  +material: Material) -> Image:
  match levels:
    case 0n: leaf(x, y, size, material)
    case 1n+rest:
      +half = U32.div(size, 2)
      +xx = U32.add(x, half)
      +yy = U32.add(y, half)
      +a = serial_tree(rest, half, x, y, material)
      +b = serial_tree(rest, half, xx, y, material)
      +c = serial_tree(rest, half, x, yy, material)
      +d = serial_tree(rest, half, xx, yy, material)
      Qua{a, b, c, d}

# Explicit pool fanout is bounded independently of the pixel/material depth.
# At forks=3 and levels=7, 64 branches each build 4^4 leaves locally.
# That shape was slower than serial_tree for this cheap native CPU workload;
# scheduling remains an opt-in choice measured by each caller. The distinct
# fine_on_pool path retains its GPU-oriented 4^7 shape without device evidence.
def pool_top(+forks: Nat, +levels: Nat, +size: U32, +x: U32, +y: U32,
  +material: Material) -> Image:
  match forks levels:
    case 0n _: serial_tree(levels, size, x, y, material)
    case 1n+more 0n: serial_tree(0n, size, x, y, material)
    case 1n+more 1n+rest:
      +half = U32.div(size, 2)
      +xx = U32.add(x, half)
      +yy = U32.add(y, half)
      a b c d = pool_top!(more, rest, half, x, y, material)
        pool_top!(more, rest, half, xx, y, material)
        pool_top!(more, rest, half, x, yy, material)
        pool_top!(more, rest, half, xx, yy, material)
      Qua{a, b, c, d}

def coarse(size: U32, material: Material) -> Image:
  tree(4n, size, 0, 0, material)

def detailed(size: U32, material: Material) -> Image:
  tree(5n, size, 0, 0, material)

def fine_on_pool(size: U32, material: Material) -> Image:
  tree!(7n, size, 0, 0, material)
