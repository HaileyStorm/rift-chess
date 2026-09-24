# Standalone balanced whole-tree workload for an exact-source native receipt.
# Every one of the 4^7 material leaves contributes to each checksum round.
# The non-bang control and bang path compute the same Image semantics.
import Base
import ../Texture.bend as Texture

def checksum(+depth: Nat, image: Image) -> U32:
  match depth image:
    case 0n Pix{color}: color
    case 0n Qua{a, b, c, d}: 0
    case 1n+rest Pix{color}: color
    case 1n+rest Qua{tl, tr, bl, br}:
      +a = checksum(rest, tl)
      +b = checksum(rest, tr)
      +c = checksum(rest, bl)
      +d = checksum(rest, br)
      U32.xor(U32.add(U32.mul(a, 3), U32.mul(b, 5)),
        U32.add(U32.mul(c, 7), U32.mul(d, 11)))

def image(parallel: Bool, +seed: U32) -> Image:
  match parallel:
    case True{}:
      Texture.fine_on_pool(1024,
        Texture.Grain{1057074, 4638419, 28, seed})
    case False{}:
      Texture.tree(7n, 1024, 0, 0,
        Texture.Grain{1057074, 4638419, 28, seed})

def run(+rounds: Nat, +seed: U32, +acc: U32,
  +parallel: Bool) -> U32:
  match rounds:
    case 0n: acc
    case 1n+rest:
      +value = checksum(7n, image(parallel, seed))
      run(rest, U32.add(seed, 1),
        U32.xor(U32.mul(acc, 16777619), value), parallel)
